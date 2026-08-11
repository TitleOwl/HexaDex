// ─── visitStreak.js — consecutive-days counter ───────────────────────────────
//
// Pulled out of DailyBanner because the streak now shows in the navbar as well
// (header redesign, set 2). Leaving the logic inside the banner would mean two
// copies racing to write the same localStorage key on first paint, and the one
// that lost would read a value it had just invalidated.

const KEY = "pkdx_streak";
const day = (ms = Date.now()) => new Date(ms).toISOString().slice(0, 10);

/**
 * Today's streak, rolling the counter forward on the first call of a new day.
 * Idempotent within a day, so it does not matter how many components ask.
 */
export function readVisitStreak() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    const today = day();
    if (saved.lastDate === today) return saved.streak || 1;
    // Yesterday continues the run; any older gap starts again at 1.
    const next = saved.lastDate === day(Date.now() - 86400000)
      ? (saved.streak || 0) + 1
      : 1;
    const best = Math.max(saved.best || 0, next);
    localStorage.setItem(KEY, JSON.stringify({ lastDate: today, streak: next, best }));
    return next;
  } catch { return 1; }
}

/**
 * The same counter plus the personal best, for the panel behind the flame.
 * Read-only: readVisitStreak() is what rolls the day over, and having two
 * writers is the exact bug this module was extracted to avoid.
 */
export function readStreakDetail() {
  const streak = readVisitStreak();
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return { streak, best: Math.max(saved.best || 0, streak), lastDate: saved.lastDate };
  } catch { return { streak, best: streak, lastDate: day() }; }
}
