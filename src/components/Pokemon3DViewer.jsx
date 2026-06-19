import { useState, useEffect, useRef } from "react";
import { GLB_URL } from "../data.js";
import { useModelViewerScript } from "../utils.js";

export default function Pokemon3DViewer({ pokemonId, pokemonName, color, isShiny, lang, types }) {
  const containerRef  = useRef(null);
  const mvRef         = useRef(null);
  const animationsRef = useRef([]);
  const [status,      setStatus]      = useState("loading");
  const [animations,  setAnimations]  = useState([]);
  const [currentAnim, setCurrentAnim] = useState(null);

  useModelViewerScript();

  const glbUrl = isShiny ? GLB_URL.shiny(pokemonId) : GLB_URL.regular(pokemonId);

  const loadingLabel = lang==="th" ? "กำลังโหลดโมเดล 3D…"
                     : lang==="ja" ? "3Dモデルを読み込み中…" : "Loading 3D model…";
  const errorLabel   = lang==="th" ? "ไม่มีโมเดล 3D สำหรับตัวนี้"
                     : lang==="ja" ? "3Dモデルが見つかりません" : "3D model not available";
  const arLabel      = lang==="th" ? "ดูใน AR" : lang==="ja" ? "ARで見る" : "View in AR";
  const posesLabel   = lang==="th" ? "ท่า" : lang==="ja" ? "ポーズ" : "poses";

  useEffect(() => { animationsRef.current = animations; }, [animations]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    setStatus("loading");
    setAnimations([]);
    setCurrentAnim(null);
    container.innerHTML = "";

    const mv = document.createElement("model-viewer");
    mvRef.current = mv;

    mv.setAttribute("src",                 glbUrl);
    mv.setAttribute("alt",                 pokemonName);
    mv.setAttribute("camera-controls",     "");
    mv.setAttribute("autoplay",            "");
    mv.setAttribute("animation-crossfade-duration", "250");
    mv.setAttribute("environment-image",   "legacy");
    mv.setAttribute("tone-mapping",        "neutral");
    mv.setAttribute("exposure",            "1.4");
    mv.setAttribute("shadow-intensity",    "0.7");
    mv.setAttribute("shadow-softness",     "0.9");
    mv.setAttribute("bounds",              "tight");
    mv.setAttribute("interaction-prompt",  "none");
    mv.setAttribute("disable-tap",         "");
    mv.setAttribute("field-of-view",       "30deg");
    mv.setAttribute("ar",                  "");
    mv.setAttribute("ar-modes",            "webxr scene-viewer quick-look");
    mv.setAttribute("ar-button-label",     arLabel);
    mv.setAttribute("loading",             "eager");

    mv.style.cssText = [
      "width:100%",
      "height:320px",
      "background:transparent",
      "cursor:pointer",
      `--progress-bar-color:${color}`,
      "--progress-bar-height:3px",
      "--poster-color:transparent",
      "--max-pixel-ratio:1.75",
    ].join(";");

    mv.addEventListener("load", () => {
      setStatus("loaded");
      const anims = mv.availableAnimations || [];
      setAnimations(anims);
      animationsRef.current = anims;
      if (anims.length > 0) {
        // 🎬 Prefer idle/breathing animation over first animation
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
        setCurrentAnim(idleAnim);
      }
    });
    mv.addEventListener("error", () => setStatus("error"));

    // Click to cycle animations
    mv.addEventListener("click", () => {
      const anims = animationsRef.current;
      if (!anims || anims.length < 2) return;
      const cur  = mv.animationName || anims[0];
      const idx  = anims.indexOf(cur);
      const next = anims[(idx + 1) % anims.length];
      try {
        mv.animationName = next;
        mv.play();
        setCurrentAnim(next);
      } catch {}
    });

    container.appendChild(mv);
    return () => { container.innerHTML = ""; mvRef.current = null; };
  }, [glbUrl, pokemonName, color, arLabel]);

  const formatAnimName = (n) =>
    n.replace(/^[a-z_-]*\|/i, "")
     .replace(/[_-]+/g, " ")
     .replace(/\b\w/g, (c) => c.toUpperCase())
     .trim() || n;

  return (
    <div className="viewer-3d-wrap" style={{ position: "relative" }}>
      {status === "loading" && (
        <div className="viewer-3d-overlay">
          <div className="pokeball-spin" />
          <span className="viewer-3d-msg">{loadingLabel}</span>
        </div>
      )}
      {status === "error" && (
        <div className="viewer-3d-overlay">
          <span style={{ fontSize:44 }}>😶</span>
          <span className="viewer-3d-msg">{errorLabel}</span>
        </div>
      )}

      <div
        ref={containerRef}
        style={{ opacity: status === "loaded" ? 1 : 0, transition:"opacity .5s",
                 position:"relative", zIndex:2 }}
      />

      {status === "loaded" && currentAnim && animations.length > 0 && (
        <div className="anim-indicator">
          <span className="anim-playing-dot" />
          <span className="anim-indicator-name">{formatAnimName(currentAnim)}</span>
          {animations.length > 1 && (
            <span className="anim-indicator-count">
              {animations.length} {posesLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}