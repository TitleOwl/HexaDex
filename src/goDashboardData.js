// ─── goDashboardData — static tables for the GO dashboard ────────────────────
//
// Eggs, Rocket line-ups and weather pairings are fixed by the game rather than
// published as a feed, so they live here as data instead of as a request.

/** §7 — the saturated type palette the dashboard badges use. */
export const TYPE_COLOR = {
  normal: "#A8A878", fire: "#F08030", water: "#6890F0", electric: "#F8D030",
  grass: "#78C850", ice: "#98D8D8", fighting: "#C03028", poison: "#A040A0",
  ground: "#E0C068", flying: "#A890F0", psychic: "#F85888", bug: "#A8B820",
  rock: "#B8A038", ghost: "#705898", dragon: "#7038F8", dark: "#705848",
  steel: "#B8B8D0", fairy: "#F0B6BC",
};

/** §5.4 — tier order, strongest first. */
export const TIER_ORDER = [
  "Mega", "5★ Legendary", "Ultra Beast", "3★ Rare",
  "Shadow 5★", "Shadow 3★", "Shadow 1★", "1★ Common", "Max Battle",
];

/** Maps the rotation feed's tier keys onto the labels above. */
export const TIER_LABEL = {
  mega: "Mega", "5": "5★ Legendary", s5: "Shadow 5★",
  "3": "3★ Rare", s3: "Shadow 3★", "1": "1★ Common", s1: "Shadow 1★",
};

/**
 * The real egg art, the same files EggPool.jsx already hotlinks from the
 * Pokémon GO Wiki — one egg means one picture across the app. The gradients
 * below stay as the onError fallback, because these are third-party hotlinks
 * and a row with a hole in it is worse than a shape.
 */
const WIKIA = "https://static.wikia.nocookie.net/pokemongo/images";
export const EGG_IMG = {
  2:  `${WIKIA}/f/f2/Egg_2k.png/revision/latest?cb=20211208153113`,
  5:  `${WIKIA}/3/33/Egg_5k.png/revision/latest?cb=20211208153322`,
  7:  `${WIKIA}/f/f5/Egg_7k.png/revision/latest?cb=20211208153329`,
  10: `${WIKIA}/f/f6/Egg_10k.png/revision/latest?cb=20211208153343`,
  12: `${WIKIA}/e/ee/Egg_12k.png/revision/latest?cb=20211208153349`,
};

/** §3.4 — egg shell gradients by distance, used only when an image fails. */
export const EGG_COLORS = {
  2:  ["#f0d8dc", "#d9a8b0"],
  5:  ["#c8d8f0", "#8fa8d9"],
  7:  ["#f0e0b8", "#d9c26e"],
  10: ["#d8c8f0", "#a88fd9"],
};

/** §3 — one row per distance, one entry per week column. */
export const EGG_ROTATION = [
  { km: 2,  weeks: [
    [{ dex: 218, name: "Slugma" }, { dex: 447, name: "Riolu" }],
    [{ dex: 194, name: "Wooper" }, { dex: 458, name: "Mantyke" }],
    [{ dex: 175, name: "Togepi" }, { dex: 231, name: "Phanpy" }],
    [{ dex: 172, name: "Pichu" }],
  ] },
  { km: 5,  weeks: [
    [{ dex: 246, name: "Larvitar" }, { dex: 371, name: "Bagon" }],
    [{ dex: 374, name: "Beldum" }, { dex: 443, name: "Gible" }],
    [{ dex: 633, name: "Deino" }, { dex: 610, name: "Axew" }],
    [{ dex: 599, name: "Klink" }],
  ] },
  { km: 7,  weeks: [
    [{ dex: 27,  name: "Alolan Sandshrew" }, { dex: 37, name: "Alolan Vulpix" }],
    [{ dex: 52,  name: "Galarian Meowth" }, { dex: 83, name: "Galarian Farfetch'd" }],
    [{ dex: 122, name: "Galarian Mr. Mime" }],
    [{ dex: 222, name: "Galarian Corsola" }],
  ] },
  { km: 10, weeks: [
    [{ dex: 447, name: "Riolu" }, { dex: 633, name: "Deino" }],
    [{ dex: 782, name: "Jangmo-o" }, { dex: 885, name: "Dreepy" }],
    [{ dex: 610, name: "Axew" }, { dex: 704, name: "Goomy" }],
    [{ dex: 246, name: "Larvitar" }],
  ] },
];

/**
 * Leader portraits — the same LeekDuck files RocketLineups.jsx already uses,
 * so a leader looks the same wherever they appear.
 */
const ROCKET_CHAR = "https://cdn.leekduck.com/assets/img/rocket/";
export const LEADER_IMG = {
  Giovanni: `${ROCKET_CHAR}boss-giovanni.png`,
  Sierra:   `${ROCKET_CHAR}leader-sierra.png`,
  Arlo:     `${ROCKET_CHAR}leader-arlo.png`,
  Cliff:    `${ROCKET_CHAR}leader-cliff.png`,
};

/** §4 — Rocket line-ups. `random: true` means one of the three appears. */
export const ROCKET_LINEUPS = [
  {
    leader: "Giovanni",
    sub: "ต้องใช้ Super Rocket Radar",
    subEn: "Needs a Super Rocket Radar",
    slots: [
      { mons: [{ dex: 52, name: "Persian" }] },
      { random: true, mons: [
        { dex: 130, name: "Gyarados" }, { dex: 260, name: "Swampert" }, { dex: 375, name: "Metang" }] },
      { mons: [{ dex: 483, name: "Dialga" }] },
    ],
    reward: { dex: 483, name: "Shadow Dialga", type: "steel" },
  },
  {
    leader: "Sierra",
    slots: [
      { mons: [{ dex: 302, name: "Sableye" }] },
      { random: true, mons: [
        { dex: 429, name: "Mismagius" }, { dex: 359, name: "Absol" }, { dex: 130, name: "Gyarados" }] },
      { random: true, mons: [
        { dex: 373, name: "Salamence" }, { dex: 348, name: "Armaldo" }, { dex: 407, name: "Roserade" }] },
    ],
    reward: { dex: 302, name: "Shadow Sableye", type: "ghost" },
  },
  {
    leader: "Arlo",
    slots: [
      { mons: [{ dex: 246, name: "Larvitar" }] },
      { random: true, mons: [
        { dex: 334, name: "Altaria" }, { dex: 227, name: "Skarmory" }, { dex: 306, name: "Aggron" }] },
      { random: true, mons: [
        { dex: 248, name: "Tyranitar" }, { dex: 350, name: "Milotic" }, { dex: 445, name: "Garchomp" }] },
    ],
    reward: { dex: 246, name: "Shadow Larvitar", type: "rock" },
  },
  {
    leader: "Cliff",
    slots: [
      { mons: [{ dex: 66, name: "Machop" }] },
      { random: true, mons: [
        { dex: 105, name: "Marowak" }, { dex: 310, name: "Manectric" }, { dex: 143, name: "Snorlax" }] },
      { random: true, mons: [
        { dex: 448, name: "Lucario" }, { dex: 260, name: "Swampert" }, { dex: 359, name: "Absol" }] },
    ],
    reward: { dex: 66, name: "Shadow Machop", type: "fighting" },
  },
];

/** §6.3 — the seven weather states and what each boosts. */
export const WEATHER_TABLE = [
  { key: "clear",         en: "Sunny / Clear",  th: "แดดจัด / แจ่มใส", types: ["grass", "fire", "ground"] },
  { key: "cloudy",        en: "Cloudy",         th: "มีเมฆ",           types: ["fairy", "fighting", "poison"] },
  { key: "rain",          en: "Rain",           th: "ฝนตก",            types: ["water", "electric", "bug"] },
  { key: "windy",         en: "Windy",          th: "ลมแรง",           types: ["dragon", "flying", "psychic"] },
  { key: "snow",          en: "Snow",           th: "หิมะ",            types: ["ice", "steel"] },
  { key: "fog",           en: "Fog",            th: "หมอก",            types: ["dark", "ghost"] },
  { key: "partly-cloudy", en: "Partly cloudy",  th: "มีเมฆบางส่วน",    types: ["normal", "rock"] },
];

/** Several API conditions collapse onto one row of the table above. */
export const CONDITION_ROW = {
  clear: "clear", "mostly-clear": "clear", "partly-cloudy": "partly-cloudy",
  cloudy: "cloudy", fog: "fog", drizzle: "rain", rain: "rain",
  thunderstorm: "rain", snow: "snow",
};

/**
 * The same official artwork the Pokédex draws, through the shared helper.
 *
 * LeekDuck's cropped icons were the brief's source, but they have no crop for
 * several regional forms — three of them fell back to initials — and using a
 * second art set means one Pokémon looks different on two pages of one app.
 */
export { artworkUrl as leekIcon } from "./utils.js";
