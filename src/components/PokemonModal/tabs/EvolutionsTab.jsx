import EvoTree from "../EvoTree.jsx";

export default function EvolutionsTab({ evo, currentId, evoImgs, lang, thaiArr, jpArr, color, onNavigate, s }) {
  return (
    <div>
      <div className="modal-section-title">{s.evolutions}</div>
      {!evo ? <p className="evo-loading">{s.evoLoading}</p> : (
        <EvoTree
          node={evo}
          currentId={currentId}
          evoImgs={evoImgs}
          lang={lang}
          thaiArr={thaiArr}
          jpArr={jpArr}
          color={color}
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
}
