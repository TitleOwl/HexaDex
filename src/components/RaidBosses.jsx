// ─── RaidBosses — Current Pokemon GO raid bosses (real-time) ──
// Data source: ScrapedDuck (LeekDuck scraper) - raids.json
// Tier categories: Mega · Primal · 5★ · 3★ · 1★ · Shadow · Dynamax (Max Battles)

import { useState, useEffect, useMemo, useCallback } from "react";
import { useModalLifecycle, matchPokemonId, pokeApiArtwork } from "../perfUtils.js";

const RAIDS_URL = "https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/raids.json";
const CACHE_KEY = "pkdx_raids_cache_v1";
const CACHE_TTL = 60 * 60 * 1000;

const TIER_META = {
  "Mega":     { order: 0, color: "#e11d48",
                bg: "linear-gradient(135deg, #fda4af 0%, #f43f5e 50%, #be123c 100%)",
                emoji: "💎", description: { en: "Mega Evolution raids", th: "เมก้าวิวัฒนาการ", ja: "メガシンカ" },
                label: { en: "MEGA RAIDS", th: "MEGA RAIDS", ja: "メガレイド" } },
  "Mega 5":   { order: 1, color: "#b45309",
                bg: "linear-gradient(135deg, #fbbf24 0%, #d97706 50%, #78350f 100%)",
                emoji: "👑", description: { en: "Primal Reversion raids", th: "ไพรมัล", ja: "原始回帰" },
                label: { en: "PRIMAL RAIDS", th: "PRIMAL RAIDS", ja: "原始レイド" } },
  "5":        { order: 2, color: "#7c2d12",
                bg: "linear-gradient(135deg, #c084fc 0%, #9333ea 50%, #6b21a8 100%)",
                emoji: "⭐", description: { en: "Legendary tier", th: "ระดับตำนาน", ja: "伝説級" },
                label: { en: "5-STAR RAIDS", th: "5-STAR RAIDS", ja: "5★レイド" } },
  "Shadow 5": { order: 3, color: "#1f2937",
                bg: "linear-gradient(135deg, #6b7280 0%, #374151 50%, #111827 100%)",
                emoji: "🌑", description: { en: "Shadow Legendary", th: "แชโดว์ตำนาน", ja: "シャドウ伝説" },
                label: { en: "SHADOW 5-STAR", th: "SHADOW 5-STAR", ja: "シャドウ5★" } },
  "3":        { order: 4, color: "#a16207",
                bg: "linear-gradient(135deg, #fde047 0%, #ca8a04 50%, #713f12 100%)",
                emoji: "🌟", description: { en: "Mid-tier raids", th: "ระดับกลาง", ja: "中級" },
                label: { en: "3-STAR RAIDS", th: "3-STAR RAIDS", ja: "3★レイド" } },
  "Shadow 3": { order: 5, color: "#3f3f46",
                bg: "linear-gradient(135deg, #a1a1aa 0%, #52525b 50%, #18181b 100%)",
                emoji: "🌑", description: { en: "Shadow mid-tier", th: "แชโดว์ระดับกลาง", ja: "シャドウ中級" },
                label: { en: "SHADOW 3-STAR", th: "SHADOW 3-STAR", ja: "シャドウ3★" } },
  "1":        { order: 6, color: "#0369a1",
                bg: "linear-gradient(135deg, #7dd3fc 0%, #0284c7 50%, #075985 100%)",
                emoji: "✨", description: { en: "Entry tier", th: "ระดับเริ่มต้น", ja: "初級" },
                label: { en: "1-STAR RAIDS", th: "1-STAR RAIDS", ja: "1★レイド" } },
  "Shadow 1": { order: 7, color: "#3730a3",
                bg: "linear-gradient(135deg, #a5b4fc 0%, #4f46e5 50%, #312e81 100%)",
                emoji: "🌑", description: { en: "Shadow entry", th: "แชโดว์เริ่มต้น", ja: "シャドウ初級" },
                label: { en: "SHADOW 1-STAR", th: "SHADOW 1-STAR", ja: "シャドウ1★" } },
  "Max 6":    { order: 8, color: "#7c3aed",
                bg: "linear-gradient(135deg, #f0abfc 0%, #d946ef 50%, #86198f 100%)",
                emoji: "⚡", description: { en: "Gigantamax Battles", th: "การต่อสู้ Gigantamax", ja: "キョダイマックス" },
                label: { en: "GIGANTAMAX", th: "GIGANTAMAX", ja: "キョダイマックスバトル" } },
  "Max 5":    { order: 9, color: "#9333ea",
                bg: "linear-gradient(135deg, #e9d5ff 0%, #a855f7 50%, #6b21a8 100%)",
                emoji: "⚡", description: { en: "Max Battles 5★", th: "Max Battles 5★", ja: "ダイマックス 5★" },
                label: { en: "MAX BATTLES 5★", th: "MAX BATTLES 5★", ja: "ダイマックス 5★" } },
  "Max 3":    { order: 10, color: "#8b5cf6",
                bg: "linear-gradient(135deg, #ddd6fe 0%, #8b5cf6 50%, #5b21b6 100%)",
                emoji: "⚡", description: { en: "Max Battles 3★", th: "Max Battles 3★", ja: "ダイマックス 3★" },
                label: { en: "MAX BATTLES 3★", th: "MAX BATTLES 3★", ja: "ダイマックス 3★" } },
  "Max 1":    { order: 11, color: "#6366f1",
                bg: "linear-gradient(135deg, #c7d2fe 0%, #6366f1 50%, #3730a3 100%)",
                emoji: "⚡", description: { en: "Max Battles 1★", th: "Max Battles 1★", ja: "ダイマックス 1★" },
                label: { en: "MAX BATTLES 1★", th: "MAX BATTLES 1★", ja: "ダイマックス 1★" } },
};

const TYPE_COLORS = {
  Normal: "#A8A878", Fire: "#F08030", Water: "#6890F0", Electric: "#F8D030",
  Grass: "#78C850", Ice: "#98D8D8", Fighting: "#C03028", Poison: "#A040A0",
  Ground: "#E0C068", Flying: "#A890F0", Psychic: "#F85888", Bug: "#A8B820",
  Rock: "#B8A038", Ghost: "#705898", Dragon: "#7038F8", Dark: "#705848",
  Steel: "#B8B8D0", Fairy: "#EE99AC",
};

// Pokemon GO raid rotations usually happen Mondays at 00:00 GMT (or Tuesdays sometimes)
// We estimate the next major rotation point
function getNextRotation() {
  const now = new Date();
  const next = new Date(now);
  // Next Tuesday at 10:00 UTC (typical Niantic rotation time)
  const dayOfWeek = next.getUTCDay(); // 0=Sun, 2=Tue
  const daysUntilTuesday = (2 - dayOfWeek + 7) % 7 || 7;
  next.setUTCDate(next.getUTCDate() + daysUntilTuesday);
  next.setUTCHours(10, 0, 0, 0);
  return next.getTime();
}

export default function RaidBosses({ lang = "en", onClose, onOpenPokemon, allList = [] }) {
  useModalLifecycle();
  const [raids,   setRaids]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [now, setNow] = useState(Date.now());

  // Live countdown tick
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
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
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch(RAIDS_URL, { signal: controller.signal, cache: force ? "reload" : "default" });
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
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => { fetchRaids(); }, [fetchRaids]);

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
        meta: TIER_META[tier] ?? {
          order: 99, color: "#64748b",
          bg: "linear-gradient(135deg, #94a3b8, #475569)",
          emoji: "❔",
          description: { en: tier, th: tier, ja: tier },
          label: { en: tier, th: tier, ja: tier },
        },
        bosses,
      }))
      .sort((a, b) => a.meta.order - b.meta.order);
  }, [raids]);

  const t = (th, en, ja) => lang === "th" ? th : lang === "ja" ? (ja ?? en) : en;

  // Countdown to next rotation
  const nextRot = getNextRotation();
  const timeLeft = nextRot - now;
  const formatTimeLeft = (ms) => {
    if (ms < 0) return t("กำลังจะอัปเดต", "Updating soon", "更新間近");
    const totalMin = Math.floor(ms / 60000);
    const d = Math.floor(totalMin / 1440);
    const h = Math.floor((totalMin % 1440) / 60);
    const m = totalMin % 60;
    if (d > 0) return t(`เหลือ ${d} วัน ${h} ชม.`, `${d}d ${h}h left`, `残り${d}日${h}時間`);
    if (h > 0) return t(`เหลือ ${h} ชม. ${m} นาที`, `${h}h ${m}m left`, `残り${h}時間${m}分`);
    return t(`เหลือ ${m} นาที`, `${m}m left`, `残り${m}分`);
  };

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
      background: "radial-gradient(ellipse at top, rgba(15, 23, 42, 0.92), rgba(2, 6, 23, 0.95))",
      backdropFilter: "blur(10px)",
      overflowY: "auto", padding: "20px 12px",
      animation: "rb-overlay-in 0.3s ease",
    }}>
      <style>{`
        @keyframes rb-overlay-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes rb-card-in { from { opacity: 0; transform: translateY(10px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes rb-spin { to { transform: rotate(360deg); } }
        @keyframes rb-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        .rb-card { transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s, border-color 0.25s; cursor: pointer; }
        .rb-card:hover {
          transform: translateY(-6px) scale(1.02);
          box-shadow: 0 22px 44px rgba(0, 0, 0, 0.35);
        }
        .rb-card:active { transform: translateY(-3px) scale(0.99); }
        .rb-card img { transition: transform 0.3s ease; }
        .rb-card:hover img { transform: scale(1.08) translateY(-3px); }
        @keyframes rb-shiny-pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 4px 10px rgba(245, 158, 11, 0.5), 0 0 12px rgba(252, 211, 77, 0.4); }
          50%      { transform: scale(1.05); box-shadow: 0 6px 16px rgba(245, 158, 11, 0.7), 0 0 18px rgba(252, 211, 77, 0.7); }
        }
      `}</style>

      <div onClick={(e) => e.stopPropagation()} style={{
        maxWidth: 1100, margin: "0 auto",
        background: "var(--rb-bg, #fff)",
        borderRadius: 24, padding: "22px 18px 26px",
        boxShadow: "0 28px 80px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.06)",
        minHeight: "85vh",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Pokemon GO style decorative hexagons */}
        <div style={{
          position: "absolute", top: -50, right: -50,
          width: 200, height: 200, opacity: 0.04,
          background: "radial-gradient(circle, #dc2626 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", bottom: -80, left: -80,
          width: 250, height: 250, opacity: 0.04,
          background: "radial-gradient(circle, #06b6d4 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                      flexWrap: "wrap", gap: 12, marginBottom: 12, padding: "0 4px" }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: "var(--rb-fg, #1e293b)",
                         margin: 0, letterSpacing: "-0.01em" }}>
              🎯 {t("Raid Boss วันนี้", "Today's Raid Bosses", "今日のレイドボス")}
            </h1>
            <div style={{ fontSize: 12, color: "var(--rb-muted, #64748b)",
                          marginTop: 4, fontWeight: 600 }}>
              {t(`อัปเดต ${formatAge(lastUpdated)} · ข้อมูลจาก LeekDuck`,
                 `Updated ${formatAge(lastUpdated)} · Data from LeekDuck`,
                 `更新: ${formatAge(lastUpdated)} · LeekDuck`)}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => fetchRaids(true)} disabled={loading} style={{
              padding: "8px 14px", borderRadius: 10,
              border: "1.5px solid var(--rb-border, #e2e8f0)",
              background: "var(--rb-card, #f8fafc)",
              color: "var(--rb-fg, #475569)",
              fontWeight: 700, fontSize: 12,
              cursor: loading ? "wait" : "pointer", opacity: loading ? 0.6 : 1,
              display: "inline-flex", alignItems: "center", gap: 6,
            }}>
              <span style={{ display: "inline-block", animation: loading ? "rb-spin 1s linear infinite" : "none" }}>🔄</span>
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

        {/* Rotation countdown banner */}
        {raids && raids.length > 0 && (
          <div style={{
            background: "linear-gradient(135deg, rgba(220, 38, 38, 0.1), rgba(239, 68, 68, 0.05))",
            border: "1.5px solid rgba(220, 38, 38, 0.2)",
            borderRadius: 12, padding: "10px 14px", marginBottom: 18,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexWrap: "wrap", gap: 8,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                width: 8, height: 8, borderRadius: "50%",
                background: "#dc2626",
                boxShadow: "0 0 8px #dc2626",
                animation: "rb-pulse 1.5s ease-in-out infinite",
              }} />
              <span style={{ fontSize: 12, fontWeight: 800, color: "#dc2626", letterSpacing: 0.4 }}>
                {t("รอบ Raid ปัจจุบัน", "CURRENT RAID ROTATION", "現在のレイドローテーション")}
              </span>
            </div>
            <div style={{
              fontSize: 13, fontWeight: 900,
              color: "var(--rb-fg, #1e293b)",
              fontFamily: "ui-monospace, Menlo, monospace",
              fontVariantNumeric: "tabular-nums",
            }}>
              ⏳ {formatTimeLeft(timeLeft)}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && !raids && (
          <div style={{ padding: "30px 10px", textAlign: "center" }}>
            <div style={{ display: "inline-block", width: 48, height: 48,
                          border: "4px solid var(--rb-border, #e2e8f0)",
                          borderTopColor: "#dc2626", borderRadius: "50%",
                          animation: "rb-spin 0.8s linear infinite" }} />
            <div style={{ marginTop: 12, color: "var(--rb-muted, #64748b)", fontSize: 13, fontWeight: 600 }}>
              {t("กำลังโหลด Raid...", "Loading raids...", "レイドを読み込み中...")}
            </div>
          </div>
        )}

        {/* Error */}
        {error && !raids && (
          <div style={{ padding: "40px 20px", textAlign: "center",
                        background: "rgba(239, 68, 68, 0.08)",
                        border: "1.5px solid rgba(239, 68, 68, 0.25)", borderRadius: 14 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>⚠️</div>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#dc2626", marginBottom: 6 }}>
              {t("โหลดไม่สำเร็จ", "Failed to load", "読み込み失敗")}
            </div>
            <div style={{ fontSize: 12, color: "#7f1d1d" }}>{error}</div>
          </div>
        )}

        {/* Tier groups */}
        {raids && grouped.map((group) => (
          <div key={group.tier} style={{ marginBottom: 24 }}>
            {/* Dramatic Pokemon GO style tier banner */}
            <div style={{
              position: "relative",
              padding: "18px 22px",
              borderRadius: 18,
              background: group.meta.bg,
              color: "white",
              marginBottom: 16,
              boxShadow: `0 14px 36px ${group.meta.color}66, 0 0 0 1px rgba(255,255,255,0.15) inset`,
              overflow: "hidden",
            }}>
              {/* Decorative pattern overlays */}
              <div style={{
                position: "absolute", inset: 0,
                background: "repeating-linear-gradient(45deg, transparent, transparent 14px, rgba(255,255,255,0.04) 14px, rgba(255,255,255,0.04) 16px)",
                pointerEvents: "none",
              }} />
              <div style={{
                position: "absolute", right: -30, top: -20,
                fontSize: 120, opacity: 0.16, fontWeight: 900,
                filter: "blur(1px)",
              }}>
                {group.meta.emoji}
              </div>
              <div style={{
                position: "absolute", left: -10, bottom: -10,
                fontSize: 60, opacity: 0.1, fontWeight: 900,
                transform: "rotate(-15deg)",
              }}>
                {group.meta.emoji}
              </div>
              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 4 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 14,
                    background: "rgba(255,255,255,0.18)",
                    backdropFilter: "blur(8px)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: "1px solid rgba(255,255,255,0.25)",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.2) inset",
                    fontSize: 32, filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.4))",
                  }}>
                    {group.meta.emoji}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: 20, fontWeight: 900,
                      letterSpacing: 1.5,
                      textShadow: "0 2px 6px rgba(0,0,0,0.4), 0 0 12px rgba(255,255,255,0.2)",
                      fontFamily: "system-ui, -apple-system, sans-serif",
                    }}>
                      {group.meta.label[lang] ?? group.meta.label.en}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.95, fontWeight: 600, marginTop: 4, textShadow: "0 1px 3px rgba(0,0,0,0.3)" }}>
                      {group.meta.description?.[lang] ?? group.meta.description?.en ?? ""}
                    </div>
                  </div>
                  <div style={{
                    background: "rgba(255,255,255,0.22)",
                    backdropFilter: "blur(10px)",
                    padding: "8px 16px", borderRadius: 999,
                    fontSize: 14, fontWeight: 900, letterSpacing: 0.5,
                    border: "1px solid rgba(255,255,255,0.3)",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                  }}>
                    {group.bosses.length} {t("ตัว", "bosses", "体")}
                  </div>
                </div>
              </div>
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 10,
            }}>
              {group.bosses.map((boss, i) => (
                <RaidCard
                  key={`${boss.name}-${i}`}
                  boss={boss}
                  tierMeta={group.meta}
                  lang={lang}
                  onOpenPokemon={onOpenPokemon}
                  pokemonId={matchPokemonId(boss, allList)}
                  delay={i * 0.04}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Footer */}
        <div style={{
          marginTop: 24, paddingTop: 14,
          borderTop: "1px solid var(--rb-border, #e2e8f0)",
          fontSize: 10, color: "var(--rb-muted, #94a3b8)",
          textAlign: "center", letterSpacing: 0.3,
        }}>
          {t("ข้อมูลจาก LeekDuck.com ผ่าน ScrapedDuck · คลิกที่ Pokémon เพื่อดูรายละเอียด",
             "Data from LeekDuck.com via ScrapedDuck · Click Pokémon to view details",
             "データ元: LeekDuck.com (ScrapedDuck) · Pokémonをクリックで詳細表示")}
        </div>

        <style>{`
          :root { --rb-bg: #fff; --rb-fg: #1e293b; --rb-muted: #64748b; --rb-card: #f8fafc; --rb-border: #e2e8f0; }
          [data-theme="dark"] { --rb-bg: #0f172a; --rb-fg: #f1f5f9; --rb-muted: #94a3b8; --rb-card: #1e293b; --rb-border: #334155; }
        `}</style>
      </div>
    </div>
  );
}

function RaidCard({ boss, tierMeta, lang, onOpenPokemon, pokemonId, delay = 0 }) {
  // Prefer PokeAPI official artwork (cached from main grid) over LeekDuck CDN
  const name = boss.name || "Unknown";
  const image = pokemonId ? pokeApiArtwork(pokemonId) : boss.image;
  const fallbackImage = boss.image;
  const types = boss.types || [];
  const cpNormal = boss.combatPower?.normal;
  const cpBoosted = boss.combatPower?.boosted;
  const canBeShiny = boss.canBeShiny === true;
  const weather = boss.boostedWeather?.[0]?.name;

  return (
    <div onClick={() => onOpenPokemon?.(boss)}
      className="rb-card"
      style={{
        background: `linear-gradient(160deg, var(--rb-card, #fff) 0%, var(--rb-card, #fff) 60%, ${tierMeta.color}0a 100%)`,
        border: `2px solid ${tierMeta.color}40`,
        borderRadius: 16, padding: 12,
        boxShadow: `0 4px 14px rgba(0,0,0,0.08), 0 0 0 1px ${tierMeta.color}10`,
        position: "relative",
        animation: `rb-card-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}s backwards`,
        overflow: "hidden",
      }}>
      {/* Top gradient band (Pokemon GO style) */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 4,
        background: tierMeta.bg,
        pointerEvents: "none",
      }} />

      {/* Tier color accent corner */}
      <div style={{
        position: "absolute", top: -20, right: -20,
        width: 60, height: 60, borderRadius: "50%",
        background: tierMeta.bg,
        opacity: 0.15, filter: "blur(8px)",
        pointerEvents: "none",
      }} />

      {canBeShiny && (
        <div style={{
          position: "absolute", top: 8, right: 8,
          background: "linear-gradient(135deg, #fde047, #f59e0b, #ea580c)",
          color: "white", fontSize: 9, fontWeight: 900,
          padding: "4px 10px", borderRadius: 999,
          letterSpacing: 0.5,
          boxShadow: "0 4px 10px rgba(245, 158, 11, 0.5), 0 0 12px rgba(252, 211, 77, 0.4)",
          animation: "rb-shiny-pulse 2s ease-in-out infinite",
          zIndex: 2,
        }}>
          ✨ SHINY
        </div>
      )}

      <div style={{
        width: "100%", height: 120,
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 10, marginTop: 8,
        background: `radial-gradient(circle at center, ${tierMeta.color}20 0%, ${tierMeta.color}08 50%, transparent 75%)`,
        borderRadius: 12,
        position: "relative",
      }}>
        {image ? (
          <img src={image} alt={name} loading="lazy"
            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain",
                     filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.2))" }}
            onError={(e) => {
              if (fallbackImage && e.currentTarget.src !== fallbackImage) {
                e.currentTarget.src = fallbackImage;
              } else {
                e.currentTarget.style.display = "none";
              }
            }}
          />
        ) : (<div style={{ fontSize: 48, opacity: 0.4 }}>❔</div>)}
      </div>

      <div style={{ fontSize: 14, fontWeight: 800,
                    color: "var(--rb-fg, #1e293b)",
                    marginBottom: 6, lineHeight: 1.2 }}>
        {name}
      </div>

      {types.length > 0 && (
        <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap" }}>
          {types.map((tp, i) => (
            <span key={i} style={{
              fontSize: 9, fontWeight: 800, color: "white",
              background: TYPE_COLORS[tp.name] || "#94a3b8",
              padding: "3px 8px", borderRadius: 999,
              textTransform: "uppercase", letterSpacing: 0.4,
              boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
            }}>{tp.name}</span>
          ))}
        </div>
      )}

      {cpNormal && (
        <div style={{
          fontSize: 11, color: "var(--rb-muted, #64748b)",
          padding: "6px 8px", background: "var(--rb-bg, #f8fafc)",
          borderRadius: 8, fontWeight: 600, lineHeight: 1.5,
        }}>
          <div><strong>CP:</strong> {cpNormal.min}–{cpNormal.max}</div>
          {cpBoosted && (
            <div style={{ color: "#0891b2" }}>
              <strong>☀️ Boost:</strong> {cpBoosted.min}–{cpBoosted.max}
              {weather && <span style={{ marginLeft: 4, opacity: 0.7 }}>({weather})</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}