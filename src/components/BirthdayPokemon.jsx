import { useState, useEffect } from "react";
import { TYPE_NAMES_TH, TYPE_NAMES_JA } from "../data.js";
import { typeColor, getArt, getLocalName, padId } from "../utils.js";

// Deterministic hash from date string → pokemon ID
function birthdayToPokemonId(birthday, maxId = 1025) {
  const [y, m, d] = birthday.split("-").map(Number);
  let h = (y * 10000) + (m * 100) + d;
  h = ((h * 2654435761) >>> 0) & 0x7fffffff;
  return (h % maxId) + 1;
}

// Personality traits based on date
function getPersonality(birthday) {
  const [y, m, d] = birthday.split("-").map(Number);
  const day = new Date(birthday).getDay(); // 0-6

  const personalities = [
    { trait: "Calm & Wise",     icon: "🌙", color: "#6366f1" }, // Sunday
    { trait: "Energetic",       icon: "⚡", color: "#facc15" }, // Monday
    { trait: "Bold & Brave",    icon: "🔥", color: "#ef4444" }, // Tuesday
    { trait: "Curious",         icon: "🔍", color: "#3b82f6" }, // Wednesday
    { trait: "Friendly",        icon: "💗", color: "#ec4899" }, // Thursday
    { trait: "Creative",        icon: "🎨", color: "#a855f7" }, // Friday
    { trait: "Adventurous",     icon: "🌍", color: "#16a34a" }, // Saturday
  ];

  const elements = ["💧", "🔥", "🌿", "⚡", "❄️", "🌪", "🌑", "✨", "🌍", "🪨", "🌊", "🌟"];
  const elementByMonth = elements[m - 1];

  return {
    ...personalities[day],
    monthElement: elementByMonth,
  };
}

const MONTHS_TH = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
const MONTHS_JA = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];
const MONTHS_EN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function BirthdayPokemon({
  lang, thaiArr, jpArr, cachedFetch, allList, onOpen, onClose,
}) {
  const [birthday, setBirthday] = useState(() => {
    try { return localStorage.getItem("pkdx_birthday") ?? ""; } catch { return ""; }
  });
  const [pokemon, setPokemon] = useState(null);
  const [loading, setLoading] = useState(false);

  const personality = birthday ? getPersonality(birthday) : null;
  const dailyId = birthday && allList.length > 0 ? birthdayToPokemonId(birthday) : null;

  useEffect(() => {
    if (!dailyId || !allList.length) return;
    setLoading(true);
    const entry = allList[dailyId - 1];
    if (!entry) { setLoading(false); return; }
    cachedFetch(entry.url).then(p => {
      setPokemon(p);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [dailyId, allList, cachedFetch]);

  const handleSave = (date) => {
    setBirthday(date);
    if (date) localStorage.setItem("pkdx_birthday", date);
  };

  const formatBirthday = (date) => {
    if (!date) return "";
    const [y, m, d] = date.split("-").map(Number);
    if (lang === "th") return `${d} ${MONTHS_TH[m-1]} ${y + 543}`;
    if (lang === "ja") return `${y}年${MONTHS_JA[m-1]}${d}日`;
    return `${MONTHS_EN[m-1]} ${d}, ${y}`;
  };

  const title = lang === "th" ? "🎂 โปเกมอนคู่ดวง"
              : lang === "ja" ? "🎂 誕生日ポケモン"
              : "🎂 Birthday Pokémon";
  const subtitle = lang === "th" ? "ใส่วันเกิดเพื่อค้นหาโปเกมอนคู่ดวงของคุณ"
                 : lang === "ja" ? "誕生日を入力して運命のポケモンを見つけよう"
                 : "Enter your birthday to discover your destiny Pokémon";

  return (
    <div className="game-overlay" onClick={onClose}>
      <div className="game-content birthday-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close game-close" onClick={onClose}>✕</button>

        <div className="game-header">
          <h1 className="game-title">{title}</h1>
          <p className="game-sub">{subtitle}</p>
        </div>

        {/* Birthday input */}
        <div className="birthday-input-wrap">
          <label className="birthday-label">
            {lang === "th" ? "📅 วันเกิดของคุณ" : lang === "ja" ? "📅 誕生日" : "📅 Your Birthday"}
          </label>
          <input
            type="date"
            className="birthday-input"
            value={birthday}
            onChange={(e) => handleSave(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
          />
        </div>

        {birthday && (
          <div className="birthday-info">
            {formatBirthday(birthday)}
          </div>
        )}

        {/* Result */}
        {loading && (
          <div className="evo-loading">⏳ Reading the stars...</div>
        )}

        {pokemon && personality && (
          <div className="birthday-result">
            {/* Personality card */}
            <div className="birthday-personality" style={{ background: `linear-gradient(135deg, ${personality.color}cc, ${personality.color}88)` }}>
              <div className="birthday-pers-icon">{personality.icon}</div>
              <div className="birthday-pers-text">
                <div className="birthday-pers-label">
                  {lang === "th" ? "บุคลิกของคุณ" : lang === "ja" ? "あなたの性格" : "Your Personality"}
                </div>
                <div className="birthday-pers-trait">{personality.trait}</div>
              </div>
              <div className="birthday-pers-element">{personality.monthElement}</div>
            </div>

            {/* Matched Pokemon */}
            <div className="birthday-match" onClick={() => onOpen(pokemon)} style={{
              background: `linear-gradient(135deg, ${typeColor(pokemon.types[0]?.type.name)}cc, ${typeColor(pokemon.types[0]?.type.name)}77)`,
            }}>
              <div className="birthday-match-glow" />
              <div className="birthday-match-stars">
                ✨ {lang === "th" ? "โปเกมอนคู่ดวงของคุณ"
                   : lang === "ja" ? "あなたの運命のポケモン"
                   : "Your Destiny Pokémon"} ✨
              </div>
              <img src={getArt(pokemon)} alt={pokemon.name} className="birthday-match-img" />
              <div className="birthday-match-name">
                {getLocalName(pokemon.id, lang, thaiArr, jpArr) ?? pokemon.name}
              </div>
              <div className="birthday-match-id">{padId(pokemon.id)}</div>
              <div className="birthday-match-types">
                {pokemon.types.map(t => (
                  <span key={t.type.name} className="modal-type-tag">
                    {lang === "th" ? (TYPE_NAMES_TH[t.type.name] ?? t.type.name)
                     : lang === "ja" ? (TYPE_NAMES_JA[t.type.name] ?? t.type.name)
                     : t.type.name}
                  </span>
                ))}
              </div>
              <button className="birthday-match-btn">
                👀 {lang === "th" ? "ดูข้อมูล" : lang === "ja" ? "詳細を見る" : "View Details"}
              </button>
            </div>

            {/* Compatibility note */}
            <div className="birthday-note">
              {lang === "th"
                ? `💫 จากวันเกิด ${formatBirthday(birthday)} โปเกมอนคู่ดวงของคุณคือ ${getLocalName(pokemon.id, "th", thaiArr, jpArr) ?? pokemon.name} — เลือกตามรหัสจากวันเกิดของคุณโดยเฉพาะ!`
                : lang === "ja"
                ? `💫 ${formatBirthday(birthday)}生まれのあなたの運命のポケモンは${getLocalName(pokemon.id, "ja", thaiArr, jpArr) ?? pokemon.name}！誕生日コードに基づいた唯一の選択。`
                : `💫 Born on ${formatBirthday(birthday)}, your destiny Pokémon is ${pokemon.name} — uniquely chosen from your birthday code!`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
