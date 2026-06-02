// ─── WeatherOverlay — MINIMAL effects (only rain + snow + storm) ─────
// Cloud + fog overlays REMOVED at user request (was blocking content view)

import { useMemo } from "react";
import { useReducedMotion, useIsMobile, useSlowConnection, usePageVisible } from "../perfUtils.js";

export default function WeatherOverlay({ condition, isDay = true }) {
  const reduced  = useReducedMotion();
  const isMobile = useIsMobile();
  const slow     = useSlowConnection();
  const visible  = usePageVisible();

  // Generate particles
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

  // Early exits
  if (!visible) return null;
  if (reduced || slow) return null;
  if (!condition) return null;

  // Only render for: rain, drizzle, thunderstorm, snow
  // SKIP: clear, mostly-clear, partly-cloudy, cloudy, fog (no overlay = no visual block)
  const isRain  = condition === "rain" || condition === "drizzle" || condition === "thunderstorm";
  const isSnow  = condition === "snow";
  const isStorm = condition === "thunderstorm";

  if (!isRain && !isSnow) return null;

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      pointerEvents: "none",
      zIndex: 9998,
      overflow: "hidden",
      contain: "strict",
    }}>
      {/* Subtle color tint (much lighter than before) */}
      <div style={{
        position: "absolute",
        inset: 0,
        background:
          isStorm  ? "linear-gradient(180deg, rgba(15, 20, 40, 0.20) 0%, rgba(25, 35, 60, 0.12) 100%)"
          : isRain ? "linear-gradient(180deg, rgba(40, 55, 85, 0.08) 0%, rgba(50, 70, 100, 0.05) 100%)"
          : isSnow ? "linear-gradient(180deg, rgba(200, 220, 240, 0.06) 0%, rgba(220, 230, 245, 0.04) 100%)"
          : "transparent",
        transition: "background 1.5s ease",
      }} />

      {/* Rain drops */}
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

      {/* Snow flakes */}
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

      {/* Lightning flash (storm only) */}
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
    </div>
  );
}