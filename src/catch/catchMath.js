// Every number the encounter needs, in one place and free of React so it can
// be reasoned about (and unit-checked) on its own. All values are the tuning
// defaults from the spec — expect to adjust them after playing.

// The Pokémon GO line-up, with GO's own rates. `mult` is the catch multiplier;
// the two special cases are marked rather than faked with a big number, because
// neither of them is really a multiplier:
//   master    — catches, full stop.
//   beast     — ×5 against Ultra Beasts and a penalty against anything else,
//               which is why it needs the species, not just the ball.
export const BALLS = [
  { id: "poke",    mult: 1.0, img: "/poke-ball.png",       labelEN: "Poké Ball",    labelTH: "มอนสเตอร์บอล",  labelJA: "モンスターボール", color: "#EE4B3C" },
  { id: "great",   mult: 1.5, img: "/great-ball.png",      labelEN: "Great Ball",   labelTH: "ซูเปอร์บอล",    labelJA: "スーパーボール",   color: "#3E7BE8" },
  { id: "ultra",   mult: 2.0, img: "/ultra-ball.png",      labelEN: "Ultra Ball",   labelTH: "ไฮเปอร์บอล",    labelJA: "ハイパーボール",   color: "#F0B429" },
  { id: "premier", mult: 1.0, img: "",                     labelEN: "Premier Ball", labelTH: "พรีเมียร์บอล",  labelJA: "プレミアボール",   color: "#E8E8E8" },
  { id: "safari",  mult: 1.5, img: "/go-safari-ball.png",  labelEN: "Safari Ball",  labelTH: "ซาฟารีบอล",     labelJA: "サファリボール",   color: "#8BC34A" },
  { id: "beast",   mult: 0.1, ub: 5.0, img: "",            labelEN: "Beast Ball",   labelTH: "อัลตราบีสต์บอล", labelJA: "ウルトラボール",   color: "#4FC3D9" },
  { id: "master",  mult: 255, guaranteed: true, img: "",   labelEN: "Master Ball",  labelTH: "มาสเตอร์บอล",   labelJA: "マスターボール",   color: "#7B3FA0" },
];

// National dex ids of the Ultra Beasts — the only targets a Beast Ball is for.
const ULTRA_BEASTS = new Set([793, 794, 795, 796, 797, 798, 799, 803, 804, 805, 806]);
export const isUltraBeast = (id) => ULTRA_BEASTS.has(Number(id));

/** The ball's multiplier against THIS species (Beast Ball is the only one that
 *  cares who it is thrown at). */
export function ballMult(ballId, pokemonId) {
  const b = ballById(ballId);
  if (b.ub != null) return isUltraBeast(pokemonId) ? b.ub : b.mult;
  return b.mult;
}

// Pokémon GO's berries, with GO's own effects. A berry does one of two things
// and never both: it raises the odds (`mult`), or it buys control by holding
// the target still (`calm`, a fraction of the drift taken away — §5.4).
// Pinap is the odd one out: in GO it does not touch the catch rate at all, it
// doubles the candy. There is no candy here, so it doubles the only reward this
// game actually pays — the balls a catch hands back (`reward`). That reward is
// invisible while balls are unlimited; it is still recorded, so it means
// something again the moment the supply is switched back on.
export const BERRIES = [
  // §5.1 — every berry must SHOW its effect, not just change a number, so each
  // one carries what it does to the target's motion alongside its odds:
  //   slow    — fraction of the sway SPEED left (0.35 = moves at a third pace)
  //   calm    — fraction of the sway DISTANCE taken away (0.7 = 30% left)
  //   stopHop — the idle bob stops dead
  //   aura    — a sparkle that stays on the target while the effect is live
  { id: "razz",        mult: 1.5, slow: 0.35, calm: 0,    stopHop: false, aura: false, shape: "razz",  labelEN: "Razz Berry",         labelTH: "ซูริเบอร์รี่",     labelJA: "ズリのみ",        color: "#E0575B" },
  { id: "goldenrazz",  mult: 2.5, slow: 0.35, calm: 0,    stopHop: false, aura: true,  shape: "razz",  labelEN: "Golden Razz Berry",  labelTH: "ซูริเบอร์รี่ทอง",  labelJA: "きんのズリのみ",   color: "#F5A524" },
  { id: "nanab",       mult: 1.0, slow: 1,    calm: 0.70, stopHop: true,  aura: false, shape: "nanab", labelEN: "Nanab Berry",        labelTH: "นานะเบอร์รี่",     labelJA: "ナナのみ",        color: "#F0B429" },
  { id: "pinap",       mult: 1.0, slow: 1,    calm: 0,    stopHop: false, aura: true,  reward: 2, shape: "pinap", labelEN: "Pinap Berry",        labelTH: "พินะเบอร์รี่",     labelJA: "パイルのみ",      color: "#F4C430" },
  { id: "silverpinap", mult: 1.8, slow: 0.35, calm: 0,    stopHop: false, aura: true,  reward: 2, shape: "pinap", labelEN: "Silver Pinap Berry", labelTH: "พินะเบอร์รี่เงิน", labelJA: "ぎんのパイルのみ", color: "#B8C4CC" },
];

export const ballById  = (id) => BALLS.find(b => b.id === id)  ?? BALLS[0];
/** How much of the target's drift a berry takes away: 0 none, 1 dead still. */
export const berryCalm = (id) => berryById(id)?.calm ?? 0;
/** Fraction of the target's sway SPEED left: 1 normal, 0.35 a third pace. */
export const berrySlow = (id) => berryById(id)?.slow ?? 1;
/** What a berry multiplies the catch reward by — GO's candy bonus. */
export const berryReward = (id) => berryById(id)?.reward ?? 1;
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
export function catchChance({ rate, ballId, berryId, throwMult = 1.0, curve = false, pokemonId }) {
  // The Master Ball is not a good multiplier, it is an exemption: capping at
  // 0.95 like everything else would leave it failing one throw in twenty.
  if (ballById(ballId).guaranteed) return 1;
  const raw = rate
    * ballMult(ballId, pokemonId)
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
