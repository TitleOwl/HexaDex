import { useState } from "react";
import { Sparkles } from "lucide-react";
import EvoTree from "../EvoTree.jsx";
import EvoChainWeakness from "../EvoChainWeakness.jsx";

export default function EvolutionsTab({
  evo, currentId, evoImgs, lang, thaiArr, jpArr, onNavigate, onPlayCry, s,
}) {
  const [shiny, setShiny] = useState(false);
  const shinyLabel = lang === "th" ? "ชินนี่" : lang === "ja" ? "色違い" : "Shiny";

  return (
    <div className="evo-section">
      <div className="evo-head">
        <div className="evo-head-title">
          {s.evolutions}
          <span className="evo-head-bar" aria-hidden />
        </div>
        <button
          type="button"
          className={`evo-shiny-btn${shiny ? " active" : ""}`}
          onClick={() => setShiny(v => !v)}
          aria-pressed={shiny}
        >
          <Sparkles size={14} strokeWidth={2.4} />
          {shinyLabel}
        </button>
      </div>

      {!evo ? <p className="evo-loading">{s.evoLoading}</p> : (
        <>
          <EvoTree
            node={evo}
            currentId={currentId}
            evoImgs={evoImgs}
            lang={lang}
            thaiArr={thaiArr}
            jpArr={jpArr}
            onNavigate={onNavigate}
            shiny={shiny}
            onPlayCry={onPlayCry}
          />
          <EvoChainWeakness
            node={evo}
            evoImgs={evoImgs}
            lang={lang}
            thaiArr={thaiArr}
            jpArr={jpArr}
            currentId={currentId}
          />
        </>
      )}
    </div>
  );
}
