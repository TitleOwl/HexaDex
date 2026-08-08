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
import { Camera } from "lucide-react";
import { typeColor, getArt, getLocalName, padId, playCry, isSoundEnabled } from "../utils.js";

const API_ENDPOINT = "/api/detect-pokemon";
const MAX_IMAGE_SIZE = 768;
const JPEG_QUALITY = 0.85;

// ─── Perceptual hash cache — avoids repeat API calls for same Pokemon ───
// Persists for the lifetime of the browser tab session
const SCAN_CACHE = new Map(); // pHash → { name, raw, ts }
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const PHASH_THRESHOLD = 10; // Hamming distance < 10/64 bits = same image

function computePhash(video) {
  const c = document.createElement("canvas");
  c.width = 8; c.height = 8;
  c.getContext("2d").drawImage(video, 0, 0, 8, 8);
  const px = c.getContext("2d").getImageData(0, 0, 8, 8).data;
  const gray = [];
  let sum = 0;
  for (let i = 0; i < 64; i++) {
    const g = px[i * 4] * 0.299 + px[i * 4 + 1] * 0.587 + px[i * 4 + 2] * 0.114;
    gray.push(g); sum += g;
  }
  const avg = sum / 64;
  return gray.map(g => g >= avg ? "1" : "0").join("");
}

function lookupCache(hash) {
  const now = Date.now();
  for (const [h, val] of SCAN_CACHE) {
    if (now - val.ts > CACHE_TTL) { SCAN_CACHE.delete(h); continue; }
    let d = 0;
    for (let i = 0; i < 64; i++) if (h[i] !== hash[i]) d++;
    if (d < PHASH_THRESHOLD) return val;
  }
  return null;
}

function writeCache(hash, result) {
  if (SCAN_CACHE.size >= 50) {
    // Evict oldest entry
    const oldest = [...SCAN_CACHE.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
    SCAN_CACHE.delete(oldest[0]);
  }
  SCAN_CACHE.set(hash, { ...result, ts: Date.now() });
}

// ───── Localized strings ─────
const TXT = {
  th: {
    pickHow: "เลือกวิธีค้นหา",
    cameraTitle: "ใช้กล้องสด",
    cameraDesc: "เปิดกล้องเล็งโปเกม่อน — สแกนอัตโนมัติ",
    uploadTitle: "อัพโหลดรูป",
    uploadDesc: "เลือกรูปจากเครื่อง — AI วิเคราะห์ทันที",
    soundTitle: "ค้นหาด้วยเสียง",
    soundDesc: "เล่นเสียงร้องโปเกม่อนใกล้ไมค์ — AI ระบุชื่อทันที",
    soundHint: "กดไมค์ แล้วเล่นเสียงร้องโปเกม่อนให้ได้ยิน",
    soundListening: "🎙 กำลังฟัง... เล่นเสียงร้องได้เลย",
    soundDone: "✅ ได้ยินแล้ว — กำลังวิเคราะห์...",
    soundMicError: "ไม่สามารถเข้าถึงไมค์ได้ — โปรดอนุญาตในเบราว์เซอร์",
    soundStop: "หยุดฟัง",
    cancel: "ยกเลิก",
    back: "← ย้อนกลับ",
    capture: "ถ่ายด่วน",
    flip: "สลับกล้อง",
    scanReady: "🎯 เล็งกล้องไปที่โปเกม่อน",
    scanning: "🔍 สแกนหาโปเกม่อน...",
    scanFound: "✨ ตรวจพบ! กำลังเปิดข้อมูล...",
    scanTip: "ถือกล้องนิ่งๆ เมื่อโปเกม่อนอยู่ในกรอบ",
    scanFocusing: "🔍 โฟกัส... อย่าขยับ",
    quotaWait: "⏳ API เต็ม — รอ 1 นาทีแล้วลองใหม่",
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
    soundTitle: "Sound Search",
    soundDesc: "Play a Pokémon cry near the mic — AI identifies instantly",
    soundHint: "Tap mic, then play a Pokémon cry nearby",
    soundListening: "🎙 Listening... play the cry now",
    soundDone: "✅ Got it — analyzing...",
    soundMicError: "Can't access microphone — please allow permission",
    soundStop: "Stop",
    cancel: "Cancel",
    back: "← Back",
    capture: "Quick Shot",
    flip: "Flip",
    scanReady: "🎯 Point camera at a Pokémon",
    scanning: "🔍 Scanning for Pokémon...",
    scanFound: "✨ Detected! Opening info...",
    scanTip: "Hold steady — scan triggers automatically",
    scanFocusing: "🔍 Focusing... hold still",
    quotaWait: "⏳ API quota full — retrying in 1 min",
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
    soundTitle: "鳴き声で検索",
    soundDesc: "マイクにポケモンの鳴き声を聞かせて — AIが即座に識別",
    soundHint: "マイクを押して、近くでポケモンの鳴き声を再生",
    soundListening: "🎙 聞いています... 鳴き声を再生してください",
    soundDone: "✅ 受信完了 — 解析中...",
    soundMicError: "マイクにアクセスできません",
    soundStop: "停止",
    cancel: "キャンセル",
    back: "← 戻る",
    capture: "即撮影",
    flip: "切替",
    scanReady: "🎯 ポケモンにカメラを向けて",
    scanning: "🔍 スキャン中...",
    scanFound: "✨ 検出！情報を開いています...",
    scanTip: "静止するとスキャンが始まります",
    scanFocusing: "🔍 フォーカス中... 静止してください",
    quotaWait: "⏳ API制限中 — 1分後に再試行",
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

function blobToBase64(blob) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(",")[1]);
    reader.readAsDataURL(blob);
  });
}

// ═══════════════════════════════════════════════════════════════════════
// API call
// ═══════════════════════════════════════════════════════════════════════
async function detectPokemon(base64Image, mediaType = "image/jpeg") {
  const res = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: base64Image, mediaType }),
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.isQuota = res.status === 429 ||
      (data.error || "").toLowerCase().includes("quota") ||
      (data.error || "").toLowerCase().includes("rate");
    throw err;
  }
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
      // replaceState instead of back() — avoids firing popstate which
      // would trigger App.jsx's global trap and close any open modal
      if (window.history.state?.snapV4) {
        try { window.history.replaceState(null, ""); } catch {}
      }
    };
  }, [open, closeModal]);

  // Auto-scan result handler — called by CameraView when it detects a Pokemon
  // without the user pressing the shutter (API call already done in background)
  const handleAutoResult = useCallback((apiResult) => {
    const pokemon = findPokemonByName(loaded, apiResult.name);
    setResult({ name: apiResult.name, raw: apiResult.raw, pokemon });
    setMode("result");
  }, [loaded]);

  // The main analyze handler — used by camera (manual), upload, and sound
  // phash: optional perceptual hash for cache (images only)
  // mediaType: defaults to image/jpeg, pass audio/* for sound mode
  const analyzeBase64 = useCallback(async (base64, phash = null, mediaType = "image/jpeg") => {
    // Cache hit (images only) → skip API entirely
    if (phash && !mediaType.startsWith("audio/")) {
      const cached = lookupCache(phash);
      if (cached) {
        const pokemon = findPokemonByName(loaded, cached.name);
        setResult({ name: cached.name, raw: cached.raw, pokemon });
        setMode("result");
        return;
      }
    }
    setMode("analyzing");
    setErrorMsg("");
    try {
      const apiResult = await detectPokemon(base64, mediaType);
      if (phash && !mediaType.startsWith("audio/") && apiResult.name !== "unknown") {
        writeCache(phash, apiResult);
      }
      const pokemon = findPokemonByName(loaded, apiResult.name);
      setResult({ name: apiResult.name, raw: apiResult.raw, pokemon });
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
        <Camera size={16} strokeWidth={2.4} />
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
                onPickSound={() => setMode("sound")}
              />
            )}

            {mode === "camera" && (
              <CameraView
                t={t}
                onCapture={analyzeBase64}
                onBack={() => setMode("picker")}
                onAutoResult={handleAutoResult}
              />
            )}

            {mode === "upload" && (
              <UploadView
                t={t}
                onAnalyze={analyzeBase64}
                onBack={() => setMode("picker")}
              />
            )}

            {mode === "sound" && (
              <SoundView
                t={t}
                onAnalyze={(base64, audioType) => analyzeBase64(base64, null, audioType)}
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
function ModePicker({ t, onPickCamera, onPickUpload, onPickSound }) {
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

        <button className="snap-v4-card snap-v4-card-sound" onClick={onPickSound}>
          <div className="snap-v4-card-icon-wrap">
            <div className="snap-v4-card-icon">🔊</div>
            <div className="snap-v4-card-pulse" />
          </div>
          <div className="snap-v4-card-title">{t.soundTitle}</div>
          <div className="snap-v4-card-desc">{t.soundDesc}</div>
          <div className="snap-v4-card-badge">🎵 CRY</div>
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Sub: Camera View
// ═══════════════════════════════════════════════════════════════════════
function CameraView({ t, onCapture, onBack, onAutoResult }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const flashRef = useRef(null);
  const scanningRef = useRef(false); // prevents concurrent API calls
  const lastFrameRef = useRef(null); // pixel snapshot for motion detection
  const stableCountRef = useRef(0);  // consecutive stable frames

  const [facingMode, setFacingMode] = useState("environment");
  const [error, setError] = useState(null);
  const [ready, setReady] = useState(false);
  const [scanStatus, setScanStatus] = useState("idle"); // "idle" | "scanning" | "found" | "quota"
  const quotaCooldownRef = useRef(null); // timestamp when quota cooldown ends

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

  // Auto-scan: stability-based trigger — scan when camera holds still for ~1.2s
  useEffect(() => {
    if (!ready) return;

    // Check motion 400ms — lightweight 64×64 pixel diff
    const motionInterval = setInterval(async () => {
      const v = videoRef.current;
      if (!v || !v.videoWidth || scanningRef.current) return;
      if (quotaCooldownRef.current && Date.now() < quotaCooldownRef.current) return;

      // Sample 64×64 thumbnail
      const thumb = document.createElement("canvas");
      thumb.width = 64; thumb.height = 64;
      thumb.getContext("2d").drawImage(v, 0, 0, 64, 64);
      const cur = thumb.getContext("2d").getImageData(0, 0, 64, 64).data;

      let isMoving = false;
      if (lastFrameRef.current) {
        let diff = 0;
        for (let i = 0; i < cur.length; i += 4) {
          diff += Math.abs(cur[i]   - lastFrameRef.current[i])
               +  Math.abs(cur[i+1] - lastFrameRef.current[i+1])
               +  Math.abs(cur[i+2] - lastFrameRef.current[i+2]);
        }
        // avg diff per channel > 4 = camera is moving
        isMoving = diff / (64 * 64 * 3) > 4;
      }
      lastFrameRef.current = cur;

      if (isMoving) {
        // Camera moved — reset stability counter, go back to idle
        stableCountRef.current = 0;
        setScanStatus(s => s === "focusing" || s === "idle" ? "idle" : s);
        return;
      }

      // Camera is stable — increment counter
      stableCountRef.current += 1;

      // 1 stable frame (0.4s): show "focusing" hint
      if (stableCountRef.current === 1) {
        setScanStatus("focusing");
      }

      // 3 stable frames (1.2s): trigger scan
      if (stableCountRef.current >= 3) {
        stableCountRef.current = 0;
        scanningRef.current = true;
        setScanStatus("scanning");
        try {
          // Check perceptual hash cache before calling API
          const phash = computePhash(v);
          const cached = lookupCache(phash);
          if (cached) {
            setScanStatus("found");
            clearInterval(motionInterval);
            if (flashRef.current) {
              flashRef.current.classList.remove("snap-v4-flash-anim");
              void flashRef.current.offsetWidth;
              flashRef.current.classList.add("snap-v4-flash-anim");
            }
            setTimeout(() => onAutoResult(cached), 320);
            return;
          }

          // Cache miss → call API
          const base64 = videoToBase64(v);
          const apiResult = await detectPokemon(base64);
          if (apiResult.name && apiResult.name !== "unknown") {
            writeCache(phash, apiResult);
            setScanStatus("found");
            clearInterval(motionInterval);
            if (flashRef.current) {
              flashRef.current.classList.remove("snap-v4-flash-anim");
              void flashRef.current.offsetWidth;
              flashRef.current.classList.add("snap-v4-flash-anim");
            }
            setTimeout(() => onAutoResult(apiResult), 320);
          } else {
            setScanStatus("idle");
          }
        } catch (e) {
          if (e?.isQuota) {
            quotaCooldownRef.current = Date.now() + 60_000;
            setScanStatus("quota");
            setTimeout(() => setScanStatus("idle"), 60_000);
          } else {
            setScanStatus("idle");
          }
        } finally {
          scanningRef.current = false;
        }
      }
    }, 400);

    return () => clearInterval(motionInterval);
  }, [ready, onAutoResult]);

  const handleCapture = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;

    // Check cache before capturing — skip API if same Pokemon was seen before
    const phash = computePhash(v);
    const cached = lookupCache(phash);

    // Flash effect
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

    if (cached) {
      // Cache hit — bypass API, show result instantly via onAutoResult
      setTimeout(() => onAutoResult(cached), 250);
    } else {
      const base64 = videoToBase64(v);
      setTimeout(() => onCapture(base64, phash), 250);
    }
  }, [onCapture, onAutoResult]);

  const hintText = scanStatus === "scanning" ? t.scanning
    : scanStatus === "found" ? t.scanFound
    : scanStatus === "quota" ? t.quotaWait
    : scanStatus === "focusing" ? t.scanFocusing
    : t.scanReady;

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

        {/* Scan line — always visible when ready, speeds up while scanning */}
        {ready && (
          <div className={`snap-v4-scan-line${scanStatus === "focusing" ? " snap-scan-active" : ""}${scanStatus === "scanning" ? " snap-scan-active" : ""}${scanStatus === "found" ? " snap-scan-found" : ""}`} />
        )}

        <div className={`snap-v4-guide${scanStatus === "focusing" ? " snap-guide-focusing" : ""}${scanStatus === "scanning" ? " snap-guide-scanning" : ""}${scanStatus === "found" ? " snap-guide-found" : ""}`}>
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

        {ready && (
          <div className={`snap-v4-hint-banner snap-hint-${scanStatus === "focusing" || scanStatus === "scanning" ? "scanning" : scanStatus === "found" ? "found" : scanStatus === "quota" ? "quota" : "idle"}`}>
            {hintText}
          </div>
        )}

        <div ref={flashRef} className="snap-v4-flash" />
      </div>

      <div className="snap-v4-camera-bottombar">
        <div className="snap-v4-scan-tip">{t.scanTip}</div>
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
// Sub: Sound View — identify Pokemon by cry
// ═══════════════════════════════════════════════════════════════════════
function SoundView({ t, onAnalyze, onBack }) {
  const [status, setStatus] = useState("idle"); // idle | listening | done | error
  const [errMsg, setErrMsg] = useState("");
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const [countdown, setCountdown] = useState(5);
  const [bars, setBars] = useState([0.3, 0.5, 0.4, 0.7, 0.5, 0.3, 0.6, 0.4]);
  const animRef = useRef(null);

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    clearInterval(timerRef.current);
    cancelAnimationFrame(animRef.current);
    setStatus("done");
  }, []);

  const startRecording = useCallback(async () => {
    setErrMsg("");
    chunksRef.current = [];
    setCountdown(5);
    setStatus("listening");

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch {
      setErrMsg(t.soundMicError);
      setStatus("error");
      return;
    }

    // Pick best supported MIME
    const mimes = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/ogg", "audio/mp4"];
    const mime = mimes.find(m => MediaRecorder.isTypeSupported(m)) || "";
    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : {});
    recorderRef.current = recorder;

    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      const audioType = mime || recorder.mimeType || "audio/webm";
      const blob = new Blob(chunksRef.current, { type: audioType });
      const base64 = await blobToBase64(blob);
      onAnalyze(base64, audioType);
    };

    recorder.start(100);

    // Animate bars
    const animateBars = () => {
      setBars(prev => prev.map(() => 0.2 + Math.random() * 0.8));
      animRef.current = requestAnimationFrame(animateBars);
    };
    animateBars();

    // 5s countdown then auto-stop
    let secs = 5;
    timerRef.current = setInterval(() => {
      secs -= 1;
      setCountdown(secs);
      if (secs <= 0) stopRecording();
    }, 1000);
  }, [t, onAnalyze, stopRecording]);

  useEffect(() => () => {
    clearInterval(timerRef.current);
    cancelAnimationFrame(animRef.current);
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  }, []);

  return (
    <div className="snap-sound-wrap">
      <button className="snap-v4-back-btn" onClick={onBack}>← {t.back}</button>
      <div className="snap-sound-inner">
        <div className="snap-sound-title">{t.soundTitle}</div>
        <div className="snap-sound-desc">{t.soundDesc}</div>

        {/* Mic button with pulse rings */}
        <div className={`snap-sound-mic-wrap ${status === "listening" ? "listening" : ""}`}>
          {status === "listening" && <>
            <div className="snap-sound-ring snap-sound-ring-1" />
            <div className="snap-sound-ring snap-sound-ring-2" />
            <div className="snap-sound-ring snap-sound-ring-3" />
          </>}
          <button
            className={`snap-sound-mic-btn ${status === "listening" ? "active" : ""}`}
            onClick={status === "listening" ? stopRecording : startRecording}
            disabled={status === "done"}
          >
            {status === "listening" ? "⏹" : "🎙"}
          </button>
        </div>

        {/* Equalizer bars */}
        {status === "listening" && (
          <div className="snap-sound-eq">
            {bars.map((h, i) => (
              <div key={i} className="snap-sound-bar" style={{ "--bh": h }} />
            ))}
          </div>
        )}

        {/* Countdown */}
        {status === "listening" && (
          <div className="snap-sound-countdown">{countdown}s</div>
        )}

        {/* Status text */}
        <div className="snap-sound-status">
          {status === "idle" && t.soundHint}
          {status === "listening" && t.soundListening}
          {status === "done" && t.soundDone}
          {status === "error" && <span className="snap-sound-err">{errMsg}</span>}
        </div>

        {/* Stop button */}
        {status === "listening" && (
          <button className="snap-sound-stop-btn" onClick={stopRecording}>
            {t.soundStop}
          </button>
        )}
      </div>
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
  const { name, raw, pokemon } = result ?? {};
  const [cryPlaying, setCryPlaying] = useState(false);

  useEffect(() => {
    if (pokemon?.id && isSoundEnabled()) {
      playCry(pokemon.id, 0.5, pokemon.name);
      setCryPlaying(true);
      const timer = setTimeout(() => setCryPlaying(false), 2200);
      return () => clearTimeout(timer);
    }
  }, [pokemon?.id]);

  if (!result) return null;

  // Pokemon found in loaded list — show full info
  if (pokemon) {
    const types = pokemon.types?.map(t => t.type.name) ?? [];
    const tc1 = typeColor(types[0] || "normal");
    const tc2 = typeColor(types[1] || types[0] || "normal");
    const localName = getLocalName(pokemon, lang, thaiArr, jpArr);
    const imgSrc = pokemon?.sprites?.other?.["official-artwork"]?.front_default
      || pokemon?.sprites?.front_default
      || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.id}.png`;

    // 4 key stats in fixed order
    const STAT_KEYS = ["hp", "attack", "defense", "speed"];
    const STAT_LABELS = { hp: "HP", attack: "ATK", defense: "DEF", speed: "SPD" };
    const stats = (pokemon.stats || [])
      .filter(s => STAT_KEYS.includes(s.stat.name))
      .sort((a, b) => STAT_KEYS.indexOf(a.stat.name) - STAT_KEYS.indexOf(b.stat.name));

    // 8 burst particles evenly distributed in a circle
    const particles = Array.from({ length: 8 }, (_, i) => {
      const angle = (i / 8) * Math.PI * 2;
      const dist = 82;
      return {
        i,
        tx: `${(Math.cos(angle) * dist).toFixed(1)}px`,
        ty: `${(Math.sin(angle) * dist).toFixed(1)}px`,
        color: i % 2 === 0 ? tc1 : tc2,
      };
    });

    return (
      <div className="snap-found">
        {/* One-shot diagnostic scan sweep */}
        <div className="snap-found-sweep" />

        {/* Tech grid background */}
        <div className="snap-found-grid" />

        {/* Ambient type-colored orbs */}
        <div className="snap-found-orb snap-found-orb1" style={{ background: `radial-gradient(circle, ${tc1}52, transparent 70%)` }} />
        <div className="snap-found-orb snap-found-orb2" style={{ background: `radial-gradient(circle, ${tc2}38, transparent 70%)` }} />

        {/* Header: IDENTIFIED badge + dex number */}
        <div className="snap-found-header">
          <div className="snap-found-scan-badge">
            <span className="snap-found-badge-pulse" style={{ background: tc1, boxShadow: `0 0 6px ${tc1}` }} />
            IDENTIFIED
          </div>
          <div className="snap-found-dex-num">#{padId(pokemon.id)}</div>
        </div>

        {/* Type chips */}
        <div className="snap-found-types">
          {types.map(tn => (
            <span key={tn} className="snap-found-type"
              style={{ background: typeColor(tn), boxShadow: `0 4px 14px ${typeColor(tn)}55` }}>
              {tn}
            </span>
          ))}
        </div>

        {/* Hero image with rings + particle burst */}
        <div className="snap-found-hero">
          <div className="snap-found-hero-glow" style={{ background: `radial-gradient(circle, ${tc1}60 0%, transparent 65%)` }} />
          <div className="snap-found-ring snap-found-ring1" style={{ borderColor: `${tc1}55`, boxShadow: `0 0 20px ${tc1}40` }} />
          <div className="snap-found-ring snap-found-ring2" style={{ borderColor: `${tc1}28` }} />
          <div className="snap-found-ring snap-found-ring3" style={{ borderColor: `${tc2}18` }} />
          {particles.map(p => (
            <div
              key={p.i}
              className="snap-found-particle"
              style={{ "--tx": p.tx, "--ty": p.ty, "--i": p.i, background: p.color }}
            />
          ))}
          <img src={imgSrc} alt={localName} className="snap-found-img" />
        </div>

        {/* Name */}
        <div className="snap-found-name" style={{ "--c1": tc1, "--c2": tc2 }}>{localName}</div>

        {/* Cry wave */}
        <div className="snap-found-wave" style={{ opacity: cryPlaying ? 1 : 0 }}>
          {[0,1,2,3,4,5,6].map(i => (
            <div key={i} className="snap-found-bar" style={{ "--i": i, "--c": tc1 }} />
          ))}
        </div>

        {/* Base stats panel */}
        {stats.length > 0 && (
          <div className="snap-found-stats">
            {stats.map((s, si) => (
              <div key={s.stat.name} className="snap-found-stat-row">
                <div className="snap-found-stat-label">{STAT_LABELS[s.stat.name]}</div>
                <div className="snap-found-stat-track">
                  <div
                    className="snap-found-stat-fill"
                    style={{
                      width: `${Math.round(s.base_stat / 255 * 100)}%`,
                      background: `linear-gradient(90deg, ${tc1}, ${tc2})`,
                      "--si": si,
                    }}
                  />
                </div>
                <div className="snap-found-stat-val">{s.base_stat}</div>
              </div>
            ))}
          </div>
        )}

        {/* Height + Weight meta */}
        {(pokemon.height != null && pokemon.weight != null) && (
          <div className="snap-found-meta">
            <div className="snap-found-meta-item">
              <div className="snap-found-meta-label">HEIGHT</div>
              <div className="snap-found-meta-val">{(pokemon.height * 0.1).toFixed(1)}m</div>
            </div>
            <div className="snap-found-meta-div" />
            <div className="snap-found-meta-item">
              <div className="snap-found-meta-label">WEIGHT</div>
              <div className="snap-found-meta-val">{(pokemon.weight * 0.1).toFixed(1)}kg</div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="snap-found-actions">
          <button
            className="snap-found-view-btn"
            style={{ background: `linear-gradient(135deg, ${tc1} 0%, ${tc2} 100%)`, boxShadow: `0 10px 32px ${tc1}55` }}
            onClick={() => onPick(pokemon.id)}>
            📖 {t.open}
          </button>
          <button className="snap-found-retry-btn" onClick={onRetry}>
            {t.tryAgain}
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
        filter: drop-shadow(0 6px 14px rgba(181, 48, 45, 0.4));
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
        --card-grad: linear-gradient(135deg, rgba(181, 48, 45, 0.25), rgba(236, 72, 153, 0.25));
      }
      .snap-v4-card-sound {
        --card-grad: linear-gradient(135deg, rgba(251, 191, 36, 0.25), rgba(249, 115, 22, 0.25));
      }
      .snap-v4-card:hover {
        transform: translateY(-6px) scale(1.02);
        border-color: rgba(255, 255, 255, 0.3);
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
      }
      .snap-v4-card:hover::before { opacity: 1; }
      .snap-v4-card-camera:hover { border-color: rgb(20, 184, 166); }
      .snap-v4-card-upload:hover { border-color: rgb(168, 85, 247); }
      .snap-v4-card-sound:hover { border-color: rgb(251, 191, 36); }

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
        background: radial-gradient(circle, rgba(181, 48, 45, 0.45), transparent 70%);
      }
      .snap-v4-card-sound .snap-v4-card-pulse {
        background: radial-gradient(circle, rgba(251, 191, 36, 0.45), transparent 70%);
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
        background: linear-gradient(135deg, rgba(181, 48, 45, 0.4), rgba(236, 72, 153, 0.4));
        color: #f0abfc;
        border-color: rgba(181, 48, 45, 0.5);
      }
      .snap-v4-card-sound .snap-v4-card-badge {
        background: linear-gradient(135deg, rgba(251, 191, 36, 0.4), rgba(249, 115, 22, 0.4));
        color: #fde68a;
        border-color: rgba(251, 191, 36, 0.5);
      }

      /* ─── Sound View ─── */
      .snap-sound-wrap {
        display: flex; flex-direction: column;
        width: 100%; min-height: 480px;
        padding: 0;
      }
      .snap-sound-inner {
        display: flex; flex-direction: column; align-items: center;
        gap: 12px;
        padding: 28px 24px 32px;
        flex: 1;
      }
      .snap-sound-title {
        font-size: 22px; font-weight: 900;
        background: linear-gradient(135deg, #fbbf24, #f97316);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        margin-bottom: 2px;
      }
      .snap-sound-desc {
        font-size: 13px; opacity: 0.7; text-align: center; max-width: 280px;
        line-height: 1.5; margin-bottom: 12px;
      }
      .snap-sound-mic-wrap {
        position: relative;
        display: flex; align-items: center; justify-content: center;
        width: 130px; height: 130px; margin: 8px 0;
      }
      .snap-sound-ring {
        position: absolute; inset: 0; border-radius: 50%;
        border: 2px solid rgba(251, 191, 36, 0.5);
        animation: snd-ring 2s ease-out infinite;
      }
      .snap-sound-ring-2 { animation-delay: 0.6s; }
      .snap-sound-ring-3 { animation-delay: 1.2s; }
      @keyframes snd-ring {
        0%   { transform: scale(0.7); opacity: 0.9; }
        100% { transform: scale(1.6); opacity: 0; }
      }
      .snap-sound-mic-btn {
        position: relative; z-index: 2;
        width: 88px; height: 88px; border-radius: 50%;
        font-size: 36px;
        border: none; cursor: pointer;
        background: linear-gradient(135deg, rgba(251, 191, 36, 0.25), rgba(249, 115, 22, 0.25));
        border: 2px solid rgba(251, 191, 36, 0.5);
        transition: all 0.2s;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 4px 20px rgba(251, 191, 36, 0.3);
      }
      .snap-sound-mic-btn.active {
        background: linear-gradient(135deg, rgba(251, 191, 36, 0.45), rgba(249, 115, 22, 0.45));
        border-color: #fbbf24;
        box-shadow: 0 4px 30px rgba(251, 191, 36, 0.6);
        animation: snd-mic-pulse 1s ease-in-out infinite;
      }
      .snap-sound-mic-btn:disabled { opacity: 0.4; cursor: not-allowed; }
      @keyframes snd-mic-pulse {
        0%, 100% { transform: scale(1); }
        50%       { transform: scale(1.08); }
      }
      .snap-sound-eq {
        display: flex; align-items: flex-end; gap: 4px;
        height: 44px; margin: 4px 0;
      }
      .snap-sound-bar {
        width: 6px; border-radius: 3px;
        background: linear-gradient(to top, #f97316, #fbbf24);
        height: calc(var(--bh, 0.5) * 44px);
        transition: height 0.08s ease;
        box-shadow: 0 0 6px rgba(251, 191, 36, 0.5);
      }
      .snap-sound-countdown {
        font-size: 28px; font-weight: 900;
        color: #fbbf24;
        text-shadow: 0 0 12px rgba(251, 191, 36, 0.6);
        min-height: 38px;
      }
      .snap-sound-status {
        font-size: 13.5px; opacity: 0.75; text-align: center;
        min-height: 20px; max-width: 280px;
      }
      .snap-sound-err { color: #f87171; }
      .snap-sound-stop-btn {
        margin-top: 8px; padding: 10px 28px;
        border-radius: 999px; border: 1.5px solid rgba(251, 191, 36, 0.6);
        background: rgba(251, 191, 36, 0.15);
        color: #fde68a; font-size: 13px; font-weight: 700; cursor: pointer;
        transition: all 0.2s;
      }
      .snap-sound-stop-btn:hover {
        background: rgba(251, 191, 36, 0.3);
        border-color: #fbbf24;
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

      /* ── Scan line ── */
      .snap-v4-scan-line {
        position: absolute;
        left: 0; right: 0;
        height: 2px;
        background: linear-gradient(90deg,
          transparent 0%,
          rgba(20, 184, 166, 0.5) 20%,
          rgba(20, 184, 166, 0.95) 50%,
          rgba(20, 184, 166, 0.5) 80%,
          transparent 100%);
        box-shadow: 0 0 10px rgba(20, 184, 166, 0.6), 0 0 24px rgba(20, 184, 166, 0.25);
        pointer-events: none;
        z-index: 4;
        animation: snap-scanline 2.8s ease-in-out infinite;
      }
      .snap-v4-scan-line.snap-scan-active {
        animation-duration: 1.4s;
        background: linear-gradient(90deg,
          transparent 0%,
          rgba(251, 191, 36, 0.6) 20%,
          rgba(251, 191, 36, 1) 50%,
          rgba(251, 191, 36, 0.6) 80%,
          transparent 100%);
        box-shadow: 0 0 12px rgba(251, 191, 36, 0.8), 0 0 28px rgba(251, 191, 36, 0.35);
      }
      .snap-v4-scan-line.snap-scan-found {
        animation: none;
        top: 50%;
        background: linear-gradient(90deg,
          transparent 0%,
          rgba(74, 222, 128, 0.6) 20%,
          rgba(74, 222, 128, 1) 50%,
          rgba(74, 222, 128, 0.6) 80%,
          transparent 100%);
        box-shadow: 0 0 16px rgba(74, 222, 128, 0.9), 0 0 40px rgba(74, 222, 128, 0.4);
      }
      @keyframes snap-scanline {
        0%   { top: 25%; }
        50%  { top: 75%; }
        100% { top: 25%; }
      }

      /* ── Guide corners — focusing state (camera stable, about to scan) ── */
      .snap-guide-focusing .snap-v4-guide-corner {
        border-color: rgba(251, 191, 36, 0.7);
        box-shadow: 0 0 10px rgba(251, 191, 36, 0.5);
        animation: snap-corner-focus 1.2s ease-in-out infinite alternate;
      }
      @keyframes snap-corner-focus {
        from { box-shadow: 0 0 4px rgba(251, 191, 36, 0.3); border-color: rgba(251, 191, 36, 0.5); }
        to   { box-shadow: 0 0 14px rgba(251, 191, 36, 0.9); border-color: rgba(251, 191, 36, 1); }
      }

      /* ── Guide corners — scanning state ── */
      .snap-guide-scanning .snap-v4-guide-corner {
        border-color: rgba(251, 191, 36, 0.9);
        box-shadow: 0 0 14px rgba(251, 191, 36, 0.7);
        animation: snap-corner-pulse 0.7s ease-in-out infinite alternate;
      }
      .snap-guide-found .snap-v4-guide-corner {
        border-color: rgba(74, 222, 128, 1);
        box-shadow: 0 0 18px rgba(74, 222, 128, 0.9);
      }
      @keyframes snap-corner-pulse {
        from { box-shadow: 0 0 6px rgba(251, 191, 36, 0.4); }
        to   { box-shadow: 0 0 18px rgba(251, 191, 36, 1); }
      }

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
        transition: background 0.3s, border-color 0.3s;
      }
      .snap-hint-scanning {
        background: rgba(120, 80, 0, 0.7) !important;
        border-color: rgba(251, 191, 36, 0.55) !important;
        color: #fde68a;
      }
      .snap-hint-found {
        background: rgba(0, 80, 40, 0.75) !important;
        border-color: rgba(74, 222, 128, 0.6) !important;
        color: #86efac;
      }
      .snap-hint-quota {
        background: rgba(80, 40, 0, 0.75) !important;
        border-color: rgba(251, 146, 60, 0.55) !important;
        color: #fdba74;
      }

      .snap-v4-camera-bottombar {
        padding: 10px 0 24px;
        background: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.35) 100%);
        display: flex; flex-direction: column; align-items: center; gap: 12px;
        flex-shrink: 0;
      }
      .snap-v4-scan-tip {
        font-size: 11px;
        font-weight: 700;
        opacity: 0.5;
        letter-spacing: 0.4px;
        text-transform: uppercase;
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
        border: 3px dashed rgba(181, 48, 45, 0.45);
        background: linear-gradient(135deg, rgba(181, 48, 45, 0.08), rgba(236, 72, 153, 0.04));
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
        background: radial-gradient(circle at center, rgba(181, 48, 45, 0.15), transparent 65%);
        opacity: 0;
        transition: opacity 0.3s;
      }
      .snap-v4-drop:hover, .snap-v4-drop-over {
        border-color: rgba(181, 48, 45, 0.9);
        border-style: solid;
        transform: translateY(-2px);
      }
      .snap-v4-drop:hover::before, .snap-v4-drop-over::before { opacity: 1; }
      .snap-v4-drop > * { position: relative; z-index: 1; }
      .snap-v4-drop-icon {
        font-size: 64px; margin-bottom: 14px;
        filter: drop-shadow(0 8px 18px rgba(181, 48, 45, 0.4));
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
        background: linear-gradient(135deg, #b5302d, #ec4899);
        color: white;
        box-shadow: 0 6px 18px rgba(181, 48, 45, 0.4);
      }
      .snap-v4-btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 26px rgba(181, 48, 45, 0.55);
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
        filter: drop-shadow(0 6px 14px rgba(181, 48, 45, 0.6));
        animation: snapv4-ai-think 1.8s ease-in-out infinite;
      }
      @keyframes snapv4-ai-think {
        0%, 100% { transform: rotate(-5deg) scale(1); }
        50%      { transform: rotate(5deg) scale(1.08); }
      }
      .snap-v4-ai-pulse-1, .snap-v4-ai-pulse-2 {
        position: absolute; inset: 0;
        border-radius: 50%;
        border: 2px solid rgba(181, 48, 45, 0.6);
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
        background: linear-gradient(135deg, #b5302d, #ec4899);
        animation: snapv4-dot-bounce 1.2s ease-in-out infinite;
      }
      .snap-v4-dot:nth-child(2) { animation-delay: 0.15s; }
      .snap-v4-dot:nth-child(3) { animation-delay: 0.3s; }
      @keyframes snapv4-dot-bounce {
        0%, 100% { transform: scale(0.7); opacity: 0.5; }
        50%      { transform: scale(1.2); opacity: 1; }
      }

      /* ─── Found Result — Advanced Scanner UI ─── */
      @keyframes snapv4-fade-up {
        from { opacity: 0; transform: translateY(12px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes snap-sweep {
        0%   { top: -3px; opacity: 1; }
        85%  { opacity: 0.8; }
        100% { top: 100%; opacity: 0; }
      }
      @keyframes snap-particle-burst {
        0%   { transform: translate(-50%, -50%) scale(2); opacity: 1; }
        100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0); opacity: 0; }
      }
      @keyframes snap-stat-grow {
        from { transform: scaleX(0); }
        to   { transform: scaleX(1); }
      }

      .snap-found {
        position: relative;
        padding: 0 0 26px;
        overflow: hidden;
        display: flex; flex-direction: column; align-items: center;
      }

      /* One-shot diagnostic scan sweep */
      .snap-found-sweep {
        position: absolute; left: 0; right: 0; top: 0;
        height: 3px;
        background: linear-gradient(90deg,
          transparent 0%,
          rgba(20, 184, 166, 0.7) 25%,
          white 50%,
          rgba(20, 184, 166, 0.7) 75%,
          transparent 100%);
        box-shadow: 0 0 20px rgba(20, 184, 166, 0.8), 0 0 50px rgba(20, 184, 166, 0.3);
        z-index: 15; pointer-events: none;
        animation: snap-sweep 1.1s ease-out both;
      }

      /* Tech grid */
      .snap-found-grid {
        position: absolute; inset: 0;
        background-image:
          linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
        background-size: 36px 36px;
        pointer-events: none; z-index: 0;
        -webkit-mask-image: radial-gradient(ellipse 85% 85% at 50% 50%, black 20%, transparent 88%);
        mask-image: radial-gradient(ellipse 85% 85% at 50% 50%, black 20%, transparent 88%);
      }

      /* Ambient type orbs */
      .snap-found-orb {
        position: absolute; border-radius: 50%;
        pointer-events: none; filter: blur(52px); z-index: 0;
      }
      .snap-found-orb1 {
        width: 280px; height: 280px; top: -100px; left: -80px;
        animation: snapv4-orb1 9s ease-in-out infinite;
      }
      .snap-found-orb2 {
        width: 220px; height: 220px; bottom: -40px; right: -60px;
        animation: snapv4-orb2 11s ease-in-out infinite;
      }
      @keyframes snapv4-orb1 {
        0%, 100% { transform: translate(0,0) scale(1); }
        40%      { transform: translate(28px, 22px) scale(1.12); }
        70%      { transform: translate(-14px, 30px) scale(0.92); }
      }
      @keyframes snapv4-orb2 {
        0%, 100% { transform: translate(0,0) scale(1); }
        50%      { transform: translate(-22px,-18px) scale(1.1); }
      }

      /* Header row */
      .snap-found-header {
        position: relative; z-index: 2;
        width: 100%; padding: 18px 20px 0;
        display: flex; justify-content: space-between; align-items: center;
        animation: snapv4-fade-up 0.3s ease both;
      }
      .snap-found-scan-badge {
        display: inline-flex; align-items: center; gap: 7px;
        padding: 5px 14px 5px 10px;
        background: rgba(20, 184, 166, 0.1);
        border: 1px solid rgba(20, 184, 166, 0.4);
        backdrop-filter: blur(8px);
        border-radius: 999px;
        font-size: 9.5px; font-weight: 900; letter-spacing: 2.5px;
        color: rgba(20, 184, 166, 0.95);
        text-transform: uppercase;
      }
      .snap-found-badge-pulse {
        width: 6px; height: 6px; border-radius: 50%;
        flex-shrink: 0;
        animation: snapv4-dot-blink 1.3s ease-in-out infinite;
      }
      @keyframes snapv4-dot-blink {
        0%, 100% { opacity: 1; transform: scale(1); }
        50%      { opacity: 0.2; transform: scale(0.7); }
      }
      .snap-found-dex-num {
        font-size: 11px; font-weight: 900;
        letter-spacing: 3px;
        opacity: 0.4;
        font-variant-numeric: tabular-nums;
      }

      /* Type chips */
      .snap-found-types {
        position: relative; z-index: 2;
        display: flex; justify-content: center; gap: 7px; flex-wrap: wrap;
        margin: 10px 0 0;
        animation: snapv4-fade-up 0.35s ease both 0.06s;
      }
      .snap-found-type {
        padding: 5px 16px;
        border-radius: 999px;
        font-size: 10.5px; font-weight: 900;
        text-transform: uppercase; letter-spacing: 1.2px;
        color: white;
        text-shadow: 0 1px 4px rgba(0,0,0,0.4);
        border: 1px solid rgba(255,255,255,0.22);
        backdrop-filter: blur(4px);
      }

      /* Hero image */
      .snap-found-hero {
        position: relative; z-index: 2;
        width: 210px; height: 210px;
        margin: 10px auto 2px;
        display: flex; align-items: center; justify-content: center;
        animation: snapv4-hero-in 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) both 0.1s;
      }
      @keyframes snapv4-hero-in {
        from { transform: scale(0.55) translateY(20px); opacity: 0; }
        to   { transform: scale(1) translateY(0); opacity: 1; }
      }
      .snap-found-hero-glow {
        position: absolute; inset: -28px; border-radius: 50%;
        animation: snapv4-glow-breathe 3s ease-in-out infinite;
        pointer-events: none;
      }
      @keyframes snapv4-glow-breathe {
        0%, 100% { transform: scale(0.88); opacity: 0.7; }
        50%      { transform: scale(1.12); opacity: 1; }
      }
      .snap-found-ring {
        position: absolute; border-radius: 50%;
        border: 1.5px solid; pointer-events: none;
      }
      .snap-found-ring1 { inset: -18px; animation: snapv4-ring-cw 12s linear infinite; }
      .snap-found-ring2 { inset: -34px; opacity: 0.45; animation: snapv4-ring-cw 18s linear infinite reverse; }
      .snap-found-ring3 { inset: -52px; opacity: 0.18; border-style: dashed; animation: snapv4-ring-cw 28s linear infinite; }
      @keyframes snapv4-ring-cw {
        from { transform: rotate(0deg); }
        to   { transform: rotate(360deg); }
      }

      /* Particle burst on detection */
      .snap-found-particle {
        position: absolute; top: 50%; left: 50%;
        width: 7px; height: 7px; border-radius: 50%;
        pointer-events: none; z-index: 5;
        animation: snap-particle-burst 0.9s cubic-bezier(0.2, 0, 1, 0.8) both;
        animation-delay: calc(var(--i) * 0.035s + 0.08s);
      }

      .snap-found-img {
        position: relative; z-index: 2;
        width: 100%; height: 100%; object-fit: contain;
        filter: drop-shadow(0 20px 40px rgba(0,0,0,0.6));
        animation: snapv4-img-float 3.4s ease-in-out infinite;
      }
      @keyframes snapv4-img-float {
        0%, 100% { transform: translateY(0); }
        50%      { transform: translateY(-10px); }
      }

      /* Name */
      .snap-found-name {
        position: relative; z-index: 2;
        font-size: 36px; font-weight: 900;
        text-transform: capitalize;
        line-height: 1; letter-spacing: -1px;
        margin-bottom: 2px;
        background: linear-gradient(135deg, var(--c1, #fff) 0%, var(--c2, #c7d2fe) 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        filter: drop-shadow(0 4px 16px color-mix(in srgb, var(--c1, #b5302d) 60%, transparent));
        animation: snapv4-name-reveal 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) both 0.22s;
      }
      @keyframes snapv4-name-reveal {
        from { transform: scale(0.65) translateY(10px); opacity: 0; }
        to   { transform: scale(1) translateY(0); opacity: 1; }
      }

      /* Cry wave */
      .snap-found-wave {
        position: relative; z-index: 2;
        display: flex; align-items: center; justify-content: center;
        gap: 4px; height: 28px;
        margin: 4px 0 0;
        transition: opacity 0.4s ease;
      }
      .snap-found-bar {
        width: 4px; border-radius: 4px;
        background: var(--c, #b5302d);
        animation: snapv4-bar-dance 0.75s ease-in-out infinite alternate;
        animation-delay: calc(var(--i) * 0.09s);
      }
      .snap-found-bar:nth-child(1) { height: 7px; }
      .snap-found-bar:nth-child(2) { height: 14px; }
      .snap-found-bar:nth-child(3) { height: 22px; }
      .snap-found-bar:nth-child(4) { height: 28px; }
      .snap-found-bar:nth-child(5) { height: 22px; }
      .snap-found-bar:nth-child(6) { height: 14px; }
      .snap-found-bar:nth-child(7) { height: 7px; }
      @keyframes snapv4-bar-dance {
        from { transform: scaleY(0.25); opacity: 0.4; }
        to   { transform: scaleY(1); opacity: 1; }
      }

      /* Base stats panel */
      .snap-found-stats {
        position: relative; z-index: 2;
        width: calc(100% - 40px);
        background: rgba(255,255,255,0.045);
        border: 1px solid rgba(255,255,255,0.09);
        border-radius: 14px; padding: 12px 14px;
        margin: 10px 0 4px;
        animation: snapv4-fade-up 0.4s ease both 0.38s;
      }
      .snap-found-stat-row {
        display: flex; align-items: center; gap: 9px;
        margin-bottom: 8px;
      }
      .snap-found-stat-row:last-child { margin-bottom: 0; }
      .snap-found-stat-label {
        font-size: 9px; font-weight: 900; letter-spacing: 1px;
        opacity: 0.45; width: 32px; text-align: right;
        flex-shrink: 0; text-transform: uppercase;
      }
      .snap-found-stat-track {
        flex: 1; height: 5px;
        background: rgba(255,255,255,0.08);
        border-radius: 4px; overflow: hidden;
      }
      .snap-found-stat-fill {
        height: 100%; border-radius: 4px;
        transform-origin: left;
        animation: snap-stat-grow 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        animation-delay: calc(var(--si) * 0.08s + 0.42s);
      }
      .snap-found-stat-val {
        font-size: 10.5px; font-weight: 900;
        opacity: 0.6; width: 24px; flex-shrink: 0;
        font-variant-numeric: tabular-nums; text-align: right;
      }

      /* Meta: height / weight */
      .snap-found-meta {
        position: relative; z-index: 2;
        display: flex; align-items: center; justify-content: center;
        margin: 4px 0 8px;
        animation: snapv4-fade-up 0.4s ease both 0.48s;
      }
      .snap-found-meta-item { text-align: center; padding: 6px 22px; }
      .snap-found-meta-label {
        font-size: 8.5px; letter-spacing: 2px;
        opacity: 0.4; font-weight: 700;
        text-transform: uppercase; margin-bottom: 2px;
      }
      .snap-found-meta-val { font-size: 15px; font-weight: 900; opacity: 0.82; }
      .snap-found-meta-div {
        width: 1px; height: 34px;
        background: rgba(255,255,255,0.15); flex-shrink: 0;
      }

      /* Actions */
      .snap-found-actions {
        position: relative; z-index: 2;
        width: calc(100% - 40px);
        display: flex; flex-direction: column; gap: 9px;
        animation: snapv4-fade-up 0.4s ease both 0.55s;
      }
      .snap-found-view-btn {
        width: 100%;
        padding: 15px 24px;
        border-radius: 16px; border: none; color: white;
        font-size: 16px; font-weight: 900; letter-spacing: 0.2px;
        cursor: pointer; font-family: inherit;
        display: flex; align-items: center; justify-content: center; gap: 8px;
        transition: all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      .snap-found-view-btn:hover {
        transform: translateY(-3px) scale(1.02);
        filter: brightness(1.12);
      }
      .snap-found-view-btn:active { transform: scale(0.97); filter: brightness(0.95); }
      .snap-found-retry-btn {
        background: transparent;
        border: 1px solid rgba(255,255,255,0.16);
        color: rgba(255,255,255,0.5);
        font-size: 13px; font-weight: 700;
        padding: 9px 20px; border-radius: 999px;
        cursor: pointer; font-family: inherit;
        transition: all 0.18s; letter-spacing: 0.2px;
      }
      .snap-found-retry-btn:hover {
        background: rgba(255,255,255,0.08);
        color: white;
        border-color: rgba(255,255,255,0.28);
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
        text-shadow: 0 2px 6px rgba(181, 48, 45, 0.5);
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

        .snap-v4-camera { height: 100vh; max-height: 96vh; min-height: 420px; }
        .snap-v4-camera-bottombar { padding: 8px 0 20px; gap: 8px; }
        .snap-v4-guide { width: min(80%, 320px); }
        .snap-v4-guide-corner { width: 24px; height: 24px; border-width: 2.5px; }
        .snap-v4-shutter { width: 70px; height: 70px; border-width: 3px; }
        .snap-v4-shutter-inner { width: 54px; height: 54px; }

        .snap-v4-upload { padding: 20px 18px 24px; }
        .snap-v4-drop { padding: 36px 18px; }
        .snap-v4-drop-icon { font-size: 50px; }
        .snap-v4-drop-title { font-size: 17px; }
        .snap-v4-preview-img { max-width: 240px; max-height: 240px; }

        .snap-found { padding: 0 0 20px; }
        .snap-found-header { padding: 14px 16px 0; }
        .snap-found-hero { width: 170px; height: 170px; margin: 8px auto 2px; }
        .snap-found-name { font-size: 28px; letter-spacing: -0.5px; }
        .snap-found-view-btn { font-size: 15px; padding: 13px 20px; }
        .snap-found-orb1 { width: 200px; height: 200px; }
        .snap-found-orb2 { width: 160px; height: 160px; }
        .snap-found-stats { width: calc(100% - 32px); }
        .snap-found-actions { width: calc(100% - 32px); }
        .snap-found-meta-item { padding: 6px 16px; }
        .snap-found-meta-val { font-size: 13px; }
      }
    `}</style>
  );
}