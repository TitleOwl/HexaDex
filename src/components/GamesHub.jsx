// ─── GamesHub — Arcade-themed mini-games hub ──────────
// Reads high scores from localStorage to show as badges on cards
// Inline-scoped CSS so it doesn't clash with App.css

import { useState, useEffect } from "react";
import WhosThatGame    from "./WhosThatGame.jsx";
import MultiplayerQuiz from "./MultiplayerQuiz.jsx";

const GAMES = [
  {
    id: "whosthat",
    icon: "🎮",
    color: "#3b82f6",
    accent: "#60a5fa",
    bestKey: "pkdx_whosthat_best",
    streakKey: "pkdx_streak",
    titleEn: "Who's That Pokémon?",
    titleTh: "นี่ Pokémon อะไร?",
    titleJa: "だれだ?",
    tagEn: "🎯 Silhouette Guessing",
    tagTh: "🎯 เกมเดาเงา",
    tagJa: "🎯 シルエットクイズ",
    features: { en: ["4 difficulty levels", "Combo system", "Sound clues"],
                th: ["4 ระดับความยาก", "ระบบ Combo", "ฟังเสียง"],
                ja: ["4段階の難易度", "コンボシステム", "鳴き声"] },
  },
  {
    id: "multiplayer",
    icon: "🌐",
    color: "#a855f7",
    accent: "#c084fc",
    bestKey: null,
    streakKey: null,
    titleEn: "Multiplayer Quiz",
    titleTh: "เล่นกับเพื่อน",
    titleJa: "フレンド対戦",
    tagEn: "🎉 Room-based PvP",
    tagTh: "🎉 เล่นห้องส่วนตัว",
    tagJa: "🎉 ルーム対戦",
    features: { en: ["Create / Join rooms", "Live scoring", "Up to 8 players"],
                th: ["สร้าง / เข้าร่วมห้อง", "คะแนนสด", "เล่นได้ถึง 8 คน"],
                ja: ["ルーム作成/参加", "ライブスコア", "最大8人"] },
  },
];

export default function GamesHub({ allList, thaiArr, jpArr, lang, cachedFetch, genIdx, onClose }) {
  const [active, setActive] = useState(null);
  const [scores, setScores] = useState({});

  // Read high scores from localStorage on mount
  useEffect(() => {
    const next = {};
    GAMES.forEach(g => {
      try {
        if (g.bestKey)   next[g.id + "_best"]   = +localStorage.getItem(g.bestKey) || 0;
        if (g.streakKey) next[g.id + "_streak"] = +localStorage.getItem(g.streakKey) || 0;
      } catch {}
    });
    setScores(next);
  }, [active]); // re-read after game closes

  const title = (g) => lang === "th" ? g.titleTh : lang === "ja" ? g.titleJa : g.titleEn;
  const tag   = (g) => lang === "th" ? g.tagTh   : lang === "ja" ? g.tagJa   : g.tagEn;
  const features = (g) => lang === "th" ? g.features.th : lang === "ja" ? g.features.ja : g.features.en;
  const t = (th, en, ja) => lang === "th" ? th : lang === "ja" ? (ja ?? en) : en;

  return (
    <main className="games-hub-wrap" style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 20px 40px" }}>
      <style>{`
        @keyframes gh-float-icon {
          0%, 100% { transform: translateY(0) rotate(-3deg); }
          50%      { transform: translateY(-8px) rotate(3deg); }
        }
        @keyframes gh-card-in {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes gh-neon-pulse {
          0%, 100% { box-shadow: 0 0 24px var(--gc), 0 0 0 1px var(--gc) inset; }
          50%      { box-shadow: 0 0 48px var(--gc), 0 0 0 2px var(--gc) inset; }
        }
        @keyframes gh-sparkle {
          0%, 100% { opacity: 0; transform: scale(0.5); }
          50%      { opacity: 1; transform: scale(1); }
        }
        @keyframes gh-grid-shift {
          from { background-position: 0 0; }
          to   { background-position: 40px 40px; }
        }
        @keyframes gh-arcade-shine {
          0%   { left: -100%; }
          50%  { left: 100%; }
          100% { left: 100%; }
        }

        /* ─── Arcade Hero ─── */
        .gh-hero {
          background: linear-gradient(135deg, #1e1b4b 0%, #312e81 35%, #6d28d9 70%, #581c87 100%);
          border-radius: 24px;
          padding: 32px 28px;
          margin-bottom: 26px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 24px 60px rgba(91, 33, 182, 0.4), 0 0 0 1px rgba(255,255,255,0.1) inset;
          color: white;
        }
        .gh-hero::before {
          content: "";
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(168, 85, 247, 0.15) 1px, transparent 1px),
            linear-gradient(90deg, rgba(168, 85, 247, 0.15) 1px, transparent 1px);
          background-size: 40px 40px;
          animation: gh-grid-shift 20s linear infinite;
          pointer-events: none;
          mask: radial-gradient(ellipse at center, black 30%, transparent 75%);
          -webkit-mask: radial-gradient(ellipse at center, black 30%, transparent 75%);
        }
        .gh-hero-title {
          font-size: 30px;
          font-weight: 900;
          margin: 0 0 4px 0;
          letter-spacing: -0.02em;
          background: linear-gradient(135deg, #fde047, #f97316, #ec4899);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
          text-shadow: 0 0 60px rgba(249, 115, 22, 0.5);
          position: relative; z-index: 1;
        }
        .gh-hero-sub {
          font-size: 13px;
          color: rgba(196, 181, 253, 0.85);
          font-weight: 600;
          margin: 0;
          position: relative; z-index: 1;
        }

        /* ─── Game cards ─── */
        .gh-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 18px;
        }
        .gh-card {
          --gc: var(--gc, #3b82f6);
          background: linear-gradient(165deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.92) 100%);
          border-radius: 22px;
          padding: 22px;
          border: 2px solid transparent;
          position: relative;
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
                      box-shadow 0.35s, border-color 0.35s;
          box-shadow: 0 12px 30px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.04) inset;
          color: white;
          text-align: left;
          font-family: inherit;
          width: 100%;
          animation: gh-card-in 0.4s ease backwards;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .gh-card::before {
          content: "";
          position: absolute;
          inset: -2px;
          border-radius: 22px;
          padding: 2px;
          background: linear-gradient(135deg, var(--gc), transparent 60%);
          mask: linear-gradient(white, white) content-box, linear-gradient(white, white);
          -webkit-mask: linear-gradient(white, white) content-box, linear-gradient(white, white);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          opacity: 0.6;
          pointer-events: none;
        }
        .gh-card:hover {
          transform: translateY(-8px) scale(1.015);
          box-shadow: 0 28px 60px rgba(0,0,0,0.4), 0 0 30px var(--gc);
        }
        .gh-card:hover::before { opacity: 1; }
        .gh-card:hover .gh-card-icon { animation: gh-float-icon 1.8s ease-in-out infinite; }

        /* Card top row: icon + tag */
        .gh-card-head {
          display: flex; align-items: flex-start; gap: 14px;
        }
        .gh-card-icon {
          width: 64px; height: 64px;
          border-radius: 18px;
          background: linear-gradient(135deg, var(--gc), color-mix(in srgb, var(--gc) 60%, black));
          display: flex; align-items: center; justify-content: center;
          font-size: 34px;
          box-shadow: 0 10px 24px var(--gc), 0 0 0 1px rgba(255,255,255,0.2) inset;
          flex-shrink: 0;
        }
        .gh-card-tag {
          display: inline-block;
          font-size: 10px; font-weight: 800;
          color: var(--gc);
          background: color-mix(in srgb, var(--gc) 18%, transparent);
          padding: 4px 10px; border-radius: 999px;
          border: 1px solid color-mix(in srgb, var(--gc) 35%, transparent);
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }
        .gh-card-title {
          font-size: 20px; font-weight: 900;
          color: white;
          letter-spacing: -0.02em;
          line-height: 1.15;
          margin-top: 4px;
        }

        /* Features list */
        .gh-card-features {
          display: flex; flex-direction: column; gap: 5px;
          padding: 10px 12px;
          background: rgba(255,255,255,0.04);
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.06);
        }
        .gh-feature {
          font-size: 11px; font-weight: 600;
          color: rgba(255,255,255,0.85);
          display: flex; align-items: center; gap: 6px;
        }
        .gh-feature::before {
          content: "✓";
          color: var(--gc);
          font-weight: 900;
        }

        /* Score chips */
        .gh-scores {
          display: flex; gap: 6px; flex-wrap: wrap;
        }
        .gh-score-chip {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 10px; font-weight: 800;
          background: rgba(251, 191, 36, 0.15);
          border: 1px solid rgba(251, 191, 36, 0.35);
          color: #fcd34d;
          letter-spacing: 0.3px;
        }

        /* PLAY button */
        .gh-play {
          background: linear-gradient(135deg, var(--gc), color-mix(in srgb, var(--gc) 70%, black));
          color: white;
          border: none;
          padding: 12px 18px;
          border-radius: 14px;
          font-size: 14px;
          font-weight: 900;
          letter-spacing: 1.2px;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          box-shadow: 0 8px 20px var(--gc);
          transition: transform 0.2s;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          margin-top: auto;
        }
        .gh-play:active { transform: scale(0.97); }
        .gh-play::after {
          content: "";
          position: absolute; top: 0; left: -100%;
          width: 60%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          transform: skewX(-25deg);
          animation: gh-arcade-shine 3s ease-in-out infinite;
        }

        /* Footer */
        .gh-footer {
          margin-top: 28px;
          padding: 16px 20px;
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.5), rgba(30, 41, 59, 0.5));
          border: 1.5px dashed rgba(168, 85, 247, 0.3);
          border-radius: 16px;
          text-align: center;
        }
        .gh-footer-text {
          font-size: 12px;
          color: rgba(168, 85, 247, 0.8);
          font-weight: 700;
          letter-spacing: 0.6px;
          margin: 0;
        }
      `}</style>

      {/* ── Arcade Hero ── */}
      <div className="gh-hero">
        {/* Floating sparkles */}
        {[
          { top: 18, left: "20%", delay: "0s",   size: 14 },
          { top: 30, left: "70%", delay: "0.6s", size: 12 },
          { top: 60, left: "85%", delay: "1.2s", size: 10 },
          { top: 75, left: "10%", delay: "0.3s", size: 16 },
          { top: 45, left: "50%", delay: "0.9s", size: 11 },
        ].map((s, i) => (
          <span key={i} style={{
            position: "absolute", top: s.top, left: s.left,
            fontSize: s.size, animation: `gh-sparkle 2.4s ease-in-out infinite ${s.delay}`,
            color: "#fde047", filter: "drop-shadow(0 0 8px #fde047)",
            pointerEvents: "none", zIndex: 0,
          }}>✨</span>
        ))}

        <h1 className="gh-hero-title">
          🕹️ {t("Game Zone", "Game Zone", "ゲームゾーン")}
        </h1>
        <p className="gh-hero-sub">
          {t("ทดสอบความรู้ Pokémon ของคุณ · ทำคะแนน · เก็บ streak",
             "Test your Pokémon knowledge · Score high · Build streaks",
             "Pokémon知識を試そう · ハイスコア · 連勝記録")}
        </p>

        {/* Stats chips row */}
        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap", position: "relative", zIndex: 1 }}>
          {[
            { icon: "🏆", val: scores.whosthat_best || 0,   label: t("คะแนนสูงสุด", "Best score", "ハイスコア"), color: "#fbbf24" },
            { icon: "🔥", val: scores.whosthat_streak || 0, label: t("Streak ปัจจุบัน", "Current streak", "現在の連勝"), color: "#f97316" },
            { icon: "🎮", val: GAMES.length,                label: t("เกมที่มี",       "Games available", "ゲーム数"),  color: "#a855f7" },
          ].map((s, i) => (
            <div key={i} style={{
              background: "rgba(255,255,255,0.08)",
              backdropFilter: "blur(10px)",
              border: `1px solid ${s.color}55`,
              padding: "5px 12px",
              borderRadius: 999,
              display: "inline-flex", alignItems: "center", gap: 6,
              boxShadow: `0 4px 14px ${s.color}22`,
            }}>
              <span style={{ fontSize: 14 }}>{s.icon}</span>
              <span style={{ fontSize: 14, fontWeight: 900, color: s.color, fontVariantNumeric: "tabular-nums" }}>
                {s.val}
              </span>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.75)", fontWeight: 600 }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Game Cards ── */}
      <div className="gh-grid">
        {GAMES.map((g, i) => (
          <button key={g.id} className="gh-card"
            onClick={() => setActive(g.id)}
            style={{ "--gc": g.color, animationDelay: `${i * 0.08}s` }}>

            {/* Top: icon + label */}
            <div className="gh-card-head">
              <div className="gh-card-icon">{g.icon}</div>
              <div style={{ flex: 1 }}>
                <span className="gh-card-tag">{tag(g)}</span>
                <div className="gh-card-title">{title(g)}</div>
              </div>
            </div>

            {/* Features */}
            <div className="gh-card-features">
              {features(g).map((f, j) => (
                <div key={j} className="gh-feature">{f}</div>
              ))}
            </div>

            {/* Score chips (only if applicable) */}
            {(g.bestKey || g.streakKey) && (scores[g.id + "_best"] > 0 || scores[g.id + "_streak"] > 0) && (
              <div className="gh-scores">
                {scores[g.id + "_best"] > 0 && (
                  <span className="gh-score-chip">
                    🏆 {scores[g.id + "_best"]} {t("คะแนน", "pts", "点")}
                  </span>
                )}
                {scores[g.id + "_streak"] > 0 && (
                  <span className="gh-score-chip" style={{
                    background: "rgba(249, 115, 22, 0.15)",
                    borderColor: "rgba(249, 115, 22, 0.35)",
                    color: "#fdba74",
                  }}>
                    🔥 {scores[g.id + "_streak"]} streak
                  </span>
                )}
              </div>
            )}

            {/* PLAY button */}
            <div className="gh-play">
              ▶ {t("เล่นเลย", "PLAY NOW", "プレイ")}
            </div>
          </button>
        ))}
      </div>

      {/* Footer teaser */}
      <div className="gh-footer">
        <p className="gh-footer-text">
          🚧 {t("เกมใหม่กำลังมา... อยู่ระหว่างพัฒนา",
                "MORE GAMES COMING SOON",
                "新しいゲーム開発中")}
        </p>
      </div>

      {/* Game overlays */}
      {active === "whosthat" && (
        <WhosThatGame allList={allList} thaiArr={thaiArr} jpArr={jpArr}
          lang={lang} cachedFetch={cachedFetch} genIdx={genIdx}
          onClose={() => setActive(null)} />
      )}
      {active === "multiplayer" && (
        <MultiplayerQuiz allList={allList} thaiArr={thaiArr} jpArr={jpArr}
          lang={lang}
          onClose={() => setActive(null)} />
      )}
    </main>
  );
}