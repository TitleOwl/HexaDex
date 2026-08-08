import { useState, useEffect, useRef } from "react";
import { GLB_URL } from "../data.js";
import { useModelViewerScript } from "../utils.js";

export default function Pokemon3DViewer({ pokemonId, pokemonName, color, isShiny, lang, onTap }) {
  const containerRef  = useRef(null);
  const mvRef         = useRef(null);
  const animationsRef = useRef([]);
  const startedRef    = useRef(false);
  // Kept in a ref so a new callback identity never remounts the model.
  const onTapRef      = useRef(onTap);
  useEffect(() => { onTapRef.current = onTap; }, [onTap]);
  const [status,      setStatus]      = useState("loading");
  const [animations,  setAnimations]  = useState([]);

  useModelViewerScript();

  const glbUrl = isShiny ? GLB_URL.shiny(pokemonId) : GLB_URL.regular(pokemonId);

  const loadingLabel = lang==="th" ? "กำลังโหลดโมเดล 3D…"
                     : lang==="ja" ? "3Dモデルを読み込み中…" : "Loading 3D model…";
  const errorLabel   = lang==="th" ? "ไม่มีโมเดล 3D สำหรับตัวนี้"
                     : lang==="ja" ? "3Dモデルが見つかりません" : "3D model not available";
  const arLabel      = lang==="th" ? "ดูใน AR" : lang==="ja" ? "ARで見る" : "View in AR";

  useEffect(() => { animationsRef.current = animations; }, [animations]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    setStatus("loading");
    setAnimations([]);
    startedRef.current = false;
    container.innerHTML = "";

    const mv = document.createElement("model-viewer");
    mvRef.current = mv;

    mv.setAttribute("src",                 glbUrl);
    mv.setAttribute("alt",                 pokemonName);
    mv.setAttribute("camera-controls",     "");
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
          // Show the pose's first frame, then hold it: no motion until tapped.
          mv.play();
          mv.pause();
        } catch {}
      }
    });
    mv.addEventListener("error", () => setStatus("error"));
    // Stopping after exactly one pass can't rely on play({repetitions:1}):
    // assigning animationName restarts playback with the default (infinite)
    // repetition count, so tapping through poses left it looping. Instead the
    // pass is timed off the clip's own duration, with "finished" as a backup
    // for whenever repetitions does hold.
    let stopTimer = null;
    const stopSoon = () => {
      if (stopTimer) clearTimeout(stopTimer);
      requestAnimationFrame(() => {
        const dur = Number(mv.duration);
        if (!dur || !isFinite(dur) || dur <= 0) return;
        stopTimer = setTimeout(() => { try { mv.pause(); } catch {} }, dur * 1000 + 60);
      });
    };
    const playOnce = () => {
      try {
        mv.currentTime = 0;
        mv.play({ repetitions: 1 });
      } catch {
        try { mv.play(); } catch {}
      }
      stopSoon();
    };
    mv.addEventListener("finished", () => { try { mv.pause(); } catch {} });

    // A rotate-drag also fires "click" on model-viewer, so taps are detected
    // from pointer travel instead: press and release within a few pixels.
    let downX = 0, downY = 0, downAt = 0, isDown = false, dragged = false;
    const TAP_SLOP_PX = 6;
    const TAP_MAX_MS  = 600;

    mv.addEventListener("pointerdown", (e) => {
      isDown = true; dragged = false;
      downX = e.clientX; downY = e.clientY; downAt = Date.now();
    });
    mv.addEventListener("pointermove", (e) => {
      if (!isDown) return;
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > TAP_SLOP_PX) dragged = true;
    });
    mv.addEventListener("pointercancel", () => { isDown = false; });
    mv.addEventListener("pointerup", (e) => {
      if (!isDown) return;
      isDown = false;
      if (dragged) return;
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > TAP_SLOP_PX) return;
      if (Date.now() - downAt > TAP_MAX_MS) return;

      const anims = animationsRef.current ?? [];
      if (anims.length > 0) {
        if (!startedRef.current) {
          // first tap plays the idle pose once; later taps step to the next
          startedRef.current = true;
        } else if (anims.length > 1) {
          const cur = mv.animationName || anims[0];
          const idx = anims.indexOf(cur);
          try { mv.animationName = anims[(idx + 1) % anims.length]; } catch {}
        }
        playOnce();
      }
      onTapRef.current?.();
    });

    container.appendChild(mv);
    return () => {
      if (stopTimer) clearTimeout(stopTimer);
      container.innerHTML = "";
      mvRef.current = null;
    };
  }, [glbUrl, pokemonName, color, arLabel]);


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

      {/* The pose-name indicator was removed — the raw animation names come
          straight from the GLB files and read as debug output. */}
    </div>
  );
}