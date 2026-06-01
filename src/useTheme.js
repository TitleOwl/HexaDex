import { useState, useEffect } from "react";

// Auto theme based on time of day
// 6:00-18:00 = light, 18:00-6:00 = dark
function getAutoTheme() {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 18 ? "light" : "dark";
}

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem("pkdx_theme");
      if (saved === "light" || saved === "dark") return saved;
      return getAutoTheme();
    } catch { return "light"; }
  });

  const [autoMode, setAutoMode] = useState(() => {
    try { return localStorage.getItem("pkdx_theme_auto") !== "false"; } catch { return true; }
  });

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Auto-update if in auto mode (check every minute)
  useEffect(() => {
    if (!autoMode) return;
    setTheme(getAutoTheme());
    const interval = setInterval(() => setTheme(getAutoTheme()), 60_000);
    return () => clearInterval(interval);
  }, [autoMode]);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    setAutoMode(false);
    try {
      localStorage.setItem("pkdx_theme", next);
      localStorage.setItem("pkdx_theme_auto", "false");
    } catch {}
  };

  const enableAuto = () => {
    setAutoMode(true);
    setTheme(getAutoTheme());
    try {
      localStorage.setItem("pkdx_theme_auto", "true");
      localStorage.removeItem("pkdx_theme");
    } catch {}
  };

  return { theme, toggleTheme, autoMode, enableAuto };
}
