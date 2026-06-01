import { useState, useEffect, useCallback, useMemo } from "react";
import { STRINGS, GENERATIONS } from "../data.js";
import { getLocalName, playCry } from "../utils.js";
import { useModalLifecycle } from "../perfUtils.js";

// Generate a deterministic quiz from a room code (so 2 people with same code see same questions)
function generateQuestions(roomCode, allList, count = 10) {
  // Hash room code into seed
  let seed = 0;
  for (let i = 0; i < roomCode.length; i++) {
    seed = (seed * 31 + roomCode.charCodeAt(i)) & 0x7fffffff;
  }
  const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

  const pool = allList.filter((p, i) => {
    const id = parseInt(p.url.split("/").filter(Boolean).pop(), 10);
    return id && id <= 1025;
  });

  const used = new Set();
  const questions = [];

  for (let q = 0; q < count; q++) {
    const choices = new Set();
    while (choices.size < 4) {
      const idx = Math.floor(rand() * pool.length);
      if (!choices.has(idx)) choices.add(idx);
    }
    const choiceArr = [...choices].map(idx => {
      const p = pool[idx];
      const id = parseInt(p.url.split("/").filter(Boolean).pop(), 10);
      return { id, name: p.name, url: p.url };
    });

    // Target is one of the choices
    const targetIdx = Math.floor(rand() * 4);
    questions.push({
      target: choiceArr[targetIdx],
      choices: choiceArr,
    });
  }

  return questions;
}

function randomRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export default function MultiplayerQuiz({ allList, thaiArr, jpArr, lang, onClose }) {
  useModalLifecycle(onClose);
  const s = STRINGS[lang];

  // Phase: lobby | playing | result
  const [phase, setPhase] = useState("lobby");
  const [roomCode, setRoomCode] = useState(() => {
    // Check URL for room code on mount
    const params = new URLSearchParams(window.location.search);
    return params.get("room")?.toUpperCase() ?? "";
  });
  const [playerName, setPlayerName] = useState(() => {
    try { return localStorage.getItem("pkdx_player_name") ?? ""; } catch { return ""; }
  });
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [picked, setPicked] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [answers, setAnswers] = useState([]); // record of right/wrong

  // Auto-open if URL has room code
  useEffect(() => {
    if (roomCode && roomCode.length === 6) {
      // Pre-fill it but don't auto-start
    }
  }, []);

  const createRoom = () => {
    const code = randomRoomCode();
    setRoomCode(code);
  };

  const startGame = () => {
    if (!roomCode || roomCode.length !== 6 || !playerName.trim()) return;
    localStorage.setItem("pkdx_player_name", playerName.trim());
    const qs = generateQuestions(roomCode, allList, 10);
    setQuestions(qs);
    setCurrentQ(0);
    setScore(0);
    setAnswers([]);
    setPicked(null);
    setRevealed(false);
    setTimeLeft(15);
    setPhase("playing");
  };

  // Timer
  useEffect(() => {
    if (phase !== "playing" || revealed) return;
    if (timeLeft <= 0) {
      // Time up = wrong
      setRevealed(true);
      setAnswers(a => [...a, { correct: false, time: 15 }]);
      return;
    }
    const t = setTimeout(() => setTimeLeft(v => v - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, revealed, timeLeft]);

  const handlePick = (c) => {
    if (revealed) return;
    setPicked(c);
    setRevealed(true);
    const isCorrect = c.id === questions[currentQ].target.id;
    if (isCorrect) {
      const points = 10 + timeLeft * 2;
      setScore(s => s + points);
      playCry(c.id, 0.4);
    }
    setAnswers(a => [...a, { correct: isCorrect, time: 15 - timeLeft }]);
  };

  const nextQuestion = () => {
    if (currentQ + 1 >= questions.length) {
      setPhase("result");
    } else {
      setCurrentQ(q => q + 1);
      setRevealed(false);
      setPicked(null);
      setTimeLeft(15);
    }
  };

  const shareLink = () => {
    const url = new URL(window.location);
    url.searchParams.set("room", roomCode);
    const link = url.toString();
    if (navigator.share) {
      navigator.share({
        title: `Pokédex Quiz - Room ${roomCode}`,
        text: `Join my Pokédex Quiz! Room code: ${roomCode}`,
        url: link,
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(link).then(() => {
        alert(`✅ Link copied: ${link}`);
      });
    }
  };

  // ── LOBBY ──
  if (phase === "lobby") {
    return (
      <div className="game-overlay" onClick={onClose}>
        <div className="game-content mp-content" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close game-close" onClick={onClose}>✕</button>

          <div className="game-header">
            <h1 className="game-title">🌐 {lang==="th"?"ห้องเล่นกับเพื่อน":lang==="ja"?"フレンド対戦":"Multiplayer Quiz"}</h1>
            <p className="game-sub">
              {lang==="th"?"แชร์ Room code กับเพื่อน แข่งคะแนนกัน":
               lang==="ja"?"ルームコードを友達と共有して対戦":
               "Share a room code with friends to compete"}
            </p>
          </div>

          <div className="mp-lobby">
            <div className="setup-section">
              <div className="setup-label">👤 {lang==="th"?"ชื่อผู้เล่น":lang==="ja"?"プレイヤー名":"Player Name"}</div>
              <input className="team-add-search" placeholder="Ash"
                value={playerName} onChange={(e) => setPlayerName(e.target.value)}
                maxLength={20} autoFocus />
            </div>

            <div className="setup-section">
              <div className="setup-label">🎫 Room Code</div>
              <div className="mp-room-row">
                <input className="team-add-search mp-room-input"
                  placeholder="ABC123"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
                  maxLength={6} />
                <button className="mp-room-btn" onClick={createRoom}>
                  🎲 {lang==="th"?"สุ่ม":lang==="ja"?"ランダム":"Random"}
                </button>
              </div>
              <div className="mp-help">
                💡 {lang==="th"?"Code เดียวกัน = เห็นโจทย์ชุดเดียวกัน":
                    lang==="ja"?"同じコード = 同じ問題":
                    "Same code = same questions for everyone"}
              </div>
            </div>

            {roomCode.length === 6 && (
              <button className="mp-share-btn" onClick={shareLink}>
                📤 {lang==="th"?"แชร์ลิงก์":lang==="ja"?"リンク共有":"Share Link"}
              </button>
            )}

            <button className="game-start-btn"
              onClick={startGame}
              disabled={!playerName.trim() || roomCode.length !== 6}>
              🚀 {lang==="th"?"เริ่มเล่น!":lang==="ja"?"スタート!":"Start Quiz!"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── PLAYING ──
  if (phase === "playing" && questions.length > 0) {
    const q = questions[currentQ];
    const isCorrect = picked?.id === q.target.id;
    const targetLabel = getLocalName(q.target.id, lang, thaiArr, jpArr) ?? q.target.name;
    const imgUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${q.target.id}.png`;

    return (
      <div className="game-overlay">
        <div className="game-content mp-content">
          <div className="mp-hud">
            <div className="mp-hud-player">👤 {playerName}</div>
            <div className="mp-hud-room">🎫 {roomCode}</div>
            <div className="mp-hud-score">⭐ {score}</div>
            <div className="mp-hud-time" style={{ color: timeLeft <= 3 ? "#ef4444" : undefined }}>
              ⏱ {timeLeft}s
            </div>
          </div>

          <div className="mp-progress-text">
            Question {currentQ + 1} / {questions.length}
          </div>
          <div className="mp-progress-bar">
            <div className="mp-progress-fill" style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }} />
          </div>

          <div className="game-silhouette-wrap" style={{ width: 220, height: 220, margin: "20px auto" }}>
            <img src={imgUrl} alt="silhouette"
              className={`game-silhouette ${revealed ? "revealed" : ""}`}
              style={{ width: 200, height: 200 }} />
          </div>

          {revealed && (
            <div className={`game-reveal-banner ${isCorrect ? "correct" : "wrong"}`}>
              {isCorrect ? <>✅ Correct! +{10 + (15 - timeLeft) * 2} pts</>
                : <>❌ It was <strong>{targetLabel}</strong></>}
            </div>
          )}

          <div className="game-choices" style={{ gridTemplateColumns: "1fr 1fr" }}>
            {q.choices.map(c => {
              const isTarget = revealed && c.id === q.target.id;
              const isPicked = picked?.id === c.id;
              const name = getLocalName(c.id, lang, thaiArr, jpArr) ?? c.name;
              return (
                <button key={c.id}
                  className={`game-choice${revealed ? " revealed" : ""}${isTarget ? " correct" : ""}${isPicked && !isTarget ? " wrong" : ""}`}
                  onClick={() => handlePick(c)} disabled={revealed}>
                  {name}
                </button>
              );
            })}
          </div>

          {revealed && (
            <div className="game-actions">
              <button className="game-next-btn" onClick={nextQuestion}>
                {currentQ + 1 >= questions.length ? "🏁 Finish" : "Next →"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── RESULT ──
  if (phase === "result") {
    const correctCount = answers.filter(a => a.correct).length;
    const accuracy = Math.round((correctCount / answers.length) * 100);

    return (
      <div className="game-overlay">
        <div className="game-content mp-content">
          <button className="modal-close game-close" onClick={onClose}>✕</button>
          <div className="game-over-screen">
            <div className="game-over-icon">🏁</div>
            <h1 className="game-over-title">{lang==="th"?"จบเกม!":lang==="ja"?"終了!":"Quiz Complete!"}</h1>

            <div className="mp-result-card">
              <div className="mp-result-name">👤 {playerName}</div>
              <div className="mp-result-room">🎫 Room {roomCode}</div>
              <div className="game-over-stats">
                <div className="game-over-stat">
                  <span className="game-over-stat-label">Score</span>
                  <span className="game-over-stat-val">{score}</span>
                </div>
                <div className="game-over-stat">
                  <span className="game-over-stat-label">Accuracy</span>
                  <span className="game-over-stat-val">{accuracy}%</span>
                </div>
                <div className="game-over-stat">
                  <span className="game-over-stat-label">Correct</span>
                  <span className="game-over-stat-val">{correctCount}/{answers.length}</span>
                </div>
              </div>
            </div>

            <p style={{ marginTop: 18, fontSize: 13, color: "var(--text-secondary)" }}>
              📤 {lang==="th"?"แชร์ Room code กับเพื่อนแล้วเปรียบคะแนนกัน!":
                  lang==="ja"?"ルームコードを友達と共有してスコアを比較しよう!":
                  "Share the room code with friends to compare scores!"}
            </p>

            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 16 }}>
              <button className="mp-share-btn" onClick={shareLink}>
                📤 Share Room
              </button>
              <button className="game-next-btn" onClick={() => setPhase("lobby")}>
                🔄 Play Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}