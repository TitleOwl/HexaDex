// Painted backdrop, five scenes keyed off the primary type (§3).
//
// Drawn with gradients and SVG rather than image assets: it keeps the bundle
// flat, scales to any viewport, and lets each scene be recoloured by editing
// one palette. Three depth bands are mandatory (§3.1) — far (hazy horizon),
// mid (solid tree/building masses), near (ground plus props hugging the left
// and right edges) — and the centre band stays empty because it is both the
// Pokémon's stage and the ball's flight path.

const SCENES = {
  grassland: {
    sky:   ["#8FD8F2", "#C9EEF5"],
    haze:  "#BFE6D6",
    mid:   "#5FB86E",
    midDk: "#3F9A57",
    ground:["#7ACB72", "#5AAE5C"],
    prop:  "#3F8F4E",
  },
  shore: {
    sky:   ["#7FD1F5", "#D6F1FB"],
    haze:  "#A8DCEF",
    mid:   "#4FA8D8",
    midDk: "#3B87BC",
    ground:["#F2E2B8", "#DFC894"],
    prop:  "#C9AE7A",
  },
  desert: {
    sky:   ["#F7C98B", "#FBE6C4"],
    haze:  "#EFD3A8",
    mid:   "#C98B5C",
    midDk: "#A96C46",
    ground:["#E8B87E", "#D19A60"],
    prop:  "#A9743F",
  },
  city: {
    sky:   ["#2C3A66", "#4C5B94"],
    haze:  "#3E4E80",
    mid:   "#26304F",
    midDk: "#1A2138",
    ground:["#3A4260", "#2A3049"],
    prop:  "#F0B429",
    lit:   true,
  },
  night: {
    sky:   ["#221B3A", "#3B2F5E"],
    haze:  "#4A3A70",
    mid:   "#2A2145",
    midDk: "#1B1530",
    ground:["#33284F", "#241C3A"],
    prop:  "#7E6BB0",
    fog:   true,
  },
};

export default function CatchScene({ scene = "grassland" }) {
  const p = SCENES[scene] ?? SCENES.grassland;

  return (
    <div className="cx-scene" aria-hidden>
      {/* FAR — sky wash plus a hazy horizon band. Atmospheric perspective is
          what stops the mid layer reading as a flat sticker. */}
      <div
        className="cx-scene-sky"
        style={{ background: `linear-gradient(180deg, ${p.sky[0]} 0%, ${p.sky[1]} 100%)` }}
      />
      <div className="cx-scene-haze" style={{ background: `linear-gradient(180deg, transparent, ${p.haze})` }} />

      {/* MID — solid silhouettes, no leaf detail, and a deliberate gap across
          the middle so nothing sits behind the Pokémon. */}
      <svg className="cx-scene-mid" viewBox="0 0 100 30" preserveAspectRatio="none">
        {scene === "city" ? (
          <>
            <rect x="0"  y="8"  width="9"  height="22" fill={p.midDk} />
            <rect x="10" y="3"  width="8"  height="27" fill={p.mid} />
            <rect x="19" y="12" width="10" height="18" fill={p.midDk} />
            <rect x="71" y="10" width="9"  height="20" fill={p.midDk} />
            <rect x="81" y="4"  width="8"  height="26" fill={p.mid} />
            <rect x="90" y="14" width="10" height="16" fill={p.midDk} />
          </>
        ) : scene === "desert" ? (
          <>
            <path d="M0 30 L8 12 L18 30 Z"    fill={p.mid} />
            <path d="M14 30 L24 18 L32 30 Z"  fill={p.midDk} />
            <path d="M68 30 L78 16 L88 30 Z"  fill={p.midDk} />
            <path d="M84 30 L94 10 L100 30 Z" fill={p.mid} />
          </>
        ) : (
          <>
            <ellipse cx="8"  cy="24" rx="11" ry="12" fill={p.mid} />
            <ellipse cx="22" cy="26" rx="9"  ry="9"  fill={p.midDk} />
            <ellipse cx="32" cy="28" rx="7"  ry="6"  fill={p.mid} />
            <ellipse cx="68" cy="28" rx="7"  ry="6"  fill={p.mid} />
            <ellipse cx="79" cy="26" rx="9"  ry="9"  fill={p.midDk} />
            <ellipse cx="93" cy="24" rx="11" ry="12" fill={p.mid} />
          </>
        )}
      </svg>

      {/* NEAR — ground plane plus props kept to the outer thirds. */}
      <div
        className="cx-scene-ground"
        style={{ background: `linear-gradient(180deg, ${p.ground[0]}, ${p.ground[1]})` }}
      />
      <svg className="cx-scene-near" viewBox="0 0 100 14" preserveAspectRatio="none">
        <ellipse cx="6"  cy="12" rx="7" ry="3"   fill={p.prop} opacity="0.55" />
        <ellipse cx="16" cy="13" rx="4" ry="2"   fill={p.prop} opacity="0.4" />
        <ellipse cx="84" cy="13" rx="4" ry="2"   fill={p.prop} opacity="0.4" />
        <ellipse cx="94" cy="12" rx="7" ry="3"   fill={p.prop} opacity="0.55" />
        {!p.lit && (
          <>
            <circle cx="11" cy="8"  r="1.1" fill={p.prop} opacity="0.7" />
            <circle cx="89" cy="9"  r="1.1" fill={p.prop} opacity="0.7" />
          </>
        )}
      </svg>

      {/* City street lamps and night fog: cheap touches that sell the mood. */}
      {p.lit && <div className="cx-scene-lights" style={{ "--lamp": p.prop }} />}
      {p.fog && <div className="cx-scene-fog" />}
    </div>
  );
}
