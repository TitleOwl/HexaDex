import { useEffect, useState } from "react";
import { TUNING } from "./throwEngine.js";
import { CAPTURE, totalMs } from "./captureSequence.js";

// Live tuning + telemetry panel (spec §3.3). The numbers that "feel right" for
// a throw cannot be found by reading code — they have to be dialled in by hand
// while playing, so every parameter is editable here at runtime.
//
// TUNING is mutated in place on purpose: the engine reads it fresh on every
// frame and every throw, so a slider takes effect on the very next throw with
// no wiring between this panel and the game.

const SLIDERS = [
  { key: "aimSpread",     min: 0.2, max: 2.0,  step: 0.05, label: "aim spread" },
  { key: "maxCurve",      min: 0,   max: 200,  step: 5,    label: "max curve (px)" },
  { key: "curveBow",      min: 0,   max: 5,    step: 0.1,  label: "curve bow (visual)" },
  { key: "curveBowMaxPx", min: 0,   max: 200,  step: 5,    label: "curve bow cap (px)" },
  { key: "spinThreshold", min: 2,   max: 16,   step: 0.5,  label: "spin ω gate (rad/s)" },
  { key: "spinTurnGate",  min: 1,   max: 8,    step: 0.2,  label: "spin turn gate (rad)" },
  { key: "flightTime",    min: 0.3, max: 1.2,  step: 0.05, label: "flight time (s)" },
  { key: "arcHeight",     min: 0,   max: 140,  step: 4,    label: "arc height (px)" },
  { key: "minFlickSpeed", min: 100, max: 600,  step: 20,   label: "min flick (px/s)" },
  { key: "dodgeRange",    min: 0,   max: 90,   step: 5,    label: "target dodge (px)" },
];

const fmt = (v) => (typeof v === "number" ? (Number.isInteger(v) ? v : v.toFixed(2)) : String(v));

export default function CatchDebug({ telemetry, lastThrow, captureRoll, onClose }) {
  // Sliders write straight into TUNING; this only forces a repaint of the panel.
  const [, bump] = useState(0);
  // Telemetry is written into a ref by the game loop, so poll it rather than
  // re-rendering the whole screen at 60fps just to show numbers.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 100);
    return () => clearInterval(iv);
  }, []);

  const tm = telemetry.current ?? {};
  const lt = lastThrow.current;
  const cr = captureRoll?.current;

  return (
    <div className="cx-debug" onPointerDown={(e) => e.stopPropagation()}>
      <div className="cx-debug-head">
        <strong>throw debug</strong>
        <button onClick={onClose} aria-label="close debug">✕</button>
      </div>

      <div className="cx-debug-sec">live · tick {tick}</div>
      <div className="cx-debug-grid">
        <span>phase</span><b>{tm.phase ?? "—"}</b>
        <span>spin dir</span>
        <b className={tm.dir ? "ok" : ""}>{tm.dir === 1 ? "right (+1)" : tm.dir === -1 ? "left (−1)" : "none"}</b>
        <span>spin power</span><b>{fmt(tm.power ?? 0)}</b>
        <span>turn (rad)</span><b>{fmt(tm.turn ?? 0)}</b>
        <span>ω (rad/s)</span><b>{fmt(tm.omega ?? 0)}</b>
        <span>tangential</span>
        <b className={(tm.tang ?? 0) >= 0.55 ? "ok" : "no"}>{fmt(tm.tang ?? 0)}</b>
        <span>hit r</span><b>{fmt(tm.hitR ?? 0)}</b>
        <span>target x</span><b>{fmt(tm.targetX ?? 0)}</b>
      </div>

      <div className="cx-debug-sec">last throw</div>
      {!lt ? <div className="cx-debug-empty">throw once…</div> : (
        <div className="cx-debug-grid">
          <span>vx / vy</span><b>{fmt(lt.vx)} / {fmt(lt.vy)}</b>
          <span>ratio vx/vy</span><b>{fmt(lt.ratio)}</b>
          <span>aim offset</span><b>{fmt(lt.aim)} px</b>
          <span>curve shift</span>
          <b className={Math.abs(lt.shift) > 8 ? "ok" : ""}>{fmt(lt.shift)} px</b>
          <span>landing x</span><b>{fmt(lt.landing)}</b>
          <span>target x</span><b>{fmt(lt.targetX)}</b>
          <span>distance</span><b>{fmt(lt.distance)} px</b>
          <span>hit r</span><b>{fmt(lt.hitR)}</b>
          <span>verdict</span>
          <b className={lt.verdict === "missed" ? "no" : "ok"}>{lt.verdict}</b>
          <span>curve bonus</span>
          <b className={lt.curved ? "ok" : ""}>{lt.curved ? `×${TUNING.curveBonus}` : "—"}</b>
        </div>
      )}

      {/* The capture is decided at contact and never re-rolled (§1.2). Showing
          the roll here is how that can be checked from outside the code: these
          numbers must not change while the ball is wobbling. */}
      <div className="cx-debug-sec">capture · rolled at impact</div>
      {!cr ? <div className="cx-debug-empty">land a throw…</div> : (
        <div className="cx-debug-grid">
          <span>chance</span><b>{(cr.chance * 100).toFixed(1)}%</b>
          <span>outcome</span>
          <b className={cr.caught ? "ok" : "no"}>{cr.caught ? "caught" : "breaks free"}</b>
          <span>wobbles</span><b>{cr.wobbles}</b>
          <span>absorb</span><b>{cr.style}</b>
          <span>sequence</span>
          <b>{(totalMs({ style: cr.style, wobbles: cr.wobbles, caught: cr.caught }) / 1000).toFixed(2)}s</b>
        </div>
      )}
      <label className="cx-debug-slider">
        <span>capture speed ×</span>
        <b>{fmt(CAPTURE.speedMultiplier)}</b>
        <input
          type="range" min={0.5} max={1.5} step={0.05}
          defaultValue={CAPTURE.speedMultiplier}
          onChange={(e) => { CAPTURE.speedMultiplier = parseFloat(e.target.value); bump(v => v + 1); }}
        />
      </label>

      <div className="cx-debug-sec">tuning · applies to the next throw</div>
      {SLIDERS.map(s => (
        <label key={s.key} className="cx-debug-slider">
          <span>{s.label}</span>
          <b>{fmt(TUNING[s.key])}</b>
          <input
            type="range"
            min={s.min} max={s.max} step={s.step}
            defaultValue={TUNING[s.key]}
            onChange={(e) => { TUNING[s.key] = parseFloat(e.target.value); bump(v => v + 1); }}
          />
        </label>
      ))}
      <div className="cx-debug-foot">press D to hide · values reset on reload</div>
    </div>
  );
}
