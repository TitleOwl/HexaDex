// ─── GamesHub — Arcade-themed mini-games hub ──────────
// Now has ONE game card with mode picker (Single / Multiplayer)

import { useState, useEffect } from "react";
import WhosThatGame    from "./WhosThatGame.jsx";
import MultiplayerQuiz from "./MultiplayerQuiz.jsx";
import { useModalLifecycle } from "../perfUtils.js";

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
    modes: { en: ["Single Player", "Multiplayer"],
             th: ["เล่นคนเดียว", "เล่นกับเพื่อน"],
             ja: ["シングル", "マルチプレイヤー"] },
  },
];

export default function GamesHub({ allList, thaiArr, jpArr, lang, cachedFetch, genIdx }) {
  // null | "picker" | "single" | "multi"
  const [gameState, setGameState] = useState(null);
  const [scores, setScores] = useState({});

  // Read high scores from localStorage (refresh after game closes)
  useEffect(() => {
    const next = {};
    GAMES.forEach(g => {
      try {
        if (g.bestKey)   next[g.id + "_best"]   = +localStorage.getItem(g.bestKey) || 0;
        if (g.streakKey) next[g.id + "_streak"] = +localStorage.getItem(g.streakKey) || 0;
      } catch {}
    });
    setScores(next);
  }, [gameState]);

  const title = (g) => lang === "th" ? g.titleTh : lang === "ja" ? g.titleJa : g.titleEn;
  const tag   = (g) => lang === "th" ? g.tagTh   : lang === "ja" ? g.tagJa   : g.tagEn;
  const modes = (g) => lang === "th" ? g.modes.th : lang === "ja" ? g.modes.ja : g.modes.en;
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
        @keyframes gh-mode-pop {
          0%   { opacity: 0; transform: scale(0.85) rotateX(-15deg); }
          100% { opacity: 1; transform: scale(1)    rotateX(0); }
        }
        @keyframes gh-mode-backdrop {
          from { opacity: 0; backdrop-filter: blur(0); }
          to   { opacity: 1; backdrop-filter: blur(12px); }
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
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 18px;
          max-width: 700px;
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

        .gh-card-head { display: flex; align-items: flex-start; gap: 14px; }
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
          font-size: 22px; font-weight: 900;
          color: white;
          letter-spacing: -0.02em;
          line-height: 1.15;
          margin-top: 4px;
        }
        .gh-mode-badges {
          display: flex; gap: 6px; flex-wrap: wrap;
          padding: 10px 12px;
          background: rgba(255,255,255,0.04);
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.06);
        }
        .gh-mode-badge {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 11px; font-weight: 700;
          color: rgba(255,255,255,0.95);
          padding: 4px 10px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 999px;
        }
        .gh-scores { display: flex; gap: 6px; flex-wrap: wrap; }
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
        .gh-play {
          background: linear-gradient(135deg, var(--gc), color-mix(in srgb, var(--gc) 70%, black));
          color: white;
          border: none;
          padding: 13px 18px;
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

        /* ─── Mode Picker ─── */
        .gh-mode-overlay {
          position: fixed; inset: 0; z-index: 9500;
          background: radial-gradient(ellipse at top, rgba(30, 27, 75, 0.92), rgba(2, 6, 23, 0.96));
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
          animation: gh-mode-backdrop 0.3s ease forwards;
        }
        .gh-mode-card {
          background: linear-gradient(160deg, #1e1b4b 0%, #312e81 100%);
          border-radius: 24px;
          padding: 32px 28px;
          max-width: 760px; width: 100%;
          position: relative;
          box-shadow: 0 30px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1) inset;
          color: white;
          animation: gh-mode-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .gh-mode-title {
          font-size: 26px; font-weight: 900;
          background: linear-gradient(135deg, #fde047, #ec4899);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0 0 4px 0;
          letter-spacing: -0.02em;
        }
        .gh-mode-sub {
          font-size: 13px; color: rgba(196, 181, 253, 0.85);
          margin: 0 0 22px 0; font-weight: 600;
        }
        .gh-mode-options {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 16px;
        }
        .gh-mode-option {
          --mc: var(--mc, #3b82f6);
          background: linear-gradient(165deg, rgba(15, 23, 42, 0.7), rgba(30, 41, 59, 0.5));
          border-radius: 20px;
          padding: 24px 20px;
          border: 2px solid var(--mc);
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s;
          color: white; text-align: left;
          font-family: inherit;
          display: flex; flex-direction: column; gap: 12px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.3), 0 0 24px color-mix(in srgb, var(--mc) 30%, transparent);
        }
        .gh-mode-option:hover {
          transform: translateY(-6px) scale(1.02);
          box-shadow: 0 16px 40px rgba(0,0,0,0.4), 0 0 40px var(--mc);
        }
        .gh-mode-option:hover .gh-mode-icon { animation: gh-float-icon 1.8s ease-in-out infinite; }
        .gh-mode-option-icon {
          width: 72px; height: 72px;
          border-radius: 20px;
          background: linear-gradient(135deg, var(--mc), color-mix(in srgb, var(--mc) 60%, black));
          display: flex; align-items: center; justify-content: center;
          font-size: 40px;
          box-shadow: 0 10px 28px var(--mc), 0 0 0 1px rgba(255,255,255,0.2) inset;
          margin-bottom: 4px;
        }
        .gh-mode-option-title {
          font-size: 20px; font-weight: 900; letter-spacing: -0.01em;
          color: white;
        }
        .gh-mode-option-features {
          display: flex; flex-direction: column; gap: 5px;
          padding: 10px 12px;
          background: rgba(255,255,255,0.04);
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.06);
          flex: 1;
        }
        .gh-mode-option-feature {
          font-size: 11px; font-weight: 600;
          color: rgba(255,255,255,0.88);
          display: flex; align-items: center; gap: 6px;
        }
        .gh-mode-option-feature::before {
          content: "✓"; color: var(--mc); font-weight: 900;
        }
        .gh-mode-cta {
          background: linear-gradient(135deg, var(--mc), color-mix(in srgb, var(--mc) 70%, black));
          color: white;
          padding: 11px 14px;
          border-radius: 12px;
          font-size: 13px; font-weight: 900; letter-spacing: 1px;
          text-align: center;
          box-shadow: 0 6px 16px color-mix(in srgb, var(--mc) 60%, transparent);
          position: relative; overflow: hidden;
        }
        .gh-mode-cta::after {
          content: "";
          position: absolute; top: 0; left: -100%;
          width: 60%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          transform: skewX(-25deg);
          animation: gh-arcade-shine 3s ease-in-out infinite;
        }
        .gh-mode-close {
          position: absolute; top: 14px; right: 14px;
          width: 36px; height: 36px;
          border-radius: 50%;
          background: rgba(239, 68, 68, 0.9);
          border: none;
          color: white;
          font-size: 16px; font-weight: 900;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: transform 0.2s, background 0.2s;
          z-index: 1;
        }
        .gh-mode-close:hover { transform: scale(1.1); background: #dc2626; }
      `}</style>

      {/* ── Arcade Hero ── */}
      <div className="gh-hero">
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

        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap", position: "relative", zIndex: 1 }}>
          {[
            { icon: "🏆", val: scores.whosthat_best || 0,   label: t("คะแนนสูงสุด", "Best score", "ハイスコア"), color: "#fbbf24" },
            { icon: "🔥", val: scores.whosthat_streak || 0, label: t("Streak ปัจจุบัน", "Current streak", "現在の連勝"), color: "#f97316" },
            { icon: "🎮", val: 2,                            label: t("โหมดเล่น",       "Game modes",     "プレイモード"), color: "#a855f7" },
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

      {/* ── Game Cards (just one now) ── */}
      <div className="gh-grid">
        {GAMES.map((g, i) => (
          <button key={g.id} className="gh-card"
            onClick={() => setGameState("picker")}
            style={{ "--gc": g.color, animationDelay: `${i * 0.08}s` }}>

            <div className="gh-card-head">
              <div className="gh-card-icon">{g.icon}</div>
              <div style={{ flex: 1 }}>
                <span className="gh-card-tag">{tag(g)}</span>
                <div className="gh-card-title">{title(g)}</div>
              </div>
            </div>

            <div className="gh-mode-badges">
              <span className="gh-mode-badge">🎮 {modes(g)[0]}</span>
              <span className="gh-mode-badge">🌐 {modes(g)[1]}</span>
            </div>

            {(scores.whosthat_best > 0 || scores.whosthat_streak > 0) && (
              <div className="gh-scores">
                {scores.whosthat_best > 0 && (
                  <span className="gh-score-chip">
                    🏆 {scores.whosthat_best} {t("คะแนน", "pts", "点")}
                  </span>
                )}
                {scores.whosthat_streak > 0 && (
                  <span className="gh-score-chip" style={{
                    background: "rgba(249, 115, 22, 0.15)",
                    borderColor: "rgba(249, 115, 22, 0.35)",
                    color: "#fdba74",
                  }}>
                    🔥 {scores.whosthat_streak} streak
                  </span>
                )}
              </div>
            )}

            <div className="gh-play">
              ▶ {t("เล่นเลย", "PLAY NOW", "プレイ")}
            </div>
          </button>
        ))}
      </div>

      <div className="gh-footer">
        <p className="gh-footer-text">
          🚧 {t("เกมใหม่กำลังมา... อยู่ระหว่างพัฒนา",
                "MORE GAMES COMING SOON",
                "新しいゲーム開発中")}
        </p>
      </div>

      {/* ── Mode Picker Overlay ── */}
      {gameState === "picker" && (
        <ModePicker lang={lang}
          onClose={() => setGameState(null)}
          onPick={(mode) => setGameState(mode)} />
      )}

      {/* ── Game Overlays ── */}
      {gameState === "single" && (
        <WhosThatGame allList={allList} thaiArr={thaiArr} jpArr={jpArr}
          lang={lang} cachedFetch={cachedFetch} genIdx={genIdx}
          onClose={() => setGameState(null)} />
      )}
      {gameState === "multi" && (
        <MultiplayerQuiz allList={allList} thaiArr={thaiArr} jpArr={jpArr}
          lang={lang}
          onClose={() => setGameState(null)} />
      )}
    </main>
  );
}

// ─── Mode Picker (Single / Multiplayer) ───
function ModePicker({ lang, onClose, onPick }) {
  useModalLifecycle(onClose);
  const t = (th, en, ja) => lang === "th" ? th : lang === "ja" ? (ja ?? en) : en;

  const OPTIONS = [
    {
      mode: "single",
      icon: "🎮",
      color: "#3b82f6",
      title: t("เล่นคนเดียว", "Single Player", "シングルプレイヤー"),
      features: [
        t("4 ระดับความยาก",     "4 difficulty levels",  "4段階の難易度"),
        t("ระบบ Combo",         "Combo system",         "コンボシステム"),
        t("ทำคะแนนสะสมส่วนตัว", "Personal high scores", "個人ハイスコア"),
        t("ฟังเสียง Pokémon",   "Sound clues",          "鳴き声ヒント"),
      ],
      cta: t("เล่นคนเดียว", "PLAY SOLO", "ソロプレイ"),
    },
    {
      mode: "multi",
      icon: "🌐",
      color: "#a855f7",
      title: t("เล่นกับเพื่อน", "Multiplayer", "マルチプレイヤー"),
      features: [
        t("สร้าง / เข้าร่วมห้อง", "Create / Join rooms", "ルーム作成/参加"),
        t("คะแนนแบบสด",         "Live scoring",        "ライブスコア"),
        t("เล่นได้ถึง 8 คน",    "Up to 8 players",     "最大8人"),
        t("แชร์รหัสห้องกับเพื่อน","Share room code",    "ルームコード共有"),
      ],
      cta: t("เล่นกับเพื่อน", "VS FRIENDS", "フレンドと対戦"),
    },
  ];

  return (
    <div className="gh-mode-overlay" onClick={onClose}>
      <div className="gh-mode-card" onClick={(e) => e.stopPropagation()}>
        <button className="gh-mode-close" onClick={onClose}>✕</button>

        <h2 className="gh-mode-title">
          🎮 {t("เลือกโหมดการเล่น", "Choose Game Mode", "プレイモード選択")}
        </h2>
        <p className="gh-mode-sub">
          {t("Who's That Pokémon? · เลือกว่าอยากเล่นคนเดียวหรือกับเพื่อน",
             "Who's That Pokémon? · pick solo or with friends",
             "Who's That Pokémon? · ソロかフレンドと")}
        </p>

        <div className="gh-mode-options">
          {OPTIONS.map((opt) => (
            <button key={opt.mode}
              className="gh-mode-option"
              onClick={() => onPick(opt.mode)}
              style={{ "--mc": opt.color }}>
              <div className="gh-mode-option-icon">{opt.icon}</div>
              <div className="gh-mode-option-title">{opt.title}</div>
              <div className="gh-mode-option-features">
                {opt.features.map((f, i) => (
                  <div key={i} className="gh-mode-option-feature">{f}</div>
                ))}
              </div>
              <div className="gh-mode-cta">▶ {opt.cta}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}