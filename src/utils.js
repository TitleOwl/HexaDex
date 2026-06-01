import { useState, useEffect, useRef } from "react";
import {
  TYPE_COLORS, TYPE_OFFENSE, ALL_TYPES, TYPE_SOUND,
  CRY_URL, CACHE_KEY, CACHE_TTL_MS,
} from "./data.js";

// ─── Type helpers ─────────────────────────────────────────────────────────────
export const typeColor = (t) => TYPE_COLORS[t] ?? "#888";
export const typeGlow  = (t) => `${typeColor(t)}55`;

export function statColor(v) {
  if (v >= 120) return "#22c55e";
  if (v >= 80)  return "#84cc16";
  if (v >= 50)  return "#eab308";
  if (v >= 30)  return "#f97316";
  return "#ef4444";
}

export const padId  = (id) => `#${String(id).padStart(4, "0")}`;
export const getArt = (p) =>
  p?.sprites?.other?.["official-artwork"]?.front_default ??
  p?.sprites?.front_default ?? null;

export function getLocalName(id, lang, thaiArr, jpArr) {
  if (lang === "th" && thaiArr) return thaiArr[id - 1] ?? null;
  if (lang === "ja" && jpArr)   return jpArr[id - 1]   ?? null;
  return null;
}

// ─── Evolution chain flatten ──────────────────────────────────────────────────
export function flattenEvo(chain) {
  const out = []; let node = chain;
  while (node) {
    const id = node.species.url.split("/").filter(Boolean).pop();
    out.push({ name: node.species.name, id: parseInt(id, 10) });
    node = node.evolves_to?.[0] ?? null;
  }
  return out;
}

// ─── Defensive matchup calculation ────────────────────────────────────────────
export function calcDefMatchups(types) {
  const defTypes = types.map((t) => t.type.name);
  return ALL_TYPES.map((attacker) => {
    let mult = 1;
    defTypes.forEach((def) => { mult *= TYPE_OFFENSE[attacker]?.[def] ?? 1; });
    return { type: attacker, mult };
  }).sort((a, b) => a.mult - b.mult);
}

// ─── Compact pokemon (strip unused fields to save cache space) ────────────────
export function compactPokemon(p) {
  return {
    id: p.id, name: p.name, height: p.height, weight: p.weight,
    base_experience: p.base_experience,
    types: p.types?.map((t) => ({ type: { name: t.type.name } })) ?? [],
    abilities: p.abilities ?? [],
    stats: p.stats ?? [],
    sprites: {
      front_default: p.sprites?.front_default, back_default: p.sprites?.back_default,
      front_shiny:   p.sprites?.front_shiny,   back_shiny:   p.sprites?.back_shiny,
      front_female:  p.sprites?.front_female,  back_female:  p.sprites?.back_female,
      other: { "official-artwork": {
        front_default: p.sprites?.other?.["official-artwork"]?.front_default,
      }},
    },
  };
}

// ─── Hooks ────────────────────────────────────────────────────────────────────
export function useDebouncedValue(value, delay) {
  const [dv, setDv] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return dv;
}

export function useModelViewerScript() {
  useEffect(() => {
    const ID = "pkdx-model-viewer-script";
    if (document.getElementById(ID)) return;
    const s = document.createElement("script");
    s.id   = ID;
    s.type = "module";
    s.src  = "https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js";
    document.head.appendChild(s);
  }, []);
}

// ─── Cache (localStorage with TTL) ────────────────────────────────────────────
export const cache = {
  get(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const { ts, data } = JSON.parse(raw);
      if (Date.now() - ts > CACHE_TTL_MS) { localStorage.removeItem(key); return null; }
      return data;
    } catch { return null; }
  },
  set(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
    } catch { try { localStorage.removeItem(CACHE_KEY); } catch {} }
  },
};

// ─── Audio: Cry + Type Sound ──────────────────────────────────────────────────
let _cryAudio = null;
let _soundEnabled = (() => {
  try { return localStorage.getItem("pkdx_sound") !== "off"; } catch { return true; }
})();

export function setSoundEnabled(on) {
  _soundEnabled = on;
  try { localStorage.setItem("pkdx_sound", on ? "on" : "off"); } catch {}
  if (!on && _cryAudio) { try { _cryAudio.pause(); } catch {} _cryAudio = null; }
}
export function isSoundEnabled() { return _soundEnabled; }

export function playCry(id, volume = 0.4) {
  if (!_soundEnabled) return;
  if (_cryAudio) { _cryAudio.pause(); _cryAudio = null; }
  _cryAudio = new Audio(CRY_URL.latest(id));
  _cryAudio.volume = volume;
  _cryAudio.play().catch(() => {
    _cryAudio = new Audio(CRY_URL.legacy(id));
    _cryAudio.volume = volume;
    _cryAudio.play().catch(() => {});
  });
}

let _audioCtx = null;
function getAudioCtx() {
  if (!_audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) _audioCtx = new AC();
  }
  return _audioCtx;
}

export function playTypeSound(type) {
  if (!_soundEnabled) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  const cfg = TYPE_SOUND[type] ?? TYPE_SOUND.normal;
  const t0 = ctx.currentTime;
  const dur = cfg.duration;

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0, t0);
  masterGain.gain.linearRampToValueAtTime(0.06, t0 + 0.15);
  masterGain.gain.linearRampToValueAtTime(0.04, t0 + dur * 0.5);
  masterGain.gain.linearRampToValueAtTime(0, t0 + dur);
  masterGain.connect(ctx.destination);

  const delay = ctx.createDelay();
  delay.delayTime.value = 0.18;
  const fb = ctx.createGain();
  fb.gain.value = 0.25;
  delay.connect(fb); fb.connect(delay); delay.connect(masterGain);

  cfg.freqs.forEach((f, i) => {
    const osc = ctx.createOscillator();
    osc.type = cfg.wave;
    osc.frequency.value = f;
    osc.detune.value = (i - 1) * 4;
    osc.connect(masterGain);
    osc.connect(delay);
    osc.start(t0 + i * 0.06);
    osc.stop(t0 + dur);
  });
}

// ─── Dynamic color extraction ─────────────────────────────────────────────────
const _colorCache = new Map();
export function extractDominantColor(imgUrl) {
  return new Promise((resolve) => {
    if (!imgUrl) return resolve(null);
    if (_colorCache.has(imgUrl)) return resolve(_colorCache.get(imgUrl));
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const W = 64, H = 64;
        canvas.width = W; canvas.height = H;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, W, H);
        const data = ctx.getImageData(0, 0, W, H).data;
        const buckets = {};
        for (let i = 0; i < data.length; i += 4) {
          const a = data[i+3]; if (a < 200) continue;
          const r = data[i], g = data[i+1], b = data[i+2];
          if (r > 240 && g > 240 && b > 240) continue;
          if (r < 20 && g < 20 && b < 20) continue;
          const key = `${Math.floor(r/24)*24},${Math.floor(g/24)*24},${Math.floor(b/24)*24}`;
          buckets[key] = (buckets[key] || 0) + 1;
        }
        const top = Object.entries(buckets).sort((a,b) => b[1] - a[1])[0];
        if (!top) return resolve(null);
        const [r,g,b] = top[0].split(",").map(Number);
        const result = { r, g, b };
        _colorCache.set(imgUrl, result);
        resolve(result);
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = imgUrl;
  });
}

export function useDynamicTheme(imgUrl) {
  const [accent, setAccent] = useState(null);
  useEffect(() => {
    let cancelled = false;
    setAccent(null);
    extractDominantColor(imgUrl).then(c => {
      if (!cancelled && c) setAccent(`rgb(${c.r}, ${c.g}, ${c.b})`);
    });
    return () => { cancelled = true; };
  }, [imgUrl]);
  return accent;
}

// ─── Daily Pokemon ID (deterministic by today's date) ─────────────────────────
export function getDailyPokemonId(maxId = 1025) {
  const now = new Date();
  let h = (now.getFullYear() * 10000) + ((now.getMonth() + 1) * 100) + now.getDate();
  h = ((h * 1103515245) + 12345) & 0x7fffffff;
  return (h % maxId) + 1;
}

// ─── Catch chance calculator (Pokemon GO style) ───────────────────────────────
// Returns a 0-100% chance based on base capture rate, ball multiplier, and berry boost
export function calculateCatchChance(captureRate, ballMult, berryBoost = 0) {
  if (!captureRate) captureRate = 100;
  // Base chance from capture_rate (0-255 from PokeAPI)
  const base = (captureRate / 255) * 100;
  // Apply ball multiplier
  const withBall = base * ballMult;
  // Apply berry boost
  const withBerry = withBall * (1 + berryBoost / 100);
  // Master ball auto-catches
  if (ballMult >= 255) return 100;
  return Math.min(100, Math.max(1, Math.round(withBerry)));
}
