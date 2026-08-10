// ─── generations.js — region + starter config ────────────────────────
//
// Everything the generation band needs that PokéAPI either does not have or
// should not be asked for. The Pokédex's own filtering never reads this file —
// the band only describes whichever generation that filter already chose.
//
// PokéAPI has no notion of a "starter", and the dex ranges, region names and
// release years never change — asking the network for facts that are fixed
// would only add a spinner to a page that can render instantly.

/** The draw order, enforced everywhere: Grass → Fire → Water. */
export const STARTER_ORDER = ["grass", "fire", "water"];

// `slot` is stated rather than implied by array position: the order above is a
// rule the page enforces, and a rule that lives only in the shape of an array
// breaks the first time somebody sorts it.
// `legendaries` counts Legendary AND Mythical species together, hand-entered
// because PokéAPI exposes those flags on /pokemon-species and the list view
// only ever fetches /pokemon. Fixed facts, like the dex ranges beside them.
//
// `accent` is chosen per generation rather than derived from the grass
// starter's type (spec §8): deriving it gives all nine the same green, which is
// the one thing the band must not be. These are picked from each region's own
// palette and checked against the text that sits on them.
export const GENERATIONS_INFO = [
  {
    id: 1, roman: "I", region: "Kanto", year: 1996, min: 1, max: 151,
    legendaries: 5,
    accent: "#e4674b",
    regionTH: "คันโต", regionJA: "カントー",
    starters: [{ id: 1, slot: "grass" }, { id: 4, slot: "fire" }, { id: 7, slot: "water" }],
  },
  {
    id: 2, roman: "II", region: "Johto", year: 1999, min: 152, max: 251,
    legendaries: 6,
    accent: "#c9a227",
    regionTH: "โจโต", regionJA: "ジョウト",
    starters: [{ id: 152, slot: "grass" }, { id: 155, slot: "fire" }, { id: 158, slot: "water" }],
  },
  {
    id: 3, roman: "III", region: "Hoenn", year: 2002, min: 252, max: 386,
    legendaries: 10,
    accent: "#3f9e6c",
    regionTH: "โฮเอ็น", regionJA: "ホウエン",
    starters: [{ id: 252, slot: "grass" }, { id: 255, slot: "fire" }, { id: 258, slot: "water" }],
  },
  {
    id: 4, roman: "IV", region: "Sinnoh", year: 2006, min: 387, max: 493,
    legendaries: 14,
    accent: "#5b7fc4",
    regionTH: "ซินโนห์", regionJA: "シンオウ",
    starters: [{ id: 387, slot: "grass" }, { id: 390, slot: "fire" }, { id: 393, slot: "water" }],
  },
  {
    id: 5, roman: "V", region: "Unova", year: 2010, min: 494, max: 649,
    legendaries: 13,
    accent: "#5a5f6e",
    regionTH: "อูโนวา", regionJA: "イッシュ",
    starters: [{ id: 495, slot: "grass" }, { id: 498, slot: "fire" }, { id: 501, slot: "water" }],
  },
  {
    id: 6, roman: "VI", region: "Kalos", year: 2013, min: 650, max: 721,
    legendaries: 6,
    accent: "#4f7ec9",
    regionTH: "คาโลส", regionJA: "カロス",
    starters: [{ id: 650, slot: "grass" }, { id: 653, slot: "fire" }, { id: 656, slot: "water" }],
  },
  {
    id: 7, roman: "VII", region: "Alola", year: 2016, min: 722, max: 809,
    legendaries: 18,
    accent: "#e08a3c",
    regionTH: "อาโลลา", regionJA: "アローラ",
    starters: [{ id: 722, slot: "grass" }, { id: 725, slot: "fire" }, { id: 728, slot: "water" }],
  },
  {
    id: 8, roman: "VIII", region: "Galar", year: 2019, min: 810, max: 905,
    legendaries: 15,
    accent: "#8b5cc4",
    regionTH: "กาลาร์", regionJA: "ガラル",
    starters: [{ id: 810, slot: "grass" }, { id: 813, slot: "fire" }, { id: 816, slot: "water" }],
  },
  {
    id: 9, roman: "IX", region: "Paldea", year: 2022, min: 906, max: 1025,
    legendaries: 13,
    accent: "#6faa54",
    regionTH: "พัลเดีย", regionJA: "パルデア",
    starters: [{ id: 906, slot: "grass" }, { id: 909, slot: "fire" }, { id: 912, slot: "water" }],
  },
];

export const genById = (id) =>
  GENERATIONS_INFO.find((g) => g.id === Number(id)) ?? GENERATIONS_INFO[0];

export const genCount = (g) => g.max - g.min + 1;

/** Region name in the reader's language. */
export const genRegion = (g, lang) =>
  lang === "th" ? g.regionTH : lang === "ja" ? g.regionJA : g.region;

// ─── Derived stats ───────────────────────────────────────────────────────────
// The two numbers that cannot be hardcoded because they depend on the Pokémon
// data actually loaded. Memoised per generation: the inputs never change during
// a session, and recomputing over ~150 entries on every tab press is work for
// nothing.
const statCache = new Map();

/**
 * Commonest type and mean base-stat total for one generation.
 * `pool` is the list of already-fetched Pokémon objects; entries outside the
 * generation are ignored, and a generation with nothing loaded yet returns
 * nulls rather than zeroes — a zero would render as a real, wrong statistic.
 */
export function generationStats(genId, pool) {
  const key = `${genId}:${pool.length}`;
  if (statCache.has(key)) return statCache.get(key);

  const g = genById(genId);
  const members = pool.filter((p) => p.id >= g.min && p.id <= g.max);
  if (!members.length) {
    const empty = { topType: null, avgTotal: null, sampled: 0 };
    statCache.set(key, empty);
    return empty;
  }

  const counts = new Map();
  let totalSum = 0;
  for (const p of members) {
    for (const t of p.types ?? []) {
      const n = t.type?.name;
      if (n) counts.set(n, (counts.get(n) ?? 0) + 1);
    }
    totalSum += (p.stats ?? []).reduce((a, st) => a + (st.base_stat ?? 0), 0);
  }

  // The single strongest member, for the summary line. Ties keep the earlier
  // dex number, which is the one people name.
  let strongest = null, strongestTotal = -1;
  for (const p of members) {
    const total = (p.stats ?? []).reduce((a, st) => a + (st.base_stat ?? 0), 0);
    if (total > strongestTotal) { strongestTotal = total; strongest = p; }
  }

  let topType = null, best = -1;
  for (const [name, n] of counts) {
    // Ties break alphabetically so the same generation always reports the same
    // type rather than whichever the Map happened to yield first.
    if (n > best || (n === best && name < topType)) { topType = name; best = n; }
  }

  const out = {
    topType,
    topTypeCount: best,
    avgTotal: Math.round(totalSum / members.length),
    strongestName: strongest?.name ?? null,
    strongestTotal: strongestTotal > 0 ? strongestTotal : null,
    sampled: members.length,
  };
  statCache.set(key, out);
  return out;
}
