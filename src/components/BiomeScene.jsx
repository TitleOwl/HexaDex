// ─── BiomeScene — living catch-screen backdrop ──────────────────────────
// Reacts to real time-of-day + weather (shares useWeather / Open-Meteo data
// with the rest of the Pokédex). Pure CSS/JS, no images, GPU-friendly.
//
//   <BiomeScene condition="rain" isDay={false} timeOfDay="night" />
//
// condition: clear | mostly-clear | partly-cloudy | cloudy | fog |
//            drizzle | rain | snow | thunderstorm | unknown
// timeOfDay: dawn | day | dusk | night

import { useMemo } from "react";
import { useReducedMotion, useIsMobile } from "../perfUtils.js";

// Sky palettes per time of day (top → mid → bottom)
const SKY = {
  dawn:  ["#f7cfa6", "#f3a9b4", "#b9a8d8"],
  day:   ["#9fd9ff", "#c3ebff", "#e9f7ff"],
  dusk:  ["#ffb074", "#ff7d8c", "#574a86"],
  night: ["#1a2350", "#131a3c", "#090c20"],
};

// Ground (near field) per time of day
const GROUND = {
  dawn:  { back: "#79b06a", front: "#5e9a52" },
  day:   { back: "#7ec96a", front: "#5fb352" },
  dusk:  { back: "#5a8a52", front: "#436b3f" },
  night: { back: "#2c4a36", front: "#1d3326" },
};

const CLOUD_LEVEL = {
  "clear": 1, "mostly-clear": 2, "partly-cloudy": 3,
  "cloudy": 5, "fog": 5, "drizzle": 6, "rain": 6,
  "thunderstorm": 7, "snow": 4, "unknown": 2,
};

export default function BiomeScene({ condition = "clear", isDay = true, timeOfDay = "day" }) {
  const reduced  = useReducedMotion();
  const isMobile = useIsMobile();

  const isRain  = condition === "rain" || condition === "drizzle" || condition === "thunderstorm";
  const isStorm = condition === "thunderstorm";
  const isSnow  = condition === "snow";
  const isFog   = condition === "fog";
  const night   = timeOfDay === "night";
  const cloudLv = CLOUD_LEVEL[condition] ?? 2;
  const calm    = !isRain && !isSnow && !isFog;          // gentle weather
  const showPetals = calm && !night && cloudLv <= 3;
  const showStars  = night && cloudLv <= 2;
  const showSun    = !night && cloudLv <= 3 && !isRain && !isSnow && !isFog;
  const showMoon   = night && cloudLv <= 3 && !isRain && !isSnow;

  const sky    = SKY[timeOfDay] || SKY.day;
  const ground = GROUND[timeOfDay] || GROUND.day;

  // weather darkening / cooling tint over the sky
  const tint =
    isStorm ? "rgba(20,26,48,0.46)"
    : isRain ? "rgba(48,62,92,0.30)"
    : isSnow ? "rgba(214,228,240,0.20)"
    : isFog  ? "rgba(190,198,208,0.34)"
    : cloudLv >= 5 ? "rgba(120,130,148,0.22)"
    : "transparent";

  // ─── particle generators ───────────────────────────────────
  const stars = useMemo(() => showStars
    ? Array.from({ length: isMobile ? 36 : 64 }, (_, i) => ({
        id: i, x: Math.random() * 100, y: Math.random() * 58,
        d: 1 + Math.random() * 2.2, delay: -Math.random() * 4,
      }))
    : [], [showStars, isMobile]);

  const petals = useMemo(() => showPetals
    ? Array.from({ length: isMobile ? 12 : 20 }, (_, i) => ({
        id: i, x: Math.random() * 100, dur: 7 + Math.random() * 7,
        delay: -Math.random() * 12, scale: 0.6 + Math.random() * 0.7,
        hue: 330 + Math.random() * 18,
      }))
    : [], [showPetals, isMobile]);

  const clouds = useMemo(() => {
    const n = Math.min(cloudLv, isMobile ? 4 : 6);
    return Array.from({ length: n }, (_, i) => ({
      id: i, top: 6 + Math.random() * 30, scale: 0.7 + Math.random() * 0.8,
      dur: 38 + Math.random() * 40, delay: -Math.random() * 40,
      op: cloudLv >= 5 ? 0.85 : 0.6,
    }));
  }, [cloudLv, isMobile]);

  const drops = useMemo(() => {
    if (reduced) return [];
    const n = isRain ? (isStorm ? (isMobile ? 60 : 120) : (isMobile ? 44 : 90))
            : isSnow ? (isMobile ? 28 : 54) : 0;
    return Array.from({ length: n }, (_, i) => ({
      id: i, x: Math.random() * 100, delay: -Math.random() * 2.4,
      dur: isSnow ? 5 + Math.random() * 5 : 0.5 + Math.random() * 0.7,
      op: 0.35 + Math.random() * 0.5, len: 9 + Math.random() * 16,
      size: 2.5 + Math.random() * 3.5,
    }));
  }, [isRain, isSnow, isStorm, reduced, isMobile]);

  const skyGrad = `linear-gradient(180deg, ${sky[0]} 0%, ${sky[1]} 46%, ${sky[2]} 100%)`;

  return (
    <div className="biome" aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <style>{KEYFRAMES}</style>

      {/* sky */}
      <div className="biome-sky" style={{ background: skyGrad }} />
      {tint !== "transparent" && (
        <div className="biome-tint" style={{ background: tint }} />
      )}

      {/* celestial */}
      {showSun && (
        <div className="biome-sun" style={{
          background: timeOfDay === "dusk"
            ? "radial-gradient(circle, #fff1c2 0%, #ffb057 55%, transparent 72%)"
            : "radial-gradient(circle, #fffbe8 0%, #ffe79a 52%, transparent 72%)",
        }} />
      )}
      {showMoon && <div className="biome-moon" />}

      {/* stars */}
      {stars.map(s => (
        <span key={s.id} className="biome-star" style={{
          left: `${s.x}%`, top: `${s.y}%`, width: s.d, height: s.d,
          animationDelay: `${s.delay}s`,
        }} />
      ))}

      {/* clouds */}
      {clouds.map(c => (
        <div key={c.id} className="biome-cloud" style={{
          top: `${c.top}%`, opacity: c.op,
          transform: `scale(${c.scale})`,
          filter: night ? "brightness(0.55)" : (cloudLv >= 5 ? "brightness(0.9)" : "none"),
          animation: `biome-cloud-drift ${c.dur}s linear ${c.delay}s infinite`,
        }}>
          <span /><span /><span />
        </div>
      ))}

      {/* distant hills + near field (M-style) */}
      <div className="biome-hill biome-hill-far"  style={{ background: ground.back,  filter: isSnow ? "brightness(1.4) saturate(0.3)" : "none" }} />
      <div className="biome-hill biome-hill-near" style={{ background: ground.front, filter: isSnow ? "brightness(1.3) saturate(0.3)" : "none" }} />
      <div className="biome-field" style={{
        background: `linear-gradient(180deg, ${ground.front} 0%, ${shade(ground.front)} 100%)`,
        filter: isRain ? "brightness(0.82) saturate(0.85)" : isSnow ? "brightness(1.5) saturate(0.25)" : "none",
      }} />
      {(isRain || isSnow) && <div className="biome-wet" />}

      {/* fog */}
      {isFog && (<><div className="biome-fog f1" /><div className="biome-fog f2" /></>)}

      {/* falling petals */}
      {petals.map(p => (
        <span key={p.id} className="biome-petal" style={{
          left: `${p.x}%`,
          background: `radial-gradient(circle at 30% 30%, hsl(${p.hue} 90% 88%), hsl(${p.hue} 80% 74%))`,
          animation: `biome-petal-fall ${p.dur}s linear ${p.delay}s infinite`,
          transform: `scale(${p.scale})`,
        }} />
      ))}

      {/* rain / snow */}
      {(isRain || isSnow) && drops.map(d => (
        isSnow ? (
          <span key={d.id} className="biome-flake" style={{
            left: `${d.x}%`, width: d.size, height: d.size, opacity: d.op,
            animation: `biome-snow-fall ${d.dur}s ease-in-out ${d.delay}s infinite`,
          }} />
        ) : (
          <span key={d.id} className="biome-drop" style={{
            left: `${d.x}%`, height: d.len, opacity: d.op,
            animation: `biome-rain-fall ${d.dur}s linear ${d.delay}s infinite`,
          }} />
        )
      ))}

      {/* lightning */}
      {isStorm && !reduced && <div className="biome-flash" />}

      {/* gentle vignette for focus */}
      <div className="biome-vignette" />
    </div>
  );
}

// darken a hex by ~18% for the field gradient base
function shade(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = Math.max(0, ((n >> 16) & 255) * 0.78) | 0;
  const g = Math.max(0, ((n >> 8) & 255) * 0.78) | 0;
  const b = Math.max(0, (n & 255) * 0.78) | 0;
  return `rgb(${r},${g},${b})`;
}

const KEYFRAMES = `
.biome-sky, .biome-tint { position:absolute; inset:0; }
.biome-tint { transition: background 1.2s ease; }
.biome-sun {
  position:absolute; top:12%; right:18%; width:150px; height:150px; border-radius:50%;
  animation: biome-pulse 7s ease-in-out infinite; pointer-events:none;
}
.biome-moon {
  position:absolute; top:11%; right:20%; width:84px; height:84px; border-radius:50%;
  background: radial-gradient(circle at 38% 36%, #fdfcf3 0%, #e7e6d6 62%, #cfceba 100%);
  box-shadow: 0 0 40px rgba(255,255,240,0.45); pointer-events:none;
}
.biome-moon::after {
  content:""; position:absolute; inset:0; border-radius:50%;
  box-shadow: inset -22px -10px 0 -6px rgba(0,0,0,0.06);
}
@keyframes biome-pulse { 0%,100%{filter:brightness(1)} 50%{filter:brightness(1.12)} }
.biome-star {
  position:absolute; border-radius:50%; background:#fff;
  box-shadow:0 0 4px rgba(255,255,255,0.8);
  animation: biome-twinkle 3.4s ease-in-out infinite; pointer-events:none;
}
@keyframes biome-twinkle { 0%,100%{opacity:.25; transform:scale(.7)} 50%{opacity:1; transform:scale(1.1)} }
.biome-cloud { position:absolute; left:-30%; width:160px; height:50px; pointer-events:none; }
.biome-cloud span {
  position:absolute; bottom:0; background:#fff; border-radius:50%;
  box-shadow:0 6px 14px rgba(0,0,0,0.06);
}
.biome-cloud span:nth-child(1){ left:0;   width:70px; height:50px; }
.biome-cloud span:nth-child(2){ left:38px; width:90px; height:66px; bottom:0; }
.biome-cloud span:nth-child(3){ left:96px; width:64px; height:46px; }
@keyframes biome-cloud-drift { from{transform:translateX(0)} to{transform:translateX(170vw)} }
.biome-hill { position:absolute; left:-12%; right:-12%; border-radius:50%; pointer-events:none; }
.biome-hill-far  { bottom:28%; height:200px; }
.biome-hill-near { bottom:20%; height:230px; }
.biome-field {
  position:absolute; left:0; right:0; bottom:0; height:30%; pointer-events:none;
}
.biome-field::before {
  content:""; position:absolute; left:0; right:0; top:0; height:12px;
  background: repeating-linear-gradient(96deg, rgba(0,0,0,0.06) 0 9px, transparent 9px 20px);
}
.biome-wet {
  position:absolute; left:0; right:0; bottom:0; height:30%; pointer-events:none;
  background: linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.10) 100%);
  mix-blend-mode: screen;
}
.biome-fog {
  position:absolute; left:-20%; right:-20%; height:120px; pointer-events:none;
  background: radial-gradient(closest-side, rgba(235,238,242,0.85), transparent);
}
.biome-fog.f1 { top:34%; animation: biome-fog-drift 26s ease-in-out infinite alternate; }
.biome-fog.f2 { top:52%; animation: biome-fog-drift 34s ease-in-out infinite alternate-reverse; }
@keyframes biome-fog-drift { from{transform:translateX(-8%)} to{transform:translateX(8%)} }
.biome-petal {
  position:absolute; top:-24px; width:13px; height:13px; border-radius:62% 0 62% 0;
  opacity:.9; pointer-events:none; will-change:transform;
}
@keyframes biome-petal-fall {
  0%{transform:translateY(0) translateX(0) rotate(0); opacity:0}
  10%{opacity:.95}
  100%{transform:translateY(105vh) translateX(40px) rotate(440deg); opacity:0}
}
.biome-drop {
  position:absolute; top:-30px; width:1.6px; border-radius:1px; pointer-events:none; will-change:transform;
  background: linear-gradient(180deg, transparent, rgba(185,212,255,0.9));
}
@keyframes biome-rain-fall {
  0%{transform:translate3d(0,-40px,0) rotate(9deg); opacity:0}
  10%{opacity:1}
  100%{transform:translate3d(-26px,110vh,0) rotate(9deg); opacity:.35}
}
.biome-flake {
  position:absolute; top:-20px; border-radius:50%; background:#fff; pointer-events:none; will-change:transform;
  box-shadow:0 0 6px rgba(255,255,255,0.7);
}
@keyframes biome-snow-fall {
  0%{transform:translate3d(0,-20px,0); opacity:0}
  10%{opacity:1}
  50%{transform:translate3d(18px,52vh,0)}
  100%{transform:translate3d(-12px,110vh,0); opacity:.5}
}
.biome-flash {
  position:absolute; inset:0; pointer-events:none;
  animation: biome-lightning 11s ease-in-out infinite;
}
@keyframes biome-lightning {
  0%,90%,100%{background:transparent}
  91%,91.6%{background:rgba(255,255,255,0.6)}
  92%{background:rgba(255,255,255,0.15)}
  92.6%,93%{background:rgba(255,255,255,0.5)}
  93.6%{background:transparent}
}
.biome-vignette {
  position:absolute; inset:0; pointer-events:none;
  background: radial-gradient(120% 80% at 50% 38%, transparent 52%, rgba(0,0,0,0.22) 100%);
}
`;
