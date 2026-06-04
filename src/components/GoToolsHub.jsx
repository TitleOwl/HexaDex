import { useState } from "react";
import RaidCounterFinder from "./RaidCounterFinder.jsx";
import RaidGuide          from "./RaidGuide.jsx";
import RocketLineups     from "./RocketLineups.jsx";
import SummaryOverview   from "./SummaryOverview.jsx";
import WeatherBoost      from "./WeatherBoost.jsx";
import LiveEvents        from "./LiveEvents.jsx";
import EggPool           from "./EggPool.jsx";
import FieldResearch     from "./FieldResearch.jsx";
import { findPokemonInList } from "../perfUtils.js";

const TOOL_CATEGORIES = [
  {
    id: "battle",
    titleEn: "⚔️ Battle Preparation & Stats",
    titleTh: "⚔️ เตรียมสู้และข้อมูล",
    titleJa: "⚔️ バトル準備 & 統計",
    tools: [
      { id:"summary", icon:"📊", color:"#7c3aed", live: true,
        titleEn:"Live Activity Summary", titleTh:"สรุปกิจกรรมแบบสด", titleJa:"ライブアクティビティ概要",
        descEn:"All-in-one PoGO dashboard · 📸 save as image",
        descTh:"Dashboard รวมทุกอย่าง · 📸 เซฟเป็นรูปได้",
        descJa:"オールインワン · 📸 画像保存可" },
      { id:"raidguide", icon:"⚔️", color:"#dc2626", live: true,
        titleEn:"Raid Battle Guide", titleTh:"คู่มือ Raid Boss", titleJa:"レイドガイド",
        descEn:"All active raid bosses · TH Raid Hour · Community",
        descTh:"Raid Boss ทั้งหมด · Raid Hour ไทย · ชุมชน",
        descJa:"全レイドボス · タイレイドアワー · コミュニティ" },
      { id:"raid", icon:"🛡️", color:"#f97316",
        titleEn:"Counter Battle Guide", titleTh:"คู่มือการสู้ Raid", titleJa:"対策ガイド",
        descEn:"Find best counters for any raid boss",
        descTh:"หาตัวสู้ Raid Boss ที่ดีที่สุด",
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
    titleEn: "🌐 Environment & Live Data",
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
      {/* ─── VISUAL-FIRST DESIGN (less text, bigger icons) ─── */}
      <style>{`
        /* ═══════════════════════════════════════════════════════════
           Design Tokens
           ═══════════════════════════════════════════════════════════ */
        .go-tools-hub {
          --gth-ease: cubic-bezier(0.16, 1, 0.3, 1);
          --gth-radius-md: 18px;
          --gth-radius-lg: 24px;
          --gth-shadow-sm: 0 4px 12px rgba(15, 23, 42, 0.06);
          --gth-shadow-md: 0 10px 24px rgba(15, 23, 42, 0.12);
          --gth-shadow-lg: 0 20px 48px rgba(15, 23, 42, 0.18);
        }

        @keyframes gth-fade-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes gth-pulse-dot {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%      { transform: scale(1.3); opacity: 0.55; }
        }
        @keyframes gth-float {
          0%, 100% { transform: translateY(0) rotate(0); }
          50%      { transform: translateY(-8px) rotate(3deg); }
        }
        @keyframes gth-shimmer {
          0%   { background-position: -200% 50%; }
          100% { background-position: 200% 50%; }
        }

        /* ═══════════════════════════════════════════════════════════
           Hero Header — clean dark mesh gradient
           ═══════════════════════════════════════════════════════════ */
        .go-tools-hub .go-hub-header {
          position: relative !important;
          padding: 28px 32px !important;
          margin-bottom: 30px !important;
          border-radius: 26px !important;
          background:
            radial-gradient(circle at 12% 18%, rgba(168, 85, 247, 0.35), transparent 45%),
            radial-gradient(circle at 88% 78%, rgba(99, 102, 241, 0.35), transparent 45%),
            linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%) !important;
          color: white !important;
          overflow: hidden !important;
          box-shadow: var(--gth-shadow-lg), inset 0 1px 0 rgba(255,255,255,0.15) !important;
          animation: gth-fade-up 0.5s var(--gth-ease) !important;
        }
        .go-tools-hub .go-hub-header h2.go-hub-title {
          font-size: 26px !important;
          font-weight: 950 !important;
          margin: 0 0 6px 0 !important;
          letter-spacing: -0.03em !important;
          display: flex !important;
          align-items: center !important;
          gap: 10px !important;
          background: linear-gradient(135deg, #fff, #fde68a) !important;
          -webkit-background-clip: text !important; background-clip: text !important;
          -webkit-text-fill-color: transparent !important;
        }
        .go-tools-hub .go-hub-subtitle {
          font-size: 13px !important;
          color: rgba(241, 245, 249, 0.78) !important;
          font-weight: 600 !important;
          margin: 0 !important;
          letter-spacing: 0.02em !important;
        }

        /* ═══════════════════════════════════════════════════════════
           Category Section — minimal header
           ═══════════════════════════════════════════════════════════ */
        .go-tools-hub .go-category {
          margin-bottom: 28px;
          animation: gth-fade-up 0.5s var(--gth-ease) backwards;
        }
        .go-tools-hub .go-category:nth-of-type(2) { animation-delay: 0.1s; }
        .go-tools-hub .go-category:nth-of-type(3) { animation-delay: 0.18s; }

        .go-tools-hub .go-category-header {
          position: relative !important;
          padding: 13px 18px !important;
          margin-bottom: 16px !important;
          border-radius: 14px !important;
          font-size: 14px !important;
          font-weight: 900 !important;
          color: white !important;
          letter-spacing: 0.02em !important;
          overflow: hidden !important;
          display: flex !important;
          align-items: center !important;
          gap: 8px !important;
          box-shadow: var(--gth-shadow-sm) !important;
        }
        .go-tools-hub [data-cat="battle"] .go-category-header {
          background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%) !important;
        }
        .go-tools-hub [data-cat="live"] .go-category-header {
          background: linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%) !important;
        }

        /* Card grid — uniform 4-up on desktop */
        .go-tools-hub .go-hub-grid {
          display: grid !important;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)) !important;
          gap: 16px !important;
        }

        /* ═══════════════════════════════════════════════════════════
           Tool Cards — modern tile style, equal size
           ═══════════════════════════════════════════════════════════ */
        .go-tools-hub .go-hub-card {
          position: relative !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          gap: 14px !important;
          padding: 24px 14px 18px !important;
          background: white !important;
          border-radius: var(--gth-radius-lg) !important;
          border: 1.5px solid rgba(148, 163, 184, 0.15) !important;
          cursor: pointer !important;
          text-align: center !important;
          transition: all 0.4s var(--gth-ease) !important;
          box-shadow: var(--gth-shadow-sm) !important;
          overflow: hidden !important;
          animation: gth-fade-up 0.5s var(--gth-ease) backwards !important;
          min-height: 180px !important;
        }

        /* Color tint on hover using --tool-color */
        .go-tools-hub .go-hub-card::before {
          content: "";
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 50% 0%, var(--tool-color, transparent), transparent 65%);
          opacity: 0;
          transition: opacity 0.4s ease;
          pointer-events: none;
        }
        .go-tools-hub .go-hub-card:hover {
          transform: translateY(-6px) !important;
          border-color: var(--tool-color, rgba(99,102,241,0.4)) !important;
          box-shadow: var(--gth-shadow-lg) !important;
        }
        .go-tools-hub .go-hub-card:hover::before { opacity: 0.08; }

        /* Tool icon */
        .go-tools-hub .go-hub-icon {
          width: 64px !important;
          height: 64px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-size: 30px !important;
          border-radius: 18px !important;
          box-shadow: 0 8px 18px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.35) !important;
          position: relative !important;
          z-index: 1 !important;
          transition: transform 0.4s var(--gth-ease) !important;
          flex-shrink: 0 !important;
        }
        .go-tools-hub .go-hub-card:hover .go-hub-icon {
          transform: scale(1.08) rotate(-4deg);
        }

        /* Card info */
        .go-tools-hub .go-hub-info {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          gap: 4px !important;
          position: relative !important;
          z-index: 1 !important;
          flex: 1 !important;
        }
        .go-tools-hub .go-hub-card .go-hub-title {
          font-size: 14px !important;
          font-weight: 800 !important;
          color: #1e293b !important;
          letter-spacing: -0.01em !important;
          display: flex !important;
          align-items: center !important;
          gap: 6px !important;
          flex-wrap: wrap !important;
          justify-content: center !important;
          margin: 0 !important;
          background: none !important;
          -webkit-text-fill-color: initial !important;
        }
        .go-tools-hub .go-hub-desc {
          font-size: 11px !important;
          color: #64748b !important;
          font-weight: 600 !important;
          line-height: 1.45 !important;
          margin-top: 2px !important;
        }

        /* LIVE badge */
        .go-tools-hub .go-hub-live {
          display: inline-flex !important;
          align-items: center !important;
          gap: 4px !important;
          padding: 2px 9px !important;
          font-size: 9px !important;
          font-weight: 900 !important;
          color: white !important;
          background: linear-gradient(135deg, #ef4444, #dc2626) !important;
          border-radius: 999px !important;
          letter-spacing: 0.08em !important;
          box-shadow: 0 2px 6px rgba(239, 68, 68, 0.35) !important;
        }
        .go-tools-hub .go-hub-live::before {
          content: "" !important;
          width: 5px !important; height: 5px !important;
          background: white !important;
          border-radius: 50% !important;
          animation: gth-pulse-dot 1.4s ease-in-out infinite !important;
        }

        /* Dark mode */
        :root[data-theme="dark"] .go-tools-hub .go-hub-card,
        [data-theme="dark"] .go-tools-hub .go-hub-card {
          background: #1f2937 !important;
          border-color: rgba(148, 163, 184, 0.18) !important;
        }
        :root[data-theme="dark"] .go-tools-hub .go-hub-card .go-hub-title,
        [data-theme="dark"] .go-tools-hub .go-hub-card .go-hub-title { color: #f1f5f9 !important; }
        :root[data-theme="dark"] .go-tools-hub .go-hub-desc,
        [data-theme="dark"] .go-tools-hub .go-hub-desc { color: #94a3b8 !important; }

        /* Responsive */
        @media (max-width: 720px) {
          .go-tools-hub .go-hub-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important; }
          .go-tools-hub .go-hub-header { padding: 22px !important; }
          .go-tools-hub .go-hub-header h2.go-hub-title { font-size: 22px !important; }
        }
        @media (max-width: 420px) {
          .go-tools-hub .go-hub-grid { grid-template-columns: 1fr !important; }
        }

        @media (prefers-reduced-motion: reduce) {
          .go-tools-hub .go-hub-card,
          .go-tools-hub .go-hub-icon,
          .go-tools-hub .go-category,
          .go-tools-hub .go-hub-header { animation: none !important; transition: none !important; }
        }
      `}</style>

      {/* ─── HERO HEADER ─── */}
      <div className="go-hub-header">
        <div style={{
          position: "absolute", top: 20, right: 30,
          width: 70, height: 70, opacity: 0.18,
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
          position: "absolute", bottom: 12, right: 110,
          width: 44, height: 44, opacity: 0.1,
          animation: "gth-float 5s ease-in-out infinite 1.5s",
        }}>
          <svg viewBox="0 0 100 100">
            <polygon points="50,8 87,30 87,70 50,92 13,70 13,30" fill="white" />
          </svg>
        </div>
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
            {lang === "th" ? "ข้อมูล real-time จาก LeekDuck"
              : lang === "ja" ? "LeekDuckからのリアルタイムデータ"
              : "Real-time data from LeekDuck"}
          </p>

          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            {[
              { icon: "🔴", label: lang === "th" ? "6 LIVE" : lang === "ja" ? "6 LIVE" : "6 LIVE", glow: "#ef4444" },
              { icon: "⚡", label: lang === "th" ? "อัปเดต 1ชม." : lang === "ja" ? "1時間更新" : "1h refresh", glow: "#fbbf24" },
              { icon: "📸", label: lang === "th" ? "เซฟรูปได้" : lang === "ja" ? "画像保存" : "Image save", glow: "#06b6d4" },
            ].map((s, i) => (
              <div key={i} style={{
                background: "rgba(255,255,255,0.12)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.18)",
                padding: "5px 11px", borderRadius: 999,
                fontSize: 11, fontWeight: 700, color: "white",
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
        <div key={cat.id} data-cat={cat.id} className="go-category">
          <div className="go-category-header">
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
                padding: "2px 10px", borderRadius: 999,
                fontSize: 10, fontWeight: 900,
                backdropFilter: "blur(6px)",
              }}>
                {cat.tools.length}
              </span>
            </div>
          </div>
          <div className="go-hub-grid">
            {cat.tools.map((t, i) => (
              <button key={t.id}
                className="go-hub-card"
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
                        padding: "2px 7px",
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
      {active === "raidguide" && (
        <RaidGuide
          lang={lang}
          allList={allList}
          onClose={() => setActive(null)}
          onOpenPokemon={(boss) => {
            const matched = matchPokemon(boss);
            if (matched && onOpen) { setActive(null); onOpen(matched); }
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