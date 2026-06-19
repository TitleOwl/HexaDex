// ─── WeatherStatus — Always-on weather badge ─────
// • Auto-requests location on mount
// • Effects always render when data available
// • Hides completely during catch animation
// • Click badge → expand detail panel

import { useState, useEffect } from "react";
import WeatherOverlay from "./WeatherOverlay.jsx";
import { useWeather, getConditionInfo } from "../useWeather.js";
import {
  Sun, Moon, CloudSun, Cloud, CloudFog, CloudDrizzle, CloudRain, CloudSnow,
  CloudLightning, Droplets, Wind, RefreshCw, MapPin, AlertTriangle, Loader2,
} from "lucide-react";

const WEATHER_ICONS = {
  "clear": Sun, "mostly-clear": CloudSun, "partly-cloudy": CloudSun,
  "cloudy": Cloud, "fog": CloudFog, "drizzle": CloudDrizzle,
  "rain": CloudRain, "snow": CloudSnow, "thunderstorm": CloudLightning, "unknown": Cloud,
};
function WeatherIcon({ condition = "unknown", isDay = true, size = 18, color }) {
  let I = WEATHER_ICONS[condition] ?? Cloud;
  if (condition === "clear") I = isDay ? Sun : Moon;
  return <I size={size} strokeWidth={2.2} color={color} />;
}

export default function WeatherStatus({ lang = "en" }) {
  const [expanded, setExpanded] = useState(false);
  const [catchActive, setCatchActive] = useState(false);
  const [modalCount, setModalCount] = useState(0);
  const { weather, loading, error, permissionState, requestLocation, refresh } = useWeather();

  // Listen for catch start/end events to hide weather UI
  useEffect(() => {
    const onCatchOpen  = () => { setCatchActive(true); setExpanded(false); };
    const onCatchClose = () => setCatchActive(false);
    const onModalOpen  = () => setModalCount(c => c + 1);
    const onModalClose = () => setModalCount(c => Math.max(0, c - 1));
    window.addEventListener("catch:open", onCatchOpen);
    window.addEventListener("catch:close", onCatchClose);
    window.addEventListener("ui:modal:open", onModalOpen);
    window.addEventListener("ui:modal:close", onModalClose);
    if (document.body.classList.contains("catch-active")) setCatchActive(true);
    return () => {
      window.removeEventListener("catch:open", onCatchOpen);
      window.removeEventListener("catch:close", onCatchClose);
      window.removeEventListener("ui:modal:open", onModalOpen);
      window.removeEventListener("ui:modal:close", onModalClose);
    };
  }, []);

  const t = (th, en) => lang === "th" ? th : en;
  const info = weather ? getConditionInfo(weather.condition) : null;
  const conditionLabel = info ? (info.label[lang] ?? info.label.en) : null;

  // Auto-request location on mount
  useEffect(() => {
    if (weather) return;
    if (loading) return;
    if (permissionState === "denied") return;
    requestLocation();
  }, [permissionState]); // eslint-disable-line

  // Hide everything during catch
  if (catchActive) return null;

  // During modal: hide ONLY the overlay (rain/snow), keep badge visible
  const showOverlay = weather && modalCount === 0;

  return (
    <>
      {/* Render weather effects only when no modals are open */}
      {showOverlay && (
        <WeatherOverlay condition={weather.condition} isDay={weather.isDay} />
      )}

      {/* Floating badge bottom-right */}
      <div style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        zIndex: 10000,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 8,
        fontFamily: "inherit",
      }}>
        {expanded && (
          <div style={{
            background: "rgba(28, 27, 30, 0.96)",
            backdropFilter: "blur(12px)",
            color: "white",
            borderRadius: 19,
            padding: "14px 16px",
            minWidth: 240,
            maxWidth: 280,
            boxShadow: "0 14px 38px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.08)",
            animation: "ws-panel-in 0.25s ease",
          }}>
            <style>{`
              @keyframes ws-panel-in {
                from { opacity: 0; transform: translateY(8px) scale(0.97); }
                to   { opacity: 1; transform: translateY(0) scale(1); }
              }
              @keyframes ws-spin { to { transform: rotate(360deg); } }
            `}</style>

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <span style={{ display: "inline-flex", color: info?.color ?? "#cbd5e1" }}>
                {loading
                  ? <Loader2 size={34} strokeWidth={2} style={{ animation: "ws-spin 1s linear infinite" }} />
                  : <WeatherIcon condition={weather?.condition} isDay={weather?.isDay} size={34} />}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.1 }}>
                  {weather ? `${weather.temp}°C` : "—"}
                </div>
                <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 600, marginTop: 2 }}>
                  {conditionLabel ?? t("กำลังตรวจสอบ...", "Detecting...")}
                </div>
              </div>
            </div>

            {permissionState === "denied" && (
              <div style={{
                background: "rgba(248, 113, 113, 0.15)",
                border: "1px solid rgba(248, 113, 113, 0.3)",
                borderRadius: 11, padding: "8px 10px", fontSize: 11,
                color: "#fca5a5", marginBottom: 10, lineHeight: 1.4,
                display: "flex", gap: 6, alignItems: "flex-start",
              }}>
                <AlertTriangle size={13} strokeWidth={2.2} style={{ flexShrink: 0, marginTop: 1 }} />
                {t("กรุณาอนุญาตการเข้าถึงตำแหน่งในการตั้งค่าเบราว์เซอร์",
                   "Please enable location access in browser settings")}
              </div>
            )}

            {error && !weather && (
              <div style={{
                background: "rgba(250, 200, 50, 0.12)",
                border: "1px solid rgba(250, 200, 50, 0.3)",
                borderRadius: 11, padding: "8px 10px", fontSize: 11,
                color: "#fcd34d", marginBottom: 10,
                display: "flex", gap: 6, alignItems: "center",
              }}>
                <AlertTriangle size={13} strokeWidth={2.2} style={{ flexShrink: 0 }} /> {error}
              </div>
            )}

            {weather && (
              <div style={{
                fontSize: 11, opacity: 0.85, marginBottom: 12,
                display: "grid", gridTemplateColumns: "1fr 1fr",
                gap: "6px 12px", background: "rgba(255,255,255,0.04)",
                padding: "8px 10px", borderRadius: 11,
              }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Droplets size={13} strokeWidth={2.2} /> {t("ฝน", "Precip")}: <strong>{weather.precipitation} mm</strong></div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Cloud size={13} strokeWidth={2.2} /> {t("เมฆ", "Clouds")}: <strong>{weather.cloudCover}%</strong></div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Wind size={13} strokeWidth={2.2} /> {t("ลม", "Wind")}: <strong>{weather.wind} km/h</strong></div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>{weather.isDay ? <Sun size={13} strokeWidth={2.2} /> : <Moon size={13} strokeWidth={2.2} />} {weather.isDay ? t("กลางวัน","Day") : t("กลางคืน","Night")}</div>
              </div>
            )}

            {weather && (
              <button onClick={refresh} disabled={loading} style={{
                width: "100%", padding: "8px 12px", borderRadius: 13,
                border: "1px solid rgba(255,255,255,0.18)",
                background: "rgba(255,255,255,0.08)",
                color: "white", fontSize: 12, fontWeight: 700,
                cursor: loading ? "wait" : "pointer", opacity: loading ? 0.5 : 1,
                display: "inline-flex", alignItems: "center",
                justifyContent: "center", gap: 6,
              }}>
                <RefreshCw size={13} strokeWidth={2.2} style={{ animation: loading ? "ws-spin 1s linear infinite" : "none" }} />
                {t("รีเฟรชข้อมูล", "Refresh")}
              </button>
            )}

            {permissionState === "denied" && (
              <button onClick={requestLocation} style={{
                width: "100%", padding: "8px 12px", borderRadius: 13,
                border: "none",
                background: "linear-gradient(135deg, #900603, #6e0402)",
                color: "white", fontSize: 12, fontWeight: 800,
                cursor: "pointer",
                display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}>
                <MapPin size={13} strokeWidth={2.2} /> {t("ลองอีกครั้ง", "Try Again")}
              </button>
            )}

            <div style={{
              fontSize: 9, opacity: 0.5, marginTop: 10,
              textAlign: "center", letterSpacing: 0.4,
            }}>
              {t("ข้อมูลจาก", "Powered by")} Open-Meteo
            </div>
          </div>
        )}

        <button onClick={() => setExpanded(e => !e)} style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "9px 14px", borderRadius: 999,
          background: "var(--glass-bg-strong, var(--bg-card))",
          border: "1px solid var(--border)",
          color: "var(--text-primary)", fontWeight: 700, cursor: "pointer",
          boxShadow: "var(--shadow-md)",
          backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
          transition: "transform 0.2s", fontFamily: "inherit", letterSpacing: 0.2,
        }}
          onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
          onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>
          <span style={{ display: "inline-flex", color: weather ? info.color : "var(--blue)" }}>
            {loading
              ? <Loader2 size={17} strokeWidth={2.2} style={{ animation: "ws-spin 1s linear infinite" }} />
              : <WeatherIcon condition={weather?.condition} isDay={weather?.isDay} size={18} />}
          </span>
          <span style={{ fontSize: 12.5 }}>
            {weather ? `${weather.temp}°`
              : loading ? t("กำลังโหลด...", "Loading...")
              : t("เปิดตำแหน่ง", "Enable Location")}
          </span>
          {weather && (
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "#3aa76d",
              animation: "ws-dot-pulse 2s ease-in-out infinite",
            }} />
          )}
          <style>{`
            @keyframes ws-dot-pulse {
              0%, 100% { opacity: 1; }
              50%      { opacity: 0.4; }
            }
            @keyframes ws-spin { to { transform: rotate(360deg); } }
          `}</style>
        </button>
      </div>
    </>
  );
}