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
  catchChance, fleeChance, wobbleCount, ringDifficulty, sceneForType, isUltraBeast,
  berryById, berryCalm, berrySlow, berryReward,
} from "./catchMath.js";
import {
  TUNING, angleTo, angleDelta, spinArmed, spinPowerFrom,
  tangentialFraction, TANGENTIAL_GATE,
  throwGeometry, flightAt, targetOffset,
  dodgeRangeFor, hitRadiusFor, judge, curveLanded,
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
// Flight samples kept for the trail. More than the old dot pool held, because
// these are control points of a curve now rather than beads — too few and the
// bend of a curveball shows up as corners.
const TRAIL_SAMPLES = 16;
const TRAIL_WIDTH = 7;   // px · half-width of the ribbon at its head
// The ball rolls as it is dragged. A ball of this radius rolling without
// slipping would turn 1.6°/px; that reads as frantic on a thrown ball, so this
// is deliberately under-rotated — enough that the drag feels physical.
const ROLL_DEG_PER_PX = 0.9;
// Ball turns per turn of the finger around it. Above 1 on purpose: a wound-up
// ball should look like it is outrunning the hand.
const SPIN_ROLL_GAIN = 2.2;
// deg/s the charged ball keeps turning on its own, at full spin power, so it
// never freezes while the finger holds still before the flick.
const SPIN_FREE_DPS = 700;
// Keeps the ball from being dragged under the edge of the card.
const BALL_MARGIN = 38;
// px · closest the ball may be carried to the target plane before a throw stops
// making sense as a lob.
const TARGET_GAP = 60;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const t = (lang, en, th, ja) => (lang === "th" ? th : lang === "ja" ? ja : en);

/**
 * Quadratic-smoothed polyline through `p`, as SVG path data WITHOUT a leading
 * command — the caller supplies M or L, which is what lets the two sides of the
 * ribbon be stitched into one closed path.
 *
 * Each sample becomes a control point and the curve passes through the midpoint
 * between neighbours; that is the cheap standard way to round a polyline, and
 * it never overshoots the way a Catmull-Rom spline can on the tight bend at the
 * end of a curveball.
 */
function smoothed(p) {
  let d = `${p[0].x.toFixed(1)} ${p[0].y.toFixed(1)}`;
  for (let i = 1; i < p.length - 1; i++) {
    const mx = (p[i].x + p[i + 1].x) / 2, my = (p[i].y + p[i + 1].y) / 2;
    d += `Q${p[i].x.toFixed(1)} ${p[i].y.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
  }
  const last = p[p.length - 1];
  return `${d}L${last.x.toFixed(1)} ${last.y.toFixed(1)}`;
}

/**
 * A tapered ribbon through the flight samples: full width at the head, pinched
 * to nothing at the tail. Filled rather than stroked, because a stroke is one
 * width for its whole length and it is the taper that makes the streak read as
 * having a direction.
 */
function ribbonPath(pts, maxW = TRAIL_WIDTH) {
  const n = pts.length;
  if (n < 3) return "";
  const left = [], right = [];
  for (let i = 0; i < n; i++) {
    // Direction from the neighbours, so the normal follows the curve instead of
    // the last frame's jitter.
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const w = maxW * Math.pow(i / (n - 1), 0.7);   // eased so the pinch is soft
    const nx = -(dy / len) * w, ny = (dx / len) * w;
    left.push({ x: pts[i].x + nx, y: pts[i].y + ny });
    right.push({ x: pts[i].x - nx, y: pts[i].y - ny });
  }
  return `M${smoothed(left)}L${smoothed(right.reverse())}Z`;
}

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
// Must match the .cx-card / .cx-backdrop closing animations in catchStyles.js:
// the component stays mounted for exactly as long as they run.
const CLOSE_MS = 200;

// ── Throwable-item system (throwable-item-spec) ────────────────────────────
// §7's state machine, as timings. RESOLVE is the window the eaten berry plays
// in; RELOAD is the beat where the ball comes back and input stays locked.
const RESOLVE_MS = 620;
const RELOAD_MS  = 280;
const CHEW_MS    = 140;   // §5.2 · one chew, played four times
const CHEWS      = 4;
const EAT_SPARKS = 8;     // §5.2 · sparks around the target as it eats
const TOAST_MS   = 1400;  // §5.2
// §4.1 — a berry tumbles a little faster than a ball, to read as lighter.
const FLIGHT_SPIN_BALL  = 300;
const FLIGHT_SPIN_BERRY = 400;

export default function CatchScreen({ pokemon, lang = "en", thaiArr, jpArr, onClose }) {
  // ── Discrete state: only things that actually change the render ──────────
  const [state, setState] = useState(getState);
  // idle|flying|resolving, then the capture sequence: impact|absorb|drop|wobble|result
  const [phase, setPhase] = useState("idle");
  const [absorbStyle, setAbsorbStyle] = useState("beam");
  // Where the capture plays out, in arena px, frozen at the moment of contact.
  const [capGeom, setCapGeom] = useState(null);
  const [ballId, setBallId] = useState("poke");
  // §1.2 — the slot in the middle holds exactly one thing. The side buttons do
  // not act, they change what is in it.
  const [slotKind, setSlotKind] = useState("ball");   // §7 SLOT_BALL | SLOT_BERRY
  const [slotBerry, setSlotBerry] = useState(null);
  const [swapKey, setSwapKey] = useState(0);          // §2.2 · retriggers the cross-fade
  const [toast, setToast] = useState(null);
  const [eatBerry, setEatBerry] = useState(null);   // §5.2 · plays the chew
  // §2.2 — the item leaving the slot stays mounted for the length of the
  // cross-fade. Without it there is nothing to fade FROM and the swap is a cut.
  const [outgoing, setOutgoing] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [activeBerry, setActiveBerry] = useState(null);
  const [captureRate, setCaptureRate] = useState(null);
  const [spinOn, setSpinOn] = useState(0);    // 0 | -1 | +1 — armed spin direction
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
  const [closing, setClosing] = useState(false);

  // ── Continuous values live in refs and are written straight to the DOM.
  //    Re-rendering React every frame would stutter the drag (§8).
  const cardRef   = useRef(null);
  // The arena is inset:0 inside the card, so its rect IS the card's inner box —
  // every pointer coordinate below is made card-relative against it.
  const arenaRef  = useRef(null);
  const dockRef   = useRef(null);
  const stageRef  = useRef(null);
  const pokeRef   = useRef(null);
  const flyRef    = useRef(null);
  const ballVisRef = useRef(null);
  const trailEls  = useRef({ glow: null, core: null });
  const loopRef   = useRef(null);
  const timers    = useRef([]);
  const addTimer  = (id) => { timers.current.push(id); return id; };

  const spin      = useRef({ dir: 0, power: 0, peak: 0, omega: 0, turn: 0, lastAngle: null, lastMove: 0 });
  const path      = useRef([]);                 // recent pointer samples
  const targetRef = useRef({ x: 0, hop: 0 });
  // Where the held ball has been dragged to, and how far it has rolled doing
  // it. `sign` is the direction of the last horizontal push — the flight keeps
  // turning that way so the throw looks like it came off the same hand.
  // restX/restY: where the ball was sitting BEFORE the throwing motion started.
  // x/y are where it is right now, which during a flick is already halfway up
  // the card — see onPointerMove for why the throw must not launch from there.
  const drag      = useRef({ x: 0, y: 0, restX: 0, restY: 0, roll: 0, sign: 1, fromX: 0, fromY: 0 });
  // §5.1 — a WARPED clock, advanced by dt × speed each frame instead of read
  // from the wall. Feeding a slowed factor into a raw elapsed time would jump
  // the sine's argument the instant a berry landed, teleporting the target
  // across the card; accumulating keeps the phase continuous through the
  // change, so the sway visibly eases off rather than cutting.
  const driftClock = useRef(0);
  const releaseRoll = useRef({ deg: 0, sign: 1 });
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
  // A calming berry takes a fraction of the target's drift away — this is the
  // whole of Nanab's effect, and it was defined in catchMath but never actually
  // reached the drift, so feeding one changed nothing at all.
  const dodge = useMemo(
    () => dodgeRangeFor(rate) * (1 - berryCalm(activeBerry)),
    [rate, activeBerry]
  );
  // §5.1 — Razz slows the sway, Nanab shortens it. Two different knobs on
  // purpose: shrinking the distance and stretching the time look nothing alike,
  // and the spec asks each berry to be recognisable on sight.
  const driftSpeed = berrySlow(activeBerry);
  const stopHop = !!berryById(activeBerry)?.stopHop;
  // A bigger species is a bigger target — large ones are easier by nature.
  const spriteScale = useMemo(() => {
    const h = pokemon.height ?? 10;
    return Math.max(0.8, Math.min(1.35, 0.85 + h / 60));
  }, [pokemon.height]);
  // Constant for the whole encounter now that nothing pulses — how far off
  // centre a throw may land and still connect.
  const hitR = useMemo(() => hitRadiusFor(spriteScale), [spriteScale]);

  // §2.1 — the one thing currently loaded. Everything downstream (the throw,
  // the flying sprite, the label, the aria-label) reads this rather than
  // assuming a ball.
  const loaded = slotKind === "berry" && slotBerry
    ? { kind: "berry", id: slotBerry, def: berryById(slotBerry) }
    : { kind: "ball",  id: ballId,    def: ballById(ballId) };
  const loadedLabel = lang === "th" ? loaded.def.labelTH
    : lang === "ja" ? loaded.def.labelJA : loaded.def.labelEN;
  const loadedCount = loaded.kind === "ball"
    ? ballCount(state, loaded.id) : berryCount(state, loaded.id);

  // §7 — input is dead from FLYING through the end of RELOAD.
  const locked = phase !== "idle";

  // Close is a two-step: play the card's exit animation, then unmount. Every
  // exit in the file goes through here — an unanimated close from the flee or
  // out-of-balls path would look like a crash next to the animated one.
  const closeReq = useRef(false);
  const requestClose = useCallback(() => {
    if (closeReq.current) return;
    closeReq.current = true;
    if (reduceMotion) { onClose?.(); return; }
    setClosing(true);
    addTimer(setTimeout(() => onClose?.(), CLOSE_MS));
  }, [onClose, reduceMotion]);

  // Other features listen for these: MusicPlayer ducks, WeatherStatus hides.
  useEffect(() => {
    try { window.dispatchEvent(new CustomEvent("catch:open")); } catch {}
    return () => { try { window.dispatchEvent(new CustomEvent("catch:close")); } catch {} };
  }, []);

  // The page behind the card must not scroll under a drag that misses the card.
  // Saved and restored rather than cleared, so an outer modal that set its own
  // value gets it back instead of losing its lock when this closes.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
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
    const p = pokeRef.current?.getBoundingClientRect();
    const w = a?.width ?? 360, h = a?.height ?? 540;
    return {
      arena: a, w, h,
      ballX: d && a ? d.left + d.width / 2 - a.left : w / 2,
      ballY: d && a ? d.top + d.height / 2 - a.top : h - 110,
      // Read off the sprite instead of assumed at a fixed fraction of the card.
      // The stage hangs from the ground line now, so the body sits at a height
      // that depends on the sprite's size as well as the card's — a hardcoded
      // 38% put the target plane ~50px above the actual target on a 9:16 card,
      // and the ball flew through empty sky over its head.
      targetY: a && p ? p.top - a.top + p.height / 2 : h * 0.38,
    };
  }, []);

  /**
   * The held ball's transform. Written straight to the DOM like every other
   * per-frame value here — routing a drag through React state would re-render
   * the whole encounter on every pointermove.
   */
  const applyBallTransform = useCallback(() => {
    const el = ballVisRef.current;
    if (!el) return;
    const d = drag.current;
    el.style.transform = `translate(${d.x.toFixed(1)}px, ${d.y.toFixed(1)}px) rotate(${d.roll.toFixed(1)}deg)`;
  }, []);

  /** Back to the dock. The roll is kept, so the ball settles where it stopped
   *  turning instead of snapping upright. */
  const resetBallPos = useCallback(() => {
    drag.current.x = 0; drag.current.y = 0;
    applyBallTransform();
  }, [applyBallTransform]);

  /** §2.2 — swap what is in the slot: cross-fade 180ms, slot bounces 200ms. */
  const swapTimer = useRef(null);
  const swapSlot = useCallback((next, prevItem) => {
    setOutgoing(prevItem);
    setSwapKey(k => k + 1);
    next();
    clearTimeout(swapTimer.current);
    swapTimer.current = setTimeout(() => setOutgoing(null), 180);
  }, []);

  /** §5.2 / §3.2 — short message that says what just happened, then clears. */
  const toastTimer = useRef(null);
  const showToast = useCallback((msg) => {
    clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
  }, []);

  const resetThrowState = useCallback(() => {
    spin.current = { dir: 0, power: 0, peak: 0, omega: 0, turn: 0, lastAngle: null, lastMove: 0 };
    path.current = [];
    setSpinOn(0);
    resetBallPos();
  }, [resetBallPos]);

  /** Rebuild the streak from the current samples. Two string writes, no React. */
  const drawTrail = useCallback(() => {
    const { glow, core } = trailEls.current;
    // Below three samples ribbonPath returns "", which is also how the streak
    // gets cleared — there is no separate clearing path to keep in sync.
    const d = ribbonPath(trailBuf.current);
    if (core) core.setAttribute("d", d);
    if (glow) glow.setAttribute("d", ribbonPath(trailBuf.current, TRAIL_WIDTH * 1.7));
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
      // Fallback mirrors the stylesheet: ground line at 56% of the card, sprite
      // centre 91px above it (210/2 minus the 14px artwork margin).
      : { x: w / 2, y: h * 0.56 - 91, w: 210, h: 210 };
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
    flight.current = null; trailBuf.current = []; drawTrail();
    captureRoll.current = null;
    fastForward.current = null;
    clearTimeout(watchdog.current);
    setCapGeom(null);
    resetThrowState();
  }, [resetThrowState, drawTrail]);

  // ── One animation loop for everything (§8) ───────────────────────────────
  useEffect(() => {
    let running = true;
    let prev = performance.now();

    const frame = (now) => {
      if (!running) return;
      // Clamped: coming back from a background tab hands over one enormous gap,
      // and an unclamped dt would snap the ball through half a turn at once.
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;

      // Target drifts until the ball makes contact. From `impact` on, it has to
      // hold still — the capture is laid out in coordinates frozen at contact,
      // and a drifting sprite would slide out from under the beam.
      if (!CAPTURING.has(phase)) {
        driftClock.current += dt * 1000 * driftSpeed;
        const off = targetOffset(driftClock.current, dodge);
        targetRef.current = off;
        if (stageRef.current) {
          // Horizontal only. The hop moved to a CSS animation on .cx-bob, one
          // level down: driving it from here lifted the cast shadow off the
          // grass along with the body, which is the one thing it must not do.
          stageRef.current.style.transform = `translateX(${off.x}px)`;
        }
      }

      // A charged ball keeps turning on its own. Not gated on the finger being
      // down: Q/E arm spin with no gesture at all, and with the wound-up halo
      // removed the turning IS the only thing that says the spin is there.
      // Rate follows the stored power, so it slows as the spin bleeds away
      // below rather than cutting out.
      if (phase === "idle" && spin.current.dir !== 0 && spin.current.peak > 0) {
        drag.current.roll += spin.current.dir * SPIN_FREE_DPS * spin.current.peak * dt;
        applyBallTransform();
      }

      // Spin bleeds away once the finger stops moving (§2.4).
      const s = spin.current;
      if (s.dir !== 0 && now - s.lastMove > TUNING.spinIdleMs) {
        s.peak = Math.max(0, s.peak - TUNING.spinDecayPerFrame);
        s.power = s.peak;
        if (s.peak === 0) { s.dir = 0; setSpinOn(0); setStatus(""); }
      }

      // Flight
      const f = flight.current;
      if (f) {
        const u = Math.min(1, (now - f.start) / (TUNING.flightTime * 1000));
        const p = flightAt(u, f.params);
        if (flyRef.current) {
          const r = releaseRoll.current;
          const turns = r.kind === "berry" ? FLIGHT_SPIN_BERRY : FLIGHT_SPIN_BALL;
          const spinDeg = r.deg + r.sign * turns * u;
          flyRef.current.style.transform =
            `translate(${p.x}px, ${p.y}px) translate(-50%, -50%) `
            + `scale(${p.scale}) rotate(${spinDeg.toFixed(1)}deg)`;
        }
        // Bounded sample window, so a long session can't grow the work (§8).
        trailBuf.current.push({ x: p.x, y: p.y });
        if (trailBuf.current.length > TRAIL_SAMPLES) trailBuf.current.shift();
        drawTrail();
        if (u >= 1) { flight.current = null; f.onDone(); }
      } else if (trailBuf.current.length) {
        // Flight over: retract the streak from the tail rather than blanking it,
        // which would pop. Emptied over roughly trailLifeMs.
        const perFrame = Math.max(1, Math.round(TRAIL_SAMPLES / (TUNING.trailLifeMs / 16.7)));
        trailBuf.current.splice(0, perFrame);
        drawTrail();
      }

      telemetry.current = {
        phase,
        dir: s.dir, power: +s.peak.toFixed(2), turn: +s.turn.toFixed(2),
        omega: +s.omega.toFixed(1), tang: +(s.tang ?? 0).toFixed(2),
        hitR: +hitR.toFixed(1),
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
  }, [phase, dodge, driftSpeed, hitR, drawTrail, applyBallTransform]);

  // ── Resolving a landed throw ─────────────────────────────────────────────
  // ── Capture sequence (§2–§8) ─────────────────────────────────────────────
  // Drives the five stages from the table in captureSequence.js. The outcome is
  // rolled once here, before any of it plays; every stage after this point is
  // presentation of a result that already exists (§1.2).
  const resolve = useCallback((verdict, curved) => {
    // The ball was spent at launch (§4.2), so nothing is charged here.
    const mult = verdict.mult * (curved ? TUNING.curveBonus : 1);
    // pokemonId, because the Beast Ball's rate depends on who it is thrown at.
    const chance = catchChance({
      rate, ballId, berryId: activeBerry, throwMult: mult, pokemonId: pokemon.id,
    });
    const caught = Math.random() < chance;
    const wobbles = wobbleCount(caught, chance, Math.random);
    // Held before it is cleared: the reward is paid at the END of the capture
    // sequence, seconds after this, and by then activeBerry is already null.
    const berryUsed = activeBerry;
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
        setState(recordCaught(pokemon.id, berryReward(berryUsed)));
        setOutcome("caught");
        sfx.success(); haptic([30, 40, 60]);
        setLiveMsg(t(lang, `Caught ${name}`, `จับ ${name} สำเร็จ`, `${name}を捕まえた`));
        try { window.dispatchEvent(new CustomEvent("pokemon:caught")); } catch {}
        addTimer(setTimeout(requestClose, CAPTURE.resolveCatchMs + 900));
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
          addTimer(setTimeout(requestClose, 1800));
        }, CAPTURE.resolveBreakMs));
        return;
      }
      if (Math.random() < fleeChance(rate, failed)) {
        setLiveMsg(t(lang, `${name} fled`, `${name} หนีไปแล้ว`, `${name}は逃げた`));
        addTimer(setTimeout(() => {
          setOutcome("fled"); sfx.flee();
          addTimer(setTimeout(requestClose, CAPTURE.fleeMs));
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
  }, [ballId, activeBerry, rate, attempts, lang, name, pokemon.id, requestClose,
      reduceMotion, backToIdle, captureGeometry]);

  // ── RELOAD (§4.3, §7) ────────────────────────────────────────────────────
  // Every throw ends with a ball back in the slot. Nobody wants to throw two
  // berries in a row, and reloading by hand would cost a tap every round.
  // Input stays locked for the whole beat, which is what stops a second throw
  // racing the first one's bookkeeping.
  const reloadSlot = useCallback(() => {
    setPhase("reload");
    setSlotKind("ball");
    setSlotBerry(null);
    setSwapKey(k => k + 1);
    addTimer(setTimeout(backToIdle, RELOAD_MS));
  }, [backToIdle]);

  // ── Berry landing (§5.2) ─────────────────────────────────────────────────
  const resolveBerry = useCallback((verdict, berryId) => {
    const b = berryById(berryId);
    const bLabel = lang === "th" ? b.labelTH : lang === "ja" ? b.labelJA : b.labelEN;

    if (!verdict.hit) {
      // §4.1/§4.2 — a missed berry is gone. §11 lists softening this as an open
      // question; the spec's own rule is that it is lost, so it is lost.
      setPhase("resolving");
      setResultKey("missed");
      sfx.miss();
      const msg = t(lang, `Missed — ${bLabel} lost`,
        `พลาด เสีย${bLabel}`, `はずれ — ${bLabel}を失った`);
      setLiveMsg(msg); showToast(msg);
      addTimer(setTimeout(reloadSlot, TUNING.resolveMs));
      return;
    }

    // §5.3 — effects never stack. Throwing a second berry while one is live
    // replaces it and says so, rather than quietly multiplying.
    const wasActive = activeBerry;
    setActiveBerry(berryId);
    setPhase("eat");
    setEatBerry(berryId);
    sfx.berry();

    const effect = b.calm
      ? t(lang, `moves ${Math.round((1 - b.calm) * 100)}% as much`,
             `ขยับเหลือ ${Math.round((1 - b.calm) * 100)}%`,
             `動き ${Math.round((1 - b.calm) * 100)}%`)
      : b.slow < 1
        ? t(lang, `slowed to ${Math.round(b.slow * 100)}% · catch ×${b.mult}`,
               `ช้าลงเหลือ ${Math.round(b.slow * 100)}% · จับง่ายขึ้น ×${b.mult}`,
               `速度 ${Math.round(b.slow * 100)}% · 捕獲 ×${b.mult}`)
        : t(lang, `reward ×${b.reward ?? 1}`, `รางวัล ×${b.reward ?? 1}`, `報酬 ×${b.reward ?? 1}`);
    const eaten = t(lang, `Eaten · ${effect}`, `กินแล้ว · ${effect}`, `食べた · ${effect}`);
    setLiveMsg(eaten);
    showToast(wasActive
      ? t(lang, `${eaten} (replaced the last berry)`,
             `${eaten} (แทนที่เบอร์รี่เดิม)`, `${eaten}（前のきのみを置き換え）`)
      : eaten);

    addTimer(setTimeout(() => setEatBerry(null), CHEW_MS * CHEWS));
    addTimer(setTimeout(reloadSlot, RESOLVE_MS));
  }, [activeBerry, lang, reloadSlot, showToast]);

  // ── Launch ───────────────────────────────────────────────────────────────
  // dropX/dropY are how far the ball had been carried from the dock when it was
  // let go. They move the throw's ORIGIN, which is not the same as aiming: the
  // flick angle still decides the aim, it just starts from somewhere else — and
  // releasing higher up genuinely shortens the distance left to the target.
  const launch = useCallback((vx, vy, dropX = 0, dropY = 0) => {
    const g = geom();
    const originX = g.ballX + dropX;
    const originY = g.ballY + dropY;
    const D = originY - g.targetY;                 // distance to the target plane
    const s = spin.current;
    // §4.1 — a berry has no spin system, so it cannot be curved. Zeroed here
    // rather than by disabling the gesture, so a player who spun the ball,
    // swapped to a berry and threw does not get a curve they did not earn.
    const isBerry = slotKind === "berry" && !!slotBerry;
    const thrownId = isBerry ? slotBerry : ballId;
    const dir = isBerry ? 0 : s.dir, power = isBerry ? 0 : s.peak;

    // §4.2 — it left the hand, so it is spent NOW, whatever happens next. This
    // used to be charged on a landed hit only, which made a miss free.
    const afterSpend = isBerry ? spendBerry(thrownId) : spendBall(thrownId);
    if (!afterSpend) return;
    setState(afterSpend);

    const { aim, shift, landing } = throwGeometry({
      ballCenterX: originX, vx, vy,
      distanceToTarget: D, spinDir: dir, spinPower: power,
    });

    setPhase("flying");
    setHolding(false);
    holdRef.current = false;
    setStatus("");
    sfx.throwBall();
    trailBuf.current = []; drawTrail();

    const params = {
      ballCenterX: originX, ballCenterY: originY,
      targetY: g.targetY, landing, shift,
    };
    // The ball keeps turning the way it was last rolled, so the throw carries
    // on from the drag instead of resetting to a dead sphere in mid-air.
    // A curved throw turns the way it curves; a plain one keeps the direction it
    // was last pushed.
    releaseRoll.current = {
      deg: drag.current.roll,
      sign: dir || drag.current.sign || 1,
      kind: isBerry ? "berry" : "ball",
    };

    const onDone = () => {
      // Judged against where the target and its ring are at contact.
      const targetX = g.w / 2 + targetRef.current.x;
      const verdict = judge({ landing, targetX, spriteScale });
      const curved = curveLanded(dir, shift);
      lastThrow.current = {
        vx: +vx.toFixed(0), vy: +vy.toFixed(0), ratio: +(vx / vy).toFixed(3),
        aim: +aim.toFixed(1),
        shift: +shift.toFixed(1),
        landing: +landing.toFixed(1), targetX: +targetX.toFixed(1),
        distance: +Math.abs(landing - targetX).toFixed(1),
        hitR: +hitR.toFixed(1),
        verdict: verdict.key, curved,
      };
      resetThrowState();
      if (isBerry) { resolveBerry(verdict, thrownId); return; }
      if (!verdict.hit) {
        setPhase("resolving");
        setResultKey("missed");
        sfx.miss();
        // §4.2 — the ball is gone either way now, so the old "no ball used"
        // reassurance would be a lie.
        setLiveMsg(t(lang, "Missed", "ขว้างพลาด", "はずれ"));
        addTimer(setTimeout(reloadSlot, TUNING.resolveMs));
        return;
      }
      resolve(verdict, curved);
    };

    if (reduceMotion) { flight.current = null; onDone(); return; }
    flight.current = { start: performance.now(), params, onDone };
  }, [geom, resolve, resolveBerry, resetThrowState, reloadSlot, drawTrail, lang,
      slotKind, slotBerry, ballId, spriteScale, hitR, reduceMotion]);

  // ── Pointer input (§7) ───────────────────────────────────────────────────
  const onPointerDown = (e) => {
    if (locked || loadedCount <= 0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);  // keep tracking off-edge
    resetThrowState();
    setHolding(true);
    holdRef.current = true;
    const now = performance.now();
    path.current = [{ x: e.clientX, y: e.clientY, t: now }];
    // The ball is picked up from wherever it currently sits, so the drag is
    // measured from this grab point rather than from the dock.
    drag.current.fromX = e.clientX;
    drag.current.fromY = e.clientY;
    drag.current.x = 0; drag.current.y = 0;
    drag.current.restX = 0; drag.current.restY = 0;
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

    // Carry the ball with the finger, clamped inside the card. The spin gate
    // below still measures the finger's angle around the DOCK, not around the
    // ball being carried — circling the ball around its home is the gesture,
    // and reading the angle from a centre that moves with the finger would make
    // every circle read as zero rotation.
    const carry = drag.current;
    const prevX = carry.x;
    carry.x = clamp(e.clientX - carry.fromX, BALL_MARGIN - g.ballX, g.w - BALL_MARGIN - g.ballX);
    // The ceiling is the target plane, not the top of the card: the whole throw
    // model is a lob from below, and an origin above the target makes the aim
    // solve (vx/vy × distance) change sign, so a flick up-and-right would land
    // left. TARGET_GAP keeps a working distance even at the very top.
    carry.y = clamp(e.clientY - carry.fromY,
      g.targetY + TARGET_GAP - g.ballY, g.h - BALL_MARGIN - g.ballY);
    const ddx = carry.x - prevX;

    // A throw starts from where the ball was RESTING, not from where the finger
    // let go of it. The flick itself sweeps the finger 140–300px up the card,
    // and the ball rides along — so releasing at the end of the flick made the
    // ball launch from up there, cutting the distance left to the target from
    // 350px to as little as 60px. With the flight time fixed at 0.6s that read
    // as the ball crawling, and the harder the flick the worse it got, which is
    // backwards. So: while the finger is not yet flicking, keep noting where the
    // ball is; once it is, stop, and throw from the last resting place.
    // The gate is the throw's OWN threshold, not a fraction of it. Half of it
    // (125px/s) also caught a deliberate slow lift — carrying the ball up the
    // card at 200px/s is not a throw, and it was being ignored. Anything under
    // the speed that would count as a flick is, by definition, still carrying.
    const dtMove = Math.max(0.008, (now - last.t) / 1000);
    const upSpeed = (last.y - e.clientY) / dtMove;
    if (upSpeed < TUNING.minFlickSpeed) {
      carry.restX = carry.x;
      carry.restY = carry.y;
    }

    // Angle of the finger AROUND THE BALL — never a movement cross product,
    // which flips sign because screen Y points down (§2.1).
    const px = e.clientX - g.arena.left, py = e.clientY - g.arena.top;
    const ang = angleTo(px, py, g.ballX, g.ballY);
    const s = spin.current;
    let orbited = 0;                                  // rad the finger swept round
    if (s.lastAngle != null) {
      const dAng = angleDelta(ang, s.lastAngle);      // seam-safe at ±180°
      const dt = Math.max(0.008, (now - s.lastMove) / 1000);
      s.omega = dAng / dt;

      // Only circling counts. The flick sweeps the angle just as fast, and
      // letting it through re-armed spin backwards on the final samples.
      const tang = tangentialFraction(
        e.clientX - last.x, e.clientY - last.y, px, py, g.ballX, g.ballY
      );
      const circling = tang >= TANGENTIAL_GATE;
      s.tang = tang;
      if (circling) { s.turn += dAng; orbited = dAng; }

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
      }
    }
    s.lastAngle = ang;
    s.lastMove = now;

    // The ball turns with the gesture, and WHICH gesture decides how (§5).
    // Circling has to win over the sideways component: going round once moves
    // the finger left as much as right, so a roll driven off Δx alone would
    // rock back and forth and end the loop where it started — which is exactly
    // what made a spun ball look frozen. An orbit is angular, so it accumulates.
    if (orbited !== 0) {
      carry.roll += (orbited * 180 / Math.PI) * SPIN_ROLL_GAIN;
      carry.sign = Math.sign(orbited);
    } else if (Math.abs(ddx) > 0.01) {
      carry.roll += ddx * ROLL_DEG_PER_PX;  // right → clockwise, left → anticlockwise
      carry.sign = Math.sign(ddx);
    }
    applyBallTransform();
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
    launch(vx, vy, drag.current.restX, drag.current.restY);
  };

  // §3.2 — the berry button LOADS, it does not use. Nothing is spent until the
  // berry is actually thrown (§4.2).
  const loadBerry = useCallback((id) => {
    if (locked) return;
    if (berryCount(state, id) <= 0) {
      showToast(t(lang, "No berries left", "ไม่มีเบอร์รี่แล้ว", "きのみがありません"));
      return;
    }
    const prev = { kind: loaded.kind, id: loaded.id };
    swapSlot(() => { setSlotKind("berry"); setSlotBerry(id); }, prev);
    setPickerOpen(null);
    sfx.berry();
    const label = lang === "th" ? berryById(id).labelTH
      : lang === "ja" ? berryById(id).labelJA : berryById(id).labelEN;
    setLiveMsg(t(lang, `${label} loaded`, `โหลด${label}แล้ว`, `${label}をセット`));
  }, [locked, state, lang, loaded.kind, loaded.id, showToast, swapSlot]);

  /** §3.2 — pressing the berry button again puts the ball back. Mandatory:
   *  without it a mis-tap can only be undone by throwing the berry away. */
  const onBerryButton = useCallback(() => {
    if (locked) return;
    if (slotKind === "berry") {
      const prev = { kind: loaded.kind, id: loaded.id };
      swapSlot(() => { setSlotKind("ball"); setSlotBerry(null); }, prev);
      setPickerOpen(null);
      setLiveMsg(t(lang, "Ball loaded", "โหลดบอลแล้ว", "ボールをセット"));
      return;
    }
    if (BERRIES.every(b => berryCount(state, b.id) <= 0)) {
      showToast(t(lang, "No berries left", "ไม่มีเบอร์รี่แล้ว", "きのみがありません"));
      return;
    }
    setPickerOpen(p => (p === "berry" ? null : "berry"));
  }, [locked, slotKind, state, lang, loaded.kind, loaded.id, showToast, swapSlot]);

  const chooseBall = useCallback((id) => {
    if (locked) return;
    const prev = { kind: loaded.kind, id: loaded.id };
    swapSlot(() => { setBallId(id); setSlotKind("ball"); setSlotBerry(null); }, prev);
    setPickerOpen(null);
    const label = lang === "th" ? ballById(id).labelTH
      : lang === "ja" ? ballById(id).labelJA : ballById(id).labelEN;
    setLiveMsg(t(lang, `${label} loaded`, `โหลด${label}แล้ว`, `${label}をセット`));
  }, [locked, lang, loaded.kind, loaded.id, swapSlot]);

  // ── Keyboard (§7.1) ──────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") { e.stopPropagation(); requestClose(); return; }
      // §9 — 1 puts the ball back, 2 opens the berry list (or unloads).
      if (e.key === "1" && !locked) {
        e.preventDefault();
        if (slotKind !== "ball") {
          swapSlot(() => { setSlotKind("ball"); setSlotBerry(null); },
            { kind: "berry", id: slotBerry });
          setLiveMsg(t(lang, "Ball loaded", "โหลดบอลแล้ว", "ボールをセット"));
        }
        setPickerOpen(null);
        return;
      }
      if (e.key === "2" && !locked) { e.preventDefault(); onBerryButton(); return; }
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
        return;
      }

      if (e.key === " " || e.key === "Enter") {
        if (tag === "BUTTON") return;
        e.preventDefault();
        if (loadedCount <= 0) return;
        // No flick to measure: throw straight with standard values so the ring
        // timing stays the only variable, keeping it a skill check (§7.1).
        launch(0, 1000, aimNudge);
      }
    };
    window.addEventListener("keydown", h, true);
    return () => window.removeEventListener("keydown", h, true);
  }, [locked, loadedCount, aimNudge, launch, requestClose, lang,
      slotKind, slotBerry, swapSlot, onBerryButton]);

  // Keyboard spin has no gesture to keep it alive, so hold the clock open.
  useEffect(() => {
    if (!spinOn || holdRef.current) return;
    const iv = setInterval(() => { spin.current.lastMove = performance.now(); }, 100);
    return () => clearInterval(iv);
  }, [spinOn]);

  // ── Capture rendering ────────────────────────────────────────────────────
  // The stage classes are assembled here rather than inline in the JSX: five
  // phases crossed with four outcomes is more than a template literal can hold
  // without becoming unreadable.
  const capturing = CAPTURING.has(phase);
  const backOnStage = phase === "result"
    && (outcome === "broke" || outcome === "empty" || outcome === "fled");

  // The idle bob is CSS on its own wrapper, and it stops at contact so the
  // frozen capture geometry keeps matching where the sprite actually is.
  // §5.1 — Nanab stops the idle bob outright; the capture beats freeze it too.
  const bobCls = (capturing || stopHop) ? "cx-bob still" : "cx-bob";
  const auraColor = berryById(activeBerry)?.aura ? berryById(activeBerry).color : null;

  const pokeCls = ["cx-poke",
    eatBerry && "chew",          // §5.2
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
  // An endless supply has no number worth announcing, and Infinity read out
  // loud is worse than saying nothing.
  const endless = !Number.isFinite(loadedCount);
  const slotSuffixEN = endless ? "" : `, ${loadedCount} left`;
  const slotSuffixTH = endless ? "" : ` เหลือ ${loadedCount} ชิ้น`;
  const slotSuffixJA = endless ? "" : ` 残り${loadedCount}`;
  // §3.3 wants a count badge on each button. With the supply switched to
  // endless there is no number to put in one, so it is left off rather than
  // filled with a symbol that means nothing.
  const berryStock = (() => {
    const n = BERRIES.reduce((a, b) => a + berryCount(state, b.id), 0);
    return Number.isFinite(n) ? n : null;
  })();
  const ballStock = Number.isFinite(ballCount(state, ballId)) ? ballCount(state, ballId) : null;
  // What a berry is worth. A calming berry has no odds to quote — it buys a
  // still target instead, so it says by how much.
  const berryMeta = (b) => {
    const n = berryCount(state, b.id);
    const parts = [];
    if (b.calm) {
      parts.push(t(lang, `calms ${Math.round(b.calm * 100)}%`,
        `อยู่นิ่งขึ้น ${Math.round(b.calm * 100)}%`,
        `動き -${Math.round(b.calm * 100)}%`));
    }
    if (b.mult !== 1) parts.push(`×${b.mult}`);
    if (b.reward > 1) {
      parts.push(t(lang, `×${b.reward} reward`, `รางวัล ×${b.reward}`, `報酬 ×${b.reward}`));
    }
    const eff = parts.join(" · ");
    return Number.isFinite(n) ? `${eff} · ${n}` : eff;
  };
  // What a ball is worth, which is not always a multiplier (§ BALLS).
  const pickMeta = (b) => {
    const n = ballCount(state, b.id);
    const rate = b.guaranteed
      ? t(lang, "always catches", "จับติดแน่นอน", "必ず捕まえる")
      : b.ub != null
        ? `×${isUltraBeast(pokemon.id) ? b.ub : b.mult}`
        : `×${b.mult}`;
    return Number.isFinite(n) ? `${rate} · ${n}` : rate;
  };
  const resultLabel = resultKey === "excellent" ? "Excellent!"
    : resultKey === "great" ? "Great!"
    : resultKey === "nice" ? "Nice!"
    : resultKey === "hit" ? t(lang, "Hit!", "โดน!", "ヒット!")
    : resultKey === "missed" ? t(lang, "Missed", "พลาด", "はずれ") : null;

  // Clicking the scenery outside the card dismisses the encounter — but never
  // while a throw is in the air, a capture is playing, or the finger is still
  // down. A drag that slips past the card's edge would otherwise end the
  // encounter on release, which reads as the game closing itself.
  const onOverlayPointerDown = (e) => {
    // Containment, not `target === currentTarget`: the press usually lands on
    // the blurred scene inside .cx-backdrop, which is a child of the overlay,
    // so an identity check would never fire.
    if (cardRef.current?.contains(e.target)) return;
    if (locked || holding || holdRef.current || closing) return;
    requestClose();
  };

  return (
    <div
      className={`cx-overlay${closing ? " closing" : ""}`}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={onOverlayPointerDown}
    >
      <style>{CATCH_CSS}</style>

      {/* Deliberately empty. This layer paints nothing of its own — it only
          dims and blurs whatever is already behind it, which is the detail page
          the player opened the encounter from. Putting a second copy of the
          catch scene here made the card look like a frame drawn on top of the
          same picture, with nothing to say where the player had come from. */}
      <div className="cx-backdrop" aria-hidden />

      <div
        ref={cardRef}
        className={`cx-card${reduceMotion ? " cx-reduce" : ""}${closing ? " closing" : ""}`}
      >
        <CatchScene scene={scene} />

        <div className="cx-sr-live" role="status" aria-live="polite" aria-atomic="true">{liveMsg}</div>

        <button className="cx-btn cx-flee" onClick={requestClose}
          aria-label={t(lang, "Run away", "หนี", "にげる")}
          title={t(lang, "Run away (Esc)", "หนี (Esc)", "にげる (Esc)")}>
          <X size={20} strokeWidth={2.6} />
        </button>
        <button className="cx-btn cx-lb" onClick={() => setShowLeaderboard(true)}
          aria-label={t(lang, "Leaderboard", "อันดับ", "ランキング")}>
          <Trophy size={18} strokeWidth={2.4} />
        </button>

        <div className="cx-arena" ref={arenaRef} style={capVars}>
          {/* Stage carries the target's sideways drift */}
          <div className="cx-stage" ref={stageRef}>
            <div className="cx-nameplate">
              <span className="cx-name">{name}</span>
              <span className="cx-diff" style={{ color: difficulty.color }}>● {difficulty.label}</span>
            </div>

            {/* §5.1 — the sparkle a reward berry leaves on the target while
                its effect is live. Persistent, unlike the eat sparks. */}
            {auraColor && <div className="cx-aura" style={{ "--aura": auraColor }} aria-hidden />}

            {/* §5.2 — 8 sparks, berry-coloured, out to 34px, over 430ms. */}
            {eatBerry && Array.from({ length: EAT_SPARKS }).map((_, i) => (
              <div key={`${eatBerry}-${i}`} className="cx-eat-spark" aria-hidden
                style={{
                  "--a": `${(i * 360) / EAT_SPARKS}deg`,
                  "--c": berryById(eatBerry).color,
                }} />
            ))}

            {art && (
              // The bob box breathes; the sprite inside it keeps its own
              // transform free for the capture beats (§3–§7).
              <div className={bobCls}>
                <img ref={pokeRef} className={pokeCls} src={art} alt={name} draggable={false} />
              </div>
            )}
            <div className={shadowCls} />
          </div>

          {/* Flight streak. Two paths, mounted for the whole encounter and
              rewritten in place each frame — mounting them per throw would put
              a React render on the first frame of every flight. The tint rides
              the Pokémon's type so the streak belongs to the scene. */}
          <svg className="cx-trail-layer" aria-hidden
            style={{ "--cx-trail-tint": typeColor(pokemon.types?.[0]?.type?.name) }}>
            <path className="cx-trail-glow" ref={el => { trailEls.current.glow = el; }} />
            <path className="cx-trail-core" ref={el => { trailEls.current.core = el; }} />
          </svg>

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

        {/* ── Controls (§2, §3) ────────────────────────────────────────────
            One slot in the middle holding one item; the two side buttons only
            change what is in it. Everything the player throws goes through the
            same gesture from the same place, so there is one throw to learn. */}
        <div className="cx-bottom">
          <button
            className={`cx-btn cx-item${slotKind === "berry" ? " picked" : ""}`}
            style={slotKind === "berry" ? { "--sel": loaded.def.color } : undefined}
            onClick={onBerryButton}
            disabled={locked}
            aria-pressed={slotKind === "berry"}
            aria-label={t(lang,
              slotKind === "berry" ? `${loadedLabel} loaded — press again for the ball` : "Load a berry",
              slotKind === "berry" ? `โหลด${loadedLabel}อยู่ — กดซ้ำเพื่อกลับไปใช้บอล` : "โหลดเบอร์รี่",
              slotKind === "berry" ? `${loadedLabel}をセット中 — もう一度でボール` : "きのみをセット")}>
            <BerryImg berryId={slotKind === "berry" ? loaded.id : "razz"} size={26} />
            {berryStock != null && <span className="cx-badge">{berryStock}</span>}
          </button>

          <div className="cx-slot-dock">
            <button
              ref={dockRef}
              className={`cx-ball${holding ? " held" : ""}`}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              disabled={locked || loadedCount <= 0}
              style={{ visibility: phase === "idle" ? "visible" : "hidden" }}
              aria-label={t(lang,
                `Throw ${loadedLabel}${slotSuffixEN}. Flick up to throw${loaded.kind === "ball" ? ", Q and E add spin" : ""}.`,
                `ขว้าง${loadedLabel}${slotSuffixTH} · ปัดขึ้นเพื่อขว้าง${loaded.kind === "ball" ? " · Q/E ใส่สปิน" : ""}`,
                `${loadedLabel}${slotSuffixJA} · 上にフリックで投げる${loaded.kind === "ball" ? " · Q/Eで回転" : ""}`)}>
              {/* The transform lives on this span, never on the button: the
                  button's rect is what geom() reads for the dock position, and
                  moving it would drag the spin gate's centre along with it. */}
              <span className="cx-ball-vis" ref={ballVisRef}>
                {/* §2.2 — the outgoing item is still here, fading out under the
                    incoming one. Both are absolutely placed so neither shifts
                    the other during the swap. */}
                {outgoing && (
                  <span className="cx-slot-item out" key={`out-${swapKey}`}>
                    <SlotItem item={outgoing} />
                  </span>
                )}
                <span
                  className={`cx-slot-item in${outgoing ? " bump" : ""}${phase === "reload" ? " rl" : ""}`}
                  key={`in-${swapKey}`}>
                  <SlotItem item={loaded} />
                </span>
              </span>
            </button>

            {/* §2.1 — says what is loaded, and how many are left when that is a
                number worth knowing. */}
            <div className="cx-slot-label">
              {loadedLabel}{slotSuffixEN ? ` ×${loadedCount}` : ""}
            </div>
          </div>

          {ownedBallKinds.length > 1 ? (
            <button className={`cx-btn cx-swap${slotKind === "ball" ? " picked" : ""}`}
              style={slotKind === "ball" ? { "--sel": loaded.def.color } : undefined}
              onClick={() => !locked && setPickerOpen(p => (p === "ball" ? null : "ball"))}
              disabled={locked}
              aria-pressed={slotKind === "ball"}
              aria-label={t(lang, "Change ball", "เปลี่ยนชนิดบอล", "ボールを変える")}>
              <BallImg ballId={ballId} size={26} />
              {ballStock != null && <span className="cx-badge">{ballStock}</span>}
            </button>
          ) : <div className="cx-btn cx-spacer" aria-hidden />}
        </div>

        {/* §5.3 — stays up for as long as the effect is live, in every phase.
            Gating it on `idle` meant it vanished exactly while the throw it
            applies to was in the air. */}
        {activeBerry && (
          <div className="cx-berry-armed">
            <BerryImg berryId={activeBerry} size={18} />{" "}
            {t(lang, "active for next throw", "มีผลกับการขว้างครั้งถัดไป", "次の投球に有効")}
          </div>
        )}

        {/* §3.2 / §5.2 — toasts: refusals and results, in one place. */}
        {toast && <div className="cx-toast">{toast}</div>}

        {/* The standing instruction line is gone by request — the scene carries
            the encounter on its own. What is left is the same slot used only
            when the game has something to say back, e.g. a flick too flat to
            throw: without it that gesture fails silently and looks broken. */}
        {status && phase === "idle" && (
          <div className="cx-hint">{status}</div>
        )}
        {aimNudge !== 0 && phase === "idle" && (
          <div className="cx-aim-readout">
            {t(lang, "aim", "จุดเล็ง", "照準")} {aimNudge > 0 ? "→" : "←"} {Math.abs(aimNudge)}px
          </div>
        )}

        {/* §6 — a popover over the button, not a new screen, and only kinds the
            player actually has. */}
        {pickerOpen === "ball" && (
          <Popover side="right" title={t(lang, "Choose a ball", "เลือกบอล", "ボールを選ぶ")}
            onClose={() => setPickerOpen(null)}>
            {ownedBallKinds.map(b => (
              <button key={b.id} className={`cx-pick${b.id === ballId ? " on" : ""}`}
                onClick={() => chooseBall(b.id)}>
                <BallImg ballId={b.id} size={34} />
                <span className="cx-pick-name">
                  {lang === "th" ? b.labelTH : lang === "ja" ? b.labelJA : b.labelEN}
                </span>
                <span className="cx-pick-meta">{pickMeta(b)}</span>
              </button>
            ))}
          </Popover>
        )}

        {pickerOpen === "berry" && (
          <Popover side="left" title={t(lang, "Load a berry", "โหลดเบอร์รี่", "きのみをセット")}
            onClose={() => setPickerOpen(null)}>
            {BERRIES.map(b => (
              <button key={b.id} className={`cx-pick${b.id === slotBerry ? " on" : ""}`}
                disabled={berryCount(state, b.id) <= 0}
                onClick={() => loadBerry(b.id)}>
                <BerryImg berryId={b.id} size={30} />
                <span className="cx-pick-name">
                  {lang === "th" ? b.labelTH : lang === "ja" ? b.labelJA : b.labelEN}
                </span>
                <span className="cx-pick-meta">
                  {berryMeta(b)}
                </span>
              </button>
            ))}
          </Popover>
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
    </div>
  );
}

/** Whatever is loaded, drawn at slot size. §2.1 — one item, either kind. */
function SlotItem({ item }) {
  return item.kind === "ball"
    ? <BallImg ballId={item.id} size={72} />
    : <BerryImg berryId={item.id} size={62} />;
}

/** §6 — anchored over the button that opened it, inside the card. */
function Popover({ title, side, children, onClose }) {
  return (
    <div className="cx-pop-scrim" onClick={onClose}>
      <div className={`cx-pop cx-pop-${side}`} onClick={(e) => e.stopPropagation()}>
        <div className="cx-sheet-title">{title}</div>
        <div className="cx-pick-list">{children}</div>
      </div>
    </div>
  );
}
