import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  STRINGS, TYPE_NAMES_TH, TYPE_NAMES_JA, ALL_TYPES, TYPE_OFFENSE, TEAM_KEY,
} from "../data.js";
import { typeColor, getArt, getLocalName, padId, useDebouncedValue, calcDefMatchups } from "../utils.js";

// ─── localStorage keys ──────────────────────────────────────────────────────
const TEAM_MODE_KEY = "pkdx_team_mode_v2";
const TEAM_DATA_KEY = "pkdx_team_data_v2";

// ─── Pokémon GO Mechanics ───────────────────────────────────────────────────
function getLeague(cp) {
  if (cp <= 1500) return { name: "Great",  color: "#2e7eff", icon: "🔵" };
  if (cp <= 2500) return { name: "Ultra",  color: "#ffb015", icon: "🟡" };
  return { name: "Master", color: "#a855f7", icon: "🟣" };
}

// ─── Pokémon GO Appraise System ──────────────────────────────────────────────
function calcAppraise(ivAtk, ivDef, ivHp, lang = "en") {
  const total = ivAtk + ivDef + ivHp;
  const pct = (total / 45) * 100;
  let stars = 0;
  let label, color, gradient;

  if (total === 45) {
    stars = 3;
    label = lang === "th" ? "💯 ตำนาน!" : lang === "ja" ? "💯 100%!" : "💯 HUNDO!";
    color = "#dc2626";
    gradient = "linear-gradient(135deg, #facc15 0%, #ee1515 100%)";
  } else if (pct >= 82) {
    stars = 3;
    label = lang === "th" ? "🌟 ยอดเยี่ยม" : lang === "ja" ? "🌟 すごい" : "🌟 Wonder!";
    color = "#dc2626";
    gradient = "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)";
  } else if (pct >= 66) {
    stars = 2;
    label = lang === "th" ? "⭐ ดี" : lang === "ja" ? "⭐ よい" : "⭐ Great";
    color = "#f59e0b";
    gradient = "linear-gradient(135deg, #f97316 0%, #c2410c 100%)";
  } else if (pct >= 51) {
    stars = 1;
    label = lang === "th" ? "👍 พอใช้" : lang === "ja" ? "👍 普通" : "👍 Good";
    color = "#3b82f6";
    gradient = "linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)";
  } else {
    stars = 0;
    label = lang === "th" ? "📊 ทั่วไป" : lang === "ja" ? "📊 標準" : "📊 Standard";
    color = "#64748b";
    gradient = "linear-gradient(135deg, #94a3b8 0%, #475569 100%)";
  }

  const maxIV = Math.max(ivAtk, ivDef, ivHp);
  const bestStats = [];
  if (ivAtk === maxIV) bestStats.push(lang === "th" ? "โจมตี" : "Attack");
  if (ivDef === maxIV) bestStats.push(lang === "th" ? "ป้องกัน" : "Defense");
  if (ivHp === maxIV) bestStats.push("HP");

  let statTier;
  if (maxIV === 15) statTier = lang === "th" ? "ยอดเยี่ยม!" : "Wonderful!";
  else if (maxIV >= 13) statTier = lang === "th" ? "ดีเยี่ยม" : "Excellent";
  else if (maxIV >= 8) statTier = lang === "th" ? "ค่อนข้างดี" : "Trending up";
  else statTier = lang === "th" ? "ทั่วไป" : "Standard";

  return { stars, label, color, gradient, total, pct, bestStats, maxIV, statTier };
}

// ─── IV Bar (clickable + draggable) ─────────────────────────────────────────
function IVBar({ label, value, isBest, onChange }) {
  const isPerfect = value === 15;
  let tierColor = "#94a3b8";
  if (value === 15)      tierColor = "#dc2626";
  else if (value >= 13)  tierColor = "#f59e0b";
  else if (value >= 8)   tierColor = "#3b82f6";

  return (
    <div className={`iv-bar${isBest ? " best" : ""}${isPerfect ? " perfect" : ""}`}
      style={{ "--iv-color": tierColor }}>
      <div className="iv-bar-label">
        {isBest && <span className="iv-bar-crown">👑</span>}{label}
      </div>
      <div className="iv-bar-control">
        <div className="iv-bar-segments">
          {Array.from({ length: 15 }).map((_, i) => (
            <button key={i} type="button"
              className={`iv-segment${i < value ? " filled" : ""}`}
              onClick={() => onChange(i + 1)}
              aria-label={`Set ${label} IV to ${i + 1}`} />
          ))}
        </div>
        <input type="range" min="0" max="15" step="1" value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="iv-bar-slider" aria-label={`${label} IV`} />
      </div>
      <div className="iv-bar-val">
        <span className="iv-bar-num">{value}</span>
        <span className="iv-bar-max">/15</span>
        {isPerfect && <span className="iv-bar-sparkle">✨</span>}
      </div>
    </div>
  );
}

// ─── Appraise Display (3 stars + 3 IV bars) ─────────────────────────────────
function AppraiseDisplay({ ivAtk, ivDef, ivHp, onChange, lang }) {
  const apr = calcAppraise(ivAtk, ivDef, ivHp, lang);

  return (
    <div className="appraise-section">
      <div className="appraise-header" style={{ background: apr.gradient }}>
        <div className="appraise-stars-row">
          <div className="appraise-stars">
            {[1, 2, 3].map(i => (
              <span key={i} className={`appraise-star${i <= apr.stars ? " filled" : ""}`}>
                {i <= apr.stars ? "★" : "☆"}
              </span>
            ))}
          </div>
          <div className="appraise-label">{apr.label}</div>
        </div>
        <div className="appraise-total">
          {apr.total}/45 · <strong>{apr.pct.toFixed(0)}%</strong>
        </div>
      </div>

      <div className="appraise-bars">
        <IVBar label="ATK" value={ivAtk}
          isBest={apr.bestStats.some(s => s === "Attack" || s === "โจมตี")}
          onChange={(v) => onChange({ ivAtk: v })} />
        <IVBar label="DEF" value={ivDef}
          isBest={apr.bestStats.some(s => s === "Defense" || s === "ป้องกัน")}
          onChange={(v) => onChange({ ivDef: v })} />
        <IVBar label="HP" value={ivHp}
          isBest={apr.bestStats.includes("HP")}
          onChange={(v) => onChange({ ivHp: v })} />
      </div>

      {apr.maxIV >= 13 && (
        <div className="appraise-best-stat" style={{ background: apr.gradient }}>
          <span className="appraise-best-icon">🏆</span>
          <span className="appraise-best-text">
            <strong>{apr.bestStats.join(" / ")}</strong>: {apr.statTier}
          </span>
        </div>
      )}

      <div className="appraise-presets">
        <button className="appraise-preset appraise-preset-hundo"
          onClick={() => onChange({ ivAtk: 15, ivDef: 15, ivHp: 15 })}>💯 Hundo</button>
        <button className="appraise-preset"
          onClick={() => onChange({ ivAtk: 14, ivDef: 14, ivHp: 14 })}>🌟 3★</button>
        <button className="appraise-preset"
          onClick={() => onChange({ ivAtk: 11, ivDef: 11, ivHp: 11 })}>⭐ 2★</button>
        <button className="appraise-preset"
          onClick={() => onChange({ ivAtk: 7, ivDef: 7, ivHp: 7 })}>👍 1★</button>
        <button className="appraise-preset"
          onClick={() => onChange({
            ivAtk: Math.floor(Math.random() * 16),
            ivDef: Math.floor(Math.random() * 16),
            ivHp: Math.floor(Math.random() * 16),
          })}>🎲 Random</button>
      </div>
    </div>
  );
}

// ─── Stat label localization ────────────────────────────────────────────────
function statLabel(name, lang) {
  const map = lang === "th" ? {
    hp:"HP", attack:"โจมตี", defense:"ป้องกัน",
    "special-attack":"พิเศษ ATK", "special-defense":"พิเศษ DEF", speed:"ความเร็ว",
  } : lang === "ja" ? {
    hp:"HP", attack:"こうげき", defense:"ぼうぎょ",
    "special-attack":"とくこう", "special-defense":"とくぼう", speed:"すばやさ",
  } : {
    hp:"HP", attack:"ATK", defense:"DEF",
    "special-attack":"SP.A", "special-defense":"SP.D", speed:"SPD",
  };
  return map[name] ?? name;
}

const STAT_ORDER = ["hp","attack","defense","special-attack","special-defense","speed"];

// ─── Custom Stat Row (slider + number input) ────────────────────────────────
function CustomStatRow({ name, value, baseValue, onChange, lang }) {
  const isModified = value !== baseValue;

  let barColor;
  if (value >= 130) barColor = "linear-gradient(90deg, #16a34a, #22c55e)";
  else if (value >= 100) barColor = "linear-gradient(90deg, #0891b2, #06b6d4)";
  else if (value >= 70)  barColor = "linear-gradient(90deg, var(--blue), var(--cyan))";
  else if (value >= 40)  barColor = "linear-gradient(90deg, #94a3b8, #cbd5e1)";
  else                   barColor = "linear-gradient(90deg, #ef4444, #f87171)";

  return (
    <div className={`cs-row${isModified ? " modified" : ""}`}>
      <span className="cs-label">{statLabel(name, lang)}</span>
      <div className="cs-bar-control">
        <div className="cs-bar">
          <div className="cs-bar-fill"
            style={{ width: `${Math.min(100, (value / 200) * 100)}%`, background: barColor }} />
        </div>
        <input type="range" min="1" max="255" value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="cs-slider" />
      </div>
      <input type="number" min="1" max="255" value={value}
        onChange={(e) => {
          const v = parseInt(e.target.value);
          onChange(Math.max(1, Math.min(255, isNaN(v) ? 1 : v)));
        }}
        className="cs-num-input" />
    </div>
  );
}

// ─── Custom Stats Editor (full panel) ───────────────────────────────────────
function CustomStatsEditor({ pokemon, stats, onChange, onReset, isCustom, lang }) {
  const total = STAT_ORDER.reduce((s, n) => s + (stats[n] ?? 0), 0);
  const baseStats = useMemo(() => {
    const obj = {};
    pokemon.stats.forEach(s => { obj[s.stat.name] = s.base_stat; });
    return obj;
  }, [pokemon]);

  return (
    <div className="cs-panel">
      <div className="cs-panel-header">
        <span className="cs-panel-title">⚙️ {lang==="th"?"ปรับ Stats":"Customize"}</span>
        {isCustom && (
          <button className="cs-reset" onClick={onReset}>
            ↻ {lang==="th"?"คืนค่า":"Reset"}
          </button>
        )}
      </div>

      <div className="cs-list">
        {STAT_ORDER.map(name => (
          <CustomStatRow key={name} name={name}
            value={stats[name] ?? baseStats[name] ?? 0}
            baseValue={baseStats[name] ?? 0}
            onChange={(v) => onChange(name, v)}
            lang={lang} />
        ))}
      </div>

      <div className="cs-total">
        <span>BST</span>
        <strong>{total}</strong>
      </div>

      <div className="cs-presets">
        <button className="cs-preset"
          onClick={() => STAT_ORDER.forEach(n => onChange(n, 255))}>
          💯 Max
        </button>
        <button className="cs-preset"
          onClick={() => STAT_ORDER.forEach(n => onChange(n, baseStats[n] ?? 0))}>
          📊 Base
        </button>
        <button className="cs-preset"
          onClick={() => STAT_ORDER.forEach(n => onChange(n, Math.floor(Math.random() * 200) + 30))}>
          🎲 Random
        </button>
      </div>
    </div>
  );
}

// ─── Random team generation modes ───────────────────────────────────────────
const STARTERS = [1,4,7,152,155,158,252,255,258,387,390,393,495,498,501,650,653,656,722,725,728,810,813,816,906,909,912];
const LEGENDARY_IDS = [144,145,146,150,151,243,244,245,249,250,251,377,378,379,380,381,382,383,384,480,481,482,483,484,485,486,487,488,489,490,491,492,493,638,639,640,641,642,643,644,645,646,647,648,649,716,717,718,719,720,721,772,773,785,786,787,788,789,790,791,792,793,800,801,888,889,890,891,892,894,895,896,897,898,905,1001,1002,1003,1004,1007,1008];

const RTG_MODES = [
  { id:"balanced",   icon:"⚖️", en:"Balanced",   th:"สมดุล",      ja:"バランス",  desc_en:"Mixed types",        desc_th:"ผสมหลายธาตุ" },
  { id:"starters",   icon:"🌟", en:"Starters",   th:"สตาร์ทเตอร์",  ja:"御三家",    desc_en:"Gen 1-9 starters",   desc_th:"3 ตัวเริ่ม" },
  { id:"legendary",  icon:"👑", en:"Legendary",  th:"ตำนาน",      ja:"伝説",     desc_en:"Powerful legends",   desc_th:"โปเกม่อนตำนาน" },
  { id:"powerhouse", icon:"💥", en:"Powerhouse", th:"พลังสูง",    ja:"高火力",    desc_en:"BST 500+",          desc_th:"BST ≥ 500" },
  { id:"speedy",     icon:"⚡", en:"Speedy",     th:"ความเร็วสูง", ja:"スピード",   desc_en:"Speed 90+",         desc_th:"ความเร็ว ≥ 90" },
  { id:"tanky",      icon:"🛡️", en:"Tanky",      th:"อึดถึก",     ja:"耐久",     desc_en:"High defenses",     desc_th:"ป้องกันสูง" },
  { id:"chaos",      icon:"🎲", en:"Chaos",      th:"สุ่มล้วน",    ja:"ランダム",  desc_en:"Pure random",       desc_th:"สุ่มทั้งหมด" },
];

// ─── Random Menu Component ──────────────────────────────────────────────────
function RandomMenu({ onGenerate, generating, lang }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const modeLabel = (m) => lang === "th" ? m.th : lang === "ja" ? m.ja : m.en;
  const modeDesc = (m) => lang === "th" ? m.desc_th : m.desc_en;

  return (
    <div className="random-dropdown" ref={ref}>
      <button className="tb-action-btn primary random-btn-main"
        onClick={() => !generating && setOpen(o => !o)} disabled={generating}>
        {generating
          ? <>⏳ {lang==="th"?"กำลังสุ่ม...":"Generating..."}</>
          : <>🎲 {lang==="th"?"สุ่มทีม":lang==="ja"?"ランダム":"Random Team"}
              <span className="random-dropdown-arrow">{open ? "▴" : "▾"}</span></>}
      </button>
      {open && !generating && (
        <div className="random-menu" role="menu">
          {RTG_MODES.map(m => (
            <button key={m.id} className="random-menu-item"
              onClick={() => { onGenerate(m.id); setOpen(false); }}>
              <span className="random-menu-icon">{m.icon}</span>
              <span className="random-menu-text">
                <span className="random-menu-name">{modeLabel(m)}</span>
                <span className="random-menu-desc">{modeDesc(m)}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Team Analysis ──────────────────────────────────────────────────────────
function analyzeTeam(team) {
  const weak = {}, resist = {}, immune = {};
  team.forEach(p => {
    const mu = calcDefMatchups(p.types);
    mu.forEach(({ type, mult }) => {
      if (mult === 0) immune[type] = (immune[type] || 0) + 1;
      else if (mult >= 2) weak[type] = (weak[type] || 0) + 1;
      else if (mult <= 0.5) resist[type] = (resist[type] || 0) + 1;
    });
  });
  return { weak, resist, immune };
}

// ─── Pokemon Picker Modal ───────────────────────────────────────────────────
function PokemonPicker({ allWithMeta, thaiArr, jpArr, lang, onPick, onClose, title, excludeIds = [] }) {
  const s = STRINGS[lang];
  const [search, setSearch] = useState("");
  const debSearch = useDebouncedValue(search, 200);

  const results = useMemo(() => {
    const q = debSearch.toLowerCase().trim();
    if (!q) return allWithMeta.slice(0, 60);
    return allWithMeta.filter(p => {
      const th = (getLocalName(p.id, "th", thaiArr, jpArr) ?? "").toLowerCase();
      const ja = (getLocalName(p.id, "ja", thaiArr, jpArr) ?? "").toLowerCase();
      return p.name.toLowerCase().includes(q) || th.includes(q) || ja.includes(q) || String(p.id).includes(q);
    }).slice(0, 60);
  }, [debSearch, allWithMeta, thaiArr, jpArr]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal compare-picker" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-body">
          <h2 style={{ fontFamily:"var(--font-display)", color:"var(--blue-deep)", marginTop:0 }}>{title}</h2>
          <input className="team-add-search" placeholder={s.searchPlaceholder}
            value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
          <div className="team-add-grid">
            {results.map(p => {
              const name = getLocalName(p.id, lang, thaiArr, jpArr) ?? p.name;
              const img = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${p.id}.png`;
              const isExcluded = excludeIds.includes(p.id);
              return (
                <button key={p.id} className={`team-add-card${isExcluded ? " in-team" : ""}`}
                  disabled={isExcluded} onClick={() => !isExcluded && onPick(p)}>
                  <img src={img} alt={name} className="team-add-img" loading="lazy" />
                  <span className="team-add-num">#{String(p.id).padStart(4,"0")}</span>
                  <span className="team-add-name">{name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────
export default function TeamBuilder({ allList, thaiArr, jpArr, lang, cachedFetch }) {
  const s = STRINGS[lang];

  const [mode, setMode] = useState(() => {
    try { return localStorage.getItem(TEAM_MODE_KEY) ?? "go"; } catch { return "go"; }
  });
  useEffect(() => { try { localStorage.setItem(TEAM_MODE_KEY, mode); } catch {} }, [mode]);

  const [team, setTeam] = useState(() => {
    try { return JSON.parse(localStorage.getItem(TEAM_KEY) ?? "[]"); } catch { return []; }
  });
  useEffect(() => { try { localStorage.setItem(TEAM_KEY, JSON.stringify(team)); } catch {} }, [team]);

  // Per-Pokemon data: { cp, ivAtk, ivDef, ivHp, customStats }
  const [teamData, setTeamData] = useState(() => {
    try { return JSON.parse(localStorage.getItem(TEAM_DATA_KEY) ?? "{}"); } catch { return {}; }
  });
  useEffect(() => { try { localStorage.setItem(TEAM_DATA_KEY, JSON.stringify(teamData)); } catch {} }, [teamData]);

  const getData = useCallback((id) => teamData[id] ?? {}, [teamData]);

  // ─── Team size limit (GO mode = 3, Normal mode = 6) ──────────────────
  const maxTeamSize = mode === "go" ? 3 : 6;
  useEffect(() => {
    // Trim team if switching to a mode with smaller limit (e.g. normal→go)
    if (team.length > maxTeamSize) {
      setTeam(team.slice(0, maxTeamSize));
    }
  }, [mode, maxTeamSize]); // eslint-disable-line react-hooks/exhaustive-deps

  const getGoData = useCallback((id) => {
    const d = teamData[id] ?? {};
    return {
      cp: d.cp ?? 1500,
      ivAtk: d.ivAtk ?? 10,
      ivDef: d.ivDef ?? 10,
      ivHp: d.ivHp ?? 10,
    };
  }, [teamData]);

  const getCustomStats = useCallback((pokemon) => {
    const custom = teamData[pokemon.id]?.customStats;
    if (custom) return custom;
    const base = {};
    pokemon.stats.forEach(st => { base[st.stat.name] = st.base_stat; });
    return base;
  }, [teamData]);

  const isCustomized = useCallback((id) => !!teamData[id]?.customStats, [teamData]);

  const updateData = useCallback((id, updates) => {
    setTeamData(prev => ({ ...prev, [id]: { ...(prev[id] ?? {}), ...updates } }));
  }, []);

  const updateStat = useCallback((pokemon, statName, value) => {
    setTeamData(prev => {
      const existing = prev[pokemon.id] ?? {};
      const currentStats = existing.customStats ?? (() => {
        const obj = {};
        pokemon.stats.forEach(s => { obj[s.stat.name] = s.base_stat; });
        return obj;
      })();
      return {
        ...prev,
        [pokemon.id]: { ...existing, customStats: { ...currentStats, [statName]: value } }
      };
    });
  }, []);

  const resetStats = useCallback((id) => {
    setTeamData(prev => {
      const next = { ...prev };
      if (next[id]) {
        const { customStats, ...rest } = next[id];
        next[id] = rest;
      }
      return next;
    });
  }, []);

  // UI state
  const [picking, setPicking] = useState(false);
  const [pickingSlot, setPickingSlot] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [expandedCardId, setExpandedCardId] = useState(null);
  const [generating, setGenerating] = useState(false);

  const allWithMeta = useMemo(() => allList.map(p => {
    const id = parseInt(p.url.split("/").filter(Boolean).pop(), 10);
    return { name: p.name, url: p.url, id };
  }).filter(p => p.id && p.id <= 1025), [allList]);

  const teamAnalysis = useMemo(() => team.length > 0 ? analyzeTeam(team) : null, [team]);

  const teamCPOverview = useMemo(() => {
    if (mode !== "go" || team.length === 0) return null;
    const cps = team.map(p => getGoData(p.id).cp);
    const total = cps.reduce((a, b) => a + b, 0);
    const avg = Math.round(total / team.length);
    const allHundo = team.every(p => {
      const d = getGoData(p.id);
      return d.ivAtk === 15 && d.ivDef === 15 && d.ivHp === 15;
    });
    return { total, avg, league: getLeague(avg), allHundo };
  }, [team, teamData, mode, getGoData]);

  // Actions
  const addToTeam = useCallback(async (entry) => {
    const full = await cachedFetch(entry.url);
    if (pickingSlot !== null) {
      setTeam(prev => { const next = [...prev]; next[pickingSlot] = full; return next; });
      setPickingSlot(null);
    } else if (!team.some(p => p.id === full.id)) {
      setTeam(prev => [...prev, full]);
    }
    setPicking(false);
  }, [team, pickingSlot, cachedFetch]);

  const removeMember = (id) => {
    setTeam(team.filter(p => p.id !== id));
    setTeamData(prev => { const next = { ...prev }; delete next[id]; return next; });
  };

  const clearTeam = () => {
    if (window.confirm(lang==="th"?"ล้างทีม?":"Clear team?")) {
      setTeam([]); setTeamData({});
    }
  };

  // Auto-Generate
  const generateRandomTeam = async (modeId) => {
    setGenerating(true);
    const pickRandom = (pool, n) => [...pool].sort(() => Math.random() - 0.5).slice(0, n);
    const fetchById = async (id) => {
      const entry = allWithMeta.find(c => c.id === id);
      if (!entry) return null;
      try { return await cachedFetch(entry.url); } catch { return null; }
    };

    let result = [];
    try {
      if (modeId === "starters") {
        result = (await Promise.all(pickRandom(STARTERS, 6).map(fetchById))).filter(Boolean);
      } else if (modeId === "legendary") {
        result = (await Promise.all(pickRandom(LEGENDARY_IDS, 6).map(fetchById))).filter(Boolean);
      } else if (modeId === "chaos") {
        result = (await Promise.all(pickRandom(allWithMeta, 30).map(c => fetchById(c.id)))).filter(Boolean).slice(0, 6);
      } else if (modeId === "powerhouse") {
        const picks = pickRandom(allWithMeta, 50);
        const fetched = (await Promise.all(picks.map(c => fetchById(c.id)))).filter(Boolean);
        result = fetched.filter(p => p.stats.reduce((s, st) => s + st.base_stat, 0) >= 500).slice(0, 6);
      } else if (modeId === "speedy") {
        const picks = pickRandom(allWithMeta, 50);
        const fetched = (await Promise.all(picks.map(c => fetchById(c.id)))).filter(Boolean);
        result = fetched.filter(p => (p.stats.find(st => st.stat.name === "speed")?.base_stat ?? 0) >= 90).slice(0, 6);
      } else if (modeId === "tanky") {
        const picks = pickRandom(allWithMeta, 50);
        const fetched = (await Promise.all(picks.map(c => fetchById(c.id)))).filter(Boolean);
        result = fetched.filter(p => {
          const hp = p.stats.find(st => st.stat.name === "hp")?.base_stat ?? 0;
          const def = p.stats.find(st => st.stat.name === "defense")?.base_stat ?? 0;
          const spdef = p.stats.find(st => st.stat.name === "special-defense")?.base_stat ?? 0;
          return hp + def + spdef >= 300;
        }).slice(0, 6);
      } else {
        // balanced
        const picks = pickRandom(allWithMeta, 50);
        const fetched = (await Promise.all(picks.map(c => fetchById(c.id)))).filter(Boolean);
        const selected = fetched[0] ? [fetched[0]] : [];
        const usedTypes = new Set(fetched[0]?.types.map(t => t.type.name) ?? []);
        while (selected.length < maxTeamSize && fetched.length > selected.length) {
          let best = null, bestScore = -Infinity;
          for (const cand of fetched) {
            if (selected.includes(cand)) continue;
            const newTypes = cand.types.map(t => t.type.name).filter(t => !usedTypes.has(t)).length;
            if (newTypes > bestScore) { bestScore = newTypes; best = cand; }
          }
          if (best) { selected.push(best); best.types.forEach(t => usedTypes.add(t.type.name)); }
          else break;
        }
        result = selected;
      }

      if (result.length > 0) {
        setTeam(result);
        // In GO mode, seed random GO data
        if (mode === "go") {
          setTeamData(prev => {
            const next = { ...prev };
            result.forEach(p => {
              if (!next[p.id]) {
                next[p.id] = {
                  cp: 1000 + Math.floor(Math.random() * 1500),
                  ivAtk: Math.floor(Math.random() * 16),
                  ivDef: Math.floor(Math.random() * 16),
                  ivHp: Math.floor(Math.random() * 16),
                };
              }
            });
            return next;
          });
        }
      }
    } catch (e) {
      console.error(e);
    }
    setGenerating(false);
  };

  const typeName = (tn) =>
    lang==="th" ? (TYPE_NAMES_TH[tn]??tn) : lang==="ja" ? (TYPE_NAMES_JA[tn]??tn) : tn;

  return (
    <main className="grid-wrap team-builder-wrap team-page" data-tb-mode={mode} style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 20px" }}>
      <style>{`
        @keyframes tm-float { 0%,100%{transform:translateY(0) rotate(0)} 50%{transform:translateY(-8px) rotate(-3deg)} }
        .team-page .team-hero {
          background: linear-gradient(135deg, #0d9488 0%, #16a34a 50%, #65a30d 100%) !important;
          color: white !important;
          padding: 22px 24px !important;
          border-radius: 22px !important;
          margin-bottom: 22px !important;
          position: relative !important;
          overflow: hidden !important;
          box-shadow: 0 20px 50px rgba(13, 148, 136, 0.3), 0 0 0 1px rgba(255,255,255,0.08) inset !important;
        }
        .team-page .team-hero h1 {
          font-size: 26px !important; font-weight: 900 !important;
          margin: 0 0 4px 0 !important; letter-spacing: -0.02em !important;
          background: linear-gradient(135deg, #fff, #bbf7d0) !important;
          -webkit-background-clip: text !important; background-clip: text !important;
          -webkit-text-fill-color: transparent !important; color: transparent !important;
        }
        .team-page .team-hero p {
          font-size: 12px !important; color: rgba(187, 247, 208, 0.85) !important;
          font-weight: 600 !important; margin: 0 !important;
        }

        /* ═══════════════════════════════════════════════════════════ */
        /* Pokemon GO Style Card (.pgo-card) — Image 1 inspiration      */
        /* ═══════════════════════════════════════════════════════════ */
        @keyframes pgo-leaf-fall-1 {
          0%   { transform: translate(0, -10px) rotate(0deg); opacity: 0; }
          10%  { opacity: 0.5; }
          50%  { transform: translate(-12px, 50px) rotate(180deg); opacity: 0.7; }
          90%  { opacity: 0.4; }
          100% { transform: translate(0, 110px) rotate(360deg); opacity: 0; }
        }
        @keyframes pgo-leaf-fall-2 {
          0%   { transform: translate(0, -10px) rotate(0deg); opacity: 0; }
          10%  { opacity: 0.4; }
          50%  { transform: translate(15px, 60px) rotate(-180deg); opacity: 0.6; }
          90%  { opacity: 0.3; }
          100% { transform: translate(5px, 130px) rotate(-360deg); opacity: 0; }
        }
        @keyframes pgo-img-bob {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-6px); }
        }

        .pgo-card {
          position: relative !important;
          border: none !important;
          padding: 0 !important;
          overflow: hidden !important;
          border-radius: 22px !important;
          box-shadow: 0 14px 36px rgba(0,0,0,0.18), 0 0 0 1px rgba(255,255,255,0.08) inset !important;
          display: flex !important;
          flex-direction: column !important;
        }
        /* Stage (top half) - gradient based on type */
        .pgo-stage {
          position: relative;
          padding: 18px 14px 56px;
          min-height: 280px;
          overflow: hidden;
          /* gradient set inline via style={{}} for type tint */
        }
        .pgo-stage::before,
        .pgo-stage::after {
          content: "🍃";
          position: absolute;
          font-size: 22px;
          pointer-events: none;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
        }
        .pgo-stage::before {
          top: 60px; right: 12px;
          animation: pgo-leaf-fall-1 7s ease-in-out infinite;
        }
        .pgo-stage::after {
          content: "🍂";
          top: 100px; left: 18px;
          animation: pgo-leaf-fall-2 9s ease-in-out 1.5s infinite;
        }

        /* Remove/Swap buttons in stage */
        .pgo-card .go-card-remove,
        .pgo-card .go-card-swap {
          z-index: 5 !important;
          background: rgba(255,255,255,0.85) !important;
          backdrop-filter: blur(6px) !important;
          border: none !important;
          color: #1f2937 !important;
          font-weight: 800 !important;
          box-shadow: 0 4px 10px rgba(0,0,0,0.15) !important;
        }
        .pgo-card .go-card-remove {
          background: rgba(239, 68, 68, 0.9) !important;
          color: white !important;
        }

        /* CP big text at top */
        .pgo-cp-top {
          text-align: center;
          color: white;
          margin: 4px 0 14px;
          text-shadow: 0 2px 6px rgba(0,0,0,0.3);
          letter-spacing: 0.05em;
          position: relative;
          z-index: 2;
        }
        .pgo-cp-top-label {
          font-size: 13px;
          font-weight: 700;
          opacity: 0.95;
          letter-spacing: 0.18em;
        }
        .pgo-cp-top-value {
          font-size: 32px;
          font-weight: 900;
          letter-spacing: -0.02em;
          line-height: 1;
          margin-left: 6px;
        }

        /* Half-circle arc above pokemon */
        .pgo-arc {
          width: 80%;
          margin: 0 auto -28px;
          display: block;
          position: relative;
          z-index: 1;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.15));
        }

        /* Pokemon image floating */
        .pgo-card .go-card-img {
          background: transparent !important;
          border: none !important;
          padding: 0 !important;
          max-width: 65% !important;
          margin: 0 auto !important;
          filter: drop-shadow(0 10px 18px rgba(0,0,0,0.3)) !important;
          animation: pgo-img-bob 4s ease-in-out infinite !important;
          display: block !important;
          position: relative !important;
          z-index: 2 !important;
        }

        /* Types row centered */
        .pgo-card .go-card-types {
          justify-content: center !important;
          margin: 8px 0 0 !important;
          gap: 6px !important;
          position: relative !important;
          z-index: 3 !important;
        }
        .pgo-card .type-tag-mini {
          padding: 4px 12px !important;
          font-size: 10.5px !important;
          font-weight: 800 !important;
          letter-spacing: 0.05em !important;
          box-shadow: 0 3px 8px rgba(0,0,0,0.25) !important;
          border: 1.5px solid rgba(255,255,255,0.4) !important;
        }

        /* Info panel (bottom white card with rounded top) */
        .pgo-info-panel {
          background: white;
          margin-top: -20px;
          border-radius: 22px 22px 0 0;
          padding: 16px 14px 14px;
          position: relative;
          z-index: 4;
          box-shadow: 0 -4px 16px rgba(0,0,0,0.08);
        }
        :root[data-theme="dark"] .pgo-info-panel,
        [data-theme="dark"] .pgo-info-panel {
          background: #1f2937;
        }

        /* Name row */
        .pgo-name-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 10px;
        }
        .pgo-card .go-card-name {
          font-size: 22px !important;
          font-weight: 800 !important;
          color: #374151 !important;
          text-align: center !important;
          margin: 0 !important;
          letter-spacing: -0.01em !important;
        }
        :root[data-theme="dark"] .pgo-card .go-card-name,
        [data-theme="dark"] .pgo-card .go-card-name {
          color: #f3f4f6 !important;
        }
        .pgo-edit-pencil {
          font-size: 13px;
          opacity: 0.55;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.2s;
        }
        .pgo-edit-pencil:hover { opacity: 1; transform: rotate(15deg); }
        .pgo-card .go-card-id {
          font-size: 10.5px !important;
          font-weight: 700 !important;
          opacity: 0.55 !important;
          letter-spacing: 0.1em !important;
          text-align: center !important;
          margin: 0 0 12px !important;
        }

        /* IV bars override to ORANGE Pokemon GO theme */
        .pgo-card .iv-bar-segments .iv-bar-segment {
          background: rgba(0,0,0,0.06) !important;
        }
        .pgo-card .iv-bar-segments .iv-bar-segment.filled {
          background: linear-gradient(180deg, #fb923c 0%, #ea580c 100%) !important;
          box-shadow: 0 1px 2px rgba(234, 88, 12, 0.4) !important;
        }
        .pgo-card .iv-bar.best .iv-bar-segments .iv-bar-segment.filled {
          background: linear-gradient(180deg, #facc15 0%, #d97706 100%) !important;
          box-shadow: 0 1px 2px rgba(217, 119, 6, 0.4) !important;
        }
        .pgo-card .iv-bar.perfect .iv-bar-segments .iv-bar-segment.filled {
          background: linear-gradient(180deg, #fde047 0%, #facc15 100%) !important;
          box-shadow: 0 0 6px rgba(250, 204, 21, 0.6) !important;
        }
        .pgo-card .iv-bar-num {
          color: #ea580c !important;
          font-weight: 800 !important;
        }
        :root[data-theme="dark"] .pgo-card .iv-bar-num,
        [data-theme="dark"] .pgo-card .iv-bar-num {
          color: #fb923c !important;
        }
        .pgo-card .iv-bar-label {
          color: #6b7280 !important;
          font-weight: 700 !important;
        }
        :root[data-theme="dark"] .pgo-card .iv-bar-label,
        [data-theme="dark"] .pgo-card .iv-bar-label {
          color: #d1d5db !important;
        }

        /* Appraise header (stars row + rating) */
        .pgo-card .appraise-header {
          background: linear-gradient(135deg, #fb923c, #ea580c) !important;
          color: white !important;
          border: none !important;
          padding: 8px 12px !important;
          border-radius: 12px !important;
          margin-bottom: 10px !important;
          box-shadow: 0 3px 10px rgba(234, 88, 12, 0.3) !important;
        }
        .pgo-card .appraise-stars-row,
        .pgo-card .appraise-label,
        .pgo-card .appraise-total {
          color: white !important;
        }

        /* CP Input row — make it pill-shaped */
        .pgo-card .cp-input-row {
          background: linear-gradient(135deg, #fef9c3, #fef08a) !important;
          border: 2px solid #facc15 !important;
          border-radius: 999px !important;
          padding: 4px 8px !important;
          margin: 10px 0 !important;
        }
        :root[data-theme="dark"] .pgo-card .cp-input-row,
        [data-theme="dark"] .pgo-card .cp-input-row {
          background: linear-gradient(135deg, #422006, #713f12) !important;
        }
        .pgo-card .cp-input-label {
          color: #ca8a04 !important;
          font-weight: 800 !important;
        }
        .pgo-card .cp-input {
          color: #1f2937 !important;
          font-weight: 900 !important;
        }

        /* Customize Base Stats toggle */
        .pgo-card .card-edit-toggle {
          background: rgba(99, 102, 241, 0.08) !important;
          border: 1px dashed rgba(99, 102, 241, 0.35) !important;
          color: #4f46e5 !important;
          border-radius: 12px !important;
          padding: 8px 12px !important;
          margin: 8px 0 !important;
          font-weight: 700 !important;
          font-size: 12px !important;
        }
        :root[data-theme="dark"] .pgo-card .card-edit-toggle,
        [data-theme="dark"] .pgo-card .card-edit-toggle {
          color: #a5b4fc !important;
          background: rgba(99, 102, 241, 0.15) !important;
        }

        /* Details button (full width pill) */
        .pgo-card .go-card-action {
          width: 100% !important;
          background: linear-gradient(135deg, #6366f1, #4f46e5) !important;
          color: white !important;
          border: none !important;
          border-radius: 999px !important;
          padding: 10px 18px !important;
          font-weight: 800 !important;
          font-size: 13px !important;
          box-shadow: 0 6px 16px rgba(99, 102, 241, 0.35) !important;
          transition: all 0.2s !important;
        }
        .pgo-card .go-card-action:hover {
          transform: translateY(-2px) !important;
          box-shadow: 0 8px 22px rgba(99, 102, 241, 0.5) !important;
        }

        /* ═══════════════════════════════════════════════════════════ */
        /* CP Slider (in stage, replaces CP number input)              */
        /* ═══════════════════════════════════════════════════════════ */
        .pgo-cp-slider-wrap {
          position: relative;
          z-index: 3;
          padding: 0 8px;
          margin: 0 0 14px;
        }
        .pgo-cp-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 8px;
          border-radius: 999px;
          outline: none;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.15) inset;
        }
        .pgo-cp-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: white;
          border: 3px solid var(--league-color, #3b82f6);
          cursor: grab;
          box-shadow: 0 3px 10px rgba(0,0,0,0.3);
          transition: transform 0.15s;
        }
        .pgo-cp-slider::-webkit-slider-thumb:hover {
          transform: scale(1.15);
        }
        .pgo-cp-slider::-webkit-slider-thumb:active {
          cursor: grabbing;
          transform: scale(1.2);
        }
        .pgo-cp-slider::-moz-range-thumb {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: white;
          border: 3px solid var(--league-color, #3b82f6);
          cursor: grab;
          box-shadow: 0 3px 10px rgba(0,0,0,0.3);
          transition: transform 0.15s;
        }
        .pgo-cp-slider::-moz-range-thumb:hover {
          transform: scale(1.15);
        }
        .pgo-cp-slider-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 8px;
          gap: 8px;
        }
        .pgo-cp-slider-min,
        .pgo-cp-slider-max {
          font-size: 10px;
          font-weight: 700;
          color: rgba(255,255,255,0.85);
          letter-spacing: 0.05em;
          text-shadow: 0 1px 2px rgba(0,0,0,0.2);
        }
        .pgo-cp-league-pill {
          font-size: 11px;
          font-weight: 800;
          color: white;
          padding: 4px 12px;
          border-radius: 999px;
          box-shadow: 0 3px 10px rgba(0,0,0,0.25);
          letter-spacing: 0.02em;
          white-space: nowrap;
        }

        /* ═══════════════════════════════════════════════════════════ */
        /* IV Bars → Continuous Orange Bars (Pokemon GO image 2 style) */
        /* ═══════════════════════════════════════════════════════════ */
        /* Make all segments blend into one continuous bar */
        .pgo-card .iv-bar-segments {
          display: flex !important;
          gap: 0 !important;
          height: 12px !important;
          background: rgba(0,0,0,0.08) !important;
          border-radius: 999px !important;
          overflow: hidden !important;
          padding: 0 !important;
          border: none !important;
          position: relative !important;
          width: 100% !important;
        }
        :root[data-theme="dark"] .pgo-card .iv-bar-segments,
        [data-theme="dark"] .pgo-card .iv-bar-segments {
          background: rgba(255,255,255,0.08) !important;
        }
        /* Individual segment cells - blend together (no gaps, no borders) */
        .pgo-card .iv-bar-segments .iv-bar-segment {
          flex: 1 !important;
          background: transparent !important;
          border-radius: 0 !important;
          border: none !important;
          margin: 0 !important;
          padding: 0 !important;
          min-width: 0 !important;
          height: 100% !important;
          box-shadow: none !important;
        }
        /* Filled segments - solid orange gradient */
        .pgo-card .iv-bar-segments .iv-bar-segment.filled {
          background: linear-gradient(180deg, #fb923c 0%, #ea580c 100%) !important;
          border-radius: 0 !important;
        }
        /* Best stat - yellow-orange */
        .pgo-card .iv-bar.best .iv-bar-segments .iv-bar-segment.filled {
          background: linear-gradient(180deg, #facc15 0%, #d97706 100%) !important;
        }
        /* Perfect 15/15 - glowing yellow */
        .pgo-card .iv-bar.perfect .iv-bar-segments .iv-bar-segment.filled {
          background: linear-gradient(180deg, #fde047 0%, #facc15 100%) !important;
          box-shadow: 0 0 8px rgba(250, 204, 21, 0.6) !important;
        }

        /* Hide /15 number, crown emoji, sparkle (Pokemon GO doesn't show these) */
        .pgo-card .iv-bar-val,
        .pgo-card .iv-bar-crown,
        .pgo-card .iv-bar-sparkle {
          display: none !important;
        }

        /* Bar label (ATK/DEF/HP) - keep label clean and clear */
        .pgo-card .iv-bar-label {
          font-size: 11px !important;
          font-weight: 800 !important;
          letter-spacing: 0.08em !important;
          color: #6b7280 !important;
          min-width: 36px !important;
          padding: 0 !important;
        }
        :root[data-theme="dark"] .pgo-card .iv-bar-label,
        [data-theme="dark"] .pgo-card .iv-bar-label {
          color: #d1d5db !important;
        }

        /* Make iv-bar row tighter */
        .pgo-card .iv-bar {
          display: flex !important;
          align-items: center !important;
          gap: 10px !important;
          margin-bottom: 8px !important;
          padding: 0 !important;
          background: transparent !important;
          border: none !important;
        }
        .pgo-card .iv-bar-control {
          flex: 1 !important;
          position: relative !important;
        }
        /* Invisible slider on top for click+drag editing */
        .pgo-card .iv-bar-slider {
          position: absolute !important;
          inset: 0 !important;
          width: 100% !important;
          height: 100% !important;
          opacity: 0 !important;
          cursor: pointer !important;
          margin: 0 !important;
          z-index: 5 !important;
        }
      `}</style>
      <div className="team-hero">
        <div style={{ position: "absolute", top: 16, right: 24, fontSize: 48, opacity: 0.18,
                      animation: "tm-float 4s ease-in-out infinite", pointerEvents: "none" }}>⚔️</div>
        <h1>⚔️ {lang==="th"?"สร้างทีมโปเกม่อน":lang==="ja"?"チーム作成":"Build Your Team"}</h1>
        <p>
          {mode === "go"
            ? (lang==="th" ? "Pokémon GO Mode · กำหนด CP/IV · ระบบ Appraise · ปรับ Stats ได้"
              : lang==="ja" ? "Pokémon GO モード · CP/IV · 評価機能 · ステータス編集"
              : "Pokémon GO Mode · CP/IV · Appraise · Custom Stats")
            : (lang==="th" ? "Normal Mode · Stats พื้นฐาน · ปรับ Stats ได้"
              : lang==="ja" ? "通常モード · 基本ステータス · 編集可"
              : "Normal Mode · Base Stats · Editable Stats")}
        </p>
      </div>

      {/* MODE TOGGLE */}
      <div className="tb-mode-toggle">
        <button className={`tb-mode-btn tb-mode-normal${mode === "normal" ? " active" : ""}`}
          onClick={() => setMode("normal")}>
          <span className="tb-mode-icon">📋</span>
          <span className="tb-mode-text">
            <span className="tb-mode-title-text">{lang==="th"?"โหมดปกติ":"Normal Mode"}</span>
            <span className="tb-mode-desc">{lang==="th"?"Stats พื้นฐาน":"Base stats"}</span>
          </span>
        </button>
        <button className={`tb-mode-btn tb-mode-go${mode === "go" ? " active" : ""}`}
          onClick={() => setMode("go")}>
          <span className="tb-mode-icon">🎮</span>
          <span className="tb-mode-text">
            <span className="tb-mode-title-text">{lang==="th"?"โหมด Pokémon GO":"Pokémon GO Mode"}</span>
            <span className="tb-mode-desc">CP · IV · Appraise</span>
          </span>
        </button>
      </div>

      {/* ACTIONS BAR */}
      <div className="tb-actions-bar">
        <button className="tb-action-btn primary"
          onClick={() => { setPicking(true); setPickingSlot(null); }}
          disabled={team.length >= maxTeamSize}>
          ➕ {lang==="th"?"เพิ่ม Pokémon":"Add Pokémon"} ({team.length}/{maxTeamSize})
        </button>
        <RandomMenu onGenerate={generateRandomTeam} generating={generating} lang={lang} />
        {team.length > 0 && (
          <button className="tb-action-btn ghost" onClick={clearTeam}>
            🗑 {lang==="th"?"ล้างทีม":"Clear"}
          </button>
        )}
      </div>

      {/* CP OVERVIEW — GO MODE ONLY */}
      {mode === "go" && team.length > 0 && teamCPOverview && (
        <div className="go-team-overview">
          <div className="go-overview-item">
            <span className="go-overview-label">{lang==="th"?"ทีม":"Team"}</span>
            <span className="go-overview-val">{team.length}/{maxTeamSize}</span>
          </div>
          <div className="go-overview-item">
            <span className="go-overview-label">Total CP</span>
            <span className="go-overview-val">{teamCPOverview.total.toLocaleString()}</span>
          </div>
          <div className="go-overview-item">
            <span className="go-overview-label">Avg CP</span>
            <span className="go-overview-val">{teamCPOverview.avg.toLocaleString()}</span>
          </div>
          <div className="go-overview-item go-league" style={{ borderColor: teamCPOverview.league.color }}>
            <span className="go-overview-label">League</span>
            <span className="go-overview-val" style={{ color: teamCPOverview.league.color }}>
              {teamCPOverview.league.icon} {teamCPOverview.league.name}
            </span>
          </div>
        </div>
      )}

      {teamCPOverview?.allHundo && (
        <div className="go-team-hundo-banner">
          💯🌟💯 {lang==="th"?"ทีม HUNDO ทั้งทีม!":"All HUNDO team!"} 💯🌟💯
        </div>
      )}

      {/* EMPTY STATE */}
      {team.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">⚔️</span>
          <div className="empty-title">{lang==="th"?"ทีมว่าง":"Empty team"}</div>
          <div className="empty-sub">
            {lang==="th"?"กดเพิ่ม Pokémon หรือสุ่มทีมเพื่อเริ่มต้น":"Add Pokémon or generate a random team"}
          </div>
        </div>
      ) : (
        <>
          {/* TEAM GRID */}
          <div className={`go-team-grid${mode === "go" ? " mode-go" : " mode-normal"}`}>
            {team.map((p, i) => {
              const color = typeColor(p.types[0]?.type.name);
              const name = getLocalName(p.id, lang, thaiArr, jpArr) ?? p.name;
              const customStats = getCustomStats(p);
              const isExpanded = expandedCardId === p.id;

              if (mode === "go") {
                const data = getGoData(p.id);
                const league = getLeague(data.cp);

                // Pokemon GO style: gradient based on first type + green tint at top
                const t1Color = typeColor(p.types[0]?.type.name);
                const t2Color = typeColor(p.types[1]?.type.name || p.types[0]?.type.name);
                const stageGradient =
                  `linear-gradient(180deg, ${t1Color}f0 0%, ${t2Color}c8 55%, ${t1Color}88 100%)`;

                return (
                  <div key={p.id} className="go-card go-card-go pgo-card">
                    {/* ─── STAGE: gradient background + pokemon + CP + types ─── */}
                    <div className="pgo-stage" style={{ background: stageGradient }}>
                      <button className="go-card-remove" onClick={() => removeMember(p.id)}>✕</button>
                      <button className="go-card-swap"
                        onClick={() => { setPicking(true); setPickingSlot(i); }}>🔄</button>

                      {/* CP big at top */}
                      <div className="pgo-cp-top">
                        <span className="pgo-cp-top-label">CP</span>
                        <span className="pgo-cp-top-value">{data.cp}</span>
                      </div>

                      {/* CP slider — drag to change CP (10-4000) */}
                      <div className="pgo-cp-slider-wrap">
                        <input
                          type="range"
                          min="10"
                          max="4000"
                          step="10"
                          value={data.cp}
                          onChange={(e) => updateData(p.id, { cp: parseInt(e.target.value) })}
                          className="pgo-cp-slider"
                          style={{
                            background: `linear-gradient(to right, ${league.color} 0%, ${league.color} ${(data.cp / 4000) * 100}%, rgba(255,255,255,0.25) ${(data.cp / 4000) * 100}%, rgba(255,255,255,0.25) 100%)`,
                            "--league-color": league.color,
                          }}
                        />
                        <div className="pgo-cp-slider-info">
                          <span className="pgo-cp-slider-min">10</span>
                          <span
                            className="pgo-cp-league-pill"
                            style={{
                              background: `linear-gradient(135deg, ${league.color}, ${league.color}cc)`,
                            }}
                          >
                            {league.icon} {league.name}
                          </span>
                          <span className="pgo-cp-slider-max">4000</span>
                        </div>
                      </div>

                      {/* Decorative half-arc above pokemon */}
                      <svg className="pgo-arc" viewBox="0 0 200 60" preserveAspectRatio="none">
                        <path d="M 6 56 A 94 94 0 0 1 194 56"
                          stroke="rgba(255,255,255,0.85)" strokeWidth="3"
                          fill="none" strokeLinecap="round" />
                        <circle cx="194" cy="56" r="4.5" fill="white" />
                      </svg>

                      <img src={getArt(p)} alt={name} className="go-card-img" />

                      <div className="go-card-types">
                        {p.types.map(t => (
                          <span key={t.type.name} className="type-tag-mini"
                            style={{ background: typeColor(t.type.name) }}>
                            {typeName(t.type.name)}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* ─── INFO PANEL: white rounded-top with all controls ─── */}
                    <div className="pgo-info-panel">
                      <div className="pgo-name-row">
                        <div className="go-card-name">{name}</div>
                        <span className="pgo-edit-pencil" title="Edit"
                          onClick={() => setExpandedCardId(isExpanded ? null : p.id)}>✏️</span>
                      </div>
                      <div className="go-card-id">#{padId(p.id)}</div>

                      {/* IV bars (Appraise) — now orange themed */}
                      <AppraiseDisplay
                        ivAtk={data.ivAtk} ivDef={data.ivDef} ivHp={data.ivHp}
                        onChange={(updates) => updateData(p.id, updates)}
                        lang={lang} />

                      {/* Customize Stats toggle */}
                      <button className="card-edit-toggle"
                        onClick={() => setExpandedCardId(isExpanded ? null : p.id)}>
                        {isExpanded ? "▴ " : "▾ "}
                        ⚙️ {lang==="th"?"ปรับ Stats พื้นฐาน":"Customize Base Stats"}
                        {isCustomized(p.id) && <span className="card-edit-badge">●</span>}
                      </button>

                      {isExpanded && (
                        <CustomStatsEditor
                          pokemon={p} stats={customStats}
                          onChange={(name, val) => updateStat(p, name, val)}
                          onReset={() => resetStats(p.id)}
                          isCustom={isCustomized(p.id)} lang={lang} />
                      )}

                      <button className="go-card-action" onClick={() => setSelectedMember(p)}>
                        📊 {lang==="th"?"รายละเอียด":"Details"}
                      </button>
                    </div>
                  </div>
                );
              }

              // NORMAL MODE CARD — no CP, just editable base stats
              return (
                <div key={p.id} className="go-card go-card-normal" style={{ borderColor: color }}>
                  <button className="go-card-remove" onClick={() => removeMember(p.id)}>✕</button>
                  <button className="go-card-swap"
                    onClick={() => { setPicking(true); setPickingSlot(i); }}>🔄</button>

                  <img src={getArt(p)} alt={name} className="go-card-img" />
                  <div className="go-card-name">{name}</div>
                  <div className="go-card-id">#{padId(p.id)}</div>
                  <div className="go-card-types">
                    {p.types.map(t => (
                      <span key={t.type.name} className="type-tag-mini"
                        style={{ background: typeColor(t.type.name) }}>
                        {typeName(t.type.name)}
                      </span>
                    ))}
                  </div>

                  {/* Editable Stats (always shown in normal mode) */}
                  <CustomStatsEditor
                    pokemon={p} stats={customStats}
                    onChange={(name, val) => updateStat(p, name, val)}
                    onReset={() => resetStats(p.id)}
                    isCustom={isCustomized(p.id)} lang={lang} />

                  <button className="go-card-action" onClick={() => setSelectedMember(p)}>
                    📊 {lang==="th"?"รายละเอียด":"Details"}
                  </button>
                </div>
              );
            })}

            {team.length < maxTeamSize && (
              <div className="go-card empty-slot"
                onClick={() => { setPicking(true); setPickingSlot(null); }}>
                <span style={{ fontSize: 44, opacity: 0.4 }}>➕</span>
                <span style={{ fontWeight: 800, fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
                  Slot {team.length + 1}
                </span>
              </div>
            )}
          </div>

          {/* TEAM ANALYSIS */}
          {teamAnalysis && (
            <div className="go-analysis">
              <div className="go-analysis-block">
                <div className="go-analysis-title">⚠️ {lang==="th"?"จุดอ่อนร่วม":"Shared Weaknesses"}</div>
                <div className="go-analysis-types">
                  {Object.entries(teamAnalysis.weak)
                    .filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]).slice(0, 6)
                    .map(([type, count]) => (
                      <span key={type} className="go-analysis-pill"
                        style={{ background: typeColor(type) }}>
                        {typeName(type)} ×{count}
                      </span>
                    ))}
                  {Object.entries(teamAnalysis.weak).filter(([, c]) => c >= 2).length === 0 && (
                    <span className="go-analysis-good">✅ {lang==="th"?"ไม่มีจุดอ่อนร่วม!":"No shared weaknesses!"}</span>
                  )}
                </div>
              </div>
              <div className="go-analysis-block">
                <div className="go-analysis-title">🛡️ {lang==="th"?"ต้านธาตุ":"Team Resists"}</div>
                <div className="go-analysis-types">
                  {Object.entries(teamAnalysis.resist)
                    .filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]).slice(0, 6)
                    .map(([type, count]) => (
                      <span key={type} className="go-analysis-pill"
                        style={{ background: typeColor(type) }}>
                        {typeName(type)} ×{count}
                      </span>
                    ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* MODALS */}
      {picking && (
        <PokemonPicker allWithMeta={allWithMeta} thaiArr={thaiArr} jpArr={jpArr} lang={lang}
          onPick={addToTeam} onClose={() => { setPicking(false); setPickingSlot(null); }}
          excludeIds={pickingSlot === null ? team.map(p => p.id) : []}
          title={lang==="th"?"เลือก Pokémon":"Select Pokémon"} />
      )}

      {selectedMember && (
        <div className="modal-overlay" onClick={() => setSelectedMember(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <button className="modal-close" onClick={() => setSelectedMember(null)}>✕</button>
            <div className="modal-body">
              {(() => {
                const p = selectedMember;
                const name = getLocalName(p.id, lang, thaiArr, jpArr) ?? p.name;
                return (
                  <>
                    <h2 style={{ fontFamily:"var(--font-display)", color:"var(--blue-deep)", marginTop:0 }}>{name}</h2>
                    <div style={{ textAlign: "center" }}>
                      <img src={getArt(p)} alt={name} style={{ width: 180, height: 180 }} />
                    </div>
                    <div className="go-card-types" style={{ justifyContent: "center", marginBottom: 14 }}>
                      {p.types.map(t => (
                        <span key={t.type.name} className="modal-type-tag"
                          style={{ background: typeColor(t.type.name) }}>{typeName(t.type.name)}</span>
                      ))}
                    </div>
                    <div className="go-detail-stats">
                      {p.stats.map(st => (
                        <div key={st.stat.name} className="go-detail-stat">
                          <span>{statLabel(st.stat.name, lang)}</span>
                          <strong>{st.base_stat}</strong>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}