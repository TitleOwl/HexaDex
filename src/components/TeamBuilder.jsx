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

// ─── Pokémon GO IV Bar (clean 3-row appraise style) ──────────────────────────
function IVBar({ label, value, onChange }) {
  const pct = Math.max(0, Math.min(100, (value / 15) * 100));

  return (
    <div className="pgo-iv-row">
      <div className="pgo-iv-label">{label}</div>

      <div className="pgo-iv-bar-wrap">
        <div className="pgo-iv-track">
          <div className="pgo-iv-fill" style={{ width: `${pct}%` }} />
          <span className="pgo-iv-cut c1" />
          <span className="pgo-iv-cut c2" />
        </div>

        <input
          type="range"
          min="0"
          max="15"
          step="1"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          className="pgo-iv-slider"
          aria-label={`${label} IV`}
        />
      </div>
    </div>
  );
}

// ─── Appraise Display (stars + ATK/DEF/HP only) ─────────────────────────────
function AppraiseDisplay({ ivAtk, ivDef, ivHp, onChange, lang }) {
  const apr = calcAppraise(ivAtk, ivDef, ivHp, lang);
  return (
    <div className="pgo-appraise-card">
      <div className="pgo-appraise-top">
        <div className="pgo-appraise-medal">
          {[1, 2, 3].map(i => (
            <span key={i} className={`pgo-medal-star${i <= apr.stars ? " filled" : ""}`}>
              ★
            </span>
          ))}
        </div>

        <div className="pgo-appraise-summary">
          <div className="pgo-appraise-stars">
            {[1, 2, 3].map(i => (
              <span key={i} className={`pgo-star${i <= apr.stars ? " filled" : ""}`}>
                ★
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="pgo-appraise-bars">
        <IVBar label="ATK" value={ivAtk} onChange={(v) => onChange({ ivAtk: v })} />
        <IVBar label="DEF" value={ivDef} onChange={(v) => onChange({ ivDef: v })} />
        <IVBar label="HP"  value={ivHp}  onChange={(v) => onChange({ ivHp: v })} />
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
    // Trim team using functional setState (avoids stale closure)
    setTeam(prev => prev.length > maxTeamSize ? prev.slice(0, maxTeamSize) : prev);
  }, [mode, maxTeamSize]);

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
      setTeam(prev => {
        const next = [...prev].slice(0, maxTeamSize);
        next[pickingSlot] = full;
        return next.slice(0, maxTeamSize);
      });
      setPickingSlot(null);
    } else if (!team.some(p => p.id === full.id) && team.length < maxTeamSize) {
      setTeam(prev => [...prev, full].slice(0, maxTeamSize));
    }
    setPicking(false);
  }, [team, pickingSlot, cachedFetch, maxTeamSize]);

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
        result = (await Promise.all(pickRandom(STARTERS, maxTeamSize).map(fetchById))).filter(Boolean);
      } else if (modeId === "legendary") {
        result = (await Promise.all(pickRandom(LEGENDARY_IDS, maxTeamSize).map(fetchById))).filter(Boolean);
      } else if (modeId === "chaos") {
        result = (await Promise.all(pickRandom(allWithMeta, 30).map(c => fetchById(c.id)))).filter(Boolean).slice(0, maxTeamSize);
      } else if (modeId === "powerhouse") {
        const picks = pickRandom(allWithMeta, 50);
        const fetched = (await Promise.all(picks.map(c => fetchById(c.id)))).filter(Boolean);
        result = fetched.filter(p => p.stats.reduce((s, st) => s + st.base_stat, 0) >= 500).slice(0, maxTeamSize);
      } else if (modeId === "speedy") {
        const picks = pickRandom(allWithMeta, 50);
        const fetched = (await Promise.all(picks.map(c => fetchById(c.id)))).filter(Boolean);
        result = fetched.filter(p => (p.stats.find(st => st.stat.name === "speed")?.base_stat ?? 0) >= 90).slice(0, maxTeamSize);
      } else if (modeId === "tanky") {
        const picks = pickRandom(allWithMeta, 50);
        const fetched = (await Promise.all(picks.map(c => fetchById(c.id)))).filter(Boolean);
        result = fetched.filter(p => {
          const hp = p.stats.find(st => st.stat.name === "hp")?.base_stat ?? 0;
          const def = p.stats.find(st => st.stat.name === "defense")?.base_stat ?? 0;
          const spdef = p.stats.find(st => st.stat.name === "special-defense")?.base_stat ?? 0;
          return hp + def + spdef >= 300;
        }).slice(0, maxTeamSize);
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
        setTeam(result.slice(0, maxTeamSize));
        // In GO mode, seed random GO data
        // FIX: Always ensure cp/iv* are defined (don't skip if Pokemon has partial data)
        if (mode === "go") {
          setTeamData(prev => {
            const next = { ...prev };
            result.slice(0, maxTeamSize).forEach(p => {
              const cur = next[p.id] ?? {};
              next[p.id] = {
                ...cur,
                cp: cur.cp ?? (1000 + Math.floor(Math.random() * 1500)),
                ivAtk: cur.ivAtk ?? Math.floor(Math.random() * 16),
                ivDef: cur.ivDef ?? Math.floor(Math.random() * 16),
                ivHp: cur.ivHp ?? Math.floor(Math.random() * 16),
              };
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
        /* ─── Design Tokens (scoped to .team-page) ───────────────────────── */
        .team-page {
          --tb-ease: cubic-bezier(0.16, 1, 0.3, 1);
          --tb-ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
          --tb-radius-sm: 14px;
          --tb-radius-md: 20px;
          --tb-radius-lg: 28px;
          --tb-shadow-sm: 0 2px 8px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04);
          --tb-shadow-md: 0 12px 30px rgba(15, 23, 42, 0.12), 0 4px 10px rgba(15, 23, 42, 0.06);
          --tb-shadow-lg: 0 24px 60px rgba(15, 23, 42, 0.18), 0 8px 20px rgba(15, 23, 42, 0.08);
          --tb-shadow-glow-indigo: 0 0 40px rgba(99, 102, 241, 0.35);
          --tb-shadow-glow-orange: 0 0 40px rgba(251, 146, 60, 0.35);
        }
        
        /* ─── Keyframes ──────────────────────────────────────────────────── */
        @keyframes tb-float-soft {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50%      { transform: translateY(-8px) rotate(3deg); }
        }
        @keyframes tb-shimmer {
          0%   { background-position: -200% 50%; }
          100% { background-position: 200% 50%; }
        }
        @keyframes tb-pulse-ring {
          0%   { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.5); }
          100% { box-shadow: 0 0 0 18px rgba(99, 102, 241, 0); }
        }
        @keyframes tb-fade-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes tb-leaf-fall-1 {
          0%   { transform: translate(0, -10px) rotate(0deg); opacity: 0; }
          10%  { opacity: 0.6; }
          50%  { transform: translate(-12px, 60px) rotate(180deg); opacity: 0.85; }
          100% { transform: translate(0, 130px) rotate(360deg); opacity: 0; }
        }
        @keyframes tb-leaf-fall-2 {
          0%   { transform: translate(0, -10px) rotate(0deg); opacity: 0; }
          10%  { opacity: 0.4; }
          50%  { transform: translate(16px, 70px) rotate(-180deg); opacity: 0.7; }
          100% { transform: translate(6px, 140px) rotate(-360deg); opacity: 0; }
        }
        @keyframes tb-img-bob {
          0%, 100% { transform: translateY(0) scale(1); }
          50%      { transform: translateY(-8px) scale(1.02); }
        }
        @keyframes tb-spin-slow { to { transform: rotate(360deg); } }
        
        /* ═══════════════════════════════════════════════════════════════════
           1. HERO HEADER — Dark mesh gradient with shimmer
           ═══════════════════════════════════════════════════════════════════ */
        .team-page .team-hero {
          position: relative !important;
          margin-bottom: 26px !important;
          padding: 36px 32px 32px !important;
          border-radius: var(--tb-radius-lg) !important;
          background:
            radial-gradient(circle at 15% 20%, rgba(251, 191, 36, 0.32), transparent 45%),
            radial-gradient(circle at 88% 75%, rgba(244, 63, 94, 0.28), transparent 45%),
            radial-gradient(circle at 50% 100%, rgba(168, 85, 247, 0.30), transparent 50%),
            linear-gradient(135deg, #0f172a 0%, #1e1b4b 45%, #4c1d95 80%, #6b21a8 100%) !important;
          color: white !important;
          overflow: hidden !important;
          box-shadow: var(--tb-shadow-lg), inset 0 1px 0 rgba(255,255,255,0.12) !important;
          animation: tb-fade-up 0.6s var(--tb-ease) !important;
        }
        .team-page .team-hero::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.10) 50%, transparent 70%),
            radial-gradient(circle at 50% 50%, transparent 70%, rgba(0,0,0,0.20) 100%);
          background-size: 250% 100%, 100% 100%;
          animation: tb-shimmer 10s linear infinite;
          pointer-events: none;
        }
        .team-page .team-hero h1 {
          position: relative !important;
          z-index: 2 !important;
          font-size: 30px !important;
          font-weight: 950 !important;
          margin: 0 0 8px 0 !important;
          letter-spacing: -0.035em !important;
          background: linear-gradient(135deg, #fff 0%, #fde68a 45%, #fb923c 100%) !important;
          -webkit-background-clip: text !important; background-clip: text !important;
          -webkit-text-fill-color: transparent !important; color: transparent !important;
          line-height: 1.1 !important;
          text-shadow: 0 2px 30px rgba(251, 191, 36, 0.3) !important;
        }
        .team-page .team-hero p {
          position: relative !important; z-index: 2 !important;
          font-size: 13px !important;
          color: rgba(241, 245, 249, 0.78) !important;
          font-weight: 600 !important;
          margin: 0 !important;
          letter-spacing: 0.02em !important;
        }
        
        /* ═══════════════════════════════════════════════════════════════════
           2. MODE TOGGLE — Glass segmented control
           ═══════════════════════════════════════════════════════════════════ */
        .tb-mode-toggle {
          display: grid !important;
          grid-template-columns: 1fr 1fr !important;
          gap: 8px !important;
          margin: 0 auto 22px !important;
          max-width: 640px !important;
          padding: 8px !important;
          background: rgba(255, 255, 255, 0.65) !important;
          backdrop-filter: blur(20px) saturate(180%) !important;
          -webkit-backdrop-filter: blur(20px) saturate(180%) !important;
          border: 1px solid rgba(255, 255, 255, 0.4) !important;
          border-radius: var(--tb-radius-md) !important;
          box-shadow: var(--tb-shadow-sm) !important;
        }
        :root[data-theme="dark"] .tb-mode-toggle,
        [data-theme="dark"] .tb-mode-toggle {
          background: rgba(30, 41, 59, 0.55) !important;
          border-color: rgba(148, 163, 184, 0.2) !important;
        }
        .tb-mode-btn {
          display: flex !important;
          align-items: center !important;
          gap: 12px !important;
          padding: 12px 18px !important;
          background: transparent !important;
          border: none !important;
          border-radius: var(--tb-radius-sm) !important;
          cursor: pointer !important;
          transition: all 0.4s var(--tb-ease) !important;
          color: rgba(71, 85, 105, 0.85) !important;
          position: relative !important;
          overflow: hidden !important;
        }
        :root[data-theme="dark"] .tb-mode-btn,
        [data-theme="dark"] .tb-mode-btn { color: rgba(203, 213, 225, 0.7) !important; }
        .tb-mode-btn:hover:not(.active) {
          background: rgba(99, 102, 241, 0.06) !important;
          color: #4f46e5 !important;
          transform: translateY(-1px) !important;
        }
        .tb-mode-btn.active {
          color: white !important;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%) !important;
          box-shadow: 0 8px 24px rgba(99, 102, 241, 0.45), inset 0 1px 0 rgba(255,255,255,0.25) !important;
          transform: translateY(-2px) !important;
        }
        .tb-mode-btn.tb-mode-go.active {
          background: linear-gradient(135deg, #ef4444 0%, #f97316 50%, #fb923c 100%) !important;
          box-shadow: 0 8px 24px rgba(239, 68, 68, 0.45), inset 0 1px 0 rgba(255,255,255,0.25) !important;
        }
        .tb-mode-icon { font-size: 26px !important; flex-shrink: 0 !important; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.15)) !important; }
        .tb-mode-text { display: flex !important; flex-direction: column !important; align-items: flex-start !important; gap: 2px !important; }
        .tb-mode-title-text { font-weight: 800 !important; font-size: 14px !important; letter-spacing: -0.01em !important; }
        .tb-mode-desc { font-size: 10.5px !important; opacity: 0.85 !important; font-weight: 600 !important; letter-spacing: 0.04em !important; }
        
        /* ═══════════════════════════════════════════════════════════════════
           3. ACTIONS BAR — Modern buttons with neon hover
           ═══════════════════════════════════════════════════════════════════ */
        .tb-actions-bar {
          display: flex !important;
          flex-wrap: wrap !important;
          gap: 12px !important;
          justify-content: center !important;
          align-items: center !important;
          margin-bottom: 24px !important;
        }
        .tb-action-btn {
          display: inline-flex !important;
          align-items: center !important;
          gap: 8px !important;
          padding: 12px 22px !important;
          font-size: 13.5px !important;
          font-weight: 800 !important;
          letter-spacing: 0.01em !important;
          border: none !important;
          border-radius: 999px !important;
          cursor: pointer !important;
          transition: all 0.3s var(--tb-ease) !important;
          position: relative !important;
          overflow: hidden !important;
        }
        .tb-action-btn.primary {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%) !important;
          color: white !important;
          box-shadow: 0 10px 24px rgba(79, 70, 229, 0.4), inset 0 1px 0 rgba(255,255,255,0.2) !important;
        }
        .tb-action-btn.primary:hover:not(:disabled) {
          transform: translateY(-3px) scale(1.02) !important;
          box-shadow: 0 14px 32px rgba(79, 70, 229, 0.55), inset 0 1px 0 rgba(255,255,255,0.25) !important;
        }
        .tb-action-btn.primary:disabled {
          opacity: 0.45 !important; cursor: not-allowed !important;
          background: linear-gradient(135deg, #64748b, #475569) !important;
          box-shadow: none !important;
        }
        .tb-action-btn.ghost {
          background: rgba(248, 113, 113, 0.10) !important;
          color: #dc2626 !important;
          border: 1.5px solid rgba(248, 113, 113, 0.35) !important;
        }
        .tb-action-btn.ghost:hover {
          background: rgba(248, 113, 113, 0.18) !important;
          border-color: rgba(248, 113, 113, 0.6) !important;
          transform: translateY(-2px) !important;
        }
        .random-btn-main {
          background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%) !important;
          color: white !important;
          box-shadow: 0 10px 24px rgba(245, 158, 11, 0.4), inset 0 1px 0 rgba(255,255,255,0.2) !important;
        }
        .random-btn-main:hover:not(:disabled) {
          transform: translateY(-3px) scale(1.02) !important;
          box-shadow: 0 14px 32px rgba(245, 158, 11, 0.55) !important;
        }
        .random-dropdown { position: relative !important; }
        .random-dropdown-arrow {
          font-size: 11px !important; margin-left: 4px !important;
          transition: transform 0.3s var(--tb-ease) !important;
        }
        
        /* Dropdown Menu */
        .random-menu {
          position: absolute !important;
          top: calc(100% + 8px) !important;
          left: 50% !important;
          transform: translateX(-50%) !important;
          min-width: 280px !important;
          padding: 8px !important;
          background: rgba(255, 255, 255, 0.92) !important;
          backdrop-filter: blur(24px) saturate(180%) !important;
          -webkit-backdrop-filter: blur(24px) saturate(180%) !important;
          border: 1px solid rgba(255,255,255,0.6) !important;
          border-radius: var(--tb-radius-md) !important;
          box-shadow: var(--tb-shadow-lg) !important;
          z-index: 100 !important;
          animation: tb-fade-up 0.25s var(--tb-ease) !important;
        }
        :root[data-theme="dark"] .random-menu,
        [data-theme="dark"] .random-menu {
          background: rgba(30, 41, 59, 0.92) !important;
          border-color: rgba(148, 163, 184, 0.25) !important;
        }
        .random-menu-item {
          display: flex !important;
          align-items: center !important;
          gap: 12px !important;
          width: 100% !important;
          padding: 10px 12px !important;
          background: transparent !important;
          border: none !important;
          border-radius: var(--tb-radius-sm) !important;
          cursor: pointer !important;
          text-align: left !important;
          transition: all 0.2s var(--tb-ease) !important;
        }
        .random-menu-item:hover {
          background: linear-gradient(90deg, rgba(99,102,241,0.10), rgba(168,85,247,0.06)) !important;
          transform: translateX(2px) !important;
        }
        .random-menu-icon { font-size: 22px !important; flex-shrink: 0 !important; }
        .random-menu-text { display: flex !important; flex-direction: column !important; gap: 2px !important; }
        .random-menu-name { font-weight: 800 !important; font-size: 13px !important; color: #1e293b !important; }
        :root[data-theme="dark"] .random-menu-name,
        [data-theme="dark"] .random-menu-name { color: #f1f5f9 !important; }
        .random-menu-desc { font-size: 10.5px !important; color: #64748b !important; font-weight: 600 !important; }
        
        /* ═══════════════════════════════════════════════════════════════════
           4. CP OVERVIEW — Bento glass cards
           ═══════════════════════════════════════════════════════════════════ */
        .go-team-overview-modern {
          position: relative !important;
          display: grid !important;
          grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          gap: 14px !important;
          margin: 22px 0 28px !important;
          padding: 18px !important;
          border-radius: var(--tb-radius-lg) !important;
          background:
            radial-gradient(circle at 10% 0%, rgba(96,165,250,0.18), transparent 40%),
            radial-gradient(circle at 90% 100%, rgba(251,191,36,0.16), transparent 40%),
            linear-gradient(135deg, rgba(15, 23, 42, 0.94) 0%, rgba(30, 64, 175, 0.86) 100%) !important;
          border: 1px solid rgba(255, 255, 255, 0.14) !important;
          box-shadow: var(--tb-shadow-lg), inset 0 1px 0 rgba(255,255,255,0.16) !important;
          overflow: hidden !important;
          animation: tb-fade-up 0.5s var(--tb-ease) 0.1s both !important;
        }
        .go-team-overview-modern .go-overview-item {
          position: relative !important;
          display: flex !important;
          align-items: center !important;
          gap: 14px !important;
          min-height: 88px !important;
          padding: 18px !important;
          border-radius: var(--tb-radius-md) !important;
          background: rgba(255, 255, 255, 0.95) !important;
          border: 1px solid rgba(255,255,255,0.6) !important;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.16), inset 0 1px 0 rgba(255,255,255,0.9) !important;
          backdrop-filter: blur(14px) !important;
          transition: all 0.35s var(--tb-ease) !important;
          overflow: hidden !important;
        }
        .go-team-overview-modern .go-overview-item::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, transparent 50%, rgba(99,102,241,0.06) 100%);
          opacity: 0;
          transition: opacity 0.3s ease;
          pointer-events: none;
        }
        .go-team-overview-modern .go-overview-item:hover {
          transform: translateY(-5px) !important;
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.24), inset 0 1px 0 rgba(255,255,255,0.9) !important;
        }
        .go-team-overview-modern .go-overview-item:hover::before { opacity: 1; }
        .go-team-overview-modern .go-overview-icon {
          width: 52px !important;
          height: 52px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          border-radius: 18px !important;
          font-size: 24px !important;
          background: linear-gradient(135deg, #dbeafe, #bfdbfe) !important;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2), inset 0 1px 0 rgba(255,255,255,0.9) !important;
          flex: 0 0 52px !important;
        }
        .go-team-overview-modern .total-cp .go-overview-icon {
          background: linear-gradient(135deg, #fef3c7, #fbbf24) !important;
          box-shadow: 0 4px 12px rgba(251, 191, 36, 0.3), inset 0 1px 0 rgba(255,255,255,0.9) !important;
        }
        .go-team-overview-modern .avg-cp .go-overview-icon {
          background: linear-gradient(135deg, #dcfce7, #4ade80) !important;
          box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3), inset 0 1px 0 rgba(255,255,255,0.9) !important;
        }
        .go-team-overview-modern .league .go-overview-icon {
          background: color-mix(in srgb, var(--league-color, #3b82f6) 25%, white) !important;
          box-shadow: 0 4px 12px color-mix(in srgb, var(--league-color, #3b82f6) 30%, transparent) !important;
        }
        .go-team-overview-modern .go-overview-copy { display: grid !important; gap: 3px !important; min-width: 0 !important; flex: 1 !important; }
        .go-team-overview-modern .go-overview-label {
          display: block !important;
          font-size: 10px !important;
          line-height: 1.1 !important;
          font-weight: 900 !important;
          color: #64748b !important;
          text-transform: uppercase !important;
          letter-spacing: 0.18em !important;
        }
        .go-team-overview-modern .go-overview-val {
          display: block !important;
          font-size: 26px !important;
          line-height: 1 !important;
          font-weight: 950 !important;
          color: #172554 !important;
          letter-spacing: -0.04em !important;
          white-space: nowrap !important;
        }
        .go-team-overview-modern .league .go-overview-val { color: var(--league-color) !important; }
        :root[data-theme="dark"] .go-team-overview-modern .go-overview-item,
        [data-theme="dark"] .go-team-overview-modern .go-overview-item {
          background: rgba(30, 41, 59, 0.92) !important;
          border-color: rgba(148, 163, 184, 0.2) !important;
        }
        :root[data-theme="dark"] .go-team-overview-modern .go-overview-val,
        [data-theme="dark"] .go-team-overview-modern .go-overview-val { color: #e0f2fe !important; }
        :root[data-theme="dark"] .go-team-overview-modern .go-overview-label,
        [data-theme="dark"] .go-team-overview-modern .go-overview-label { color: #94a3b8 !important; }
        
        @media (max-width: 860px) { .go-team-overview-modern { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 520px) { .go-team-overview-modern { grid-template-columns: 1fr !important; } }
        
        /* Hundo banner */
        .go-team-hundo-banner {
          margin: 0 0 22px !important;
          padding: 16px 22px !important;
          border-radius: var(--tb-radius-md) !important;
          background:
            linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.25) 50%, transparent 70%),
            linear-gradient(135deg, #f59e0b 0%, #ef4444 50%, #ec4899 100%) !important;
          background-size: 250% 100%, 100% 100% !important;
          animation: tb-shimmer 3s linear infinite !important;
          color: white !important;
          text-align: center !important;
          font-weight: 900 !important;
          font-size: 16px !important;
          letter-spacing: 0.04em !important;
          box-shadow: 0 14px 34px rgba(239, 68, 68, 0.4) !important;
          text-shadow: 0 2px 6px rgba(0,0,0,0.25) !important;
        }
        
        /* ═══════════════════════════════════════════════════════════════════
           5. EMPTY STATE
           ═══════════════════════════════════════════════════════════════════ */
        .empty-state {
          text-align: center !important;
          padding: 60px 30px !important;
          border-radius: var(--tb-radius-lg) !important;
          background:
            radial-gradient(circle at 50% 30%, rgba(99,102,241,0.10), transparent 50%),
            linear-gradient(135deg, rgba(255,255,255,0.8), rgba(241,245,249,0.9)) !important;
          backdrop-filter: blur(12px) !important;
          border: 2px dashed rgba(99,102,241,0.25) !important;
          box-shadow: var(--tb-shadow-sm) !important;
        }
        :root[data-theme="dark"] .empty-state,
        [data-theme="dark"] .empty-state {
          background:
            radial-gradient(circle at 50% 30%, rgba(99,102,241,0.18), transparent 50%),
            linear-gradient(135deg, rgba(15,23,42,0.6), rgba(30,41,59,0.7)) !important;
          border-color: rgba(99,102,241,0.35) !important;
        }
        .empty-icon {
          display: block !important;
          font-size: 72px !important;
          margin-bottom: 16px !important;
          animation: tb-float-soft 4s ease-in-out infinite !important;
          filter: drop-shadow(0 8px 20px rgba(99,102,241,0.25)) !important;
        }
        .empty-title {
          font-size: 22px !important;
          font-weight: 900 !important;
          color: #1e293b !important;
          margin-bottom: 8px !important;
          letter-spacing: -0.02em !important;
        }
        :root[data-theme="dark"] .empty-title,
        [data-theme="dark"] .empty-title { color: #f1f5f9 !important; }
        .empty-sub {
          font-size: 14px !important;
          color: #64748b !important;
          font-weight: 600 !important;
        }
        
        /* ═══════════════════════════════════════════════════════════════════
           6. TEAM GRID
           ═══════════════════════════════════════════════════════════════════ */
        .go-team-grid {
          display: grid !important;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)) !important;
          gap: 18px !important;
          margin-bottom: 28px !important;
        }
        .go-team-grid > * { animation: tb-fade-up 0.5s var(--tb-ease) both !important; }
        .go-team-grid > *:nth-child(1) { animation-delay: 0.05s !important; }
        .go-team-grid > *:nth-child(2) { animation-delay: 0.10s !important; }
        .go-team-grid > *:nth-child(3) { animation-delay: 0.15s !important; }
        .go-team-grid > *:nth-child(4) { animation-delay: 0.20s !important; }
        .go-team-grid > *:nth-child(5) { animation-delay: 0.25s !important; }
        .go-team-grid > *:nth-child(6) { animation-delay: 0.30s !important; }
        
        /* Empty slot placeholder */
        .empty-slot {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          min-height: 480px !important;
          border-radius: var(--tb-radius-lg) !important;
          background: rgba(255,255,255,0.5) !important;
          border: 2px dashed rgba(99,102,241,0.3) !important;
          cursor: pointer !important;
          transition: all 0.3s var(--tb-ease) !important;
        }
        .empty-slot:hover {
          background: rgba(99,102,241,0.08) !important;
          border-color: rgba(99,102,241,0.5) !important;
          transform: translateY(-4px) !important;
        }
        :root[data-theme="dark"] .empty-slot,
        [data-theme="dark"] .empty-slot {
          background: rgba(30,41,59,0.4) !important;
          border-color: rgba(148,163,184,0.3) !important;
        }
        
        /* ═══════════════════════════════════════════════════════════════════
           7. POKEMON GO CARD — Premium stage + glass info panel
           ═══════════════════════════════════════════════════════════════════ */
        .pgo-card {
          position: relative !important;
          border: none !important;
          padding: 0 !important;
          overflow: hidden !important;
          border-radius: var(--tb-radius-lg) !important;
          background: white !important;
          box-shadow: var(--tb-shadow-md), 0 0 0 1px rgba(255,255,255,0.1) inset !important;
          display: flex !important;
          flex-direction: column !important;
          transition: all 0.4s var(--tb-ease) !important;
        }
        .pgo-card:hover {
          transform: translateY(-6px) !important;
          box-shadow: var(--tb-shadow-lg), 0 0 0 1px rgba(255,255,255,0.1) inset !important;
        }
        :root[data-theme="dark"] .pgo-card,
        [data-theme="dark"] .pgo-card { background: #1f2937 !important; }
        
        /* Stage */
        .pgo-stage {
          position: relative;
          padding: 20px 16px 50px;
          min-height: 320px;
          overflow: hidden;
        }
        .pgo-stage::before {
          content: "🍃";
          position: absolute;
          font-size: 22px;
          top: 60px; right: 12px;
          animation: tb-leaf-fall-1 7s ease-in-out infinite;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
          pointer-events: none;
        }
        .pgo-stage::after {
          content: "🍂";
          position: absolute;
          font-size: 20px;
          top: 100px; left: 18px;
          animation: tb-leaf-fall-2 9s ease-in-out 1.5s infinite;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
          pointer-events: none;
        }
        /* Subtle spotlight on Pokemon */
        .pgo-stage > img.go-card-img {
          position: relative !important;
          z-index: 2 !important;
        }
        
        /* Remove + Swap buttons */
        .pgo-card .go-card-remove,
        .pgo-card .go-card-swap {
          position: absolute !important;
          top: 12px !important;
          width: 32px !important; height: 32px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          border-radius: 50% !important;
          z-index: 5 !important;
          background: rgba(255,255,255,0.92) !important;
          backdrop-filter: blur(8px) !important;
          border: none !important;
          color: #1f2937 !important;
          font-weight: 800 !important;
          font-size: 14px !important;
          cursor: pointer !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.18) !important;
          transition: all 0.25s var(--tb-ease) !important;
        }
        .pgo-card .go-card-remove { right: 12px !important; background: rgba(239, 68, 68, 0.92) !important; color: white !important; }
        .pgo-card .go-card-swap { left: 12px !important; }
        .pgo-card .go-card-remove:hover,
        .pgo-card .go-card-swap:hover { transform: scale(1.1) rotate(8deg) !important; }
        
        /* CP big at top */
        .pgo-cp-top {
          text-align: center;
          color: white;
          margin: 2px 0 12px;
          text-shadow: 0 2px 8px rgba(0,0,0,0.35);
          letter-spacing: 0.04em;
          position: relative;
          z-index: 2;
        }
        .pgo-cp-top-label { font-size: 14px !important; font-weight: 800 !important; opacity: 0.95 !important; letter-spacing: 0.2em !important; }
        .pgo-cp-top-value { font-size: 36px !important; font-weight: 950 !important; letter-spacing: -0.03em !important; margin-left: 8px !important; }
        
        /* CP slider in stage */
        .pgo-cp-slider-wrap { position: relative !important; z-index: 3 !important; padding: 0 8px !important; margin: 0 0 16px !important; }
        .pgo-cp-slider {
          -webkit-appearance: none !important; appearance: none !important;
          width: 100% !important; height: 8px !important;
          border-radius: 999px !important;
          outline: none !important;
          cursor: pointer !important;
          box-shadow: 0 2px 6px rgba(0,0,0,0.18) inset !important;
        }
        .pgo-cp-slider::-webkit-slider-thumb {
          -webkit-appearance: none !important; appearance: none !important;
          width: 24px !important; height: 24px !important;
          border-radius: 50% !important;
          background: white !important;
          border: 3px solid var(--league-color, #3b82f6) !important;
          cursor: grab !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
          transition: transform 0.2s var(--tb-ease-bounce) !important;
        }
        .pgo-cp-slider::-webkit-slider-thumb:hover { transform: scale(1.2) !important; }
        .pgo-cp-slider::-webkit-slider-thumb:active { cursor: grabbing !important; transform: scale(1.25) !important; }
        .pgo-cp-slider::-moz-range-thumb {
          width: 24px !important; height: 24px !important;
          border-radius: 50% !important;
          background: white !important;
          border: 3px solid var(--league-color, #3b82f6) !important;
          cursor: grab !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
        }
        .pgo-cp-slider-info {
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          margin-top: 10px !important;
          gap: 8px !important;
        }
        .pgo-cp-slider-min,
        .pgo-cp-slider-max {
          font-size: 10px !important; font-weight: 800 !important;
          color: rgba(255,255,255,0.85) !important;
          letter-spacing: 0.08em !important;
          text-shadow: 0 1px 2px rgba(0,0,0,0.3) !important;
        }
        .pgo-cp-league-pill {
          font-size: 11px !important; font-weight: 900 !important;
          color: white !important;
          padding: 5px 14px !important;
          border-radius: 999px !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.3) !important;
          letter-spacing: 0.05em !important;
          white-space: nowrap !important;
          backdrop-filter: blur(8px) !important;
        }
        
        /* Arc decoration */
        .pgo-arc {
          width: 80% !important;
          margin: 0 auto -32px !important;
          display: block !important;
          position: relative !important; z-index: 1 !important;
          filter: drop-shadow(0 2px 6px rgba(0,0,0,0.2)) !important;
        }
        
        /* Pokemon image floating */
        .pgo-card .go-card-img {
          background: transparent !important;
          border: none !important; padding: 0 !important;
          max-width: 68% !important;
          margin: 0 auto !important;
          filter: drop-shadow(0 12px 24px rgba(0,0,0,0.35)) !important;
          animation: tb-img-bob 4s ease-in-out infinite !important;
          display: block !important;
          position: relative !important;
          z-index: 2 !important;
        }
        
        /* Types row */
        .pgo-card .go-card-types {
          display: flex !important;
          justify-content: center !important;
          margin: 10px 0 0 !important;
          gap: 8px !important;
          position: relative !important;
          z-index: 3 !important;
        }
        .pgo-card .type-tag-mini {
          padding: 5px 14px !important;
          font-size: 11px !important;
          font-weight: 900 !important;
          letter-spacing: 0.08em !important;
          text-transform: uppercase !important;
          color: white !important;
          border-radius: 999px !important;
          box-shadow: 0 4px 10px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.3) !important;
          border: 1.5px solid rgba(255,255,255,0.4) !important;
          text-shadow: 0 1px 2px rgba(0,0,0,0.2) !important;
        }
        
        /* Info panel */
        .pgo-info-panel {
          background: white !important;
          margin-top: -24px !important;
          border-radius: var(--tb-radius-lg) var(--tb-radius-lg) 0 0 !important;
          padding: 20px 18px 18px !important;
          position: relative !important;
          z-index: 4 !important;
          box-shadow: 0 -6px 20px rgba(0,0,0,0.08) !important;
        }
        :root[data-theme="dark"] .pgo-info-panel,
        [data-theme="dark"] .pgo-info-panel { background: #1f2937 !important; }
        
        .pgo-name-row {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 8px !important;
          margin-bottom: 4px !important;
        }
        .pgo-card .go-card-name {
          font-size: 24px !important;
          font-weight: 900 !important;
          color: #1e293b !important;
          text-align: center !important;
          margin: 0 !important;
          letter-spacing: -0.02em !important;
        }
        :root[data-theme="dark"] .pgo-card .go-card-name,
        [data-theme="dark"] .pgo-card .go-card-name { color: #f1f5f9 !important; }
        .pgo-card .go-card-id {
          font-size: 11px !important;
          font-weight: 800 !important;
          opacity: 0.5 !important;
          letter-spacing: 0.15em !important;
          text-align: center !important;
          margin: 0 0 14px !important;
        }
        
        /* ═══════════════════════════════════════════════════════════════════
           8. APPRAISE CARD (medal + stars + 3 IV bars)
           ═══════════════════════════════════════════════════════════════════ */
        .pgo-appraise-card {
          position: relative !important;
          margin: 12px 0 0 !important;
          padding: 16px !important;
          border-radius: var(--tb-radius-md) !important;
          background:
            radial-gradient(circle at 0% 0%, rgba(251,191,36,0.18), transparent 50%),
            linear-gradient(180deg, rgba(255,255,255,0.98), rgba(255,247,237,0.92)) !important;
          border: 1px solid rgba(251, 146, 60, 0.25) !important;
          box-shadow: 0 10px 26px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255,255,255,0.9) !important;
        }
        :root[data-theme="dark"] .pgo-appraise-card,
        [data-theme="dark"] .pgo-appraise-card {
          background:
            radial-gradient(circle at 0% 0%, rgba(251,191,36,0.15), transparent 50%),
            linear-gradient(180deg, rgba(31,41,55,0.98), rgba(42,31,24,0.95)) !important;
          border-color: rgba(251, 146, 60, 0.22) !important;
        }
        
        .pgo-appraise-top {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 14px !important;
          margin-bottom: 14px !important;
        }
        
        /* Medal */
        .pgo-appraise-medal {
          width: 56px !important; height: 56px !important;
          border-radius: 50% !important;
          flex: 0 0 56px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          background:
            radial-gradient(circle at 30% 25%, #fff7ed 0%, #fed7aa 35%, #fb923c 100%) !important;
          border: 3px solid rgba(255,255,255,0.85) !important;
          box-shadow: 0 8px 20px rgba(234, 88, 12, 0.3), inset 0 -2px 6px rgba(124, 45, 18, 0.25) !important;
          position: relative !important;
        }
        .pgo-appraise-medal::after {
          content: "";
          position: absolute;
          top: 6px; left: 12px;
          width: 16px; height: 16px;
          border-radius: 50%;
          background: rgba(255,255,255,0.5);
          filter: blur(4px);
        }
        .pgo-medal-star {
          font-size: 14px !important;
          color: rgba(255,255,255,0.45) !important;
          margin-left: -2px !important;
          text-shadow: 0 1px 2px rgba(124,45,18,0.3) !important;
        }
        .pgo-medal-star:first-child { margin-left: 0 !important; }
        .pgo-medal-star.filled { color: #fff7ed !important; }
        
        .pgo-appraise-summary { flex: 0 0 auto !important; min-width: 0 !important; }
        .pgo-appraise-stars {
          display: flex !important;
          justify-content: center !important;
          gap: 3px !important;
          line-height: 1 !important;
        }
        .pgo-star {
          font-size: 28px !important;
          color: #d1d5db !important;
          text-shadow: 0 1px 0 rgba(255,255,255,0.6) !important;
          transition: all 0.2s var(--tb-ease) !important;
        }
        .pgo-star.filled {
          color: #f59e0b !important;
          filter: drop-shadow(0 0 8px rgba(245, 158, 11, 0.6)) !important;
        }
        
        /* IV Bars (3 rows) */
        .pgo-appraise-bars { display: grid !important; gap: 10px !important; margin-top: 4px !important; }
        .pgo-iv-row {
          position: relative !important;
          display: grid !important;
          grid-template-columns: 42px 1fr !important;
          align-items: center !important;
          gap: 12px !important;
        }
        .pgo-iv-label {
          font-size: 12px !important;
          font-weight: 900 !important;
          color: #ea580c !important;
          letter-spacing: 0.12em !important;
        }
        :root[data-theme="dark"] .pgo-iv-label,
        [data-theme="dark"] .pgo-iv-label { color: #fdba74 !important; }
        
        .pgo-iv-bar-wrap { position: relative !important; height: 16px !important; }
        .pgo-iv-track {
          position: relative !important;
          height: 16px !important;
          overflow: hidden !important;
          border-radius: 8px !important;
          background: rgba(15, 23, 42, 0.08) !important;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.12) !important;
        }
        :root[data-theme="dark"] .pgo-iv-track,
        [data-theme="dark"] .pgo-iv-track { background: rgba(255,255,255,0.10) !important; }
        .pgo-iv-fill {
          height: 100% !important;
          background:
            linear-gradient(90deg, rgba(255,255,255,0.25) 0%, transparent 50%),
            linear-gradient(180deg, #fbbf24 0%, #fb923c 50%, #ea580c 100%) !important;
          border-radius: 8px !important;
          transition: width 0.4s var(--tb-ease) !important;
          box-shadow: 0 0 8px rgba(251, 146, 60, 0.45) !important;
        }
        .pgo-iv-cut {
          position: absolute !important;
          top: 0 !important; bottom: 0 !important;
          width: 2px !important;
          background: rgba(255,255,255,0.85) !important;
          z-index: 2 !important;
        }
        .pgo-iv-cut.c1 { left: 33.333% !important; }
        .pgo-iv-cut.c2 { left: 66.666% !important; }
        .pgo-iv-slider {
          position: absolute !important;
          inset: 0 !important;
          width: 100% !important; height: 100% !important;
          opacity: 0 !important;
          cursor: pointer !important;
          z-index: 10 !important;
          margin: 0 !important;
        }
        
        /* ═══════════════════════════════════════════════════════════════════
           9. TEAM ANALYSIS (weaknesses/resists bento)
           ═══════════════════════════════════════════════════════════════════ */
        .go-analysis {
          display: grid !important;
          grid-template-columns: 1fr 1fr !important;
          gap: 16px !important;
          margin-top: 24px !important;
        }
        @media (max-width: 700px) { .go-analysis { grid-template-columns: 1fr !important; } }
        .go-analysis-block {
          padding: 20px !important;
          border-radius: var(--tb-radius-md) !important;
          background: rgba(255,255,255,0.85) !important;
          backdrop-filter: blur(14px) !important;
          border: 1px solid rgba(255,255,255,0.6) !important;
          box-shadow: var(--tb-shadow-sm) !important;
        }
        :root[data-theme="dark"] .go-analysis-block,
        [data-theme="dark"] .go-analysis-block {
          background: rgba(30,41,59,0.7) !important;
          border-color: rgba(148,163,184,0.2) !important;
        }
        .go-analysis-title {
          font-weight: 900 !important;
          font-size: 14px !important;
          color: #1e293b !important;
          margin-bottom: 12px !important;
          letter-spacing: -0.01em !important;
        }
        :root[data-theme="dark"] .go-analysis-title,
        [data-theme="dark"] .go-analysis-title { color: #f1f5f9 !important; }
        .go-analysis-types {
          display: flex !important;
          flex-wrap: wrap !important;
          gap: 6px !important;
        }
        .go-analysis-pill {
          padding: 5px 12px !important;
          border-radius: 999px !important;
          color: white !important;
          font-weight: 800 !important;
          font-size: 11px !important;
          letter-spacing: 0.05em !important;
          text-transform: uppercase !important;
          box-shadow: 0 3px 8px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.25) !important;
        }
        .go-analysis-good {
          color: #16a34a !important;
          font-weight: 800 !important;
          font-size: 13px !important;
        }
        :root[data-theme="dark"] .go-analysis-good,
        [data-theme="dark"] .go-analysis-good { color: #4ade80 !important; }
        
        /* ═══════════════════════════════════════════════════════════════════
           10. NORMAL MODE CARD (basic style if used)
           ═══════════════════════════════════════════════════════════════════ */
        .go-card-normal {
          background: white !important;
          border: 3px solid !important;
          border-radius: var(--tb-radius-md) !important;
          padding: 18px !important;
          box-shadow: var(--tb-shadow-sm) !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          gap: 8px !important;
          position: relative !important;
          transition: all 0.3s var(--tb-ease) !important;
        }
        .go-card-normal:hover {
          transform: translateY(-4px) !important;
          box-shadow: var(--tb-shadow-md) !important;
        }
        :root[data-theme="dark"] .go-card-normal,
        [data-theme="dark"] .go-card-normal { background: #1f2937 !important; }
        .go-card-normal .go-card-img { max-width: 70% !important; }
        .go-card-normal .go-card-name { font-weight: 900 !important; font-size: 18px !important; color: #1e293b !important; }
        :root[data-theme="dark"] .go-card-normal .go-card-name,
        [data-theme="dark"] .go-card-normal .go-card-name { color: #f1f5f9 !important; }
        
        /* Reduce-motion respect */
        @media (prefers-reduced-motion: reduce) {
          .pgo-stage::before,
          .pgo-stage::after,
          .pgo-card .go-card-img,
          .empty-icon,
          .team-page .team-hero::before,
          .go-team-hundo-banner { animation: none !important; }
        }
      `}</style>
      <div className="team-hero">
        <div style={{ position: "absolute", top: 16, right: 24, fontSize: 48, opacity: 0.18,
                      animation: "tm-float 4s ease-in-out infinite", pointerEvents: "none" }}>⚔️</div>
        <h1>⚔️ {lang==="th"?"สร้างทีมโปเกม่อน":lang==="ja"?"チーム作成":"Build Your Team"}</h1>
        <p>
          {mode === "go"
            ? (lang==="th" ? "Pokémon GO Mode · กำหนด CP/IV · ระบบ Appraise"
              : lang==="ja" ? "Pokémon GO モード · CP/IV · 評価機能"
              : "Pokémon GO Mode · CP/IV · Appraise")
            : (lang==="th" ? "Normal Mode · Stats พื้นฐาน"
              : lang==="ja" ? "通常モード · 基本ステータス"
              : "Normal Mode · Base Stats")}
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
        <div className="go-team-overview go-team-overview-modern">
          <div className="go-overview-item team-count">
            <span className="go-overview-icon">👥</span>
            <span className="go-overview-copy">
              <span className="go-overview-label">{lang==="th"?"ทีม":"Team"}</span>
              <span className="go-overview-val">{team.length}/{maxTeamSize}</span>
            </span>
          </div>
          <div className="go-overview-item total-cp">
            <span className="go-overview-icon">⚡</span>
            <span className="go-overview-copy">
              <span className="go-overview-label">Total CP</span>
              <span className="go-overview-val">{teamCPOverview.total.toLocaleString()}</span>
            </span>
          </div>
          <div className="go-overview-item avg-cp">
            <span className="go-overview-icon">📈</span>
            <span className="go-overview-copy">
              <span className="go-overview-label">Avg CP</span>
              <span className="go-overview-val">{teamCPOverview.avg.toLocaleString()}</span>
            </span>
          </div>
          <div className="go-overview-item league" style={{ "--league-color": teamCPOverview.league.color }}>
            <span className="go-overview-icon">{teamCPOverview.league.icon}</span>
            <span className="go-overview-copy">
              <span className="go-overview-label">League</span>
              <span className="go-overview-val">{teamCPOverview.league.name}</span>
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
            {team.slice(0, maxTeamSize).map((p, i) => {
              const color = typeColor(p.types[0]?.type.name);
              const name = getLocalName(p.id, lang, thaiArr, jpArr) ?? p.name;

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
                      </div>
                      <div className="go-card-id">#{padId(p.id)}</div>

                      {/* IV bars (Appraise) — now orange themed */}
                      <AppraiseDisplay
                        ivAtk={data.ivAtk} ivDef={data.ivDef} ivHp={data.ivHp}
                        onChange={(updates) => updateData(p.id, updates)}
                        lang={lang} />
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
                    .filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]).slice(0, maxTeamSize)
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
                    .filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]).slice(0, maxTeamSize)
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
    </main>
  );
}