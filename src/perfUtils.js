// ─── perfUtils.js — Performance & device-aware hooks ─────
// Helps prevent stutter by adapting to device capabilities,
// network speed, and user accessibility preferences.

import { useState, useEffect, useRef } from "react";

// ─── Detect prefers-reduced-motion ──────────────────────────
// Some users (vestibular disorders, motion sickness) disable
// animations system-wide. Respect that preference.
export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch { return false; }
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    let mq;
    try {
      mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    } catch { return; }
    const onChange = () => setReduced(mq.matches);
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener?.(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else mq.removeListener?.(onChange);
    };
  }, []);
  return reduced;
}

// ─── Detect mobile / narrow viewport ────────────────────────
// On mobile, we limit particle counts to prevent stutter.
export function useIsMobile(breakpoint = 768) {
  const [mobile, setMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.matchMedia(`(max-width: ${breakpoint}px)`).matches;
    } catch { return false; }
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    let mq;
    try {
      mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    } catch { return; }
    const onChange = () => setMobile(mq.matches);
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener?.(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else mq.removeListener?.(onChange);
    };
  }, [breakpoint]);
  return mobile;
}

// ─── Detect slow connection / data-saver mode ───────────────
// On 2G/slow-3G or Data Saver, we skip non-essential animations.
export function useSlowConnection() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!conn) return;
    const check = () => {
      const isSlow = conn.saveData === true
                   || conn.effectiveType === "slow-2g"
                   || conn.effectiveType === "2g";
      setSlow(isSlow);
    };
    check();
    try {
      conn.addEventListener?.("change", check);
      return () => conn.removeEventListener?.("change", check);
    } catch { /* unsupported */ }
  }, []);
  return slow;
}

// ─── Detect page visibility ─────────────────────────────────
// Pause animations / music / heavy work when user switches tabs.
export function usePageVisible() {
  const [visible, setVisible] = useState(() => {
    if (typeof document === "undefined") return true;
    return !document.hidden;
  });
  useEffect(() => {
    if (typeof document === "undefined") return;
    const onChange = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);
  return visible;
}

// ─── Combined: should we render expensive effects? ──────────
// Returns false if:
//   - User prefers reduced motion
//   - Tab is hidden (not visible)
//   - Slow / data-saver connection
export function useShouldAnimate() {
  const reduced = useReducedMotion();
  const slow    = useSlowConnection();
  const visible = usePageVisible();
  return visible && !reduced && !slow;
}

// ─── Debounce a fast-changing value ─────────────────────────
// Useful for resize handlers, search inputs, etc.
export function useDebounced(value, delay = 200) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const tid = setTimeout(() => setV(value), delay);
    return () => clearTimeout(tid);
  }, [value, delay]);
  return v;
}

// ─── Throttled rAF helper ───────────────────────────────────
// Use for high-frequency events (pointer move, scroll).
//   const rafThrottle = useRafThrottle();
//   onPointerMove = (e) => rafThrottle(() => doExpensiveWork(e));
export function useRafThrottle() {
  const pending = useRef(false);
  const cbRef = useRef(null);
  useEffect(() => () => {
    // Clean up on unmount (no pending callback to call)
    pending.current = false;
    cbRef.current = null;
  }, []);
  return (cb) => {
    cbRef.current = cb;
    if (pending.current) return;
    pending.current = true;
    requestAnimationFrame(() => {
      pending.current = false;
      if (cbRef.current) cbRef.current();
    });
  };
}

// ─── Modal lifecycle — dispatches global events ─────────────
// Call from any popup/modal component. WeatherStatus listens
// to these events to hide weather effects during overlays.
//   useModalLifecycle();   // → fires ui:modal:open / ui:modal:close
export function useModalLifecycle() {
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("ui:modal:open"));
    return () => window.dispatchEvent(new CustomEvent("ui:modal:close"));
  }, []);
}

// ─── PokeAPI artwork URL helper ─────────────────────────────
// Use across the app so the SAME image is loaded everywhere
// (browser caches it once → big bandwidth savings)
export function pokeApiArtwork(id) {
  if (!id) return null;
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

// ─── Match raid/egg/research Pokémon name → ID from allList ─
// Handles "Mega/Primal/Shadow/Alolan/Galarian/Hisuian/Paldean" prefixes,
// Mega X/Y suffix, parentheses, hyphens, special chars.
export function matchPokemonId(boss, allList) {
  if (!boss?.name || !Array.isArray(allList) || allList.length === 0) return null;

  const normalize = (s) => s.toLowerCase()
    .replace(/[\.\u2019']/g, "")          // periods, apostrophes
    .replace(/[♀♂]/g, "")                  // gender symbols
    .replace(/\s+/g, " ")
    .trim();

  const original = normalize(boss.name);
  const stripped = normalize(boss.name
    .replace(/^(mega |primal |shadow |alolan |galarian |hisuian |paldean )/i, "")
    .replace(/\s*\(.*?\)\s*/g, "")
    .replace(/\s+(x|y)$/i, "")  // Strip Mega X/Y suffix
  );

  // Try exact match against original or stripped
  for (const name of [stripped, original]) {
    const m = allList.find(p => normalize(p.name) === name);
    if (m) return m.id;
  }

  // Try first word match
  const firstWord = stripped.split(" ")[0];
  let m = allList.find(p => normalize(p.name) === firstWord);
  if (m) return m.id;

  // Try contains either way
  m = allList.find(p => {
    const pn = normalize(p.name);
    return pn.includes(firstWord) || firstWord.includes(pn);
  });
  if (m) return m.id;

  return null;
}

// ─── Match Pokemon object directly from a boss (returns full pokemon, not just id) ─
export function findPokemonInList(boss, allList) {
  const id = matchPokemonId(boss, allList);
  return id ? allList.find(p => p.id === id) : null;
}