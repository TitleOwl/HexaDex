import { useState, useMemo, useCallback } from "react";
import { STRINGS, TYPE_NAMES_TH, TYPE_NAMES_JA } from "../data.js";
import { typeColor, getArt, getLocalName, useDebouncedValue, padId } from "../utils.js";

// CPM table (Combat Power Multiplier) from Pokemon GO - real values
const CPM = {
  1: 0.094, 1.5: 0.1351374, 2: 0.16639787, 2.5: 0.192650919, 3: 0.21573247,
  3.5: 0.236572661, 4: 0.25572005, 4.5: 0.273530381, 5: 0.29024988, 5.5: 0.306057377,
  6: 0.3210876, 6.5: 0.335445036, 7: 0.34921268, 7.5: 0.362457751, 8: 0.37523559,
  8.5: 0.387592406, 9: 0.39956728, 9.5: 0.411193551, 10: 0.42250001,
  10.5: 0.432926419, 11: 0.44310755, 11.5: 0.4530599578, 12: 0.46279839,
  12.5: 0.472800911, 13: 0.48168495, 13.5: 0.4906509923, 14: 0.49985844,
  14.5: 0.508701765, 15: 0.51739395, 15.5: 0.5260576, 16: 0.5347179,
  16.5: 0.5433089, 17: 0.5518373, 17.5: 0.560303, 18: 0.5687164,
  18.5: 0.5770782, 19: 0.5853862, 19.5: 0.5936433, 20: 0.601845,
  20.5: 0.6099915, 21: 0.61808550, 21.5: 0.62613, 22: 0.63414,
  22.5: 0.64207, 23: 0.64995, 23.5: 0.65780, 24: 0.66560,
  24.5: 0.67335, 25: 0.68108, 25.5: 0.68875, 26: 0.69638,
  26.5: 0.70395, 27: 0.71147, 27.5: 0.71896, 28: 0.72641,
  28.5: 0.73381, 29: 0.74117, 29.5: 0.74849, 30: 0.75577,
  30.5: 0.76156, 31: 0.76735, 31.5: 0.77312, 32: 0.77888,
  32.5: 0.78463, 33: 0.79030, 33.5: 0.79604, 34: 0.80178,
  34.5: 0.80753, 35: 0.81325, 35.5: 0.81899, 36: 0.82471,
  36.5: 0.83043, 37: 0.83614, 37.5: 0.84183, 38: 0.84753,
  38.5: 0.85323, 39: 0.85891, 39.5: 0.86458, 40: 0.87025,
  41: 0.87557, 42: 0.88075, 43: 0.88578, 44: 0.89068,
  45: 0.89546, 46: 0.90011, 47: 0.90465, 48: 0.90908,
  49: 0.91341, 50: 0.91762,
};

const LEVELS = Object.keys(CPM).map(Number).sort((a,b)=>a-b);

// Pokemon GO base stats are different from main games — they use:
// AttackGO = round((max(Attack, SpAtk) × 7 + min(Attack, SpAtk) × 1) / 8) × SF
// Simplification: just scale the highest of phys/spec attack
function getGoBaseStats(pokemon) {
  const attack = pokemon.stats.find(s => s.stat.name === "attack")?.base_stat ?? 50;
  const spAtk  = pokemon.stats.find(s => s.stat.name === "special-attack")?.base_stat ?? 50;
  const def    = pokemon.stats.find(s => s.stat.name === "defense")?.base_stat ?? 50;
  const spDef  = pokemon.stats.find(s => s.stat.name === "special-defense")?.base_stat ?? 50;
  const hp     = pokemon.stats.find(s => s.stat.name === "hp")?.base_stat ?? 50;
  const speed  = pokemon.stats.find(s => s.stat.name === "speed")?.base_stat ?? 50;

  const ScalingFactor = 1.0 + (speed - 75) * 0.0103; // Speed modifier

  const hi = Math.max(attack, spAtk);
  const lo = Math.min(attack, spAtk);
  const goAtk = Math.round((hi * 7 + lo) / 8 * ScalingFactor);

  const hiD = Math.max(def, spDef);
  const loD = Math.min(def, spDef);
  const goDef = Math.round((hiD * 5 + loD * 3) / 8 * ScalingFactor);

  const goSta = Math.floor(hp * 1.75 + 50);

  return { atk: goAtk, def: goDef, sta: goSta };
}

function calcCP(base, ivAtk, ivDef, ivSta, cpm) {
  return Math.max(10, Math.floor(((base.atk + ivAtk) * Math.sqrt(base.def + ivDef) *
    Math.sqrt(base.sta + ivSta) * cpm * cpm) / 10));
}

function calcHP(base, ivSta, cpm) {
  return Math.max(10, Math.floor((base.sta + ivSta) * cpm));
}

export default function IVCalculator({ allList, thaiArr, jpArr, lang, cachedFetch, onClose }) {
  const s = STRINGS[lang];
  const [pokemon, setPokemon] = useState(null);
  const [picking, setPicking] = useState(true);
  const [search, setSearch] = useState("");
  const debSearch = useDebouncedValue(search, 200);
  const [cp, setCp] = useState(1000);
  const [hp, setHp] = useState(80);
  const [level, setLevel] = useState(30);
  const [isWild, setIsWild] = useState(true); // wild caps at level 30/35
  const [weatherBoosted, setWeatherBoosted] = useState(false);

  const allWithMeta = useMemo(() => {
    return allList.map(p => {
      const id = parseInt(p.url.split("/").filter(Boolean).pop(), 10);
      return { name: p.name, url: p.url, id };
    }).filter(p => p.id && p.id <= 1025);
  }, [allList]);

  const results = useMemo(() => {
    const q = debSearch.toLowerCase().trim();
    if (!q) return allWithMeta.slice(0, 30);
    return allWithMeta.filter(p => {
      const th = (getLocalName(p.id, "th", thaiArr, jpArr) ?? "").toLowerCase();
      const ja = (getLocalName(p.id, "ja", thaiArr, jpArr) ?? "").toLowerCase();
      return p.name.toLowerCase().includes(q) || th.includes(q) || ja.includes(q) || String(p.id).includes(q);
    }).slice(0, 30);
  }, [debSearch, allWithMeta, thaiArr, jpArr]);

  const handlePick = useCallback(async (entry) => {
    const full = await cachedFetch(entry.url);
    setPokemon(full);
    setPicking(false);
  }, [cachedFetch]);

  // Calculate possible IV combinations
  const ivResults = useMemo(() => {
    if (!pokemon) return null;
    const baseStats = getGoBaseStats(pokemon);
    const matches = [];

    // Try levels based on settings
    const minLevel = weatherBoosted ? 6 : 1;
    const maxLevel = isWild ? (weatherBoosted ? 35 : 30) : 50;

    for (const lv of LEVELS) {
      if (lv < minLevel || lv > maxLevel) continue;
      const cpm = CPM[lv];

      for (let ivA = 0; ivA <= 15; ivA++) {
        for (let ivD = 0; ivD <= 15; ivD++) {
          for (let ivS = 0; ivS <= 15; ivS++) {
            const computedCP = calcCP(baseStats, ivA, ivD, ivS, cpm);
            const computedHP = calcHP(baseStats, ivS, cpm);
            if (computedCP === cp && computedHP === hp) {
              matches.push({ level: lv, ivA, ivD, ivS,
                total: ivA + ivD + ivS, pct: ((ivA + ivD + ivS) / 45 * 100) });
            }
          }
        }
      }
    }
    return matches;
  }, [pokemon, cp, hp, isWild, weatherBoosted]);

  const bestMatch = ivResults && ivResults.length > 0
    ? ivResults.reduce((best, m) => m.total > best.total ? m : best, ivResults[0])
    : null;
  const worstMatch = ivResults && ivResults.length > 0
    ? ivResults.reduce((worst, m) => m.total < worst.total ? m : worst, ivResults[0])
    : null;

  const grade = (pct) => {
    if (pct >= 98) return { label: "💯 Hundo!", color: "#facc15" };
    if (pct >= 90) return { label: "⭐ Excellent", color: "#10b981" };
    if (pct >= 80) return { label: "✨ Great", color: "#3b82f6" };
    if (pct >= 67) return { label: "👍 Good", color: "#8b5cf6" };
    return { label: "Average", color: "#94a3b8" };
  };

  return (
    <div className="game-overlay" onClick={onClose}>
      <div className="game-content go-tool-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close game-close" onClick={onClose}>✕</button>

        <div className="game-header">
          <h1 className="game-title">🔍 IV Calculator</h1>
          <p className="game-sub">
            {lang==="th" ? "ตรวจหาค่า IV จาก CP และ HP"
             : lang==="ja" ? "CPとHPから個体値を解析"
             : "Find IV values from CP and HP"}
          </p>
        </div>

        {!pokemon ? (
          <>
            <input className="team-add-search" placeholder={s.searchPlaceholder}
              value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
            <div className="team-add-grid">
              {results.map(p => {
                const name = getLocalName(p.id, lang, thaiArr, jpArr) ?? p.name;
                const img = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${p.id}.png`;
                return (
                  <button key={p.id} className="team-add-card" onClick={() => handlePick(p)}>
                    <img src={img} alt={name} className="team-add-img" loading="lazy" />
                    <span className="team-add-num">#{String(p.id).padStart(4,"0")}</span>
                    <span className="team-add-name">{name}</span>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <div className="iv-target" style={{ borderColor: typeColor(pokemon.types[0]?.type.name) }}>
              <img src={getArt(pokemon)} alt={pokemon.name} className="iv-target-img" />
              <div className="iv-target-info">
                <div className="iv-target-name">
                  {getLocalName(pokemon.id, lang, thaiArr, jpArr) ?? pokemon.name}
                </div>
                <div className="iv-target-id">{padId(pokemon.id)}</div>
              </div>
              <button className="iv-change-btn" onClick={() => setPicking(true)}>🔄 Change</button>
            </div>

            <div className="iv-inputs">
              <div className="iv-input-group">
                <label>⚡ CP</label>
                <input type="number" min="10" max="9999" value={cp}
                  onChange={(e) => setCp(parseInt(e.target.value) || 10)} />
              </div>
              <div className="iv-input-group">
                <label>❤️ HP</label>
                <input type="number" min="10" max="999" value={hp}
                  onChange={(e) => setHp(parseInt(e.target.value) || 10)} />
              </div>
            </div>

            <div className="iv-options">
              <label className="iv-option">
                <input type="checkbox" checked={isWild} onChange={(e) => setIsWild(e.target.checked)} />
                <span>🌿 {lang==="th"?"จับจากป่า/Egg":"Wild caught / Egg"}</span>
              </label>
              <label className="iv-option">
                <input type="checkbox" checked={weatherBoosted} onChange={(e) => setWeatherBoosted(e.target.checked)} />
                <span>🌦️ {lang==="th"?"Weather Boosted":"Weather Boosted"}</span>
              </label>
            </div>

            {ivResults && (
              <>
                <div className="iv-summary">
                  <span className="iv-summary-count">{ivResults.length}</span>
                  <span className="iv-summary-label">
                    {lang==="th"?"ค่า IV ที่เป็นไปได้":lang==="ja"?"可能な組み合わせ":"possible IV combinations"}
                  </span>
                </div>

                {ivResults.length === 0 && (
                  <div className="iv-empty">
                    ⚠️ {lang==="th"?"ไม่พบ IV ที่ตรงกับ CP/HP นี้":lang==="ja"?"該当なし":"No IV matches found"}
                    <br/>
                    <small>{lang==="th"?"ลองเช็คตัวเลข CP/HP อีกครั้ง":"Double-check CP/HP values"}</small>
                  </div>
                )}

                {bestMatch && worstMatch && (
                  <div className="iv-best-worst">
                    <div className="iv-summary-card" style={{ background: `linear-gradient(135deg, ${grade(bestMatch.pct).color}, ${grade(bestMatch.pct).color}aa)` }}>
                      <div className="iv-summary-card-label">🏆 {lang==="th"?"ดีสุดที่เป็นไปได้":"Best possible"}</div>
                      <div className="iv-summary-card-val">{bestMatch.pct.toFixed(1)}%</div>
                      <div className="iv-summary-card-iv">A:{bestMatch.ivA} · D:{bestMatch.ivD} · S:{bestMatch.ivS}</div>
                      <div className="iv-summary-card-grade">{grade(bestMatch.pct).label}</div>
                    </div>
                    <div className="iv-summary-card" style={{ background: `linear-gradient(135deg, ${grade(worstMatch.pct).color}, ${grade(worstMatch.pct).color}aa)` }}>
                      <div className="iv-summary-card-label">📉 {lang==="th"?"แย่สุดที่เป็นไปได้":"Worst possible"}</div>
                      <div className="iv-summary-card-val">{worstMatch.pct.toFixed(1)}%</div>
                      <div className="iv-summary-card-iv">A:{worstMatch.ivA} · D:{worstMatch.ivD} · S:{worstMatch.ivS}</div>
                      <div className="iv-summary-card-grade">{grade(worstMatch.pct).label}</div>
                    </div>
                  </div>
                )}

                {ivResults.length > 0 && ivResults.length <= 20 && (
                  <div className="iv-list">
                    <div className="iv-list-header">
                      <span>Level</span>
                      <span>Atk</span>
                      <span>Def</span>
                      <span>Sta</span>
                      <span>%</span>
                    </div>
                    {ivResults
                      .sort((a, b) => b.pct - a.pct)
                      .map((r, i) => (
                        <div key={i} className="iv-list-row" style={{ "--grade-color": grade(r.pct).color }}>
                          <span>Lv {r.level}</span>
                          <span className="iv-iv">{r.ivA}</span>
                          <span className="iv-iv">{r.ivD}</span>
                          <span className="iv-iv">{r.ivS}</span>
                          <span className="iv-pct" style={{ color: grade(r.pct).color }}>{r.pct.toFixed(0)}%</span>
                        </div>
                      ))}
                  </div>
                )}

                {ivResults.length > 20 && (
                  <div className="iv-note">
                    💡 {lang==="th"?"มีผลลัพธ์มากเกินไป — ลอง power up แล้วใส่ค่าใหม่เพื่อจำกัดวง":
                        "Too many results — power up and re-enter values to narrow down"}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
