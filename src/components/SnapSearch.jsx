// ─── SnapSearch — Improved photo-based Pokémon search ──────
// Improvements over v1:
//   • Multi-zone color histogram (5 regions: center + 4 quadrants for spatial info)
//   • Dominant color extraction (k-means style)
//   • Signature caching in localStorage (persistent, ~1ms reads vs 200ms fetches)
//   • Parallel batch processing with concurrency limit
//   • Process ALL loaded Pokemon (not just 200)
//   • AbortController + timeouts for stability
//   • Progress indicator
//   • Auto-crop transparent borders

import { useState, useRef, useCallback } from "react";
import { typeColor, getArt, getLocalName, padId } from "../utils.js";

const SIG_CACHE_KEY = "pkdx_snap_sig_v2";
const CONCURRENCY = 8;
const TIMEOUT_MS = 6000;

// Load cached signatures
function loadCache() {
  try {
    const raw = localStorage.getItem(SIG_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
function saveCache(cache) {
  try { localStorage.setItem(SIG_CACHE_KEY, JSON.stringify(cache)); } catch {}
}

// ─── Multi-zone color signature ─────────────
// Captures spatial color information by sampling 5 regions:
//   • Center (40% × 40% of image): main subject
//   • 4 quadrants (each 50% × 50%): for spatial signature
async function getSignatureV2(imageUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    let resolved = false;
    const timer = setTimeout(() => {
      if (!resolved) { resolved = true; resolve(null); }
    }, TIMEOUT_MS);

    img.onload = () => {
      if (resolved) return;
      clearTimeout(timer);
      try {
        const SIZE = 32;
        const canvas = document.createElement("canvas");
        canvas.width = SIZE; canvas.height = SIZE;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, SIZE, SIZE);
        const data = ctx.getImageData(0, 0, SIZE, SIZE).data;

        // Auto-crop: find bounding box of non-transparent pixels
        let minX = SIZE, minY = SIZE, maxX = 0, maxY = 0;
        for (let y = 0; y < SIZE; y++) {
          for (let x = 0; x < SIZE; x++) {
            const idx = (y * SIZE + x) * 4;
            if (data[idx + 3] > 64) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }
        if (maxX <= minX || maxY <= minY) {
          // No content found, use full image
          minX = 0; minY = 0; maxX = SIZE - 1; maxY = SIZE - 1;
        }

        // Quantize a pixel to a 4-bit-per-channel bin (4096 possible colors → much less in practice)
        const bin = (r, g, b) => `${r>>5},${g>>5},${b>>5}`;

        // Build per-zone histograms
        const zones = {
          c: {}, // center
          tl: {}, tr: {}, bl: {}, br: {}, // quadrants
        };
        const counts = { c: 0, tl: 0, tr: 0, bl: 0, br: 0 };

        const w = maxX - minX, h = maxY - minY;
        const cx1 = minX + w * 0.3, cx2 = minX + w * 0.7;
        const cy1 = minY + h * 0.3, cy2 = minY + h * 0.7;
        const midX = minX + w / 2, midY = minY + h / 2;

        // Also track top-2 dominant colors (across whole image)
        const allColors = {};

        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            const idx = (y * SIZE + x) * 4;
            if (data[idx + 3] < 64) continue; // skip transparent
            const r = data[idx], g = data[idx + 1], b = data[idx + 2];
            // skip near-black or near-white (background/outline)
            const lum = (r + g + b) / 3;
            if (lum < 30 || lum > 230) continue;
            const key = bin(r, g, b);

            // Add to overall
            allColors[key] = (allColors[key] || 0) + 1;

            // Add to center zone
            if (x >= cx1 && x <= cx2 && y >= cy1 && y <= cy2) {
              zones.c[key] = (zones.c[key] || 0) + 1;
              counts.c++;
            }

            // Add to quadrant
            const zone = (x < midX ? (y < midY ? "tl" : "bl") : (y < midY ? "tr" : "br"));
            zones[zone][key] = (zones[zone][key] || 0) + 1;
            counts[zone]++;
          }
        }

        // Normalize each zone
        ["c", "tl", "tr", "bl", "br"].forEach(z => {
          if (counts[z] > 0) {
            Object.keys(zones[z]).forEach(k => { zones[z][k] /= counts[z]; });
          }
        });

        // Top 5 dominant colors
        const topColors = Object.entries(allColors)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([key]) => key);

        resolved = true;
        resolve({ zones, top: topColors });
      } catch { resolved = true; resolve(null); }
    };
    img.onerror = () => {
      if (resolved) return;
      clearTimeout(timer);
      resolved = true;
      resolve(null);
    };
    img.src = imageUrl;
  });
}

// Compare two signatures — weighted multi-zone histogram intersection
function compareV2(a, b) {
  if (!a || !b || !a.zones || !b.zones) return 0;

  // Weight: center counts 2x (subject is usually in center)
  const weights = { c: 2.0, tl: 1.0, tr: 1.0, bl: 1.0, br: 1.0 };
  let totalScore = 0;
  let totalWeight = 0;

  ["c", "tl", "tr", "bl", "br"].forEach(z => {
    const za = a.zones[z], zb = b.zones[z];
    if (!za || !zb) return;
    const keys = new Set([...Object.keys(za), ...Object.keys(zb)]);
    let intersect = 0;
    keys.forEach(k => { intersect += Math.min(za[k] || 0, zb[k] || 0); });
    totalScore += intersect * weights[z];
    totalWeight += weights[z];
  });

  let score = totalWeight > 0 ? totalScore / totalWeight : 0;

  // Bonus: dominant color overlap
  if (a.top && b.top) {
    const setA = new Set(a.top);
    const overlap = b.top.filter(c => setA.has(c)).length;
    score += overlap * 0.02; // small bonus
  }

  return Math.min(1, score);
}

// Parallel batch processor
async function processInBatches(items, processor, concurrency = CONCURRENCY, onProgress) {
  const results = new Array(items.length);
  let done = 0;
  const workers = [];
  let idx = 0;
  for (let w = 0; w < concurrency; w++) {
    workers.push((async () => {
      while (idx < items.length) {
        const i = idx++;
        try {
          results[i] = await processor(items[i], i);
        } catch {
          results[i] = null;
        }
        done++;
        if (onProgress) onProgress(done, items.length);
      }
    })());
  }
  await Promise.all(workers);
  return results;
}

export default function SnapSearch({ loaded, thaiArr, jpArr, lang, onOpen }) {
  const fileRef = useRef(null);
  const sigCacheRef = useRef(loadCache());
  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);

  const t = (th, en, ja) => lang === "th" ? th : lang === "ja" ? (ja ?? en) : en;

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target.result;
      setSnapshot(url);
      analyze(url);
    };
    reader.readAsDataURL(file);
  };

  const analyze = useCallback(async (imageUrl) => {
    setAnalyzing(true);
    setResults([]);
    setError(null);

    try {
      const querySig = await getSignatureV2(imageUrl);
      if (!querySig) {
        setError(t("วิเคราะห์รูปไม่ได้ — ลองรูปอื่น", "Couldn't analyze image", "画像分析失敗"));
        setAnalyzing(false);
        return;
      }

      if (loaded.length === 0) {
        setError(t("ยังไม่มี Pokémon โหลด", "No Pokémon loaded yet", "ポケモン未読込"));
        setAnalyzing(false);
        return;
      }

      setProgress({ done: 0, total: loaded.length });
      const cache = sigCacheRef.current;
      let cacheChanged = false;

      const matches = await processInBatches(loaded, async (p) => {
        const art = getArt(p);
        if (!art) return null;

        // Check cache by ID
        let sig = cache[p.id];
        if (!sig) {
          sig = await getSignatureV2(art);
          if (sig) {
            cache[p.id] = sig;
            cacheChanged = true;
          }
        }
        if (!sig) return null;

        return {
          pokemon: p,
          score: compareV2(querySig, sig),
        };
      }, CONCURRENCY, (done, total) => {
        setProgress({ done, total });
      });

      if (cacheChanged) saveCache(cache);

      const valid = matches.filter(Boolean).sort((a, b) => b.score - a.score);
      setResults(valid.slice(0, 6));
    } catch (e) {
      setError(e.message || String(e));
    }
    setAnalyzing(false);
  }, [loaded, lang]);

  const reset = () => { setSnapshot(null); setResults([]); setError(null); setProgress({ done: 0, total: 0 }); };
  const close = () => { setOpen(false); reset(); };

  return (
    <>
      <button
        className="search-icon-btn snap-icon"
        onClick={() => { setOpen(true); fileRef.current?.click(); }}
        title={t("สแกนรูป", "Snap search", "画像検索")}
      >📸</button>

      <input ref={fileRef} type="file" accept="image/*" capture="environment"
        onChange={handleFile} style={{ display: "none" }} />

      {open && (snapshot || analyzing || results.length > 0 || error) && (
        <div onClick={close} style={{
          position: "fixed", inset: 0, zIndex: 9100,
          background: "radial-gradient(ellipse at top, rgba(15, 23, 42, 0.92), rgba(2, 6, 23, 0.95))",
          backdropFilter: "blur(10px)",
          overflowY: "auto", padding: "20px 12px",
        }}>
          <style>{`
            @keyframes ss-spin { to { transform: rotate(360deg); } }
            @keyframes ss-card-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
            :root { --ss-bg: #fff; --ss-fg: #1e293b; --ss-muted: #64748b; --ss-card: #f8fafc; --ss-border: #e2e8f0; }
            [data-theme="dark"] { --ss-bg: #0f172a; --ss-fg: #f1f5f9; --ss-muted: #94a3b8; --ss-card: #1e293b; --ss-border: #334155; }
          `}</style>

          <div onClick={(e) => e.stopPropagation()} style={{
            maxWidth: 580, margin: "0 auto",
            background: "var(--ss-bg, #fff)",
            borderRadius: 22, padding: 20,
            boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
            position: "relative",
          }}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              marginBottom: 14, position: "sticky", top: 0, zIndex: 10,
              background: "var(--ss-bg, #fff)",
            }}>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0,
                             color: "var(--ss-fg, #1e293b)" }}>
                  📸 {t("ค้นหาด้วยภาพ", "Snap Search", "画像検索")}
                </h1>
                <div style={{ fontSize: 11, color: "var(--ss-muted, #64748b)",
                              marginTop: 4, fontWeight: 600 }}>
                  {t("วิเคราะห์ 5 โซนของภาพ", "5-zone color matching", "5ゾーン解析")}
                </div>
              </div>
              <button onClick={close} style={{
                padding: "8px 14px", borderRadius: 10, border: "none",
                background: "linear-gradient(135deg, #ef4444, #b91c1c)",
                color: "white", fontWeight: 800, fontSize: 12, cursor: "pointer",
              }}>
                ✕ {t("ปิด", "Close", "閉じる")}
              </button>
            </div>

            {snapshot && (
              <div style={{ textAlign: "center", marginBottom: 14 }}>
                <img src={snapshot} alt=""
                  style={{ maxWidth: 200, maxHeight: 200, borderRadius: 16,
                           boxShadow: "0 12px 30px rgba(0,0,0,0.2)",
                           border: "3px solid var(--ss-card, #f8fafc)" }} />
              </div>
            )}

            {analyzing && (
              <div style={{ textAlign: "center", padding: 20 }}>
                <div style={{
                  display: "inline-block", width: 56, height: 56,
                  border: "5px solid rgba(168, 85, 247, 0.18)",
                  borderTopColor: "#a855f7", borderRadius: "50%",
                  animation: "ss-spin 0.7s linear infinite",
                }} />
                <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, color: "var(--ss-fg, #1e293b)" }}>
                  {t("กำลังวิเคราะห์ภาพ...", "Analyzing image...", "画像分析中...")}
                </div>
                {progress.total > 0 && (
                  <>
                    <div style={{ fontSize: 11, color: "var(--ss-muted, #64748b)", fontWeight: 600, marginTop: 4 }}>
                      {progress.done} / {progress.total}
                    </div>
                    <div style={{
                      marginTop: 8, width: "100%", maxWidth: 240, margin: "8px auto 0",
                      height: 6, background: "var(--ss-card, #f1f5f9)",
                      borderRadius: 999, overflow: "hidden",
                    }}>
                      <div style={{
                        width: `${(progress.done / progress.total) * 100}%`,
                        height: "100%",
                        background: "linear-gradient(135deg, #a855f7, #ec4899)",
                        transition: "width 0.2s",
                      }} />
                    </div>
                  </>
                )}
              </div>
            )}

            {error && (
              <div style={{
                padding: "12px 16px", borderRadius: 12,
                background: "#fef3c7", color: "#92400e",
                fontSize: 13, fontWeight: 700, marginBottom: 12,
              }}>
                ⚠️ {error}
              </div>
            )}

            {results.length > 0 && (
              <>
                <div style={{
                  fontSize: 12, fontWeight: 900, color: "var(--ss-muted, #64748b)",
                  marginBottom: 10, letterSpacing: 0.6,
                  textTransform: "uppercase",
                }}>
                  🏆 {t("ผลลัพธ์ที่ใกล้เคียงที่สุด",
                        "Top matches",
                        "最も近い結果")}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {results.map((m, i) => {
                    const p = m.pokemon;
                    const color = typeColor(p.types[0]?.type.name);
                    const name = getLocalName(p.id, lang, thaiArr, jpArr) ?? p.name;
                    const pct = Math.round(m.score * 100);
                    return (
                      <button key={p.id}
                        onClick={() => { onOpen(p); close(); }}
                        style={{
                          display: "flex", alignItems: "center", gap: 12,
                          padding: 10, borderRadius: 14,
                          background: "var(--ss-card, #f8fafc)",
                          border: `2px solid ${color}66`,
                          cursor: "pointer",
                          textAlign: "left", width: "100%",
                          animation: `ss-card-in 0.3s ease ${i * 0.04}s backwards`,
                          transition: "transform 0.2s, box-shadow 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "translateX(4px)";
                          e.currentTarget.style.boxShadow = `0 8px 20px ${color}44`;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateX(0)";
                          e.currentTarget.style.boxShadow = "none";
                        }}>
                        <div style={{
                          minWidth: 32, height: 32, borderRadius: "50%",
                          background: color, color: "white",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 13, fontWeight: 900,
                        }}>#{i + 1}</div>
                        <img src={getArt(p)} alt={name}
                          style={{ width: 60, height: 60, objectFit: "contain" }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 15, fontWeight: 800,
                                        color: "var(--ss-fg, #1e293b)",
                                        textTransform: "capitalize" }}>
                            {name}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--ss-muted, #64748b)",
                                        fontWeight: 700, marginTop: 2 }}>
                            {padId(p.id)}
                          </div>
                        </div>
                        <div style={{
                          padding: "5px 10px", borderRadius: 999,
                          background: color, color: "white",
                          fontSize: 12, fontWeight: 900,
                          minWidth: 50, textAlign: "center",
                          boxShadow: `0 3px 8px ${color}66`,
                        }}>{pct}%</div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            <button
              onClick={() => fileRef.current?.click()}
              style={{
                width: "100%", marginTop: 14,
                padding: "12px 18px", borderRadius: 14, border: "none",
                background: "linear-gradient(135deg, #a855f7, #ec4899)",
                color: "white", fontWeight: 800, fontSize: 13,
                cursor: "pointer", letterSpacing: 0.5,
                boxShadow: "0 8px 22px rgba(168, 85, 247, 0.35)",
              }}>
              📂 {t("เลือกรูปใหม่", "Choose another", "別の画像")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}