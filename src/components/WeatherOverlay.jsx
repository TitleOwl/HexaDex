// ─── WeatherOverlay — Visual effects with adaptive performance ───
//
// Adapts particle count to device:
//   - Desktop: full effect (100+ drops)
//   - Mobile: reduced (50 drops)
//   - Reduced-motion / slow connection / hidden tab: disabled

import { useMemo } from "react";
import { useReducedMotion, useIsMobile, useSlowConnection, usePageVisible } from "../perfUtils.js";

export default function WeatherOverlay({ condition, isDay = true }) {
  const reduced  = useReducedMotion();
  const isMobile = useIsMobile();
  const slow     = useSlowConnection();
  const visible  = usePageVisible();

  // Stable drop generation - MUST be called before any early returns (rules of hooks)
  const isMobileNum = isMobile ? 1 : 0;
  const drops = useMemo(() => {
    const counts = {
      "thunderstorm": isMobile ? 65 : 130,
      "rain":         isMobile ? 50 : 100,
      "drizzle":      isMobile ? 22 : 45,
      "snow":         isMobile ? 30 : 60,
    };
    const total = counts[condition] || 0;
    return Array.from({ length: total }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2.2,
      duration: 0.5 + Math.random() * 0.8,
      opacity: 0.35 + Math.random() * 0.55,
      length: 8 + Math.random() * 16,
      size: 3 + Math.random() * 4,
    }));
  }, [condition, isMobileNum]);

  // Early exits AFTER hooks
  if (!visible) return null;
  if (reduced || slow) return null;
  if (!condition || condition === "mostly-clear") return null;

  // Clear day: gentle sun glow (cheap, no animation)
  if (condition === "clear") {
    if (!isDay) return null;
    return (
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9998, overflow: "hidden" }}>
        <div style={{
          position: "absolute",
          top: "-15%",
          right: "-15%",
          width: "55vw",
          height: "55vw",
          background: "radial-gradient(circle, rgba(255, 220, 130, 0.22) 0%, rgba(255, 220, 130, 0) 60%)",
        }} />
      </div>
    );
  }

  const isRain   = condition === "rain" || condition === "drizzle" || condition === "thunderstorm";
  const isSnow   = condition === "snow";
  const isStorm  = condition === "thunderstorm";
  const isCloudy = condition === "cloudy" || condition === "partly-cloudy";
  const isFog    = condition === "fog";

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      pointerEvents: "none",
      zIndex: 9998,
      overflow: "hidden",
      contain: "strict",
    }}>
      {/* Color tint */}
      <div style={{
        position: "absolute",
        inset: 0,
        background:
          isStorm  ? "linear-gradient(180deg, rgba(15, 20, 40, 0.42) 0%, rgba(25, 35, 60, 0.32) 100%)"
          : isRain ? "linear-gradient(180deg, rgba(40, 55, 85, 0.22) 0%, rgba(50, 70, 100, 0.16) 100%)"
          : isSnow ? "linear-gradient(180deg, rgba(200, 220, 240, 0.18) 0%, rgba(220, 230, 245, 0.12) 100%)"
          : isFog  ? "rgba(220, 230, 240, 0.42)"
          : isCloudy ? "rgba(120, 130, 145, 0.14)"
          : "transparent",
        transition: "background 1.5s ease",
      }} />

      {/* Rain (GPU translate3d) */}
      {isRain && (
        <>
          <style>{`
            @keyframes wt-rain-fall {
              0%   { transform: translate3d(0, -40px, 0) rotate(10deg); opacity: 0; }
              10%  { opacity: 1; }
              100% { transform: translate3d(-25px, 110vh, 0) rotate(10deg); opacity: 0.4; }
            }
          `}</style>
          {drops.map(d => (
            <div key={d.id} style={{
              position: "absolute",
              left: `${d.left}%`,
              top: 0,
              width: isStorm ? "2px" : "1.5px",
              height: `${d.length}px`,
              background: isStorm
                ? "linear-gradient(180deg, transparent 0%, rgba(200, 220, 255, 0.95) 100%)"
                : "linear-gradient(180deg, transparent 0%, rgba(180, 210, 255, 0.85) 100%)",
              animation: `wt-rain-fall ${d.duration}s linear ${d.delay}s infinite`,
              opacity: d.opacity,
              transformOrigin: "top",
              borderRadius: "1px",
              willChange: "transform, opacity",
            }} />
          ))}
        </>
      )}

      {/* Snow */}
      {isSnow && (
        <>
          <style>{`
            @keyframes wt-snow-fall {
              0%   { transform: translate3d(0px,  -30px, 0); opacity: 0; }
              10%  { opacity: 1; }
              25%  { transform: translate3d(15px,  25vh, 0); }
              50%  { transform: translate3d(-15px, 50vh, 0); }
              75%  { transform: translate3d(20px,  75vh, 0); }
              100% { transform: translate3d(0px,   110vh, 0); opacity: 0.6; }
            }
          `}</style>
          {drops.map(d => (
            <div key={d.id} style={{
              position: "absolute",
              left: `${d.left}%`,
              top: 0,
              width: `${d.size}px`,
              height: `${d.size}px`,
              background: "white",
              borderRadius: "50%",
              boxShadow: "0 0 8px rgba(255, 255, 255, 0.7), 0 0 2px rgba(255, 255, 255, 1)",
              animation: `wt-snow-fall ${5 + d.duration * 5}s ease-in-out ${d.delay}s infinite`,
              opacity: d.opacity,
              willChange: "transform, opacity",
            }} />
          ))}
        </>
      )}

      {/* Lightning */}
      {isStorm && (
        <>
          <style>{`
            @keyframes wt-lightning {
              0%, 88%, 100%   { background: transparent; }
              89%, 89.5%      { background: rgba(255, 255, 255, 0.7); }
              90%             { background: rgba(255, 255, 255, 0.2); }
              90.5%, 91%      { background: rgba(255, 255, 255, 0.55); }
              91.5%           { background: transparent; }
            }
          `}</style>
          <div style={{ position: "absolute", inset: 0, animation: "wt-lightning 10s ease-in-out infinite", willChange: "background" }} />
        </>
      )}

      {/* Fog */}
      {isFog && (
        <>
          <style>{`
            @keyframes wt-fog-drift {
              0%, 100% { transform: translate3d(-30px, 0, 0); }
              50%      { transform: translate3d(30px, 0, 0); }
            }
          `}</style>
          <div style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 60% 40% at 20% 35%, rgba(235, 240, 248, 0.7), transparent 65%), " +
              "radial-gradient(ellipse 70% 35% at 75% 65%, rgba(225, 235, 245, 0.6), transparent 65%), " +
              "radial-gradient(ellipse 60% 40% at 50% 85%, rgba(220, 230, 245, 0.55), transparent 60%)",
            animation: "wt-fog-drift 16s ease-in-out infinite",
            willChange: "transform",
          }} />
        </>
      )}

      {/* Clouds drift (mobile: 2 clouds, desktop: 4) */}
      {isCloudy && (
        <>
          <style>{`
            @keyframes wt-cloud-drift {
              0%   { transform: translate3d(-50vw, 0, 0); opacity: 0; }
              10%  { opacity: 0.7; }
              90%  { opacity: 0.7; }
              100% { transform: translate3d(150vw, 0, 0); opacity: 0; }
            }
          `}</style>
          {(isMobile ? [0, 1] : [0, 1, 2, 3]).map(i => (
            <div key={i} style={{
              position: "absolute",
              top: `${5 + i * 16}%`,
              left: 0,
              width: "260px",
              height: "70px",
              background: "radial-gradient(ellipse at 30% 50%, rgba(255,255,255,0.78) 0%, transparent 65%), radial-gradient(ellipse at 70% 50%, rgba(255,255,255,0.7) 0%, transparent 70%)",
              animation: `wt-cloud-drift ${45 + i * 9}s linear ${-i * 14}s infinite`,
              filter: "blur(1px)",
              willChange: "transform, opacity",
            }} />
          ))}
        </>
      )}
    </div>
  );
}
