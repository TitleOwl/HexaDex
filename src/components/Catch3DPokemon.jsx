import { useState, useEffect, useRef } from "react";
import { GLB_URL } from "../data.js";
import { getArt, useModelViewerScript } from "../utils.js";

/**
 * Catch3DPokemon — renders a 3D rotating Pokemon model for CatchAnimation.
 *
 * Key design choices:
 *  • Auto-rotates slowly for "alive" feeling
 *  • No camera-controls, disabled tap/pan/zoom — the user is dragging
 *    a ball on top of this; we don't want 3D controls hijacking it
 *  • `pointer-events: none` on the model-viewer itself so pointer
 *    events pass through to the arena drag handlers
 *  • Falls back to 2D official artwork if the GLB fails to load
 *  • Inherits the same `.catch-pokemon-inline phase-{phase}` classes
 *    that the existing CSS uses for catch animations (idle bob,
 *    throwing fade, hit shake, suckIn vanish, escape pop)
 *
 * Usage in CatchAnimation.jsx:
 *   <Catch3DPokemon pokemon={pokemon} pokemonName={pokemonName}
 *                   phase={phase} isShiny={false} />
 */
export default function Catch3DPokemon({
  pokemon,
  pokemonName,
  phase = "idle",
  isShiny = false,
  sizeScale = 1,    // scales the model by the Pokémon's real size
  variant = "main", // "main" = catch arena, "escape" = escape phase
}) {
  const containerRef = useRef(null);
  const [status, setStatus] = useState("loading"); // loading | loaded | error

  useModelViewerScript();

  const glbUrl = isShiny
    ? GLB_URL.shiny(pokemon.id)
    : GLB_URL.regular(pokemon.id);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    setStatus("loading");
    container.innerHTML = "";

    const mv = document.createElement("model-viewer");

    mv.setAttribute("src",                  glbUrl);
    mv.setAttribute("alt",                  pokemonName);
    mv.setAttribute("autoplay",             "");
    mv.setAttribute("animation-crossfade-duration", "250");
    mv.setAttribute("environment-image",    "neutral");
    mv.setAttribute("tone-mapping",         "aces");
    mv.setAttribute("exposure",             "1.35");
    mv.setAttribute("shadow-intensity",     "0.7");
    mv.setAttribute("shadow-softness",      "0.8");
    mv.setAttribute("bounds",               "tight");
    mv.setAttribute("field-of-view",        "30deg");
    // CRITICAL: lock down all camera/touch interactions so the user's
    // drag goes to the arena ball handler, not the 3D viewer
    mv.setAttribute("interaction-prompt",   "none");
    mv.setAttribute("disable-tap",          "");
    mv.setAttribute("disable-pan",          "");
    mv.setAttribute("disable-zoom",         "");
    // Pokemon stays still — no auto-rotate
    mv.setAttribute("loading",              "eager");

    mv.style.cssText = [
      "width:100%",
      "height:100%",
      "background:transparent",
      "--poster-color:transparent",
      "--progress-bar-color:transparent",
      "--max-pixel-ratio:1.5",
      // critical: don't intercept pointer events
      "pointer-events:none",
      // ensure smooth render
      "will-change:transform",
    ].join(";");

    mv.addEventListener("load", () => {
      setStatus("loaded");
      // 🎬 Find best idle animation
      // Priority: idle > breathing > stand > rest > default → first animation
      const anims = mv.availableAnimations || [];
      if (anims.length > 0) {
        const idleAnim =
          anims.find(a => /idle/i.test(a)) ||
          anims.find(a => /breath/i.test(a)) ||
          anims.find(a => /stand/i.test(a)) ||
          anims.find(a => /rest/i.test(a)) ||
          anims.find(a => /default/i.test(a)) ||
          anims[0];
        try {
          mv.animationName = idleAnim;
          mv.play();
        } catch {}
      }
    });
    mv.addEventListener("error", () => setStatus("error"));

    container.appendChild(mv);
    return () => {
      container.innerHTML = "";
    };
  }, [glbUrl, pokemonName]);

  // Wrapper class — keeps existing CSS animations for phases working
  const wrapperClass =
    variant === "escape"
      ? "catch-pokemon-escape-inline catch-3d-wrap"
      : `catch-pokemon-inline catch-3d-wrap phase-${phase}`;

  // 2D fallback art — use the shiny artwork when showing a shiny encounter
  const fallbackArt = isShiny
    ? (pokemon?.sprites?.other?.["official-artwork"]?.front_shiny
        ?? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/${pokemon.id}.png`)
    : getArt(pokemon);

  return (
    <div className={wrapperClass}>
      {/* Size layer — scales by the Pokémon's real size, grounded at the feet */}
      <div className="catch-3d-scale" style={{ transform: `scale(${sizeScale})`, transformOrigin: "center bottom" }}>
        {/* Loading state: show ghost/silhouette while GLB loads */}
        {status === "loading" && (
          <img
            src={fallbackArt}
            alt={pokemonName}
            className="catch-3d-fallback catch-3d-loading"
            draggable={false}
            onError={(e) => { if (isShiny) e.currentTarget.src = getArt(pokemon); }}
          />
        )}

        {/* Error: fall back to 2D official artwork permanently */}
        {status === "error" && (
          <img
            src={fallbackArt}
            alt={pokemonName}
            className="catch-3d-fallback"
            draggable={false}
            onError={(e) => { if (isShiny) e.currentTarget.src = getArt(pokemon); }}
          />
        )}

        {/* 3D model container */}
        <div
          ref={containerRef}
          className="catch-3d-container"
          style={{
            width: "100%",
            height: "100%",
            opacity: status === "loaded" ? 1 : 0,
            transition: "opacity 0.4s ease",
          }}
        />
      </div>
    </div>
  );
}