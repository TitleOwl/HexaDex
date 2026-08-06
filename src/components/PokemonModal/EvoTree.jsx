import { getLocalName } from "../../utils.js";

// Evolution Tree (branching support for Eevee, Slowpoke, etc.)
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

export default function EvoTree({ node, currentId, evoImgs, lang, thaiArr, jpArr, color, onNavigate }) {
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
