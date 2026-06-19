import { useEffect, useRef, useState } from "react";

// Per-type ambiance video. Drop a clip into public/effects/<type>.mp4
// (a clip on a BLACK background blends best with mix-blend-mode: screen).
const ALL_TYPES = [
  "normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison",
  "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy",
];
const VIDEO_FX = Object.fromEntries(
  ALL_TYPES.map((t) => [t, import.meta.env.BASE_URL + `effects/${t}.mp4`])
);

// Seamless looping video: two layers staggered in time, crossfaded near the end
// so there's no hard cut when the clip restarts.
function VideoLoop({ src, fade = 0.7, onError }) {
  const aRef = useRef(null);
  const bRef = useRef(null);
  const refs = [aRef, bRef];
  const switching = useRef(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    switching.current = false;
    setActive(0);
    const [a, b] = [aRef.current, bRef.current];
    if (a) { a.currentTime = 0; a.play().catch(() => {}); }
    if (b) { b.pause(); b.currentTime = 0; }
  }, [src]);

  const handleTime = (idx) => () => {
    const v = refs[idx].current;
    if (!v || !v.duration || switching.current) return;
    if (v.currentTime >= v.duration - fade) {
      switching.current = true;
      const next = 1 - idx;
      const nv = refs[next].current;
      if (nv) { nv.currentTime = 0; nv.play().catch(() => {}); }
      setActive(next);
      setTimeout(() => { switching.current = false; }, fade * 1000);
    }
  };

  return (
    <div className="amb amb-video" aria-hidden>
      {[0, 1].map((i) => (
        <video
          key={i}
          ref={refs[i]}
          className="amb-video-layer"
          src={src}
          muted
          playsInline
          preload="auto"
          onTimeUpdate={handleTime(i)}
          onError={onError}
          style={{ opacity: active === i ? 1 : 0, transition: `opacity ${fade}s linear` }}
        />
      ))}
    </div>
  );
}

export default function TypeAmbiance({ type }) {
  // Track which types' clips failed to load (so one missing file doesn't break others).
  const [failed, setFailed] = useState({});
  const videoSrc = VIDEO_FX[type];
  if (!videoSrc || failed[type]) return null;

  // Economy mode: skip the video entirely — the static type-coloured stage remains.
  const lite = typeof document !== "undefined" && document.documentElement.classList.contains("perf-lite");
  if (lite) return null;

  return <VideoLoop key={type} src={videoSrc} onError={() => setFailed((f) => ({ ...f, [type]: true }))} />;
}
