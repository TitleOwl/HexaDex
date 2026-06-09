import { useState, useEffect, useRef, useCallback } from "react";
import { useModalLifecycle } from "../perfUtils.js";

const artUrl = id => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;

export default function ARViewer({ pokemon, lang, onClose }) {
  useModalLifecycle(onClose);
  const t = (th, en, ja) => lang === "th" ? th : lang === "ja" ? (ja ?? en) : en;

  const videoRef = useRef(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraErr, setCameraErr] = useState("");
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [caught, setCaught] = useState(false);
  const [throwing, setThrowing] = useState(false);
  const [ripples, setRipples] = useState([]);
  const streamRef = useRef(null);
  const orientRef = useRef(null);

  const pokemonId = pokemon?.id;
  const pokemonName = pokemon?.name ?? "";

  // Start camera
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
    } catch (e) {
      setCameraErr(t("ไม่สามารถเปิดกล้องได้", "Camera not available", "カメラが利用できません"));
    }
  }, [t]);

  // Gyroscope / tilt
  useEffect(() => {
    if (!cameraOn) return;
    const handler = (e) => {
      const x = Math.max(-25, Math.min(25, (e.beta ?? 0) / 4));
      const y = Math.max(-25, Math.min(25, (e.gamma ?? 0) / 4));
      setTilt({ x, y });
    };
    if (window.DeviceOrientationEvent) {
      window.addEventListener("deviceorientation", handler, { passive: true });
      orientRef.current = handler;
    }
    return () => { if (orientRef.current) window.removeEventListener("deviceorientation", orientRef.current); };
  }, [cameraOn]);

  // Stop camera on unmount
  useEffect(() => () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  const handleThrow = () => {
    if (throwing || caught) return;
    setThrowing(true);
    setRipples(prev => [...prev, Date.now()]);
    setTimeout(() => {
      setThrowing(false);
      setCaught(true);
    }, 1000);
  };

  const reset = () => { setCaught(false); setThrowing(false); };

  // Touch: remove old ripples
  useEffect(() => {
    const timer = setInterval(() => setRipples(r => r.filter(ts => Date.now() - ts < 900)), 100);
    return () => clearInterval(timer);
  }, []);

  const displayName = lang === "th"
    ? (pokemon?.localName ?? pokemonName)
    : pokemonName.charAt(0).toUpperCase() + pokemonName.slice(1);

  return (
    <div className="ar-overlay">
      <style>{`
        .ar-overlay {
          position: fixed; inset: 0; z-index: 9700;
          background: #000;
          display: flex; flex-direction: column;
          overflow: hidden;
        }
        .ar-video {
          position: absolute; inset: 0;
          width: 100%; height: 100%;
          object-fit: cover;
          transform: scaleX(-1);
        }
        .ar-placeholder {
          position: absolute; inset: 0;
          background: radial-gradient(ellipse at 30% 60%, #0f3460, #020617);
          display: flex; align-items: center; justify-content: center;
        }
        .ar-grid {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(56,189,248,0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(56,189,248,0.08) 1px, transparent 1px);
          background-size: 60px 60px;
          pointer-events: none;
        }
        .ar-scanline {
          position: absolute; inset: 0; pointer-events: none;
          background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px);
        }

        /* HUD */
        .ar-hud-top {
          position: absolute; top: 0; left: 0; right: 0;
          padding: 16px;
          display: flex; align-items: center; justify-content: space-between;
          background: linear-gradient(to bottom, rgba(0,0,0,0.6), transparent);
          z-index: 10;
        }
        .ar-hud-label {
          font-size: 11px; font-weight: 900; letter-spacing: 2px;
          color: #38bdf8; text-shadow: 0 0 10px #38bdf8;
        }
        .ar-close {
          width: 36px; height: 36px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.3);
          background: rgba(0,0,0,0.5); color: white; font-size: 16px; font-weight: 900;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
        }

        /* Pokemon sprite */
        .ar-poke-wrap {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -60%);
          z-index: 5;
          pointer-events: none;
          transition: transform 0.15s ease-out;
        }
        .ar-poke-shadow {
          position: absolute; bottom: -12px; left: 50%;
          transform: translateX(-50%);
          width: 100px; height: 20px;
          background: radial-gradient(ellipse, rgba(0,0,0,0.5), transparent 70%);
          filter: blur(4px);
        }
        .ar-poke-img {
          width: 180px; height: 180px; object-fit: contain;
          filter: drop-shadow(0 10px 30px rgba(56,189,248,0.5));
          transition: transform 0.3s, filter 0.3s;
        }
        .ar-poke-img.throwing {
          animation: ar-throw 1s ease-in forwards;
        }
        .ar-poke-img.caught {
          animation: ar-caught 0.6s ease-out forwards;
        }
        @keyframes ar-throw {
          0%   { transform: scale(1); opacity: 1; filter: drop-shadow(0 10px 30px rgba(56,189,248,0.8)); }
          30%  { transform: scale(1.15); }
          60%  { transform: scale(0.3) translateY(-40px); opacity: 0.5; }
          100% { transform: scale(0.05); opacity: 0; }
        }
        @keyframes ar-caught {
          0%   { transform: scale(0.1); opacity: 0; }
          70%  { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; filter: drop-shadow(0 10px 30px rgba(34,197,94,0.8)); }
        }
        .ar-poke-float {
          animation: ar-float 3s ease-in-out infinite;
        }
        @keyframes ar-float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-12px); }
        }

        /* Corner brackets */
        .ar-corner {
          position: absolute; width: 40px; height: 40px;
          pointer-events: none; opacity: 0.7;
        }
        .ar-corner svg { width: 100%; height: 100%; }
        .ar-corner-tl { top: 20%; left: 15%; }
        .ar-corner-tr { top: 20%; right: 15%; transform: scaleX(-1); }
        .ar-corner-bl { bottom: 25%; left: 15%; transform: scaleY(-1); }
        .ar-corner-br { bottom: 25%; right: 15%; transform: scale(-1); }

        /* Name tag */
        .ar-name-tag {
          position: absolute; top: calc(50% + 50px); left: 50%;
          transform: translateX(-50%);
          padding: 6px 16px; border-radius: 999px;
          background: rgba(0,0,0,0.65);
          border: 1.5px solid rgba(56,189,248,0.5);
          color: white; font-size: 14px; font-weight: 900;
          white-space: nowrap; z-index: 6;
          backdrop-filter: blur(6px);
          text-shadow: 0 0 10px rgba(56,189,248,0.8);
        }

        /* Pokeball throw */
        .ar-ball-btn {
          position: absolute; bottom: 60px; left: 50%;
          transform: translateX(-50%);
          z-index: 10;
          width: 80px; height: 80px; border-radius: 50%;
          background: radial-gradient(circle at 40% 35%, #ffffff, #ef4444);
          border: 4px solid rgba(255,255,255,0.9);
          box-shadow: 0 8px 30px rgba(0,0,0,0.6), inset 0 2px 8px rgba(255,255,255,0.4);
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 900; color: rgba(0,0,0,0.6);
          transition: transform 0.15s;
          overflow: hidden;
        }
        .ar-ball-btn::after {
          content: "";
          position: absolute; top: 50%; left: 0; right: 0;
          height: 3px; background: rgba(0,0,0,0.5);
          transform: translateY(-50%);
        }
        .ar-ball-btn:active { transform: translateX(-50%) scale(0.92); }
        .ar-ball-btn:disabled { opacity: 0.5; }

        /* Ripple */
        .ar-ripple {
          position: absolute; top: 50%; left: 50%;
          width: 60px; height: 60px;
          border: 2px solid rgba(239,68,68,0.7);
          border-radius: 50%;
          pointer-events: none; z-index: 4;
          animation: ar-ripple 0.9s ease-out forwards;
          margin: -30px 0 0 -30px;
        }
        @keyframes ar-ripple {
          from { transform: scale(1); opacity: 0.8; }
          to   { transform: scale(5); opacity: 0; }
        }

        /* Caught banner */
        .ar-caught-banner {
          position: absolute; top: 30%; left: 50%; transform: translateX(-50%);
          padding: 12px 28px; border-radius: 16px;
          background: rgba(34,197,94,0.9);
          color: white; font-size: 18px; font-weight: 900;
          z-index: 11; white-space: nowrap;
          animation: ar-banner-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards;
          box-shadow: 0 8px 30px rgba(34,197,94,0.5);
        }
        @keyframes ar-banner-pop {
          from { opacity: 0; transform: translateX(-50%) scale(0.7); }
          to   { opacity: 1; transform: translateX(-50%) scale(1); }
        }
        .ar-reset-btn {
          position: absolute; bottom: 60px; left: 50%; transform: translateX(-50%);
          z-index: 12; padding: 13px 32px; border-radius: 999px; border: none; cursor: pointer;
          background: linear-gradient(135deg, #22c55e, #16a34a);
          color: white; font-size: 14px; font-weight: 900;
          box-shadow: 0 8px 24px rgba(34,197,94,0.5);
        }

        /* No camera fallback */
        .ar-no-cam-overlay {
          position: absolute; inset: 0;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 16px; color: white; text-align: center; padding: 24px;
          z-index: 5;
        }
        .ar-start-btn {
          padding: 14px 36px; border-radius: 999px; border: none; cursor: pointer;
          background: linear-gradient(135deg, #38bdf8, #6366f1);
          color: white; font-size: 16px; font-weight: 900;
          box-shadow: 0 8px 24px rgba(56,189,248,0.4);
          transition: transform 0.2s;
        }
        .ar-start-btn:hover { transform: scale(1.04); }
      `}</style>

      {/* Camera feed */}
      <video ref={videoRef} className="ar-video" muted playsInline />

      {/* Placeholder if no camera */}
      {!cameraOn && (
        <div className="ar-placeholder">
          <div className="ar-grid" />
        </div>
      )}
      {cameraOn && <div className="ar-grid" />}
      <div className="ar-scanline" />

      {/* HUD top */}
      <div className="ar-hud-top">
        <div>
          <div className="ar-hud-label">⬡ HEXADEX AR</div>
        </div>
        <button className="ar-close" onClick={() => { streamRef.current?.getTracks().forEach(t => t.stop()); onClose(); }}>✕</button>
      </div>

      {/* Prompt to start camera */}
      {!cameraOn && !cameraErr && (
        <div className="ar-no-cam-overlay">
          <div style={{ fontSize: 64 }}>📷</div>
          <div style={{ fontSize: 18, fontWeight: 900 }}>{t("โหมด AR", "AR Mode", "ARモード")}</div>
          <div style={{ fontSize: 13, opacity: 0.7, maxWidth: 280 }}>
            {t("วางโปเกมอนในโลกจริงด้วยกล้อง แล้วโยน Poké Ball จับ!", "Place Pokémon in the real world and throw a Poké Ball to catch!", "現実世界にポケモンを出してポケボールで捕まえよう！")}
          </div>
          <button className="ar-start-btn" onClick={startCamera}>
            🎥 {t("เปิดกล้อง", "Open Camera", "カメラを起動")}
          </button>
        </div>
      )}

      {cameraErr && (
        <div className="ar-no-cam-overlay">
          <div style={{ fontSize: 48 }}>📷</div>
          <div style={{ color: "#f87171", fontWeight: 700 }}>{cameraErr}</div>
          <div style={{ fontSize: 13, opacity: 0.7, maxWidth: 280 }}>
            {t("ใช้โหมดชมแบบไม่มีกล้องได้เช่นกัน", "You can enjoy the AR view without a camera too", "カメラなしでもARビューを楽しめます")}
          </div>
          <button className="ar-start-btn" onClick={() => { setCameraErr(""); setCameraOn(true); }}>
            {t("ดูโดยไม่มีกล้อง", "View without camera", "カメラなしで表示")}
          </button>
        </div>
      )}

      {/* AR scene */}
      {(cameraOn || !cameraErr) && pokemonId && (
        <>
          {/* Corner brackets */}
          {["tl","tr","bl","br"].map(pos => (
            <div key={pos} className={`ar-corner ar-corner-${pos}`}>
              <svg viewBox="0 0 40 40" fill="none">
                <path d="M0 20 L0 0 L20 0" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round"/>
              </svg>
            </div>
          ))}

          {/* Ripples */}
          {ripples.map(ts => <div key={ts} className="ar-ripple" />)}

          {/* Pokemon sprite with tilt */}
          <div className="ar-poke-wrap"
            style={{ transform: `translate(calc(-50% + ${tilt.y * 2}px), calc(-60% + ${tilt.x * 1.5}px))` }}>
            <div className="ar-poke-shadow" />
            <img
              src={artUrl(pokemonId)}
              alt={pokemonName}
              className={`ar-poke-img${!throwing && !caught ? " ar-poke-float" : ""}${throwing ? " throwing" : ""}${caught ? " caught" : ""}`}
            />
          </div>

          {/* Name tag */}
          {!throwing && (
            <div className="ar-name-tag">
              #{String(pokemonId).padStart(3, "0")} {displayName}
            </div>
          )}

          {/* Caught banner */}
          {caught && (
            <div className="ar-caught-banner">
              ✅ {displayName} {t("ถูกจับแล้ว!", "was caught!", "をゲット！")}
            </div>
          )}

          {/* Throw / reset button */}
          {!caught ? (
            <button className="ar-ball-btn" onClick={handleThrow} disabled={throwing}>
              {throwing ? "●" : ""}
            </button>
          ) : (
            <button className="ar-reset-btn" onClick={reset}>
              🔄 {t("ปล่อยคืน", "Release & retry", "もう一度")}
            </button>
          )}
        </>
      )}
    </div>
  );
}
