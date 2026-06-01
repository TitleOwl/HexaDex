import { useState } from "react";
import RaidCounterFinder from "./RaidCounterFinder.jsx";
import RaidBosses        from "./RaidBosses.jsx";
import RaidNow           from "./RaidNow.jsx";
import RocketLineups     from "./RocketLineups.jsx";
import SummaryOverview   from "./SummaryOverview.jsx";
import WeatherBoost      from "./WeatherBoost.jsx";
import LiveEvents        from "./LiveEvents.jsx";
import EggPool           from "./EggPool.jsx";
import FieldResearch     from "./FieldResearch.jsx";
import { findPokemonInList } from "../perfUtils.js";

const TOOL_CATEGORIES = [
  {
    id: "summary",
    titleEn: "📊 Overview",
    titleTh: "📊 สรุปภาพรวม",
    titleJa: "📊 概要",
    tools: [
      { id:"summary", icon:"📊", color:"#7c3aed", live: true, featured: true,
        titleEn:"Live Activity Summary", titleTh:"สรุปกิจกรรมแบบสด", titleJa:"ライブアクティビティ概要",
        descEn:"All-in-one PoGO dashboard · 📸 save as image",
        descTh:"Dashboard รวมทุกอย่าง · 📸 เซฟเป็นรูปได้",
        descJa:"オールインワン · 📸 画像保存可" },
    ],
  },
  {
    id: "battle",
    titleEn: "⚔️ Battle Preparation",
    titleTh: "⚔️ เตรียมสู้",
    titleJa: "⚔️ バトル準備",
    tools: [
      { id:"raidnow", icon:"🔴", color:"#dc2626", live: true,
        titleEn:"Raid NOW 🇹🇭", titleTh:"Raid NOW 🇹🇭", titleJa:"レイド NOW 🇹🇭",
        descEn:"Top-tier raid bosses right now · Thailand focus",
        descTh:"Raid Boss ทอป-เทียร์ตอนนี้ · เน้นไทย",
        descJa:"トップティアレイドボス今すぐ · タイ" },
      { id:"raidbosses", icon:"🎯", color:"#ef4444", live: true,
        titleEn:"All Raid Bosses", titleTh:"Raid Boss ทั้งหมด", titleJa:"全レイドボス",
        descEn:"Full raid rotation · Mega / 5★ / 3★ / 1★ / Dynamax",
        descTh:"Raid Boss ทั้งหมด · Mega / 5★ / 3★ / 1★ / Dynamax",
        descJa:"全レイド · Mega/5★/3★/1★/ダイマックス" },
      { id:"raid", icon:"⚔️", color:"#f97316",
        titleEn:"Raid Counter Finder", titleTh:"ตัวสู้ Raid", titleJa:"レイド対策",
        descEn:"Find best counters for any raid boss",
        descTh:"หาตัวสู้ Raid Boss ดีที่สุด",
        descJa:"レイドボスへの最適な対策" },
      { id:"rocket", icon:"🚀", color:"#1e293b", live: true,
        titleEn:"Team GO Rocket", titleTh:"Team GO Rocket", titleJa:"GOロケット団",
        descEn:"Giovanni / Sierra / Arlo / Cliff / Grunts lineups",
        descTh:"ทีมของ Giovanni / Sierra / Arlo / Cliff / ลูกน้อง",
        descJa:"サカキ / シエラ / アロエ / クリフ / したっぱ" },
    ],
  },
  {
    id: "live",
    titleEn: "🌐 Environment & Live",
    titleTh: "🌐 ข้อมูลสดและสภาพแวดล้อม",
    titleJa: "🌐 ライブ & 環境",
    tools: [
      { id:"events", icon:"📅", color:"#a855f7", live: true,
        titleEn:"Live Events", titleTh:"อีเวนต์ปัจจุบัน", titleJa:"ライブイベント",
        descEn:"Current & upcoming PoGO events with realtime countdown ⏱️",
        descTh:"Event ตอนนี้และที่จะมา · มี countdown realtime ⏱️",
        descJa:"現在/予定 · リアルタイムカウントダウン ⏱️" },
      { id:"eggs", icon:"🥚", color:"#f59e0b", live: true,
        titleEn:"Egg Pool", titleTh:"พื้นที่ฟัก", titleJa:"タマゴプール",
        descEn:"What hatches from 2 / 5 / 7 / 10 / 12 km eggs",
        descTh:"Pokémon ที่ฟักจากไข่ 2 / 5 / 7 / 10 / 12 km",
        descJa:"2/5/7/10/12kmタマゴの孵化Pokémon" },
      { id:"research", icon:"📋", color:"#0ea5e9", live: true,
        titleEn:"Field Research", titleTh:"งานพิเศษ", titleJa:"フィールドリサーチ",
        descEn:"Current Field Research tasks & their rewards",
        descTh:"งานพิเศษและรางวัลที่ได้",
        descJa:"現在のフィールドリサーチタスクと報酬" },
      { id:"weather", icon:"🌦️", color:"#0891b2",
        titleEn:"Weather Boost", titleTh:"Boost ตามอากาศ", titleJa:"天気ブースト",
        descEn:"Type boost calculator based on weather conditions",
        descTh:"คำนวณ Boost ของธาตุตามสภาพอากาศ",
        descJa:"天候による属性ブースト計算" },
    ],
  },
];

export default function GoToolsHub({ allList, loaded, thaiArr, jpArr, lang, cachedFetch, onOpen }) {
  const [active, setActive] = useState(null);
  const catTitle = (c) => lang === "th" ? c.titleTh : lang === "ja" ? c.titleJa : c.titleEn;
  const title    = (t) => lang === "th" ? t.titleTh : lang === "ja" ? t.titleJa : t.titleEn;
  const desc     = (t) => lang === "th" ? t.descTh  : lang === "ja" ? t.descJa  : t.descEn;

  // Match raid boss name to our Pokemon list (uses shared robust matcher)
  const matchPokemon = (boss) => findPokemonInList(boss, allList);

  return (
    <div className="go-tools-hub" style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 20px" }}>
      {/* ─── BEAUTIFUL OVERRIDES (injected before render) ─── */}
      <style>{`
        @keyframes gth-float {
          0%, 100% { transform: translateY(0) rotate(0); }
          50%      { transform: translateY(-8px) rotate(3deg); }
        }
        @keyframes gth-shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes gth-card-in {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes gth-pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          50%      { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
        }

        /* Hero header */
        .go-tools-hub .go-hub-header {
          background: linear-gradient(135deg, #1e3a8a 0%, #312e81 45%, #4c1d95 100%) !important;
          color: white !important;
          padding: 32px 28px !important;
          border-radius: 22px !important;
          margin-bottom: 28px !important;
          position: relative !important;
          overflow: hidden !important;
          box-shadow: 0 20px 50px rgba(67, 56, 202, 0.3), 0 0 0 1px rgba(255,255,255,0.08) inset !important;
        }
        /* Hero title (gradient text - hero header ONLY) */
        .go-tools-hub .go-hub-header .go-hub-title {
          font-size: 32px !important;
          font-weight: 900 !important;
          letter-spacing: -0.02em !important;
          margin: 0 0 6px 0 !important;
          background: linear-gradient(135deg, #fff 20%, #c7d2fe 100%) !important;
          -webkit-background-clip: text !important;
          background-clip: text !important;
          -webkit-text-fill-color: transparent !important;
          color: transparent !important;
          text-shadow: 0 4px 20px rgba(199, 210, 254, 0.3) !important;
        }
        .go-tools-hub .go-hub-subtitle {
          font-size: 14px !important;
          color: rgba(199, 210, 254, 0.85) !important;
          font-weight: 600 !important;
          margin: 0 !important;
          letter-spacing: 0.3px !important;
        }

        /* Category banner */
        .go-tools-hub .go-category {
          margin-bottom: 24px !important;
        }
        .go-tools-hub .go-category-header {
          font-size: 16px !important;
          font-weight: 900 !important;
          letter-spacing: 1px !important;
          text-transform: uppercase !important;
          padding: 12px 18px !important;
          border-radius: 12px !important;
          color: white !important;
          margin-bottom: 14px !important;
          position: relative !important;
          overflow: hidden !important;
        }
        .go-tools-hub .go-category:nth-of-type(2) .go-category-header {
          background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%) !important;
          box-shadow: 0 8px 22px rgba(220, 38, 38, 0.35) !important;
        }
        .go-tools-hub .go-category:nth-of-type(3) .go-category-header {
          background: linear-gradient(135deg, #06b6d4 0%, #2563eb 100%) !important;
          box-shadow: 0 8px 22px rgba(37, 99, 235, 0.35) !important;
        }

        /* Card grid */
        .go-tools-hub .go-hub-grid {
          display: grid !important;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)) !important;
          gap: 16px !important;
        }

        /* Cards - beautiful glass morphism */
        .go-tools-hub .go-hub-card {
          background: var(--gth-card-bg, linear-gradient(160deg, #ffffff 0%, #f8fafc 100%)) !important;
          border-radius: 18px !important;
          padding: 18px !important;
          border: 2px solid transparent !important;
          box-shadow:
            0 8px 24px rgba(0, 0, 0, 0.06),
            0 0 0 1px rgba(0, 0, 0, 0.04) !important;
          cursor: pointer !important;
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
                      box-shadow 0.3s !important;
          display: flex !important;
          align-items: center !important;
          gap: 14px !important;
          position: relative !important;
          overflow: hidden !important;
          text-align: left !important;
          animation: gth-card-in 0.4s ease backwards;
        }
        .go-tools-hub .go-hub-card::before {
          content: "";
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 4px;
          background: var(--tool-color);
          opacity: 0.9;
        }
        .go-tools-hub .go-hub-card::after {
          content: "";
          position: absolute;
          top: -40px; right: -40px;
          width: 120px; height: 120px;
          border-radius: 50%;
          background: var(--tool-color);
          opacity: 0.08;
          filter: blur(10px);
          pointer-events: none;
          transition: opacity 0.3s, transform 0.4s;
        }
        .go-tools-hub .go-hub-card:hover {
          transform: translateY(-6px) scale(1.015) !important;
          box-shadow:
            0 20px 50px rgba(0, 0, 0, 0.15),
            0 0 0 1px var(--tool-color) !important;
        }
        .go-tools-hub .go-hub-card:hover::after {
          opacity: 0.18;
          transform: scale(1.4);
        }

        /* Icon - bigger, with glow */
        .go-tools-hub .go-hub-icon {
          width: 56px !important;
          height: 56px !important;
          border-radius: 14px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-size: 28px !important;
          flex-shrink: 0 !important;
          box-shadow:
            0 8px 20px var(--tool-color),
            0 0 0 1px rgba(255,255,255,0.2) inset !important;
          position: relative;
          z-index: 1;
        }

        /* Info column */
        .go-tools-hub .go-hub-info {
          flex: 1 !important;
          min-width: 0 !important;
          position: relative !important;
          z-index: 1 !important;
        }
        /* Card title — solid dark text (override hero gradient inheritance) */
        .go-tools-hub .go-hub-card .go-hub-title {
          font-size: 16px !important;
          font-weight: 800 !important;
          color: #1e293b !important;
          -webkit-text-fill-color: #1e293b !important;
          background: none !important;
          -webkit-background-clip: initial !important;
          background-clip: initial !important;
          text-shadow: none !important;
          margin-bottom: 4px !important;
          letter-spacing: -0.01em !important;
          display: flex !important;
          align-items: center !important;
          flex-wrap: wrap !important;
          gap: 4px !important;
        }
        .go-tools-hub .go-hub-card .go-hub-desc {
          font-size: 12px !important;
          color: #475569 !important;
          line-height: 1.5 !important;
          font-weight: 500 !important;
        }

        /* Arrow */
        .go-tools-hub .go-hub-arrow {
          font-size: 22px !important;
          color: var(--tool-color) !important;
          font-weight: 900 !important;
          opacity: 0.5 !important;
          transition: transform 0.3s, opacity 0.3s !important;
          position: relative !important;
          z-index: 1 !important;
          flex-shrink: 0 !important;
        }
        .go-tools-hub .go-hub-card:hover .go-hub-arrow {
          transform: translateX(6px) !important;
          opacity: 1 !important;
        }

        /* Dark mode */
        [data-theme="dark"] .go-tools-hub .go-hub-card {
          background: linear-gradient(160deg, #1e293b 0%, #0f172a 100%) !important;
          box-shadow:
            0 8px 24px rgba(0, 0, 0, 0.4),
            0 0 0 1px rgba(255, 255, 255, 0.06) !important;
        }
        [data-theme="dark"] .go-tools-hub .go-hub-title { color: #f1f5f9 !important; }
        [data-theme="dark"] .go-tools-hub .go-hub-desc { color: #94a3b8 !important; }
      `}</style>

      {/* ─── HERO HEADER with decorative hexagons ─── */}
      <div className="go-hub-header">
        {/* Floating decorative hexagons */}
        <div style={{
          position: "absolute", top: 20, right: 30,
          width: 80, height: 80, opacity: 0.15,
          animation: "gth-float 4s ease-in-out infinite",
        }}>
          <svg viewBox="0 0 100 100">
            <polygon points="50,8 87,30 87,70 50,92 13,70 13,30"
              fill="none" stroke="white" strokeWidth="2" strokeLinejoin="round" />
            <polygon points="50,25 70,37 70,63 50,75 30,63 30,37"
              fill="white" opacity="0.3" />
          </svg>
        </div>
        <div style={{
          position: "absolute", bottom: 10, right: 120,
          width: 50, height: 50, opacity: 0.08,
          animation: "gth-float 5s ease-in-out infinite 1.5s",
        }}>
          <svg viewBox="0 0 100 100">
            <polygon points="50,8 87,30 87,70 50,92 13,70 13,30"
              fill="white" />
          </svg>
        </div>
        <div style={{
          position: "absolute", top: 50, left: 35,
          width: 35, height: 35, opacity: 0.12,
          animation: "gth-float 6s ease-in-out infinite 0.8s",
        }}>
          <svg viewBox="0 0 100 100">
            <polygon points="50,8 87,30 87,70 50,92 13,70 13,30"
              fill="none" stroke="white" strokeWidth="3" strokeLinejoin="round" />
          </svg>
        </div>
        {/* Subtle dot pattern */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
          pointerEvents: "none",
        }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <h2 className="go-hub-title">
            🎯 {lang === "th" ? "Pokémon GO Tools" : lang === "ja" ? "ポケモンGOツール" : "Pokémon GO Tools"}
          </h2>
          <p className="go-hub-subtitle">
            {lang === "th" ? "เครื่องมือสำหรับ Pokémon GO · ข้อมูล real-time จาก LeekDuck"
              : lang === "ja" ? "ポケモンGO用のツール · LeekDuckからのリアルタイムデータ"
              : "Tools for Pokémon GO · Real-time data from LeekDuck"}
          </p>

          {/* Quick stats row */}
          <div style={{
            display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap",
          }}>
            {[
              { icon: "🔴", label: lang === "th" ? "6 ฟีเจอร์ LIVE" : lang === "ja" ? "6 LIVE機能" : "6 LIVE features", glow: "#ef4444" },
              { icon: "⚡", label: lang === "th" ? "อัปเดตทุก 1 ชม." : lang === "ja" ? "1時間ごと更新" : "Updated hourly", glow: "#fbbf24" },
              { icon: "📸", label: lang === "th" ? "เซฟรูปได้"        : lang === "ja" ? "画像保存可"   : "Saveable image", glow: "#06b6d4" },
            ].map((s, i) => (
              <div key={i} style={{
                background: "rgba(255,255,255,0.12)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.18)",
                padding: "6px 12px",
                borderRadius: 999,
                fontSize: 11, fontWeight: 700,
                color: "white",
                display: "inline-flex", alignItems: "center", gap: 6,
                boxShadow: `0 4px 14px ${s.glow}22`,
              }}>
                <span style={{ fontSize: 14 }}>{s.icon}</span>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {TOOL_CATEGORIES.map((cat, catIdx) => (
        <div key={cat.id} className="go-category">
          <div className="go-category-header">
            {/* Subtle stripe pattern overlay */}
            <div style={{
              position: "absolute", inset: 0,
              background: "repeating-linear-gradient(45deg, transparent, transparent 14px, rgba(255,255,255,0.06) 14px, rgba(255,255,255,0.06) 16px)",
              pointerEvents: "none",
            }} />
            <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ textShadow: "0 2px 6px rgba(0,0,0,0.3)" }}>{catTitle(cat)}</span>
              <span style={{
                marginLeft: "auto",
                background: "rgba(255,255,255,0.22)",
                padding: "2px 10px",
                borderRadius: 999,
                fontSize: 10, fontWeight: 900,
                backdropFilter: "blur(6px)",
              }}>
                {cat.tools.length} {lang === "th" ? "เครื่องมือ" : lang === "ja" ? "ツール" : "tools"}
              </span>
            </div>
          </div>
          <div className="go-hub-grid">
            {cat.tools.map((t, i) => (
              <button key={t.id} className="go-hub-card"
                onClick={() => setActive(t.id)}
                style={{
                  "--tool-color": t.color,
                  animationDelay: `${(catIdx * 0.1 + i * 0.05)}s`,
                }}>
                <div className="go-hub-icon" style={{ background: `linear-gradient(135deg, ${t.color}, ${t.color}cc)` }}>
                  {t.icon}
                </div>
                <div className="go-hub-info">
                  <div className="go-hub-title">
                    <span>{title(t)}</span>
                    {t.live && (
                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: "linear-gradient(135deg, #ef4444, #dc2626)",
                        color: "white",
                        fontSize: 9,
                        fontWeight: 900,
                        letterSpacing: 0.6,
                        boxShadow: "0 2px 8px rgba(220, 38, 38, 0.5)",
                        animation: "gth-pulse-glow 1.8s ease-in-out infinite",
                      }}>
                        <span style={{
                          width: 5, height: 5, borderRadius: "50%",
                          background: "white",
                          boxShadow: "0 0 5px white",
                        }} />
                        LIVE
                      </span>
                    )}
                  </div>
                  <div className="go-hub-desc">{desc(t)}</div>
                </div>
                <span className="go-hub-arrow">→</span>
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Tool overlays */}
      {active === "summary" && (
        <SummaryOverview
          lang={lang}
          allList={allList}
          onClose={() => setActive(null)}
          onOpenPokemon={(boss) => {
            const matched = matchPokemon(boss);
            if (matched && onOpen) { setActive(null); onOpen(matched); }
          }}
        />
      )}
      {active === "raidnow" && (
        <RaidNow
          lang={lang}
          allList={allList}
          onClose={() => setActive(null)}
          onOpenPokemon={(boss) => {
            const matched = matchPokemon(boss);
            if (matched && onOpen) { setActive(null); onOpen(matched); }
          }}
        />
      )}
      {active === "raidbosses" && (
        <RaidBosses
          lang={lang}
          allList={allList}
          onClose={() => setActive(null)}
          onOpenPokemon={(boss) => {
            const matched = matchPokemon(boss);
            if (matched && onOpen) {
              setActive(null);
              onOpen(matched);
            }
          }}
        />
      )}
      {active === "rocket" && (
        <RocketLineups lang={lang} onClose={() => setActive(null)} />
      )}
      {active === "raid" && (
        <RaidCounterFinder allList={allList} loaded={loaded} thaiArr={thaiArr} jpArr={jpArr}
          lang={lang} cachedFetch={cachedFetch} onClose={() => setActive(null)}
          onOpenPokemon={(p) => { setActive(null); onOpen?.(p); }} />
      )}
      {active === "events" && (
        <LiveEvents lang={lang} onClose={() => setActive(null)} />
      )}
      {active === "eggs" && (
        <EggPool lang={lang} allList={allList} onClose={() => setActive(null)}
          onOpenPokemon={(boss) => {
            const matched = matchPokemon(boss);
            if (matched && onOpen) {
              setActive(null);
              onOpen(matched);
            }
          }} />
      )}
      {active === "research" && (
        <FieldResearch lang={lang} allList={allList} onClose={() => setActive(null)}
          onOpenPokemon={(boss) => {
            const matched = matchPokemon(boss);
            if (matched && onOpen) {
              setActive(null);
              onOpen(matched);
            }
          }} />
      )}
      {active === "weather" && (
        <WeatherBoost lang={lang} loaded={loaded} thaiArr={thaiArr} jpArr={jpArr}
          onOpen={onOpen} onClose={() => setActive(null)} />
      )}
    </div>
  );
}