// ─── SummaryOverview — Beautiful real-time PoGO dashboard ──────
// Aggregates: Top raids · Active events · Egg highlights · Research
// Plus: "Save as Image" button (uses html2canvas loaded on-demand)

import { useState, useEffect, useRef, useCallback } from "react";
import { useModalLifecycle, matchPokemonId, pokeApiArtwork } from "../perfUtils.js";

const RAIDS_URL    = "https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/raids.json";
const EVENTS_URL   = "https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/events.json";
const EGGS_URL     = "https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/eggs.json";
const RESEARCH_URL = "https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/research.json";

const TYPE_COLORS = {
  Normal: "#A8A878", Fire: "#F08030", Water: "#6890F0", Electric: "#F8D030",
  Grass: "#78C850", Ice: "#98D8D8", Fighting: "#C03028", Poison: "#A040A0",
  Ground: "#E0C068", Flying: "#A890F0", Psychic: "#F85888", Bug: "#A8B820",
  Rock: "#B8A038", Ghost: "#705898", Dragon: "#7038F8", Dark: "#705848",
  Steel: "#B8B8D0", Fairy: "#EE99AC",
};

// Dynamically load html2canvas from CDN
function loadHtml2Canvas() {
  return new Promise((resolve, reject) => {
    if (window.html2canvas) return resolve(window.html2canvas);
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
    script.onload = () => resolve(window.html2canvas);
    script.onerror = () => reject(new Error("Failed to load html2canvas"));
    document.head.appendChild(script);
  });
}

export default function SummaryOverview({ lang = "en", onClose, onOpenPokemon, allList = [] }) {
  useModalLifecycle(onClose);
  const captureRef = useRef(null);
  const [raids,    setRaids]    = useState(null);
  const [events,   setEvents]   = useState(null);
  const [eggs,     setEggs]     = useState(null);
  const [research, setResearch] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [savedMsg, setSavedMsg] = useState(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Fetch all data sources in parallel
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [rR, rE, rEg, rRes] = await Promise.all([
        fetch(RAIDS_URL).then(r => r.ok ? r.json() : []),
        fetch(EVENTS_URL).then(r => r.ok ? r.json() : []),
        fetch(EGGS_URL).then(r => r.ok ? r.json() : []),
        fetch(RESEARCH_URL).then(r => r.ok ? r.json() : []),
      ]);
      setRaids(rR);
      setEvents(rE);
      setEggs(rEg);
      setResearch(rRes);
    } catch (e) {
      console.error("Summary fetch failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const t = (th, en, ja) => lang === "th" ? th : lang === "ja" ? (ja ?? en) : en;

  // Save dashboard as image
  const handleSaveImage = async () => {
    if (!captureRef.current) return;
    setSaving(true);
    setSavedMsg(null);
    try {
      const html2canvas = await loadHtml2Canvas();
      const canvas = await html2canvas(captureRef.current, {
        backgroundColor: "#0f172a",
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
      });
      canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const date = new Date().toISOString().split("T")[0];
        a.download = `hexadex-pogo-${date}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setSavedMsg(t("บันทึกรูปสำเร็จ!", "Image saved!", "保存しました!"));
        setTimeout(() => setSavedMsg(null), 3000);
      }, "image/png", 0.95);
    } catch (e) {
      setSavedMsg(t("บันทึกล้มเหลว", "Save failed", "保存失敗"));
      setTimeout(() => setSavedMsg(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  // Filter helpers
  const topRaids = (raids || []).filter(r => ["Mega Raids", "5-Star Raids"].includes(r.tier)).slice(0, 6);
  const activeEvents = (events || []).filter(e => {
    if (!e.start || !e.end) return false;
    const start = new Date(e.start).getTime();
    const end = new Date(e.end).getTime();
    return start <= now && now <= end;
  }).slice(0, 4);
  const shinyEggs = (eggs || []).filter(e => e.canBeShiny).slice(0, 5);
  const topResearch = (research || []).slice(0, 5);

  const dateStr = new Date().toLocaleDateString(lang === "th" ? "th-TH" : lang === "ja" ? "ja-JP" : "en-US",
    { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 9000,
      background: "radial-gradient(ellipse at top, rgba(15, 23, 42, 0.95), rgba(2, 6, 23, 0.98))",
      backdropFilter: "blur(12px)",
      overflowY: "auto", padding: "20px 12px",
    }}>
      <style>{`
        @keyframes so-spin { to { transform: rotate(360deg); } }
        @keyframes so-card-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .so-mini-card { cursor: pointer; transition: transform 0.2s; }
        .so-mini-card:hover { transform: translateY(-3px); }
      `}</style>

      <div onClick={(e) => e.stopPropagation()} style={{
        maxWidth: 1100, margin: "0 auto",
        background: "var(--so-bg, #fff)",
        borderRadius: 22, padding: "16px",
        boxShadow: "0 28px 80px rgba(0, 0, 0, 0.5)",
        position: "relative",
      }}>
        {/* Top bar (NOT captured in image) */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 12, padding: "0 4px",
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--so-muted, #64748b)" }}>
            📊 {t("สรุปกิจกรรม Pokémon GO", "Pokémon GO Activity Summary", "ポケモンGO アクティビティ概要")}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleSaveImage} disabled={saving || loading} style={{
              padding: "9px 16px", borderRadius: 12, border: "none",
              background: "linear-gradient(135deg, #06b6d4, #2563eb)",
              color: "white", fontWeight: 800, fontSize: 13,
              cursor: (saving || loading) ? "wait" : "pointer",
              opacity: (saving || loading) ? 0.6 : 1,
              display: "inline-flex", alignItems: "center", gap: 6,
              boxShadow: "0 6px 18px rgba(37, 99, 235, 0.4)",
            }}>
              <span style={{ display: "inline-block", animation: saving ? "so-spin 1s linear infinite" : "none" }}>
                {saving ? "⏳" : "📸"}
              </span>
              {saving
                ? t("กำลังบันทึก...", "Saving...", "保存中...")
                : t("เซฟเป็นรูป", "Save as Image", "画像保存")}
            </button>
            <button onClick={onClose} style={{
              padding: "9px 16px", borderRadius: 12, border: "none",
              background: "linear-gradient(135deg, #ef4444, #b91c1c)",
              color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer",
            }}>
              ✕ {t("ปิด", "Close", "閉じる")}
            </button>
          </div>
        </div>

        {savedMsg && (
          <div style={{
            background: savedMsg.includes("ล้มเหลว") || savedMsg.includes("failed") ? "#fee2e2" : "#dcfce7",
            color: savedMsg.includes("ล้มเหลว") || savedMsg.includes("failed") ? "#991b1b" : "#15803d",
            padding: "8px 14px", borderRadius: 10,
            fontSize: 12, fontWeight: 700, marginBottom: 10, textAlign: "center",
          }}>
            {savedMsg.includes("ล้มเหลว") || savedMsg.includes("failed") ? "❌" : "✅"} {savedMsg}
          </div>
        )}

        {/* ━━━ CAPTURE AREA (this gets saved) ━━━ */}
        <div ref={captureRef} style={{
          background: "linear-gradient(160deg, #0f172a 0%, #1e293b 100%)",
          borderRadius: 18, padding: "24px 22px",
          color: "white",
        }}>
          {/* Capture header — branded */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 20, flexWrap: "wrap", gap: 8,
          }}>
            <div>
              <div style={{
                fontSize: 26, fontWeight: 900, letterSpacing: "-0.02em",
                background: "linear-gradient(135deg, #fde047, #f97316, #ef4444)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                marginBottom: 2,
              }}>
                🎯 HexaDex · Pokémon GO Live
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", fontWeight: 600 }}>
                📅 {dateStr}
              </div>
            </div>
            <div style={{
              background: "linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.1))",
              border: "1.5px solid rgba(239, 68, 68, 0.4)",
              borderRadius: 999, padding: "6px 14px",
              fontSize: 11, fontWeight: 900, letterSpacing: 1,
              display: "inline-flex", alignItems: "center", gap: 6,
              color: "#fca5a5",
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: "50%",
                background: "#ef4444", boxShadow: "0 0 8px #ef4444",
              }} />
              LIVE DATA
            </div>
          </div>

          {/* Loading state */}
          {loading && (
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              <div style={{ display: "inline-block", width: 48, height: 48,
                            border: "4px solid rgba(255,255,255,0.1)",
                            borderTopColor: "#06b6d4", borderRadius: "50%",
                            animation: "so-spin 0.8s linear infinite" }} />
              <div style={{ marginTop: 12, color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: 600 }}>
                {t("กำลังโหลดข้อมูล...", "Loading data...", "データ読み込み中...")}
              </div>
            </div>
          )}

          {!loading && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {/* TOP RAIDS */}
              <Section title={t("🔴 Raid Boss วันนี้", "🔴 Today's Raid Bosses", "🔴 今日のレイド")}
                       color="#dc2626" count={topRaids.length}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  {topRaids.map((boss, i) => {
                    const pid = matchPokemonId(boss, allList);
                    const img = pid ? pokeApiArtwork(pid) : boss.image;
                    return (
                      <div key={i}
                        className="so-mini-card"
                        onClick={() => onOpenPokemon?.(boss)}
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          borderRadius: 10, padding: 6,
                          border: "1px solid rgba(220, 38, 38, 0.2)",
                          textAlign: "center",
                          animation: `so-card-in 0.3s ease ${i * 0.04}s backwards`,
                        }}>
                        <div style={{
                          height: 50, display: "flex",
                          alignItems: "center", justifyContent: "center",
                        }}>
                          {img && (
                            <img src={img} alt={boss.name}
                              crossOrigin="anonymous"
                              style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                              onError={(e) => { if (boss.image && e.currentTarget.src !== boss.image) e.currentTarget.src = boss.image; }}
                            />
                          )}
                        </div>
                        <div style={{ fontSize: 9, fontWeight: 700, marginTop: 2, lineHeight: 1.2 }}>
                          {boss.name}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Section>

              {/* ACTIVE EVENTS */}
              <Section title={t("📅 อีเวนต์", "📅 Active Events", "📅 アクティブイベント")}
                       color="#a855f7" count={activeEvents.length}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {activeEvents.length === 0 ? (
                    <div style={{ fontSize: 11, opacity: 0.6, padding: 6 }}>
                      {t("ไม่มีอีเวนต์ที่ active", "No active events", "アクティブなイベントなし")}
                    </div>
                  ) : activeEvents.map((ev, i) => {
                    const end = new Date(ev.end).getTime();
                    const ms = end - now;
                    const d = Math.floor(ms / 86400000);
                    const h = Math.floor((ms % 86400000) / 3600000);
                    return (
                      <div key={i} style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(168, 85, 247, 0.2)",
                        borderRadius: 8, padding: 8,
                      }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: "white", lineHeight: 1.3 }}>
                          {ev.name}
                        </div>
                        <div style={{ fontSize: 9, color: "#c084fc", marginTop: 2, fontWeight: 600 }}>
                          ⏳ {d > 0 ? `${d}d ${h}h` : `${h}h`} {t("เหลือ", "left", "残り")}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Section>

              {/* EGG HIGHLIGHTS */}
              <Section title={t("🥚 ไข่ที่ Shiny ได้", "🥚 Shiny Egg Hatches", "🥚 色違い卵")}
                       color="#f59e0b" count={shinyEggs.length}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 5 }}>
                  {shinyEggs.map((p, i) => {
                    const pid = matchPokemonId(p, allList);
                    const img = pid ? pokeApiArtwork(pid) : p.image;
                    return (
                      <div key={i}
                        className="so-mini-card"
                        onClick={() => onOpenPokemon?.(p)}
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          borderRadius: 8, padding: 4,
                          border: "1px solid rgba(245, 158, 11, 0.2)",
                          textAlign: "center",
                          position: "relative",
                        }}>
                        <div style={{
                          position: "absolute", top: 2, right: 2,
                          fontSize: 8, color: "#fbbf24",
                        }}>✨</div>
                        <div style={{ height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {img && (
                            <img src={img} alt={p.name}
                              crossOrigin="anonymous"
                              style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                              onError={(e) => { if (p.image && e.currentTarget.src !== p.image) e.currentTarget.src = p.image; }}
                            />
                          )}
                        </div>
                        <div style={{ fontSize: 8, marginTop: 1, opacity: 0.85, lineHeight: 1.2 }}>
                          {(p.eggType || "").replace(/\s*km\s*/i, "km")}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Section>

              {/* RESEARCH HIGHLIGHTS */}
              <Section title={t("📋 งานพิเศษ", "📋 Field Research", "📋 リサーチ")}
                       color="#0ea5e9" count={topResearch.length}>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {topResearch.map((task, i) => (
                    <div key={i} style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(14, 165, 233, 0.2)",
                      borderRadius: 8, padding: 6,
                    }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "white", lineHeight: 1.3 }}>
                        {task.text}
                      </div>
                      {task.rewards?.[0] && (
                        <div style={{
                          fontSize: 9, color: "#7dd3fc", marginTop: 2, fontWeight: 600,
                          display: "flex", alignItems: "center", gap: 4,
                        }}>
                          → {task.rewards[0].name}
                          {task.rewards[0].canBeShiny && <span>✨</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            </div>
          )}

          {/* Capture footer */}
          <div style={{
            marginTop: 18, paddingTop: 12,
            borderTop: "1px solid rgba(255,255,255,0.08)",
            display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6,
            fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 600,
          }}>
            <span>🔴 {t("ข้อมูลสด จาก LeekDuck", "Live data from LeekDuck", "ライブデータ: LeekDuck")}</span>
            <span>{t("สร้างจาก HexaDex", "Generated by HexaDex", "HexaDexで生成")}</span>
          </div>
        </div>
        {/* ━━━ END CAPTURE AREA ━━━ */}

        <style>{`
          :root { --so-bg: #fff; --so-muted: #64748b; }
          [data-theme="dark"] { --so-bg: #0f172a; --so-muted: #94a3b8; }
        `}</style>
      </div>
    </div>
  );
}

function Section({ title, color, count, children }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      border: `1.5px solid ${color}30`,
      borderRadius: 14, padding: 12,
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: -20, right: -20,
        width: 60, height: 60, borderRadius: "50%",
        background: color, opacity: 0.08, filter: "blur(8px)",
        pointerEvents: "none",
      }} />
      <div style={{
        fontSize: 12, fontWeight: 900, letterSpacing: 0.5,
        color: "white", marginBottom: 10,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span>{title}</span>
        <span style={{
          background: color, color: "white",
          padding: "2px 8px", borderRadius: 999,
          fontSize: 9, fontWeight: 900,
        }}>
          {count}
        </span>
      </div>
      {children}
    </div>
  );
}