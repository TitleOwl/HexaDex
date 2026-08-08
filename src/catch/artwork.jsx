// Ball and berry artwork, restored from the previous build.
//
// Two things are worth keeping about the originals: the Pokémon GO item icons
// look far better than PokéAPI's 30px pixel sprites, and the berries were
// hand-drawn as SVG so they need no network at all.
//
// Loading is a chain, not a single source, because the nice icons live on a
// third-party host: GO icon → bundled local PNG → drawn circle. Something
// always renders.
import { useState } from "react";
import { BERRIES, ballById } from "./catchMath.js";

const GO_BALL_SPRITE = { poke: "pokeball", great: "greatball", ultra: "ultraball" };
const GO_BALL_ICON = (slug) =>
  `https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Items/${slug}_sprite.png`;

// PokeMiners item ids: 701 Razz, 703 Nanab.
const GO_BERRY_ICON_ID = { boost: 701, calm: 703 };
const GO_ITEM_ICON = (n) =>
  `https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Items/Item_${String(n).padStart(4, "0")}.png`;

/** Ball icon. `spinDeg` rotates it, `charged` adds the wound-up glow. */
export function BallImg({ ballId, size = 60, spinDeg = 0, charged = false }) {
  const ball = ballById(ballId);
  // 0 = GO icon, 1 = bundled png, 2 = drawn fallback
  const [stage, setStage] = useState(0);
  const slug = GO_BALL_SPRITE[ballId];
  const src = stage === 0 && slug ? GO_BALL_ICON(slug) : ball.img;

  const style = {
    transform: spinDeg ? `rotate(${spinDeg}deg)` : undefined,
    filter: charged
      ? `drop-shadow(0 0 15px ${ball.color}) drop-shadow(0 6px 9px rgba(0,0,0,0.22))`
      : "drop-shadow(0 6px 9px rgba(0,0,0,0.22))",
    // The bundled sprites are 30px pixel art; the GO icons are not.
    imageRendering: stage === 0 && slug ? "auto" : "pixelated",
  };

  if (stage < 2 && src) {
    return (
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        draggable={false}
        className="cx-ballimg"
        style={style}
        onError={() => setStage(s => s + 1)}
      />
    );
  }
  return (
    <div
      className="cx-ballimg"
      style={{
        ...style,
        width: size, height: size, borderRadius: "50%",
        background: `radial-gradient(circle at 35% 35%, ${ball.color}bb, ${ball.color})`,
        border: `2px solid ${ball.color}`,
        flexShrink: 0,
      }}
    />
  );
}

/** Hand-drawn berry — no network, so this is the guaranteed floor. */
export function BerryGO({ berryId, size = 40, animate = false }) {
  const berry = BERRIES.find(b => b.id === berryId);
  if (!berry) return null;
  const uid = berryId;

  if (berry.shape === "razz") {
    const mainLight = "#fce7f3";
    const mainMid   = "#f472b6";
    const mainDark  = "#831843";
    const accent    = "#ec4899";
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
  return null;
}

/** Berry icon: the GO art when it loads, the drawn one when it doesn't. */
export function BerryImg({ berryId, size = 40, animate = false }) {
  const [failed, setFailed] = useState(false);
  const iconId = GO_BERRY_ICON_ID[berryId];
  if (!iconId || failed) return <BerryGO berryId={berryId} size={size} animate={animate} />;
  return (
    <img
      src={GO_ITEM_ICON(iconId)}
      alt=""
      width={size}
      height={size}
      className={`berry-go${animate ? " berry-spin" : ""}`}
      draggable={false}
      style={{ objectFit: "contain" }}
      onError={() => setFailed(true)}
    />
  );
}
