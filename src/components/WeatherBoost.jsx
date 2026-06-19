// ─── WeatherBoost — Pokemon GO weather boost calculator ─────
// Uses shared useWeather hook (no separate GPS button)
// Layout pattern matches RaidBosses/EggPool: always-visible close button at top

import { useState, useMemo } from "react";
import {
  Sun, CloudSun, Cloud, CloudRain, CloudSnow, CloudFog, Wind,
  X, Loader2, AlertTriangle, SlidersHorizontal, Zap, Trophy,
} from "lucide-react";
import { TYPE_NAMES_TH, TYPE_NAMES_JA } from "../data.js";
import { typeColor, getArt, getLocalName, padId } from "../utils.js";
import { useWeather } from "../useWeather.js";
import { useModalLifecycle } from "../perfUtils.js";

const WEATHER_BOOSTS = {
  sunny:  { Icon:Sun,       en:"Sunny / Clear", th:"แดดจัด / โล่ง", ja:"晴れ",   types:["grass","fire","ground"] },
  partly: { Icon:CloudSun,  en:"Partly Cloudy", th:"มีเมฆบางส่วน",  ja:"くもり",  types:["normal","rock"] },
  cloudy: { Icon:Cloud,     en:"Cloudy",        th:"มีเมฆมาก",      ja:"くもり",  types:["fairy","fighting","poison"] },
  rain:   { Icon:CloudRain, en:"Rain",          th:"ฝนตก",         ja:"あめ",   types:["water","electric","bug"] },
  snow:   { Icon:CloudSnow, en:"Snow",          th:"หิมะ",          ja:"ゆき",   types:["ice","steel"] },
  fog:    { Icon:CloudFog,  en:"Fog",           th:"หมอก",         ja:"きり",   types:["dark","ghost"] },
  windy:  { Icon:Wind,      en:"Windy",         th:"ลมแรง",         ja:"つよいかぜ", types:["dragon","flying","psychic"] },
};

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
  useModalLifecycle(onClose);
  const { weather, loading, error, permissionState } = useWeather();
  const [manualWeather, setManualWeather] = useState(null);

  const autoGoWeather = weather ? mapWeatherCode(weather.code) : null;
  const goWeather = manualWeather ?? autoGoWeather;
  const boostInfo = goWeather ? WEATHER_BOOSTS[goWeather] : null;

  const boostedPokemon = useMemo(() => {
    if (!boostInfo) return [];
    return loaded
      .filter(p => p.id <= 1025 && p.types.some(t => boostInfo.types.includes(t.type.name)))
      .sort((a, b) => {
        const bstA = a.stats.reduce((s, st) => s + st.base_stat, 0);
        const bstB = b.stats.reduce((s, st) => s + st.base_stat, 0);
        return bstB - bstA;
      })
      .slice(0, 50);
  }, [loaded, boostInfo]);

  const t = (th, en, ja) => lang === "th" ? th : lang === "ja" ? (ja ?? en) : en;
  const typeName = (tn) =>
    lang==="th" ? (TYPE_NAMES_TH[tn]??tn) : lang==="ja" ? (TYPE_NAMES_JA[tn]??tn) : tn;

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 9000,
      background: "rgba(20, 19, 22, 0.55)",
      backdropFilter: "blur(8px)",
      overflowY: "auto", padding: "20px 12px",
      animation: "wb-overlay-in 0.3s ease",
    }}>
      <style>{`
        :root { --wb-bg: #fff; --wb-fg: #1f1d20; --wb-muted: #7a766e; --wb-card: #f4f2ec; --wb-border: #e5e0d5; }
        [data-theme="dark"] { --wb-bg: #1a1816; --wb-fg: #efece4; --wb-muted: #9c988e; --wb-card: #211f20; --wb-border: #2c2926; }
        @keyframes wb-spin { to { transform: rotate(360deg); } }
        @keyframes wb-overlay-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes wb-card-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .wb-pokemon-card { cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; }
        .wb-pokemon-card:hover { transform: translateY(-4px); box-shadow: 0 12px 28px rgba(0,0,0,0.15); }
      `}</style>

      <div onClick={(e) => e.stopPropagation()} style={{
        maxWidth: 1000, margin: "0 auto",
        background: "var(--wb-bg, #fff)",
        borderRadius: 24, padding: 18,
        boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
        position: "relative",
      }}>
        {/* Top bar — close always visible */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 14, padding: "0 4px",
          position: "sticky", top: 0, zIndex: 10,
          background: "var(--wb-bg, #fff)",
          paddingTop: 4, paddingBottom: 8,
        }}>
          <div>
            <h1 style={{ fontSize: 21, fontWeight: 800, margin: 0,
                         color: "var(--wb-fg, #1f1d20)", letterSpacing: "-0.01em",
                         display: "flex", alignItems: "center", gap: 9 }}>
              <CloudSun size={20} strokeWidth={2.2} style={{ color: "var(--blue)" }} /> Weather Boost
            </h1>
            <div style={{ fontSize: 12, color: "var(--wb-muted, #64748b)", marginTop: 4, fontWeight: 600 }}>
              {t("ดูธาตุที่ Boost จากอากาศปัจจุบัน",
                 "Types boosted by current weather",
                 "現在の天気でブーストされるタイプ")}
            </div>
          </div>
          <button onClick={onClose} style={{
            padding: "8px 14px", borderRadius: 999, flexShrink: 0,
            border: "1px solid var(--border)", background: "var(--bg-muted)",
            color: "var(--wb-fg)", fontWeight: 700, fontSize: 13, cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: 6,
          }}>
            <X size={15} strokeWidth={2.4} /> {t("ปิด","Close","閉じる")}
          </button>
        </div>

        {/* Auto-detected weather banner */}
        {!manualWeather && (
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            background: "var(--wb-card)",
            border: "1px solid var(--wb-border)",
            padding: "12px 16px", borderRadius: 15, marginBottom: 14,
            color: "var(--wb-fg, #1f1d20)",
          }}>
            <div style={{ display: "flex", color: "var(--blue)" }}>
              {loading
                ? <Loader2 size={26} strokeWidth={2} style={{ animation: "wb-spin 1s linear infinite" }} />
                : (() => { const I = (autoGoWeather && WEATHER_BOOSTS[autoGoWeather]?.Icon) || CloudSun; return <I size={26} strokeWidth={2} />; })()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.7, letterSpacing: 0.5 }}>
                {t("อากาศจริงในตำแหน่งคุณ", "Real weather at your location", "現在地の天気")}
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, marginTop: 2 }}>
                {weather
                  ? `${weather.temp}°C · ${WEATHER_BOOSTS[autoGoWeather]?.[lang === "th" ? "th" : lang === "ja" ? "ja" : "en"] ?? autoGoWeather}`
                  : permissionState === "denied"
                    ? t("ไม่อนุญาตตำแหน่ง — เลือกเองด้านล่าง","Location denied — pick manually below","位置情報なし — 手動選択")
                    : loading
                      ? t("กำลังตรวจสอบสภาพอากาศ...","Detecting weather...","検出中...")
                      : t("รอข้อมูล... ลองรีเฟรชหน้า","Awaiting data... try refresh","データ待機中")}
              </div>
            </div>
          </div>
        )}

        {error && !weather && (
          <div style={{
            padding: "10px 14px", marginBottom: 12, borderRadius: 13,
            background: "#fef3c7", color: "#92400e", fontSize: 12, fontWeight: 700,
            display: "inline-flex", alignItems: "center", gap: 6,
          }}><AlertTriangle size={13} strokeWidth={2.4} /> {error}</div>
        )}

        {/* Manual weather selector */}
        <div style={{ marginBottom: 14 }}>
          <div style={{
            fontSize: 12, fontWeight: 800, marginBottom: 8,
            color: "var(--wb-muted, #7a766e)", letterSpacing: 0.4,
            display: "inline-flex", alignItems: "center", gap: 6,
          }}>
            <SlidersHorizontal size={13} strokeWidth={2.2} /> {manualWeather
              ? t("กำลังใช้แบบเลือกเอง","Manual override active","手動選択中")
              : t("หรือเลือกเอง","Or pick manually","または手動選択")}
            {manualWeather && (
              <button onClick={() => setManualWeather(null)}
                style={{
                  marginLeft: 10, padding: "2px 10px",
                  background: "rgba(6, 182, 212, 0.12)",
                  border: "1px solid rgba(6, 182, 212, 0.3)",
                  borderRadius: 999, fontSize: 11, fontWeight: 700,
                  color: "#0891b2", cursor: "pointer",
                }}>
                ↻ {t("ใช้อัตโนมัติ","Use auto","自動")}
              </button>
            )}
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
            gap: 8,
          }}>
            {Object.entries(WEATHER_BOOSTS).map(([key, info]) => {
              const isActive = goWeather === key;
              return (
                <button key={key} onClick={() => setManualWeather(key)} style={{
                  padding: "10px 8px", borderRadius: 15,
                  background: isActive ? "var(--blue)" : "var(--wb-card, #f4f2ec)",
                  color: isActive ? "white" : "var(--wb-fg, #1f1d20)",
                  border: isActive ? "1px solid var(--blue)" : "1px solid var(--wb-border, #e5e0d5)",
                  cursor: "pointer",
                  textAlign: "center",
                  fontWeight: 700,
                  fontSize: 11,
                  boxShadow: "none",
                  transition: "all 0.2s",
                }}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}><info.Icon size={20} strokeWidth={2.2} /></div>
                  <div style={{ marginTop: 0 }}>
                    {lang==="th" ? info.th : lang==="ja" ? info.ja : info.en}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Boost result */}
        {boostInfo && (
          <div style={{
            padding: 16, borderRadius: 17, marginBottom: 14,
            background: `linear-gradient(135deg, ${boostInfo.types.map(t => typeColor(t) + "20").join(", ")})`,
            border: "1.5px solid var(--wb-border, #e2e8f0)",
            animation: "wb-card-in 0.3s ease",
          }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "var(--wb-muted, #7a766e)",
                          letterSpacing: 0.5, marginBottom: 8,
                          display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Zap size={13} strokeWidth={2.4} /> {t("ธาตุที่ถูก Boost","Boosted Types","ブーストタイプ")}:
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {boostInfo.types.map(tp => (
                <span key={tp} style={{
                  background: typeColor(tp), color: "white",
                  padding: "6px 14px", borderRadius: 999,
                  fontSize: 13, fontWeight: 900,
                  boxShadow: `0 4px 12px ${typeColor(tp)}66`,
                  textTransform: "uppercase", letterSpacing: 0.5,
                }}>{typeName(tp)}</span>
              ))}
            </div>
          </div>
        )}

        {/* Top boosted Pokemon */}
        {boostedPokemon.length > 0 && (
          <>
            <div style={{
              fontSize: 13, fontWeight: 900, letterSpacing: 0.5,
              color: "var(--wb-fg, #1f1d20)", marginBottom: 10,
              display: "inline-flex", alignItems: "center", gap: 7,
            }}>
              <Trophy size={15} strokeWidth={2.2} style={{ color: "var(--blue)" }} /> {t(`Top ${boostedPokemon.length} ตัวสู้`,
                    `Top ${boostedPokemon.length} attackers`,
                    `トップ${boostedPokemon.length}`)}
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
              gap: 10,
            }}>
              {boostedPokemon.map((p, i) => {
                const name = getLocalName(p.id, lang, thaiArr, jpArr) ?? p.name;
                const color = typeColor(p.types[0].type.name);
                return (
                  <button key={p.id}
                    className="wb-pokemon-card"
                    onClick={() => { onClose?.(); onOpen?.(p); }}
                    style={{
                      padding: 10, borderRadius: 15,
                      background: "var(--wb-card, #f8fafc)",
                      border: `1.5px solid ${color}44`,
                      cursor: "pointer", textAlign: "center",
                      animation: `wb-card-in 0.3s ease ${i * 0.02}s backwards`,
                    }}>
                    <img src={getArt(p)} alt={name}
                      style={{ width: 70, height: 70, objectFit: "contain" }} />
                    <div style={{ fontSize: 9, color: "var(--wb-muted, #64748b)",
                                  marginTop: 2, fontWeight: 700 }}>{padId(p.id)}</div>
                    <div style={{ fontSize: 11, fontWeight: 800,
                                  color: "var(--wb-fg, #1e293b)",
                                  textTransform: "capitalize", marginTop: 2 }}>{name}</div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        <style>{`
          :root { --wb-bg: #fff; --wb-fg: #1e293b; --wb-muted: #64748b; --wb-card: #f8fafc; --wb-border: #e2e8f0; }
          [data-theme="dark"] { --wb-bg: #151414; --wb-fg: #f1efe9; --wb-muted: #9c988e; --wb-card: #1c1b1c; --wb-border: rgba(255,255,255,0.08); }
        `}</style>
      </div>
    </div>
  );
}