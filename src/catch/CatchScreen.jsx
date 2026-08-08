import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { X, Trophy } from "lucide-react";
import { getArt, getLocalName, typeColor } from "../utils.js";
import CatchScene from "./CatchScene.jsx";
import CatchLeaderboard from "../components/CatchLeaderboard.jsx";
import CatchDebug from "./CatchDebug.jsx";
import { CATCH_CSS } from "./catchStyles.js";
import { BallImg, BerryImg } from "./artwork.jsx";
import { sfx, haptic } from "./sfx.js";
import {
  BALLS, BERRIES, ballById, baseCatchRate,
  catchChance, fleeChance, wobbleCount, ringDifficulty, sceneForType,
} from "./catchMath.js";
import {
  TUNING, angleTo, angleDelta, spinArmed, spinPowerFrom,
  tangentialFraction, TANGENTIAL_GATE,
  throwGeometry, flightAt, targetOffset,
  dodgeRangeFor, ringRadiusAt, judge, curveLanded,
} from "./throwEngine.js";
import {
  getState, ballCount, berryCount, totalBalls,
  spendBall, spendBerry, recordCaught,
} from "./inventory.js";
import {
  CAPTURE, buildSequence, absorbStyleFor, absorbMs,
} from "./captureSequence.js";
import DissolveCanvas from "./DissolveCanvas.jsx";

// IDLE ─pointerdown→ HOLDING ─spin gates→ SPINNING ─pointerup→ FLYING
//   → RESOLVING → IDLE. Input is locked outside idle, or a second throw races
//   the ball counter and the spin state (§6).
const TRAIL_DOTS = 10;
const t = (lang, en, th, ja) => (lang === "th" ? th : lang === "ja" ? ja : en);

// Phases that belong to the capture sequence (§2). Grouped so the render and
// the animation loop can ask "are we mid-capture?" in one place instead of
// listing five strings each time and drifting apart later.
const CAPTURING = new Set(["impact", "absorb", "drop", "wobble", "result"]);
// Distinct keyframe names per beat: a CSS animation only restarts when the
// animation-name changes, so reusing one name would play the wobble once and
// then sit still for the rest of them.
const WOBBLE_KEYS = ["a", "b", "c"];
const RESOLVE_STARS = 8;   // §7.1
const BREAK_SPARKS = 6;    // §7.2

export default function CatchScreen({ pokemon, lang = "en", thaiArr, jpArr, onClose }) {
  // ── Discrete state: only things that actually change the render ──────────
  const [state, setState] = useState(getState);
  // idle|flying|resolving, then the capture sequence: impact|absorb|drop|wobble|result
  const [phase, setPhase] = useState("idle");
  const [absorbStyle, setAbsorbStyle] = useState("beam");
  // Where the capture plays out, in arena px, frozen at the moment of contact.
  const [capGeom, setCapGeom] = useState(null);
  const [ballId, setBallId] = useState("poke");
  const [pickerOpen, setPickerOpen] = useState(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [activeBerry, setActiveBerry] = useState(null);
  const [captureRate, setCaptureRate] = useState(null);
  const [spinOn, setSpinOn] = useState(0);    // 0 | -1 | +1 — drives ball colour
  const [holding, setHolding] = useState(false);
  const [resultKey, setResultKey] = useState(null);
  const [curveHit, setCurveHit] = useState(false);
  const [wobble, setWobble] = useState(0);
  const [outcome, setOutcome] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [liveMsg, setLiveMsg] = useState("");
  const [status, setStatus] = useState("");
  const [aimNudge, setAimNudge] = useState(0); // keyboard aiming, px
  const [showDebug, setShowDebug] = useState(false);

  // ── Continuous values live in refs and are written straight to the DOM.
  //    Re-rendering React every frame would stutter the drag (§8).
  const arenaRef  = useRef(null);
  const dockRef   = useRef(null);
  const stageRef  = useRef(null);
  const pokeRef   = useRef(null);
  const ringEl    = useRef(null);
  const dotRef    = useRef(null);
  const barRef    = useRef(null);
  const flyRef    = useRef(null);
  const trailRefs = useRef([]);
  const loopRef   = useRef(null);
  const timers    = useRef([]);
  const addTimer  = (id) => { timers.current.push(id); return id; };

  const spin      = useRef({ dir: 0, power: 0, peak: 0, omega: 0, turn: 0, lastAngle: null, lastMove: 0 });
  const path      = useRef([]);                 // recent pointer samples
  const targetRef = useRef({ x: 0, hop: 0 });
  const ringR     = useRef(TUNING.ringMax);
  const flight    = useRef(null);
  const trailBuf  = useRef([]);
  const holdRef   = useRef(false);
  // Telemetry for the debug panel. Refs, so watching the numbers never costs
  // a re-render of the game itself.
  const telemetry = useRef({});
  const lastThrow = useRef(null);

  // Capture-sequence bookkeeping. The roll is stored so the debug panel and the
  // watchdog can see the already-decided outcome without re-rolling it (§1.2).
  const captureRoll = useRef(null);
  const capBallRef  = useRef(null);
  const watchdog    = useRef(null);
  const outcomeRef  = useRef(null);
  const fastForward = useRef(null);   // jump to the end, set while a capture runs

  const reduceMotion = useMemo(
    () => typeof window !== "undefined"
      && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
    []
  );

  const localName = getLocalName(pokemon.id, lang, thaiArr, jpArr);
  const name = localName ?? pokemon.name;
  const art = getArt(pokemon);
  const scene = sceneForType(pokemon.types?.[0]?.type?.name ?? "normal");
  const rate = useMemo(() => baseCatchRate(pokemon, captureRate), [pokemon, captureRate]);
  const difficulty = ringDifficulty(rate, lang);
  const ballsLeft = ballCount(state, ballId);
  const dodge = useMemo(() => dodgeRangeFor(rate), [rate]);
  // A bigger species gets a bigger ring — large targets are easier by nature.
  const spriteScale = useMemo(() => {
    const h = pokemon.height ?? 10;
    return Math.max(0.8, Math.min(1.35, 0.85 + h / 60));
  }, [pokemon.height]);

  const locked = phase !== "idle";

  // Other features listen for these: MusicPlayer ducks, WeatherStatus hides.
  useEffect(() => {
    try { window.dispatchEvent(new CustomEvent("catch:open")); } catch {}
    return () => { try { window.dispatchEvent(new CustomEvent("catch:close")); } catch {} };
  }, []);
  useEffect(() => () => {
    timers.current.forEach(clearTimeout);
    clearTimeout(watchdog.current);
    if (loopRef.current) cancelAnimationFrame(loopRef.current);
  }, []);

  // The watchdog and the fast-forward both run outside React's render, so they
  // need the current outcome without closing over a stale one.
  useEffect(() => { outcomeRef.current = outcome; }, [outcome]);

  useEffect(() => {
    let alive = true;
    fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokemon.id}`)
      .then(r => r.json())
      .then(d => { if (alive) setCaptureRate(d?.capture_rate ?? null); })
      .catch(() => {});
    return () => { alive = false; };
  }, [pokemon.id]);

  const geom = useCallback(() => {
    const a = arenaRef.current?.getBoundingClientRect();
    const d = dockRef.current?.getBoundingClientRect();
    const w = a?.width ?? 360, h = a?.height ?? 540;
    return {
      arena: a, w, h,
      ballX: d && a ? d.left + d.width / 2 - a.left : w / 2,
      ballY: d && a ? d.top + d.height / 2 - a.top : h - 110,
      targetY: h * 0.38,
    };
  }, []);

  const resetThrowState = useCallback(() => {
    spin.current = { dir: 0, power: 0, peak: 0, omega: 0, turn: 0, lastAngle: null, lastMove: 0 };
    path.current = [];
    setSpinOn(0);
    if (dotRef.current) dotRef.current.style.transform = "rotate(0deg)";
    if (barRef.current) barRef.current.style.width = "0%";
  }, []);

  /**
   * The ball kicks once as the particle stream lands (§4.3). Driven by a class
   * toggle rather than state: this fires from inside the canvas' rAF loop, and
   * a re-render there would cost a frame for a 220ms flourish.
   */
  const onBallPulse = useCallback(() => {
    const el = capBallRef.current;
    if (!el) return;
    el.classList.remove("pulse");
    void el.offsetWidth;          // force a reflow so the animation retriggers
    el.classList.add("pulse");
  }, []);

  /** Where the capture plays out, measured once at contact and then frozen. */
  const captureGeometry = useCallback(() => {
    const a = arenaRef.current?.getBoundingClientRect();
    const p = pokeRef.current?.getBoundingClientRect();
    const w = a?.width ?? 360, h = a?.height ?? 540;
    // Measured from the DOM rather than recomputed, so the responsive sprite
    // sizes stay correct without this having to know about the breakpoints.
    const sprite = a && p
      ? { x: p.left - a.left + p.width / 2, y: p.top - a.top + p.height / 2, w: p.width, h: p.height }
      : { x: w / 2, y: h * 0.38 - 13, w: 210, h: 210 };
    // The ball settles just below the sprite's middle, so the beam has room to
    // run upward into it (§4.2) instead of being a zero-length bar.
    const ballY = sprite.y + sprite.h * 0.30;
    // Then it falls to the floor in front of the target — far enough that the
    // squash on landing reads as weight (§5).
    const groundY = Math.min(h - 150, ballY + 150);
    return {
      w, h,
      ballX: sprite.x,
      ballY,
      groundY,
      fall: Math.max(40, groundY - ballY),
      sprite,
      // Held rather than built in the JSX: DissolveCanvas keys its rAF loop on
      // this object, and a fresh literal each render would restart the sim.
      ballPoint: { x: sprite.x, y: ballY },
      beamLen: Math.max(24, ballY - sprite.y),
    };
  }, []);

  const backToIdle = useCallback(() => {
    setPhase("idle"); setOutcome(null); setResultKey(null);
    setCurveHit(false); setWobble(0); setHolding(false); setStatus("");
    holdRef.current = false;
    flight.current = null; trailBuf.current = [];
    captureRoll.current = null;
    fastForward.current = null;
    clearTimeout(watchdog.current);
    setCapGeom(null);
    resetThrowState();
  }, [resetThrowState]);

  // ── One animation loop for everything (§8) ───────────────────────────────
  useEffect(() => {
    let running = true;
    const t0 = performance.now();

    const frame = (now) => {
      if (!running) return;
      const elapsed = now - t0;

      // Target drifts until the ball makes contact. From `impact` on, it has to
      // hold still — the capture is laid out in coordinates frozen at contact,
      // and a drifting sprite would slide out from under the beam.
      if (!CAPTURING.has(phase)) {
        const off = targetOffset(elapsed, dodge);
        targetRef.current = off;
        if (stageRef.current) {
          stageRef.current.style.transform = `translate(${off.x}px, ${-off.hop}px)`;
        }
      }

      // The ring belongs to the target, not to a fixed spot on screen (§4.2).
      if (phase === "idle") {
        const r = ringRadiusAt(elapsed, spriteScale);
        ringR.current = r;
        if (ringEl.current) ringEl.current.setAttribute("r", r.toFixed(1));
      }

      // Spin bleeds away once the finger stops moving (§2.4).
      const s = spin.current;
      if (s.dir !== 0 && now - s.lastMove > TUNING.spinIdleMs) {
        s.peak = Math.max(0, s.peak - TUNING.spinDecayPerFrame);
        s.power = s.peak;
        if (barRef.current) barRef.current.style.width = `${s.peak * 100}%`;
        if (s.peak === 0) { s.dir = 0; setSpinOn(0); setStatus(""); }
      }

      // Flight
      const f = flight.current;
      if (f) {
        const u = Math.min(1, (now - f.start) / (TUNING.flightTime * 1000));
        const p = flightAt(u, f.params);
        if (flyRef.current) {
          flyRef.current.style.transform =
            `translate(${p.x}px, ${p.y}px) translate(-50%, -50%) scale(${p.scale})`;
        }
        // Trail is a fixed pool, so a long session can't grow the DOM (§8).
        trailBuf.current.push({ x: p.x, y: p.y, at: now });
        if (trailBuf.current.length > TRAIL_DOTS) trailBuf.current.shift();
        for (let i = 0; i < TRAIL_DOTS; i++) {
          const el = trailRefs.current[i];
          const pt = trailBuf.current[i];
          if (!el) continue;
          if (!pt) { el.style.opacity = "0"; continue; }
          el.style.transform = `translate(${pt.x}px, ${pt.y}px) translate(-50%, -50%)`;
          el.style.opacity = String(Math.max(0, 1 - (now - pt.at) / TUNING.trailLifeMs) * 0.5);
        }
        if (u >= 1) { flight.current = null; f.onDone(); }
      }

      telemetry.current = {
        phase,
        dir: s.dir, power: +s.peak.toFixed(2), turn: +s.turn.toFixed(2),
        omega: +s.omega.toFixed(1), tang: +(s.tang ?? 0).toFixed(2),
        ring: +ringR.current.toFixed(1),
        targetX: +(targetRef.current.x).toFixed(1),
      };

      loopRef.current = requestAnimationFrame(frame);
    };
    loopRef.current = requestAnimationFrame(frame);

    // Don't burn battery in a background tab (§8). On the way back, a capture
    // that was mid-flight is shown its ending rather than resumed — the timers
    // were throttled while away, so "carry on" would mean staring at a frozen
    // ball for the remainder of the sequence.
    const onVis = () => {
      if (document.hidden) { running = false; cancelAnimationFrame(loopRef.current); }
      else {
        if (!running) { running = true; loopRef.current = requestAnimationFrame(frame); }
        fastForward.current?.();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      running = false;
      cancelAnimationFrame(loopRef.current);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [phase, dodge, spriteScale]);

  // ── Resolving a landed throw ─────────────────────────────────────────────
  // ── Capture sequence (§2–§8) ─────────────────────────────────────────────
  // Drives the five stages from the table in captureSequence.js. The outcome is
  // rolled once here, before any of it plays; every stage after this point is
  // presentation of a result that already exists (§1.2).
  const resolve = useCallback((verdict, curved) => {
    const afterSpend = spendBall(ballId);
    if (!afterSpend) return;
    setState(afterSpend);

    const mult = verdict.mult * (curved ? TUNING.curveBonus : 1);
    const chance = catchChance({ rate, ballId, berryId: activeBerry, throwMult: mult });
    const caught = Math.random() < chance;
    const wobbles = wobbleCount(caught, chance, Math.random);
    setActiveBerry(null);
    setResultKey(verdict.key);
    setCurveHit(curved);

    const style = absorbStyleFor(rate);
    setAbsorbStyle(style);
    captureRoll.current = { caught, chance, wobbles, style };
    setCapGeom(captureGeometry());

    const settle = (didCatch) => {
      fastForward.current = null;
      clearTimeout(watchdog.current);
      if (didCatch) {
        setState(recordCaught(pokemon.id));
        setOutcome("caught");
        sfx.success(); haptic([30, 40, 60]);
        setLiveMsg(t(lang, `Caught ${name}`, `จับ ${name} สำเร็จ`, `${name}を捕まえた`));
        try { window.dispatchEvent(new CustomEvent("pokemon:caught")); } catch {}
        addTimer(setTimeout(() => onClose?.(), CAPTURE.resolveCatchMs + 900));
        return;
      }
      const failed = attempts + 1;
      setAttempts(failed);
      sfx.fail();
      const left = totalBalls(getState());
      setLiveMsg(t(lang, `It broke free — ${left} balls left`,
        `หลุดออกมา เหลือบอล ${left} ลูก`, `逃げられた 残り${left}個`));

      // The ball always bursts open first (§7.2). Running out of balls or
      // fleeing are consequences of that beat, so they follow it rather than
      // replacing it — otherwise the target never visibly comes back.
      setOutcome("broke");

      if (left <= 0) {
        setLiveMsg(t(lang, "Out of balls — it got away", "บอลหมด โปเกม่อนหนีไป", "ボール切れ"));
        addTimer(setTimeout(() => {
          setOutcome("empty"); sfx.flee();
          addTimer(setTimeout(() => onClose?.(), 1800));
        }, CAPTURE.resolveBreakMs));
        return;
      }
      if (Math.random() < fleeChance(rate, failed)) {
        setLiveMsg(t(lang, `${name} fled`, `${name} หนีไปแล้ว`, `${name}は逃げた`));
        addTimer(setTimeout(() => {
          setOutcome("fled"); sfx.flee();
          addTimer(setTimeout(() => onClose?.(), CAPTURE.fleeMs));
        }, CAPTURE.resolveBreakMs));
        return;
      }
      addTimer(setTimeout(backToIdle, CAPTURE.resolveBreakMs));
    };

    // Reduced motion gets the answer immediately — making this group wait out
    // four seconds of animation they've asked not to see would be worse than
    // showing nothing at all (§10).
    if (reduceMotion) {
      setPhase("result");
      settle(caught);
      return;
    }

    const stages = buildSequence({ style, wobbles, caught });
    let i = 0;
    let timer = null;
    const runNext = () => {
      if (i >= stages.length) return;
      const st = stages[i++];
      switch (st.name) {
        case "impact":
          setPhase("impact");
          sfx.hit(); haptic(20);
          if (verdict.key !== "hit") sfx.bonus(verdict.key);
          break;
        case "absorb":
          setPhase("absorb");
          sfx.suckIn();
          break;
        case "drop":
          setPhase("drop");
          break;
        case "wobble":
          setPhase("wobble");
          setWobble(st.index);
          // The final wobble gets its own note, so the ear knows the answer
          // is about to land (§6.3).
          if (st.last) sfx.bonus("great"); else sfx.wobble();
          haptic(15);
          break;
        default:
          setPhase("result");
          settle(caught);
          return;
      }
      timer = addTimer(setTimeout(runNext, st.ms));
    };
    runNext();

    // Skip whatever is left and show the ending. Used both by the watchdog and
    // by the tab coming back from the background (§8).
    fastForward.current = () => {
      fastForward.current = null;
      clearTimeout(timer);
      clearTimeout(watchdog.current);
      i = stages.length;
      setPhase("result");
      settle(caught);
    };

    // Escape hatch: if a stage never fires — throttled tab, dropped frames —
    // jump to the end rather than stranding the player mid-sequence (§8).
    clearTimeout(watchdog.current);
    watchdog.current = setTimeout(() => {
      if (outcomeRef.current === null) fastForward.current?.();
    }, CAPTURE.watchdogMs);
  }, [ballId, activeBerry, rate, attempts, lang, name, pokemon.id, onClose,
      reduceMotion, backToIdle, captureGeometry]);

  // ── Launch ───────────────────────────────────────────────────────────────
  const launch = useCallback((vx, vy, extraAim = 0) => {
    const g = geom();
    const D = g.ballY - g.targetY;                 // distance to the target plane
    const s = spin.current;
    const dir = s.dir, power = s.peak;
    const originX = g.ballX + extraAim;
    const { aim, shift, landing } = throwGeometry({
      ballCenterX: originX, vx, vy,
      distanceToTarget: D, spinDir: dir, spinPower: power,
    });

    setPhase("flying");
    setHolding(false);
    holdRef.current = false;
    setStatus("");
    sfx.throwBall();
    trailBuf.current = [];

    const params = {
      ballCenterX: originX, ballCenterY: g.ballY,
      targetY: g.targetY, landing, shift,
    };

    const onDone = () => {
      // Judged against where the target and its ring are at contact.
      const targetX = g.w / 2 + targetRef.current.x;
      const verdict = judge({ landing, targetX, ringRadius: ringR.current, spriteScale });
      const curved = curveLanded(dir, shift);
      lastThrow.current = {
        vx: +vx.toFixed(0), vy: +vy.toFixed(0), ratio: +(vx / vy).toFixed(3),
        aim: +aim.toFixed(1),
        shift: +shift.toFixed(1),
        landing: +landing.toFixed(1), targetX: +targetX.toFixed(1),
        distance: +Math.abs(landing - targetX).toFixed(1),
        ring: +ringR.current.toFixed(1),
        verdict: verdict.key, curved,
      };
      resetThrowState();
      if (!verdict.hit) {
        setPhase("resolving");
        setResultKey("missed");
        sfx.miss();
        setLiveMsg(t(lang, "Missed — no ball used", "ขว้างพลาด ไม่เสียบอล", "はずれ ボールは減りません"));
        addTimer(setTimeout(backToIdle, TUNING.resolveMs));
        return;
      }
      resolve(verdict, curved);
    };

    if (reduceMotion) { flight.current = null; onDone(); return; }
    flight.current = { start: performance.now(), params, onDone };
  }, [geom, resolve, resetThrowState, backToIdle, lang, spriteScale, reduceMotion]);

  // ── Pointer input (§7) ───────────────────────────────────────────────────
  const onPointerDown = (e) => {
    if (locked || ballsLeft <= 0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);  // keep tracking off-edge
    resetThrowState();
    setHolding(true);
    holdRef.current = true;
    const now = performance.now();
    path.current = [{ x: e.clientX, y: e.clientY, t: now }];
    const g = geom();
    if (g.arena) {
      spin.current.lastAngle =
        angleTo(e.clientX - g.arena.left, e.clientY - g.arena.top, g.ballX, g.ballY);
    }
    spin.current.lastMove = now;
  };

  const onPointerMove = (e) => {
    if (!holdRef.current || locked) return;
    const now = performance.now();
    const g = geom();
    if (!g.arena) return;

    const last = path.current[path.current.length - 1];
    const moved = last ? Math.hypot(e.clientX - last.x, e.clientY - last.y) : 99;
    // Velocity is read across several samples, never one frame, which is noisy
    // at the instant the finger lifts (§3.1).
    path.current.push({ x: e.clientX, y: e.clientY, t: now });
    if (path.current.length > 5) path.current.shift();
    if (moved < 3) return;                            // filter hand tremor (§2.1)

    // Angle of the finger AROUND THE BALL — never a movement cross product,
    // which flips sign because screen Y points down (§2.1).
    const px = e.clientX - g.arena.left, py = e.clientY - g.arena.top;
    const ang = angleTo(px, py, g.ballX, g.ballY);
    const s = spin.current;
    if (s.lastAngle != null) {
      const d = angleDelta(ang, s.lastAngle);         // seam-safe at ±180°
      const dt = Math.max(0.008, (now - s.lastMove) / 1000);
      s.omega = d / dt;

      // Only circling counts. The flick sweeps the angle just as fast, and
      // letting it through re-armed spin backwards on the final samples.
      const tang = tangentialFraction(
        e.clientX - last.x, e.clientY - last.y, px, py, g.ballX, g.ballY
      );
      const circling = tang >= TANGENTIAL_GATE;
      s.tang = tang;
      if (circling) s.turn += d;

      if (circling && spinArmed(s.turn, s.omega)) {
        // First armed direction wins for the rest of the gesture: the wind-up
        // decides which way it bends, nothing later can hijack it.
        if (s.dir === 0) s.dir = Math.sign(s.omega);
        // Hold the best spin reached, so it doesn't collapse the moment the
        // motion turns from circling into the flick (§2.3).
        s.peak = Math.max(s.peak, spinPowerFrom(s.omega));
        s.power = s.peak;
        setSpinOn(s.dir);
        setStatus(t(lang,
          s.dir > 0 ? "spinning right — flick up" : "spinning left — flick up",
          s.dir > 0 ? "หมุนขวา — ปัดขึ้นเลย" : "หมุนซ้าย — ปัดขึ้นเลย",
          s.dir > 0 ? "右回転 — 上にフリック" : "左回転 — 上にフリック"));
        if (barRef.current) barRef.current.style.width = `${s.peak * 100}%`;
      }
    }
    s.lastAngle = ang;
    s.lastMove = now;

    // Marker pinned to the finger's angle: the player must feel they are
    // turning the ball, not watching a canned animation (§5).
    if (dotRef.current) dotRef.current.style.transform = `rotate(${ang * 180 / Math.PI}deg)`;
  };

  const onPointerUp = () => {
    if (!holdRef.current || locked) { setHolding(false); holdRef.current = false; return; }
    const pts = path.current;
    setHolding(false);
    holdRef.current = false;

    if (pts.length < 2) { resetThrowState(); return; }        // a tap, not a throw
    const first = pts[0], last = pts[pts.length - 1];
    const dt = (last.t - first.t) / 1000;
    if (dt <= 0.001) { resetThrowState(); return; }

    const vx = (last.x - first.x) / dt;
    const vy = (first.y - last.y) / dt;                       // up is positive

    if (vy < TUNING.minFlickSpeed) {
      // Letting go mid-spin must never burn a ball (§3.2).
      setStatus(t(lang, "too flat — flick upward", "ปัดแบนไป — ปัดขึ้น", "浅すぎ — 上にフリック"));
      sfx.miss();
      resetThrowState();
      return;
    }
    launch(vx, vy);
  };

  // ── Keyboard (§7.1) ──────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose?.(); return; }
      const tag0 = document.activeElement?.tagName;
      if ((e.key === "d" || e.key === "D") && tag0 !== "INPUT") {
        e.preventDefault(); setShowDebug(v => !v); return;
      }
      if (locked) return;
      const tag = tag0;
      if (tag === "INPUT" || tag === "SELECT") return;

      if (e.key === "ArrowLeft")  { e.preventDefault(); setAimNudge(v => Math.max(-120, v - 12)); return; }
      if (e.key === "ArrowRight") { e.preventDefault(); setAimNudge(v => Math.min(120, v + 12)); return; }

      if (e.key === "q" || e.key === "Q" || e.key === "e" || e.key === "E") {
        e.preventDefault();
        const dir = (e.key === "q" || e.key === "Q") ? -1 : 1;
        spin.current.dir = dir;
        spin.current.peak = 0.7;      // fixed power — there's no gesture to read
        spin.current.power = 0.7;
        spin.current.lastMove = performance.now();
        setSpinOn(dir);
        setStatus(t(lang,
          dir > 0 ? "spin right armed — Space to throw" : "spin left armed — Space to throw",
          dir > 0 ? "ตั้งหมุนขวา — กด Space" : "ตั้งหมุนซ้าย — กด Space",
          dir > 0 ? "右回転 — Spaceで投げる" : "左回転 — Spaceで投げる"));
        if (barRef.current) barRef.current.style.width = "70%";
        return;
      }

      if (e.key === " " || e.key === "Enter") {
        if (tag === "BUTTON") return;
        e.preventDefault();
        if (ballsLeft <= 0) return;
        // No flick to measure: throw straight with standard values so the ring
        // timing stays the only variable, keeping it a skill check (§7.1).
        launch(0, 1000, aimNudge);
      }
    };
    window.addEventListener("keydown", h, true);
    return () => window.removeEventListener("keydown", h, true);
  }, [locked, ballsLeft, aimNudge, launch, onClose, lang]);

  // Keyboard spin has no gesture to keep it alive, so hold the clock open.
  useEffect(() => {
    if (!spinOn || holdRef.current) return;
    const iv = setInterval(() => { spin.current.lastMove = performance.now(); }, 100);
    return () => clearInterval(iv);
  }, [spinOn]);

  const armBerry = (id) => {
    if (berryCount(state, id) <= 0) return;
    const st = spendBerry(id);
    if (!st) return;
    setState(st); setActiveBerry(id); setPickerOpen(null); sfx.berry();
    setLiveMsg(t(lang, "Berry used — affects the next throw",
      "ใช้เบอร์รี่ มีผลกับการขว้างครั้งถัดไป", "きのみ使用 次の投球に有効"));
  };

  // ── Capture rendering ────────────────────────────────────────────────────
  // The stage classes are assembled here rather than inline in the JSX: five
  // phases crossed with four outcomes is more than a template literal can hold
  // without becoming unreadable.
  const capturing = CAPTURING.has(phase);
  const backOnStage = phase === "result"
    && (outcome === "broke" || outcome === "empty" || outcome === "fled");

  const pokeCls = ["cx-poke",
    phase === "impact" && "shake",
    phase === "absorb" && (absorbStyle === "dissolve" ? "absorb-dissolve" : "absorb-beam"),
    (phase === "drop" || phase === "wobble") && "gone",
    phase === "result" && outcome === "caught" && "gone",
    backOnStage && outcome !== "fled" && "reappear",
    outcome === "fled" && "flee",
  ].filter(Boolean).join(" ");

  // Losing the target but leaving its shadow on the floor is the single most
  // noticeable way to break the illusion, so they always move together (§4.4).
  const shadowCls = ["cx-shadow",
    (phase === "absorb" || phase === "drop" || phase === "wobble") && "gone",
    phase === "result" && outcome === "caught" && "gone",
    outcome === "fled" && "gone",
  ].filter(Boolean).join(" ");

  const capBallCls = ["cx-cap-ball",
    phase === "drop" && "drop",
    (phase === "wobble" || phase === "result") && "grounded",
    phase === "wobble" && wobble > 0 && `w${WOBBLE_KEYS[(wobble - 1) % WOBBLE_KEYS.length]}`,
    phase === "result" && outcome === "caught" && "caught",
    phase === "result" && outcome !== "caught" && "burst",
  ].filter(Boolean).join(" ");

  const capVars = capGeom ? {
    "--bx": `${capGeom.ballX}px`,
    "--by": `${capGeom.ballY}px`,
    "--sy": `${capGeom.sprite.y}px`,
    "--fall": `${capGeom.fall}px`,
    "--beamlen": `${capGeom.beamLen}px`,
    // How far the sprite has to travel to reach the ball, for the beam suck.
    "--sdy": `${capGeom.ballY - capGeom.sprite.y}px`,
    "--absorb": `${absorbMs(absorbStyle)}ms`,
  } : undefined;

  const ownedBallKinds = BALLS.filter(b => ballCount(state, b.id) > 0);
  const resultLabel = resultKey === "excellent" ? "Excellent!"
    : resultKey === "great" ? "Great!"
    : resultKey === "nice" ? "Nice!"
    : resultKey === "hit" ? t(lang, "Hit!", "โดน!", "ヒット!")
    : resultKey === "missed" ? t(lang, "Missed", "พลาด", "はずれ") : null;

  return (
    <div className={`cx-screen${reduceMotion ? " cx-reduce" : ""}`} onClick={(e) => e.stopPropagation()}>
      <style>{CATCH_CSS}</style>
      <CatchScene scene={scene} />

      <div className="cx-sr-live" role="status" aria-live="polite" aria-atomic="true">{liveMsg}</div>

      <button className="cx-btn cx-flee" onClick={onClose}
        aria-label={t(lang, "Run away", "หนี", "にげる")}
        title={t(lang, "Run away (Esc)", "หนี (Esc)", "にげる (Esc)")}>
        <X size={20} strokeWidth={2.6} />
      </button>
      <button className="cx-btn cx-lb" onClick={() => setShowLeaderboard(true)}
        aria-label={t(lang, "Leaderboard", "อันดับ", "ランキング")}>
        <Trophy size={18} strokeWidth={2.4} />
      </button>

      <div className="cx-arena" ref={arenaRef} style={capVars}>
        {/* Stage carries the target's drift so the ring rides along with it */}
        <div className="cx-stage" ref={stageRef}>
          <div className="cx-nameplate">
            <span className="cx-name">{name}</span>
            <span className="cx-diff" style={{ color: difficulty.color }}>● {difficulty.label}</span>
          </div>

          {phase === "idle" && (
            <svg className="cx-ring" viewBox="-110 -110 220 220" aria-hidden>
              <circle ref={ringEl} r={TUNING.ringMax} fill="none"
                stroke={difficulty.color} strokeWidth="4" opacity="0.9" />
            </svg>
          )}
          {art && (
            <img ref={pokeRef} className={pokeCls} src={art} alt={name} draggable={false} />
          )}
          <div className={shadowCls} />
        </div>

        {/* Trail pool — fixed size, reused by every throw */}
        {Array.from({ length: TRAIL_DOTS }).map((_, i) => (
          <div key={i} className="cx-trail" ref={el => { trailRefs.current[i] = el; }} />
        ))}

        {phase === "flying" && (
          <div className="cx-flyball" ref={flyRef}>
            <BallImg ballId={ballId} size={52} />
          </div>
        )}

        {/* ── Capture sequence layer (§3–§7) ───────────────────────────────
            Everything here is laid out in arena px frozen at contact, which is
            why it lives outside the drifting stage. */}
        {capturing && capGeom && (
          <div className="cx-capture" aria-hidden>
            {phase === "impact" && <div className="cx-impact-ring" />}

            {phase === "absorb" && absorbStyle === "beam" && <div className="cx-beamup" />}
            {phase === "absorb" && absorbStyle === "dissolve" && (
              <DissolveCanvas
                origin={capGeom.sprite}
                target={capGeom.ballPoint}
                color={typeColor(pokemon.types?.[0]?.type?.name)}
                durationMs={absorbMs("dissolve")}
                onBallPulse={onBallPulse}
                width={capGeom.w}
                height={capGeom.h}
              />
            )}

            {(phase === "drop" || phase === "wobble" || phase === "result") && (
              <div className="cx-ball-shadow" />
            )}

            <div className={capBallCls} ref={capBallRef}>
              <BallImg ballId={ballId} size={52} />
            </div>

            {phase === "result" && outcome === "caught" && (
              <>
                <div className="cx-shockwave" />
                {Array.from({ length: RESOLVE_STARS }).map((_, i) => (
                  <div key={i} className="cx-star"
                    style={{ "--a": `${(i * 360) / RESOLVE_STARS}deg` }} />
                ))}
              </>
            )}
            {phase === "result" && outcome !== "caught" && (
              // Keyed by outcome so the puff replays when a break turns into a
              // flee (§7.3) instead of sitting finished from the earlier beat.
              Array.from({ length: BREAK_SPARKS }).map((_, i) => (
                <div key={`${outcome}-${i}`} className="cx-spark"
                  style={{ "--a": `${(i * 360) / BREAK_SPARKS}deg` }} />
              ))
            )}
          </div>
        )}

        {resultLabel && (phase === "resolving" || phase === "impact"
          || phase === "absorb" || phase === "drop") && (
          <div className={`cx-tier cx-tier-${resultKey}`}>
            {curveHit && <span className="cx-curve-tag">{t(lang, "Curve", "โค้ง", "カーブ")}</span>}
            {resultLabel}
          </div>
        )}

        {outcome === "caught" && <div className="cx-gotcha">{t(lang, "Gotcha!", "จับได้!", "やったー!")}</div>}
        {outcome === "fled" && <div className="cx-banner">{t(lang, `${name} fled!`, `${name} หนีไปแล้ว!`, `${name}は逃げた!`)}</div>}
        {outcome === "empty" && <div className="cx-banner">{t(lang, "Out of balls!", "บอลหมดแล้ว!", "ボールがない!")}</div>}
      </div>

      {/* ── Controls ─────────────────────────────────────────────────────── */}
      <div className="cx-bottom">
        <button
          className={`cx-btn cx-item${berryCount(state, "boost") + berryCount(state, "calm") <= 0 ? " out" : ""}`}
          onClick={() => setPickerOpen(p => (p === "berry" ? null : "berry"))}
          disabled={locked}
          aria-label={t(lang, "Berries", "เบอร์รี่", "きのみ")}>
          <BerryImg berryId="boost" size={26} />
        </button>

        <div className="cx-ball-dock">
          <button
            ref={dockRef}
            className={`cx-ball${holding ? " held" : ""}${spinOn ? " spinning" : ""}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            disabled={locked || ballsLeft <= 0}
            style={{ visibility: phase === "idle" ? "visible" : "hidden" }}
            aria-label={t(lang,
              `Throw ${ballById(ballId).labelEN}, ${ballsLeft} left. Space throws, Q and E add spin.`,
              `ขว้าง${ballById(ballId).labelTH} เหลือ ${ballsLeft} ลูก · Space ขว้าง · Q/E ใส่สปิน`,
              `${ballById(ballId).labelJA} 残り${ballsLeft} · Spaceで投げる · Q/Eで回転`)}>
            <BallImg ballId={ballId} size={72} charged={spinOn !== 0} />
            <span className="cx-spin-orbit" ref={dotRef} aria-hidden>
              <span className={`cx-spin-dot${spinOn ? " on" : ""}`} />
            </span>
          </button>

          <div className="cx-power" aria-hidden>
            <div className="cx-power-fill" ref={barRef} />
          </div>

          <div className="cx-count">
            {ballById(ballId).labelEN.split(" ")[0]} × {ballsLeft}
          </div>
        </div>

        {ownedBallKinds.length > 1 ? (
          <button className="cx-btn cx-swap"
            onClick={() => setPickerOpen(p => (p === "ball" ? null : "ball"))}
            disabled={locked}
            aria-label={t(lang, "Change ball", "เปลี่ยนชนิดบอล", "ボールを変える")}>
            <BallImg ballId={ballId} size={26} />
          </button>
        ) : <div className="cx-btn cx-spacer" aria-hidden />}
      </div>

      {activeBerry && phase === "idle" && (
        <div className="cx-berry-armed">
          <BerryImg berryId={activeBerry} size={18} />{" "}
          {t(lang, "active for next throw", "มีผลกับการขว้างครั้งถัดไป", "次の投球に有効")}
        </div>
      )}

      {phase === "idle" && (
        <div className={`cx-hint${status ? " loud" : ""}`}>
          {status || t(lang,
            "flick up to throw · circle to curve · Space / Q / E",
            "ปัดขึ้นเพื่อขว้าง · วนนิ้วเพื่อโค้ง · Space / Q / E",
            "上にフリック · 回してカーブ · Space / Q / E")}
        </div>
      )}
      {aimNudge !== 0 && phase === "idle" && (
        <div className="cx-aim-readout">
          {t(lang, "aim", "จุดเล็ง", "照準")} {aimNudge > 0 ? "→" : "←"} {Math.abs(aimNudge)}px
        </div>
      )}

      {pickerOpen === "ball" && (
        <Picker title={t(lang, "Choose a ball", "เลือกบอล", "ボールを選ぶ")} onClose={() => setPickerOpen(null)}>
          {BALLS.map(b => (
            <button key={b.id} className={`cx-pick${b.id === ballId ? " on" : ""}`}
              disabled={ballCount(state, b.id) <= 0}
              onClick={() => { setBallId(b.id); setPickerOpen(null); }}>
              <BallImg ballId={b.id} size={34} />
              <span className="cx-pick-name">
                {lang === "th" ? b.labelTH : lang === "ja" ? b.labelJA : b.labelEN}
              </span>
              <span className="cx-pick-meta">×{b.mult} · {ballCount(state, b.id)}</span>
            </button>
          ))}
        </Picker>
      )}

      {pickerOpen === "berry" && (
        <Picker title={t(lang, "Use a berry", "ใช้เบอร์รี่", "きのみを使う")} onClose={() => setPickerOpen(null)}>
          {BERRIES.map(b => (
            <button key={b.id} className="cx-pick"
              disabled={berryCount(state, b.id) <= 0}
              onClick={() => armBerry(b.id)}>
              <BerryImg berryId={b.id} size={30} />
              <span className="cx-pick-name">
                {lang === "th" ? b.labelTH : lang === "ja" ? b.labelJA : b.labelEN}
              </span>
              <span className="cx-pick-meta">
                {b.calm ? t(lang, "calms", "อยู่นิ่ง", "動きを抑える") : `×${b.mult}`} · {berryCount(state, b.id)}
              </span>
            </button>
          ))}
        </Picker>
      )}

      {showDebug && (
        <CatchDebug telemetry={telemetry} lastThrow={lastThrow} captureRoll={captureRoll}
          onClose={() => setShowDebug(false)} />
      )}

      {showLeaderboard && (
        <div className="cx-sheet" onClick={() => setShowLeaderboard(false)}>
          <div className="cx-sheet-body" onClick={(e) => e.stopPropagation()}>
            <CatchLeaderboard lang={lang} />
          </div>
        </div>
      )}
    </div>
  );
}

function Picker({ title, children, onClose }) {
  return (
    <div className="cx-sheet" onClick={onClose}>
      <div className="cx-sheet-body" onClick={(e) => e.stopPropagation()}>
        <div className="cx-sheet-title">{title}</div>
        <div className="cx-pick-list">{children}</div>
      </div>
    </div>
  );
}
