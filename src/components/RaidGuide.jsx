// ═══════════════════════════════════════════════════════════════════════
// RaidGuide.jsx — Merged Raid Now + Raid Bosses with modern design
// ───────────────────────────────────────────────────────────────────────
// Single source for all active raids:
//   · TH Raid Hour countdown banner (Wed 18:00 ICT)
//   · Tier filter chips (Mega / 5★ / Shadow / 3★ / 1★ / Dynamax)
//   · Pokemon cards grouped by tier
//   · TH community links footer
// ═══════════════════════════════════════════════════════════════════════

import { useState, useEffect, useMemo, useCallback } from "react";
import { useModalLifecycle, matchPokemonId, pokeApiArtwork } from "../perfUtils.js";

const RAIDS_URL = "https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/raids.json";
const CACHE_KEY = "pkdx_raids_cache_v1";
const CACHE_TTL = 60 * 60 * 1000;

// ─── Tier configuration ────────────────────────────────────────────────
const TIER_META = {
  "Mega Raids":         { order: 0, emoji: "💎",
    color: "#e11d48", bg: "linear-gradient(135deg, #fda4af 0%, #f43f5e 50%, #be123c 100%)",
    label: { en: "MEGA RAIDS", th: "MEGA RAIDS", ja: "メガレイド" } },
  "5-Star Raids":       { order: 2, emoji: "⭐",
    color: "#7c3aed", bg: "linear-gradient(135deg, #c084fc 0%, #9333ea 50%, #6b21a8 100%)",
    label: { en: "5-STAR RAIDS", th: "5-STAR RAIDS", ja: "5★レイド" } },
  "Shadow 5-Star Raids":{ order: 3, emoji: "🌑",
    color: "#1f2937", bg: "linear-gradient(135deg, #6b7280 0%, #374151 50%, #111827 100%)",
    label: { en: "SHADOW 5-STAR", th: "SHADOW 5-STAR", ja: "シャドウ5★" } },
  "3-Star Raids":       { order: 4, emoji: "🌟",
    color: "#a16207", bg: "linear-gradient(135deg, #fde047 0%, #ca8a04 50%, #713f12 100%)",
    label: { en: "3-STAR RAIDS", th: "3-STAR RAIDS", ja: "3★レイド" } },
  "Shadow 3-Star Raids":{ order: 5, emoji: "🌑",
    color: "#3f3f46", bg: "linear-gradient(135deg, #a1a1aa 0%, #52525b 50%, #18181b 100%)",
    label: { en: "SHADOW 3-STAR", th: "SHADOW 3-STAR", ja: "シャドウ3★" } },
  "1-Star Raids":       { order: 6, emoji: "✨",
    color: "#0369a1", bg: "linear-gradient(135deg, #7dd3fc 0%, #0284c7 50%, #075985 100%)",
    label: { en: "1-STAR RAIDS", th: "1-STAR RAIDS", ja: "1★レイド" } },
  "Shadow 1-Star Raids":{ order: 7, emoji: "🌑",
    color: "#3730a3", bg: "linear-gradient(135deg, #a5b4fc 0%, #4f46e5 50%, #312e81 100%)",
    label: { en: "SHADOW 1-STAR", th: "SHADOW 1-STAR", ja: "シャドウ1★" } },
};

const TYPE_COLORS = {
  Normal:"#A8A878", Fire:"#F08030", Water:"#6890F0", Electric:"#F8D030",
  Grass:"#78C850", Ice:"#98D8D8", Fighting:"#C03028", Poison:"#A040A0",
  Ground:"#E0C068", Flying:"#A890F0", Psychic:"#F85888", Bug:"#A8B820",
  Rock:"#B8A038", Ghost:"#705898", Dragon:"#7038F8", Dark:"#705848",
  Steel:"#B8B8D0", Fairy:"#EE99AC",
};

// Split Shadow raids from regular ones
function deriveTier(boss) {
  const isShadow = (boss.name || "").toLowerCase().startsWith("shadow ");
  if (!isShadow) return boss.tier;
  if (boss.tier === "1-Star Raids") return "Shadow 1-Star Raids";
  if (boss.tier === "3-Star Raids") return "Shadow 3-Star Raids";
  if (boss.tier === "5-Star Raids") return "Shadow 5-Star Raids";
  return boss.tier;
}

// ─── Thailand Raid Hour: every Wed 18:00 ICT ───────────────────────────
function getNextRaidHour() {
  const now = new Date();
  const bangkokOffset = 7 * 60;
  const localOffset = -now.getTimezoneOffset();
  const bangkokNow = new Date(now.getTime() + (bangkokOffset - localOffset) * 60000);
  const next = new Date(bangkokNow);
  const day = next.getDay();
  let daysUntil = (3 - day + 7) % 7;
  if (day === 3 && next.getHours() >= 19) daysUntil = 7;
  next.setDate(next.getDate() + daysUntil);
  next.setHours(18, 0, 0, 0);
  return new Date(next.getTime() - (bangkokOffset - localOffset) * 60000);
}

const TH_COMMUNITIES = [
  { name: "Pokemon Go Thailand",   url: "https://www.facebook.com/groups/pokemongo.thailand/", icon: "📘", color: "#1877F2" },
  { name: "PoGO Bangkok Discord",  url: "https://discord.gg/pokemongo",                       icon: "💬", color: "#5865F2" },
  { name: "PoGO Thailand Reddit",  url: "https://www.reddit.com/r/PokemonGOThailand/",        icon: "🔴", color: "#FF4500" },
  { name: "PvPoke Counters",       url: "https://pvpoke.com/",                                icon: "⚔️", color: "#0891b2" },
];

// ═══════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════
export default function RaidGuide({ lang = "en", onClose, onOpenPokemon, allList = [] }) {
  useModalLifecycle(onClose);
  const [raids, setRaids] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [activeFilters, setActiveFilters] = useState(new Set()); // empty = show all

  // Live tick
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const fetchRaids = useCallback(async (force = false) => {
    setLoading(true); setError(null);
    if (!force) {
      try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
          setRaids(cached.data); setLastUpdated(cached.timestamp); setLoading(false);
          return;
        }
      } catch {}
    }
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 10000);
    try {
      const res = await fetch(RAIDS_URL, { signal: ctrl.signal, cache: force ? "reload" : "default" });
      clearTimeout(tid);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRaids(data);
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
        if (cached?.data) { setRaids(cached.data); setLastUpdated(cached.timestamp); }
      } catch {}
    } finally { setLoading(false); }
  }, [lang]);

  useEffect(() => { fetchRaids(); }, [fetchRaids]);

  // Group by tier
  const grouped = useMemo(() => {
    if (!raids || !Array.isArray(raids)) return [];
    const groups = {};
    raids.forEach(boss => {
      const tier = deriveTier(boss);
      if (!groups[tier]) groups[tier] = [];
      groups[tier].push(boss);
    });
    return Object.entries(groups)
      .map(([tier, bosses]) => ({
        tier,
        meta: TIER_META[tier] ?? { order: 99, color: "#64748b",
          bg: "linear-gradient(135deg, #94a3b8, #475569)", emoji: "❔",
          label: { en: tier, th: tier, ja: tier } },
        bosses,
      }))
      .filter(g => activeFilters.size === 0 || activeFilters.has(g.tier))
      .sort((a, b) => a.meta.order - b.meta.order);
  }, [raids, activeFilters]);

  const allTiers = useMemo(() => {
    if (!raids || !Array.isArray(raids)) return [];
    const tiers = new Set();
    raids.forEach(b => tiers.add(deriveTier(b)));
    return Array.from(tiers).sort((a, b) =>
      (TIER_META[a]?.order ?? 99) - (TIER_META[b]?.order ?? 99));
  }, [raids]);

  const t = (th, en, ja) => lang === "th" ? th : lang === "ja" ? (ja ?? en) : en;

  // TH Raid Hour countdown
  const nextRaidHour = useMemo(() => getNextRaidHour(), [/* recompute hourly via now */]);
  const raidHourLeft = nextRaidHour.getTime() - now;
  const isRaidHourActive = raidHourLeft <= 0 && raidHourLeft > -60 * 60 * 1000; // within the hour

  const formatTimeLeft = (ms) => {
    if (ms < 0) {
      if (isRaidHourActive) return t("กำลังจัดอยู่!", "Happening NOW!", "開催中！");
      return t("กำลังจะอัปเดต", "Updating soon", "更新間近");
    }
    const totalMin = Math.floor(ms / 60000);
    const d = Math.floor(totalMin / 1440);
    const h = Math.floor((totalMin % 1440) / 60);
    const m = totalMin % 60;
    if (d > 0) return t(`อีก ${d} วัน ${h} ชม.`, `${d}d ${h}h`, `${d}日${h}時間`);
    if (h > 0) return t(`อีก ${h} ชม. ${m} นาที`, `${h}h ${m}m`, `${h}時間${m}分`);
    return t(`อีก ${m} นาที`, `${m}m`, `${m}分`);
  };

  const formatAge = (ts) => {
    if (!ts) return "";
    const mins = Math.floor((Date.now() - ts) / 60000);
    if (mins < 1) return t("เมื่อสักครู่", "just now", "たった今");
    if (mins < 60) return t(`${mins} นาทีก่อน`, `${mins}m ago`, `${mins}分前`);
    return t(`${Math.floor(mins/60)} ชม.ก่อน`, `${Math.floor(mins/60)}h ago`, `${Math.floor(mins/60)}時間前`);
  };

  const toggleFilter = (tier) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(tier)) next.delete(tier); else next.add(tier);
      return next;
    });
  };

  const totalBosses = grouped.reduce((s, g) => s + g.bosses.length, 0);

  return (
    <div className="rg-overlay" onClick={onClose}>
      <div className="rg-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="rg-header">
          <button className="rg-close" onClick={onClose} aria-label="Close">✕</button>
          <div className="rg-title-block">
            <div className="rg-title">
              <span className="rg-title-emoji">⚔️</span>
              <span className="rg-title-text">
                {t("คู่มือ Raid", "Raid Battle Guide", "レイドガイド")}
              </span>
            </div>
            <div className="rg-subtitle">
              {t("Raid Boss ทั้งหมดในตอนนี้", "All active Raid Bosses", "現在開催中のレイドボス")}
            </div>
          </div>
          <button className="rg-refresh" onClick={() => fetchRaids(true)} disabled={loading}
            title={t("รีเฟรช", "Refresh", "更新")}>
            {loading ? "⏳" : "↻"}
          </button>
        </div>

        {/* TH Raid Hour Banner */}
        <div className={`rg-raidhour ${isRaidHourActive ? "active" : ""}`}>
          <div className="rg-raidhour-left">
            <span className="rg-raidhour-flag">🇹🇭</span>
            <div className="rg-raidhour-text">
              <div className="rg-raidhour-label">
                {t("Raid Hour ไทย", "Thailand Raid Hour", "タイレイドアワー")}
              </div>
              <div className="rg-raidhour-detail">
                {t("ทุกพุธ 18:00 น.", "Every Wed 18:00 ICT", "毎週水曜 18:00 ICT")}
              </div>
            </div>
          </div>
          <div className="rg-raidhour-count">{formatTimeLeft(raidHourLeft)}</div>
        </div>

        {/* Tier Filter Chips */}
        {allTiers.length > 0 && (
          <div className="rg-filters">
            <button
              className={`rg-chip${activeFilters.size === 0 ? " active" : ""}`}
              onClick={() => setActiveFilters(new Set())}>
              <span className="rg-chip-emoji">📋</span>
              <span>{t("ทั้งหมด", "All", "全て")}</span>
              <span className="rg-chip-count">{raids?.length ?? 0}</span>
            </button>
            {allTiers.map(tier => {
              const meta = TIER_META[tier] ?? {};
              const count = raids?.filter(b => deriveTier(b) === tier).length ?? 0;
              const active = activeFilters.has(tier);
              return (
                <button key={tier}
                  className={`rg-chip${active ? " active" : ""}`}
                  onClick={() => toggleFilter(tier)}
                  style={active ? { background: meta.bg, color: "white", borderColor: meta.color } : { borderColor: meta.color + "44" }}>
                  <span className="rg-chip-emoji">{meta.emoji}</span>
                  <span>{meta.label?.[lang] ?? tier}</span>
                  <span className="rg-chip-count">{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Updated info */}
        {lastUpdated && (
          <div className="rg-updated">
            {t("อัปเดต:", "Updated:", "更新:")} {formatAge(lastUpdated)}
            {error && <span className="rg-error"> · ⚠️ {error}</span>}
          </div>
        )}

        {/* Loading State */}
        {loading && !raids && (
          <div className="rg-loading">
            <div className="rg-spinner"></div>
            <div className="rg-loading-text">{t("กำลังโหลด Raid Bosses...", "Loading raid bosses...", "読み込み中...")}</div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !grouped.length && (
          <div className="rg-empty">
            <div className="rg-empty-icon">🚫</div>
            <div className="rg-empty-title">
              {activeFilters.size > 0
                ? t("ไม่มี Raid ใน Tier ที่เลือก", "No raids in selected tiers", "選択中のティアにレイドなし")
                : t("ตอนนี้ไม่มี Raid Bosses", "No raid bosses available", "現在レイドボスはありません")}
            </div>
          </div>
        )}

        {/* Tier Sections */}
        {grouped.map(({ tier, meta, bosses }) => (
          <section key={tier} className="rg-tier">
            <div className="rg-tier-header" style={{ background: meta.bg }}>
              <span className="rg-tier-emoji">{meta.emoji}</span>
              <span className="rg-tier-label">{meta.label?.[lang] ?? tier}</span>
              <span className="rg-tier-count">{bosses.length}</span>
            </div>
            <div className="rg-tier-grid">
              {bosses.map((boss, idx) => {
                const pokeId = matchPokemonId(boss.name, allList);
                const art = pokeId
                  ? pokeApiArtwork(pokeId, boss.shiny)
                  : (boss.image || "");
                const types = boss.types || [];
                return (
                  <button key={`${boss.name}-${idx}`}
                    className="rg-boss"
                    onClick={() => pokeId && onOpenPokemon?.(boss)}>
                    <div className="rg-boss-bg" style={{
                      background: types[0]
                        ? `radial-gradient(circle at 50% 35%, ${TYPE_COLORS[types[0].name] ?? meta.color}55, transparent 70%)`
                        : "none"
                    }} />
                    <img src={art} alt={boss.name} className="rg-boss-img" loading="lazy"
                      onError={(e) => { e.target.style.opacity = 0.3; }} />
                    <div className="rg-boss-name">
                      {boss.name}
                      {boss.shiny && <span className="rg-boss-shiny">✨</span>}
                    </div>
                    <div className="rg-boss-types">
                      {types.map((tp, ti) => (
                        <span key={ti} className="rg-boss-type"
                          style={{ background: TYPE_COLORS[tp.name] ?? "#999" }}>
                          {tp.name}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ))}

        {/* TH Community Footer */}
        <div className="rg-community">
          <div className="rg-community-title">
            🇹🇭 {t("ชุมชน PoGO ไทย", "Thai PoGO Community", "タイPoGOコミュニティ")}
          </div>
          <div className="rg-community-grid">
            {TH_COMMUNITIES.map(c => (
              <a key={c.name} href={c.url} target="_blank" rel="noopener noreferrer"
                className="rg-community-link"
                style={{ borderColor: c.color + "55" }}>
                <span className="rg-community-icon"
                  style={{ background: c.color + "22", color: c.color }}>{c.icon}</span>
                <span className="rg-community-name">{c.name}</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          Modern CSS — scoped, dark glass aesthetic
          ═══════════════════════════════════════════════════════════════ */}
      <style>{`
        @keyframes rg-overlay-in {
          from { opacity: 0; backdrop-filter: blur(0); }
          to   { opacity: 1; backdrop-filter: blur(12px); }
        }
        @keyframes rg-modal-in {
          from { opacity: 0; transform: translateY(40px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes rg-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5); }
          50%      { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
        }
        @keyframes rg-spin { to { transform: rotate(360deg); } }
        @keyframes rg-shimmer {
          0%   { background-position: -200% 50%; }
          100% { background-position: 200% 50%; }
        }

        .rg-overlay {
          position: fixed; inset: 0; z-index: 9000;
          background: radial-gradient(ellipse at top, rgba(15, 23, 42, 0.92), rgba(2, 6, 23, 0.96));
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          overflow-y: auto;
          padding: 20px 12px;
          animation: rg-overlay-in 0.3s ease;
        }
        .rg-modal {
          max-width: 1080px;
          margin: 0 auto;
          background: linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.95));
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 28px;
          padding: 24px;
          color: #f1f5f9;
          position: relative;
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.5);
          animation: rg-modal-in 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* ─── Header ──────────────────────────────────────────── */
        .rg-header {
          display: flex; align-items: center; gap: 14px;
          padding-bottom: 18px; margin-bottom: 18px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.15);
        }
        .rg-close {
          width: 36px; height: 36px;
          border-radius: 50%; border: none;
          background: rgba(239, 68, 68, 0.15);
          color: #fca5a5; font-size: 16px; font-weight: 900;
          cursor: pointer;
          transition: all 0.25s ease;
          flex-shrink: 0;
        }
        .rg-close:hover {
          background: rgba(239, 68, 68, 0.35); color: white;
          transform: scale(1.1) rotate(90deg);
        }
        .rg-title-block { flex: 1; min-width: 0; }
        .rg-title {
          display: flex; align-items: center; gap: 10px;
          font-size: 22px; font-weight: 900; letter-spacing: -0.02em;
        }
        .rg-title-emoji { font-size: 26px; filter: drop-shadow(0 2px 8px rgba(251, 146, 60, 0.5)); }
        .rg-title-text {
          background: linear-gradient(135deg, #fff, #fde68a, #fb923c);
          -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent; color: transparent;
        }
        .rg-subtitle {
          font-size: 12px; color: #94a3b8; font-weight: 600;
          letter-spacing: 0.02em; margin-top: 3px;
        }
        .rg-refresh {
          width: 38px; height: 38px;
          border-radius: 50%; border: 1px solid rgba(148, 163, 184, 0.25);
          background: rgba(99, 102, 241, 0.15); color: #c7d2fe;
          font-size: 18px; font-weight: 800;
          cursor: pointer; flex-shrink: 0;
          transition: all 0.3s ease;
        }
        .rg-refresh:hover:not(:disabled) {
          background: rgba(99, 102, 241, 0.3); color: white;
          transform: rotate(90deg);
        }
        .rg-refresh:disabled { opacity: 0.5; cursor: wait; }

        /* ─── TH Raid Hour Banner ─────────────────────────────── */
        .rg-raidhour {
          display: flex; align-items: center; justify-content: space-between;
          gap: 14px;
          padding: 14px 18px;
          margin-bottom: 16px;
          border-radius: 18px;
          background:
            linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.08) 50%, transparent 70%),
            linear-gradient(135deg, #ef4444 0%, #f97316 60%, #f59e0b 100%);
          background-size: 250% 100%, 100% 100%;
          animation: rg-shimmer 6s linear infinite;
          box-shadow: 0 10px 30px rgba(239, 68, 68, 0.3);
        }
        .rg-raidhour.active {
          animation: rg-shimmer 3s linear infinite, rg-pulse 1.5s ease-in-out infinite;
        }
        .rg-raidhour-left { display: flex; align-items: center; gap: 12px; }
        .rg-raidhour-flag { font-size: 28px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); }
        .rg-raidhour-label { font-size: 14px; font-weight: 900; color: white; }
        .rg-raidhour-detail { font-size: 11px; color: rgba(255,255,255,0.85); font-weight: 600; }
        .rg-raidhour-count {
          font-size: 18px; font-weight: 900; color: white;
          padding: 8px 16px;
          background: rgba(0, 0, 0, 0.25);
          border-radius: 999px;
          backdrop-filter: blur(8px);
          letter-spacing: 0.02em;
          text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        }

        /* ─── Filter Chips ────────────────────────────────────── */
        .rg-filters {
          display: flex; flex-wrap: wrap; gap: 8px;
          margin-bottom: 14px;
        }
        .rg-chip {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 7px 14px;
          border-radius: 999px;
          border: 1.5px solid rgba(148, 163, 184, 0.25);
          background: rgba(30, 41, 59, 0.6);
          color: #cbd5e1;
          font-size: 12px; font-weight: 800;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          letter-spacing: 0.02em;
        }
        .rg-chip:hover {
          transform: translateY(-2px);
          color: white;
          background: rgba(30, 41, 59, 0.9);
        }
        .rg-chip.active {
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(0,0,0,0.3);
        }
        .rg-chip-emoji { font-size: 13px; }
        .rg-chip-count {
          padding: 2px 8px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 999px;
          font-size: 10px;
          font-weight: 900;
          backdrop-filter: blur(4px);
        }
        .rg-chip.active .rg-chip-count {
          background: rgba(0, 0, 0, 0.25);
        }

        /* ─── Updated info ────────────────────────────────────── */
        .rg-updated {
          font-size: 11px; color: #94a3b8;
          margin-bottom: 18px;
          font-weight: 600;
          letter-spacing: 0.02em;
        }
        .rg-error { color: #fca5a5; }

        /* ─── Loading / Empty ─────────────────────────────────── */
        .rg-loading {
          padding: 60px 20px;
          text-align: center;
        }
        .rg-spinner {
          width: 50px; height: 50px;
          margin: 0 auto 16px;
          border: 4px solid rgba(99, 102, 241, 0.2);
          border-top-color: #818cf8;
          border-radius: 50%;
          animation: rg-spin 0.9s linear infinite;
        }
        .rg-loading-text {
          color: #94a3b8; font-size: 13px; font-weight: 700;
        }
        .rg-empty {
          padding: 60px 20px;
          text-align: center;
          color: #94a3b8;
        }
        .rg-empty-icon { font-size: 56px; margin-bottom: 12px; opacity: 0.6; }
        .rg-empty-title { font-size: 15px; font-weight: 700; }

        /* ─── Tier Section ────────────────────────────────────── */
        .rg-tier { margin-bottom: 22px; }
        .rg-tier-header {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 18px;
          border-radius: 16px;
          margin-bottom: 14px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.15);
          color: white;
        }
        .rg-tier-emoji {
          font-size: 22px;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
        }
        .rg-tier-label {
          flex: 1;
          font-size: 14px;
          font-weight: 900;
          letter-spacing: 0.1em;
          text-shadow: 0 1px 3px rgba(0,0,0,0.3);
        }
        .rg-tier-count {
          padding: 4px 12px;
          background: rgba(0, 0, 0, 0.25);
          backdrop-filter: blur(6px);
          border-radius: 999px;
          font-size: 12px;
          font-weight: 900;
          color: white;
        }
        .rg-tier-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 12px;
        }

        /* ─── Boss Card — LIGHT like Pokedex page (flat 2D) ─── */
        .rg-boss {
          position: relative;
          padding: 16px 12px 12px;
          background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
          border: 1px solid rgba(148, 163, 184, 0.25);
          border-radius: 18px;
          cursor: pointer;
          color: #1e293b;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
        }
        .rg-boss:hover {
          transform: translateY(-4px);
          border-color: rgba(251, 146, 60, 0.5);
          box-shadow: 0 14px 30px rgba(0, 0, 0, 0.3);
        }
        .rg-boss-bg {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0.45;
        }
        .rg-boss-img {
          position: relative;
          z-index: 1;
          width: 90px;
          height: 90px;
          object-fit: contain;
          /* NO drop-shadow — true flat 2D like Pokedex */
          transition: transform 0.25s ease;
        }
        .rg-boss:hover .rg-boss-img {
          transform: scale(1.05);
        }
        .rg-boss-name {
          position: relative;
          z-index: 1;
          font-weight: 800;
          font-size: 12.5px;
          text-align: center;
          line-height: 1.2;
          display: flex;
          align-items: center;
          gap: 4px;
          letter-spacing: -0.01em;
          color: #1e293b;
        }
        .rg-boss-shiny {
          color: #fbbf24;
          filter: drop-shadow(0 0 6px rgba(251, 191, 36, 0.7));
        }
        .rg-boss-types {
          position: relative;
          z-index: 1;
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .rg-boss-type {
          padding: 2px 8px;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.08em;
          color: white;
          border-radius: 999px;
          text-transform: uppercase;
          box-shadow: 0 2px 4px rgba(0,0,0,0.25);
        }

        /* ─── Thai Community Footer ───────────────────────────── */
        .rg-community {
          margin-top: 24px;
          padding: 18px;
          border-radius: 20px;
          background:
            radial-gradient(circle at 10% 10%, rgba(59, 130, 246, 0.12), transparent 40%),
            linear-gradient(135deg, rgba(30, 41, 59, 0.6), rgba(15, 23, 42, 0.4));
          border: 1px solid rgba(148, 163, 184, 0.18);
        }
        .rg-community-title {
          font-size: 14px;
          font-weight: 900;
          color: #f1f5f9;
          margin-bottom: 12px;
          letter-spacing: -0.01em;
        }
        .rg-community-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 10px;
        }
        .rg-community-link {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          background: rgba(30, 41, 59, 0.5);
          border: 1.5px solid;
          border-radius: 14px;
          text-decoration: none;
          color: #f1f5f9;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .rg-community-link:hover {
          transform: translateY(-3px);
          background: rgba(30, 41, 59, 0.8);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
        }
        .rg-community-icon {
          width: 38px; height: 38px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          flex-shrink: 0;
        }
        .rg-community-name {
          font-size: 12.5px;
          font-weight: 700;
          flex: 1;
          min-width: 0;
        }

        /* ─── Responsive ──────────────────────────────────────── */
        @media (max-width: 640px) {
          .rg-modal { padding: 18px; border-radius: 22px; }
          .rg-title { font-size: 18px; }
          .rg-raidhour { flex-direction: column; align-items: stretch; text-align: center; }
          .rg-raidhour-left { justify-content: center; }
          .rg-tier-grid { grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px; }
          .rg-boss-img { width: 70px; height: 70px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .rg-overlay, .rg-modal, .rg-raidhour, .rg-boss, .rg-boss-img,
          .rg-chip, .rg-community-link, .rg-spinner { animation: none !important; transition: none !important; }
        }
      `}</style>
    </div>
  );
}