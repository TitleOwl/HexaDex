import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  X, Volume2, Clock, Target, ClipboardList, Trophy, Flame, Music,
  CheckCircle2, XCircle, RotateCw, Medal, Gamepad2, Play,
} from "lucide-react";
import { getLocalName } from "../utils.js";
import { CRY_URL } from "../data.js";
import { useModalLifecycle } from "../perfUtils.js";

const TOTAL_ROUNDS = 10;
const TIME_PER_ROUND = 15;
const NUM_CHOICES = 4;

const BEST_KEY = "pkdx_guess_cry_best";
const STREAK_KEY = "pkdx_guess_cry_streak";

const artwork = (id) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;

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
    <div className="game-overlay">
      <style>{`
        .gtc-rules {
          text-align: left; width: 100%;
          background: var(--bg-muted);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: 14px 16px;
          display: flex; flex-direction: column; gap: 9px;
        }
        .gtc-rule {
          display: flex; align-items: center; gap: 10px;
          font-size: 13px; font-weight: 600; color: var(--text-secondary);
        }
        .gtc-rule-icon {
          display: flex; align-items: center; justify-content: center;
          width: 28px; height: 28px; border-radius: 9px; flex-shrink: 0;
          background: var(--gold-light); color: var(--blue);
        }

        /* Timer bar */
        .gtc-timer-bar {
          height: 6px; border-radius: 999px;
          background: var(--bg-muted);
          overflow: hidden; margin-bottom: 18px;
        }
        .gtc-timer-fill {
          height: 100%; border-radius: 999px;
          transition: width 1s linear, background 0.5s;
        }

        /* Cry card */
        .gtc-cry-card {
          background: var(--bg-muted);
          border: 1px solid var(--border);
          border-radius: 24px;
          padding: 26px 20px 22px;
          text-align: center;
          margin-bottom: 16px;
        }
        .gtc-cry-q {
          font-size: 11px; font-weight: 900; letter-spacing: 1.5px;
          text-transform: uppercase;
          color: var(--text-secondary); margin-bottom: 18px;
        }
        .gtc-play-wrap {
          position: relative; display: inline-flex; align-items: center; justify-content: center;
          width: 110px; height: 110px; margin-bottom: 12px;
        }
        .gtc-ring {
          position: absolute; inset: 12px; border-radius: 50%;
          border: 2px solid var(--blue);
          animation: gtc-ring 2s ease-out infinite;
        }
        .gtc-ring-2 { animation-delay: 0.7s; }
        @keyframes gtc-ring {
          0%   { transform: scale(0.85); opacity: 0.5; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        .gtc-play-btn {
          position: relative; z-index: 2;
          width: 76px; height: 76px; border-radius: 50%;
          background: var(--blue);
          border: none; cursor: pointer; color: #fff;
          display: flex; align-items: center; justify-content: center;
          box-shadow: var(--shadow-sm);
          transition: transform 0.18s, filter 0.18s;
        }
        .gtc-play-btn.playing { animation: gtc-mic-pulse 0.6s ease-in-out infinite; }
        .gtc-play-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .gtc-play-btn:not(:disabled):hover { transform: scale(1.07); filter: brightness(1.08); }
        .gtc-play-btn:not(:disabled):active { transform: scale(0.96); }
        @keyframes gtc-mic-pulse {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.08); }
        }
        .gtc-dots { display: flex; gap: 6px; justify-content: center; margin-top: 4px; }
        .gtc-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: var(--blue); transition: opacity 0.3s;
        }
        .gtc-dot.used { opacity: 0.2; }
        .gtc-plays-left {
          font-size: 11px; font-weight: 700; color: var(--text-muted);
          letter-spacing: 0.5px; margin-top: 6px; min-height: 14px;
        }
        .gtc-timer-txt {
          font-size: 26px; font-weight: 900;
          color: var(--tc); transition: color 0.5s; margin-top: 8px; min-height: 30px;
        }

        /* Reveal image (shown after answering) */
        .gtc-reveal { display: flex; flex-direction: column; align-items: center; gap: 6px; }
        .gtc-reveal img {
          width: 120px; height: 120px; object-fit: contain;
          animation: gtc-reveal-pop 0.45s cubic-bezier(0.34,1.56,0.64,1);
          filter: drop-shadow(0 8px 14px rgba(0,0,0,0.18));
        }
        .gtc-reveal-name {
          font-size: 17px; font-weight: 900; color: var(--text-primary);
          text-transform: capitalize;
        }
        @keyframes gtc-reveal-pop {
          0%   { transform: scale(0.6) rotate(-5deg); opacity: 0; }
          60%  { transform: scale(1.08); }
          100% { transform: scale(1) rotate(0); opacity: 1; }
        }

        /* Image choices */
        .gtc-choice {
          display: flex; flex-direction: column; align-items: center; gap: 6px;
          padding: 12px 8px 10px;
          border-radius: 14px;
          border: 1px solid var(--border);
          background: var(--bg-card);
          color: var(--text-primary);
          cursor: pointer;
          font-weight: 800; font-size: 13px;
          text-transform: capitalize; line-height: 1.2;
          transition: transform 0.18s, border-color 0.18s, box-shadow 0.18s;
        }
        .gtc-choice img {
          width: 62px; height: 62px; object-fit: contain;
          transition: transform 0.18s;
        }
        .gtc-choice:hover:not(:disabled) { transform: translateY(-2px); border-color: var(--blue); box-shadow: var(--shadow-sm); }
        .gtc-choice:hover:not(:disabled) img { transform: scale(1.08); }
        .gtc-choice:disabled { cursor: not-allowed; }
        .gtc-choice.revealed { opacity: 0.5; }
        .gtc-choice.correct { background: rgba(34,197,94,0.14); border-color: #22c55e; color: #15803d; opacity: 1; }
        .gtc-choice.wrong   { background: rgba(239,68,68,0.14); border-color: #ef4444; color: #991b1b; opacity: 1; }

        /* Game over chips */
        .gtc-chips { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; margin-bottom: 24px; }
        .gtc-chip {
          padding: 6px 14px; border-radius: 999px;
          font-size: 12px; font-weight: 800;
          background: var(--bg-muted); border: 1px solid var(--border);
          color: var(--text-secondary);
        }
        .gtc-back-btn {
          width: 100%; margin-top: 10px; padding: 12px;
          border-radius: var(--radius-pill); cursor: pointer;
          border: 1.5px solid var(--border); background: transparent;
          color: var(--text-secondary); font-weight: 800; font-size: 13px;
        }
      `}</style>

      <div className="game-content">
        <button className="modal-close game-close" onClick={onClose}><X size={16} strokeWidth={2.4} /></button>

        {/* ── Setup ── */}
        {phase === "setup" && (
          <>
            <div className="game-header">
              <h1 className="game-title" style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
                <Volume2 size={22} strokeWidth={2.2} /> {t("ทายเสียงโปเกมอน", "Guess the Cry!", "鳴き声クイズ")}
              </h1>
              <p className="game-sub">
                {t(
                  "ฟังเสียงร้อง แล้วเลือกว่าเป็นโปเกมอนตัวไหน — มีเวลา 15 วินาทีต่อข้อ!",
                  "Listen to the cry and pick the right Pokémon. 15 seconds per question!",
                  "鳴き声を聞いて当てよう！1問15秒！"
                )}
              </p>
            </div>

            <div className="setup-section">
              <div className="gtc-rules">
                {[
                  { Icon: Volume2, text: t("กดปุ่มลำโพงเพื่อเล่นเสียง (ฟังได้สูงสุด 3 ครั้ง)", "Press speaker to play cry (up to 3 times)", "スピーカーで鳴き声を再生 (最大3回)") },
                  { Icon: Clock, text: t("มีเวลา 15 วินาทีต่อข้อ", "15 seconds per question", "1問15秒") },
                  { Icon: Target, text: t("ตอบเร็ว + Streak = คะแนนโบนัส", "Faster + streak = bonus points", "速答 + 連続正解 = ボーナス") },
                  { Icon: ClipboardList, text: t(`ทั้งหมด ${TOTAL_ROUNDS} ข้อ`, `${TOTAL_ROUNDS} questions total`, `全${TOTAL_ROUNDS}問`) },
                ].map((r, i) => (
                  <div key={i} className="gtc-rule">
                    <span className="gtc-rule-icon"><r.Icon size={15} strokeWidth={2.4} /></span>
                    <span>{r.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {bestScore > 0 && (
              <div className="setup-section">
                <div className="setup-label" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 0 }}>
                  <Trophy size={14} strokeWidth={2.4} /> {t("คะแนนสูงสุด", "Best", "ベスト")}: <strong>{bestScore}</strong>
                </div>
              </div>
            )}

            <button className="game-start-btn" onClick={() => { setRound(0); setScore(0); setStreak(0); setPhase("next"); }}
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Play size={16} strokeWidth={2.6} fill="currentColor" /> {t("เริ่มเล่น!", "Start Game!", "スタート!")}
            </button>
          </>
        )}

        {/* ── Playing ── */}
        {phase === "playing" && target && (
          <>
            <div className="game-hud">
              <div className="game-hud-stats">
                <span className="game-stat-pill">{t("ข้อ", "Q", "問")} {round + 1}/{TOTAL_ROUNDS}</span>
                <span className="game-stat-pill" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <Target size={13} strokeWidth={2.4} /> {score}
                </span>
              </div>
              {streak >= 2 && (
                <span className="game-stat-pill" style={{ background: "linear-gradient(135deg, #f97316, #f59e0b)", display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <Flame size={13} strokeWidth={2.4} /> {streak}x
                </span>
              )}
            </div>

            <div className="gtc-timer-bar">
              <div className="gtc-timer-fill" style={{ width: `${timerPct}%`, background: timerColor }} />
            </div>

            <div className="gtc-cry-card">
              <div className="gtc-cry-q" style={{ display: "inline-flex", alignItems: "center", gap: 7, justifyContent: "center" }}>
                <Volume2 size={14} strokeWidth={2.4} /> {revealed
                  ? t("คำตอบคือ", "The answer is", "答えは")
                  : t("นี่คือเสียงของโปเกมอนตัวไหน?", "Which Pokémon is this cry?", "この鳴き声はどのポケモン?")}
              </div>

              {revealed ? (
                <div className="gtc-reveal">
                  <img src={artwork(target.id)} alt={getName(target)} />
                  <div className="gtc-reveal-name">{getName(target)}</div>
                </div>
              ) : (
                <>
                  <div className="gtc-play-wrap">
                    {isPlaying && <>
                      <div className="gtc-ring" />
                      <div className="gtc-ring gtc-ring-2" />
                    </>}
                    <button
                      className={`gtc-play-btn${isPlaying ? " playing" : ""}`}
                      onClick={handlePlay}
                      disabled={playsLeft <= 0 || isPlaying}
                    >
                      {isPlaying ? <Music size={28} strokeWidth={2.2} /> : <Volume2 size={28} strokeWidth={2.2} />}
                    </button>
                  </div>

                  <div className="gtc-dots">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className={`gtc-dot${i >= playsLeft ? " used" : ""}`} />
                    ))}
                  </div>
                  <div className="gtc-plays-left">
                    {t(`เล่นได้อีก ${playsLeft} ครั้ง`, `${playsLeft} plays left`, `残り${playsLeft}回`)}
                  </div>

                  <div className="gtc-timer-txt" style={{ "--tc": timerColor }}>
                    {timeLeft}s
                  </div>
                </>
              )}
            </div>

            {resultMsg && (
              <div className={`game-reveal-banner ${resultMsg.correct ? "correct" : "wrong"}`}
                style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
                {resultMsg.correct
                  ? <><CheckCircle2 size={15} strokeWidth={2.4} /> {t("ถูกต้อง!", "Correct!", "正解！")} +{resultMsg.pts} {t("คะแนน", "pts", "点")}</>
                  : picked === null
                  ? <><Clock size={15} strokeWidth={2.4} /> {t("หมดเวลา!", "Time's up!", "時間切れ！")} — {getName(target)}</>
                  : <><XCircle size={15} strokeWidth={2.4} /> {t("ผิด!", "Wrong!", "不正解！")} — {getName(target)}</>
                }
              </div>
            )}

            <div className="game-choices" style={{ gridTemplateColumns: "1fr 1fr" }}>
              {choices.map((c) => {
                let cls = "gtc-choice";
                if (revealed) {
                  cls += " revealed";
                  if (c.name === target?.name) cls += " correct";
                  else if (c.name === picked) cls += " wrong";
                }
                return (
                  <button key={c.name} className={cls} onClick={() => handlePick(c.name)} disabled={revealed}>
                    <img src={artwork(c.id)} alt={getName(c)} loading="lazy" />
                    {getName(c)}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* ── Game Over ── */}
        {phase === "gameover" && (
          <div className="game-over-screen">
            <div className="game-over-icon" style={{ display: "flex", justifyContent: "center",
              color: score >= 1200 ? "#e0a92e" : score >= 600 ? "var(--text-muted)" : "var(--blue)" }}>
              {score >= 1200 ? <Trophy size={48} strokeWidth={1.8} /> : score >= 600 ? <Medal size={48} strokeWidth={1.8} /> : <Gamepad2 size={48} strokeWidth={1.8} />}
            </div>
            <h1 className="game-over-title" style={{ marginBottom: 16 }}>
              {score >= 1200
                ? t("เก่งมาก! ผู้เชี่ยวชาญเสียง!", "Amazing! Cry Master!", "すごい！鳴き声マスター！")
                : score >= 600
                ? t("ดีมาก! เก่งขึ้นเรื่อยๆ!", "Nice! Getting better!", "いいね！上達してる！")
                : t("ยังไม่แม่น ลองอีกครั้ง!", "Keep practicing!", "もっと練習しよう！")}
            </h1>

            <div className="game-over-stats">
              <div className="game-over-stat">
                <span className="game-over-stat-label">{t("คะแนนรวม", "Final", "最終")}</span>
                <span className="game-over-stat-val">{score}</span>
              </div>
              <div className="game-over-stat">
                <span className="game-over-stat-label">{t("คะแนนสูงสุด", "Best", "ベスト")}</span>
                <span className="game-over-stat-val">{bestScore}</span>
              </div>
            </div>

            <div className="gtc-chips">
              {score >= bestScore && score > 0 && (
                <div className="gtc-chip" style={{ background: "var(--gold-light)", borderColor: "var(--gold)", color: "#7a5000", display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <Trophy size={12} strokeWidth={2.4} /> {t("สถิติใหม่!", "New Best!", "新記録！")}
                </div>
              )}
              <div className="gtc-chip" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Flame size={12} strokeWidth={2.4} /> {t("สตรีค", "Streak", "連続")}: {streak}</div>
              <div className="gtc-chip" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><ClipboardList size={12} strokeWidth={2.4} /> {TOTAL_ROUNDS} {t("ข้อ", "Qs", "問")}</div>
            </div>

            <button className="game-next-btn" onClick={() => { setRound(0); setScore(0); setStreak(0); setPhase("next"); }}
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <RotateCw size={16} strokeWidth={2.4} /> {t("เล่นอีกครั้ง", "Play Again", "もう一度")}
            </button>
            <button className="gtc-back-btn" onClick={onClose}>
              {t("กลับหน้าเกม", "Back to Games", "ゲーム一覧へ")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
