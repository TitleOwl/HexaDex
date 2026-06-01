import { useState, useRef } from "react";
import { typeColor, getArt, getLocalName, padId } from "../utils.js";

// Color signature extraction (smaller, faster)
async function getColorSig(imageUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 24; canvas.height = 24;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, 24, 24);
        const data = ctx.getImageData(0, 0, 24, 24).data;
        const hist = {};
        let total = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i+3] < 100) continue;
          const r = Math.floor(data[i] / 32);
          const g = Math.floor(data[i+1] / 32);
          const b = Math.floor(data[i+2] / 32);
          if (r === 7 && g === 7 && b === 7) continue;
          if (r === 0 && g === 0 && b === 0) continue;
          const key = `${r},${g},${b}`;
          hist[key] = (hist[key] || 0) + 1;
          total++;
        }
        Object.keys(hist).forEach(k => { hist[k] /= total; });
        resolve(hist);
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = imageUrl;
  });
}
function compareSigs(a, b) {
  if (!a || !b) return 0;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let s = 0;
  keys.forEach(k => { s += Math.min(a[k] || 0, b[k] || 0); });
  return s;
}

export default function SnapSearch({ loaded, thaiArr, jpArr, lang, onOpen }) {
  const fileRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target.result;
      setSnapshot(url);
      analyze(url);
    };
    reader.readAsDataURL(file);
  };

  const analyze = async (imageUrl) => {
    setAnalyzing(true);
    setResults([]);
    setError(null);
    try {
      const querySig = await getColorSig(imageUrl);
      if (!querySig) throw new Error("Failed");
      const cands = loaded.length > 0 ? loaded.slice(0, 200) : [];
      if (cands.length === 0) {
        setError(lang==="th"?"ยังไม่มี Pokémon โหลด":"No Pokémon loaded yet");
        setAnalyzing(false);
        return;
      }
      const matches = [];
      for (const p of cands) {
        const art = getArt(p);
        if (!art) continue;
        const sig = await getColorSig(art);
        matches.push({ pokemon: p, score: compareSigs(querySig, sig) });
      }
      matches.sort((a, b) => b.score - a.score);
      setResults(matches.slice(0, 5));
    } catch (e) {
      setError(e.message);
    }
    setAnalyzing(false);
  };

  const reset = () => { setSnapshot(null); setResults([]); setError(null); };
  const close = () => { setOpen(false); reset(); };

  return (
    <>
      <button
        className="search-icon-btn snap-icon"
        onClick={() => { setOpen(true); fileRef.current?.click(); }}
        title={lang==="th"?"สแกนรูป":lang==="ja"?"画像検索":"Snap search"}
      >📸</button>

      <input ref={fileRef} type="file" accept="image/*" capture="environment"
        onChange={handleFile} style={{ display: "none" }} />

      {open && (snapshot || analyzing || results.length > 0 || error) && (
        <div className="snap-popup-overlay" onClick={close}>
          <div className="snap-popup" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={close} style={{ top: 10, right: 10 }}>✕</button>
            <h3 style={{ marginTop: 0, fontFamily: "var(--font-display)", color: "var(--blue-deep)" }}>
              📸 {lang==="th"?"ค้นหาด้วยภาพ":lang==="ja"?"画像検索":"Snap Search"}
            </h3>

            {snapshot && (
              <div style={{ textAlign: "center", marginBottom: 14 }}>
                <img src={snapshot} alt="" style={{ maxWidth: 180, maxHeight: 180, borderRadius: 12 }} />
              </div>
            )}

            {analyzing && (
              <div className="snap-analyzing">
                <div className="pokeball-spin" />
                <div>{lang==="th"?"กำลังวิเคราะห์...":"Analyzing..."}</div>
              </div>
            )}

            {error && <div className="snap-error">⚠️ {error}</div>}

            {results.length > 0 && (
              <div className="snap-results">
                {results.map((m, i) => {
                  const p = m.pokemon;
                  const color = typeColor(p.types[0]?.type.name);
                  const name = getLocalName(p.id, lang, thaiArr, jpArr) ?? p.name;
                  const pct = Math.round(m.score * 100);
                  return (
                    <button key={p.id} className="snap-result-item"
                      onClick={() => { onOpen(p); close(); }}
                      style={{ borderColor: color }}>
                      <div className="snap-result-rank">{i + 1}</div>
                      <img src={getArt(p)} alt={name} className="snap-result-img" />
                      <div className="snap-result-info">
                        <div className="snap-result-name">{name}</div>
                        <div className="snap-result-id">{padId(p.id)}</div>
                      </div>
                      <div className="snap-result-score" style={{ background: color }}>{pct}%</div>
                    </button>
                  );
                })}
              </div>
            )}

            <button className="snap-retry-btn" onClick={() => fileRef.current?.click()}>
              📂 {lang==="th"?"เลือกรูปใหม่":"Choose another"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}