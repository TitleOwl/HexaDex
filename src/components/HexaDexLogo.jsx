// ─── HexaDexLogo — Bold redesign with high-contrast palette ────
//
// New palette: Gold → Orange → Red (Pokemon-classic, pops on ANY bg)
// + White outer halo for visibility on dark/colorful backgrounds
// + Glassy top highlight for premium feel
// + Mode prop ("auto" | "light" | "dark") for wordmark text color

import { useId } from "react";

const SIZE_PRESETS = {
  xs: { mark: 24, font: 14, gap: 7,  sub: 9  },
  sm: { mark: 34, font: 18, gap: 9,  sub: 10 },
  md: { mark: 46, font: 24, gap: 11, sub: 11 },
  lg: { mark: 76, font: 40, gap: 16, sub: 14 },
  xl: { mark: 124, font: 64, gap: 22, sub: 18 },
};

export default function HexaDexLogo({
  size      = "md",
  variant   = "combo",      // "mark" | "wordmark" | "combo" | "stacked"
  mode      = "auto",       // "auto" | "light" | "dark" — controls wordmark color
  animated  = true,
  tagline   = null,
  onClick   = undefined,
  className = "",
  style     = {},
}) {
  const id = useId().replace(/:/g, "");
  const cfg = typeof size === "number"
    ? { mark: size, font: size * 0.55, gap: size * 0.24, sub: size * 0.24 }
    : SIZE_PRESETS[size] ?? SIZE_PRESETS.md;

  // ─── Wordmark text color based on mode ─────────────────
  const wordmarkHexaColor =
    mode === "dark"  ? "#ffffff" :
    mode === "light" ? "#1e293b" :
    "var(--hexadex-name-base, #1e293b)";
  const wordmarkShadow =
    mode === "dark"  ? "0 2px 10px rgba(0,0,0,0.45), 0 1px 2px rgba(0,0,0,0.3)" :
    "0 1px 2px rgba(0,0,0,0.08)";

  const MarkSVG = (
    <svg
      viewBox="0 0 110 110"
      width={cfg.mark}
      height={cfg.mark}
      style={{
        display: "block",
        flexShrink: 0,
        filter: "drop-shadow(0 6px 16px rgba(220, 38, 38, 0.35))",
        transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
      className={animated ? `hexadex-mark-${id}` : undefined}
      aria-label="HexaDex logo"
      role="img"
    >
      <defs>
        {/* Main hex gradient — yellow → orange → red */}
        <linearGradient id={`hf-${id}`} x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%"   stopColor="#fde047" />
          <stop offset="35%"  stopColor="#fb923c" />
          <stop offset="70%"  stopColor="#ef4444" />
          <stop offset="100%" stopColor="#b91c1c" />
        </linearGradient>
        {/* Stroke gradient — deep amber → dark red */}
        <linearGradient id={`hs-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#b45309" />
          <stop offset="100%" stopColor="#7f1d1d" />
        </linearGradient>
        {/* Glassy top highlight */}
        <radialGradient id={`hg-${id}`} cx="38%" cy="22%" r="48%">
          <stop offset="0%"   stopColor="white" stopOpacity="0.7" />
          <stop offset="60%"  stopColor="white" stopOpacity="0.1" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        {/* Halo blur */}
        <filter id={`halo-${id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.5" />
        </filter>
      </defs>

      {/* White outer halo — makes logo pop on any background */}
      <polygon
        points="55,9 95,32 95,78 55,101 15,78 15,32"
        fill="white"
        opacity="0.55"
        filter={`url(#halo-${id})`}
        transform="translate(0, 0) scale(1.08) translate(-4.4, -4.4)"
      />

      {/* Main hexagon (offset slightly down for floating feel) */}
      <g transform="translate(0, 3)">
        <polygon
          points="55,9 95,32 95,78 55,101 15,78 15,32"
          fill={`url(#hf-${id})`}
          stroke={`url(#hs-${id})`}
          strokeWidth="2.8"
          strokeLinejoin="round"
        />

        {/* Glassy top highlight */}
        <polygon
          points="55,9 95,32 95,78 55,101 15,78 15,32"
          fill={`url(#hg-${id})`}
        />

        {/* Inner radar spokes — 6 white lines */}
        <g stroke="white" strokeWidth="1.3" opacity="0.7" strokeLinecap="round">
          <line x1="55" y1="55" x2="55" y2="22" />
          <line x1="55" y1="55" x2="83" y2="38" />
          <line x1="55" y1="55" x2="83" y2="72" />
          <line x1="55" y1="55" x2="55" y2="88" />
          <line x1="55" y1="55" x2="27" y2="72" />
          <line x1="55" y1="55" x2="27" y2="38" />
        </g>

        {/* Inner hexagon */}
        <polygon
          points="55,33 73,44 73,66 55,77 37,66 37,44"
          fill="none"
          stroke="white"
          strokeWidth="1.3"
          opacity="0.85"
          strokeLinejoin="round"
        />

        {/* 6 stat dots at vertices */}
        <g fill="white">
          <circle cx="55" cy="22" r="2.9" />
          <circle cx="83" cy="38" r="2.9" />
          <circle cx="83" cy="72" r="2.9" />
          <circle cx="55" cy="88" r="2.9" />
          <circle cx="27" cy="72" r="2.9" />
          <circle cx="27" cy="38" r="2.9" />
        </g>

        {/* Center "Pokeball" core (classic red + white) */}
        <circle cx="55" cy="55" r="10" fill="white" />
        <circle cx="55" cy="55" r="7" fill="#dc2626"
          className={animated ? `hexadex-core-${id}` : undefined}
        />
        <circle cx="55" cy="55" r="2.6" fill="white" />
      </g>

      {animated && (
        <style>{`
          .hexadex-mark-${id}:hover { transform: rotate(60deg) scale(1.05); }
          .hexadex-core-${id} {
            animation: hex-pulse-${id} 2.4s ease-in-out infinite;
            transform-origin: 55px 58px;
          }
          @keyframes hex-pulse-${id} {
            0%, 100% { opacity: 1; r: 7; }
            50%      { opacity: 0.85; r: 8.2; }
          }
        `}</style>
      )}
    </svg>
  );

  const WordMark = (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: variant === "stacked" ? "center" : "flex-start",
      gap: 1,
      lineHeight: 1,
    }}>
      <div style={{
        fontSize: cfg.font,
        fontWeight: 900,
        letterSpacing: "-0.025em",
        fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
        display: "inline-flex",
        alignItems: "baseline",
        textShadow: wordmarkShadow,
      }}>
        <span style={{
          color: wordmarkHexaColor,
          fontWeight: 800,
        }}>
          Hexa
        </span>
        <span style={{
          background: "linear-gradient(135deg, #fde047 0%, #fb923c 40%, #ef4444 75%, #dc2626 100%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          WebkitTextFillColor: "transparent",
          color: "transparent",
          fontWeight: 900,
          filter: "drop-shadow(0 2px 4px rgba(220, 38, 38, 0.5))",
        }}>
          Dex
        </span>
      </div>
      {(tagline !== null && tagline !== undefined) && (
        <div style={{
          fontSize: cfg.sub,
          fontWeight: 600,
          color: mode === "dark"
            ? "rgba(255, 255, 255, 0.85)"
            : "var(--hexadex-sub-color, #64748b)",
          letterSpacing: "0.04em",
          marginTop: 3,
          textShadow: mode === "dark" ? "0 1px 4px rgba(0,0,0,0.4)" : "none",
        }}>
          {tagline}
        </div>
      )}
    </div>
  );

  const containerStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: cfg.gap,
    cursor: onClick ? "pointer" : "inherit",
    userSelect: "none",
    ...style,
  };

  if (variant === "mark")     return <span style={containerStyle} className={className} onClick={onClick}>{MarkSVG}</span>;
  if (variant === "wordmark") return <span style={containerStyle} className={className} onClick={onClick}>{WordMark}</span>;
  if (variant === "stacked") {
    return (
      <div className={className} onClick={onClick} style={{
        ...containerStyle,
        flexDirection: "column",
        gap: cfg.gap * 0.6,
        alignItems: "center",
      }}>
        {MarkSVG}
        {WordMark}
      </div>
    );
  }

  return (
    <div className={className} onClick={onClick} style={containerStyle}>
      {MarkSVG}
      {WordMark}
      <style>{`
        :root {
          --hexadex-name-base: #1e293b;
          --hexadex-sub-color: #64748b;
        }
        [data-theme="dark"] {
          --hexadex-name-base: #f1f5f9;
          --hexadex-sub-color: #94a3b8;
        }
      `}</style>
    </div>
  );
}