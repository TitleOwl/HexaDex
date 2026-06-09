import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { getLocalName } from "../utils.js";
import { CRY_URL } from "../data.js";
import { useModalLifecycle } from "../perfUtils.js";

const TOTAL_ROUNDS = 10;
const TIME_PER_ROUND = 15;
const NUM_CHOICES = 4;

const BEST_KEY = "pkdx_guess_cry_best";
const STREAK_KEY = "pkdx_guess_cry_streak";

function getCryUrl(id, name) {
  if (name) {
    return [
      CRY_URL.showdown(name),
      CRY_URL.latest(id),
      CRY_URL.anime(id),
      CRY_URL.legacy(id),
    ];
  }
  return [CRY_URL.latest(id), CRY_URL.anime(id), CRY_URL.legacy(id)];
}

function playAudio(sources, onEnd) {
  if (!sources.length) return null;
  const [src, ...rest] = sources;
  const audio = new Audio(src);
  audio.volume = 0.65;
  audio.onended = onEnd ?? null;
  audio.play().catch(() => {
    if (rest.length) playAudio(rest, onEnd);
  });
  return audio;
}

export default function GuessTheCryGame({ allList, thaiArr, jpArr, lang, genIdx, onClose }) {
  useModalLifecycle(onClose);
  const t = (th, en, ja) => lang === "th" ? th : lang === "ja" ? (ja ?? en) : en;

  const [phase, setPhase] = useState("setup"); // setup | playing | result | gameover
  const [round, setRound] = useState(0);
  const [target, setTarget] = useState(null);
  const [choices, setChoices] = useState([]);
  const [picked, setPicked] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_ROUND);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestScore, setBestScore] = useState(() => {
    try { return parseInt(localStorage.getItem(BEST_KEY) ?? "0"); } catch { return 0; }
  });
  const [playsLeft, setPlaysLeft] = useState(3);
  const [isPlaying, setIsPlaying] = useState(false);
  const [resultMsg, setResultMsg] = useState(null);

  const audioRef = useRef(null);
  const timerRef = useRef(null);

  const pool = useMemo(() => {
    return allList.filter((p) => {
      const id = parseInt(p.url.split("/").filter(Boolean).pop(), 10);
      return id >= 1 && id <= 898;
    });
  }, [allList]);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const playTarget = useCallback((t_arg) => {
    stopAudio();
    if (!t_arg) return;
    setIsPlaying(true);
    const sources = getCryUrl(t_arg.id, t_arg.name);
    audioRef.current = playAudio(sources, () => setIsPlaying(false));
  }, [stopAudio]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const revealAnswer = useCallback((pickedName, remainingTime) => {
    clearTimer();
    stopAudio();
    setPicked(pickedName);
    setRevealed(true);
    const correct = pickedName === null ? false : pickedName === target?.name;
    if (correct) {
      const timeBonus = remainingTime * 5;
      const streakBonus = (streak + 1) * 15;
      const pts = 100 + timeBonus + streakBonus;
      setScore(s => s + pts);
      setStreak(st => st + 1);
      setResultMsg({ correct: true, pts });
    } else {
      setStreak(0);
      setResultMsg({ correct: false });
    }
    setTimeout(() => {
      setRound(r => {
        const next = r + 1;
        if (next >= TOTAL_ROUNDS) setPhase("gameover");
        else setPhase("next");
        return next;
      });
    }, 1800);
  }, [target, streak, clearTimer, stopAudio]);

  // Next round
  useEffect(() => {
    if (phase !== "playing" && phase !== "next") return;

    if (pool.length < NUM_CHOICES) return;

    const used = new Set();
    const pickRandom = () => {
      let idx;
      do { idx = Math.floor(Math.random() * pool.length); } while (used.has(idx));
      used.add(idx);
      const p = pool[idx];
      const id = parseInt(p.url.split("/").filter(Boolean).pop(), 10);
      return { id, name: p.name };
    };

    const tgt = pickRandom();
    const wrongs = Array.from({ length: NUM_CHOICES - 1 }, pickRandom);
    const all = [tgt, ...wrongs].sort(() => Math.random() - 0.5);

    setTarget(tgt);
    setChoices(all);
    setPicked(null);
    setRevealed(false);
    setResultMsg(null);
    setPlaysLeft(3);
    setTimeLeft(TIME_PER_ROUND);
    setIsPlaying(false);
    stopAudio();

    // Auto-play cry
    setTimeout(() => playTarget(tgt), 400);
    setPhase("playing");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, phase === "next" ? phase : null]);

  // Timer
  useEffect(() => {
    if (phase !== "playing" || revealed) return;
    clearTimer();
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          revealAnswer(null, 0);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return clearTimer;
  }, [phase, revealed, revealAnswer, clearTimer]);

  // Game over — save scores
  useEffect(() => {
    if (phase !== "gameover") return;
    setScore(s => {
      try {
        const prev = parseInt(localStorage.getItem(BEST_KEY) ?? "0");
        if (s > prev) {
          localStorage.setItem(BEST_KEY, String(s));
          setBestScore(s);
        }
        localStorage.setItem(STREAK_KEY, String(streak));
      } catch {}
      return s;
    });
  }, [phase]);

  // Cleanup
  useEffect(() => () => { stopAudio(); clearTimer(); }, [stopAudio, clearTimer]);

  const handlePick = (name) => {
    if (revealed) return;
    revealAnswer(name, timeLeft);
  };

  const handlePlay = () => {
    if (playsLeft <= 0 || revealed) return;
    setPlaysLeft(p => p - 1);
    playTarget(target);
  };

  const getName = (p) => {
    if (!p) return "";
    const id = p.id;
    if (lang === "th" && thaiArr?.[id - 1]) return thaiArr[id - 1];
    if (lang === "ja" && jpArr?.[id - 1]) return jpArr[id - 1];
    return p.name.charAt(0).toUpperCase() + p.name.slice(1);
  };

  const timerPct = (timeLeft / TIME_PER_ROUND) * 100;
  const timerColor = timeLeft > 8 ? "#22c55e" : timeLeft > 4 ? "#f59e0b" : "#ef4444";

  return (
    <div className="gtc-overlay">
      <style>{`
        .gtc-overlay {
          position: fixed; inset: 0; z-index: 9600;
          background: radial-gradient(ellipse at 30% 20%, #0f172a 0%, #020617 80%);
          display: flex; flex-direction: column; align-items: center;
          overflow-y: auto;
          padding: 0;
        }
        .gtc-wrap {
          width: 100%; max-width: 520px;
          padding: 20px 16px 40px;
          display: flex; flex-direction: column; gap: 16px;
          min-height: 100%;
        }
        .gtc-topbar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 16px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 16px;
          color: white;
        }
        .gtc-topbar-score {
          font-size: 20px; font-weight: 900;
          background: linear-gradient(135deg, #fde047, #f97316);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .gtc-topbar-streak {
          display: flex; align-items: center; gap: 4px;
          font-size: 13px; font-weight: 700; color: #fdba74;
        }
        .gtc-topbar-round {
          font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.6);
        }
        .gtc-close {
          background: rgba(239, 68, 68, 0.8); border: none; border-radius: 50%;
          width: 32px; height: 32px; color: white; font-size: 14px; font-weight: 900;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: transform 0.2s;
        }
        .gtc-close:hover { transform: scale(1.1); }

        /* Timer bar */
        .gtc-timer-bar {
          height: 6px; border-radius: 3px;
          background: rgba(255,255,255,0.1);
          overflow: hidden;
        }
        .gtc-timer-fill {
          height: 100%; border-radius: 3px;
          transition: width 1s linear, background 0.5s;
        }

        /* Cry card */
        .gtc-cry-card {
          background: linear-gradient(165deg, rgba(15,23,42,0.96), rgba(30,41,59,0.92));
          border: 2px solid rgba(251,191,36,0.3);
          border-radius: 24px;
          padding: 32px 24px;
          text-align: center;
          color: white;
          position: relative;
          overflow: hidden;
        }
        .gtc-cry-card::before {
          content: "";
          position: absolute; inset: 0;
          background: radial-gradient(circle at 50% 50%, rgba(251,191,36,0.06) 0%, transparent 70%);
          pointer-events: none;
        }
        .gtc-cry-q {
          font-size: 12px; font-weight: 800; letter-spacing: 2px;
          color: rgba(251,191,36,0.8); margin-bottom: 20px;
        }
        .gtc-cry-play-wrap {
          position: relative; display: inline-flex; align-items: center; justify-content: center;
          width: 120px; height: 120px; margin-bottom: 16px;
        }
        .gtc-cry-ring {
          position: absolute; inset: 0; border-radius: 50%;
          border: 2px solid rgba(251,191,36,0.35);
          animation: gtc-ring 2s ease-out infinite;
        }
        .gtc-cry-ring-2 { animation-delay: 0.7s; }
        @keyframes gtc-ring {
          0%   { transform: scale(0.8); opacity: 0.8; }
          100% { transform: scale(1.7); opacity: 0; }
        }
        .gtc-play-btn {
          position: relative; z-index: 2;
          width: 80px; height: 80px; border-radius: 50%;
          background: linear-gradient(135deg, rgba(251,191,36,0.3), rgba(249,115,22,0.3));
          border: 2px solid rgba(251,191,36,0.6);
          font-size: 36px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s;
          box-shadow: 0 8px 28px rgba(251,191,36,0.35);
          color: white;
        }
        .gtc-play-btn.playing {
          background: linear-gradient(135deg, rgba(251,191,36,0.5), rgba(249,115,22,0.5));
          animation: gtc-mic-pulse 0.6s ease-in-out infinite;
        }
        .gtc-play-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .gtc-play-btn:not(:disabled):hover {
          transform: scale(1.08);
          box-shadow: 0 12px 36px rgba(251,191,36,0.55);
        }
        @keyframes gtc-mic-pulse {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.1); }
        }
        .gtc-plays-left {
          font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.5);
          letter-spacing: 1px; margin-top: 6px;
        }
        .gtc-plays-dots {
          display: flex; gap: 5px; justify-content: center; margin-top: 4px;
        }
        .gtc-plays-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: rgba(251,191,36,0.8);
          transition: opacity 0.3s;
        }
        .gtc-plays-dot.used { opacity: 0.2; }
        .gtc-timer-txt {
          font-size: 28px; font-weight: 900;
          color: var(--tc);
          text-shadow: 0 0 16px var(--tc);
          transition: color 0.5s;
          margin-top: 8px;
        }

        /* Choices */
        .gtc-choices {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .gtc-choice {
          padding: 14px 12px;
          border-radius: 16px;
          border: 2px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.05);
          color: white;
          font-size: 15px; font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
          line-height: 1.3;
          position: relative; overflow: hidden;
        }
        .gtc-choice:not(.disabled):hover {
          transform: translateY(-3px);
          border-color: rgba(255,255,255,0.3);
          background: rgba(255,255,255,0.1);
          box-shadow: 0 8px 24px rgba(0,0,0,0.3);
        }
        .gtc-choice.correct {
          background: rgba(34,197,94,0.25);
          border-color: #22c55e;
          box-shadow: 0 0 24px rgba(34,197,94,0.4);
          animation: gtc-correct-flash 0.5s ease;
        }
        .gtc-choice.wrong {
          background: rgba(239,68,68,0.2);
          border-color: #ef4444;
          opacity: 0.65;
        }
        .gtc-choice.disabled { cursor: not-allowed; }
        @keyframes gtc-correct-flash {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.07); }
          100% { transform: scale(1); }
        }

        /* Result feedback */
        .gtc-result-msg {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          padding: 10px 20px; border-radius: 999px;
          font-size: 14px; font-weight: 900;
          animation: gtc-msg-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards;
        }
        .gtc-result-msg.correct {
          background: rgba(34,197,94,0.2); color: #86efac;
          border: 1.5px solid rgba(34,197,94,0.4);
        }
        .gtc-result-msg.wrong {
          background: rgba(239,68,68,0.2); color: #fca5a5;
          border: 1.5px solid rgba(239,68,68,0.4);
        }
        .gtc-result-msg.timeout {
          background: rgba(251,191,36,0.15); color: #fde68a;
          border: 1.5px solid rgba(251,191,36,0.3);
        }
        @keyframes gtc-msg-pop {
          from { opacity: 0; transform: scale(0.8) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }

        /* Setup screen */
        .gtc-setup {
          display: flex; flex-direction: column; align-items: center;
          gap: 20px; padding: 32px 24px; text-align: center;
          background: linear-gradient(165deg, rgba(15,23,42,0.96), rgba(30,41,59,0.92));
          border: 2px solid rgba(251,191,36,0.25);
          border-radius: 24px; color: white;
        }
        .gtc-setup-icon { font-size: 64px; filter: drop-shadow(0 8px 20px rgba(251,191,36,0.5)); }
        .gtc-setup-title {
          font-size: 26px; font-weight: 900;
          background: linear-gradient(135deg, #fbbf24, #f97316);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .gtc-setup-desc { font-size: 13.5px; opacity: 0.75; line-height: 1.6; max-width: 300px; }
        .gtc-rules {
          text-align: left; width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px; padding: 16px 18px;
          display: flex; flex-direction: column; gap: 8px;
        }
        .gtc-rule {
          display: flex; align-items: center; gap: 8px;
          font-size: 12.5px; font-weight: 600; color: rgba(255,255,255,0.85);
        }
        .gtc-rule-icon { font-size: 16px; flex-shrink: 0; }
        .gtc-start-btn {
          width: 100%;
          background: linear-gradient(135deg, #fbbf24, #f97316);
          border: none; border-radius: 16px;
          color: white; font-size: 16px; font-weight: 900;
          padding: 16px; cursor: pointer;
          box-shadow: 0 10px 28px rgba(251,191,36,0.45);
          transition: transform 0.2s, box-shadow 0.2s;
          letter-spacing: 1px;
        }
        .gtc-start-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 16px 40px rgba(251,191,36,0.6);
        }

        /* Game over */
        .gtc-gameover {
          display: flex; flex-direction: column; align-items: center;
          gap: 18px; padding: 32px 24px; text-align: center;
          background: linear-gradient(165deg, rgba(15,23,42,0.96), rgba(30,41,59,0.92));
          border: 2px solid rgba(251,191,36,0.3);
          border-radius: 24px; color: white;
        }
        .gtc-gameover-trophy { font-size: 72px; filter: drop-shadow(0 10px 24px rgba(251,191,36,0.6)); animation: gtc-trophy 1s ease-in-out infinite; }
        @keyframes gtc-trophy {
          0%, 100% { transform: rotate(-8deg) scale(1); }
          50%       { transform: rotate(8deg) scale(1.05); }
        }
        .gtc-gameover-title {
          font-size: 28px; font-weight: 900;
          background: linear-gradient(135deg, #fde047, #ec4899);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .gtc-gameover-score {
          font-size: 52px; font-weight: 900;
          background: linear-gradient(135deg, #fbbf24, #f97316);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          line-height: 1;
        }
        .gtc-gameover-chips {
          display: flex; gap: 8px; flex-wrap: wrap; justify-content: center;
        }
        .gtc-gameover-chip {
          padding: 6px 14px; border-radius: 999px;
          font-size: 12px; font-weight: 800;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.15);
          color: rgba(255,255,255,0.9);
        }
        .gtc-gameover-btn {
          width: 100%; padding: 14px;
          border-radius: 14px; border: none; cursor: pointer;
          font-size: 15px; font-weight: 900; letter-spacing: 1px;
          transition: transform 0.2s;
        }
        .gtc-gameover-btn:hover { transform: translateY(-3px); }
        .gtc-gameover-btn.primary {
          background: linear-gradient(135deg, #fbbf24, #f97316);
          color: white; box-shadow: 0 8px 24px rgba(251,191,36,0.4);
        }
        .gtc-gameover-btn.secondary {
          background: rgba(255,255,255,0.07);
          border: 1.5px solid rgba(255,255,255,0.15);
          color: rgba(255,255,255,0.85);
        }
      `}</style>

      <div className="gtc-wrap">
        {/* ── Setup ── */}
        {phase === "setup" && (
          <div className="gtc-setup">
            <button className="gtc-close" onClick={onClose} style={{ alignSelf: "flex-end" }}>✕</button>
            <div className="gtc-setup-icon">🔊</div>
            <div className="gtc-setup-title">{t("ทายเสียงโปเกมอน", "Guess the Cry!", "鳴き声クイズ")}</div>
            <div className="gtc-setup-desc">
              {t(
                "ฟังเสียงร้องของโปเกมอน แล้วเลือกว่ามันคือตัวไหน มีเวลา 15 วินาทีต่อข้อ!",
                "Listen to the Pokémon's cry and pick the right name. 15 seconds per question!",
                "ポケモンの鳴き声を聞いて、どのポケモンか当てよう！1問15秒！"
              )}
            </div>
            <div className="gtc-rules">
              {[
                { icon: "🔊", text: t("กดปุ่มลำโพงเพื่อเล่นเสียง (ฟังได้สูงสุด 3 ครั้ง)", "Press speaker to play cry (up to 3 times)", "スピーカーで鳴き声を再生 (最大3回)") },
                { icon: "⏱", text: t("มีเวลา 15 วินาทีต่อข้อ", "15 seconds per question", "1問15秒") },
                { icon: "🎯", text: t("ตอบเร็ว + Streak = คะแนนโบนัส", "Faster + streak = bonus points", "速答 + 連続正解 = ボーナス") },
                { icon: "📋", text: t(`ทั้งหมด ${TOTAL_ROUNDS} ข้อ`, `${TOTAL_ROUNDS} questions total`, `全${TOTAL_ROUNDS}問`) },
              ].map((r, i) => (
                <div key={i} className="gtc-rule">
                  <span className="gtc-rule-icon">{r.icon}</span>
                  <span>{r.text}</span>
                </div>
              ))}
            </div>
            {bestScore > 0 && (
              <div style={{ fontSize: 13, color: "#fbbf24", fontWeight: 700 }}>
                🏆 {t("คะแนนสูงสุด", "Best", "ベスト")}: {bestScore}
              </div>
            )}
            <button className="gtc-start-btn" onClick={() => { setRound(0); setScore(0); setStreak(0); setPhase("next"); }}>
              ▶ {t("เริ่มเลย!", "START GAME", "スタート！")}
            </button>
          </div>
        )}

        {/* ── Playing ── */}
        {phase === "playing" && target && (
          <>
            {/* Top bar */}
            <div className="gtc-topbar">
              <div>
                <div className="gtc-topbar-round">{t("ข้อ", "Q", "問")} {round + 1} / {TOTAL_ROUNDS}</div>
                <div className="gtc-topbar-score">{score} {t("คะแนน", "pts", "点")}</div>
              </div>
              {streak >= 2 && (
                <div className="gtc-topbar-streak">🔥 {streak}x streak</div>
              )}
              <button className="gtc-close" onClick={onClose}>✕</button>
            </div>

            {/* Timer */}
            <div className="gtc-timer-bar">
              <div className="gtc-timer-fill" style={{ width: `${timerPct}%`, background: timerColor }} />
            </div>

            {/* Cry card */}
            <div className="gtc-cry-card">
              <div className="gtc-cry-q">
                {t("🔊 นี่คือเสียงร้องของโปเกมอนตัวไหน?", "🔊 WHICH POKÉMON IS THIS CRY?", "🔊 この鳴き声はどのポケモン?")}
              </div>

              <div className="gtc-cry-play-wrap">
                {isPlaying && <>
                  <div className="gtc-cry-ring" />
                  <div className="gtc-cry-ring gtc-cry-ring-2" />
                </>}
                <button
                  className={`gtc-play-btn${isPlaying ? " playing" : ""}`}
                  onClick={handlePlay}
                  disabled={playsLeft <= 0 || revealed || isPlaying}
                >
                  {isPlaying ? "🎵" : "🔊"}
                </button>
              </div>

              <div className="gtc-plays-dots">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className={`gtc-plays-dot${i >= playsLeft ? " used" : ""}`} />
                ))}
              </div>
              <div className="gtc-plays-left">
                {revealed ? "" : t(`เล่นได้อีก ${playsLeft} ครั้ง`, `${playsLeft} plays left`, `残り${playsLeft}回`)}
              </div>

              <div className="gtc-timer-txt" style={{ "--tc": timerColor }}>
                {!revealed ? `${timeLeft}s` : ""}
              </div>
            </div>

            {/* Result feedback */}
            {resultMsg && (
              <div className={`gtc-result-msg ${resultMsg.correct ? "correct" : picked === null ? "timeout" : "wrong"}`}>
                {resultMsg.correct
                  ? `✅ ${t("ถูกต้อง!", "Correct!", "正解！")} +${resultMsg.pts} ${t("คะแนน", "pts", "点")}`
                  : picked === null
                  ? `⏰ ${t("หมดเวลา!", "Time's up!", "時間切れ！")} — ${getName(target)}`
                  : `❌ ${t("ผิด!", "Wrong!", "不正解！")} — ${getName(target)}`
                }
              </div>
            )}

            {/* Choices */}
            <div className="gtc-choices">
              {choices.map((c) => {
                let cls = "gtc-choice";
                if (revealed) {
                  if (c.name === target?.name) cls += " correct";
                  else if (c.name === picked) cls += " wrong";
                  cls += " disabled";
                }
                return (
                  <button key={c.name} className={cls} onClick={() => handlePick(c.name)}>
                    {getName(c)}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* ── Game Over ── */}
        {phase === "gameover" && (
          <div className="gtc-gameover">
            <button className="gtc-close" onClick={onClose} style={{ alignSelf: "flex-end" }}>✕</button>
            <div className="gtc-gameover-trophy">
              {score >= 1200 ? "🏆" : score >= 600 ? "🥈" : "🎮"}
            </div>
            <div className="gtc-gameover-title">
              {score >= 1200
                ? t("เก่งมาก! ผู้เชี่ยวชาญเสียง!", "Amazing! Cry Master!", "すごい！鳴き声マスター！")
                : score >= 600
                ? t("ดีมาก! เก่งขึ้นเรื่อยๆ!", "Nice! Getting better!", "いいね！上達してる！")
                : t("ยังไม่แม่น ลองอีกครั้ง!", "Keep practicing!", "もっと練習しよう！")}
            </div>
            <div style={{ fontSize: 13, opacity: 0.65, marginTop: -8 }}>
              {t("คะแนนรวม", "Final Score", "最終スコア")}
            </div>
            <div className="gtc-gameover-score">{score}</div>
            <div className="gtc-gameover-chips">
              {score >= bestScore && score > 0 && (
                <div className="gtc-gameover-chip" style={{ background: "rgba(251,191,36,0.2)", borderColor: "rgba(251,191,36,0.4)", color: "#fde68a" }}>
                  🏆 {t("New Best!", "New Best!", "新記録！")}
                </div>
              )}
              <div className="gtc-gameover-chip">🔥 Max streak: {streak}</div>
              <div className="gtc-gameover-chip">📋 {TOTAL_ROUNDS} {t("ข้อ", "Qs", "問")}</div>
            </div>
            <button className="gtc-gameover-btn primary" onClick={() => { setRound(0); setScore(0); setStreak(0); setPhase("next"); }}>
              🔄 {t("เล่นอีกครั้ง", "PLAY AGAIN", "もう一度")}
            </button>
            <button className="gtc-gameover-btn secondary" onClick={onClose}>
              {t("กลับหน้าเกม", "Back to Games", "ゲーム一覧へ")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
