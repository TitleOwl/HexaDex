import { useState } from "react";
import WhosThatGame    from "./WhosThatGame.jsx";
import MultiplayerQuiz from "./MultiplayerQuiz.jsx";

const GAMES = [
  { id:"whosthat", icon:"🎮", color:"#3b82f6",
    titleEn:"Who's That Pokémon?",     titleTh:"นี่ Pokémon อะไร?",       titleJa:"だれだ?",
    descEn:"Classic silhouette guessing game with 4 difficulty levels",
    descTh:"เกมเดาเงาคลาสสิก 4 ระดับความยาก · ทำคะแนน combo",
    descJa:"シルエットクイズ 4段階の難易度" },
  { id:"multiplayer", icon:"🌐", color:"#a855f7",
    titleEn:"Multiplayer Quiz",        titleTh:"เล่นกับเพื่อน",          titleJa:"フレンド対戦",
    descEn:"Create a room, share code with friends, compete on the same questions",
    descTh:"สร้างห้อง แชร์ Room code · แข่งคะแนนกับเพื่อน",
    descJa:"ルームコードで友達と対戦" },
];

export default function GamesHub({ allList, thaiArr, jpArr, lang, cachedFetch, genIdx, onClose }) {
  const [active, setActive] = useState(null);

  const title = (g) => lang === "th" ? g.titleTh : lang === "ja" ? g.titleJa : g.titleEn;
  const desc  = (g) => lang === "th" ? g.descTh  : lang === "ja" ? g.descJa  : g.descEn;

  return (
    <main className="grid-wrap go-hub-wrap">
      <div className="tb-header">
        <h1 className="tb-title">
          🎮 {lang==="th" ? "มินิเกม" : lang==="ja" ? "ミニゲーム" : "Mini Games"}
        </h1>
        <p className="tb-sub">
          {lang==="th" ? "เกมและกิจกรรมสนุกๆ ทดสอบความรู้ Pokémon ของคุณ"
           : lang==="ja" ? "ポケモン知識を試すゲーム集"
           : "Fun games to test your Pokémon knowledge"}
        </p>
      </div>

      <div className="go-hub-grid">
        {GAMES.map(g => (
          <button key={g.id} className="go-hub-card"
            onClick={() => setActive(g.id)}
            style={{ "--tool-color": g.color, borderColor: g.color }}>
            <div className="go-hub-icon" style={{ background: `linear-gradient(135deg, ${g.color}, ${g.color}cc)` }}>
              {g.icon}
            </div>
            <div className="go-hub-info">
              <div className="go-hub-title">{title(g)}</div>
              <div className="go-hub-desc">{desc(g)}</div>
            </div>
            <span className="go-hub-arrow">→</span>
          </button>
        ))}
      </div>

      <div className="go-hub-footer">
        <p>
          🏆 {lang==="th" ? "ทำคะแนนสะสม · เก็บ streak · แข่งกับเพื่อน"
              : lang==="ja" ? "ハイスコア · 連勝記録 · 友達と勝負"
              : "Earn high scores · Build streaks · Challenge friends"}
        </p>
      </div>

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
