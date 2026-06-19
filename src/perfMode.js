// ─── perfMode.js — Performance ("economy") mode control ──────
// Modes: "auto" (decide by device) | "lite" (force on) | "full" (force off)
// Applies the `perf-lite` class on <html>, which the CSS keys off of.

const KEY = "pkdx_perf";
export const PROMPTED_KEY = "pkdx_perf_prompted";

// Heuristic: heavy effects stutter on non-Apple GPUs and low-end devices.
export function autoDetectLite() {
  try {
    const ua = navigator.userAgent || "";
    const isApple = /Mac|iPhone|iPad|iPod/.test(navigator.platform || ua) && !/Windows/.test(ua);
    const lowCore = (navigator.hardwareConcurrency || 8) <= 4;
    const lowMem  = (navigator.deviceMemory || 8) <= 4;
    return !isApple || lowCore || lowMem;
  } catch { return false; }
}

// Stored preference (a ?perf= query param wins for the session, for testing).
export function getPerfMode() {
  try {
    const q = new URLSearchParams(location.search).get("perf");
    if (q === "lite" || q === "full" || q === "auto") return q;
    const v = localStorage.getItem(KEY);
    return v === "lite" || v === "full" ? v : "auto";
  } catch { return "auto"; }
}

export function isLiteActive(mode = getPerfMode()) {
  return mode === "lite" || (mode === "auto" && autoDetectLite());
}

// Toggle the <html> class to match the resolved mode.
export function applyPerfMode() {
  const lite = isLiteActive();
  try { document.documentElement.classList.toggle("perf-lite", lite); } catch {}
  return lite;
}

export function setPerfMode(mode) {
  try { localStorage.setItem(KEY, mode); } catch {}
  applyPerfMode();
  try { window.dispatchEvent(new CustomEvent("perfmode:change", { detail: { mode } })); } catch {}
}
