import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useModalLifecycle } from "../perfUtils.js";
import { catchSounds } from "../catchSounds.js";

// ─── Art ────────────────────────────────────────────────────
const artUrl = id =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
const ITEM_BASE = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items";

// ─── Pokéballs ───────────────────────────────────────────────
const POKEBALLS = [
  { id:"poke-ball",    name:"Poké Ball",    rate: 1.0,  glow:"#ee1515" },
  { id:"great-ball",   name:"Great Ball",   rate: 1.5,  glow:"#3b82f6" },
  { id:"ultra-ball",   name:"Ultra Ball",   rate: 2.0,  glow:"#facc15" },
  { id:"master-ball",  name:"Master Ball",  rate: 255,  glow:"#a855f7" },
  { id:"fast-ball",    name:"Fast Ball",    rate: 4.0,  glow:"#facc15" },
  { id:"level-ball",   name:"Level Ball",   rate: 4.0,  glow:"#ee1515" },
  { id:"lure-ball",    name:"Lure Ball",    rate: 4.0,  glow:"#06b6d4" },
  { id:"heavy-ball",   name:"Heavy Ball",   rate: 3.0,  glow:"#94a3b8" },
  { id:"love-ball",    name:"Love Ball",    rate: 8.0,  glow:"#f472b6" },
  { id:"net-ball",     name:"Net Ball",     rate: 3.5,  glow:"#06b6d4" },
  { id:"nest-ball",    name:"Nest Ball",    rate: 4.0,  glow:"#84cc16" },
  { id:"dusk-ball",    name:"Dusk Ball",    rate: 3.5,  glow:"#a855f7" },
  { id:"quick-ball",   name:"Quick Ball",   rate: 5.0,  glow:"#facc15" },
  { id:"heal-ball",    name:"Heal Ball",    rate: 1.0,  glow:"#ec4899" },
  { id:"luxury-ball",  name:"Luxury Ball",  rate: 1.0,  glow:"#facc15" },
  { id:"premier-ball", name:"Premier Ball", rate: 1.0,  glow:"#dc2626" },
  { id:"beast-ball",   name:"Beast Ball",   rate: 5.0,  glow:"#06b6d4" },
];

// ─── Catch rate formula ──────────────────────────────────────
function getCaptureRate(pokemon) {
  const bst = pokemon.stats.reduce((sum, s) => sum + s.base_stat, 0);
  const hp = pokemon.stats.find(s => s.stat.name === "hp")?.base_stat ?? 50;
  let rate;
  if (bst >= 670) rate = 3;
  else if (bst >= 600) rate = 25;
  else if (bst >= 540) rate = 45;
  else if (bst >= 480) rate = 75;
  else if (bst >= 400) rate = 120;
  else if (bst >= 320) rate = 180;
  else rate = 235;
  const hpMod = Math.max(0.6, 1.2 - hp / 200);
  return Math.max(3, Math.min(255, Math.round(rate * hpMod)));
}

function calculateCatchChance(pokemon, ballId, throwBonus = 1.0) {
  const ball = POKEBALLS.find(b => b.id === ballId) ?? POKEBALLS[0];
  if (ball.rate >= 255) return 1.0;
  const captureRate = getCaptureRate(pokemon);
  const a = captureRate * ball.rate * (7 / 9) * throwBonus;
  if (a >= 255) return 1.0;
  const shakeRaw = 65536 / Math.pow(255 / a, 0.1875);
  const perShake = Math.min(65535, shakeRaw) / 65536;
  return Math.min(0.999, Math.max(0.005, Math.pow(perShake, 4)));
}

function detectCurveBall(path) {
  if (path.length < 5) return { curvature: 0, direction: null };
  const dx = path[path.length - 1].x - path[0].x;
  const dy = path[path.length - 1].y - path[0].y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 30) return { curvature: 0, direction: null };
  const hFrac = Math.abs(dx) / dist;
  if (hFrac < 0.10) return { curvature: 0, direction: null };
  return {
    direction: dx > 0 ? "right" : "left",
    curvature: Math.min(1.0, Math.max(0, (hFrac - 0.10) / 0.30)),
  };
}

// ─── Pokéball image ──────────────────────────────────────────
function PokeballImg({ ballId, size = 60, glow = false, animate = false }) {
  const [failed, setFailed] = useState(false);
  const ball = POKEBALLS.find(b => b.id === ballId) ?? POKEBALLS[0];
  if (failed) {
    return (
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: `radial-gradient(circle at 35% 35%, ${ball.glow}bb, ${ball.glow})`,
        border: `2px solid ${ball.glow}`,
        boxShadow: glow ? `0 0 14px ${ball.glow}` : "none",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.38, color: "white", fontWeight: 900,
      }}>⊕</div>
    );
  }
  return (
    <img src={`${ITEM_BASE}/${ballId}.png`} alt={ball.name}
      width={size} height={size} draggable={false}
      style={{
        imageRendering: "pixelated", objectFit: "contain",
        filter: glow ? `drop-shadow(0 0 8px ${ball.glow})` : undefined,
        animation: animate ? "ar-ball-spin 0.6s linear infinite" : undefined,
      }}
      onError={() => setFailed(true)}
    />
  );
}

// ─── Ball picker ─────────────────────────────────────────────
function BallPicker({ selectedId, onSelect, onClose, lang }) {
  const [previewId, setPreviewId] = useState(selectedId);
  const previewBall = POKEBALLS.find(b => b.id === previewId) ?? POKEBALLS[0];
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.7)", display: "flex",
      alignItems: "flex-end", justifyContent: "center",
    }} onClick={onClose}>
      <div style={{
        background: "#0f172a", borderRadius: "24px 24px 0 0",
        padding: "20px", width: "100%", maxWidth: 480,
        border: "1px solid rgba(56,189,248,0.25)",
        maxHeight: "70vh", overflowY: "auto",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <PokeballImg ballId={previewId} size={52} glow />
          <div>
            <div style={{ color: "#f1f5f9", fontWeight: 900, fontSize: 16 }}>{previewBall.name}</div>
            <div style={{ color: previewBall.glow, fontSize: 13, fontWeight: 700 }}>
              ×{previewBall.rate} {lang === "th" ? "อัตราจับ" : "catch rate"}
            </div>
          </div>
          <button onClick={onClose} style={{
            marginLeft: "auto", width: 32, height: 32, borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.08)",
            color: "white", cursor: "pointer", fontSize: 14,
          }}>✕</button>
        </div>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8,
        }}>
          {POKEBALLS.map(b => (
            <button key={b.id} onClick={() => { setPreviewId(b.id); onSelect(b.id); onClose(); }}
              style={{
                background: previewId === b.id ? "rgba(56,189,248,0.18)" : "rgba(255,255,255,0.05)",
                border: previewId === b.id ? "1.5px solid rgba(56,189,248,0.5)" : "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12, padding: "10px 4px", cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              }}>
              <PokeballImg ballId={b.id} size={36} />
              <span style={{ color: "#cbd5e1", fontSize: 9, fontWeight: 600, textAlign: "center", lineHeight: 1.2 }}>
                {b.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Wobble balls in center ──────────────────────────────────
function WobbleEffect({ ballId, wobbleCount }) {
  const ball = POKEBALLS.find(b => b.id === ballId) ?? POKEBALLS[0];
  return (
    <div style={{
      position: "absolute", top: "48%", left: "50%",
      transform: "translate(-50%, -50%)",
      zIndex: 8, display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
    }}>
      <div style={{
        animation: "ar-wobble 0.7s ease-in-out",
        filter: `drop-shadow(0 0 18px ${ball.glow})`,
      }}>
        <PokeballImg ballId={ballId} size={100} glow />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 10, height: 10, borderRadius: "50%",
            background: i < wobbleCount ? ball.glow : "rgba(255,255,255,0.25)",
            boxShadow: i < wobbleCount ? `0 0 8px ${ball.glow}` : "none",
            transition: "all 0.3s",
          }} />
        ))}
      </div>
    </div>
  );
}

// ─── Suck-in red beams ───────────────────────────────────────
function SuckInEffect() {
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 6, pointerEvents: "none",
      animation: "ar-suckin 0.7s ease-out forwards",
    }}>
      {[0, 60, 120, 180, 240, 300].map(angle => (
        <div key={angle} style={{
          position: "absolute", top: "50%", left: "50%",
          width: "50vw", height: 3,
          background: "linear-gradient(90deg, transparent, rgba(239,68,68,0.9))",
          transformOrigin: "left center",
          transform: `rotate(${angle}deg)`,
          opacity: 0.75,
        }} />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN — AR Catch Experience
// ═══════════════════════════════════════════════════════════
export default function ARViewer({ pokemon, lang, onClose }) {
  useModalLifecycle(onClose);
  const t = (th, en) => lang === "th" ? th : en;

  // ─── Camera ─────────────────────────────────────────────
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraErr, setCameraErr] = useState("");

  const startCamera = useCallback(async () => {
    setCameraErr("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
    } catch {
      setCameraErr(t("ไม่สามารถเปิดกล้องได้", "Camera not available"));
    }
  }, [t]);

  useEffect(() => () => { streamRef.current?.getTracks().forEach(tr => tr.stop()); }, []);

  // ─── Gyro tilt ──────────────────────────────────────────
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  useEffect(() => {
    if (!cameraOn) return;
    const handler = (e) => {
      setTilt({
        x: Math.max(-25, Math.min(25, (e.beta ?? 0) / 4)),
        y: Math.max(-25, Math.min(25, (e.gamma ?? 0) / 4)),
      });
    };
    window.addEventListener("deviceorientation", handler, { passive: true });
    return () => window.removeEventListener("deviceorientation", handler);
  }, [cameraOn]);

  // ─── Catch state ─────────────────────────────────────────
  const arenaRef = useRef(null);
  const rafRef = useRef(null);
  const timerRef = useRef([]);
  const pendingPtRef = useRef(null);

  const [phase, setPhase] = useState("idle");
  const [ballId, setBallId] = useState("poke-ball");
  const [showBallPicker, setShowBallPicker] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dragPath, setDragPath] = useState([]);
  const [ballPos, setBallPos] = useState({ x: 0, y: 0 });
  const [ringRadius, setRingRadius] = useState(220);
  const [throwQuality, setThrowQuality] = useState(null);
  const [wobbleCount, setWobbleCount] = useState(0);
  const [resultMsg, setResultMsg] = useState(null);
  const [isCurveBall, setIsCurveBall] = useState(false);
  const [curveDir, setCurveDir] = useState("right");
  const [curveStr, setCurveStr] = useState(0.8);
  const [caughtCount, setCaughtCount] = useState(() => {
    try { return parseInt(localStorage.getItem("pkdx_caught_count") ?? "0"); } catch { return 0; }
  });

  const ball = POKEBALLS.find(b => b.id === ballId) ?? POKEBALLS[0];
  const catchChance = useMemo(() => calculateCatchChance(pokemon, ballId, 1.0), [pokemon, ballId]);
  const pokemonName = useMemo(() =>
    pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1), [pokemon.name]);

  const addTimer = (id) => { timerRef.current.push(id); };
  const clearAll = useCallback(() => {
    timerRef.current.forEach(clearTimeout);
    timerRef.current = [];
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  }, []);
  useEffect(() => () => { clearAll(); catchSounds.stopAll(); }, [clearAll]);

  // Pulsing capture ring
  useEffect(() => {
    if (phase !== "idle" || !cameraOn) return;
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const el = (now - start) / 1000;
      const v = (Math.sin((el / 3.0) * Math.PI * 2) + 1) / 2;
      setRingRadius(100 + v * 180);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, cameraOn]);

  const ringZone = useMemo(() => {
    if (ringRadius < 130) return { color: "#22c55e", label: "EXCELLENT", quality: "excellent" };
    if (ringRadius < 180) return { color: "#3b82f6", label: "GREAT", quality: "great" };
    if (ringRadius < 230) return { color: "#fbbf24", label: "NICE", quality: "nice" };
    return { color: "#94a3b8", label: "", quality: null };
  }, [ringRadius]);

  // ─── Drag ────────────────────────────────────────────────
  const onDragStart = (e) => {
    if (phase !== "idle") return;
    const rect = arenaRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = e.touches?.[0]?.clientX ?? e.clientX;
    const cy = e.touches?.[0]?.clientY ?? e.clientY;
    const x = cx - rect.left, y = cy - rect.top;
    setDragging(true);
    setDragPath([{ x, y, t: Date.now() }]);
    setBallPos({ x, y });
  };

  const onDragMove = (e) => {
    if (!dragging || phase !== "idle") return;
    const rect = arenaRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = e.touches?.[0]?.clientX ?? e.clientX;
    const cy = e.touches?.[0]?.clientY ?? e.clientY;
    pendingPtRef.current = { x: cx - rect.left, y: cy - rect.top, t: Date.now() };
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const pt = pendingPtRef.current;
      if (!pt) return;
      setDragPath(prev => {
        const updated = [...prev, pt];
        return updated.length > 20 ? updated.slice(-20) : updated;
      });
      setBallPos({ x: pt.x, y: pt.y });
    });
  };

  const onDragEnd = () => {
    if (!dragging || phase !== "idle") return;
    setDragging(false);
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (dragPath.length < 3) { setDragPath([]); return; }
    const first = dragPath[0], last = dragPath[dragPath.length - 1];
    const dx = last.x - first.x, dy = first.y - last.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const arenaH = arenaRef.current?.getBoundingClientRect().height ?? 540;
    const power = Math.min(1.0, dist / (arenaH * 0.5));
    const upward = Math.max(0, dy) / Math.max(1, dist);
    if (power < 0.2 || upward < 0.3) { setDragPath([]); return; }

    let throwBonus = 1.0;
    const q = ringZone.quality;
    if (!q) { setDragPath([]); return; }
    if (q === "excellent") throwBonus = 2.0;
    else if (q === "great") throwBonus = 1.5;
    else if (q === "nice") throwBonus = 1.15;

    const { curvature, direction } = detectCurveBall(dragPath);
    const curve = curvature > 0.3;
    setIsCurveBall(curve);
    setCurveStr(Math.max(0.15, curvature));
    if (curve) { throwBonus *= 1.7; setCurveDir(direction ?? "right"); }
    setThrowQuality(q);
    executeThrow(throwBonus);
    setDragPath([]);
  };

  const executeThrow = useCallback((throwBonus) => {
    setPhase("throwing");
    catchSounds.playThrow();
    addTimer(setTimeout(() => {
      setPhase("hit");
      catchSounds.playHit();
      addTimer(setTimeout(() => {
        setPhase("suckIn");
        catchSounds.playSuckIn();
        addTimer(setTimeout(() => {
          const finalChance = calculateCatchChance(pokemon, ballId, throwBonus);
          const willCatch = Math.random() < finalChance;
          const wobbles = willCatch ? 3 : Math.floor(Math.random() * 3) + 1;
          startWobble(0, wobbles, willCatch);
        }, 700));
      }, 200));
    }, 800));
  }, [pokemon, ballId]);

  const startWobble = useCallback((count, target, willCatch) => {
    setPhase("wobble");
    setWobbleCount(count);
    if (count > 0) catchSounds.playWobble();
    if (count >= target) {
      if (willCatch) {
        setPhase("success");
        catchSounds.playBallLock();
        setTimeout(() => catchSounds.playGotcha(), 850);
        setResultMsg("gotcha");
        setCaughtCount(c => {
          const n = c + 1;
          try { localStorage.setItem("pkdx_caught_count", String(n)); } catch {}
          return n;
        });
        addTimer(setTimeout(() => {
          setPhase("idle"); setThrowQuality(null);
          setWobbleCount(0); setResultMsg(null); setDragPath([]);
        }, 4200));
      } else {
        setPhase("escape");
        catchSounds.playCatchFail();
        setTimeout(() => catchSounds.playPokemonCry(pokemon), 220);
        setResultMsg("escape");
        addTimer(setTimeout(() => {
          setPhase("idle"); setThrowQuality(null);
          setWobbleCount(0); setResultMsg(null); setDragPath([]);
        }, 2800));
      }
      return;
    }
    addTimer(setTimeout(() => startWobble(count + 1, target, willCatch), 700));
  }, [lang, pokemon]);

  const qualityText = (q) => {
    if (lang === "th") return q === "excellent" ? "ยอดเยี่ยม!" : q === "great" ? "เยี่ยม!" : "ดี!";
    return q === "excellent" ? "Excellent!" : q === "great" ? "Great!" : "Nice!";
  };

  // dynamic curve keyframes
  const s = curveStr;
  const curveCss = `
    @keyframes ar-curve-left {
      0%   { bottom:80px; left:50%; transform:translateX(-50%) scale(1) rotate(0); }
      20%  { bottom:24%;  left:${(50 - s*34).toFixed(1)}%; transform:translateX(-50%) scale(0.85) rotate(-${(s*180).toFixed(0)}deg); }
      45%  { bottom:42%;  left:${(50 - s*28).toFixed(1)}%; transform:translateX(-50%) scale(0.72) rotate(-${(s*360).toFixed(0)}deg); }
      100% { bottom:45%;  left:50%; transform:translateX(-50%) scale(0.65) rotate(-${(s*560).toFixed(0)}deg); }
    }
    @keyframes ar-curve-right {
      0%   { bottom:80px; left:50%; transform:translateX(-50%) scale(1) rotate(0); }
      20%  { bottom:24%;  left:${(50 + s*34).toFixed(1)}%; transform:translateX(-50%) scale(0.85) rotate(${(s*180).toFixed(0)}deg); }
      45%  { bottom:42%;  left:${(50 + s*28).toFixed(1)}%; transform:translateX(-50%) scale(0.72) rotate(${(s*360).toFixed(0)}deg); }
      100% { bottom:45%;  left:50%; transform:translateX(-50%) scale(0.65) rotate(${(s*560).toFixed(0)}deg); }
    }
  `;

  const CORNERS = ["tl","tr","bl","br"];

  // ─── Pre-camera screen ───────────────────────────────────
  if (!cameraOn && !cameraErr) {
    return (
      <div style={S.overlay}>
        <style>{GLOBAL_CSS}</style>
        <div style={S.preCam}>
          <div style={{ fontSize: 72, marginBottom: 12 }}>📷</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#f1f5f9", marginBottom: 8 }}>
            {t("โหมด AR Catch", "AR Catch Mode")}
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", maxWidth: 280, textAlign: "center", lineHeight: 1.6 }}>
            {t(
              `จับ ${pokemonName} ด้วยโลกจริง! เปิดกล้องแล้วโยน Poké Ball เหมือน Pokemon GO`,
              `Catch ${pokemonName} in the real world! Open camera and throw a Poké Ball just like Pokémon GO`
            )}
          </div>
          <button style={S.startBtn} onClick={startCamera}>
            🎥 {t("เปิดกล้อง AR", "Start AR Camera")}
          </button>
          <button style={S.skipBtn}
            onClick={() => { setCameraOn(true); setCameraErr("no-camera"); }}>
            {t("ดูแบบไม่มีกล้อง", "Play without camera")}
          </button>
          <button style={S.closeTopBtn}
            onClick={() => { streamRef.current?.getTracks().forEach(tr => tr.stop()); onClose(); }}>
            ✕
          </button>
        </div>
      </div>
    );
  }

  if (cameraErr && cameraErr !== "no-camera") {
    return (
      <div style={S.overlay}>
        <style>{GLOBAL_CSS}</style>
        <div style={S.preCam}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
          <div style={{ color: "#f87171", fontWeight: 700, marginBottom: 8 }}>{cameraErr}</div>
          <button style={S.startBtn}
            onClick={() => { setCameraErr(""); setCameraOn(true); }}>
            {t("เล่นแบบไม่มีกล้อง", "Play without camera")}
          </button>
          <button style={S.skipBtn}
            onClick={() => { streamRef.current?.getTracks().forEach(tr => tr.stop()); onClose(); }}>
            {t("ปิด", "Close")}
          </button>
        </div>
      </div>
    );
  }

  // ─── Main AR catch arena ─────────────────────────────────
  return (
    <div style={S.overlay}>
      <style>{GLOBAL_CSS + curveCss}</style>

      {/* Camera feed */}
      <video ref={videoRef} style={S.video} muted playsInline />

      {/* Dark overlay for readability — lighter than before */}
      <div style={S.camOverlay} />

      {/* AR grid */}
      <div style={S.arGrid} />
      <div style={S.scanline} />

      {/* ─── Top HUD ─────────────────────────── */}
      <div style={S.topHud}>
        <button style={S.closeBtn}
          onClick={() => { streamRef.current?.getTracks().forEach(tr => tr.stop()); onClose(); }}>
          ✕
        </button>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={S.hudLabel}>⬡ AR CATCH MODE</div>
          <div style={{ display: "flex", gap: 6 }}>
            {pokemon.types?.map(tp => (
              <span key={tp.type.name} style={{
                background: "rgba(0,0,0,0.5)", color: "#e2e8f0", fontSize: 10,
                fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                border: "1px solid rgba(255,255,255,0.2)",
              }}>{tp.type.name}</span>
            ))}
          </div>
        </div>
        {/* Catch chance ring */}
        <div style={{ position: "relative", width: 40, height: 40 }}>
          <svg viewBox="0 0 36 36" style={{ width: 40, height: 40 }}>
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
            <circle cx="18" cy="18" r="15.5" fill="none"
              stroke={catchChance > 0.7 ? "#22c55e" : catchChance > 0.4 ? "#facc15" : "#ef4444"}
              strokeWidth="3"
              strokeDasharray={`${catchChance * 97.4} 97.4`}
              strokeLinecap="round"
              transform="rotate(-90 18 18)" />
          </svg>
          <span style={{
            position: "absolute", inset: 0, display: "flex",
            alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: 8, fontWeight: 800,
          }}>{Math.round(catchChance * 100)}%</span>
        </div>
      </div>

      {/* ─── AR Corner brackets ───────────────── */}
      {CORNERS.map(pos => (
        <div key={pos} style={{
          ...S.corner,
          top: pos.includes("t") ? "18%" : undefined,
          bottom: pos.includes("b") ? "23%" : undefined,
          left: pos.includes("l") ? "12%" : undefined,
          right: pos.includes("r") ? "12%" : undefined,
          transform: `scaleX(${pos.includes("r") ? -1 : 1}) scaleY(${pos.includes("b") ? -1 : 1})`,
        }}>
          <svg viewBox="0 0 40 40" fill="none">
            <path d="M0 20 L0 0 L20 0" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round"/>
          </svg>
        </div>
      ))}

      {/* ─── Main arena (drag area) ───────────── */}
      <div ref={arenaRef} style={S.arena}
        onMouseDown={onDragStart} onMouseMove={onDragMove}
        onMouseUp={onDragEnd} onMouseLeave={onDragEnd}
        onTouchStart={onDragStart} onTouchMove={onDragMove} onTouchEnd={onDragEnd}>

        {/* Pokemon sprite with gyro tilt */}
        {(phase === "idle" || phase === "throwing" || phase === "hit" || phase === "suckIn") && (
          <div style={{
            ...S.pokeWrap,
            transform: `translate(calc(-50% + ${tilt.y * 2}px), calc(-60% + ${tilt.x * 1.5}px))`,
          }}>
            <div style={S.pokeShadow} />
            <img
              src={artUrl(pokemon.id)}
              alt={pokemonName}
              style={{
                ...S.pokeImg,
                animation: phase === "idle" ? "ar-float 3s ease-in-out infinite"
                  : phase === "suckIn" ? "ar-suckin-poke 0.7s ease-in forwards" : undefined,
              }}
            />
          </div>
        )}

        {/* Capture ring */}
        {phase === "idle" && (
          <>
            <svg style={S.capRingSvg} viewBox="-160 -160 320 320">
              <circle cx="0" cy="0" r="140" fill="none"
                stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeDasharray="6 8" />
              <circle cx="0" cy="0" r={ringRadius * 0.5} fill="none"
                stroke={ringZone.color} strokeWidth="4" opacity="0.85"
                style={{ filter: `drop-shadow(0 0 8px ${ringZone.color})`, transition: "stroke 0.2s" }} />
            </svg>
            {ringZone.label && (
              <div style={{ ...S.ringLabel, color: ringZone.color }}>
                ◉ {ringZone.label}
              </div>
            )}
          </>
        )}

        {/* Pokemon name tag */}
        {phase === "idle" && (
          <div style={S.nameTag}>
            <span style={{ fontSize: 10, opacity: 0.7 }}>#{String(pokemon.id).padStart(3, "0")}</span>
            {"  "}{pokemonName}
          </div>
        )}

        {/* Suck-in beams */}
        {phase === "suckIn" && <SuckInEffect />}

        {/* Pokemon escaped */}
        {phase === "escape" && (
          <div style={{ ...S.pokeWrap, transform: "translate(-50%, -60%)" }}>
            <img src={artUrl(pokemon.id)} alt={pokemonName}
              style={{ ...S.pokeImg, animation: "ar-escape 0.6s ease-out forwards" }} />
          </div>
        )}

        {/* Drag trail */}
        {dragging && dragPath.length > 1 && (
          <>
            <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible", pointerEvents: "none", zIndex: 5 }}>
              <defs>
                <linearGradient id="ar-trail-g" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor={ball.glow} stopOpacity="0" />
                  <stop offset="100%" stopColor={ball.glow} stopOpacity="1" />
                </linearGradient>
              </defs>
              <path d={`M ${dragPath.map(p => `${p.x},${p.y}`).join(" L ")}`}
                fill="none" stroke="url(#ar-trail-g)" strokeWidth="6"
                strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
            </svg>
            {dragPath.slice(-10).map((pt, i, arr) => {
              const op = (i / arr.length) * 0.9;
              const sz = 4 + (i / arr.length) * 8;
              return (
                <div key={i} style={{
                  position: "absolute", left: pt.x, top: pt.y,
                  width: sz, height: sz, marginLeft: -sz/2, marginTop: -sz/2,
                  borderRadius: "50%",
                  background: `radial-gradient(circle, white 0%, ${ball.glow} 60%, transparent 100%)`,
                  boxShadow: `0 0 ${sz}px ${ball.glow}`,
                  opacity: op, pointerEvents: "none", zIndex: 5,
                }} />
              );
            })}
          </>
        )}

        {/* Dragging ball */}
        {dragging && (
          <div style={{
            position: "absolute", left: ballPos.x, top: ballPos.y,
            transform: "translate(-50%, -50%)", zIndex: 7, pointerEvents: "none",
            filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.5))",
          }}>
            <PokeballImg ballId={ballId} size={88} glow animate />
          </div>
        )}

        {/* Ball flying */}
        {(phase === "throwing" || phase === "hit" || phase === "suckIn") && (
          <div className={`phase-${phase}`} style={{
            position: "absolute", bottom: 80, left: "50%",
            transform: "translateX(-50%)", zIndex: 7,
            animation: isCurveBall && phase === "throwing"
              ? `ar-curve-${curveDir} 0.85s cubic-bezier(0.3,0.7,0.4,1) forwards`
              : phase === "throwing" ? "ar-ball-fly 0.85s cubic-bezier(0.3,0.7,0.4,1) forwards"
              : phase === "hit" ? "ar-ball-hit 0.2s ease-out forwards"
              : "ar-ball-suckin 0.7s ease-in forwards",
          }}>
            <PokeballImg ballId={ballId} size={88} glow />
          </div>
        )}

        {/* Wobble */}
        {phase === "wobble" && <WobbleEffect ballId={ballId} wobbleCount={wobbleCount} />}

        {/* Success ball */}
        {phase === "success" && (
          <>
            <div style={{
              position: "absolute", top: "48%", left: "50%",
              transform: "translate(-50%, -50%)",
              filter: `drop-shadow(0 0 30px #fbbf24) drop-shadow(0 0 60px rgba(251,191,36,0.5))`,
              animation: "ar-success-pop 0.9s cubic-bezier(0.34,1.56,0.64,1)",
              zIndex: 8,
            }}>
              <PokeballImg ballId={ballId} size={110} glow />
            </div>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} style={{
                position: "absolute", top: "48%", left: "50%",
                width: 6, height: 6, borderRadius: "50%",
                background: ["#fbbf24","#34d399","#60a5fa","#f472b6"][i % 4],
                animation: `ar-spark-${i % 4} 0.8s ease-out ${i * 0.05}s forwards`,
                zIndex: 7,
              }} />
            ))}
          </>
        )}

        {/* Throw quality banner */}
        {throwQuality && (phase === "throwing" || phase === "hit") && (
          <div style={{
            ...S.qualityBanner,
            color: phase === "throwing" && throwQuality === "excellent" ? "#fbbf24"
              : throwQuality === "great" ? "#60a5fa" : "#34d399",
          }}>
            {qualityText(throwQuality)}
          </div>
        )}

        {/* Curve ball tag */}
        {isCurveBall && (phase === "throwing" || phase === "hit") && (
          <div style={S.curveBanner}>🌀 CURVE BALL!</div>
        )}

        {/* Result screens */}
        {resultMsg === "gotcha" && phase === "success" && (
          <ARSuccessScreen pokemonName={pokemonName} ballId={ballId} ball={ball}
            caughtCount={caughtCount} lang={lang} />
        )}
        {resultMsg === "escape" && phase === "escape" && (
          <div style={S.escapeBanner}>
            💨 {lang === "th" ? `${pokemonName} หนีไปแล้ว!` : `${pokemonName} got away!`}
          </div>
        )}

        {/* Idle: ball at bottom */}
        {phase === "idle" && !dragging && (
          <div style={S.idleBall}>
            <div style={{
              filter: "drop-shadow(0 12px 28px rgba(0,0,0,0.5))",
              animation: "ar-ball-ready 2.2s ease-in-out infinite",
              cursor: "grab",
            }}>
              <PokeballImg ballId={ballId} size={100} glow />
            </div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 600, marginTop: 4 }}>
              {t("ลากขึ้นเพื่อโยน", "Swipe up to throw")}
            </div>
          </div>
        )}
      </div>

      {/* ─── Bottom bar ────────────────────── */}
      <div style={S.bottomBar}>
        <div style={{ flex: 1 }} />
        <button style={S.ballSelectBtn} onClick={() => setShowBallPicker(true)}
          disabled={phase !== "idle"}>
          <PokeballImg ballId={ballId} size={38} />
          <span style={{ color: "#cbd5e1", fontSize: 10, fontWeight: 600 }}>
            {t("เปลี่ยนบอล", "Switch Ball")}
          </span>
        </button>
      </div>

      {showBallPicker && (
        <BallPicker selectedId={ballId} onSelect={setBallId}
          onClose={() => setShowBallPicker(false)} lang={lang} />
      )}
    </div>
  );
}

// ─── Success overlay ─────────────────────────────────────────
function ARSuccessScreen({ pokemonName, ballId, ball, caughtCount, lang }) {
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 50,
      background: "radial-gradient(ellipse at center, rgba(15,35,80,0.82) 0%, rgba(0,5,20,0.96) 100%)",
      backdropFilter: "blur(12px)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: 24, animation: "ar-overlay-in 0.4s ease",
    }}>
      <div style={{ fontSize: "clamp(32px,8vw,52px)", fontWeight: 900, color: "white",
        textShadow: "0 4px 16px rgba(0,0,0,0.7), 0 0 28px rgba(251,191,36,0.8)",
        letterSpacing: 3, marginBottom: 8, animation: "ar-success-pop 0.6s cubic-bezier(0.34,1.56,0.64,1)" }}>
        🎉 GOTCHA! 🎉
      </div>
      <div style={{ color: "rgba(255,255,255,0.92)", fontSize: 17, fontWeight: 700, marginBottom: 20 }}>
        {lang === "th" ? `${pokemonName} ถูกจับด้วย AR!` : `${pokemonName} was caught in AR!`}
      </div>
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        background: "rgba(0,0,0,0.55)", backdropFilter: "blur(10px)",
        padding: "8px 18px", borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.18)",
      }}>
        <PokeballImg ballId={ballId} size={24} />
        <span style={{ color: "white", fontSize: 12, fontWeight: 600 }}>
          {ball.name} · #{caughtCount} {lang === "th" ? "ตัว" : "caught"}
        </span>
      </div>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const S = {
  overlay: {
    position: "fixed", inset: 0, zIndex: 9700,
    background: "#000", display: "flex", flexDirection: "column",
    overflow: "hidden",
  },
  video: {
    position: "absolute", inset: 0, width: "100%", height: "100%",
    objectFit: "cover",
  },
  camOverlay: {
    position: "absolute", inset: 0,
    background: "rgba(0,0,0,0.28)",
    pointerEvents: "none",
  },
  arGrid: {
    position: "absolute", inset: 0, pointerEvents: "none",
    backgroundImage: "linear-gradient(rgba(56,189,248,0.05) 1px, transparent 1px), linear-gradient(90deg,rgba(56,189,248,0.05) 1px, transparent 1px)",
    backgroundSize: "60px 60px",
  },
  scanline: {
    position: "absolute", inset: 0, pointerEvents: "none",
    background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.02) 2px, rgba(0,0,0,0.02) 4px)",
  },
  topHud: {
    position: "relative", zIndex: 10,
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "14px 16px",
    background: "linear-gradient(to bottom, rgba(0,0,0,0.65), transparent)",
  },
  hudLabel: {
    fontSize: 11, fontWeight: 900, letterSpacing: 2,
    color: "#38bdf8", textShadow: "0 0 10px #38bdf8",
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: "50%",
    border: "1.5px solid rgba(255,255,255,0.18)",
    background: "rgba(15,23,42,0.52)", color: "rgba(255,255,255,0.8)",
    fontSize: 14, cursor: "pointer", display: "flex",
    alignItems: "center", justifyContent: "center",
    backdropFilter: "blur(10px)",
  },
  arena: {
    flex: 1, position: "relative", userSelect: "none",
    touchAction: "none",
  },
  pokeWrap: {
    position: "absolute", top: "50%", left: "50%",
    zIndex: 5, pointerEvents: "none",
    transition: "transform 0.12s ease-out",
  },
  pokeShadow: {
    position: "absolute", bottom: -12, left: "50%",
    transform: "translateX(-50%)",
    width: 100, height: 20,
    background: "radial-gradient(ellipse, rgba(0,0,0,0.5), transparent 70%)",
    filter: "blur(4px)",
  },
  pokeImg: {
    width: 190, height: 190, objectFit: "contain",
    filter: "drop-shadow(0 10px 30px rgba(56,189,248,0.45))",
  },
  capRingSvg: {
    position: "absolute", top: "50%", left: "50%",
    transform: "translate(-50%, -55%)",
    pointerEvents: "none", zIndex: 4,
    width: 320, height: 320, overflow: "visible",
  },
  ringLabel: {
    position: "absolute", top: "14%", left: "50%",
    transform: "translateX(-50%)",
    fontSize: 11, fontWeight: 800, letterSpacing: 2,
    textShadow: "0 2px 6px rgba(0,0,0,0.6)",
    pointerEvents: "none", zIndex: 5, whiteSpace: "nowrap",
  },
  nameTag: {
    position: "absolute",
    bottom: "calc(50% - 140px)",
    left: "50%", transform: "translateX(-50%)",
    padding: "6px 16px", borderRadius: 999,
    background: "rgba(0,0,0,0.65)",
    border: "1.5px solid rgba(56,189,248,0.5)",
    color: "white", fontSize: 14, fontWeight: 900,
    whiteSpace: "nowrap", zIndex: 6,
    backdropFilter: "blur(6px)",
    textShadow: "0 0 10px rgba(56,189,248,0.8)",
  },
  corner: {
    position: "absolute", width: 38, height: 38,
    pointerEvents: "none", opacity: 0.75, zIndex: 9,
  },
  idleBall: {
    position: "absolute", bottom: 20, left: "50%",
    transform: "translateX(-50%)", zIndex: 6,
    display: "flex", flexDirection: "column",
    alignItems: "center", pointerEvents: "auto",
  },
  bottomBar: {
    position: "relative", zIndex: 10,
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "12px 20px 24px",
    background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)",
  },
  ballSelectBtn: {
    display: "flex", flexDirection: "column",
    alignItems: "center", gap: 4,
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: 12, padding: "8px 14px",
    cursor: "pointer",
  },
  qualityBanner: {
    position: "absolute", top: "30%", left: "50%",
    transform: "translate(-50%, -50%)",
    fontSize: "clamp(22px,6vw,36px)", fontWeight: 900,
    textShadow: "0 4px 16px rgba(0,0,0,0.7)",
    letterSpacing: 2, zIndex: 9, whiteSpace: "nowrap",
    animation: "ar-quality-pop 0.5s cubic-bezier(0.34,1.56,0.64,1)",
  },
  curveBanner: {
    position: "absolute", top: "22%", left: "50%",
    transform: "translate(-50%, -50%)", zIndex: 10,
    padding: "7px 20px", borderRadius: 999,
    background: "linear-gradient(135deg, #06b6d4, #0e7490)",
    boxShadow: "0 0 20px rgba(6,182,212,0.7)",
    color: "white", fontSize: 15, fontWeight: 900,
    letterSpacing: 1.5, animation: "ar-quality-pop 0.5s cubic-bezier(0.34,1.56,0.64,1)",
    whiteSpace: "nowrap",
  },
  escapeBanner: {
    position: "absolute", top: "35%", left: "50%",
    transform: "translate(-50%, -50%)", zIndex: 10,
    padding: "12px 24px", borderRadius: 14,
    background: "rgba(239,68,68,0.88)", backdropFilter: "blur(8px)",
    color: "white", fontSize: 18, fontWeight: 900,
    whiteSpace: "nowrap", boxShadow: "0 8px 28px rgba(239,68,68,0.5)",
    animation: "ar-quality-pop 0.4s cubic-bezier(0.34,1.56,0.64,1)",
  },
  preCam: {
    flex: 1, display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    gap: 16, padding: 32,
    background: "radial-gradient(ellipse at 30% 60%, #0f3460, #020617)",
    position: "relative",
  },
  startBtn: {
    padding: "14px 36px", borderRadius: 999, border: "none", cursor: "pointer",
    background: "linear-gradient(135deg, #38bdf8, #6366f1)",
    color: "white", fontSize: 16, fontWeight: 900,
    boxShadow: "0 8px 24px rgba(56,189,248,0.4)",
  },
  skipBtn: {
    padding: "10px 24px", borderRadius: 999, cursor: "pointer",
    background: "transparent", color: "rgba(255,255,255,0.5)",
    border: "1px solid rgba(255,255,255,0.2)", fontSize: 13,
  },
  closeTopBtn: {
    position: "absolute", top: 16, right: 16,
    width: 36, height: 36, borderRadius: "50%",
    border: "1.5px solid rgba(255,255,255,0.18)",
    background: "rgba(15,23,42,0.52)", color: "rgba(255,255,255,0.8)",
    fontSize: 14, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
};

const GLOBAL_CSS = `
  @keyframes ar-float {
    0%, 100% { transform: translateY(0px); }
    50%       { transform: translateY(-14px); }
  }
  @keyframes ar-ball-ready {
    0%, 100% { transform: scale(1); }
    50%       { transform: scale(1.06); }
  }
  @keyframes ar-ball-spin { to { transform: rotate(360deg); } }
  @keyframes ar-ball-fly {
    0%   { bottom: 80px; left: 50%; transform: translateX(-50%) scale(1); }
    100% { bottom: 48%;  left: 50%; transform: translateX(-50%) scale(0.65); }
  }
  @keyframes ar-ball-hit {
    0%   { transform: translateX(-50%) scale(0.65); }
    50%  { transform: translateX(-50%) scale(0.8); }
    100% { transform: translateX(-50%) scale(0.65); }
  }
  @keyframes ar-ball-suckin {
    0%   { bottom: 48%; transform: translateX(-50%) scale(0.65); }
    100% { bottom: 48%; transform: translateX(-50%) scale(1.1); }
  }
  @keyframes ar-suckin-poke {
    0%   { transform: scale(1); opacity: 1; }
    60%  { transform: scale(0.3); opacity: 0.5; }
    100% { transform: scale(0.05); opacity: 0; }
  }
  @keyframes ar-escape {
    0%   { transform: scale(0.2); opacity: 0; }
    60%  { transform: scale(1.2); opacity: 1; }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes ar-wobble {
    0%,100% { transform: rotate(0deg); }
    20%      { transform: rotate(-18deg); }
    60%      { transform: rotate(18deg); }
  }
  @keyframes ar-suckin {
    0%   { opacity: 0.8; }
    100% { opacity: 0; }
  }
  @keyframes ar-quality-pop {
    0%   { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
    60%  { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
    100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
  }
  @keyframes ar-success-pop {
    0%   { transform: scale(0) rotate(-20deg); }
    60%  { transform: scale(1.15) rotate(8deg); }
    100% { transform: scale(1) rotate(0); }
  }
  @keyframes ar-overlay-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
`;
