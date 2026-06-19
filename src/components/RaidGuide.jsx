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
import {
  Gem, Star, Moon, Sparkles, HelpCircle, X, Swords, ClipboardList,
  AlertTriangle, Ban, Users, MessageCircle, MessagesSquare, Clock,
  RotateCw, Loader2,
} from "lucide-react";
import { useModalLifecycle, matchPokemonId, pokeApiArtwork } from "../perfUtils.js";

const RAIDS_URL = "https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/raids.json";
const CACHE_KEY = "pkdx_raids_cache_v1";
const CACHE_TTL = 60 * 60 * 1000;

// ─── Tier configuration ────────────────────────────────────────────────
// Raid-tier egg images (Pokémon GO Wiki / Fandom CDN — CORS-open, hotlinkable)
const WIKIA = "https://static.wikia.nocookie.net/pokemongo/images";
const TIER_META = {
  "Mega Raids":         { order: 0, Icon: Gem,      color: "#e11d48",
    img: `${WIKIA}/c/c2/Egg_Raid_Mega.png/revision/latest?cb=20200825193419`,
    label: { en: "MEGA RAIDS", th: "MEGA RAIDS", ja: "メガレイド" } },
  "5-Star Raids":       { order: 2, Icon: Star,     color: "#900603",
    img: `${WIKIA}/c/cd/Egg_Raid_Legendary.png/revision/latest?cb=20170620230139`,
    label: { en: "5-STAR RAIDS", th: "5-STAR RAIDS", ja: "5★レイド" } },
  "Shadow 5-Star Raids":{ order: 3, Icon: Moon,     color: "#3f3f46",
    img: `${WIKIA}/a/a4/Egg_Raid_Legendary_shadow.png/revision/latest?cb=20230519112814`,
    label: { en: "SHADOW 5-STAR", th: "SHADOW 5-STAR", ja: "シャドウ5★" } },
  "3-Star Raids":       { order: 4, Icon: Star,     color: "#eab308",
    img: `${WIKIA}/e/e3/Egg_Raid_Rare.png/revision/latest?cb=20170620230126`,
    label: { en: "3-STAR RAIDS", th: "3-STAR RAIDS", ja: "3★レイド" } },
  "Shadow 3-Star Raids":{ order: 5, Icon: Moon,     color: "#3f3f46",
    img: `${WIKIA}/1/1b/Egg_Raid_Rare_shadow.png/revision/latest?cb=20230519112814`,
    label: { en: "SHADOW 3-STAR", th: "SHADOW 3-STAR", ja: "シャドウ3★" } },
  "1-Star Raids":       { order: 6, Icon: Sparkles, color: "#e9568f",
    img: `${WIKIA}/5/5a/Egg_Raid_Normal.png/revision/latest?cb=20170620230659`,
    label: { en: "1-STAR RAIDS", th: "1-STAR RAIDS", ja: "1★レイド" } },
  "Shadow 1-Star Raids":{ order: 7, Icon: Moon,     color: "#6d4b8c",
    img: `${WIKIA}/7/7f/Egg_Raid_Normal_shadow.png/revision/latest?cb=20230519112813`,
    label: { en: "SHADOW 1-STAR", th: "SHADOW 1-STAR", ja: "シャドウ1★" } },
};

// Self-drawn raid-tier egg (fallback if the Wiki image fails to load)
function TierEgg({ color = "#888", size = 18 }) {
  return (
    <svg width={size} height={Math.round(size * 1.26)} viewBox="0 0 32 40" aria-hidden
      style={{ display: "block", flexShrink: 0 }}>
      <path d="M16 1.5C9.6 1.5 3.6 14.6 3.6 25a12.4 13 0 0 0 24.8 0C28.4 14.6 22.4 1.5 16 1.5Z" fill={color} />
      <circle cx="20.5" cy="22" r="2.6" fill="rgba(0,0,0,0.14)" />
      <circle cx="13" cy="28" r="2" fill="rgba(0,0,0,0.14)" />
      <circle cx="11.5" cy="17" r="3" fill="rgba(255,255,255,0.36)" />
      <path d="M9.5 10C11.2 6.6 13.6 4.2 16 3.4" stroke="rgba(255,255,255,0.48)" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    </svg>
  );
}

// Tier icon: real Wiki egg image, falls back to the drawn egg on error
function TierIcon({ meta, size = 18 }) {
  const [failed, setFailed] = useState(false);
  if (failed || !meta?.img) return <TierEgg color={meta?.color ?? "#888"} size={size} />;
  return (
    <img src={meta.img} alt="" width={size} height={size} loading="lazy"
      referrerPolicy="no-referrer"
      style={{ objectFit: "contain", display: "block", flexShrink: 0,
               filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.18))" }}
      onError={() => setFailed(true)} />
  );
}

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
  { name: "Pokemon Go Thailand",   url: "https://www.facebook.com/groups/pokemongo.thailand/", Icon: Users,          color: "#1877F2" },
  { name: "PoGO Bangkok Discord",  url: "https://discord.gg/pokemongo",                       Icon: MessageCircle,  color: "#5865F2" },
  { name: "PoGO Thailand Reddit",  url: "https://www.reddit.com/r/PokemonGOThailand/",        Icon: MessagesSquare, color: "#FF4500" },
  { name: "PvPoke Counters",       url: "https://pvpoke.com/",                                Icon: Swords,         color: "#0891b2" },
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
        meta: TIER_META[tier] ?? { order: 99, color: "var(--text-secondary)", Icon: HelpCircle,
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
          <span className="rg-title-emoji"><Swords size={20} strokeWidth={2.3} /></span>
          <div className="rg-title-block">
            <div className="rg-title">
              <span className="rg-title-text">
                {t("คู่มือ Raid", "Raid Battle Guide", "レイドガイド")}
              </span>
            </div>
            <div className="rg-subtitle">
              {totalBosses > 0
                ? t(`${totalBosses} บอสกำลังเปิดอยู่`, `${totalBosses} bosses active now`, `${totalBosses}体 開催中`)
                : t("Raid Boss ทั้งหมดในตอนนี้", "All active Raid Bosses", "現在開催中のレイドボス")}
            </div>
          </div>
          <div className="rg-head-actions">
            <button className="rg-refresh" onClick={() => fetchRaids(true)} disabled={loading}
              title={t("รีเฟรช", "Refresh", "更新")}>
              {loading ? <Loader2 size={16} strokeWidth={2.4} style={{ animation: "rg-spin 1s linear infinite" }} /> : <RotateCw size={16} strokeWidth={2.4} />}
            </button>
            <button className="rg-close" onClick={onClose} aria-label="Close"><X size={16} strokeWidth={2.4} /></button>
          </div>
        </div>

        {/* TH Raid Hour Banner */}
        <div className={`rg-raidhour ${isRaidHourActive ? "active" : ""}`}>
          <div className="rg-raidhour-left">
            <span className="rg-raidhour-flag"><Clock size={20} strokeWidth={2.2} /></span>
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
              <span className="rg-chip-emoji"><ClipboardList size={13} strokeWidth={2.2} /></span>
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
                  style={active ? { background: meta.color, color: "white", borderColor: meta.color } : { borderColor: (meta.color ?? "#888") + "55", color: meta.color }}>
                  <span className="rg-chip-emoji"><TierIcon meta={meta} size={16} /></span>
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
            {error && <span className="rg-error" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}> · <AlertTriangle size={12} strokeWidth={2.4} /> {error}</span>}
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
            <div className="rg-empty-icon"><Ban size={44} strokeWidth={1.8} /></div>
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
            <div className="rg-tier-header" style={{
              background: `color-mix(in srgb, ${meta.color ?? "#888"} 10%, var(--rg-bg, #fff))`,
              borderLeft: `3px solid ${meta.color ?? "#888"}`,
              color: "var(--rg-fg, var(--text-primary))",
            }}>
              <span className="rg-tier-emoji"><TierIcon meta={meta} size={40} /></span>
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
                      background: `radial-gradient(circle, ${TYPE_COLORS[types[0]?.name] ?? meta.color}, transparent 72%)`
                    }} />
                    <img src={art} alt={boss.name} className="rg-boss-img" loading="lazy"
                      onError={(e) => { e.target.style.opacity = 0.3; }} />
                    <div className="rg-boss-name">
                      {boss.name}
                      {boss.shiny && <span className="rg-boss-shiny" style={{ color: "#e0a92e" }}><Sparkles size={11} strokeWidth={2.4} /></span>}
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
            {t("ชุมชน PoGO ไทย", "Thai PoGO Community", "タイPoGOコミュニティ")}
          </div>
          <div className="rg-community-grid">
            {TH_COMMUNITIES.map(c => (
              <a key={c.name} href={c.url} target="_blank" rel="noopener noreferrer"
                className="rg-community-link"
                style={{ borderColor: c.color + "55" }}>
                <span className="rg-community-icon"
                  style={{ background: c.color + "1f", color: c.color }}><c.Icon size={16} strokeWidth={2.2} /></span>
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
          background: rgba(20, 19, 22, 0.6);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          overflow-y: auto;
          padding: 20px 12px;
          animation: rg-overlay-in 0.3s ease;
        }
        .rg-modal {
          --rg-bg: var(--bg-card); --rg-fg: var(--text-primary);
          max-width: 1080px;
          margin: 0 auto;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 22px;
          color: var(--text-primary);
          position: relative;
          box-shadow: 0 24px 60px rgba(20, 19, 22, 0.3);
          animation: rg-modal-in 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* ─── Header ──────────────────────────────────────────── */
        .rg-header {
          display: flex; align-items: center; gap: 14px;
          padding-bottom: 16px; margin-bottom: 16px;
          border-bottom: 1px solid var(--border);
        }
        .rg-close {
          width: 34px; height: 34px;
          border-radius: 50%; border: 1px solid var(--border);
          background: var(--bg-muted);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.25s ease;
          flex-shrink: 0;
          display: inline-flex; align-items: center; justify-content: center;
        }
        .rg-close:hover {
          background: rgba(210,58,74,0.12); color: #d23a4a; border-color: rgba(210,58,74,0.4);
          transform: scale(1.08);
        }
        .rg-head-actions { display: inline-flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .rg-title-block { flex: 1; min-width: 0; }
        .rg-title {
          display: flex; align-items: center; gap: 10px;
          font-size: 19px; font-weight: 800; letter-spacing: -0.02em;
        }
        .rg-title-emoji {
          width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0;
          display: inline-flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, #b5302d, #6e0402); color: #fff;
          box-shadow: 0 4px 12px rgba(144,6,3,0.35);
        }
        .rg-title-text { color: var(--text-primary); }
        .rg-subtitle {
          font-size: 12px; color: var(--text-secondary); font-weight: 600;
          letter-spacing: 0.02em; margin-top: 3px;
        }
        .rg-refresh {
          width: 34px; height: 34px;
          border-radius: 50%; border: 1px solid var(--border);
          background: var(--bg-muted); color: var(--text-secondary);
          cursor: pointer; flex-shrink: 0;
          transition: all 0.3s ease;
          display: inline-flex; align-items: center; justify-content: center;
        }
        .rg-refresh:hover:not(:disabled) {
          background: var(--bg-muted); color: var(--text-primary);
        }
        .rg-refresh:disabled { opacity: 0.5; cursor: wait; }

        /* ─── TH Raid Hour Banner ─────────────────────────────── */
        .rg-raidhour {
          display: flex; align-items: center; justify-content: space-between;
          gap: 14px;
          padding: 14px 18px;
          margin-bottom: 16px;
          border-radius: 14px;
          background: var(--bg-muted);
          border: 1px solid var(--border);
          border-left: 3px solid var(--blue, #900603);
        }
        .rg-raidhour.active { border-left-color: #dc2626; background: rgba(220,38,38,0.06); }
        .rg-raidhour-left { display: flex; align-items: center; gap: 12px; }
        .rg-raidhour-flag { width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
          display: inline-flex; align-items: center; justify-content: center;
          background: color-mix(in srgb, var(--blue) 12%, transparent); color: var(--blue, #900603); }
        .rg-raidhour-label { font-size: 14px; font-weight: 800; color: var(--text-primary); }
        .rg-raidhour-detail { font-size: 11px; color: var(--text-secondary); font-weight: 600; }
        .rg-raidhour-count {
          font-size: 17px; font-weight: 900; color: var(--text-primary);
          padding: 7px 14px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 999px;
          letter-spacing: 0.02em;
        }

        /* ─── Filter Chips ────────────────────────────────────── */
        .rg-filters {
          display: flex; flex-wrap: wrap; gap: 8px;
          margin-bottom: 14px;
        }
        .rg-chip {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 7px 13px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: var(--bg-muted);
          color: var(--text-secondary);
          font-size: 12px; font-weight: 800;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          letter-spacing: 0.02em;
        }
        .rg-chip:hover {
          transform: translateY(-2px);
          color: var(--text-primary);
          background: var(--bg-muted);
        }
        .rg-chip.active {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(20,19,22,0.18);
        }
        .rg-chip-emoji { display: inline-flex; }
        .rg-chip-count {
          padding: 2px 8px;
          background: color-mix(in srgb, var(--text-primary) 8%, transparent);
          border-radius: 999px;
          font-size: 10px;
          font-weight: 900;
        }
        .rg-chip.active .rg-chip-count {
          background: rgba(255, 255, 255, 0.28);
        }

        /* ─── Updated info ────────────────────────────────────── */
        .rg-updated {
          font-size: 11px; color: var(--text-muted);
          margin-bottom: 18px;
          font-weight: 600;
          letter-spacing: 0.02em;
        }
        .rg-error { color: #dc2626; }

        /* ─── Loading / Empty ─────────────────────────────────── */
        .rg-loading {
          padding: 60px 20px;
          text-align: center;
        }
        .rg-spinner {
          width: 50px; height: 50px;
          margin: 0 auto 16px;
          border: 4px solid color-mix(in srgb, var(--text-primary) 10%, transparent);
          border-top-color: var(--blue, #900603);
          border-radius: 50%;
          animation: rg-spin 0.9s linear infinite;
        }
        .rg-loading-text {
          color: var(--text-secondary); font-size: 13px; font-weight: 700;
        }
        .rg-empty {
          padding: 60px 20px;
          text-align: center;
          color: var(--text-secondary);
        }
        .rg-empty-icon { display: flex; justify-content: center; margin-bottom: 12px; opacity: 0.4; color: var(--text-muted); }
        .rg-empty-title { font-size: 15px; font-weight: 700; }

        /* ─── Tier Section ────────────────────────────────────── */
        .rg-tier { margin-bottom: 22px; }
        .rg-tier-header {
          display: flex; align-items: center; gap: 10px;
          padding: 11px 16px;
          border-radius: 12px;
          margin-bottom: 14px;
          box-shadow: none;
        }
        .rg-tier-emoji { display: inline-flex; }
        .rg-tier-label {
          flex: 1;
          font-size: 14px;
          font-weight: 800;
          letter-spacing: 0.08em;
        }
        .rg-tier-count {
          padding: 3px 11px;
          background: color-mix(in srgb, var(--text-primary) 8%, transparent);
          border-radius: 999px;
          font-size: 12px;
          font-weight: 800;
        }
        .rg-tier-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
          gap: 12px;
        }

        /* ─── Boss Card — minimal, soft type halo + floating sprite ─── */
        .rg-boss {
          position: relative;
          padding: 16px 12px 13px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 16px;
          cursor: pointer;
          color: var(--text-primary);
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s, border-color 0.2s;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 9px;
          box-shadow: 0 2px 6px rgba(20,19,22,0.05);
        }
        .rg-boss:hover {
          transform: translateY(-4px);
          border-color: var(--blue, #b5302d);
          box-shadow: 0 12px 26px rgba(20,19,22,0.16);
        }
        /* soft type-coloured halo behind the sprite */
        .rg-boss-bg {
          position: absolute;
          top: 6px; left: 50%; transform: translateX(-50%);
          width: 88px; height: 88px; border-radius: 50%;
          pointer-events: none;
          opacity: 0.42;
          filter: blur(9px);
        }
        .rg-boss-img {
          position: relative;
          z-index: 1;
          width: 82px;
          height: 82px;
          object-fit: contain;
          filter: drop-shadow(0 7px 7px rgba(0,0,0,0.18));
          transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .rg-boss:hover .rg-boss-img {
          transform: scale(1.09) translateY(-3px);
        }
        .rg-boss-name {
          position: relative;
          z-index: 1;
          font-weight: 800;
          font-size: 13px;
          text-align: center;
          line-height: 1.2;
          display: flex;
          align-items: center;
          gap: 4px;
          letter-spacing: -0.01em;
          color: var(--text-primary);
          text-transform: capitalize;
        }
        .rg-boss-shiny {
          display: inline-flex;
          color: #e0a92e;
        }
        .rg-boss-types {
          position: relative;
          z-index: 1;
          display: flex;
          gap: 5px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .rg-boss-type {
          padding: 3px 10px;
          font-size: 9.5px;
          font-weight: 800;
          letter-spacing: 0.03em;
          color: white;
          border-radius: 7px;
          text-transform: capitalize;
          box-shadow: none;
        }

        /* ─── Thai Community Footer ───────────────────────────── */
        .rg-community {
          margin-top: 24px;
          padding: 18px;
          border-radius: 16px;
          background: var(--bg-muted);
          border: 1px solid var(--border);
        }
        .rg-community-title {
          font-size: 14px;
          font-weight: 800;
          color: var(--text-primary);
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
          padding: 11px 14px;
          background: var(--bg-card);
          border: 1px solid;
          border-radius: 12px;
          text-decoration: none;
          color: var(--text-primary);
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .rg-community-link:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 18px rgba(20, 19, 22, 0.12);
        }
        .rg-community-icon {
          width: 36px; height: 36px;
          border-radius: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
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