// ─── SummaryOverview — Beautiful real-time PoGO dashboard ──────
// Aggregates: Top raids · Active events · Egg highlights · Research
// Plus: "Save as Image" button (uses html2canvas loaded on-demand)

import { useState, useEffect, useRef, useCallback } from "react";
import {
  BarChart3, Camera, Loader2, X, XCircle, CheckCircle2, Target, CalendarDays,
  Swords, Egg, ClipboardList, Sparkles,
} from "lucide-react";
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
        backgroundColor: null,
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
      background: "rgba(20, 19, 22, 0.6)",
      backdropFilter: "blur(8px)",
      overflowY: "auto", padding: "20px 12px",
    }}>
      <style>{`
        @keyframes so-spin { to { transform: rotate(360deg); } }
        @keyframes so-pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.45; transform: scale(0.7); } }
        @keyframes so-card-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .so-mini-card { cursor: pointer; transition: transform 0.2s; }
        .so-mini-card:hover { transform: translateY(-3px); }
      `}</style>

      <div onClick={(e) => e.stopPropagation()} style={{
        maxWidth: 1100, margin: "0 auto",
        background: "var(--bg-card)",
        borderRadius: 24, padding: "16px",
        boxShadow: "0 28px 80px rgba(0, 0, 0, 0.5)",
        position: "relative",
      }}>
        {/* Top bar (NOT captured in image) */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 12, padding: "0 4px",
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-secondary)",
                        display: "inline-flex", alignItems: "center", gap: 8 }}>
            <BarChart3 size={16} strokeWidth={2.2} style={{ color: "var(--blue)" }} /> {t("สรุปกิจกรรม Pokémon GO", "Pokémon GO Activity Summary", "ポケモンGO アクティビティ概要")}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleSaveImage} disabled={saving || loading} style={{
              padding: "8px 15px", borderRadius: 999, border: "none",
              background: "var(--blue)",
              color: "white", fontWeight: 800, fontSize: 13,
              cursor: (saving || loading) ? "wait" : "pointer",
              opacity: (saving || loading) ? 0.6 : 1,
              display: "inline-flex", alignItems: "center", gap: 6,
              boxShadow: "var(--shadow-sm)",
            }}>
              {saving
                ? <Loader2 size={14} strokeWidth={2.4} style={{ animation: "so-spin 1s linear infinite" }} />
                : <Camera size={14} strokeWidth={2.2} />}
              {saving
                ? t("กำลังบันทึก...", "Saving...", "保存中...")
                : t("เซฟเป็นรูป", "Save as Image", "画像保存")}
            </button>
            <button onClick={onClose} style={{
              padding: "8px 14px", borderRadius: 999,
              border: "1px solid var(--border)", background: "var(--bg-muted)",
              color: "var(--text-primary)", fontWeight: 700, fontSize: 13, cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 6,
            }}>
              <X size={15} strokeWidth={2.4} /> {t("ปิด", "Close", "閉じる")}
            </button>
          </div>
        </div>

        {savedMsg && (
          <div style={{
            background: savedMsg.includes("ล้มเหลว") || savedMsg.includes("failed") ? "#fee2e2" : "#dcfce7",
            color: savedMsg.includes("ล้มเหลว") || savedMsg.includes("failed") ? "#991b1b" : "#15803d",
            padding: "8px 14px", borderRadius: 13,
            fontSize: 12, fontWeight: 700, marginBottom: 10, textAlign: "center",
          }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "center" }}>{savedMsg.includes("ล้มเหลว") || savedMsg.includes("failed") ? <XCircle size={14} strokeWidth={2.4} /> : <CheckCircle2 size={14} strokeWidth={2.4} />} {savedMsg}</span>
          </div>
        )}

        {/* ━━━ CAPTURE AREA (this gets saved) ━━━ */}
        <div ref={captureRef} style={{
          position: "relative",
          background: "var(--bg)",
          borderRadius: 24, padding: "30px 28px 26px",
          color: "var(--text-primary)", overflow: "hidden",
          border: "1px solid var(--border)",
        }}>
          {/* Capture header — minimal masthead */}
          <div style={{
            display: "flex", alignItems: "flex-start", justifyContent: "space-between",
            marginBottom: 22, flexWrap: "wrap", gap: 10,
          }}>
            <div>
              <div style={{
                fontSize: 25, fontWeight: 900, letterSpacing: "-0.03em",
                color: "var(--text-primary)", marginBottom: 4,
                display: "inline-flex", alignItems: "center", gap: 9,
              }}>
                <span style={{
                  width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                  background: "#900603",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "inset 0 -7px 0 rgba(0,0,0,0.12)",
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--bg)" }} />
                </span>
                HexaDex
              </div>
              <div style={{ fontSize: 12.5, color: "var(--text-secondary)", fontWeight: 600, letterSpacing: "0.04em" }}>
                Pokémon GO · {t("สรุปกิจกรรมสด", "Live Activity", "ライブ概要")}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                fontSize: 10, fontWeight: 800, letterSpacing: 1.5,
                color: "#900603", textTransform: "uppercase",
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: "50%", background: "#dc2626",
                  animation: "so-pulse 1.6s ease-in-out infinite",
                }} />
                Live
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, marginTop: 4 }}>
                {dateStr}
              </div>
            </div>
          </div>

          {/* Loading state */}
          {loading && (
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              <div style={{ display: "inline-block", width: 48, height: 48,
                            border: "4px solid rgba(0,0,0,0.08)",
                            borderTopColor: "#900603", borderRadius: "50%",
                            animation: "so-spin 0.8s linear infinite" }} />
              <div style={{ marginTop: 12, color: "var(--text-secondary)", fontSize: 13, fontWeight: 600 }}>
                {t("กำลังโหลดข้อมูล...", "Loading data...", "データ読み込み中...")}
              </div>
            </div>
          )}

          {!loading && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {/* TOP RAIDS */}
              <Section title={t("Raid Boss วันนี้", "Today's Raid Bosses", "今日のレイド")}
                       Icon={Swords} color="#dc2626" count={topRaids.length}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  {topRaids.map((boss, i) => {
                    const pid = matchPokemonId(boss, allList);
                    const img = pid ? pokeApiArtwork(pid) : boss.image;
                    return (
                      <div key={i}
                        className="so-mini-card"
                        onClick={() => onOpenPokemon?.(boss)}
                        style={{
                          background: "#f7f5f0",
                          borderRadius: 13, padding: 6,
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
              <Section title={t("อีเวนต์", "Active Events", "アクティブイベント")}
                       Icon={CalendarDays} color="#b5302d" count={activeEvents.length}>
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
                        background: "#f7f5f0",
                        border: "1px solid rgba(181, 48, 45, 0.2)",
                        borderRadius: 11, padding: 8,
                      }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.3 }}>
                          {ev.name}
                        </div>
                        <div style={{ fontSize: 9, color: "#b5302d", marginTop: 2, fontWeight: 800 }}>
                          {d > 0 ? `${d}d ${h}h` : `${h}h`} {t("เหลือ", "left", "残り")}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Section>

              {/* EGG HIGHLIGHTS */}
              <Section title={t("ไข่ที่ Shiny ได้", "Shiny Egg Hatches", "色違い卵")}
                       Icon={Egg} color="#f59e0b" count={shinyEggs.length}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 5 }}>
                  {shinyEggs.map((p, i) => {
                    const pid = matchPokemonId(p, allList);
                    const img = pid ? pokeApiArtwork(pid) : p.image;
                    return (
                      <div key={i}
                        className="so-mini-card"
                        onClick={() => onOpenPokemon?.(p)}
                        style={{
                          background: "#f7f5f0",
                          borderRadius: 11, padding: 4,
                          border: "1px solid rgba(245, 158, 11, 0.2)",
                          textAlign: "center",
                          position: "relative",
                        }}>
                        <div style={{
                          position: "absolute", top: 2, right: 2,
                          color: "#e0a92e", display: "flex",
                        }}><Sparkles size={9} strokeWidth={2.4} /></div>
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
              <Section title={t("งานพิเศษ", "Field Research", "リサーチ")}
                       Icon={ClipboardList} color="#a31a16" count={topResearch.length}>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {topResearch.map((task, i) => (
                    <div key={i} style={{
                      background: "#f7f5f0",
                      border: "1px solid var(--border)",
                      borderRadius: 11, padding: 6,
                    }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.3 }}>
                        {task.text}
                      </div>
                      {task.rewards?.[0] && (
                        <div style={{
                          fontSize: 9, color: "#7dd3fc", marginTop: 2, fontWeight: 600,
                          display: "flex", alignItems: "center", gap: 4,
                        }}>
                          → {task.rewards[0].name}
                          {task.rewards[0].canBeShiny && <span style={{ display: "inline-flex", color: "#e0a92e" }}><Sparkles size={10} strokeWidth={2.4} /></span>}
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
            marginTop: 18, paddingTop: 13,
            borderTop: "1px solid var(--border)",
            display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6,
            fontSize: 10, color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.02em",
          }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ff5a52", display: "inline-block" }} /> {t("ข้อมูลสด จาก LeekDuck", "Live data from LeekDuck", "ライブデータ: LeekDuck")}</span>
            <span>{t("สร้างจาก HexaDex", "Generated by HexaDex", "HexaDexで生成")}</span>
          </div>
        </div>
        {/* ━━━ END CAPTURE AREA ━━━ */}

        <style>{`
          :root { --so-bg: #fff; --so-fg: var(--text-primary); --so-muted: var(--text-secondary); }
          [data-theme="dark"] { --so-bg: #1a1816; --so-fg: #efece4; --so-muted: var(--text-muted); }
        `}</style>
      </div>
    </div>
  );
}

function Section({ title, Icon, color, count, children }) {
  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: 19, padding: "14px 15px 15px",
      position: "relative",
      boxShadow: "0 1px 3px rgba(31,29,32,0.04)",
    }}>
      <div style={{
        fontSize: 12.5, fontWeight: 800, letterSpacing: "-0.01em",
        color: "var(--text-primary)", marginBottom: 12,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span style={{
            width: 26, height: 26, borderRadius: 11, flexShrink: 0,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            background: `color-mix(in srgb, ${color} 13%, transparent)`, color,
          }}>
            {Icon && <Icon size={14} strokeWidth={2.4} />}
          </span>
          {title}
        </span>
        <span style={{
          background: `color-mix(in srgb, ${color} 12%, transparent)`, color,
          padding: "2px 9px", borderRadius: 999,
          fontSize: 10, fontWeight: 900,
        }}>
          {count}
        </span>
      </div>
      {children}
    </div>
  );
}