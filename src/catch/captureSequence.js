// Timings and the driver for the capture sequence (spec §2–§8).
//
// The whole thing is table-driven so `speedMultiplier` can scale every stage at
// once, and so the running order can be read in one place rather than inferred
// from a nest of setTimeouts.
//
// The result is decided BEFORE any of this runs (§1.2). Nothing here may roll
// dice — it is presentation of an outcome that already exists.

export const CAPTURE = {
  speedMultiplier: 1.0,     // 0.5–1.5, scales the entire sequence

  impactMs: 250,
  absorbBeamMs: 560,
  absorbDissolveMs: 900,    // richer effect, so it gets longer
  dropMs: 540,

  // One wobble beat (§6.1). The pause matters more than the tilt: it's the
  // moment the player holds their breath, and removing it kills the tension.
  wobbleLeftMs: 160,
  wobbleRightMs: 160,
  wobbleCentreMs: 170,
  wobblePauseMs: 170,
  // Asymmetric on purpose, so it doesn't read as a machine.
  wobbleLeftDeg: -16,
  wobbleRightDeg: 14,

  resolveCatchMs: 1100,
  resolveBreakMs: 900,
  fleeMs: 1200,

  // Rarer than this uses the particle dissolve instead of the beam (§4.1).
  dissolveRateBelow: 0.20,

  // If a stage never reports back — a stalled tab, a dropped frame — jump
  // straight to the end rather than stranding the player (§8).
  watchdogMs: 6000,
};

/** Particle tuning for the dissolve absorb (§4.3). */
export const DISSOLVE = {
  particleCount: 55,
  swirl: 55,          // px flung outward before curving back
  staggerMs: 380,     // release spread, bottom of the sprite first
  trail: 0.55,        // 0 = no trail, 0.9 = long smear
  minDurMs: 420,
  maxDurMs: 680,
  minSize: 1.4,
  maxSize: 4.0,
};

export const wobbleBeatMs = (c = CAPTURE) =>
  c.wobbleLeftMs + c.wobbleRightMs + c.wobbleCentreMs + c.wobblePauseMs;

export const absorbMs = (style, c = CAPTURE) =>
  style === "dissolve" ? c.absorbDissolveMs : c.absorbBeamMs;

/** Which absorb style this species gets — a visual reward, no extra systems. */
export const absorbStyleFor = (rate, c = CAPTURE) =>
  rate < c.dissolveRateBelow ? "dissolve" : "beam";

/** Total wall-clock time, useful for tests and for sizing the watchdog. */
export function totalMs({ style = "beam", wobbles = 3, caught = true }, c = CAPTURE) {
  const raw = c.impactMs + absorbMs(style, c) + c.dropMs
    + wobbles * wobbleBeatMs(c)
    + (caught ? c.resolveCatchMs : c.resolveBreakMs);
  return raw / c.speedMultiplier;
}

/**
 * Build the ordered stage list for one capture.
 *
 * Returned as data rather than executed here so the component can drive it,
 * skip it wholesale under reduced motion, and fast-forward it when the tab
 * comes back — all without duplicating the running order.
 */
export function buildSequence({ style = "beam", wobbles = 3, caught = true }, c = CAPTURE) {
  const k = 1 / c.speedMultiplier;
  const stages = [
    { name: "impact", ms: c.impactMs * k },
    { name: "absorb", ms: absorbMs(style, c) * k, style },
    { name: "drop",   ms: c.dropMs * k },
  ];
  for (let i = 0; i < wobbles; i++) {
    // The last wobble is flagged so it can be given its own sound (§6.3).
    stages.push({ name: "wobble", ms: wobbleBeatMs(c) * k, index: i + 1, last: i === wobbles - 1 });
  }
  stages.push({
    name: caught ? "resolveCatch" : "resolveBreak",
    ms: (caught ? c.resolveCatchMs : c.resolveBreakMs) * k,
  });
  return stages;
}
