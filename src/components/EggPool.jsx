// ─── EggPool — Pokemon GO egg hatch pool (real-time) ────────
// Data source: ScrapedDuck eggs.json
// Shows: what hatches from 2/5/7/10/12 km eggs

import { useState, useEffect, useMemo, useCallback } from "react";
import { Egg, X, AlertTriangle, RefreshCw, Sparkles, Route, ChevronRight } from "lucide-react";
import { useModalLifecycle, matchPokemonId, pokeApiArtwork } from "../perfUtils.js";
import HatchPlannerPanel from "./EggHatchCalc.jsx";

const EGGS_URL  = "https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/eggs.json";
const CACHE_KEY = "pkdx_eggs_cache_v1";
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Egg category metadata + real egg images (Pokémon GO Wiki / Fandom CDN, CORS-open)
const WIKIA = "https://static.wikia.nocookie.net/pokemongo/images";
const EGG_META = {
  "1":          { order: 0, color: "#22c55e", img: "https://archives.bulbagarden.net/media/upload/c/c7/GO_Daily_Adventure_Egg.png", label: { en: "1 km Eggs",          th: "ไข่ 1 กม.",          ja: "1kmタマゴ" } },
  "2":          { order: 1, color: "#10b981", img: `${WIKIA}/f/f2/Egg_2k.png/revision/latest?cb=20211208153113`,  label: { en: "2 km Eggs",          th: "ไข่ 2 กม.",          ja: "2kmタマゴ" } },
  "5":          { order: 2, color: "#f59e0b", img: `${WIKIA}/3/33/Egg_5k.png/revision/latest?cb=20211208153322`,  label: { en: "5 km Eggs",          th: "ไข่ 5 กม.",          ja: "5kmタマゴ" } },
  "7":          { order: 3, color: "#ec4899", img: `${WIKIA}/f/f5/Egg_7k.png/revision/latest?cb=20211208153329`,  label: { en: "7 km Gift Eggs",     th: "ไข่ของขวัญ 7 กม.",   ja: "7kmギフトタマゴ" } },
  "10":         { order: 4, color: "#b5302d", img: `${WIKIA}/f/f6/Egg_10k.png/revision/latest?cb=20211208153343`, label: { en: "10 km Eggs",         th: "ไข่ 10 กม.",         ja: "10kmタマゴ" } },
  "12":         { order: 5, color: "#dc2626", img: `${WIKIA}/e/ee/Egg_12k.png/revision/latest?cb=20211208153349`, label: { en: "12 km Strange Eggs", th: "ไข่ Strange 12 กม.", ja: "12kmあやしいタマゴ" } },
  "5 km Adv":   { order: 6, color: "#0891b2", img: `${WIKIA}/3/33/Egg_5k.png/revision/latest?cb=20211208153322`,  label: { en: "5 km Adventure Sync",  th: "Adventure Sync 5 กม.",  ja: "アドベンチャーシンク 5km" } },
  "10 km Adv":  { order: 7, color: "#900603", img: `${WIKIA}/f/f6/Egg_10k.png/revision/latest?cb=20211208153343`, label: { en: "10 km Adventure Sync", th: "Adventure Sync 10 กม.", ja: "アドベンチャーシンク 10km" } },
};

// Self-drawn egg glyph — fallback if the Wiki image fails
function EggGlyph({ color = "#888", size = 28 }) {
  return (
    <svg width={size} height={Math.round(size * 1.26)} viewBox="0 0 32 40" aria-hidden
      style={{ display: "block", flexShrink: 0 }}>
      <path d="M16 1.5C9.6 1.5 3.6 14.6 3.6 25a12.4 13 0 0 0 24.8 0C28.4 14.6 22.4 1.5 16 1.5Z" fill={color} />
      <circle cx="20.5" cy="22" r="2.6" fill="rgba(0,0,0,0.13)" />
      <circle cx="13" cy="28" r="2" fill="rgba(0,0,0,0.13)" />
      <circle cx="11.5" cy="17" r="3" fill="rgba(255,255,255,0.34)" />
      <path d="M9.5 10C11.2 6.6 13.6 4.2 16 3.4" stroke="rgba(255,255,255,0.45)" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    </svg>
  );
}

// Real egg image with self-drawn fallback
function EggImg({ meta, size = 30 }) {
  const [failed, setFailed] = useState(false);
  if (failed || !meta?.img) return <EggGlyph color={meta?.color ?? "#888"} size={size} />;
  return (
    <img src={meta.img} alt="" width={size} height={size} loading="lazy"
      referrerPolicy="no-referrer"
      style={{ objectFit: "contain", display: "block", flexShrink: 0,
               filter: "drop-shadow(0 3px 5px rgba(0,0,0,0.18))" }}
      onError={() => setFailed(true)} />
  );
}

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
  useModalLifecycle(onClose);
  const [eggs,    setEggs]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [showPool, setShowPool] = useState(false);

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
              bg: "linear-gradient(135deg, #94a3b8, #475569)",
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
      background: "rgba(20, 19, 22, 0.55)", backdropFilter: "blur(8px)",
      overflowY: "auto", padding: "20px 12px",
      animation: "ep-overlay-in 0.3s ease",
    }}>
      <style>{`
        @keyframes ep-overlay-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ep-card-in { from { opacity: 0; transform: translateY(8px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes ep-spin { to { transform: rotate(360deg); } }
        @keyframes ep-pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.7); } }
        .ep-live { display: inline-flex; align-items: center; gap: 5px; margin-left: auto;
          padding: 3px 9px; border-radius: 999px; font-size: 9.5px; font-weight: 900; letter-spacing: 1px;
          color: #d23a4a; background: rgba(210,58,74,0.1); border: 1px solid rgba(210,58,74,0.3); }
        .ep-live-dot { width: 6px; height: 6px; border-radius: 50%; background: #ff5a52;
          animation: ep-pulse 1.6s ease-in-out infinite; }
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
        borderRadius: 24, padding: "20px 16px 24px",
        boxShadow: "0 28px 80px rgba(0,0,0,0.4)",
        minHeight: "85vh",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                      flexWrap: "wrap", gap: 12, marginBottom: 18, padding: "0 4px" }}>
          <div>
            <h1 style={{ fontSize: 21, fontWeight: 800, margin: 0,
                         color: "var(--ep-fg, #1f1d20)", letterSpacing: "-0.01em",
                         display: "inline-flex", alignItems: "center", gap: 9 }}>
              <Route size={20} strokeWidth={2.2} style={{ color: "var(--blue)" }} /> {t("วางแผนฟักไข่", "Egg Hatch Planner", "タマゴ孵化プランナー")}
            </h1>
            <div style={{ fontSize: 12, color: "var(--ep-muted, #64748b)", marginTop: 4, fontWeight: 600 }}>
              {t(`อัปเดต ${formatAge(lastUpdated)} · จาก LeekDuck`,
                 `Updated ${formatAge(lastUpdated)} · from LeekDuck`,
                 `更新: ${formatAge(lastUpdated)} · LeekDuck`)}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => fetchEggs(true)} disabled={loading} style={{
              padding: "8px 14px", borderRadius: 13,
              border: "1.5px solid var(--ep-border, #e2e8f0)",
              background: "var(--ep-card, #f8fafc)",
              color: "var(--ep-fg, #475569)",
              fontWeight: 700, fontSize: 12,
              cursor: loading ? "wait" : "pointer", opacity: loading ? 0.6 : 1,
              display: "inline-flex", alignItems: "center", gap: 6,
            }}>
              <RefreshCw size={13} strokeWidth={2.2} style={{ animation: loading ? "ep-spin 1s linear infinite" : "none" }} />
              {t("รีเฟรช", "Refresh", "更新")}
            </button>
            <button onClick={onClose} style={{
              padding: "8px 14px", borderRadius: 999,
              border: "1px solid var(--border)", background: "var(--bg-muted)",
              color: "var(--ep-fg)", fontWeight: 700, fontSize: 12, cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 6,
            }}>
              <X size={15} strokeWidth={2.4} /> {t("ปิด", "Close", "閉じる")}
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
                        borderRadius: 17 }}>
            <div style={{ marginBottom: 8, display: "flex", justifyContent: "center", color: "#dc2626" }}><AlertTriangle size={38} strokeWidth={1.8} /></div>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#dc2626", marginBottom: 6 }}>
              {t("โหลดไม่สำเร็จ", "Failed to load", "読み込み失敗")}
            </div>
            <div style={{ fontSize: 12, color: "#7f1d1d" }}>{error}</div>
          </div>
        )}

        {/* ─── Hatch distance planner (primary tool) ─── */}
        <HatchPlannerPanel lang={lang} />

        {/* ─── Live hatch pool — opens as a popup ─── */}
        <button className="ep-pool-btn" onClick={() => setShowPool(true)}
          style={{ marginTop: 20 }}>
          <span className="ep-pool-eggs">
            {grouped.slice(0, 4).map(g => <EggImg key={g.key} meta={g.meta} size={30} />)}
          </span>
          <span className="ep-pool-text">
            <span className="ep-pool-title">{t("ไข่ที่ฟักได้ตอนนี้", "Live Hatch Pool", "現在の孵化リスト")}</span>
            <span className="ep-pool-sub">
              {eggs ? t(`ไข่ในเกมตอนนี้ · ${eggs.length} ตัว · อัปเดต ${formatAge(lastUpdated)}`,
                        `In rotation now · ${eggs.length} species · ${formatAge(lastUpdated)}`,
                        `現在出現中 · ${eggs.length}種 · ${formatAge(lastUpdated)}`)
                    : t("กำลังโหลด...", "Loading…", "読み込み中…")}
            </span>
          </span>
          <span className="ep-live"><span className="ep-live-dot" /> LIVE</span>
          <ChevronRight size={18} strokeWidth={2.4} style={{ color: "var(--ep-muted)", flexShrink: 0 }} />
        </button>

        <style>{`
          :root { --ep-bg: #fff; --ep-fg: #1f1d20; --ep-muted: #7a766e; --ep-card: #f4f2ec; --ep-border: #e5e0d5; }
          [data-theme="dark"] { --ep-bg: #1a1816; --ep-fg: #efece4; --ep-muted: #9c988e; --ep-card: #211f20; --ep-border: #2c2926; }
          .ep-pool-btn { width:100%; display:flex; align-items:center; gap:13px; padding:13px 16px;
            border-radius:16px; border:1px solid var(--ep-border); background:var(--ep-card);
            cursor:pointer; text-align:left; transition:transform .2s, border-color .2s, box-shadow .2s; }
          .ep-pool-btn:hover { border-color:var(--blue); transform:translateY(-2px); box-shadow:var(--shadow-md); }
          .ep-pool-eggs { display:inline-flex; align-items:center; flex-shrink:0; }
          .ep-pool-eggs > * { margin-left:-12px; }
          .ep-pool-eggs > :first-child { margin-left:0; }
          .ep-pool-text { flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; }
          .ep-pool-title { font-size:14px; font-weight:800; color:var(--ep-fg); letter-spacing:-0.01em; }
          .ep-pool-sub { font-size:11px; font-weight:600; color:var(--ep-muted); }
          .ep-pop-overlay { position:fixed; inset:0; z-index:9100; background:rgba(20,19,22,0.55);
            backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); overflow-y:auto; padding:20px 12px;
            animation:ep-overlay-in .25s ease; }
          .ep-pop { max-width:1080px; margin:0 auto; background:var(--ep-bg); border:1px solid var(--ep-border);
            border-radius:18px; padding:18px 16px 22px; box-shadow:0 24px 60px rgba(20,19,22,.35); }
          .ep-pop-head { display:flex; align-items:center; gap:9px; margin-bottom:16px;
            position:sticky; top:0; background:var(--ep-bg); padding-bottom:12px; border-bottom:1px solid var(--ep-border); z-index:2; }
        `}</style>
      </div>

      {/* ─── Live Hatch Pool popup ─── */}
      {showPool && (
        <div className="ep-pop-overlay" onClick={(e) => { e.stopPropagation(); setShowPool(false); }}>
          <div className="ep-pop" onClick={(e) => e.stopPropagation()}>
            <div className="ep-pop-head">
              <Egg size={20} strokeWidth={2.4} style={{ color: "var(--blue)", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: "var(--ep-fg)", letterSpacing: "-0.01em" }}>
                    {t("ไข่ที่ฟักได้ตอนนี้", "Live Hatch Pool", "現在の孵化リスト")}
                  </span>
                  <span className="ep-live"><span className="ep-live-dot" /> LIVE</span>
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ep-muted)", marginTop: 3 }}>
                  {t(`ไข่ที่หมุนเวียนในเกมช่วงนี้ · อัปเดต ${formatAge(lastUpdated)}`,
                     `Eggs in rotation right now · updated ${formatAge(lastUpdated)}`,
                     `現在出現中のタマゴ · 更新 ${formatAge(lastUpdated)}`)}
                </div>
              </div>
              <button onClick={() => setShowPool(false)} style={{
                width: 32, height: 32, borderRadius: "50%",
                border: "1px solid var(--ep-border)", background: "var(--ep-card)", color: "var(--ep-fg)",
                cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }} aria-label="close"><X size={16} strokeWidth={2.4} /></button>
            </div>

            {eggs && grouped.map((group) => (
              <div key={group.key} style={{ marginBottom: 20 }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "12px 16px", borderRadius: 17,
                  background: `color-mix(in srgb, ${group.meta.color} 10%, var(--ep-bg))`,
                  border: `1px solid color-mix(in srgb, ${group.meta.color} 28%, transparent)`,
                  borderLeft: `4px solid ${group.meta.color}`,
                  color: "var(--ep-fg)", fontWeight: 800, fontSize: 15,
                  letterSpacing: 0.3, marginBottom: 12,
                }}>
                  <EggImg meta={group.meta} size={54} />
                  <span style={{ flex: 1 }}>{group.meta.label[lang] ?? group.meta.label.en}</span>
                  <span style={{
                    background: "var(--ep-card)", border: "1px solid var(--ep-border)",
                    color: "var(--ep-muted)", fontWeight: 800,
                    padding: "2px 9px", borderRadius: 999, fontSize: 10.5,
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

            <div style={{
              marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--ep-border)",
              fontSize: 10, color: "var(--ep-muted)", textAlign: "center", letterSpacing: 0.3,
            }}>
              {t("ข้อมูลจาก LeekDuck.com ผ่าน ScrapedDuck · อัปเดตทุก 1 ชั่วโมง",
                 "Data from LeekDuck.com via ScrapedDuck · Cached 1 hour",
                 "データ元: LeekDuck.com (ScrapedDuck) · 1時間キャッシュ")}
            </div>
          </div>
        </div>
      )}
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
        borderRadius: 15, padding: 10,
        cursor: onOpenPokemon ? "pointer" : "default",
        boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
        position: "relative",
        animation: `ep-card-in 0.35s ease ${delay}s backwards`,
      }}>
      {canBeShiny && (
        <div style={{
          position: "absolute", top: 4, right: 4, color: "#e0a92e",
          display: "flex",
        }}>
          <Sparkles size={12} strokeWidth={2.4} />
        </div>
      )}
      <div className="ep-card-img" style={{
        width: "100%", height: 80,
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 6,
        background: `radial-gradient(circle at center, ${meta.color}15, transparent 70%)`,
        borderRadius: 11,
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
        ) : (<EggGlyph color={meta.color} size={34} />)}
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