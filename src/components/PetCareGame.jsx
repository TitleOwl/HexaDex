// ─── PetCareGame — เลี้ยงโปเกมอน (Tamagotchi-style buddy raiser) ───
//
// Adopt a starter (every generation) plus Pikachu & Eevee, then raise it:
// feed, play, rest, bathe and pet it. Stats decay in real time (persisted
// via timestamps), caring earns EXP, and your buddy LEVELS UP and EVOLVES.
// Cute 8-bit animated sprites (gen-5 Black/White) with pixel fallback.

import { useState, useEffect, useRef, useCallback } from "react";
import {
  X, Coins, ShoppingBag, ClipboardList, ArrowUp,
  Utensils, Droplets, Moon, Heart, Gamepad2,
  Zap, Bath, Drumstick, Sparkles, Star, Home, Footprints, Check,
  CheckCircle2, Gift, Lightbulb, Sofa, Hand, Hourglass, Egg,
  Smile, Frown, HeartCrack,
  Crown, TrendingUp, Flame, Trophy, Award, Lock, Cherry, Timer,
  Settings, Volume2, VolumeX, Trash2, Clock, Share2,
} from "lucide-react";

// Map achievement icon names (from petQuests) → lucide components
const ACH_ICONS = { Egg, Sparkles, Crown, TrendingUp, Heart, Drumstick, Gamepad2, Flame, Trophy };
// Care-action → icon, for the personality "likes" hint
const ACTION_ICON = { feed: Utensils, play: Gamepad2, bath: Droplets, rest: Moon, pat: Heart };
const ACTION_LABEL = (k, lang) => ({
  feed: { th: "กินข้าว", en: "eating" }, play: { th: "เล่น", en: "playing" },
  bath: { th: "อาบน้ำ", en: "baths" }, rest: { th: "งีบ", en: "naps" }, pat: { th: "ลูบหัว", en: "cuddles" },
}[k]?.[lang === "th" ? "th" : "en"] ?? k);
import { useModalLifecycle } from "../perfUtils.js";
import { CRY_URL } from "../data.js";
import { PixelArt, FURNITURE, FURNITURE_BY_ID, FURNITURE_CATS } from "./pixelFurniture.jsx";
import {
  FOOD, QUESTS, COIN_EVENT, FOOD_EVENT, QUEST_EVENT, ACH_EVENT,
  readCoins, readFood, totalFood, consumeFood, buyFood, awardCoins,
  readQuests, questProgress, isClaimable, claimQuest, claimableCount,
  touchStreak, readStreak, streakBonusAvailable, streakBonusAmount, claimStreakBonus,
  ACHIEVEMENTS, readAchievements, unlockAchievement,
  bumpLife, setLifeMax, trackGame, readHall, addToHall,
} from "./petQuests.js";

const ITEM_SPRITE = (slug) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${slug}.png`;

export const SAVE_KEY = "pkdx_pet_v1";
export const ROAM_KEY = "pkdx_buddy_roaming";

// Buddies "talk" with their Pokémon cry instead of words.
// id-based sources only (works for any form without needing its name).
let lastCryAudio = null;
export function playBuddyCry(id) {
  if (!id) return;
  try { lastCryAudio?.pause(); } catch {}
  const tryPlay = (list) => {
    if (!list.length) return;
    const [src, ...rest] = list;
    const a = new Audio(src);
    a.volume = 0.5;
    lastCryAudio = a;
    a.play().catch(() => tryPlay(rest));
  };
  tryPlay([CRY_URL.latest(id), CRY_URL.anime(id), CRY_URL.legacy(id)]);
}

// Fired whenever the pet save changes so the roaming BuddyCompanion can sync
export const PET_EVENT = "pet:update";
export const emitPetUpdate = () => {
  try { window.dispatchEvent(new CustomEvent(PET_EVENT)); } catch {}
};

// Animated gen-5 pixel sprite → static pixel fallback
export const animSprite  = id => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${id}.gif`;
export const pixelSprite = id => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;

// ─── Roster: base id, evolution chain, generation, english name ───
const ROSTER = [
  { base: 25,  chain: [25, 26],      gen: "★", en: "Pikachu" },
  { base: 133, chain: [133, 196],    gen: "★", en: "Eevee" },
  { base: 1,   chain: [1, 2, 3],     gen: 1, en: "Bulbasaur" },
  { base: 4,   chain: [4, 5, 6],     gen: 1, en: "Charmander" },
  { base: 7,   chain: [7, 8, 9],     gen: 1, en: "Squirtle" },
  { base: 152, chain: [152,153,154], gen: 2, en: "Chikorita" },
  { base: 155, chain: [155,156,157], gen: 2, en: "Cyndaquil" },
  { base: 158, chain: [158,159,160], gen: 2, en: "Totodile" },
  { base: 252, chain: [252,253,254], gen: 3, en: "Treecko" },
  { base: 255, chain: [255,256,257], gen: 3, en: "Torchic" },
  { base: 258, chain: [258,259,260], gen: 3, en: "Mudkip" },
  { base: 387, chain: [387,388,389], gen: 4, en: "Turtwig" },
  { base: 390, chain: [390,391,392], gen: 4, en: "Chimchar" },
  { base: 393, chain: [393,394,395], gen: 4, en: "Piplup" },
  { base: 495, chain: [495,496,497], gen: 5, en: "Snivy" },
  { base: 498, chain: [498,499,500], gen: 5, en: "Tepig" },
  { base: 501, chain: [501,502,503], gen: 5, en: "Oshawott" },
  { base: 650, chain: [650,651,652], gen: 6, en: "Chespin" },
  { base: 653, chain: [653,654,655], gen: 6, en: "Fennekin" },
  { base: 656, chain: [656,657,658], gen: 6, en: "Froakie" },
  { base: 722, chain: [722,723,724], gen: 7, en: "Rowlet" },
  { base: 725, chain: [725,726,727], gen: 7, en: "Litten" },
  { base: 728, chain: [728,729,730], gen: 7, en: "Popplio" },
  { base: 810, chain: [810,811,812], gen: 8, en: "Grookey" },
  { base: 813, chain: [813,814,815], gen: 8, en: "Scorbunny" },
  { base: 816, chain: [816,817,818], gen: 8, en: "Sobble" },
  { base: 906, chain: [906,907,908], gen: 9, en: "Sprigatito" },
  { base: 909, chain: [909,910,911], gen: 9, en: "Fuecoco" },
  { base: 912, chain: [912,913,914], gen: 9, en: "Quaxly" },
];
const ROSTER_BY_BASE = Object.fromEntries(ROSTER.map(r => [r.base, r]));

// ─── Per-species personality: a favourite + disliked care action ───
// Favourite action → bonus happiness, bond & a coin tip. Disliked → muted gain.
// actions: feed | play | bath | rest | pat
const PERSONALITY = {
  25:  { likes: "play", dislikes: "bath", th: "ขี้เล่น",    en: "Playful" },
  133: { likes: "pat",  dislikes: "rest", th: "ติดคน",     en: "Affectionate" },
  1:   { likes: "rest", dislikes: "play", th: "ใจเย็น",     en: "Calm" },
  4:   { likes: "play", dislikes: "bath", th: "ร่าเริง",    en: "Energetic" },
  7:   { likes: "bath", dislikes: "rest", th: "รักสะอาด",   en: "Tidy" },
  152: { likes: "rest", dislikes: "bath", th: "อ่อนโยน",    en: "Gentle" },
  155: { likes: "play", dislikes: "bath", th: "กระตือรือร้น", en: "Eager" },
  158: { likes: "bath", dislikes: "rest", th: "ซุกซน",      en: "Mischievous" },
  252: { likes: "rest", dislikes: "pat",  th: "เท่",        en: "Cool" },
  255: { likes: "play", dislikes: "bath", th: "สดใส",       en: "Cheerful" },
  258: { likes: "bath", dislikes: "play", th: "ใจดี",       en: "Sweet" },
  387: { likes: "rest", dislikes: "play", th: "หนักแน่น",   en: "Steady" },
  390: { likes: "play", dislikes: "rest", th: "ซน",         en: "Spirited" },
  393: { likes: "bath", dislikes: "pat",  th: "ภูมิใจ",     en: "Proud" },
  495: { likes: "rest", dislikes: "play", th: "สง่า",       en: "Elegant" },
  498: { likes: "feed", dislikes: "bath", th: "กินเก่ง",    en: "Foodie" },
  501: { likes: "bath", dislikes: "rest", th: "กล้าหาญ",    en: "Brave" },
  650: { likes: "feed", dislikes: "bath", th: "ตะกละ",      en: "Hearty" },
  653: { likes: "pat",  dislikes: "bath", th: "สง่างาม",    en: "Graceful" },
  656: { likes: "play", dislikes: "rest", th: "ว่องไว",     en: "Nimble" },
  722: { likes: "rest", dislikes: "play", th: "ง่วงนอน",    en: "Sleepy" },
  725: { likes: "pat",  dislikes: "bath", th: "ขี้อาย",     en: "Aloof" },
  728: { likes: "play", dislikes: "rest", th: "ชอบโชว์",    en: "Showy" },
  810: { likes: "play", dislikes: "rest", th: "จังหวะดี",   en: "Lively" },
  813: { likes: "play", dislikes: "bath", th: "พลังล้น",    en: "Hyper" },
  816: { likes: "bath", dislikes: "play", th: "เขินอาย",    en: "Shy" },
  906: { likes: "pat",  dislikes: "bath", th: "อิสระ",      en: "Independent" },
  909: { likes: "feed", dislikes: "play", th: "ชิลล์",      en: "Laid-back" },
  912: { likes: "bath", dislikes: "rest", th: "เนี้ยบ",     en: "Dapper" },
};
const personalityOf = (base) => PERSONALITY[base] ?? { likes: "pat", dislikes: null, th: "เป็นมิตร", en: "Friendly" };

// Bond level tiers (0-100)
const BOND_TIERS = [
  { min: 95, th: "คู่หูตลอดกาล", en: "Soulmate" },
  { min: 70, th: "เพื่อนซี้",     en: "Close Pal" },
  { min: 45, th: "เพื่อนกัน",     en: "Friend" },
  { min: 20, th: "เริ่มคุ้นเคย",  en: "Familiar" },
  { min: 0,  th: "เพิ่งรู้จัก",   en: "New Friend" },
];
const bondTier = (b) => BOND_TIERS.find(t => (b ?? 0) >= t.min) ?? BOND_TIERS[BOND_TIERS.length - 1];

// Evolution level thresholds per chain length
const evoThresholds = (len) => (len === 3 ? [5, 12] : [8]);
const stageForLevel = (chain, level) =>
  evoThresholds(chain.length).filter(thr => level >= thr).length;

// Eevee branch evolutions (chosen by the player at evolve time)
export const EEVEELUTIONS = [
  { id: 134, en: "Vaporeon" }, { id: 135, en: "Jolteon" }, { id: 136, en: "Flareon" },
  { id: 196, en: "Espeon" },   { id: 197, en: "Umbreon" }, { id: 470, en: "Leafeon" },
  { id: 471, en: "Glaceon" },  { id: 700, en: "Sylveon" },
];
const EEVEE_BASE = 133;

// Current sprite id for a saved buddy (resolves the evolved stage / Eevee choice)
export function buddySpriteId(save) {
  if (!save) return null;
  if (save.base === EEVEE_BASE && (save.stage ?? 0) >= 1) return save.evoChoice ?? 196;
  const chain = ROSTER_BY_BASE[save.base]?.chain ?? [save.base];
  return chain[Math.min(save.stage ?? 0, chain.length - 1)];
}
// All Pokémon ids in the buddy's family (for "react when you view its kin")
export function buddyLineIds(save) {
  if (!save) return [];
  const chain = ROSTER_BY_BASE[save.base]?.chain ?? [save.base];
  const ids = new Set(chain);
  if (save.base === EEVEE_BASE) EEVEELUTIONS.forEach(e => ids.add(e.id));
  if (save.evoChoice) ids.add(save.evoChoice);
  return [...ids];
}

// Read the buddy save from localStorage (or null)
export function readPetSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// EXP needed to reach the next level
const expForNext = (level) => 80 + level * 45;

// Stat decay per real-world minute (points/min)
const DECAY = { hunger: 0.75, happy: 0.5, energy: 0.55, clean: 0.4 };

const clamp = (n) => Math.max(0, Math.min(100, n));

// Tiny WebAudio sound effects (no asset files) — short, cute blips per action
let _petActx = null;
function petSfx(kind) {
  try {
    _petActx = _petActx || new (window.AudioContext || window.webkitAudioContext)();
    const ctx = _petActx;
    if (ctx.state === "suspended") ctx.resume();
    const now = ctx.currentTime;
    const tone = (freq, dur, type = "sine", vol = 0.12, delay = 0) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.value = freq;
      o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, now + delay);
      g.gain.exponentialRampToValueAtTime(vol, now + delay + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + delay + dur);
      o.start(now + delay); o.stop(now + delay + dur + 0.03);
    };
    switch (kind) {
      case "feed": tone(520, 0.12, "triangle"); tone(680, 0.10, "triangle", 0.1, 0.08); break;
      case "play": tone(600, 0.09, "square", 0.07); tone(820, 0.09, "square", 0.07, 0.07); break;
      case "bath": tone(900, 0.18, "sine", 0.09); break;
      case "rest": tone(360, 0.26, "sine", 0.1); break;
      case "pat": case "love": tone(660, 0.10, "triangle"); tone(880, 0.12, "triangle", 0.1, 0.08); break;
      case "coin": tone(880, 0.07, "square", 0.08); tone(1180, 0.10, "square", 0.08, 0.06); break;
      case "evolve": tone(523, 0.14, "triangle"); tone(659, 0.14, "triangle", 0.1, 0.12); tone(784, 0.22, "triangle", 0.1, 0.24); break;
      case "click": tone(440, 0.05, "sine", 0.05); break;
      default: tone(560, 0.10, "sine");
    }
  } catch {}
}

// ─── Room customization: themes + furniture ───
// Each theme is a layered pixel "room": a wall (top 56%) with wallpaper, a floor
// (bottom 44%) with planks/tiles, a baseboard seam, and ambient scene props
// (sun / moon / clouds / stars …). All pure CSS+SVG — reliable, cohesive 8-bit.
// view = what shows through the window · wainscot = lower-wall panel colour
// ambient = stuff drifting in the room itself
const ROOM_THEMES = [
  { id: "cozy", emoji: "🛋️", th: "ห้องอบอุ่น", en: "Cozy Room",
    wall: "#e3cba6", wainscot: "#caa979", floor: "#b07d4e",
    wallPat: "repeating-linear-gradient(90deg, rgba(255,255,255,0.10) 0 13px, rgba(0,0,0,0.03) 13px 27px)",
    floorPat: "repeating-linear-gradient(90deg, rgba(0,0,0,0.13) 0 2px, transparent 2px 30px)",
    view: "day", ambient: [] },
  { id: "meadow", emoji: "🌳", th: "ทุ่งหญ้า", en: "Meadow",
    wall: "#cfeaff", wainscot: "#a9d8e8", floor: "#7fcf8c",
    wallPat: "radial-gradient(rgba(255,255,255,0.45) 1.5px, transparent 2px)", wallPatSize: "26px 26px",
    floorPat: "repeating-linear-gradient(95deg, rgba(0,0,0,0.05) 0 1px, transparent 1px 7px)",
    view: "day", ambient: [] },
  { id: "beach", emoji: "🏖️", th: "ชายหาด", en: "Beach",
    wall: "#bfeeff", wainscot: "#9bd9ec", floor: "#f1d79a",
    wallPat: "", floorPat: "radial-gradient(rgba(0,0,0,0.05) 1px, transparent 2px)", floorPatSize: "14px 14px",
    view: "sea", ambient: [] },
  { id: "night", emoji: "🌙", th: "ราตรีค่ำคืน", en: "Night",
    wall: "#2a2a55", wainscot: "#1f1f44", floor: "#33345e",
    wallPat: "", floorPat: "repeating-linear-gradient(90deg, rgba(255,255,255,0.04) 0 2px, transparent 2px 30px)",
    view: "night", ambient: [] },
  { id: "snow", emoji: "❄️", th: "หิมะ", en: "Snowy",
    wall: "#cfe2f6", wainscot: "#b3cfe8", floor: "#eef6ff",
    wallPat: "radial-gradient(rgba(255,255,255,0.6) 1.5px, transparent 2px)", wallPatSize: "30px 30px",
    floorPat: "radial-gradient(rgba(180,205,235,0.5) 1.5px, transparent 2px)", floorPatSize: "20px 20px",
    view: "snow", ambient: ["snowfall"] },
  { id: "cave", emoji: "🪨", th: "ถ้ำคริสตัล", en: "Crystal Cave",
    wall: "#2c2a3a", wainscot: "#232234", floor: "#46415a",
    wallPat: "radial-gradient(rgba(120,150,255,0.10) 1px, transparent 2px)", wallPatSize: "24px 24px",
    floorPat: "repeating-linear-gradient(90deg, rgba(0,0,0,0.18) 0 2px, transparent 2px 22px)",
    view: "none", ambient: ["crystals"] },
  { id: "candy", emoji: "🍬", th: "ห้องลูกอม", en: "Candy",
    wall: "#ffd6ec", wainscot: "#ffbfdf", floor: "#ffc1dd",
    wallPat: "radial-gradient(rgba(255,255,255,0.6) 3px, transparent 4px)", wallPatSize: "30px 30px",
    floorPat: "repeating-linear-gradient(45deg, rgba(255,255,255,0.22) 0 8px, transparent 8px 16px)",
    view: "day", ambient: ["balloons"] },
  { id: "space", emoji: "🚀", th: "อวกาศ", en: "Space",
    wall: "#16153a", wainscot: "#10102b", floor: "#2a2150",
    wallPat: "", floorPat: "repeating-linear-gradient(90deg, rgba(160,120,255,0.12) 0 2px, transparent 2px 28px)",
    view: "space", ambient: [] },
  { id: "forest", emoji: "🌲", th: "ป่าไม้", en: "Forest",
    wall: "#d2eccd", wainscot: "#b6dcb0", floor: "#7a5a3a",
    wallPat: "repeating-linear-gradient(110deg, rgba(60,140,80,0.10) 0 6px, transparent 6px 16px)",
    floorPat: "repeating-linear-gradient(90deg, rgba(0,0,0,0.1) 0 2px, transparent 2px 24px)",
    view: "forest", ambient: ["leaves"] },
  { id: "lab", emoji: "🔬", th: "แล็บโปเกมอน", en: "Poké Lab",
    wall: "#123a66", wainscot: "#0e2a52", floor: "#1b3a5e",
    wallPat: "linear-gradient(rgba(80,200,255,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(80,200,255,0.10) 1px, transparent 1px)", wallPatSize: "22px 22px",
    floorPat: "linear-gradient(rgba(80,200,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(80,200,255,0.12) 1px, transparent 1px)", floorPatSize: "22px 22px",
    view: "lab", ambient: [] },
];
const THEME_BY_ID = Object.fromEntries(ROOM_THEMES.map(t => [t.id, t]));

// Room save: { theme, placed: [{ uid, id, xPct, yPct }] }  (xPct/yPct = item centre)
const DEFAULT_ROOM = { theme: "cozy", placed: [
  { uid: 1, id: "rug",   xPct: 50, yPct: 84, scale: 1.2 },
  { uid: 2, id: "plant", xPct: 14, yPct: 74, scale: 1 },
  { uid: 3, id: "sofa",  xPct: 78, yPct: 76, scale: 1 },
] };

// Mini room preview for the theme picker (shows the real room, not an emoji)
function RoomThumb({ theme }) {
  return (
    <div className="room-thumb" aria-hidden>
      <div className="rt-wall" style={{ background: theme.wall }}>
        {theme.wallPat && <div className="rt-pat"
          style={{ backgroundImage: theme.wallPat, backgroundSize: theme.wallPatSize || "auto" }} />}
        <div className="rt-window" />
      </div>
      <div className="rt-floor" style={{ background: theme.floor }}>
        {theme.floorPat && <div className="rt-pat"
          style={{ backgroundImage: theme.floorPat, backgroundSize: theme.floorPatSize || "auto" }} />}
      </div>
    </div>
  );
}

// ─── What you see through the window (the "outside view") ───
function WindowView({ view }) {
  if (view === "none") return null;
  const sky = {
    day:    "linear-gradient(180deg,#8fd0ff,#cdeeff)",
    sea:    "linear-gradient(180deg,#8fd0ff,#bfeeff)",
    night:  "linear-gradient(180deg,#10103a,#26265c)",
    snow:   "linear-gradient(180deg,#bcd3ee,#e4eefb)",
    space:  "linear-gradient(180deg,#0a0a26,#241148)",
    forest: "linear-gradient(180deg,#bfe6ff,#dff3e2)",
    lab:    "linear-gradient(180deg,#0a2240,#0e3358)",
  }[view] || "linear-gradient(180deg,#8fd0ff,#cdeeff)";

  return (
    <div className="room-window">
      <div className="rw-glass" style={{ background: sky }}>
        {(view === "day") && (<>
          <div className="rw-sun" />
          <div className="rw-cloud" style={{ top: "30%", left: "8%" }} />
          <div className="rw-cloud" style={{ top: "55%", left: "48%", transform: "scale(0.7)" }} />
        </>)}
        {view === "sea" && (<>
          <div className="rw-sun" />
          <div className="rw-sea" />
        </>)}
        {view === "night" && (<>
          <div className="rw-moon" />
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} className="rw-star"
              style={{ left: `${(i * 29) % 88 + 6}%`, top: `${(i * 41) % 70 + 6}%`, animationDelay: `${(i % 4) * 0.5}s` }} />
          ))}
        </>)}
        {view === "snow" && Array.from({ length: 9 }).map((_, i) => (
          <span key={i} className="rw-snow"
            style={{ left: `${(i * 37) % 90 + 5}%`, animationDelay: `${(i % 5) * 0.5}s` }} />
        ))}
        {view === "space" && (<>
          <div className="rw-planet" />
          {Array.from({ length: 9 }).map((_, i) => (
            <span key={i} className="rw-star"
              style={{ left: `${(i * 31) % 88 + 6}%`, top: `${(i * 47) % 72 + 5}%`, animationDelay: `${(i % 4) * 0.5}s` }} />
          ))}
        </>)}
        {view === "forest" && (<>
          <div className="rw-tree" style={{ left: "12%" }} />
          <div className="rw-tree" style={{ left: "44%", transform: "scale(0.8)" }} />
          <div className="rw-tree" style={{ left: "72%", transform: "scale(0.9)" }} />
        </>)}
        {view === "lab" && (<>
          <div className="rw-screen" />
        </>)}
      </div>
      <div className="rw-bars" />
    </div>
  );
}

// ─── Stuff drifting inside the room ───
function RoomAmbient({ tokens = [] }) {
  const has = (k) => tokens.includes(k);
  return (
    <div className="room-scene" aria-hidden>
      {has("snowfall") && Array.from({ length: 12 }).map((_, i) => (
        <span key={i} className="rs-snow"
          style={{ left: `${(i * 41) % 95 + 2}%`, animationDelay: `${(i % 6) * 0.5}s`, animationDuration: `${3 + (i % 3)}s` }} />
      ))}
      {has("crystals") && (<>
        <div className="rs-crystal" style={{ left: "6%",  bottom: "12%", "--cc": "#7aa6ff" }} />
        <div className="rs-crystal" style={{ right: "6%", bottom: "10%", "--cc": "#b08aff" }} />
      </>)}
      {has("balloons") && (<>
        <div className="rs-balloon" style={{ left: "8%",  top: "6%", "--bc": "#ff7eb6" }} />
        <div className="rs-balloon" style={{ right: "8%", top: "10%", "--bc": "#9b8cff" }} />
      </>)}
      {has("leaves") && Array.from({ length: 6 }).map((_, i) => (
        <span key={i} className="rs-leaf"
          style={{ left: `${(i * 61) % 90 + 4}%`, animationDelay: `${(i % 4) * 0.7}s` }} />
      ))}
    </div>
  );
}

// ─── Sprite with animated→pixel fallback ───
// (parent passes key={id} so it remounts fresh when the buddy evolves)
function PetSprite({ id, size = 150, flip = false, style }) {
  const [failed, setFailed] = useState(false);
  return (
    <img
      src={failed ? pixelSprite(id) : animSprite(id)}
      alt=""
      onError={() => setFailed(true)}
      draggable={false}
      style={{
        width: size, height: size, objectFit: "contain",
        imageRendering: "pixelated",
        transform: `scaleX(${flip ? -1 : 1})`,
        ...style,
      }}
    />
  );
}

// ═══ Berry Catch — tap the berries before they vanish to earn coins ═══
const BC_TIME = 20;
function BerryCatchGame({ lang, onClose, onFinish }) {
  const t = (th, en, ja) => lang === "th" ? th : lang === "ja" ? (ja ?? en) : en;
  const [phase, setPhase] = useState("intro"); // intro | play | done
  const [score, setScore] = useState(0);
  const [earned, setEarned] = useState(0);
  const [timeLeft, setTimeLeft] = useState(BC_TIME);
  const [berries, setBerries] = useState([]); // {id,x,y,gold}
  const idRef = useRef(0);
  const finishedRef = useRef(false);

  // countdown
  useEffect(() => {
    if (phase !== "play") return;
    if (timeLeft <= 0) { setPhase("done"); return; }
    const id = setTimeout(() => setTimeLeft(v => v - 1), 1000);
    return () => clearTimeout(id);
  }, [phase, timeLeft]);

  // spawn berries
  useEffect(() => {
    if (phase !== "play") return;
    const spawn = () => {
      const id = idRef.current++;
      const gold = Math.random() < 0.18;
      const b = { id, gold, x: 8 + Math.random() * 80, y: 12 + Math.random() * 70 };
      setBerries(prev => [...prev, b]);
      setTimeout(() => setBerries(prev => prev.filter(x => x.id !== id)), 1150);
    };
    spawn();
    const iv = setInterval(spawn, 640);
    return () => clearInterval(iv);
  }, [phase]);

  // award once when finished
  useEffect(() => {
    if (phase === "done" && !finishedRef.current) {
      finishedRef.current = true;
      onFinish(earned);
    }
  }, [phase, earned, onFinish]);

  const catchBerry = (b) => {
    setBerries(prev => prev.filter(x => x.id !== b.id));
    setScore(s => s + 1);
    setEarned(c => c + (b.gold ? 3 : 1));
  };

  const start = () => { setScore(0); setEarned(0); setTimeLeft(BC_TIME); finishedRef.current = false; setPhase("play"); };

  return (
    <div className="pet-sheet-overlay" onClick={onClose}>
      <div className="pet-sheet" onClick={e => e.stopPropagation()}>
        <div className="pet-editor-head">
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Cherry size={16} strokeWidth={2.2} /> {t("เก็บเบอร์รี่","Berry Catch","ベリーキャッチ")}</span>
          {phase === "play" && <span className="pet-coins" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Timer size={13} strokeWidth={2.3} /> {timeLeft}s</span>}
          <button className="pet-sheet-x" onClick={onClose}><X size={15} strokeWidth={2.4} /></button>
        </div>

        {phase === "intro" && (
          <div className="bc-intro">
            <div className="bc-intro-icon"><Cherry size={40} strokeWidth={2} /></div>
            <div className="bc-intro-title">{t("แตะเบอร์รี่ให้ทันก่อนหาย!","Tap berries before they vanish!","消える前にベリーをタップ！")}</div>
            <div className="bc-intro-sub">{t("ได้เบอร์รี่ละ 1 เหรียญ · เบอร์รี่ทอง 3 เหรียญ","1 coin each · golden berry = 3","1個1コイン・金は3コイン")}</div>
            <button className="bc-start" onClick={start}>{t("เริ่มเล่น","Play","スタート")}</button>
          </div>
        )}

        {phase === "play" && (
          <div className="bc-field">
            <div className="bc-score"><Coins size={13} strokeWidth={2.3} /> {earned}</div>
            {berries.map(b => (
              <button key={b.id} className={`bc-berry${b.gold ? " gold" : ""}`}
                style={{ left: `${b.x}%`, top: `${b.y}%` }}
                onPointerDown={() => catchBerry(b)}>
                <Cherry size={b.gold ? 26 : 22} strokeWidth={2.2} fill="currentColor" />
              </button>
            ))}
          </div>
        )}

        {phase === "done" && (
          <div className="bc-intro">
            <div className="bc-intro-icon" style={{ color: "var(--p-gold)" }}><Coins size={40} strokeWidth={2} /></div>
            <div className="bc-intro-title">{t("เก็บได้ " + score + " เบอร์รี่!", score + " berries caught!", score + "個ゲット！")}</div>
            <div className="bc-intro-sub" style={{ display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
              <Coins size={15} strokeWidth={2.3} style={{ color: "var(--p-gold)" }} /> +{earned} {t("เหรียญ","coins","コイン")}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="bc-start" onClick={start}>{t("เล่นอีก","Again","もう一度")}</button>
              <button className="bc-start ghost" onClick={onClose}>{t("ปิด","Close","閉じる")}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
export default function PetCareGame({ thaiArr, jpArr, lang, onClose }) {
  useModalLifecycle(onClose);
  const t = (th, en, ja) => lang === "th" ? th : lang === "ja" ? (ja ?? en) : en;

  const localName = useCallback((id, enFallback) => {
    if (lang === "th" && thaiArr?.[id - 1]) return thaiArr[id - 1];
    if (lang === "ja" && jpArr?.[id - 1]) return jpArr[id - 1];
    return enFallback ?? (id ? `#${id}` : "");
  }, [lang, thaiArr, jpArr]);

  // ─── Load existing save ───
  const [pet, setPet] = useState(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  });

  const [particles, setParticles] = useState([]);
  const [now, setNow] = useState(() => Date.now()); // ticks every 5s for age display
  const [evolving, setEvolving] = useState(false);
  const [levelFlash, setLevelFlash] = useState(false);
  const [actionPose, setActionPose] = useState(null); // bounce | wiggle | sleep
  const [roaming, setRoaming] = useState(() => {
    try { return localStorage.getItem(ROAM_KEY) === "1"; } catch { return false; }
  });
  const [editingRoom, setEditingRoom] = useState(false);
  const [editCat, setEditCat] = useState("living"); // active furniture category tab
  const [facing, setFacing] = useState(false); // sprite faces left when true
  const [isWalking, setIsWalking] = useState(true); // drives the run-cycle pose
  const [drag, setDrag] = useState(null); // { uid, xPct, yPct } while dragging furniture
  const placedUidRef = useRef(1000);
  const dragUidRef = useRef(null);
  // Coins / food / quests
  const [coins, setCoins] = useState(() => readCoins());
  const [food, setFood] = useState(() => readFood());
  const [questState, setQuestState] = useState(() => readQuests());
  const [showFood, setShowFood] = useState(false);   // feed picker
  const [showShop, setShowShop] = useState(false);    // buy food
  const [showQuests, setShowQuests] = useState(false); // mission list
  const [showAch, setShowAch] = useState(false);       // achievements panel
  const [showHall, setShowHall] = useState(false);     // hall of fame
  const [showGame, setShowGame] = useState(false);     // berry-catch mini-game
  const [achToast, setAchToast] = useState(null);      // newly-unlocked achievement
  const [achState, setAchState] = useState(() => readAchievements());
  const [hall, setHall] = useState(() => readHall());
  const [streak, setStreak] = useState(() => readStreak());
  const [streakReward, setStreakReward] = useState(null); // coins from daily bonus
  const [evoChoosing, setEvoChoosing] = useState(false);  // Eevee branch picker
  const [showSettings, setShowSettings] = useState(false);
  const [sfxOn, setSfxOn] = useState(() => { try { return localStorage.getItem("pkdx_pet_sfx") !== "0"; } catch { return true; } });
  const [away, setAway] = useState(null); // "while you were away" summary
  const [showIntro, setShowIntro] = useState(() => {
    try { return !!readPetSave() && localStorage.getItem("pkdx_pet_onboarded") !== "1"; } catch { return false; }
  });
  const [sharing, setSharing] = useState(false);
  const partIdRef = useRef(0);
  const poseTimer = useRef(null);
  // Room-walking engine refs
  const stageRef = useRef(null);
  const walkerRef = useRef(null);
  const xRef = useRef(120);
  const dirRef = useRef(1);
  const walkModeRef = useRef("walk"); // walk | idle
  const blockWalkRef = useRef(false); // frozen while evolving / sleeping / editing

  // ─── Persist on change + notify roaming companion ───
  useEffect(() => {
    if (pet) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(pet)); } catch {} }
    emitPetUpdate();
  }, [pet]);

  // ─── Persist roaming flag + notify companion ───
  useEffect(() => {
    try { localStorage.setItem(ROAM_KEY, roaming ? "1" : "0"); } catch {}
    emitPetUpdate();
  }, [roaming]);

  // ─── Daily care streak (advance once on open) ───
  useEffect(() => {
    const s = touchStreak();
    setStreak(s);
    if (s.count >= 7) fireAch("streak7");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const claimStreak = () => {
    const amt = claimStreakBonus();
    if (amt > 0) {
      setCoins(readCoins());
      setStreak(readStreak());
      setStreakReward(amt);
      sfx("coin");
      setTimeout(() => setStreakReward(null), 2400);
    }
  };

  const toggleSfx = () => setSfxOn(v => {
    const nv = !v;
    try { localStorage.setItem("pkdx_pet_sfx", nv ? "1" : "0"); } catch {}
    if (nv) petSfx("click");
    return nv;
  });

  const dismissIntro = () => { try { localStorage.setItem("pkdx_pet_onboarded", "1"); } catch {}; setShowIntro(false); };

  // ── Shareable buddy card (canvas → Web Share / download) ──
  const loadImg = (src) => new Promise((res, rej) => {
    const im = new Image(); im.crossOrigin = "anonymous";
    im.onload = () => res(im); im.onerror = rej; im.src = src;
  });
  const shareCard = async () => {
    if (sharing || !pet) return;
    setSharing(true);
    const name = localName(curId, ROSTER_BY_BASE[pet.base]?.en);
    try {
      const W = 1080, H = 1350, R = 56;
      const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
      const c = cv.getContext("2d");
      const rr = (x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
      // background
      const g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#241d2b"); g.addColorStop(1, "#140f19");
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      // panel
      c.fillStyle = "rgba(255,255,255,0.05)"; rr(60, 60, W - 120, H - 120, R); c.fill();
      // hero artwork
      try {
        const art = await loadImg(`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${curId}.png`);
        const s = 560; c.drawImage(art, (W - s) / 2, 180, s, s);
      } catch {}
      c.textAlign = "center";
      c.fillStyle = "#fff"; c.font = "800 78px -apple-system, system-ui, sans-serif";
      c.fillText(name, W / 2, 850);
      c.fillStyle = "#f7cf6b"; c.font = "700 44px -apple-system, system-ui, sans-serif";
      c.fillText(`Lv. ${pet.level}  ·  ${lang === "th" ? tier.th : tier.en}`, W / 2, 918);
      // stat chips
      const chips = [
        [`${t("ผูกพัน", "Bond", "きずな")}`, `${bond}%`],
        [`${t("รางวัล", "Awards", "じっせき")}`, `${achCount}/${ACHIEVEMENTS.length}`],
        [`${t("สะสม", "Collected", "コレ")}`, `${hall.length}`],
      ];
      const cw = 280, gap = 24, total = cw * 3 + gap * 2, sx = (W - total) / 2;
      chips.forEach(([lab, val], i) => {
        const x = sx + i * (cw + gap);
        c.fillStyle = "rgba(255,255,255,0.07)"; rr(x, 980, cw, 150, 28); c.fill();
        c.fillStyle = "#fff"; c.font = "800 56px -apple-system, system-ui, sans-serif"; c.fillText(val, x + cw / 2, 1050);
        c.fillStyle = "rgba(235,235,245,0.6)"; c.font = "600 30px -apple-system, system-ui, sans-serif"; c.fillText(lab, x + cw / 2, 1098);
      });
      c.fillStyle = "rgba(235,235,245,0.45)"; c.font = "700 38px -apple-system, system-ui, sans-serif";
      c.fillText("✦  HexaDex Buddy", W / 2, 1250);

      const blob = await new Promise(r => cv.toBlob(r, "image/png"));
      const file = new File([blob], "hexadex-buddy.png", { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "HexaDex Buddy", text: t(`มาดู ${name} ของฉันใน HexaDex!`, `Meet my ${name} in HexaDex!`, `HexaDexの${name}！`) });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = "hexadex-buddy.png"; a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      try { if (navigator.share) await navigator.share({ title: "HexaDex Buddy", text: `${name} · Lv.${pet.level}`, url: location.href }); } catch {}
    } finally { setSharing(false); }
  };

  const handleGameFinish = (earnedCoins) => {
    if (earnedCoins > 0) { awardCoins(earnedCoins); setCoins(readCoins()); sfx("coin"); }
    trackGame();
    setQuestState(readQuests());
    const l = bumpLife("games");
    if (l.games >= 5) fireAch("game5");
  };

  // Hide the roaming companion while this full-screen care screen is open
  useEffect(() => {
    try { window.dispatchEvent(new CustomEvent("catch:open")); } catch {}
    return () => { try { window.dispatchEvent(new CustomEvent("catch:close")); } catch {} };
  }, []);

  // ─── "While you were away" summary (once, on open) ───
  useEffect(() => {
    const s = readPetSave();
    if (!s || !s.lastTick) return;
    const elapsed = Date.now() - s.lastTick;
    if (elapsed < 3600000) return; // only worth showing after ~1h away
    const mins = elapsed / 60000;
    const cap = (v) => Math.round(Math.min(100, v));
    const drops = {
      hunger: cap(DECAY.hunger * mins), happy: cap(DECAY.happy * mins),
      energy: cap(DECAY.energy * mins), clean: cap(DECAY.clean * mins),
    };
    const hours = Math.floor(elapsed / 3600000);
    const reward = Math.min(10, Math.max(2, hours));
    awardCoins(reward); setCoins(readCoins());
    setAway({ hours, mins: Math.floor(mins), drops, reward });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Real-time stat decay (catch-up on mount + every 5s) ───
  useEffect(() => {
    if (!pet) return;
    const applyDecay = () => {
      setNow(Date.now());
      setPet(prev => {
        if (!prev) return prev;
        const now = Date.now();
        const mins = (now - (prev.lastTick ?? now)) / 60000;
        if (mins <= 0) return { ...prev, lastTick: now };
        return {
          ...prev,
          lastTick: now,
          stats: {
            hunger: clamp(prev.stats.hunger - DECAY.hunger * mins),
            happy:  clamp(prev.stats.happy  - DECAY.happy  * mins),
            energy: clamp(prev.stats.energy - DECAY.energy * mins),
            clean:  clamp(prev.stats.clean  - DECAY.clean  * mins),
          },
        };
      });
    };
    applyDecay();
    const iv = setInterval(applyDecay, 5000);
    return () => clearInterval(iv);
  }, [pet?.base]);

  // Keep the walk-freeze flag in sync (no rAF restart).
  // Buddy stops to react during any action pose / evolving / editing.
  useEffect(() => {
    blockWalkRef.current = evolving || editingRoom || actionPose !== null;
  }, [evolving, editingRoom, actionPose]);

  // Keep the uid counter ahead of any saved instance (avoids key collisions)
  useEffect(() => {
    const ids = (pet?.room?.placed ?? []).map(p => p.uid);
    placedUidRef.current = Math.max(1000, ...ids, placedUidRef.current);
  }, [pet?.base]);

  // Sync coins / food / quests when they change anywhere
  useEffect(() => {
    const refreshCoins = () => setCoins(readCoins());
    const refreshFood = () => setFood(readFood());
    const refreshQuests = () => setQuestState(readQuests());
    refreshCoins(); refreshFood(); refreshQuests();
    window.addEventListener(COIN_EVENT, refreshCoins);
    window.addEventListener(FOOD_EVENT, refreshFood);
    window.addEventListener(QUEST_EVENT, refreshQuests);
    return () => {
      window.removeEventListener(COIN_EVENT, refreshCoins);
      window.removeEventListener(FOOD_EVENT, refreshFood);
      window.removeEventListener(QUEST_EVENT, refreshQuests);
    };
  }, []);

  // ─── Drag-to-place furniture (pointer move/up while dragging) ───
  const dragPosRef = useRef(null);
  useEffect(() => {
    if (!drag) return;
    const stage = stageRef.current;
    if (!stage) return;
    const onMove = (e) => {
      const rect = stage.getBoundingClientRect();
      const xPct = Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100));
      const yPct = Math.max(22, Math.min(92, ((e.clientY - rect.top) / rect.height) * 100));
      dragPosRef.current = { uid: dragUidRef.current, xPct, yPct };
      setDrag(d => d && ({ ...d, xPct, yPct }));
    };
    const onUp = () => {
      const p = dragPosRef.current;
      if (p) moveItem(p.uid, p.xPct, p.yPct);
      dragUidRef.current = null;
      dragPosRef.current = null;
      setDrag(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [drag?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Room walking engine (buddy strolls around the room) ───
  useEffect(() => {
    if (!pet) return;
    const stage = stageRef.current;
    if (!stage) return;
    const BW = 196; // buddy box width
    let raf = 0, lastTs = 0, switchAt = 0;
    // start roughly centred
    xRef.current = Math.max(8, (stage.clientWidth - BW) / 2);

    const loop = (ts) => {
      if (!lastTs) lastTs = ts;
      const dt = Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;
      const maxX = Math.max(8, stage.clientWidth - BW - 8);

      if (!blockWalkRef.current) {
        if (ts >= switchAt) {
          if (walkModeRef.current === "walk") {
            walkModeRef.current = "idle";
            setIsWalking(false);
            switchAt = ts + 900 + Math.random() * 2200;
          } else {
            walkModeRef.current = "walk";
            setIsWalking(true);
            if (Math.random() < 0.5) { dirRef.current *= -1; setFacing(dirRef.current < 0); }
            switchAt = ts + 2200 + Math.random() * 3200;
          }
        }
        if (walkModeRef.current === "walk") {
          let x = xRef.current + dirRef.current * 24 * dt;
          if (x <= 8) { x = 8; dirRef.current = 1; setFacing(false); }
          else if (x >= maxX) { x = maxX; dirRef.current = -1; setFacing(true); }
          xRef.current = x;
        }
      } else if (walkModeRef.current === "walk") {
        walkModeRef.current = "idle";
        setIsWalking(false);
      }
      if (walkerRef.current) walkerRef.current.style.transform = `translateX(${xRef.current}px)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [pet?.base]);

  // ─── Adopt a buddy (and send it out roaming right away) ───
  const adopt = (entry) => {
    const now = Date.now();
    setPet({
      base: entry.base,
      en: entry.en,
      bornAt: now,
      lastTick: now,
      stats: { hunger: 80, happy: 85, energy: 90, clean: 90 },
      level: 1,
      exp: 0,
      stage: 0,
      bond: 0,
      room: { ...DEFAULT_ROOM },
    });
    setRoaming(true); // pops out onto the page immediately after choosing
    playBuddyCry(entry.base); // greet with its cry
    fireAch("adopt");
    try { if (localStorage.getItem("pkdx_pet_onboarded") !== "1") setShowIntro(true); } catch {}
  };

  // ─── Room editor helpers ───
  const room = pet?.room ?? DEFAULT_ROOM;
  const placed = room.placed ?? [];
  const setTheme = (id) =>
    setPet(prev => prev && ({ ...prev, room: { ...(prev.room ?? DEFAULT_ROOM), theme: id } }));
  // Add a fresh instance (you can place as many as you like)
  const addItem = (id) =>
    setPet(prev => {
      if (!prev) return prev;
      const r = prev.room ?? DEFAULT_ROOM;
      const uid = ++placedUidRef.current;
      return { ...prev, room: { ...r, placed: [...(r.placed ?? []), { uid, id, xPct: 50, yPct: 66, scale: 1 }] } };
    });
  // Grow / shrink a placed instance (0.5×–2.4×)
  const resizeItem = (uid, delta) =>
    setPet(prev => {
      if (!prev) return prev;
      const r = prev.room ?? DEFAULT_ROOM;
      return { ...prev, room: { ...r, placed: (r.placed ?? []).map(p =>
        p.uid === uid ? { ...p, scale: Math.max(0.5, Math.min(2.4, Math.round(((p.scale ?? 1) + delta) * 10) / 10)) } : p) } };
    });
  const removeItem = (uid) =>
    setPet(prev => {
      if (!prev) return prev;
      const r = prev.room ?? DEFAULT_ROOM;
      return { ...prev, room: { ...r, placed: (r.placed ?? []).filter(p => p.uid !== uid) } };
    });
  const moveItem = (uid, xPct, yPct) =>
    setPet(prev => {
      if (!prev) return prev;
      const r = prev.room ?? DEFAULT_ROOM;
      return { ...prev, room: { ...r, placed: (r.placed ?? []).map(p => p.uid === uid ? { ...p, xPct, yPct } : p) } };
    });

  const spawnParticles = (Icon, count = 6) => {
    const batch = Array.from({ length: count }).map(() => {
      const id = partIdRef.current++;
      return {
        id, Icon,
        x: 35 + Math.random() * 30,
        dx: (Math.random() - 0.5) * 80,
        delay: Math.random() * 0.25,
      };
    });
    setParticles(p => [...p, ...batch]);
    setTimeout(() => {
      setParticles(p => p.filter(x => !batch.find(b => b.id === x.id)));
    }, 1500);
  };

  const pose = (name, ms = 700) => {
    clearTimeout(poseTimer.current);
    setActionPose(name);
    poseTimer.current = setTimeout(() => setActionPose(null), ms);
  };

  const sfx = useCallback((kind) => { if (sfxOn) petSfx(kind); }, [sfxOn]);

  // Unlock an achievement and show a toast if it's new
  const fireAch = useCallback((id) => {
    const def = unlockAchievement(id);
    if (def) {
      setAchState(readAchievements());
      setAchToast(def);
      setTimeout(() => setAchToast(t => (t === def ? null : t)), 3200);
    }
  }, []);

  // ─── Care core (shared by all care actions) ───
  const applyCare = (a) => {
    if (!pet || evolving || evoChoosing) return;
    const chain = ROSTER_BY_BASE[pet.base]?.chain ?? [pet.base];
    const pers = personalityOf(pet.base);
    const liked = a.kind && a.kind === pers.likes;
    const disliked = a.kind && a.kind === pers.dislikes;

    const stats = { ...pet.stats };
    for (const k in a.d) {
      let delta = a.d[k];
      if (k === "happy" && delta > 0) {
        if (liked) delta = Math.round(delta * 1.5);
        else if (disliked) delta = Math.round(delta * 0.5);
      }
      stats[k] = clamp(stats[k] + delta);
    }

    // Bond: petting builds it most; a favourite action adds extra, a disliked one barely
    let bondGain = a.kind === "pat" ? 6 : 3;
    if (liked) bondGain += 4;
    if (disliked) bondGain = 1;
    const bond = clamp((pet.bond ?? 0) + bondGain);

    let level = pet.level, exp = pet.exp + a.exp, stage = pet.stage, leveled = false;
    while (exp >= expForNext(level)) { exp -= expForNext(level); level += 1; leveled = true; }
    let newStage = stageForLevel(chain, level);
    // Eevee branches — hold the evolution and let the player pick its path
    const wantsEeveeChoice = pet.base === 133 && newStage > stage && !pet.evoChoice;
    if (wantsEeveeChoice) { newStage = stage; setEvoChoosing(true); }
    const evolved = newStage > stage;
    stage = newStage;

    spawnParticles(liked ? Heart : a.Icon, liked ? 8 : (a.count ?? 6));
    pose(a.pose, a.ms);
    if (a.cry || liked) playBuddyCry(buddySpriteId(pet));
    sfx(liked ? "love" : a.kind);

    if (liked) { awardCoins(2); setCoins(readCoins()); }

    if (evolved) { setEvolving(true); setTimeout(() => setEvolving(false), 2600); }
    else if (leveled) { setLevelFlash(true); setTimeout(() => setLevelFlash(false), 1200); }

    setPet(prev => prev && ({ ...prev, stats, level, exp, stage, bond, lastTick: Date.now() }));

    // ── lifetime counters + achievements ──
    if (a.kind === "feed") { const l = bumpLife("feeds"); if (l.feeds >= 25) fireAch("feed25"); }
    else if (a.kind === "pat") bumpLife("pats");
    else if (a.kind === "play") bumpLife("plays");
    if (evolved) { bumpLife("evolves"); fireAch("evolve"); if (newStage >= chain.length - 1) fireAch("final"); }
    if (level >= 10) fireAch("lv10");
    if (bond >= 100) fireAch("bond");
    setLifeMax("maxBond", bond);
  };

  // Eevee evolution chosen by the player
  const chooseEevee = (id) => {
    setEvoChoosing(false);
    setEvolving(true);
    sfx("evolve");
    setPet(prev => prev && ({ ...prev, evoChoice: id, stage: Math.max(1, prev.stage) }));
    setTimeout(() => { setEvolving(false); playBuddyCry(id); }, 2600);
    bumpLife("evolves"); fireAch("evolve"); fireAch("final");
  };

  // Non-food actions
  const doAction = (kind) => {
    const TABLE = {
      play: { d: { happy: +25, energy: -12 }, exp: 18, Icon: Gamepad2, pose: "bounce", ms: 700 },
      rest: { d: { energy: +35, hunger: -6 }, exp: 8,  Icon: Moon,     pose: "sleep",  ms: 1400 },
      bath: { d: { clean: +42 },              exp: 10, Icon: Droplets, pose: "bounce", ms: 700 },
      pat:  { d: { happy: +12 },              exp: 6,  Icon: Heart,     pose: "wiggle", ms: 700, cry: true, count: 4 },
    };
    if (TABLE[kind]) applyCare({ ...TABLE[kind], kind });
  };

  // Feed using a food item from the inventory (different tiers = different hunger)
  const feedWith = (tierKey) => {
    if (!pet || evolving) return;
    const restored = consumeFood(tierKey); // also updates inventory + fires event
    if (restored <= 0) return;
    applyCare({ d: { hunger: +restored }, exp: Math.round(8 + restored / 4), Icon: Utensils, pose: "bounce", ms: 700, kind: "feed" });
    setShowFood(false);
  };

  const releaseBuddy = () => {
    if (pet) {
      const spriteId = buddySpriteId(pet);
      const days = Math.max(0, Math.floor((Date.now() - pet.bornAt) / 86400000));
      addToHall({
        base: pet.base, spriteId, en: ROSTER_BY_BASE[pet.base]?.en ?? pet.en,
        level: pet.level, stage: pet.stage, bond: pet.bond ?? 0, days, bornAt: pet.bornAt,
      });
      const h = readHall();
      setHall(h);
      if (h.length >= 3) fireAch("collect3");
    }
    try { localStorage.removeItem(SAVE_KEY); } catch {}
    setRoaming(false);
    setPet(null);
  };

  // ═══ Adoption screen ═══
  if (!pet) {
    return (
      <div className="pet-overlay">
        <style>{PET_CSS}</style>
        <div className="pet-adopt">
          <button className="pet-close" onClick={onClose}><X size={15} strokeWidth={2.4} /></button>
          <div className="pet-adopt-head">
            <div className="pet-adopt-title" style={{ display: "inline-flex", alignItems: "center", gap: 9, justifyContent: "center" }}>
              <Egg size={24} strokeWidth={2} /> {t("เลือกเพื่อนซี้ของคุณ", "Choose Your Buddy", "バディを選ぼう")}
            </div>
            <div className="pet-adopt-sub">
              {t("เลี้ยงดูให้โต แล้ววิวัฒนาการไปด้วยกัน!",
                 "Raise it with love and evolve together!",
                 "愛情を込めて育てて一緒に進化しよう！")}
            </div>
          </div>
          <div className="pet-adopt-grid">
            {ROSTER.map(entry => (
              <button key={entry.base} className="pet-adopt-card" onClick={() => adopt(entry)}>
                <span className={`pet-gen-badge${entry.gen === "★" ? " star" : ""}`}>
                  {entry.gen === "★" ? <Star size={10} strokeWidth={2.6} fill="currentColor" /> : `G${entry.gen}`}
                </span>
                <div className="pet-adopt-sprite">
                  <PetSprite id={entry.base} size={84} />
                </div>
                <div className="pet-adopt-name">{localName(entry.base, entry.en)}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ═══ Care screen ═══
  const chain = ROSTER_BY_BASE[pet.base]?.chain ?? [pet.base];
  const curId = buddySpriteId(pet);
  const nextEvoLevel = (() => {
    const thr = evoThresholds(chain.length);
    return thr[pet.stage] ?? null; // next threshold or null if final
  })();

  const stats = pet.stats;
  const wellbeing = Math.round((stats.hunger + stats.happy + stats.energy + stats.clean) / 4);

  // Mood derivation
  const mood = (() => {
    if (stats.energy < 20) return { key: "sleepy", Icon: Moon, color: "#900603",
      msg: t("ง่วงแล้ว... พักหน่อยนะ", "So sleepy... let me rest", "眠いよ…休ませて") };
    if (stats.hunger < 20) return { key: "hungry", Icon: Utensils, color: "#fb923c",
      msg: t("หิวจังเลย ขออาหารหน่อย!", "I'm hungry! Feed me please", "おなかすいた！ごはんちょうだい") };
    if (stats.clean < 20)  return { key: "dirty", Icon: Droplets, color: "#be3a34",
      msg: t("ตัวเลอะแล้ว อยากอาบน้ำ~", "I'm dirty... bath time?", "よごれちゃった…おふろ入りたい") };
    if (stats.happy < 25)  return { key: "sad", Icon: Frown, color: "#94a3b8",
      msg: t("เหงาจัง มาเล่นด้วยกันมั้ย", "I'm lonely... play with me?", "さみしいよ…遊んで") };
    if (wellbeing > 75)    return { key: "love", Icon: Heart, color: "#f472b6",
      msg: t("รักนะ! มีความสุขมากเลย", "I love you! So happy~", "だいすき！しあわせ～") };
    return { key: "happy", Icon: Smile, color: "#34d399",
      msg: t("สบายดี เล่นกันเถอะ!", "Feeling great! Let's play", "げんき！あそぼう") };
  })();

  const ageDays = Math.max(0, Math.floor((now - pet.bornAt) / 86400000));
  const ageHours = Math.max(0, Math.floor((now - pet.bornAt) / 3600000));

  const STAT_ROWS = [
    { key: "hunger", Icon: Drumstick, label: t("ความอิ่ม","Hunger","まんぷく"),  color: "#fb923c", val: stats.hunger },
    { key: "happy",  Icon: Heart,     label: t("ความสุข","Happiness","しあわせ"), color: "#f472b6", val: stats.happy },
    { key: "energy", Icon: Zap,       label: t("พลังงาน","Energy","げんき"),    color: "#fbbf24", val: stats.energy },
    { key: "clean",  Icon: Bath,      label: t("ความสะอาด","Clean","きれい"),   color: "#be3a34", val: stats.clean },
  ];

  const ACTIONS = [
    { kind: "feed", Icon: Utensils, label: t("ให้อาหาร","Feed","ごはん"),  color: "#fb923c" },
    { kind: "play", Icon: Gamepad2, label: t("เล่น","Play","あそぶ"),      color: "#34d399" },
    { kind: "bath", Icon: Droplets, label: t("อาบน้ำ","Bath","おふろ"),     color: "#5aa9d6" },
    { kind: "rest", Icon: Moon,     label: t("พักผ่อน","Rest","ねる"),      color: "#9c7bd6" },
    { kind: "pat",  Icon: Heart,    label: t("ลูบหัว","Pet","なでる"),     color: "#e0364a" },
  ];

  const pers = personalityOf(pet.base);
  const bond = pet.bond ?? 0;
  const tier = bondTier(bond);
  const LikeIcon = ACTION_ICON[pers.likes] ?? Heart;
  const streakBonusReady = streakBonusAvailable();
  const achCount = Object.keys(achState).length;

  return (
    <div className="pet-overlay">
      <style>{PET_CSS}</style>

      <div className={`pet-room${editingRoom ? " editing" : ""}`}>
        {/* Top bar */}
        <div className="pet-topbar">
          <button className="pet-icon-btn" onClick={onClose} title={t("ปิด","Close","閉じる")}><X size={15} strokeWidth={2.4} /></button>
          <div className="pet-name-pill">
            <span style={{ fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {localName(curId, ROSTER_BY_BASE[pet.base]?.en)}
            </span>
            <span className="pet-lvl">Lv.{pet.level}</span>
          </div>
          <div className="pet-coins" title={t("เหรียญ","Coins","コイン")} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Coins size={14} strokeWidth={2.2} /> {coins}</div>
          <button className="pet-icon-btn" onClick={() => setShowSettings(true)} title={t("ตั้งค่า","Settings","設定")}>
            <Settings size={15} strokeWidth={2.4} />
          </button>
        </div>

        {/* Quick access launcher */}
        {!editingRoom && (
          <div className="pet-hub-row">
            <button className="pet-hub-btn" onClick={() => setShowQuests(true)}>
              <ClipboardList size={19} strokeWidth={2.1} />
              <span>{t("ภารกิจ","Missions","ミッション")}</span>
              {(claimableCount() + (streakBonusReady ? 1 : 0)) > 0 && <span className="pet-hub-badge">{claimableCount() + (streakBonusReady ? 1 : 0)}</span>}
            </button>
            <button className="pet-hub-btn" onClick={() => setShowGame(true)}>
              <Gamepad2 size={19} strokeWidth={2.1} />
              <span>{t("มินิเกม","Mini-game","ミニゲーム")}</span>
            </button>
            <button className="pet-hub-btn" onClick={() => setShowShop(true)}>
              <ShoppingBag size={19} strokeWidth={2.1} />
              <span>{t("ร้านค้า","Shop","ショップ")}</span>
            </button>
            <button className="pet-hub-btn" onClick={() => setShowAch(true)}>
              <Trophy size={19} strokeWidth={2.1} />
              <span>{t("รางวัล","Awards","じっせき")}</span>
            </button>
            <button className="pet-hub-btn" onClick={() => setShowHall(true)}>
              <Award size={19} strokeWidth={2.1} />
              <span>{t("คอลเลกชัน","Collection","コレクション")}</span>
            </button>
            <button className="pet-hub-btn accent" onClick={shareCard} disabled={sharing}>
              <Share2 size={19} strokeWidth={2.1} />
              <span>{sharing ? t("กำลังสร้าง…","Creating…","作成中…") : t("อวดน้อง","Share","シェア")}</span>
            </button>
          </div>
        )}

        {/* Wellbeing + age */}
        {!editingRoom && (
        <div className="pet-meta-row">
          <div className="pet-care-meter" title={t("สุขภาพรวม","Overall wellbeing","総合コンディション")}>
            <span style={{ display: "inline-flex", color: wellbeing > 75 ? "#34d399" : wellbeing > 40 ? "#fbbf24" : "#fb7185" }}>
              {wellbeing > 40 ? <Heart size={15} strokeWidth={2.4} fill="currentColor" /> : <HeartCrack size={15} strokeWidth={2.4} />}
            </span>
            <div className="pet-care-track">
              <div className="pet-care-fill" style={{
                width: `${wellbeing}%`,
                background: wellbeing > 75 ? "linear-gradient(90deg,#34d399,#10b981)"
                  : wellbeing > 40 ? "linear-gradient(90deg,#fbbf24,#f59e0b)"
                  : "linear-gradient(90deg,#fb7185,#ef4444)",
              }} />
            </div>
            <span className="pet-care-pct">{wellbeing}%</span>
          </div>
          <div className="pet-trait" title={`${t("ชอบ","Loves","好き")}: ${ACTION_LABEL(pers.likes, lang)}`}>
            <LikeIcon size={12} strokeWidth={2.2} /> {lang === "th" ? pers.th : pers.en}
          </div>
          <div className="pet-age" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <Hourglass size={12} strokeWidth={2.2} /> {ageDays >= 1 ? `${ageDays} ${t("วัน","d","日")}` : `${ageHours} ${t("ชม.","h","時")}`}
          </div>
        </div>
        )}

        {/* Stage / room */}
        <div className={`pet-stage${editingRoom ? " editing" : ""}`} ref={stageRef}>
          {(() => {
            const th = THEME_BY_ID[room.theme] ?? ROOM_THEMES[0];
            return (
              <>
                <div className="room-wall" style={{ background: th.wall }}>
                  {th.wallPat && <div className="room-pat"
                    style={{ backgroundImage: th.wallPat, backgroundSize: th.wallPatSize || "auto" }} />}
                  <div className="room-crown" />
                  <WindowView view={th.view} />
                  {th.wainscot && <div className="room-wainscot" style={{ background: th.wainscot }} />}
                </div>
                <div className="room-floor" style={{ background: th.floor }}>
                  {th.floorPat && <div className="room-pat"
                    style={{ backgroundImage: th.floorPat, backgroundSize: th.floorPatSize || "auto" }} />}
                  <div className="room-floor-back" />
                </div>
                <div className="room-baseboard" />
                <RoomAmbient tokens={th.ambient} />
                <div className="room-vignette" />
              </>
            );
          })()}

          {/* Placed furniture — drag to move (in edit mode), unlimited copies */}
          {placed.map(inst => {
            const f = FURNITURE_BY_ID[inst.id];
            if (!f) return null;
            const pos = (drag && drag.uid === inst.uid) ? drag : inst;
            return (
              <div key={inst.uid}
                className={`pet-placed${editingRoom ? " editing" : ""}${drag?.uid === inst.uid ? " grabbing" : ""}`}
                style={{
                  left: `${pos.xPct}%`, top: `${pos.yPct}%`,
                  // furniture rests behind the buddy; the piece being dragged pops up briefly
                  zIndex: drag?.uid === inst.uid ? 9 : 2,
                }}
                onPointerDown={editingRoom ? (e) => {
                  e.preventDefault();
                  dragUidRef.current = inst.uid;
                  dragPosRef.current = { uid: inst.uid, xPct: inst.xPct, yPct: inst.yPct };
                  setDrag({ uid: inst.uid, xPct: inst.xPct, yPct: inst.yPct });
                } : undefined}>
                <PixelArt rows={f.rows} scale={f.scale * (inst.scale ?? 1)} />
                {editingRoom && (
                  <div className="pet-placed-ctrls">
                    <button className="pet-placed-btn" onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => resizeItem(inst.uid, -0.2)}>−</button>
                    <button className="pet-placed-btn" onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => resizeItem(inst.uid, 0.2)}>+</button>
                    <button className="pet-placed-btn del" onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => removeItem(inst.uid)}><X size={15} strokeWidth={2.4} /></button>
                  </div>
                )}
              </div>
            );
          })}

          {/* My-room button — clearly labelled, draws attention */}
          {!evolving && !editingRoom && (
            <button className="pet-edit-room" onClick={() => setEditingRoom(true)}>
              <Sofa size={14} strokeWidth={2.2} /> {t("ห้องของฉัน","My Room","マイルーム")}
            </button>
          )}

          {/* Edit-mode hint */}
          {editingRoom && (
            <div className="pet-edit-hint" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Hand size={12} strokeWidth={2.2} /> {t("ลากย้าย · −/+ ย่อขยาย · ✕ ลบ","Drag · −/+ resize · ✕ remove","ドラッグ · −/+ 拡縮 · ✕ 削除")}
            </div>
          )}

          {/* Mood bubble — icon only (pets don't talk; they cry/emote) */}
          {!evolving && !editingRoom && (
            <div className="pet-bubble pet-bubble-emoji" style={{ borderColor: mood.color, color: mood.color }}>
              <mood.Icon size={20} strokeWidth={2.2} fill={mood.key === "love" ? "currentColor" : "none"} />
            </div>
          )}

          {/* Particles */}
          {particles.map(p => (
            <span key={p.id} className="pet-particle" style={{
              left: `${p.x}%`,
              "--dx": `${p.dx}px`,
              animationDelay: `${p.delay}s`,
            }}><p.Icon size={22} strokeWidth={2.2} /></span>
          ))}

          {/* Evolution flash */}
          {evolving && <div className="pet-evo-flash" />}
          {evolving && (
            <div className="pet-evo-text" style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
              <Sparkles size={16} strokeWidth={2.2} /> {t("กำลังวิวัฒนาการ!","Evolving!","しんかちゅう！")} <Sparkles size={16} strokeWidth={2.2} />
            </div>
          )}

          {/* Level-up badge */}
          {levelFlash && !evolving && (
            <div className="pet-levelup" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><ArrowUp size={16} strokeWidth={2.6} /> LEVEL UP!</div>
          )}

          {/* The buddy — walks around inside the room */}
          <div className="pet-walker" ref={walkerRef}>
            <div className={`pet-buddy pose-${actionPose ?? (isWalking ? "walk" : "idle")}${evolving ? " evolving" : ""}`}>
              <PetSprite key={curId} id={curId} size={196} flip={facing} />
              <div className="pet-shadow" />
            </div>
          </div>
        </div>

        {!editingRoom && (<>
        {/* Stat bars */}
        <div className="pet-stats">
          {STAT_ROWS.map(s => (
            <div key={s.key} className="pet-stat-row">
              <span className="pet-stat-icon" style={{ color: s.color }}><s.Icon size={16} strokeWidth={2.2} /></span>
              <div className="pet-stat-track">
                <div className="pet-stat-fill" style={{
                  width: `${s.val}%`,
                  background: s.val < 20
                    ? "repeating-linear-gradient(45deg,#ef4444,#ef4444 6px,#dc2626 6px,#dc2626 12px)"
                    : s.color,
                }} />
              </div>
              <span className="pet-stat-val" style={{ color: s.val < 20 ? "#ef4444" : undefined }}>
                {Math.round(s.val)}
              </span>
            </div>
          ))}
        </div>

        {/* Bond / friendship */}
        <div className="pet-bond-wrap">
          <div className="pet-bond-head">
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <Heart size={12} strokeWidth={2.4} fill="currentColor" /> {lang === "th" ? tier.th : tier.en}
            </span>
            <span>{bond}%</span>
          </div>
          <div className="pet-bond-track">
            <div className="pet-bond-fill" style={{ width: `${bond}%` }} />
          </div>
        </div>

        {/* EXP / evolution progress */}
        <div className="pet-exp-wrap">
          <div className="pet-exp-track">
            <div className="pet-exp-fill" style={{ width: `${(pet.exp / expForNext(pet.level)) * 100}%` }} />
          </div>
          <div className="pet-exp-label" style={{ display: "inline-flex", alignItems: "center", gap: 5, justifyContent: "center", width: "100%" }}>
            <Star size={12} strokeWidth={2.2} fill="currentColor" /> EXP {pet.exp}/{expForNext(pet.level)}
            {nextEvoLevel
              ? ` · ${t("วิวัฒน์ที่ Lv.","Evolves at Lv.","しんか Lv.")}${nextEvoLevel}`
              : ` · ${t("ร่างสุดท้ายแล้ว!","Final form!","さいしゅうけいたい！")}`}
          </div>
        </div>

        {/* Action buttons */}
        <div className="pet-actions">
          {ACTIONS.map(a => (
            <button key={a.kind} className="pet-action-btn"
              onClick={() => a.kind === "feed" ? setShowFood(true) : doAction(a.kind)}
              disabled={evolving}
              style={{ "--ac": a.color }}>
              <span className="pet-action-icon"><a.Icon size={22} strokeWidth={2.2} /></span>
              <span className="pet-action-label">{a.label}</span>
              {a.kind === "feed" && (
                <span className={`pet-food-badge${totalFood(food) === 0 ? " empty" : ""}`}>
                  {totalFood(food)}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Roam toggle — send the buddy out to walk on other pages */}
        <button className={`pet-roam-toggle${roaming ? " on" : ""}`}
          onClick={() => setRoaming(r => !r)}
          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
          {roaming
            ? <><Home size={15} strokeWidth={2.2} /> {t("เรียกน้องกลับบ้าน","Call buddy home","おうちに呼ぶ")}</>
            : <><Footprints size={15} strokeWidth={2.2} /> {t("ส่งน้องไปเดินเล่นหน้าอื่น","Let buddy roam the app","アプリで散歩させる")}</>}
        </button>
        </>)}

        {/* ─── Room editor palette (theme + furniture) ─── */}
        {editingRoom && (
          <div className="pet-palette">
            <div className="pet-editor-head">
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Sofa size={18} strokeWidth={2.2} /> {t("ห้องของฉัน","My Room","マイルーム")}</span>
              <button className="pet-editor-done" onClick={() => setEditingRoom(false)}
                style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <Check size={14} strokeWidth={2.6} /> {t("เสร็จ","Done","完了")}
              </button>
            </div>

            <div className="pet-editor-label">{t("เลือกห้อง","Room","ルーム")}</div>
            <div className="pet-theme-row">
              {ROOM_THEMES.map(th => (
                <button key={th.id}
                  className={`pet-theme-chip${room.theme === th.id ? " active" : ""}`}
                  onClick={() => setTheme(th.id)}>
                  <RoomThumb theme={th} />
                  <span>{lang === "th" ? th.th : th.en}</span>
                </button>
              ))}
            </div>

            <div className="pet-editor-label">
              {t("เฟอร์นิเจอร์ · แตะเพื่อเพิ่ม","Furniture · tap to add","かぐ · タップで追加")}
            </div>
            {/* Category tabs (Sims-style build menu) */}
            <div className="pet-cat-tabs">
              {FURNITURE_CATS.map(c => (
                <button key={c.id}
                  className={`pet-cat-tab${editCat === c.id ? " active" : ""}`}
                  onClick={() => setEditCat(c.id)}>
                  {lang === "th" ? c.th : c.en}
                </button>
              ))}
            </div>
            <div className="pet-decor-grid">
              {FURNITURE.filter(f => f.cat === editCat).map(f => (
                <button key={f.id} className="pet-decor-chip" onClick={() => addItem(f.id)}>
                  <div className="pet-decor-chip-art">
                    <PixelArt rows={f.rows} scale={3} />
                  </div>
                  <span>{lang === "th" ? f.th : f.en}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ─── Feed picker (use food from your bag) ─── */}
        {showFood && (
          <div className="pet-sheet-overlay" onClick={() => setShowFood(false)}>
            <div className="pet-sheet" onClick={e => e.stopPropagation()}>
              <div className="pet-editor-head">
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Utensils size={16} strokeWidth={2.2} /> {t("ให้อาหาร","Feed","ごはん")}</span>
                <button className="pet-sheet-x" onClick={() => setShowFood(false)}><X size={15} strokeWidth={2.4} /></button>
              </div>
              {totalFood(food) === 0 ? (
                <div className="pet-empty-msg">
                  {t("ไม่มีอาหารเลย! ทำภารกิจรับเหรียญแล้วไปซื้อที่ร้าน",
                     "No food! Do missions for coins, then buy some at the shop",
                     "食べ物がない！ミッションでコインを集めてショップで購入")}
                  <button className="pet-shop-link" onClick={() => { setShowFood(false); setShowShop(true); }}
                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <ShoppingBag size={14} strokeWidth={2.3} /> {t("ไปร้านค้า","Open Shop","ショップへ")}
                  </button>
                </div>
              ) : (
                <div className="pet-food-list">
                  {FOOD.map(fd => (
                    <button key={fd.key} className="pet-food-item"
                      disabled={(food[fd.key] || 0) <= 0}
                      onClick={() => feedWith(fd.key)}>
                      <img src={ITEM_SPRITE(fd.slug)} alt="" className="pet-food-img" />
                      <div className="pet-food-info">
                        <span className="pet-food-name">{lang === "th" ? fd.th : fd.en}</span>
                        <span className="pet-food-sub" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Drumstick size={11} strokeWidth={2.2} /> +{fd.hunger}</span>
                      </div>
                      <span className="pet-food-count">×{food[fd.key] || 0}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Food shop (spend coins) ─── */}
        {showShop && (
          <div className="pet-sheet-overlay" onClick={() => setShowShop(false)}>
            <div className="pet-sheet" onClick={e => e.stopPropagation()}>
              <div className="pet-editor-head">
                <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><ShoppingBag size={16} strokeWidth={2.3} /> {t("ร้านอาหาร","Food Shop","ショップ")}</span>
                <span className="pet-coins" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Coins size={14} strokeWidth={2.2} /> {coins}</span>
                <button className="pet-sheet-x" onClick={() => setShowShop(false)}><X size={15} strokeWidth={2.4} /></button>
              </div>
              <div className="pet-food-list">
                {FOOD.map(fd => (
                  <div key={fd.key} className="pet-food-item shop">
                    <img src={ITEM_SPRITE(fd.slug)} alt="" className="pet-food-img" />
                    <div className="pet-food-info">
                      <span className="pet-food-name">{lang === "th" ? fd.th : fd.en}</span>
                      <span className="pet-food-sub" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Drumstick size={11} strokeWidth={2.2} /> +{fd.hunger} · {t("มี","own","所持")} ×{food[fd.key] || 0}</span>
                    </div>
                    <button className="pet-buy-btn" disabled={coins < fd.price}
                      onClick={() => buyFood(fd.key)} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                      <Coins size={13} strokeWidth={2.3} /> {fd.price}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── Missions (earn coins) ─── */}
        {showQuests && (
          <div className="pet-sheet-overlay" onClick={() => setShowQuests(false)}>
            <div className="pet-sheet" onClick={e => e.stopPropagation()}>
              <div className="pet-editor-head">
                <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><ClipboardList size={16} strokeWidth={2.3} /> {t("ภารกิจวันนี้","Daily Missions","デイリー")}</span>
                <span className="pet-coins" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Coins size={14} strokeWidth={2.2} /> {coins}</span>
                <button className="pet-sheet-x" onClick={() => setShowQuests(false)}><X size={15} strokeWidth={2.4} /></button>
              </div>
              {/* Daily streak bonus */}
              <div className="pet-streak-card">
                <div className="pet-streak-flame"><Flame size={20} strokeWidth={2.2} /></div>
                <div className="pet-streak-info">
                  <span className="pet-streak-title">{t(`สตรีค ${streak.count} วัน`, `${streak.count}-Day Streak`, `${streak.count}日連続`)}</span>
                  <span className="pet-streak-sub">{t("เข้ามาดูแลทุกวันรับโบนัสเพิ่ม","Care daily for a bigger bonus","毎日お世話でボーナス増加")}</span>
                </div>
                <button className="pet-streak-btn" disabled={!streakBonusReady} onClick={claimStreak}>
                  {streakBonusReady
                    ? <><Coins size={13} strokeWidth={2.3} /> +{streakBonusAmount(streak.count)}</>
                    : t("รับแล้ว","Claimed","受取済")}
                </button>
              </div>
              <div className="pet-quest-list">
                {QUESTS.map(q => {
                  const prog = questProgress(q, questState);
                  const done = prog >= q.goal;
                  const claimed = questState.claimed?.[q.id];
                  const canClaim = isClaimable(q, questState);
                  return (
                    <div key={q.id} className={`pet-quest${claimed ? " claimed" : ""}`}>
                      <div className="pet-quest-main">
                        <div className="pet-quest-name" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          {claimed
                            ? <CheckCircle2 size={14} strokeWidth={2.4} style={{ color: "#34d399", flexShrink: 0 }} />
                            : done
                            ? <Gift size={14} strokeWidth={2.2} style={{ color: "var(--p-gold)", flexShrink: 0 }} />
                            : null}
                          {lang === "th" ? q.th : q.en}
                        </div>
                        <div className="pet-quest-bar">
                          <div className="pet-quest-fill" style={{ width: `${(prog / q.goal) * 100}%` }} />
                        </div>
                        <div className="pet-quest-prog">{Math.min(prog, q.goal)}/{q.goal}</div>
                      </div>
                      <button className="pet-claim-btn" disabled={!canClaim}
                        onClick={() => claimQuest(q.id)} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                        {claimed ? t("รับแล้ว","Done","完了") : <><Coins size={13} strokeWidth={2.3} /> {q.coins}</>}
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="pet-quest-hint" style={{ display: "flex", alignItems: "flex-start", gap: 7 }}>
                <Lightbulb size={14} strokeWidth={2.2} style={{ flexShrink: 0, marginTop: 1, color: "var(--p-gold)" }} />
                <span>{t("ดูโปเกมอนในเว็บเพื่อสะสมภารกิจ — ยิ่งดูเยอะยิ่งจำหน้าได้!",
                      "View Pokémon around the app to progress — learn their faces!",
                      "アプリでポケモンを見てミッションを進めよう！")}</span>
              </div>
            </div>
          </div>
        )}

        {/* ─── Berry Catch mini-game ─── */}
        {showGame && (
          <BerryCatchGame lang={lang} onClose={() => setShowGame(false)} onFinish={handleGameFinish} />
        )}

        {/* ─── Achievements ─── */}
        {showAch && (
          <div className="pet-sheet-overlay" onClick={() => setShowAch(false)}>
            <div className="pet-sheet" onClick={e => e.stopPropagation()}>
              <div className="pet-editor-head">
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Trophy size={16} strokeWidth={2.2} /> {t("รางวัล","Awards","じっせき")}</span>
                <span className="pet-coins">{achCount}/{ACHIEVEMENTS.length}</span>
                <button className="pet-sheet-x" onClick={() => setShowAch(false)}><X size={15} strokeWidth={2.4} /></button>
              </div>
              <div className="pet-ach-grid">
                {ACHIEVEMENTS.map(a => {
                  const unlocked = !!achState[a.id];
                  const Ic = ACH_ICONS[a.icon] ?? Trophy;
                  return (
                    <div key={a.id} className={`pet-ach${unlocked ? " on" : ""}`}>
                      <div className="pet-ach-icon">{unlocked ? <Ic size={22} strokeWidth={2.1} /> : <Lock size={18} strokeWidth={2.2} />}</div>
                      <div className="pet-ach-name">{lang === "th" ? a.th : a.en}</div>
                      <div className="pet-ach-desc">{lang === "th" ? a.desc_th : a.desc_en}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ─── Hall of Fame ─── */}
        {showHall && (
          <div className="pet-sheet-overlay" onClick={() => setShowHall(false)}>
            <div className="pet-sheet" onClick={e => e.stopPropagation()}>
              <div className="pet-editor-head">
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Award size={16} strokeWidth={2.2} /> {t("คอลเลกชันน้อง","Collection","コレクション")}</span>
                <span className="pet-coins">{hall.length}</span>
                <button className="pet-sheet-x" onClick={() => setShowHall(false)}><X size={15} strokeWidth={2.4} /></button>
              </div>
              {hall.length === 0 ? (
                <div className="pet-empty-msg">
                  {t("ยังไม่มีน้องในคอลเลกชัน — น้องที่เคยเลี้ยงจะถูกเก็บไว้ที่นี่",
                     "No buddies yet — released buddies are kept here forever",
                     "まだいません — にがしたバディはここに残ります")}
                </div>
              ) : (
                <div className="pet-hall-grid">
                  {hall.map((h, i) => (
                    <div key={i} className="pet-hall-card">
                      <PetSprite id={h.spriteId ?? h.base} size={66} />
                      <div className="pet-hall-name">{localName(h.spriteId ?? h.base, h.en)}</div>
                      <div className="pet-hall-meta">Lv.{h.level} · <Heart size={9} strokeWidth={2.6} fill="currentColor" style={{ verticalAlign: "-1px", color: "#f472b6" }} /> {h.bond}%</div>
                      <div className="pet-hall-days">{h.days} {t("วัน","days","日")}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Achievement unlocked toast ─── */}
        {achToast && (() => {
          const Ic = ACH_ICONS[achToast.icon] ?? Trophy;
          return (
            <div className="pet-ach-toast">
              <div className="pet-ach-toast-icon"><Ic size={20} strokeWidth={2.2} /></div>
              <div>
                <div className="pet-ach-toast-label">{t("ปลดล็อกรางวัล!","Achievement unlocked!","じっせきかいじょ！")}</div>
                <div className="pet-ach-toast-name">{lang === "th" ? achToast.th : achToast.en}</div>
              </div>
            </div>
          );
        })()}

        {/* ─── Streak bonus toast ─── */}
        {streakReward != null && (
          <div className="pet-ach-toast">
            <div className="pet-ach-toast-icon" style={{ color: "var(--p-gold)" }}><Flame size={20} strokeWidth={2.2} /></div>
            <div>
              <div className="pet-ach-toast-label">{t("โบนัสสตรีค!","Streak bonus!","ストリークボーナス！")}</div>
              <div className="pet-ach-toast-name" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Coins size={13} strokeWidth={2.3} /> +{streakReward}</div>
            </div>
          </div>
        )}

        {/* ─── Eevee evolution chooser ─── */}
        {evoChoosing && (
          <div className="pet-sheet-overlay">
            <div className="pet-sheet" onClick={e => e.stopPropagation()}>
              <div className="pet-editor-head">
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Sparkles size={16} strokeWidth={2.2} /> {t("เลือกร่างวิวัฒนาการ","Choose Evolution","しんかをえらぶ")}</span>
              </div>
              <div className="pet-eevee-sub">{t("Eevee พร้อมวิวัฒนาการแล้ว! เลือกได้ครั้งเดียวนะ","Eevee is ready to evolve! Choose wisely — it's permanent","イーブイがしんか！ひとつだけえらべる")}</div>
              <div className="pet-eevee-grid">
                {EEVEELUTIONS.map(e => (
                  <button key={e.id} className="pet-eevee-card" onClick={() => chooseEevee(e.id)}>
                    <PetSprite id={e.id} size={72} />
                    <div className="pet-eevee-name">{localName(e.id, e.en)}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── Settings ─── */}
        {showSettings && (
          <div className="pet-sheet-overlay" onClick={() => setShowSettings(false)}>
            <div className="pet-sheet" onClick={e => e.stopPropagation()}>
              <div className="pet-editor-head">
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Settings size={16} strokeWidth={2.2} /> {t("ตั้งค่า","Settings","設定")}</span>
                <button className="pet-sheet-x" onClick={() => setShowSettings(false)}><X size={15} strokeWidth={2.4} /></button>
              </div>
              <button className="pet-setting-row" onClick={toggleSfx}>
                <span className="pet-setting-ic">{sfxOn ? <Volume2 size={18} strokeWidth={2.2} /> : <VolumeX size={18} strokeWidth={2.2} />}</span>
                <span className="pet-setting-label">{t("เสียงเอฟเฟกต์","Sound effects","こうかおん")}</span>
                <span className={`pet-toggle${sfxOn ? " on" : ""}`}><span className="pet-toggle-knob" /></span>
              </button>
              <button className="pet-setting-row danger" onClick={() => { if (confirm(t("ปล่อยน้องคืนธรรมชาติ? (จะถูกเก็บในคอลเลกชัน)","Release this buddy? (it will be saved to your Collection)","にがしますか？"))) { releaseBuddy(); setShowSettings(false); } }}>
                <span className="pet-setting-ic"><Trash2 size={18} strokeWidth={2.2} /></span>
                <span className="pet-setting-label">{t("ปล่อยน้องคืนธรรมชาติ","Release buddy","にがす")}</span>
              </button>
              <div className="pet-quest-hint" style={{ marginTop: 14 }}>
                {t("น้องที่ปล่อยจะถูกเก็บไว้ในคอลเลกชันตลอดไป","Released buddies are kept in your Collection forever","にがしたバディはコレクションに残ります")}
              </div>
            </div>
          </div>
        )}

        {/* ─── While you were away ─── */}
        {away && (
          <div className="pet-sheet-overlay" onClick={() => setAway(null)}>
            <div className="pet-sheet" onClick={e => e.stopPropagation()}>
              <div className="pet-editor-head">
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Clock size={16} strokeWidth={2.2} /> {t("ตอนที่คุณไม่อยู่","While you were away","るすのあいだ")}</span>
                <button className="pet-sheet-x" onClick={() => setAway(null)}><X size={15} strokeWidth={2.4} /></button>
              </div>
              <div className="pet-away-hero">
                <PetSprite id={curId} size={92} />
                <div className="pet-away-msg">
                  {t(`คิดถึงนะ! หายไปตั้ง ${away.hours >= 1 ? away.hours + " ชม." : away.mins + " นาที"}`,
                     `Missed you! You were away ${away.hours >= 1 ? away.hours + "h" : away.mins + "m"}`,
                     `あいたかった！${away.hours >= 1 ? away.hours + "時間" : away.mins + "分"}るすだったね`)}
                </div>
              </div>
              <div className="pet-away-stats">
                {[
                  { Icon: Drumstick, k: "hunger", color: "#fb923c" },
                  { Icon: Heart, k: "happy", color: "#f472b6" },
                  { Icon: Zap, k: "energy", color: "#fbbf24" },
                  { Icon: Bath, k: "clean", color: "#5aa9d6" },
                ].map(s => (
                  <div key={s.k} className="pet-away-stat">
                    <span style={{ color: s.color, display: "inline-flex" }}><s.Icon size={15} strokeWidth={2.2} /></span>
                    <span className="pet-away-drop">{away.drops[s.k] > 0 ? `-${away.drops[s.k]}` : "0"}</span>
                  </div>
                ))}
              </div>
              <div className="pet-away-reward">
                <Coins size={15} strokeWidth={2.3} style={{ color: "var(--p-gold)" }} />
                {t(`รับโบนัสกลับมา +${away.reward} เหรียญ`, `Welcome-back bonus +${away.reward} coins`, `おかえりボーナス +${away.reward}`)}
              </div>
              <button className="bc-start" style={{ alignSelf: "stretch" }} onClick={() => setAway(null)}>
                {t("ดูแลกันต่อ!","Let's care!","おせわする！")}
              </button>
            </div>
          </div>
        )}

        {/* ─── First-time onboarding ─── */}
        {showIntro && (
          <div className="pet-sheet-overlay" onClick={dismissIntro}>
            <div className="pet-sheet" onClick={e => e.stopPropagation()}>
              <div className="pet-intro-hero">
                <PetSprite id={curId} size={96} />
                <div className="pet-intro-title">{t("ยินดีต้อนรับเพื่อนใหม่!","Welcome to your buddy!","ようこそ！")}</div>
                <div className="pet-intro-sub">{t("ดูแลน้องให้มีความสุข แล้วโตไปด้วยกัน","Keep it happy and grow together","おせわして一緒に育とう")}</div>
              </div>
              <div className="pet-intro-steps">
                {[
                  { Icon: Utensils, th: "ให้อาหาร อาบน้ำ เล่น และลูบหัว เพื่อรักษาสถานะ", en: "Feed, bathe, play & pet to keep stats up" },
                  { Icon: Heart, th: "ลูบหัวบ่อยๆ เพิ่มความผูกพัน + ทำสิ่งที่น้องชอบได้โบนัส", en: "Petting builds bond — do its favourite for bonuses" },
                  { Icon: Footprints, th: "กด 'ส่งน้องไปเดินเล่น' ให้น้องออกมาเดินบนหน้าจอ (ลาก/โยน/เก็บเหรียญได้)", en: "Send it roaming to walk your screen — drag, toss, grab coins" },
                  { Icon: Trophy, th: "ทำภารกิจ เล่นมินิเกม สะสมรางวัล และเหรียญไปซื้อของ", en: "Do missions, mini-games, earn awards & coins" },
                ].map((s, i) => (
                  <div key={i} className="pet-intro-step">
                    <span className="pet-intro-ic"><s.Icon size={17} strokeWidth={2.2} /></span>
                    <span>{lang === "th" ? s.th : s.en}</span>
                  </div>
                ))}
              </div>
              <button className="bc-start" style={{ alignSelf: "stretch" }} onClick={dismissIntro}>
                {t("เริ่มเลย!","Let's go!","はじめる！")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Styles ───
const PET_CSS = `
  .pet-overlay {
    /* tokens follow the app theme (light by default, dark via [data-theme="dark"]) */
    --p-card: var(--bg-card);
    --p-sheet: var(--bg-card);
    --p-surface: var(--bg-muted);
    --p-surface-2: color-mix(in srgb, var(--bg-muted), var(--text-primary) 10%);
    --p-sep: var(--border);
    --p-label: var(--text-primary);
    --p-label-2: var(--text-secondary);
    --p-label-3: var(--text-muted);
    --p-accent: var(--blue);
    --p-gold: var(--gold);
    --p-pink: #db2777;
    --p-font: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, "Segoe UI", sans-serif;
    position: fixed; inset: 0; z-index: 9500;
    background: rgba(20,18,20,0.5); backdrop-filter: blur(20px) saturate(120%); -webkit-backdrop-filter: blur(20px) saturate(120%);
    display: flex; align-items: center; justify-content: center;
    padding: 16px; overflow-y: auto;
    animation: pet-fade 0.3s ease;
    font-family: var(--p-font);
    -webkit-font-smoothing: antialiased;
  }
  [data-theme="dark"] .pet-overlay { --p-pink: #f9a8d4; }
  @keyframes pet-fade { from { opacity: 0; } to { opacity: 1; } }

  .pet-close {
    position: absolute; top: 16px; right: 16px;
    width: 38px; height: 38px; border-radius: 50%;
    background: var(--p-surface); border: none;
    color: var(--p-label-2); font-size: 14px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    z-index: 5; transition: background 0.2s, color 0.2s;
  }
  .pet-close:hover { background: var(--p-surface-2); color: var(--p-label); }

  /* ── Adoption ── */
  .pet-adopt {
    background: var(--p-card);
    border-radius: 34px; padding: 28px 24px;
    max-width: 760px; width: 100%; max-height: 90vh; overflow-y: auto;
    position: relative; color: var(--p-label);
    box-shadow: 0 40px 90px rgba(0,0,0,0.4), 0 0 0 0.5px var(--p-sep) inset;
    animation: pet-pop 0.4s cubic-bezier(0.34,1.56,0.64,1);
  }
  @keyframes pet-pop { from { opacity:0; transform: scale(0.92); } to { opacity:1; transform: scale(1); } }
  .pet-adopt-head { text-align: center; margin-bottom: 22px; }
  .pet-adopt-title {
    font-size: 27px; font-weight: 800; letter-spacing: -0.02em; color: var(--p-label);
  }
  .pet-adopt-sub { font-size: 13px; color: var(--p-label-2); font-weight: 500; margin-top: 5px; }
  .pet-adopt-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(108px, 1fr)); gap: 12px;
  }
  .pet-adopt-card {
    position: relative; background: var(--p-surface);
    border: none; border-radius: 20px;
    padding: 10px 6px 12px; cursor: pointer; color: var(--p-label); font-family: inherit;
    transition: transform 0.22s cubic-bezier(0.34,1.56,0.64,1), background 0.22s;
    display: flex; flex-direction: column; align-items: center; gap: 2px;
  }
  .pet-adopt-card:hover { transform: translateY(-4px); background: var(--p-surface-2); }
  .pet-adopt-card:active { transform: scale(0.96); }
  .pet-adopt-sprite {
    width: 84px; height: 84px; display: flex; align-items: flex-end; justify-content: center;
    filter: drop-shadow(0 4px 6px rgba(0,0,0,0.4));
  }
  .pet-adopt-name {
    font-size: 12px; font-weight: 600; text-align: center; line-height: 1.15;
    color: var(--p-label); letter-spacing: -0.01em;
  }
  .pet-gen-badge {
    position: absolute; top: 7px; left: 7px;
    font-size: 9px; font-weight: 700; letter-spacing: 0.3px;
    padding: 3px 7px; border-radius: 999px;
    background: color-mix(in srgb, var(--p-label) 12%, transparent); color: var(--p-label-2);
  }
  .pet-gen-badge.star { background: color-mix(in srgb, var(--p-gold) 22%, transparent); color: var(--p-gold); }

  /* ── Care room ── */
  .pet-room {
    background: var(--p-card);
    border-radius: 34px; padding: 16px 16px 20px;
    max-width: 600px; width: 100%; position: relative; color: var(--p-label);
    box-shadow: 0 40px 90px rgba(0,0,0,0.4), 0 0 0 0.5px var(--p-sep) inset;
    animation: pet-pop 0.4s cubic-bezier(0.34,1.56,0.64,1);
    overflow: hidden;
  }
  /* Editing: lock the room height; palette scrolls inside (never overflows) */
  .pet-room.editing {
    display: flex; flex-direction: column;
    max-height: 92vh; padding-bottom: 14px;
  }
  .pet-room.editing .pet-stage { flex-shrink: 0; height: 220px; }
  /* Buddy fades + lets pointers through so you can arrange furniture behind it */
  .pet-stage.editing .pet-walker { pointer-events: none; opacity: 0.45; }
  .pet-topbar { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
  .pet-icon-btn {
    width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0;
    background: var(--p-surface); border: none;
    color: var(--p-label-2); font-size: 15px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: transform 0.2s, background 0.2s, color 0.2s;
  }
  .pet-icon-btn:hover { background: var(--p-surface-2); color: var(--p-label); }
  .pet-icon-btn:active { transform: scale(0.9); }
  .pet-icon-btn.danger:hover {
    background: rgba(255,69,58,0.18); color: #ff6961;
  }
  .pet-name-pill {
    display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 700;
    letter-spacing: -0.01em;
    background: var(--p-surface); padding: 8px 16px; border-radius: 999px;
    flex: 1; justify-content: center; min-width: 0;
  }
  .pet-name-pill > span:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pet-lvl {
    font-size: 11px; font-weight: 800; color: var(--p-gold); flex-shrink: 0;
    background: color-mix(in srgb, var(--p-gold) 18%, transparent); padding: 3px 9px; border-radius: 999px;
    letter-spacing: 0.01em;
  }

  .pet-meta-row { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
  .pet-care-meter {
    flex: 1; display: flex; align-items: center; gap: 9px;
    background: var(--p-surface); padding: 8px 14px; border-radius: 999px;
  }
  .pet-care-track { flex: 1; height: 7px; border-radius: 999px; background: color-mix(in srgb, var(--p-label) 12%, transparent); overflow: hidden; }
  .pet-care-fill { height: 100%; border-radius: 999px; transition: width 0.5s ease, background 0.5s; }
  .pet-care-pct { font-size: 12px; font-weight: 700; min-width: 34px; text-align: right; font-variant-numeric: tabular-nums; color: var(--p-label); }
  .pet-age {
    font-size: 12px; font-weight: 600; color: var(--p-label-2);
    background: var(--p-surface); padding: 8px 13px; border-radius: 999px;
    white-space: nowrap;
  }

  /* ── Stage (layered pixel room) ── */
  .pet-stage {
    position: relative; height: 380px;
    border-radius: 28px; margin-bottom: 14px;
    box-shadow: 0 0 0 0.5px var(--p-sep) inset, 0 10px 30px rgba(0,0,0,0.25);
    overflow: hidden;
  }
  .room-wall  { position: absolute; left: 0; right: 0; top: 0; height: 58%; overflow: hidden; }
  .room-floor { position: absolute; left: 0; right: 0; bottom: 0; height: 42%; overflow: hidden; }
  .room-pat   { position: absolute; inset: 0; }
  /* crown moulding along the top of the wall */
  .room-crown {
    position: absolute; left: 0; right: 0; top: 0; height: 7px;
    background: linear-gradient(180deg, rgba(255,255,255,0.22), rgba(0,0,0,0.14));
    box-shadow: 0 1px 0 rgba(0,0,0,0.12);
  }
  /* lower-wall wainscot panel + chair-rail trim */
  .room-wainscot {
    position: absolute; left: 0; right: 0; bottom: 0; height: 34%;
    box-shadow: inset 0 3px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.12);
  }
  .room-wainscot::before {
    content: ""; position: absolute; left: 0; right: 0; top: -4px; height: 4px;
    background: linear-gradient(180deg, rgba(255,255,255,0.25), rgba(0,0,0,0.12));
  }
  /* baseboard at wall/floor seam */
  .room-baseboard {
    position: absolute; left: 0; right: 0; top: 58%; height: 5px;
    transform: translateY(-3px); z-index: 2;
    background: linear-gradient(180deg, rgba(255,255,255,0.2), rgba(0,0,0,0.32));
  }
  /* floor recedes into shadow at the back */
  .room-floor-back {
    position: absolute; left: 0; right: 0; top: 0; height: 22%;
    background: linear-gradient(180deg, rgba(0,0,0,0.22), transparent);
  }
  /* soft room lighting — bright near window, dark in corners */
  .room-vignette {
    position: absolute; inset: 0; z-index: 2; pointer-events: none;
    background:
      radial-gradient(ellipse 60% 55% at 50% 20%, rgba(255,250,230,0.16), transparent 70%),
      radial-gradient(ellipse 120% 90% at 50% 55%, transparent 55%, rgba(0,0,0,0.28) 100%);
  }
  .room-scene { position: absolute; inset: 0; z-index: 1; pointer-events: none; overflow: hidden; }

  /* ── Window (the outside view, framed on the wall) ── */
  .room-window {
    position: absolute; top: 10px; left: 50%; transform: translateX(-50%);
    width: 88px; height: 60px; z-index: 1;
    border-radius: 6px 6px 4px 4px;
    border: 4px solid #9a6a3c;
    box-shadow: 0 4px 10px rgba(0,0,0,0.28), inset 0 0 0 2px rgba(255,255,255,0.15);
    overflow: hidden;
  }
  .rw-glass { position: absolute; inset: 0; overflow: hidden; }
  /* window muntins (cross bars) */
  .rw-bars { position: absolute; inset: 0; pointer-events: none; }
  .rw-bars::before { content: ""; position: absolute; left: 50%; top: 0; bottom: 0; width: 3px; transform: translateX(-50%); background: #9a6a3c; }
  .rw-bars::after  { content: ""; position: absolute; top: 50%; left: 0; right: 0; height: 3px; transform: translateY(-50%); background: #9a6a3c; }
  .rw-sun { position: absolute; top: 8px; right: 10px; width: 18px; height: 18px; border-radius: 50%;
    background: radial-gradient(circle at 40% 35%, #fff3b0, #ffce3e); box-shadow: 0 0 12px rgba(255,206,62,0.8); }
  .rw-moon { position: absolute; top: 8px; right: 12px; width: 16px; height: 16px; border-radius: 50%;
    background: radial-gradient(circle at 38% 35%, #fdfbe7, #d7d9f0); box-shadow: 0 0 10px rgba(220,225,255,0.6); }
  .rw-moon::before { content: ""; position: absolute; width: 4px; height: 4px; border-radius: 50%; background: rgba(150,155,200,0.5); top: 4px; left: 5px; }
  .rw-cloud { position: absolute; width: 22px; height: 8px; border-radius: 999px; background: rgba(255,255,255,0.92); }
  .rw-cloud::before { content: ""; position: absolute; width: 11px; height: 11px; border-radius: 50%; background: rgba(255,255,255,0.92); left: 3px; bottom: 2px; }
  .rw-cloud::after  { content: ""; position: absolute; width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.92); right: 4px; bottom: 3px; }
  .rw-sea { position: absolute; left: 0; right: 0; bottom: 0; height: 38%; background: linear-gradient(180deg,#3aa6e0,#2b86c4); box-shadow: inset 0 2px 0 rgba(255,255,255,0.3); }
  .rw-star { position: absolute; width: 2px; height: 2px; border-radius: 50%; background: #fff; box-shadow: 0 0 3px #fff; animation: rs-twinkle 2.4s ease-in-out infinite; }
  .rw-snow { position: absolute; top: -4px; width: 4px; height: 4px; border-radius: 50%; background: #fff; animation: rw-snowfall 3.5s linear infinite; }
  @keyframes rw-snowfall { 0% { transform: translateY(-4px); } 100% { transform: translateY(60px); } }
  .rw-planet { position: absolute; top: 8px; right: 10px; width: 18px; height: 18px; border-radius: 50%;
    background: radial-gradient(circle at 36% 32%, #ffd6a0, #d9763f); }
  .rw-planet::after { content: ""; position: absolute; top: 42%; left: -5px; right: -5px; height: 4px; border-radius: 50%; border: 2px solid rgba(255,220,180,0.8); transform: rotate(-18deg); }
  .rw-tree { position: absolute; bottom: 0; width: 0; height: 0; border-left: 9px solid transparent; border-right: 9px solid transparent; border-bottom: 26px solid #3a8a47; filter: drop-shadow(0 0 0 #2d6b39); }
  .rw-screen { position: absolute; inset: 16%; border-radius: 3px; background: linear-gradient(180deg,#1ea7c4,#0e6f92); box-shadow: inset 0 0 0 2px rgba(255,255,255,0.2), 0 0 10px rgba(30,167,196,0.6); }
  @keyframes rs-twinkle { 0%,100% { opacity: 0.3; } 50% { opacity: 1; } }

  /* ── Room ambient props ── */
  .rs-snow {
    position: absolute; top: -6px; width: 5px; height: 5px; border-radius: 50%;
    background: #fff; opacity: 0.9; animation: rs-fall linear infinite;
  }
  @keyframes rs-fall { 0% { transform: translateY(-6px); } 100% { transform: translateY(240px); } }
  .rs-crystal {
    position: absolute; width: 0; height: 0;
    border-left: 8px solid transparent; border-right: 8px solid transparent;
    border-bottom: 22px solid var(--cc, #7aa6ff);
    filter: drop-shadow(0 0 8px var(--cc, #7aa6ff));
  }
  .rs-balloon {
    position: absolute; width: 20px; height: 26px; border-radius: 50%;
    background: radial-gradient(circle at 38% 32%, #fff, var(--bc, #ff7eb6));
    animation: rs-bob 4s ease-in-out infinite;
  }
  .rs-balloon::after { content: ""; position: absolute; bottom: -14px; left: 50%; width: 1px; height: 14px; background: rgba(255,255,255,0.5); }
  @keyframes rs-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
  .rs-leaf {
    position: absolute; top: -6px; width: 7px; height: 7px;
    background: #5bbf6a; border-radius: 0 80% 0 80%;
    animation: rs-fall-sway 6s linear infinite; opacity: 0.85;
  }
  @keyframes rs-fall-sway { 0% { transform: translate(0,-6px) rotate(0); } 100% { transform: translate(14px,240px) rotate(220deg); } }
  /* Decorate-room button — labelled + gentle attention pulse */
  .pet-edit-room {
    position: absolute; top: 10px; right: 10px; z-index: 7;
    display: inline-flex; align-items: center; gap: 5px;
    padding: 8px 14px; border-radius: 999px; cursor: pointer;
    font-family: inherit; font-size: 12px; font-weight: 600; letter-spacing: -0.01em; color: #fff;
    background: rgba(40,40,42,0.55); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
    border: 0.5px solid rgba(255,255,255,0.25);
    box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    transition: transform 0.18s, background 0.2s;
  }
  .pet-edit-room:hover { background: rgba(58,58,60,0.7); }
  .pet-edit-room:active { transform: scale(0.95); }
  @keyframes pet-edit-pulse {
    0%, 100% { box-shadow: 0 4px 14px rgba(181,48,45,0.5); }
    50%       { box-shadow: 0 4px 14px rgba(181,48,45,0.55), 0 0 0 6px rgba(181,48,45,0.16); }
  }
  .pet-bubble {
    position: absolute; top: 12px; left: 50%; transform: translateX(-50%);
    background: rgba(255,255,255,0.95); color: #201d20;
    font-size: 12px; font-weight: 700; padding: 7px 14px; border-radius: 14px;
    border: 2px solid; max-width: 86%; text-align: center; line-height: 1.3;
    box-shadow: 0 6px 18px rgba(0,0,0,0.3); z-index: 4;
    animation: pet-bubble-in 0.4s cubic-bezier(0.34,1.56,0.64,1);
  }
  .pet-bubble-emoji {
    padding: 8px 12px; line-height: 1; display: inline-flex; align-items: center; justify-content: center;
  }
  .pet-bubble::after {
    content: ""; position: absolute; bottom: -7px; left: 50%; transform: translateX(-50%);
    border-left: 7px solid transparent; border-right: 7px solid transparent;
    border-top: 7px solid rgba(255,255,255,0.95);
  }
  @keyframes pet-bubble-in { from { opacity:0; transform: translateX(-50%) translateY(-6px); } to { opacity:1; transform: translateX(-50%) translateY(0);} }

  .pet-walker {
    position: absolute; left: 0; bottom: 16px; z-index: 3;
    will-change: transform;
  }
  .pet-decor {
    position: absolute; pointer-events: none;
    object-fit: contain; image-rendering: pixelated;
    filter: drop-shadow(0 3px 3px rgba(0,0,0,0.4));
    animation: pet-decor-in 0.4s cubic-bezier(0.34,1.56,0.64,1);
  }
  @keyframes pet-decor-in { from { opacity: 0; transform: scale(0.5) translateY(6px); } to { opacity: 1; } }
  .pet-buddy {
    position: relative;
    display: flex; flex-direction: column; align-items: center;
  }
  .pet-shadow {
    width: 120px; height: 19px; margin-top: -10px;
    background: radial-gradient(ellipse, rgba(0,0,0,0.45), transparent 70%);
    filter: blur(3px);
  }
  .pet-buddy.pose-idle   { animation: pet-idle 2.6s ease-in-out infinite; }
  .pet-buddy.pose-walk   { animation: pet-walk 0.46s ease-in-out infinite; }
  .pet-buddy.pose-bounce { animation: pet-bounce 0.7s cubic-bezier(0.34,1.56,0.64,1); }
  .pet-buddy.pose-wiggle { animation: pet-wiggle 0.7s ease-in-out; }
  .pet-buddy.pose-sleep  { animation: pet-sleep 1.4s ease-in-out; }
  .pet-buddy.evolving    { animation: pet-evo-shake 0.4s linear infinite; }
  /* run cycle — springy hop + body tilt reads as the buddy dashing around */
  @keyframes pet-walk {
    0%   { transform: translateY(0)    rotate(-2.5deg); }
    25%  { transform: translateY(-9px) rotate(0deg)    scaleY(1.04); }
    50%  { transform: translateY(0)    rotate(2.5deg); }
    75%  { transform: translateY(-9px) rotate(0deg)    scaleY(1.04); }
    100% { transform: translateY(0)    rotate(-2.5deg); }
  }
  @keyframes pet-idle   { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
  @keyframes pet-bounce { 0% { transform: translateY(0) scale(1); } 40% { transform: translateY(-26px) scale(1.08); } 70% { transform: translateY(0) scale(0.96); } 100% { transform: translateY(0) scale(1); } }
  @keyframes pet-wiggle { 0%,100% { transform: rotate(0); } 25% { transform: rotate(-9deg); } 75% { transform: rotate(9deg); } }
  @keyframes pet-sleep  { 0%,100% { transform: scale(1); } 50% { transform: scale(0.95) translateY(4px); } }
  @keyframes pet-evo-shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }

  .pet-evo-flash {
    position: absolute; inset: 0; z-index: 6; pointer-events: none;
    background: radial-gradient(circle at 50% 60%, rgba(255,255,255,0.95), rgba(255,255,255,0) 60%);
    animation: pet-evo-flash 2.6s ease-in-out;
  }
  @keyframes pet-evo-flash {
    0% { opacity: 0; } 20% { opacity: 0.4; } 45% { opacity: 0.95; }
    65% { opacity: 0.4; } 100% { opacity: 0; }
  }
  .pet-evo-text {
    position: absolute; top: 16px; left: 50%; transform: translateX(-50%);
    z-index: 7; font-size: 15px; font-weight: 900; color: #fff; white-space: nowrap;
    text-shadow: 0 0 12px #fde047, 0 2px 6px rgba(0,0,0,0.6);
    animation: pet-pop 0.5s ease;
  }
  .pet-levelup {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);
    z-index: 6; font-size: 18px; font-weight: 900; color: #fde047; white-space: nowrap;
    text-shadow: 0 0 14px rgba(253,224,71,0.9), 0 2px 6px rgba(0,0,0,0.6);
    animation: pet-levelup 1.2s ease forwards;
  }
  @keyframes pet-levelup {
    0% { opacity: 0; transform: translate(-50%,-30%) scale(0.6); }
    30% { opacity: 1; transform: translate(-50%,-60%) scale(1.1); }
    100% { opacity: 0; transform: translate(-50%,-110%) scale(1); }
  }

  .pet-particle {
    position: absolute; bottom: 90px; z-index: 5; pointer-events: none;
    color: var(--p-accent); display: inline-flex;
    animation: pet-particle 1.4s ease-out forwards;
  }
  @keyframes pet-particle {
    0% { opacity: 0; transform: translate(0,0) scale(0.5); }
    20% { opacity: 1; transform: translate(0,-10px) scale(1.1); }
    100% { opacity: 0; transform: translate(var(--dx,0), -110px) scale(0.9); }
  }

  /* ── Stat bars — iOS grouped inset card ── */
  .pet-stats {
    display: flex; flex-direction: column;
    background: var(--p-surface); border-radius: 18px;
    padding: 4px 14px; margin-bottom: 12px;
  }
  .pet-stat-row { display: flex; align-items: center; gap: 11px; padding: 9px 0; }
  .pet-stat-row + .pet-stat-row { box-shadow: 0 -0.5px 0 var(--p-sep); }
  .pet-stat-icon { width: 22px; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; }
  .pet-stat-track {
    flex: 1; height: 8px; border-radius: 999px;
    background: color-mix(in srgb, var(--p-label) 12%, transparent); overflow: hidden;
  }
  .pet-stat-fill { height: 100%; border-radius: 999px; transition: width 0.45s ease, background 0.3s; }
  .pet-stat-val { font-size: 12px; font-weight: 600; min-width: 28px; text-align: right; font-variant-numeric: tabular-nums; color: var(--p-label-2); }

  /* ── EXP ── */
  .pet-exp-wrap { margin-bottom: 14px; padding: 0 2px; }
  .pet-exp-track {
    height: 8px; border-radius: 999px; background: color-mix(in srgb, var(--p-label) 12%, transparent); overflow: hidden;
  }
  .pet-exp-fill {
    height: 100%; border-radius: 999px;
    background: linear-gradient(90deg, var(--p-accent), var(--p-gold));
    transition: width 0.5s ease;
  }
  .pet-exp-label { font-size: 11px; font-weight: 600; color: var(--p-label-2); margin-top: 7px; text-align: center; letter-spacing: -0.01em; }

  /* ── Actions ── */
  .pet-actions { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
  .pet-action-btn {
    --ac: #fb923c;
    display: flex; flex-direction: column; align-items: center; gap: 6px;
    background: var(--p-surface); border: none;
    border-radius: 18px; padding: 13px 4px; cursor: pointer; color: var(--p-label);
    font-family: inherit; transition: transform 0.18s, background 0.2s;
  }
  .pet-action-btn:hover:not(:disabled) { background: var(--p-surface-2); }
  .pet-action-btn:active:not(:disabled) { transform: scale(0.93); }
  .pet-action-btn:disabled { opacity: 0.4; cursor: default; }
  .pet-action-icon { font-size: 22px; color: var(--ac); display: inline-flex; }
  .pet-action-label { font-size: 10px; font-weight: 600; color: var(--p-label-2); letter-spacing: -0.01em; }

  .pet-roam-toggle {
    margin-top: 12px; width: 100%;
    padding: 14px; border-radius: 16px; cursor: pointer;
    font-family: inherit; font-size: 14px; font-weight: 600; letter-spacing: -0.01em;
    color: var(--p-label); background: var(--p-surface); border: none;
    transition: transform 0.18s, background 0.2s, color 0.2s;
  }
  .pet-roam-toggle:hover { background: var(--p-surface-2); }
  .pet-roam-toggle:active { transform: scale(0.98); }
  .pet-roam-toggle.on { color: #6ee7a8; background: rgba(48,209,88,0.16); }

  /* ── Room editor sheet ── */
  /* Editor palette — scrolls inside the room, never overflows the screen */
  .pet-palette {
    background: var(--p-surface);
    border: 1px solid var(--p-sep);
    border-radius: 16px; padding: 10px 10px 12px; margin-top: 8px;
    flex: 1; min-height: 0; overflow-y: auto;
    animation: pet-editor-in 0.3s cubic-bezier(0.34,1.56,0.64,1);
  }
  .pet-palette::-webkit-scrollbar { width: 6px; }
  .pet-palette::-webkit-scrollbar-thumb { background: var(--p-label-3); border-radius: 999px; }
  @keyframes pet-editor-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

  /* Placed furniture in the room */
  .pet-placed {
    position: absolute; transform: translate(-50%, -50%);
    image-rendering: pixelated; pointer-events: none;
    filter: drop-shadow(0 3px 3px rgba(0,0,0,0.4));
  }
  .pet-placed.editing {
    pointer-events: auto; cursor: grab; touch-action: none;
    outline: 1.5px dashed rgba(255,255,255,0.35); outline-offset: 3px;
    border-radius: 4px;
  }
  .pet-placed.grabbing { cursor: grabbing; filter: drop-shadow(0 8px 8px rgba(0,0,0,0.5)); }
  .pet-placed-ctrls {
    position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
    display: flex; gap: 3px; pointer-events: auto;
  }
  .pet-placed-btn {
    width: 19px; height: 19px; border-radius: 50%;
    background: rgba(26,24,26,0.92); color: #fff; border: 1.5px solid rgba(255,255,255,0.5);
    font-size: 12px; font-weight: 900; line-height: 1; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 2px 6px rgba(0,0,0,0.4);
  }
  .pet-placed-btn:active { transform: scale(0.88); }
  .pet-placed-btn.del { background: #ef4444; }
  /* Edit-mode hint banner */
  .pet-edit-hint {
    position: absolute; top: 10px; left: 50%; transform: translateX(-50%);
    z-index: 9; padding: 7px 14px; border-radius: 999px; white-space: nowrap;
    background: rgba(40,40,42,0.6); border: 0.5px solid rgba(255,255,255,0.2);
    color: #fff; font-size: 11px; font-weight: 500;
    backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  }
  /* Room preview thumbnail in the theme picker */
  .room-thumb {
    width: 54px; height: 38px; border-radius: 6px; overflow: hidden;
    position: relative; border: 1px solid rgba(0,0,0,0.25);
    box-shadow: inset 0 0 0 1px rgba(255,255,255,0.12);
  }
  .rt-wall  { position: absolute; left: 0; right: 0; top: 0; height: 60%; }
  .rt-floor { position: absolute; left: 0; right: 0; bottom: 0; height: 40%; }
  .rt-pat   { position: absolute; inset: 0; }
  .rt-window {
    position: absolute; top: 5px; left: 50%; transform: translateX(-50%);
    width: 18px; height: 13px; border-radius: 2px;
    background: linear-gradient(180deg,#bfe9ff,#8fd0ff); border: 1.5px solid #9a6a3c;
  }
  .pet-editor-head {
    display: flex; align-items: center; justify-content: space-between;
    font-size: 18px; font-weight: 700; letter-spacing: -0.02em; color: var(--p-label); margin-bottom: 14px;
  }
  .pet-editor-done {
    padding: 9px 18px; border-radius: 999px; cursor: pointer;
    font-family: inherit; font-size: 13px; font-weight: 600; color: #fff;
    background: var(--p-accent); border: none;
  }
  .pet-editor-done:active { transform: scale(0.95); }
  .pet-editor-label {
    font-size: 12px; font-weight: 600; letter-spacing: -0.01em;
    color: var(--p-label-2); margin: 14px 0 8px;
  }
  /* Themes scroll horizontally — compact, no tall wrapping */
  .pet-theme-row {
    display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px;
    scroll-snap-type: x proximity;
  }
  .pet-theme-row::-webkit-scrollbar { height: 5px; }
  .pet-theme-row::-webkit-scrollbar-thumb { background: var(--p-label-3); border-radius: 999px; }
  .pet-theme-chip {
    display: flex; flex-direction: column; align-items: center; gap: 5px;
    padding: 8px 7px 9px; min-width: 72px; flex-shrink: 0; scroll-snap-align: start;
    border-radius: 16px; cursor: pointer; font-family: inherit;
    font-size: 10px; font-weight: 600; color: var(--p-label-2);
    background: var(--p-surface); border: 1.5px solid transparent;
    transition: transform 0.18s, border-color 0.2s, background 0.2s, color 0.2s;
  }
  .pet-theme-chip:active { transform: scale(0.95); }
  .pet-theme-chip.active {
    background: var(--p-surface-2); border-color: var(--p-accent); color: var(--p-label);
  }
  .pet-cat-tabs {
    display: flex; gap: 4px; margin-bottom: 12px; padding: 3px;
    background: color-mix(in srgb, var(--p-label) 8%, transparent); border-radius: 12px;
  }
  .pet-cat-tab {
    flex: 1; min-width: 60px; padding: 8px; border-radius: 9px; cursor: pointer;
    font-family: inherit; font-size: 12px; font-weight: 600; letter-spacing: -0.01em;
    color: var(--p-label-2); background: transparent; border: none;
    transition: background 0.18s, color 0.18s;
  }
  .pet-cat-tab:hover { color: var(--p-label); }
  .pet-cat-tab.active { color: var(--p-label); background: var(--p-surface-2); }
  .pet-decor-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(82px, 1fr)); gap: 8px;
  }
  .pet-decor-chip-art {
    height: 52px; display: flex; align-items: flex-end; justify-content: center;
    filter: drop-shadow(0 2px 2px rgba(0,0,0,0.4));
  }
  .pet-decor-chip {
    display: flex; flex-direction: column; align-items: center; gap: 4px;
    padding: 9px 4px; border-radius: 16px; cursor: pointer; font-family: inherit;
    font-size: 10px; font-weight: 600; color: var(--p-label-2);
    background: var(--p-surface); border: none;
    transition: transform 0.18s, background 0.2s;
  }
  .pet-decor-chip:hover { background: var(--p-surface-2); }
  .pet-decor-chip:active { transform: scale(0.95); }

  /* ── Coins / hub / food badge ── */
  .pet-coins {
    display: inline-flex; align-items: center; gap: 5px; flex-shrink: 0;
    font-size: 13px; font-weight: 700; color: var(--p-gold);
    background: color-mix(in srgb, var(--p-gold) 18%, transparent);
    padding: 8px 13px; border-radius: 999px; font-variant-numeric: tabular-nums;
  }
  .pet-hub-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px; }
  .pet-hub-btn {
    position: relative; padding: 12px 4px 10px; border-radius: 16px; cursor: pointer;
    font-family: inherit; color: var(--p-label); background: var(--p-surface); border: none;
    display: flex; flex-direction: column; align-items: center; gap: 6px;
    transition: transform 0.18s, background 0.2s;
  }
  .pet-hub-btn span { font-size: 11px; font-weight: 600; letter-spacing: -0.01em; }
  .pet-hub-btn:hover { background: var(--p-surface-2); }
  .pet-hub-btn:active { transform: scale(0.95); }
  .pet-hub-btn:disabled { opacity: 0.5; cursor: default; }
  .pet-hub-btn.accent { background: color-mix(in srgb, var(--p-accent) 16%, transparent); color: var(--p-accent); }
  @media (max-width: 460px) {
    .pet-hub-btn span { font-size: 10px; }
  }
  .pet-hub-badge {
    position: absolute; top: -6px; right: -6px; min-width: 18px; height: 18px;
    padding: 0 4px; border-radius: 999px; background: #ef4444; color: #fff;
    font-size: 10px; font-weight: 900; display: flex; align-items: center; justify-content: center;
    box-shadow: 0 2px 6px rgba(0,0,0,0.4); animation: pet-edit-pulse 2s ease-in-out infinite;
  }
  .pet-action-btn { position: relative; }
  .pet-food-badge {
    position: absolute; top: -6px; right: -6px; min-width: 17px; height: 17px;
    padding: 0 4px; border-radius: 999px; background: #fb923c; color: #fff;
    font-size: 10px; font-weight: 900; display: flex; align-items: center; justify-content: center;
    box-shadow: 0 2px 6px rgba(0,0,0,0.4);
  }
  .pet-food-badge.empty { background: #64748b; }

  /* ── Bottom-sheet overlays (feed / shop / missions) ── */
  .pet-sheet-overlay {
    position: absolute; inset: 0; z-index: 40;
    background: rgba(0,0,0,0.45); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
    display: flex; align-items: flex-end; justify-content: center;
    border-radius: 34px; overflow: hidden;
    animation: pet-fade 0.25s ease;
  }
  .pet-sheet {
    width: 100%; max-height: 92%; overflow-y: auto;
    background: var(--p-sheet);
    border-radius: 28px 28px 32px 32px; padding: 16px 16px 18px;
    box-shadow: 0 -1px 0 var(--p-sep) inset, 0 -8px 30px rgba(0,0,0,0.18);
    animation: pet-editor-in 0.3s cubic-bezier(0.34,1.56,0.64,1);
  }
  .pet-sheet-x {
    width: 30px; height: 30px; border-radius: 50%; cursor: pointer;
    background: var(--p-surface-2); border: none;
    color: var(--p-label-2); font-size: 13px;
  }
  .pet-food-list { display: flex; flex-direction: column; gap: 8px; }
  .pet-food-item {
    display: flex; align-items: center; gap: 12px; width: 100%;
    padding: 11px 13px; border-radius: 16px; cursor: pointer; font-family: inherit;
    background: var(--p-surface); border: none;
    color: var(--p-label); transition: transform 0.15s, background 0.2s;
  }
  .pet-food-item:hover:not(:disabled) { background: var(--p-surface-2); }
  .pet-food-item:active:not(:disabled) { transform: scale(0.98); }
  .pet-food-item:disabled { opacity: 0.4; cursor: default; }
  .pet-food-item.shop { cursor: default; }
  .pet-food-img { width: 34px; height: 34px; object-fit: contain; image-rendering: pixelated; flex-shrink: 0; }
  .pet-food-info { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; flex: 1; }
  .pet-food-name { font-size: 14px; font-weight: 600; letter-spacing: -0.01em; }
  .pet-food-sub { font-size: 11px; color: var(--p-label-2); font-weight: 500; }
  .pet-food-count { font-size: 14px; font-weight: 700; color: var(--p-label-2); font-variant-numeric: tabular-nums; }
  .pet-buy-btn {
    flex-shrink: 0; padding: 8px 15px; border-radius: 999px; cursor: pointer;
    font-family: inherit; font-size: 13px; font-weight: 600; color: #fff; border: none;
    background: var(--p-accent); font-variant-numeric: tabular-nums;
  }
  .pet-buy-btn:active:not(:disabled) { transform: scale(0.95); }
  .pet-buy-btn:disabled { background: var(--p-surface-2); color: var(--p-label-3); cursor: default; }
  .pet-empty-msg {
    text-align: center; color: var(--p-label-2); font-size: 13px; font-weight: 500;
    line-height: 1.6; padding: 14px 8px; display: flex; flex-direction: column; gap: 12px; align-items: center;
  }
  .pet-shop-link {
    padding: 11px 20px; border-radius: 999px; cursor: pointer; border: none; font-family: inherit;
    font-size: 14px; font-weight: 600; color: #fff; background: var(--p-accent);
  }
  /* missions */
  .pet-quest-list { display: flex; flex-direction: column; gap: 8px; }
  .pet-quest {
    display: flex; align-items: center; gap: 12px;
    padding: 11px 13px; border-radius: 16px;
    background: var(--p-surface);
  }
  .pet-quest.claimed { opacity: 0.5; }
  .pet-quest-main { flex: 1; display: flex; flex-direction: column; gap: 6px; min-width: 0; }
  .pet-quest-name { font-size: 13px; font-weight: 600; letter-spacing: -0.01em; color: var(--p-label); }
  .pet-quest-bar { height: 6px; border-radius: 999px; background: color-mix(in srgb, var(--p-label) 12%, transparent); overflow: hidden; }
  .pet-quest-fill { height: 100%; border-radius: 999px; background: var(--p-accent); transition: width 0.4s; }
  .pet-quest-prog { font-size: 11px; font-weight: 500; color: var(--p-label-2); font-variant-numeric: tabular-nums; }
  .pet-claim-btn {
    flex-shrink: 0; padding: 9px 15px; border-radius: 999px; cursor: pointer; border: none; font-family: inherit;
    font-size: 13px; font-weight: 600; color: #fff; background: var(--p-accent); font-variant-numeric: tabular-nums;
  }
  .pet-claim-btn:active:not(:disabled) { transform: scale(0.95); }
  .pet-claim-btn:disabled { background: var(--p-surface-2); color: var(--p-label-3); cursor: default; }
  .pet-quest-hint {
    margin-top: 12px; padding: 12px 14px; border-radius: 14px;
    background: var(--p-surface);
    font-size: 12px; font-weight: 500; color: var(--p-label-2); line-height: 1.5;
  }

  /* ── Personality trait pill ── */
  .pet-trait {
    display: inline-flex; align-items: center; gap: 5px; white-space: nowrap;
    font-size: 12px; font-weight: 600; color: var(--p-accent);
    background: color-mix(in srgb, var(--p-accent) 14%, transparent); padding: 8px 12px; border-radius: 999px;
  }

  /* ── Bond bar ── */
  .pet-bond-wrap { margin-bottom: 12px; padding: 0 2px; }
  .pet-bond-head {
    display: flex; justify-content: space-between; align-items: center;
    font-size: 12px; font-weight: 600; color: var(--p-pink); margin-bottom: 6px; letter-spacing: -0.01em;
  }
  .pet-bond-track { height: 8px; border-radius: 999px; background: color-mix(in srgb, var(--p-label) 12%, transparent); overflow: hidden; }
  .pet-bond-fill {
    height: 100%; border-radius: 999px;
    background: linear-gradient(90deg, #f472b6, #fb7185);
    transition: width 0.5s ease;
  }

  /* ── Streak card (in missions sheet) ── */
  .pet-streak-card {
    display: flex; align-items: center; gap: 12px; margin-bottom: 12px;
    padding: 13px; border-radius: 16px;
    background: color-mix(in srgb, var(--p-accent) 12%, transparent);
  }
  .pet-streak-flame {
    width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0;
    display: inline-flex; align-items: center; justify-content: center;
    background: color-mix(in srgb, var(--p-accent) 20%, transparent); color: var(--p-accent);
  }
  .pet-streak-info { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .pet-streak-title { font-size: 14px; font-weight: 700; color: var(--p-label); letter-spacing: -0.01em; }
  .pet-streak-sub { font-size: 11px; font-weight: 500; color: var(--p-label-2); }
  .pet-streak-btn {
    flex-shrink: 0; padding: 9px 15px; border-radius: 999px; cursor: pointer; border: none; font-family: inherit;
    font-size: 13px; font-weight: 600; color: #fff; background: var(--p-accent);
    display: inline-flex; align-items: center; gap: 5px; font-variant-numeric: tabular-nums;
  }
  .pet-streak-btn:active:not(:disabled) { transform: scale(0.95); }
  .pet-streak-btn:disabled { background: var(--p-surface-2); color: var(--p-label-3); cursor: default; }

  /* ── Achievements grid ── */
  .pet-ach-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .pet-ach {
    display: flex; flex-direction: column; align-items: center; gap: 4px; text-align: center;
    padding: 14px 8px; border-radius: 16px; background: var(--p-surface); opacity: 0.55;
  }
  .pet-ach.on { opacity: 1; }
  .pet-ach-icon {
    width: 44px; height: 44px; border-radius: 50%; margin-bottom: 2px;
    display: inline-flex; align-items: center; justify-content: center;
    background: var(--p-surface-2); color: var(--p-label-3);
  }
  .pet-ach.on .pet-ach-icon { background: color-mix(in srgb, var(--p-gold) 22%, transparent); color: var(--p-gold); }
  .pet-ach-name { font-size: 12px; font-weight: 700; color: var(--p-label); letter-spacing: -0.01em; }
  .pet-ach-desc { font-size: 10px; font-weight: 500; color: var(--p-label-2); line-height: 1.3; }

  /* ── Hall of Fame grid ── */
  .pet-hall-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .pet-hall-card {
    display: flex; flex-direction: column; align-items: center; gap: 2px; text-align: center;
    padding: 12px 6px 10px; border-radius: 16px; background: var(--p-surface);
  }
  .pet-hall-name { font-size: 12px; font-weight: 700; color: var(--p-label); text-transform: capitalize; letter-spacing: -0.01em; }
  .pet-hall-meta { font-size: 10.5px; font-weight: 600; color: var(--p-label-2); }
  .pet-hall-days { font-size: 10px; font-weight: 500; color: var(--p-label-3); }

  /* ── Achievement / streak toast ── */
  .pet-ach-toast {
    position: absolute; top: 14px; left: 50%; transform: translateX(-50%);
    z-index: 60; display: flex; align-items: center; gap: 11px;
    padding: 11px 16px 11px 12px; border-radius: 16px; white-space: nowrap;
    background: var(--p-card);
    box-shadow: 0 12px 30px rgba(0,0,0,0.32), 0 0 0 0.5px var(--p-sep) inset;
    animation: pet-toast-in 0.4s cubic-bezier(0.34,1.56,0.64,1);
  }
  @keyframes pet-toast-in { from { opacity: 0; transform: translate(-50%, -14px); } to { opacity: 1; transform: translate(-50%, 0); } }
  .pet-ach-toast-icon {
    width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0;
    display: inline-flex; align-items: center; justify-content: center;
    background: color-mix(in srgb, var(--p-gold) 22%, transparent); color: var(--p-gold);
  }
  .pet-ach-toast-label { font-size: 10px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--p-label-2); }
  .pet-ach-toast-name { font-size: 14px; font-weight: 700; color: var(--p-label); letter-spacing: -0.01em; }

  /* ── Berry Catch mini-game ── */
  .bc-intro {
    display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center;
    padding: 24px 12px 16px;
  }
  .bc-intro-icon {
    width: 72px; height: 72px; border-radius: 50%; color: #fff;
    display: inline-flex; align-items: center; justify-content: center;
    background: radial-gradient(circle at 50% 35%, #ff8a7d, #c2453f);
  }
  .bc-intro-title { font-size: 17px; font-weight: 700; color: var(--p-label); letter-spacing: -0.01em; max-width: 280px; }
  .bc-intro-sub { font-size: 12.5px; font-weight: 500; color: var(--p-label-2); max-width: 280px; line-height: 1.5; }
  .bc-start {
    margin-top: 6px; padding: 13px 30px; border-radius: 999px; cursor: pointer; border: none; font-family: inherit;
    font-size: 15px; font-weight: 600; color: #fff; background: var(--p-accent);
  }
  .bc-start:active { transform: scale(0.97); }
  .bc-start.ghost { background: var(--p-surface-2); color: var(--p-label); }
  .bc-field {
    position: relative; height: 320px; border-radius: 18px; overflow: hidden;
    background: radial-gradient(120% 90% at 50% 0%, color-mix(in srgb, var(--p-accent) 10%, transparent), transparent 60%), var(--p-surface);
  }
  .bc-score {
    position: absolute; top: 10px; left: 12px; z-index: 2;
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 14px; font-weight: 800; color: var(--p-gold); font-variant-numeric: tabular-nums;
    background: rgba(0,0,0,0.3); padding: 5px 11px; border-radius: 999px;
  }
  .bc-berry {
    position: absolute; transform: translate(-50%, -50%);
    width: 44px; height: 44px; border-radius: 50%; cursor: pointer; border: none;
    display: inline-flex; align-items: center; justify-content: center;
    background: rgba(239,68,68,0.18); color: #ef5350; padding: 0;
    animation: bc-pop 0.18s ease, bc-bob 1.15s ease-in-out infinite 0.18s;
  }
  .bc-berry.gold { background: rgba(247,207,107,0.22); color: var(--p-gold); width: 50px; height: 50px; }
  @keyframes bc-pop { from { transform: translate(-50%, -50%) scale(0.2); opacity: 0; } to { transform: translate(-50%, -50%) scale(1); opacity: 1; } }
  @keyframes bc-bob { 0%,100% { margin-top: 0; } 50% { margin-top: -5px; } }

  /* ── Eevee evolution chooser ── */
  .pet-eevee-sub { font-size: 12.5px; font-weight: 500; color: var(--p-label-2); margin-bottom: 12px; line-height: 1.5; }
  .pet-eevee-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .pet-eevee-card {
    display: flex; flex-direction: column; align-items: center; gap: 2px;
    padding: 8px 4px 10px; border-radius: 16px; cursor: pointer; border: none; font-family: inherit;
    background: var(--p-surface); transition: transform 0.18s, background 0.2s;
  }
  .pet-eevee-card:hover { background: var(--p-surface-2); transform: translateY(-3px); }
  .pet-eevee-card:active { transform: scale(0.95); }
  .pet-eevee-name { font-size: 11px; font-weight: 600; color: var(--p-label); text-transform: capitalize; letter-spacing: -0.01em; }
  @media (max-width: 460px) { .pet-eevee-grid { grid-template-columns: repeat(3, 1fr); } }

  /* ── Settings rows ── */
  .pet-setting-row {
    display: flex; align-items: center; gap: 12px; width: 100%;
    padding: 14px 14px; border-radius: 16px; cursor: pointer; border: none; font-family: inherit;
    background: var(--p-surface); color: var(--p-label); margin-bottom: 8px;
    transition: background 0.2s;
  }
  .pet-setting-row:hover { background: var(--p-surface-2); }
  .pet-setting-row.danger { color: #ff6961; }
  .pet-setting-ic { display: inline-flex; color: var(--p-label-2); }
  .pet-setting-row.danger .pet-setting-ic { color: #ff6961; }
  .pet-setting-label { flex: 1; text-align: left; font-size: 14px; font-weight: 600; letter-spacing: -0.01em; }
  .pet-toggle {
    width: 46px; height: 28px; border-radius: 999px; background: var(--p-surface-2); flex-shrink: 0;
    position: relative; transition: background 0.2s;
  }
  .pet-toggle.on { background: #34c759; }
  .pet-toggle-knob {
    position: absolute; top: 3px; left: 3px; width: 22px; height: 22px; border-radius: 50%;
    background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.3); transition: transform 0.2s;
  }
  .pet-toggle.on .pet-toggle-knob { transform: translateX(18px); }

  /* ── While you were away ── */
  .pet-away-hero { display: flex; align-items: center; gap: 14px; padding: 4px 4px 14px; }
  .pet-away-msg { font-size: 14px; font-weight: 700; color: var(--p-label); line-height: 1.4; letter-spacing: -0.01em; }
  .pet-away-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 12px; }
  .pet-away-stat {
    display: flex; flex-direction: column; align-items: center; gap: 4px;
    padding: 12px 4px; border-radius: 14px; background: var(--p-surface);
  }
  .pet-away-drop { font-size: 13px; font-weight: 800; color: var(--p-label-2); font-variant-numeric: tabular-nums; }
  .pet-away-reward {
    display: flex; align-items: center; justify-content: center; gap: 7px;
    padding: 12px; border-radius: 14px; margin-bottom: 14px;
    background: color-mix(in srgb, var(--p-gold) 16%, transparent); color: var(--p-gold);
    font-size: 13.5px; font-weight: 700; letter-spacing: -0.01em;
  }

  /* ── Onboarding ── */
  .pet-intro-hero { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 4px; padding: 6px 0 16px; }
  .pet-intro-title { font-size: 20px; font-weight: 800; color: var(--p-label); letter-spacing: -0.02em; margin-top: 4px; }
  .pet-intro-sub { font-size: 13px; font-weight: 500; color: var(--p-label-2); }
  .pet-intro-steps { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
  .pet-intro-step {
    display: flex; align-items: center; gap: 12px;
    padding: 13px 14px; border-radius: 14px; background: var(--p-surface);
    font-size: 13px; font-weight: 500; color: var(--p-label); line-height: 1.4; letter-spacing: -0.01em;
  }
  .pet-intro-ic {
    width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
    display: inline-flex; align-items: center; justify-content: center;
    background: color-mix(in srgb, var(--p-accent) 16%, transparent); color: var(--p-accent);
  }

  @media (max-width: 420px) {
    .pet-room { border-radius: 28px; }
    .pet-action-icon { font-size: 20px; }
    .pet-action-label { font-size: 9px; }
    .pet-stage { height: 270px; }
  }

  @media (prefers-reduced-motion: reduce) {
    .pet-buddy.pose-idle, .pet-buddy.pose-walk { animation: none; }
    .pet-evo-flash { animation: none; opacity: 0; }
    .pet-edit-room { animation: none; }
    .rs-snow, .rs-balloon, .rs-leaf, .rw-star, .rw-snow { animation: none; }
  }
`;
