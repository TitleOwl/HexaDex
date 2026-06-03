// ═══════════════════════════════════════════════════════════════════════
// SnapSearch v4 — Google Gemini Vision–powered Pokémon recognition
// ───────────────────────────────────────────────────────────────────────
// Backend: /api/detect-pokemon (Vercel function or vite dev middleware)
// Approach: send image to Google Gemini Vision → get name → look up
//
// vs v3 (histogram):
//   ✅ Truly accurate — Gemini actually understands what's in the image
//   ✅ No pre-indexing required (no 30-60s wait on first use)
//   ✅ Works with any background, lighting, angle
//   ✅ FREE — Gemini free tier (15 RPM, 1500/day)
//   ❌ Requires API key + network
// ═══════════════════════════════════════════════════════════════════════

import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { typeColor, getArt, getLocalName, padId } from "../utils.js";

const API_ENDPOINT = "/api/detect-pokemon";
const MAX_IMAGE_SIZE = 768; // resize to this max dimension before sending (saves tokens)
const JPEG_QUALITY = 0.85;

// ───── Localized strings ─────
const TXT = {
  th: {
    pickHow: "เลือกวิธีค้นหา",
    cameraTitle: "ใช้กล้องสด",
    cameraDesc: "เปิดกล้องเล็งโปเกม่อน — กดปุ่มเพื่อระบุ",
    uploadTitle: "อัพโหลดรูป",
    uploadDesc: "เลือกรูปจากเครื่อง — AI วิเคราะห์ทันที",
    cancel: "ยกเลิก",
    back: "← ย้อนกลับ",
    capture: "ถ่าย",
    flip: "สลับกล้อง",
    holdSteady: "🎯 ตั้งโปเกม่อนให้อยู่ในกรอบแล้วกดปุ่ม",
    detecting: "🤖 AI กำลังวิเคราะห์รูป...",
    cameraError: "เปิดกล้องไม่ได้ — โปรดอนุญาตการใช้กล้องในเบราว์เซอร์",
    dropHere: "ลากรูปมาวางที่นี่",
    orClick: "หรือคลิกเพื่อเลือกไฟล์",
    accept: "JPG · PNG · WebP — สูงสุด 10MB",
    analyze: "🔍 วิเคราะห์รูป",
    analyzing: "AI กำลังวิเคราะห์",
    aiHint: "ใช้ Google Gemini Vision · ใช้เวลาประมาณ 2-4 วินาที",
    foundTitle: "พบโปเกม่อน!",
    notFoundTitle: "ไม่พบในรายการ",
    notFoundDesc: "AI ตอบว่า:",
    notFoundHint: "ลองใช้รูปที่ชัดกว่านี้ดู",
    apiError: "เกิดข้อผิดพลาด",
    apiErrorHint: "โปรดตรวจสอบ GEMINI_API_KEY ใน .env.local",
    open: "ดูข้อมูล",
    retry: "ลองใหม่",
    tryAgain: "ลองอีกครั้ง",
    confidence: "ความมั่นใจ",
  },
  en: {
    pickHow: "Choose how to search",
    cameraTitle: "Live Camera",
    cameraDesc: "Point camera at a Pokémon — tap to identify",
    uploadTitle: "Upload Image",
    uploadDesc: "Pick a file — AI analyzes instantly",
    cancel: "Cancel",
    back: "← Back",
    capture: "Capture",
    flip: "Flip",
    holdSteady: "🎯 Frame the Pokémon and tap the shutter",
    detecting: "🤖 AI analyzing image...",
    cameraError: "Can't access camera — please allow camera permission",
    dropHere: "Drop image here",
    orClick: "or click to browse",
    accept: "JPG · PNG · WebP — max 10MB",
    analyze: "🔍 Analyze Image",
    analyzing: "AI analyzing",
    aiHint: "Powered by Google Gemini Vision · usually 2-4 sec",
    foundTitle: "Pokémon found!",
    notFoundTitle: "Not in pokedex",
    notFoundDesc: "AI replied:",
    notFoundHint: "Try a clearer image",
    apiError: "Error occurred",
    apiErrorHint: "Check GEMINI_API_KEY in .env.local",
    open: "View",
    retry: "Try again",
    tryAgain: "Try again",
    confidence: "Confidence",
  },
  ja: {
    pickHow: "検索方法を選択",
    cameraTitle: "ライブカメラ",
    cameraDesc: "ポケモンにカメラを向けて — シャッターをタップ",
    uploadTitle: "画像アップロード",
    uploadDesc: "ファイル選択 — AIが即座に解析",
    cancel: "キャンセル",
    back: "← 戻る",
    capture: "撮影",
    flip: "切替",
    holdSteady: "🎯 ポケモンを枠に入れてシャッター",
    detecting: "🤖 AI 解析中...",
    cameraError: "カメラにアクセスできません",
    dropHere: "画像をここにドロップ",
    orClick: "クリックで選択",
    accept: "JPG · PNG · WebP — 最大10MB",
    analyze: "🔍 解析する",
    analyzing: "AI 解析中",
    aiHint: "Google Gemini Vision · 通常 2-4 秒",
    foundTitle: "ポケモン発見！",
    notFoundTitle: "図鑑にありません",
    notFoundDesc: "AIの返答:",
    notFoundHint: "もっと鮮明な画像で試してください",
    apiError: "エラー発生",
    apiErrorHint: "GEMINI_API_KEYを確認してください",
    open: "表示",
    retry: "再試行",
    tryAgain: "もう一度",
    confidence: "信頼度",
  },
};

// ═══════════════════════════════════════════════════════════════════════
// Image helpers
// ═══════════════════════════════════════════════════════════════════════

// Resize image to max dimension, return base64 (without data URL prefix)
function imageToBase64(img, maxSize = MAX_IMAGE_SIZE, quality = JPEG_QUALITY) {
  const w0 = img.naturalWidth || img.width;
  const h0 = img.naturalHeight || img.height;
  const scale = Math.min(1, maxSize / Math.max(w0, h0));
  const w = Math.round(w0 * scale);
  const h = Math.round(h0 * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  // White background for transparent PNGs (Claude handles RGB only well)
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  return dataUrl.split(",")[1];
}

// Capture center-crop square from video element → base64
function videoToBase64(video, maxSize = MAX_IMAGE_SIZE, quality = JPEG_QUALITY) {
  const size = Math.min(video.videoWidth, video.videoHeight);
  const sx = (video.videoWidth - size) / 2;
  const sy = (video.videoHeight - size) / 2;
  const dim = Math.min(maxSize, size);
  const canvas = document.createElement("canvas");
  canvas.width = dim;
  canvas.height = dim;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, sx, sy, size, size, 0, 0, dim, dim);
  return canvas.toDataURL("image/jpeg", quality).split(",")[1];
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = url;
  });
}

// ═══════════════════════════════════════════════════════════════════════
// API call
// ═══════════════════════════════════════════════════════════════════════
async function detectPokemon(base64Image) {
  const res = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: base64Image, mediaType: "image/jpeg" }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data; // { name: "charizard", raw: "Charizard" }
}

// ═══════════════════════════════════════════════════════════════════════
// Find Pokémon in loaded list by detected name
// ═══════════════════════════════════════════════════════════════════════
function findPokemonByName(loaded, detectedName) {
  if (!detectedName || detectedName === "unknown") return null;
  const n = detectedName.toLowerCase().trim();
  // Exact match
  let p = loaded.find(p => p.name === n);
  if (p) return p;
  // Match without dashes (e.g., "mrmime" → "mr-mime")
  const nClean = n.replace(/-/g, "");
  p = loaded.find(p => p.name.replace(/-/g, "") === nClean);
  if (p) return p;
  // Partial — name contains the detected string
  p = loaded.find(p => p.name.includes(n) || n.includes(p.name));
  return p || null;
}

// ═══════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════
export default function SnapSearch({ loaded, thaiArr, jpArr, lang, onOpen }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("picker"); // picker | camera | upload | analyzing | result | error
  const [result, setResult] = useState(null); // { name, raw, pokemon } | null
  const [errorMsg, setErrorMsg] = useState("");

  const t = TXT[lang] || TXT.en;

  const openModal = useCallback(() => {
    setOpen(true);
    setMode("picker");
    setResult(null);
    setErrorMsg("");
  }, []);

  const closeModal = useCallback(() => {
    setOpen(false);
    setMode("picker");
    setResult(null);
    setErrorMsg("");
  }, []);

  // Browser back-button trap
  useEffect(() => {
    if (!open) return;
    const onPop = () => closeModal();
    window.history.pushState({ snapV4: true }, "");
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      if (window.history.state?.snapV4) {
        try { window.history.back(); } catch {}
      }
    };
  }, [open, closeModal]);

  // The main analyze handler — used by both camera and upload
  const analyzeBase64 = useCallback(async (base64) => {
    setMode("analyzing");
    setErrorMsg("");
    try {
      const apiResult = await detectPokemon(base64);
      const pokemon = findPokemonByName(loaded, apiResult.name);
      setResult({
        name: apiResult.name,
        raw: apiResult.raw,
        pokemon,
      });
      setMode("result");
    } catch (e) {
      setErrorMsg(e.message || "Unknown error");
      setMode("error");
    }
  }, [loaded]);

  return (
    <>
      <button
        className="search-icon-btn snap-icon"
        onClick={openModal}
        title={t.pickHow}
        aria-label={t.pickHow}>
        📷
      </button>

      {open && createPortal(
        <div className="snap-v4-overlay" onClick={closeModal}>
          <div className="snap-v4-modal" onClick={e => e.stopPropagation()}>
            <button className="snap-v4-close" onClick={closeModal} aria-label="Close">✕</button>

            {mode === "picker" && (
              <ModePicker
                t={t}
                onPickCamera={() => setMode("camera")}
                onPickUpload={() => setMode("upload")}
              />
            )}

            {mode === "camera" && (
              <CameraView
                t={t}
                onCapture={analyzeBase64}
                onBack={() => setMode("picker")}
              />
            )}

            {mode === "upload" && (
              <UploadView
                t={t}
                onAnalyze={analyzeBase64}
                onBack={() => setMode("picker")}
              />
            )}

            {mode === "analyzing" && <AnalyzingView t={t} />}

            {mode === "result" && (
<ResultView
  t={t}
  result={result}
  lang={lang}
  thaiArr={thaiArr}
  jpArr={jpArr}
  onPick={(id) => {
    onOpen?.(id);
    setTimeout(() => closeModal(), 0);
  }}
  onRetry={() => {
    setResult(null);
    setMode("picker");
  }}
/>
            )}

            {mode === "error" && (
              <ErrorView
                t={t}
                message={errorMsg}
                onRetry={() => { setErrorMsg(""); setMode("picker"); }}
              />
            )}
          </div>
        </div>,
        document.body
      )}

      <SnapStyles />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Sub: Mode Picker
// ═══════════════════════════════════════════════════════════════════════
function ModePicker({ t, onPickCamera, onPickUpload }) {
  return (
    <div className="snap-v4-picker">
      <div className="snap-v4-picker-header">
        <div className="snap-v4-picker-icon">🤖</div>
        <h2 className="snap-v4-picker-title">{t.pickHow}</h2>
        <div className="snap-v4-picker-sub">Powered by Google Gemini Vision</div>
      </div>

      <div className="snap-v4-picker-cards">
        <button className="snap-v4-card snap-v4-card-camera" onClick={onPickCamera}>
          <div className="snap-v4-card-icon-wrap">
            <div className="snap-v4-card-icon">🎥</div>
            <div className="snap-v4-card-pulse" />
          </div>
          <div className="snap-v4-card-title">{t.cameraTitle}</div>
          <div className="snap-v4-card-desc">{t.cameraDesc}</div>
          <div className="snap-v4-card-badge">⚡ LIVE</div>
        </button>

        <button className="snap-v4-card snap-v4-card-upload" onClick={onPickUpload}>
          <div className="snap-v4-card-icon-wrap">
            <div className="snap-v4-card-icon">🖼️</div>
            <div className="snap-v4-card-pulse" />
          </div>
          <div className="snap-v4-card-title">{t.uploadTitle}</div>
          <div className="snap-v4-card-desc">{t.uploadDesc}</div>
          <div className="snap-v4-card-badge">🎯 AI</div>
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Sub: Camera View
// ═══════════════════════════════════════════════════════════════════════
function CameraView({ t, onCapture, onBack }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const flashRef = useRef(null);

  const [facingMode, setFacingMode] = useState("environment");
  const [error, setError] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    setError(null);
    setReady(false);

    async function start() {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (!active) { s.getTracks().forEach(tr => tr.stop()); return; }
        streamRef.current = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play().catch(() => {});
          setReady(true);
        }
      } catch (e) {
        if (active) setError(t.cameraError);
      }
    }
    start();

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(tr => tr.stop());
        streamRef.current = null;
      }
    };
  }, [facingMode, t.cameraError]);

  const handleCapture = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;

    // Flash + sound effect
    if (flashRef.current) {
      flashRef.current.classList.remove("snap-v4-flash-anim");
      void flashRef.current.offsetWidth;
      flashRef.current.classList.add("snap-v4-flash-anim");
    }
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = 900;
      gain.gain.value = 0.07;
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.08);
    } catch { /* silent */ }

    const base64 = videoToBase64(v);
    setTimeout(() => onCapture(base64), 250); // small delay for flash
  }, [onCapture]);

  if (error) {
    return (
      <div className="snap-v4-camera-error">
        <div className="snap-v4-camera-error-icon">🚫</div>
        <div className="snap-v4-camera-error-text">{error}</div>
        <button className="snap-v4-btn snap-v4-btn-ghost" onClick={onBack}>{t.back}</button>
      </div>
    );
  }

  return (
    <div className="snap-v4-camera">
      <div className="snap-v4-camera-stage">
        <video ref={videoRef} className="snap-v4-video" playsInline muted autoPlay />

        <div className="snap-v4-guide">
          <div className="snap-v4-guide-corner snap-v4-guide-tl" />
          <div className="snap-v4-guide-corner snap-v4-guide-tr" />
          <div className="snap-v4-guide-corner snap-v4-guide-bl" />
          <div className="snap-v4-guide-corner snap-v4-guide-br" />
        </div>

        <div className="snap-v4-camera-topbar">
          <button className="snap-v4-back-btn" onClick={onBack}>{t.back}</button>
          <button
            className="snap-v4-flip-btn"
            onClick={() => setFacingMode(f => f === "user" ? "environment" : "user")}>
            🔄 {t.flip}
          </button>
        </div>

        {ready && <div className="snap-v4-hint-banner">{t.holdSteady}</div>}

        <div ref={flashRef} className="snap-v4-flash" />
      </div>

      <div className="snap-v4-camera-bottombar">
        <button
          className="snap-v4-shutter"
          onClick={handleCapture}
          disabled={!ready}
          aria-label={t.capture}>
          <div className="snap-v4-shutter-inner" />
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Sub: Upload View
// ═══════════════════════════════════════════════════════════════════════
function UploadView({ t, onAnalyze, onBack }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("Max 10MB");
      return;
    }
    setPreview(URL.createObjectURL(file));
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const startAnalyze = useCallback(async () => {
    if (!preview) return;
    try {
      const img = await loadImage(preview);
      const base64 = imageToBase64(img);
      onAnalyze(base64);
    } catch (e) {
      alert("Failed to load image: " + e.message);
    }
  }, [preview, onAnalyze]);

  return (
    <div className="snap-v4-upload">
      <div className="snap-v4-upload-header">
        <button className="snap-v4-back-btn-inline" onClick={onBack}>{t.back}</button>
        <h2 className="snap-v4-upload-title">{t.uploadTitle}</h2>
      </div>

      {!preview && (
        <div
          className={`snap-v4-drop ${dragOver ? "snap-v4-drop-over" : ""}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}>
          <div className="snap-v4-drop-icon">🖼️</div>
          <div className="snap-v4-drop-title">{t.dropHere}</div>
          <div className="snap-v4-drop-sub">{t.orClick}</div>
          <div className="snap-v4-drop-accept">{t.accept}</div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </div>
      )}

      {preview && (
        <div className="snap-v4-preview-wrap">
          <div className="snap-v4-preview-frame">
            <img src={preview} alt="preview" className="snap-v4-preview-img" />
          </div>
          <div className="snap-v4-preview-actions">
            <button className="snap-v4-btn snap-v4-btn-ghost" onClick={() => setPreview(null)}>
              {t.retry}
            </button>
            <button className="snap-v4-btn snap-v4-btn-primary" onClick={startAnalyze}>
              {t.analyze}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Sub: Analyzing View (loading)
// ═══════════════════════════════════════════════════════════════════════
function AnalyzingView({ t }) {
  return (
    <div className="snap-v4-analyzing">
      <div className="snap-v4-ai-bubble">
        <div className="snap-v4-ai-icon">🤖</div>
        <div className="snap-v4-ai-pulse-1" />
        <div className="snap-v4-ai-pulse-2" />
      </div>
      <div className="snap-v4-analyzing-title">{t.detecting}</div>
      <div className="snap-v4-analyzing-hint">{t.aiHint}</div>
      <div className="snap-v4-dots">
        <div className="snap-v4-dot" />
        <div className="snap-v4-dot" />
        <div className="snap-v4-dot" />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Sub: Result View
// ═══════════════════════════════════════════════════════════════════════
function ResultView({ t, result, lang, thaiArr, jpArr, onPick, onRetry }) {
  if (!result) return null;

  const { name, raw, pokemon } = result;

  // Pokemon found in loaded list — show full info
  if (pokemon) {
    const types = pokemon.types?.map(t => t.type.name) ?? [];
    const tc1 = typeColor(types[0] || "normal");
    const tc2 = typeColor(types[1] || types[0] || "normal");
    const localName = getLocalName(pokemon, lang, thaiArr, jpArr);

    return (
      <div className="snap-v4-result snap-v4-result-found">
        <div className="snap-v4-result-confetti">✨ 🎉 ✨</div>
        <h2 className="snap-v4-result-title">{t.foundTitle}</h2>

        <div
          className="snap-v4-result-card"
          style={{ background: `linear-gradient(135deg, ${tc1}30, ${tc2}30)` }}>
          <div className="snap-v4-result-img-wrap">
            <img
  src={
    pokemon?.sprites?.other?.["official-artwork"]?.front_default ||
    pokemon?.sprites?.front_default ||
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.id}.png`
  }
  alt={localName}
  className="snap-v4-result-img"
/>
          </div>
          <div className="snap-v4-result-id">#{padId(pokemon.id)}</div>
          <div className="snap-v4-result-name">{localName}</div>
          <div className="snap-v4-result-types">
            {types.map(tn => (
              <span
                key={tn}
                className="snap-v4-result-type"
                style={{ background: typeColor(tn) }}>
                {tn}
              </span>
            ))}
          </div>
        </div>

        <div className="snap-v4-result-actions">
          <button className="snap-v4-btn snap-v4-btn-ghost" onClick={onRetry}>
            {t.tryAgain}
          </button>
          <button
            className="snap-v4-btn snap-v4-btn-primary"
            onClick={() => onPick(pokemon.id)}>
            📖 {t.open}
          </button>
        </div>
      </div>
    );
  }

  // Pokemon name returned by AI but not in pokedex list
  return (
    <div className="snap-v4-result snap-v4-result-notfound">
      <div className="snap-v4-result-confused-icon">🤔</div>
      <h2 className="snap-v4-result-title">{t.notFoundTitle}</h2>
      <div className="snap-v4-result-desc">{t.notFoundDesc}</div>
      <div className="snap-v4-result-rawname">"{raw || name}"</div>
      <div className="snap-v4-result-hint">{t.notFoundHint}</div>
      <button className="snap-v4-btn snap-v4-btn-primary" onClick={onRetry}>
        {t.tryAgain}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Sub: Error View
// ═══════════════════════════════════════════════════════════════════════
function ErrorView({ t, message, onRetry }) {
  return (
    <div className="snap-v4-result snap-v4-result-error">
      <div className="snap-v4-result-confused-icon">⚠️</div>
      <h2 className="snap-v4-result-title">{t.apiError}</h2>
      <div className="snap-v4-result-error-msg">{message}</div>
      <div className="snap-v4-result-hint">{t.apiErrorHint}</div>
      <button className="snap-v4-btn snap-v4-btn-primary" onClick={onRetry}>
        {t.tryAgain}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Scoped Styles
// ═══════════════════════════════════════════════════════════════════════
function SnapStyles() {
  return (
    <style>{`
      .snap-v4-overlay {
        position: fixed; inset: 0;
        background: rgba(8, 12, 24, 0.85);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        z-index: 10000;
        display: flex; align-items: center; justify-content: center;
        padding: 16px;
        animation: snapv4-overlay-in 0.3s ease;
      }
      @keyframes snapv4-overlay-in { from { opacity: 0; } to { opacity: 1; } }

      .snap-v4-modal {
        position: relative;
        width: 100%;
        max-width: 720px;
        max-height: 92vh;
        background: linear-gradient(160deg, #1a1f3a 0%, #0e1228 100%);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 28px;
        box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6);
        overflow: hidden;
        display: flex; flex-direction: column;
        animation: snapv4-modal-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        color: white;
      }
      @keyframes snapv4-modal-in {
        from { transform: scale(0.9) translateY(20px); opacity: 0; }
        to   { transform: scale(1) translateY(0); opacity: 1; }
      }

      .snap-v4-close {
        position: absolute;
        top: 14px; right: 14px;
        width: 36px; height: 36px;
        border-radius: 50%;
        border: 1px solid rgba(255, 255, 255, 0.2);
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(8px);
        color: white;
        font-size: 16px; font-weight: 700;
        cursor: pointer;
        z-index: 100;
        transition: all 0.2s;
      }
      .snap-v4-close:hover {
        background: rgba(239, 68, 68, 0.6);
        transform: scale(1.1) rotate(90deg);
      }

      /* ─── Picker ─── */
      .snap-v4-picker { padding: 36px 28px 32px; }
      .snap-v4-picker-header { text-align: center; margin-bottom: 28px; }
      .snap-v4-picker-icon {
        font-size: 52px; margin-bottom: 8px;
        filter: drop-shadow(0 6px 14px rgba(168, 85, 247, 0.4));
        animation: snapv4-icon-bob 3s ease-in-out infinite;
      }
      @keyframes snapv4-icon-bob {
        0%, 100% { transform: translateY(0); }
        50%      { transform: translateY(-6px); }
      }
      .snap-v4-picker-title {
        font-size: 26px; font-weight: 900; margin: 0;
        background: linear-gradient(135deg, #fff 0%, #c7d2fe 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      .snap-v4-picker-sub {
        margin-top: 6px;
        font-size: 11.5px;
        opacity: 0.6;
        letter-spacing: 0.7px;
        text-transform: uppercase;
        font-weight: 700;
      }

      .snap-v4-picker-cards {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }
      .snap-v4-card {
        position: relative;
        padding: 28px 20px 24px;
        background: rgba(255, 255, 255, 0.05);
        border: 2px solid rgba(255, 255, 255, 0.12);
        border-radius: 22px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        color: white;
        font-family: inherit;
        text-align: center;
        overflow: hidden;
      }
      .snap-v4-card::before {
        content: ""; position: absolute; inset: 0;
        background: var(--card-grad); opacity: 0;
        transition: opacity 0.3s; z-index: 0;
      }
      .snap-v4-card > * { position: relative; z-index: 1; }
      .snap-v4-card-camera {
        --card-grad: linear-gradient(135deg, rgba(20, 184, 166, 0.25), rgba(6, 182, 212, 0.25));
      }
      .snap-v4-card-upload {
        --card-grad: linear-gradient(135deg, rgba(168, 85, 247, 0.25), rgba(236, 72, 153, 0.25));
      }
      .snap-v4-card:hover {
        transform: translateY(-6px) scale(1.02);
        border-color: rgba(255, 255, 255, 0.3);
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
      }
      .snap-v4-card:hover::before { opacity: 1; }
      .snap-v4-card-camera:hover { border-color: rgb(20, 184, 166); }
      .snap-v4-card-upload:hover { border-color: rgb(168, 85, 247); }

      .snap-v4-card-icon-wrap {
        position: relative;
        display: inline-flex;
        margin-bottom: 14px;
      }
      .snap-v4-card-icon {
        font-size: 56px;
        filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.4));
        position: relative; z-index: 2;
      }
      .snap-v4-card-pulse {
        position: absolute; inset: -8px;
        border-radius: 50%;
        animation: snapv4-card-pulse 2s ease-in-out infinite;
      }
      @keyframes snapv4-card-pulse {
        0%, 100% { transform: scale(0.9); opacity: 0.4; }
        50%      { transform: scale(1.2); opacity: 0.8; }
      }
      .snap-v4-card-camera .snap-v4-card-pulse {
        background: radial-gradient(circle, rgba(20, 184, 166, 0.45), transparent 70%);
      }
      .snap-v4-card-upload .snap-v4-card-pulse {
        background: radial-gradient(circle, rgba(168, 85, 247, 0.45), transparent 70%);
      }
      .snap-v4-card-title { font-size: 20px; font-weight: 800; margin-bottom: 6px; }
      .snap-v4-card-desc { font-size: 12.5px; line-height: 1.5; opacity: 0.78; margin-bottom: 14px; }
      .snap-v4-card-badge {
        display: inline-block;
        padding: 5px 12px;
        border-radius: 999px;
        font-size: 10.5px; font-weight: 900;
        letter-spacing: 1px;
        background: rgba(0, 0, 0, 0.4);
        border: 1px solid rgba(255, 255, 255, 0.2);
      }
      .snap-v4-card-camera .snap-v4-card-badge {
        background: linear-gradient(135deg, rgba(20, 184, 166, 0.4), rgba(6, 182, 212, 0.4));
        color: #99f6e4;
        border-color: rgba(20, 184, 166, 0.5);
      }
      .snap-v4-card-upload .snap-v4-card-badge {
        background: linear-gradient(135deg, rgba(168, 85, 247, 0.4), rgba(236, 72, 153, 0.4));
        color: #f0abfc;
        border-color: rgba(168, 85, 247, 0.5);
      }

      /* ─── Camera ─── */
      .snap-v4-camera {
        display: flex; flex-direction: column;
        width: 100%;
        height: min(85vh, 720px);
        min-height: 500px;
      }
      .snap-v4-camera-stage {
        position: relative;
        flex: 1 1 0;
        min-height: 360px;
        overflow: hidden;
        background: #000;
      }
      .snap-v4-video {
        position: absolute; inset: 0;
        width: 100%; height: 100%;
        object-fit: cover;
        background: #000;
      }
      .snap-v4-camera-topbar {
        position: absolute;
        top: 12px; left: 12px; right: 60px;
        display: flex; justify-content: space-between;
        z-index: 5; pointer-events: none;
      }
      .snap-v4-camera-topbar > * { pointer-events: auto; }
      .snap-v4-back-btn, .snap-v4-flip-btn {
        padding: 8px 14px;
        background: rgba(0, 0, 0, 0.55);
        backdrop-filter: blur(8px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: white;
        font-size: 12.5px; font-weight: 700;
        border-radius: 999px;
        cursor: pointer;
        font-family: inherit;
      }
      .snap-v4-back-btn:hover, .snap-v4-flip-btn:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .snap-v4-guide {
        position: absolute;
        top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        width: min(75%, 380px);
        aspect-ratio: 1;
        pointer-events: none;
        z-index: 3;
      }
      .snap-v4-guide-corner {
        position: absolute;
        width: 32px; height: 32px;
        border: 3px solid rgba(255, 255, 255, 0.85);
        box-shadow: 0 0 12px rgba(20, 184, 166, 0.5);
      }
      .snap-v4-guide-tl { top: 0; left: 0; border-right: none; border-bottom: none; border-top-left-radius: 8px; }
      .snap-v4-guide-tr { top: 0; right: 0; border-left: none; border-bottom: none; border-top-right-radius: 8px; }
      .snap-v4-guide-bl { bottom: 0; left: 0; border-right: none; border-top: none; border-bottom-left-radius: 8px; }
      .snap-v4-guide-br { bottom: 0; right: 0; border-left: none; border-top: none; border-bottom-right-radius: 8px; }

      .snap-v4-hint-banner {
        position: absolute;
        bottom: 24px; left: 50%;
        transform: translateX(-50%);
        padding: 10px 20px;
        background: rgba(0, 0, 0, 0.65);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 999px;
        font-size: 13px;
        font-weight: 700;
        z-index: 4;
        white-space: nowrap;
        max-width: 90%;
        overflow: hidden; text-overflow: ellipsis;
      }

      .snap-v4-camera-bottombar {
        padding: 22px 0 28px;
        background: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.35) 100%);
        display: flex; justify-content: center;
        flex-shrink: 0;
      }
      .snap-v4-shutter {
        width: 80px; height: 80px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.15);
        border: 4px solid rgba(255, 255, 255, 0.85);
        cursor: pointer;
        padding: 0;
        display: flex; align-items: center; justify-content: center;
        transition: all 0.15s;
        font-family: inherit;
      }
      .snap-v4-shutter:disabled { opacity: 0.4; cursor: not-allowed; }
      .snap-v4-shutter:hover:not(:disabled) {
        transform: scale(1.06);
        box-shadow: 0 0 24px rgba(255, 255, 255, 0.4);
      }
      .snap-v4-shutter:active:not(:disabled) { transform: scale(0.95); }
      .snap-v4-shutter-inner {
        width: 64px; height: 64px;
        border-radius: 50%;
        background: white;
        transition: all 0.15s;
      }
      .snap-v4-shutter:active:not(:disabled) .snap-v4-shutter-inner {
        background: #f87171;
        transform: scale(0.92);
      }

      .snap-v4-flash {
        position: absolute; inset: 0;
        background: white;
        opacity: 0;
        pointer-events: none;
        z-index: 10;
      }
      .snap-v4-flash-anim {
        animation: snapv4-flash-anim 0.4s ease;
      }
      @keyframes snapv4-flash-anim {
        0%   { opacity: 0; }
        15%  { opacity: 1; }
        100% { opacity: 0; }
      }

      .snap-v4-camera-error {
        padding: 60px 28px;
        text-align: center;
      }
      .snap-v4-camera-error-icon { font-size: 56px; margin-bottom: 14px; }
      .snap-v4-camera-error-text {
        font-size: 15px; font-weight: 700;
        margin-bottom: 24px;
        line-height: 1.5;
        opacity: 0.9;
      }

      /* ─── Upload ─── */
      .snap-v4-upload { padding: 24px 28px 32px; }
      .snap-v4-upload-header {
        display: flex; align-items: center; gap: 14px;
        margin-bottom: 20px;
      }
      .snap-v4-back-btn-inline {
        padding: 8px 14px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: white;
        font-size: 12.5px; font-weight: 700;
        border-radius: 999px;
        cursor: pointer;
        font-family: inherit;
        transition: all 0.18s;
      }
      .snap-v4-back-btn-inline:hover { background: rgba(255, 255, 255, 0.18); }
      .snap-v4-upload-title {
        margin: 0;
        font-size: 22px; font-weight: 800;
        background: linear-gradient(135deg, #fff 0%, #f0abfc 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .snap-v4-drop {
        border: 3px dashed rgba(168, 85, 247, 0.45);
        background: linear-gradient(135deg, rgba(168, 85, 247, 0.08), rgba(236, 72, 153, 0.04));
        border-radius: 22px;
        padding: 50px 24px;
        text-align: center;
        cursor: pointer;
        transition: all 0.3s;
        position: relative;
        overflow: hidden;
      }
      .snap-v4-drop::before {
        content: "";
        position: absolute; inset: 0;
        background: radial-gradient(circle at center, rgba(168, 85, 247, 0.15), transparent 65%);
        opacity: 0;
        transition: opacity 0.3s;
      }
      .snap-v4-drop:hover, .snap-v4-drop-over {
        border-color: rgba(168, 85, 247, 0.9);
        border-style: solid;
        transform: translateY(-2px);
      }
      .snap-v4-drop:hover::before, .snap-v4-drop-over::before { opacity: 1; }
      .snap-v4-drop > * { position: relative; z-index: 1; }
      .snap-v4-drop-icon {
        font-size: 64px; margin-bottom: 14px;
        filter: drop-shadow(0 8px 18px rgba(168, 85, 247, 0.4));
        animation: snapv4-icon-bob 3s ease-in-out infinite;
      }
      .snap-v4-drop-title { font-size: 20px; font-weight: 900; margin-bottom: 4px; }
      .snap-v4-drop-sub { font-size: 13px; opacity: 0.75; margin-bottom: 14px; }
      .snap-v4-drop-accept {
        display: inline-block;
        padding: 4px 12px;
        background: rgba(0, 0, 0, 0.4);
        border-radius: 999px;
        font-size: 10.5px; font-weight: 700;
        opacity: 0.75; letter-spacing: 0.4px;
      }

      .snap-v4-preview-wrap {
        display: flex; flex-direction: column;
        align-items: center; gap: 18px;
      }
      .snap-v4-preview-frame {
        padding: 8px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 16px;
      }
      .snap-v4-preview-img {
        max-width: 320px;
        max-height: 320px;
        object-fit: contain;
        border-radius: 10px;
        display: block;
      }
      .snap-v4-preview-actions {
        display: flex; gap: 10px;
      }

      /* ─── Buttons ─── */
      .snap-v4-btn {
        padding: 12px 24px;
        border: none;
        border-radius: 999px;
        font-size: 14px; font-weight: 800;
        cursor: pointer;
        font-family: inherit;
        transition: all 0.2s;
        letter-spacing: 0.3px;
      }
      .snap-v4-btn-primary {
        background: linear-gradient(135deg, #a855f7, #ec4899);
        color: white;
        box-shadow: 0 6px 18px rgba(168, 85, 247, 0.4);
      }
      .snap-v4-btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 26px rgba(168, 85, 247, 0.55);
      }
      .snap-v4-btn-ghost {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.18);
        color: white;
      }
      .snap-v4-btn-ghost:hover { background: rgba(255, 255, 255, 0.18); }

      /* ─── Analyzing (AI thinking) ─── */
      .snap-v4-analyzing {
        padding: 70px 28px 60px;
        text-align: center;
      }
      .snap-v4-ai-bubble {
        position: relative;
        display: inline-flex;
        align-items: center; justify-content: center;
        width: 140px; height: 140px;
        margin-bottom: 28px;
      }
      .snap-v4-ai-icon {
        font-size: 72px;
        z-index: 3;
        filter: drop-shadow(0 6px 14px rgba(168, 85, 247, 0.6));
        animation: snapv4-ai-think 1.8s ease-in-out infinite;
      }
      @keyframes snapv4-ai-think {
        0%, 100% { transform: rotate(-5deg) scale(1); }
        50%      { transform: rotate(5deg) scale(1.08); }
      }
      .snap-v4-ai-pulse-1, .snap-v4-ai-pulse-2 {
        position: absolute; inset: 0;
        border-radius: 50%;
        border: 2px solid rgba(168, 85, 247, 0.6);
      }
      .snap-v4-ai-pulse-1 { animation: snapv4-pulse-ring 2s ease-out infinite; }
      .snap-v4-ai-pulse-2 { animation: snapv4-pulse-ring 2s ease-out 0.7s infinite; }
      @keyframes snapv4-pulse-ring {
        0%   { transform: scale(0.7); opacity: 0.9; }
        100% { transform: scale(1.6); opacity: 0; }
      }
      .snap-v4-analyzing-title {
        font-size: 19px; font-weight: 800;
        margin-bottom: 8px;
        background: linear-gradient(135deg, #fff, #c7d2fe);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      .snap-v4-analyzing-hint {
        font-size: 12px;
        opacity: 0.65;
        margin-bottom: 22px;
      }
      .snap-v4-dots {
        display: flex; justify-content: center; gap: 8px;
      }
      .snap-v4-dot {
        width: 10px; height: 10px;
        border-radius: 50%;
        background: linear-gradient(135deg, #a855f7, #ec4899);
        animation: snapv4-dot-bounce 1.2s ease-in-out infinite;
      }
      .snap-v4-dot:nth-child(2) { animation-delay: 0.15s; }
      .snap-v4-dot:nth-child(3) { animation-delay: 0.3s; }
      @keyframes snapv4-dot-bounce {
        0%, 100% { transform: scale(0.7); opacity: 0.5; }
        50%      { transform: scale(1.2); opacity: 1; }
      }

      /* ─── Result View ─── */
      .snap-v4-result {
        padding: 36px 28px 32px;
        text-align: center;
      }
      .snap-v4-result-confetti {
        font-size: 22px; letter-spacing: 8px;
        margin-bottom: 8px;
        animation: snapv4-confetti 1.2s ease-out;
      }
      @keyframes snapv4-confetti {
        0%   { transform: scale(0.5) rotate(-20deg); opacity: 0; }
        50%  { transform: scale(1.2) rotate(10deg); opacity: 1; }
        100% { transform: scale(1) rotate(0); opacity: 1; }
      }
      .snap-v4-result-title {
        font-size: 24px; font-weight: 900; margin: 0 0 22px;
        background: linear-gradient(135deg, #fff, #99f6e4);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      .snap-v4-result-card {
        padding: 24px;
        border-radius: 20px;
        border: 1.5px solid rgba(255, 255, 255, 0.15);
        margin-bottom: 22px;
        animation: snapv4-card-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      @keyframes snapv4-card-pop {
        from { transform: scale(0.85); opacity: 0; }
        to   { transform: scale(1); opacity: 1; }
      }
      .snap-v4-result-img-wrap {
        width: 180px; height: 180px;
        margin: 0 auto 12px;
        display: flex; align-items: center; justify-content: center;
      }
      .snap-v4-result-img {
        max-width: 100%; max-height: 100%;
        object-fit: contain;
        filter: drop-shadow(0 12px 22px rgba(0, 0, 0, 0.4));
        animation: snapv4-img-bob 3s ease-in-out infinite;
      }
      @keyframes snapv4-img-bob {
        0%, 100% { transform: translateY(0); }
        50%      { transform: translateY(-8px); }
      }
      .snap-v4-result-id {
        font-size: 12px;
        opacity: 0.65;
        font-weight: 800;
        letter-spacing: 1.5px;
        margin-bottom: 2px;
      }
      .snap-v4-result-name {
        font-size: 30px; font-weight: 900;
        text-transform: capitalize;
        margin-bottom: 12px;
        line-height: 1.1;
        text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
      }
      .snap-v4-result-types {
        display: flex; justify-content: center; gap: 6px;
      }
      .snap-v4-result-type {
        padding: 5px 14px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: white;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
        box-shadow: 0 3px 8px rgba(0, 0, 0, 0.25);
      }
      .snap-v4-result-actions {
        display: flex; justify-content: center; gap: 10px;
      }

      /* not-found / error states */
      .snap-v4-result-notfound, .snap-v4-result-error { padding: 50px 28px 32px; }
      .snap-v4-result-confused-icon {
        font-size: 72px;
        margin-bottom: 18px;
        filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.4));
      }
      .snap-v4-result-desc {
        font-size: 14px;
        opacity: 0.7;
        margin-bottom: 8px;
      }
      .snap-v4-result-rawname {
        font-size: 22px; font-weight: 800;
        text-transform: capitalize;
        margin-bottom: 14px;
        color: #f0abfc;
        text-shadow: 0 2px 6px rgba(168, 85, 247, 0.5);
      }
      .snap-v4-result-hint {
        font-size: 13px;
        opacity: 0.55;
        margin-bottom: 22px;
      }
      .snap-v4-result-error-msg {
        font-size: 13px;
        padding: 10px 16px;
        background: rgba(239, 68, 68, 0.15);
        border: 1px solid rgba(239, 68, 68, 0.35);
        border-radius: 12px;
        margin-bottom: 14px;
        color: #fecaca;
        font-family: ui-monospace, "SF Mono", Menlo, monospace;
        word-break: break-word;
      }

      /* ─── Mobile ─── */
      @media (max-width: 720px) {
        .snap-v4-modal { max-height: 96vh; border-radius: 22px; }
        .snap-v4-picker { padding: 28px 20px 24px; }
        .snap-v4-picker-cards { grid-template-columns: 1fr; }
        .snap-v4-picker-title { font-size: 22px; }
        .snap-v4-picker-icon { font-size: 44px; }

        .snap-v4-card { padding: 22px 16px 20px; }
        .snap-v4-card-icon { font-size: 44px; }
        .snap-v4-card-title { font-size: 18px; }

        .snap-v4-camera { height: 100vh; max-height: 96vh; min-height: 400px; }
        .snap-v4-guide { width: min(80%, 320px); }
        .snap-v4-guide-corner { width: 24px; height: 24px; border-width: 2.5px; }
        .snap-v4-shutter { width: 70px; height: 70px; border-width: 3px; }
        .snap-v4-shutter-inner { width: 54px; height: 54px; }

        .snap-v4-upload { padding: 20px 18px 24px; }
        .snap-v4-drop { padding: 36px 18px; }
        .snap-v4-drop-icon { font-size: 50px; }
        .snap-v4-drop-title { font-size: 17px; }
        .snap-v4-preview-img { max-width: 240px; max-height: 240px; }

        .snap-v4-result-img-wrap { width: 140px; height: 140px; }
        .snap-v4-result-name { font-size: 24px; }
      }
    `}</style>
  );
}