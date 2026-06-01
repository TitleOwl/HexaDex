import { useState, useMemo } from "react";
import { TYPE_NAMES_TH, TYPE_NAMES_JA } from "../data.js";
import { typeColor, getArt, getLocalName, padId } from "../utils.js";
import { useWeather } from "../useWeather.js";
import { useModalLifecycle } from "../perfUtils.js";

// Pokemon GO weather → boosted types mapping
const WEATHER_BOOSTS = {
  sunny:        { icon:"☀️", en:"Sunny / Clear", th:"แดดจัด / โล่ง", ja:"晴れ",   types:["grass","fire","ground"] },
  partly:       { icon:"🌤️", en:"Partly Cloudy", th:"มีเมฆบางส่วน",  ja:"くもり",  types:["normal","rock"] },
  cloudy:       { icon:"☁️", en:"Cloudy",        th:"มีเมฆมาก",      ja:"くもり",  types:["fairy","fighting","poison"] },
  rain:         { icon:"🌧️", en:"Rain",          th:"ฝนตก",         ja:"あめ",   types:["water","electric","bug"] },
  snow:         { icon:"❄️", en:"Snow",          th:"หิมะ",          ja:"ゆき",   types:["ice","steel"] },
  fog:          { icon:"🌫️", en:"Fog",           th:"หมอก",         ja:"きり",   types:["dark","ghost"] },
  windy:        { icon:"💨", en:"Windy",         th:"ลมแรง",         ja:"つよいかぜ", types:["dragon","flying","psychic"] },
};

// Map Open-Meteo weather code to GO weather
function mapWeatherCode(code) {
  if (code === 0) return "sunny";
  if (code === 1 || code === 2) return "partly";
  if (code === 3) return "cloudy";
  if (code >= 51 && code <= 67) return "rain";
  if (code >= 80 && code <= 82) return "rain";
  if (code >= 71 && code <= 77) return "snow";
  if (code >= 85 && code <= 86) return "snow";
  if (code === 45 || code === 48) return "fog";
  if (code >= 95) return "rain";
  return "partly";
}

export default function WeatherBoost({ lang, loaded, thaiArr, jpArr, onOpen, onClose }) {
  useModalLifecycle();
  const { weather, loading, error, permissionState } = useWeather();
  const [manualWeather, setManualWeather] = useState(null);

  // Auto-derive GO weather from real conditions (or manual override)
  const autoGoWeather = weather ? mapWeatherCode(weather.code) : null;
  const goWeather = manualWeather ?? autoGoWeather;
  const boostInfo = goWeather ? WEATHER_BOOSTS[goWeather] : null;

  // Pokemon of boosted types (from loaded)
  const boostedPokemon = useMemo(() => {
    if (!boostInfo) return [];
    return loaded
      .filter(p => p.id <= 1025 && p.types.some(t => boostInfo.types.includes(t.type.name)))
      .sort((a, b) => {
        const bstA = a.stats.reduce((s, st) => s + st.base_stat, 0);
        const bstB = b.stats.reduce((s, st) => s + st.base_stat, 0);
        return bstB - bstA;
      })
      .slice(0, 24);
  }, [boostInfo, loaded]);

  const typeName = (tn) =>
    lang==="th" ? (TYPE_NAMES_TH[tn]??tn) : lang==="ja" ? (TYPE_NAMES_JA[tn]??tn) : tn;

  return (
    <div className="game-overlay" onClick={onClose}>
      <div className="game-content go-tool-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close game-close" onClick={onClose}>✕</button>

        <div className="game-header">
          <h1 className="game-title">🌦️ Weather Boost</h1>
          <p className="game-sub">
            {lang==="th"?"ดูธาตุที่ boost ในอากาศปัจจุบัน":
             lang==="ja"?"現在の天気でブーストされるタイプ":
             "See which types are boosted in current weather"}
          </p>
        </div>

        {/* Auto-detected weather banner (shares data with WeatherStatus) */}
        {!manualWeather && (
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            background: weather
              ? "linear-gradient(135deg, rgba(6, 182, 212, 0.12), rgba(59, 130, 246, 0.08))"
              : "linear-gradient(135deg, rgba(100, 116, 139, 0.08), rgba(100, 116, 139, 0.04))",
            border: `1.5px solid ${weather ? "rgba(6, 182, 212, 0.3)" : "rgba(100, 116, 139, 0.2)"}`,
            padding: "12px 16px", borderRadius: 12, marginBottom: 14,
          }}>
            <div style={{ fontSize: 28 }}>
              {loading ? "⏳" : (autoGoWeather && WEATHER_BOOSTS[autoGoWeather]?.icon) || "📡"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.7, letterSpacing: 0.5 }}>
                {lang === "th" ? "อากาศจริงในตำแหน่งคุณ" : lang === "ja" ? "現在地の天気" : "Real weather at your location"}
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, marginTop: 2 }}>
                {weather
                  ? `${weather.temp}°C · ${WEATHER_BOOSTS[autoGoWeather]?.[lang === "th" ? "th" : lang === "ja" ? "ja" : "en"] ?? autoGoWeather}`
                  : permissionState === "denied"
                    ? (lang === "th" ? "ไม่อนุญาตตำแหน่ง — เลือกเองด้านล่าง" : lang === "ja" ? "位置情報なし — 手動で選択" : "Location denied — pick manually below")
                    : loading
                      ? (lang === "th" ? "กำลังตรวจสอบสภาพอากาศ..." : "Detecting weather...")
                      : (lang === "th" ? "รอข้อมูล... ลองรีเฟรชหน้า" : "Awaiting data... try refresh")}
              </div>
            </div>
          </div>
        )}

        {error && !weather && (
          <div className="snap-error">⚠️ {error}</div>
        )}

        {/* Manual weather selector */}
        <div className="weather-manual-section">
          <div className="weather-manual-label">
            🎛️ {manualWeather
              ? (lang==="th"?"กำลังใช้แบบเลือกเอง":lang==="ja"?"手動選択中":"Manual override active")
              : (lang==="th"?"หรือเลือกเอง":lang==="ja"?"または手動選択":"Or pick manually")}
            {manualWeather && (
              <button onClick={() => setManualWeather(null)}
                style={{
                  marginLeft: 10, padding: "2px 10px",
                  background: "rgba(6, 182, 212, 0.12)",
                  border: "1px solid rgba(6, 182, 212, 0.3)",
                  borderRadius: 999, fontSize: 11, fontWeight: 700,
                  color: "#0891b2", cursor: "pointer",
                }}>
                ↩ {lang === "th" ? "กลับเป็นอัตโนมัติ" : "Back to auto"}
              </button>
            )}
          </div>
          <div className="weather-manual-grid">
            {Object.entries(WEATHER_BOOSTS).map(([id, w]) => (
              <button key={id}
                className={`weather-manual-btn${(manualWeather === id || (!manualWeather && goWeather === id)) ? " active" : ""}`}
                onClick={() => { setManualWeather(id); }}>
                <span className="weather-manual-icon">{w.icon}</span>
                <span className="weather-manual-name">
                  {lang==="th" ? w.th : lang==="ja" ? w.ja : w.en}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Current weather display */}
        {boostInfo && (
          <div className="weather-current">
            <div className="weather-current-icon">{boostInfo.icon}</div>
            <div className="weather-current-info">
              <div className="weather-current-label">
                {weather && !manualWeather ? `📍 ${lang==="th"?"อากาศจริงตอนนี้":"Current weather"}` :
                 `🎮 ${lang==="th"?"จำลอง":"Simulated"}`}
              </div>
              <div className="weather-current-name">
                {lang==="th" ? boostInfo.th : lang==="ja" ? boostInfo.ja : boostInfo.en}
              </div>
              {weather && !manualWeather && (
                <div className="weather-current-temp">
                  🌡️ {weather.current?.temperature_2m}°C · 💨 {weather.current?.wind_speed_10m} km/h
                </div>
              )}
            </div>
          </div>
        )}

        {/* Boosted types */}
        {boostInfo && (
          <>
            <div className="weather-boosted-types">
              <div className="weather-boost-label">
                ⚡ {lang==="th"?"ธาตุที่ Boost":lang==="ja"?"ブーストタイプ":"Boosted Types"}
              </div>
              <div className="weather-boost-pills">
                {boostInfo.types.map(t => (
                  <span key={t} className="weather-boost-pill"
                    style={{ background: typeColor(t) }}>
                    {typeName(t)}
                  </span>
                ))}
              </div>
              <div className="weather-boost-perks">
                💪 +25% CP · +25% Damage · Lv +5 catches
              </div>
            </div>

            <div className="modal-section-title" style={{ marginTop: 18 }}>
              🏆 {lang==="th"?"โปเกมอน Boost ตอนนี้":lang==="ja"?"今ブースト中のポケモン":"Pokémon boosted now"}
            </div>
            <div className="weather-boosted-grid">
              {boostedPokemon.length === 0 ? (
                <div className="iv-empty">
                  {lang==="th"?"โหลด Pokémon เพิ่มก่อนเพื่อดู":"Load more Pokémon from the Pokédex first"}
                </div>
              ) : (
                boostedPokemon.map(p => {
                  const name = getLocalName(p.id, lang, thaiArr, jpArr) ?? p.name;
                  const color = typeColor(p.types[0]?.type.name);
                  return (
                    <button key={p.id} className="weather-boost-card"
                      onClick={() => onOpen?.(p)}
                      style={{ borderColor: color }}>
                      <img src={getArt(p)} alt={name} loading="lazy" />
                      <div className="weather-boost-name">{name}</div>
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}

        <div className="weather-tip">
          💡 {lang==="th"?"Boost ในเกมจริง = +25% damage, level 5+ ตอนจับ, candy bonus":
              lang==="ja"?"ブースト効果: +25%ダメージ・+5レベル・あめ+1":
              "In-game boost = +25% damage, +5 levels at catch, +1 candy"}
        </div>
      </div>
    </div>
  );
}