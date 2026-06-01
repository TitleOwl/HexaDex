import { useState, useEffect, useCallback } from "react";
import {
  VERSION_ORDER, VERSION_LABELS, CAT_CONFIG,
  TYPE_NAMES_TH, TYPE_NAMES_JA,
} from "../data.js";
import { typeColor } from "../utils.js";

function CategoryBadge({ cat, lang }) {
  const c = CAT_CONFIG[cat] ?? CAT_CONFIG.status;
  const label = lang==="th"?c.th : lang==="ja"?c.ja : c.en;
  return (
    <span className="move-category" style={{ background:c.color }}>
      {c.icon} {label}
    </span>
  );
}

export default function MoveLearnset({ pokemonId, lang, moveCache }) {
  const [listLoading, setListLoading] = useState(true);
  const [allMoves,    setAllMoves]    = useState([]);
  const [details,     setDetails]     = useState({});
  const [detLoading,  setDetLoading]  = useState(false);
  const [version,     setVersion]     = useState(null);
  const [versions,    setVersions]    = useState([]);
  const [methodTab,   setMethodTab]   = useState("level-up");

  const METHOD_LABEL = {
    "level-up": lang==="th"?"เลเวลอัพ" : lang==="ja"?"レベルアップ" : "Level Up",
    "machine":  "TM / HM / TR",
    "other":    lang==="th"?"อื่นๆ" : lang==="ja"?"その他" : "Other",
  };

  useEffect(() => {
    setListLoading(true);
    setAllMoves([]); setDetails({}); setVersion(null); setVersions([]);
    fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`)
      .then(r => r.json())
      .then(data => {
        const moves = data.moves || [];
        setAllMoves(moves);
        const vSet = new Set();
        moves.forEach(m => m.version_group_details.forEach(vg => vSet.add(vg.version_group.name)));
        const sorted = VERSION_ORDER.filter(v => vSet.has(v));
        [...vSet].forEach(v => { if (!sorted.includes(v)) sorted.push(v); });
        setVersions(sorted);
        setVersion(sorted[0] ?? null);
        setListLoading(false);
      })
      .catch(() => setListLoading(false));
  }, [pokemonId]);

  useEffect(() => {
    if (!version || !allMoves.length) return;
    const needed = allMoves
      .filter(m => m.version_group_details.some(vg => vg.version_group.name === version))
      .map(m => m.move.name)
      .filter(name => !moveCache.current.has(name));

    setDetails(Object.fromEntries([...moveCache.current].filter(([,v]) => v)));

    if (!needed.length) return;
    setDetLoading(true);

    const batches = [];
    for (let i = 0; i < needed.length; i += 15) batches.push(needed.slice(i, i+15));

    (async () => {
      for (const batch of batches) {
        await Promise.allSettled(batch.map(async name => {
          try {
            const d = await fetch(`https://pokeapi.co/api/v2/move/${name}`).then(r => r.json());
            moveCache.current.set(name, d);
          } catch {}
        }));
        setDetails(Object.fromEntries([...moveCache.current]));
      }
      setDetLoading(false);
    })();
  }, [version, allMoves, moveCache]);

  const getMethodMoves = useCallback((methodKey) => {
    return allMoves
      .map(m => {
        const vd = m.version_group_details.find(vg => vg.version_group.name === version);
        if (!vd) return null;
        const method = vd.move_learn_method.name;
        const inMethod =
          methodKey === "machine" ? ["machine","record"].includes(method) :
          methodKey === "other"   ? !["level-up","machine","record"].includes(method) :
          method === methodKey;
        if (!inMethod) return null;
        return {
          name: m.move.name, level: vd.level_learned_at, method,
          detail: moveCache.current.get(m.move.name) ?? details[m.move.name]
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.level !== b.level ? a.level - b.level : a.name.localeCompare(b.name));
  }, [allMoves, version, details, moveCache]);

  const getDesc = (detail) => {
    if (!detail) return null;
    const flavLang = lang==="th"?"th" : lang==="ja"?"ja" : "en";
    const flav =
      detail.flavor_text_entries?.find(f => f.language.name===flavLang) ??
      detail.flavor_text_entries?.find(f => f.language.name==="en");
    if (flav) return flav.flavor_text.replace(/[\n\f]/g," ");
    return detail.effect_entries?.find(e => e.language.name==="en")?.short_effect ?? null;
  };

  const formatName = (n) => n.replace(/-/g," ").replace(/\b\w/g,c=>c.toUpperCase());

  if (listLoading) return <div className="evo-loading">⏳ Loading move list…</div>;
  if (!version)    return <div className="evo-loading">No move data available</div>;

  const currentMoves = getMethodMoves(methodTab);

  return (
    <div className="moves-section">
      <div className="moves-version-row">
        <select
          className="moves-version-select"
          value={version}
          onChange={e => { setVersion(e.target.value); setDetails(Object.fromEntries([...moveCache.current])); }}
        >
          {versions.map(v => (
            <option key={v} value={v}>{VERSION_LABELS[v] ?? v}</option>
          ))}
        </select>
        {detLoading && <div className="moves-loading-dot" />}
      </div>

      <div className="moves-method-tabs">
        {["level-up","machine","other"].map(key => {
          const count = getMethodMoves(key).length;
          return (
            <button
              key={key}
              className={`moves-method-btn${methodTab===key?" active":""}`}
              onClick={() => setMethodTab(key)}
            >
              {METHOD_LABEL[key]}
              <span className="moves-count">{count}</span>
            </button>
          );
        })}
      </div>

      {currentMoves.length === 0 ? (
        <div className="evo-loading">No moves in this category for this game</div>
      ) : (
        <div className="moves-table-wrap">
          <table className="moves-table">
            <thead>
              <tr>
                {methodTab === "level-up" && <th className="th-lv">Lv</th>}
                {methodTab === "other"    && <th className="th-method">Method</th>}
                <th className="th-move">Move</th>
                <th className="th-type">Type</th>
                <th className="th-cat">Cat.</th>
                <th className="th-num">Pow</th>
                <th className="th-num">Acc</th>
                <th className="th-num">PP</th>
              </tr>
            </thead>
            <tbody>
              {currentMoves.map(m => {
                const d = m.detail;
                const typeName = d?.type?.name;
                const typeLabel =
                  lang==="th" ? (TYPE_NAMES_TH[typeName]??typeName) :
                  lang==="ja" ? (TYPE_NAMES_JA[typeName]??typeName) : typeName;
                return (
                  <tr key={m.name} className="move-row">
                    {methodTab==="level-up" && <td className="move-lv">{m.level > 0 ? m.level : "—"}</td>}
                    {methodTab==="other" && <td className="move-method-label">{m.method.replace(/-/g," ")}</td>}
                    <td className="move-name-cell">
                      <div className="move-name">{formatName(m.name)}</div>
                      {d && <div className="move-desc">{getDesc(d)}</div>}
                      {!d && <div className="move-desc move-loading-text">…</div>}
                    </td>
                    <td className="move-type-cell">
                      {typeName
                        ? <span className="type-tag move-type-tag" style={{ background:typeColor(typeName) }}>{typeLabel}</span>
                        : <span className="move-loading-text">…</span>}
                    </td>
                    <td className="move-cat-cell">
                      {d ? <CategoryBadge cat={d.damage_class?.name} lang={lang} /> : <span className="move-loading-text">…</span>}
                    </td>
                    <td className="move-num">{d ? (d.power ?? "—") : "…"}</td>
                    <td className="move-num">{d ? (d.accuracy ?? "—") : "…"}</td>
                    <td className="move-num">{d ? (d.pp ?? "—") : "…"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
