import { useState, useMemo, useEffect } from "react";
import { X, BarChart3, Bot, Pencil, Plus, Trash2, Lightbulb, Search } from "lucide-react";
import { TYPE_NAMES_TH, TYPE_NAMES_JA } from "../data.js";
import { typeColor, getArt, getLocalName, padId, useDebouncedValue } from "../utils.js";

// Shared minimal, theme-aware styles for Meta Tier + Horoscope
export const MINIMAL_FEATURE_CSS = `
  .mf-overlay {
    position: fixed; inset: 0; z-index: 9100;
    background: rgba(20,18,20,0.5); backdrop-filter: blur(20px) saturate(120%); -webkit-backdrop-filter: blur(20px) saturate(120%);
    display: flex; align-items: flex-start; justify-content: center;
    padding: 24px 14px; overflow-y: auto;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, "Segoe UI", sans-serif;
    -webkit-font-smoothing: antialiased;
    animation: mf-fade 0.25s ease;
  }
  @keyframes mf-fade { from { opacity: 0; } to { opacity: 1; } }
  .mf-card {
    width: 100%; max-width: 640px; position: relative;
    background: var(--bg-card); color: var(--text-primary);
    border-radius: 28px; padding: 22px 22px 26px;
    box-shadow: 0 40px 90px rgba(0,0,0,0.4), 0 0 0 0.5px var(--border) inset;
    animation: mf-pop 0.4s cubic-bezier(0.34,1.56,0.64,1);
  }
  @keyframes mf-pop { from { opacity: 0; transform: translateY(16px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
  .mf-close {
    position: absolute; top: 16px; right: 16px;
    width: 38px; height: 38px; border-radius: 50%; cursor: pointer;
    background: var(--bg-muted); border: none; color: var(--text-secondary);
    display: inline-flex; align-items: center; justify-content: center;
    transition: background 0.2s, color 0.2s; z-index: 2;
  }
  .mf-close:hover { background: var(--blue); color: #fff; }
  .mf-head { display: flex; align-items: center; gap: 13px; margin-bottom: 20px; padding-right: 44px; }
  .mf-head-ic {
    width: 46px; height: 46px; border-radius: 14px; flex-shrink: 0;
    display: inline-flex; align-items: center; justify-content: center;
    background: color-mix(in srgb, var(--blue) 14%, transparent); color: var(--blue);
  }
  .mf-title { font-size: 21px; font-weight: 800; letter-spacing: -0.02em; margin: 0; color: var(--text-primary); }
  .mf-sub { font-size: 12.5px; font-weight: 500; color: var(--text-secondary); margin: 2px 0 0; }
  /* iOS segmented control */
  .mf-seg { display: flex; gap: 4px; padding: 4px; border-radius: 14px; background: var(--bg-muted); margin-bottom: 18px; }
  .mf-seg-btn {
    flex: 1; padding: 10px; border-radius: 10px; cursor: pointer; border: none; font-family: inherit;
    font-size: 13.5px; font-weight: 600; letter-spacing: -0.01em; color: var(--text-secondary);
    background: transparent; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    transition: background 0.18s, color 0.18s;
  }
  .mf-seg-btn.active { background: var(--bg-card); color: var(--text-primary); box-shadow: var(--shadow-sm); }
`;

const MT_CSS = `
  .mt-tiers { display: grid; grid-template-columns: repeat(5,1fr); gap: 8px; margin-bottom: 14px; }
  .mt-tier-tab {
    display: flex; flex-direction: column; align-items: center; gap: 2px;
    padding: 11px 4px; border-radius: 14px; cursor: pointer; border: none; font-family: inherit;
    background: var(--bg-muted); color: var(--text-secondary); transition: transform .15s, background .2s;
  }
  .mt-tier-tab:active { transform: scale(0.95); }
  .mt-tier-letter { font-size: 18px; font-weight: 800; letter-spacing: -0.02em; }
  .mt-tier-count { font-size: 10px; font-weight: 600; opacity: 0.85; }
  .mt-tier-desc { padding: 11px 15px; border-radius: 12px; font-size: 13px; font-weight: 700; margin-bottom: 14px; letter-spacing: -0.01em; }
  .mt-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(104px,1fr)); gap: 10px; }
  .mt-card {
    position: relative;
    display: flex; flex-direction: column; align-items: center; gap: 4px;
    padding: 10px 8px 12px; border-radius: 16px; cursor: pointer; font-family: inherit;
    background: var(--bg-muted); border: 1px solid transparent; color: var(--text-primary);
    transition: transform .16s, border-color .16s, box-shadow .16s;
  }
  .mt-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-sm); }
  .mt-ps {
    position: absolute; top: 6px; left: 6px; z-index: 1;
    font-size: 9px; font-weight: 800; letter-spacing: 0.3px;
    padding: 2px 6px; border-radius: 7px;
    background: var(--blue); color: #fff;
  }
  .mt-card img { width: 72px; height: 72px; object-fit: contain; }
  .mt-card-name { font-size: 12px; font-weight: 700; text-transform: capitalize; letter-spacing: -0.01em; }
  .mt-card-bst { font-size: 10px; font-weight: 800; color: #fff; padding: 2px 8px; border-radius: 999px; }
  .mt-card-types { display: flex; gap: 3px; flex-wrap: wrap; justify-content: center; }
  .mt-type { font-size: 9px; font-weight: 700; color: #fff; padding: 2px 6px; border-radius: 999px; }
  .mt-empty { text-align: center; padding: 30px; color: var(--text-muted); font-size: 13px; font-weight: 600; }

  .mt-toolbar { display: flex; gap: 8px; margin-bottom: 10px; }
  .mt-btn {
    flex: 1; padding: 12px; border-radius: 14px; cursor: pointer; border: none; font-family: inherit;
    font-size: 13px; font-weight: 600; letter-spacing: -0.01em;
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    background: var(--bg-muted); color: var(--text-primary); transition: background .2s, transform .15s;
  }
  .mt-btn:active { transform: scale(0.97); }
  .mt-btn.primary { background: var(--blue); color: #fff; }
  .mt-btn.danger { color: #ef4444; }
  .mt-help { display: flex; align-items: center; gap: 7px; font-size: 11.5px; font-weight: 500; color: var(--text-muted); margin-bottom: 14px; }
  .mt-rows { display: flex; flex-direction: column; gap: 8px; }
  .mt-row { display: flex; gap: 8px; align-items: stretch; }
  .mt-row-label { width: 44px; flex-shrink: 0; border-radius: 12px; color: #fff; font-weight: 800; font-size: 18px; display: flex; align-items: center; justify-content: center; }
  .mt-cells { flex: 1; display: flex; flex-wrap: wrap; gap: 6px; align-content: flex-start; background: var(--bg-muted); border-radius: 12px; padding: 6px; min-height: 58px; }
  .mt-empty-cell { font-size: 11px; color: var(--text-muted); font-weight: 600; align-self: center; padding: 0 8px; }
  .mt-cell { width: 46px; height: 46px; border-radius: 10px; cursor: grab; background: var(--bg-card); border: 1.5px solid transparent; padding: 2px; }
  .mt-cell img { width: 100%; height: 100%; object-fit: contain; }

  .mt-picker-overlay { position: absolute; inset: 0; z-index: 5; background: rgba(0,0,0,0.4); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; padding: 16px; border-radius: 28px; }
  .mt-picker { width: 100%; max-width: 460px; max-height: 80%; overflow-y: auto; background: var(--bg-card); border-radius: 22px; padding: 18px; position: relative; box-shadow: var(--shadow-lg); }
  .mt-picker-tiers { display: flex; gap: 6px; margin-bottom: 12px; }
  .mt-picker-tier { flex: 1; padding: 9px; border-radius: 10px; cursor: pointer; border: none; font-weight: 800; font-size: 14px; color: var(--text-secondary); background: var(--bg-muted); }
  .mt-search { width: 100%; padding: 11px 14px; border-radius: 12px; border: 1px solid var(--border); background: var(--bg-muted); color: var(--text-primary); font-size: 14px; font-family: inherit; margin-bottom: 12px; outline: none; }
  .mt-search:focus { border-color: var(--blue); }
  .mt-pick-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(84px,1fr)); gap: 8px; }
  .mt-pick-card { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 4px; border-radius: 14px; cursor: pointer; border: none; font-family: inherit; background: var(--bg-muted); color: var(--text-primary); }
  .mt-pick-card:disabled { opacity: 0.4; cursor: default; }
  .mt-pick-card img { width: 54px; height: 54px; object-fit: contain; }
  .mt-pick-num { font-size: 9px; font-weight: 700; color: var(--text-muted); }
  .mt-pick-name { font-size: 10px; font-weight: 600; text-transform: capitalize; }
`;

const TIER_KEY = "pkdx_custom_tier_v1";

// Auto-classify by BST + legendaries
function classifyTier(pokemon) {
  const bst = pokemon.stats.reduce((s, st) => s + st.base_stat, 0);
  const id = pokemon.id;
  const ubers = [150,151,249,250,251,382,383,384,385,386,483,484,487,491,492,493,
    643,644,646,648,649,716,717,718,719,720,721,789,790,791,792,800,802,807,
    888,889,890,891,892,896,897,898];
  if (ubers.includes(id)) return "S";
  if (bst >= 600) return "S";
  if (bst >= 540) return "A";
  if (bst >= 480) return "B";
  if (bst >= 410) return "C";
  return "D";
}

const TIERS = [
  { id:"S", label:"S — Uber / AG",     metaLabel:"S · Uber & AG",  color:"#dc2626", bg:"linear-gradient(135deg, #dc2626, #991b1b)" },
  { id:"A", label:"A — Top Pick",      metaLabel:"A · OU",         color:"#f97316", bg:"linear-gradient(135deg, #f97316, #c2410c)" },
  { id:"B", label:"B — Solid",         metaLabel:"B · UU",         color:"#eab308", bg:"linear-gradient(135deg, #eab308, #a16207)" },
  { id:"C", label:"C — Niche",         metaLabel:"C · RU / NU",    color:"#900603", bg:"linear-gradient(135deg, #900603, #4a0301)" },
  { id:"D", label:"D — Casual",        metaLabel:"D · PU & below", color:"#64748b", bg:"linear-gradient(135deg, #64748b, #334155)" },
];

const CUSTOM_TIERS = ["S", "A", "B", "C", "D", "F"];

// ─── Live competitive meta: Pokémon Showdown tier data (Smogon SV singles) ───
const PS_TIER_KEY = "pkdx_ps_tiers_v1";
const PS_TTL = 12 * 3600 * 1000; // refresh every 12h
const toID = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");

// Map a Showdown tier string → our S/A/B/C/D bucket (null = not in current meta)
function psBucket(tier) {
  if (!tier) return null;
  const x = tier.replace(/[()]/g, "");
  if (x === "AG" || x === "Uber") return "S";
  if (x === "OU" || x === "UUBL") return "A";
  if (x === "UU" || x === "RUBL") return "B";
  if (x === "RU" || x === "NUBL" || x === "NU") return "C";
  if (["PUBL","PU","ZUBL","ZU","NFE","LC"].includes(x)) return "D";
  return null; // Illegal / Unreleased / Past
}

let _psCache = null;
// Parse Showdown's formats-data without eval (CSP-safe): pull each "name:{...tier:"XX"...}".
// Lowercase `tier:` only — skips natDexTier / doublesTier.
function parsePsTiers(txt) {
  const map = {};
  const re = /([a-z0-9]+):\{[^{}]*?tier:"([^"]+)"/g;
  let m;
  while ((m = re.exec(txt)) !== null) map[m[1]] = m[2];
  return map;
}
async function fetchPsTiers() {
  if (_psCache) return _psCache;
  try {
    const raw = localStorage.getItem(PS_TIER_KEY);
    if (raw) { const c = JSON.parse(raw); if (Date.now() - c.ts < PS_TTL && c.data) { _psCache = c.data; return c.data; } }
  } catch {}
  try {
    const txt = await fetch("https://play.pokemonshowdown.com/data/formats-data.js").then(r => r.ok ? r.text() : "");
    const map = parsePsTiers(txt);
    if (Object.keys(map).length) {
      _psCache = map;
      try { localStorage.setItem(PS_TIER_KEY, JSON.stringify({ ts: Date.now(), data: map })); } catch {}
      return map;
    }
  } catch {}
  return {}; // network/parse failed → caller falls back to the BST heuristic
}

function loadCustom() {
  try {
    const data = JSON.parse(localStorage.getItem(TIER_KEY) ?? "{}");
    return { S: [], A: [], B: [], C: [], D: [], F: [], ...data };
  } catch { return { S: [], A: [], B: [], C: [], D: [], F: [] }; }
}
function saveCustom(data) {
  try { localStorage.setItem(TIER_KEY, JSON.stringify(data)); } catch {}
}

export default function MetaTierBrowser({ loaded, allList, thaiArr, jpArr, lang, cachedFetch, onOpen, onClose }) {
  const [mode, setMode] = useState("auto"); // "auto" | "custom"
  const [activeTier, setActiveTier] = useState("S");

  // ─── Live competitive meta (Pokémon Showdown / Smogon SV) ───
  const [psTiers, setPsTiers] = useState(null); // toID -> tier string
  useEffect(() => {
    let alive = true;
    fetchPsTiers().then(m => { if (alive) setPsTiers(m); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  const liveMeta = !!psTiers && Object.keys(psTiers).length > 0;
  const psTierOf = (p) => psTiers?.[toID(p.name)] ?? null;

  // ─── AUTO MODE ───
  const byTier = useMemo(() => {
    const result = { S: [], A: [], B: [], C: [], D: [] };
    loaded.forEach(p => {
      if (p.id > 1025) return;
      // prefer the live competitive tier; fall back to BST heuristic
      const live = psTiers ? psBucket(psTiers[toID(p.name)]) : null;
      result[live ?? classifyTier(p)].push(p);
    });
    Object.keys(result).forEach(t => {
      result[t].sort((a, b) => {
        const bstA = a.stats.reduce((s, st) => s + st.base_stat, 0);
        const bstB = b.stats.reduce((s, st) => s + st.base_stat, 0);
        return bstB - bstA;
      });
    });
    return result;
  }, [loaded, psTiers]);

  const currentTier = TIERS.find(t => t.id === activeTier) ?? TIERS[0];
  const currentList = byTier[activeTier] ?? [];

  const typeName = (tn) =>
    lang==="th" ? (TYPE_NAMES_TH[tn]??tn) : lang==="ja" ? (TYPE_NAMES_JA[tn]??tn) : tn;

  // ─── CUSTOM MODE ───
  const [customTiers, setCustomTiers] = useState(loadCustom);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTier, setPickerTier] = useState("S");
  const [search, setSearch] = useState("");
  const debSearch = useDebouncedValue(search, 200);
  const [draggedId, setDraggedId] = useState(null);

  useEffect(() => { saveCustom(customTiers); }, [customTiers]);

  // Pool of pokemon to add — loaded ones not yet in any tier
  const usedIds = useMemo(() => {
    const set = new Set();
    Object.values(customTiers).forEach(arr => arr.forEach(id => set.add(id)));
    return set;
  }, [customTiers]);

  const pickerResults = useMemo(() => {
    const q = debSearch.toLowerCase().trim();
    const pool = loaded.filter(p => p.id <= 1025);
    return pool.filter(p => {
      if (q) {
        const en = p.name.toLowerCase();
        const th = (getLocalName(p.id, "th", thaiArr, jpArr) ?? "").toLowerCase();
        const ja = (getLocalName(p.id, "ja", thaiArr, jpArr) ?? "").toLowerCase();
        if (!en.includes(q) && !th.includes(q) && !ja.includes(q) && !String(p.id).includes(q)) return false;
      }
      return true;
    }).slice(0, 50);
  }, [debSearch, loaded, thaiArr, jpArr]);

  const loadedMap = useMemo(() => {
    const m = {};
    loaded.forEach(p => { m[p.id] = p; });
    return m;
  }, [loaded]);

  const addToTier = (id, tier) => {
    setCustomTiers(prev => {
      const next = { ...prev };
      // Remove from all tiers first
      CUSTOM_TIERS.forEach(t => { next[t] = next[t].filter(x => x !== id); });
      // Add to target
      next[tier] = [...next[tier], id];
      return next;
    });
  };

  const removeFromTier = (id) => {
    setCustomTiers(prev => {
      const next = { ...prev };
      CUSTOM_TIERS.forEach(t => { next[t] = next[t].filter(x => x !== id); });
      return next;
    });
  };

  const clearCustom = () => {
    if (!window.confirm(lang==="th"?"ลบ tier list ทั้งหมด?":"Clear entire tier list?")) return;
    setCustomTiers({ S: [], A: [], B: [], C: [], D: [], F: [] });
  };

  // Drag handlers
  const handleDragStart = (id) => setDraggedId(id);
  const handleDragEnd = () => setDraggedId(null);
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (e, tier) => {
    e.preventDefault();
    if (draggedId != null) {
      addToTier(draggedId, tier);
      setDraggedId(null);
    }
  };

  const title = lang==="th"?"ระบบ Tier":lang==="ja"?"ティアリスト":"Meta Tier List";
  const sub = mode === "auto" && liveMeta
    ? (lang==="th"?"อิงเมตาจริงจาก Smogon SV (อัปเดตสด)":lang==="ja"?"Smogon SV メタ準拠 (ライブ)":"Live Smogon SV tiers")
    : (lang==="th"?"จัดอันดับอัตโนมัติ หรือสร้างเอง":lang==="ja"?"自動 / カスタムティア":"Auto ranking · or build your own");

  return (
    <div className="mf-overlay" onClick={onClose}>
      <style>{MINIMAL_FEATURE_CSS + MT_CSS}</style>
      <div className="mf-card" onClick={(e) => e.stopPropagation()}>
        <button className="mf-close" onClick={onClose}><X size={16} strokeWidth={2.4} /></button>

        <div className="mf-head">
          <span className="mf-head-ic"><BarChart3 size={22} strokeWidth={2.2} /></span>
          <div>
            <h1 className="mf-title">{title}</h1>
            <p className="mf-sub">{sub}</p>
          </div>
        </div>

        <div className="mf-seg">
          <button className={`mf-seg-btn${mode === "auto" ? " active" : ""}`} onClick={() => setMode("auto")}>
            <Bot size={15} strokeWidth={2.2} /> {lang==="th"?"อัตโนมัติ":lang==="ja"?"自動":"Auto"}
          </button>
          <button className={`mf-seg-btn${mode === "custom" ? " active" : ""}`} onClick={() => setMode("custom")}>
            <Pencil size={15} strokeWidth={2.2} /> {lang==="th"?"กำหนดเอง":lang==="ja"?"カスタム":"Custom"}
          </button>
        </div>

        {/* ────── AUTO MODE ────── */}
        {mode === "auto" && (
          <>
            <div className="mt-tiers">
              {TIERS.map(t => (
                <button key={t.id}
                  className="mt-tier-tab"
                  onClick={() => setActiveTier(t.id)}
                  style={activeTier === t.id ? { background: t.color, color: "#fff" } : undefined}>
                  <span className="mt-tier-letter">{t.id}</span>
                  <span className="mt-tier-count">{byTier[t.id]?.length ?? 0}</span>
                </button>
              ))}
            </div>

            <div className="mt-tier-desc" style={{ background: `color-mix(in srgb, ${currentTier.color} 16%, transparent)`, color: currentTier.color }}>
              {liveMeta ? currentTier.metaLabel : currentTier.label}
            </div>

            <div className="mt-grid">
              {currentList.slice(0, 100).map(p => {
                const color = typeColor(p.types[0]?.type.name);
                const name = getLocalName(p.id, lang, thaiArr, jpArr) ?? p.name;
                const bst = p.stats.reduce((s, st) => s + st.base_stat, 0);
                return (
                  <button key={p.id} className="mt-card" onClick={() => onOpen(p)}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = color; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "transparent"; }}>
                    {liveMeta && psTierOf(p) && <span className="mt-ps">{psTierOf(p).replace(/[()]/g,"")}</span>}
                    <img src={getArt(p)} alt={name} loading="lazy" />
                    <div className="mt-card-name">{name}</div>
                    <div className="mt-card-bst" style={{ background: color }}>BST {bst}</div>
                    <div className="mt-card-types">
                      {p.types.map(t => (
                        <span key={t.type.name} className="mt-type" style={{ background: typeColor(t.type.name) }}>
                          {typeName(t.type.name)}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>

            {currentList.length === 0 && (
              <div className="mt-empty">
                {lang==="th"?"ยังไม่มี Pokémon ใน tier นี้":"No Pokémon loaded in this tier yet"}
              </div>
            )}
          </>
        )}

        {/* ────── CUSTOM MODE ────── */}
        {mode === "custom" && (
          <>
            <div className="mt-toolbar">
              <button className="mt-btn primary" onClick={() => { setPickerOpen(true); setPickerTier("S"); }}>
                <Plus size={15} strokeWidth={2.4} /> {lang==="th"?"เพิ่ม Pokémon":"Add Pokémon"}
              </button>
              <button className="mt-btn danger" onClick={clearCustom}>
                <Trash2 size={15} strokeWidth={2.2} /> {lang==="th"?"ล้างทั้งหมด":"Clear All"}
              </button>
            </div>

            <div className="mt-help">
              <Lightbulb size={13} strokeWidth={2.2} /> {lang==="th"?"ลากการ์ดเพื่อย้าย tier · คลิกขวาเพื่อลบ":"Drag cards between tiers · right-click to remove"}
            </div>

            <div className="mt-rows">
              {CUSTOM_TIERS.map(tierId => {
                const tierInfo = TIERS.find(t => t.id === tierId) ?? { id: "F", color: "#64748b" };
                const items = customTiers[tierId] ?? [];
                return (
                  <div key={tierId} className="mt-row"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, tierId)}>
                    <div className="mt-row-label" style={{ background: tierInfo.color }}>{tierId}</div>
                    <div className="mt-cells">
                      {items.length === 0 && (
                        <div className="mt-empty-cell">{lang==="th"?"ลากมาวาง":"Drop here"}</div>
                      )}
                      {items.map(id => {
                        const p = loadedMap[id];
                        if (!p) return null;
                        const name = getLocalName(p.id, lang, thaiArr, jpArr) ?? p.name;
                        const color = typeColor(p.types[0]?.type.name);
                        return (
                          <div key={id} className="mt-cell"
                            draggable
                            onDragStart={() => handleDragStart(id)}
                            onDragEnd={handleDragEnd}
                            onClick={() => onOpen(p)}
                            onContextMenu={(e) => { e.preventDefault(); removeFromTier(id); }}
                            style={{ borderColor: color }}
                            title={`${name} · drag to move · right-click to remove`}>
                            <img src={getArt(p)} alt={name} loading="lazy" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {pickerOpen && (
              <div className="mt-picker-overlay" onClick={() => setPickerOpen(false)}>
                <div className="mt-picker" onClick={(e) => e.stopPropagation()}>
                  <button className="mf-close" style={{ top: 12, right: 12 }} onClick={() => setPickerOpen(false)}><X size={15} strokeWidth={2.4} /></button>
                  <h2 className="mf-title" style={{ fontSize: 17, marginBottom: 14 }}>{lang==="th"?"เพิ่มลง Tier":"Add to Tier"}</h2>
                  <div className="mt-picker-tiers">
                    {CUSTOM_TIERS.map(tt => {
                      const ti = TIERS.find(x => x.id === tt) ?? { color: "#64748b" };
                      return (
                        <button key={tt} className="mt-picker-tier"
                          onClick={() => setPickerTier(tt)}
                          style={pickerTier === tt ? { background: ti.color, color: "#fff" } : undefined}>
                          {tt}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ position: "relative" }}>
                    <Search size={15} strokeWidth={2.2} style={{ position: "absolute", left: 13, top: 13, color: "var(--text-muted)" }} />
                    <input className="mt-search" style={{ paddingLeft: 36 }} placeholder={lang==="th"?"ค้นหา...":"Search..."}
                      value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
                  </div>
                  <div className="mt-pick-grid">
                    {pickerResults.map(p => {
                      const name = getLocalName(p.id, lang, thaiArr, jpArr) ?? p.name;
                      const isUsed = usedIds.has(p.id);
                      return (
                        <button key={p.id} className="mt-pick-card" disabled={isUsed}
                          onClick={() => { addToTier(p.id, pickerTier); }}>
                          <img src={getArt(p)} alt={name} loading="lazy" />
                          <span className="mt-pick-num">#{String(p.id).padStart(4,"0")}</span>
                          <span className="mt-pick-name">{name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}