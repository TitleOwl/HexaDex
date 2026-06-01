import { useState, useMemo, useEffect } from "react";
import { TYPE_NAMES_TH, TYPE_NAMES_JA } from "../data.js";
import { typeColor, getArt, getLocalName, padId, useDebouncedValue } from "../utils.js";

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
  { id:"S", label:"S Tier — Legendary",  color:"#dc2626", bg:"linear-gradient(135deg, #dc2626, #991b1b)" },
  { id:"A", label:"A Tier — Top Pick",   color:"#f97316", bg:"linear-gradient(135deg, #f97316, #c2410c)" },
  { id:"B", label:"B Tier — Solid",      color:"#eab308", bg:"linear-gradient(135deg, #eab308, #a16207)" },
  { id:"C", label:"C Tier — Niche",      color:"#3b82f6", bg:"linear-gradient(135deg, #3b82f6, #1e40af)" },
  { id:"D", label:"D Tier — Casual",     color:"#64748b", bg:"linear-gradient(135deg, #64748b, #334155)" },
];

const CUSTOM_TIERS = ["S", "A", "B", "C", "D", "F"];

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

  // ─── AUTO MODE ───
  const byTier = useMemo(() => {
    const result = { S: [], A: [], B: [], C: [], D: [] };
    loaded.forEach(p => {
      if (p.id > 1025) return;
      result[classifyTier(p)].push(p);
    });
    Object.keys(result).forEach(t => {
      result[t].sort((a, b) => {
        const bstA = a.stats.reduce((s, st) => s + st.base_stat, 0);
        const bstB = b.stats.reduce((s, st) => s + st.base_stat, 0);
        return bstB - bstA;
      });
    });
    return result;
  }, [loaded]);

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

  return (
    <div className="game-overlay" onClick={onClose}>
      <div className="game-content tier-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close game-close" onClick={onClose}>✕</button>

        <div className="game-header">
          <h1 className="game-title">📊 {lang==="th"?"ระบบ Tier":lang==="ja"?"ティアリスト":"Meta Tier List"}</h1>
          <p className="game-sub">
            {lang==="th"?"ดู tier อัตโนมัติ หรือสร้างเอง (ลากมาใส่ได้)":
             lang==="ja"?"自動ティア / カスタムティア":
             "Auto tier ranking · or build your own (drag & drop)"}
          </p>
        </div>

        {/* Mode tabs */}
        <div className="tier-mode-tabs">
          <button className={`tier-mode-btn${mode === "auto" ? " active" : ""}`}
            onClick={() => setMode("auto")}>
            🤖 {lang==="th"?"อัตโนมัติ":"Auto"}
          </button>
          <button className={`tier-mode-btn${mode === "custom" ? " active" : ""}`}
            onClick={() => setMode("custom")}>
            ✏️ {lang==="th"?"กำหนดเอง":"Custom"}
          </button>
        </div>

        {/* ────── AUTO MODE ────── */}
        {mode === "auto" && (
          <>
            <div className="tier-selector">
              {TIERS.map(t => (
                <button key={t.id}
                  className={`tier-tab${activeTier === t.id ? " active" : ""}`}
                  onClick={() => setActiveTier(t.id)}
                  style={{ background: activeTier === t.id ? t.bg : undefined }}>
                  <span className="tier-tab-letter">{t.id}</span>
                  <span className="tier-tab-count">{byTier[t.id]?.length ?? 0}</span>
                </button>
              ))}
            </div>

            <div className="tier-description" style={{ background: currentTier.bg }}>
              <div className="tier-desc-label">{currentTier.label}</div>
            </div>

            <div className="tier-grid">
              {currentList.slice(0, 100).map(p => {
                const color = typeColor(p.types[0]?.type.name);
                const name = getLocalName(p.id, lang, thaiArr, jpArr) ?? p.name;
                const bst = p.stats.reduce((s, st) => s + st.base_stat, 0);
                return (
                  <button key={p.id} className="tier-card"
                    onClick={() => onOpen(p)}
                    style={{ borderColor: color }}>
                    <img src={getArt(p)} alt={name} className="tier-card-img" loading="lazy" />
                    <div className="tier-card-name">{name}</div>
                    <div className="tier-card-bst" style={{ background: color }}>BST {bst}</div>
                    <div className="tier-card-types">
                      {p.types.map(t => (
                        <span key={t.type.name} className="type-tag-mini"
                          style={{ background: typeColor(t.type.name) }}>
                          {typeName(t.type.name)}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>

            {currentList.length === 0 && (
              <div className="evo-loading">
                {lang==="th"?"ยังไม่มี Pokémon ใน tier นี้":"No Pokémon loaded in this tier yet"}
              </div>
            )}
          </>
        )}

        {/* ────── CUSTOM MODE ────── */}
        {mode === "custom" && (
          <>
            <div className="custom-tier-toolbar">
              <button className="custom-add-btn" onClick={() => { setPickerOpen(true); setPickerTier("S"); }}>
                ➕ {lang==="th"?"เพิ่ม Pokémon":"Add Pokémon"}
              </button>
              <button className="custom-clear-btn" onClick={clearCustom}>
                🗑 {lang==="th"?"ล้างทั้งหมด":"Clear All"}
              </button>
            </div>

            <div className="custom-tier-help">
              💡 {lang==="th"?"ลากการ์ดเพื่อย้ายระหว่าง tier · คลิกขวาเพื่อลบ":
                  "Drag cards between tiers · Right-click to remove"}
            </div>

            <div className="custom-tier-rows">
              {CUSTOM_TIERS.map(tierId => {
                const tierInfo = TIERS.find(t => t.id === tierId) ?? { id: "F", color: "#525252", bg: "linear-gradient(135deg, #525252, #262626)" };
                const items = customTiers[tierId] ?? [];
                return (
                  <div key={tierId} className="custom-tier-row"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, tierId)}>
                    <div className="custom-tier-label" style={{ background: tierInfo.bg }}>
                      {tierId}
                    </div>
                    <div className="custom-tier-cells">
                      {items.length === 0 && (
                        <div className="custom-tier-empty">
                          {lang==="th"?"ลากมาวาง":"Drop here"}
                        </div>
                      )}
                      {items.map(id => {
                        const p = loadedMap[id];
                        if (!p) return null;
                        const name = getLocalName(p.id, lang, thaiArr, jpArr) ?? p.name;
                        const color = typeColor(p.types[0]?.type.name);
                        return (
                          <div key={id} className="custom-tier-cell"
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

            {/* Picker modal */}
            {pickerOpen && (
              <div className="modal-overlay" onClick={() => setPickerOpen(false)}>
                <div className="modal compare-picker" onClick={(e) => e.stopPropagation()}>
                  <button className="modal-close" onClick={() => setPickerOpen(false)}>✕</button>
                  <div className="modal-body">
                    <h2 style={{ fontFamily:"var(--font-display)", color:"var(--blue-deep)", marginTop:0 }}>
                      {lang==="th"?"เพิ่มลง Tier":"Add to Tier"}
                    </h2>
                    <div className="custom-picker-tiers">
                      {CUSTOM_TIERS.map(t => {
                        const ti = TIERS.find(x => x.id === t) ?? { color: "#525252", bg: "linear-gradient(135deg, #525252, #262626)" };
                        return (
                          <button key={t}
                            className={`custom-picker-tier${pickerTier === t ? " active" : ""}`}
                            onClick={() => setPickerTier(t)}
                            style={{ background: pickerTier === t ? ti.bg : undefined }}>
                            {t}
                          </button>
                        );
                      })}
                    </div>
                    <input className="team-add-search" placeholder={lang==="th"?"ค้นหา...":"Search..."}
                      value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
                    <div className="team-add-grid">
                      {pickerResults.map(p => {
                        const name = getLocalName(p.id, lang, thaiArr, jpArr) ?? p.name;
                        const isUsed = usedIds.has(p.id);
                        return (
                          <button key={p.id}
                            className={`team-add-card${isUsed ? " in-team" : ""}`}
                            disabled={isUsed}
                            onClick={() => { addToTier(p.id, pickerTier); }}>
                            <img src={getArt(p)} alt={name} className="team-add-img" loading="lazy" />
                            <span className="team-add-num">#{String(p.id).padStart(4,"0")}</span>
                            <span className="team-add-name">{name}</span>
                          </button>
                        );
                      })}
                    </div>
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