// ─── BuddyCompanion — Shimeji-style roaming pet ───
//
// Once you adopt a buddy in the Pet Care game and "send it out", it pops
// onto the app and walks back-and-forth along the bottom of the screen.
// Click to pet it (hearts + happiness), double-click to open its game,
// ✕ to send it home. Syncs live with the saved buddy (evolutions included).

import { useState, useEffect, useRef, useCallback } from "react";
import {
  SAVE_KEY, ROAM_KEY, PET_EVENT,
  animSprite, pixelSprite, buddySpriteId, readPetSave, playBuddyCry,
} from "./PetCareGame.jsx";

const GROUND = 6;        // px from the bottom edge the buddy stands on
const SIZE = 78;         // sprite box size
const SPEED = 30;        // px per second walking
const MARGIN = 10;       // keep this far from screen edges

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
  const [hiddenByOverlay, setHiddenByOverlay] = useState(false);

  const refresh = useCallback(() => {
    setSave(readPetSave());
    try { setRoaming(localStorage.getItem(ROAM_KEY) === "1"); } catch {}
  }, []);

  useEffect(() => {
    window.addEventListener(PET_EVENT, refresh);
    window.addEventListener("storage", refresh);
    // Hide while a fullscreen catch/pet overlay is up
    const onCatchOpen = () => setHiddenByOverlay(true);
    const onCatchClose = () => setHiddenByOverlay(false);
    window.addEventListener("catch:open", onCatchOpen);
    window.addEventListener("catch:close", onCatchClose);
    return () => {
      window.removeEventListener(PET_EVENT, refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("catch:open", onCatchOpen);
      window.removeEventListener("catch:close", onCatchClose);
    };
  }, [refresh]);

  const visible = !!save && roaming && !hiddenByOverlay;
  const spriteId = buddySpriteId(save);

  // ─── Walking engine (rAF, transform on ref — no per-frame re-render) ───
  const wrapRef = useRef(null);
  const xRef = useRef(40);
  const dirRef = useRef(1);
  const modeRef = useRef("walk");          // walk | idle
  const switchAtRef = useRef(0);
  const lastTsRef = useRef(0);
  const rafRef = useRef(0);
  const [flip, setFlip] = useState(false); // facing left
  const [walking, setWalking] = useState(true);

  useEffect(() => {
    if (!visible) return;

    const maxX = () => Math.max(MARGIN, window.innerWidth - SIZE - MARGIN);
    xRef.current = Math.min(xRef.current, maxX());
    // Position immediately so the first painted frame isn't at the left edge
    if (wrapRef.current) wrapRef.current.style.transform = `translateX(${xRef.current}px)`;

    const loop = (ts) => {
      if (!lastTsRef.current) lastTsRef.current = ts;
      const dt = Math.min(0.05, (ts - lastTsRef.current) / 1000);
      lastTsRef.current = ts;

      // Behaviour switching
      if (ts >= switchAtRef.current) {
        if (modeRef.current === "walk") {
          modeRef.current = "idle";
          switchAtRef.current = ts + 900 + Math.random() * 2200;
          setWalking(false);
        } else {
          modeRef.current = "walk";
          // pick a fresh direction sometimes
          if (Math.random() < 0.5) {
            dirRef.current *= -1;
            setFlip(dirRef.current < 0);
          }
          switchAtRef.current = ts + 2500 + Math.random() * 3500;
          setWalking(true);
        }
      }

      if (modeRef.current === "walk") {
        let x = xRef.current + dirRef.current * SPEED * dt;
        const hi = maxX();
        if (x <= MARGIN) { x = MARGIN; dirRef.current = 1; setFlip(false); }
        else if (x >= hi) { x = hi; dirRef.current = -1; setFlip(true); }
        xRef.current = x;
      }

      if (wrapRef.current) {
        wrapRef.current.style.transform = `translateX(${xRef.current}px)`;
      }
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
  }, [visible]);

  // ─── Interactions ───
  // Buddy communicates with its Pokémon CRY + emotes — no words.
  const [hearts, setHearts] = useState([]);
  const heartId = useRef(0);
  const clickTimer = useRef(null);

  const petBuddy = () => {
    // play its cry (current evolved form)
    playBuddyCry(spriteId);

    // heart + musical-note burst (wordless reaction)
    const batch = Array.from({ length: 5 }).map((_, i) => ({
      id: heartId.current++,
      emoji: i === 0 ? "🎵" : i === 1 ? "♪" : "❤️",
      dx: (Math.random() - 0.5) * 44,
      delay: Math.random() * 0.2,
    }));
    setHearts(h => [...h, ...batch]);
    setTimeout(() => setHearts(h => h.filter(x => !batch.find(b => b.id === x.id))), 1300);

    // tiny happiness boost, persisted
    const cur = readPetSave();
    if (cur) {
      cur.stats = { ...cur.stats, happy: Math.min(100, (cur.stats?.happy ?? 0) + 4) };
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(cur)); } catch {}
      setSave(cur);
    }
  };

  // Single click = pet, double click = open game
  const handleClick = () => {
    if (clickTimer.current) return; // wait for possible dbl-click
    clickTimer.current = setTimeout(() => { clickTimer.current = null; petBuddy(); }, 230);
  };
  const handleDouble = () => {
    clearTimeout(clickTimer.current);
    clickTimer.current = null;
    onOpenGame?.();
  };

  const sendHome = (e) => {
    e.stopPropagation();
    try { localStorage.setItem(ROAM_KEY, "0"); } catch {}
    setRoaming(false);
    try { window.dispatchEvent(new CustomEvent(PET_EVENT)); } catch {}
  };

  useEffect(() => () => {
    clearTimeout(clickTimer.current);
  }, []);

  if (!visible || !spriteId) return null;

  return (
    <div ref={wrapRef} className="buddy-wrap">
      <style>{BUDDY_CSS}</style>

      {/* Wordless reaction — hearts + musical notes (cry plays on click) */}
      {hearts.map(h => (
        <span key={h.id} className="buddy-heart"
          style={{ "--dx": `${h.dx}px`, animationDelay: `${h.delay}s` }}>{h.emoji}</span>
      ))}

      {/* Send-home button */}
      <button className="buddy-x" onClick={sendHome}
        title={t("เรียกกลับบ้าน","Send home","おうちへ")}>✕</button>

      {/* The buddy */}
      <button className={`buddy-btn${walking ? " walking" : " idling"}`}
        onClick={handleClick} onDoubleClick={handleDouble}
        title={t("คลิกลูบหัว · ดับเบิลคลิกเปิดเกม","Click to pet · double-click to open game","クリックでなでる · ダブルクリックでゲーム")}>
        <BuddySprite id={spriteId} size={SIZE} flip={flip} />
        <span className="buddy-shadow" />
      </button>
    </div>
  );
}

const BUDDY_CSS = `
  .buddy-wrap {
    position: fixed; left: 0; bottom: ${GROUND}px;
    z-index: 400; width: ${SIZE}px; height: ${SIZE + 28}px;
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
    cursor: pointer; pointer-events: auto;
    display: flex; align-items: flex-end; justify-content: center;
  }
  .buddy-btn.walking img { animation: buddy-walk 0.5s ease-in-out infinite; }
  .buddy-btn.idling  img { animation: buddy-idle 2.4s ease-in-out infinite; }
  .buddy-btn:active img { transform: scale(0.9) !important; }
  @keyframes buddy-walk {
    0%, 100% { translate: 0 0; }
    25%      { translate: 0 -3px; }
    50%      { translate: 0 0; }
    75%      { translate: 0 -2px; }
  }
  @keyframes buddy-idle {
    0%, 100% { translate: 0 0; }
    50%      { translate: 0 -4px; }
  }
  .buddy-shadow {
    position: absolute; bottom: 2px; left: 50%;
    width: 46px; height: 9px; transform: translateX(-50%);
    background: radial-gradient(ellipse, rgba(0,0,0,0.38), transparent 70%);
    filter: blur(2px); pointer-events: none;
  }
  .buddy-x {
    position: absolute; top: 22px; right: -4px;
    width: 19px; height: 19px; border-radius: 50%;
    background: rgba(15,23,42,0.7); color: rgba(255,255,255,0.85);
    border: 1px solid rgba(255,255,255,0.25);
    font-size: 10px; line-height: 1; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    pointer-events: auto; opacity: 0; transition: opacity 0.2s, background 0.2s;
    backdrop-filter: blur(6px); z-index: 2;
  }
  .buddy-wrap:hover .buddy-x { opacity: 1; }
  .buddy-x:hover { background: rgba(239,68,68,0.9); color: #fff; }
  .buddy-heart {
    position: absolute; bottom: ${SIZE - 10}px; left: 50%;
    font-size: 15px; pointer-events: none; z-index: 3;
    animation: buddy-heart-fly 1.3s ease-out forwards;
  }
  @keyframes buddy-heart-fly {
    0%   { opacity: 0; transform: translate(-50%, 0) scale(0.5); }
    25%  { opacity: 1; transform: translate(-50%, -10px) scale(1); }
    100% { opacity: 0; transform: translate(calc(-50% + var(--dx,0)), -56px) scale(0.9); }
  }
  @media (prefers-reduced-motion: reduce) {
    .buddy-btn.walking img, .buddy-btn.idling img { animation: none; }
  }
`;
