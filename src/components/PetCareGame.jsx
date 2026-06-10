// ─── PetCareGame — เลี้ยงโปเกมอน (Tamagotchi-style buddy raiser) ───
//
// Adopt a starter (every generation) plus Pikachu & Eevee, then raise it:
// feed, play, rest, bathe and pet it. Stats decay in real time (persisted
// via timestamps), caring earns EXP, and your buddy LEVELS UP and EVOLVES.
// Cute 8-bit animated sprites (gen-5 Black/White) with pixel fallback.

import { useState, useEffect, useRef, useCallback } from "react";
import { useModalLifecycle } from "../perfUtils.js";
import { CRY_URL } from "../data.js";
import { PixelArt, FURNITURE, FURNITURE_BY_ID, FURNITURE_CATS } from "./pixelFurniture.jsx";
import {
  FOOD, QUESTS, COIN_EVENT, FOOD_EVENT, QUEST_EVENT,
  readCoins, readFood, totalFood, consumeFood, buyFood,
  readQuests, questProgress, isClaimable, claimQuest, claimableCount,
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

// Evolution level thresholds per chain length
const evoThresholds = (len) => (len === 3 ? [5, 12] : [8]);
const stageForLevel = (chain, level) =>
  evoThresholds(chain.length).filter(thr => level >= thr).length;

// Current sprite id for a saved buddy (resolves the evolved stage)
export function buddySpriteId(save) {
  if (!save) return null;
  const chain = ROSTER_BY_BASE[save.base]?.chain ?? [save.base];
  return chain[Math.min(save.stage ?? 0, chain.length - 1)];
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
    const BW = 150; // buddy box width
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
            switchAt = ts + 900 + Math.random() * 2200;
          } else {
            walkModeRef.current = "walk";
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
      room: { ...DEFAULT_ROOM },
    });
    setRoaming(true); // pops out onto the page immediately after choosing
    playBuddyCry(entry.base); // greet with its cry
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

  const spawnParticles = (emoji, count = 6) => {
    const batch = Array.from({ length: count }).map(() => {
      const id = partIdRef.current++;
      return {
        id, emoji,
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

  // ─── Care core (shared by all care actions) ───
  const applyCare = (a) => {
    if (!pet || evolving) return;
    const chain = ROSTER_BY_BASE[pet.base]?.chain ?? [pet.base];
    const stats = { ...pet.stats };
    for (const k in a.d) stats[k] = clamp(stats[k] + a.d[k]);

    let level = pet.level, exp = pet.exp + a.exp, stage = pet.stage, leveled = false;
    while (exp >= expForNext(level)) { exp -= expForNext(level); level += 1; leveled = true; }
    const newStage = stageForLevel(chain, level);
    const evolved = newStage > stage;
    stage = newStage;

    spawnParticles(a.emoji, a.count ?? 6);
    pose(a.pose, a.ms);
    if (a.cry) playBuddyCry(buddySpriteId(pet));

    if (evolved) { setEvolving(true); setTimeout(() => setEvolving(false), 2600); }
    else if (leveled) { setLevelFlash(true); setTimeout(() => setLevelFlash(false), 1200); }

    setPet(prev => prev && ({ ...prev, stats, level, exp, stage, lastTick: Date.now() }));
  };

  // Non-food actions
  const doAction = (kind) => {
    const TABLE = {
      play: { d: { happy: +25, energy: -12 }, exp: 18, emoji: "🎾", pose: "bounce", ms: 700 },
      rest: { d: { energy: +35, hunger: -6 }, exp: 8,  emoji: "💤", pose: "sleep",  ms: 1400 },
      bath: { d: { clean: +42 },              exp: 10, emoji: "🫧", pose: "bounce", ms: 700 },
      pat:  { d: { happy: +12 },              exp: 6,  emoji: "❤️", pose: "wiggle", ms: 700, cry: true, count: 4 },
    };
    if (TABLE[kind]) applyCare(TABLE[kind]);
  };

  // Feed using a food item from the inventory (different tiers = different hunger)
  const feedWith = (tierKey) => {
    if (!pet || evolving) return;
    const restored = consumeFood(tierKey); // also updates inventory + fires event
    if (restored <= 0) return;
    applyCare({ d: { hunger: +restored }, exp: Math.round(8 + restored / 4), emoji: "🍴", pose: "bounce", ms: 700 });
    setShowFood(false);
  };

  const releaseBuddy = () => {
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
          <button className="pet-close" onClick={onClose}>✕</button>
          <div className="pet-adopt-head">
            <div className="pet-adopt-title">
              🥚 {t("เลือกเพื่อนซี้ของคุณ", "Choose Your Buddy", "バディを選ぼう")}
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
                  {entry.gen === "★" ? "★" : `G${entry.gen}`}
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
  const curId = chain[Math.min(pet.stage, chain.length - 1)];
  const nextEvoLevel = (() => {
    const thr = evoThresholds(chain.length);
    return thr[pet.stage] ?? null; // next threshold or null if final
  })();

  const stats = pet.stats;
  const wellbeing = Math.round((stats.hunger + stats.happy + stats.energy + stats.clean) / 4);

  // Mood derivation
  const mood = (() => {
    if (stats.energy < 20) return { key: "sleepy", emoji: "😴", color: "#818cf8",
      msg: t("ง่วงแล้ว... พักหน่อยนะ", "So sleepy... let me rest", "眠いよ…休ませて") };
    if (stats.hunger < 20) return { key: "hungry", emoji: "🍽️", color: "#fb923c",
      msg: t("หิวจังเลย ขออาหารหน่อย!", "I'm hungry! Feed me please", "おなかすいた！ごはんちょうだい") };
    if (stats.clean < 20)  return { key: "dirty", emoji: "💧", color: "#38bdf8",
      msg: t("ตัวเลอะแล้ว อยากอาบน้ำ~", "I'm dirty... bath time?", "よごれちゃった…おふろ入りたい") };
    if (stats.happy < 25)  return { key: "sad", emoji: "😢", color: "#94a3b8",
      msg: t("เหงาจัง มาเล่นด้วยกันมั้ย", "I'm lonely... play with me?", "さみしいよ…遊んで") };
    if (wellbeing > 75)    return { key: "love", emoji: "🥰", color: "#f472b6",
      msg: t("รักนะ! มีความสุขมากเลย", "I love you! So happy~", "だいすき！しあわせ～") };
    return { key: "happy", emoji: "😄", color: "#34d399",
      msg: t("สบายดี เล่นกันเถอะ!", "Feeling great! Let's play", "げんき！あそぼう") };
  })();

  const ageDays = Math.max(0, Math.floor((now - pet.bornAt) / 86400000));
  const ageHours = Math.max(0, Math.floor((now - pet.bornAt) / 3600000));

  const STAT_ROWS = [
    { key: "hunger", icon: "🍖", label: t("ความอิ่ม","Hunger","まんぷく"),  color: "#fb923c", val: stats.hunger },
    { key: "happy",  icon: "💖", label: t("ความสุข","Happiness","しあわせ"), color: "#f472b6", val: stats.happy },
    { key: "energy", icon: "⚡", label: t("พลังงาน","Energy","げんき"),    color: "#fbbf24", val: stats.energy },
    { key: "clean",  icon: "🛁", label: t("ความสะอาด","Clean","きれい"),   color: "#38bdf8", val: stats.clean },
  ];

  const ACTIONS = [
    { kind: "feed", icon: "🍎", label: t("ให้อาหาร","Feed","ごはん"),  color: "#fb923c" },
    { kind: "play", icon: "🎾", label: t("เล่น","Play","あそぶ"),      color: "#34d399" },
    { kind: "bath", icon: "🛁", label: t("อาบน้ำ","Bath","おふろ"),     color: "#38bdf8" },
    { kind: "rest", icon: "💤", label: t("พักผ่อน","Rest","ねる"),      color: "#818cf8" },
    { kind: "pat",  icon: "❤️", label: t("ลูบหัว","Pet","なでる"),     color: "#f472b6" },
  ];

  return (
    <div className="pet-overlay">
      <style>{PET_CSS}</style>

      <div className="pet-room">
        {/* Top bar */}
        <div className="pet-topbar">
          <button className="pet-icon-btn" onClick={onClose} title={t("ปิด","Close","閉じる")}>✕</button>
          <div className="pet-name-pill">
            <span style={{ fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {localName(curId, ROSTER_BY_BASE[pet.base]?.en)}
            </span>
            <span className="pet-lvl">Lv.{pet.level}</span>
          </div>
          <div className="pet-coins" title={t("เหรียญ","Coins","コイン")}>🪙 {coins}</div>
          <button className="pet-icon-btn danger" onClick={releaseBuddy} title={t("ปล่อยคืนธรรมชาติ","Release buddy","にがす")}>
            🔄
          </button>
        </div>

        {/* Quick access: missions + shop */}
        {!editingRoom && (
          <div className="pet-hub-row">
            <button className="pet-hub-btn quests" onClick={() => setShowQuests(true)}>
              📋 {t("ภารกิจ","Missions","ミッション")}
              {claimableCount() > 0 && <span className="pet-hub-badge">{claimableCount()}</span>}
            </button>
            <button className="pet-hub-btn shop" onClick={() => setShowShop(true)}>
              🛒 {t("ร้านอาหาร","Food Shop","ショップ")}
            </button>
          </div>
        )}

        {/* Wellbeing + age */}
        {!editingRoom && (
        <div className="pet-meta-row">
          <div className="pet-care-meter" title={t("สุขภาพรวม","Overall wellbeing","総合コンディション")}>
            <span style={{ fontSize: 13 }}>{wellbeing > 75 ? "💚" : wellbeing > 40 ? "💛" : "❤️‍🩹"}</span>
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
          <div className="pet-age">
            ⏳ {ageDays >= 1 ? `${ageDays} ${t("วัน","d","日")}` : `${ageHours} ${t("ชม.","h","時")}`}
          </div>
        </div>
        )}

        {/* Stage / room */}
        <div className="pet-stage" ref={stageRef}>
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
                  zIndex: editingRoom ? 8 : 2 + Math.round(pos.yPct / 12),
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
                      onClick={() => removeItem(inst.uid)}>✕</button>
                  </div>
                )}
              </div>
            );
          })}

          {/* My-room button — clearly labelled, draws attention */}
          {!evolving && !editingRoom && (
            <button className="pet-edit-room" onClick={() => setEditingRoom(true)}>
              🛋️ {t("ห้องของฉัน","My Room","マイルーム")}
            </button>
          )}

          {/* Edit-mode hint */}
          {editingRoom && (
            <div className="pet-edit-hint">
              ✋ {t("ลากย้าย · −/+ ย่อขยาย · ✕ ลบ","Drag · −/+ resize · ✕ remove","ドラッグ · −/+ 拡縮 · ✕ 削除")}
            </div>
          )}

          {/* Mood bubble — emoji only (pets don't talk; they cry/emote) */}
          {!evolving && !editingRoom && (
            <div className="pet-bubble pet-bubble-emoji" style={{ borderColor: mood.color }}>
              {mood.emoji}
            </div>
          )}

          {/* Particles */}
          {particles.map(p => (
            <span key={p.id} className="pet-particle" style={{
              left: `${p.x}%`,
              "--dx": `${p.dx}px`,
              animationDelay: `${p.delay}s`,
            }}>{p.emoji}</span>
          ))}

          {/* Evolution flash */}
          {evolving && <div className="pet-evo-flash" />}
          {evolving && (
            <div className="pet-evo-text">
              ✨ {t("กำลังวิวัฒนาการ!","Evolving!","しんかちゅう！")} ✨
            </div>
          )}

          {/* Level-up badge */}
          {levelFlash && !evolving && (
            <div className="pet-levelup">⬆️ LEVEL UP!</div>
          )}

          {/* The buddy — walks around inside the room */}
          <div className="pet-walker" ref={walkerRef}>
            <div className={`pet-buddy pose-${actionPose ?? "idle"}${evolving ? " evolving" : ""}`}>
              <PetSprite key={curId} id={curId} size={150} flip={facing} />
              <div className="pet-shadow" />
            </div>
          </div>
        </div>

        {!editingRoom && (<>
        {/* Stat bars */}
        <div className="pet-stats">
          {STAT_ROWS.map(s => (
            <div key={s.key} className="pet-stat-row">
              <span className="pet-stat-icon">{s.icon}</span>
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

        {/* EXP / evolution progress */}
        <div className="pet-exp-wrap">
          <div className="pet-exp-track">
            <div className="pet-exp-fill" style={{ width: `${(pet.exp / expForNext(pet.level)) * 100}%` }} />
          </div>
          <div className="pet-exp-label">
            ⭐ EXP {pet.exp}/{expForNext(pet.level)}
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
              <span className="pet-action-icon">{a.icon}</span>
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
          onClick={() => setRoaming(r => !r)}>
          {roaming
            ? `🏠 ${t("เรียกน้องกลับบ้าน","Call buddy home","おうちに呼ぶ")}`
            : `🚶 ${t("ส่งน้องไปเดินเล่นหน้าอื่น","Let buddy roam the app","アプリで散歩させる")}`}
        </button>
        </>)}

        {/* ─── Room editor palette (theme + furniture) ─── */}
        {editingRoom && (
          <div className="pet-palette">
            <div className="pet-editor-head">
              <span>🛋️ {t("ห้องของฉัน","My Room","マイルーム")}</span>
              <button className="pet-editor-done" onClick={() => setEditingRoom(false)}>
                ✓ {t("เสร็จ","Done","完了")}
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
                <span>🍴 {t("ให้อาหาร","Feed","ごはん")}</span>
                <button className="pet-sheet-x" onClick={() => setShowFood(false)}>✕</button>
              </div>
              {totalFood(food) === 0 ? (
                <div className="pet-empty-msg">
                  {t("ไม่มีอาหารเลย! ทำภารกิจรับเหรียญแล้วไปซื้อที่ร้าน",
                     "No food! Do missions for coins, then buy some at the shop",
                     "食べ物がない！ミッションでコインを集めてショップで購入")}
                  <button className="pet-shop-link" onClick={() => { setShowFood(false); setShowShop(true); }}>
                    🛒 {t("ไปร้านค้า","Open Shop","ショップへ")}
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
                        <span className="pet-food-sub">🍖 +{fd.hunger}</span>
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
                <span>🛒 {t("ร้านอาหาร","Food Shop","ショップ")}</span>
                <span className="pet-coins">🪙 {coins}</span>
                <button className="pet-sheet-x" onClick={() => setShowShop(false)}>✕</button>
              </div>
              <div className="pet-food-list">
                {FOOD.map(fd => (
                  <div key={fd.key} className="pet-food-item shop">
                    <img src={ITEM_SPRITE(fd.slug)} alt="" className="pet-food-img" />
                    <div className="pet-food-info">
                      <span className="pet-food-name">{lang === "th" ? fd.th : fd.en}</span>
                      <span className="pet-food-sub">🍖 +{fd.hunger} · {t("มี","own","所持")} ×{food[fd.key] || 0}</span>
                    </div>
                    <button className="pet-buy-btn" disabled={coins < fd.price}
                      onClick={() => buyFood(fd.key)}>
                      🪙 {fd.price}
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
                <span>📋 {t("ภารกิจวันนี้","Daily Missions","デイリー")}</span>
                <span className="pet-coins">🪙 {coins}</span>
                <button className="pet-sheet-x" onClick={() => setShowQuests(false)}>✕</button>
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
                        <div className="pet-quest-name">
                          {claimed ? "✅ " : done ? "🎁 " : "• "}{lang === "th" ? q.th : q.en}
                        </div>
                        <div className="pet-quest-bar">
                          <div className="pet-quest-fill" style={{ width: `${(prog / q.goal) * 100}%` }} />
                        </div>
                        <div className="pet-quest-prog">{Math.min(prog, q.goal)}/{q.goal}</div>
                      </div>
                      <button className="pet-claim-btn" disabled={!canClaim}
                        onClick={() => claimQuest(q.id)}>
                        {claimed ? t("รับแล้ว","Done","完了") : `🪙 ${q.coins}`}
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="pet-quest-hint">
                💡 {t("ดูโปเกมอนในเว็บเพื่อสะสมภารกิจ — ยิ่งดูเยอะยิ่งจำหน้าได้!",
                      "View Pokémon around the app to progress — learn their faces!",
                      "アプリでポケモンを見てミッションを進めよう！")}
              </div>
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
    position: fixed; inset: 0; z-index: 9500;
    background: radial-gradient(ellipse at top, rgba(30,27,75,0.96), rgba(2,6,23,0.98));
    display: flex; align-items: center; justify-content: center;
    padding: 16px; overflow-y: auto;
    animation: pet-fade 0.3s ease;
  }
  @keyframes pet-fade { from { opacity: 0; } to { opacity: 1; } }

  .pet-close {
    position: absolute; top: 14px; right: 14px;
    width: 36px; height: 36px; border-radius: 50%;
    background: rgba(15,23,42,0.6); border: 1.5px solid rgba(255,255,255,0.18);
    color: rgba(255,255,255,0.8); font-size: 14px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    backdrop-filter: blur(8px); z-index: 5;
  }
  .pet-close:hover { background: rgba(30,41,59,0.85); color: #fff; }

  /* ── Adoption ── */
  .pet-adopt {
    background: linear-gradient(160deg, #1e1b4b 0%, #312e81 100%);
    border-radius: 24px; padding: 26px 22px;
    max-width: 760px; width: 100%; max-height: 90vh; overflow-y: auto;
    position: relative; color: white;
    box-shadow: 0 30px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1) inset;
    animation: pet-pop 0.4s cubic-bezier(0.34,1.56,0.64,1);
  }
  @keyframes pet-pop { from { opacity:0; transform: scale(0.92); } to { opacity:1; transform: scale(1); } }
  .pet-adopt-head { text-align: center; margin-bottom: 18px; }
  .pet-adopt-title {
    font-size: 24px; font-weight: 900; letter-spacing: -0.01em;
    background: linear-gradient(135deg, #fde047, #ec4899);
    -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
  }
  .pet-adopt-sub { font-size: 12px; color: rgba(196,181,253,0.85); font-weight: 600; margin-top: 4px; }
  .pet-adopt-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(108px, 1fr)); gap: 10px;
  }
  .pet-adopt-card {
    position: relative; background: rgba(15,23,42,0.5);
    border: 1.5px solid rgba(255,255,255,0.08); border-radius: 16px;
    padding: 8px 6px 10px; cursor: pointer; color: white; font-family: inherit;
    transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s, border-color 0.25s;
    display: flex; flex-direction: column; align-items: center; gap: 2px;
  }
  .pet-adopt-card:hover {
    transform: translateY(-5px) scale(1.04);
    border-color: rgba(168,85,247,0.6);
    box-shadow: 0 12px 28px rgba(0,0,0,0.4), 0 0 22px rgba(168,85,247,0.4);
  }
  .pet-adopt-sprite {
    width: 84px; height: 84px; display: flex; align-items: flex-end; justify-content: center;
    filter: drop-shadow(0 4px 6px rgba(0,0,0,0.4));
  }
  .pet-adopt-name {
    font-size: 11px; font-weight: 800; text-align: center; line-height: 1.15;
    color: rgba(255,255,255,0.92);
  }
  .pet-gen-badge {
    position: absolute; top: 6px; left: 6px;
    font-size: 9px; font-weight: 900; letter-spacing: 0.3px;
    padding: 2px 6px; border-radius: 999px;
    background: rgba(168,85,247,0.25); color: #d8b4fe;
    border: 1px solid rgba(168,85,247,0.4);
  }
  .pet-gen-badge.star { background: rgba(251,191,36,0.22); color: #fcd34d; border-color: rgba(251,191,36,0.45); }

  /* ── Care room ── */
  .pet-room {
    background: linear-gradient(180deg, #2a2055 0%, #1a1840 45%, #14304a 100%);
    border-radius: 26px; padding: 16px 18px 20px;
    max-width: 440px; width: 100%; position: relative; color: white;
    box-shadow: 0 30px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.08) inset;
    animation: pet-pop 0.4s cubic-bezier(0.34,1.56,0.64,1);
    overflow: hidden;
  }
  .pet-topbar { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
  .pet-icon-btn {
    width: 36px; height: 36px; border-radius: 12px; flex-shrink: 0;
    background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.14);
    color: rgba(255,255,255,0.85); font-size: 15px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: transform 0.2s, background 0.2s, border-color 0.2s, color 0.2s;
  }
  .pet-icon-btn:hover { background: rgba(255,255,255,0.16); color: #fff; }
  .pet-icon-btn:active { transform: scale(0.92); }
  .pet-icon-btn.danger:hover {
    background: rgba(239,68,68,0.2); border-color: rgba(239,68,68,0.5); color: #fecaca;
    transform: rotate(-20deg);
  }
  .pet-name-pill {
    display: flex; align-items: center; gap: 8px; font-size: 15px;
    background: rgba(0,0,0,0.3); padding: 7px 14px; border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.12); flex: 1; justify-content: center;
    min-width: 0;
  }
  .pet-name-pill > span:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pet-lvl {
    font-size: 11px; font-weight: 900; color: #fcd34d; flex-shrink: 0;
    background: rgba(251,191,36,0.15); padding: 2px 8px; border-radius: 999px;
    border: 1px solid rgba(251,191,36,0.35);
  }

  .pet-meta-row { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
  .pet-care-meter {
    flex: 1; display: flex; align-items: center; gap: 7px;
    background: rgba(0,0,0,0.25); padding: 5px 10px; border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.08);
  }
  .pet-care-track { flex: 1; height: 7px; border-radius: 999px; background: rgba(255,255,255,0.1); overflow: hidden; }
  .pet-care-fill { height: 100%; border-radius: 999px; transition: width 0.5s ease, background 0.5s; }
  .pet-care-pct { font-size: 11px; font-weight: 800; min-width: 32px; text-align: right; }
  .pet-age {
    font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.75);
    background: rgba(0,0,0,0.25); padding: 5px 11px; border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.08); white-space: nowrap;
  }

  /* ── Stage (layered pixel room) ── */
  .pet-stage {
    position: relative; height: 230px;
    border-radius: 20px; margin-bottom: 12px;
    border: 1px solid rgba(255,255,255,0.08);
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
    position: absolute; top: 8px; right: 8px; z-index: 7;
    display: inline-flex; align-items: center; gap: 5px;
    padding: 6px 13px; border-radius: 999px; cursor: pointer;
    font-family: inherit; font-size: 11px; font-weight: 900; color: #fff;
    background: linear-gradient(135deg, #a855f7, #ec4899);
    border: 1.5px solid rgba(255,255,255,0.45);
    box-shadow: 0 4px 14px rgba(168,85,247,0.5);
    animation: pet-edit-pulse 2.6s ease-in-out infinite;
    transition: transform 0.18s;
  }
  .pet-edit-room:hover { transform: translateY(-2px) scale(1.04); }
  .pet-edit-room:active { transform: scale(0.95); }
  @keyframes pet-edit-pulse {
    0%, 100% { box-shadow: 0 4px 14px rgba(168,85,247,0.5); }
    50%       { box-shadow: 0 4px 14px rgba(168,85,247,0.55), 0 0 0 6px rgba(168,85,247,0.16); }
  }
  .pet-bubble {
    position: absolute; top: 12px; left: 50%; transform: translateX(-50%);
    background: rgba(255,255,255,0.95); color: #1e293b;
    font-size: 12px; font-weight: 700; padding: 7px 14px; border-radius: 14px;
    border: 2px solid; max-width: 86%; text-align: center; line-height: 1.3;
    box-shadow: 0 6px 18px rgba(0,0,0,0.3); z-index: 4;
    animation: pet-bubble-in 0.4s cubic-bezier(0.34,1.56,0.64,1);
  }
  .pet-bubble-emoji {
    font-size: 20px; padding: 6px 12px; line-height: 1;
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
    width: 90px; height: 16px; margin-top: -8px;
    background: radial-gradient(ellipse, rgba(0,0,0,0.45), transparent 70%);
    filter: blur(3px);
  }
  .pet-buddy.pose-idle   { animation: pet-idle 2.6s ease-in-out infinite; }
  .pet-buddy.pose-bounce { animation: pet-bounce 0.7s cubic-bezier(0.34,1.56,0.64,1); }
  .pet-buddy.pose-wiggle { animation: pet-wiggle 0.7s ease-in-out; }
  .pet-buddy.pose-sleep  { animation: pet-sleep 1.4s ease-in-out; }
  .pet-buddy.evolving    { animation: pet-evo-shake 0.4s linear infinite; }
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
    position: absolute; bottom: 70px; font-size: 22px; z-index: 5; pointer-events: none;
    animation: pet-particle 1.4s ease-out forwards;
  }
  @keyframes pet-particle {
    0% { opacity: 0; transform: translate(0,0) scale(0.5); }
    20% { opacity: 1; transform: translate(0,-10px) scale(1.1); }
    100% { opacity: 0; transform: translate(var(--dx,0), -110px) scale(0.9); }
  }

  /* ── Stat bars ── */
  .pet-stats { display: flex; flex-direction: column; gap: 7px; margin-bottom: 12px; }
  .pet-stat-row { display: flex; align-items: center; gap: 9px; }
  .pet-stat-icon { font-size: 15px; width: 20px; text-align: center; flex-shrink: 0; }
  .pet-stat-track {
    flex: 1; height: 11px; border-radius: 999px;
    background: rgba(0,0,0,0.35); overflow: hidden;
    border: 1px solid rgba(255,255,255,0.06);
  }
  .pet-stat-fill { height: 100%; border-radius: 999px; transition: width 0.45s ease, background 0.3s; }
  .pet-stat-val { font-size: 11px; font-weight: 800; min-width: 26px; text-align: right; font-variant-numeric: tabular-nums; }

  /* ── EXP ── */
  .pet-exp-wrap { margin-bottom: 14px; }
  .pet-exp-track {
    height: 8px; border-radius: 999px; background: rgba(0,0,0,0.35);
    overflow: hidden; border: 1px solid rgba(255,255,255,0.06);
  }
  .pet-exp-fill {
    height: 100%; border-radius: 999px;
    background: linear-gradient(90deg, #a855f7, #ec4899, #fbbf24);
    transition: width 0.5s ease;
  }
  .pet-exp-label { font-size: 10.5px; font-weight: 700; color: rgba(255,255,255,0.7); margin-top: 5px; text-align: center; }

  /* ── Actions ── */
  .pet-actions { display: grid; grid-template-columns: repeat(5, 1fr); gap: 7px; }
  .pet-action-btn {
    --ac: #fb923c;
    display: flex; flex-direction: column; align-items: center; gap: 4px;
    background: linear-gradient(165deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03));
    border: 1.5px solid color-mix(in srgb, var(--ac) 40%, transparent);
    border-radius: 14px; padding: 10px 4px; cursor: pointer; color: white;
    font-family: inherit; transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s, background 0.2s;
  }
  .pet-action-btn:hover:not(:disabled) {
    transform: translateY(-3px);
    background: linear-gradient(165deg, color-mix(in srgb, var(--ac) 30%, transparent), rgba(255,255,255,0.04));
    box-shadow: 0 8px 18px color-mix(in srgb, var(--ac) 40%, transparent);
  }
  .pet-action-btn:active:not(:disabled) { transform: scale(0.94); }
  .pet-action-btn:disabled { opacity: 0.45; cursor: default; }
  .pet-action-icon { font-size: 22px; }
  .pet-action-label { font-size: 9.5px; font-weight: 800; color: rgba(255,255,255,0.9); }

  .pet-roam-toggle {
    margin-top: 10px; width: 100%;
    padding: 10px 14px; border-radius: 13px; cursor: pointer;
    font-family: inherit; font-size: 12px; font-weight: 800; color: #fff;
    background: linear-gradient(135deg, rgba(56,189,248,0.18), rgba(99,102,241,0.18));
    border: 1.5px solid rgba(56,189,248,0.4);
    transition: transform 0.18s, box-shadow 0.2s, background 0.2s, border-color 0.2s;
  }
  .pet-roam-toggle:hover { transform: translateY(-2px); box-shadow: 0 8px 18px rgba(56,189,248,0.3); }
  .pet-roam-toggle:active { transform: scale(0.97); }
  .pet-roam-toggle.on {
    background: linear-gradient(135deg, rgba(52,211,153,0.22), rgba(16,185,129,0.18));
    border-color: rgba(52,211,153,0.5);
  }

  /* ── Room editor sheet ── */
  /* Editor palette — sits below the (still visible & draggable) room */
  .pet-palette {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px; padding: 12px 12px 14px; margin-top: 2px;
    animation: pet-editor-in 0.3s cubic-bezier(0.34,1.56,0.64,1);
  }
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
    background: rgba(15,23,42,0.92); color: #fff; border: 1.5px solid rgba(255,255,255,0.5);
    font-size: 12px; font-weight: 900; line-height: 1; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 2px 6px rgba(0,0,0,0.4);
  }
  .pet-placed-btn:active { transform: scale(0.88); }
  .pet-placed-btn.del { background: #ef4444; }
  /* Edit-mode hint banner */
  .pet-edit-hint {
    position: absolute; top: 8px; left: 50%; transform: translateX(-50%);
    z-index: 9; padding: 5px 12px; border-radius: 999px; white-space: nowrap;
    background: rgba(15,23,42,0.8); border: 1px solid rgba(255,255,255,0.18);
    color: #fff; font-size: 10.5px; font-weight: 700; backdrop-filter: blur(6px);
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
    font-size: 16px; font-weight: 900; color: #fff; margin-bottom: 14px;
  }
  .pet-editor-done {
    padding: 7px 16px; border-radius: 999px; cursor: pointer;
    font-family: inherit; font-size: 12px; font-weight: 900; color: #052e16;
    background: linear-gradient(135deg, #34d399, #10b981); border: none;
    box-shadow: 0 6px 16px rgba(16,185,129,0.4);
  }
  .pet-editor-done:active { transform: scale(0.95); }
  .pet-editor-label {
    font-size: 11px; font-weight: 800; letter-spacing: 0.5px;
    color: rgba(255,255,255,0.55); margin: 12px 0 8px;
    text-transform: uppercase;
  }
  .pet-theme-row { display: flex; gap: 8px; flex-wrap: wrap; }
  .pet-theme-chip {
    display: flex; flex-direction: column; align-items: center; gap: 4px;
    padding: 7px 6px 8px; min-width: 72px;
    border-radius: 13px; cursor: pointer; font-family: inherit;
    font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.85);
    background: rgba(255,255,255,0.05); border: 1.5px solid rgba(255,255,255,0.1);
    transition: transform 0.18s, border-color 0.2s, background 0.2s;
  }
  .pet-theme-chip:hover { transform: translateY(-2px); }
  .pet-theme-chip.active {
    background: rgba(56,189,248,0.18); border-color: rgba(56,189,248,0.6);
    box-shadow: 0 0 16px rgba(56,189,248,0.3);
  }
  .pet-cat-tabs {
    display: flex; gap: 6px; margin-bottom: 10px; flex-wrap: wrap;
  }
  .pet-cat-tab {
    flex: 1; min-width: 64px; padding: 7px 8px; border-radius: 999px; cursor: pointer;
    font-family: inherit; font-size: 11px; font-weight: 800;
    color: rgba(255,255,255,0.65);
    background: rgba(255,255,255,0.06); border: 1.5px solid rgba(255,255,255,0.1);
    transition: all 0.18s;
  }
  .pet-cat-tab:hover { color: #fff; }
  .pet-cat-tab.active {
    color: #fff; background: rgba(168,85,247,0.28);
    border-color: rgba(168,85,247,0.6); box-shadow: 0 0 14px rgba(168,85,247,0.3);
  }
  .pet-decor-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(82px, 1fr)); gap: 8px;
  }
  .pet-decor-chip-art {
    height: 52px; display: flex; align-items: flex-end; justify-content: center;
    filter: drop-shadow(0 2px 2px rgba(0,0,0,0.4));
  }
  .pet-decor-chip {
    display: flex; flex-direction: column; align-items: center; gap: 4px;
    padding: 8px 4px; border-radius: 13px; cursor: pointer; font-family: inherit;
    font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.85);
    background: rgba(255,255,255,0.05); border: 1.5px solid rgba(255,255,255,0.1);
    transition: transform 0.18s, border-color 0.2s, background 0.2s;
  }
  .pet-decor-chip:hover { transform: translateY(-2px); }
  .pet-decor-chip.active {
    background: rgba(236,72,153,0.18); border-color: rgba(236,72,153,0.6);
    box-shadow: 0 0 16px rgba(236,72,153,0.3);
  }

  /* ── Coins / hub / food badge ── */
  .pet-coins {
    display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0;
    font-size: 13px; font-weight: 900; color: #fde047;
    background: rgba(251,191,36,0.14); border: 1px solid rgba(251,191,36,0.4);
    padding: 5px 11px; border-radius: 999px;
  }
  .pet-hub-row { display: flex; gap: 8px; margin-bottom: 12px; }
  .pet-hub-btn {
    flex: 1; position: relative; padding: 9px; border-radius: 12px; cursor: pointer;
    font-family: inherit; font-size: 12px; font-weight: 800; color: #fff;
    border: 1.5px solid transparent; transition: transform 0.18s, box-shadow 0.2s;
  }
  .pet-hub-btn:hover { transform: translateY(-2px); }
  .pet-hub-btn.quests { background: rgba(99,102,241,0.22); border-color: rgba(99,102,241,0.5); }
  .pet-hub-btn.shop   { background: rgba(52,211,153,0.20); border-color: rgba(52,211,153,0.5); }
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
    background: rgba(2,6,20,0.7); backdrop-filter: blur(4px);
    display: flex; align-items: flex-end; justify-content: center;
    border-radius: 26px; overflow: hidden;
    animation: pet-fade 0.25s ease;
  }
  .pet-sheet {
    width: 100%; max-height: 92%; overflow-y: auto;
    background: linear-gradient(180deg, #1a1f3d, #11132a);
    border-radius: 22px 22px 26px 26px; padding: 14px 14px 16px;
    border-top: 1.5px solid rgba(255,255,255,0.12);
    animation: pet-editor-in 0.3s cubic-bezier(0.34,1.56,0.64,1);
  }
  .pet-sheet-x {
    width: 30px; height: 30px; border-radius: 50%; cursor: pointer;
    background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.18);
    color: #fff; font-size: 13px;
  }
  .pet-food-list { display: flex; flex-direction: column; gap: 8px; }
  .pet-food-item {
    display: flex; align-items: center; gap: 12px; width: 100%;
    padding: 9px 12px; border-radius: 14px; cursor: pointer; font-family: inherit;
    background: rgba(255,255,255,0.05); border: 1.5px solid rgba(255,255,255,0.1);
    color: #fff; transition: transform 0.15s, background 0.2s;
  }
  .pet-food-item:hover:not(:disabled) { transform: translateY(-2px); background: rgba(255,255,255,0.1); }
  .pet-food-item:disabled { opacity: 0.4; cursor: default; }
  .pet-food-item.shop { cursor: default; }
  .pet-food-img { width: 34px; height: 34px; object-fit: contain; image-rendering: pixelated; flex-shrink: 0; }
  .pet-food-info { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; flex: 1; }
  .pet-food-name { font-size: 13px; font-weight: 800; }
  .pet-food-sub { font-size: 10.5px; color: rgba(255,255,255,0.6); font-weight: 600; }
  .pet-food-count { font-size: 13px; font-weight: 900; color: #fb923c; }
  .pet-buy-btn {
    flex-shrink: 0; padding: 7px 13px; border-radius: 999px; cursor: pointer;
    font-family: inherit; font-size: 12px; font-weight: 900; color: #052e16; border: none;
    background: linear-gradient(135deg, #fde047, #f59e0b);
    box-shadow: 0 4px 12px rgba(245,158,11,0.4);
  }
  .pet-buy-btn:disabled { background: #475569; color: rgba(255,255,255,0.5); box-shadow: none; cursor: default; }
  .pet-empty-msg {
    text-align: center; color: rgba(255,255,255,0.7); font-size: 12.5px; font-weight: 600;
    line-height: 1.6; padding: 14px 8px; display: flex; flex-direction: column; gap: 12px; align-items: center;
  }
  .pet-shop-link {
    padding: 9px 18px; border-radius: 999px; cursor: pointer; border: none; font-family: inherit;
    font-size: 13px; font-weight: 900; color: #052e16;
    background: linear-gradient(135deg, #34d399, #10b981); box-shadow: 0 4px 14px rgba(16,185,129,0.4);
  }
  /* missions */
  .pet-quest-list { display: flex; flex-direction: column; gap: 8px; }
  .pet-quest {
    display: flex; align-items: center; gap: 10px;
    padding: 9px 12px; border-radius: 14px;
    background: rgba(255,255,255,0.05); border: 1.5px solid rgba(255,255,255,0.1);
  }
  .pet-quest.claimed { opacity: 0.55; }
  .pet-quest-main { flex: 1; display: flex; flex-direction: column; gap: 5px; min-width: 0; }
  .pet-quest-name { font-size: 12.5px; font-weight: 800; color: #fff; }
  .pet-quest-bar { height: 6px; border-radius: 999px; background: rgba(0,0,0,0.35); overflow: hidden; }
  .pet-quest-fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg,#818cf8,#a855f7); transition: width 0.4s; }
  .pet-quest-prog { font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.55); }
  .pet-claim-btn {
    flex-shrink: 0; padding: 8px 14px; border-radius: 999px; cursor: pointer; border: none; font-family: inherit;
    font-size: 12px; font-weight: 900; color: #052e16;
    background: linear-gradient(135deg, #fde047, #f59e0b); box-shadow: 0 4px 12px rgba(245,158,11,0.4);
  }
  .pet-claim-btn:disabled { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.4); box-shadow: none; cursor: default; }
  .pet-quest-hint {
    margin-top: 12px; padding: 10px 12px; border-radius: 12px;
    background: rgba(99,102,241,0.12); border: 1px dashed rgba(129,140,248,0.4);
    font-size: 11px; font-weight: 600; color: rgba(199,210,254,0.9); line-height: 1.5;
  }

  @media (max-width: 420px) {
    .pet-action-icon { font-size: 19px; }
    .pet-action-label { font-size: 8.5px; }
    .pet-stage { height: 200px; }
  }

  @media (prefers-reduced-motion: reduce) {
    .pet-buddy.pose-idle { animation: none; }
    .pet-evo-flash { animation: none; opacity: 0; }
    .pet-edit-room { animation: none; }
    .rs-snow, .rs-balloon, .rs-leaf, .rw-star, .rw-snow { animation: none; }
  }
`;
