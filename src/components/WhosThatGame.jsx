import { useState, useEffect, useMemo, useCallback } from "react";
import {
  X, Gamepad2, Star, Heart, HeartCrack, Trophy, Target, Flame,
  Lightbulb, CheckCircle2, XCircle, RotateCw, Play, Clock,
} from "lucide-react";
import {
  STRINGS, DIFFICULTIES, ALL_TYPES, TYPE_COLORS,
  TYPE_NAMES_TH, TYPE_NAMES_JA, GENERATIONS,
} from "../data.js";
import { getLocalName, playCry, typeColor } from "../utils.js";
import { useModalLifecycle } from "../perfUtils.js";

export default function WhosThatGame({ allList, thaiArr, jpArr, lang, onClose, cachedFetch, genIdx, onCorrectAnswer }) {
  useModalLifecycle(onClose);
  const s = STRINGS[lang];

  // Setup state
  const [setupMode,   setSetupMode]    = useState(true);
  const [difficulty,  setDifficulty]   = useState(DIFFICULTIES[1]); // Normal
  const [typeFilter,  setTypeFilter]   = useState("all");

  // Game state
  const [round,        setRound]       = useState(0);
  const [target,       setTarget]      = useState(null);
  const [choices,      setChoices]     = useState([]);
  const [revealed,     setRevealed]    = useState(false);
  const [picked,       setPicked]      = useState(null);
  const [score,        setScore]       = useState(0);
  const [combo,        setCombo]       = useState(0);
  const [lives,        setLives]       = useState(3);
  const [hintUsed,     setHintUsed]    = useState(false);
  const [showHint,     setShowHint]    = useState(false);
  const [timeLeft,     setTimeLeft]    = useState(0);
  const [targetType,   setTargetType]  = useState(null); // for hint
  const [gameOver,     setGameOver]    = useState(false);

  const [bestScore,    setBestScore]   = useState(() => {
    try { return parseInt(localStorage.getItem("pkdx_whosthat_best") ?? "0"); } catch { return 0; }
  });

  // Filter pool by gen + type
  const pool = useMemo(() => {
    const gen = GENERATIONS[genIdx];
    return allList.filter((p, i) => {
      const id = parseInt(p.url.split("/").filter(Boolean).pop(), 10);
      return id >= gen.min && id <= gen.max && id <= 1025;
    });
  }, [allList, genIdx]);

  // Start a new game
  const startGame = () => {
    setSetupMode(false);
    setRound(0);
    setScore(0);
    setCombo(0);
    setLives(difficulty.lives);
    setHintUsed(false);
    setGameOver(false);
  };

  // Generate new round
  const newRound = useCallback(async () => {
    if (pool.length < 2) return;
    // never request more unique picks than the pool can supply (avoids an
    // infinite do/while loop + lets small pools still play)
    const nChoices = Math.min(difficulty.choices, pool.length);
    const used = new Set();
    const pick = () => {
      let idx;
      do { idx = Math.floor(Math.random() * pool.length); } while (used.has(idx));
      used.add(idx);
      const p = pool[idx];
      const id = parseInt(p.url.split("/").filter(Boolean).pop(), 10);
      return { id, name: p.name, url: p.url };
    };
    const targetPick = pick();
    const distractors = Array.from({ length: nChoices - 1 }, () => pick());
    const all = [targetPick, ...distractors].sort(() => Math.random() - 0.5);

    setTarget(targetPick);
    setChoices(all);
    setRevealed(false);
    setPicked(null);
    setHintUsed(false);
    setShowHint(false);
    setTargetType(null);

    // Pre-fetch type for hint
    if (difficulty.id !== "easy") {
      cachedFetch(targetPick.url).then(p => {
        setTargetType(p.types?.[0]?.type?.name ?? null);
      }).catch(() => {});
    }

    // Set timer
    if (difficulty.time > 0) {
      setTimeLeft(difficulty.time);
    } else {
      setTimeLeft(0);
    }
  }, [pool, difficulty, cachedFetch]);

  useEffect(() => {
    if (!setupMode && !gameOver) newRound();
  }, [round, setupMode, gameOver, newRound]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0 || revealed || gameOver) return;
    const t = setTimeout(() => setTimeLeft(v => v - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, revealed, gameOver]);

  // Time's up
  useEffect(() => {
    if (timeLeft === 0 && !revealed && !setupMode && !gameOver && difficulty.time > 0 && target) {
      handleWrong(); // auto-fail
    }
  }, [timeLeft, revealed, setupMode, gameOver, difficulty.time]);

  const handleWrong = () => {
    setRevealed(true);
    setCombo(0);
    setLives(v => {
      const next = v - 1;
      if (next <= 0) setGameOver(true);
      return next;
    });
  };

  // Persist best score reliably once the game ends (uses fresh score)
  useEffect(() => {
    if (gameOver && score > bestScore) {
      setBestScore(score);
      try { localStorage.setItem("pkdx_whosthat_best", String(score)); } catch {}
    }
  }, [gameOver, score, bestScore]);

  const handlePick = (choice) => {
    if (revealed) return;
    setPicked(choice);
    if (choice.id === target.id) {
      // Correct
      const basePoints = 10 * difficulty.scoreMul;
      const timeBonus  = difficulty.time > 0 ? timeLeft * 2 : 0;
      const comboBonus = combo * 5;
      const hintPenalty = hintUsed ? -3 : 0;
      const gain = basePoints + timeBonus + comboBonus + hintPenalty;
      setScore(v => v + gain);
      setCombo(v => v + 1);
      setRevealed(true);
      playCry(target.id, 0.4, target.name);
      onCorrectAnswer?.();  // ⭐ Track challenge progress
    } else {
      handleWrong();
    }
  };

  const useHintBtn = () => {
    if (hintUsed) return;
    setHintUsed(true);
    setShowHint(true);
    setCombo(0); // hint resets combo
  };

  const getLabel = (c) => getLocalName(c.id, lang, thaiArr, jpArr) ?? c.name;

  // ── Setup screen ──
  if (setupMode) {
    return (
      <div className="game-overlay">
        <div className="game-content">
          <button className="modal-close game-close" onClick={onClose}><X size={16} strokeWidth={2.4} /></button>

          <div className="game-header">
            <h1 className="game-title" style={{ display: "inline-flex", alignItems: "center", gap: 9 }}><Gamepad2 size={22} strokeWidth={2.2} /> {s.whosThatTitle}</h1>
            <p className="game-sub">{s.whosThatSub}</p>
          </div>

          {/* Difficulty selector */}
          <div className="setup-section">
            <div className="setup-label" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Star size={14} strokeWidth={2.4} /> {s.difficulty}</div>
            <div className="difficulty-grid">
              {DIFFICULTIES.map(d => {
                const label = lang === "th" ? d.th : lang === "ja" ? d.ja : d.en;
                return (
                  <button
                    key={d.id}
                    className={`difficulty-btn${difficulty.id === d.id ? " active" : ""}`}
                    onClick={() => setDifficulty(d)}
                  >
                    <div className="difficulty-name">{label}</div>
                    <div className="difficulty-info" style={{ display: "inline-flex", alignItems: "center", gap: 4, justifyContent: "center", flexWrap: "wrap" }}>
                      <Heart size={11} strokeWidth={2.4} fill="currentColor" /> {d.lives} · ×{d.scoreMul} pts
                      {d.time > 0 && <> · {d.time}s</>}
                    </div>
                    <div className="difficulty-info2">
                      {d.choices} choices
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="setup-section">
            <div className="setup-label" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Trophy size={14} strokeWidth={2.4} /> {s.bestScore}: <strong>{bestScore}</strong></div>
          </div>

          <button className="game-start-btn" onClick={startGame} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Play size={16} strokeWidth={2.6} fill="currentColor" /> {lang === "th" ? "เริ่มเล่น!" : lang === "ja" ? "スタート!" : "Start Game!"}
          </button>
        </div>
      </div>
    );
  }

  // ── Game Over screen ──
  if (gameOver) {
    const isNewBest = score >= bestScore && score > 0;
    return (
      <div className="game-overlay">
        <div className="game-content">
          <button className="modal-close game-close" onClick={onClose}><X size={16} strokeWidth={2.4} /></button>

          <div className="game-over-screen">
            <div className="game-over-icon" style={{ display: "flex", justifyContent: "center", color: isNewBest ? "#e0a92e" : "var(--text-muted)" }}>
              {isNewBest ? <Trophy size={48} strokeWidth={1.8} /> : <HeartCrack size={48} strokeWidth={1.8} />}
            </div>
            <h1 className="game-over-title">
              {isNewBest
                ? (lang === "th" ? "สถิติใหม่!" : lang === "ja" ? "新記録!" : "New Best!")
                : s.noLives}
            </h1>
            <div className="game-over-stats">
              <div className="game-over-stat">
                <span className="game-over-stat-label">{s.finalScore}</span>
                <span className="game-over-stat-val">{score}</span>
              </div>
              <div className="game-over-stat">
                <span className="game-over-stat-label">{s.bestScore}</span>
                <span className="game-over-stat-val">{bestScore}</span>
              </div>
            </div>
            <button className="game-next-btn" onClick={() => setSetupMode(true)} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <RotateCw size={16} strokeWidth={2.4} /> {s.playAgain}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Game playing screen ──
  if (!target) return null;
  const isCorrect = picked?.id === target.id;
  const targetLabel = getLabel(target);
  const imgUrl = `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/other/official-artwork/${target.id}.png`;

  return (
    <div className="game-overlay">
      <div className="game-content">
        <button className="modal-close game-close" onClick={onClose}><X size={16} strokeWidth={2.4} /></button>

        {/* HUD */}
        <div className="game-hud">
          <div className="game-hud-lives">
            {Array.from({ length: difficulty.lives }).map((_, i) => (
              <span key={i} className="game-life" style={{ display: "inline-flex" }}>
                <Heart size={17} strokeWidth={2.2} fill={i < lives ? "currentColor" : "none"}
                  style={{ color: i < lives ? "#e0364a" : "var(--text-muted, #9c988e)" }} />
              </span>
            ))}
          </div>
          <div className="game-hud-stats">
            <span className="game-stat-pill" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Target size={13} strokeWidth={2.4} /> {score}</span>
            <span className="game-stat-pill" style={{ background: "linear-gradient(135deg, #f97316, #f59e0b)", display: "inline-flex", alignItems: "center", gap: 5 }}>
              <Flame size={13} strokeWidth={2.4} /> {combo}
            </span>
            {difficulty.time > 0 && (
              <span className="game-stat-pill" style={{ background: timeLeft <= 3 ? "#ef4444" : "var(--blue)", display: "inline-flex", alignItems: "center", gap: 5 }}>
                <Clock size={13} strokeWidth={2.4} /> {timeLeft}s
              </span>
            )}
          </div>
        </div>

        {/* Silhouette */}
        <div className="game-silhouette-wrap" style={{ width: difficulty.silSize, height: difficulty.silSize }}>
          <img src={imgUrl} alt="silhouette"
            className={`game-silhouette ${revealed ? "revealed" : ""}`}
            style={{ width: difficulty.silSize - 20, height: difficulty.silSize - 20 }}
            onError={(e) => {
              const fb = `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/${target.id}.png`;
              if (e.currentTarget.src !== fb) e.currentTarget.src = fb;
            }} />
          <div className="game-silhouette-ring" />
        </div>

        {/* Hint */}
        {showHint && targetType && (
          <div className="game-hint-banner" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Lightbulb size={14} strokeWidth={2.4} /> {s.typeHint}
            <span className="type-tag" style={{ background: typeColor(targetType), marginLeft: 6 }}>
              {lang === "th" ? (TYPE_NAMES_TH[targetType] ?? targetType) :
               lang === "ja" ? (TYPE_NAMES_JA[targetType] ?? targetType) : targetType}
            </span>
          </div>
        )}

        {/* Reveal banner */}
        {revealed && (
          <div className={`game-reveal-banner ${isCorrect ? "correct" : "wrong"}`}>
            {isCorrect
              ? <><CheckCircle2 size={15} strokeWidth={2.4} style={{ verticalAlign: "-2px" }} /> {s.correct} <strong>{targetLabel}</strong></>
              : <><XCircle size={15} strokeWidth={2.4} style={{ verticalAlign: "-2px" }} /> {s.wrong} {s.itWas} <strong>{targetLabel}</strong></>
            }
          </div>
        )}

        {/* Choices */}
        <div className="game-choices" style={{ gridTemplateColumns: difficulty.choices >= 6 ? "1fr 1fr 1fr" : "1fr 1fr" }}>
          {choices.map(c => {
            const isTarget = revealed && c.id === target.id;
            const isPicked = picked?.id === c.id;
            return (
              <button
                key={c.id}
                className={`game-choice${revealed ? " revealed" : ""}${isTarget ? " correct" : ""}${isPicked && !isTarget ? " wrong" : ""}`}
                onClick={() => handlePick(c)}
                disabled={revealed}
              >
                {getLabel(c)}
              </button>
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="game-actions">
          {!revealed && !hintUsed && difficulty.id !== "easy" && (
            <button className="game-hint-btn" onClick={useHintBtn} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <Lightbulb size={14} strokeWidth={2.4} /> {s.useHint} (-3 pts)
            </button>
          )}
          {revealed && (
            <button className="game-next-btn" onClick={() => setRound(r => r + 1)}>
              {s.nextPokemon} →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}