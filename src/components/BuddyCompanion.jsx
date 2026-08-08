// ─── BuddyCompanion — Shimeji-style roaming pet ───
//
// Once you adopt a buddy in the Pet Care game and "send it out", it pops
// onto the app and lives along the bottom of the screen:
//   • walks / idles / does cute antics (hops, spins, wiggles)
//   • DRAG to pick it up, THROW it — it falls with gravity and bounces
//   • drops COINS now and then — tap to pocket them
//   • shows mood EMOTES (hungry / sleepy / wants to play) from its real stats
//   • CHEERS when you catch a Pokémon
//   • click to pet (cry + hearts), double-click to open its game, ✕ sends home
//
import { useState, useEffect, useRef, useCallback } from "react";
import { Heart, Music, Sparkles, Utensils, Moon, Droplets, Gamepad2, Coins, X } from "lucide-react";
import {
  SAVE_KEY, ROAM_KEY, PET_EVENT,
  animSprite, pixelSprite, buddySpriteId, readPetSave, playBuddyCry, buddyLineIds,
} from "./PetCareGame.jsx";
import { awardCoins } from "./petQuests.js";

const GROUND = 6;        // px from the bottom edge the buddy stands on
const SIZE = 78;         // sprite box size
const SPEED = 30;        // px per second walking
const MARGIN = 10;       // keep this far from screen edges
const GRAVITY = 2600;    // px/s² when airborne

function BuddySprite({ id, size, flip }) {
  const [failed, setFailed] = useState(false);
  return (
    <img
      key={id}
      src={failed ? pixelSprite(id) : animSprite(id)}
      onError={() => setFailed(true)}
      alt=""
      draggable={false}
      style={{
        width: size, height: size, objectFit: "contain",
        imageRendering: "pixelated",
        transform: `scaleX(${flip ? -1 : 1})`,
        filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.4))",
        pointerEvents: "none",
      }}
    />
  );
}

export default function BuddyCompanion({ lang = "en", onOpenGame }) {
  const t = (th, en, ja) => lang === "th" ? th : lang === "ja" ? (ja ?? en) : en;

  // ─── Sync with saved buddy ───
  const [save, setSave] = useState(() => readPetSave());
  const [roaming, setRoaming] = useState(() => {
    try { return localStorage.getItem(ROAM_KEY) === "1"; } catch { return false; }
  });
  const [caughtTick, setCaughtTick] = useState(0);

  const refresh = useCallback(() => {
    setSave(readPetSave());
    try { setRoaming(localStorage.getItem(ROAM_KEY) === "1"); } catch {}
  }, []);

  // Economy mode: don't roam (stops the per-frame physics loop)
  const [perfLite, setPerfLite] = useState(() =>
    typeof document !== "undefined" && document.documentElement.classList.contains("perf-lite"));
  useEffect(() => {
    const on = () => setPerfLite(document.documentElement.classList.contains("perf-lite"));
    window.addEventListener("perfmode:change", on);
    return () => window.removeEventListener("perfmode:change", on);
  }, []);

  const visible = !!save && roaming && !perfLite;
  const spriteId = buddySpriteId(save);

  // ─── Physics / behaviour refs ───
  const wrapRef = useRef(null);
  const xRef = useRef(40);
  const yRef = useRef(0);        // height above the ground
  const vxRef = useRef(0);
  const vyRef = useRef(0);
  const dirRef = useRef(1);
  const modeRef = useRef("walk"); // walk | idle | drag | fall | climb
  const switchAtRef = useRef(0);
  const lastTsRef = useRef(0);
  const rafRef = useRef(0);
  const climbTargetRef = useRef(0);
  const climbSideRef = useRef("left");
  const [flip, setFlip] = useState(false);    // facing left
  const [anim, setAnim] = useState("walk");   // css mode: walk | idle | drag | fall | climb
  const [climbSide, setClimbSide] = useState("left");
  const [pose, setPose] = useState(null);     // one-shot antic: hop | spin | wiggle | dizzy | land | happy
  const poseTimer = useRef(null);

  const maxX = () => Math.max(MARGIN, window.innerWidth - SIZE - MARGIN);
  const setMode = (m) => { modeRef.current = m; setAnim(m); };
  const startClimb = (side) => {
    climbSideRef.current = side; setClimbSide(side);
    climbTargetRef.current = Math.min(window.innerHeight * 0.5, 130 + Math.random() * window.innerHeight * 0.32);
    setMode("climb");
  };
  const doPose = useCallback((name, ms = 700) => {
    clearTimeout(poseTimer.current);
    setPose(name);
    poseTimer.current = setTimeout(() => setPose(null), ms);
  }, []);

  // ─── Interactions: reactions, hearts, coins, emotes ───
  const [hearts, setHearts] = useState([]);
  const heartId = useRef(0);
  const [coins, setCoins] = useState([]);     // {id, x, gold}
  const coinId = useRef(0);
  const [emote, setEmote] = useState(null);   // { Icon, color }
  const clickTimer = useRef(null);

  const burst = useCallback((icons) => {
    const batch = icons.map((Icon) => ({
      id: heartId.current++, Icon,
      dx: (Math.random() - 0.5) * 46, delay: Math.random() * 0.2,
    }));
    setHearts(h => [...h, ...batch]);
    setTimeout(() => setHearts(h => h.filter(x => !batch.find(b => b.id === x.id))), 1300);
  }, []);

  const petBuddy = useCallback(() => {
    playBuddyCry(spriteId);
    burst([Music, Music, Heart, Heart, Heart]);
    doPose("happy", 700);
    const cur = readPetSave();
    if (cur) {
      cur.stats = { ...cur.stats, happy: Math.min(100, (cur.stats?.happy ?? 0) + 4) };
      cur.bond = Math.min(100, (cur.bond ?? 0) + 1);
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(cur)); } catch {}
      setSave(cur);
    }
  }, [spriteId, burst, doPose]);

  const cheer = useCallback(() => {
    playBuddyCry(spriteId);
    burst([Sparkles, Heart, Sparkles]);
    doPose("happy", 800);
    // a happy little hop
    if (modeRef.current !== "drag") { yRef.current = 0; vyRef.current = 520; setMode("fall"); }
  }, [spriteId, burst, doPose]);

  // ─── Event wiring ───
  const lastKinRef = useRef(0);
  const kinReactRef = useRef(false);
  useEffect(() => {
    const onCaught = () => {
      setCaughtTick((t) => t + 1);
      // Bond perk: a bonded buddy shares bonus coins whenever you catch a Pokémon
      try {
        const cur = readPetSave();
        const bond = cur?.bond ?? 0;
        if (cur && bond >= 30) awardCoins(bond >= 80 ? 5 : bond >= 50 ? 3 : 2);
      } catch {}
    };
    // React when the player views a Pokémon in the buddy's own family
    const onViewed = (e) => {
      const id = e?.detail?.id;
      const cur = readPetSave();
      if (!id || !cur || modeRef.current === "drag") return;
      if (Date.now() - lastKinRef.current < 7000) return;
      if (buddyLineIds(cur).includes(id)) {
        lastKinRef.current = Date.now();
        kinReactRef.current = true;
      }
    };
    window.addEventListener(PET_EVENT, refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("pokemon:caught", onCaught);
    window.addEventListener("pokemon:viewed", onViewed);
    return () => {
      window.removeEventListener(PET_EVENT, refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("pokemon:caught", onCaught);
      window.removeEventListener("pokemon:viewed", onViewed);
    };
  }, [refresh]);

  // fire the "kin spotted" reaction when flagged (and currently visible)
  useEffect(() => {
    if (!visible) return;
    const iv = setInterval(() => {
      if (kinReactRef.current) {
        kinReactRef.current = false;
        setEmote({ Icon: Heart, color: "#f472b6" });
        setTimeout(() => setEmote(null), 2600);
        cheer();
      }
    }, 400);
    return () => clearInterval(iv);
  }, [visible, cheer]);

  // Cheer right where it stands when you catch a Pokémon
  useEffect(() => {
    if (!caughtTick || !visible) return;
    const id = setTimeout(cheer, 450);
    return () => clearTimeout(id);
  }, [caughtTick, visible, cheer]);

  // AuthContext sends the buddy out roaming + fires this right after login —
  // greet the trainer back with the same happy reaction as a "kin spotted".
  const [welcomeTick, setWelcomeTick] = useState(0);
  useEffect(() => {
    const onWelcome = () => setWelcomeTick((t) => t + 1);
    window.addEventListener("pet:welcome-back", onWelcome);
    return () => window.removeEventListener("pet:welcome-back", onWelcome);
  }, []);
  useEffect(() => {
    if (!welcomeTick || !visible) return;
    setEmote({ Icon: Heart, color: "#f472b6" });
    const t1 = setTimeout(() => setEmote(null), 2600);
    const t2 = setTimeout(cheer, 300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [welcomeTick, visible, cheer]);

  // ─── Walking + physics engine (rAF) ───
  useEffect(() => {
    if (!visible) return;
    xRef.current = Math.min(xRef.current, maxX());
    if (wrapRef.current) wrapRef.current.style.transform = `translate(${xRef.current}px, ${-yRef.current}px)`;

    const loop = (ts) => {
      if (!lastTsRef.current) lastTsRef.current = ts;
      const dt = Math.min(0.032, (ts - lastTsRef.current) / 1000);
      lastTsRef.current = ts;
      const hi = maxX();
      const m = modeRef.current;

      if (m === "fall") {
        vyRef.current -= GRAVITY * dt;
        yRef.current += vyRef.current * dt;
        xRef.current += vxRef.current * dt;
        if (xRef.current <= MARGIN) { xRef.current = MARGIN; vxRef.current = Math.abs(vxRef.current) * 0.5; dirRef.current = 1; setFlip(false); }
        else if (xRef.current >= hi) { xRef.current = hi; vxRef.current = -Math.abs(vxRef.current) * 0.5; dirRef.current = -1; setFlip(true); }
        if (yRef.current <= 0) {
          yRef.current = 0;
          const impact = Math.abs(vyRef.current);
          if (impact > 240) { vyRef.current = impact * 0.42; } // bounce up
          else {
            vyRef.current = 0; vxRef.current = 0;
            setMode("idle");
            switchAtRef.current = ts + 500 + Math.random() * 1200;
            doPose("land", 360);
          }
        }
      } else if (m === "walk" || m === "idle") {
        if (ts >= switchAtRef.current) {
          if (m === "walk") {
            setMode("idle");
            switchAtRef.current = ts + 900 + Math.random() * 2200;
            // sometimes do a cute antic while standing
            const r = Math.random();
            if (r < 0.22) doPose("spin", 700);
            else if (r < 0.5) doPose("hop", 600);
            else if (r < 0.68) doPose("wiggle", 700);
          } else {
            setMode("walk");
            if (Math.random() < 0.5) { dirRef.current *= -1; setFlip(dirRef.current < 0); }
            switchAtRef.current = ts + 2500 + Math.random() * 3500;
          }
        }
        if (modeRef.current === "walk") {
          let x = xRef.current + dirRef.current * SPEED * dt;
          const tall = window.innerHeight > 460;
          if (x <= MARGIN) {
            x = MARGIN;
            if (tall && Math.random() < 0.4) startClimb("left", ts);
            else { dirRef.current = 1; setFlip(false); }
          } else if (x >= hi) {
            x = hi;
            if (tall && Math.random() < 0.4) startClimb("right", ts);
            else { dirRef.current = -1; setFlip(true); }
          }
          xRef.current = x;
        }
      } else if (m === "climb") {
        xRef.current = climbSideRef.current === "left" ? MARGIN : hi;
        yRef.current += 70 * dt;
        if (yRef.current >= climbTargetRef.current) {
          // reached the top → let go and plop back down (mischief!)
          vyRef.current = 40;
          vxRef.current = climbSideRef.current === "left" ? 90 : -90;
          dirRef.current = climbSideRef.current === "left" ? 1 : -1;
          setFlip(climbSideRef.current !== "left");
          setMode("fall");
        }
      }
      // (drag mode: position is driven by the pointer handlers)

      if (wrapRef.current) wrapRef.current.style.transform = `translate(${xRef.current}px, ${-yRef.current}px)`;
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    const onResize = () => { xRef.current = Math.min(xRef.current, maxX()); };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(rafRef.current);
      lastTsRef.current = 0;
      window.removeEventListener("resize", onResize);
    };
  }, [visible, doPose]);

  // ─── Coin drops ───
  useEffect(() => {
    if (!visible) return;
    let timer;
    const schedule = () => { timer = setTimeout(drop, 18000 + Math.random() * 22000); };
    const drop = () => {
      setCoins(cs => {
        if (cs.length >= 3 || modeRef.current === "drag") return cs;
        const id = coinId.current++;
        const gold = Math.random() < 0.2;
        const c = { id, x: Math.round(xRef.current + SIZE / 2 - 11), gold };
        setTimeout(() => setCoins(prev => prev.filter(x => x.id !== id)), 13000);
        return [...cs, c];
      });
      schedule();
    };
    schedule();
    return () => clearTimeout(timer);
  }, [visible]);

  const collectCoin = (c) => {
    setCoins(cs => cs.filter(x => x.id !== c.id));
    awardCoins(c.gold ? 3 : 1);
  };

  // ─── Mood emotes ───
  useEffect(() => {
    if (!visible) return;
    let timer;
    const tick = () => {
      const s = readPetSave()?.stats;
      if (s) {
        let e = null;
        if (s.hunger < 25) e = { Icon: Utensils, color: "#fb923c" };
        else if (s.energy < 25) e = { Icon: Moon, color: "#9c7bd6" };
        else if (s.clean < 25) e = { Icon: Droplets, color: "#5aa9d6" };
        else if (s.happy < 35) e = { Icon: Gamepad2, color: "#34d399" };
        else if (Math.random() < 0.5) e = { Icon: [Heart, Music, Sparkles][Math.floor(Math.random() * 3)], color: "#f472b6" };
        if (e) { setEmote(e); setTimeout(() => setEmote(null), 3400); }
      }
      timer = setTimeout(tick, 13000 + Math.random() * 9000);
    };
    timer = setTimeout(tick, 6000);
    return () => clearTimeout(timer);
  }, [visible]);

  // ─── Pointer: drag + throw, tap = pet, double-tap = open ───
  const drag = useRef(null);
  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = {
      id: e.pointerId, moved: false,
      sx: e.clientX, sy: e.clientY, x0: xRef.current, y0: yRef.current,
      samples: [{ x: xRef.current, y: yRef.current, t: performance.now() }],
    };
  };
  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) > 6) { d.moved = true; setMode("drag"); }
    if (!d.moved) return;
    xRef.current = Math.max(MARGIN, Math.min(maxX(), d.x0 + dx));
    yRef.current = Math.max(0, Math.min(window.innerHeight - SIZE - GROUND, d.y0 - dy));
    if (wrapRef.current) wrapRef.current.style.transform = `translate(${xRef.current}px, ${-yRef.current}px)`;
    const now = performance.now();
    d.samples.push({ x: xRef.current, y: yRef.current, t: now });
    if (d.samples.length > 6) d.samples.shift();
  };
  const onPointerUp = (e) => {
    const d = drag.current;
    drag.current = null;
    if (!d || e.pointerId !== d.id) return;
    if (!d.moved) { handleTap(); return; }
    // compute throw velocity from recent samples
    const s = d.samples;
    const a = s[0], b = s[s.length - 1];
    const span = Math.max(0.016, (b.t - a.t) / 1000);
    vxRef.current = Math.max(-1400, Math.min(1400, (b.x - a.x) / span));
    vyRef.current = Math.max(-1400, Math.min(1600, (b.y - a.y) / span));
    if (vxRef.current < -20) setFlip(true); else if (vxRef.current > 20) setFlip(false);
    setMode("fall");
    if (Math.abs(vxRef.current) + Math.abs(vyRef.current) > 900) doPose("dizzy", 900);
  };

  const handleTap = () => {
    if (clickTimer.current) {            // second tap → open game
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
      onOpenGame?.();
      return;
    }
    clickTimer.current = setTimeout(() => { clickTimer.current = null; petBuddy(); }, 240);
  };

  const sendHome = (e) => {
    e.stopPropagation();
    try { localStorage.setItem(ROAM_KEY, "0"); } catch {}
    setRoaming(false);
    try { window.dispatchEvent(new CustomEvent(PET_EVENT)); } catch {}
  };

  useEffect(() => () => { clearTimeout(clickTimer.current); clearTimeout(poseTimer.current); }, []);

  if (!visible || !spriteId) return null;

  return (
    <>
      <style>{BUDDY_CSS}</style>

      {/* Dropped coins (fixed to the ground, independent of the buddy) */}
      {coins.map(c => (
        <button key={c.id} className={`buddy-coin${c.gold ? " gold" : ""}`}
          style={{ left: c.x }} onPointerDown={(e) => { e.stopPropagation(); collectCoin(c); }}
          title={t("เก็บเหรียญ", "Collect", "コイン")}>
          <Coins size={c.gold ? 18 : 15} strokeWidth={2.3} />
        </button>
      ))}

      <div ref={wrapRef} className="buddy-wrap">
        {/* Wordless reactions — hearts / notes / sparkles */}
        {hearts.map(h => (
          <span key={h.id} className="buddy-heart"
            style={{ "--dx": `${h.dx}px`, animationDelay: `${h.delay}s` }}>
            <h.Icon size={15} strokeWidth={2.4} fill="currentColor" />
          </span>
        ))}

        {/* Mood emote bubble */}
        {emote && (
          <span className="buddy-emote" style={{ color: emote.color }}>
            <emote.Icon size={15} strokeWidth={2.3} />
          </span>
        )}

        {/* Send-home button */}
        <button className="buddy-x" onClick={sendHome}
          title={t("เรียกกลับบ้าน", "Send home", "おうちへ")}><X size={11} strokeWidth={2.6} /></button>

        {/* The buddy */}
        <button className={`buddy-btn mode-${anim}${anim === "climb" ? ` wall-${climbSide}` : ""}${pose ? ` pose-${pose}` : ""}`}
          onPointerDown={onPointerDown} onPointerMove={onPointerMove}
          onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
          title={t("ลากเพื่อโยน · คลิกลูบหัว · ดับเบิลคลิกเปิดเกม", "Drag to toss · click to pet · double-click for game", "ドラッグで投げる · クリックでなでる")}>
          <BuddySprite id={spriteId} size={SIZE} flip={flip} />
          <span className="buddy-shadow" />
        </button>
      </div>
    </>
  );
}

const BUDDY_CSS = `
  .buddy-wrap {
    position: fixed; left: 0; bottom: ${GROUND}px;
    z-index: 10001; width: ${SIZE}px; height: ${SIZE + 28}px;
    pointer-events: none;
    will-change: transform;
    animation: buddy-appear 0.5s cubic-bezier(0.34,1.56,0.64,1);
  }
  @keyframes buddy-appear {
    0% { opacity: 0; transform: translateY(40px); }
    100% { opacity: 1; }
  }
  .buddy-btn {
    position: absolute; bottom: 0; left: 0;
    width: ${SIZE}px; height: ${SIZE}px;
    border: none; background: none; padding: 0; margin: 0;
    cursor: grab; pointer-events: auto; touch-action: none;
    display: flex; align-items: flex-end; justify-content: center;
  }
  .buddy-btn.mode-drag { cursor: grabbing; }
  .buddy-btn.mode-walk img { animation: buddy-walk 0.5s ease-in-out infinite; }
  .buddy-btn.mode-idle img { animation: buddy-idle 2.4s ease-in-out infinite; }
  .buddy-btn.mode-drag img { transform: scale(1.12) rotate(-4deg) !important; }
  .buddy-btn.mode-fall img { animation: none; }
  /* climbing the wall — cling sideways + scrabble */
  .buddy-btn.mode-climb img { animation: buddy-climb 0.4s ease-in-out infinite; }
  .buddy-btn.mode-climb.wall-left img  { transform: rotate(90deg) !important; }
  .buddy-btn.mode-climb.wall-right img { transform: rotate(-90deg) !important; }
  @keyframes buddy-climb { 0%,100% { translate: 0 0; } 50% { translate: 0 -3px; } }
  /* one-shot antics (override the mode animation) */
  .buddy-btn.pose-hop img    { animation: buddy-hop 0.6s cubic-bezier(0.34,1.56,0.64,1) !important; }
  .buddy-btn.pose-spin img   { animation: buddy-spin 0.7s ease-in-out !important; }
  .buddy-btn.pose-wiggle img { animation: buddy-wiggle 0.7s ease-in-out !important; }
  .buddy-btn.pose-happy img  { animation: buddy-hop 0.6s cubic-bezier(0.34,1.56,0.64,1) !important; }
  .buddy-btn.pose-dizzy img  { animation: buddy-dizzy 0.9s ease-in-out !important; }
  .buddy-btn.pose-land img   { animation: buddy-land 0.36s ease-out !important; }
  .buddy-btn:active img { filter: drop-shadow(0 3px 4px rgba(0,0,0,0.4)) brightness(1.05); }
  @keyframes buddy-walk { 0%,100% { translate: 0 0; } 25% { translate: 0 -3px; } 50% { translate: 0 0; } 75% { translate: 0 -2px; } }
  @keyframes buddy-idle { 0%,100% { translate: 0 0; } 50% { translate: 0 -4px; } }
  @keyframes buddy-hop  { 0% { translate: 0 0; } 45% { translate: 0 -22px; } 70% { translate: 0 0; } 85% { translate: 0 -5px; } 100% { translate: 0 0; } }
  @keyframes buddy-spin { 0% { transform: rotate(0); } 100% { transform: rotate(360deg); } }
  @keyframes buddy-wiggle { 0%,100% { transform: rotate(0); } 25% { transform: rotate(-12deg); } 75% { transform: rotate(12deg); } }
  @keyframes buddy-dizzy { 0% { transform: rotate(0); } 25% { transform: rotate(14deg); } 50% { transform: rotate(-14deg); } 75% { transform: rotate(8deg); } 100% { transform: rotate(0); } }
  @keyframes buddy-land { 0% { transform: scaleY(0.7) scaleX(1.2); } 100% { transform: scaleY(1) scaleX(1); } }
  .buddy-shadow {
    position: absolute; bottom: 2px; left: 50%;
    width: 46px; height: 9px; transform: translateX(-50%);
    background: radial-gradient(ellipse, rgba(0,0,0,0.38), transparent 70%);
    filter: blur(2px); pointer-events: none;
  }
  .buddy-x {
    position: absolute; top: 22px; right: -4px;
    width: 20px; height: 20px; border-radius: 50%;
    background: rgba(15,23,42,0.7); color: rgba(255,255,255,0.85);
    border: 1px solid rgba(255,255,255,0.25);
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    pointer-events: auto; opacity: 0; transition: opacity 0.2s, background 0.2s;
    backdrop-filter: blur(6px); z-index: 2;
  }
  .buddy-wrap:hover .buddy-x { opacity: 1; }
  .buddy-x:hover { background: rgba(239,68,68,0.9); color: #fff; }
  .buddy-heart {
    position: absolute; bottom: ${SIZE - 10}px; left: 50%;
    color: #f472b6; pointer-events: none; z-index: 3; display: inline-flex;
    animation: buddy-heart-fly 1.3s ease-out forwards;
  }
  @keyframes buddy-heart-fly {
    0%   { opacity: 0; transform: translate(-50%, 0) scale(0.5); }
    25%  { opacity: 1; transform: translate(-50%, -10px) scale(1); }
    100% { opacity: 0; transform: translate(calc(-50% + var(--dx,0)), -56px) scale(0.9); }
  }
  .buddy-emote {
    position: absolute; bottom: ${SIZE + 2}px; left: 50%; transform: translateX(-50%);
    width: 30px; height: 30px; border-radius: 50%; z-index: 4;
    display: inline-flex; align-items: center; justify-content: center;
    background: rgba(255,255,255,0.96);
    box-shadow: 0 4px 12px rgba(0,0,0,0.28);
    animation: buddy-emote-in 0.3s cubic-bezier(0.34,1.56,0.64,1);
  }
  .buddy-emote::after {
    content: ""; position: absolute; bottom: -5px; left: 50%; transform: translateX(-50%);
    border-left: 5px solid transparent; border-right: 5px solid transparent;
    border-top: 6px solid rgba(255,255,255,0.96);
  }
  @keyframes buddy-emote-in { from { opacity: 0; transform: translateX(-50%) translateY(6px) scale(0.6); } to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); } }
  .buddy-coin {
    position: fixed; bottom: ${GROUND}px; z-index: 10000;
    width: 26px; height: 26px; border-radius: 50%; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    background: rgba(251,191,36,0.22); color: #eab308; border: 1.5px solid rgba(251,191,36,0.5);
    pointer-events: auto; box-shadow: 0 3px 10px rgba(0,0,0,0.3);
    animation: buddy-coin-in 0.4s cubic-bezier(0.34,1.56,0.64,1), buddy-coin-bob 1.6s ease-in-out infinite 0.4s;
  }
  .buddy-coin.gold { background: rgba(247,207,107,0.28); color: #d4a017; border-color: rgba(247,207,107,0.7); width: 30px; height: 30px; }
  .buddy-coin:hover { filter: brightness(1.12); }
  @keyframes buddy-coin-in { from { opacity: 0; transform: translateY(14px) scale(0.4); } to { opacity: 1; transform: translateY(0) scale(1); } }
  @keyframes buddy-coin-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
  @media (prefers-reduced-motion: reduce) {
    .buddy-btn img { animation: none !important; }
    .buddy-coin { animation: buddy-coin-in 0.4s ease; }
  }
`;
