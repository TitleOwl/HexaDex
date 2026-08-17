import { useState, useMemo, useCallback, useEffect } from "react";
import { STRINGS, TYPE_NAMES_TH, TYPE_NAMES_JA, TYPE_OFFENSE, ALL_TYPES } from "../data.js";
import { typeColor, getArt, getLocalName, useDebouncedValue } from "../utils.js";

// ─── Damage formula ──────────────────────────────────────────────────────────
function calcStat(base, iv, ev, level, nature = 1.0) {
  return Math.floor((Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100) + 5) * nature);
}
function calcHP(base, iv, ev, level) {
  if (base === 1) return 1;
  return Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100) + level + 10;
}
function calcTypeEff(moveType, defTypes) {
  let m = 1;
  defTypes.forEach(d => { m *= TYPE_OFFENSE[moveType]?.[d] ?? 1; });
  return m;
}
function calcDamage(att, def, move, opts = {}) {
  const { level=50, critical=false, weather=null,
    attackerIV=31, attackerEV=252, defenderIV=31, defenderEV=0 } = opts;
  if (!move.power) return null;

  const isPhys = move.damage_class === "physical";
  const aBase = att.stats.find(s => s.stat.name === (isPhys?"attack":"special-attack"))?.base_stat ?? 50;
  const dBase = def.stats.find(s => s.stat.name === (isPhys?"defense":"special-defense"))?.base_stat ?? 50;
  const A = calcStat(aBase, attackerIV, attackerEV, level);
  const D = calcStat(dBase, defenderIV, defenderEV, level);

  let dmg = Math.floor((Math.floor((2*level/5+2) * move.power * A / D) / 50) + 2);

  const isSTAB = att.types.some(t => t.type.name === move.type);
  if (isSTAB) dmg = Math.floor(dmg * 1.5);

  const defTypes = def.types.map(t => t.type.name);
  const eff = calcTypeEff(move.type, defTypes);
  dmg = Math.floor(dmg * eff);

  if (critical) dmg = Math.floor(dmg * 1.5);

  if (weather === "sun" && move.type === "fire") dmg = Math.floor(dmg * 1.5);
  if (weather === "sun" && move.type === "water") dmg = Math.floor(dmg * 0.5);
  if (weather === "rain" && move.type === "water") dmg = Math.floor(dmg * 1.5);
  if (weather === "rain" && move.type === "fire") dmg = Math.floor(dmg * 0.5);

  const min = Math.max(1, Math.floor(dmg * 0.85));
  const max = Math.max(1, dmg);
  return { min, max, avg: Math.floor((min + max) / 2), effectiveness: eff, isSTAB };
}

// ─── Curated movesets (fallback if API moves don't load) ──────────────────────
// Each entry: { name, type, damage_class, power }
const FALLBACK_MOVES_BY_TYPE = {
  normal:   [{ name: "tackle", type: "normal", damage_class: "physical", power: 40 },
             { name: "hyper-beam", type: "normal", damage_class: "special", power: 150 },
             { name: "body-slam", type: "normal", damage_class: "physical", power: 85 }],
  fire:     [{ name: "ember", type: "fire", damage_class: "special", power: 40 },
             { name: "flamethrower", type: "fire", damage_class: "special", power: 90 },
             { name: "fire-blast", type: "fire", damage_class: "special", power: 110 }],
  water:    [{ name: "water-gun", type: "water", damage_class: "special", power: 40 },
             { name: "surf", type: "water", damage_class: "special", power: 90 },
             { name: "hydro-pump", type: "water", damage_class: "special", power: 110 }],
  electric: [{ name: "thunder-shock", type: "electric", damage_class: "special", power: 40 },
             { name: "thunderbolt", type: "electric", damage_class: "special", power: 90 },
             { name: "thunder", type: "electric", damage_class: "special", power: 110 }],
  grass:    [{ name: "vine-whip", type: "grass", damage_class: "physical", power: 45 },
             { name: "energy-ball", type: "grass", damage_class: "special", power: 90 },
             { name: "solar-beam", type: "grass", damage_class: "special", power: 120 }],
  ice:      [{ name: "icy-wind", type: "ice", damage_class: "special", power: 55 },
             { name: "ice-beam", type: "ice", damage_class: "special", power: 90 },
             { name: "blizzard", type: "ice", damage_class: "special", power: 110 }],
  fighting: [{ name: "karate-chop", type: "fighting", damage_class: "physical", power: 50 },
             { name: "close-combat", type: "fighting", damage_class: "physical", power: 120 }],
  poison:   [{ name: "poison-sting", type: "poison", damage_class: "physical", power: 15 },
             { name: "sludge-bomb", type: "poison", damage_class: "special", power: 90 }],
  ground:   [{ name: "mud-shot", type: "ground", damage_class: "special", power: 55 },
             { name: "earthquake", type: "ground", damage_class: "physical", power: 100 }],
  flying:   [{ name: "wing-attack", type: "flying", damage_class: "physical", power: 60 },
             { name: "brave-bird", type: "flying", damage_class: "physical", power: 120 }],
  psychic:  [{ name: "confusion", type: "psychic", damage_class: "special", power: 50 },
             { name: "psychic", type: "psychic", damage_class: "special", power: 90 }],
  bug:      [{ name: "bug-bite", type: "bug", damage_class: "physical", power: 60 },
             { name: "x-scissor", type: "bug", damage_class: "physical", power: 80 }],
  rock:     [{ name: "rock-throw", type: "rock", damage_class: "physical", power: 50 },
             { name: "stone-edge", type: "rock", damage_class: "physical", power: 100 }],
  ghost:    [{ name: "shadow-ball", type: "ghost", damage_class: "special", power: 80 },
             { name: "shadow-claw", type: "ghost", damage_class: "physical", power: 70 }],
  dragon:   [{ name: "dragon-breath", type: "dragon", damage_class: "special", power: 60 },
             { name: "dragon-claw", type: "dragon", damage_class: "physical", power: 80 },
             { name: "draco-meteor", type: "dragon", damage_class: "special", power: 130 }],
  dark:     [{ name: "bite", type: "dark", damage_class: "physical", power: 60 },
             { name: "dark-pulse", type: "dark", damage_class: "special", power: 80 }],
  steel:    [{ name: "metal-claw", type: "steel", damage_class: "physical", power: 50 },
             { name: "iron-head", type: "steel", damage_class: "physical", power: 80 }],
  fairy:    [{ name: "fairy-wind", type: "fairy", damage_class: "special", power: 40 },
             { name: "moonblast", type: "fairy", damage_class: "special", power: 95 },
             { name: "play-rough", type: "fairy", damage_class: "physical", power: 90 }],
};

function getCuratedMoves(pokemon) {
  // Get moves from pokemon's types + neutral moves
  const moves = [];
  pokemon.types.forEach(t => {
    const typeMoves = FALLBACK_MOVES_BY_TYPE[t.type.name] ?? [];
    moves.push(...typeMoves);
  });
  // Add normal moves as fallback
  if (moves.length < 3) moves.push(...FALLBACK_MOVES_BY_TYPE.normal);
  return moves;
}

function SlotPicker({ allWithMeta, thaiArr, jpArr, lang, onPick, onClose, slot }) {
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
          <h2 style={{ fontFamily:"var(--font-display)", color:"var(--blue-deep)", marginTop:0 }}>
            {slot} — {s.selectPokemon}
          </h2>
          <input className="team-add-search" placeholder={s.searchPlaceholder}
            value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
          <div className="team-add-grid">
            {results.map(p => {
              const name = getLocalName(p.id, lang, thaiArr, jpArr) ?? p.name;
              const img = `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/other/official-artwork/${p.id}.png`;
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

export default function DamageCalculator({
  allList, thaiArr, jpArr, lang, cachedFetch, onClose,
  // Optional preset pokemon (from team builder)
  initialAttacker = null, initialDefender = null,
}) {
  const s = STRINGS[lang];
  const [attacker, setAttacker] = useState(initialAttacker);
  const [defender, setDefender] = useState(initialDefender);
  const [picking, setPicking] = useState(null);
  const [level, setLevel] = useState(50);
  const [critical, setCritical] = useState(false);
  const [weather, setWeather] = useState(null);
  const [selectedMove, setSelectedMove] = useState(null);
  const [movesList, setMovesList] = useState([]);
  const [movesLoading, setMovesLoading] = useState(false);

  const allWithMeta = useMemo(() => {
    return allList.map(p => {
      const id = parseInt(p.url.split("/").filter(Boolean).pop(), 10);
      return { name: p.name, url: p.url, id };
    }).filter(p => p.id && p.id <= 1025);
  }, [allList]);

  // ⭐ FIXED: Load moves with better error handling + use curated fallback
  useEffect(() => {
    if (!attacker) return;
    setSelectedMove(null);
    setMovesLoading(true);

    // First, use curated moves (guaranteed to work)
    const curatedMoves = getCuratedMoves(attacker);
    setMovesList(curatedMoves);
    setSelectedMove(curatedMoves.find(m => m.power >= 80) ?? curatedMoves[0]);
    setMovesLoading(false);

    // Try to enrich with API moves in background
    const learnedMoves = (attacker.moves ?? []).slice(0, 30);
    if (learnedMoves.length > 0) {
      Promise.all(
        learnedMoves.map(m =>
          fetch(`https://pokeapi.co/api/v2/move/${m.move.name}`)
            .then(r => r.json()).catch(() => null)
        )
      ).then(details => {
        const apiMoves = details
          .filter(d => d && d.power && d.damage_class && d.damage_class.name !== "status")
          .map(d => ({
            name: d.name,
            type: d.type.name,
            damage_class: d.damage_class.name,
            power: d.power,
          }));
        if (apiMoves.length > 0) {
          // Merge unique moves
          const merged = [...curatedMoves];
          apiMoves.forEach(am => {
            if (!merged.some(m => m.name === am.name)) merged.push(am);
          });
          merged.sort((a, b) => b.power - a.power);
          setMovesList(merged);
          setSelectedMove(merged[0]);
        }
      }).catch(() => {});
    }
  }, [attacker]);

  const handlePick = useCallback(async (entry) => {
    const full = await cachedFetch(entry.url);
    if (picking === "attacker") setAttacker(full);
    else if (picking === "defender") setDefender(full);
    setPicking(null);
  }, [picking, cachedFetch]);

  const result = useMemo(() => {
    if (!attacker || !defender || !selectedMove) return null;
    const damage = calcDamage(attacker, defender, selectedMove, { level, critical, weather });
    if (!damage) return null;
    const hpBase = defender.stats.find(s => s.stat.name === "hp")?.base_stat ?? 50;
    const defHP = calcHP(hpBase, 31, 0, level);
    const minPct = (damage.min / defHP) * 100;
    const maxPct = (damage.max / defHP) * 100;
    let koText = "";
    if (minPct >= 100) koText = "✅ Guaranteed OHKO";
    else if (maxPct >= 100) koText = "⚠️ Possible OHKO";
    else if (maxPct >= 50) koText = "2HKO likely";
    else if (maxPct >= 33) koText = "3HKO";
    else if (maxPct >= 25) koText = "4HKO";
    else koText = "5HKO+";
    return { ...damage, defHP, minPct, maxPct, koText };
  }, [attacker, defender, selectedMove, level, critical, weather]);

  const typeName = (tn) =>
    lang==="th" ? (TYPE_NAMES_TH[tn]??tn) : lang==="ja" ? (TYPE_NAMES_JA[tn]??tn) : tn;

  const slotDisplay = (p, slotName, role) => {
    if (!p) {
      return (
        <div className="dmg-slot empty" onClick={() => setPicking(slotName)}>
          <div className="dmg-slot-role">{role}</div>
          <div className="dmg-slot-empty-icon">➕</div>
          <div className="dmg-slot-empty-text">{s.selectPokemon}</div>
        </div>
      );
    }
    const color = typeColor(p.types[0]?.type.name);
    const name = getLocalName(p.id, lang, thaiArr, jpArr) ?? p.name;
    return (
      <div className="dmg-slot" style={{ borderColor: color }}>
        <div className="dmg-slot-role" style={{ color }}>{role}</div>
        <button className="dmg-slot-swap" onClick={() => setPicking(slotName)}>🔄</button>
        <img src={getArt(p)} alt={name} className="dmg-slot-img" />
        <div className="dmg-slot-name">{name}</div>
        <div className="dmg-slot-types">
          {p.types.map(t => (
            <span key={t.type.name} className="type-tag-mini" style={{ background: typeColor(t.type.name) }}>
              {typeName(t.type.name)}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="game-overlay" onClick={onClose}>
      <div className="game-content dmg-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close game-close" onClick={onClose}>✕</button>

        <div className="game-header">
          <h1 className="game-title">⚔️ Damage Calculator</h1>
          <p className="game-sub">
            {lang==="th"?"คำนวณ damage ตามสูตรเกมจริง":
             lang==="ja"?"ゲームの実際の式":
             "Real damage formula · works for any matchup"}
          </p>
        </div>

        <div className="dmg-wrap">
          {slotDisplay(attacker, "attacker", lang==="th" ? "ผู้โจมตี" : lang==="ja" ? "攻撃側" : "ATTACKER")}
          <div className="dmg-vs">⚔️</div>
          {slotDisplay(defender, "defender", lang==="th" ? "ผู้รับ" : lang==="ja" ? "防御側" : "DEFENDER")}
        </div>

        {attacker && defender && (
          <>
            <div className="dmg-settings">
              <div className="dmg-setting">
                <label>Level: <strong>{level}</strong></label>
                <input type="range" min="1" max="100" value={level}
                  onChange={(e) => setLevel(parseInt(e.target.value))} />
              </div>
              <div className="dmg-setting">
                <label>{lang==="th"?"อากาศ":lang==="ja"?"天候":"Weather"}</label>
                <div className="dmg-weather-pills">
                  {[
                    { id: null, icon: "—", label: "Clear" },
                    { id: "sun", icon: "☀️", label: "Sun" },
                    { id: "rain", icon: "🌧", label: "Rain" },
                  ].map(w => (
                    <button key={w.id ?? "none"}
                      className={`dmg-pill${weather === w.id ? " active" : ""}`}
                      onClick={() => setWeather(w.id)}>
                      {w.icon} {w.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="dmg-setting">
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                  <input type="checkbox" checked={critical}
                    onChange={(e) => setCritical(e.target.checked)} />
                  💥 Critical Hit (×1.5)
                </label>
              </div>
            </div>

            <div className="dmg-moves">
              <div className="modal-section-title">🎯 {lang==="th"?"เลือกท่า":lang==="ja"?"わざ":"Select Move"}</div>
              {movesLoading && movesList.length === 0 ? (
                <div className="evo-loading">⏳ Loading moves...</div>
              ) : (
                <div className="dmg-moves-grid">
                  {movesList.map((m, idx) => (
                    <button key={`${m.name}-${idx}`}
                      className={`dmg-move-btn${selectedMove?.name === m.name ? " active" : ""}`}
                      onClick={() => setSelectedMove(m)}
                      style={{ borderColor: selectedMove?.name === m.name ? typeColor(m.type) : undefined }}>
                      <span className="dmg-move-name">{m.name.replace(/-/g, " ")}</span>
                      <span className="dmg-move-type" style={{ background: typeColor(m.type) }}>
                        {typeName(m.type)}
                      </span>
                      <span className="dmg-move-power">⚡ {m.power}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {result && (
              <div className="dmg-result">
                <div className="dmg-result-header">
                  <div className="dmg-effectiveness">
                    {result.effectiveness === 0 ? "🛡️ No Effect (0×)" :
                     result.effectiveness >= 4 ? `💥💥 Devastating (×${result.effectiveness})!` :
                     result.effectiveness >= 2 ? `💥 Super Effective (×${result.effectiveness})!` :
                     result.effectiveness >= 1 ? `Normal (×${result.effectiveness})` :
                     result.effectiveness > 0 ? `🛡 Not Very Effective (×${result.effectiveness})` :
                     "—"}
                  </div>
                  {result.isSTAB && <div className="dmg-stab">✨ STAB ×1.5</div>}
                </div>

                <div className="dmg-bar-wrap">
                  <div className="dmg-bar-bg">
                    <div className="dmg-bar-fill" style={{
                      width: `${Math.min(100, result.maxPct)}%`,
                      background: result.maxPct >= 100 ? "linear-gradient(90deg, #dc2626, #991b1b)" :
                                  result.maxPct >= 50  ? "linear-gradient(90deg, #f59e0b, #d97706)" :
                                                         "linear-gradient(90deg, #16a34a, #15803d)",
                    }} />
                  </div>
                  <div className="dmg-bar-labels">
                    <span>0</span>
                    <span>{result.defHP} HP</span>
                  </div>
                </div>

                <div className="dmg-stats-grid">
                  <div className="dmg-stat-box">
                    <div className="dmg-stat-label">Min</div>
                    <div className="dmg-stat-val" style={{ color: "#16a34a" }}>{result.min}</div>
                    <div className="dmg-stat-pct">{result.minPct.toFixed(1)}%</div>
                  </div>
                  <div className="dmg-stat-box">
                    <div className="dmg-stat-label">Max</div>
                    <div className="dmg-stat-val" style={{ color: "#dc2626" }}>{result.max}</div>
                    <div className="dmg-stat-pct">{result.maxPct.toFixed(1)}%</div>
                  </div>
                  <div className="dmg-stat-box">
                    <div className="dmg-stat-label">Avg</div>
                    <div className="dmg-stat-val">{result.avg}</div>
                    <div className="dmg-stat-pct">{((result.minPct + result.maxPct) / 2).toFixed(1)}%</div>
                  </div>
                  <div className="dmg-stat-box dmg-stat-box-ko">
                    <div className="dmg-stat-label">Result</div>
                    <div className="dmg-stat-val" style={{ fontSize: "1.1rem", color: "#fff" }}>{result.koText}</div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {picking && (
          <SlotPicker allWithMeta={allWithMeta} thaiArr={thaiArr} jpArr={jpArr} lang={lang}
            slot={picking === "attacker" ? "Attacker" : "Defender"}
            onPick={handlePick} onClose={() => setPicking(null)} />
        )}
      </div>
    </div>
  );
}