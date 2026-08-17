import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  STRINGS, TYPE_NAMES_TH, TYPE_NAMES_JA, ALL_TYPES, TYPE_OFFENSE, TEAM_KEY, GENERATIONS,
} from "../data.js";
import { typeColor, getArt, getLocalName, padId, useDebouncedValue, calcDefMatchups } from "../utils.js";
import {
  Plus, Trash2, TrendingUp,
  X, RefreshCw, Dices, Shield, Crown, Sparkles, BarChart3,
  Scale, Flame, Gauge, Loader2, Settings2, CheckCircle2, Trophy,
} from "lucide-react";

// ─── localStorage keys ──────────────────────────────────────────────────────
const TEAM_MODE_KEY = "pkdx_team_mode_v2";
const TEAM_DATA_KEY = "pkdx_team_data_v2";          // GO-mode per-Pokémon data (CP/IV)
// Separate team + data per mode so GO and Normal teams never mix
const TEAM_KEY_NORMAL = "pkdx_team_normal_v2";
const TEAM_DATA_KEY_NORMAL = "pkdx_team_data_normal_v2";

// ─── Pokémon GO Mechanics ───────────────────────────────────────────────────
function getLeague(cp) {
  if (cp <= 1500) return { name: "Great",  color: "#2e7eff" };
  if (cp <= 2500) return { name: "Ultra",  color: "#ffb015" };
  return { name: "Master", color: "#b5302d" };
}

// ─── Pokémon GO Appraise System ──────────────────────────────────────────────
function calcAppraise(ivAtk, ivDef, ivHp, lang = "en") {
  const total = ivAtk + ivDef + ivHp;
  const pct = (total / 45) * 100;
  let stars = 0;
  let label, color, gradient;

  if (total === 45) {
    stars = 3;
    label = lang === "th" ? "ตำนาน!" : lang === "ja" ? "100%!" : "HUNDO!";
    color = "#dc2626";
    gradient = "linear-gradient(135deg, #facc15 0%, #ee1515 100%)";
  } else if (pct >= 82) {
    stars = 3;
    label = lang === "th" ? "ยอดเยี่ยม" : lang === "ja" ? "すごい" : "Wonder!";
    color = "#dc2626";
    gradient = "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)";
  } else if (pct >= 66) {
    stars = 2;
    label = lang === "th" ? "ดี" : lang === "ja" ? "よい" : "Great";
    color = "#f59e0b";
    gradient = "linear-gradient(135deg, #f97316 0%, #c2410c 100%)";
  } else if (pct >= 51) {
    stars = 1;
    label = lang === "th" ? "พอใช้" : lang === "ja" ? "普通" : "Good";
    color = "#900603";
    gradient = "linear-gradient(135deg, #900603 0%, #4a0301 100%)";
  } else {
    stars = 0;
    label = lang === "th" ? "ทั่วไป" : lang === "ja" ? "標準" : "Standard";
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
        <div className="pgo-appraise-stars">
          {[1, 2, 3].map(i => (
            <span key={i} className={`pgo-star${i <= apr.stars ? " filled" : ""}`}>★</span>
          ))}
        </div>
        <span className="pgo-appraise-label" style={{ color: apr.color }}>{apr.label}</span>
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
        <span className="cs-panel-title" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Settings2 size={15} strokeWidth={2.2} /> {lang==="th"?"ปรับ Stats":"Customize"}</span>
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
          <TrendingUp size={13} strokeWidth={2.4} /> Max
        </button>
        <button className="cs-preset"
          onClick={() => STAT_ORDER.forEach(n => onChange(n, baseStats[n] ?? 0))}>
          <BarChart3 size={13} strokeWidth={2.4} /> Base
        </button>
        <button className="cs-preset"
          onClick={() => STAT_ORDER.forEach(n => onChange(n, Math.floor(Math.random() * 200) + 30))}>
          <Dices size={13} strokeWidth={2.4} /> Random
        </button>
      </div>
    </div>
  );
}

// ─── Random team generation modes ───────────────────────────────────────────
const STARTERS = [1,4,7,152,155,158,252,255,258,387,390,393,495,498,501,650,653,656,722,725,728,810,813,816,906,909,912];
const LEGENDARY_IDS = [144,145,146,150,151,243,244,245,249,250,251,377,378,379,380,381,382,383,384,480,481,482,483,484,485,486,487,488,489,490,491,492,493,638,639,640,641,642,643,644,645,646,647,648,649,716,717,718,719,720,721,772,773,785,786,787,788,789,790,791,792,793,800,801,888,889,890,891,892,894,895,896,897,898,905,1001,1002,1003,1004,1007,1008];

const RTG_MODES = [
  { id:"balanced",   Icon:Scale,    en:"Balanced",   th:"สมดุล",      ja:"バランス",  desc_en:"Mixed types",        desc_th:"ผสมหลายธาตุ" },
  { id:"starters",   Icon:Sparkles, en:"Starters",   th:"สตาร์ทเตอร์",  ja:"御三家",    desc_en:"Gen 1-9 starters",   desc_th:"3 ตัวเริ่ม" },
  { id:"legendary",  Icon:Crown,    en:"Legendary",  th:"ตำนาน",      ja:"伝説",     desc_en:"Powerful legends",   desc_th:"โปเกม่อนตำนาน" },
  { id:"powerhouse", Icon:Flame,    en:"Powerhouse", th:"พลังสูง",    ja:"高火力",    desc_en:"BST 500+",          desc_th:"BST ≥ 500" },
  { id:"speedy",     Icon:Gauge,    en:"Speedy",     th:"ความเร็วสูง", ja:"スピード",   desc_en:"Speed 90+",         desc_th:"ความเร็ว ≥ 90" },
  { id:"tanky",      Icon:Shield,   en:"Tanky",      th:"อึดถึก",     ja:"耐久",     desc_en:"High defenses",     desc_th:"ป้องกันสูง" },
  { id:"chaos",      Icon:Dices,    en:"Chaos",      th:"สุ่มล้วน",    ja:"ランダム",  desc_en:"Pure random",       desc_th:"สุ่มทั้งหมด" },
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
      <button className="tb-btn tb-btn-outline random-btn-main"
        onClick={() => !generating && setOpen(o => !o)} disabled={generating}>
        {generating
          ? <><Loader2 size={15} strokeWidth={2.4} style={{ animation: "tm-spin 1s linear infinite" }} /> {lang==="th"?"กำลังสุ่ม...":"Generating..."}</>
          : <><Dices size={15} strokeWidth={2.4} /> {lang==="th"?"สุ่มทีม":lang==="ja"?"ランダム":"Random Team"}
              <span className="random-dropdown-arrow">{open ? "▴" : "▾"}</span></>}
      </button>
      {open && !generating && (
        <div className="random-menu" role="menu">
          {RTG_MODES.map(m => (
            <button key={m.id} className="random-menu-item"
              onClick={() => { onGenerate(m.id); setOpen(false); }}>
              <span className="random-menu-icon"><m.Icon size={18} strokeWidth={2.2} /></span>
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
function PokemonPicker({
  allWithMeta, thaiArr, jpArr, lang, onPick, onClose, title,
  excludeIds = [], typeFilter = null, cachedFetch,
}) {
  const s = STRINGS[lang];
  const [search, setSearch] = useState("");
  const debSearch = useDebouncedValue(search, 200);
  const [types, setTypes] = useState(typeFilter ? [typeFilter] : []);
  const [gen, setGen] = useState(0);
  const [sort, setSort] = useState("dex");

  // A suggestion chip decides the type for you; arriving from a different
  // chip has to re-seed the filter.
  const [lastFilter, setLastFilter] = useState(typeFilter);
  if (lastFilter !== typeFilter) { setLastFilter(typeFilter); setTypes(typeFilter ? [typeFilter] : []); }

  // ── Type rosters ────────────────────────────────────────────────────────
  // The list handed to this picker carries only name/url/id, so membership of
  // a type comes from the API's own roster — one request per type, kept for
  // the life of the modal, rather than 1,025 detail fetches.
  const [rosters, setRosters] = useState({});
  useEffect(() => {
    const missing = types.filter(t => !(t in rosters));
    if (!missing.length) return;
    let live = true;
    Promise.all(missing.map(t =>
      fetch(`https://pokeapi.co/api/v2/type/${t}`)
        .then(r => r.json())
        .then(d => [t, new Set(d.pokemon.map(x =>
          parseInt(x.pokemon.url.split("/").filter(Boolean).pop(), 10)))])
        .catch(() => [t, new Set()])
    )).then(pairs => {
      if (live) setRosters(prev => ({ ...prev, ...Object.fromEntries(pairs) }));
    });
    return () => { live = false; };
  }, [types, rosters]);

  const rostersReady = types.every(t => t in rosters);

  // ── Filtering, on data that needs no fetch ──────────────────────────────
  const filtered = useMemo(() => {
    const q = debSearch.toLowerCase().trim();
    const g = GENERATIONS[gen];
    let pool = allWithMeta;
    if (gen > 0 && g) pool = pool.filter(p => p.id >= g.min && p.id <= g.max);
    if (types.length) {
      if (!rostersReady) return null;            // null means "still loading"
      pool = pool.filter(p => types.some(t => rosters[t]?.has(p.id)));
    }
    if (q) {
      pool = pool.filter(p => {
        const th = (getLocalName(p.id, "th", thaiArr, jpArr) ?? "").toLowerCase();
        const ja = (getLocalName(p.id, "ja", thaiArr, jpArr) ?? "").toLowerCase();
        return p.name.toLowerCase().includes(q) || th.includes(q)
          || ja.includes(q) || String(p.id).includes(q);
      });
    }
    if (sort === "name") pool = [...pool].sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "dex") pool = [...pool].sort((a, b) => a.id - b.id);
    return pool;
  }, [debSearch, allWithMeta, thaiArr, jpArr, types, rosters, rostersReady, gen, sort]);

  // ── Details for what is on screen ───────────────────────────────────────
  // Type pills, base totals and a strongest-first sort all need stats, which
  // the light list does not carry. Only the visible window is fetched.
  const WINDOW = 120;
  const shown = useMemo(() => (filtered ?? []).slice(0, WINDOW), [filtered]);
  const [details, setDetails] = useState({});

  useEffect(() => {
    if (!cachedFetch || !shown.length) return;
    const need = shown.filter(p => !details[p.id]);
    if (!need.length) return;
    let live = true;
    (async () => {
      // In small batches: the app already saturates the connection pool on
      // boot, and 120 parallel requests is how that turns into failures.
      for (let i = 0; i < need.length && live; i += 12) {
        const slice = need.slice(i, i + 12);
        const got = await Promise.allSettled(slice.map(p => cachedFetch(p.url)));
        if (!live) return;
        const add = {};
        got.forEach((r, k) => { if (r.status === "fulfilled" && r.value) add[slice[k].id] = r.value; });
        if (Object.keys(add).length) setDetails(prev => ({ ...prev, ...add }));
      }
    })();
    return () => { live = false; };
  }, [shown, cachedFetch, details]);

  const bstOf = (d) => d?.stats?.reduce((a, st) => a + st.base_stat, 0) ?? null;

  const results = useMemo(() => {
    if (sort !== "total") return shown;
    return [...shown].sort((a, b) => (bstOf(details[b.id]) ?? -1) - (bstOf(details[a.id]) ?? -1));
  }, [shown, sort, details]);

  const clearAll = () => { setSearch(""); setTypes([]); setGen(0); setSort("dex"); };
  const hasFilters = !!(search || types.length || gen > 0);

  const typeLabel = (t) => lang === "th" ? (TYPE_NAMES_TH[t] ?? t)
    : lang === "ja" ? (TYPE_NAMES_JA[t] ?? t) : t;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal compare-picker tb-picker" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close tb-picker-x" onClick={onClose}
          aria-label={lang === "th" ? "ปิด" : lang === "ja" ? "閉じる" : "Close"}>
          <X size={16} strokeWidth={2.6} />
        </button>

        <div className="modal-body tb-picker-body">
          <h2 className="tb-picker-title">{title}</h2>

          <div className="tb-picker-tools">
            <input className="team-add-search" placeholder={s.searchPlaceholder}
              value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
            <select className="tb-picker-sort" value={sort} onChange={(e) => setSort(e.target.value)}
              aria-label={lang === "th" ? "เรียงตาม" : lang === "ja" ? "並び替え" : "Sort by"}>
              <option value="dex">{lang === "th" ? "เลข Dex" : lang === "ja" ? "図鑑番号" : "Dex number"}</option>
              <option value="name">{lang === "th" ? "ชื่อ" : lang === "ja" ? "名前" : "Name"}</option>
              <option value="total">{lang === "th" ? "ค่าพลังรวม (มากไปน้อย)" : lang === "ja" ? "種族値合計（高い順）" : "Base total (high first)"}</option>
            </select>
          </div>

          {/* Multi-select, so "Fire or Water" is one question, not two trips. */}
          <div className="tb-picker-types">
            {ALL_TYPES.map(t => (
              <button key={t} type="button"
                className={`tp tb-picker-type${types.includes(t) ? " on" : ""}`}
                data-type={t} aria-pressed={types.includes(t)}
                onClick={() => setTypes(v => v.includes(t) ? v.filter(x => x !== t) : [...v, t])}>
                {typeLabel(t)}
              </button>
            ))}
          </div>

          <div className="tb-picker-gens">
            {GENERATIONS.map((g, i) => (
              <button key={g.en} type="button"
                className={`tb-picker-gen${gen === i ? " on" : ""}`}
                aria-pressed={gen === i} onClick={() => setGen(i)}>
                {lang === "th" ? g.th : lang === "ja" ? g.ja : g.en}
              </button>
            ))}
          </div>

          <div className="tb-picker-meta">
            <span>
              {filtered === null
                ? (lang === "th" ? "กำลังโหลด…" : lang === "ja" ? "読み込み中…" : "Loading…")
                : (lang === "th" ? `พบ ${filtered.length} ตัว`
                  : lang === "ja" ? `${filtered.length}匹` : `${filtered.length} found`)}
              {filtered && filtered.length > WINDOW && (
                <em className="tb-picker-note">
                  {lang === "th" ? ` · แสดง ${WINDOW} ตัวแรก กรองให้แคบลงเพื่อเรียงทั้งหมด`
                    : lang === "ja" ? ` · 先頭${WINDOW}件を表示`
                    : ` · showing the first ${WINDOW} — narrow the filters to sort them all`}
                </em>
              )}
            </span>
            {hasFilters && (
              <button type="button" className="tb-picker-clear" onClick={clearAll}>
                {lang === "th" ? "ล้างตัวกรอง" : lang === "ja" ? "条件をクリア" : "Clear filters"}
              </button>
            )}
          </div>

          <div className="team-add-grid tb-picker-grid">
            {results.map(p => {
              const name = getLocalName(p.id, lang, thaiArr, jpArr) ?? p.name;
              const img = `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/other/official-artwork/${p.id}.png`;
              const inTeam = excludeIds.includes(p.id);
              const d = details[p.id];
              const bst = bstOf(d);
              return (
                <button key={p.id} className={`team-add-card${inTeam ? " in-team" : ""}`}
                  disabled={inTeam} onClick={() => !inTeam && onPick(p)}
                  title={inTeam
                    ? (lang === "th" ? "อยู่ในทีมแล้ว" : lang === "ja" ? "既にチームにいます" : "Already on the team")
                    : name}>
                  <img src={img} alt={name} className="team-add-img" loading="lazy" />
                  <span className="team-add-num">{padId(p.id)}</span>
                  <span className="team-add-name">{name}</span>
                  {d?.types && (
                    <span className="tb-pick-types">
                      {d.types.map(t => (
                        <span key={t.type.name} className="tp" data-type={t.type.name}>
                          {typeLabel(t.type.name)}
                        </span>
                      ))}
                    </span>
                  )}
                  {bst != null && <span className="tb-pick-bst">{bst}</span>}
                  {inTeam && (
                    <span className="tb-pick-badge">
                      {lang === "th" ? "อยู่ในทีมแล้ว" : lang === "ja" ? "編成済み" : "On the team"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {filtered && filtered.length === 0 && (
            <div className="tb-picker-empty">
              <p>{lang === "th" ? "ไม่พบโปเกมอนที่ตรงกับเงื่อนไข"
                : lang === "ja" ? "条件に合うポケモンが見つかりません"
                : "No Pokémon match these filters"}</p>
              <button type="button" className="tb-btn tb-btn-outline" onClick={clearAll}>
                {lang === "th" ? "ล้างตัวกรอง" : lang === "ja" ? "条件をクリア" : "Clear filters"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────
export default function TeamBuilder({ allList, thaiArr, jpArr, lang, cachedFetch, genFilter = 0, onClearGen }) {
  const s = STRINGS[lang];

  const [mode, setMode] = useState(() => {
    try { return localStorage.getItem(TEAM_MODE_KEY) ?? "go"; } catch { return "go"; }
  });
  useEffect(() => { try { localStorage.setItem(TEAM_MODE_KEY, mode); } catch {} }, [mode]);
  const modeRef = useRef(mode);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  // ─── Team + per-Pokémon data, stored SEPARATELY per mode (go / normal) ──
  const loadJSON = (key, fb) => {
    try { return JSON.parse(localStorage.getItem(key) ?? JSON.stringify(fb)); } catch { return fb; }
  };
  const [teamsByMode, setTeamsByMode] = useState(() => ({
    go:     loadJSON(TEAM_KEY, []),            // existing key → GO team (back-compat)
    normal: loadJSON(TEAM_KEY_NORMAL, []),
  }));
  const [dataByMode, setDataByMode] = useState(() => ({
    go:     loadJSON(TEAM_DATA_KEY, {}),
    normal: loadJSON(TEAM_DATA_KEY_NORMAL, {}),
  }));
  useEffect(() => { try { localStorage.setItem(TEAM_KEY,             JSON.stringify(teamsByMode.go)); }     catch {} }, [teamsByMode.go]);
  useEffect(() => { try { localStorage.setItem(TEAM_KEY_NORMAL,      JSON.stringify(teamsByMode.normal)); } catch {} }, [teamsByMode.normal]);
  useEffect(() => { try { localStorage.setItem(TEAM_DATA_KEY,        JSON.stringify(dataByMode.go)); }       catch {} }, [dataByMode.go]);
  useEffect(() => { try { localStorage.setItem(TEAM_DATA_KEY_NORMAL, JSON.stringify(dataByMode.normal)); }   catch {} }, [dataByMode.normal]);

  // Active slice for the current mode + setters that keep the same API
  const team = teamsByMode[mode];
  const teamData = dataByMode[mode];
  const setTeam = useCallback((u) => setTeamsByMode(p => {
    const m = modeRef.current;
    return { ...p, [m]: typeof u === "function" ? u(p[m]) : u };
  }), []);
  const setTeamData = useCallback((u) => setDataByMode(p => {
    const m = modeRef.current;
    return { ...p, [m]: typeof u === "function" ? u(p[m]) : u };
  }), []);

  const getData = useCallback((id) => teamData[id] ?? {}, [teamData]);

  // ─── Team size limit (GO mode = 3, Normal mode = 6) ──────────────────
  const maxTeamSize = mode === "go" ? 3 : 6;
  useEffect(() => {
    // Trim active team using functional setState (avoids stale closure)
    setTeam(prev => prev.length > maxTeamSize ? prev.slice(0, maxTeamSize) : prev);
  }, [mode, maxTeamSize, setTeam]);

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
  const [suggestType, setSuggestType] = useState(null);
  const [pickingSlot, setPickingSlot] = useState(null);
  const [generating, setGenerating] = useState(false);

  // Arriving from a filtered Pokédex keeps that generation (generations spec
  // §4.3): the pool itself is narrowed, so every picker, the random fill and
  // the suggestions all obey it without each having to know about the filter.
  const allWithMeta = useMemo(() => {
    const g = GENERATIONS[genFilter];
    return allList.map(p => {
      const id = parseInt(p.url.split("/").filter(Boolean).pop(), 10);
      return { name: p.name, url: p.url, id };
    }).filter(p => p.id && p.id <= 1025
      && (!g || genFilter === 0 || (p.id >= g.min && p.id <= g.max)));
  }, [allList, genFilter]);

  const teamAnalysis = useMemo(() => team.length > 0 ? analyzeTeam(team) : null, [team]);

  // A grade, and the reason for it. The panel could only state facts before —
  // here is what the team is weak to — without ever saying what to do about
  // it, which is the whole point of a team tool.
  const teamBalance = useMemo(() => {
    if (!team.length || !teamAnalysis) return null;

    // 1. Type diversity: distinct types across the team, against the most it
    //    could reasonably have (two per member, capped at 18 real types).
    const types = new Set();
    team.forEach(p => p.types.forEach(t => types.add(t.type.name)));
    const diversity = Math.min(1, types.size / Math.min(team.length * 2, 18));

    // 2. Shared weaknesses: a type three members fold to costs more than three
    //    types one member each folds to, so the penalty grows with the stack.
    const stacked = Object.values(teamAnalysis.weak).filter(c => c >= 2);
    const weakPenalty = Math.min(1, stacked.reduce((a, c) => a + (c - 1), 0) / (team.length * 1.5));

    // 3. Stat spread: one 600 and five 300s is not a team.
    const totals = team.map(p => p.stats.reduce((a, st) => a + st.base_stat, 0));
    const mean = totals.reduce((a, b) => a + b, 0) / totals.length;
    const sd = Math.sqrt(totals.reduce((a, v) => a + (v - mean) ** 2, 0) / totals.length);
    const evenness = Math.max(0, 1 - sd / 120);

    const score = Math.round((diversity * 45 + (1 - weakPenalty) * 40 + evenness * 15));
    const grade =
      score >= 90 ? "A+" : score >= 82 ? "A" : score >= 74 ? "B+" :
      score >= 66 ? "B"  : score >= 58 ? "C+" : score >= 48 ? "C" :
      score >= 38 ? "D"  : "E";

    // The two worst offenders, by name, so the headline is a diagnosis
    // rather than a letter the reader has to interpret.
    const worst = Object.entries(teamAnalysis.weak)
      .filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]).slice(0, 2);

    return { score, grade, types: types.size, stacked: stacked.length, worst };
  }, [team, teamAnalysis]);

  // id -> the attacking types that member takes super-effective damage from,
  // and the inverse. The inverse is what lets hovering a chip light up the
  // members responsible for it.
  const weakByType = useMemo(() => {
    const map = {};
    team.forEach(p => {
      calcDefMatchups(p.types).forEach(({ type, mult }) => {
        if (mult >= 2) (map[type] ??= []).push(p.id);
      });
    });
    return map;
  }, [team]);

  const [hoverType, setHoverType] = useState(null);
  const [showAllWeak, setShowAllWeak] = useState(false);
  const [showResists, setShowResists] = useState(false);

  const typeName = (tn) =>
    lang==="th" ? (TYPE_NAMES_TH[tn]??tn) : lang==="ja" ? (TYPE_NAMES_JA[tn]??tn) : tn;

  // The headline, as a sentence. "C · 6 repeated weaknesses" told the reader
  // a grade and a count and left them to work out what to do; this names the
  // types and how many members fold to each.
  const balanceVerdict = useMemo(() => {
    if (!teamBalance) return "";
    const w = teamBalance.worst;
    if (!w.length) {
      return lang === "th" ? "ทีมนี้ไม่มีจุดอ่อนที่ซ้ำกันเลย ถือว่าครอบคลุมดีมาก"
        : lang === "ja" ? "共通の弱点がなく、バランスの取れた構成です"
        : "No type beats more than one member — this team covers itself well.";
    }
    const names = w.map(([t]) => typeName(t));
    const counts = w.map(([, c]) => c);
    const same = counts.every(c => c === counts[0]);
    if (w.length === 1 || !same) {
      const parts = w.map(([t, c]) => lang === "th" ? `${typeName(t)} ${c} ตัว`
        : lang === "ja" ? `${typeName(t)}に${c}匹` : `${c} to ${typeName(t)}`);
      return lang === "th" ? `จุดอ่อนหลักของทีมนี้คือ แพ้${parts.join(" และ ")}`
        : lang === "ja" ? `主な弱点：${parts.join("、")}`
        : `This team's main problem: it loses ${parts.join(" and ")}.`;
    }
    return lang === "th" ? `จุดอ่อนซ้ำเยอะ — ทีมนี้แพ้${names.join("และ")}อย่างละ ${counts[0]} ตัว`
      : lang === "ja" ? `弱点が重複：${names.join("と")}にそれぞれ${counts[0]}匹`
      : `Repeated weaknesses — ${counts[0]} members each fall to ${names.join(" and ")}.`;
  }, [teamBalance, lang, typeName]);

  // Types whose defensive profile resists what this team keeps losing to.
  // Ranked by how many of those shared weaknesses each one answers.
  const teamSuggestions = useMemo(() => {
    if (!teamAnalysis) return [];
    const holes = Object.entries(teamAnalysis.weak)
      .filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]).map(([t]) => t);
    if (!holes.length) return [];
    const owned = new Set();
    team.forEach(p => p.types.forEach(t => owned.add(t.type.name)));

    return ALL_TYPES
      .filter(cand => !owned.has(cand))
      .map(cand => {
        const mu = calcDefMatchups([{ type: { name: cand } }]);
        const covers = holes.filter(h => (mu.find(m => m.type === h)?.mult ?? 1) <= 0.5).length;
        return { type: cand, covers };
      })
      .filter(x => x.covers > 0)
      .sort((a, b) => b.covers - a.covers)
      .slice(0, 5);
  }, [teamAnalysis, team]);

  // Normal mode's headline number. GO has Total/Avg CP; without this the bar
  // would go blank on the mode this page opens in.
  const teamAvgTotal = useMemo(() => {
    if (!team.length) return 0;
    const sum = team.reduce(
      (a, p) => a + p.stats.reduce((b, st) => b + st.base_stat, 0), 0);
    return Math.round(sum / team.length);
  }, [team]);

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
          --tb-shadow-glow-indigo: 0 0 40px rgba(144, 6, 3, 0.35);
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
          0%   { box-shadow: 0 0 0 0 rgba(144, 6, 3, 0.5); }
          100% { box-shadow: 0 0 0 18px rgba(144, 6, 3, 0); }
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
        @keyframes tm-spin { to { transform: rotate(360deg); } }
        @keyframes tm-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        /* lucide icons inline in buttons */
        .team-page .tb-action-btn, .team-page .cs-preset, .team-page .random-menu-item,
        .team-page .go-analysis-good { display: inline-flex; align-items: center; gap: 7px; }
        .team-page svg { flex-shrink: 0; }
        .team-page .go-card-remove, .team-page .go-card-swap,
        .team-page .tb-mode-icon, .team-page .go-overview-icon, .team-page .random-menu-icon {
          display: inline-flex; align-items: center; justify-content: center;
        }

        /* ═══════════════════════════════════════════════════════════════════
           1. HERO HEADER — Dark mesh gradient with shimmer
           ═══════════════════════════════════════════════════════════════════ */
        .team-page .team-hero {
          position: relative !important;
          margin-bottom: 22px !important;
          padding: 28px 28px 24px !important;
          border-radius: 18px !important;
          background: #1f1d20 !important;
          color: #fff !important;
          overflow: hidden !important;
          border: 1px solid rgba(255,255,255,0.06) !important;
          box-shadow: var(--shadow-md) !important;
          animation: tb-fade-up 0.5s var(--tb-ease) !important;
        }
        .team-page .team-hero::before { display: none !important; }
        .team-page .team-hero h1 {
          position: relative !important;
          z-index: 2 !important;
          font-family: var(--font-body) !important;
          font-size: 26px !important;
          font-weight: 900 !important;
          margin: 0 0 6px 0 !important;
          letter-spacing: -0.02em !important;
          color: #fff !important;
          background: none !important;
          -webkit-text-fill-color: #fff !important;
          line-height: 1.15 !important;
          text-shadow: none !important;
        }
        .team-page .team-hero p {
          position: relative !important; z-index: 2 !important;
          font-size: 13px !important;
          color: rgba(255, 255, 255, 0.7) !important;
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
          background: color-mix(in srgb, var(--blue) 7%, transparent) !important;
          color: var(--blue) !important;
          transform: translateY(-1px) !important;
        }
        .tb-mode-btn.active {
          color: white !important;
          background: var(--blue) !important;
          box-shadow: var(--shadow-sm) !important;
          transform: translateY(-2px) !important;
        }
        .tb-mode-btn.tb-mode-go.active {
          background: var(--blue) !important;
          box-shadow: var(--shadow-sm) !important;
        }
        .tb-mode-icon { flex-shrink: 0 !important; }
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
          background: var(--blue) !important;
          color: white !important;
          box-shadow: var(--shadow-sm) !important;
        }
        .tb-action-btn.primary:hover:not(:disabled) {
          transform: translateY(-2px) !important;
          filter: brightness(1.1) !important;
          box-shadow: var(--shadow-md) !important;
        }
        .tb-action-btn.primary:disabled {
          opacity: 0.4 !important; cursor: not-allowed !important;
          background: var(--border-mid) !important;
          color: var(--text-muted) !important;
          box-shadow: none !important;
        }
        .tb-action-btn.ghost {
          background: var(--bg-muted) !important;
          color: var(--text-secondary) !important;
          border: 1px solid var(--border) !important;
        }
        .tb-action-btn.ghost:hover {
          color: #d23a4a !important;
          border-color: rgba(210,58,74,0.4) !important;
          transform: translateY(-2px) !important;
        }
        .random-btn-main {
          background: var(--bg-card) !important;
          color: var(--text-primary) !important;
          border: 1px solid var(--border) !important;
          box-shadow: var(--shadow-sm) !important;
        }
        .random-btn-main:hover:not(:disabled) {
          transform: translateY(-2px) !important;
          border-color: var(--blue) !important;
          color: var(--blue) !important;
          box-shadow: var(--shadow-md) !important;
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
          background: linear-gradient(90deg, rgba(144,6,3,0.10), rgba(181,48,45,0.06)) !important;
          transform: translateX(2px) !important;
        }
        .random-menu-icon { font-size: 22px !important; flex-shrink: 0 !important; }
        .random-menu-text { display: flex !important; flex-direction: column !important; gap: 2px !important; }
        .random-menu-name { font-weight: 800 !important; font-size: 13px !important; color: #1f1d20 !important; }
        :root[data-theme="dark"] .random-menu-name,
        [data-theme="dark"] .random-menu-name { color: #efece4 !important; }
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
          background: linear-gradient(135deg, transparent 50%, rgba(144,6,3,0.06) 100%);
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
          box-shadow: 0 4px 12px rgba(144, 6, 3, 0.2), inset 0 1px 0 rgba(255,255,255,0.9) !important;
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
          background: color-mix(in srgb, var(--league-color, #900603) 25%, white) !important;
          box-shadow: 0 4px 12px color-mix(in srgb, var(--league-color, #900603) 30%, transparent) !important;
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
            radial-gradient(circle at 50% 30%, rgba(144,6,3,0.10), transparent 50%),
            linear-gradient(135deg, rgba(255,255,255,0.8), rgba(241,245,249,0.9)) !important;
          backdrop-filter: blur(12px) !important;
          border: 2px dashed rgba(144,6,3,0.25) !important;
          box-shadow: var(--tb-shadow-sm) !important;
        }
        :root[data-theme="dark"] .empty-state,
        [data-theme="dark"] .empty-state {
          background:
            radial-gradient(circle at 50% 30%, rgba(144,6,3,0.18), transparent 50%),
            linear-gradient(135deg, rgba(15,23,42,0.6), rgba(30,41,59,0.7)) !important;
          border-color: rgba(144,6,3,0.35) !important;
        }
        .empty-icon {
          display: block !important;
          font-size: 72px !important;
          margin-bottom: 16px !important;
          animation: tb-float-soft 4s ease-in-out infinite !important;
          filter: drop-shadow(0 8px 20px rgba(144,6,3,0.25)) !important;
        }
        .empty-title {
          font-size: 22px !important;
          font-weight: 900 !important;
          color: #1f1d20 !important;
          margin-bottom: 8px !important;
          letter-spacing: -0.02em !important;
        }
        :root[data-theme="dark"] .empty-title,
        [data-theme="dark"] .empty-title { color: #efece4 !important; }
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
          min-height: 200px !important;
          border-radius: 16px !important;
          background: transparent !important;
          border: 1.5px dashed var(--border-mid) !important;
          color: var(--text-muted) !important;
          cursor: pointer !important;
          transition: border-color .2s, color .2s, background .2s, transform .2s var(--tb-ease) !important;
        }
        .empty-slot:hover {
          background: color-mix(in srgb, var(--blue) 5%, transparent) !important;
          border-color: var(--blue) !important;
          color: var(--blue) !important;
          transform: translateY(-3px) !important;
        }
        :root[data-theme="dark"] .empty-slot,
        [data-theme="dark"] .empty-slot {
          background: transparent !important;
          border-color: rgba(255,255,255,0.14) !important;
        }
        
        /* ═══════════════════════════════════════════════════════════════════
           7. POKEMON GO CARD — Premium stage + glass info panel
           ═══════════════════════════════════════════════════════════════════ */
        .pgo-card {
          position: relative !important;
          border: 1px solid var(--border) !important;
          padding: 0 !important;
          overflow: hidden !important;
          border-radius: 18px !important;
          background: var(--bg-card) !important;
          box-shadow: var(--shadow-sm) !important;
          display: flex !important;
          flex-direction: column !important;
          transition: transform 0.28s var(--tb-ease), box-shadow 0.28s !important;
        }
        .pgo-card:hover {
          transform: translateY(-5px) !important;
          box-shadow: var(--shadow-md) !important;
        }
        :root[data-theme="dark"] .pgo-card,
        [data-theme="dark"] .pgo-card { background: var(--bg-card) !important; border-color: rgba(255,255,255,0.08) !important; }
        
        /* Stage */
        .pgo-stage {
          position: relative;
          padding: 16px 16px 8px;
          overflow: hidden;
        }
        .pgo-stage::before, .pgo-stage::after { display: none; }
        .pgo-arc { display: none !important; }
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
          background: var(--bg-card) !important;
          backdrop-filter: blur(8px) !important;
          border: 1px solid var(--border) !important;
          color: var(--text-secondary) !important;
          cursor: pointer !important;
          box-shadow: var(--shadow-sm) !important;
          transition: transform 0.2s var(--tb-ease), color 0.18s, border-color 0.18s !important;
        }
        .pgo-card .go-card-remove { right: 12px !important; }
        .pgo-card .go-card-swap { left: 12px !important; }
        .pgo-card .go-card-remove:hover { color: #d23a4a !important; border-color: rgba(210,58,74,0.45) !important; transform: scale(1.1) !important; }
        .pgo-card .go-card-swap:hover { color: var(--blue) !important; border-color: var(--blue) !important; transform: scale(1.1) !important; }
        
        /* CP big at top */
        .pgo-cp-top {
          text-align: center;
          color: var(--text-primary) !important;
          margin: 2px 0 12px;
          text-shadow: none !important;
          letter-spacing: 0.04em;
          position: relative;
          z-index: 2;
        }
        .pgo-cp-top-label { font-size: 12px !important; font-weight: 800 !important; opacity: 0.55 !important; letter-spacing: 0.2em !important; }
        .pgo-cp-top-value { font-size: 34px !important; font-weight: 900 !important; letter-spacing: -0.03em !important; margin-left: 8px !important; color: var(--blue) !important; }
        
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
          border: 3px solid var(--league-color, #900603) !important;
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
          border: 3px solid var(--league-color, #900603) !important;
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
          color: var(--text-muted) !important;
          letter-spacing: 0.08em !important;
          text-shadow: none !important;
        }
        .pgo-cp-league-pill {
          font-size: 11px !important; font-weight: 800 !important;
          color: white !important;
          padding: 4px 12px !important;
          border-radius: 999px !important;
          box-shadow: none !important;
          letter-spacing: 0.05em !important;
          white-space: nowrap !important;
        }
        
        /* Arc decoration */
        .pgo-arc {
          width: 80% !important;
          margin: 0 auto -32px !important;
          display: block !important;
          position: relative !important; z-index: 1 !important;
          filter: drop-shadow(0 2px 6px rgba(0,0,0,0.2)) !important;
        }
        
        /* Pokemon image — clean, soft ground shadow */
        .pgo-card .go-card-img {
          background: transparent !important;
          border: none !important; padding: 0 !important;
          max-width: 62% !important;
          margin: 4px auto 2px !important;
          filter: drop-shadow(0 8px 10px rgba(0,0,0,0.16)) !important;
          display: block !important;
          position: relative !important;
          z-index: 2 !important;
          transition: transform 0.3s var(--tb-ease) !important;
        }
        .pgo-card:hover .go-card-img { transform: scale(1.05) translateY(-2px) !important; }
        
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
          padding: 4px 11px !important;
          font-size: 10px !important;
          font-weight: 800 !important;
          letter-spacing: 0.05em !important;
          text-transform: uppercase !important;
          color: white !important;
          border-radius: 7px !important;
          box-shadow: none !important;
          border: none !important;
          text-shadow: none !important;
        }
        
        /* Info panel */
        .pgo-info-panel {
          background: transparent !important;
          margin: 10px 14px 0 !important;
          border-top: 1px solid var(--border) !important;
          border-radius: 0 !important;
          padding: 14px 4px 16px !important;
          position: relative !important;
          z-index: 4 !important;
          box-shadow: none !important;
        }
        :root[data-theme="dark"] .pgo-info-panel,
        [data-theme="dark"] .pgo-info-panel { background: transparent !important; }
        
        .pgo-name-row {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 8px !important;
          margin-bottom: 4px !important;
        }
        .pgo-card .go-card-name {
          font-family: var(--font-body) !important;
          font-size: 19px !important;
          font-weight: 800 !important;
          color: var(--text-primary) !important;
          text-align: center !important;
          margin: 0 !important;
          letter-spacing: -0.01em !important;
          text-transform: capitalize !important;
        }
        :root[data-theme="dark"] .pgo-card .go-card-name,
        [data-theme="dark"] .pgo-card .go-card-name { color: var(--text-primary) !important; }
        .pgo-card .go-card-id {
          font-size: 10.5px !important;
          font-weight: 700 !important;
          color: var(--text-muted) !important;
          opacity: 1 !important;
          letter-spacing: 0.12em !important;
          text-align: center !important;
          margin: 2px 0 14px !important;
        }
        
        /* ═══════════════════════════════════════════════════════════════════
           8. APPRAISE CARD (medal + stars + 3 IV bars)
           ═══════════════════════════════════════════════════════════════════ */
        .pgo-appraise-card {
          position: relative !important;
          margin: 12px 0 0 !important;
          padding: 16px !important;
          border-radius: 14px !important;
          background: var(--bg-muted) !important;
          border: 1px solid var(--border) !important;
          box-shadow: none !important;
        }
        :root[data-theme="dark"] .pgo-appraise-card,
        [data-theme="dark"] .pgo-appraise-card {
          background: rgba(255,255,255,0.04) !important;
          border-color: rgba(255,255,255,0.08) !important;
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
          color: #e0a92e !important;
          filter: none !important;
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
          color: #1f1d20 !important;
          margin-bottom: 12px !important;
          letter-spacing: -0.01em !important;
        }
        :root[data-theme="dark"] .go-analysis-title,
        [data-theme="dark"] .go-analysis-title { color: #efece4 !important; }
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
        [data-theme="dark"] .go-card-normal { background: #211f20 !important; }
        .go-card-normal .go-card-img { max-width: 70% !important; }
        .go-card-normal .go-card-name { font-weight: 900 !important; font-size: 18px !important; color: #1f1d20 !important; }
        :root[data-theme="dark"] .go-card-normal .go-card-name,
        [data-theme="dark"] .go-card-normal .go-card-name { color: #efece4 !important; }
        
        /* Reduce-motion respect */
        @media (prefers-reduced-motion: reduce) {
          .pgo-stage::before,
          .pgo-stage::after,
          .pgo-card .go-card-img,
          .empty-icon,
          .team-page .team-hero::before,
          .go-team-hundo-banner { animation: none !important; }
        }

        /* ═══════════════════════════════════════════════════════════
           ◇ GO CARD — fresh minimal rebuild (overrides all above)
           ═══════════════════════════════════════════════════════════ */
        .pgo-card {
          position: relative !important;
          display: flex !important; flex-direction: column !important;
          align-items: stretch !important; gap: 0 !important;
          background: var(--bg-card) !important;
          border: 1px solid var(--border) !important;
          border-radius: 16px !important;
          overflow: hidden !important; padding: 0 !important;
          box-shadow: var(--shadow-sm) !important;
          transition: transform .25s var(--ease-out), box-shadow .25s, border-color .2s !important;
        }
        .pgo-card:hover {
          transform: translateY(-4px) !important;
          box-shadow: var(--shadow-md) !important;
          border-color: var(--border-mid) !important;
        }
        [data-theme="dark"] .pgo-card { background: var(--bg-card) !important; border-color: rgba(255,255,255,.08) !important; }

        /* soft pastel panel holding the pokemon */
        .pgo-card .pgo-stage {
          position: relative !important;
          display: flex !important; align-items: center !important; justify-content: center !important;
          margin: 12px 12px 0 !important;
          padding: 18px 14px !important;
          border-radius: 16px !important;
          background: color-mix(in srgb, var(--pgo-type) 13%, var(--bg-card)) !important;
          min-height: 0 !important;
        }
        .pgo-card .pgo-stage::before, .pgo-card .pgo-stage::after, .pgo-card .pgo-arc { display: none !important; }

        /* corner buttons */
        .pgo-card .go-card-remove, .pgo-card .go-card-swap {
          position: absolute !important; top: 10px !important;
          width: 28px !important; height: 28px !important; border-radius: 50% !important;
          display: inline-flex !important; align-items: center !important; justify-content: center !important;
          background: var(--bg-card) !important; border: 1px solid var(--border) !important;
          color: var(--text-muted) !important; box-shadow: var(--shadow-sm) !important;
          cursor: pointer !important; z-index: 5 !important; backdrop-filter: blur(6px) !important;
          transition: transform .18s, color .18s, border-color .18s !important;
        }
        .pgo-card .go-card-remove { right: 10px !important; }
        .pgo-card .go-card-swap { left: 10px !important; }
        .pgo-card .go-card-remove:hover { color: #d23a4a !important; border-color: rgba(210,58,74,.45) !important; transform: scale(1.1) !important; }
        .pgo-card .go-card-swap:hover { color: var(--blue) !important; border-color: var(--blue) !important; transform: scale(1.1) !important; }

        /* pokemon image */
        .pgo-card .go-card-img {
          width: 60% !important; max-width: 60% !important; height: auto !important;
          margin: 0 auto !important; display: block !important;
          position: relative !important; z-index: 2 !important;
          background: none !important; border: none !important; padding: 0 !important;
          filter: drop-shadow(0 8px 10px rgba(0,0,0,.14)) !important;
          transition: transform .3s var(--ease-out) !important;
        }
        .pgo-card:hover .go-card-img { transform: scale(1.05) translateY(-2px) !important; }

        /* name + id row */
        .pgo-card .pgo-head { display: flex !important; align-items: baseline !important; justify-content: space-between !important; gap: 8px !important; }
        .pgo-card .go-card-name {
          font-family: var(--font-body) !important; font-size: 18px !important; font-weight: 800 !important;
          color: var(--text-primary) !important; text-align: left !important; margin: 0 !important;
          letter-spacing: -.01em !important; text-transform: capitalize !important; line-height: 1.15 !important;
          overflow: hidden !important; text-overflow: ellipsis !important; white-space: nowrap !important;
        }
        [data-theme="dark"] .pgo-card .go-card-name { color: var(--text-primary) !important; }
        .pgo-card .go-card-id {
          font-size: 11px !important; font-weight: 700 !important; color: var(--text-muted) !important;
          opacity: 1 !important; letter-spacing: .08em !important; text-align: right !important; margin: 0 !important; flex-shrink: 0 !important;
        }

        /* soft type chips */
        .pgo-card .go-card-types { display: flex !important; justify-content: flex-start !important; gap: 6px !important; margin: 0 !important; }
        .pgo-card .type-tag-mini {
          padding: 4px 12px !important; font-size: 10.5px !important; font-weight: 800 !important;
          letter-spacing: .02em !important; text-transform: capitalize !important;
          border-radius: 999px !important; box-shadow: none !important; border: none !important; text-shadow: none !important;
        }

        /* body */
        .pgo-card .pgo-info-panel {
          background: transparent !important; margin: 0 !important; padding: 14px 16px 16px !important;
          border: none !important; border-radius: 0 !important; box-shadow: none !important;
          display: flex !important; flex-direction: column !important; gap: 12px !important;
        }

        /* CP block */
        .pgo-card .pgo-cp-block { border-top: 1px solid var(--border) !important; padding-top: 12px !important; }
        .pgo-card .pgo-cp-top {
          display: flex !important; align-items: baseline !important; gap: 8px !important;
          color: var(--text-primary) !important; text-shadow: none !important; margin: 0 0 9px !important;
        }
        .pgo-card .pgo-cp-top-label { font-size: 11px !important; font-weight: 800 !important; color: var(--text-muted) !important; letter-spacing: .14em !important; }
        .pgo-card .pgo-cp-top-value { font-size: 26px !important; font-weight: 900 !important; color: var(--text-primary) !important; letter-spacing: -.02em !important; line-height: 1 !important; }
        .pgo-card .pgo-cp-league-pill {
          margin-left: auto !important; align-self: center !important;
          font-size: 10px !important; font-weight: 800 !important;
          padding: 3px 10px !important; border-radius: 999px !important; box-shadow: none !important;
          letter-spacing: .03em !important; white-space: nowrap !important;
          display: inline-flex !important; align-items: center !important; gap: 4px !important;
        }
        .pgo-card .pgo-cp-slider-wrap { padding: 0 !important; margin: 0 !important; }
        .pgo-card .pgo-cp-slider {
          width: 100% !important; height: 6px !important; border-radius: 999px !important;
          -webkit-appearance: none !important; appearance: none !important; cursor: pointer !important;
        }
        .pgo-card .pgo-cp-slider::-webkit-slider-thumb {
          -webkit-appearance: none !important; appearance: none !important;
          width: 16px !important; height: 16px !important; border-radius: 50% !important;
          background: #fff !important; border: 2.5px solid var(--league-color, var(--blue)) !important;
          box-shadow: var(--shadow-sm) !important; cursor: grab !important;
        }
        .pgo-card .pgo-cp-slider::-moz-range-thumb {
          width: 16px !important; height: 16px !important; border-radius: 50%; background: #fff;
          border: 2.5px solid var(--league-color, var(--blue)); box-shadow: var(--shadow-sm);
        }

        /* appraise */
        .pgo-card .pgo-appraise-card {
          background: transparent !important; border: none !important; border-top: 1px solid var(--border) !important;
          border-radius: 0 !important; padding: 12px 0 0 !important; box-shadow: none !important; margin: 0 !important;
        }
        .pgo-card .pgo-appraise-top { display: flex !important; align-items: center !important; gap: 10px !important; margin: 0 0 12px !important; }
        .pgo-card .pgo-appraise-stars { display: inline-flex !important; gap: 2px !important; }
        .pgo-card .pgo-star { font-size: 17px !important; color: var(--border-mid) !important; text-shadow: none !important; line-height: 1 !important; }
        .pgo-card .pgo-star.filled { color: #e0a92e !important; filter: none !important; }
        .pgo-card .pgo-appraise-label { font-size: 12px !important; font-weight: 800 !important; letter-spacing: .01em !important; }

        /* IV bars */
        .pgo-card .pgo-appraise-bars { display: flex !important; flex-direction: column !important; gap: 9px !important; }
        .pgo-card .pgo-iv-row { display: grid !important; grid-template-columns: 34px 1fr !important; align-items: center !important; gap: 10px !important; }
        .pgo-card .pgo-iv-label { font-size: 10px !important; font-weight: 800 !important; color: var(--text-muted) !important; letter-spacing: .06em !important; }
        .pgo-card .pgo-iv-bar-wrap { position: relative !important; height: 16px !important; display: flex !important; align-items: center !important; }
        .pgo-card .pgo-iv-track { position: relative !important; width: 100% !important; height: 6px !important; border-radius: 999px !important; background: var(--border-mid) !important; overflow: visible !important; }
        .pgo-card .pgo-iv-fill { position: absolute !important; left: 0 !important; top: 0 !important; bottom: 0 !important; border-radius: 999px !important; background: var(--blue) !important; transition: width .2s !important; }
        .pgo-card .pgo-iv-cut { position: absolute !important; top: -1px !important; width: 1px !important; height: 8px !important; background: var(--bg-card) !important; opacity: .8 !important; }
        .pgo-card .pgo-iv-cut.c1 { left: 33.333% !important; }
        .pgo-card .pgo-iv-cut.c2 { left: 66.666% !important; }
        .pgo-card .pgo-iv-slider {
          position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; height: 16px !important;
          margin: 0 !important; -webkit-appearance: none !important; appearance: none !important; background: transparent !important; cursor: pointer !important;
        }
        .pgo-card .pgo-iv-slider::-webkit-slider-thumb {
          -webkit-appearance: none !important; appearance: none !important;
          width: 13px !important; height: 13px !important; border-radius: 50% !important;
          background: #fff !important; border: 2px solid var(--blue) !important; box-shadow: var(--shadow-sm) !important; cursor: grab !important;
        }
        .pgo-card .pgo-iv-slider::-moz-range-thumb {
          width: 13px !important; height: 13px !important; border-radius: 50%; background: #fff; border: 2px solid var(--blue); box-shadow: var(--shadow-sm);
        }

        /* ═══════════════════════════════════════════════════════════
           ◇ PAGE CHROME — final minimal pass (overview / banner / empty)
           ═══════════════════════════════════════════════════════════ */
        /* CP overview — clean white panel, neutral stat tiles */
        .go-team-overview-modern {
          background: var(--bg-card) !important;
          border: 1px solid var(--border) !important;
          box-shadow: var(--shadow-sm) !important;
          border-radius: 16px !important;
          padding: 14px !important;
          gap: 12px !important;
        }
        .go-team-overview-modern .go-overview-item {
          background: var(--bg-muted) !important;
          border: 1px solid var(--border) !important;
          box-shadow: none !important;
          min-height: 0 !important; padding: 14px !important;
          backdrop-filter: none !important;
          transition: transform .2s var(--tb-ease), border-color .2s !important;
        }
        .go-team-overview-modern .go-overview-item::before { display: none !important; }
        .go-team-overview-modern .go-overview-item:hover {
          transform: translateY(-2px) !important;
          border-color: var(--border-mid) !important;
          box-shadow: var(--shadow-sm) !important;
        }
        .go-team-overview-modern .go-overview-icon,
        .go-team-overview-modern .total-cp .go-overview-icon,
        .go-team-overview-modern .avg-cp .go-overview-icon {
          width: 40px !important; height: 40px !important; flex: 0 0 40px !important;
          border-radius: 12px !important; font-size: 0 !important;
          background: var(--bg-card) !important; border: 1px solid var(--border) !important;
          box-shadow: none !important; color: var(--blue) !important;
        }
        .go-team-overview-modern .league .go-overview-icon {
          background: color-mix(in srgb, var(--league-color, var(--blue)) 12%, var(--bg-card)) !important;
          border-color: color-mix(in srgb, var(--league-color, var(--blue)) 30%, transparent) !important;
          color: var(--league-color, var(--blue)) !important; box-shadow: none !important;
        }
        .go-team-overview-modern .go-overview-label { color: var(--text-muted) !important; font-weight: 800 !important; letter-spacing: .12em !important; }
        .go-team-overview-modern .go-overview-val { font-size: 22px !important; font-weight: 900 !important; color: var(--text-primary) !important; letter-spacing: -.02em !important; }
        .go-team-overview-modern .league .go-overview-val { color: var(--league-color, var(--blue)) !important; }
        [data-theme="dark"] .go-team-overview-modern { background: var(--bg-card) !important; border-color: rgba(255,255,255,.08) !important; }
        [data-theme="dark"] .go-team-overview-modern .go-overview-item { background: rgba(255,255,255,.04) !important; border-color: rgba(255,255,255,.08) !important; }
        [data-theme="dark"] .go-team-overview-modern .go-overview-icon { background: rgba(255,255,255,.05) !important; border-color: rgba(255,255,255,.1) !important; }
        [data-theme="dark"] .go-team-overview-modern .go-overview-val { color: var(--text-primary) !important; }
        [data-theme="dark"] .go-team-overview-modern .go-overview-label { color: var(--text-muted) !important; }

        /* HUNDO banner — soft gold, no shimmer */
        .go-team-hundo-banner {
          background: rgba(201,162,62,0.13) !important;
          border: 1px solid rgba(201,162,62,0.4) !important;
          color: #a07d22 !important;
          box-shadow: none !important; text-shadow: none !important; animation: none !important;
          border-radius: 12px !important; padding: 12px 18px !important;
          font-size: 13.5px !important; font-weight: 800 !important; letter-spacing: .02em !important;
          display: flex !important; align-items: center !important; justify-content: center !important; gap: 8px !important;
        }
        [data-theme="dark"] .go-team-hundo-banner { color: #d4b25a !important; }

        /* EMPTY STATE — clean dashed */
        .empty-state {
          background: transparent !important;
          border: 1.5px dashed var(--border-mid) !important;
          box-shadow: none !important; backdrop-filter: none !important;
          border-radius: 18px !important; padding: 56px 30px !important;
        }
        [data-theme="dark"] .empty-state { background: transparent !important; border-color: rgba(255,255,255,.14) !important; }
        .empty-icon { color: var(--border-mid) !important; filter: none !important; }
        [data-theme="dark"] .empty-icon { color: rgba(255,255,255,.2) !important; }

        /* team analysis — clean cards */
        .go-analysis-block {
          background: var(--bg-card) !important; border: 1px solid var(--border) !important;
          box-shadow: var(--shadow-sm) !important; backdrop-filter: none !important; border-radius: 14px !important;
        }
        [data-theme="dark"] .go-analysis-block { background: var(--bg-card) !important; border-color: rgba(255,255,255,.08) !important; }
        .go-analysis-title { color: var(--text-primary) !important; }

        /* random-team dropdown — clean surface */
        .random-menu {
          background: var(--bg-card) !important; border: 1px solid var(--border) !important;
          box-shadow: var(--shadow-lg) !important; backdrop-filter: none !important;
        }
        [data-theme="dark"] .random-menu { background: var(--bg-card) !important; border-color: rgba(255,255,255,.1) !important; }
        .random-menu-item { background: transparent !important; }
        .random-menu-item:hover { background: var(--bg-muted) !important; }
        .random-menu-name { color: var(--text-primary) !important; }
        [data-theme="dark"] .random-menu-name { color: var(--text-primary) !important; }
        .random-menu-desc { color: var(--text-muted) !important; }
        .random-menu-icon { color: var(--blue) !important; font-size: 0 !important; }

        /* ═══ Shipped with the component ══════════════════════════════════
           These rules live here rather than in App.css because they must
           arrive with the markup that uses them. A stale stylesheet next to
           fresh JSX is what turned the pills into bare API text. */

        /* ── One pill, three places ── */
        .team-page .tp {
          display: inline-flex !important;
          align-items: center !important;
          gap: 4px !important;
          padding: 3px 9px !important;
          border-radius: 999px !important;
          background: var(--tp-bg, #e9e6df) !important;
          color: var(--tp-fg, #5f5952) !important;
          font-size: 11.5px !important;
          font-weight: 700 !important;
          line-height: 1.35 !important;
          text-transform: capitalize !important;
          letter-spacing: 0 !important;
          white-space: nowrap !important;
        }
        .team-page .tp-count i {
          font-style: normal !important;
          font-size: 10px !important;
          font-weight: 800 !important;
          opacity: 0.62 !important;
        }
        .team-page .tp[data-type=grass]    { --tp-bg: #e3f0d6; --tp-fg: #4d7a2e; }
        .team-page .tp[data-type=fire]     { --tp-bg: #fbe0cf; --tp-fg: #a8541f; }
        .team-page .tp[data-type=water]    { --tp-bg: #d9e7f5; --tp-fg: #3a6294; }
        .team-page .tp[data-type=poison]   { --tp-bg: #eadff0; --tp-fg: #7a4d8f; }
        .team-page .tp[data-type=ground]   { --tp-bg: #eee2cf; --tp-fg: #8a6524; }
        .team-page .tp[data-type=bug]      { --tp-bg: #e8eecd; --tp-fg: #6b7a2e; }
        .team-page .tp[data-type=dragon]   { --tp-bg: #e4dcf3; --tp-fg: #5a4a8f; }
        .team-page .tp[data-type=fighting] { --tp-bg: #f7dcd6; --tp-fg: #9e4432; }
        .team-page .tp[data-type=flying]   { --tp-bg: #e6e2f5; --tp-fg: #4f4a8a; }
        .team-page .tp[data-type=ice]      { --tp-bg: #dcedf2; --tp-fg: #3d7285; }
        .team-page .tp[data-type=electric] { --tp-bg: #f7eecb; --tp-fg: #8a7020; }
        .team-page .tp[data-type=ghost]    { --tp-bg: #e4e0ec; --tp-fg: #5c5280; }
        .team-page .tp[data-type=fairy]    { --tp-bg: #f7dfe9; --tp-fg: #9e4370; }
        .team-page .tp[data-type=steel]    { --tp-bg: #e4e6ea; --tp-fg: #5c646e; }
        .team-page .tp[data-type=rock]     { --tp-bg: #e8e2d6; --tp-fg: #7a6a4a; }
        .team-page .tp[data-type=normal]   { --tp-bg: #eae7e0; --tp-fg: #6b6560; }
        .team-page .tp[data-type=psychic]  { --tp-bg: #f7dde4; --tp-fg: #a2445c; }
        .team-page .tp[data-type=dark]     { --tp-bg: #e2ddd8; --tp-fg: #5f544c; }
        .team-page .go-card-types { display: flex !important; flex-wrap: wrap !important; gap: 6px !important; }
        .team-page .go-analysis-types { display: flex !important; flex-wrap: wrap !important; gap: 6px !important; }

        /* ── Header: three independent zones ──────────────────────────────
           The switch used to sit at the end of the figures, so GO's four
           numbers pushed it right and Normal's two pulled it left — the
           control you just pressed moved out from under the pointer. Left
           flexes, centre and right do not. */
        .team-page .tb-bar {
          display: flex !important;
          align-items: center !important;
          flex-wrap: nowrap !important;
          gap: 16px !important;
        }
        .team-page .tb-bar-left {
          display: flex !important;
          align-items: center !important;
          gap: 16px !important;
          flex: 1 1 0 !important;
          min-width: 0 !important;
          overflow: hidden !important;
        }
        .team-page .tb-seg { flex: 0 0 auto !important; margin: 0 !important; }
        .team-page .tb-bar-actions { flex: 0 0 auto !important; margin: 0 !important; }
        .team-page .tb-bar-stats { display: flex !important; align-items: baseline !important; gap: 16px !important; min-width: 0 !important; }

        /* ── Balance score ── */
        .team-page .tb-an-scorerow {
          display: flex !important;
          align-items: center !important;
          gap: 12px !important;
          margin: 4px 0 10px !important;
        }
        .team-page .tb-an-grade {
          font-size: 32px !important;
          font-weight: 900 !important;
          line-height: 1 !important;
          flex: 0 0 auto !important;
        }
        .team-page .tb-an-why { font-size: 11.5px !important; font-weight: 600 !important; line-height: 1.35 !important; }

        /* ── Disabled Add, and the total on a Normal card ── */
        .team-page .tb-btn-primary:disabled {
          opacity: 1 !important;
          background: #ebe7e0 !important;
          border-color: #ebe7e0 !important;
          color: #9a938b !important;
          cursor: not-allowed !important;
        }
        .team-page .tb-btn-wrap { display: inline-flex !important; }
        .team-page .tb-card-total {
          display: flex !important;
          align-items: baseline !important;
          justify-content: space-between !important;
          margin-top: 10px !important;
          padding-top: 9px !important;
          border-top: 1px solid var(--border) !important;
        }
        .team-page .tb-card-total span { font-size: 11px !important; color: #6b6560 !important; font-weight: 600 !important; }
        .team-page .tb-card-total b { font-size: 12.5px !important; font-weight: 800 !important; color: var(--text-primary) !important; }

        /* ── Empty slot ── */
        .team-page .go-card.empty-slot {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 8px !important;
          min-height: 170px !important;
          border: 1.5px dashed #ddd8cf !important;
          background: #faf8f4 !important;
          box-shadow: none !important;
          cursor: pointer !important;
        }
        .team-page .go-card.empty-slot:hover { border-color: #8f2f2a !important; }
        .team-page .tb-slot-plus {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: 30px !important; height: 30px !important;
          border-radius: 50% !important;
          background: #f0ede6 !important;
          color: #a09d95 !important;
        }
        .team-page .tb-slot-lbl { font-size: 11.5px !important; color: #a09d95 !important; font-weight: 600 !important; }

        /* ── Severity, and the link between a chip and the members ─────────
           Ranked by how many members fold to it, and shaded to match, so the
           order of attention is visible before any number is read. */
        .team-page .tp-sev { cursor: help; position: relative; }
        .team-page .tp-sev[data-sev="2"] { filter: saturate(0.72); }
        .team-page .tp-sev[data-sev="3"] { filter: saturate(1.05); }
        .team-page .tp-sev[data-sev="4"] { filter: saturate(1.35) brightness(0.95); }
        .team-page .tp-sev:hover, .team-page .tp-sev:focus-visible {
          outline: 2px solid #b3564f !important;
          outline-offset: 1px !important;
        }

        /* Hovering a weakness answers "which of these is that?" in place,
           without a tooltip, a modal, or any extra panel space. */
        .team-page .go-team-grid.tb-linking .go-card {
          opacity: 0.34 !important;
          filter: saturate(0.4) !important;
          transition: opacity 0.16s ease, filter 0.16s ease, box-shadow 0.16s ease !important;
        }
        .team-page .go-team-grid.tb-linking .go-card.tb-culprit {
          opacity: 1 !important;
          filter: none !important;
          box-shadow: 0 0 0 2px #b3564f, 0 8px 22px rgba(179,86,79,0.22) !important;
        }
        @media (prefers-reduced-motion: reduce) {
          .team-page .go-team-grid.tb-linking .go-card { transition: none !important; }
        }

        /* ── Balance card, led by the diagnosis ── */
        .team-page .tb-an-verdict {
          margin: 6px 0 10px !important;
          font-size: 13px !important;
          font-weight: 700 !important;
          line-height: 1.45 !important;
          color: var(--text-primary) !important;
        }
        .team-page .tb-an-scorerow { align-items: baseline !important; gap: 10px !important; margin: 0 0 10px !important; }
        .team-page .tb-an-grade { font-size: 24px !important; }
        .team-page .tb-an-scale { font-size: 11px !important; color: #6b6560 !important; font-weight: 600 !important; }

        /* ── Resists: good news, folded away ── */
        .team-page .tb-fold {
          display: flex !important;
          align-items: center !important;
          gap: 6px !important;
          padding: 0 !important;
          border: 0 !important;
          background: none !important;
          color: #6b6560 !important;
          font-size: 11.5px !important;
          font-weight: 600 !important;
          font-family: inherit !important;
          cursor: pointer !important;
        }
        .team-page .tb-fold:hover { color: #8f2f2a !important; }
        .team-page .tb-fold-caret { font-size: 9px !important; opacity: 0.7 !important; }

        /* ── Base total, pinned to the foot ───────────────────────────────
           One type pill or two changed where this line sat, so the number
           landed at a different height on every card and could not be
           compared by eye. The panel is a column and this is its last row. */
        .team-page .go-card-normal .pgo-info-panel {
          display: flex !important;
          flex-direction: column !important;
          flex: 1 1 auto !important;
        }
        .team-page .go-card-normal .go-card-types { margin-bottom: auto !important; }
        .team-page .tb-card-total {
          display: block !important;
          margin-top: 10px !important;
          padding-top: 9px !important;
          border-top: 1px solid var(--border) !important;
        }
        .team-page .tb-card-total-row {
          display: flex !important;
          align-items: baseline !important;
          justify-content: space-between !important;
          margin-bottom: 5px !important;
        }
        /* A bar against the 720 ceiling: 600 and 304 stop looking alike. */
        .team-page .tb-card-total-track {
          display: block !important;
          height: 4px !important;
          border-radius: 999px !important;
          background: #eeeae2 !important;
          overflow: hidden !important;
        }
        .team-page .tb-card-total-fill {
          display: block !important;
          height: 100% !important;
          border-radius: 999px !important;
          background: #8f2f2a !important;
        }
        .team-page .go-card-normal { display: flex !important; flex-direction: column !important; }

        /* The picker says what it is filtered to, so an unexpectedly short
           list reads as a filter rather than as missing data. */
        .team-page .tb-pick-filter,
        .tb-pick-filter {
          display: flex; align-items: center; gap: 8px;
          margin: 0 0 10px;
          font-size: 12px; color: #6b6560; font-weight: 600;
        }
      `}</style>

      {/* §4.3 — the same chip the Pokédex shows, so the constraint that
          followed the player here is visible rather than a mystery about why
          half the roster is missing. Clearing it widens the pool in place. */}
      {genFilter > 0 && (
        <div className="gen-filter-bar" style={{ marginBottom: 14 }}>
          <span className="gen-chip">
            {GENERATIONS[genFilter].sub[lang] ?? GENERATIONS[genFilter].sub.en}
            {" · "}
            {GENERATIONS[genFilter][lang] ?? GENERATIONS[genFilter].en}
            <button
              className="gen-chip-x"
              onClick={onClearGen}
              aria-label={lang === "th" ? "ล้างตัวกรองเจนเนอเรชั่น"
                : lang === "ja" ? "世代フィルターを解除" : "Clear generation filter"}
            >×</button>
          </span>
          <span className="gen-pool-note">
            {lang === "th" ? `เลือกได้ ${allWithMeta.length} ตัวจากเจนนี้`
              : lang === "ja" ? `この世代の${allWithMeta.length}匹から選択`
              : `Choosing from ${allWithMeta.length} in this generation`}
          </span>
        </div>
      )}

      <div className="tb-bar">
        <div className="tb-bar-left">
        <h1 className="tb-bar-title">
          {lang === "th" ? "สร้างทีมของคุณ" : lang === "ja" ? "チームを作る" : "Build your team"}
        </h1>

        {/* Inline figures rather than boxed tiles: four bordered cells gave
            each number the weight of a section when they are one sentence. */}
        <div className="tb-bar-stats">
          <span className="tb-stat">
            <i>{lang === "th" ? "สมาชิก" : lang === "ja" ? "メンバー" : "Members"}</i>
            <b>{team.length}/{maxTeamSize}</b>
          </span>
          {mode === "go" ? (
            <>
              <span className="tb-stat">
                <i>{lang === "th" ? "CP รวม" : lang === "ja" ? "合計CP" : "Total CP"}</i>
                <b>{(teamCPOverview?.total ?? 0).toLocaleString()}</b>
              </span>
              <span className="tb-stat">
                <i>{lang === "th" ? "CP เฉลี่ย" : lang === "ja" ? "平均CP" : "Avg CP"}</i>
                <b>{(teamCPOverview?.avg ?? 0).toLocaleString()}</b>
              </span>
            </>
          ) : (
            <span className="tb-stat">
              <i>{lang === "th" ? "เฉลี่ย" : lang === "ja" ? "平均" : "Average"}</i>
              <b>{teamAvgTotal}</b>
            </span>
          )}
        </div>
        </div>

        <div className="tb-seg" role="group"
          aria-label={lang === "th" ? "โหมด" : lang === "ja" ? "モード" : "Mode"}>
          <button type="button" className={`tb-seg-btn${mode === "normal" ? " on" : ""}`}
            aria-pressed={mode === "normal"} onClick={() => setMode("normal")}>
            {lang === "th" ? "ปกติ" : lang === "ja" ? "通常" : "Normal"}
          </button>
          <button type="button" className={`tb-seg-btn${mode === "go" ? " on" : ""}`}
            aria-pressed={mode === "go"} onClick={() => setMode("go")}>
            Pokémon GO
          </button>
        </div>

        {/* Adding a Pokemon is what this page is for, so it is the filled
            button; the random shortcut steps back to an outline. */}
        <div className="tb-bar-actions">
          <span className="tb-btn-wrap"
            title={team.length >= maxTeamSize
              ? (lang === "th" ? `ทีมเต็มแล้ว (${maxTeamSize} ตัว)`
                : lang === "ja" ? `チームは満員です（${maxTeamSize}匹）`
                : `Team is full (${maxTeamSize})`)
              : (lang === "th" ? "เพิ่มโปเกมอนเข้าทีม" : lang === "ja" ? "ポケモンを追加" : "Add a Pokémon")}>
            <button className="tb-btn tb-btn-primary"
              onClick={() => { setPicking(true); setPickingSlot(null); }}
              disabled={team.length >= maxTeamSize}>
              <Plus size={15} strokeWidth={2.6} />
              {lang === "th" ? "เพิ่ม" : lang === "ja" ? "追加" : "Add"}
            </button>
          </span>
          <RandomMenu onGenerate={generateRandomTeam} generating={generating} lang={lang} />
          {team.length > 0 && (
            <button className="tb-btn tb-btn-ghost" onClick={clearTeam}>
              <Trash2 size={14} strokeWidth={2.2} />
              {lang === "th" ? "ล้าง" : lang === "ja" ? "クリア" : "Clear"}
            </button>
          )}
        </div>
      </div>

      {teamCPOverview?.allHundo && (
        <div className="go-team-hundo-banner">
          <Sparkles size={16} strokeWidth={2.2} /> {lang==="th"?"ทีม HUNDO ทั้งทีม!":"All HUNDO team!"} <Sparkles size={16} strokeWidth={2.2} />
        </div>
      )}

      <div className="tb-layout">
      <div className="tb-main">
          {/* TEAM GRID */}
          <div className={`go-team-grid${mode === "go" ? " mode-go" : " mode-normal"}${hoverType ? " tb-linking" : ""}`}>
            {team.slice(0, maxTeamSize).map((p, i) => {
              // Set by the panel: this member is one of the reasons the
              // hovered weakness chip exists.
              const culprit = hoverType ? (weakByType[hoverType] ?? []).includes(p.id) : false;
              const color = typeColor(p.types[0]?.type.name);
              const name = getLocalName(p.id, lang, thaiArr, jpArr) ?? p.name;

              if (mode === "go") {
                const data = getGoData(p.id);
                const league = getLeague(data.cp);

                // Pokemon GO style: gradient based on first type + green tint at top
                const t1Color = typeColor(p.types[0]?.type.name);

                return (
                  <div key={p.id} className={`go-card pgo-card${culprit ? " tb-culprit" : ""}`} style={{ "--pgo-type": t1Color }}>
                    {/* ─── soft pastel panel holding the Pokémon ─── */}
                    <div className="pgo-stage">
                      <button className="go-card-remove" onClick={() => removeMember(p.id)}><X size={14} strokeWidth={2.6} /></button>
                      <button className="go-card-swap"
                        onClick={() => { setPicking(true); setPickingSlot(i); }}><RefreshCw size={13} strokeWidth={2.4} /></button>
                      <img src={getArt(p)} alt={name} className="go-card-img" />
                    </div>

                    {/* ─── BODY: name, types, CP, appraise (clean white) ─── */}
                    <div className="pgo-info-panel">
                      <div className="pgo-head">
                        <div className="go-card-name">{name}</div>
                        <div className="go-card-id">{padId(p.id)}</div>
                      </div>
                      <div className="go-card-types">
                        {p.types.map(t => (
                          <span key={t.type.name} className="tp" data-type={t.type.name}>
                            {typeName(t.type.name)}
                          </span>
                        ))}
                      </div>

                      <div className="pgo-cp-block">
                        <div className="pgo-cp-top">
                          <span className="pgo-cp-top-label">CP</span>
                          <span className="pgo-cp-top-value">{data.cp}</span>
                          <span className="pgo-cp-league-pill">
                            <Trophy size={10} strokeWidth={2.6} style={{ verticalAlign: "-1px" }} /> {league.name}
                          </span>
                        </div>
                        <div className="pgo-cp-slider-wrap">
                          <input
                            type="range" min="10" max="4000" step="10" value={data.cp}
                            onChange={(e) => updateData(p.id, { cp: parseInt(e.target.value) })}
                            className="pgo-cp-slider"
                            style={{
                              background: `linear-gradient(to right, #8f2f2a 0%, #8f2f2a ${(data.cp / 4000) * 100}%, #eeeae2 ${(data.cp / 4000) * 100}%, #eeeae2 100%)`,
                              "--league-color": "#8f2f2a",
                            }}
                          />
                        </div>
                      </div>

                      <AppraiseDisplay
                        ivAtk={data.ivAtk} ivDef={data.ivDef} ivHp={data.ivHp}
                        onChange={(updates) => updateData(p.id, updates)}
                        lang={lang} />
                    </div>
                  </div>
                );
              }

              // NORMAL MODE CARD — clean minimal (pokemon + name + types)
              return (
                <div key={p.id} className={`go-card go-card-normal pgo-card${culprit ? " tb-culprit" : ""}`} style={{ "--pgo-type": color }}>
                  <div className="pgo-stage">
                    <button className="go-card-remove" onClick={() => removeMember(p.id)}><X size={14} strokeWidth={2.6} /></button>
                    <button className="go-card-swap"
                      onClick={() => { setPicking(true); setPickingSlot(i); }}><RefreshCw size={13} strokeWidth={2.4} /></button>
                    <img src={getArt(p)} alt={name} className="go-card-img" />
                  </div>

                  <div className="pgo-info-panel">
                    <div className="pgo-head">
                      <div className="go-card-name">{name}</div>
                      <div className="go-card-id">{padId(p.id)}</div>
                    </div>
                    <div className="go-card-types">
                      {p.types.map(t => (
                        <span key={t.type.name} className="tp" data-type={t.type.name}>
                          {typeName(t.type.name)}
                        </span>
                      ))}
                    </div>
                    <div className="tb-card-total">
                      <div className="tb-card-total-row">
                        <span>{lang === "th" ? "ค่าพลังรวม" : lang === "ja" ? "種族値合計" : "Base total"}</span>
                        <b>{p.stats.reduce((a, st) => a + st.base_stat, 0)}</b>
                      </div>
                      {/* 720 is the highest total in the game, so the bar is a
                          share of the real ceiling rather than of the team. */}
                      <span className="tb-card-total-track">
                        <span className="tb-card-total-fill" style={{
                          width: `${Math.min(100, Math.round(p.stats.reduce((a, st) => a + st.base_stat, 0) / 720 * 100))}%` }} />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {Array.from({ length: Math.max(0, maxTeamSize - team.length) }).map((_, i) => (
              <div key={`slot-${i}`} className="go-card empty-slot"
                role="button" tabIndex={0}
                onClick={() => { setPicking(true); setPickingSlot(null); }}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPicking(true); setPickingSlot(null); } }}
                title={lang === "th" ? "กดเพื่อเลือกโปเกมอน" : lang === "ja" ? "タップして選択" : "Click to pick a Pokémon"}>
                <span className="tb-slot-plus"><Plus size={17} strokeWidth={2.6} /></span>
                <span className="tb-slot-lbl">
                  {lang === "th" ? "ช่องว่าง" : lang === "ja" ? "空き" : "Empty slot"}
                </span>
              </div>
            ))}
          </div>
      </div>

      <aside className="tb-side">
          {/* TEAM ANALYSIS */}
          {teamAnalysis && (
            <div className="go-analysis">
              {teamBalance && (
                <div className="go-analysis-block tb-an-score">
                  <div className="tb-an-label">
                    {lang==="th"?"คะแนนสมดุลของทีม":lang==="ja"?"チームバランス":"Team balance"}
                  </div>
                  <p className="tb-an-verdict">{balanceVerdict}</p>
                  <div className="tb-an-scorerow">
                    <span className="tb-an-grade">{teamBalance.grade}</span>
                    {/* The letter needed something to be measured against. */}
                    <span className="tb-an-scale">
                      {lang==="th"?"ทีมทั่วไปได้ราว C+":lang==="ja"?"平均的なチームはC+程度":"A typical team scores about C+"}
                    </span>
                  </div>
                  <div className="tb-an-track">
                    <span className="tb-an-fill" style={{ width: `${teamBalance.score}%` }} />
                  </div>
                </div>
              )}

              <div className="go-analysis-block">
                <div className="go-analysis-title tb-an-title" data-tone="weak">{lang==="th"?"จุดอ่อนร่วม":"Shared Weaknesses"}</div>
                <div className="go-analysis-types">
                  {Object.entries(teamAnalysis.weak)
                    .filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1])
                    .slice(0, showAllWeak ? maxTeamSize * 3 : 3)
                    .map(([type, count]) => (
                      <span key={type} className="tp tp-count tp-sev" data-type={type}
                        data-sev={Math.min(4, count)}
                        onMouseEnter={() => setHoverType(type)}
                        onMouseLeave={() => setHoverType(null)}
                        onFocus={() => setHoverType(type)}
                        onBlur={() => setHoverType(null)}
                        tabIndex={0}
                        title={lang==="th"?`${count} ตัวในทีมแพ้ธาตุนี้`
                          :lang==="ja"?`${count}匹がこのタイプに弱い`
                          :`${count} members are weak to this`}>
                        {typeName(type)}<i>×{count}</i>
                      </span>
                    ))}
                  {Object.entries(teamAnalysis.weak).filter(([, c]) => c >= 2).length === 0 && (
                    <span className="go-analysis-good" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><CheckCircle2 size={14} strokeWidth={2.2} /> {lang==="th"?"ไม่มีจุดอ่อนร่วม!":"No shared weaknesses!"}</span>
                  )}
                </div>
                {Object.entries(teamAnalysis.weak).filter(([, c]) => c >= 2).length > 3 && (
                  <button type="button" className="tb-fold" onClick={() => setShowAllWeak(v => !v)}>
                    {showAllWeak
                      ? (lang==="th"?"ย่อ":lang==="ja"?"閉じる":"Show less")
                      : (lang==="th"?`ดูเพิ่ม ${Object.entries(teamAnalysis.weak).filter(([, c]) => c >= 2).length - 3} อัน`
                        :lang==="ja"?`他${Object.entries(teamAnalysis.weak).filter(([, c]) => c >= 2).length - 3}件`
                        :`Show ${Object.entries(teamAnalysis.weak).filter(([, c]) => c >= 2).length - 3} more`)}
                    <span className="tb-fold-caret">{showAllWeak ? "\u25B2" : "\u25BC"}</span>
                  </button>
                )}
              </div>
              <div className="go-analysis-block">
                <div className="go-analysis-title tb-an-title" data-tone="resist">{lang==="th"?"ต้านทาน":"Team Resists"}</div>
                {(() => {
                  const n = Object.entries(teamAnalysis.resist).filter(([, c]) => c >= 2).length;
                  return n > 0 ? (
                    <button type="button" className="tb-fold" onClick={() => setShowResists(v => !v)}>
                      {lang==="th"?`ต้านทานได้ดี ${n} ธาตุ`:lang==="ja"?`${n}タイプに耐性`:`Resists ${n} types well`}
                      <span className="tb-fold-caret">{showResists ? "\u25B2" : "\u25BC"}</span>
                    </button>
                  ) : null;
                })()}
                <div className="go-analysis-types" hidden={!showResists}>
                  {Object.entries(teamAnalysis.resist)
                    .filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]).slice(0, maxTeamSize)
                    .map(([type, count]) => (
                      <span key={type} className="tp tp-count" data-type={type}>
                        {typeName(type)}<i>×{count}</i>
                      </span>
                    ))}
                  {Object.entries(teamAnalysis.resist).filter(([, c]) => c >= 2).length === 0 && (
                    <span className="tb-an-none">
                      {lang==="th"?"ยังไม่มีธาตุที่ทีมนี้ต้านร่วมกัน"
                        :lang==="ja"?"共通の耐性はまだありません"
                        :"No type this team resists together yet"}
                    </span>
                  )}
                </div>
              </div>

              {teamSuggestions.length > 0 && (
                <div className="go-analysis-block">
                  <div className="go-analysis-title tb-an-title" data-tone="add">
                    {lang==="th"?"แนะนำให้เพิ่ม":lang==="ja"?"追加のおすすめ":"Consider adding"}
                  </div>
                  <p className="tb-an-hint">
                    {lang==="th"?"ธาตุที่ช่วยกลบจุดอ่อนของทีมนี้"
                      :lang==="ja"?"このチームの弱点を補うタイプ"
                      :"Types that cover this team's weak spots"}
                  </p>
                  <div className="go-analysis-types">
                    {teamSuggestions.map(({ type, covers }) => (
                      <button key={type} type="button" className="tp tp-count tb-an-suggest"
                        data-type={type}
                        onClick={() => { setSuggestType(type); setPicking(true); setPickingSlot(null); }}
                        title={lang==="th"?`กลบจุดอ่อนได้ ${covers} ธาตุ — กดเพื่อเลือกโปเกมอนธาตุนี้`
                          :lang==="ja"?`弱点${covers}件をカバー — タップで選択`
                          :`Covers ${covers} of them — pick one of these`}>
                        {typeName(type)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
      </aside>
      </div>

      {/* MODALS */}
      {picking && (
        <PokemonPicker allWithMeta={allWithMeta} thaiArr={thaiArr} jpArr={jpArr} lang={lang}
          onPick={addToTeam} onClose={() => { setPicking(false); setPickingSlot(null); setSuggestType(null); }}
          typeFilter={suggestType} cachedFetch={cachedFetch}
          excludeIds={pickingSlot === null ? team.map(p => p.id) : []}
          title={lang==="th"?"เลือก Pokémon":"Select Pokémon"} />
      )}
    </main>
  );
}