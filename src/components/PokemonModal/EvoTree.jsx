import { useState, useRef, useEffect } from "react";
import { Volume2 } from "lucide-react";
import { getLocalName, playCry } from "../../utils.js";
import { TYPE_NAMES_TH, TYPE_NAMES_JA } from "../../data.js";
import { pastelTypeColor, needsDarkText } from "./palette.js";

const fmt = (s) => s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const STAT_SHORT = {
  "hp": "HP", "attack": "Atk", "defense": "Def",
  "special-attack": "Sp.Atk", "special-defense": "Sp.Def", "speed": "Spd",
};

// Branch chains need the condition per node — each Eevee path uses a
// different stone, so a bare chevron would hide the only thing that
// distinguishes them.
function evoCondition(node, lang) {
  if (node.item)
    return lang === "th" ? `ใช้ ${fmt(node.item)}`
      : lang === "ja" ? `${fmt(node.item)}を使う`
      : `Use ${fmt(node.item)}`;
  if (node.minLevel)
    return lang === "th" ? `เลเวล ${node.minLevel}`
      : lang === "ja" ? `レベル ${node.minLevel}`
      : `Level ${node.minLevel}`;
  if (node.minHappiness)
    return lang === "th" ? "ความผูกพัน" : lang === "ja" ? "なつき度" : "Friendship";
  if (node.trigger === "trade")
    return lang === "th" ? "แลกเปลี่ยน" : lang === "ja" ? "通信交換" : "Trade";
  if (node.trigger === "level-up")
    return lang === "th" ? "เลเวลอัพ" : lang === "ja" ? "レベルアップ" : "Level Up";
  return node.trigger ? fmt(node.trigger) : "";
}

// Cached entries may be the current rich object, an older {img,type(s)}, or
// a bare url string from an even earlier build.
function readEntry(raw) {
  if (!raw) return {};
  if (typeof raw === "string") return { img: raw, types: [] };
  return {
    ...raw,
    types: Array.isArray(raw.types) ? raw.types : raw.type ? [raw.type] : [],
  };
}

const walk = (node, fn) => { fn(node); (node.children ?? []).forEach(c => walk(c, fn)); };

// Sprite box that can replay the in-game evolution flash: the PARENT form
// appears, bleaches to a white silhouette, and morphs into this form.
function MorphSprite({ img, fromImg, isBase, scale, alt, playing }) {
  return (
    <div className={`evo-morph${isBase ? " base" : ""}`}>
      {img
        ? <img
            src={img}
            alt={alt}
            className={`evo-sprite${playing ? " morph-to" : ""}`}
            style={{ transform: `scale(${scale})` }}
            loading="lazy"
            draggable={false}
          />
        : <div className="skeleton-pulse evo-sprite-skeleton" />
      }
      {playing && fromImg && (
        <img
          src={fromImg}
          alt=""
          aria-hidden
          className="evo-sprite morph-from"
          style={{ transform: `scale(${scale})` }}
          draggable={false}
        />
      )}
    </div>
  );
}

function EvoNode({
  node, currentId, evoImgs, lang, thaiArr, jpArr, onNavigate,
  isBase, shiny, maxHeight, parentStats, parentImg, onPlayCry, playing, wide,
}) {

  const local = getLocalName(node.id, lang, thaiArr, jpArr);
  const name = local ?? node.name;
  const isCurrent = node.id === currentId;

  const d = readEntry(evoImgs[node.id]);
  const img = (shiny && d.shiny) || d.img;
  const fromImg = parentImg;
  const types = d.types ?? [];

  const cond = isBase ? "" : evoCondition(node, lang);

  // True-size comparison: scale each sprite against the tallest form in the
  // chain. The base form gets a higher floor than the rest, because it is
  // always the shortest and a strict ratio rendered it uncomfortably small
  // (Bulbasaur is barely a third of Venusaur).
  const floor = isBase ? 0.6 : 0.52;
  const scale = maxHeight && d.height
    ? Math.max(floor, Math.min(1, d.height / maxHeight))
    : 1;

  const meters = d.height != null ? d.height / 10 : null;
  const kg = d.weight != null ? d.weight / 10 : null;
  const heightRatio = parentStats && d.height && parentStats.__height
    ? d.height / parentStats.__height : null;

  // Stat growth vs the previous form, plus whichever stat gained most.
  let bstDelta = null, topGain = null;
  if (parentStats && d.stats && parentStats.total != null && d.total != null) {
    bstDelta = d.total - parentStats.total;
    let best = null;
    for (const k of Object.keys(STAT_SHORT)) {
      const diff = (d.stats[k] ?? 0) - (parentStats.stats?.[k] ?? 0);
      if (diff > 0 && (!best || diff > best.diff)) best = { k, diff };
    }
    topGain = best;
  }

  const typeLabel = (t) =>
    lang === "th" ? (TYPE_NAMES_TH[t] ?? t) : lang === "ja" ? (TYPE_NAMES_JA[t] ?? t) : t;

  const nav = () => {
    if (!isCurrent) fetch(`https://pokeapi.co/api/v2/pokemon/${node.id}`).then(r => r.json()).then(onNavigate);
  };

  const cry = (e) => {
    e.stopPropagation();
    playCry(node.id, 0.4, d.apiName ?? node.name);
    onPlayCry?.();
  };

  const spoken = [
    name,
    lang === "th" ? `หมายเลข ${node.id}` : lang === "ja" ? `No.${node.id}` : `number ${node.id}`,
    types.map(typeLabel).join(", "),
    cond,
  ].filter(Boolean).join(" · ");

  const cryLabel = lang === "th" ? "ฟังเสียงร้อง" : lang === "ja" ? "鳴き声" : "Play cry";

  return (
    <div
      className={`evo-node-card${wide ? " wide" : ""}${isCurrent ? " current" : ""}`}
      onClick={nav}
      role={isCurrent ? undefined : "button"}
      tabIndex={isCurrent ? undefined : 0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); nav(); } }}
      aria-label={isCurrent ? undefined : spoken}
      aria-current={isCurrent ? "true" : undefined}
    >
      <div className="evo-node-tools">
        <button type="button" className="evo-tool-btn" onClick={cry} title={cryLabel} aria-label={cryLabel}>
          <Volume2 size={13} strokeWidth={2.2} />
        </button>
      </div>

      <MorphSprite img={img} fromImg={fromImg} isBase={isBase} scale={scale} alt="" playing={playing} />

      <div className="evo-node-info">
      <div className="evo-node-label">
        {name} <span className="evo-node-num">#{String(node.id).padStart(3, "0")}</span>
      </div>

      {meters != null && (
        <div className="evo-meta">
          {meters.toFixed(1)} m · {kg.toFixed(1)} kg
          {heightRatio && heightRatio >= 1.15 && (
            <span className="evo-growth"> ↑ {heightRatio.toFixed(1)}×</span>
          )}
        </div>
      )}

      {types.length > 0 && (
        <div className="evo-badges">
          {types.map(t => {
            const bg = pastelTypeColor(t);
            return (
              <span
                key={t}
                className="evo-badge"
                style={{ background: bg, color: needsDarkText(bg) ? "#303943" : "#fff" }}
              >
                {typeLabel(t)}
              </span>
            );
          })}
        </div>
      )}

      {d.total != null && (
        <div className="evo-bst">
          {lang === "th" ? "รวม" : lang === "ja" ? "合計" : "Total"} {d.total}
          {bstDelta > 0 && <span className="evo-bst-delta"> +{bstDelta}</span>}
        </div>
      )}
      {topGain && (
        <div className="evo-topgain">{STAT_SHORT[topGain.k]} +{topGain.diff}</div>
      )}

      {cond && <span className="evo-cond-chip">{cond}</span>}
      </div>
    </div>
  );
}

// The chevron doubles as the "replay this evolution" trigger. Putting it
// here rather than on each node avoids a second sparkle icon competing
// with the Shiny switch, and on a branching chain one press flashes every
// branch at once (Eevee → all eight forms together).
function Chevron({ onPlay, playing, lang }) {
  const label = lang === "th" ? "ดูแอนิเมชันวิวัฒนาการ"
    : lang === "ja" ? "進化アニメ" : "Replay evolution";
  return (
    <button
      type="button"
      className={`evo-chevron${playing ? " playing" : ""}`}
      onClick={onPlay}
      title={label}
      aria-label={label}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M7 7l5 5 5-5" />
        <path d="M7 13l5 5 5-5" />
      </svg>
    </button>
  );
}

// Vertical axis, recursive: one node, then its children as a centered
// single column (1 child) or a 2-column wrapping grid (2+). Depth and
// branch count are both unbounded — Eevee's eight forms just wrap.
export default function EvoTree({
  node, currentId, evoImgs, lang, thaiArr, jpArr, onNavigate,
  shiny = false, onPlayCry, isRoot = true, maxHeight, parentStats, parentImg,
  playing = false, wide = true,
}) {
  // One flag per step: pressing this step's chevron flashes every child
  // of this node, and `playing` arrives from the step above.
  const [stepPlaying, setStepPlaying] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const playStep = () => {
    if (stepPlaying) return;
    setStepPlaying(true);
    timer.current = setTimeout(() => setStepPlaying(false), 2000);
  };

  if (!node) return null;

  // Root measures the whole chain once so every node shares one size scale.
  let max = maxHeight;
  if (max == null) {
    max = 0;
    walk(node, n => {
      const h = readEntry(evoImgs[n.id]).height;
      if (h && h > max) max = h;
    });
    if (!max) max = null;
  }

  const d = readEntry(evoImgs[node.id]);
  const ownImg = (shiny && d.shiny) || d.img;
  const kids = node.children ?? [];

  const pass = {
    currentId, evoImgs, lang, thaiArr, jpArr, onNavigate,
    shiny, onPlayCry, maxHeight: max,
  };

  return (
    <div className="evo-tree">
      <EvoNode
        node={node}
        isBase={isRoot}
        parentStats={parentStats}
        parentImg={parentImg}
        playing={playing}
        wide={wide}
        {...pass}
      />
      {kids.length > 0 && (
        <>
          <Chevron onPlay={playStep} playing={stepPlaying} lang={lang} />
          <div className={kids.length > 1 ? "evo-grid" : "evo-single"}>
            {kids.map(child => (
              <EvoTree
                key={child.id}
                node={child}
                isRoot={false}
                parentStats={{ stats: d.stats, total: d.total, __height: d.height }}
                parentImg={ownImg}
                playing={stepPlaying}
                wide={wide && kids.length === 1}
                {...pass}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
