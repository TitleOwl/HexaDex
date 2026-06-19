import { useState, useEffect, useRef, useMemo } from "react";
import { useModalLifecycle } from "../perfUtils.js";
import {
  STRINGS, TYPE_NAMES_TH, TYPE_NAMES_JA, STAT_LABELS,
} from "../data.js";
import {
  typeColor, padId, getArt, getLocalName, statColor,
  calcDefMatchups, flattenEvo, buildEvoTree, playCry, playTypeSound,
  getCryStyle, setCryStyle,
} from "../utils.js";
import Pokemon3DViewer  from "./Pokemon3DViewer.jsx";
import TypeAmbiance     from "./TypeAmbiance.jsx";
import CatchAnimation   from "./CatchAnimation.jsx";
import MoveLearnset     from "./MoveLearnset.jsx";
import LocationsSection from "./LocationsSection.jsx";
import SpriteTimeline   from "./SpriteTimeline.jsx";
import GoMovesSection   from "./GoMovesSection.jsx";
import {
  List, Sparkles, Layers, Volume2, Heart, X,
  BarChart3, Shield, Zap, Sprout, Swords, Smartphone, Images, Egg, MapPin,
} from "lucide-react";

// Icon per detail tab (order matches STRINGS.tabs)
const TAB_ICONS = [BarChart3, Shield, Zap, Sprout, Swords, Smartphone, Images, Egg, MapPin];

// ─── Stat Radar Chart ─────────────────────────────────────────────────────────
// ─── Horizontal Stat Bars — modern stat visualization ──────
function StatBars({ stats }) {
  const STAT_INFO = {
    "hp":              { label: "HP",   color: "#ef4444", glow: "rgba(239,68,68,0.35)"   },
    "attack":          { label: "ATK",  color: "#f97316", glow: "rgba(249,115,22,0.35)"  },
    "defense":         { label: "DEF",  color: "#eab308", glow: "rgba(234,179,8,0.35)"   },
    "special-attack":  { label: "SP.A", color: "#06b6d4", glow: "rgba(6,182,212,0.35)"   },
    "special-defense": { label: "SP.D", color: "#22c55e", glow: "rgba(34,197,94,0.35)"   },
    "speed":           { label: "SPD",  color: "#ec4899", glow: "rgba(236,72,153,0.35)"  },
  };
  const MAX = 200; // visual scale max (real max is 255 but most stats are <200)
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 6 }}>
      {stats.map(s => {
        const info = STAT_INFO[s.stat.name] ?? { label: s.stat.name, color: "#9c988e", glow: "rgba(148,163,184,0.3)" };
        const pct = Math.min(100, (s.base_stat / MAX) * 100);
        return (
          <div key={s.stat.name} style={{
            display: "grid",
            gridTemplateColumns: "56px 40px 1fr",
            alignItems: "center",
            gap: 14,
          }}>
            <div style={{
              fontSize: 10.5,
              fontWeight: 600,
              color: "var(--stat-lbl, #a89e8c)",
              letterSpacing: 2,
              textTransform: "uppercase",
            }}>
              {info.label}
            </div>
            <div style={{
              fontSize: 15,
              fontWeight: 400,
              color: "var(--stat-num, #3a352e)",
              textAlign: "right",
              fontVariantNumeric: "tabular-nums",
            }}>
              {s.base_stat}
            </div>
            <div style={{
              position: "relative",
              height: 4,
              background: "var(--stat-track, #ddd3c2)",
              borderRadius: 999,
              overflow: "hidden",
            }}>
              <div style={{
                position: "absolute",
                left: 0, top: 0, bottom: 0,
                width: `${pct}%`,
                background: "var(--stat-num, #3a352e)",
                borderRadius: 999,
                transition: "width 0.7s cubic-bezier(0.4, 0, 0.2, 1)",
              }} />
            </div>
          </div>
        );
      })}
      <style>{`
        :root { --stat-num: #3a352e; --stat-track: #ddd3c2; --stat-lbl: #a89e8c; }
        [data-theme="dark"] { --stat-num: #e7e1d6; --stat-track: #38332c; --stat-lbl: #8a8170; }
      `}</style>
    </div>
  );
}

// ─── Tab dropdown — replaces the cramped tab row (handles long TH labels) ──
function TabDropdown({ tabs, tab, setTab, lang }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const heading = lang === "th" ? "รายละเอียด" : lang === "ja" ? "詳細" : "Detail";
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);
  return (
    <div className={`tabdd${open ? " open" : ""}`} ref={ref}>
      <button className="tabdd-trigger" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span className="tabdd-current">
          {tab >= 0 && TAB_ICONS[tab]
            ? (() => { const I = TAB_ICONS[tab]; return <><I size={16} strokeWidth={2.2} />{tabs[tab]}</>; })()
            : <><List size={16} strokeWidth={2.2} />{heading}</>}
        </span>
        <span className="tabdd-chev">▾</span>
      </button>
      {open && (
        <div className="tabdd-menu">
          {tabs.map((label, i) => {
            const I = TAB_ICONS[i] ?? List;
            return (
              <button key={i} className={`tabdd-item${tab === i ? " active" : ""}`}
                onClick={() => { setTab(i); setOpen(false); }}>
                <span className="tabdd-item-label"><I size={15} strokeWidth={2.2} />{label}</span>
                {tab === i && <span className="tabdd-check">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatsRadar({ stats, color }) {
  const labels = ["HP","ATK","DEF","SP.A","SP.D","SPD"];
  const order = ["hp","attack","defense","special-attack","special-defense","speed"];
  const values = order.map(k => stats.find(s => s.stat.name === k)?.base_stat ?? 0);
  const max = 180;
  const cx = 110, cy = 110, R = 80;

  // Compute points
  const points = values.map((v, i) => {
    const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
    const r = (Math.min(v, max) / max) * R;
    return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
  });
  const polygon = points.map(p => p.join(",")).join(" ");

  // Hex grid lines (background)
  const hexLines = [0.25, 0.5, 0.75, 1].map(ratio => {
    const pts = Array.from({ length: 6 }, (_, i) => {
      const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
      return [cx + Math.cos(angle) * R * ratio, cy + Math.sin(angle) * R * ratio];
    });
    return pts.map(p => p.join(",")).join(" ");
  });

  return (
    <div className="stats-radar-wrap">
      <svg viewBox="0 0 220 220" className="stats-radar-svg">
        {/* Hex grid */}
        {hexLines.map((pts, i) => (
          <polygon key={i} points={pts} fill="none" stroke="rgba(144,6,3,0.15)" strokeWidth="1" />
        ))}
        {/* Axes */}
        {Array.from({ length: 6 }).map((_, i) => {
          const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
          return <line key={i} x1={cx} y1={cy}
            x2={cx + Math.cos(angle) * R} y2={cy + Math.sin(angle) * R}
            stroke="rgba(144,6,3,0.15)" strokeWidth="1" />;
        })}
        {/* Data polygon */}
        <polygon points={polygon} fill={`${color}55`} stroke={color} strokeWidth="2.5" />
        {points.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r="4" fill={color} stroke="#fff" strokeWidth="2" />
        ))}
        {/* Labels */}
        {labels.map((lbl, i) => {
          const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
          const lblR = R + 18;
          const x = cx + Math.cos(angle) * lblR;
          const y = cy + Math.sin(angle) * lblR;
          return (
            <g key={lbl}>
              <text x={x} y={y - 5} textAnchor="middle"
                style={{ fontSize: 10, fontWeight: 800, fill: "#7fa8c4", letterSpacing: 0.5 }}>
                {lbl}
              </text>
              <text x={x} y={y + 7} textAnchor="middle"
                style={{ fontSize: 11, fontWeight: 900, fill: statColor(values[i]) }}>
                {values[i]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Type Matchup ─────────────────────────────────────────────────────────────
function TypeMatchup({ types, lang, s }) {
  const matchups = calcDefMatchups(types);
  const groups = {
    immune:  matchups.filter(m => m.mult === 0),
    quarter: matchups.filter(m => m.mult === 0.25),
    half:    matchups.filter(m => m.mult === 0.5),
    double:  matchups.filter(m => m.mult === 2),
    quad:    matchups.filter(m => m.mult === 4),
  };

  return (
    <div className="matchup-section">
      {[
        { key:"immune",  label:`${s.immune} (0×)`, tc:"#374151" },
        { key:"quarter", label:"¼×", tc:"#14532d" },
        { key:"half",    label:`${s.resist} (½×)`, tc:"#166534" },
        { key:"double",  label:`${s.weak} (2×)`, tc:"#9a3412" },
        { key:"quad",    label:"4×", tc:"#991b1b" },
      ].map(({ key, label, tc }) => groups[key].length === 0 ? null : (
        <div key={key} className="matchup-group">
          <div className="matchup-group-label" style={{ color:tc }}>{label}</div>
          <div className="matchup-pills">
            {groups[key].map(m => {
              const tn = m.type;
              const name = lang === "th" ? (TYPE_NAMES_TH[tn]??tn)
                         : lang === "ja" ? (TYPE_NAMES_JA[tn]??tn) : tn;
              return (
                <span key={tn} className="matchup-pill"
                  style={{ background:typeColor(tn), boxShadow:`0 2px 8px ${typeColor(tn)}55` }}>
                  {name}
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Breeding ────────────────────────────────────────────────────────────────
function BreedingSection({ species, pokemon, s }) {
  if (!species) return <div className="evo-loading">{s.evoLoading}</div>;
  const genderRate = species.gender_rate;
  const femaleChance = genderRate === -1 ? null : Math.round((genderRate / 8) * 100);
  const hatchSteps = species.hatch_counter ? (species.hatch_counter + 1) * 255 : null;
  const evYield = pokemon.stats.filter(st => st.effort > 0);

  return (
    <div className="breeding-section">
      {evYield.length > 0 && (
        <div className="breed-block">
          <div className="modal-section-title">{s.evYield}</div>
          <div className="ev-yield-row">
            {evYield.map(st => (
              <div key={st.stat.name} className="ev-chip">
                <span className="ev-chip-val">+{st.effort}</span>
                <span className="ev-chip-stat">{STAT_LABELS[st.stat.name]??st.stat.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="breed-block">
        <div className="modal-section-title">{s.eggGroups}</div>
        <div className="abilities-grid">
          {species.egg_groups?.map(g => (
            <span key={g.name} className="ability-chip">{g.name.replace(/-/g," ")}</span>
          ))}
        </div>
      </div>
      <div className="breed-block">
        <div className="modal-section-title">{s.genderRatio}</div>
        {genderRate === -1 ? (
          <span className="ability-chip">{s.genderless}</span>
        ) : (
          <div className="gender-bar">
            {femaleChance < 100 && (
              <div className="gender-male" style={{ width:`${100-femaleChance}%` }}>
                {s.male} {100-femaleChance}%
              </div>
            )}
            {femaleChance > 0 && (
              <div className="gender-female" style={{ width:`${femaleChance}%` }}>
                {s.female2} {femaleChance}%
              </div>
            )}
          </div>
        )}
      </div>
      {hatchSteps && (
        <div className="breed-block">
          <div className="modal-section-title">{s.hatchTime}</div>
          <div className="breed-info-row">
            <span className="info-pill" style={{ display:"inline-block", padding:"10px 18px" }}>
              <div className="info-pill-label">{s.hatchTime}</div>
              <div className="info-pill-val">{hatchSteps.toLocaleString()} {s.steps}</div>
            </span>
            <span className="info-pill" style={{ display:"inline-block", padding:"10px 18px" }}>
              <div className="info-pill-label">{s.captureRate}</div>
              <div className="info-pill-val">{species.capture_rate}</div>
            </span>
            <span className="info-pill" style={{ display:"inline-block", padding:"10px 18px" }}>
              <div className="info-pill-label">{s.happiness}</div>
              <div className="info-pill-val">{species.base_happiness ?? "—"}</div>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Cry Style Picker ─────────────────────────────────────────────────────────
const CRY_STYLES = [
  { id: "anime",   label: "Anime"  },
  { id: "game",    label: "Game"   },
  { id: "classic", label: "8-bit"  },
];

function CryStylePicker({ lang }) {
  const [style, setStyle] = useState(getCryStyle);
  const [open, setOpen]   = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const pick = (id) => { setCryStyle(id); setStyle(id); setOpen(false); };
  const current = CRY_STYLES.find(s => s.id === style) ?? CRY_STYLES[0];
  const cryLabel = lang === "th" ? "เสียงร้อง" : lang === "ja" ? "鳴き声" : "Cry";

  return (
    <div className="cry-picker-wrap" ref={ref} onClick={e => e.stopPropagation()}>
      <button className={`cry-picker-btn${open ? " open" : ""}`} onClick={() => setOpen(o => !o)}>
        <span className="cry-picker-label-text">{cryLabel}</span>
        <span className="cry-picker-divider" />
        <strong className="cry-picker-value">{current.label}</strong>
        <span className={`cry-picker-arrow${open ? " flipped" : ""}`}>▾</span>
      </button>
      {open && (
        <div className="cry-picker-menu">
          {CRY_STYLES.map(s => (
            <button
              key={s.id}
              className={`cry-picker-item${style === s.id ? " active" : ""}`}
              onClick={() => pick(s.id)}>
              <span>{s.label}</span>
              {style === s.id && <span className="cry-picker-check">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Evolution Tree (branching support for Eevee, Slowpoke, etc.) ─────────────
function EvoNode({ node, currentId, evoImgs, lang, thaiArr, jpArr, color, onNavigate }) {
  const local = getLocalName(node.id, lang, thaiArr, jpArr);
  const name = local ?? node.name;
  const isCurrent = node.id === currentId;
  const nav = () => { if (!isCurrent) fetch(`https://pokeapi.co/api/v2/pokemon/${node.id}`).then(r => r.json()).then(onNavigate); };
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
      <div
        className={`evo-node${isCurrent ? " current" : ""}`}
        style={isCurrent ? { borderColor: color } : {}}
        onClick={nav}
      >
        {evoImgs[node.id]
          ? <img src={evoImgs[node.id]} alt={name} className="evo-img" loading="lazy" />
          : <div className="skeleton-pulse" style={{ width: 78, height: 78, borderRadius: "50%" }} />
        }
        <div className="evo-name">{name}</div>
        {lang !== "en" && local && <div className="evo-name-en">{node.name}</div>}
        {node.minLevel && <div style={{ fontSize: 9, opacity: 0.6, marginTop: 2 }}>Lv.{node.minLevel}</div>}
      </div>
    </div>
  );
}

function EvoTree({ node, currentId, evoImgs, lang, thaiArr, jpArr, color, onNavigate }) {
  if (!node) return null;
  const hasBranch = node.children.length > 1;
  const isSingle = node.children.length === 1;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, width: "100%" }}>
      {/* Current node row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
        <EvoNode node={node} currentId={currentId} evoImgs={evoImgs} lang={lang} thaiArr={thaiArr} jpArr={jpArr} color={color} onNavigate={onNavigate} />
        {isSingle && (
          <>
            <div className="evo-arrow">→</div>
            <EvoTree node={node.children[0]} currentId={currentId} evoImgs={evoImgs} lang={lang} thaiArr={thaiArr} jpArr={jpArr} color={color} onNavigate={onNavigate} />
          </>
        )}
      </div>
      {hasBranch && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap", justifyContent: "center", marginTop: 6 }}>
          {node.children.map(child => (
            <div key={child.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div className="evo-arrow">→</div>
              <EvoTree node={child} currentId={currentId} evoImgs={evoImgs} lang={lang} thaiArr={thaiArr} jpArr={jpArr} color={color} onNavigate={onNavigate} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export default function PokemonModal({
  pokemon, onClose, onNavigate, lang, thaiArr, jpArr,
  speciesCache, evoCache, moveCache,
  onPlayCry, onOpenCardMode,
  isFav = false, onFav,
}) {
  const [tab, setTab]         = useState(-1); // -1 = nothing shown until a section is picked
  const [species, setSpecies] = useState(null);
  const [evo, setEvo]         = useState(null);
  const [evoImgs, setEvoImgs] = useState({});
  const [view3d,  setView3d]  = useState(false);
  const [isShiny, setIsShiny] = useState(false);
  const [catchOpen, setCatchOpen] = useState(false);
  useModalLifecycle(onClose);

  useEffect(() => { setTab(-1); }, [pokemon.id]); // start collapsed — nothing shown until "Detail" is opened

  useEffect(() => {
    const t = pokemon.types[0]?.type.name ?? "normal";
    const timer = setTimeout(() => playTypeSound(t), 200);
    return () => clearTimeout(timer);
  }, [pokemon.id]);

  const s        = STRINGS[lang];
  const mainType = pokemon.types[0]?.type.name ?? "normal";
  const color    = typeColor(mainType);
  const img      = getArt(pokemon);
  const total    = pokemon.stats.reduce((a, st) => a + st.base_stat, 0);
  const localName = getLocalName(pokemon.id, lang, thaiArr, jpArr);
  const heroName  = localName ?? pokemon.name;

  // Shiny artwork URL for 2D mode
  const shinyArt = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/${pokemon.id}.png`;
  const displayImg = isShiny ? shinyArt : img;

  useEffect(() => {
    setSpecies(null); setEvo(null); setEvoImgs({});
    const hit = speciesCache.current.get(pokemon.id);
    if (hit) { setSpecies(hit.species); setEvo(hit.chain); setEvoImgs(hit.evoImgs); return; }

    fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokemon.id}`)
      .then(r => r.json())
      .then(async data => {
        setSpecies(data);
        let chain = evoCache.current.get(data.evolution_chain.url);
        if (!chain) {
          const ev = await fetch(data.evolution_chain.url).then(r => r.json());
          chain = buildEvoTree(ev.chain);
          evoCache.current.set(data.evolution_chain.url, chain);
        }
        setEvo(chain);
        // Collect all ids from tree
        const collectIds = (node) => [node.id, ...node.children.flatMap(collectIds)];
        const allIds = collectIds(chain);
        const imgs = {};
        await Promise.allSettled(allIds.map(async id => {
          const d = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`).then(r => r.json());
          imgs[id] = getArt(d);
        }));
        setEvoImgs(imgs);
        speciesCache.current.set(pokemon.id, { species:data, chain, evoImgs:imgs });
      });
  }, [pokemon.id, speciesCache, evoCache]);

  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const flavor = species?.flavor_text_entries?.find(f =>
    f.language.name === (lang === "th" ? "th" : lang === "ja" ? "ja" : "en")
  )?.flavor_text?.replace(/\f/g," ") ??
    species?.flavor_text_entries?.find(f => f.language.name === "en")?.flavor_text?.replace(/\f/g," ");

  const genus = species?.genera?.find(g =>
    g.language.name === (lang === "th" ? "th" : lang === "ja" ? "ja" : "en")
  )?.genus ?? species?.genera?.find(g => g.language.name === "en")?.genus;

  const playCryTracked = (id) => {
    playCry(id, 0.4, pokemon.name);
    onPlayCry?.();
  };

  const typeName = (tn) =>
    lang === "th" ? (TYPE_NAMES_TH[tn]??tn) : lang === "ja" ? (TYPE_NAMES_JA[tn]??tn) : tn;

  return (
    <div className="modal-overlay" onClick={onClose}>
      {/* ─── Modal Redesign v3 — scoped style overrides ─── */}
      <style>{`
        /* lucide icons — align inline, centre in icon buttons */
        .modal-overlay .modal-name svg,
        .modal-overlay .hero-shiny-badge svg,
        .modal-overlay .modal-name-cry svg { vertical-align: middle; }
        .modal-overlay .modal-close,
        .modal-overlay .hero-shiny-btn,
        .modal-overlay .hero-card-btn,
        .modal-overlay .modal-fav-btn { display: inline-flex; align-items: center; justify-content: center; }
        .modal-overlay .modal-fav-icon { display: inline-flex; }
        /* Tabs — modern pill design */
        .modal-overlay .modal-tabs {
          display: flex !important;
          flex-wrap: wrap;
          gap: 6px;
          padding: 10px 0 14px;
          margin-bottom: 8px;
          border-bottom: 1px solid #e5e0d5;
        }
        .modal-overlay .modal-tab {
          padding: 7px 14px !important;
          border-radius: 999px !important;
          background: #efece4 !important;
          border: 1.5px solid transparent !important;
          color: #62605a !important;
          font-size: 12px !important;
          font-weight: 700 !important;
          cursor: pointer;
          transition: all 0.2s;
          letter-spacing: 0.2px;
        }
        .modal-overlay .modal-tab:hover {
          background: #e5e0d5 !important;
          transform: translateY(-1px);
        }
        .modal-overlay .modal-tab.active {
          background: linear-gradient(135deg, #900603 0%, #6e0402 100%) !important;
          color: white !important;
          box-shadow: 0 4px 14px rgba(144,6,3,0.4);
          border-color: transparent !important;
        }

        /* Section titles — accent bar + bold */
        .modal-overlay .modal-section-title {
          font-size: 14px !important;
          font-weight: 800 !important;
          color: #1f1d20 !important;
          letter-spacing: 0.6px;
          text-transform: uppercase;
          position: relative;
          padding-left: 14px;
          margin: 20px 0 14px !important;
          line-height: 1.2;
        }
        .modal-overlay .modal-section-title::before {
          content: "";
          position: absolute;
          left: 0;
          top: 2px;
          bottom: 2px;
          width: 4px;
          background: linear-gradient(180deg, #900603, #6e0402);
          border-radius: 2px;
        }

        /* Stat total — big colored banner */
        .modal-overlay .stat-total-row {
          display: flex !important;
          justify-content: space-between;
          align-items: center;
          padding: 14px 20px !important;
          background: linear-gradient(135deg, #900603 0%, #6e0402 100%) !important;
          color: white !important;
          border-radius: 16px !important;
          margin-top: 14px;
          box-shadow: 0 6px 22px rgba(144,6,3,0.4);
        }
        .modal-overlay .stat-total-label {
          font-size: 14px !important;
          font-weight: 800 !important;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        .modal-overlay .stat-total-val {
          font-size: 24px !important;
          font-weight: 900 !important;
          color: white !important;
        }

        /* Type tags */
        .modal-overlay .modal-type-tag {
          padding: 6px 14px !important;
          font-size: 11px !important;
          font-weight: 800 !important;
          border-radius: 999px !important;
          letter-spacing: 1px;
          text-transform: uppercase;
          box-shadow: 0 2px 10px rgba(0,0,0,0.18);
        }

        /* Abilities — card style */
        .modal-overlay .abilities-grid {
          display: grid !important;
          grid-template-columns: 1fr !important;
          gap: 10px !important;
          margin-top: 6px;
        }
        .modal-overlay .ability-chip {
          padding: 14px 18px !important;
          background: white !important;
          border: 2px solid #e5e0d5 !important;
          border-radius: 14px !important;
          font-weight: 700 !important;
          color: #1f1d20 !important;
          text-transform: capitalize;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          font-size: 14px !important;
          position: relative;
          transition: all 0.2s;
        }
        .modal-overlay .ability-chip:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(0,0,0,0.08);
        }
        .modal-overlay .ability-chip.hidden-ability {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%) !important;
          border-color: #fbbf24 !important;
        }
        .modal-overlay .hidden-label {
          display: inline-block;
          margin-left: 10px;
          padding: 3px 10px;
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: white !important;
          border-radius: 999px;
          font-size: 10px;
          letter-spacing: 0.5px;
          font-weight: 800;
          text-transform: uppercase;
        }

        /* Evolution chain — softer cards */
        .modal-overlay .evo-chain {
          display: flex !important;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
          gap: 12px !important;
          margin-top: 14px;
          padding: 8px;
        }
        .modal-overlay .evo-node {
          background: white !important;
          border: 2px solid #e5e0d5 !important;
          border-radius: 16px !important;
          padding: 14px !important;
          cursor: pointer;
          transition: all 0.25s;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          min-width: 110px;
        }
        .modal-overlay .evo-node:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 22px rgba(0,0,0,0.12);
        }
        .modal-overlay .evo-node.current {
          background: linear-gradient(180deg, #eff6ff 0%, #ffffff 100%) !important;
          border-width: 3px !important;
          box-shadow: 0 8px 26px rgba(144,6,3,0.35) !important;
          transform: scale(1.05);
        }
        .modal-overlay .evo-arrow {
          color: #9c988e !important;
          font-size: 22px !important;
          font-weight: 800;
        }

        /* Info cards (height/weight/EXP) */
        .modal-overlay .info-cards-row {
          display: flex;
          gap: 10px;
          margin-top: 8px;
        }
        .modal-overlay .info-card {
          flex: 1;
          padding: 12px !important;
          background: white !important;
          border: 1.5px solid #e5e0d5 !important;
          border-radius: 12px !important;
          text-align: center;
          box-shadow: 0 2px 6px rgba(0,0,0,0.04);
        }
        .modal-overlay .info-card-label {
          font-size: 10px !important;
          color: #7a766e !important;
          font-weight: 800 !important;
          letter-spacing: 1.2px;
          text-transform: uppercase;
        }
        .modal-overlay .info-card-value {
          font-size: 18px !important;
          font-weight: 900 !important;
          color: #1f1d20 !important;
          margin-top: 4px;
        }

        /* Dex entry / flavor text */
        .modal-overlay .modal-flavor {
          background: linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%) !important;
          padding: 14px 18px !important;
          border-radius: 14px !important;
          border-left: 4px solid #900603 !important;
          font-style: italic !important;
          color: #62605a !important;
          font-size: 13px !important;
          margin-top: 10px;
          line-height: 1.6 !important;
        }

        /* Sprites grid */
        .modal-overlay .sprite-grid {
          display: grid !important;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)) !important;
          gap: 12px !important;
          margin-top: 6px;
        }
        .modal-overlay .sprite-cell {
          background: white !important;
          border: 2px solid #e5e0d5 !important;
          border-radius: 14px !important;
          padding: 14px 8px 10px !important;
          text-align: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          transition: all 0.2s;
        }
        .modal-overlay .sprite-cell:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.1);
        }
        .modal-overlay .sprite-label {
          display: block;
          margin-top: 6px;
          font-size: 10px;
          color: #7a766e;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        /* Dark mode adjustments */
        [data-theme="dark"] .modal-overlay .ability-chip,
        [data-theme="dark"] .modal-overlay .evo-node,
        [data-theme="dark"] .modal-overlay .info-card,
        [data-theme="dark"] .modal-overlay .sprite-cell {
          background: #1f1d20 !important;
          border-color: #2c2926 !important;
          color: #efece4 !important;
        }
        [data-theme="dark"] .modal-overlay .modal-section-title {
          color: #efece4 !important;
        }
        [data-theme="dark"] .modal-overlay .modal-tab {
          background: #2c2926 !important;
          color: #d4cdbe !important;
        }
        [data-theme="dark"] .modal-overlay .info-card-value {
          color: #efece4 !important;
        }
        [data-theme="dark"] .modal-overlay .info-card-label {
          color: #9c988e !important;
        }
        [data-theme="dark"] .modal-overlay .modal-flavor {
          background: linear-gradient(135deg, #1f1d20 0%, #1a1816 100%) !important;
          color: #d4cdbe !important;
        }

        /* ─── Button + Tab polish (consistent w/ HexaDex pattern) ─── */
        .modal-overlay .modal-close {
          position: absolute !important;
          top: 14px !important; right: 14px !important;
          width: 36px !important; height: 36px !important;
          border-radius: 50% !important;
          background: rgba(15, 23, 42, 0.52) !important;
          border: 1.5px solid rgba(255,255,255,0.18) !important;
          color: rgba(255,255,255,0.72) !important;
          font-size: 14px !important; font-weight: 700 !important;
          cursor: pointer !important;
          backdrop-filter: blur(10px) !important;
          box-shadow: 0 2px 10px rgba(0,0,0,0.2) !important;
          transition: transform 0.22s cubic-bezier(.22,1,.36,1), background 0.18s, color 0.18s !important;
          z-index: 5 !important;
          display: flex !important; align-items: center !important; justify-content: center !important;
        }
        .modal-overlay .modal-close:hover {
          transform: scale(1.1) rotate(90deg) !important;
          background: rgba(30, 41, 59, 0.82) !important;
          color: #fff !important;
          box-shadow: 0 4px 18px rgba(0,0,0,0.28) !important;
        }

        .modal-overlay .hero-view-controls {
          position: absolute !important;
          top: 14px !important; left: 14px !important;
          display: flex !important; align-items: center !important; gap: 8px !important;
          z-index: 4 !important;
        }
        .modal-overlay .hero-shiny-btn,
        .modal-overlay .hero-card-btn {
          width: 38px !important; height: 38px !important;
          border-radius: 50% !important;
          background: rgba(255, 255, 255, 0.18) !important;
          backdrop-filter: blur(14px) !important;
          border: 2px solid rgba(255, 255, 255, 0.4) !important;
          color: white !important;
          font-size: 17px !important;
          cursor: pointer !important;
          transition: transform 0.2s, background 0.2s !important;
          display: flex !important; align-items: center !important; justify-content: center !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2) !important;
        }
        .modal-overlay .hero-shiny-btn:hover,
        .modal-overlay .hero-card-btn:hover {
          background: rgba(255, 255, 255, 0.3) !important;
          transform: scale(1.1) !important;
        }
        .modal-overlay .hero-shiny-btn.active {
          background: linear-gradient(135deg, #fbbf24, #f97316) !important;
          box-shadow: 0 0 16px rgba(251, 191, 36, 0.7) !important;
          border-color: rgba(255, 255, 255, 0.6) !important;
        }

        .modal-overlay .hero-view-toggle {
          display: inline-flex !important;
          background: rgba(255, 255, 255, 0.18) !important;
          backdrop-filter: blur(14px) !important;
          border: 2px solid rgba(255, 255, 255, 0.4) !important;
          border-radius: 999px !important;
          padding: 3px !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2) !important;
        }
        .modal-overlay .hv-btn {
          padding: 6px 12px !important;
          border-radius: 999px !important;
          background: transparent !important;
          color: rgba(255, 255, 255, 0.85) !important;
          border: none !important;
          font-size: 11px !important; font-weight: 800 !important;
          cursor: pointer !important;
          letter-spacing: 0.5px !important;
          transition: background 0.2s, color 0.2s !important;
        }
        .modal-overlay .hv-btn.active {
          background: white !important;
          color: #1f1d20 !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15) !important;
        }

        /* Tabs — modern pill design */
        .modal-overlay .modal-tabs {
          display: flex !important;
          gap: 4px !important;
          padding: 4px !important;
          background: var(--md-tabs-bg, #efece4) !important;
          border-radius: 14px !important;
          margin-bottom: 14px !important;
          overflow-x: auto !important;
          scrollbar-width: thin !important;
        }
        [data-theme="dark"] .modal-overlay .modal-tabs {
          --md-tabs-bg: #1f1d20 !important;
        }
        .modal-overlay .modal-tab {
          flex-shrink: 0 !important;
          padding: 8px 14px !important;
          border-radius: 11px !important;
          background: transparent !important;
          color: var(--md-tab-fg, #7a766e) !important;
          border: none !important;
          font-size: 12px !important; font-weight: 700 !important;
          cursor: pointer !important;
          transition: all 0.2s !important;
          white-space: nowrap !important;
        }
        [data-theme="dark"] .modal-overlay .modal-tab {
          --md-tab-fg: #9c988e !important;
        }
        .modal-overlay .modal-tab:hover {
          background: color-mix(in srgb, var(--blue) 8%, transparent) !important;
          color: var(--blue) !important;
        }
        .modal-overlay .modal-tab.active {
          background: linear-gradient(135deg, var(--blue), var(--blue-light)) !important;
          color: white !important;
          box-shadow: 0 4px 12px color-mix(in srgb, var(--blue) 38%, transparent) !important;
        }

        /* ─── Catch FAB — small Pokeball that expands on hover ─── */
        .modal-overlay .catch-fab {
          position: absolute !important;
          bottom: 16px !important;
          right: 16px !important;
          display: inline-flex !important;
          align-items: center !important;
          gap: 0 !important;
          padding: 6px !important;
          padding-right: 6px !important;
          height: 56px !important;
          width: 56px !important;
          border-radius: 999px !important;
          background: rgba(18, 18, 22, 0.42) !important;
          backdrop-filter: blur(16px) saturate(150%) !important;
          -webkit-backdrop-filter: blur(16px) saturate(150%) !important;
          border: 1px solid rgba(255, 255, 255, 0.22) !important;
          color: #fff !important;
          cursor: pointer !important;
          overflow: hidden !important;
          transition: width 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
                      padding 0.35s, transform 0.2s,
                      box-shadow 0.35s, background 0.25s !important;
          box-shadow: 0 8px 22px rgba(0, 0, 0, 0.28) !important;
          z-index: 4 !important;
          white-space: nowrap !important;
        }
        .modal-overlay .catch-fab:hover {
          width: 170px !important;
          padding-right: 18px !important;
          transform: scale(1.04) !important;
          background: rgba(30, 30, 36, 0.55) !important;
          box-shadow: 0 14px 32px rgba(0, 0, 0, 0.4) !important;
        }
        .modal-overlay .catch-fab-ball {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: 42px !important;
          height: 42px !important;
          border-radius: 50% !important;
          background: radial-gradient(circle, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.08) 60%, transparent 100%) !important;
          flex-shrink: 0 !important;
        }
        .modal-overlay .catch-fab-label {
          font-size: 13px !important;
          font-weight: 900 !important;
          letter-spacing: 0.5px !important;
          opacity: 0 !important;
          max-width: 0 !important;
          overflow: hidden !important;
          transition: opacity 0.25s 0.05s, max-width 0.35s, margin-left 0.35s !important;
          margin-left: 0 !important;
        }
        .modal-overlay .catch-fab:hover .catch-fab-label {
          opacity: 1 !important;
          max-width: 120px !important;
          margin-left: 6px !important;
        }
        /* Pulse animation when idle */
        .modal-overlay .catch-fab::before {
          content: "" !important;
          position: absolute !important;
          inset: -4px !important;
          border-radius: 999px !important;
          background: rgba(255, 255, 255, 0.28) !important;
          opacity: 0.5 !important;
          z-index: -1 !important;
          animation: catch-fab-pulse 2.2s ease-in-out infinite !important;
        }
        @keyframes catch-fab-pulse {
          0%, 100% { transform: scale(0.92); opacity: 0; }
          50%      { transform: scale(1.08); opacity: 0.5; }
        }
        .modal-overlay .catch-fab:hover::before { animation: none !important; opacity: 0 !important; }

        /* Mobile: ensure FAB doesn't get cut off */
        @media (max-width: 480px) {
          .modal-overlay .catch-fab { bottom: 12px !important; right: 12px !important; }
          .modal-overlay .catch-fab:hover { width: 150px !important; }
        }

        /* DEFENSIVE: hide any leftover old catch button (App.css frozen) */
        .modal-overlay .catch-try-it-cta,
        .modal-overlay .catch-try-below3d {
          display: none !important;
        }

        /* 3D-mode FAB variant: relative positioning (not absolute) */
        .modal-overlay .catch-fab-3d {
          position: relative !important;
          bottom: auto !important;
          right: auto !important;
          margin: 12px auto !important;
          display: flex !important;
        }
      `}</style>

      <div className="modal" onClick={(e) => e.stopPropagation()}>

        {/* Hero — themed background per type in 3D mode */}
        <div
          className={`modal-hero${view3d ? " hero-3d" : ""}`}
          style={view3d
            ? { background:`linear-gradient(180deg, ${color}59 0%, ${color}26 34%, #15121c 64%)` }
            : { backgroundImage:`linear-gradient(180deg, ${color}c2 0%, ${color}5c 40%, ${color}24 68%, transparent 90%)` }}
        >
          <button className="modal-close" onClick={onClose}><X size={17} strokeWidth={2.4} /></button>

          {/* Top controls — always at edges */}
          <div className="hero-view-controls">
            <button
              className={`hero-shiny-btn${isShiny ? " active" : ""}`}
              onClick={() => setIsShiny(v => !v)}
              title={isShiny ? "Normal" : "Shiny"}
            ><Sparkles size={17} strokeWidth={2.2} /></button>
            {/* Card Mode button */}
            {onOpenCardMode && (
              <button
                className="hero-card-btn"
                onClick={() => onOpenCardMode(pokemon)}
                title="View as Trading Card"
              ><Layers size={17} strokeWidth={2.2} /></button>
            )}
            <div className="hero-view-toggle">
              <button className={`hv-btn${!view3d ? " active" : ""}`} onClick={() => setView3d(false)}>2D</button>
              <button className={`hv-btn${view3d ? " active" : ""}`} onClick={() => setView3d(true)}>3D</button>
            </div>
          </div>

          {/* ⭐ Catch FAB — small Pokeball by default, expands to show text on hover */}
          {!view3d && (
            <button
              className="catch-fab"
              onClick={() => setCatchOpen(true)}
              title={lang==="th" ? "ลองจับโปเกม่อนนี้!"
                   : lang==="ja" ? "捕まえてみよう！"
                   : "Try catching this Pokémon!"}>
              <span className="catch-fab-ball">
                <img
                  src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png"
                  width="32"
                  height="32"
                  alt=""
                  draggable={false}
                  style={{
                    imageRendering: "pixelated",
                    animation: "catch-cta-ball-spin 4s linear infinite",
                    filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.4))",
                  }}
                />
              </span>
              <span className="catch-fab-label">
                {lang==="th" ? "ลองจับ!"
                 : lang==="ja" ? "捕まえる！"
                 : "Try Catch!"}
              </span>
            </button>
          )}

          {/* 2D mode */}
          {!view3d && (
            <>
              <div className="modal-ball-wm" style={{ color }} aria-hidden />
              <div className="modal-accent" style={{ background: color, color: color }} aria-hidden />
              <div className="modal-genus">{genus ?? "Pokémon"} · {padId(pokemon.id)}</div>
              <div className="modal-name-row">
                <div className="modal-name" onClick={() => playCryTracked(pokemon.id)} title={s.playCry}>
                  {heroName}
                  {isShiny && <span className="hero-shiny-badge"><Sparkles size={15} strokeWidth={2.4} /></span>}
                  <span className="modal-name-cry"><Volume2 size={17} strokeWidth={2.2} /></span>
                </div>
                {onFav && (
                  <button
                    className={`modal-fav-btn${isFav ? " active" : ""}`}
                    onClick={() => onFav(pokemon.id)}
                    title={isFav ? s.removeFav : s.addFav}
                  >
                    <span className="modal-fav-icon">
                      <Heart size={18} strokeWidth={2.2} fill={isFav ? "currentColor" : "none"} />
                    </span>
                  </button>
                )}
              </div>
              <CryStylePicker lang={lang} />
              {lang !== "en" && localName && <div className="modal-name-en">{pokemon.name}</div>}
              <div className="modal-sprite-wrap">
                <div className="modal-sprite-glow" aria-hidden
                  style={{ background:`radial-gradient(circle, ${color}3a 0%, ${color}14 42%, transparent 68%)` }} />
                {displayImg && (
                  <img
                    src={displayImg}
                    alt={heroName}
                    className="modal-hero-img"
                    onClick={() => playCryTracked(pokemon.id)}
                    onError={(e) => { if (isShiny && img) e.currentTarget.src = img; }}
                    style={{
                      width: "min(68%, 270px)",
                      height: "auto",
                      maxHeight: 234,
                      objectFit: "contain",
                      filter: "drop-shadow(0 14px 28px rgba(0,0,0,0.25))",
                    }}
                  />
                )}
                <div className="modal-shadow-ring" />
              </div>
            </>
          )}

          {/* 3D mode */}
          {view3d && (
            <div className="hero-bg-layer hero-3d-stage" aria-hidden>
              <div className="stage-glow" style={{ background:`radial-gradient(circle, ${color}80 0%, ${color}2e 40%, transparent 66%)` }} />
              <div className="stage-floor" />
              <div className="stage-pad" style={{ background:`radial-gradient(ellipse, ${color}80, transparent 70%)` }} />
              <TypeAmbiance type={mainType} />
            </div>
          )}
          {view3d && (
            <div className="hero-3d-content">
              <div className="hero-3d-name" onClick={() => playCryTracked(pokemon.id)}>
                {heroName}
                {isShiny && <span className="hero-shiny-badge"><Sparkles size={14} strokeWidth={2.4} /> Shiny</span>}
              </div>
              <Pokemon3DViewer
                pokemonId={pokemon.id}
                pokemonName={heroName}
                color={color}
                isShiny={isShiny}
                lang={lang}
                types={pokemon.types}
              />
              <CatchHintBelow3D setCatchOpen={setCatchOpen} lang={lang} />
              <div className="hero-3d-hint">
                {lang === "th" ? "คลิกที่โปเกมอนเพื่อเปลี่ยนท่า · กด AR ดูในโลกจริง"
                 : lang === "ja" ? "ポケモンをクリックでポーズ切替 · ARで現実世界へ"
                 : "Tap Pokémon to change pose · Use AR to view in your room"}
              </div>
            </div>
          )}

          <div className="modal-type-tags" style={view3d ? { marginTop:8 } : {}}>
            {pokemon.types.map(t => (
              <span key={t.type.name} className="modal-type-tag"
                style={{ background: typeColor(t.type.name), borderColor: typeColor(t.type.name), color: "#fff" }}>
                {typeName(t.type.name)}
              </span>
            ))}
          </div>
        </div>

        <div className="modal-body"
          style={{ background:`linear-gradient(180deg, ${color}2e 0%, ${color}1b 35%, ${color}0c 70%, transparent 100%)` }}>
          <div className="info-row">
            <div className="info-pill"><div className="info-pill-label">{s.height}</div>
              <div className="info-pill-val">{(pokemon.height/10).toFixed(1)} m</div></div>
            <div className="info-pill"><div className="info-pill-label">{s.weight}</div>
              <div className="info-pill-val">{(pokemon.weight/10).toFixed(1)} kg</div></div>
            <div className="info-pill"><div className="info-pill-label">{s.baseExp}</div>
              <div className="info-pill-val">{pokemon.base_experience ?? "—"}</div></div>
          </div>

          {flavor && (
            <div className="flavor-box" style={{ "--modal-accent":color }}>"{flavor}"</div>
          )}

          <TabDropdown tabs={s.tabs} tab={tab} setTab={setTab} lang={lang} />

          {tab === 0 && (
            <div>
              <div className="modal-section-title">{s.baseStats}</div>
              <StatBars stats={pokemon.stats} />
              <div className="stat-total-row">
                <span className="stat-total-label">{s.total}</span>
                <span className="stat-total-val">{total}</span>
              </div>
            </div>
          )}

          {tab === 1 && <TypeMatchup types={pokemon.types} lang={lang} s={s} />}

          {tab === 2 && (
            <div>
              <div className="modal-section-title">{s.abilities}</div>
              <div className="abilities-grid">
                {pokemon.abilities.map(a => (
                  <span key={a.ability.name} className={`ability-chip${a.is_hidden?" hidden-ability":""}`}>
                    {a.ability.name.replace(/-/g," ")}
                    {a.is_hidden && <span className="hidden-label"> {s.hiddenAbility}</span>}
                  </span>
                ))}
              </div>
            </div>
          )}

          {tab === 3 && (
            <div>
              <div className="modal-section-title">{s.evolutions}</div>
              {!evo ? <p className="evo-loading">{s.evoLoading}</p> : (
                <EvoTree
                  node={evo}
                  currentId={pokemon.id}
                  evoImgs={evoImgs}
                  lang={lang}
                  thaiArr={thaiArr}
                  jpArr={jpArr}
                  color={color}
                  onNavigate={onNavigate}
                />
              )}
            </div>
          )}

          {tab === 4 && <MoveLearnset pokemonId={pokemon.id} lang={lang} moveCache={moveCache} />}

          {tab === 5 && <GoMovesSection pokemon={pokemon} lang={lang} />}

          {tab === 6 && (
            <div>
              <div className="modal-section-title">{s.sprites}</div>
              <div className="sprites-grid">
                {[
                  { src:pokemon.sprites?.front_default, label:s.front },
                  { src:pokemon.sprites?.back_default,  label:s.back },
                  { src:pokemon.sprites?.front_shiny,   label:s.shiny },
                  { src:pokemon.sprites?.back_shiny,    label:s.shinyBack },
                  { src:pokemon.sprites?.front_female,  label:s.female },
                  { src:pokemon.sprites?.back_female,   label:s.femaleBack },
                ].filter(sp => sp.src).map((sp,i) => (
                  <div key={i} className="sprite-cell">
                    <img src={sp.src} alt={sp.label} className="sprite-img" loading="lazy" />
                    <span className="sprite-label">{sp.label}</span>
                  </div>
                ))}
              </div>
              {/* ⭐ Sprite Evolution Timeline */}
              <div style={{ marginTop: 28 }}>
                <SpriteTimeline pokemonId={pokemon.id} lang={lang} />
              </div>
            </div>
          )}

          {tab === 7 && <BreedingSection species={species} pokemon={pokemon} s={s} />}
          {tab === 8 && <LocationsSection pokemonId={pokemon.id} lang={lang} s={s} />}
        </div>
      </div>

      {/* ─── Pokemon GO-style fullscreen catch overlay ─── */}
      {catchOpen && (
        <CatchAnimation
          pokemon={pokemon}
          lang={lang}
          shiny={isShiny}
          onClose={() => setCatchOpen(false)}
        />
      )}
    </div>
  );
}

/* Small helper: catch FAB for 3D mode (placed in 3D viewer area) */
function CatchHintBelow3D({ setCatchOpen, lang }) {
  return (
    <button className="catch-fab catch-fab-3d" onClick={() => setCatchOpen(true)}
      title={lang==="th" ? "ลองจับโปเกม่อนนี้!"
           : lang==="ja" ? "捕まえてみよう！"
           : "Try catching this Pokémon!"}>
      <span className="catch-fab-ball">
        <img
          src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png"
          width="32"
          height="32"
          alt=""
          draggable={false}
          style={{
            imageRendering: "pixelated",
            animation: "catch-cta-ball-spin 4s linear infinite",
            filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.4))",
          }}
        />
      </span>
      <span className="catch-fab-label">
        {lang==="th" ? "ลองจับ!"
         : lang==="ja" ? "捕まえる！"
         : "Try Catch!"}
      </span>
    </button>
  );
}