// ─── FieldResearch — Pokemon GO Field Research tasks (real-time) ──
// Data source: ScrapedDuck research.json
// Shows: current Field Research tasks → reward Pokémon

import { useState, useEffect, useCallback } from "react";
import { ClipboardList, X, AlertTriangle, RefreshCw, MapPin, Sparkles, HelpCircle } from "lucide-react";
import { useModalLifecycle, matchPokemonId, pokeApiArtwork } from "../perfUtils.js";

const RESEARCH_URL = "https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/research.json";
const CACHE_KEY    = "pkdx_research_cache_v1";
const CACHE_TTL    = 60 * 60 * 1000;

const TYPE_COLORS = {
  Normal: "#A8A878", Fire: "#F08030", Water: "#6890F0", Electric: "#F8D030",
  Grass: "#78C850", Ice: "#98D8D8", Fighting: "#C03028", Poison: "#A040A0",
  Ground: "#E0C068", Flying: "#A890F0", Psychic: "#F85888", Bug: "#A8B820",
  Rock: "#B8A038", Ghost: "#705898", Dragon: "#7038F8", Dark: "#705848",
  Steel: "#B8B8D0", Fairy: "#EE99AC",
};

// Category metadata (research category color/icon)
const CATEGORY_META = {
  default: { color: "#a31a16" },
};

export default function FieldResearch({ lang = "en", onClose, onOpenPokemon, allList = [] }) {
  useModalLifecycle(onClose);
  const [research,    setResearch]    = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchResearch = useCallback(async (force = false) => {
    setLoading(true); setError(null);
    if (!force) {
      try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
          setResearch(cached.data);
          setLastUpdated(cached.timestamp);
          setLoading(false);
          return;
        }
      } catch {}
    }
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch(RESEARCH_URL, { signal: controller.signal, cache: force ? "reload" : "default" });
      clearTimeout(tid);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResearch(data);
      const t = Date.now();
      setLastUpdated(t);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: t })); } catch {}
    } catch (e) {
      clearTimeout(tid);
      setError(e.name === "AbortError"
        ? (lang === "th" ? "หมดเวลาเชื่อมต่อ" : "Connection timed out")
        : e.message);
      try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
        if (cached?.data) { setResearch(cached.data); setLastUpdated(cached.timestamp); }
      } catch {}
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => { fetchResearch(); }, [fetchResearch]);

  const t = (th, en, ja) => lang === "th" ? th : lang === "ja" ? (ja ?? en) : en;
  const formatAge = (ts) => {
    if (!ts) return "";
    const mins = Math.floor((Date.now() - ts) / 60000);
    if (mins < 1) return t("เมื่อสักครู่", "just now", "たった今");
    if (mins < 60) return t(`${mins} นาทีก่อน`, `${mins}m ago`, `${mins}分前`);
    return t(`${Math.floor(mins / 60)} ชม.ก่อน`, `${Math.floor(mins / 60)}h ago`, `${Math.floor(mins / 60)}時間前`);
  };

  // Group by research category
  const grouped = {};
  (research || []).forEach(r => {
    const cat = r.category || "General";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(r);
  });

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 9000,
      background: "rgba(20, 19, 22, 0.55)", backdropFilter: "blur(8px)",
      overflowY: "auto", padding: "20px 12px",
      animation: "fr-overlay-in 0.3s ease",
    }}>
      <style>{`
        @keyframes fr-overlay-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fr-card-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fr-spin { to { transform: rotate(360deg); } }
        .fr-task { transition: transform 0.2s, box-shadow 0.2s; }
        .fr-task:hover { transform: translateX(4px); box-shadow: 0 8px 24px rgba(0,0,0,0.15); }
      `}</style>

      <div onClick={(e) => e.stopPropagation()} style={{
        maxWidth: 1100, margin: "0 auto",
        background: "var(--fr-bg, #fff)",
        borderRadius: 24, padding: "20px 16px 24px",
        boxShadow: "0 28px 80px rgba(0,0,0,0.4)",
        minHeight: "85vh",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                      flexWrap: "wrap", gap: 12, marginBottom: 18, padding: "0 4px" }}>
          <div>
            <h1 style={{ fontSize: 21, fontWeight: 800, margin: 0,
                         color: "var(--fr-fg, #1f1d20)", letterSpacing: "-0.01em",
                         display: "inline-flex", alignItems: "center", gap: 9 }}>
              <ClipboardList size={20} strokeWidth={2.2} style={{ color: "var(--blue)" }} /> {t("งานพิเศษ (Field Research)", "Field Research Tasks", "フィールドリサーチ")}
            </h1>
            <div style={{ fontSize: 12, color: "var(--fr-muted, #64748b)", marginTop: 4, fontWeight: 600 }}>
              {t(`อัปเดต ${formatAge(lastUpdated)} · จาก LeekDuck`,
                 `Updated ${formatAge(lastUpdated)} · from LeekDuck`,
                 `更新: ${formatAge(lastUpdated)} · LeekDuck`)}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => fetchResearch(true)} disabled={loading} style={{
              padding: "8px 14px", borderRadius: 13,
              border: "1.5px solid var(--fr-border, #e2e8f0)",
              background: "var(--fr-card, #f8fafc)",
              color: "var(--fr-fg, #475569)",
              fontWeight: 700, fontSize: 12,
              cursor: loading ? "wait" : "pointer", opacity: loading ? 0.6 : 1,
              display: "inline-flex", alignItems: "center", gap: 6,
            }}>
              <RefreshCw size={13} strokeWidth={2.2} style={{ animation: loading ? "fr-spin 1s linear infinite" : "none" }} />
              {t("รีเฟรช", "Refresh", "更新")}
            </button>
            <button onClick={onClose} style={{
              padding: "8px 14px", borderRadius: 999,
              border: "1px solid var(--border)", background: "var(--bg-muted)",
              color: "var(--fr-fg)", fontWeight: 700, fontSize: 12, cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 6,
            }}>
              <X size={15} strokeWidth={2.4} /> {t("ปิด", "Close", "閉じる")}
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && !research && (
          <div style={{ padding: "30px 10px", textAlign: "center" }}>
            <div style={{ display: "inline-block", width: 48, height: 48,
                          border: "4px solid var(--fr-border, #e2e8f0)",
                          borderTopColor: "#a31a16", borderRadius: "50%",
                          animation: "fr-spin 0.8s linear infinite" }} />
            <div style={{ marginTop: 12, color: "var(--fr-muted, #64748b)", fontSize: 13, fontWeight: 600 }}>
              {t("กำลังโหลดงานพิเศษ...", "Loading research tasks...", "リサーチタスクを読み込み中...")}
            </div>
          </div>
        )}

        {/* Error */}
        {error && !research && (
          <div style={{ padding: "40px 20px", textAlign: "center",
                        background: "rgba(239, 68, 68, 0.08)",
                        border: "1.5px solid rgba(239, 68, 68, 0.25)",
                        borderRadius: 17 }}>
            <div style={{ marginBottom: 8, display: "flex", justifyContent: "center", color: "#dc2626" }}><AlertTriangle size={38} strokeWidth={1.8} /></div>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#dc2626", marginBottom: 6 }}>
              {t("โหลดไม่สำเร็จ", "Failed to load", "読み込み失敗")}
            </div>
            <div style={{ fontSize: 12, color: "#7f1d1d" }}>{error}</div>
          </div>
        )}

        {/* Research groups */}
        {research && Object.entries(grouped).map(([category, tasks]) => (
          <div key={category} style={{ marginBottom: 20 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 9,
              padding: "0 4px 11px", marginBottom: 12,
              borderBottom: "1px solid var(--fr-border)",
              color: "var(--fr-fg)", fontWeight: 800, fontSize: 14, letterSpacing: 0.2,
            }}>
              <ClipboardList size={16} strokeWidth={2.2} style={{ color: "var(--blue)" }} />
              <span style={{ textTransform: "capitalize" }}>{category}</span>
              <span style={{
                marginLeft: "auto", background: "var(--fr-card)",
                border: "1px solid var(--fr-border)", color: "var(--fr-muted)",
                padding: "2px 9px", borderRadius: 999, fontSize: 10.5, fontWeight: 800,
              }}>
                {tasks.length} {t("งาน", "tasks", "タスク")}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {tasks.map((task, i) => (
                <TaskCard key={i} task={task} lang={lang}
                  onOpenPokemon={onOpenPokemon} allList={allList} delay={i * 0.03} />
              ))}
            </div>
          </div>
        ))}

        {/* Footer */}
        <div style={{
          marginTop: 24, paddingTop: 14,
          borderTop: "1px solid var(--fr-border, #e2e8f0)",
          fontSize: 10, color: "var(--fr-muted, #94a3b8)",
          textAlign: "center", letterSpacing: 0.3,
        }}>
          {t("ข้อมูลจาก LeekDuck.com ผ่าน ScrapedDuck · อัปเดตทุก 1 ชั่วโมง",
             "Data from LeekDuck.com via ScrapedDuck · Cached 1 hour",
             "データ元: LeekDuck.com (ScrapedDuck) · 1時間キャッシュ")}
        </div>

        <style>{`
          :root { --fr-bg: #fff; --fr-fg: #1f1d20; --fr-muted: #7a766e; --fr-card: #f4f2ec; --fr-border: #e5e0d5; }
          [data-theme="dark"] { --fr-bg: #1a1816; --fr-fg: #efece4; --fr-muted: #9c988e; --fr-card: #211f20; --fr-border: #2c2926; }
        `}</style>
      </div>
    </div>
  );
}

function TaskCard({ task, lang, onOpenPokemon, allList = [], delay = 0 }) {
  const rewards = task.rewards || [];

  return (
    <div className="fr-task" style={{
      background: "var(--fr-card, #fff)",
      borderRadius: 15,
      border: "1.5px solid var(--fr-border, #e2e8f0)",
      padding: "12px 14px",
      display: "flex",
      gap: 14,
      alignItems: "center",
      animation: `fr-card-in 0.35s ease ${delay}s backwards`,
    }}>
      {/* Task text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 700,
          color: "var(--fr-fg, #1f1d20)", lineHeight: 1.4,
          display: "inline-flex", alignItems: "flex-start", gap: 6,
        }}>
          <MapPin size={14} strokeWidth={2.2} style={{ color: "var(--blue)", flexShrink: 0, marginTop: 1 }} /> {task.text}
        </div>
      </div>

      {/* Reward arrow */}
      <div style={{ fontSize: 18, color: "#94a3b8" }}>→</div>

      {/* Rewards (Pokémon thumbnails) */}
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        {rewards.map((reward, i) => (
          <div
            key={i}
            onClick={() => onOpenPokemon?.(reward)}
            style={{
              width: 64, height: 64,
              background: "var(--fr-card)",
              borderRadius: 13,
              border: "1px solid var(--fr-border)",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              padding: 4, position: "relative",
              cursor: onOpenPokemon ? "pointer" : "default",
              transition: "transform 0.2s, border-color 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.08)";
              e.currentTarget.style.borderColor = "#a31a16";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.borderColor = "var(--fr-border)";
            }}>
            {reward.canBeShiny && (
              <div style={{
                position: "absolute", top: 3, right: 3, color: "#e0a92e",
              }}>
                <Sparkles size={11} strokeWidth={2.4} />
              </div>
            )}
            {(() => {
              const pid = matchPokemonId(reward, allList);
              const primary = pid ? pokeApiArtwork(pid) : reward.image;
              const fallback = reward.image;
              return primary ? (
                <img src={primary} alt={reward.name} loading="lazy"
                  style={{ width: 42, height: 42, objectFit: "contain",
                           filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.15))" }}
                  onError={(e) => {
                    if (fallback && e.currentTarget.src !== fallback) e.currentTarget.src = fallback;
                    else e.currentTarget.style.display = "none";
                  }}
                />
              ) : (<HelpCircle size={22} strokeWidth={2} style={{ color: "var(--fr-muted)" }} />);
            })()}
            <div style={{
              fontSize: 8, fontWeight: 800,
              color: "var(--fr-fg, #1e293b)",
              marginTop: 2, textAlign: "center",
              overflow: "hidden", textOverflow: "ellipsis",
              whiteSpace: "nowrap", width: "100%",
            }}>
              {reward.name}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}