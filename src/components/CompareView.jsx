import { useState, useMemo, useCallback } from "react";
import {
  STRINGS, TYPE_NAMES_TH, TYPE_NAMES_JA, STAT_LABELS,
} from "../data.js";
import {
  typeColor, padId, getArt, getLocalName, statColor,
  calcDefMatchups, useDebouncedValue,
} from "../utils.js";

// Picker modal for selecting a pokemon to a slot
function CompareSlotPicker({ allWithMeta, thaiArr, jpArr, lang, onPick, onClose, slot }) {
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
          <h2 style={{ fontFamily: "var(--font-display)", color: "var(--blue-deep)", marginTop: 0 }}>
            {s.selectPokemon} <span style={{ color: slot === "A" ? "#900603" : "#f59e0b" }}>{slot}</span>
          </h2>
          <input
            className="team-add-search"
            placeholder={s.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <div className="team-add-grid">
            {results.map(p => {
              const name = getLocalName(p.id, lang, thaiArr, jpArr) ?? p.name;
              const imgUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${p.id}.png`;
              return (
                <button key={p.id} className="team-add-card" onClick={() => onPick(p)}
                  title={`#${String(p.id).padStart(4,"0")} ${name}`}>
                  <img src={imgUrl} alt={name} className="team-add-img" loading="lazy" />
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

// Single comparison slot display
function CompareSlot({ pokemon, lang, thaiArr, jpArr, slot, onSelect, onRemove }) {
  const s = STRINGS[lang];
  if (!pokemon) {
    return (
      <div className="compare-slot compare-slot-empty" onClick={onSelect}>
        <div className="compare-slot-letter" style={{ background: slot === "A" ? "#900603" : "#f59e0b" }}>
          {slot}
        </div>
        <div className="compare-slot-empty-icon">➕</div>
        <div className="compare-slot-empty-text">{s.selectPokemon}</div>
      </div>
    );
  }
  const mainType = pokemon.types[0]?.type.name ?? "normal";
  const color = typeColor(mainType);
  const img = getArt(pokemon);
  const name = getLocalName(pokemon.id, lang, thaiArr, jpArr) ?? pokemon.name;

  const typeName = (tn) =>
    lang === "th" ? (TYPE_NAMES_TH[tn] ?? tn) : lang === "ja" ? (TYPE_NAMES_JA[tn] ?? tn) : tn;

  return (
    <div className="compare-slot" style={{
      background: `linear-gradient(160deg, ${color}aa, ${color}66 60%, ${color}22 100%)`,
      borderColor: color,
    }}>
      <div className="compare-slot-letter" style={{ background: slot === "A" ? "#900603" : "#f59e0b" }}>
        {slot}
      </div>
      <button className="compare-slot-remove" onClick={onRemove}>✕</button>
      <button className="compare-slot-swap" onClick={onSelect} title="Change Pokémon">🔄</button>

      {img && <img src={img} alt={name} className="compare-slot-img" />}
      <div className="compare-slot-id">{padId(pokemon.id)}</div>
      <div className="compare-slot-name">{name}</div>
      <div className="compare-slot-types">
        {pokemon.types.map(t => (
          <span key={t.type.name} className="modal-type-tag" style={{ fontSize: 11 }}>
            {typeName(t.type.name)}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function CompareView({ allList, thaiArr, jpArr, lang, cachedFetch }) {
  const s = STRINGS[lang];
  const [slotA, setSlotA] = useState(null);
  const [slotB, setSlotB] = useState(null);
  const [picking, setPicking] = useState(null); // "A" | "B" | null

  const allWithMeta = useMemo(() => {
    return allList.map(p => {
      const id = parseInt(p.url.split("/").filter(Boolean).pop(), 10);
      return { name: p.name, url: p.url, id };
    }).filter(p => p.id && p.id <= 1025);
  }, [allList]);

  const handlePick = useCallback(async (entry) => {
    const full = await cachedFetch(entry.url);
    if (picking === "A") setSlotA(full);
    else if (picking === "B") setSlotB(full);
    setPicking(null);
  }, [picking, cachedFetch]);

  // Comparison analysis (only when both selected)
  const analysis = useMemo(() => {
    if (!slotA || !slotB) return null;

    // Stat comparison
    const statKeys = ["hp", "attack", "defense", "special-attack", "special-defense", "speed"];
    const stats = statKeys.map(k => {
      const aStat = slotA.stats.find(st => st.stat.name === k)?.base_stat ?? 0;
      const bStat = slotB.stats.find(st => st.stat.name === k)?.base_stat ?? 0;
      return {
        key: k,
        label: STAT_LABELS[k],
        a: aStat, b: bStat,
        winner: aStat > bStat ? "A" : bStat > aStat ? "B" : null,
      };
    });
    const totalA = stats.reduce((s, st) => s + st.a, 0);
    const totalB = stats.reduce((s, st) => s + st.b, 0);

    // Physical
    const heightWinner = slotA.height > slotB.height ? "A" : slotB.height > slotA.height ? "B" : null;
    const weightWinner = slotA.weight > slotB.weight ? "A" : slotB.weight > slotA.weight ? "B" : null;
    const speedA = stats.find(s => s.key === "speed").a;
    const speedB = stats.find(s => s.key === "speed").b;
    const speedWinner = speedA > speedB ? "A" : speedB > speedA ? "B" : null;

    // Type advantage — A attacking B and vice versa
    const matchupsA = calcDefMatchups(slotA.types); // A's defensive matchups
    const matchupsB = calcDefMatchups(slotB.types);

    // What B's types do to A
    const bAttackA = slotB.types.reduce((max, t) => {
      const mu = matchupsA.find(m => m.type === t.type.name);
      return Math.max(max, mu?.mult ?? 1);
    }, 1);
    // What A's types do to B
    const aAttackB = slotA.types.reduce((max, t) => {
      const mu = matchupsB.find(m => m.type === t.type.name);
      return Math.max(max, mu?.mult ?? 1);
    }, 1);

    let typeWinner = null;
    if (aAttackB > bAttackA) typeWinner = "A";
    else if (bAttackA > aAttackB) typeWinner = "B";

    // Overall winner score
    const scoreA =
      (totalA > totalB ? 1 : 0) +
      (speedWinner === "A" ? 1 : 0) +
      (typeWinner === "A" ? 2 : 0);
    const scoreB =
      (totalB > totalA ? 1 : 0) +
      (speedWinner === "B" ? 1 : 0) +
      (typeWinner === "B" ? 2 : 0);
    const overall = scoreA > scoreB ? "A" : scoreB > scoreA ? "B" : "tie";

    return {
      stats, totalA, totalB,
      heightWinner, weightWinner, speedWinner, typeWinner,
      aAttackB, bAttackA, overall,
    };
  }, [slotA, slotB]);

  const colorA = slotA ? typeColor(slotA.types[0]?.type.name) : "#900603";
  const colorB = slotB ? typeColor(slotB.types[0]?.type.name) : "#f59e0b";

  return (
    <main className="grid-wrap compare-page" style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 20px" }}>
      <style>{`
        @keyframes cmp-float { 0%,100%{transform:translateY(0) rotate(0)} 50%{transform:translateY(-8px) rotate(3deg)} }
        .compare-page .compare-hero {
          background: linear-gradient(135deg, #ea580c 0%, #dc2626 50%, #be185d 100%) !important;
          color: white !important;
          padding: 22px 24px !important;
          border-radius: 22px !important;
          margin-bottom: 22px !important;
          position: relative !important;
          overflow: hidden !important;
          box-shadow: 0 20px 50px rgba(220, 38, 38, 0.3), 0 0 0 1px rgba(255,255,255,0.08) inset !important;
        }
        .compare-page .compare-hero h1 {
          font-size: 26px !important; font-weight: 900 !important;
          margin: 0 0 4px 0 !important; letter-spacing: -0.02em !important;
          background: linear-gradient(135deg, #fff, #fed7aa) !important;
          -webkit-background-clip: text !important; background-clip: text !important;
          -webkit-text-fill-color: transparent !important; color: transparent !important;
        }
        .compare-page .compare-hero p {
          font-size: 12px !important; color: rgba(254, 215, 170, 0.85) !important;
          font-weight: 600 !important; margin: 0 !important;
        }
      `}</style>
      <div className="compare-hero">
        <div style={{ position: "absolute", top: 16, right: 24, fontSize: 48, opacity: 0.18,
                      animation: "cmp-float 4s ease-in-out infinite", pointerEvents: "none" }}>⚖️</div>
        <h1>⚖️ {s.compareTitle}</h1>
        <p>{s.compareSub}</p>
      </div>

      <div className="compare-wrap">
        <CompareSlot
          pokemon={slotA} lang={lang} thaiArr={thaiArr} jpArr={jpArr} slot="A"
          onSelect={() => setPicking("A")}
          onRemove={() => setSlotA(null)}
        />
        <div className="compare-vs">VS</div>
        <CompareSlot
          pokemon={slotB} lang={lang} thaiArr={thaiArr} jpArr={jpArr} slot="B"
          onSelect={() => setPicking("B")}
          onRemove={() => setSlotB(null)}
        />
      </div>

      {analysis && (
        <div className="compare-analysis">
          {/* Stats comparison */}
          <div className="compare-section">
            <div className="modal-section-title">📊 {s.baseStats}</div>
            <div className="compare-stats">
              {analysis.stats.map(st => {
                const totalMax = Math.max(st.a, st.b, 1);
                return (
                  <div key={st.key} className="compare-stat-row">
                    <div className="compare-stat-val" style={{
                      color: statColor(st.a),
                      fontWeight: st.winner === "A" ? 900 : 600,
                    }}>
                      {st.a}
                    </div>
                    <div className="compare-stat-bars">
                      <div className="compare-stat-bar compare-stat-bar-a">
                        <div className="compare-stat-fill" style={{
                          width: `${(st.a / totalMax) * 100}%`,
                          background: colorA,
                          marginLeft: "auto",
                        }} />
                      </div>
                      <div className="compare-stat-label">{st.label}</div>
                      <div className="compare-stat-bar compare-stat-bar-b">
                        <div className="compare-stat-fill" style={{
                          width: `${(st.b / totalMax) * 100}%`,
                          background: colorB,
                        }} />
                      </div>
                    </div>
                    <div className="compare-stat-val" style={{
                      color: statColor(st.b),
                      fontWeight: st.winner === "B" ? 900 : 600,
                    }}>
                      {st.b}
                    </div>
                    <div className="compare-stat-arrow">
                      {st.winner === "A" ? <span style={{ color: colorA }}>◀</span>
                       : st.winner === "B" ? <span style={{ color: colorB }}>▶</span>
                       : <span style={{ opacity: 0.3 }}>=</span>}
                    </div>
                  </div>
                );
              })}
              <div className="compare-total-row">
                <div className="compare-total-val" style={{
                  color: analysis.totalA > analysis.totalB ? "#16a34a" : "var(--text-primary)",
                  fontWeight: analysis.totalA > analysis.totalB ? 900 : 700,
                }}>
                  {analysis.totalA}
                </div>
                <div className="compare-total-label">{s.total}</div>
                <div className="compare-total-val" style={{
                  color: analysis.totalB > analysis.totalA ? "#16a34a" : "var(--text-primary)",
                  fontWeight: analysis.totalB > analysis.totalA ? 900 : 700,
                }}>
                  {analysis.totalB}
                </div>
              </div>
            </div>
          </div>

          {/* Physical comparison */}
          <div className="compare-section">
            <div className="modal-section-title">📏 {s.bigger} / {s.heavier} / {s.faster}</div>
            <div className="compare-physical">
              <div className="compare-phys-row">
                <div className="compare-phys-val">{(slotA.height / 10).toFixed(1)} m</div>
                <div className="compare-phys-mid">
                  <span className="compare-phys-label">{s.height}</span>
                  <span className="compare-phys-winner">
                    {analysis.heightWinner === "A" && <span style={{ color: colorA }}>◀</span>}
                    {analysis.heightWinner === "B" && <span style={{ color: colorB }}>▶</span>}
                  </span>
                </div>
                <div className="compare-phys-val">{(slotB.height / 10).toFixed(1)} m</div>
              </div>
              <div className="compare-phys-row">
                <div className="compare-phys-val">{(slotA.weight / 10).toFixed(1)} kg</div>
                <div className="compare-phys-mid">
                  <span className="compare-phys-label">{s.weight}</span>
                  <span className="compare-phys-winner">
                    {analysis.weightWinner === "A" && <span style={{ color: colorA }}>◀</span>}
                    {analysis.weightWinner === "B" && <span style={{ color: colorB }}>▶</span>}
                  </span>
                </div>
                <div className="compare-phys-val">{(slotB.weight / 10).toFixed(1)} kg</div>
              </div>
            </div>
          </div>

          {/* Type advantage */}
          <div className="compare-section">
            <div className="modal-section-title">🛡️ {s.typeAdvantage}</div>
            <div className="compare-type-advantage">
              <div className="compare-ta-row">
                <span className="compare-ta-label">A → B</span>
                <span className="compare-ta-mult" style={{
                  color: analysis.aAttackB >= 2 ? "#dc2626" : analysis.aAttackB <= 0.5 ? "#16a34a" : "#64748b",
                }}>
                  ×{analysis.aAttackB}
                </span>
              </div>
              <div className="compare-ta-row">
                <span className="compare-ta-label">B → A</span>
                <span className="compare-ta-mult" style={{
                  color: analysis.bAttackA >= 2 ? "#dc2626" : analysis.bAttackA <= 0.5 ? "#16a34a" : "#64748b",
                }}>
                  ×{analysis.bAttackA}
                </span>
              </div>
            </div>
          </div>

          {/* Winner banner */}
          <div className="compare-winner-banner">
            <div className="compare-winner-trophy">🏆</div>
            <div className="compare-winner-text">
              {analysis.overall === "tie" ? (
                <><strong>{s.tie}</strong></>
              ) : (
                <>
                  <strong style={{ color: analysis.overall === "A" ? colorA : colorB }}>
                    {getLocalName(analysis.overall === "A" ? slotA.id : slotB.id, lang, thaiArr, jpArr) ??
                     (analysis.overall === "A" ? slotA.name : slotB.name)}
                  </strong>
                  <span style={{ marginLeft: 8 }}>{s.winner}!</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {picking && (
        <CompareSlotPicker
          allWithMeta={allWithMeta} thaiArr={thaiArr} jpArr={jpArr} lang={lang}
          slot={picking}
          onPick={handlePick}
          onClose={() => setPicking(null)}
        />
      )}
    </main>
  );
}