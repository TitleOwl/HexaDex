import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Search, ChevronDown, ArrowUp, ArrowDown } from "lucide-react";
import {
  VERSION_ORDER, VERSION_LABELS, CAT_CONFIG,
  TYPE_NAMES_TH, TYPE_NAMES_JA,
} from "../data.js";
import { pastelTypeColor as typeColor } from "./PokemonModal/palette.js";

const t = (lang, en, th, ja) => (lang === "th" ? th : lang === "ja" ? ja : en);

function CategoryBadge({ cat, lang }) {
  const c = CAT_CONFIG[cat] ?? CAT_CONFIG.status;
  const label = lang==="th"?c.th : lang==="ja"?c.ja : c.en;
  // The colour moves to CSS keyed on data-cat: the inline background was a
  // solid saturated fill that no text colour could sit on legibly, and inline
  // styles cannot be overridden by the stylesheet that fixes it.
  return (
    <span className="move-category" data-cat={cat}>
      {label}
    </span>
  );
}

/**
 * Game-version picker. A native <select> is the one control in this modal the
 * browser draws itself, so it never matched anything around it — this is the
 * same pill used for "All Types" on the Pokédex.
 */
function VersionPicker({ versions, version, onPick, lang }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="mv-ver" ref={wrapRef}>
      <button
        type="button"
        className={`mv-ver-btn${open ? " open" : ""}`}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span>{VERSION_LABELS[version] ?? version}</span>
        <ChevronDown size={13} strokeWidth={2.6} />
      </button>

      {open && (
        <ul className="mv-ver-list" role="listbox"
          aria-label={t(lang, "Game version", "เวอร์ชันเกม", "ゲームバージョン")}>
          {versions.map(v => (
            <li key={v}>
              <button
                type="button"
                role="option"
                aria-selected={v === version}
                className={`mv-ver-opt${v === version ? " on" : ""}`}
                onClick={() => { onPick(v); setOpen(false); }}
              >
                {VERSION_LABELS[v] ?? v}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * A sortable column header. Module scope on purpose: declared inside the
 * component it would be a brand-new component type on every render, so React
 * would tear the cell down and rebuild it instead of updating it.
 */
function SortHead({ label, sortKey, cls, sort, onSort, lang }) {
  const active = sort?.key === sortKey;
  return (
    <th className={cls}>
      <button type="button" className={`mv-sort${active ? " on" : ""}`}
        onClick={() => onSort(sortKey)}
        aria-label={t(lang, `Sort by ${label}`, `เรียงตาม ${label}`, `${label}で並べ替え`)}>
        {label}
        {active && (sort.dir === -1
          ? <ArrowDown size={11} strokeWidth={3} />
          : <ArrowUp size={11} strokeWidth={3} />)}
      </button>
    </th>
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
  const [query,       setQuery]       = useState("");
  // One row open at a time: this is a reference table, and several open
  // descriptions at once puts the reader back where they started.
  const [openMove,    setOpenMove]    = useState(null);
  // null means "the natural order for this tab" — by level, then name.
  const [sort,        setSort]        = useState(null);

  const METHOD_LABEL = {
    "level-up": t(lang, "Level Up", "เลเวลอัพ", "レベルアップ"),
    "machine":  "TM / HM / TR",
    "other":    t(lang, "Other", "อื่นๆ", "その他"),
  };

  useEffect(() => {
    setListLoading(true);
    setAllMoves([]); setDetails({}); setVersion(null); setVersions([]);
    setQuery(""); setOpenMove(null); setSort(null);
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

  const baseMoves = getMethodMoves(methodTab);

  const currentMoves = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = q
      ? baseMoves.filter(m => formatName(m.name).toLowerCase().includes(q)
                           || m.name.toLowerCase().includes(q))
      : baseMoves;

    if (sort) {
      const val = (m) => sort.key === "level" ? m.level : m.detail?.[sort.key];
      rows = [...rows].sort((a, b) => {
        const av = val(a), bv = val(b);
        // Missing values sink to the bottom whichever way the column is
        // pointing — a column of dashes at the top is not a sort result.
        if (av == null && bv == null) return a.name.localeCompare(b.name);
        if (av == null) return 1;
        if (bv == null) return -1;
        return av === bv ? a.name.localeCompare(b.name) : (av - bv) * sort.dir;
      });
    }
    return rows;
  }, [baseMoves, query, sort]);

  const toggleSort = (key) => {
    setSort(s => {
      // First press on a stat sorts high-to-low, which is the question people
      // are actually asking of a Power column.
      if (!s || s.key !== key) return { key, dir: -1 };
      if (s.dir === -1) return { key, dir: 1 };
      return null;                    // third press returns to natural order
    });
  };

  if (listLoading) return <div className="evo-loading">⏳ Loading move list…</div>;
  if (!version)    return <div className="evo-loading">No move data available</div>;

  // Every column, so the expanded description spans the whole row.
  const colCount = methodTab === "machine" ? 6 : 7;

  return (
    <div className="moves-section">
      <div className="moves-version-row">
        <VersionPicker
          versions={versions}
          version={version}
          lang={lang}
          onPick={(v) => {
            setVersion(v);
            setOpenMove(null);
            setDetails(Object.fromEntries([...moveCache.current]));
          }}
        />

        <label className="mv-search">
          <Search size={14} strokeWidth={2.4} />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpenMove(null); }}
            placeholder={t(lang, "Search moves…", "ค้นหาท่า…", "わざを検索…")}
            aria-label={t(lang, "Search moves", "ค้นหาท่า", "わざを検索")}
          />
        </label>

        {detLoading && <div className="moves-loading-dot" />}
      </div>

      <div className="moves-method-tabs">
        {["level-up","machine","other"].map(key => {
          const count = getMethodMoves(key).length;
          return (
            <button
              key={key}
              className={`moves-method-btn${methodTab===key?" active":""}`}
              onClick={() => { setMethodTab(key); setOpenMove(null); setSort(null); }}
            >
              {METHOD_LABEL[key]}
              <span className="moves-count">{count}</span>
            </button>
          );
        })}
      </div>

      {currentMoves.length === 0 ? (
        <div className="evo-loading">
          {query.trim()
            ? t(lang, "No moves match that search", "ไม่พบท่าที่ค้นหา", "該当するわざがありません")
            : "No moves in this category for this game"}
        </div>
      ) : (
        <div className="moves-table-wrap">
          <table className="moves-table">
            <thead>
              <tr>
                {methodTab === "level-up" && <SortHead label="Lv" sortKey="level" cls="th-lv" sort={sort} onSort={toggleSort} lang={lang} />}
                {methodTab === "other"    && <th className="th-method">Method</th>}
                <th className="th-move">Move</th>
                <th className="th-type">Type</th>
                <th className="th-cat">Cat.</th>
                <SortHead label="Pow" sortKey="power" sort={sort} onSort={toggleSort} lang={lang}    cls="th-num" />
                <SortHead label="Acc" sortKey="accuracy" sort={sort} onSort={toggleSort} lang={lang} cls="th-num" />
                <SortHead label="PP"  sortKey="pp"       cls="th-num" />
              </tr>
            </thead>
            <tbody>
              {currentMoves.map(m => {
                const d = m.detail;
                const typeName = d?.type?.name;
                const typeLabel =
                  lang==="th" ? (TYPE_NAMES_TH[typeName]??typeName) :
                  lang==="ja" ? (TYPE_NAMES_JA[typeName]??typeName) : typeName;
                const open = openMove === m.name;
                const desc = getDesc(d);
                const toggle = () => setOpenMove(o => (o === m.name ? null : m.name));

                return [
                  // The description used to live in every row, which made each
                  // one ~78px tall — seven moves per screen for a Pokémon that
                  // may know a hundred. It moves behind a press instead.
                  <tr
                    key={m.name}
                    className={`move-row${open ? " open" : ""}`}
                    onClick={toggle}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-expanded={open}
                  >
                    {methodTab==="level-up" && <td className="move-lv">{m.level > 0 ? m.level : "—"}</td>}
                    {methodTab==="other" && <td className="move-method-label">{m.method.replace(/-/g," ")}</td>}
                    <td className="move-name-cell">
                      <span className="move-name">{formatName(m.name)}</span>
                      <ChevronDown size={13} strokeWidth={2.6} className="move-caret" aria-hidden />
                    </td>
                    <td className="move-type-cell">
                      {typeName
                        ? <span className="move-type-tag" style={{ "--tt": typeColor(typeName) }}>{typeLabel}</span>
                        : <span className="move-loading-text">…</span>}
                    </td>
                    <td className="move-cat-cell">
                      {d ? <CategoryBadge cat={d.damage_class?.name} lang={lang} /> : <span className="move-loading-text">…</span>}
                    </td>
                    <td className="move-num">{d ? (d.power ?? "—") : "…"}</td>
                    <td className="move-num">{d ? (d.accuracy ?? "—") : "…"}</td>
                    <td className="move-num">{d ? (d.pp ?? "—") : "…"}</td>
                  </tr>,

                  open && (
                    <tr key={`${m.name}-desc`} className="move-desc-row">
                      <td colSpan={colCount}>
                        <div className="move-desc">
                          {desc ?? t(lang, "No description available",
                            "ไม่มีคำอธิบาย", "説明がありません")}
                        </div>
                      </td>
                    </tr>
                  ),
                ];
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
