import { useState, useEffect, useRef } from "react";
import { getCryStyle, setCryStyle } from "../../utils.js";

const CRY_STYLES = [
  { id: "anime",   label: "Anime"  },
  { id: "game",    label: "Game"   },
  { id: "classic", label: "8-bit"  },
];

export default function CryStylePicker({ lang }) {
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
