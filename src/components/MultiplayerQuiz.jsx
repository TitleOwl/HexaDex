// ─── MultiplayerQuiz — REAL-TIME "Who's That Pokémon?" versus mode ───
// Peer-to-peer over WebRTC (PeerJS public broker, no server needed).
// Host creates a room → others join with the code and appear live in the
// lobby. Host sets max players + starts. Everyone plays the same questions,
// scores stream back to the host, and a live leaderboard is shown.

import { useState, useEffect, useRef, useCallback } from "react";
import {
  X, Globe, User, Users, Ticket, Star, Clock, Dices, Share2, Rocket,
  CheckCircle2, XCircle, Flag, RotateCw, Crown, Loader2, Copy, Check,
  Volume2, Music,
} from "lucide-react";
import { getLocalName, playCry } from "../utils.js";
import { useModalLifecycle } from "../perfUtils.js";

const NS = "hexadexgoquiz-";        // PeerJS id namespace (room code is appended)
const TOTAL_Q = 10;
const TIME_PER_Q = 15;

// ── Load PeerJS from CDN on demand ──
function loadPeerJS() {
  return new Promise((resolve, reject) => {
    if (window.Peer) return resolve(window.Peer);
    const s = document.createElement("script");
    s.src = "https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js";
    s.onload = () => window.Peer ? resolve(window.Peer) : reject(new Error("Peer missing"));
    s.onerror = () => reject(new Error("Failed to load PeerJS"));
    document.head.appendChild(s);
  });
}

function randomRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// Deterministic questions from the room code (host generates + broadcasts anyway)
function buildQuestions(roomCode, allList, count = TOTAL_Q) {
  let seed = 0;
  for (let i = 0; i < roomCode.length; i++) seed = (seed * 31 + roomCode.charCodeAt(i)) & 0x7fffffff;
  const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const pool = allList
    .map(p => ({ id: parseInt(p.url.split("/").filter(Boolean).pop(), 10), name: p.name, url: p.url }))
    .filter(p => p.id && p.id <= 1025);
  if (pool.length < 4) return [];
  const qs = [];
  for (let q = 0; q < count; q++) {
    const idxs = new Set();
    let guard = 0;
    while (idxs.size < 4 && guard++ < 200) idxs.add(Math.floor(rand() * pool.length));
    const choiceArr = [...idxs].map(i => pool[i]);
    qs.push({ target: choiceArr[Math.floor(rand() * choiceArr.length)], choices: choiceArr });
  }
  return qs;
}

export default function MultiplayerQuiz({ allList, thaiArr, jpArr, lang, onClose, mode = "silhouette" }) {
  useModalLifecycle(onClose);
  const t = (th, en, ja) => lang === "th" ? th : lang === "ja" ? (ja ?? en) : en;
  const isCry = mode === "cry";

  const [screen, setScreen]   = useState("setup");   // setup | lobby | playing | result
  const [role, setRole]       = useState(null);      // host | guest
  const [name, setName]       = useState(() => { try { return localStorage.getItem("pkdx_player_name") ?? ""; } catch { return ""; } });
  const [roomCode, setRoomCode] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [players, setPlayers] = useState([]);        // [{id,name,isHost,score,done}]
  const [status, setStatus]   = useState("idle");    // idle | connecting | connected | error
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied]   = useState(false);

  // quiz play
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ]   = useState(0);
  const [picked, setPicked]       = useState(null);
  const [revealed, setRevealed]   = useState(false);
  const [score, setScore]         = useState(0);
  const [correct, setCorrect]     = useState(0);
  const [timeLeft, setTimeLeft]   = useState(TIME_PER_Q);
  const [results, setResults]     = useState(null);  // [{name,score,correct,isHost}]
  const [playsLeft, setPlaysLeft] = useState(3);     // cry mode: replays per question

  // refs (don't trigger re-render)
  const peerRef     = useRef(null);
  const connsRef    = useRef(new Map());   // host: peerId -> DataConnection
  const hostConnRef = useRef(null);        // guest: connection to host
  const myIdRef     = useRef("");
  const roleRef     = useRef(null);
  const playersRef  = useRef([]);
  const maxRef      = useRef(4);
  const screenRef   = useRef("setup");
  useEffect(() => { playersRef.current = players; }, [players]);
  useEffect(() => { maxRef.current = maxPlayers; }, [maxPlayers]);
  useEffect(() => { screenRef.current = screen; }, [screen]);

  // ── cleanup ──
  const cleanupPeer = useCallback(() => {
    try { connsRef.current.forEach(c => c.close?.()); } catch {}
    connsRef.current.clear();
    try { hostConnRef.current?.close?.(); } catch {}
    try { peerRef.current?.destroy?.(); } catch {}
    peerRef.current = null; hostConnRef.current = null;
  }, []);
  useEffect(() => () => cleanupPeer(), [cleanupPeer]);

  const broadcast = (msg) => connsRef.current.forEach(c => { try { c.open && c.send(msg); } catch {} });
  const sendRoster = () => broadcast({ t: "roster", players: playersRef.current, max: maxRef.current, code: roomCodeRef.current });
  const roomCodeRef = useRef("");
  useEffect(() => { roomCodeRef.current = roomCode; }, [roomCode]);

  // ── HOST ──
  const createRoom = useCallback(async (attempt = 0) => {
    setErrorMsg(""); setStatus("connecting");
    let Peer;
    try { Peer = await loadPeerJS(); } catch { setErrorMsg(t("โหลดเครือข่ายไม่ได้", "Couldn't load network", "ネットワーク読込失敗")); setStatus("error"); return; }
    const code = randomRoomCode();
    const peer = new Peer(NS + code, { debug: 0 });
    peerRef.current = peer;
    peer.on("open", (id) => {
      myIdRef.current = id; roleRef.current = "host"; roomCodeRef.current = code;
      setRole("host"); setRoomCode(code);
      setPlayers([{ id, name: name.trim() || "Host", isHost: true, score: 0, done: false }]);
      setStatus("connected"); setScreen("lobby");
    });
    peer.on("connection", (conn) => {
      conn.on("data", (msg) => hostHandle(conn, msg));
      conn.on("close", () => {
        connsRef.current.delete(conn.peer);
        setPlayers(ps => ps.filter(p => p.id !== conn.peer));
        setTimeout(sendRoster, 50);
      });
    });
    peer.on("error", (err) => {
      if (err.type === "unavailable-id" && attempt < 3) { try { peer.destroy(); } catch {}; createRoom(attempt + 1); }
      else { setErrorMsg(t("สร้างห้องไม่ได้ ลองใหม่", "Couldn't create room", "ルーム作成失敗")); setStatus("error"); }
    });
  }, [name]);

  const hostHandle = (conn, msg) => {
    if (msg.t === "join") {
      if (playersRef.current.length >= maxRef.current) {
        try { conn.send({ t: "full" }); } catch {}
        setTimeout(() => { try { conn.close(); } catch {} }, 400);
        return;
      }
      connsRef.current.set(conn.peer, conn);
      setPlayers(ps => ps.some(p => p.id === conn.peer) ? ps
        : [...ps, { id: conn.peer, name: (msg.name || "Player").slice(0, 16), isHost: false, score: 0, done: false }]);
      setTimeout(sendRoster, 60);
    } else if (msg.t === "score") {
      setPlayers(ps => {
        const next = ps.map(p => p.id === conn.peer ? { ...p, score: msg.score, correct: msg.correct, done: true } : p);
        playersRef.current = next;
        return next;
      });
      setTimeout(maybeFinish, 80);
    }
  };

  const maybeFinish = () => {
    if (roleRef.current !== "host") return;
    if (playersRef.current.length > 0 && playersRef.current.every(p => p.done)) finishResults();
  };

  const finishResults = () => {
    const board = [...playersRef.current]
      .map(p => ({ name: p.name, score: p.score || 0, correct: p.correct || 0, isHost: p.isHost }))
      .sort((a, b) => b.score - a.score);
    broadcast({ t: "results", board });
    setResults(board); setScreen("result");
  };

  // ── GUEST ──
  const joinRoom = useCallback(async () => {
    const code = roomCode.trim().toUpperCase();
    if (code.length !== 6 || !name.trim()) return;
    setErrorMsg(""); setStatus("connecting");
    let Peer;
    try { Peer = await loadPeerJS(); } catch { setErrorMsg(t("โหลดเครือข่ายไม่ได้", "Couldn't load network", "ネットワーク読込失敗")); setStatus("error"); return; }
    const peer = new Peer({ debug: 0 });
    peerRef.current = peer;
    peer.on("open", () => {
      myIdRef.current = peer.id; roleRef.current = "guest"; setRole("guest");
      const conn = peer.connect(NS + code, { reliable: true });
      hostConnRef.current = conn;
      let opened = false;
      conn.on("open", () => { opened = true; conn.send({ t: "join", name: name.trim() }); setStatus("connected"); });
      conn.on("data", (msg) => guestHandle(msg));
      conn.on("close", () => { if (screenRef.current !== "result") { setErrorMsg(t("หลุดจากห้อง", "Disconnected", "切断されました")); setStatus("error"); } });
      // timeout if host never answers
      setTimeout(() => { if (!opened) { setErrorMsg(t("ไม่พบห้องนี้", "Room not found", "ルームが見つかりません")); setStatus("error"); } }, 8000);
    });
    peer.on("error", (err) => {
      setErrorMsg(err.type === "peer-unavailable" ? t("ไม่พบห้องนี้", "Room not found", "ルームが見つかりません") : t("เชื่อมต่อไม่ได้", "Connection error", "接続エラー"));
      setStatus("error");
    });
  }, [roomCode, name]);

  const guestHandle = (msg) => {
    if (msg.t === "roster") { setPlayers(msg.players); setMaxPlayers(msg.max); setRoomCode(msg.code); setScreen("lobby"); }
    else if (msg.t === "full") { setErrorMsg(t("ห้องเต็มแล้ว", "Room is full", "満員です")); setStatus("error"); cleanupPeer(); }
    else if (msg.t === "start") { setQuestions(msg.questions); beginPlay(); }
    else if (msg.t === "results") { setResults(msg.board); setScreen("result"); }
  };

  // ── start / play ──
  const hostStart = () => {
    const qs = buildQuestions(roomCode, allList, TOTAL_Q);
    if (qs.length < TOTAL_Q) return;
    setQuestions(qs);
    broadcast({ t: "start", questions: qs });
    beginPlay();
  };

  const beginPlay = () => {
    try { localStorage.setItem("pkdx_player_name", name.trim()); } catch {}
    setCurrentQ(0); setScore(0); setCorrect(0); setPicked(null); setRevealed(false);
    setTimeLeft(TIME_PER_Q); setResults(null); setScreen("playing");
  };

  // timer
  useEffect(() => {
    if (screen !== "playing" || revealed) return;
    if (timeLeft <= 0) { setRevealed(true); return; }
    const id = setTimeout(() => setTimeLeft(v => v - 1), 1000);
    return () => clearTimeout(id);
  }, [screen, revealed, timeLeft]);

  // cry mode: auto-play the cry when a new question appears
  useEffect(() => {
    if (screen !== "playing" || !isCry) return;
    const q = questions[currentQ];
    if (!q) return;
    setPlaysLeft(3);
    const id = setTimeout(() => { try { playCry(q.target.id, 0.6, q.target.name); } catch {} setPlaysLeft(2); }, 350);
    return () => clearTimeout(id);
  }, [screen, currentQ, isCry, questions]);

  const replayCry = () => {
    if (playsLeft <= 0 || revealed) return;
    const q = questions[currentQ];
    if (!q) return;
    try { playCry(q.target.id, 0.6, q.target.name); } catch {}
    setPlaysLeft(v => v - 1);
  };

  const reportScore = (finalScore, finalCorrect) => {
    if (roleRef.current === "host") {
      setPlayers(ps => {
        const next = ps.map(p => p.isHost ? { ...p, score: finalScore, correct: finalCorrect, done: true } : p);
        playersRef.current = next; return next;
      });
      setTimeout(maybeFinish, 80);
    } else {
      try { hostConnRef.current?.send({ t: "score", score: finalScore, correct: finalCorrect }); } catch {}
    }
    setScreen("result");
  };

  const pickAnswer = (c) => {
    if (revealed) return;
    const q = questions[currentQ];
    const ok = c.id === q.target.id;
    setPicked(c); setRevealed(true);
    if (ok) { playCry(c.id, 0.4, c.name); }
    const gained = ok ? 10 + timeLeft * 2 : 0;
    const ns = score + gained, nc = correct + (ok ? 1 : 0);
    setScore(ns); setCorrect(nc);
    // stash latest for the "next" handler
    nextRef.current = { ns, nc, gained };
  };
  const nextRef = useRef({ ns: 0, nc: 0, gained: 0 });

  const nextQuestion = () => {
    if (currentQ + 1 >= questions.length) {
      reportScore(nextRef.current.ns, nextRef.current.nc);
    } else {
      setCurrentQ(q => q + 1); setRevealed(false); setPicked(null); setTimeLeft(TIME_PER_Q);
    }
  };

  const copyCode = () => {
    try { navigator.clipboard?.writeText(roomCode); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  };
  const shareLink = () => {
    const url = new URL(window.location); url.searchParams.set("quizroom", roomCode);
    if (navigator.share) navigator.share({ title: "HexaDex Quiz", text: `Room ${roomCode}`, url: url.toString() }).catch(() => {});
    else copyCode();
  };

  const isHost = role === "host";
  const allReady = players.length >= 2;

  // ─────────────────────────── render ───────────────────────────
  const STYLE = `
    .mpx-card { max-width: 480px; width: 100%; background: var(--bg-card); border: 1px solid var(--border);
      border-radius: 20px; padding: 24px 22px; box-shadow: var(--shadow-lg); position: relative; color: var(--text-primary); }
    .mpx-title { display: inline-flex; align-items: center; gap: 9px; font-size: 21px; font-weight: 800; letter-spacing: -0.02em; margin: 0; }
    .mpx-sub { font-size: 12.5px; color: var(--text-muted); font-weight: 600; margin: 4px 0 0; }
    .mpx-label { font-size: 11px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
    .mpx-input { width: 100%; padding: 12px 14px; border-radius: 12px; border: 1px solid var(--border);
      background: var(--bg-muted); color: var(--text-primary); font-size: 15px; font-weight: 700; font-family: inherit; }
    .mpx-input:focus { outline: none; border-color: var(--blue); }
    .mpx-btn { width: 100%; padding: 13px; border-radius: 12px; border: none; background: var(--blue); color: #fff;
      font-weight: 800; font-size: 14px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      box-shadow: var(--shadow-sm); transition: filter .18s, transform .18s; }
    .mpx-btn:hover:not(:disabled) { filter: brightness(1.08); transform: translateY(-1px); }
    .mpx-btn:disabled { opacity: .45; cursor: not-allowed; }
    .mpx-btn.ghost { background: var(--bg-muted); color: var(--text-primary); border: 1px solid var(--border); box-shadow: none; }
    .mpx-seg { display: flex; gap: 6px; }
    .mpx-seg button { flex: 1; padding: 9px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-muted);
      color: var(--text-secondary); font-weight: 800; font-size: 13px; cursor: pointer; transition: all .15s; }
    .mpx-seg button.active { background: var(--blue); border-color: var(--blue); color: #fff; }
    .mpx-roster { display: flex; flex-direction: column; gap: 8px; }
    .mpx-player { display: flex; align-items: center; gap: 11px; padding: 11px 13px; border-radius: 13px;
      background: var(--bg-muted); border: 1px solid var(--border); animation: mpx-in .3s ease; }
    @keyframes mpx-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    .mpx-avatar { width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center;
      background: color-mix(in srgb, var(--blue) 14%, transparent); color: var(--blue); font-weight: 900; font-size: 14px; }
    .mpx-pname { flex: 1; min-width: 0; font-weight: 800; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .mpx-tag { font-size: 9.5px; font-weight: 800; letter-spacing: .06em; padding: 2px 8px; border-radius: 999px;
      color: var(--blue); background: color-mix(in srgb, var(--blue) 13%, transparent); display: inline-flex; align-items: center; gap: 4px; }
    .mpx-codebox { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 14px;
      background: color-mix(in srgb, var(--blue) 8%, var(--bg-muted)); border: 1px dashed color-mix(in srgb, var(--blue) 35%, transparent); }
    .mpx-code { font-size: 26px; font-weight: 900; letter-spacing: 4px; color: var(--blue); font-variant-numeric: tabular-nums; flex: 1; }
    .mpx-icon-btn { width: 36px; height: 36px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-card);
      color: var(--text-secondary); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .mpx-close { position: absolute; top: 14px; right: 14px; width: 32px; height: 32px; border-radius: 50%;
      background: var(--bg-muted); border: 1px solid var(--border); color: var(--text-secondary); cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center; }
    .mpx-err { font-size: 12px; font-weight: 700; color: #d23a4a; background: rgba(210,58,74,0.1);
      border: 1px solid rgba(210,58,74,0.3); border-radius: 10px; padding: 9px 12px; }
    .mpx-rank { width: 26px; text-align: center; font-weight: 900; font-size: 14px; color: var(--text-muted); flex-shrink: 0; }
  `;

  // wider, two-column gameplay arena — minimal, app palette
  const PLAY_STYLE = `
    .mpq-stage { max-width: 860px; padding: 22px 26px 26px; }
    .mpq-close { position: absolute; top: 14px; right: 14px; width: 32px; height: 32px; border-radius: 50%;
      background: var(--bg-muted); border: 1px solid var(--border); color: var(--text-secondary); cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center; z-index: 3; }

    .mpq-hud { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 4px 0 16px; padding-right: 40px; }
    .mpq-hud-item { display: inline-flex; align-items: center; gap: 6px; padding: 7px 13px; border-radius: 999px;
      background: var(--bg-muted); border: 1px solid var(--border); font-size: 13px; font-weight: 800; color: var(--text-secondary);
      font-variant-numeric: tabular-nums; }
    .mpq-hud-item.score { margin-left: auto; background: var(--blue); color: #fff; border-color: transparent; }
    .mpq-hud-item.time.low { color: #ef4444; }

    .mpq-progress-head { display: flex; justify-content: space-between; font-size: 11px; font-weight: 800;
      letter-spacing: .04em; text-transform: uppercase; color: var(--text-muted); margin-bottom: 6px; }
    .mpq-progress-bar { height: 6px; background: var(--bg-muted); border-radius: 999px; overflow: hidden; margin-bottom: 20px; }
    .mpq-progress-fill { height: 100%; border-radius: 999px; background: var(--blue); transition: width .4s ease; }

    .mpq-grid { display: grid; grid-template-columns: 1.05fr 1fr; gap: 20px; align-items: stretch; }

    .mpq-stage-panel { background: var(--bg-muted); border: 1px solid var(--border); border-radius: 20px; padding: 24px 20px;
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; min-height: 340px; }
    .mpq-q { font-size: 11px; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; color: var(--text-secondary); }

    .mpq-sil-wrap { width: 230px; height: 230px; display: flex; align-items: center; justify-content: center;
      background: var(--bg-card); border: 1px solid var(--border); border-radius: 24px; }
    .mpq-sil-wrap .game-silhouette { width: 200px; height: 200px; object-fit: contain; }

    .mpq-cry-orb { display: inline-flex; align-items: center; justify-content: center; }
    .mpq-cry-btn { width: 92px; height: 92px; border-radius: 50%; cursor: pointer;
      background: var(--blue); border: none; color: #fff; display: inline-flex; align-items: center; justify-content: center;
      box-shadow: var(--shadow-sm); transition: transform .15s, filter .15s; }
    .mpq-cry-btn:hover:not(:disabled) { transform: scale(1.06); filter: brightness(1.08); }
    .mpq-cry-btn:disabled { opacity: .4; cursor: not-allowed; }
    .mpq-dots { display: flex; gap: 6px; }
    .mpq-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--blue); transition: opacity .3s; }
    .mpq-dot.used { opacity: .22; }
    .mpq-hint { font-size: 11px; font-weight: 700; color: var(--text-muted); letter-spacing: .04em; }

    .mpq-reveal-img { width: 190px; height: 190px; object-fit: contain; }
    .mpq-reveal-name { font-size: 19px; font-weight: 900; color: var(--text-primary); text-transform: capitalize; }

    .mpq-right { display: flex; flex-direction: column; gap: 12px; justify-content: center; }
    .mpq-choices { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

    .mpq-choice { display: flex; align-items: center; justify-content: center; gap: 8px; text-align: center;
      padding: 16px 12px; border-radius: 14px; border: 1px solid var(--border); background: var(--bg-card);
      color: var(--text-primary); cursor: pointer; font-weight: 800; font-size: 15px; text-transform: capitalize;
      line-height: 1.2; transition: transform .16s, border-color .16s, box-shadow .16s; }
    .mpq-choices.img .mpq-choice { flex-direction: column; gap: 6px; padding: 14px 8px 12px; font-size: 13px; }
    .mpq-choice img { width: 72px; height: 72px; object-fit: contain; transition: transform .16s; }
    .mpq-choice:hover:not(:disabled) { transform: translateY(-2px); border-color: var(--blue); box-shadow: var(--shadow-sm); }
    .mpq-choice:hover:not(:disabled) img { transform: scale(1.06); }
    .mpq-choice:disabled { cursor: not-allowed; }
    .mpq-choice.revealed { opacity: .5; }
    .mpq-choice.correct { background: rgba(34,197,94,0.14); border-color: #22c55e; color: #15803d; opacity: 1; }
    .mpq-choice.wrong { background: rgba(239,68,68,0.14); border-color: #ef4444; color: #991b1b; opacity: 1; }

    .mpq-next { width: 100%; margin-top: 4px; }

    @media (max-width: 760px) {
      .mpq-stage { padding: 18px 16px 22px; }
      .mpq-grid { grid-template-columns: 1fr; gap: 16px; }
      .mpq-stage-panel { min-height: 0; padding: 20px 16px; }
      .mpq-sil-wrap { width: 180px; height: 180px; }
      .mpq-sil-wrap .game-silhouette { width: 156px; height: 156px; }
      .mpq-reveal-img { width: 150px; height: 150px; }
    }
  `;

  const overlay = (children) => (
    <div className="game-overlay" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="mpx-card">
        <style>{STYLE}</style>
        <button className="mpx-close" onClick={onClose} aria-label="close"><X size={16} strokeWidth={2.4} /></button>
        {children}
      </div>
    </div>
  );

  // ── SETUP ──
  if (screen === "setup") {
    return overlay(<>
      <h1 className="mpx-title">
        {isCry ? <Music size={22} strokeWidth={2.2} style={{ color: "var(--blue)" }} /> : <Globe size={22} strokeWidth={2.2} style={{ color: "var(--blue)" }} />}
        {t("เล่นกับเพื่อน", "Multiplayer", "マルチプレイ")}
      </h1>
      <p className="mpx-sub">
        {(isCry ? t("ทายเสียงโปเกมอน", "Guess the Cry", "鳴き声クイズ") : t("นี่ Pokémon อะไร?", "Who's That Pokémon?", "だれだ?"))}
        {" · "}{t("สร้างห้องหรือเข้าร่วม แข่งกันสด ๆ", "create or join, compete live", "ルームで生対戦")}
      </p>

      <div style={{ marginTop: 20 }}>
        <div className="mpx-label"><User size={13} strokeWidth={2.4} /> {t("ชื่อผู้เล่น", "Your name", "プレイヤー名")}</div>
        <input className="mpx-input" placeholder="Ash" value={name} maxLength={16}
          onChange={(e) => setName(e.target.value)} autoFocus />
      </div>

      <div style={{ marginTop: 16 }}>
        <div className="mpx-label"><Users size={13} strokeWidth={2.4} /> {t("จำนวนผู้เล่นสูงสุด", "Max players", "最大人数")}</div>
        <div className="mpx-seg">
          {[2, 4, 6, 8].map(n => (
            <button key={n} className={maxPlayers === n ? "active" : ""} onClick={() => setMaxPlayers(n)}>{n}</button>
          ))}
        </div>
      </div>

      <button className="mpx-btn" style={{ marginTop: 20 }} disabled={!name.trim() || status === "connecting"} onClick={() => createRoom()}>
        {status === "connecting" ? <Loader2 size={16} strokeWidth={2.4} style={{ animation: "so-spin 1s linear infinite" }} /> : <Crown size={16} strokeWidth={2.2} />}
        {t("สร้างห้อง", "Create Room", "ルーム作成")}
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0", color: "var(--text-muted)", fontSize: 11, fontWeight: 700 }}>
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} /> {t("หรือ", "OR", "または")} <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
      </div>

      <div className="mpx-label"><Ticket size={13} strokeWidth={2.4} /> {t("เข้าร่วมด้วยรหัสห้อง", "Join with code", "コードで参加")}</div>
      <div style={{ display: "flex", gap: 8 }}>
        <input className="mpx-input" placeholder="ABC123" value={roomCode} maxLength={6}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
          style={{ letterSpacing: 3, fontWeight: 900 }} />
        <button className="mpx-btn ghost" style={{ width: "auto", padding: "0 18px" }}
          disabled={roomCode.length !== 6 || !name.trim() || status === "connecting"} onClick={joinRoom}>
          {t("เข้าร่วม", "Join", "参加")}
        </button>
      </div>
      {errorMsg && <div className="mpx-err" style={{ marginTop: 14 }}>{errorMsg}</div>}
    </>);
  }

  // ── LOBBY (waiting room) ──
  if (screen === "lobby") {
    return overlay(<>
      <h1 className="mpx-title"><Users size={22} strokeWidth={2.2} style={{ color: "var(--blue)" }} /> {t("ห้องรอ", "Lobby", "ロビー")}</h1>
      <p className="mpx-sub">{isHost ? t("รอเพื่อนเข้าห้อง แล้วกดเริ่ม", "Wait for players, then start", "参加を待って開始") : t("รอเจ้าของห้องเริ่มเกม", "Waiting for host to start", "ホストの開始待ち")}</p>

      <div className="mpx-codebox" style={{ marginTop: 18 }}>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, color: "var(--text-muted)" }}>{t("รหัส", "CODE", "コード")}</span>
        <span className="mpx-code">{roomCode}</span>
        <button className="mpx-icon-btn" onClick={copyCode} title="Copy">{copied ? <Check size={15} strokeWidth={2.6} style={{ color: "#3aa76d" }} /> : <Copy size={15} strokeWidth={2.2} />}</button>
        <button className="mpx-icon-btn" onClick={shareLink} title="Share"><Share2 size={15} strokeWidth={2.2} /></button>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "18px 0 10px" }}>
        <span className="mpx-label" style={{ margin: 0 }}><Users size={13} strokeWidth={2.4} /> {t("ผู้เล่น", "Players", "プレイヤー")}</span>
        <span style={{ fontSize: 13, fontWeight: 900, color: "var(--blue)", fontVariantNumeric: "tabular-nums" }}>{players.length}/{maxPlayers}</span>
      </div>

      <div className="mpx-roster">
        {players.map(p => (
          <div key={p.id} className="mpx-player">
            <span className="mpx-avatar">{(p.name || "?").charAt(0).toUpperCase()}</span>
            <span className="mpx-pname">{p.name}{p.id === myIdRef.current ? t(" (คุณ)", " (you)", " (あなた)") : ""}</span>
            {p.isHost && <span className="mpx-tag"><Crown size={10} strokeWidth={2.6} /> {t("เจ้าของห้อง", "Host", "ホスト")}</span>}
          </div>
        ))}
        {Array.from({ length: Math.max(0, maxPlayers - players.length) }).map((_, i) => (
          <div key={`e${i}`} className="mpx-player" style={{ opacity: 0.5, borderStyle: "dashed", background: "transparent" }}>
            <span className="mpx-avatar" style={{ background: "var(--bg-muted)", color: "var(--text-muted)" }}><User size={15} strokeWidth={2.2} /></span>
            <span className="mpx-pname" style={{ color: "var(--text-muted)", fontWeight: 600 }}>{t("รอผู้เล่น...", "Waiting…", "待機中…")}</span>
          </div>
        ))}
      </div>

      {isHost ? (
        <button className="mpx-btn" style={{ marginTop: 18 }} disabled={!allReady} onClick={hostStart}>
          <Rocket size={16} strokeWidth={2.4} /> {allReady ? t("เริ่มเกม!", "Start Game!", "スタート!") : t("ต้องมีอย่างน้อย 2 คน", "Need 2+ players", "2人以上必要")}
        </button>
      ) : (
        <div style={{ marginTop: 18, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "var(--text-muted)", fontSize: 13, fontWeight: 700 }}>
          <Loader2 size={15} strokeWidth={2.4} style={{ animation: "so-spin 1s linear infinite" }} /> {t("รอเริ่มเกม...", "Waiting for host…", "開始待ち…")}
        </div>
      )}
      {errorMsg && <div className="mpx-err" style={{ marginTop: 14 }}>{errorMsg}</div>}
      <style>{`@keyframes so-spin { to { transform: rotate(360deg); } }`}</style>
    </>);
  }

  // ── PLAYING ──
  if (screen === "playing" && questions[currentQ]) {
    const q = questions[currentQ];
    const isC = picked?.id === q.target.id;
    const label = getLocalName(q.target.id, lang, thaiArr, jpArr) ?? q.target.name;
    const art = (id) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
    const imgFallback = (e, id) => { const fb = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`; if (e.currentTarget.src !== fb) e.currentTarget.src = fb; };
    const progress = ((currentQ + 1) / questions.length) * 100;
    return (
      <div className="game-overlay">
        <div className="game-content mpq-stage">
          <style>{PLAY_STYLE}</style>
          <button className="mpx-close" onClick={onClose} aria-label="close"><X size={16} strokeWidth={2.4} /></button>

          {/* HUD */}
          <div className="mpq-hud">
            <span className="mpq-hud-item"><User size={13} strokeWidth={2.4} /> {name}</span>
            <span className="mpq-hud-item"><Ticket size={13} strokeWidth={2.4} /> {roomCode}</span>
            <span className={`mpq-hud-item time${timeLeft <= 3 ? " low" : ""}`}><Clock size={13} strokeWidth={2.4} /> {timeLeft}s</span>
            <span className="mpq-hud-item score"><Star size={13} strokeWidth={2.4} /> {score}</span>
          </div>

          {/* Progress */}
          <div className="mpq-progress-head">
            <span>{t("ข้อ", "Question", "問")} {currentQ + 1} / {questions.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="mpq-progress-bar"><div className="mpq-progress-fill" style={{ width: `${progress}%` }} /></div>

          {/* Two-column arena */}
          <div className="mpq-grid">
            {/* Stage */}
            <div className="mpq-stage-panel">
              <div className="mpq-q">
                {isCry
                  ? (revealed ? t("คำตอบคือ", "The answer is", "答えは") : t("เสียงนี้คือใคร?", "Whose cry is this?", "この鳴き声は?"))
                  : (revealed ? t("คำตอบคือ", "The answer is", "答えは") : t("นี่ใครเอ่ย?", "Who's that Pokémon?", "だれだ?"))}
              </div>

              {isCry ? (
                revealed ? (
                  <img className="mpq-reveal-img" src={art(q.target.id)} alt={label} onError={(e) => imgFallback(e, q.target.id)} />
                ) : (
                  <>
                    <div className="mpq-cry-orb">
                      <button className="mpq-cry-btn" onClick={replayCry} disabled={playsLeft <= 0}>
                        <Volume2 size={42} strokeWidth={2} />
                      </button>
                    </div>
                    <div className="mpq-dots">
                      {[0, 1, 2].map(i => <span key={i} className={`mpq-dot${i >= playsLeft ? " used" : ""}`} />)}
                    </div>
                    <div className="mpq-hint">{t(`ฟังได้อีก ${playsLeft} ครั้ง`, `${playsLeft} plays left`, `残り${playsLeft}回`)}</div>
                  </>
                )
              ) : (
                <div className="mpq-sil-wrap">
                  <img src={art(q.target.id)} alt="silhouette" className={`game-silhouette ${revealed ? "revealed" : ""}`}
                    onError={(e) => imgFallback(e, q.target.id)} />
                </div>
              )}

              {revealed && (
                <div className="mpq-reveal-name">{label}</div>
              )}
            </div>

            {/* Choices + actions */}
            <div className="mpq-right">
              {revealed && (
                <div className={`game-reveal-banner ${isC ? "correct" : "wrong"}`} style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center", margin: 0 }}>
                  {isC ? <><CheckCircle2 size={15} strokeWidth={2.4} /> {t("ถูกต้อง!", "Correct!", "正解!")} +{nextRef.current?.gained ?? 0}</> : <><XCircle size={15} strokeWidth={2.4} /> {t("ยังไม่ใช่", "Not quite", "不正解")}</>}
                </div>
              )}

              <div className={`mpq-choices${isCry ? " img" : ""}`}>
                {q.choices.map(c => {
                  const isTarget = revealed && c.id === q.target.id;
                  const isPicked = picked?.id === c.id;
                  const cn = getLocalName(c.id, lang, thaiArr, jpArr) ?? c.name;
                  const cls = `mpq-choice${revealed ? " revealed" : ""}${isTarget ? " correct" : ""}${isPicked && !isTarget ? " wrong" : ""}`;
                  return (
                    <button key={c.id} disabled={revealed} onClick={() => pickAnswer(c)} className={cls}>
                      {isCry && <img src={art(c.id)} alt={cn} loading="lazy" onError={(e) => imgFallback(e, c.id)} />}
                      <span>{cn}</span>
                    </button>
                  );
                })}
              </div>

              {revealed && (
                <button className="game-next-btn mpq-next" onClick={nextQuestion} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                  {currentQ + 1 >= questions.length ? <><Flag size={14} strokeWidth={2.4} /> {t("ส่งคะแนน", "Finish", "終了")}</> : <>{t("ข้อต่อไป", "Next", "次へ")} →</>}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── RESULT (live leaderboard) ──
  if (screen === "result") {
    const waiting = !results;
    return overlay(<>
      <h1 className="mpx-title"><Flag size={20} strokeWidth={2.2} style={{ color: "var(--blue)" }} /> {t("ผลการแข่ง", "Results", "結果")}</h1>
      {waiting ? (
        <div style={{ padding: "30px 10px", textAlign: "center", color: "var(--text-muted)" }}>
          <Loader2 size={40} strokeWidth={2} style={{ animation: "so-spin 1s linear infinite", color: "var(--blue)" }} />
          <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700 }}>
            {t("รอผู้เล่นคนอื่นเล่นจบ...", "Waiting for others to finish…", "他のプレイヤーを待機中…")}
          </div>
          <div style={{ marginTop: 6, fontSize: 12 }}>{t("คะแนนคุณ", "Your score", "あなたのスコア")}: <strong style={{ color: "var(--blue)" }}>{score}</strong></div>
          {isHost && <button className="mpx-btn" style={{ marginTop: 18 }} onClick={finishResults}><Flag size={15} strokeWidth={2.4} /> {t("จบเกม & ดูผล", "End & show results", "結果を表示")}</button>}
        </div>
      ) : (
        <>
          <p className="mpx-sub">{t("อันดับคะแนน", "Final standings", "最終順位")}</p>
          <div className="mpx-roster" style={{ marginTop: 16 }}>
            {results.map((p, i) => (
              <div key={i} className="mpx-player" style={i === 0 ? { borderColor: "var(--blue)", background: "color-mix(in srgb, var(--blue) 8%, var(--bg-muted))" } : undefined}>
                <span className="mpx-rank">{i === 0 ? <Crown size={16} strokeWidth={2.4} style={{ color: "#e0a92e" }} /> : `#${i + 1}`}</span>
                <span className="mpx-avatar">{(p.name || "?").charAt(0).toUpperCase()}</span>
                <span className="mpx-pname">{p.name}</span>
                <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700 }}>{p.correct}/{TOTAL_Q}</span>
                <span style={{ fontWeight: 900, fontSize: 16, color: "var(--blue)", fontVariantNumeric: "tabular-nums" }}>{p.score}</span>
              </div>
            ))}
          </div>
          <button className="mpx-btn ghost" style={{ marginTop: 18 }} onClick={onClose}>
            <RotateCw size={15} strokeWidth={2.2} /> {t("กลับหน้าเกม", "Back to Games", "ゲーム一覧へ")}
          </button>
        </>
      )}
      <style>{`@keyframes so-spin { to { transform: rotate(360deg); } }`}</style>
    </>);
  }

  return null;
}
