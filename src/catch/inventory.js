// Player state for catching: balls, berries, and the caught list (§8.2).
//
// localStorage only — no backend in this phase. Reads are defensive: a
// corrupted or hand-edited value falls back to a default instead of throwing,
// because a parse error here would take the whole encounter screen down.

const KEY = "pkdx_catch_state_v1";

// `pkdx_caught_count` is NOT ours — cloudSync.js uses it as the primary key of
// the "catchstats" slot, so it has to keep being written or cloud sync for the
// signed-in user silently stops working.
const LEGACY_COUNT_KEY = "pkdx_caught_count";

export const BALL_IDS  = ["poke", "great", "ultra", "premier", "safari", "beast", "master"];

// Balls are free and endless. Kept as one switch rather than as edits scattered
// through the UI, so the economy below stays intact and turning this off
// restores it — the stored counts are still read, written and refilled.
export const UNLIMITED_BALLS = true;
export const UNLIMITED_BERRIES = true;
export const BERRY_IDS = ["razz", "goldenrazz", "nanab", "pinap", "silverpinap"];

// Balls trickle back so running dry is a pause, not a dead end (§8.2).
export const REFILL_INTERVAL_MS = 10 * 60 * 1000; // one Poké Ball / 10 min
export const POKE_BALL_CAP      = 20;
export const CATCH_REWARD_BALLS = 2;              // per successful catch

const DEFAULTS = () => ({
  balls:   { poke: 20, great: 5, ultra: 1, premier: 5, safari: 3, beast: 1, master: 1 },
  berries: { razz: 3, goldenrazz: 1, nanab: 2, pinap: 2, silverpinap: 1 },
  caught:  [],
  lastRefillAt: Date.now(),
});

const intOr = (v, fallback) => (Number.isFinite(v) && v >= 0 ? Math.floor(v) : fallback);

function sanitize(parsed) {
  const d = DEFAULTS();
  if (!parsed || typeof parsed !== "object") return d;
  const balls = {}, berries = {};
  for (const id of BALL_IDS)  balls[id]   = intOr(parsed.balls?.[id], d.balls[id]);
  for (const id of BERRY_IDS) berries[id] = intOr(parsed.berries?.[id], d.berries[id]);
  return {
    balls,
    berries,
    caught: Array.isArray(parsed.caught)
      ? [...new Set(parsed.caught.filter(n => Number.isInteger(n) && n > 0))]
      : [],
    lastRefillAt: intOr(parsed.lastRefillAt, d.lastRefillAt),
  };
}

function read() {
  try { return sanitize(JSON.parse(localStorage.getItem(KEY) ?? "null")); }
  catch { return DEFAULTS(); }
}

function write(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    localStorage.setItem(LEGACY_COUNT_KEY, String(state.caught.length));
  } catch {}
  try { window.dispatchEvent(new CustomEvent("catch:state")); } catch {}
  return state;
}

// Refill is derived from elapsed time rather than a running timer, so it keeps
// accruing while the tab is closed and needs no cleanup.
function withRefill(state) {
  const now = Date.now();
  const elapsed = now - state.lastRefillAt;
  if (elapsed < REFILL_INTERVAL_MS) return state;

  const have = state.balls.poke;
  if (have >= POKE_BALL_CAP) return { ...state, lastRefillAt: now }; // full: no banking
  const earned = Math.floor(elapsed / REFILL_INTERVAL_MS);
  return {
    ...state,
    balls: { ...state.balls, poke: Math.min(POKE_BALL_CAP, have + earned) },
    lastRefillAt: state.lastRefillAt + earned * REFILL_INTERVAL_MS,
  };
}

export function getState() { return write(withRefill(read())); }

export const ballCount  = (st, id) =>
  UNLIMITED_BALLS ? Infinity : (st.balls[id] ?? 0);
export const berryCount = (st, id) =>
  UNLIMITED_BERRIES ? Infinity : (st.berries[id] ?? 0);
export const totalBalls = (st) =>
  UNLIMITED_BALLS ? Infinity : BALL_IDS.reduce((a, id) => a + (st.balls[id] ?? 0), 0);

/** Spend one ball. Returns new state, or null if there were none.
 *  Under UNLIMITED_BALLS nothing is deducted, but the current state is still
 *  returned so every caller's `if (!st) return` guard keeps its meaning. */
export function spendBall(id) {
  const st = getState();
  if (UNLIMITED_BALLS) return st;
  if ((st.balls[id] ?? 0) <= 0) return null;
  return write({ ...st, balls: { ...st.balls, [id]: st.balls[id] - 1 } });
}

/** Spend one berry. Returns new state, or null if there were none. */
export function spendBerry(id) {
  const st = getState();
  if (UNLIMITED_BERRIES) return st;
  if ((st.berries[id] ?? 0) <= 0) return null;
  return write({ ...st, berries: { ...st.berries, [id]: st.berries[id] - 1 } });
}

/** Record a catch (set semantics) and pay the ball reward, doubled by a Pinap
 *  berry — GO's candy bonus, applied to the only reward this game pays. */
export function recordCaught(pokemonId, rewardMult = 1) {
  const st = getState();
  const caught = st.caught.includes(pokemonId) ? st.caught : [...st.caught, pokemonId];
  const earned = Math.round(CATCH_REWARD_BALLS * rewardMult);
  return write({
    ...st,
    caught,
    balls: { ...st.balls, poke: Math.min(POKE_BALL_CAP, st.balls.poke + earned) },
  });
}

export const hasCaught = (id) => getState().caught.includes(id);

export function resetState() { return write(DEFAULTS()); }

/** ms until the next Poké Ball, or 0 when already capped. */
export function msUntilNextBall(st = getState()) {
  if (UNLIMITED_BALLS) return 0;              // nothing to wait for
  if (st.balls.poke >= POKE_BALL_CAP) return 0;
  return Math.max(0, REFILL_INTERVAL_MS - (Date.now() - st.lastRefillAt));
}
