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
      viewBox="0 0 100 100"
      width={cfg.mark}
      height={cfg.mark}
      style={{
        display: "block",
        flexShrink: 0,
        filter: "drop-shadow(0 3px 6px rgba(0, 0, 0, 0.28))",
        transition: "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
      className={animated ? `hexadex-mark-${id}` : undefined}
      aria-label="HexaDex logo"
      role="img"
    >
      <defs>
        <clipPath id={`ball-${id}`}><circle cx="50" cy="50" r="44" /></clipPath>
        <linearGradient id={`red-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#a81510" />
          <stop offset="100%" stopColor="#6e0402" />
        </linearGradient>
      </defs>

      {/* Pokéball body */}
      <g clipPath={`url(#ball-${id})`}>
        <rect x="0" y="0"  width="100" height="50" fill={`url(#red-${id})`} />
        <rect x="0" y="50" width="100" height="50" fill="#f6f7f9" />
        <rect x="0" y="45" width="100" height="10" fill="#202733" />
        {/* soft top-left sheen */}
        <ellipse cx="34" cy="28" rx="14" ry="8" fill="#fff" opacity="0.3"
          transform="rotate(-28 34 28)" />
      </g>

      {/* Outer outline */}
      <circle cx="50" cy="50" r="44" fill="none" stroke="#202733" strokeWidth="4" />

      {/* Centre button */}
      <circle cx="50" cy="50" r="14" fill="#202733" />
      <circle cx="50" cy="50" r="10" fill="#fff" />
      <circle cx="50" cy="50" r="5"  fill="#f6f7f9" stroke="#202733" strokeWidth="1.6"
        className={animated ? `hexadex-core-${id}` : undefined} />

      {animated && (
        <style>{`
          .hexadex-mark-${id}:hover { transform: rotate(360deg); }
          .hexadex-core-${id} { animation: hex-pulse-${id} 2.6s ease-in-out infinite; transform-origin: 50px 50px; }
          @keyframes hex-pulse-${id} {
            0%, 100% { opacity: 1; }
            50%      { opacity: 0.7; }
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
          background: "linear-gradient(180deg, #a81510 0%, #900603 100%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          WebkitTextFillColor: "transparent",
          color: "transparent",
          fontWeight: 900,
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