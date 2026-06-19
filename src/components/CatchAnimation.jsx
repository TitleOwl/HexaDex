import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  X, Cherry, Ban, Target, Star, Sparkles, ThumbsUp, Tornado, Trophy,
  HelpCircle, Footprints, GraduationCap, Play, ArrowUp, Zap,
  MapPin, Lightbulb, Unlock,
} from "lucide-react";
import Catch3DPokemon from "./Catch3DPokemon.jsx";
import CatchBattleMusic from "./CatchBattleMusic.jsx";
import BiomeScene from "./BiomeScene.jsx";
import { catchSounds } from "../catchSounds.js";
import { useWeather } from "../useWeather.js";

// Derive a time-of-day bucket from local time, honouring weather.isDay
function calcTimeOfDay(weather) {
  const h = new Date().getHours();
  if (weather && weather.isDay === false) {
    if (h >= 17 && h < 20) return "dusk";
    if (h >= 4  && h < 7)  return "dawn";
    return "night";
  }
  if (h >= 5  && h < 8)  return "dawn";
  if (h >= 8  && h < 17) return "day";
  if (h >= 17 && h < 20) return "dusk";
  return "night";
}

// ═══════════════════════════════════════════════════════════
// CatchAnimation v7 — Pokemon GO-style Fullscreen Encounter
// • Fullscreen overlay with grass landscape background
// • Big 3D Pokemon standing on grass (center stage)
// • Header pill: Name + CP/level
// • Bottom: Berry (left) + Big Pokeball (center, draggable) + Ball selector (right)
// • Pokemon SHRINKS into ball on suckIn
// • Pure drag minigame, no buttons to "throw"
// ═══════════════════════════════════════════════════════════

const ITEM_BASE = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items";

// ─── Pokéball Catalog (27 balls) ────────────────────────────
const POKEBALLS = [
  { id:"poke-ball",    name:"Poké Ball",    rate: 1.0,  glow:"#ee1515",
    effect:{ th:"จับ ×1", en:"Catch ×1" },
    desc:{ th:"บอลพื้นฐาน ใช้ได้ทั่วไป", en:"The standard ball for everyday catches." },
    effectFull:{ th:"อัตราจับมาตรฐาน ×1", en:"Standard catch rate ×1" },
    unlock:{ th:"เลเวล 1", en:"Level 1" },
    obtain:{ th:"หมุน PokéStop / ยิม และรางวัลเลเวลอัป", en:"PokéStop & Gym spins, level-up rewards" } },
  { id:"great-ball",   name:"Great Ball",   rate: 1.5,  glow:"#900603",
    effect:{ th:"จับ ×1.5", en:"Catch ×1.5" },
    desc:{ th:"โอกาสจับดีกว่าบอลธรรมดา", en:"Better catch rate than a Poké Ball." },
    effectFull:{ th:"อัตราจับ ×1.5", en:"Catch rate ×1.5" },
    unlock:{ th:"เลเวล 12", en:"Level 12" },
    obtain:{ th:"หมุน PokéStop / ยิม, รางวัลเลเวลอัป, ภารกิจวิจัย", en:"Spins, level-up rewards, Research" } },
  { id:"ultra-ball",   name:"Ultra Ball",   rate: 2.0,  glow:"#facc15",
    effect:{ th:"จับ ×2", en:"Catch ×2" },
    desc:{ th:"โอกาสจับสูง เหมาะกับตัวจับยาก", en:"High catch rate for tougher Pokémon." },
    effectFull:{ th:"อัตราจับ ×2", en:"Catch rate ×2" },
    unlock:{ th:"เลเวล 20", en:"Level 20" },
    obtain:{ th:"หมุน PokéStop / ยิม, รางวัลเลเวลอัป, ภารกิจวิจัย", en:"Spins, level-up rewards, Research" },
    tip:{ th:"เก็บไว้ใช้กับตัวหายาก/CP สูง", en:"Save for rare or high-CP encounters" } },
  { id:"master-ball",  name:"Master Ball",  rate: 255,  glow:"#b5302d",
    effect:{ th:"จับ 100%", en:"100% Catch" },
    desc:{ th:"จับติดแน่นอน 100% หายากมาก", en:"Catches any Pokémon without fail. Very rare." },
    effectFull:{ th:"จับสำเร็จ 100% กับทุกตัว", en:"Guaranteed catch on any Pokémon" },
    unlock:{ th:"—", en:"—" },
    obtain:{ th:"ภารกิจวิจัยพิเศษ และรางวัลหายาก", en:"Special Research and rare rewards" },
    tip:{ th:"เก็บไว้ใช้กับตัวในตำนานที่หนีง่าย", en:"Best saved for hard-to-catch Legendaries" } },
  { id:"premier-ball", name:"Premier Ball", rate: 1.0,  glow:"#dc2626",
    effect:{ th:"จับ ×1", en:"Catch ×1" },
    desc:{ th:"บอลพิเศษจาก Raid (อัตราเท่า Poké Ball)", en:"Special Raid ball (same rate as a Poké Ball)." },
    effectFull:{ th:"อัตราจับ ×1 — ใช้จับบอสหลังชนะ Raid / Max Battle / กู้ Shadow", en:"Catch rate ×1 — used for Raid, Max Battle & Shadow rescue catches" },
    unlock:{ th:"—", en:"—" },
    obtain:{ th:"ได้จากการชนะ Raid Battle และโบนัสพิเศษ", en:"Earned from Raid Bonus Challenges and special battles" },
    tip:{ th:"ซื้อไม่ได้ ที่เหลือถูกทิ้งหลังจบ", en:"Can't be bought; leftovers are discarded afterward" } },
  { id:"beast-ball",   name:"Beast Ball",   rate: 4.0,  glow:"#0891b2",
    effect:{ th:"จับ Ultra Beast", en:"Ultra Beasts" },
    desc:{ th:"ใช้จับ Ultra Beasts โดยเฉพาะ โอกาสจับสูงมาก", en:"Used to catch Ultra Beasts — very high catch rate." },
    effectFull:{ th:"อัตราจับสูงมาก (วงแหวนเป้าเป็นสีส้มเสมอ)", en:"Very high catch rate (target ring defaults to orange)" },
    unlock:{ th:"—", en:"—" },
    obtain:{ th:"แจกเฉพาะการเจอ Ultra Beasts ในอีเวนต์ (เช่น GO Fest)", en:"Given only at Ultra Beast encounters (e.g., GO Fest events)" },
    tip:{ th:"ที่เหลือถูกทิ้งหลังจบการจับ (เหมือน Premier Ball)", en:"Leftovers are discarded after the attempt (like Premier Balls)" } },
  { id:"safari-ball",  name:"GO Safari Ball", rate: 3.5, glow:"#22c55e",
    effect:{ th:"จับสูง (อีเวนต์)", en:"High (Event)" },
    desc:{ th:"บอลพิเศษเฉพาะอีเวนต์ โอกาสจับสูง", en:"Special event-only ball with a high catch rate." },
    effectFull:{ th:"อัตราจับสูง (เฉพาะช่วง/สถานที่ของอีเวนต์)", en:"High catch rate (during the event / at its location)" },
    unlock:{ th:"—", en:"—" },
    obtain:{ th:"แจกเฉพาะกิจกรรม GO Safari / อีเวนต์พิเศษ", en:"Given only during GO Safari / special events" },
    tip:{ th:"ที่เหลือถูกทิ้งเมื่อจบอีเวนต์ · จับแล้วโอนเข้า HOME ไม่ได้", en:"Leftovers discarded after the event; catches can't transfer to HOME" } },
];

// ─── Berries (5, Pokemon GO style) ──────────────────────────
const BERRIES = [
  { id:"razz-berry",   name:"Razz",         nameLong:"Razz Berry",          mult:1.5, color:"#ec4899", shape:"razz",
    effect:{ th:"จับ ×1.5", en:"Catch ×1.5" },
    desc:{ th:"ทำให้โปเกมอนจับง่ายขึ้น", en:"Makes a Pokémon easier to catch." },
    effectFull:{ th:"เพิ่มโอกาสจับสำเร็จ 1.5 เท่า", en:"Raises catch chance by 1.5×" },
    unlock:{ th:"เลเวล 8", en:"Level 8" },
    obtain:{ th:"หมุน PokéStop / ยิม และรางวัลเลเวลอัป", en:"PokéStop & Gym spins, level-up rewards" } },
  { id:"nanab-berry",  name:"Nanab",        nameLong:"Nanab Berry",         mult:1.0, color:"#f472b6", shape:"nanab",
    effect:{ th:"สงบลง", en:"Calming" },
    desc:{ th:"ทำให้โปเกมอนเคลื่อนไหวและโจมตีช้าลง เล็งง่ายขึ้น", en:"Calms a Pokémon so it moves & attacks less — easier to aim." },
    effectFull:{ th:"ชะลอการเคลื่อนไหว เล็งง่ายขึ้นในครั้งถัดไป", en:"Slows movement so it's easier to aim" },
    unlock:{ th:"เลเวล 4", en:"Level 4" },
    obtain:{ th:"หมุน PokéStop / ยิม และรางวัลเลเวลอัป", en:"PokéStop & Gym spins, level-up rewards" },
    tip:{ th:"เหมาะกับตัวที่ขยับเร็ว/ลอยไปมา (Zubat, Abra)", en:"Great for fast or erratic movers (Zubat, Abra)" } },
  { id:"pinap-berry",  name:"Pinap",        nameLong:"Pinap Berry",         mult:1.0, color:"#fde047", shape:"pinap",
    effect:{ th:"ลูกอม ×2", en:"Candy ×2" },
    desc:{ th:"ได้ลูกอม 2 เท่า ถ้าจับติดในครั้งถัดไป", en:"Doubles the Candy you get if you catch it on the next throw." },
    effectFull:{ th:"ได้ลูกอม 2 เท่า ถ้าจับติดในครั้งถัดไป", en:"Doubles Candy if your next throw catches it" },
    unlock:{ th:"เลเวล 18", en:"Level 18" },
    obtain:{ th:"หมุน PokéStop / ยิม และรางวัลเลเวลอัป", en:"PokéStop & Gym spins, level-up rewards" },
    tip:{ th:"คุ้มสุดกับร่างที่ 2–3 ของสายวิวัฒน์ (ดรอปลูกอมเยอะ)", en:"Best on 2nd/3rd-stage evolutions (more Candy)" } },
  { id:"golden-razz",  name:"Golden Razz",  nameLong:"Golden Razz Berry",   mult:2.5, color:"#f59e0b", shape:"razz",
    effect:{ th:"จับ ×2.5", en:"Catch ×2.5" },
    desc:{ th:"เพิ่มโอกาสจับอย่างมาก ดีที่สุดสำหรับตัวหายาก", en:"Greatly increases catch chance — best for rare catches." },
    effectFull:{ th:"เพิ่มโอกาสจับอย่างมาก 2.5 เท่า + ฟื้นพลังใจตัวป้องยิมได้เต็ม", en:"Greatly boosts catch 2.5× + fully restores a Gym defender's motivation" },
    unlock:{ th:"—", en:"—" },
    obtain:{ th:"Raid, ภารกิจวิจัย และบอลลูนโปรโมชัน", en:"Raids, Research tasks, promo Balloons" },
    tip:{ th:"เก็บไว้ใช้กับตัวหายาก/ในตำนาน", en:"Save it for rare or Legendary catches" } },
  { id:"silver-pinap", name:"Silver Pinap", nameLong:"Silver Pinap Berry",  mult:1.8, color:"#94a3b8", shape:"pinap",
    effect:{ th:"จับ ×1.8 + ลูกอม", en:"Catch ×1.8 + Candy" },
    desc:{ th:"เพิ่มโอกาสจับและได้ลูกอมเพิ่มในคราวเดียว", en:"Boosts catch chance and Candy at the same time." },
    effectFull:{ th:"เพิ่มโอกาสจับ 1.8 เท่า + ลูกอม ~2.33 เท่า (3→7, 5→11, 10→23)", en:"Catch 1.8× and Candy ~2.33× (3→7, 5→11, 10→23)" },
    unlock:{ th:"—", en:"—" },
    obtain:{ th:"Mega Raid, ภารกิจวิจัย และ GO Battle League", en:"Mega Raids, Research, GO Battle League" } },
];

// ─── 8-bit Pokeball image (with colored-circle fallback) ─────
// Official Pokémon GO ball icons (PokeMiners) for the 5 GO balls; others fall back to PokeAPI
const BALL_GO_SPRITE = {
  "poke-ball": "pokeball", "great-ball": "greatball", "ultra-ball": "ultraball",
  "master-ball": "masterball", "premier-ball": "premierball", "beast-ball": "beastball",
};
const GO_BALL_ICON = (slug) => `https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Items/${slug}_sprite.png`;
// Balls without a PokeMiners sprite → bundled local image (GO Safari Ball, saved from the GO wiki)
const BALL_CUSTOM_IMG = {
  "safari-ball": "/go-safari-ball.png",
};

function PokeballImg({ ballId, size = 60, animate = false, glow = false }) {
  const [imgFailed, setImgFailed] = useState(false);
  const ball = POKEBALLS.find(b => b.id === ballId) ?? POKEBALLS[0];
  const cls  = `ball-img-8bit${animate ? " ball-spin-8bit" : ""}${glow ? " ball-glow-8bit" : ""}`;
  const goSlug = BALL_GO_SPRITE[ballId];
  const customImg = BALL_CUSTOM_IMG[ballId];
  const smooth = !!(goSlug || customImg);
  const src = customImg ?? (goSlug ? GO_BALL_ICON(goSlug) : `${ITEM_BASE}/${ballId}.png`);

  if (imgFailed) {
    // Sprite failed to load — render a colored circle with the ball's glow color
    return (
      <div
        className={cls}
        style={{
          "--ball-glow": ball.glow,
          width: size, height: size,
          borderRadius: "50%",
          background: `radial-gradient(circle at 35% 35%, ${ball.glow}bb, ${ball.glow})`,
          border: `2px solid ${ball.glow}`,
          boxShadow: glow ? `0 0 14px ${ball.glow}` : "none",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: size * 0.38, color: "white", fontWeight: 900,
          flexShrink: 0,
        }}
      />
    );
  }

  return (
    <img
      src={src}
      alt={ball.name}
      width={size}
      height={size}
      className={cls}
      style={{ "--ball-glow": ball.glow, imageRendering: smooth ? "auto" : undefined }}
      draggable={false}
      onError={() => setImgFailed(true)}
    />
  );
}

// ─── Custom SVG Berries (GO-style) ──────────────────────────
function BerryGO({ berryId, size = 40, animate = false }) {
  const berry = BERRIES.find(b => b.id === berryId);
  if (!berry) return null;
  const isGolden = berryId === "golden-razz";
  const isSilver = berryId === "silver-pinap";
  const uid = berryId;

  if (berry.shape === "razz") {
    const mainLight = isGolden ? "#fef3c7" : "#fce7f3";
    const mainMid   = isGolden ? "#f59e0b" : "#f472b6";
    const mainDark  = isGolden ? "#78350f" : "#831843";
    const accent    = isGolden ? "#fbbf24" : "#ec4899";
    return (
      <svg width={size} height={size} viewBox="0 0 100 100"
        className={`berry-go${animate ? " berry-spin" : ""}`}
        style={{ filter: `drop-shadow(0 4px 8px ${accent}66)` }}>
        <defs>
          <radialGradient id={`razz-${uid}`} cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor={mainLight} />
            <stop offset="45%" stopColor={mainMid} />
            <stop offset="100%" stopColor={mainDark} />
          </radialGradient>
          <linearGradient id={`leaf-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#86efac" /><stop offset="100%" stopColor="#15803d" />
          </linearGradient>
        </defs>
        <circle cx="35" cy="80" r="13" fill={`url(#razz-${uid})`} stroke={mainDark} strokeWidth="1.8" />
        <circle cx="65" cy="80" r="13" fill={`url(#razz-${uid})`} stroke={mainDark} strokeWidth="1.8" />
        <circle cx="50" cy="86" r="14" fill={`url(#razz-${uid})`} stroke={mainDark} strokeWidth="1.8" />
        <circle cx="42" cy="65" r="13" fill={`url(#razz-${uid})`} stroke={mainDark} strokeWidth="1.8" />
        <circle cx="58" cy="65" r="13" fill={`url(#razz-${uid})`} stroke={mainDark} strokeWidth="1.8" />
        <circle cx="50" cy="50" r="12" fill={`url(#razz-${uid})`} stroke={mainDark} strokeWidth="1.8" />
        <circle cx="31" cy="76" r="2.5" fill="white" opacity="0.7" />
        <circle cx="61" cy="76" r="2.5" fill="white" opacity="0.7" />
        <circle cx="46" cy="82" r="3" fill="white" opacity="0.7" />
        <circle cx="38" cy="61" r="2.5" fill="white" opacity="0.7" />
        <circle cx="54" cy="61" r="2.5" fill="white" opacity="0.7" />
        <circle cx="46" cy="46" r="2.5" fill="white" opacity="0.7" />
        <path d="M50 42 Q 30 30 18 36 Q 28 46 50 44 Z" fill={`url(#leaf-${uid})`} stroke="#15803d" strokeWidth="1.5" />
        <path d="M50 42 Q 70 30 82 36 Q 72 46 50 44 Z" fill={`url(#leaf-${uid})`} stroke="#15803d" strokeWidth="1.5" />
        <path d="M48 42 L 48 32 L 52 32 L 52 42 Z" fill="#a16207" />
        {isGolden && <ellipse cx="50" cy="65" rx="35" ry="30" fill="white" opacity="0.15" />}
      </svg>
    );
  }
  if (berry.shape === "nanab") {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100"
        className={`berry-go${animate ? " berry-spin" : ""}`}
        style={{ filter: `drop-shadow(0 4px 8px #ec489966)` }}>
        <defs>
          <linearGradient id={`nanab-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fbcfe8" /><stop offset="45%" stopColor="#f472b6" /><stop offset="100%" stopColor="#831843" />
          </linearGradient>
        </defs>
        <path d="M 27 38 Q 18 52 21 70 Q 24 86 32 92 L 40 90 Q 33 84 31 72 Q 29 56 36 42 Z" fill={`url(#nanab-${uid})`} stroke="#831843" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M 50 35 Q 42 50 44 72 Q 46 88 52 92 L 60 90 Q 54 84 52 72 Q 50 54 56 40 Z" fill={`url(#nanab-${uid})`} stroke="#831843" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M 73 38 Q 82 52 79 70 Q 76 86 68 92 L 60 90 Q 67 84 69 72 Q 71 56 64 42 Z" fill={`url(#nanab-${uid})`} stroke="#831843" strokeWidth="1.8" strokeLinejoin="round" />
        <ellipse cx="32" cy="55" rx="2" ry="8" fill="white" opacity="0.55" />
        <ellipse cx="51" cy="55" rx="2" ry="8" fill="white" opacity="0.55" />
        <ellipse cx="68" cy="55" rx="2" ry="8" fill="white" opacity="0.55" />
        <path d="M 25 38 Q 32 22 50 25 Q 68 22 75 38 Q 70 32 60 30 Q 55 25 50 28 Q 45 25 40 30 Q 30 32 25 38 Z" fill="#fde047" stroke="#a16207" strokeWidth="1.5" strokeLinejoin="round" />
        <ellipse cx="50" cy="29" rx="3" ry="2" fill="#a16207" />
      </svg>
    );
  }
  if (berry.shape === "pinap") {
    const mainLight = isSilver ? "#f1f5f9" : "#fef9c3";
    const mainMid   = isSilver ? "#cbd5e1" : "#fde047";
    const mainDark  = isSilver ? "#475569" : "#854d0e";
    const accent    = isSilver ? "#94a3b8" : "#fde047";
    return (
      <svg width={size} height={size} viewBox="0 0 100 100"
        className={`berry-go${animate ? " berry-spin" : ""}`}
        style={{ filter: `drop-shadow(0 4px 8px ${accent}66)` }}>
        <defs>
          <radialGradient id={`pinap-${uid}`} cx="38%" cy="35%" r="70%">
            <stop offset="0%" stopColor={mainLight} /><stop offset="45%" stopColor={mainMid} /><stop offset="100%" stopColor={mainDark} />
          </radialGradient>
          <linearGradient id={`pinapleaf-${uid}`} x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#15803d" /><stop offset="100%" stopColor="#86efac" />
          </linearGradient>
        </defs>
        <ellipse cx="50" cy="65" rx="24" ry="30" fill={`url(#pinap-${uid})`} stroke={mainDark} strokeWidth="1.8" />
        <g stroke={mainDark} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M 30 50 L 36 55 L 30 60" /><path d="M 70 50 L 64 55 L 70 60" />
          <path d="M 28 65 L 34 70 L 28 75" /><path d="M 72 65 L 66 70 L 72 75" />
          <path d="M 30 80 L 36 85 L 30 88" /><path d="M 70 80 L 64 85 L 70 88" />
        </g>
        <ellipse cx="40" cy="55" rx="5" ry="12" fill="white" opacity="0.5" transform="rotate(-15 40 55)" />
        <circle cx="55" cy="48" r="3" fill="white" opacity="0.4" />
        <g fill={`url(#pinapleaf-${uid})`} stroke="#14532d" strokeWidth="1.2" strokeLinejoin="round">
          <path d="M 38 38 L 28 6 L 36 24 L 32 8 L 42 26 Z" />
          <path d="M 45 36 L 42 4 L 48 28 L 50 8 L 52 28 L 58 4 L 55 36 Z" />
          <path d="M 62 38 L 72 6 L 64 24 L 68 8 L 58 26 Z" />
        </g>
        {isSilver && <ellipse cx="50" cy="65" rx="22" ry="28" fill="white" opacity="0.2" />}
      </svg>
    );
  }
  return null;
}

// ─── Berry image — official Pokémon GO item icons (PokeMiners), falls back to SVG ───
const BERRY_GO_ICON = {
  "razz-berry":   701,
  "nanab-berry":  703,
  "pinap-berry":  705,
  "golden-razz":  706,
  "silver-pinap": 707,
};
const GO_ITEM_ICON = (n) =>
  `https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Items/Item_${String(n).padStart(4, "0")}.png`;

function BerryImg({ berryId, size = 40, animate = false }) {
  const [failed, setFailed] = useState(false);
  const iconId = BERRY_GO_ICON[berryId];
  if (!iconId || failed) return <BerryGO berryId={berryId} size={size} animate={animate} />;
  return (
    <img
      src={GO_ITEM_ICON(iconId)}
      alt={berryId}
      width={size}
      height={size}
      className={`berry-go${animate ? " berry-spin" : ""}`}
      draggable={false}
      style={{ objectFit: "contain" }}
      onError={() => setFailed(true)}
    />
  );
}

// ─── Capture rate (BST-based) ───────────────────────────────
function getCaptureRate(pokemon) {
  const bst = pokemon.stats.reduce((sum, s) => sum + s.base_stat, 0);
  const hp = pokemon.stats.find(s => s.stat.name === "hp")?.base_stat ?? 50;
  let rate;
  if (bst >= 670) rate = 3;
  else if (bst >= 600) rate = 25;
  else if (bst >= 540) rate = 45;
  else if (bst >= 480) rate = 75;
  else if (bst >= 400) rate = 120;
  else if (bst >= 320) rate = 180;
  else rate = 235;
  const hpMod = Math.max(0.6, 1.2 - hp / 200);
  return Math.max(3, Math.min(255, Math.round(rate * hpMod)));
}

// ─── Curve Ball detection ──────────────────────────────────
// Direction based purely on horizontal displacement of the drag.
// Drag right → ball curves right. Drag left → ball curves left.
// Curvature scales with how diagonal the drag is (0 = straight up).
function detectCurveBall(path) {
  const result = { curvature: 0, direction: null };
  if (path.length < 5) return result;
  const first = path[0];
  const last  = path[path.length - 1];
  const dx    = last.x - first.x;          // positive = moved right
  const dy    = last.y - first.y;          // screen Y: positive = moved down
  const dist  = Math.sqrt(dx * dx + dy * dy);
  if (dist < 30) return result;

  // Fraction of total movement that is horizontal
  const hFrac = Math.abs(dx) / dist;
  if (hFrac < 0.10) return result;          // nearly straight up, not a curve

  result.direction = dx > 0 ? "right" : "left";
  // Curvature 0→1: starts at 10% horizontal, reaches max at 40%
  result.curvature = Math.min(1.0, Math.max(0, (hFrac - 0.10) / 0.30));
  return result;
}

function calculateCatchChance(pokemon, ballId, berryId, throwBonus = 1.0) {
  const ball = POKEBALLS.find(b => b.id === ballId) ?? POKEBALLS[0];
  const berry = berryId ? BERRIES.find(b => b.id === berryId) : null;
  const captureRate = getCaptureRate(pokemon);

  // Master Ball / Park Ball — guaranteed catch
  if (ball.rate >= 255) return 1.0;

  // Wild Pokémon at roughly full HP — harder, more realistic catch difficulty.
  // (lower factor = harder; 7/9 ≈ heavily weakened/too easy, 1/3 = full HP)
  const hpFactor = 0.5;

  // Modified catch rate `a`
  const a = captureRate * ball.rate * hpFactor *
            (berry?.mult ?? 1.0) * throwBonus;

  if (a >= 255) return 1.0;

  // Gen 5+ shake check formula:
  //   shake_check = floor(65536 / (255/a)^0.1875)
  //   P(catch) = (shake_check / 65536)^4
  const shakeRaw = 65536 / Math.pow(255 / a, 0.1875);
  const perShake = Math.min(65535, shakeRaw) / 65536;
  const totalProb = Math.pow(perShake, 4);

  return Math.min(0.999, Math.max(0.005, totalProb));
}

// ─── Fake CP from BST (Pokemon GO style approximation) ──────
function getFakeCP(pokemon) {
  const bst = pokemon.stats.reduce((sum, s) => sum + s.base_stat, 0);
  return Math.round(bst * 3.2);
}

// ─── Ball Picker Modal ──────────────────────────────────────
function BallPicker({ selectedId, onSelect, onClose, lang }) {
  const [previewId, setPreviewId] = useState(selectedId ?? "poke-ball");
  const [tip, setTip] = useState(null);     // { id, x, y } → floating detail pop-up
  const holdRef = useRef(null);
  const L = lang === "th" ? "th" : "en";
  const previewBall = POKEBALLS.find(b => b.id === previewId) ?? POKEBALLS[0];
  const tipBall = tip ? POKEBALLS.find(b => b.id === tip.id) : null;

  const showTip = (id, el) => { const r = el.getBoundingClientRect(); setTip({ id, x: r.left + r.width / 2, y: r.top }); };
  const hideTip = () => { clearTimeout(holdRef.current); setTip(null); };
  const holdStart = (id, el) => { clearTimeout(holdRef.current); holdRef.current = setTimeout(() => showTip(id, el), 250); };

  return (
    <div className="catch-go-picker-overlay" onClick={onClose}>
      <div className="catch-go-picker-modal" onClick={(e) => e.stopPropagation()}>
        <button className="catch-go-picker-close" onClick={onClose}><X size={16} strokeWidth={2.6} /></button>
        <h2 className="catch-go-picker-title">{lang==="th"?"เลือกบอล":"Select Ball"}</h2>

        <div className="catch-go-detail-preview" style={{ "--ball-glow": previewBall.glow }}>
          <PokeballImg ballId={previewId} size={82} glow animate />
          <div className="catch-go-detail-info">
            <div className="catch-go-detail-name">{previewBall.name}</div>
            <span className="catch-go-detail-tag" style={{ background: previewBall.glow }}>
              {previewBall.effect[L]}
            </span>
            <p className="catch-go-detail-desc">{previewBall.desc[L]}</p>
            <span className="catch-go-detail-hintmsg">{lang==="th"?"ชี้ค้าง / จิ้มค้าง เพื่อดูรายละเอียด":"Hover or press-and-hold a ball for details"}</span>
          </div>
        </div>

        <div className="catch-go-picker-grid">
          {POKEBALLS.map(b => (
            <button key={b.id}
              className={`catch-go-picker-item${previewId === b.id ? " selected" : ""}${tip?.id === b.id ? " hinting" : ""}`}
              onClick={() => setPreviewId(b.id)}
              onDoubleClick={() => { onSelect(b.id); onClose(); }}
              onMouseEnter={(e) => showTip(b.id, e.currentTarget)}
              onMouseLeave={hideTip}
              onPointerDown={(e) => { if (e.pointerType !== "mouse") holdStart(b.id, e.currentTarget); }}
              onPointerUp={hideTip}
              onPointerCancel={hideTip}
              onContextMenu={(e) => e.preventDefault()}
              style={{ "--ball-glow": b.glow }}>
              <PokeballImg ballId={b.id} size={44} />
              <span className="catch-go-picker-label">{b.name}</span>
            </button>
          ))}
        </div>
        <button className="catch-go-pick-confirm" onClick={() => { onSelect(previewId); onClose(); }}>
          {lang==="th"?"เลือกบอลนี้":"Use this ball"}
        </button>
      </div>

      {/* Floating detail pop-up (hover / press-and-hold) */}
      {tipBall && (
        <div className="catch-go-berry-tip" style={{ left: tip.x, top: tip.y - 12 }}>
          <div className="catch-go-berry-tip-head">
            <PokeballImg ballId={tipBall.id} size={28} />
            <span className="catch-go-berry-tip-name">{tipBall.name}</span>
            <span className="catch-go-berry-tip-tag" style={{ background: tipBall.glow }}>{tipBall.effect[L]}</span>
          </div>
          <div className="catch-go-berry-tip-rows">
            <div className="catch-go-tip-row">
              <span className="catch-go-tip-ic" style={{ color: tipBall.glow }}><Zap size={13} strokeWidth={2.4} /></span>
              <span className="catch-go-tip-lbl">{lang==="th"?"ผล":"Effect"}</span>
              <span className="catch-go-tip-val">{tipBall.effectFull[L]}</span>
            </div>
            {tipBall.unlock && tipBall.unlock.en !== "—" && (
              <div className="catch-go-tip-row">
                <span className="catch-go-tip-ic"><Unlock size={13} strokeWidth={2.4} /></span>
                <span className="catch-go-tip-lbl">{lang==="th"?"ปลดล็อก":"Unlock"}</span>
                <span className="catch-go-tip-val">{tipBall.unlock[L]}</span>
              </div>
            )}
            <div className="catch-go-tip-row">
              <span className="catch-go-tip-ic"><MapPin size={13} strokeWidth={2.4} /></span>
              <span className="catch-go-tip-lbl">{lang==="th"?"หาได้จาก":"Where"}</span>
              <span className="catch-go-tip-val">{tipBall.obtain[L]}</span>
            </div>
            {tipBall.tip && (
              <div className="catch-go-tip-row">
                <span className="catch-go-tip-ic" style={{ color: "#f59e0b" }}><Lightbulb size={13} strokeWidth={2.4} /></span>
                <span className="catch-go-tip-lbl">{lang==="th"?"เคล็ดลับ":"Tip"}</span>
                <span className="catch-go-tip-val">{tipBall.tip[L]}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Berry Picker Modal ─────────────────────────────────────
function BerryPicker({ selectedId, onSelect, onClose, lang }) {
  const [previewId, setPreviewId] = useState(selectedId);
  const [tip, setTip] = useState(null);     // { id, x, y } → small floating detail pop-up
  const holdRef = useRef(null);
  const L = lang === "th" ? "th" : "en";
  const previewBerry = previewId ? BERRIES.find(b => b.id === previewId) : null;
  const tipBerry = tip ? BERRIES.find(b => b.id === tip.id) : null;

  // hover (desktop) / press-and-hold (mobile) → tiny detail pop-up above the berry
  const showTip = (id, el) => { const r = el.getBoundingClientRect(); setTip({ id, x: r.left + r.width / 2, y: r.top }); };
  const hideTip = () => { clearTimeout(holdRef.current); setTip(null); };
  const holdStart = (id, el) => { clearTimeout(holdRef.current); holdRef.current = setTimeout(() => showTip(id, el), 250); };
  return (
    <div className="catch-go-picker-overlay" onClick={onClose}>
      <div className="catch-go-picker-modal" onClick={(e) => e.stopPropagation()}>
        <button className="catch-go-picker-close" onClick={onClose}><X size={16} strokeWidth={2.6} /></button>
        <h2 className="catch-go-picker-title">
          {lang==="th"?"เลือกเบอร์รี่":"Select Berry"}
        </h2>
        <div className="catch-go-detail-preview">
          {previewBerry ? (
            <>
              <BerryImg berryId={previewId} size={84} animate />
              <div className="catch-go-detail-info">
                <div className="catch-go-detail-name">{previewBerry.nameLong}</div>
                <span className="catch-go-detail-tag" style={{ background: previewBerry.color }}>
                  {previewBerry.effect[L]}
                </span>
                <p className="catch-go-detail-desc">{previewBerry.desc[L]}</p>
                <span className="catch-go-detail-hintmsg">{lang==="th"?"ชี้ค้าง / จิ้มค้าง เพื่อดูรายละเอียดเชิงลึก":"Hover or press-and-hold a berry for details"}</span>
              </div>
            </>
          ) : (
            <div className="catch-go-detail-none">
              <Ban size={26} strokeWidth={2} />
              <span>{lang==="th"?"ไม่ใช้เบอร์รี่":"No berry"}</span>
            </div>
          )}
        </div>
        <div className="catch-go-picker-grid berries">
          <button className={`catch-go-picker-item${!previewId ? " selected" : ""}`} onClick={() => setPreviewId(null)}>
            <span className="catch-go-none-ic"><Ban size={26} strokeWidth={2} /></span>
            <span className="catch-go-picker-label">{lang==="th"?"ไม่ใช้":"None"}</span>
          </button>
          {BERRIES.map(b => (
            <button key={b.id}
              className={`catch-go-picker-item${previewId === b.id ? " selected" : ""}${tip?.id === b.id ? " hinting" : ""}`}
              onClick={() => setPreviewId(b.id)}
              onDoubleClick={() => { onSelect(b.id); onClose(); }}
              onMouseEnter={(e) => showTip(b.id, e.currentTarget)}
              onMouseLeave={hideTip}
              onPointerDown={(e) => { if (e.pointerType !== "mouse") holdStart(b.id, e.currentTarget); }}
              onPointerUp={hideTip}
              onPointerCancel={hideTip}
              onContextMenu={(e) => e.preventDefault()}>
              <BerryImg berryId={b.id} size={42} />
              <span className="catch-go-picker-label">{b.name}</span>
            </button>
          ))}
        </div>
        <button className="catch-go-pick-confirm" onClick={() => { onSelect(previewId); onClose(); }}>
          {lang==="th"?"ยืนยัน":"Confirm"}
        </button>
      </div>

      {/* Floating detail pop-up (hover / press-and-hold) */}
      {tipBerry && (
        <div className="catch-go-berry-tip" style={{ left: tip.x, top: tip.y - 12 }}>
          <div className="catch-go-berry-tip-head">
            <BerryImg berryId={tipBerry.id} size={30} />
            <span className="catch-go-berry-tip-name">{tipBerry.nameLong}</span>
            <span className="catch-go-berry-tip-tag" style={{ background: tipBerry.color }}>{tipBerry.effect[L]}</span>
          </div>
          <div className="catch-go-berry-tip-rows">
            <div className="catch-go-tip-row">
              <span className="catch-go-tip-ic" style={{ color: tipBerry.color }}><Zap size={13} strokeWidth={2.4} /></span>
              <span className="catch-go-tip-lbl">{lang==="th"?"ผล":"Effect"}</span>
              <span className="catch-go-tip-val">{tipBerry.effectFull[L]}</span>
            </div>
            {tipBerry.unlock && tipBerry.unlock.en !== "—" && (
              <div className="catch-go-tip-row">
                <span className="catch-go-tip-ic"><Unlock size={13} strokeWidth={2.4} /></span>
                <span className="catch-go-tip-lbl">{lang==="th"?"ปลดล็อก":"Unlock"}</span>
                <span className="catch-go-tip-val">{tipBerry.unlock[L]}</span>
              </div>
            )}
            <div className="catch-go-tip-row">
              <span className="catch-go-tip-ic"><MapPin size={13} strokeWidth={2.4} /></span>
              <span className="catch-go-tip-lbl">{lang==="th"?"หาได้จาก":"Where"}</span>
              <span className="catch-go-tip-val">{tipBerry.obtain[L]}</span>
            </div>
            {tipBerry.tip && (
              <div className="catch-go-tip-row">
                <span className="catch-go-tip-ic" style={{ color: "#f59e0b" }}><Lightbulb size={13} strokeWidth={2.4} /></span>
                <span className="catch-go-tip-lbl">{lang==="th"?"เคล็ดลับ":"Tip"}</span>
                <span className="catch-go-tip-val">{tipBerry.tip[L]}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT v7 — Pokemon GO style Fullscreen
// ═══════════════════════════════════════════════════════════
export default function CatchAnimation({ pokemon, lang = "en", shiny = false, onClose }) {
  const arenaRef = useRef(null);
  const rafRef = useRef(null);
  const timerRef = useRef([]);

  // Live weather + time of day → drives the BiomeScene backdrop
  const { weather } = useWeather();
  const sceneCondition = weather?.condition || "clear";
  const sceneTimeOfDay = useMemo(() => calcTimeOfDay(weather), [weather]);
  const sceneIsDay = weather ? weather.isDay : sceneTimeOfDay !== "night";

  const [phase, setPhase] = useState("idle");
  const [ballId, setBallId] = useState("poke-ball");
  const [berryId, setBerryId] = useState(null);
  const [showBallPicker, setShowBallPicker] = useState(false);
  const [showBerryPicker, setShowBerryPicker] = useState(false);
  const [dragPath, setDragPath] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [ballTilt, setBallTilt] = useState(0); // (legacy) ball lean — kept harmless
  const idleStageRef = useRef(null);  // the swaying idle Pokémon stage (for aim/hit test)
  // ── Player-driven spin physics (real angular velocity + momentum + friction) ──
  const spinVecRef   = useRef(null);  // last movement vector (for angular delta)
  const omegaRef     = useRef(0);     // angular velocity (deg/s) imparted by the finger
  const angleRef     = useRef(0);     // current rotation (deg), integrated each frame
  const lastMoveTRef = useRef(0);     // timestamp of last spin sample
  const spinElRef    = useRef(null);  // inner element of the dragging ball (rotation target)
  const spinRafRef   = useRef(0);     // rAF id for the spin loop
  const [throwOffsetX, setThrowOffsetX] = useState(0); // horizontal launch offset from center (px)
  const [flyStart, setFlyStart] = useState({ x: 0, y: 0 }); // physics flight launch point (arena px)
  const stillTimerRef = useRef(null);
  const lastPosRef = useRef(null);
  const flyRef = useRef(null);        // in-flight ball element (driven by JS physics)
  const flightRafRef = useRef(0);
  const [ballPos, setBallPos] = useState({ x: 0, y: 0 });
  const [throwQuality, setThrowQuality] = useState(null);
  const [wobbleCount, setWobbleCount] = useState(0);
  const [wobbleTotal, setWobbleTotal] = useState(3); // total wobbles this attempt
  const [nearEscape, setNearEscape] = useState(false); // suspense "almost broke free" beat
  const [seqData, setSeqData] = useState(null); // active catch-sequence params
  const [pokemonAttacking, setPokemonAttacking] = useState(false); // GO-style attack tell
  const attackingRef = useRef(false);           // synchronous read at throw time
  const [resultMsg, setResultMsg] = useState(null);
  const [berryThrown, setBerryThrown] = useState(false);
  const [berryFlying, setBerryFlying] = useState(false);
  // Pokemon GO capture ring (pulsing target circle around Pokemon)
  const [ringRadius, setRingRadius] = useState(220);
  // Critical Catch — skips wobbles, special animation
  const [isCritical, setIsCritical] = useState(false);
  // Curve Ball — bonus for curved throws
  const [isCurveBall, setIsCurveBall] = useState(false);
  // Direction of curve ("left" or "right") — determines arc trajectory
  const [curveDirection, setCurveDirection] = useState("right");
  // Strength of curve 0–1 — controls how far the arc swings sideways
  const [curveStrength, setCurveStrength] = useState(0.8);
  // Show tutorial on first open (or when user re-opens via ? button)
  const [showTutorial, setShowTutorial] = useState(() => {
    try { return localStorage.getItem("pkdx_catch_tutorial_seen") !== "true"; }
    catch { return true; }
  });
  const [caughtCount, setCaughtCount] = useState(() => {
    try { return parseInt(localStorage.getItem("pkdx_caught_count") ?? "0"); }
    catch { return 0; }
  });
  // ── New catch features ──
  // Shiny: forced when the card is viewing shiny, else a small wild chance
  const [isShiny] = useState(() => shiny || Math.random() < 0.04);
  const [combo, setCombo] = useState(() => {
    try { return parseInt(localStorage.getItem("pkdx_catch_combo") ?? "0"); } catch { return 0; }
  });
  const [attempts, setAttempts] = useState(0);   // failed throws this encounter
  const [fled, setFled] = useState(false);       // Pokémon fled (encounter over)
  const [reward, setReward] = useState(null);    // { candy, xp } toast after a catch
  // Nanab Berry calms the Pokémon → less dodging + fewer attacks
  const calm = berryThrown && berryId === "nanab-berry";
  const calmRef = useRef(false);
  useEffect(() => { calmRef.current = calm; }, [calm]);

  // Pokemon meta
  const pokemonName = useMemo(() => {
    return pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);
  }, [pokemon.name]);

  const ball = POKEBALLS.find(b => b.id === ballId) ?? POKEBALLS[0];
  const berry = berryId ? BERRIES.find(b => b.id === berryId) : null;

  const cp = useMemo(() => getFakeCP(pokemon), [pokemon]);
  const capRate = useMemo(() => getCaptureRate(pokemon), [pokemon]);

  // Model scales with the Pokémon's real height (dm) — big mons look big, small look small
  const pokeSizeScale = useMemo(() => {
    const h = pokemon.height || 10;               // decimetres (10 = 1 m baseline)
    const s = 0.72 + 0.42 * Math.cbrt(h / 10);
    return Math.max(0.72, Math.min(1.55, s));
  }, [pokemon.height]);

  // Berry only boosts catch chance AFTER being thrown to the Pokemon
  const effectiveBerryId = berryThrown ? berryId : null;
  const catchChance = useMemo(
    () => calculateCatchChance(pokemon, ballId, effectiveBerryId, 1.0),
    [pokemon, ballId, effectiveBerryId]
  );

  // Lock body scroll while open + dispatch catch open/close events
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.classList.add("catch-active");
    window.dispatchEvent(new CustomEvent("catch:open"));
    return () => {
      document.body.style.overflow = prev;
      document.body.classList.remove("catch-active");
      window.dispatchEvent(new CustomEvent("catch:close"));
    };
  }, []);

  // Capture-phase Escape handler — closes catch only, NOT the parent modal
  useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        onClose?.();
      }
    };
    // `true` = capture phase, runs BEFORE modal's bubble-phase listener
    window.addEventListener("keydown", h, true);
    return () => window.removeEventListener("keydown", h, true);
  }, [onClose]);

  // Cleanup
  const addTimer = (id) => { timerRef.current.push(id); };
  const clearAllTimers = useCallback(() => {
    timerRef.current.forEach(clearTimeout);
    timerRef.current = [];
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (flightRafRef.current) { cancelAnimationFrame(flightRafRef.current); flightRafRef.current = 0; }
  }, []);
  useEffect(() => () => {
    clearAllTimers();
    catchSounds.stopAll();
  }, [clearAllTimers]);

  // Reset when ball/berry/pokemon changes
  useEffect(() => {
    setPhase("idle");
    setThrowQuality(null);
    setWobbleCount(0);
    setResultMsg(null);
    setDragPath([]);
    setIsCritical(false);
    clearAllTimers();
  }, [pokemon.id, ballId, berryId, clearAllTimers]);

  // Reset berry-thrown when berry is changed or pokemon changes
  useEffect(() => {
    setBerryThrown(false);
    setBerryFlying(false);
  }, [pokemon.id, berryId]);

  // ─── GO-style attacks — wild Pokémon periodically lunges (a "tell"). ──
  // Throwing while it's attacking gets your ball knocked away (no catch).
  useEffect(() => {
    if (phase !== "idle") { attackingRef.current = false; setPokemonAttacking(false); return; }
    let alive = true;
    const timers = [];
    const ATTACK_MS = 1200;
    const scheduleNext = () => {
      // Nanab Berry calms it → attacks much less often
      const base = calmRef.current ? 11000 : 5000;
      const delay = base + Math.random() * 5500;
      timers.push(setTimeout(() => {
        if (!alive) return;
        if (calmRef.current && Math.random() < 0.5) { scheduleNext(); return; } // often skips when calm
        attackingRef.current = true;
        setPokemonAttacking(true);
        if (Math.random() < 0.5) catchSounds.playPokemonCry?.(pokemon); // cry only sometimes
        timers.push(setTimeout(() => {
          if (!alive) return;
          attackingRef.current = false;
          setPokemonAttacking(false);
          scheduleNext();
        }, ATTACK_MS));
      }, delay));
    };
    scheduleNext();
    return () => { alive = false; attackingRef.current = false; timers.forEach(clearTimeout); };
  }, [phase, pokemon]);

  // ─── Capture Ring pulse — Pokemon GO target circle ────────
  // Radius oscillates between 100 (tight) and 280 (loose) every 3s
  // Slower pulse = easier to time the throw for Excellent zone
  useEffect(() => {
    if (phase !== "idle") return;
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const elapsed = (now - start) / 1000;
      // sine wave: 100 → 280 → 100 over 3.0s (slower for better timing)
      const t = (Math.sin((elapsed / 3.0) * Math.PI * 2) + 1) / 2;
      setRingRadius(100 + t * 180);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  // Critical Catch chance — scales with Pokémon caught count
  // Base 0.5%, +1% per Pokémon caught, capped at 6%
  const criticalCatchChance = useMemo(() => {
    return Math.min(0.06, 0.005 + caughtCount * 0.0006);
  }, [caughtCount]);

  // Ring color based on current radius (zone indicator)
  const ringZone = useMemo(() => {
    if (ringRadius < 130) return { color: "#22c55e", label: "EXCELLENT", quality: "excellent" };
    if (ringRadius < 180) return { color: "#900603", label: "GREAT",     quality: "great"     };
    if (ringRadius < 230) return { color: "#fbbf24", label: "NICE",      quality: "nice"      };
    return                       { color: "#94a3b8", label: "",          quality: null         };
  }, [ringRadius]);

  // What's in the center? Berry (if selected & not yet thrown) or Ball
  const currentThrowable = (berryId && !berryThrown) ? "berry" : "ball";

  // ─── Active bonuses (just for display, no XP) ─────────────
  const bonuses = useMemo(() => {
    const items = [];
    if (throwQuality === "excellent")  items.push({ label: "Excellent Throw", Icon: Star,     color: "#f59e0b" });
    else if (throwQuality === "great") items.push({ label: "Great Throw",     Icon: Sparkles, color: "#900603" });
    else if (throwQuality === "nice")  items.push({ label: "Nice Throw",      Icon: ThumbsUp, color: "#10b981" });
    if (isCurveBall) items.push({ label: "Curve Ball",     Icon: Tornado, color: "#06b6d4" });
    if (berryThrown) items.push({ label: "Berry Used",     Icon: Cherry,  color: "#ec4899" });
    if (isCritical)  items.push({ label: "Critical Catch", Icon: Star,    color: "#fbbf24" });
    return items;
  }, [throwQuality, berryThrown, isCritical, isCurveBall]);

  // Drag handlers (rAF-throttled)
  const pendingPointRef = useRef(null);

  const onDragStart = (e) => {
    if (phase !== "idle") return;
    const arena = arenaRef.current;
    if (!arena) return;
    // capture the pointer so the drag keeps tracking even outside the arena
    try { arena.setPointerCapture?.(e.pointerId); } catch {}
    const rect = arena.getBoundingClientRect();
    const clientX = e.touches?.[0]?.clientX ?? e.clientX;
    const clientY = e.touches?.[0]?.clientY ?? e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    setDragging(true);
    setBallTilt(0); // grabbed but not yet swung → ball stays upright
    omegaRef.current = 0;       // reset spin physics
    angleRef.current = 0;
    spinVecRef.current = null;
    lastMoveTRef.current = performance.now();
    clearTimeout(stillTimerRef.current);
    lastPosRef.current = { x, y };
    setDragPath([{ x, y, t: Date.now() }]);
    setBallPos({ x, y });
  };

  const onDragMove = (e) => {
    if (!dragging || phase !== "idle") return;
    const arena = arenaRef.current;
    if (!arena) return;
    const rect = arena.getBoundingClientRect();
    const clientX = e.touches?.[0]?.clientX ?? e.clientX;
    const clientY = e.touches?.[0]?.clientY ?? e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Player-driven spin: circling the finger imparts angular VELOCITY.
    // Spin fast → high ω; spin gently → low ω. The rAF loop then coasts the
    // ball down with friction when you stop — like a real spinning ball.
    const lp = lastPosRef.current;
    if (lp) {
      const mvx = x - lp.x, mvy = y - lp.y;
      const mag = Math.hypot(mvx, mvy);
      if (mag > 1.2) {
        const pv = spinVecRef.current;
        if (pv) {
          const cross = pv.x * mvy - pv.y * mvx;
          const dot   = pv.x * mvx + pv.y * mvy;
          const turn  = Math.atan2(cross, dot) * (180 / Math.PI); // signed °
          const now   = performance.now();
          const dtm   = Math.max(0.008, (now - lastMoveTRef.current) / 1000);
          lastMoveTRef.current = now;
          const gestureOmega = turn / dtm; // deg/s, sign = spin direction
          // match the hand's angular speed (smoothed), so harder spin = faster
          omegaRef.current = omegaRef.current * 0.45 + gestureOmega * 0.6;
          omegaRef.current = Math.max(-2600, Math.min(2600, omegaRef.current));
        }
        spinVecRef.current = { x: mvx, y: mvy };
      }
    }
    lastPosRef.current = { x, y };

    // update position immediately (no rAF deferral) for a 1:1, buttery drag
    setBallPos({ x, y });
    setDragPath(prev => {
      const updated = [...prev, { x, y, t: Date.now() }];
      return updated.length > 24 ? updated.slice(-24) : updated;
    });
  };

  const onDragEnd = () => {
    if (!dragging || phase !== "idle") return;
    const releaseOmega = omegaRef.current; // how fast the ball is spinning at release
    setDragging(false);
    setBallTilt(0);
    omegaRef.current = 0;
    angleRef.current = 0;
    spinVecRef.current = null;
    clearTimeout(stillTimerRef.current);
    lastPosRef.current = null;
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (dragPath.length < 3) {
      setDragPath([]);
      return;
    }
    const first = dragPath[0];
    const last = dragPath[dragPath.length - 1];
    const dx = last.x - first.x;
    const dy = first.y - last.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const arena = arenaRef.current;
    const arenaRect = arena?.getBoundingClientRect();
    const arenaHeight = arenaRect?.height ?? 540;
    // launch the throw from where the ball was released (horizontal offset from center)
    setThrowOffsetX(Math.max(-160, Math.min(160, last.x - (arenaRect?.width ?? 0) / 2)));
    // Pokemon GO style: throw quality based on CAPTURE RING radius at release
    // Smaller ring = better quality (Excellent < Great < Nice)
    const power = Math.min(1.0, distance / (arenaHeight * 0.5));
    const upwardness = Math.max(0, dy) / Math.max(1, distance);
    // Must swipe with reasonable power & upward direction
    if (power < 0.2 || upwardness < 0.3) {
      setDragPath([]);
      return;
    }

    // ─── BRANCH: throwing berry vs ball ───
    if (currentThrowable === "berry") {
      // Throw berry to Pokemon → animation → boost active → switch back to ball
      setDragPath([]);
      catchSounds.playThrow();
      setBerryFlying(true);
      addTimer(setTimeout(() => {
        setBerryFlying(false);
        setBerryThrown(true);
      }, 1100));
      return;
    }

    // Capture ring zone determines quality (tighter = better)
    let qualityLabel = ringZone.quality;
    let throwBonus = 1.0;
    if (qualityLabel === "excellent") throwBonus = 2.0;
    else if (qualityLabel === "great")  throwBonus = 1.5;
    else if (qualityLabel === "nice")   throwBonus = 1.15;
    else {
      // Ring too loose → fail throw (try again, don't throw ball)
      setDragPath([]);
      return;
    }

    // 🌀 Curve Ball — driven by the player's own spin (winding the ball up by
    // circling the finger). Falls back to path curvature for diagonal flicks.
    const { curvature, direction } = detectCurveBall(dragPath);
    const spun = Math.abs(releaseOmega) > 230;            // still spinning fast at release
    const curve = spun || curvature > 0.3;
    const curveDir = spun ? (releaseOmega > 0 ? "right" : "left") : (direction ?? "right");
    // How hard the player spun → drives how much the throw banana-curves
    const cStrength = Math.max(0.15, Math.max(curvature, Math.min(1, Math.abs(releaseOmega) / 1500)));
    setIsCurveBall(curve);
    setCurveStrength(cStrength);
    if (curve) {
      throwBonus *= 1.7;
      setCurveDirection(curveDir);
    }

    // Combo streak bonus — consecutive catches make the next a touch easier
    throwBonus *= (1 + Math.min(combo, 15) * 0.015); // up to +22.5%

    // Roll for Critical Catch!
    const critical = Math.random() < criticalCatchChance;
    setIsCritical(critical);
    setThrowQuality(qualityLabel);

    // ─── Aim & hit test — accurate & stable ───
    // The ball goes where you FLICK it: we project the swipe's trajectory up to
    // the Pokémon's height (using release point + velocity), rather than just
    // reading the finger's last X. Points/velocity are averaged to kill jitter.
    const arenaW = arenaRect?.width ?? 360;

    // Smoothed release point (avg of the last few samples → stable)
    const tail = dragPath.slice(-4);
    const relXraw = tail.reduce((s, p) => s + p.x, 0) / tail.length;
    const relYraw = last.y;

    // Release velocity from the final flick (px/s)
    const rv = dragPath.slice(-4);
    const rv0 = rv[0], rv1 = rv[rv.length - 1];
    const dtv = Math.max(0.016, (rv1.t - rv0.t) / 1000);
    const vx = (rv1.x - rv0.x) / dtv, vy = (rv1.y - rv0.y) / dtv;

    // Where the Pokémon is right now (it's dodging) + its size & height
    let pokeX = 0, pokeCenterY = (arenaRect?.height ?? 540) * 0.4, stageW = 256;
    const sEl = idleStageRef.current;
    if (sEl && arenaRect) {
      const sr = sEl.getBoundingClientRect();
      pokeX = (sr.left + sr.width / 2) - (arenaRect.left + arenaRect.width / 2);
      pokeCenterY = (sr.top - arenaRect.top) + sr.height * 0.52;
      stageW = sr.width;
    }

    // ── Pokémon GO-style aim ──
    // The ball flies along the flick: base it on the release X, then "lead" it
    // by the flick's horizontal direction (capped so it can't fling sideways).
    // This makes the throw land where the swipe points — accurate & predictable.
    let lead = 0;
    const gap = relYraw - pokeCenterY;                 // vertical distance to cover
    if (vy < -40 && gap > 0) {
      const time = Math.min(1.0, gap / -vy);
      lead = Math.max(-arenaW * 0.3, Math.min(arenaW * 0.3, vx * time));
    }
    const aimX = Math.max(-arenaW / 2, Math.min(arenaW / 2, (relXraw + lead) - arenaW / 2));
    const releaseX = relXraw - arenaW / 2;

    // Tolerance scales with the Pokémon's on-screen size (bigger = easier to hit)
    const HIT_TOL = Math.max(78, Math.min(136, stageW * 0.38));
    const hit = Math.abs(aimX - pokeX) <= HIT_TOL;

    // Outcome priority: attacking → deflect; missed aim → miss; else catch roll
    const deflect = attackingRef.current;
    let mode = "catch";
    if (deflect) mode = "deflect";
    else if (!hit) mode = "miss";

    const finalChance = calculateCatchChance(pokemon, ballId, effectiveBerryId, throwBonus);
    const willCatch = mode === "catch" ? (critical ? true : (Math.random() < finalChance)) : false;

    setSeqData({
      mode,
      releaseX,
      aimX,
      pokeX,
      curveDir: curve ? curveDir : null,
      curveStrength: curve ? cStrength : 0,
      willCatch,
      critical: mode === "catch" ? critical : false,
      quality: qualityLabel, // nice | great | excellent
    });
    setPhase("sequence");
  };

  // ── Spin physics loop ──────────────────────────────────────────────
  // While the ball is held, integrate rotation from angular velocity (ω) and
  // bleed ω with friction each frame → the ball keeps spinning and coasts to
  // a gradual stop after you stop circling. Driven imperatively (no re-renders).
  useEffect(() => {
    if (!dragging) return;
    const glow = ball?.glow || "#ee1515";
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      angleRef.current += omegaRef.current * dt;
      omegaRef.current *= Math.exp(-1.7 * dt);     // friction → gradual slow-down
      if (Math.abs(omegaRef.current) < 1.5) omegaRef.current = 0;
      const el = spinElRef.current;
      if (el) {
        el.style.transform = `rotate(${angleRef.current}deg)`;
        const charged = Math.abs(omegaRef.current) > 220;
        el.style.filter = charged
          ? `drop-shadow(0 0 15px ${glow}) drop-shadow(0 6px 9px rgba(0,0,0,0.22))`
          : "drop-shadow(0 6px 9px rgba(0,0,0,0.22))";
      }
      spinRafRef.current = requestAnimationFrame(tick);
    };
    spinRafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(spinRafRef.current);
  }, [dragging, ball]);

  // Physics flight: ball launches from the release point with the swing velocity,
  // arcs over an apex toward the Pokémon, faster flick = quicker throw.
  const startFlight = useCallback((rx, ry, vx, vy, curveDir, onDone) => {
    const rect = arenaRef.current?.getBoundingClientRect() ?? { width: 360, height: 540 };
    const ex = rect.width / 2;
    const ey = rect.height * 0.65 - 44;           // lands where the hit phase shows the ball
    const speed = Math.hypot(vx, vy);
    const dur = Math.max(360, Math.min(820, 880 - speed * 0.3));
    const apexY = Math.min(ry, ey) - (90 + Math.min(170, speed * 0.06));
    let apexX = (rx + ex) / 2 + (vx * 0.04);       // initial direction nudges the arc
    if (curveDir === "left")  apexX -= rect.width * 0.18;
    if (curveDir === "right") apexX += rect.width * 0.18;
    const dir = vx >= 0 ? 1 : -1;
    const spin = 360 + Math.min(300, speed * 0.16);
    const t0 = performance.now();
    cancelAnimationFrame(flightRafRef.current);
    const step = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      const x = (1 - t) * (1 - t) * rx + 2 * (1 - t) * t * apexX + t * t * ex;
      const y = (1 - t) * (1 - t) * ry + 2 * (1 - t) * t * apexY + t * t * ey;
      const sc = 1 - 0.36 * t;
      const rot = dir * spin * t;
      if (flyRef.current) {
        flyRef.current.style.transform =
          `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${sc}) rotate(${rot}deg)`;
      }
      if (t < 1) flightRafRef.current = requestAnimationFrame(step);
      else onDone();
    };
    flightRafRef.current = requestAnimationFrame(step);
  }, []);

  const executeThrow = useCallback((throwBonus, critical, release, vel, curveDir) => {
    setFlyStart(release);
    setPhase("throwing");
    catchSounds.playThrow();
    startFlight(release.x, release.y, vel.x, vel.y, curveDir, () => {
      setPhase("hit");
      catchSounds.playHit();
      addTimer(setTimeout(() => {
        setPhase("suckIn");
        catchSounds.playSuckIn();
        addTimer(setTimeout(() => {
          const finalChance = calculateCatchChance(pokemon, ballId, effectiveBerryId, throwBonus);
          // Critical Catch → always succeeds with 1 wobble
          const willCatch = critical ? true : (Math.random() < finalChance);
          // Suspense: a successful catch teases with 4 wobbles (incl. a near-escape)
          const wobblesNeeded = critical ? 1 : (willCatch ? 4 : Math.floor(Math.random() * 3) + 1);
          setWobbleTotal(wobblesNeeded);
          startWobble(0, wobblesNeeded, willCatch);
        }, 700));
      }, 200));
    });
  }, [pokemon, ballId, effectiveBerryId, startFlight]);

  const startWobble = useCallback((count, target, willCatch) => {
    setPhase("wobble");
    setWobbleCount(count);
    // Suspense beat: the 2nd-to-last wobble of a winning attempt "almost breaks free"
    const isNear = willCatch && target >= 3 && count === target - 2;
    setNearEscape(isNear);
    // Click sound for each wobble tick (anticipation)
    if (count > 0) catchSounds.playWobble();
    if (count >= target) {
      setNearEscape(false);
      if (willCatch) {
        setPhase("success");
        // 1) Ball locks closed — short ascending "ding-ding-ding-DING"
        catchSounds.playBallLock();
        // 2) After lock jingle finishes (~0.8s), play the long celebration
        setTimeout(() => catchSounds.playGotcha(), 850);
        setResultMsg(lang === "th" ? "จับได้!" : "Gotcha!");
        try { window.dispatchEvent(new CustomEvent("pokemon:caught")); } catch {}
        setCaughtCount(c => {
          const n = c + 1;
          try { localStorage.setItem("pkdx_caught_count", String(n)); } catch {}
          return n;
        });
        // Extended idle delay so celebration finishes before resetting
        addTimer(setTimeout(() => {
          setPhase("idle"); setThrowQuality(null); setIsCritical(false);
          setWobbleCount(0); setNearEscape(false); setResultMsg(null); setDragPath([]);
          setIsCurveBall(false);
        }, 4200));
      } else {
        setPhase("escape");
        catchSounds.playCatchFail();
        // Play Pokemon cry slightly delayed so it doesn't clash with the fail SFX
        setTimeout(() => catchSounds.playPokemonCry(pokemon), 220);
        setResultMsg(lang === "th" ? "หนีไปแล้ว!" : "Got away!");
        addTimer(setTimeout(() => {
          setPhase("idle"); setThrowQuality(null); setIsCritical(false);
          setWobbleCount(0); setNearEscape(false); setResultMsg(null); setDragPath([]);
        }, 2800));
      }
      return;
    }
    // Slower, more suspenseful cadence — the near-escape beat lingers longest
    addTimer(setTimeout(() => {
      startWobble(count + 1, target, willCatch);
    }, isNear ? 1100 : 820));
  }, [lang, pokemon]);

  // Called when the catch sequence finishes — update counts + reset to idle
  const resetToIdle = () => {
    setPhase("idle"); setSeqData(null); setThrowQuality(null); setIsCritical(false);
    setWobbleCount(0); setNearEscape(false); setResultMsg(null); setDragPath([]); setIsCurveBall(false);
  };

  const handleSeqDone = useCallback((caught) => {
    const mode = seqData?.mode;
    if (caught) {
      try { window.dispatchEvent(new CustomEvent("pokemon:caught")); } catch {}
      setCaughtCount(c => {
        const n = c + 1;
        try { localStorage.setItem("pkdx_caught_count", String(n)); } catch {}
        return n;
      });
      // Combo streak ++
      const newCombo = combo + 1;
      setCombo(newCombo);
      try { localStorage.setItem("pkdx_catch_combo", String(newCombo)); } catch {}
      // Rewards (candy + XP), Pinap/Silver doubles candy
      const q = seqData?.quality;
      const pinap = berryThrown && (berryId === "pinap-berry" || berryId === "silver-pinap");
      let candy = 3 + (q === "excellent" ? 2 : q === "great" ? 1 : 0) + (isCurveBall ? 1 : 0) + (isShiny ? 3 : 0);
      candy = Math.round(candy * (pinap ? 2 : 1));
      const xp = 100 + (q === "excellent" ? 100 : q === "great" ? 50 : q === "nice" ? 10 : 0)
        + (isCurveBall ? 20 : 0) + (isShiny ? 500 : 0) + Math.min(newCombo, 10) * 5;
      try {
        localStorage.setItem("pkdx_candy", String((parseInt(localStorage.getItem("pkdx_candy") ?? "0")) + candy));
        localStorage.setItem("pkdx_xp", String((parseInt(localStorage.getItem("pkdx_xp") ?? "0")) + xp));
      } catch {}
      setReward({ candy, xp, shiny: isShiny });
      addTimer(setTimeout(() => setReward(null), 2600));
      setAttempts(0);
      setBerryThrown(false);
      resetToIdle();
    } else {
      // Failed throw — streak breaks; the Pokémon may flee
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setCombo(0);
      try { localStorage.setItem("pkdx_catch_combo", "0"); } catch {}
      setBerryThrown(false);
      // A whiff (miss) doesn't spook it as much as a broken free / blocked throw
      const engaged = mode === "catch" || mode === "deflect";
      const fleeChance = engaged
        ? Math.min(0.6, 0.06 + (1 - capRate / 255) * 0.28 + newAttempts * 0.05)
        : 0;
      if (Math.random() < fleeChance) {
        setFled(true);
        catchSounds.playRunAway?.();
        setTimeout(() => catchSounds.playPokemonCry?.(pokemon), 200);
        setTimeout(() => onClose?.(), 1800);
        return;
      }
      resetToIdle();
    }
  }, [combo, attempts, seqData, isShiny, isCurveBall, berryThrown, berryId, capRate, pokemon, onClose]);

  const qualityText = (q) => {
    if (lang === "th") return q === "excellent" ? "ยอดเยี่ยม!" : q === "great" ? "เยี่ยม!" : "ดี!";
    return q === "excellent" ? "Excellent!" : q === "great" ? "Great!" : "Nice!";
  };

  return (
    <div className="catch-go-screen"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}>
      <CatchBattleMusic pokemonId={pokemon.id} />

      {/* 🌀 Curve ball trajectory — smooth banana curve, scaled by curveStrength */}
      <style>{(() => {
        const s  = curveStrength;
        const lm = (50 - s * 18).toFixed(1);  // left: gentle lean out (early)
        const rm = (50 + s * 18).toFixed(1);
        const lp = (50 - s * 32).toFixed(1);  // left: furthest out (mid-flight)
        const rp = (50 + s * 32).toFixed(1);
        const r1 = (s * 120).toFixed(0);      // calm rotation, one spin total
        const r2 = (s * 240).toFixed(0);
        const r3 = (s * 360).toFixed(0);
        return `
          @keyframes catch-go-curve-left {
            0%   { bottom: 40px; left: 50%;    transform: translateX(-50%) scale(1)    rotate(0); }
            30%  { bottom: 42%;  left: ${lm}%; transform: translateX(-50%) scale(0.82) rotate(-${r1}deg); }
            62%  { bottom: 58%;  left: ${lp}%; transform: translateX(-50%) scale(0.72) rotate(-${r2}deg); }
            100% { bottom: 35%;  left: 50%;    transform: translateX(-50%) scale(0.64) rotate(-${r3}deg); }
          }
          @keyframes catch-go-curve-right {
            0%   { bottom: 40px; left: 50%;    transform: translateX(-50%) scale(1)    rotate(0); }
            30%  { bottom: 42%;  left: ${rm}%; transform: translateX(-50%) scale(0.82) rotate(${r1}deg); }
            62%  { bottom: 58%;  left: ${rp}%; transform: translateX(-50%) scale(0.72) rotate(${r2}deg); }
            100% { bottom: 35%;  left: 50%;    transform: translateX(-50%) scale(0.64) rotate(${r3}deg); }
          }
        `;
      })()}</style>

      {/* ─── Living backdrop — reacts to real time of day + weather ─── */}
      <div className="catch-go-bg" aria-hidden>
        <BiomeScene condition={sceneCondition} isDay={sceneIsDay} timeOfDay={sceneTimeOfDay} />
      </div>

      {/* ─── Top bar ─── */}
      <div className="catch-go-topbar">
        <button className="catch-go-icon-btn catch-go-close"
          onClick={() => {
            // Play Pokemon cry + run-away sound, then close after a tiny beat
            catchSounds.playRunAway();
            catchSounds.playPokemonCry(pokemon);
            setTimeout(() => onClose?.(), 400);
          }}
          title={lang === "th" ? "ออก" : "Exit"}>
          <Footprints size={19} strokeWidth={2.2} />
        </button>
        <button className="catch-go-icon-btn catch-go-camera"
          onClick={() => setShowTutorial(true)}
          title={lang === "th" ? "คู่มือ" : "Tutorial"}>
          <HelpCircle size={19} strokeWidth={2.2} />
        </button>
        <div className="catch-go-topbar-right">
          {combo > 1 && (
            <div className="catch-go-combo-badge"><Zap size={13} strokeWidth={2.6} /> {combo}× combo</div>
          )}
          <div className="catch-go-counter-badge"><Trophy size={14} strokeWidth={2.3} /> {caughtCount}</div>
        </div>
      </div>

      {/* ─── Name banner (Japandi: airy, wide-tracked) ─── */}
      <div className="catch-go-name-banner">
        <div className="catch-go-name-pill">
          {isShiny && <Sparkles size={15} strokeWidth={2.4} style={{ color: "#fde047", marginRight: 6, filter: "drop-shadow(0 0 5px #fde04788)" }} />}
          <span className="catch-go-pokemon-name-txt" style={isShiny ? { color: "#fde047", textShadow: "0 0 14px rgba(253,224,71,0.55), 0 2px 12px rgba(0,0,0,0.5)" } : undefined}>{pokemonName}</span>
        </div>
        <div className="catch-go-encounter-sub">{isShiny ? (lang === "th" ? "✨ ไชนีหายาก!" : "✨ Shiny encounter!") : (lang === "th" ? "พบโปเกม่อนป่า" : "Wild Encounter")}</div>
        {/* Type pills below */}
        <div className="catch-go-types-row">
          {pokemon.types?.map(t => (
            <span key={t.type.name} className={`catch-go-type-pill type-${t.type.name}`}>
              {t.type.name}
            </span>
          ))}
        </div>
      </div>

      {/* ─── Catch chance ring (small, top-right) ─── */}
      <div className="catch-go-chance-ring" title={`${Math.round(catchChance * 100)}% chance`}>
        <svg viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
          <circle cx="18" cy="18" r="15.5" fill="none"
            stroke={catchChance > 0.7 ? "#22c55e" : catchChance > 0.4 ? "#facc15" : "#ef4444"}
            strokeWidth="3"
            strokeDasharray={`${catchChance * 97.4} 97.4`}
            strokeDashoffset="0"
            strokeLinecap="round"
            transform="rotate(-90 18 18)" />
        </svg>
        <span className="catch-go-chance-pct">{Math.round(catchChance * 100)}<i>%</i></span>
        <span className="catch-go-chance-lbl">{lang === "th" ? "โอกาสจับ" : "Catch rate"}</span>
      </div>

      {/* ─── Main arena (pokemon + drag area) ─── */}
      <div ref={arenaRef}
        className={`catch-go-arena phase-${phase}${dragging ? " dragging" : ""}`}
        style={{ touchAction: "none" }}
        onPointerDown={onDragStart} onPointerMove={onDragMove}
        onPointerUp={onDragEnd} onPointerCancel={onDragEnd}>

        {/* Pokemon (3D) */}
        {(phase === "idle" || phase === "throwing" || phase === "hit" || phase === "suckIn") && (
          <div ref={idleStageRef}
            className={`catch-go-pokemon-stage${pokemonAttacking ? " attacking" : ""}${isShiny ? " shiny" : ""}`}
            style={calm ? { "--sway": "34px" } : undefined}>
            <Catch3DPokemon pokemon={pokemon} pokemonName={pokemonName}
              phase={phase} variant="main" isShiny={isShiny} sizeScale={pokeSizeScale} />
            {/* Soft shadow under feet */}
            <div className="catch-go-pokemon-shadow" />
            {/* ✨ Shiny sparkles around the Pokémon */}
            {isShiny && phase === "idle" && (
              <span className="catch-go-shiny-sparkles" aria-hidden>
                {[0,1,2,3,4].map(i => (
                  <Sparkles key={i} size={i===2?20:14} strokeWidth={2.2}
                    style={{ "--si": i }} />
                ))}
              </span>
            )}

            {/* ─── Capture Ring (pulsing target) — lives inside the stage so it
                 dodges side-to-side together with the Pokémon ─── */}
            {phase === "idle" && (
              <svg
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  pointerEvents: "none",
                  zIndex: 4,
                  width: "300px",
                  height: "300px",
                  overflow: "visible",
                  opacity: pokemonAttacking ? 0 : 1,   // ring vanishes while attacking
                  transition: "opacity 0.3s ease",
                }}
                viewBox="-160 -160 320 320">
                <circle cx="0" cy="0" r="140" fill="none"
                  stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeDasharray="6 8" />
                <circle cx="0" cy="0" r={ringRadius * 0.5} fill="none"
                  stroke={ringZone.color} strokeWidth="4" opacity="0.85"
                  style={{ filter: `drop-shadow(0 0 8px ${ringZone.color})`, transition: "stroke 0.2s ease" }} />
                <circle cx="0" cy="0" r={ringRadius * 0.5} fill="none"
                  stroke={ringZone.color} strokeWidth="2" opacity="0.4" strokeDasharray="2 4" />
              </svg>
            )}
          </div>
        )}

        {/* Pokemon bursts back on escape */}
        {phase === "escape" && (
          <div className="catch-go-pokemon-stage">
            <Catch3DPokemon pokemon={pokemon} pokemonName={pokemonName}
              phase="escape" variant="escape" isShiny={isShiny} sizeScale={pokeSizeScale} />
            <div className="catch-go-pokemon-shadow" />
          </div>
        )}

        {/* Red beams */}
        {phase === "suckIn" && (
          <SuckInEffect />
        )}

        {/* ─── Catch sequence (Suspense) — replaces throw→catch visuals ─── */}
        {phase === "sequence" && seqData && (
          <CatchSequence
            pokemon={pokemon} pokemonName={pokemonName} ballId={ballId} ball={ball}
            releaseX={seqData.releaseX} aimX={seqData.aimX} pokeX={seqData.pokeX}
            curveDir={seqData.curveDir} curveStrength={seqData.curveStrength}
            mode={seqData.mode} quality={seqData.quality} shiny={isShiny} sizeScale={pokeSizeScale}
            willCatch={seqData.willCatch} critical={seqData.critical}
            lang={lang} onDone={handleSeqDone} />
        )}

        {/* Dragging element — follows pointer; inner element spins via physics
            (rotation + glow are driven imperatively in the spin rAF loop) */}
        {dragging && (
          <div className="catch-go-ball-dragging"
            style={{
              position: "absolute",
              left: ballPos.x,
              top: ballPos.y,
              transform: "translate(-50%, -50%)",
              zIndex: 7,
              pointerEvents: "none",
            }}>
            <div ref={spinElRef} style={{ willChange: "transform, filter" }}>
              {currentThrowable === "berry" ? (
                <BerryImg berryId={berryId} size={88} />
              ) : (
                <PokeballImg ballId={ballId} size={88} glow />
              )}
            </div>
          </div>
        )}

        {/* Throwing — physics flight (position driven by JS in startFlight) */}
        {phase === "throwing" && (
          <div ref={flyRef}
            style={{
              position: "absolute", left: 0, top: 0,
              transform: `translate(${flyStart.x}px, ${flyStart.y}px) translate(-50%, -50%)`,
              zIndex: 7, pointerEvents: "none",
              filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.25))",
            }}>
            <PokeballImg ballId={ballId} size={88} glow />
            {isCurveBall && (
              <span style={{
                position: "absolute", inset: "-8px", borderRadius: "50%",
                boxShadow: `inset 0 0 12px ${ball.glow}, 0 0 16px ${ball.glow}88`,
                pointerEvents: "none",
              }} />
            )}
          </div>
        )}

        {/* Hit / suckIn — ball settles on the Pokémon */}
        {(phase === "hit" || phase === "suckIn") && (
          <div className={`catch-go-ball-fly phase-${phase}`}>
            <PokeballImg ballId={ballId} size={88} glow />
          </div>
        )}

        {/* Wobble — beautiful tilt + aura + glowing progress dots */}
        {phase === "wobble" && (
          <WobbleEffect ballId={ballId} wobbleCount={wobbleCount}
            total={wobbleTotal} nearEscape={nearEscape} lang={lang} />
        )}

        {/* Success */}
        {phase === "success" && (
          <>
            <div className="catch-go-ball-success">
              <PokeballImg ballId={ballId} size={100} glow animate />
              {/* GO-style confirmation stars on the ball */}
              <span className="catch-go-catch-stars" aria-hidden>
                {[0, 1, 2].map(i => (
                  <Star key={i} className="catch-go-catch-star" style={{ "--si": i }}
                    size={i === 1 ? 26 : 20} strokeWidth={1.8} fill="#fde047" color="#f59e0b" />
                ))}
              </span>
            </div>
            {Array.from({ length: 16 }).map((_, i) => (
              <span key={i} className="catch-go-sparkle" style={{
                "--i": i, "--angle": `${(360/16) * i}deg`,
              }} />
            ))}
          </>
        )}

        {/* Quality banner */}
        {throwQuality && (phase === "throwing" || phase === "hit") && (
          <div className={`catch-go-quality-banner quality-${throwQuality}`}>
            {qualityText(throwQuality)}
          </div>
        )}

        {/* ⭐ CRITICAL CATCH banner — appears during hit/suckIn */}
        {isCritical && (phase === "hit" || phase === "suckIn" || phase === "wobble") && (
          <div style={{
            position: "absolute",
            top: "30%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 10,
            padding: "10px 24px",
            borderRadius: "999px",
            background: "linear-gradient(135deg, #fef3c7 0%, #f59e0b 50%, #b45309 100%)",
            boxShadow: "0 0 30px rgba(251, 191, 36, 0.9), 0 8px 24px rgba(245, 158, 11, 0.6)",
            color: "#7c2d12",
            fontSize: "20px",
            fontWeight: 900,
            letterSpacing: "2px",
            textTransform: "uppercase",
            textShadow: "0 1px 2px rgba(255,255,255,0.6)",
            border: "2px solid #fbbf24",
            animation: "catch-go-quality-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
            whiteSpace: "nowrap",
            display: "inline-flex", alignItems: "center", gap: 8,
          }}>
            <Star size={17} strokeWidth={2.4} fill="currentColor" /> CRITICAL CATCH <Star size={17} strokeWidth={2.4} fill="currentColor" />
          </div>
        )}

        {/* 🌀 CURVE BALL banner — shown during throwing */}
        {isCurveBall && (phase === "throwing" || phase === "hit") && (
          <div style={{
            position: "absolute",
            top: "22%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 10,
            padding: "8px 22px",
            borderRadius: "999px",
            background: "linear-gradient(135deg, #06b6d4 0%, #0e7490 100%)",
            boxShadow: "0 0 24px rgba(6, 182, 212, 0.7), 0 6px 20px rgba(14, 116, 144, 0.5)",
            color: "white",
            fontSize: "16px",
            fontWeight: 900,
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            textShadow: "0 2px 6px rgba(0,0,0,0.4)",
            border: "2px solid rgba(255,255,255,0.3)",
            animation: "catch-go-quality-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
            whiteSpace: "nowrap",
            display: "inline-flex", alignItems: "center", gap: 7,
          }}>
            <Tornado size={16} strokeWidth={2.4} /> CURVE BALL
          </div>
        )}

        {/* ═══ Pokemon GO style RESULT screen ═══════════════════ */}
        {resultMsg && phase === "success" && (
          <CatchSuccessScreen
            pokemon={pokemon}
            pokemonName={pokemonName}
            ballId={ballId}
            ball={ball}
            bonuses={bonuses}
            caughtCount={caughtCount}
            isCritical={isCritical}
            lang={lang}
          />
        )}

        {/* Fail/escape result (smaller, less dramatic) */}
        {resultMsg && phase === "escape" && (
          <CatchFailScreen pokemonName={pokemonName} lang={lang} />
        )}

        {/* Draggable throwable inside arena (ball OR berry) */}
        {phase === "idle" && !dragging && (
          <div
            style={{
              position: "absolute",
              bottom: "16px",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 6,
              pointerEvents: "auto",
            }}>
            <div className="catch-go-ready-ball-wrap"
              style={{
                filter: "drop-shadow(0 12px 28px rgba(0, 0, 0, 0.5))",
                animation: "catch-go-ball-ready-pulse 2.2s ease-in-out infinite",
                cursor: "grab",
              }}>
              {currentThrowable === "berry" ? (
                <BerryImg berryId={berryId} size={110} animate />
              ) : (
                <PokeballImg ballId={ballId} size={110} glow />
              )}
            </div>
          </div>
        )}

        {/* Berry flying to Pokemon (smooth curved animation) */}
        {berryFlying && (
          <BerryFlyAnimation berryId={berryId} />
        )}

        {/* Berry-thrown badge (small indicator next to pokemon) */}
        {berryThrown && phase === "idle" && (
          <div style={{
            position: "absolute",
            top: "8%",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(34, 197, 94, 0.92)",
            color: "white",
            padding: "5px 12px",
            borderRadius: "999px",
            fontSize: "12px",
            fontWeight: 700,
            boxShadow: "0 4px 12px rgba(34, 197, 94, 0.5)",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            zIndex: 8,
          }}>
            <BerryImg berryId={berryId} size={18} />
            {lang === "th" ? "เบอร์รี่ทำงาน!" : "Berry active!"}
          </div>
        )}
      </div>

      {/* ─── Drag hint (Japandi, idle only) ─── */}
      {phase === "idle" && !dragging && (
        <div className="catch-go-drag-hint">{lang === "th" ? "ลากเพื่อขว้าง" : "drag to throw"}</div>
      )}

      {/* ─── Bottom bar: Berry (left) + Ball selector (right) ─── */}
      <div className="catch-go-bottombar">
        {/* Berry button — opens picker (throw is via center throwable) */}
        <div className="catch-go-dock-item">
          <button className={`catch-go-bottom-btn berry${berryThrown ? " berry-used" : ""}`}
            onClick={() => setShowBerryPicker(true)}
            disabled={phase !== "idle" || berryFlying}
            style={berryThrown ? { opacity: 0.6 } : undefined}
            title={lang === "th" ? "เลือกเบอร์รี่" : "Select berry"}>
            {berry ? <BerryImg berryId={berryId} size={42} /> : <BerryImg berryId="razz-berry" size={42} />}
          </button>
          <span className="catch-go-dock-label">{lang === "th" ? "เบอร์รี่" : "Berry"}</span>
        </div>

        {/* placeholder to keep visual layout balanced */}
        <div className="catch-go-ball-placeholder" />

        {/* Ball selector — no count badge */}
        <div className="catch-go-dock-item">
          <button className="catch-go-bottom-btn ball-select"
            onClick={() => setShowBallPicker(true)}
            disabled={phase !== "idle"}
            title={lang === "th" ? "เลือกบอล" : "Select ball"}>
            <PokeballImg ballId={ballId} size={42} />
          </button>
          <span className="catch-go-dock-label">{lang === "th" ? "บอล" : "Ball"}</span>
        </div>
      </div>

      {/* Pickers */}
      {showBallPicker && (
        <BallPicker selectedId={ballId} onSelect={setBallId}
          onClose={() => setShowBallPicker(false)} lang={lang} />
      )}
      {showBerryPicker && (
        <BerryPicker selectedId={berryId} onSelect={setBerryId}
          onClose={() => setShowBerryPicker(false)} lang={lang} />
      )}

      {/* 🎓 Tutorial overlay — shown on first open + reopened via ? button */}
      {showTutorial && (
        <CatchTutorial
          onClose={() => setShowTutorial(false)}
          lang={lang}
        />
      )}

      {/* 🍬 Reward toast after a catch */}
      {reward && (
        <div className="catch-go-reward-toast">
          {reward.shiny && <span className="catch-go-reward-shiny"><Sparkles size={13} strokeWidth={2.4} /> {lang === "th" ? "ไชนี!" : "Shiny!"}</span>}
          <span className="catch-go-reward-item">+{reward.candy} <span className="catch-go-reward-lbl">{lang === "th" ? "แคนดี้" : "Candy"}</span></span>
          <span className="catch-go-reward-dot">·</span>
          <span className="catch-go-reward-item">+{reward.xp} <span className="catch-go-reward-lbl">XP</span></span>
        </div>
      )}

      {/* 🏃 Flee overlay — the Pokémon escaped, encounter over */}
      {fled && (
        <div className="catch-go-flee-overlay">
          <Footprints size={40} strokeWidth={2} />
          <div className="catch-go-flee-title">{lang === "th" ? "โปเกม่อนหนีไปแล้ว!" : "It fled!"}</div>
          <div className="catch-go-flee-sub">{pokemonName} {lang === "th" ? "หนีหายไป…" : "ran away…"}</div>
        </div>
      )}
    </div>
  );
}

// ─── Berry flying animation: smooth curved trajectory ─────────
// Goes from bottom-left berry button → up and curving to Pokemon center
function BerryFlyAnimation({ berryId }) {
  const [stage, setStage] = useState("start"); // start | mid | end

  useEffect(() => {
    const t1 = setTimeout(() => setStage("mid"), 30);
    const t2 = setTimeout(() => setStage("end"), 600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const styleStart = { left: "50%", bottom: "8%",  transform: "translate(-50%,50%) scale(1.0) rotate(0deg)",   opacity: 1 };
  const styleMid   = { left: "50%", bottom: "55%", transform: "translate(-50%,50%) scale(1.4) rotate(360deg)", opacity: 1 };
  const styleEnd   = { left: "50%", bottom: "48%", transform: "translate(-50%,50%) scale(0.4) rotate(720deg)", opacity: 0 };

  const current = stage === "start" ? styleStart : stage === "mid" ? styleMid : styleEnd;
  const berry = BERRIES.find(b => b.id === berryId);

  return (
    <>
      <div style={{
        position: "absolute",
        zIndex: 9,
        pointerEvents: "none",
        transition: "all 0.55s cubic-bezier(0.45, 0, 0.55, 1)",
        ...current,
      }}>
        <BerryImg berryId={berryId} size={68} animate />
      </div>

      {/* +% boost indicator that appears at the end */}
      {stage === "mid" && berry && (
        <div style={{
          position: "absolute",
          top: "30%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 10,
          pointerEvents: "none",
          background: "linear-gradient(135deg, #22c55e, #16a34a)",
          color: "white",
          padding: "6px 14px",
          borderRadius: "999px",
          fontSize: "14px",
          fontWeight: 800,
          whiteSpace: "nowrap",
          boxShadow: "0 6px 20px rgba(34,197,94,0.6)",
          animation: "catch-go-quality-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}>
          +{Math.round((berry.mult - 1) * 100)}% catch chance!
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// CatchSuccessScreen — Pokemon GO style celebration after catch
// Full-screen overlay with sparkles, big Pokeball, XP breakdown
// ═══════════════════════════════════════════════════════════
function CatchSuccessScreen({ pokemon, pokemonName, ballId, ball, bonuses, caughtCount, isCritical, lang }) {
  // 30 confetti particles with random colors/positions
  const confetti = useMemo(() => {
    const colors = ["#fbbf24", "#facc15", "#34d399", "#b5302d", "#f472b6", "#a78bfa", "#fb923c"];
    return Array.from({ length: 36 }).map((_, i) => ({
      id: i,
      top: 5 + Math.random() * 80,
      left: 5 + Math.random() * 90,
      color: colors[i % colors.length],
      size: 5 + Math.random() * 8,
      delay: Math.random() * 0.6,
      dur: 1.6 + Math.random() * 1.4,
      drift: (Math.random() - 0.5) * 200,
    }));
  }, []);

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "radial-gradient(ellipse at center, rgba(15,35,80,0.78) 0%, rgba(0,5,20,0.95) 100%)",
      backdropFilter: "blur(10px)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 100,
      animation: "catch-go-overlay-in 0.4s ease",
      padding: "24px",
      overflow: "hidden",
    }}>
      {/* Star burst rays behind ball */}
      <div style={{
        position: "absolute",
        top: "32%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "500px",
        height: "500px",
        background: "conic-gradient(from 0deg, rgba(251,191,36,0) 0deg, rgba(251,191,36,0.35) 8deg, rgba(251,191,36,0) 16deg, rgba(251,191,36,0) 36deg, rgba(251,191,36,0.35) 44deg, rgba(251,191,36,0) 52deg, rgba(251,191,36,0) 72deg, rgba(251,191,36,0.35) 80deg, rgba(251,191,36,0) 88deg, rgba(251,191,36,0) 108deg, rgba(251,191,36,0.35) 116deg, rgba(251,191,36,0) 124deg, rgba(251,191,36,0) 144deg, rgba(251,191,36,0.35) 152deg, rgba(251,191,36,0) 160deg, rgba(251,191,36,0) 180deg, rgba(251,191,36,0.35) 188deg, rgba(251,191,36,0) 196deg, rgba(251,191,36,0) 216deg, rgba(251,191,36,0.35) 224deg, rgba(251,191,36,0) 232deg, rgba(251,191,36,0) 252deg, rgba(251,191,36,0.35) 260deg, rgba(251,191,36,0) 268deg, rgba(251,191,36,0) 288deg, rgba(251,191,36,0.35) 296deg, rgba(251,191,36,0) 304deg, rgba(251,191,36,0) 324deg, rgba(251,191,36,0.35) 332deg, rgba(251,191,36,0) 340deg, rgba(251,191,36,0) 360deg)",
        animation: "catch-go-sunburst-spin 12s linear infinite",
        opacity: 0.55,
        pointerEvents: "none",
      }} />

      {/* Confetti particles */}
      {confetti.map(c => (
        <div key={c.id} style={{
          position: "absolute",
          top: `${c.top}%`,
          left: `${c.left}%`,
          width: `${c.size}px`,
          height: `${c.size}px`,
          background: c.color,
          borderRadius: i_isStar(c.id) ? "0" : "50%",
          clipPath: i_isStar(c.id) ? "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)" : "none",
          boxShadow: `0 0 ${c.size}px ${c.color}`,
          animation: `catch-go-confetti-fall ${c.dur}s ease-out ${c.delay}s forwards`,
          ['--drift']: `${c.drift}px`,
          opacity: 0,
        }} />
      ))}

      <style>{`
        @keyframes catch-go-confetti-fall {
          0%   { transform: translateY(-40px) translateX(0) rotate(0deg); opacity: 0; }
          10%  { opacity: 1; }
          100% { transform: translateY(60vh) translateX(var(--drift)) rotate(720deg); opacity: 0; }
        }
        @keyframes catch-go-sunburst-spin {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to   { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes catch-go-success-ball-pop {
          0%   { transform: scale(0) rotate(-30deg); }
          50%  { transform: scale(1.3) rotate(15deg); }
          70%  { transform: scale(0.95) rotate(-8deg); }
          100% { transform: scale(1) rotate(0); }
        }
        @keyframes catch-go-gotcha-text-in {
          0%   { transform: scale(0) translateY(20px); opacity: 0; }
          60%  { transform: scale(1.15) translateY(0); opacity: 1; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes catch-go-bonus-row-in {
          from { transform: translateX(20px); opacity: 0; }
          to   { transform: translateX(0); opacity: 1; }
        }
      `}</style>

      {/* Big Pokeball with golden glow */}
      <div style={{
        position: "relative",
        marginBottom: "32px",
        animation: "catch-go-success-ball-pop 0.9s cubic-bezier(0.34, 1.56, 0.64, 1)",
        filter: "drop-shadow(0 0 30px #fbbf24) drop-shadow(0 0 60px rgba(251,191,36,0.6))",
      }}>
        <PokeballImg ballId={ballId} size={180} glow />
        {/* Pulse ring around ball */}
        <div style={{
          position: "absolute",
          inset: "-20px",
          borderRadius: "50%",
          border: "3px solid rgba(251,191,36,0.4)",
          animation: "catch-go-ball-ready-pulse 1.5s ease-in-out infinite",
        }} />
      </div>

      {/* "GOTCHA!" big text */}
      <div style={{
        fontSize: "clamp(36px, 9vw, 56px)",
        fontWeight: 900,
        color: "white",
        textShadow: "0 4px 16px rgba(0,0,0,0.7), 0 0 24px rgba(251,191,36,0.8), 0 0 40px rgba(251,191,36,0.5)",
        letterSpacing: "3px",
        marginBottom: "6px",
        animation: "catch-go-gotcha-text-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s backwards",
        textAlign: "center",
        display: "inline-flex", alignItems: "center", gap: 10, justifyContent: "center",
      }}>
        <Sparkles size={26} strokeWidth={2.4} /> GOTCHA! <Sparkles size={26} strokeWidth={2.4} />
      </div>

      {/* Critical Catch tag (if critical) */}
      {isCritical && (
        <div style={{
          background: "linear-gradient(135deg, #fef3c7, #f59e0b)",
          color: "#7c2d12",
          padding: "4px 14px",
          borderRadius: "999px",
          fontSize: "12px",
          fontWeight: 900,
          letterSpacing: "1.5px",
          marginBottom: "12px",
          boxShadow: "0 4px 12px rgba(251,191,36,0.6)",
          border: "2px solid #fbbf24",
          animation: "catch-go-gotcha-text-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.4s backwards",
          display: "inline-flex", alignItems: "center", gap: 6,
        }}>
          <Star size={13} strokeWidth={2.4} fill="currentColor" /> CRITICAL CATCH <Star size={13} strokeWidth={2.4} fill="currentColor" />
        </div>
      )}

      {/* "[Pokemon] was caught!" */}
      <div style={{
        fontSize: "clamp(16px, 4vw, 20px)",
        fontWeight: 700,
        color: "rgba(255,255,255,0.96)",
        textShadow: "0 2px 8px rgba(0,0,0,0.6)",
        marginBottom: "24px",
        animation: "catch-go-gotcha-text-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s backwards",
        textAlign: "center",
      }}>
        {lang === "th" ? `${pokemonName} ถูกจับเรียบร้อย!` : `${pokemonName} was caught!`}
      </div>

      {/* Bonus chips (only if any bonuses applied) */}
      {bonuses.length > 0 && (
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "8px",
          maxWidth: "340px",
          width: "100%",
          animation: "catch-go-result-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.5s backwards",
        }}>
          {bonuses.map((b, idx) => (
            <div key={idx} style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 14px",
              background: "rgba(255, 255, 255, 0.95)",
              borderRadius: "999px",
              fontSize: "12px",
              fontWeight: 700,
              color: b.color,
              boxShadow: `0 4px 12px ${b.color}55, 0 0 0 1px ${b.color}33`,
              border: `1.5px solid ${b.color}44`,
              animation: `catch-go-bonus-row-in 0.4s ease ${0.6 + idx * 0.08}s backwards`,
            }}>
              <b.Icon size={14} strokeWidth={2.4} />
              <span>{b.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Pokeball badge at bottom */}
      <div style={{
        marginTop: "20px",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(10px)",
        padding: "8px 18px",
        borderRadius: "999px",
        animation: "catch-go-bonus-row-in 0.5s ease 1.2s backwards",
        border: "1px solid rgba(255,255,255,0.18)",
      }}>
        <PokeballImg ballId={ballId} size={24} />
        <span style={{ color: "white", fontSize: "12px", fontWeight: 600 }}>
          {ball.name} · #{caughtCount} {lang === "th" ? "ตัว" : "caught"}
        </span>
      </div>

    </div>
  );
}

// Star vs circle alternation (every 3rd is star)
function i_isStar(idx) { return idx % 3 === 0; }

// ═══════════════════════════════════════════════════════════
// CatchFailScreen — Pokemon GO style "Oh no!" top banner
// ═══════════════════════════════════════════════════════════
function CatchFailScreen({ pokemonName, lang }) {
  return (
    <>
      <style>{`
        @keyframes fail-banner-in {
          0%   { transform: translate(-50%, -160%) scale(0.85); opacity: 0; }
          70%  { transform: translate(-50%, 8%)    scale(1.05); opacity: 1; }
          100% { transform: translate(-50%, 0)     scale(1);    opacity: 1; }
        }
        @keyframes fail-shake-icon {
          0%, 100% { transform: rotate(0); }
          25%      { transform: rotate(-14deg); }
          50%      { transform: rotate(0); }
          75%      { transform: rotate(14deg); }
        }
        @keyframes fail-pulse-glow {
          0%, 100% { box-shadow: 0 12px 40px rgba(239,68,68,0.45), 0 0 0 1px rgba(255,255,255,0.15); }
          50%      { box-shadow: 0 16px 50px rgba(239,68,68,0.65), 0 0 0 1px rgba(255,255,255,0.25); }
        }
        @keyframes fail-debris {
          0%   { transform: translate(0, 0) rotate(0deg) scale(0); opacity: 0; }
          20%  { transform: translate(0, 0) rotate(0deg) scale(1); opacity: 1; }
          100% { transform: translate(var(--dx), var(--dy)) rotate(var(--rot)) scale(0.3); opacity: 0; }
        }
      `}</style>

      {/* Ball-break debris particles */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * 360;
        const dx = Math.cos(angle * Math.PI / 180) * 120;
        const dy = Math.sin(angle * Math.PI / 180) * 120;
        return (
          <div key={i} style={{
            position: "absolute",
            top: "55%",
            left: "50%",
            width: "8px",
            height: "12px",
            background: i % 2 === 0 ? "#dc2626" : "#fafafa",
            borderRadius: "2px",
            transform: "translate(-50%, -50%)",
            zIndex: 11,
            pointerEvents: "none",
            animation: `fail-debris 0.9s ease-out forwards`,
            '--dx': `${dx}px`,
            '--dy': `${dy}px`,
            '--rot': `${(Math.random() - 0.5) * 720}deg`,
          }} />
        );
      })}

      {/* Top sliding banner — positioned BELOW name banner so it doesn't overlap Pokemon */}
      <div style={{
        position: "absolute",
        top: "175px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 12,
        animation: "fail-banner-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}>
        <div style={{
          background: "linear-gradient(135deg, rgba(220,38,38,0.92) 0%, rgba(127,29,29,0.96) 100%)",
          backdropFilter: "blur(20px)",
          border: "2px solid rgba(255,255,255,0.28)",
          borderRadius: "22px",
          padding: "14px 24px",
          minWidth: "260px",
          maxWidth: "340px",
          display: "flex",
          alignItems: "center",
          gap: "14px",
          color: "white",
          animation: "fail-pulse-glow 2s ease-in-out infinite",
        }}>
          <div style={{
            display: "inline-flex", color: "#fca5a5",
            animation: "fail-shake-icon 0.5s ease 3",
            filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.4))",
          }}><Zap size={34} strokeWidth={2.2} /></div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: "22px",
              fontWeight: 900,
              letterSpacing: "0.5px",
              textShadow: "0 2px 6px rgba(0,0,0,0.4)",
              lineHeight: 1.1,
            }}>
              {lang === "th" ? "หลุดมือ!" : "Oh no!"}
            </div>
            <div style={{
              fontSize: "12px",
              fontWeight: 600,
              opacity: 0.95,
              marginTop: "3px",
            }}>
              {pokemonName} {lang === "th" ? "หนีไปแล้ว!" : "broke free!"}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// WobbleEffect — beautiful wobble with aura + glowing dots
// ═══════════════════════════════════════════════════════════
function WobbleEffect({ ballId, wobbleCount, total = 3, nearEscape = false, lang = "en" }) {
  const accent = nearEscape ? "239, 68, 68" : "251, 191, 36"; // red on near-escape, else gold
  return (
    <>
      <style>{`
        @keyframes wobble-aura-pulse {
          0%, 100% { transform: scale(0.92); opacity: 0.25; }
          50%      { transform: scale(1.18); opacity: 0.75; }
        }
        @keyframes wobble-aura-pulse-2 {
          0%, 100% { transform: scale(0.98); opacity: 0.5; }
          50%      { transform: scale(1.12); opacity: 0.85; }
        }
        @keyframes wobble-tilt {
          0%, 100% { transform: rotate(0); }
          25%      { transform: rotate(-26deg); }
          50%      { transform: rotate(0); }
          75%      { transform: rotate(26deg); }
        }
        @keyframes wobble-tilt-hard {
          0%, 100% { transform: rotate(0); }
          15%      { transform: rotate(-44deg); }
          40%      { transform: rotate(6deg); }
          65%      { transform: rotate(44deg); }
          85%      { transform: rotate(-8deg); }
        }
        @keyframes wobble-near-flash {
          0%   { opacity: 0; }
          30%  { opacity: 0.9; }
          100% { opacity: 0; }
        }
        @keyframes wobble-near-label {
          0%   { opacity: 0; transform: translateX(-50%) scale(0.8); }
          25%  { opacity: 1; transform: translateX(-50%) scale(1.08); }
          80%  { opacity: 1; transform: translateX(-50%) scale(1); }
          100% { opacity: 0; transform: translateX(-50%) scale(1); }
        }
        @keyframes wobble-dot-pop {
          0%   { transform: scale(0); }
          70%  { transform: scale(1.4); }
          100% { transform: scale(1.2); }
        }
      `}</style>

      {/* Suspense red flash + "almost broke free" label */}
      {nearEscape && (
        <>
          <div style={{
            position: "absolute", inset: 0, zIndex: 5, pointerEvents: "none",
            background: "radial-gradient(60% 50% at 50% 60%, rgba(239,68,68,0.45) 0%, transparent 70%)",
            animation: "wobble-near-flash 0.9s ease-out",
          }} />
          <div style={{
            position: "absolute", top: "30%", left: "50%", zIndex: 11,
            transform: "translateX(-50%)", pointerEvents: "none",
            padding: "8px 22px", borderRadius: "999px",
            background: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)",
            color: "#fff", fontSize: "17px", fontWeight: 900, letterSpacing: "1px",
            textShadow: "0 2px 6px rgba(0,0,0,0.4)", whiteSpace: "nowrap",
            boxShadow: "0 8px 24px rgba(239,68,68,0.6)",
            animation: "wobble-near-label 1.05s ease-out",
          }}>
            {lang === "th" ? "เกือบหลุด!" : "Almost!"}
          </div>
        </>
      )}

      <div style={{
        position: "absolute",
        left: "50%",
        bottom: "26%",
        transform: "translateX(-50%)",
        zIndex: 6,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "22px",
        filter: "drop-shadow(0 16px 30px rgba(0, 0, 0, 0.55))",
      }}>
        {/* Aura container around ball */}
        <div style={{
          position: "relative",
          width: "140px",
          height: "140px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          {/* Outer aura ring */}
          <div style={{
            position: "absolute",
            inset: "-24px",
            border: `2px solid rgba(${accent}, 0.35)`,
            borderRadius: "50%",
            animation: "wobble-aura-pulse 1.4s ease-in-out infinite",
            pointerEvents: "none",
          }} />
          {/* Inner aura ring */}
          <div style={{
            position: "absolute",
            inset: "-10px",
            border: `3px solid rgba(${accent}, 0.6)`,
            borderRadius: "50%",
            animation: "wobble-aura-pulse-2 1s ease-in-out 0.2s infinite",
            pointerEvents: "none",
          }} />
          {/* Soft glow background */}
          <div style={{
            position: "absolute",
            inset: "-30px",
            borderRadius: "50%",
            background: `radial-gradient(circle, rgba(${accent},0.35) 0%, transparent 65%)`,
            filter: "blur(8px)",
            pointerEvents: "none",
          }} />

          {/* Ball with tilt — keyed so animation restarts each wobble;
              near-escape = a harder, more violent shake */}
          <div
            key={`wobble-${wobbleCount}`}
            style={{
              width: "130px",
              height: "130px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: nearEscape ? "wobble-tilt-hard 0.9s ease" : "wobble-tilt 0.7s ease",
            }}>
            <PokeballImg ballId={ballId} size={130} glow />
          </div>
        </div>

        {/* Progress dots — glowing gold when filled */}
        <div style={{
          display: "flex",
          gap: "16px",
          padding: "10px 18px",
          background: "rgba(0, 0, 0, 0.45)",
          backdropFilter: "blur(8px)",
          borderRadius: "999px",
          border: "1px solid rgba(255, 255, 255, 0.15)",
        }}>
          {Array.from({ length: Math.max(3, total) }).map((_, i) => {
            const active = i < wobbleCount;
            return (
              <div key={i} style={{
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                background: active
                  ? "radial-gradient(circle at 35% 35%, #fef3c7 0%, #fbbf24 60%, #d97706 100%)"
                  : "rgba(255, 255, 255, 0.18)",
                border: active ? "2px solid #fde047" : "2px solid rgba(255, 255, 255, 0.35)",
                boxShadow: active
                  ? "0 0 14px #fbbf24, 0 0 28px rgba(251, 191, 36, 0.7), inset 0 1px 2px rgba(255,255,255,0.6)"
                  : "inset 0 1px 2px rgba(0,0,0,0.2)",
                animation: active ? `wobble-dot-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.05}s backwards` : "none",
                transition: "all 0.3s ease",
              }} />
            );
          })}
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// CatchSequence — full catch animation (Suspense style, ported 1:1
// from the approved mockup). Self-contained WAAPI timeline:
//   throw → hit → suck-in → drop → wobble ×N (+near-escape) → caught/fail
// ═══════════════════════════════════════════════════════════
function CatchSequence({ pokemon, pokemonName, ballId, ball, releaseX = 0, aimX = 0, pokeX = 0, curveDir = null, curveStrength = 0, mode = "catch", quality = null, shiny = false, sizeScale = 1, willCatch, critical, lang, onDone }) {
  const rootRef  = useRef(null);
  const pokeRef  = useRef(null);
  const ballRef  = useRef(null);
  const flashRef = useRef(null);
  const nearRef  = useRef(null);
  const labelRef = useRef(null);
  const starsRef = useRef(null);

  useEffect(() => {
    let dead = false;
    const timers = [];
    // Single shared clock: audio + visuals are both fired at the same absolute
    // timestamps → perfectly in sync (no await/rAF jitter, no drift).
    const at = (ms, fn) => { timers.push(setTimeout(() => { if (!dead) fn(); }, Math.max(0, ms))); };
    const anim = (node, frames, opts) => node.animate(frames, { fill: "forwards", ...opts });
    // minimal transient label — clean text that fades in then out
    const showLabel = (ref, text, color = "#fff", dur = 1100) => {
      const lbl = ref.current; if (!lbl) return;
      lbl.textContent = text; lbl.style.color = color;
      lbl.animate([
        { opacity: 0, transform: "translateX(-50%) translateY(6px)" },
        { opacity: 1, transform: "translateX(-50%) translateY(0)", offset: .25 },
        { opacity: 1, transform: "translateX(-50%) translateY(0)", offset: .8 },
        { opacity: 0, transform: "translateX(-50%) translateY(-4px)" },
      ], { duration: dur, easing: "ease-out" });
    };

    const root = rootRef.current;
    const ball = ballRef.current, poke = pokeRef.current, flash = flashRef.current;
    if (!root || !ball || !poke) return;

    // Measure the actual Pokémon stage so the ball flies to the real model
    const H = root.clientHeight || 540, W = root.clientWidth || 360;
    const rr = root.getBoundingClientRect();
    const pr = poke.getBoundingClientRect();
    const cy = rr.top + rr.height / 2;
    const pokeY  = (pr.top + pr.height * 0.52) - cy;
    const RELX   = Math.max(-W * 0.4, Math.min(W * 0.4, releaseX));
    const startY = H * 0.34;
    const apexY  = pokeY - H * 0.16;
    const catchY = pokeY;
    const groundY = (pr.bottom - cy) - H * 0.06;
    // Curve scales with how hard the player spun (curveStrength 0..1) and
    // bends toward the spin direction → throw banana-curves by feel.
    const cs = Math.max(0, Math.min(1, curveStrength));
    const dirSign = curveDir === "right" ? 1 : curveDir === "left" ? -1 : 0;
    const bend = dirSign * W * (0.14 + 0.34 * cs);        // more spin = more curve
    const spin = 360 + cs * (dirSign !== 0 ? 560 : 160);  // more spin = more rotation

    // The Pokémon stays where it dodged to (pokeX); the ball flies to where the
    // player aimed. A catch/deflect converges on the Pokémon; a miss sails to aim.
    const BX = (mode === "miss") ? aimX : pokeX;          // ball settle X
    const swingX = RELX + bend;                            // early swing out to the side
    const apexX  = (RELX + BX) / 2 + bend * 0.55;          // still curving at the peak
    const pb = (dx = 0) => `calc(-50% + ${pokeX + dx}px)`; // poke X base
    const bx = (dx = 0) => `calc(-50% + ${BX + dx}px)`;    // ball X base

    // initial poses
    ball.style.transform = `translate(calc(-50% + ${RELX}px), ${startY}px) scale(1)`;
    poke.style.transform = `translateX(${pb()}) scale(1)`;
    poke.style.transformOrigin = "center bottom";

    // Deterministic wobble plan (decided up front so the timeline is fixed)
    const showNear = willCatch && !critical && Math.random() < 0.3;
    const target = critical ? 1 : (willCatch ? (showNear ? 4 : 3) : Math.floor(Math.random() * 3) + 1);

    // ── Phase durations / start times (ms from t0) ──
    const D = { throw: 600, hit: 200, suck: 520, drop: 420 };
    const T = { hit: 600, suck: 800, drop: 1320, wobble: 1740 };

    // ── THROW — fire immediately (zero lag on release), banana-arcs to the aim ──
    catchSounds.playThrow?.();
    anim(ball, [
      { transform: `translate(calc(-50% + ${RELX}px), ${startY}px) rotate(0deg) scale(1)` },
      { transform: `translate(calc(-50% + ${swingX}px), ${(startY + apexY) / 2}px) rotate(${spin * 0.35}deg) scale(.88)`, offset: .3 },
      { transform: `translate(calc(-50% + ${apexX}px), ${apexY}px) rotate(${spin * 0.66}deg) scale(.72)`, offset: .62 },
      { transform: `translate(${bx()}, ${catchY}px) rotate(${spin}deg) scale(.5)` },
    ], { duration: D.throw, easing: "cubic-bezier(.3,.7,.4,1)" });

    // ── DEFLECT — Pokémon attacks, knocks the ball away (no catch) ──
    if (mode === "deflect") {
      at(T.hit, () => {
        catchSounds.playHit?.();
        anim(flash, [{ opacity: 0 }, { opacity: .55, offset: .3 }, { opacity: 0 }], { duration: 240, easing: "ease-out" });
        anim(poke, [
          { transform: `translateX(${pb()}) translateY(0) scale(1)` },
          { transform: `translateX(${pb()}) translateY(-8px) scale(1.14)`, offset: .3 },
          { transform: `translateX(${pb()}) translateY(0) scale(1)` },
        ], { duration: 460, easing: "cubic-bezier(.34,1.56,.64,1)" });
        const side = curveDir === "left" ? 1 : curveDir === "right" ? -1 : (Math.random() < .5 ? 1 : -1);
        anim(ball, [
          { transform: `translate(${bx()}, ${catchY}px) rotate(${spin}deg) scale(.5)`, opacity: 1 },
          { transform: `translate(${bx(side * W * 0.42)}, ${catchY + H * 0.5}px) rotate(${spin + 540}deg) scale(.38)`, opacity: 0 },
        ], { duration: 620, easing: "cubic-bezier(.3,.5,.6,1)" });
        showLabel(labelRef, lang === "th" ? "หลบได้!" : "Blocked!", "#fdba74");
      });
      at(T.hit + 1150, () => onDone?.(false));
      return () => { dead = true; timers.forEach(clearTimeout); };
    }

    // ── MISS — ball sails past where the Pokémon isn't, falls away ──
    if (mode === "miss") {
      at(T.hit, () => {
        // small dodge — the Pokémon leans away from the whiffed ball
        const away = (aimX > pokeX ? -1 : 1) * 16;
        anim(poke, [
          { transform: `translateX(${pb()}) scale(1)` },
          { transform: `translateX(${pb(away)}) scale(1)`, offset: .4 },
          { transform: `translateX(${pb()}) scale(1)` },
        ], { duration: 500, easing: "ease-in-out" });
        anim(ball, [
          { transform: `translate(${bx()}, ${catchY}px) rotate(${spin}deg) scale(.5)`, opacity: 1 },
          { transform: `translate(${bx()}, ${catchY + H * 0.55}px) rotate(${spin + 300}deg) scale(.4)`, opacity: 0 },
        ], { duration: 640, easing: "cubic-bezier(.3,.5,.6,1)" });
        showLabel(labelRef, lang === "th" ? "พลาด!" : "Missed!", "#cbd5e1");
      });
      at(T.hit + 1100, () => onDone?.(false));
      return () => { dead = true; timers.forEach(clearTimeout); };
    }

    // ── HIT (sound lands exactly when the ball contacts the Pokémon) ──
    at(T.hit, () => {
      catchSounds.playHit?.();
      anim(flash, [{ opacity: 0 }, { opacity: .9, offset: .3 }, { opacity: 0 }], { duration: 300, easing: "ease-out" });
      anim(poke, [
        { transform: `translateX(${pb()}) scale(1)` },
        { transform: `translateX(${pb(-7)}) scale(1)`, offset: .25 },
        { transform: `translateX(${pb(7)}) scale(1)`, offset: .75 },
        { transform: `translateX(${pb()}) scale(1)` },
      ], { duration: D.hit });
      // Throw-quality call-out (minimal): Nice / Great / Excellent
      if (quality) {
        const qText = lang === "th"
          ? (quality === "excellent" ? "ยอดเยี่ยม!" : quality === "great" ? "เยี่ยม!" : "ดี!")
          : (quality === "excellent" ? "Excellent!" : quality === "great" ? "Great!" : "Nice!");
        const qColor = quality === "excellent" ? "#fde047" : quality === "great" ? "#fdba74" : "#cbd5e1";
        showLabel(labelRef, qText, qColor, 900);
      }
    });

    // ── SUCK IN ──
    at(T.suck, () => {
      catchSounds.playSuckIn?.();
      anim(flash, [{ opacity: 0 }, { opacity: .8, offset: .4 }, { opacity: 0 }], { duration: D.suck, easing: "ease-out" });
      anim(ball, [
        { transform: `translate(${bx()},${catchY}px) scale(.5)` },
        { transform: `translate(${bx()},${catchY}px) scale(.8)`, offset: .3 },
        { transform: `translate(${bx()},${catchY}px) scale(.6)` },
      ], { duration: D.suck, easing: "ease-out" });
      anim(poke, [
        { transform: `translateX(${pb()}) scale(1)`, opacity: 1, filter: "brightness(1)" },
        { transform: `translateX(${pb()}) scale(.85)`, filter: "brightness(2.2) saturate(2)", offset: .4 },
        { transform: `translateX(${pb()}) scale(0) rotate(18deg)`, opacity: 0, filter: "brightness(3)" },
      ], { duration: D.suck, easing: "cubic-bezier(.55,0,.85,.55)" });
    });

    // ── DROP ──
    at(T.drop, () => {
      anim(ball, [
        { transform: `translate(${bx()},${catchY}px) scale(.6)` },
        { transform: `translate(${bx()},${groundY + H * 0.03}px) scale(.6)`, offset: .7 },
        { transform: `translate(${bx()},${groundY}px) scale(.6)` },
      ], { duration: D.drop, easing: "cubic-bezier(.34,1.56,.64,1)" });
    });

    // ── WOBBLES (click sound fires exactly on each visible knock) ──
    let t = T.wobble;
    for (let i = 0; i < target; i++) {
      const near = showNear && i === target - 2;
      const wdur = near ? 800 : 620, pause = near ? 420 : 240, amp = near ? 42 : 22;
      const tw = t;
      at(tw, () => {
        anim(ball, [
          { transform: `translate(${bx()},${groundY}px) rotate(0deg) scale(.6)` },
          { transform: `translate(${bx()},${groundY}px) rotate(-${amp}deg) scale(.6)`, offset: .25 },
          { transform: `translate(${bx()},${groundY}px) rotate(0deg) scale(.6)`, offset: .5 },
          { transform: `translate(${bx()},${groundY}px) rotate(${amp}deg) scale(.6)`, offset: .75 },
          { transform: `translate(${bx()},${groundY}px) rotate(0deg) scale(.6)` },
        ], { duration: wdur, easing: "ease-in-out" });
        if (near && nearRef.current && labelRef.current) {
          nearRef.current.animate([{ opacity: 0 }, { opacity: .9, offset: .3 }, { opacity: 0 }], { duration: 900, easing: "ease-out" });
          showLabel(labelRef, lang === "th" ? "เกือบหลุด!" : "Almost!", "#fca5a5", 1000);
        }
      });
      at(tw + wdur * 0.25, () => catchSounds.playWobble?.()); // left knock
      at(tw + wdur * 0.75, () => catchSounds.playWobble?.()); // right knock
      t += wdur + pause;
    }

    const RESULT = t;

    if (willCatch) {
      at(RESULT, () => {
        catchSounds.playBallLock?.();           // "ka-chk + DING✨"
        ball.style.filter = "drop-shadow(0 0 16px #facc15) drop-shadow(0 0 32px #fbbf24)";
        anim(ball, [
          { transform: `translate(${bx()},${groundY}px) scale(.6)` },
          { transform: `translate(${bx()},${groundY - H * 0.015}px) scale(.7)`, offset: .5 },
          { transform: `translate(${bx()},${groundY}px) scale(.6)` },
        ], { duration: 500, easing: "cubic-bezier(.34,1.56,.64,1)" });
        if (starsRef.current) [...starsRef.current.children].forEach((s, i) => {
          s.animate([
            { opacity: 0, transform: "scale(0) rotate(-40deg)" },
            { opacity: 1, transform: "scale(1.25) rotate(8deg)", offset: .6 },
            { opacity: 1, transform: "scale(1) rotate(0)" },
          ], { duration: 500, delay: i * 130, easing: "cubic-bezier(.34,1.56,.64,1)", fill: "forwards" });
        });
        const colors = shiny
          ? ["#fde047", "#fbbf24", "#fff7cc", "#ffd166", "#fff"]            // golden shiny burst
          : ["#ffd166", "#ee1515", "#22c55e", "#3b82f6", "#ec4899", "#fff"];
        const count = shiny ? 54 : 34;
        for (let i = 0; i < count; i++) {
          const c = document.createElement("div");
          c.className = "cseq-confetti";
          c.style.background = colors[i % colors.length];
          root.appendChild(c);
          const ang = Math.random() * Math.PI * 2, dist = 90 + Math.random() * 200;
          c.animate([
            { transform: "translate(-50%,-50%) rotate(0) scale(1)", opacity: 1 },
            { transform: `translate(calc(-50% + ${Math.cos(ang) * dist}px), calc(-50% + ${Math.sin(ang) * dist - 40}px)) rotate(${Math.random() * 720 - 360}deg) scale(.5)`, opacity: 0 },
          ], { duration: 1000 + Math.random() * 500, easing: "cubic-bezier(.2,.7,.3,1)", fill: "forwards" });
          setTimeout(() => c.remove(), 1600);
        }
        if (labelRef.current) {
          const lbl = labelRef.current;
          lbl.textContent = shiny
            ? (lang === "th" ? `✨ จับไชนีได้! ${pokemonName}` : `✨ Shiny ${pokemonName}!`)
            : (lang === "th" ? `จับได้! ${pokemonName}` : `Gotcha! ${pokemonName}`);
          lbl.style.background = "none";
          lbl.style.color = shiny ? "#fde047" : "#fff";
          if (shiny) lbl.style.textShadow = "0 0 16px rgba(253,224,71,0.65), 0 2px 12px rgba(0,0,0,0.5)";
          lbl.animate([
            { opacity: 0, transform: "translateX(-50%) translateY(8px)" },
            { opacity: 1, transform: "translateX(-50%) translateY(0)", offset: .4 },
            { opacity: 1, transform: "translateX(-50%) translateY(0)" },
          ], { duration: 600, easing: "cubic-bezier(.34,1.56,.64,1)", fill: "forwards" });
        }
      });
      at(RESULT + 420, () => catchSounds.playPokemonCry?.(pokemon)); // cry right after the ding
      at(RESULT + 1900, () => onDone?.(true));
    } else {
      at(RESULT, () => {
        catchSounds.playCatchFail?.();
        anim(flash, [{ opacity: 0 }, { opacity: .7, offset: .3 }, { opacity: 0 }], { duration: 400 });
        anim(ball, [
          { transform: `translate(-50%,${groundY}px) scale(.6)`, opacity: 1 },
          { transform: `translate(-50%,${groundY}px) scale(.9)`, opacity: 0 },
        ], { duration: 380, easing: "ease-out" });
        anim(poke, [
          { transform: "translateX(-50%) scale(0)", opacity: 0 },
          { transform: "translateX(-50%) scale(1.15)", opacity: 1, offset: .65 },
          { transform: "translateX(-50%) scale(1)", opacity: 1 },
        ], { duration: 600, easing: "cubic-bezier(.34,1.56,.64,1)" });
        if (labelRef.current) {
          const lbl = labelRef.current;
          lbl.textContent = lang === "th" ? "หนีไปแล้ว!" : "Got away!";
          lbl.style.background = "none";
          lbl.style.color = "#cbd5e1";
          lbl.animate([
            { opacity: 0, transform: "translateX(-50%) translateY(6px)" },
            { opacity: 1, transform: "translateX(-50%) translateY(0)", offset: .4 },
            { opacity: 1, transform: "translateX(-50%) translateY(0)" },
          ], { duration: 500, fill: "forwards" });
        }
      });
      at(RESULT + 250, () => catchSounds.playPokemonCry?.(pokemon));
      at(RESULT + 1500, () => onDone?.(false));
    }

    return () => { dead = true; timers.forEach(clearTimeout); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={rootRef} className="cseq" aria-hidden>
      <style>{`
        .cseq{position:absolute;inset:0;z-index:6;pointer-events:none;overflow:hidden;}
        .cseq-flash{position:absolute;left:50%;top:46%;width:280px;height:280px;border-radius:50%;transform:translate(-50%,-50%);
          background:radial-gradient(circle,rgba(255,243,199,.92),rgba(251,191,36,.5) 35%,transparent 70%);opacity:0;z-index:5;}
        .cseq-near{position:absolute;inset:0;background:radial-gradient(60% 50% at 50% 56%,rgba(239,68,68,.45),transparent 70%);opacity:0;z-index:4;}
        .cseq-ball{position:absolute;left:50%;top:50%;width:78px;height:78px;z-index:6;}
        .cseq-stars{position:absolute;left:50%;top:50%;transform:translate(-50%,-10px);display:flex;gap:10px;align-items:flex-end;z-index:8;}
        .cseq-stars .st{opacity:0;transform:scale(0);filter:drop-shadow(0 2px 4px rgba(180,83,9,.5));}
        .cseq-stars .st:nth-child(2){margin-bottom:8px;}
        .cseq-label{position:absolute;left:50%;top:30%;transform:translateX(-50%);opacity:0;white-space:nowrap;z-index:9;
          font-size:26px;font-weight:600;letter-spacing:1.5px;color:#fff;
          text-shadow:0 2px 14px rgba(0,0,0,.55),0 1px 3px rgba(0,0,0,.5);}
        .cseq-confetti{position:absolute;left:50%;top:46%;width:9px;height:14px;border-radius:2px;z-index:7;}
      `}</style>
      <div ref={pokeRef} className="catch-go-pokemon-stage">
        <Catch3DPokemon pokemon={pokemon} pokemonName={pokemonName} phase="idle" variant="main" isShiny={shiny} sizeScale={sizeScale} />
        <div className="catch-go-pokemon-shadow" />
      </div>
      <div ref={nearRef} className="cseq-near" />
      <div ref={flashRef} className="cseq-flash" />
      <div ref={ballRef} className="cseq-ball"><PokeballImg ballId={ballId} size={78} glow /></div>
      <div ref={starsRef} className="cseq-stars">
        <Star className="st" size={26} strokeWidth={1.8} fill="#fde047" color="#f59e0b" />
        <Star className="st" size={32} strokeWidth={1.8} fill="#fde047" color="#f59e0b" />
        <Star className="st" size={26} strokeWidth={1.8} fill="#fde047" color="#f59e0b" />
      </div>
      <div ref={labelRef} className="cseq-label" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SuckInEffect — curved beams + spiral particles + flash
// ═══════════════════════════════════════════════════════════
function SuckInEffect() {
  // 8 curved beams converging on ball center
  const beams = useMemo(() => {
    return Array.from({ length: 8 }).map((_, i) => {
      const angle = (i / 8) * Math.PI * 2 - Math.PI / 2; // start from top
      const dist = 180;
      const x = Math.cos(angle) * dist;
      const y = Math.sin(angle) * dist;
      // Slight curve perpendicular to beam direction
      const curveOffset = 40;
      const cx = x * 0.5 + Math.cos(angle + Math.PI / 2) * curveOffset;
      const cy = y * 0.5 + Math.sin(angle + Math.PI / 2) * curveOffset;
      return { id: i, x, y, cx, cy, delay: i * 0.04 };
    });
  }, []);

  // 16 spiral particles
  const particles = useMemo(() => {
    return Array.from({ length: 16 }).map((_, i) => ({
      id: i,
      startAngle: (i / 16) * 360,
      delay: i * 0.025,
      color: i % 2 === 0 ? "#fef3c7" : "#fb923c",
    }));
  }, []);

  return (
    <>
      <style>{`
        @keyframes suckin-beam-draw {
          0%   { stroke-dashoffset: 280; opacity: 0; }
          25%  { opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 0; }
        }
        @keyframes suckin-particle-spiral {
          0% {
            transform: rotate(var(--start-angle)) translate(180px, 0) scale(0);
            opacity: 0;
          }
          25% { opacity: 1; }
          100% {
            transform: rotate(calc(var(--start-angle) + 540deg)) translate(0px, 0) scale(0.4);
            opacity: 0;
          }
        }
        @keyframes suckin-center-flash {
          0%   { transform: translate(-50%, -50%) scale(0); opacity: 0; }
          40%  { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1.6); opacity: 0; }
        }
        @keyframes suckin-ring-shrink {
          0%   { transform: translate(-50%, -50%) scale(2.5); opacity: 0; }
          40%  { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(0.3); opacity: 0; }
        }
      `}</style>

      {/* SVG with curved beams */}
      <svg
        viewBox="-300 -300 600 600"
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "600px",
          height: "600px",
          transform: "translate(-50%, -55%)",
          pointerEvents: "none",
          zIndex: 4,
          overflow: "visible",
        }}>
        <defs>
          <linearGradient id="beam-grad-curved" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%"   stopColor="#fef3c7" stopOpacity="0" />
            <stop offset="35%"  stopColor="#fbbf24" stopOpacity="0.95" />
            <stop offset="75%"  stopColor="#ef4444" stopOpacity="1" />
            <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
          </linearGradient>
          <filter id="beam-glow-filter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {beams.map(({ id, x, y, cx, cy, delay }) => (
          <path
            key={id}
            d={`M ${x} ${y} Q ${cx} ${cy} 0 0`}
            fill="none"
            stroke="url(#beam-grad-curved)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray="280"
            strokeDashoffset="280"
            filter="url(#beam-glow-filter)"
            style={{
              animation: `suckin-beam-draw 0.65s ease-out ${delay}s forwards`,
            }}
          />
        ))}
      </svg>

      {/* Spiral particles */}
      <div style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -55%)",
        width: "0",
        height: "0",
        pointerEvents: "none",
        zIndex: 5,
      }}>
        {particles.map(p => (
          <div key={p.id} style={{
            position: "absolute",
            top: "0",
            left: "0",
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${p.color} 0%, #fbbf24 60%, transparent 100%)`,
            boxShadow: `0 0 10px ${p.color}, 0 0 20px rgba(251,191,36,0.6)`,
            transformOrigin: "0 0",
            animation: `suckin-particle-spiral 0.7s ease-in ${p.delay}s forwards`,
            opacity: 0,
            ['--start-angle']: `${p.startAngle}deg`,
          }} />
        ))}
      </div>

      {/* Center flash */}
      <div style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        width: "240px",
        height: "240px",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(254,243,199,0.7) 0%, rgba(251,191,36,0.5) 30%, rgba(239,68,68,0.3) 60%, transparent 80%)",
        animation: "suckin-center-flash 0.7s ease",
        transform: "translate(-50%, -55%)",
        pointerEvents: "none",
        zIndex: 3,
      }} />

      {/* Shrinking ring */}
      <div style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        width: "320px",
        height: "320px",
        borderRadius: "50%",
        border: "4px solid #facc15",
        animation: "suckin-ring-shrink 0.7s cubic-bezier(0.55, 0, 0.85, 0.55)",
        boxShadow: "0 0 24px #fbbf24",
        pointerEvents: "none",
        zIndex: 4,
      }} />
    </>
  );
}


// ═══════════════════════════════════════════════════════════
// CatchTutorial — Visual-first tutorial (less text, more icons)
// ═══════════════════════════════════════════════════════════
function CatchTutorial({ onClose, lang }) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleStart = () => {
    if (dontShowAgain) {
      try { localStorage.setItem("pkdx_catch_tutorial_seen", "true"); } catch {}
    }
    onClose();
  };

  const t = (th, en) => lang === "th" ? th : en;

  const cards = [
    { viz: <VizDragUp />,    title: t("ลากบอลขึ้น",   "Drag Up"),     accent: "#a31a16" },
    { viz: <VizRingZones />, title: t("กะวงเขียว",    "Hit Green"),   accent: "#22c55e" },
    { viz: <VizCurve />,     title: t("ปั่นให้โค้ง",   "Spin = Curve"), accent: "#0d9488" },
    { viz: <VizBerry />,     title: t("โยนเบอร์รี่",   "Berry First"), accent: "#ec4899" },
  ];

  return (
    <div className="catch-tut-overlay" onClick={onClose}>

      <style>{`
        @keyframes tutorial-modal-in {
          0%   { transform: scale(0.88) translateY(20px); opacity: 0; }
          60%  { transform: scale(1.02) translateY(0); opacity: 1; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes tutorial-card-in {
          from { transform: translateY(10px) scale(0.95); opacity: 0; }
          to   { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes viz-bob-up {
          0%, 100% { transform: translateY(10px); }
          50%      { transform: translateY(-10px); }
        }
        @keyframes viz-ring-shrink {
          0%, 100% { r: 32; opacity: 0.55; }
          50%      { r: 12; opacity: 1; }
        }
        @keyframes viz-berry-fly {
          0%, 100% { transform: translateX(-6px) translateY(0) rotate(0deg); }
          50%      { transform: translateX(22px) translateY(-10px) rotate(180deg); }
        }
        @keyframes viz-pokemon-eat {
          0%, 100% { transform: scale(1); }
          55%      { transform: scale(1.18); }
        }
        @keyframes viz-star-twinkle {
          0%, 100% { opacity: 0.35; transform: scale(0.7); }
          50%      { opacity: 1;    transform: scale(1.2); }
        }
        @keyframes viz-ball-glow {
          0%, 100% { filter: drop-shadow(0 0 4px #fbbf24); }
          50%      { filter: drop-shadow(0 0 14px #fbbf24) drop-shadow(0 0 22px #f59e0b); }
        }
        @keyframes viz-spark-1 { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
      `}</style>

      <div className="catch-tut-modal" onClick={(e) => e.stopPropagation()}>

        <button className="catch-tut-close" onClick={onClose}>
          <X size={16} strokeWidth={2.6} />
        </button>

        {/* Header */}
        <div className="catch-tut-head">
          <span className="catch-tut-badge"><GraduationCap size={22} strokeWidth={2.1} /></span>
          <h2 className="catch-tut-title">{t("วิธีเล่น", "How to Play")}</h2>
          <p className="catch-tut-sub">{t("ลากขึ้นเพื่อขว้าง · ปั่นเพื่อโค้ง", "Drag up to throw · spin to curve")}</p>
        </div>

        {/* Visual cards — 2x2 grid */}
        <div className="catch-tut-grid">
          {cards.map((card, idx) => (
            <div key={idx} className="catch-tut-card"
              style={{ "--acc": card.accent, animationDelay: `${0.08 + idx * 0.07}s` }}>
              <div className="catch-tut-card-viz">{card.viz}</div>
              <div className="catch-tut-card-title">{card.title}</div>
            </div>
          ))}

          {/* Critical Catch — full-width row */}
          {/* Critical Catch — full-width row */}
          <div className="catch-tut-crit" style={{ animationDelay: "0.4s" }}>
            <div className="catch-tut-crit-viz"><VizCritical /></div>
            <div>
              <div className="catch-tut-crit-title">
                <Star size={13} strokeWidth={2.4} fill="currentColor" /> Critical Catch
              </div>
              <div className="catch-tut-crit-sub">{t("โชคดี = ติดทันที!", "Lucky = instant catch!")}</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="catch-tut-foot">
          <label className="catch-tut-check">
            <input type="checkbox" checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)} />
            {t("ไม่ต้องแสดงอีก", "Don't show again")}
          </label>
          <button className="catch-tut-start" onClick={handleStart}>
            <Play size={16} strokeWidth={2.6} fill="currentColor" /> {t("เริ่มเล่น!", "Let's Play!")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Visual Components for Tutorial ──────────────────────────

function VizDragUp() {
  return (
    <div style={{ position: "relative", width: 80, height: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ animation: "viz-bob-up 1.4s ease-in-out infinite" }}>
        <img
          src={`${ITEM_BASE}/poke-ball.png`}
          width="44"
          height="44"
          alt=""
          draggable={false}
          style={{ imageRendering: "pixelated", filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.25))" }}
        />
      </div>
      <div style={{
        position: "absolute",
        right: 6,
        top: 6,
        color: "#22c55e",
        display: "inline-flex",
        animation: "viz-bob-up 1.4s ease-in-out infinite",
        filter: "drop-shadow(0 0 8px #22c55e88)",
      }}><ArrowUp size={26} strokeWidth={3} /></div>
    </div>
  );
}

function VizRingZones() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80">
      {/* Nice (outer, yellow) */}
      <circle cx="40" cy="40" r="32" fill="none" stroke="#fbbf24" strokeWidth="2.5"
        strokeDasharray="3 4" opacity="0.6" />
      {/* Great (middle, blue) */}
      <circle cx="40" cy="40" r="22" fill="none" stroke="#900603" strokeWidth="3" opacity="0.85" />
      {/* Excellent (animated pulsing green) */}
      <circle cx="40" cy="40" r="14" fill="none" stroke="#22c55e" strokeWidth="3.5"
        style={{ animation: "viz-ring-shrink 2.4s ease-in-out infinite" }}
        filter="drop-shadow(0 0 4px #22c55e)" />
      {/* Center Pokeball dot */}
      <circle cx="40" cy="40" r="6" fill="#ef4444" stroke="white" strokeWidth="1.5" />
      <circle cx="40" cy="42" r="2.5" fill="white" />
    </svg>
  );
}

function VizCurve() {
  return (
    <div style={{ position: "relative", width: 80, height: 80 }}>
      <svg width="80" height="80" viewBox="0 0 80 80" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="curve-grad" x1="0%" y1="100%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#06b6d4" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="1" />
          </linearGradient>
        </defs>
        {/* Curved guide path */}
        <path id="curve-tut-path" d="M 14 64 Q 40 6 66 64"
          fill="none" stroke="url(#curve-grad)" strokeWidth="3.5"
          strokeLinecap="round" strokeDasharray="3 4" />
        {/* Animated ball following curve */}
        <circle r="6" fill="#ef4444" stroke="white" strokeWidth="1.5">
          <animateMotion dur="2s" repeatCount="indefinite">
            <mpath xlinkHref="#curve-tut-path" />
          </animateMotion>
        </circle>
        {/* Arrow tip */}
        <path d="M 60 58 L 66 64 L 60 70" fill="none" stroke="#06b6d4"
          strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function VizBerry() {
  return (
    <div style={{
      position: "relative",
      width: 80,
      height: 80,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-around",
    }}>
      {/* Berry flying */}
      <div style={{ animation: "viz-berry-fly 2.2s ease-in-out infinite", display: "flex", alignItems: "center" }}>
        <BerryImg berryId="razz-berry" size={32} />
      </div>
      {/* Pokemon (gets bigger as berry approaches) */}
      <div style={{
        animation: "viz-pokemon-eat 2.2s ease-in-out infinite",
        animationDelay: "0.7s",
        display: "flex", alignItems: "center",
      }}>
        <img src={`${ITEM_BASE.replace("/items","/pokemon")}/1.png`} width="40" height="40" alt=""
          draggable={false} style={{ imageRendering: "pixelated" }} />
      </div>
    </div>
  );
}

function VizCritical() {
  return (
    <div style={{ position: "relative", width: 70, height: 70, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ animation: "viz-ball-glow 1.6s ease-in-out infinite" }}>
        <img
          src={`${ITEM_BASE}/poke-ball.png`}
          width="40"
          height="40"
          alt=""
          draggable={false}
          style={{ imageRendering: "pixelated" }}
        />
      </div>
      <span style={{ position: "absolute", top: 0, left: 4, color: "#f59e0b", animation: "viz-star-twinkle 1.2s ease-in-out infinite" }}><Star size={14} strokeWidth={2.4} fill="currentColor" /></span>
      <span style={{ position: "absolute", top: 6, right: 2, color: "#fbbf24", animation: "viz-star-twinkle 1.2s ease-in-out 0.3s infinite" }}><Sparkles size={12} strokeWidth={2.4} /></span>
      <span style={{ position: "absolute", bottom: 4, right: 6, color: "#f59e0b", animation: "viz-star-twinkle 1.2s ease-in-out 0.6s infinite" }}><Star size={14} strokeWidth={2.4} fill="currentColor" /></span>
      <span style={{ position: "absolute", bottom: 8, left: 2, color: "#fbbf24", animation: "viz-star-twinkle 1.2s ease-in-out 0.9s infinite" }}><Sparkles size={12} strokeWidth={2.4} /></span>
    </div>
  );
}