import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Catch3DPokemon from "./Catch3DPokemon.jsx";
import CatchBattleMusic from "./CatchBattleMusic.jsx";
import ARViewer from "./ARViewer.jsx";
import { catchSounds } from "../catchSounds.js";

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
  { id:"poke-ball",    name:"Poké Ball",    rate: 1.0,  glow:"#ee1515" },
  { id:"great-ball",   name:"Great Ball",   rate: 1.5,  glow:"#3b82f6" },
  { id:"ultra-ball",   name:"Ultra Ball",   rate: 2.0,  glow:"#facc15" },
  { id:"master-ball",  name:"Master Ball",  rate: 255,  glow:"#a855f7" },
  { id:"fast-ball",    name:"Fast Ball",    rate: 4.0,  glow:"#facc15" },
  { id:"level-ball",   name:"Level Ball",   rate: 4.0,  glow:"#ee1515" },
  { id:"lure-ball",    name:"Lure Ball",    rate: 4.0,  glow:"#06b6d4" },
  { id:"heavy-ball",   name:"Heavy Ball",   rate: 3.0,  glow:"#94a3b8" },
  { id:"love-ball",    name:"Love Ball",    rate: 8.0,  glow:"#f472b6" },
  { id:"friend-ball",  name:"Friend Ball",  rate: 1.0,  glow:"#22c55e" },
  { id:"moon-ball",    name:"Moon Ball",    rate: 4.0,  glow:"#a855f7" },
  { id:"safari-ball",  name:"Safari Ball",  rate: 1.5,  glow:"#22c55e" },
  { id:"sport-ball",   name:"Sport Ball",   rate: 1.5,  glow:"#fb923c" },
  { id:"net-ball",     name:"Net Ball",     rate: 3.5,  glow:"#06b6d4" },
  { id:"nest-ball",    name:"Nest Ball",    rate: 4.0,  glow:"#84cc16" },
  { id:"repeat-ball",  name:"Repeat Ball",  rate: 3.5,  glow:"#fbbf24" },
  { id:"timer-ball",   name:"Timer Ball",   rate: 4.0,  glow:"#dc2626" },
  { id:"luxury-ball",  name:"Luxury Ball",  rate: 1.0,  glow:"#facc15" },
  { id:"premier-ball", name:"Premier Ball", rate: 1.0,  glow:"#dc2626" },
  { id:"dive-ball",    name:"Dive Ball",    rate: 3.5,  glow:"#0ea5e9" },
  { id:"dusk-ball",    name:"Dusk Ball",    rate: 3.5,  glow:"#a855f7" },
  { id:"heal-ball",    name:"Heal Ball",    rate: 1.0,  glow:"#ec4899" },
  { id:"quick-ball",   name:"Quick Ball",   rate: 5.0,  glow:"#facc15" },
  { id:"cherish-ball", name:"Cherish Ball", rate: 1.0,  glow:"#dc2626" },
  { id:"park-ball",    name:"Park Ball",    rate: 255,  glow:"#fbbf24" },
  { id:"dream-ball",   name:"Dream Ball",   rate: 4.0,  glow:"#ec4899" },
  { id:"beast-ball",   name:"Beast Ball",   rate: 5.0,  glow:"#06b6d4" },
];

// ─── Berries (5, Pokemon GO style) ──────────────────────────
const BERRIES = [
  { id:"razz-berry",   name:"Razz",         nameLong:"Razz Berry",          mult:1.5, color:"#ec4899", shape:"razz" },
  { id:"nanab-berry",  name:"Nanab",        nameLong:"Nanab Berry",         mult:1.0, color:"#f472b6", shape:"nanab" },
  { id:"pinap-berry",  name:"Pinap",        nameLong:"Pinap Berry",         mult:1.0, color:"#fde047", shape:"pinap" },
  { id:"golden-razz",  name:"Golden Razz",  nameLong:"Golden Razz Berry",   mult:2.5, color:"#f59e0b", shape:"razz" },
  { id:"silver-pinap", name:"Silver Pinap", nameLong:"Silver Pinap Berry",  mult:1.8, color:"#94a3b8", shape:"pinap" },
];

// ─── 8-bit Pokeball image (with colored-circle fallback) ─────
function PokeballImg({ ballId, size = 60, animate = false, glow = false }) {
  const [imgFailed, setImgFailed] = useState(false);
  const ball = POKEBALLS.find(b => b.id === ballId) ?? POKEBALLS[0];
  const cls  = `ball-img-8bit${animate ? " ball-spin-8bit" : ""}${glow ? " ball-glow-8bit" : ""}`;

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
      >
        ⊕
      </div>
    );
  }

  return (
    <img
      src={`${ITEM_BASE}/${ballId}.png`}
      alt={ball.name}
      width={size}
      height={size}
      className={cls}
      style={{ "--ball-glow": ball.glow }}
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

// ─── Berry image — PokeAPI 8-bit sprite, falls back to SVG ───
// Standard berries (razz/nanab/pinap) have PokeAPI sprites.
// GO-exclusive berries (golden-razz, silver-pinap) fall back to the SVG renderer.
const BERRY_SPRITE_SLUG = {
  "razz-berry":   "razz-berry",
  "nanab-berry":  "nanab-berry",
  "pinap-berry":  "pinap-berry",
  "golden-razz":  "golden-razz-berry",
  "silver-pinap": "silver-pinap-berry",
};
function BerryImg({ berryId, size = 40, animate = false }) {
  const [failed, setFailed] = useState(false);
  const slug = BERRY_SPRITE_SLUG[berryId];
  if (!slug || failed) return <BerryGO berryId={berryId} size={size} animate={animate} />;
  return (
    <img
      src={`${ITEM_BASE}/${slug}.png`}
      alt={berryId}
      width={size}
      height={size}
      className={`berry-go${animate ? " berry-spin" : ""}`}
      draggable={false}
      style={{ imageRendering: "pixelated", objectFit: "contain" }}
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

  // Simulate weakened wild Pokemon (~1/3 HP remaining)
  // Formula: ((3 × HPmax) − (2 × HPcurr)) / (3 × HPmax) ≈ 7/9
  const hpFactor = 7 / 9;

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
  const [previewId, setPreviewId] = useState(selectedId);
  const previewBall = POKEBALLS.find(b => b.id === previewId) ?? POKEBALLS[0];
  return (
    <div className="catch-go-picker-overlay" onClick={onClose}>
      <div className="catch-go-picker-modal" onClick={(e) => e.stopPropagation()}>
        <button className="catch-go-picker-close" onClick={onClose}>✕</button>
        <h2 className="catch-go-picker-title">
          🎱 {lang==="th"?`เลือกบอล (${POKEBALLS.length})`:`Select Ball (${POKEBALLS.length})`}
        </h2>
        <div className="catch-go-detail-preview" style={{ "--ball-glow": previewBall.glow }}>
          <PokeballImg ballId={previewId} size={100} glow animate />
          <div className="catch-go-detail-info">
            <div className="catch-go-detail-name">{previewBall.name}</div>
            <div className="catch-go-detail-rate" style={{ color: previewBall.glow }}>
              {lang==="th"?"อัตราจับ":"Catch rate"} ×{previewBall.rate}
            </div>
          </div>
        </div>
        <div className="catch-go-picker-grid">
          {POKEBALLS.map(b => (
            <button key={b.id}
              className={`catch-go-picker-item${previewId === b.id ? " selected" : ""}`}
              onClick={() => setPreviewId(b.id)}
              onDoubleClick={() => { onSelect(b.id); onClose(); }}
              style={{ "--ball-glow": b.glow }}>
              <PokeballImg ballId={b.id} size={42} />
              <span className="catch-go-picker-label">{b.name}</span>
            </button>
          ))}
        </div>
        <button className="catch-go-pick-confirm" onClick={() => { onSelect(previewId); onClose(); }}>
          {lang==="th"?"เลือกบอลนี้":"Use this ball"}
        </button>
      </div>
    </div>
  );
}

// ─── Berry Picker Modal ─────────────────────────────────────
function BerryPicker({ selectedId, onSelect, onClose, lang }) {
  const [previewId, setPreviewId] = useState(selectedId);
  const previewBerry = previewId ? BERRIES.find(b => b.id === previewId) : null;
  return (
    <div className="catch-go-picker-overlay" onClick={onClose}>
      <div className="catch-go-picker-modal" onClick={(e) => e.stopPropagation()}>
        <button className="catch-go-picker-close" onClick={onClose}>✕</button>
        <h2 className="catch-go-picker-title">
          🍓 {lang==="th"?"เลือกเบอร์รี่":"Select Berry"}
        </h2>
        <div className="catch-go-detail-preview">
          {previewBerry ? (
            <>
              <BerryImg berryId={previewId} size={90} animate />
              <div className="catch-go-detail-info">
                <div className="catch-go-detail-name">{previewBerry.nameLong}</div>
                <div className="catch-go-detail-rate" style={{ color: previewBerry.color }}>
                  ×{previewBerry.mult} {lang==="th"?"โอกาสจับ":"catch chance"}
                </div>
              </div>
            </>
          ) : (
            <div style={{ padding: 16, color: "#94a3b8" }}>
              🚫 {lang==="th"?"ไม่ใช้เบอร์รี่":"No berry"}
            </div>
          )}
        </div>
        <div className="catch-go-picker-grid berries">
          <button className={`catch-go-picker-item${!previewId ? " selected" : ""}`} onClick={() => setPreviewId(null)}>
            <span style={{ fontSize: 36 }}>🚫</span>
            <span className="catch-go-picker-label">{lang==="th"?"ไม่ใช้":"None"}</span>
          </button>
          {BERRIES.map(b => (
            <button key={b.id}
              className={`catch-go-picker-item${previewId === b.id ? " selected" : ""}`}
              onClick={() => setPreviewId(b.id)}
              onDoubleClick={() => { onSelect(b.id); onClose(); }}>
              <BerryImg berryId={b.id} size={42} />
              <span className="catch-go-picker-label">{b.name}</span>
            </button>
          ))}
        </div>
        <button className="catch-go-pick-confirm" onClick={() => { onSelect(previewId); onClose(); }}>
          {lang==="th"?"ยืนยัน":"Confirm"}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT v7 — Pokemon GO style Fullscreen
// ═══════════════════════════════════════════════════════════
export default function CatchAnimation({ pokemon, lang = "en", onClose }) {
  const arenaRef = useRef(null);
  const rafRef = useRef(null);
  const timerRef = useRef([]);

  const [phase, setPhase] = useState("idle");
  const [arOpen, setArOpen] = useState(false);
  const [ballId, setBallId] = useState("poke-ball");
  const [berryId, setBerryId] = useState(null);
  const [showBallPicker, setShowBallPicker] = useState(false);
  const [showBerryPicker, setShowBerryPicker] = useState(false);
  const [dragPath, setDragPath] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [ballPos, setBallPos] = useState({ x: 0, y: 0 });
  const [throwQuality, setThrowQuality] = useState(null);
  const [wobbleCount, setWobbleCount] = useState(0);
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

  // Pokemon meta
  const pokemonName = useMemo(() => {
    return pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);
  }, [pokemon.name]);

  const ball = POKEBALLS.find(b => b.id === ballId) ?? POKEBALLS[0];
  const berry = berryId ? BERRIES.find(b => b.id === berryId) : null;

  const cp = useMemo(() => getFakeCP(pokemon), [pokemon]);
  const capRate = useMemo(() => getCaptureRate(pokemon), [pokemon]);

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
    if (ringRadius < 180) return { color: "#3b82f6", label: "GREAT",     quality: "great"     };
    if (ringRadius < 230) return { color: "#fbbf24", label: "NICE",      quality: "nice"      };
    return                       { color: "#94a3b8", label: "",          quality: null         };
  }, [ringRadius]);

  // What's in the center? Berry (if selected & not yet thrown) or Ball
  const currentThrowable = (berryId && !berryThrown) ? "berry" : "ball";

  // ─── Active bonuses (just for display, no XP) ─────────────
  const bonuses = useMemo(() => {
    const items = [];
    if (throwQuality === "excellent")  items.push({ label: "Excellent Throw", icon: "⭐", color: "#f59e0b" });
    else if (throwQuality === "great") items.push({ label: "Great Throw",     icon: "✨", color: "#3b82f6" });
    else if (throwQuality === "nice")  items.push({ label: "Nice Throw",      icon: "👍", color: "#10b981" });
    if (isCurveBall) items.push({ label: "Curve Ball",     icon: "🌀", color: "#06b6d4" });
    if (berryThrown) items.push({ label: "Berry Used",     icon: "🍓", color: "#ec4899" });
    if (isCritical)  items.push({ label: "Critical Catch", icon: "⭐", color: "#fbbf24" });
    return items;
  }, [throwQuality, berryThrown, isCritical, isCurveBall]);

  // Drag handlers (rAF-throttled)
  const pendingPointRef = useRef(null);

  const onDragStart = (e) => {
    if (phase !== "idle") return;
    const arena = arenaRef.current;
    if (!arena) return;
    const rect = arena.getBoundingClientRect();
    const clientX = e.touches?.[0]?.clientX ?? e.clientX;
    const clientY = e.touches?.[0]?.clientY ?? e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    setDragging(true);
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
    pendingPointRef.current = {
      x: clientX - rect.left,
      y: clientY - rect.top,
      t: Date.now(),
    };
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const pt = pendingPointRef.current;
      if (!pt) return;
      setDragPath(prev => {
        const updated = [...prev, pt];
        return updated.length > 20 ? updated.slice(-20) : updated;
      });
      setBallPos({ x: pt.x, y: pt.y });
    });
  };

  const onDragEnd = () => {
    if (!dragging || phase !== "idle") return;
    setDragging(false);
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
    const arenaHeight = arena?.getBoundingClientRect().height ?? 540;
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

    // 🌀 Curve Ball detection (Pokemon GO ×1.7 catch rate bonus)
    const { curvature, direction } = detectCurveBall(dragPath);
    const curve = curvature > 0.3;
    setIsCurveBall(curve);
    setCurveStrength(Math.max(0.15, curvature)); // always save actual strength for animation
    if (curve) {
      throwBonus *= 1.7;
      setCurveDirection(direction ?? "right");
    }

    // Roll for Critical Catch!
    const critical = Math.random() < criticalCatchChance;
    setIsCritical(critical);
    setThrowQuality(qualityLabel);
    executeThrow(throwBonus, critical);
  };

  const executeThrow = useCallback((throwBonus, critical = false) => {
    setPhase("throwing");
    catchSounds.playThrow();
    addTimer(setTimeout(() => {
      setPhase("hit");
      catchSounds.playHit();
      addTimer(setTimeout(() => {
        setPhase("suckIn");
        catchSounds.playSuckIn();
        addTimer(setTimeout(() => {
          const finalChance = calculateCatchChance(pokemon, ballId, effectiveBerryId, throwBonus);
          // Critical Catch → always succeeds with 1 wobble
          const willCatch = critical ? true : (Math.random() < finalChance);
          const wobblesNeeded = critical ? 1 : (willCatch ? 3 : Math.floor(Math.random() * 3) + 1);
          startWobble(0, wobblesNeeded, willCatch);
        }, 700));
      }, 200));
    }, 800));
  }, [pokemon, ballId, effectiveBerryId]);

  const startWobble = useCallback((count, target, willCatch) => {
    setPhase("wobble");
    setWobbleCount(count);
    // Click sound for each wobble tick (anticipation)
    if (count > 0) catchSounds.playWobble();
    if (count >= target) {
      if (willCatch) {
        setPhase("success");
        // 1) Ball locks closed — short ascending "ding-ding-ding-DING"
        catchSounds.playBallLock();
        // 2) After lock jingle finishes (~0.8s), play the long celebration
        setTimeout(() => catchSounds.playGotcha(), 850);
        setResultMsg(lang === "th" ? "จับได้!" : "Gotcha!");
        setCaughtCount(c => {
          const n = c + 1;
          try { localStorage.setItem("pkdx_caught_count", String(n)); } catch {}
          return n;
        });
        // Extended idle delay so celebration finishes before resetting
        addTimer(setTimeout(() => {
          setPhase("idle"); setThrowQuality(null); setIsCritical(false);
          setWobbleCount(0); setResultMsg(null); setDragPath([]);
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
          setWobbleCount(0); setResultMsg(null); setDragPath([]);
        }, 2800));
      }
      return;
    }
    addTimer(setTimeout(() => {
      startWobble(count + 1, target, willCatch);
    }, 700));
  }, [lang, pokemon]);

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

      {/* 🌀 Curve ball trajectory keyframes — dynamic based on curveStrength */}
      <style>{(() => {
        const s  = curveStrength;
        const lp = (50 - s * 34).toFixed(1);  // peak X for left  (16% at max)
        const rp = (50 + s * 34).toFixed(1);  // peak X for right (84% at max)
        const lm = (50 - s * 28).toFixed(1);  // mid X for left
        const rm = (50 + s * 28).toFixed(1);  // mid X for right
        const lr = (50 - s * 12).toFixed(1);  // return X for left
        const rr = (50 + s * 12).toFixed(1);  // return X for right
        const r1 = (s * 180).toFixed(0);
        const r2 = (s * 360).toFixed(0);
        const r3 = (s * 560).toFixed(0);
        const r4 = (s * 720).toFixed(0);
        return `
          @keyframes catch-go-curve-left {
            0%   { bottom: 40px; left: 50%;    transform: translateX(-50%) scale(1)    rotate(0); }
            20%  { bottom: 24%;  left: ${lp}%; transform: translateX(-50%) scale(0.85) rotate(-${r1}deg); }
            45%  { bottom: 42%;  left: ${lm}%; transform: translateX(-50%) scale(0.72) rotate(-${r2}deg); }
            70%  { bottom: 50%;  left: ${lr}%; transform: translateX(-50%) scale(0.65) rotate(-${r3}deg); }
            100% { bottom: 35%;  left: 50%;    transform: translateX(-50%) scale(0.7)  rotate(-${r4}deg); }
          }
          @keyframes catch-go-curve-right {
            0%   { bottom: 40px; left: 50%;    transform: translateX(-50%) scale(1)    rotate(0); }
            20%  { bottom: 24%;  left: ${rp}%; transform: translateX(-50%) scale(0.85) rotate(${r1}deg); }
            45%  { bottom: 42%;  left: ${rm}%; transform: translateX(-50%) scale(0.72) rotate(${r2}deg); }
            70%  { bottom: 50%;  left: ${rr}%; transform: translateX(-50%) scale(0.65) rotate(${r3}deg); }
            100% { bottom: 35%;  left: 50%;    transform: translateX(-50%) scale(0.7)  rotate(${r4}deg); }
          }
        `;
      })()}</style>

      {/* ─── Background landscape ─── */}
      <div className="catch-go-bg" aria-hidden>
        <div className="catch-go-sky" />
        <svg className="catch-go-clouds" viewBox="0 0 1000 200" preserveAspectRatio="none">
          <g fill="white" opacity="0.85">
            <ellipse cx="120" cy="60" rx="60" ry="22" />
            <ellipse cx="160" cy="55" rx="40" ry="18" />
            <ellipse cx="80"  cy="65" rx="35" ry="16" />
            <ellipse cx="500" cy="40" rx="70" ry="25" />
            <ellipse cx="550" cy="35" rx="45" ry="20" />
            <ellipse cx="850" cy="70" rx="65" ry="24" />
            <ellipse cx="900" cy="65" rx="42" ry="18" />
          </g>
        </svg>
        <svg className="catch-go-mountains" viewBox="0 0 1000 300" preserveAspectRatio="none">
          <path d="M0,300 L0,180 L120,80 L220,160 L330,60 L450,170 L580,40 L720,180 L850,90 L1000,170 L1000,300 Z"
                fill="#4a7c59" opacity="0.55" />
          <path d="M0,300 L0,230 L100,160 L200,210 L320,140 L440,200 L570,120 L700,220 L820,160 L1000,210 L1000,300 Z"
                fill="#5b8e6c" opacity="0.75" />
        </svg>
        <div className="catch-go-grass-far" />
        <div className="catch-go-grass-bushes" aria-hidden>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`grass-bush bush-${i}`} />
          ))}
        </div>
        <div className="catch-go-grass-near" />
        {/* Grass tufts in foreground */}
        <svg className="catch-go-tufts" viewBox="0 0 1000 200" preserveAspectRatio="none">
          <g fill="#3f7a4a" stroke="#2d5a36" strokeWidth="1.5" strokeLinejoin="round">
            <path d="M 50 200 L 45 160 L 55 165 L 60 145 L 65 170 L 75 155 L 80 195 Z" />
            <path d="M 200 200 L 195 155 L 205 170 L 215 145 L 220 175 L 230 160 L 235 195 Z" />
            <path d="M 450 200 L 445 165 L 455 175 L 465 150 L 470 180 L 480 165 L 485 195 Z" />
            <path d="M 700 200 L 695 160 L 705 170 L 715 145 L 720 175 L 730 160 L 735 195 Z" />
            <path d="M 880 200 L 875 165 L 885 175 L 895 150 L 900 180 L 910 165 L 915 195 Z" />
          </g>
        </svg>
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
          🏃
        </button>
        <button className="catch-go-icon-btn catch-go-camera"
          onClick={() => setShowTutorial(true)}
          title={lang === "th" ? "คู่มือ" : "Tutorial"}>
          ❓
        </button>
        <div className="catch-go-counter-badge">🏆 {caughtCount}</div>
      </div>

      {/* ─── Name banner (no CP) ─── */}
      <div className="catch-go-name-banner">
        <div className="catch-go-name-pill">
          <span className="catch-go-pokeball-icon">⊕</span>
          <span className="catch-go-pokemon-name-txt">{pokemonName}</span>
        </div>
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
        <span className="catch-go-chance-pct">{Math.round(catchChance * 100)}%</span>
      </div>

      {/* ─── Main arena (pokemon + drag area) ─── */}
      <div ref={arenaRef}
        className={`catch-go-arena phase-${phase}${dragging ? " dragging" : ""}`}
        onMouseDown={onDragStart} onMouseMove={onDragMove}
        onMouseUp={onDragEnd} onMouseLeave={onDragEnd}
        onTouchStart={onDragStart} onTouchMove={onDragMove} onTouchEnd={onDragEnd}>

        {/* Pokemon (3D) */}
        {(phase === "idle" || phase === "throwing" || phase === "hit" || phase === "suckIn") && (
          <div className="catch-go-pokemon-stage">
            <Catch3DPokemon pokemon={pokemon} pokemonName={pokemonName}
              phase={phase} variant="main" />
            {/* Soft shadow under feet */}
            <div className="catch-go-pokemon-shadow" />
          </div>
        )}

        {/* ─── Pokemon GO Capture Ring (pulsing target) ─── */}
        {phase === "idle" && (
          <svg
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -55%)",
              pointerEvents: "none",
              zIndex: 4,
              width: "320px",
              height: "320px",
              overflow: "visible",
            }}
            viewBox="-160 -160 320 320">
            {/* Outer faint guide circle */}
            <circle
              cx="0" cy="0" r="140"
              fill="none"
              stroke="rgba(255,255,255,0.25)"
              strokeWidth="2"
              strokeDasharray="6 8"
            />
            {/* Active pulsing ring */}
            <circle
              cx="0" cy="0"
              r={ringRadius * 0.5}
              fill="none"
              stroke={ringZone.color}
              strokeWidth="4"
              opacity="0.85"
              style={{
                filter: `drop-shadow(0 0 8px ${ringZone.color})`,
                transition: "stroke 0.2s ease",
              }}
            />
            {/* Inner solid ring at sweet spot */}
            <circle
              cx="0" cy="0"
              r={ringRadius * 0.5}
              fill="none"
              stroke={ringZone.color}
              strokeWidth="2"
              opacity="0.4"
              strokeDasharray="2 4"
            />
          </svg>
        )}

        {/* Ring zone label (top, above name banner) */}
        {phase === "idle" && ringZone.label && (
          <div style={{
            position: "absolute",
            top: "8px",
            left: "50%",
            transform: "translateX(-50%)",
            color: ringZone.color,
            fontSize: "11px",
            fontWeight: 800,
            letterSpacing: "2px",
            textShadow: "0 2px 6px rgba(0,0,0,0.6)",
            pointerEvents: "none",
            zIndex: 5,
            opacity: ringRadius < 230 ? 1 : 0.5,
            transition: "opacity 0.2s ease",
          }}>
            ◉ {ringZone.label} ZONE
          </div>
        )}

        {/* Pokemon bursts back on escape */}
        {phase === "escape" && (
          <div className="catch-go-pokemon-stage">
            <Catch3DPokemon pokemon={pokemon} pokemonName={pokemonName}
              phase="escape" variant="escape" />
            <div className="catch-go-pokemon-shadow" />
          </div>
        )}

        {/* Red beams */}
        {phase === "suckIn" && (
          <SuckInEffect />
        )}

        {/* Drag trail — particle-based with sparkles */}
        {dragging && dragPath.length > 1 && (
          <>
            {/* SVG underlay path */}
            <svg className="catch-go-trail" style={{ overflow: "visible" }}>
              <defs>
                <linearGradient id="trail-grad-go" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor={ball.glow} stopOpacity="0" />
                  <stop offset="100%" stopColor={ball.glow} stopOpacity="1" />
                </linearGradient>
              </defs>
              <path d={`M ${dragPath.map(p => `${p.x},${p.y}`).join(" L ")}`}
                fill="none" stroke="url(#trail-grad-go)" strokeWidth="6"
                strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
            </svg>
            {/* Sparkle particles along the path */}
            {dragPath.slice(-12).map((pt, i, arr) => {
              const opacity = (i / arr.length) * 0.95;
              const size = 4 + (i / arr.length) * 8;
              return (
                <div key={i} style={{
                  position: "absolute",
                  left: pt.x,
                  top: pt.y,
                  width: `${size}px`,
                  height: `${size}px`,
                  marginLeft: `${-size / 2}px`,
                  marginTop: `${-size / 2}px`,
                  borderRadius: "50%",
                  background: `radial-gradient(circle, white 0%, ${ball.glow} 60%, transparent 100%)`,
                  boxShadow: `0 0 ${size}px ${ball.glow}`,
                  opacity,
                  pointerEvents: "none",
                  zIndex: 5,
                }} />
              );
            })}
          </>
        )}

        {/* Dragging element — follows pointer, shows ball or berry */}
        {dragging && (
          <div className="catch-go-ball-dragging"
            style={{
              position: "absolute",
              left: ballPos.x,
              top: ballPos.y,
              transform: "translate(-50%, -50%)",
              zIndex: 7,
              pointerEvents: "none",
              filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.4))",
            }}>
            {currentThrowable === "berry" ? (
              <BerryImg berryId={berryId} size={88} animate />
            ) : (
              <PokeballImg ballId={ballId} size={88} glow animate />
            )}
          </div>
        )}

        {/* Throwing/hit/suckIn ball animation — curve trajectory if curve ball */}
        {(phase === "throwing" || phase === "hit" || phase === "suckIn") && (
          <div className={`catch-go-ball-fly phase-${phase}`}
            style={isCurveBall && phase === "throwing" ? {
              animation: `catch-go-curve-${curveDirection} 0.85s cubic-bezier(0.3, 0.7, 0.4, 1) forwards`,
            } : undefined}>
            <PokeballImg ballId={ballId} size={88} glow />
            {/* Glow ring for curve ball */}
            {isCurveBall && phase === "throwing" && (
              <span style={{
                position: "absolute",
                inset: "-8px",
                borderRadius: "50%",
                boxShadow: `inset 0 0 12px ${ball.glow}, 0 0 16px ${ball.glow}88`,
                pointerEvents: "none",
              }} />
            )}
          </div>
        )}

        {/* Wobble — beautiful tilt + aura + glowing progress dots */}
        {phase === "wobble" && (
          <WobbleEffect ballId={ballId} wobbleCount={wobbleCount} />
        )}

        {/* Success */}
        {phase === "success" && (
          <>
            <div className="catch-go-ball-success">
              <PokeballImg ballId={ballId} size={100} glow animate />
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
          }}>
            ⭐ CRITICAL CATCH! ⭐
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
          }}>
            🌀 CURVE BALL!
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
            onOpenAR={() => setArOpen(true)}
          />
        )}
        {arOpen && (
          <ARViewer pokemon={pokemon} lang={lang} onClose={() => setArOpen(false)} />
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
            <div
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

      {/* ─── Bottom bar: Berry (left) + Ball selector (right) ─── */}
      <div className="catch-go-bottombar">
        {/* Berry button — opens picker (throw is via center throwable) */}
        <button className={`catch-go-bottom-btn berry${berryThrown ? " berry-used" : ""}`}
          onClick={() => setShowBerryPicker(true)}
          disabled={phase !== "idle" || berryFlying}
          style={berryThrown ? { opacity: 0.6 } : undefined}
          title={lang === "th" ? "เลือกเบอร์รี่" : "Select berry"}>
          {berry ? <BerryImg berryId={berryId} size={42} /> : <span style={{ fontSize: 28 }}>🍓</span>}
        </button>

        {/* placeholder to keep visual layout balanced */}
        <div className="catch-go-ball-placeholder" />

        {/* Ball selector — no count badge */}
        <button className="catch-go-bottom-btn ball-select"
          onClick={() => setShowBallPicker(true)}
          disabled={phase !== "idle"}
          title={lang === "th" ? "เลือกบอล" : "Select ball"}>
          <PokeballImg ballId={ballId} size={42} />
        </button>
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
function CatchSuccessScreen({ pokemon, pokemonName, ballId, ball, bonuses, caughtCount, isCritical, lang, onOpenAR }) {
  // 30 confetti particles with random colors/positions
  const confetti = useMemo(() => {
    const colors = ["#fbbf24", "#facc15", "#34d399", "#60a5fa", "#f472b6", "#a78bfa", "#fb923c"];
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
      }}>
        🎉 GOTCHA! 🎉
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
        }}>
          ⭐ CRITICAL CATCH ⭐
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
              <span>{b.icon}</span>
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

      {/* AR View button */}
      {onOpenAR && (
        <button
          onClick={onOpenAR}
          style={{
            marginTop: 18,
            padding: "11px 28px",
            borderRadius: 999,
            border: "1.5px solid rgba(56,189,248,0.6)",
            background: "rgba(56,189,248,0.15)",
            color: "#bae6fd",
            fontSize: 14,
            fontWeight: 900,
            cursor: "pointer",
            backdropFilter: "blur(8px)",
            letterSpacing: "0.5px",
            animation: "catch-go-bonus-row-in 0.5s ease 1.5s backwards",
          }}
        >
          📷 {lang === "th" ? "ดูใน AR" : lang === "ja" ? "ARで見る" : "View in AR"}
        </button>
      )}
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
          borderRadius: "20px",
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
            fontSize: "38px",
            animation: "fail-shake-icon 0.5s ease 3",
            filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.4))",
          }}>💢</div>
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
function WobbleEffect({ ballId, wobbleCount }) {
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
        @keyframes wobble-dot-pop {
          0%   { transform: scale(0); }
          70%  { transform: scale(1.4); }
          100% { transform: scale(1.2); }
        }
      `}</style>

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
            border: "2px solid rgba(251, 191, 36, 0.35)",
            borderRadius: "50%",
            animation: "wobble-aura-pulse 1.4s ease-in-out infinite",
            pointerEvents: "none",
          }} />
          {/* Inner aura ring */}
          <div style={{
            position: "absolute",
            inset: "-10px",
            border: "3px solid rgba(251, 191, 36, 0.6)",
            borderRadius: "50%",
            animation: "wobble-aura-pulse-2 1s ease-in-out 0.2s infinite",
            pointerEvents: "none",
          }} />
          {/* Soft glow background */}
          <div style={{
            position: "absolute",
            inset: "-30px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(251,191,36,0.35) 0%, transparent 65%)",
            filter: "blur(8px)",
            pointerEvents: "none",
          }} />

          {/* Ball with tilt — keyed so animation restarts each wobble */}
          <div
            key={`wobble-${wobbleCount}`}
            style={{
              width: "130px",
              height: "130px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: "wobble-tilt 0.7s ease",
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
          {[0, 1, 2].map(i => {
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
    { viz: <VizDragUp />,    title: t("ลากบอลขึ้น",   "Drag Up"),     accent: "#0ea5e9" },
    { viz: <VizRingZones />, title: t("กะวงเขียว",    "Hit Green"),   accent: "#22c55e" },
    { viz: <VizCurve />,     title: t("ลากเป็นโค้ง",   "Curve"),       accent: "#06b6d4" },
    { viz: <VizBerry />,     title: t("โยนเบอร์รี่",   "Berry First"), accent: "#ec4899" },
  ];

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10001,
        // ─── Lighter backdrop ─── (was 0.85, now 0.4)
        background: "rgba(15, 25, 45, 0.4)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        animation: "catch-go-overlay-in 0.3s ease",
      }}>

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

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%)",
          borderRadius: "26px",
          maxWidth: "420px",
          width: "100%",
          maxHeight: "92vh",
          overflow: "hidden",
          boxShadow: "0 24px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.2)",
          animation: "tutorial-modal-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
          display: "flex",
          flexDirection: "column",
        }}>

        {/* Compact header */}
        <div style={{
          background: "linear-gradient(135deg, #06b6d4 0%, #2563eb 100%)",
          padding: "14px 18px",
          color: "white",
          position: "relative",
          textAlign: "center",
        }}>
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: "10px",
              right: "10px",
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background: "rgba(255,255,255,0.22)",
              border: "none",
              color: "white",
              fontSize: "13px",
              fontWeight: 800,
              cursor: "pointer",
              backdropFilter: "blur(6px)",
            }}>
            ✕
          </button>
          <div style={{
            fontSize: "19px",
            fontWeight: 900,
            letterSpacing: "0.5px",
            textShadow: "0 2px 6px rgba(0,0,0,0.3)",
          }}>
            🎓 {t("วิธีเล่น", "How to Play")}
          </div>
        </div>

        {/* Visual cards — 2x2 grid */}
        <div style={{
          padding: "16px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px",
        }}>
          {cards.map((card, idx) => (
            <div key={idx} style={{
              background: "white",
              borderRadius: "16px",
              padding: "14px 10px 10px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "6px",
              boxShadow: `0 4px 14px rgba(0,0,0,0.06), 0 0 0 1px ${card.accent}22`,
              border: `2px solid ${card.accent}33`,
              animation: `tutorial-card-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.1 + idx * 0.08}s backwards`,
            }}>
              {/* Visual */}
              <div style={{
                width: "80px",
                height: "80px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                {card.viz}
              </div>
              {/* Title only — no description */}
              <div style={{
                fontSize: "13px",
                fontWeight: 800,
                color: card.accent,
                textAlign: "center",
                letterSpacing: "0.2px",
              }}>
                {card.title}
              </div>
            </div>
          ))}

          {/* Critical Catch — full-width row */}
          <div style={{
            gridColumn: "1 / -1",
            background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
            borderRadius: "16px",
            padding: "12px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            border: "2px solid #fbbf2455",
            boxShadow: "0 4px 14px rgba(251,191,36,0.25)",
            animation: "tutorial-card-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.45s backwards",
          }}>
            <div style={{
              width: "70px",
              height: "70px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}>
              <VizCritical />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: "13px",
                fontWeight: 900,
                color: "#92400e",
                letterSpacing: "1px",
                textTransform: "uppercase",
              }}>
                ⭐ Critical Catch
              </div>
              <div style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#78350f",
                marginTop: "2px",
              }}>
                {t("โชคดี = ติดทันที!", "Lucky = instant catch!")}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "12px 18px 16px",
          borderTop: "1px solid #e2e8f0",
          background: "rgba(248,250,252,0.7)",
        }}>
          <label style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            cursor: "pointer",
            fontSize: "11px",
            color: "#64748b",
            fontWeight: 600,
            marginBottom: "10px",
            userSelect: "none",
          }}>
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              style={{
                width: "16px",
                height: "16px",
                accentColor: "#06b6d4",
                cursor: "pointer",
              }}
            />
            {t("ไม่ต้องแสดงอีก", "Don't show again")}
          </label>

          <button
            onClick={handleStart}
            style={{
              width: "100%",
              padding: "13px",
              background: "linear-gradient(135deg, #06b6d4 0%, #0ea5e9 45%, #2563eb 100%)",
              backgroundSize: "200% 200%",
              color: "white",
              border: "none",
              borderRadius: "14px",
              fontSize: "15px",
              fontWeight: 900,
              cursor: "pointer",
              letterSpacing: "0.5px",
              boxShadow: "0 6px 20px rgba(14, 165, 233, 0.5), inset 0 1px 0 rgba(255,255,255,0.3)",
              fontFamily: "inherit",
              animation: "catch-cta-shimmer 3s ease-in-out infinite",
            }}>
            🎮 {t("เริ่มเล่น!", "Let's Play!")}
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
        right: 10,
        top: 8,
        color: "#22c55e",
        fontSize: 28,
        fontWeight: 900,
        animation: "viz-bob-up 1.4s ease-in-out infinite",
        textShadow: "0 0 10px #22c55e88",
        lineHeight: 1,
      }}>↑</div>
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
      <circle cx="40" cy="40" r="22" fill="none" stroke="#3b82f6" strokeWidth="3" opacity="0.85" />
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
        fontSize: 32,
        lineHeight: 1,
      }}>
        🦎
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
      <span style={{ position: "absolute", top: 0, left: 4, fontSize: 14, animation: "viz-star-twinkle 1.2s ease-in-out infinite" }}>⭐</span>
      <span style={{ position: "absolute", top: 6, right: 2, fontSize: 12, animation: "viz-star-twinkle 1.2s ease-in-out 0.3s infinite" }}>✨</span>
      <span style={{ position: "absolute", bottom: 4, right: 6, fontSize: 14, animation: "viz-star-twinkle 1.2s ease-in-out 0.6s infinite" }}>⭐</span>
      <span style={{ position: "absolute", bottom: 8, left: 2, fontSize: 12, animation: "viz-star-twinkle 1.2s ease-in-out 0.9s infinite" }}>✨</span>
    </div>
  );
}