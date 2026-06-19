// ─── GamesHub — Arcade-themed mini-games hub ──────────

import { useState, useEffect } from "react";
import {
  Gamepad2, HelpCircle, Volume2, Egg, Trophy, Flame, X, Sparkles,
  Globe, Users, Target, Music, Bird, Play,
} from "lucide-react";
import WhosThatGame    from "./WhosThatGame.jsx";
import MultiplayerQuiz from "./MultiplayerQuiz.jsx";
import GuessTheCryGame from "./GuessTheCryGame.jsx";
import PetCareGame     from "./PetCareGame.jsx";
import { useModalLifecycle } from "../perfUtils.js";
import { trackGame } from "./petQuests.js";

const GAMES = [
  {
    id: "whosthat",
    Icon: HelpCircle, TagIcon: Target,
    color: "#900603",
    accent: "#b5302d",
    bestKey: "pkdx_whosthat_best",
    streakKey: "pkdx_streak",
    titleEn: "Who's That Pokémon?",
    titleTh: "นี่ Pokémon อะไร?",
    titleJa: "だれだ?",
    tagEn: "Silhouette Guessing",
    tagTh: "เกมเดาเงา",
    tagJa: "シルエットクイズ",
    modes: { en: ["Single Player", "Multiplayer"],
             th: ["เล่นคนเดียว", "เล่นกับเพื่อน"],
             ja: ["シングル", "マルチプレイヤー"] },
  },
  {
    id: "guessthecry",
    Icon: Volume2, TagIcon: Music,
    color: "#ab8a52",
    accent: "#b89a5a",
    bestKey: "pkdx_guess_cry_best",
    streakKey: "pkdx_guess_cry_streak",
    titleEn: "Guess the Cry!",
    titleTh: "ทายเสียงโปเกมอน",
    titleJa: "鳴き声クイズ",
    tagEn: "Sound Guessing",
    tagTh: "เกมทายเสียงร้อง",
    tagJa: "鳴き声当てゲーム",
    modes: { en: ["Single Player", "Multiplayer"],
             th: ["เล่นคนเดียว", "เล่นกับเพื่อน"],
             ja: ["シングル", "マルチプレイヤー"] },
  },
  {
    id: "petcare",
    Icon: Egg, TagIcon: Bird,
    color: "#b5302d",
    accent: "#cf5a52",
    titleEn: "Pokémon Buddy",
    titleTh: "เลี้ยงโปเกมอน",
    titleJa: "ポケモン育成",
    tagEn: "Raise & Evolve",
    tagTh: "เลี้ยงดู & วิวัฒนาการ",
    tagJa: "育てて進化",
    modes: { en: ["Care · Level · Evolve"],
             th: ["ดูแล · เลเวล · วิวัฒน์"],
             ja: ["世話 · レベル · 進化"] },
  },
];

export default function GamesHub({ allList, thaiArr, jpArr, lang, cachedFetch, genIdx, autoOpenPet, onAutoOpened }) {
  // null | "picker" | "single" | "multi" | "cry" | "pet"
  const [gameState, setGameState] = useState(null);
  const [pickerGame, setPickerGame] = useState("whosthat"); // which game the mode picker is for
  const [scores, setScores] = useState({});

  // Open the buddy game directly when launched from the roaming companion
  useEffect(() => {
    if (autoOpenPet) {
      setGameState("pet");
      onAutoOpened?.();
    }
  }, [autoOpenPet, onAutoOpened]);

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

        /* ─── Hero — minimal charcoal ─── */
        .gh-hero {
          background: #1f1d20;
          border-radius: 18px;
          padding: 26px 28px;
          margin-bottom: 26px;
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.06);
          box-shadow: var(--shadow-md);
          color: #fff;
        }
        .gh-hero::before { display: none; }
        .gh-hero-title {
          font-family: var(--font-body);
          font-size: 26px;
          font-weight: 900;
          margin: 0 0 6px 0;
          letter-spacing: -0.02em;
          color: #fff;
          background: none;
          -webkit-text-fill-color: #fff;
          text-shadow: none;
          position: relative; z-index: 1;
        }
        .gh-hero-sub {
          font-size: 13px;
          color: rgba(255,255,255,0.7);
          font-weight: 600;
          margin: 0;
          position: relative; z-index: 1;
        }

        /* ─── Game cards — minimal light ─── */
        .gh-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 14px;
          max-width: 720px;
        }
        .gh-card {
          --gc: var(--gc, #900603);
          background: var(--bg-card);
          border-radius: 16px;
          padding: 16px;
          border: 1px solid var(--border);
          position: relative;
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.25s var(--ease-out), box-shadow 0.25s, border-color 0.2s;
          box-shadow: var(--shadow-sm);
          color: var(--text-primary);
          text-align: left;
          font-family: inherit;
          width: 100%;
          animation: gh-card-in 0.4s ease backwards;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .gh-card::before { display: none; }
        .gh-card:hover {
          transform: translateY(-4px);
          border-color: var(--gc);
          box-shadow: var(--shadow-md);
        }

        .gh-card-head { display: flex; align-items: center; gap: 13px; }
        .gh-card-icon {
          width: 52px; height: 52px;
          border-radius: 14px;
          background: color-mix(in srgb, var(--gc) 14%, transparent);
          color: var(--gc);
          display: flex; align-items: center; justify-content: center;
          box-shadow: none;
          flex-shrink: 0;
        }
        .gh-card-tag {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 10px; font-weight: 800;
          color: var(--gc);
          background: color-mix(in srgb, var(--gc) 12%, transparent);
          padding: 3px 9px; border-radius: 999px;
          border: 1px solid color-mix(in srgb, var(--gc) 28%, transparent);
          letter-spacing: 0.3px;
          margin-bottom: 3px;
        }
        .gh-card-title {
          font-family: var(--font-body);
          font-size: 18px; font-weight: 800;
          color: var(--text-primary);
          letter-spacing: -0.01em;
          line-height: 1.15;
          margin-top: 2px;
        }
        .gh-mode-badges {
          display: flex; gap: 6px; flex-wrap: wrap;
          padding: 9px 11px;
          background: var(--bg-muted);
          border-radius: 10px;
          border: 1px solid var(--border);
        }
        .gh-mode-badge {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 11px; font-weight: 700;
          color: var(--text-secondary);
          padding: 4px 10px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 999px;
        }
        .gh-scores { display: flex; gap: 6px; flex-wrap: wrap; }
        .gh-score-chip {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 10px; font-weight: 800;
          background: rgba(171,138,82,0.14);
          border: 1px solid rgba(171,138,82,0.32);
          color: #9a7b2e;
          letter-spacing: 0.3px;
        }
        .gh-play {
          background: var(--gc);
          color: white;
          border: none;
          padding: 12px 18px;
          border-radius: 12px;
          font-size: 13.5px;
          font-weight: 800;
          letter-spacing: 0.8px;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          box-shadow: var(--shadow-sm);
          transition: transform 0.2s, filter 0.2s;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          margin-top: auto;
        }
        .gh-play:hover { filter: brightness(1.08); }
        .gh-play:active { transform: scale(0.97); }
        .gh-play::after { display: none; }

        /* Footer */
        .gh-footer {
          margin-top: 24px;
          padding: 14px 20px;
          background: transparent;
          border: 1px dashed var(--border-mid);
          border-radius: 14px;
          text-align: center;
        }
        .gh-footer-text {
          font-size: 12px;
          color: var(--text-muted);
          font-weight: 600;
          letter-spacing: 0.4px;
          margin: 0;
        }

        /* ─── Mode Picker ─── */
        .gh-mode-overlay {
          position: fixed; inset: 0; z-index: 9500;
          background: rgba(20, 19, 22, 0.62); backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
          animation: gh-mode-backdrop 0.3s ease forwards;
        }
        .gh-mode-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 26px 24px;
          max-width: 720px; width: 100%;
          position: relative;
          box-shadow: var(--shadow-lg);
          color: var(--text-primary);
          animation: gh-mode-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .gh-mode-title {
          font-family: var(--font-body);
          font-size: 22px; font-weight: 800;
          color: var(--text-primary);
          background: none; -webkit-text-fill-color: var(--text-primary);
          margin: 0 0 4px 0;
          letter-spacing: -0.02em;
        }
        .gh-mode-sub {
          font-size: 13px; color: var(--text-muted);
          margin: 0 0 22px 0; font-weight: 600;
        }
        .gh-mode-options {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 14px;
        }
        .gh-mode-option {
          --mc: var(--mc, #900603);
          background: var(--bg-muted);
          border-radius: 16px;
          padding: 20px;
          border: 1px solid var(--border);
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: transform 0.25s var(--ease-out), box-shadow 0.25s, border-color 0.2s;
          color: var(--text-primary); text-align: left;
          font-family: inherit;
          display: flex; flex-direction: column; gap: 12px;
          box-shadow: var(--shadow-sm);
        }
        .gh-mode-option:hover {
          transform: translateY(-4px);
          border-color: var(--mc);
          box-shadow: var(--shadow-md);
        }
        .gh-mode-option-icon {
          width: 54px; height: 54px;
          border-radius: 15px;
          background: color-mix(in srgb, var(--mc) 14%, transparent);
          color: var(--mc);
          display: flex; align-items: center; justify-content: center;
          box-shadow: none;
          margin-bottom: 2px;
        }
        .gh-mode-option-title {
          font-family: var(--font-body);
          font-size: 18px; font-weight: 800; letter-spacing: -0.01em;
          color: var(--text-primary);
        }
        .gh-mode-option-features {
          display: flex; flex-direction: column; gap: 5px;
          padding: 10px 12px;
          background: var(--bg-card);
          border-radius: 10px;
          border: 1px solid var(--border);
          flex: 1;
        }
        .gh-mode-option-feature {
          font-size: 11px; font-weight: 600;
          color: var(--text-secondary);
          display: flex; align-items: center; gap: 6px;
        }
        .gh-mode-option-feature::before {
          content: "✓"; color: var(--mc); font-weight: 900;
        }
        .gh-mode-cta {
          background: var(--mc);
          color: white;
          padding: 11px 14px;
          border-radius: 12px;
          font-size: 13px; font-weight: 800; letter-spacing: 0.4px;
          text-align: center;
          box-shadow: var(--shadow-sm);
          position: relative; overflow: hidden;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: filter 0.2s;
        }
        .gh-mode-cta:hover { filter: brightness(1.08); }
        .gh-mode-cta::after { display: none; }
        .gh-mode-close {
          position: absolute; top: 14px; right: 14px;
          width: 32px; height: 32px;
          border-radius: 50%;
          background: var(--bg-muted);
          border: 1px solid var(--border);
          color: var(--text-secondary);
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: transform 0.2s, color 0.2s, border-color 0.2s;
          z-index: 1;
        }
        .gh-mode-close:hover { transform: scale(1.08); color: #d23a4a; border-color: rgba(210,58,74,0.4); }
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
            animation: `gh-sparkle 2.4s ease-in-out infinite ${s.delay}`,
            color: "#d8be86", display: "inline-flex",
            pointerEvents: "none", zIndex: 0,
          }}><Sparkles size={s.size} strokeWidth={2.2} /></span>
        ))}

        <h1 className="gh-hero-title" style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          <Gamepad2 size={24} strokeWidth={2.2} /> {t("Game Zone", "Game Zone", "ゲームゾーン")}
        </h1>
        <p className="gh-hero-sub">
          {t("ทดสอบความรู้ Pokémon ของคุณ · ทำคะแนน · เก็บ streak",
             "Test your Pokémon knowledge · Score high · Build streaks",
             "Pokémon知識を試そう · ハイスコア · 連勝記録")}
        </p>

        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap", position: "relative", zIndex: 1 }}>
          {[
            { Icon: Trophy,  val: scores.whosthat_best || 0,   label: t("คะแนนสูงสุด", "Best score", "ハイスコア"), color: "#b89a5a" },
            { Icon: Flame,   val: scores.whosthat_streak || 0, label: t("Streak ปัจจุบัน", "Current streak", "現在の連勝"), color: "#9a5a3a" },
            { Icon: Gamepad2, val: GAMES.length,                label: t("เกมทั้งหมด",     "Games",          "ゲーム"), color: "#b5302d" },
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
              <span style={{ display: "inline-flex", color: s.color }}><s.Icon size={14} strokeWidth={2.4} /></span>
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
        {GAMES.map((g, i) => {
          const bestId = g.id + "_best";
          const streakId = g.id + "_streak";
          return (
            <button key={g.id} className="gh-card"
              onClick={() => {
                if (g.id === "petcare") setGameState("pet");
                else { setPickerGame(g.id); setGameState("picker"); }
              }}
              style={{ "--gc": g.color, animationDelay: `${i * 0.08}s` }}>

              <div className="gh-card-head">
                <div className="gh-card-icon"><g.Icon size={26} strokeWidth={2.2} /></div>
                <div style={{ flex: 1 }}>
                  <span className="gh-card-tag"><g.TagIcon size={11} strokeWidth={2.4} /> {tag(g)}</span>
                  <div className="gh-card-title">{title(g)}</div>
                </div>
              </div>

              <div className="gh-mode-badges">
                {modes(g).map((m, mi) => (
                  <span key={mi} className="gh-mode-badge">
                    {mi === 0 ? <Gamepad2 size={11} strokeWidth={2.4} /> : <Globe size={11} strokeWidth={2.4} />} {m}
                  </span>
                ))}
              </div>

              {(scores[bestId] > 0 || scores[streakId] > 0) && (
                <div className="gh-scores">
                  {scores[bestId] > 0 && (
                    <span className="gh-score-chip">
                      <Trophy size={11} strokeWidth={2.4} /> {scores[bestId]} {t("คะแนน", "pts", "点")}
                    </span>
                  )}
                  {scores[streakId] > 0 && (
                    <span className="gh-score-chip" style={{
                      background: "rgba(144, 6, 3, 0.15)",
                      borderColor: "rgba(144, 6, 3, 0.35)",
                      color: "#c9a06a",
                    }}>
                      <Flame size={11} strokeWidth={2.4} /> {scores[streakId]} streak
                    </span>
                  )}
                </div>
              )}

              <div className="gh-play">
                <Play size={13} strokeWidth={2.6} fill="currentColor" /> {t("เล่นเลย", "PLAY NOW", "プレイ")}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Mode Picker Overlay (Single / Multiplayer) ── */}
      {gameState === "picker" && (
        <ModePicker lang={lang} game={pickerGame}
          onClose={() => setGameState(null)}
          onPick={(mode) => { trackGame(); setGameState(mode); }} />
      )}

      {/* ── Game Overlays ── */}
      {gameState === "single" && pickerGame === "whosthat" && (
        <WhosThatGame allList={allList} thaiArr={thaiArr} jpArr={jpArr}
          lang={lang} cachedFetch={cachedFetch} genIdx={genIdx}
          onClose={() => setGameState(null)} />
      )}
      {gameState === "single" && pickerGame === "guessthecry" && (
        <GuessTheCryGame allList={allList} thaiArr={thaiArr} jpArr={jpArr}
          lang={lang} genIdx={genIdx}
          onClose={() => setGameState(null)} />
      )}
      {gameState === "multi" && (
        <MultiplayerQuiz allList={allList} thaiArr={thaiArr} jpArr={jpArr}
          lang={lang} mode={pickerGame === "guessthecry" ? "cry" : "silhouette"}
          onClose={() => setGameState(null)} />
      )}
      {gameState === "pet" && (
        <PetCareGame thaiArr={thaiArr} jpArr={jpArr}
          lang={lang}
          onClose={() => setGameState(null)} />
      )}
    </main>
  );
}

// ─── Mode Picker (Single / Multiplayer) ───
function ModePicker({ lang, onClose, onPick, game = "whosthat" }) {
  useModalLifecycle(onClose);
  const t = (th, en, ja) => lang === "th" ? th : lang === "ja" ? (ja ?? en) : en;

  const isCry = game === "guessthecry";
  const gameName = isCry
    ? t("ทายเสียงโปเกมอน", "Guess the Cry!", "鳴き声クイズ")
    : t("นี่ Pokémon อะไร?", "Who's That Pokémon?", "だれだ?");

  const OPTIONS = [
    {
      mode: "single",
      Icon: Gamepad2,
      color: "#900603",
      title: t("เล่นคนเดียว", "Single Player", "シングルプレイヤー"),
      features: isCry ? [
        t("ฟังเสียงร้อง 10 ข้อ", "10 cry rounds",        "鳴き声10問"),
        t("จับเวลา + Streak",    "Timed + streaks",      "タイム + 連勝"),
        t("ฟังซ้ำได้ 3 ครั้ง",   "Replay up to 3×",      "最大3回再生"),
        t("ทำคะแนนสะสมส่วนตัว",  "Personal high scores", "個人ハイスコア"),
      ] : [
        t("4 ระดับความยาก",     "4 difficulty levels",  "4段階の難易度"),
        t("ระบบ Combo",         "Combo system",         "コンボシステム"),
        t("ทำคะแนนสะสมส่วนตัว", "Personal high scores", "個人ハイスコア"),
        t("ฟังเสียง Pokémon",   "Sound clues",          "鳴き声ヒント"),
      ],
      cta: t("เล่นคนเดียว", "PLAY SOLO", "ソロプレイ"),
    },
    {
      mode: "multi",
      Icon: Globe,
      color: "#b5302d",
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
        <button className="gh-mode-close" onClick={onClose}><X size={16} strokeWidth={2.4} /></button>

        <h2 className="gh-mode-title" style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
          <Gamepad2 size={20} strokeWidth={2.2} /> {t("เลือกโหมดการเล่น", "Choose Game Mode", "プレイモード選択")}
        </h2>
        <p className="gh-mode-sub">
          {gameName} · {t("เลือกว่าอยากเล่นคนเดียวหรือกับเพื่อน",
             "pick solo or with friends",
             "ソロかフレンドと")}
        </p>

        <div className="gh-mode-options">
          {OPTIONS.map((opt) => (
            <button key={opt.mode}
              className="gh-mode-option"
              onClick={() => onPick(opt.mode)}
              style={{ "--mc": opt.color }}>
              <div className="gh-mode-option-icon"><opt.Icon size={28} strokeWidth={2.2} /></div>
              <div className="gh-mode-option-title">{opt.title}</div>
              <div className="gh-mode-option-features">
                {opt.features.map((f, i) => (
                  <div key={i} className="gh-mode-option-feature">{f}</div>
                ))}
              </div>
              <div className="gh-mode-cta"><Play size={13} strokeWidth={2.6} fill="currentColor" /> {opt.cta}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}