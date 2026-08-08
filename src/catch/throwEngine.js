// The throw mechanic: aiming, spin detection, curve, and flight path.
//
// Pure functions and one tuning table, deliberately free of React so the whole
// mechanic can be reasoned about and checked without a browser.
//
// The governing decision (spec §1.2): FLICK SPEED DOES NOTHING. Direction comes
// from the ratio vx/vy, so a soft flick and a hard flick at the same angle land
// on the same spot, and the ball always reaches the target plane. An earlier
// build made speed control distance and it was unplayable — you had to master
// two invisible variables at once.

export const TUNING = {
  aimSpread: 0.9,          // 0.4–1.6 · how far a given tilt throws the ball
  maxCurve: 95,            // px · sideways shift at full spin
  spinThreshold: 7,        // rad/s · angular speed needed to arm spin
  spinTurnGate: 3.6,       // rad (~206°) · accumulated turn needed as well
  flightTime: 0.6,         // s
  arcHeight: 64,           // px · height of the lob
  minFlickSpeed: 260,      // px/s upward · below this it isn't a throw
  spinIdleMs: 140,         // ms of stillness before spin starts bleeding
  spinDecayPerFrame: 0.04,
  // The u² term alone bows the path only shift/4 off a straight line — about
  // 6px at typical spin, which is invisible. curveBow adds a lateral arc that
  // peaks mid-flight and returns to zero, so the bend READS without moving the
  // landing point the hit test uses.
  //
  // It is CAPPED for a reason: at 2.2× the bow reached 55px, which is wider
  // than the whole aim range, so a right-hand flick with left spin visibly
  // travelled left for most of the flight before snapping back. The bow may
  // decorate the path, never overpower where you aimed.
  curveBow: 2.6,           // × shift
  curveBowMaxPx: 120,      // hard ceiling on the visual bow
  curveBonus: 1.7,         // catch multiplier for landing a curve
  curveMinShift: 8,        // px · below this the curve doesn't count
  dodgeRange: 40,          // px · base sideways drift of the target
  dodgeRangeMax: 60,       // px · cap, past which it's just luck
  ringMin: 18,             // px
  ringMax: 70,             // px
  ringPeriod: 2000,        // ms
  trailLifeMs: 300,
  resolveMs: 450,
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ── Spin ────────────────────────────────────────────────────────────────────
// Measured as the finger's angle AROUND THE BALL'S CENTRE, never as the cross
// product of successive movement vectors: screen Y points down, so the cross
// product silently flips the sign and "spin right" curves left — a bug that is
// very hard to spot once the rest of the mechanic is in motion.
export const angleTo = (px, py, cx, cy) => Math.atan2(py - cy, px - cx);

/** Shortest signed difference between two angles, in (−π, π]. */
export function angleDelta(current, previous) {
  let d = current - previous;
  // Without this, crossing the ±180° seam reads as a full turn the other way.
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

/**
 * How much of a move is along the circle rather than straight in/out.
 * 1 = pure circling, 0 = pure radial.
 *
 * This exists because the upward flick ALSO sweeps the finger's angle around
 * the ball — fast enough (measured at ω ≈ 34 rad/s) to re-arm spin in the
 * opposite direction on the very last samples, so a clockwise wind-up curved
 * the ball anticlockwise. Only tangential motion is real spin.
 */
export function tangentialFraction(mx, my, px, py, cx, cy) {
  const mLen = Math.hypot(mx, my);
  const rLen = Math.hypot(px - cx, py - cy);
  if (mLen < 0.001 || rLen < 0.001) return 0;
  const rx = (px - cx) / rLen, ry = (py - cy) / rLen;   // outward unit vector
  const radial = Math.abs((mx * rx + my * ry) / mLen);  // 0 = tangent, 1 = radial
  return 1 - radial;
}

/** Below this the move is a flick, not a circle. */
export const TANGENTIAL_GATE = 0.55;

/** Spin arms only when BOTH gates pass — see spec §2.2. */
export function spinArmed(totalTurn, omega, tune = TUNING) {
  return Math.abs(totalTurn) > tune.spinTurnGate && Math.abs(omega) > tune.spinThreshold;
}

export function spinPowerFrom(omega, tune = TUNING) {
  return clamp((Math.abs(omega) - tune.spinThreshold) / 10, 0, 1);
}

// ── Aim ─────────────────────────────────────────────────────────────────────
/**
 * Horizontal offset of the landing point. Uses the RATIO of the flick's
 * components, which is what removes speed from the equation: double both vx
 * and vy and nothing changes.
 */
export function aimOffset(vx, vy, distanceToTarget, tune = TUNING) {
  if (!(vy > 0)) return 0;
  return (vx / vy) * distanceToTarget * tune.aimSpread;
}

/**
 * How far the spin bends the ball's PATH. This no longer moves where the ball
 * lands — aim alone decides that, so a throw lined up on the Pokémon connects
 * however hard it was spun. Spin buys the arc and the catch bonus, not a
 * displaced target you have to lead.
 *
 * The sign follows the flick rather than the wind-up: letting spin pick its own
 * side meant a left wind-up fought a right flick and the ball visibly travelled
 * away from where the player aimed. A dead-straight flick has no side of its
 * own, so there the wind-up decides.
 */
export function curveShift(spinDir, spinPower, aim = 0, tune = TUNING) {
  if (!spinDir || spinPower <= 0) return 0;
  const dir = Math.abs(aim) > 4 ? Math.sign(aim) : spinDir;
  return dir * spinPower * tune.maxCurve;
}

/**
 * Aim and curve together — the single source both the path and the hit test
 * read. `landing` deliberately ignores `shift`: the curve is flight shape, not
 * displacement, so where you aim is where it lands.
 */
export function throwGeometry({ ballCenterX, vx, vy, distanceToTarget, spinDir, spinPower, tune = TUNING }) {
  const aim = aimOffset(vx, vy, distanceToTarget, tune);
  const shift = curveShift(spinDir, spinPower, aim, tune);
  return { aim, shift, landing: ballCenterX + aim };
}

export function landingX(args) { return throwGeometry(args).landing; }

// ── Flight ──────────────────────────────────────────────────────────────────
/**
 * Position at normalised time u (0→1).
 *
 * vxEff is solved backwards from the target so that at u = 1 the ball sits
 * exactly on landingX — the drawn path and the hit test can never disagree.
 * The curve is applied as u² so the ball leaves nearly straight and bends late,
 * the way a real curveball does.
 */
export function flightAt(u, p, tune = TUNING) {
  const { ballCenterX, ballCenterY, targetY, landing, shift } = p;
  const vxEff = (landing - ballCenterX - shift) / tune.flightTime;
  const t = u * tune.flightTime;
  // sin(πu) is zero at both ends, so this exaggerates the visible bend without
  // shifting where the ball actually lands.
  const bowMag = Math.min(Math.abs(shift) * tune.curveBow, tune.curveBowMaxPx);
  const bow = Math.sign(shift) * bowMag * Math.sin(Math.PI * u);
  return {
    x: ballCenterX + vxEff * t + shift * u * u + bow,
    y: ballCenterY + (targetY - ballCenterY) * u - tune.arcHeight * Math.sin(Math.PI * u),
    scale: 1 - 0.55 * u,
  };
}

// ── Target + ring ───────────────────────────────────────────────────────────
export function targetOffset(tMs, dodgeRange) {
  const t = tMs / 1000;
  return {
    x: dodgeRange * Math.sin(t * 0.9),
    hop: Math.abs(Math.sin(t * 1.7)) * 5,
  };
}

export function dodgeRangeFor(rate, tune = TUNING) {
  const rarity = 1 - clamp(rate / 0.5, 0, 1);            // 0 common → 1 rare
  return Math.min(tune.dodgeRangeMax, tune.dodgeRange + rarity * 20);
}

/** Ring radius right now. Bigger Pokémon are naturally easier to hit. */
export function ringRadiusAt(tMs, spriteScale = 1, tune = TUNING) {
  const p = (tMs % tune.ringPeriod) / tune.ringPeriod;
  const tri = p < 0.5 ? 1 - p * 2 : (p - 0.5) * 2;        // 1 → 0 → 1
  const r = tune.ringMin + tri * (tune.ringMax - tune.ringMin);
  return r * spriteScale;
}

// ── Judging ─────────────────────────────────────────────────────────────────
export const RESULT_TIERS = [
  { max: 0.30, key: "excellent", mult: 1.7 },
  { max: 0.55, key: "great",     mult: 1.4 },
  { max: 0.80, key: "nice",      mult: 1.15 },
  { max: Infinity, key: "hit",   mult: 1.0 },
];

/**
 * Did it land, and how well? `pct` is the ring's size at contact relative to
 * its maximum, so a tight ring is a better throw.
 */
export function judge({ landing, targetX, ringRadius, spriteScale = 1, tune = TUNING }) {
  const distance = Math.abs(landing - targetX);
  if (distance >= ringRadius) return { hit: false, key: "missed", mult: 1.0, pct: 1 };
  const pct = ringRadius / (tune.ringMax * spriteScale);
  const tier = RESULT_TIERS.find(x => pct <= x.max);
  return { hit: true, key: tier.key, mult: tier.mult, pct };
}

export const curveLanded = (spinDir, shift, tune = TUNING) =>
  spinDir !== 0 && Math.abs(shift) > tune.curveMinShift;
