// ─── WeatherStatus — Always-on weather badge ─────
// • Auto-requests location on mount
// • Effects always render when data available
// • Hides completely during catch animation
// • Click badge → expand detail panel

import { useState, useEffect } from "react";
import WeatherOverlay from "./WeatherOverlay.jsx";
import { useWeather, getConditionInfo } from "../useWeather.js";

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
            background: "rgba(15, 23, 42, 0.94)",
            backdropFilter: "blur(12px)",
            color: "white",
            borderRadius: 16,
            padding: "14px 16px",
            minWidth: 240,
            maxWidth: 280,
            boxShadow: "0 14px 38px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.1)",
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
              <span style={{ fontSize: 36, filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.4))" }}>
                {loading ? "⏳" : (info?.emoji ?? "🌤️")}
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
                borderRadius: 8, padding: "8px 10px", fontSize: 11,
                color: "#fca5a5", marginBottom: 10, lineHeight: 1.4,
              }}>
                ⚠️ {t("กรุณาอนุญาตการเข้าถึงตำแหน่งในการตั้งค่าเบราว์เซอร์",
                       "Please enable location access in browser settings")}
              </div>
            )}

            {error && !weather && (
              <div style={{
                background: "rgba(250, 200, 50, 0.12)",
                border: "1px solid rgba(250, 200, 50, 0.3)",
                borderRadius: 8, padding: "8px 10px", fontSize: 11,
                color: "#fcd34d", marginBottom: 10,
              }}>
                ⚠️ {error}
              </div>
            )}

            {weather && (
              <div style={{
                fontSize: 11, opacity: 0.85, marginBottom: 12,
                display: "grid", gridTemplateColumns: "1fr 1fr",
                gap: "6px 12px", background: "rgba(255,255,255,0.04)",
                padding: "8px 10px", borderRadius: 8,
              }}>
                <div>💧 {t("ฝน", "Precip")}: <strong>{weather.precipitation} mm</strong></div>
                <div>☁️ {t("เมฆ", "Clouds")}: <strong>{weather.cloudCover}%</strong></div>
                <div>💨 {t("ลม", "Wind")}: <strong>{weather.wind} km/h</strong></div>
                <div>{weather.isDay ? "☀️" : "🌙"} {weather.isDay ? t("กลางวัน","Day") : t("กลางคืน","Night")}</div>
              </div>
            )}

            {weather && (
              <button onClick={refresh} disabled={loading} style={{
                width: "100%", padding: "8px 12px", borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.18)",
                background: "rgba(255,255,255,0.08)",
                color: "white", fontSize: 12, fontWeight: 700,
                cursor: loading ? "wait" : "pointer", opacity: loading ? 0.5 : 1,
                display: "inline-flex", alignItems: "center",
                justifyContent: "center", gap: 6,
              }}>
                <span style={{ display: "inline-block", animation: loading ? "ws-spin 1s linear infinite" : "none" }}>🔄</span>
                {t("รีเฟรชข้อมูล", "Refresh")}
              </button>
            )}

            {permissionState === "denied" && (
              <button onClick={requestLocation} style={{
                width: "100%", padding: "8px 12px", borderRadius: 10,
                border: "none",
                background: "linear-gradient(135deg, #06b6d4, #2563eb)",
                color: "white", fontSize: 12, fontWeight: 800,
                cursor: "pointer",
              }}>
                📍 {t("ลองอีกครั้ง", "Try Again")}
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
          padding: "10px 14px", borderRadius: 999, border: "none",
          background: weather
            ? `linear-gradient(135deg, ${info.color}ee 0%, ${info.color}aa 100%)`
            : "linear-gradient(135deg, #06b6d4 0%, #2563eb 100%)",
          color: "white", fontWeight: 800, cursor: "pointer",
          boxShadow: "0 6px 22px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.15)",
          backdropFilter: "blur(8px)", transition: "transform 0.2s",
          fontFamily: "inherit", letterSpacing: 0.2,
        }}
          onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
          onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>
          <span style={{ fontSize: 18, filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.3))" }}>
            {loading ? "⏳" : (info?.emoji ?? "🌦️")}
          </span>
          <span style={{ fontSize: 12 }}>
            {weather ? `${weather.temp}°`
              : loading ? t("กำลังโหลด...", "Loading...")
              : t("เปิดตำแหน่ง", "Enable Location")}
          </span>
          {weather && (
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "#34d399",
              boxShadow: "0 0 6px #34d399",
              animation: "ws-dot-pulse 2s ease-in-out infinite",
            }} />
          )}
          <style>{`
            @keyframes ws-dot-pulse {
              0%, 100% { opacity: 1; }
              50%      { opacity: 0.4; }
            }
          `}</style>
        </button>
      </div>
    </>
  );
}