import { useState, useEffect } from "react";

// Auto theme based on time of day: 6:00-18:00 light, 18:00-6:00 dark.
//
// It is no longer the default. Following the clock meant the site changed
// appearance on its own between visits, which reads as a bug rather than a
// feature — light is the design the app was built and reviewed in, so that is
// what a first visit gets. Auto is still available; it just has to be asked
// for, and once asked for it is remembered.
function getAutoTheme() {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 18 ? "light" : "dark";
}

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem("pkdx_theme");
      if (saved === "light" || saved === "dark") return saved;
      // Auto only decides the opening theme for someone who turned it on.
      if (localStorage.getItem("pkdx_theme_auto") === "true") return getAutoTheme();
      return "light";
    } catch { return "light"; }
  });

  const [autoMode, setAutoMode] = useState(() => {
    try { return localStorage.getItem("pkdx_theme_auto") === "true"; } catch { return false; }
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
