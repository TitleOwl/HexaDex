import { TYPE_NAMES_TH, TYPE_NAMES_JA } from "../../../data.js";
import { calcDefMatchups } from "../../../utils.js";

// Type icons: partywhale/pokemon-type-icons (MIT) — a vector recreation of
// the Scarlet/Violet type symbols, in public/types/<type>.svg. Each file is
// already a finished circular badge (colored disc + white glyph), so it is
// dropped in whole rather than masked: several glyphs are two-tone and use
// the disc color as negative space, which a flat mask would fill in.

const MULT_LABEL = { 4: "4x", 2: "2x", 0.5: "½x", 0.25: "¼x", 0: "0x" };

function ChipRows({ rows, lang, kind }) {
  const localType = (t) =>
    lang === "th" ? (TYPE_NAMES_TH[t] ?? t) : lang === "ja" ? (TYPE_NAMES_JA[t] ?? t) : t;

  // Spoken form differs per section so screen readers get real sentences
  // rather than a bare multiplier.
  const describe = (type, mult) => {
    const name = localType(type);
    if (kind === "weak") {
      return lang === "th" ? `แพ้ธาตุ${name} ${mult} เท่า`
        : lang === "ja" ? `${name}タイプに${mult}倍`
        : `Weak to ${name}, ${mult} times damage`;
    }
    if (mult === 0) {
      return lang === "th" ? `ไม่โดนธาตุ${name}เลย`
        : lang === "ja" ? `${name}タイプは無効`
        : `Immune to ${name}`;
    }
    const frac = mult === 0.5 ? "½" : "¼";
    return lang === "th" ? `ต้านทานธาตุ${name} เหลือ ${frac} เท่า`
      : lang === "ja" ? `${name}タイプは${frac}倍`
      : `Resists ${name}, ${frac} damage`;
  };

  let n = 0;
  return rows.map(({ mult, list }) => (
    <div key={mult} className="weak-row">
      <span className="weak-mult-chip">{MULT_LABEL[mult] ?? `${mult}x`}</span>
      <div className="weak-chips">
        {list.map(m => (
          <img
            key={m.type}
            src={`/types/${m.type}.svg`}
            className="weak-type-chip"
            style={{ "--chip-delay": `${n++ * 30}ms` }}
            tabIndex={0}
            draggable={false}
            title={`${localType(m.type)} ${MULT_LABEL[mult] ?? mult}`}
            alt={describe(m.type, mult)}
          />
        ))}
      </div>
    </div>
  ));
}

const group = (matchups, mults) =>
  mults
    .map(mult => ({ mult, list: matchups.filter(m => m.mult === mult) }))
    .filter(r => r.list.length > 0);

export default function TypeMatchups({ types, lang }) {
  // Multipliers come from BOTH types combined, so 4× and ¼× are reachable.
  const matchups = calcDefMatchups(types);
  // Most extreme first in each section.
  const weakRows   = group(matchups, [4, 2]);
  const resistRows = group(matchups, [0, 0.25, 0.5]);

  const t = {
    weak:      lang === "th" ? "จุดอ่อน"       : lang === "ja" ? "弱点"   : "Weaknesses",
    resist:    lang === "th" ? "ต้านทาน"       : lang === "ja" ? "耐性"   : "Resistances",
    noWeak:    lang === "th" ? "ไม่มีจุดอ่อน"   : lang === "ja" ? "弱点なし" : "No weaknesses",
    noResist:  lang === "th" ? "ไม่ต้านทานธาตุใด" : lang === "ja" ? "耐性なし" : "No resistances",
  };

  return (
    <>
      <div className="weak-section">
        <div className="about-section-title">{t.weak}</div>
        {weakRows.length === 0
          ? <p className="weak-empty">{t.noWeak}</p>
          : <ChipRows rows={weakRows} lang={lang} kind="weak" />}
      </div>

      <div className="weak-section">
        <div className="about-section-title">{t.resist}</div>
        {resistRows.length === 0
          ? <p className="weak-empty">{t.noResist}</p>
          : <ChipRows rows={resistRows} lang={lang} kind="resist" />}
      </div>
    </>
  );
}
