// ─── Weather Hook — fetches current weather using Geolocation + Open-Meteo ──
// Open-Meteo: free, no API key required.
// Geolocation: browser API, requires user permission.
//
// Usage:
//   const { weather, loading, error, permissionState, requestLocation, refresh }
//     = useWeather();
//   if (weather) console.log(weather.condition, weather.temp);

import { useState, useEffect, useCallback } from "react";

const CACHE_KEY = "pkdx_weather_cache_v1";
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// ─── WMO Weather Code → simplified condition ──────────────
// https://open-meteo.com/en/docs (Weather variable documentation → WMO codes)
export function getWeatherCondition(code) {
  if (code === 0) return "clear";
  if (code === 1) return "mostly-clear";
  if (code === 2) return "partly-cloudy";
  if (code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 57) return "drizzle";
  if (code >= 61 && code <= 67) return "rain";
  if (code >= 71 && code <= 77) return "snow";
  if (code >= 80 && code <= 82) return "rain";
  if (code === 85 || code === 86) return "snow";
  if (code >= 95 && code <= 99) return "thunderstorm";
  return "unknown";
}

// ─── Display info per condition (emoji, label, theme color) ─
export function getConditionInfo(condition) {
  const info = {
    "clear":         { emoji: "☀️",  label: { en: "Clear",         th: "ท้องฟ้าโปร่ง",   ja: "晴れ" },        color: "#fbbf24" },
    "mostly-clear":  { emoji: "🌤️", label: { en: "Mostly Clear",  th: "ค่อนข้างโปร่ง",  ja: "ほぼ晴れ" },    color: "#fcd34d" },
    "partly-cloudy": { emoji: "⛅",  label: { en: "Partly Cloudy", th: "เมฆเป็นบางส่วน", ja: "晴れ時々曇り" }, color: "#a3b3c8" },
    "cloudy":        { emoji: "☁️",  label: { en: "Cloudy",        th: "เมฆครึ้ม",     ja: "曇り" },        color: "#94a3b8" },
    "fog":           { emoji: "🌫️", label: { en: "Foggy",         th: "หมอกลง",       ja: "霧" },         color: "#cbd5e1" },
    "drizzle":       { emoji: "🌦️", label: { en: "Drizzle",       th: "ฝนปรอย",      ja: "霧雨" },        color: "#7dd3fc" },
    "rain":          { emoji: "🌧️", label: { en: "Rain",          th: "ฝนตก",         ja: "雨" },         color: "#3b82f6" },
    "snow":          { emoji: "❄️",  label: { en: "Snow",          th: "หิมะตก",       ja: "雪" },         color: "#bae6fd" },
    "thunderstorm":  { emoji: "⛈️", label: { en: "Thunderstorm",  th: "ฟ้าคะนอง",     ja: "雷雨" },        color: "#6366f1" },
    "unknown":       { emoji: "🌍",  label: { en: "Unknown",       th: "ไม่ทราบ",      ja: "不明" },        color: "#64748b" },
  };
  return info[condition] || info["unknown"];
}

export function useWeather() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [permissionState, setPermissionState] = useState("prompt"); // "granted" | "denied" | "prompt"

  // ─── Fetch weather from Open-Meteo (with timeout + abort) ──
  const fetchWeather = useCallback(async (latitude, longitude) => {
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
        `&current=temperature_2m,weather_code,is_day,precipitation,cloud_cover,wind_speed_10m` +
        `&timezone=auto`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(`Weather API error: ${res.status}`);
      const data = await res.json();
      const cw = data.current;
      const result = {
        code:          cw.weather_code,
        condition:     getWeatherCondition(cw.weather_code),
        temp:          Math.round(cw.temperature_2m),
        isDay:         cw.is_day === 1,
        precipitation: cw.precipitation ?? 0,
        cloudCover:    cw.cloud_cover ?? 0,
        wind:          cw.wind_speed_10m ?? 0,
        latitude,
        longitude,
        timestamp:     Date.now(),
      };
      setWeather(result);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(result));
      } catch {}
      setLoading(false);
      return result;
    } catch (e) {
      clearTimeout(timeoutId);
      if (e.name === "AbortError") {
        setError("Weather request timed out");
      } else {
        setError(e.message || "Failed to fetch weather");
      }
      setLoading(false);
      return null;
    }
  }, []);

  // ─── Get user's location → fetch weather ──────────────────
  const requestLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setError("Geolocation not supported");
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPermissionState("granted");
        fetchWeather(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        if (err.code === 1) setPermissionState("denied"); // PERMISSION_DENIED
        setError(err.message || "Location access failed");
        setLoading(false);
      },
      { timeout: 10000, maximumAge: 30 * 60 * 1000, enableHighAccuracy: false }
    );
  }, [fetchWeather]);

  // ─── Load from cache on mount ────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return;
      const cached = JSON.parse(raw);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        setWeather(cached);
      }
    } catch {}
  }, []);

  // ─── Check geolocation permission on mount ───────────────
  useEffect(() => {
    if (!("permissions" in navigator)) return;
    navigator.permissions.query({ name: "geolocation" })
      .then(result => {
        setPermissionState(result.state);
        // Listen for permission changes
        result.onchange = () => setPermissionState(result.state);
      })
      .catch(() => {});
  }, []);

  // ─── Auto-refresh every 30 min if weather is loaded ──────
  useEffect(() => {
    if (!weather) return;
    const tid = setInterval(() => {
      fetchWeather(weather.latitude, weather.longitude);
    }, CACHE_TTL);
    return () => clearInterval(tid);
  }, [weather?.latitude, weather?.longitude, fetchWeather]);

  return {
    weather,
    loading,
    error,
    permissionState,
    requestLocation,
    refresh: () => weather && fetchWeather(weather.latitude, weather.longitude),
  };
}
