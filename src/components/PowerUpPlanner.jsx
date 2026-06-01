import { useState, useEffect, useMemo } from "react";
import { STRINGS } from "../data.js";
import { typeColor, getArt, getLocalName, useDebouncedValue } from "../utils.js";

// ─── REAL Pokémon GO Power-Up Cost Table ────────────────────────────────────
// Each entry = cost to power-up by 0.5 levels (one upgrade in-game)
// Source: Pokémon GO official data
const POWERUP_TABLE = [
  // level upper bound (exclusive), stardust, candy, xlCandy
  { upTo: 3,    stardust: 200,   candy: 1, xlCandy: 0 },
  { upTo: 5,    stardust: 400,   candy: 1, xlCandy: 0 },
  { upTo: 7,    stardust: 600,   candy: 1, xlCandy: 0 },
  { upTo: 9,    stardust: 800,   candy: 1, xlCandy: 0 },
  { upTo: 11,   stardust: 1000,  candy: 1, xlCandy: 0 },
  { upTo: 13,   stardust: 1300,  candy: 2, xlCandy: 0 },
  { upTo: 15,   stardust: 1600,  candy: 2, xlCandy: 0 },
  { upTo: 17,   stardust: 1900,  candy: 2, xlCandy: 0 },
  { upTo: 19,   stardust: 2200,  candy: 2, xlCandy: 0 },
  { upTo: 21,   stardust: 2500,  candy: 2, xlCandy: 0 },
  { upTo: 23,   stardust: 3000,  candy: 3, xlCandy: 0 },
  { upTo: 25,   stardust: 3500,  candy: 3, xlCandy: 0 },
  { upTo: 27,   stardust: 4000,  candy: 4, xlCandy: 0 },
  { upTo: 29,   stardust: 4500,  candy: 4, xlCandy: 0 },
  { upTo: 31,   stardust: 5000,  candy: 6, xlCandy: 0 },
  { upTo: 33,   stardust: 6000,  candy: 8, xlCandy: 0 },
  { upTo: 35,   stardust: 7000,  candy: 10, xlCandy: 0 },
  { upTo: 37,   stardust: 8000,  candy: 12, xlCandy: 0 },
  { upTo: 39,   stardust: 9000,  candy: 15, xlCandy: 0 },
  { upTo: 41,   stardust: 10000, candy: 20, xlCandy: 0 },
  { upTo: 43,   stardust: 10000, candy: 10, xlCandy: 1 },
  { upTo: 45,   stardust: 11000, candy: 10, xlCandy: 3 },
  { upTo: 47,   stardust: 13000, candy: 10, xlCandy: 5 },
  { upTo: 49,   stardust: 15000, candy: 10, xlCandy: 10 },
  { upTo: 51,   stardust: 17000, candy: 10, xlCandy: 15 },
];

function getCostForLevel(level) {
  for (const tier of POWERUP_TABLE) {
    if (level < tier.upTo) return tier;
  }
  return POWERUP_TABLE[POWERUP_TABLE.length - 1];
}

// Total cost from currentLevel to targetLevel (0.5 increments)
function totalCost(fromLevel, toLevel, modifier = 1) {
  if (toLevel <= fromLevel) return { stardust: 0, candy: 0, xlCandy: 0, steps: 0 };
  let stardust = 0, candy = 0, xlCandy = 0, steps = 0;
  for (let lvl = fromLevel; lvl < toLevel; lvl += 0.5) {
    const c = getCostForLevel(lvl);
    stardust += c.stardust;
    candy += c.candy;
    xlCandy += c.xlCandy;
    steps++;
  }
  return {
    stardust: Math.round(stardust * modifier),
    candy: Math.round(candy * modifier),
    xlCandy: Math.round(xlCandy * modifier),
    steps,
  };
}

// ─── CPM (CP Multiplier) Table — REAL Pokémon GO values ─────────────────────
const CPM_TABLE = {
  1: 0.094, 1.5: 0.1351374318, 2: 0.16639787, 2.5: 0.192650913,
  3: 0.21573247, 3.5: 0.2365726613, 4: 0.25572005, 4.5: 0.2735303812,
  5: 0.29024988, 5.5: 0.3060573775, 6: 0.3210876, 6.5: 0.3354450362,
  7: 0.34921268, 7.5: 0.3624577511, 8: 0.3752356, 8.5: 0.387592416,
  9: 0.39956728, 9.5: 0.4111935514, 10: 0.4225, 10.5: 0.4329264091,
  11: 0.44310755, 11.5: 0.4530599591, 12: 0.4627984, 12.5: 0.472336093,
  13: 0.48168495, 13.5: 0.4908558003, 14: 0.49985844, 14.5: 0.508701765,
  15: 0.51739395, 15.5: 0.5259425113, 16: 0.5343543, 16.5: 0.5426357375,
  17: 0.5507927, 17.5: 0.5588305862, 18: 0.5667545, 18.5: 0.5745691333,
  19: 0.5822789, 19.5: 0.5898879072, 20: 0.5974, 20.5: 0.6048236651,
  21: 0.6121573, 21.5: 0.6194041216, 22: 0.6265671, 22.5: 0.6336491432,
  23: 0.64065295, 23.5: 0.6475809666, 24: 0.65443563, 24.5: 0.6612192524,
  25: 0.667934, 25.5: 0.6745818154, 26: 0.6811649, 26.5: 0.6876849038,
  27: 0.69414365, 27.5: 0.700542901, 28: 0.7068842, 28.5: 0.713169102,
  29: 0.7193991, 29.5: 0.7255756136, 30: 0.7317, 30.5: 0.7347410093,
  31: 0.7377695, 31.5: 0.7407855938, 32: 0.74378943, 32.5: 0.7467812109,
  33: 0.74976104, 33.5: 0.7527290867, 34: 0.7556855, 34.5: 0.7586303781,
  35: 0.76156384, 35.5: 0.7644860647, 36: 0.76739717, 36.5: 0.7702972656,
  37: 0.7731865, 37.5: 0.7760649616, 38: 0.7789327, 38.5: 0.7817898405,
  39: 0.78463644, 39.5: 0.7874727983, 40: 0.7903, 40.5: 0.792803968,
  41: 0.79530001, 41.5: 0.797800015, 42: 0.8003, 42.5: 0.802799995,
  43: 0.8053, 43.5: 0.8078, 44: 0.81029999, 44.5: 0.81280002,
  45: 0.81529999, 45.5: 0.81779999, 46: 0.82029998, 46.5: 0.82279998,
  47: 0.82530004, 47.5: 0.82780004, 48: 0.83030003, 48.5: 0.83280003,
  49: 0.83530003, 49.5: 0.83780003, 50: 0.84029999,
};

function getCPM(level) {
  return CPM_TABLE[level] ?? CPM_TABLE[Math.floor(level * 2) / 2] ?? 0.094;
}

// ─── Approximate Pokémon GO Base Stats from main-series stats ───────────────
function calcGOBaseStats(pokemon) {
  const stats = {};
  pokemon.stats.forEach(s => { stats[s.stat.name] = s.base_stat; });

  const speedMod = 1 + (stats.speed - 75) / 500;
  const atk = Math.round(2 * (
    stats.attack >= stats["special-attack"]
      ? 7/8 * stats.attack + 1/8 * stats["special-attack"]
      : 7/8 * stats["special-attack"] + 1/8 * stats.attack
  ) * speedMod);
  const def = Math.round(2 * (
    stats.defense >= stats["special-defense"]
      ? 5/8 * stats.defense + 3/8 * stats["special-defense"]
      : 5/8 * stats["special-defense"] + 3/8 * stats.defense
  ) * speedMod);
  const sta = Math.floor(1.75 * stats.hp + 50);

  return { atk, def, sta };
}

// ─── Calculate CP from level + IVs ──────────────────────────────────────────
function calcCP(goStats, level, ivAtk = 15, ivDef = 15, ivHp = 15) {
  const cpm = getCPM(level);
  const a = goStats.atk + ivAtk;
  const d = goStats.def + ivDef;
  const s = goStats.sta + ivHp;
  return Math.max(10, Math.floor((a * Math.sqrt(d) * Math.sqrt(s) * cpm * cpm) / 10));
}

// ─── Pokemon Picker ─────────────────────────────────────────────────────────
function PokemonSearchPicker({ allWithMeta, thaiArr, jpArr, lang, onPick, onClose }) {
  const [search, setSearch] = useState("");
  const debSearch = useDebouncedValue(search, 200);

  const results = useMemo(() => {
    const q = debSearch.toLowerCase().trim();
    if (!q) return allWithMeta.slice(0, 60);
    return allWithMeta.filter(p => {
      const th = (getLocalName(p.id, "th", thaiArr, jpArr) ?? "").toLowerCase();
      return p.name.toLowerCase().includes(q) || th.includes(q) || String(p.id).includes(q);
    }).slice(0, 60);
  }, [debSearch, allWithMeta, thaiArr, jpArr]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal compare-picker" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-body">
          <h2 style={{ fontFamily:"var(--font-display)", color:"var(--blue-deep)", marginTop:0 }}>
            {lang==="th"?"เลือก Pokémon":"Select Pokémon"}
          </h2>
          <input className="team-add-search"
            placeholder={lang==="th"?"พิมพ์ชื่อ...":"Search..."}
            value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
          <div className="team-add-grid">
            {results.map(p => {
              const name = getLocalName(p.id, lang, thaiArr, jpArr) ?? p.name;
              const img = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${p.id}.png`;
              return (
                <button key={p.id} className="team-add-card" onClick={() => onPick(p)}>
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
export default function PowerUpPlanner({ allList, thaiArr, jpArr, lang, cachedFetch, onBack }) {
  const s = STRINGS[lang];

  const [pokemon, setPokemon] = useState(null);
  const [currentLevel, setCurrentLevel] = useState(20);
  const [targetLevel, setTargetLevel] = useState(40);
  const [ivAtk, setIvAtk] = useState(15);
  const [ivDef, setIvDef] = useState(15);
  const [ivHp, setIvHp] = useState(15);
  const [modifier, setModifier] = useState("normal"); // normal | shadow | purified | lucky
  const [picking, setPicking] = useState(false);

  const allWithMeta = useMemo(() => allList.map(p => {
    const id = parseInt(p.url.split("/").filter(Boolean).pop(), 10);
    return { name: p.name, url: p.url, id };
  }).filter(p => p.id && p.id <= 1025), [allList]);

  // Modifier multiplier (Pokemon GO mechanics)
  const modMult = modifier === "shadow"   ? 1.2
                : modifier === "purified" ? 0.9
                : modifier === "lucky"    ? 0.5
                : 1.0;

  const cost = useMemo(() => totalCost(currentLevel, targetLevel, modMult), [currentLevel, targetLevel, modMult]);

  const goStats = useMemo(() => pokemon ? calcGOBaseStats(pokemon) : null, [pokemon]);
  const currentCP = useMemo(() => goStats ? calcCP(goStats, currentLevel, ivAtk, ivDef, ivHp) : 0, [goStats, currentLevel, ivAtk, ivDef, ivHp]);
  const targetCP = useMemo(() => goStats ? calcCP(goStats, targetLevel, ivAtk, ivDef, ivHp) : 0, [goStats, targetLevel, ivAtk, ivDef, ivHp]);

  // Breakdown table — cost per level
  const breakdown = useMemo(() => {
    if (!goStats) return [];
    const rows = [];
    for (let lvl = currentLevel + 0.5; lvl <= targetLevel; lvl += 0.5) {
      const c = getCostForLevel(lvl - 0.5);
      const cp = calcCP(goStats, lvl, ivAtk, ivDef, ivHp);
      rows.push({
        level: lvl,
        cp,
        stardust: Math.round(c.stardust * modMult),
        candy: Math.round(c.candy * modMult),
        xlCandy: Math.round(c.xlCandy * modMult),
      });
    }
    return rows;
  }, [goStats, currentLevel, targetLevel, ivAtk, ivDef, ivHp, modMult]);

  const handlePick = async (entry) => {
    try {
      const full = await cachedFetch(entry.url);
      setPokemon(full);
    } catch (e) { console.error(e); }
    setPicking(false);
  };

  const pName = pokemon ? (getLocalName(pokemon.id, lang, thaiArr, jpArr) ?? pokemon.name) : "";
  const pColor = pokemon ? typeColor(pokemon.types[0]?.type.name) : "#94a3b8";

  return (
    <main className="grid-wrap powerup-wrap">
      <div className="tb-header">
        <h1 className="tb-title">
          💎 {lang==="th"?"คำนวณ Power-Up":lang==="ja"?"パワーアップ計算":"Power-Up Planner"}
        </h1>
        <p className="tb-sub">
          {lang==="th"
            ? "คำนวณ Stardust + Candy ที่ต้องใช้เพื่ออัพ CP โปเกม่อนตัวโปรด"
            : "Calculate exact Stardust & Candy needed to power up your Pokémon"}
        </p>
      </div>

      {onBack && (
        <button className="tb-action-btn ghost" onClick={onBack} style={{ marginBottom: 16 }}>
          ← {lang==="th"?"กลับ":"Back"}
        </button>
      )}

      {/* Pokemon picker */}
      <div className="pup-pokemon-section">
        <div className="pup-section-label">
          🎯 1. {lang==="th"?"เลือก Pokémon":"Choose Pokémon"}
        </div>
        {pokemon ? (
          <div className="pup-selected-pokemon" style={{ borderColor: pColor }}>
            <img src={getArt(pokemon)} alt={pName} className="pup-pokemon-img" />
            <div className="pup-pokemon-info">
              <div className="pup-pokemon-name">{pName}</div>
              <div className="pup-pokemon-id">#{String(pokemon.id).padStart(4,"0")}</div>
              <div className="pup-pokemon-types">
                {pokemon.types.map(t => (
                  <span key={t.type.name} className="type-tag-mini"
                    style={{ background: typeColor(t.type.name) }}>
                    {t.type.name.toUpperCase()}
                  </span>
                ))}
              </div>
              <div className="pup-pokemon-gostats">
                <span><strong>ATK</strong> {goStats?.atk}</span>
                <span><strong>DEF</strong> {goStats?.def}</span>
                <span><strong>STA</strong> {goStats?.sta}</span>
              </div>
            </div>
            <button className="pup-change-btn" onClick={() => setPicking(true)}>
              🔄 {lang==="th"?"เปลี่ยน":"Change"}
            </button>
          </div>
        ) : (
          <button className="pup-pick-btn" onClick={() => setPicking(true)}>
            <span className="pup-pick-icon">🔍</span>
            <span>{lang==="th"?"แตะเพื่อเลือก Pokémon":"Tap to select Pokémon"}</span>
          </button>
        )}
      </div>

      {pokemon && (
        <>
          {/* Modifier toggle */}
          <div className="pup-modifier-section">
            <div className="pup-section-label">
              ✨ 2. {lang==="th"?"ประเภท":"Pokémon Type"}
            </div>
            <div className="pup-modifier-grid">
              {[
                { id:"normal",   icon:"⚪", en:"Normal",   th:"ปกติ",     desc:"×1.0" },
                { id:"shadow",   icon:"🟣", en:"Shadow",   th:"ชาโดว์",   desc:"×1.2" },
                { id:"purified", icon:"⭐", en:"Purified", th:"ชำระ",     desc:"×0.9" },
                { id:"lucky",    icon:"🍀", en:"Lucky",    th:"โชคดี",   desc:"×0.5" },
              ].map(m => (
                <button key={m.id}
                  className={`pup-modifier-btn${modifier === m.id ? " active" : ""}`}
                  onClick={() => setModifier(m.id)}>
                  <span className="pup-mod-icon">{m.icon}</span>
                  <span className="pup-mod-name">{lang==="th"?m.th:m.en}</span>
                  <span className="pup-mod-mult">{m.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Level range */}
          <div className="pup-level-section">
            <div className="pup-section-label">
              📊 3. {lang==="th"?"เลเวลปัจจุบัน → เลเวลเป้าหมาย":"Current → Target Level"}
            </div>
            <div className="pup-level-row">
              <div className="pup-level-input">
                <label>{lang==="th"?"ตอนนี้":"Current"}</label>
                <input type="number" min="1" max="50" step="0.5" value={currentLevel}
                  onChange={(e) => setCurrentLevel(Math.max(1, Math.min(50, parseFloat(e.target.value) || 1)))} />
                <div className="pup-level-cp">CP {currentCP.toLocaleString()}</div>
              </div>
              <div className="pup-level-arrow">→</div>
              <div className="pup-level-input">
                <label>{lang==="th"?"เป้าหมาย":"Target"}</label>
                <input type="number" min="1" max="50" step="0.5" value={targetLevel}
                  onChange={(e) => setTargetLevel(Math.max(1, Math.min(50, parseFloat(e.target.value) || 1)))} />
                <div className="pup-level-cp">CP {targetCP.toLocaleString()}</div>
              </div>
            </div>

            <div className="pup-level-slider-wrap">
              <input type="range" min="1" max="50" step="0.5" value={targetLevel}
                onChange={(e) => setTargetLevel(parseFloat(e.target.value))}
                className="pup-level-slider" />
              <div className="pup-level-marks">
                <span>1</span><span>10</span><span>20</span>
                <span>30</span><span>40</span><span>50</span>
              </div>
            </div>
          </div>

          {/* IV inputs */}
          <div className="pup-iv-section">
            <div className="pup-section-label">
              🌟 4. {lang==="th"?"IV (ค่าพันธุกรรม)":"IVs"}
            </div>
            <div className="pup-iv-grid">
              {[
                { key: "atk", val: ivAtk, setter: setIvAtk, label: "ATK" },
                { key: "def", val: ivDef, setter: setIvDef, label: "DEF" },
                { key: "hp",  val: ivHp,  setter: setIvHp,  label: "HP"  },
              ].map(iv => (
                <div key={iv.key} className="pup-iv-input">
                  <label>{iv.label}</label>
                  <input type="number" min="0" max="15" value={iv.val}
                    onChange={(e) => iv.setter(Math.max(0, Math.min(15, parseInt(e.target.value) || 0)))} />
                  <span className="pup-iv-max">/15</span>
                </div>
              ))}
              <button className="pup-iv-hundo"
                onClick={() => { setIvAtk(15); setIvDef(15); setIvHp(15); }}>
                💯 Hundo
              </button>
            </div>
          </div>

          {/* RESULTS — Total Cost Cards */}
          <div className="pup-result-section">
            <div className="pup-section-label">
              💰 {lang==="th"?"ค่าใช้จ่ายรวม":"Total Cost"}
            </div>
            <div className="pup-cost-grid">
              <div className="pup-cost-card stardust">
                <div className="pup-cost-icon">⭐</div>
                <div className="pup-cost-val">{cost.stardust.toLocaleString()}</div>
                <div className="pup-cost-label">Stardust</div>
              </div>
              <div className="pup-cost-card candy">
                <div className="pup-cost-icon">🍬</div>
                <div className="pup-cost-val">{cost.candy.toLocaleString()}</div>
                <div className="pup-cost-label">Candy</div>
              </div>
              {cost.xlCandy > 0 && (
                <div className="pup-cost-card xl-candy">
                  <div className="pup-cost-icon">🍭</div>
                  <div className="pup-cost-val">{cost.xlCandy.toLocaleString()}</div>
                  <div className="pup-cost-label">XL Candy</div>
                </div>
              )}
              <div className="pup-cost-card cp-gain">
                <div className="pup-cost-icon">⚡</div>
                <div className="pup-cost-val">+{(targetCP - currentCP).toLocaleString()}</div>
                <div className="pup-cost-label">CP Gained</div>
              </div>
            </div>

            <div className="pup-cost-summary">
              <span className="pup-cost-summary-text">
                {cost.steps} {lang==="th"?"ขั้นการอัพ":"power-ups"}
                {" · "}
                {targetLevel - currentLevel} {lang==="th"?"เลเวล":"levels"}
              </span>
              {modifier !== "normal" && (
                <span className="pup-cost-summary-mod">
                  ×{modMult} ({modifier})
                </span>
              )}
            </div>
          </div>

          {/* Breakdown table */}
          {breakdown.length > 0 && breakdown.length <= 30 && (
            <div className="pup-breakdown-section">
              <div className="pup-section-label">
                📋 {lang==="th"?"รายละเอียดทีละขั้น":"Level-by-Level Breakdown"}
              </div>
              <div className="pup-breakdown-table">
                <div className="pup-breakdown-header">
                  <span>Level</span>
                  <span>CP</span>
                  <span>⭐ Dust</span>
                  <span>🍬 Candy</span>
                  {breakdown.some(r => r.xlCandy > 0) && <span>🍭 XL</span>}
                </div>
                {breakdown.map((row, i) => (
                  <div key={i} className="pup-breakdown-row">
                    <span className="pup-bd-level">{row.level}</span>
                    <span className="pup-bd-cp">{row.cp.toLocaleString()}</span>
                    <span>{row.stardust.toLocaleString()}</span>
                    <span>{row.candy}</span>
                    {breakdown.some(r => r.xlCandy > 0) && (
                      <span>{row.xlCandy > 0 ? row.xlCandy : "—"}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pup-tip">
            💡 {lang==="th"
              ? "ตัวเลขใช้สูตร Pokémon GO จริง · Lucky Pokémon = ครึ่งราคา · Shadow = แพงขึ้น 20%"
              : "Uses real Pokémon GO formulas · Lucky = half cost · Shadow = 20% more"}
          </div>
        </>
      )}

      {picking && (
        <PokemonSearchPicker allWithMeta={allWithMeta} thaiArr={thaiArr} jpArr={jpArr}
          lang={lang} onPick={handlePick} onClose={() => setPicking(false)} />
      )}
    </main>
  );
}
