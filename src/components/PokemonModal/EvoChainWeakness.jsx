import { TYPE_NAMES_TH, TYPE_NAMES_JA } from "../../data.js";
import { calcDefMatchups, getLocalName } from "../../utils.js";

// How the defensive profile shifts along the line — the useful bit is that
// evolving often changes weaknesses outright (Charmander's 2× Rock becomes
// Charizard's 4× once it picks up Flying, and Ground stops landing at all).
export default function EvoChainWeakness({ node, evoImgs, lang, thaiArr, jpArr, currentId }) {
  const forms = [];
  const collect = (n) => { forms.push(n); (n.children ?? []).forEach(collect); };
  collect(node);

  const localType = (t) =>
    lang === "th" ? (TYPE_NAMES_TH[t] ?? t) : lang === "ja" ? (TYPE_NAMES_JA[t] ?? t) : t;

  const rows = forms.map(f => {
    const raw = evoImgs[f.id];
    const types = Array.isArray(raw?.types) ? raw.types : raw?.type ? [raw.type] : [];
    if (!types.length) return null;
    const m = calcDefMatchups(types.map(t => ({ type: { name: t } })));
    return {
      id: f.id,
      name: getLocalName(f.id, lang, thaiArr, jpArr) ?? f.name,
      img: typeof raw === "string" ? raw : raw?.img,
      quad: m.filter(x => x.mult === 4).map(x => x.type),
      dbl:  m.filter(x => x.mult === 2).map(x => x.type),
    };
  }).filter(Boolean);

  // Nothing to compare on a single-form species.
  if (rows.length < 2) return null;

  const title = lang === "th" ? "จุดอ่อนตามสาย"
    : lang === "ja" ? "系統ごとの弱点" : "Weaknesses along the line";
  const noneLabel = lang === "th" ? "ไม่มีจุดอ่อน" : lang === "ja" ? "弱点なし" : "No weaknesses";

  const chips = (list, mult) => list.map(t => (
    <img
      key={`${mult}-${t}`}
      src={`/types/${t}.svg`}
      className="evo-weak-chip"
      draggable={false}
      title={`${localType(t)} ${mult}x`}
      alt={
        lang === "th" ? `แพ้ธาตุ${localType(t)} ${mult} เท่า`
          : lang === "ja" ? `${localType(t)}タイプに${mult}倍`
          : `Weak to ${localType(t)}, ${mult} times damage`
      }
    />
  ));

  return (
    <div className="evo-weak-section">
      <div className="about-section-title">{title}</div>
      {rows.map(r => (
        <div key={r.id} className={`evo-weak-row${r.id === currentId ? " current" : ""}`}>
          <div className="evo-weak-who">
            {r.img && <img src={r.img} alt="" className="evo-weak-thumb" draggable={false} />}
            <span className="evo-weak-name">{r.name}</span>
          </div>
          <div className="evo-weak-chips">
            {r.quad.length > 0 && (
              <span className="evo-weak-group">
                <span className="evo-weak-mult quad">4x</span>
                {chips(r.quad, 4)}
              </span>
            )}
            {r.dbl.length > 0 && (
              <span className="evo-weak-group">
                <span className="evo-weak-mult">2x</span>
                {chips(r.dbl, 2)}
              </span>
            )}
            {r.quad.length === 0 && r.dbl.length === 0 && (
              <span className="evo-weak-none">{noneLabel}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
