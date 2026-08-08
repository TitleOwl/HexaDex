// Every number the encounter needs, in one place and free of React so it can
// be reasoned about (and unit-checked) on its own. All values are the tuning
// defaults from the spec — expect to adjust them after playing.

export const BALLS = [
  { id: "poke",  mult: 1.0, img: "/poke-ball.png",  labelEN: "Poké Ball",  labelTH: "มอนสเตอร์บอล",  labelJA: "モンスターボール", color: "#EE4B3C" },
  { id: "great", mult: 1.5, img: "/great-ball.png", labelEN: "Great Ball", labelTH: "ซูเปอร์บอล",    labelJA: "スーパーボール",   color: "#3E7BE8" },
  { id: "ultra", mult: 2.0, img: "/ultra-ball.png", labelEN: "Ultra Ball", labelTH: "ไฮเปอร์บอล",    labelJA: "ハイパーボール",   color: "#F0B429" },
];

export const BERRIES = [
  { id: "boost", mult: 1.5, calm: 0,   shape: "razz",  labelEN: "Razz Berry", labelTH: "เบอร์รี่เพิ่มโอกาส", labelJA: "ズリのみ",   color: "#E0575B", icon: "🍓" },
  // A calm berry buys control rather than probability: it doesn't raise the
  // odds, it makes the target easier to hit (§5.4).
  { id: "calm",  mult: 1.0, calm: 0.7, shape: "nanab", labelEN: "Nanab Berry", labelTH: "เบอร์รี่ทำให้อยู่นิ่ง", labelJA: "ナナのみ", color: "#F0B429", icon: "🍌" },
];

export const ballById  = (id) => BALLS.find(b => b.id === id)  ?? BALLS[0];
export const berryById = (id) => BERRIES.find(b => b.id === id) ?? null;

// ── Throw bonus by ring size at impact (§4.2) ──────────────────────────────
// `ratio` is ring radius / full radius, so smaller = better timed.
export const THROW_TIERS = [
  { max: 0.30, key: "excellent", mult: 1.7 },
  { max: 0.55, key: "great",     mult: 1.4 },
  { max: 0.80, key: "nice",      mult: 1.15 },
  { max: Infinity, key: null,    mult: 1.0 },
];

export function throwTier(ratio) {
  if (ratio == null) return THROW_TIERS[THROW_TIERS.length - 1];
  return THROW_TIERS.find(t => ratio <= t.max);
}

// ── baseCatchRate (§5.2) ───────────────────────────────────────────────────
// PokéAPI's capture_rate / 255 is the source of truth when we have it; the BST
// tiers are only a fallback for when the species call hasn't landed yet, so the
// number never silently differs between a warm and cold cache.
export function baseCatchRate(pokemon, captureRate) {
  if (Number.isFinite(captureRate) && captureRate > 0) {
    return Math.max(0.03, Math.min(0.9, captureRate / 255));
  }
  const bst = (pokemon?.stats ?? []).reduce((a, s) => a + s.base_stat, 0);
  if (bst >= 600) return 0.05;  // legendary-tier
  if (bst >= 500) return 0.15;  // final form
  if (bst >= 400) return 0.30;  // middle form
  return 0.50;                  // common
}

// ── fleeChance (§6.3) ──────────────────────────────────────────────────────
// Rarer targets bolt more readily; escalates a little per failure so an
// encounter can't drag on forever.
export function fleeChance(rate, failedAttempts) {
  if (failedAttempts < 2) return 0; // never on the first miss — always 2 tries
  const rarity = 1 - Math.max(0, Math.min(1, rate / 0.5)); // 0 common → 1 rare
  return Math.min(0.35, 0.05 + rarity * 0.20 + (failedAttempts - 2) * 0.03);
}

// Curving the ball is strictly harder than throwing straight, so it earns its
// own multiplier on top of the ring bonus.
export const CURVE_BONUS = 1.25;

// ── catchChance (§5.1) ─────────────────────────────────────────────────────
export function catchChance({ rate, ballId, berryId, throwMult = 1.0, curve = false }) {
  const raw = rate
    * ballById(ballId).mult
    * (berryById(berryId)?.mult ?? 1)
    * throwMult
    * (curve ? CURVE_BONUS : 1);
  return Math.max(0.05, Math.min(0.95, raw));
}

// ── Curve detection ────────────────────────────────────────────────────────
// Reads the arc of the drag: a straight flick returns 0, a swirl returns a
// signed 0–1 where the sign is the direction the ball will bend. Measured from
// the change in heading along the path, not just start-to-end displacement —
// otherwise any diagonal flick would count as a curve.
export function detectCurve(path) {
  if (!path || path.length < 6) return 0;
  let turn = 0;
  for (let i = 2; i < path.length; i++) {
    const a = path[i - 2], b = path[i - 1], c = path[i];
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    const scale = Math.hypot(b.x - a.x, b.y - a.y) * Math.hypot(c.x - b.x, c.y - b.y);
    if (scale > 4) turn += cross / scale;
  }
  const avg = turn / (path.length - 2);
  // Measured against real paths: straight, diagonal and jittery flicks all come
  // out at 0.000, a gentle arc around 0.12 and a tight swirl around 0.25 — so
  // the deadzone sits well below a deliberate arc but clear of any noise.
  if (Math.abs(avg) < 0.04) return 0;
  const mag = Math.min(1, (Math.abs(avg) - 0.04) / 0.18);
  return Math.sign(avg) * mag;
}

// ── Wobble presentation (§6.2) ─────────────────────────────────────────────
// The result is already decided; the wobble count only says how close it was.
// Higher chance → more likely to wobble longer before breaking free.
export function wobbleCount(caught, chance, rand = Math.random) {
  if (caught) return 3;
  const r = rand();
  if (r < chance * 0.7) return 2;
  if (r < chance * 0.7 + 0.35) return 1;
  return 0;
}

// ── Ring difficulty colour + its text label (§4.2, §10) ────────────────────
// Colour alone can't carry this: orange and red are indistinguishable to many
// people, so every tier ships with a word.
export function ringDifficulty(rate, lang = "en") {
  const pick = (en, th, ja) => (lang === "th" ? th : lang === "ja" ? ja : en);
  if (rate >= 0.45) return { color: "#3FBF6F", label: pick("Easy", "ง่าย", "かんたん") };
  if (rate >= 0.28) return { color: "#E8C33E", label: pick("Medium", "ปานกลาง", "ふつう") };
  if (rate >= 0.13) return { color: "#EE8B3C", label: pick("Hard", "ยาก", "むずかしい") };
  return { color: "#E0453C", label: pick("Very hard", "ยากมาก", "とてもむずかしい") };
}

// ── Scene per primary type (§3.2) — five scenes, not eighteen ──────────────
const SCENE_BY_TYPE = {
  grass: "grassland", bug: "grassland",
  water: "shore", ice: "shore",
  fire: "desert", ground: "desert", rock: "desert",
  electric: "city", steel: "city",
  ghost: "night", dark: "night", psychic: "night",
};
export const sceneForType = (type) => SCENE_BY_TYPE[type] ?? "grassland";
