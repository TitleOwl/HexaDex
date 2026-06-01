// ─── EggPool — Pokemon GO egg hatch pool (real-time) ────────
// Data source: ScrapedDuck eggs.json
// Shows: what hatches from 2/5/7/10/12 km eggs

import { useState, useEffect, useMemo, useCallback } from "react";
import { useModalLifecycle, matchPokemonId, pokeApiArtwork } from "../perfUtils.js";

const EGGS_URL  = "https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/eggs.json";
const CACHE_KEY = "pkdx_eggs_cache_v1";
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Egg category metadata (color, label, emoji, LeekDuck egg sprite URL)
const EGG_META = {
  "2":          { order: 0, color: "#10b981", bg: "linear-gradient(135deg, #6ee7b7, #047857)",
                  emoji: "🥚", sprite: "https://leekduck.com/assets/img/eggs/2km.png",
                  label: { en: "2 km Eggs",        th: "ไข่ 2 กม.",       ja: "2kmタマゴ" } },
  "5":          { order: 1, color: "#f59e0b", bg: "linear-gradient(135deg, #fcd34d, #b45309)",
                  emoji: "🥚", sprite: "https://leekduck.com/assets/img/eggs/5km.png",
                  label: { en: "5 km Eggs",        th: "ไข่ 5 กม.",       ja: "5kmタマゴ" } },
  "7":          { order: 2, color: "#ec4899", bg: "linear-gradient(135deg, #f9a8d4, #be185d)",
                  emoji: "🎁", sprite: "https://leekduck.com/assets/img/eggs/7km.png",
                  label: { en: "7 km Gift Eggs",   th: "ไข่ของขวัญ 7 กม.", ja: "7kmギフトタマゴ" } },
  "10":         { order: 3, color: "#8b5cf6", bg: "linear-gradient(135deg, #c4b5fd, #5b21b6)",
                  emoji: "💎", sprite: "https://leekduck.com/assets/img/eggs/10km.png",
                  label: { en: "10 km Eggs",       th: "ไข่ 10 กม.",      ja: "10kmタマゴ" } },
  "12":         { order: 4, color: "#dc2626", bg: "linear-gradient(135deg, #fca5a5, #991b1b)",
                  emoji: "🔥", sprite: "https://leekduck.com/assets/img/eggs/12km.png",
                  label: { en: "12 km Strange Eggs",th: "ไข่ Strange 12 กม.",ja: "12kmあやしいタマゴ" } },
  "5 km Adv":   { order: 5, color: "#0891b2", bg: "linear-gradient(135deg, #67e8f9, #0e7490)",
                  emoji: "⚡", sprite: "https://leekduck.com/assets/img/eggs/5km.png",
                  label: { en: "5 km Adventure Sync",th: "Adventure Sync 5 km",ja: "アドベンチャーシンク 5km" } },
  "10 km Adv":  { order: 6, color: "#7c3aed", bg: "linear-gradient(135deg, #a78bfa, #5b21b6)",
                  emoji: "⚡", sprite: "https://leekduck.com/assets/img/eggs/10km.png",
                  label: { en: "10 km Adventure Sync",th: "Adventure Sync 10 km",ja: "アドベンチャーシンク 10km" } },
};

const TYPE_COLORS = {
  Normal: "#A8A878", Fire: "#F08030", Water: "#6890F0", Electric: "#F8D030",
  Grass: "#78C850", Ice: "#98D8D8", Fighting: "#C03028", Poison: "#A040A0",
  Ground: "#E0C068", Flying: "#A890F0", Psychic: "#F85888", Bug: "#A8B820",
  Rock: "#B8A038", Ghost: "#705898", Dragon: "#7038F8", Dark: "#705848",
  Steel: "#B8B8D0", Fairy: "#EE99AC",
};

function eggKey(egg) {
  // Combine eggType + isAdventureSync into category key
  const km = (egg.eggType || "").replace(/\s*km\s*/i, "").trim();
  if (egg.isAdventureSync) return `${km} km Adv`;
  return km;
}

export default function EggPool({ lang = "en", onClose, onOpenPokemon, allList = [] }) {
  useModalLifecycle();
  const [eggs,    setEggs]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchEggs = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    if (!force) {
      try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
          setEggs(cached.data);
          setLastUpdated(cached.timestamp);
          setLoading(false);
          return;
        }
      } catch {}
    }
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch(EGGS_URL, { signal: controller.signal, cache: force ? "reload" : "default" });
      clearTimeout(tid);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setEggs(data);
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
        if (cached?.data) {
          setEggs(cached.data);
          setLastUpdated(cached.timestamp);
        }
      } catch {}
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => { fetchEggs(); }, [fetchEggs]);

  // Group by egg type
  const grouped = useMemo(() => {
    if (!eggs || !Array.isArray(eggs)) return [];
    const groups = {};
    eggs.forEach(p => {
      const key = eggKey(p);
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });
    return Object.entries(groups)
      .map(([key, list]) => ({
        key,
        meta: EGG_META[key] ?? { order: 99, color: "#64748b",
              bg: "linear-gradient(135deg, #94a3b8, #475569)", emoji: "🥚",
              label: { en: `${key} km`, th: `${key} กม.`, ja: `${key} km` } },
        list,
      }))
      .sort((a, b) => a.meta.order - b.meta.order);
  }, [eggs]);

  const t = (th, en, ja) => lang === "th" ? th : lang === "ja" ? (ja ?? en) : en;
  const formatAge = (ts) => {
    if (!ts) return "";
    const mins = Math.floor((Date.now() - ts) / 60000);
    if (mins < 1) return t("เมื่อสักครู่", "just now", "たった今");
    if (mins < 60) return t(`${mins} นาทีก่อน`, `${mins}m ago`, `${mins}分前`);
    return t(`${Math.floor(mins / 60)} ชม.ก่อน`, `${Math.floor(mins / 60)}h ago`, `${Math.floor(mins / 60)}時間前`);
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 9000,
      background: "rgba(15, 23, 42, 0.85)", backdropFilter: "blur(8px)",
      overflowY: "auto", padding: "20px 12px",
      animation: "ep-overlay-in 0.3s ease",
    }}>
      <style>{`
        @keyframes ep-overlay-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ep-card-in { from { opacity: 0; transform: translateY(8px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes ep-spin { to { transform: rotate(360deg); } }
        @keyframes ep-shimmer { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        @keyframes ep-egg-wiggle {
          0%, 100% { transform: rotate(0); }
          25%      { transform: rotate(-4deg); }
          75%      { transform: rotate(4deg); }
        }
        .ep-card { transition: transform 0.2s, box-shadow 0.2s; }
        .ep-card:hover { transform: translateY(-3px); box-shadow: 0 14px 32px rgba(0,0,0,0.25); }
        .ep-card:hover .ep-card-img { animation: ep-egg-wiggle 0.5s ease-in-out; }
      `}</style>

      <div onClick={(e) => e.stopPropagation()} style={{
        maxWidth: 1100, margin: "0 auto",
        background: "var(--ep-bg, #fff)",
        borderRadius: 22, padding: "20px 16px 24px",
        boxShadow: "0 28px 80px rgba(0,0,0,0.4)",
        minHeight: "85vh",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                      flexWrap: "wrap", gap: 12, marginBottom: 18, padding: "0 4px" }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0,
                         color: "var(--ep-fg, #1e293b)", letterSpacing: "-0.01em" }}>
              🥚 {t("Pokémon ที่ฟักได้จากไข่", "Egg Hatch Pool", "タマゴから孵化するPokémon")}
            </h1>
            <div style={{ fontSize: 12, color: "var(--ep-muted, #64748b)", marginTop: 4, fontWeight: 600 }}>
              {t(`อัปเดต ${formatAge(lastUpdated)} · จาก LeekDuck`,
                 `Updated ${formatAge(lastUpdated)} · from LeekDuck`,
                 `更新: ${formatAge(lastUpdated)} · LeekDuck`)}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => fetchEggs(true)} disabled={loading} style={{
              padding: "8px 14px", borderRadius: 10,
              border: "1.5px solid var(--ep-border, #e2e8f0)",
              background: "var(--ep-card, #f8fafc)",
              color: "var(--ep-fg, #475569)",
              fontWeight: 700, fontSize: 12,
              cursor: loading ? "wait" : "pointer", opacity: loading ? 0.6 : 1,
              display: "inline-flex", alignItems: "center", gap: 6,
            }}>
              <span style={{ display: "inline-block", animation: loading ? "ep-spin 1s linear infinite" : "none" }}>🔄</span>
              {t("รีเฟรช", "Refresh", "更新")}
            </button>
            <button onClick={onClose} style={{
              padding: "8px 14px", borderRadius: 10, border: "none",
              background: "linear-gradient(135deg, #ef4444, #b91c1c)",
              color: "white", fontWeight: 700, fontSize: 12, cursor: "pointer",
            }}>
              ✕ {t("ปิด", "Close", "閉じる")}
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && !eggs && (
          <div style={{ padding: "30px 10px" }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ display: "inline-block", width: 48, height: 48,
                            border: "4px solid var(--ep-border, #e2e8f0)",
                            borderTopColor: "#f59e0b", borderRadius: "50%",
                            animation: "ep-spin 0.8s linear infinite" }} />
              <div style={{ marginTop: 12, color: "var(--ep-muted, #64748b)", fontSize: 13, fontWeight: 600 }}>
                {t("กำลังโหลดข้อมูลไข่...", "Loading egg data...", "タマゴデータ読み込み中...")}
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && !eggs && (
          <div style={{ padding: "40px 20px", textAlign: "center",
                        background: "rgba(239, 68, 68, 0.08)",
                        border: "1.5px solid rgba(239, 68, 68, 0.25)",
                        borderRadius: 14 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>⚠️</div>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#dc2626", marginBottom: 6 }}>
              {t("โหลดไม่สำเร็จ", "Failed to load", "読み込み失敗")}
            </div>
            <div style={{ fontSize: 12, color: "#7f1d1d" }}>{error}</div>
          </div>
        )}

        {/* Egg groups */}
        {eggs && grouped.map((group) => (
          <div key={group.key} style={{ marginBottom: 20 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 16px", borderRadius: 12,
              background: group.meta.bg,
              color: "white", fontWeight: 900, fontSize: 14,
              letterSpacing: 0.5, marginBottom: 12,
              boxShadow: `0 6px 18px ${group.meta.color}44`,
            }}>
              {/* LeekDuck egg sprite with emoji fallback */}
              {group.meta.sprite ? (
                <img src={group.meta.sprite} alt="" loading="lazy"
                  style={{
                    width: 42, height: 42, objectFit: "contain",
                    filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))",
                  }}
                  onError={(e) => {
                    // Fallback to emoji on error
                    const span = document.createElement("span");
                    span.style.cssText = "font-size: 26px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));";
                    span.textContent = group.meta.emoji;
                    e.currentTarget.replaceWith(span);
                  }}
                />
              ) : (
                <span style={{ fontSize: 26, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}>
                  {group.meta.emoji}
                </span>
              )}
              <span style={{ flex: 1 }}>{group.meta.label[lang] ?? group.meta.label.en}</span>
              <span style={{
                background: "rgba(255,255,255,0.25)",
                padding: "3px 10px", borderRadius: 999, fontSize: 11,
                backdropFilter: "blur(6px)",
              }}>
                {group.list.length} {t("ตัว", "species", "種")}
              </span>
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: 10,
            }}>
              {group.list.map((boss, i) => (
                <EggCard key={`${boss.name}-${i}`}
                  boss={boss} meta={group.meta} lang={lang}
                  onOpenPokemon={onOpenPokemon}
                  pokemonId={matchPokemonId(boss, allList)}
                  delay={i * 0.03} />
              ))}
            </div>
          </div>
        ))}

        {/* Footer */}
        <div style={{
          marginTop: 24, paddingTop: 14,
          borderTop: "1px solid var(--ep-border, #e2e8f0)",
          fontSize: 10, color: "var(--ep-muted, #94a3b8)",
          textAlign: "center", letterSpacing: 0.3,
        }}>
          {t("ข้อมูลจาก LeekDuck.com ผ่าน ScrapedDuck · อัปเดตทุก 1 ชั่วโมง",
             "Data from LeekDuck.com via ScrapedDuck · Cached 1 hour",
             "データ元: LeekDuck.com (ScrapedDuck) · 1時間キャッシュ")}
        </div>

        <style>{`
          :root { --ep-bg: #fff; --ep-fg: #1e293b; --ep-muted: #64748b; --ep-card: #f8fafc; --ep-border: #e2e8f0; }
          [data-theme="dark"] { --ep-bg: #0f172a; --ep-fg: #f1f5f9; --ep-muted: #94a3b8; --ep-card: #1e293b; --ep-border: #334155; }
        `}</style>
      </div>
    </div>
  );
}

function EggCard({ boss, meta, lang, onOpenPokemon, pokemonId, delay = 0 }) {
  const name = boss.name || "?";
  const image = pokemonId ? pokeApiArtwork(pokemonId) : boss.image;
  const fallbackImage = boss.image;
  const types = boss.types || [];
  const canBeShiny = boss.canBeShiny === true;

  return (
    <div
      onClick={() => onOpenPokemon?.(boss)}
      className="ep-card"
      style={{
        background: "var(--ep-card, #fff)",
        border: `2px solid ${meta.color}33`,
        borderRadius: 12, padding: 10,
        cursor: onOpenPokemon ? "pointer" : "default",
        boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
        position: "relative",
        animation: `ep-card-in 0.35s ease ${delay}s backwards`,
      }}>
      {canBeShiny && (
        <div style={{
          position: "absolute", top: 4, right: 4,
          background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
          color: "white", fontSize: 8, fontWeight: 900,
          padding: "2px 6px", borderRadius: 999,
          letterSpacing: 0.4, boxShadow: "0 2px 6px rgba(245, 158, 11, 0.45)",
        }}>
          ✨
        </div>
      )}
      <div className="ep-card-img" style={{
        width: "100%", height: 80,
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 6,
        background: `radial-gradient(circle at center, ${meta.color}15, transparent 70%)`,
        borderRadius: 8,
      }}>
        {image ? (
          <img src={image} alt={name} loading="lazy"
            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain",
                     filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.2))" }}
            onError={(e) => {
              if (fallbackImage && e.currentTarget.src !== fallbackImage) {
                e.currentTarget.src = fallbackImage;
              } else {
                e.currentTarget.style.display = "none";
              }
            }}
          />
        ) : (<div style={{ fontSize: 38, opacity: 0.4 }}>🥚</div>)}
      </div>
      <div style={{ fontSize: 11, fontWeight: 800,
                    color: "var(--ep-fg, #1e293b)", lineHeight: 1.2,
                    textAlign: "center", marginBottom: 4 }}>
        {name}
      </div>
      {types.length > 0 && (
        <div style={{ display: "flex", gap: 3, justifyContent: "center", flexWrap: "wrap" }}>
          {types.map((tp, i) => (
            <span key={i} style={{
              fontSize: 8, fontWeight: 800, color: "white",
              background: TYPE_COLORS[tp.name] || "#94a3b8",
              padding: "2px 6px", borderRadius: 999,
              textTransform: "uppercase", letterSpacing: 0.3,
            }}>
              {tp.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}