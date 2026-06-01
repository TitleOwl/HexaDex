// ─── RaidNow — Thailand-focused current raid bosses ─────
// Shows top tier (5★/Mega/Shadow 5★) raid bosses NOW
// + Thailand timezone for raid hour + Thai community links

import { useState, useEffect, useMemo, useCallback } from "react";
import { useModalLifecycle, matchPokemonId, pokeApiArtwork } from "../perfUtils.js";

const RAIDS_URL = "https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/raids.json";
const CACHE_KEY = "pkdx_raids_cache_v1"; // shares cache with RaidBosses
const CACHE_TTL = 60 * 60 * 1000;

const TYPE_COLORS = {
  Normal: "#A8A878", Fire: "#F08030", Water: "#6890F0", Electric: "#F8D030",
  Grass: "#78C850", Ice: "#98D8D8", Fighting: "#C03028", Poison: "#A040A0",
  Ground: "#E0C068", Flying: "#A890F0", Psychic: "#F85888", Bug: "#A8B820",
  Rock: "#B8A038", Ghost: "#705898", Dragon: "#7038F8", Dark: "#705848",
  Steel: "#B8B8D0", Fairy: "#EE99AC",
};

// Pokemon GO Raid Hour: every Wednesday 18:00-19:00 LOCAL time
// In Thailand (UTC+7), that's Wednesday 18:00 ICT
function getNextRaidHour() {
  const now = new Date();
  const bangkokOffset = 7 * 60; // minutes
  const localOffset = -now.getTimezoneOffset();
  const bangkokNow = new Date(now.getTime() + (bangkokOffset - localOffset) * 60000);

  const next = new Date(bangkokNow);
  const dayOfWeek = next.getDay(); // 0=Sun, 3=Wed
  let daysUntil = (3 - dayOfWeek + 7) % 7;
  // If it's Wednesday past 19:00, go to next week
  if (dayOfWeek === 3 && next.getHours() >= 19) daysUntil = 7;
  next.setDate(next.getDate() + daysUntil);
  next.setHours(18, 0, 0, 0);

  // Convert back to user local time
  return new Date(next.getTime() - (bangkokOffset - localOffset) * 60000);
}

// Thai PoGO community resources
const TH_COMMUNITIES = [
  { name: "Pokemon Go Thailand (Facebook)", url: "https://www.facebook.com/groups/pokemongo.thailand/", icon: "📘", color: "#1877F2" },
  { name: "PoGO Bangkok Discord",            url: "https://discord.gg/pokemongo",                       icon: "💬", color: "#5865F2" },
  { name: "PoGO Thailand Reddit",            url: "https://www.reddit.com/r/PokemonGOThailand/",        icon: "🔴", color: "#FF4500" },
  { name: "PvPoke Counters (EN)",            url: "https://pvpoke.com/",                                icon: "⚔️", color: "#0891b2" },
];

export default function RaidNow({ lang = "en", onClose, onOpenPokemon, allList = [] }) {
  useModalLifecycle();
  const [raids,   setRaids]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const fetchRaids = useCallback(async (force = false) => {
    setLoading(true);
    if (!force) {
      try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
          setRaids(cached.data); setLoading(false); return;
        }
      } catch {}
    }
    try {
      const res = await fetch(RAIDS_URL, { cache: force ? "reload" : "default" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRaids(data);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() })); } catch {}
    } catch (e) {
      try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
        if (cached?.data) setRaids(cached.data);
      } catch {}
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRaids(); }, [fetchRaids]);

  // Top tier bosses only (Mega + 5-Star, includes Shadow versions)
  const topBosses = useMemo(() => {
    if (!raids || !Array.isArray(raids)) return [];
    const topTiers = ["Mega Raids", "5-Star Raids"];
    return raids.filter(r => topTiers.includes(r.tier));
  }, [raids]);

  const t = (th, en, ja) => lang === "th" ? th : lang === "ja" ? (ja ?? en) : en;

  // Bangkok time + countdown to next Raid Hour
  const bangkokTime = new Date(now + ((7 * 60) - (-new Date().getTimezoneOffset())) * 60000);
  const bangkokTimeStr = bangkokTime.toLocaleTimeString("en-US", { hour12: false, timeZone: "Asia/Bangkok" });
  const nextRH = getNextRaidHour();
  const msToRH = nextRH.getTime() - now;
  const formatRH = (ms) => {
    if (ms < 0) return t("เริ่มแล้ว!", "Started!", "開始!");
    const d = Math.floor(ms / 86400000);
    const h = Math.floor((ms % 86400000) / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    return `${h}h ${m}m ${s}s`;
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 9000,
      background: "radial-gradient(ellipse at top, rgba(127, 29, 29, 0.95), rgba(15, 23, 42, 0.97))",
      backdropFilter: "blur(12px)",
      overflowY: "auto", padding: "20px 12px",
    }}>
      <style>{`
        @keyframes rn-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes rn-glow { 0%,100% { box-shadow: 0 0 20px rgba(220, 38, 38, 0.5); } 50% { box-shadow: 0 0 40px rgba(220, 38, 38, 0.9); } }
        @keyframes rn-card-in { from { opacity: 0; transform: scale(0.9) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .rn-card { transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); cursor: pointer; }
        .rn-card:hover { transform: translateY(-8px) scale(1.03); }
        .rn-card:hover img { transform: scale(1.12); }
        .rn-card img { transition: transform 0.4s ease; }
      `}</style>
      <div onClick={(e) => e.stopPropagation()} style={{
        maxWidth: 1200, margin: "0 auto",
        background: "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)",
        borderRadius: 24, padding: "24px 18px 28px",
        boxShadow: "0 40px 100px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(220, 38, 38, 0.2)",
        minHeight: "85vh", position: "relative", overflow: "hidden", color: "white",
      }}>
        {/* URGENT badge background */}
        <div style={{
          position: "absolute", top: -50, right: -50,
          width: 250, height: 250, opacity: 0.15,
          background: "radial-gradient(circle, #dc2626, transparent 70%)",
          pointerEvents: "none",
        }} />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                      flexWrap: "wrap", gap: 12, marginBottom: 18, position: "relative" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
              <span style={{
                width: 14, height: 14, borderRadius: "50%",
                background: "#dc2626", boxShadow: "0 0 12px #dc2626",
                animation: "rn-pulse 1.5s ease-in-out infinite",
              }} />
              <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0,
                           background: "linear-gradient(135deg, #fca5a5, #fff)",
                           WebkitBackgroundClip: "text",
                           WebkitTextFillColor: "transparent",
                           letterSpacing: "-0.02em" }}>
                {t("🔴 Raid NOW", "🔴 Raid NOW", "🔴 レイド NOW")}
              </h1>
            </div>
            <div style={{ fontSize: 13, color: "#fca5a5", fontWeight: 700, letterSpacing: 0.5 }}>
              🇹🇭 {t("ดู Raid Boss ตอนนี้ที่ประเทศไทย",
                     "Top raid bosses in Thailand RIGHT NOW",
                     "タイで開催中のレイドボス")}
            </div>
          </div>
          <button onClick={onClose} style={{
            padding: "10px 18px", borderRadius: 12, border: "none",
            background: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)",
            color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer",
          }}>
            ✕ {t("ปิด", "Close", "閉じる")}
          </button>
        </div>

        {/* Timing info bar */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 10, marginBottom: 22,
        }}>
          {[
            { label: t("เวลาที่กรุงเทพ", "Bangkok Time", "バンコク時間"),
              value: bangkokTimeStr.split(".")[0],
              icon: "🕐", color: "#06b6d4" },
            { label: t("Raid Hour ครั้งต่อไป", "Next Raid Hour", "次のレイドアワー"),
              value: formatRH(msToRH),
              icon: "⚡", color: "#fbbf24" },
            { label: t("Top Boss ตอนนี้", "Top Bosses Now", "現在のトップボス"),
              value: `${topBosses.length}`,
              icon: "🔥", color: "#dc2626" },
          ].map((stat, i) => (
            <div key={i} style={{
              background: "rgba(255,255,255,0.06)",
              backdropFilter: "blur(10px)",
              border: `1.5px solid ${stat.color}40`,
              borderRadius: 14, padding: "12px 14px",
              position: "relative", overflow: "hidden",
            }}>
              <div style={{
                position: "absolute", top: -10, right: -10,
                width: 60, height: 60, borderRadius: "50%",
                background: stat.color, opacity: 0.12,
              }} />
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, position: "relative" }}>
                <span style={{ fontSize: 16 }}>{stat.icon}</span>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", fontWeight: 700, letterSpacing: 0.4 }}>
                  {stat.label}
                </span>
              </div>
              <div style={{
                fontSize: 20, fontWeight: 900,
                fontFamily: "ui-monospace, Menlo, monospace",
                fontVariantNumeric: "tabular-nums",
                color: stat.color, position: "relative",
              }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Loading */}
        {loading && !raids && (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "white" }}>
            ⏳ {t("กำลังโหลด...", "Loading...", "読み込み中...")}
          </div>
        )}

        {/* Top boss grid */}
        {topBosses.length > 0 && (
          <>
            <div style={{
              padding: "10px 16px", borderRadius: 12,
              background: "linear-gradient(135deg, #dc2626, #991b1b)",
              marginBottom: 14, display: "flex", alignItems: "center", gap: 10,
              animation: "rn-glow 2s ease-in-out infinite",
            }}>
              <span style={{ fontSize: 20 }}>🔥</span>
              <span style={{ fontSize: 14, fontWeight: 900, letterSpacing: 1, color: "white" }}>
                {t("RAID BOSS ทอป-เทียร์ที่ active ตอนนี้",
                   "TOP-TIER ACTIVE RAID BOSSES",
                   "アクティブなトップティアレイドボス")}
              </span>
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
              gap: 14, marginBottom: 24,
            }}>
              {topBosses.map((boss, i) => {
                const pid = matchPokemonId(boss, allList);
                const img = pid ? pokeApiArtwork(pid) : boss.image;
                const types = boss.types || [];
                return (
                  <div key={`${boss.name}-${i}`}
                    className="rn-card"
                    onClick={() => onOpenPokemon?.(boss)}
                    style={{
                      background: "linear-gradient(160deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))",
                      borderRadius: 16, padding: 14,
                      border: "2px solid rgba(220, 38, 38, 0.3)",
                      backdropFilter: "blur(8px)",
                      animation: `rn-card-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.05}s backwards`,
                      position: "relative", overflow: "hidden",
                    }}>
                    {/* Tier ribbon */}
                    {(() => {
                      const isShadow = (boss.name || "").toLowerCase().startsWith("shadow ");
                      const isMega   = boss.tier === "Mega Raids";
                      let label = "5★ LEGENDARY";
                      let bg = "linear-gradient(135deg, #a855f7, #6d28d9)";
                      if (isMega) { label = "MEGA"; bg = "linear-gradient(135deg, #f43f5e, #be123c)"; }
                      else if (isShadow) { label = "SHADOW 5★"; bg = "linear-gradient(135deg, #374151, #111827)"; }
                      return (
                        <div style={{
                          position: "absolute", top: 10, left: 0,
                          background: bg,
                          color: "white", padding: "3px 10px 3px 14px",
                          fontSize: 10, fontWeight: 900, letterSpacing: 1,
                          clipPath: "polygon(0 0, 100% 0, 95% 100%, 0 100%)",
                          zIndex: 2,
                        }}>{label}</div>
                      );
                    })()}

                    {boss.canBeShiny && (
                      <div style={{
                        position: "absolute", top: 10, right: 10,
                        background: "linear-gradient(135deg, #fde047, #f59e0b)",
                        color: "#7c2d12", fontSize: 10, fontWeight: 900,
                        padding: "3px 8px", borderRadius: 999,
                        boxShadow: "0 0 12px rgba(252, 211, 77, 0.6)",
                      }}>
                        ✨ SHINY
                      </div>
                    )}

                    <div style={{
                      width: "100%", height: 130,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      marginTop: 22, marginBottom: 10,
                      background: "radial-gradient(circle at center, rgba(220, 38, 38, 0.25), transparent 70%)",
                      borderRadius: 12,
                    }}>
                      {img && (
                        <img src={img} alt={boss.name} loading="lazy"
                          style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain",
                                   filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.4))" }}
                          onError={(e) => {
                            if (boss.image && e.currentTarget.src !== boss.image) {
                              e.currentTarget.src = boss.image;
                            }
                          }}
                        />
                      )}
                    </div>

                    <div style={{
                      fontSize: 15, fontWeight: 900, color: "white",
                      textAlign: "center", marginBottom: 6, letterSpacing: 0.3,
                    }}>
                      {boss.name}
                    </div>

                    {types.length > 0 && (
                      <div style={{ display: "flex", gap: 4, justifyContent: "center", flexWrap: "wrap", marginBottom: 8 }}>
                        {types.map((tp, i) => (
                          <span key={i} style={{
                            fontSize: 9, fontWeight: 800, color: "white",
                            background: TYPE_COLORS[tp.name] || "#94a3b8",
                            padding: "2px 8px", borderRadius: 999,
                            textTransform: "uppercase",
                          }}>{tp.name}</span>
                        ))}
                      </div>
                    )}

                    {boss.combatPower?.normal && (
                      <div style={{
                        background: "rgba(0,0,0,0.3)", borderRadius: 8,
                        padding: "6px 10px", fontSize: 10, color: "rgba(255,255,255,0.85)",
                      }}>
                        <div style={{ fontWeight: 700 }}>CP {boss.combatPower.normal.min}–{boss.combatPower.normal.max}</div>
                        {boss.combatPower.boosted && (
                          <div style={{ color: "#67e8f9", marginTop: 2 }}>
                            ☀️ {boss.combatPower.boosted.min}–{boss.combatPower.boosted.max}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Thai community resources */}
        <div style={{
          background: "rgba(255,255,255,0.04)",
          border: "1.5px solid rgba(255,255,255,0.1)",
          borderRadius: 16, padding: 18, marginTop: 8,
        }}>
          <div style={{
            fontSize: 13, fontWeight: 900, letterSpacing: 0.8,
            color: "white", marginBottom: 12,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ fontSize: 18 }}>🇹🇭</span>
            <span>{t("ชุมชน Pokémon GO ไทย", "Thai Pokémon GO Communities", "タイのポケモンGOコミュニティ")}</span>
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 8,
          }}>
            {TH_COMMUNITIES.map((c, i) => (
              <a key={i} href={c.url} target="_blank" rel="noopener noreferrer"
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 12px", borderRadius: 10,
                  background: "rgba(255,255,255,0.05)",
                  border: `1.5px solid ${c.color}40`,
                  color: "white", textDecoration: "none",
                  fontSize: 11, fontWeight: 600,
                  transition: "transform 0.2s, background 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.background = `${c.color}25`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                }}>
                <span style={{ fontSize: 16 }}>{c.icon}</span>
                <span style={{ flex: 1 }}>{c.name}</span>
                <span style={{ opacity: 0.6 }}>↗</span>
              </a>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 20, paddingTop: 14,
          borderTop: "1px solid rgba(255,255,255,0.08)",
          fontSize: 10, color: "rgba(255,255,255,0.4)",
          textAlign: "center", letterSpacing: 0.3,
        }}>
          🇹🇭 {t("ข้อมูล raid จาก LeekDuck · เวลา raid Hour: ทุกพุธ 18:00 น. (เวลาไทย)",
                  "Raid data from LeekDuck · Raid Hour: every Wednesday 6 PM (Bangkok time)",
                  "レイドデータ: LeekDuck · レイドアワー: 毎週水曜 18時")}
        </div>
      </div>
    </div>
  );
}