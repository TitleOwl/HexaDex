import { useState, useRef } from "react";
import { TYPE_COLORS, TYPE_NAMES_TH, TYPE_NAMES_JA } from "../data.js";
import { typeColor, getArt, getLocalName, padId } from "../utils.js";

// Convert SVG element to PNG using canvas
async function svgToPng(svgEl, scale = 2) {
  const xml = new XMLSerializer().serializeToString(svgEl);
  const svg64 = btoa(unescape(encodeURIComponent(xml)));
  const dataUrl = `data:image/svg+xml;base64,${svg64}`;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const W = svgEl.clientWidth || svgEl.getAttribute("width") || 380;
      const H = svgEl.clientHeight || svgEl.getAttribute("height") || 540;
      canvas.width = W * scale;
      canvas.height = H * scale;
      const ctx = canvas.getContext("2d");
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, W, H);
      canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        resolve(url);
      }, "image/png");
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

const TYPE_SYMBOLS = {
  fire: "🔥", water: "💧", grass: "🌿", electric: "⚡", ice: "❄️",
  fighting: "👊", poison: "☠️", ground: "🌍", flying: "🦅",
  psychic: "🔮", bug: "🐛", rock: "🪨", ghost: "👻", dragon: "🐉",
  dark: "🌑", steel: "🔩", fairy: "🧚", normal: "⭐",
};

export default function CardMode({ pokemon, lang, thaiArr, jpArr, onClose }) {
  const cardRef = useRef(null);
  const [exporting, setExporting] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const mainType = pokemon.types[0]?.type.name ?? "normal";
  const secondType = pokemon.types[1]?.type.name;
  const color = typeColor(mainType);
  const color2 = secondType ? typeColor(secondType) : color;
  const name = getLocalName(pokemon.id, lang, thaiArr, jpArr) ?? pokemon.name;
  const img = getArt(pokemon);
  const total = pokemon.stats.reduce((a, st) => a + st.base_stat, 0);
  const hp = pokemon.stats.find(s => s.stat.name === "hp")?.base_stat ?? 0;
  const attack = pokemon.stats.find(s => s.stat.name === "attack")?.base_stat ?? 0;
  const defense = pokemon.stats.find(s => s.stat.name === "defense")?.base_stat ?? 0;
  const speed = pokemon.stats.find(s => s.stat.name === "speed")?.base_stat ?? 0;

  const typeName = (tn) =>
    lang === "th" ? (TYPE_NAMES_TH[tn] ?? tn) : lang === "ja" ? (TYPE_NAMES_JA[tn] ?? tn) : tn;

  // Get first 2 strongest moves
  const strongMoves = (pokemon.moves ?? []).slice(0, 2).map(m => ({
    name: m.move.name.replace(/-/g, " "),
  }));

  // Rarity based on total stats
  const rarity = total >= 600 ? "legendary" : total >= 500 ? "rare" : total >= 400 ? "uncommon" : "common";
  const rarityStars = rarity === "legendary" ? "★★★" : rarity === "rare" ? "★★" : rarity === "uncommon" ? "★" : "·";

  const handleExport = async () => {
    setExporting(true);
    try {
      // We need to use a different approach since SVG with foreign images is tricky
      // Use html2canvas-like approach with canvas rendering
      const card = cardRef.current;
      if (!card) return;

      // Use the browser's built-in screenshot capability via canvas
      const W = 380, H = 540;
      const canvas = document.createElement("canvas");
      canvas.width = W * 2;
      canvas.height = H * 2;
      const ctx = canvas.getContext("2d");
      ctx.scale(2, 2);

      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, color);
      grad.addColorStop(0.5, color2);
      grad.addColorStop(1, "#0d2a4a");
      ctx.fillStyle = grad;
      ctx.roundRect(0, 0, W, H, 22);
      ctx.fill();

      // Inner card area
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.roundRect(16, 70, W - 32, H - 90, 16);
      ctx.fill();

      // Header (name + HP)
      ctx.fillStyle = "#fff";
      ctx.font = "bold 28px sans-serif";
      ctx.fillText(name, 24, 44);
      ctx.font = "bold 22px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`HP ${hp}`, W - 24, 44);
      ctx.textAlign = "left";

      // Load and draw pokemon image
      const pImg = new Image();
      pImg.crossOrigin = "anonymous";
      await new Promise((res) => {
        pImg.onload = res;
        pImg.onerror = res;
        pImg.src = img;
      });
      if (pImg.width) {
        ctx.drawImage(pImg, (W - 220) / 2, 90, 220, 220);
      }

      // Stats footer
      ctx.fillStyle = "#0d2a4a";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText(`⚔ ATK ${attack}   🛡 DEF ${defense}   ⚡ SPD ${speed}`, 24, 360);

      // Moves
      ctx.font = "bold 14px sans-serif";
      strongMoves.forEach((m, i) => {
        ctx.fillText(`• ${m.name}`, 24, 400 + i * 24);
      });

      // ID + rarity
      ctx.font = "bold 11px sans-serif";
      ctx.fillStyle = "#7fa8c4";
      ctx.fillText(padId(pokemon.id), 24, H - 24);
      ctx.textAlign = "right";
      ctx.fillStyle = "#f5b900";
      ctx.font = "bold 14px sans-serif";
      ctx.fillText(rarityStars, W - 24, H - 24);

      // Download
      canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `pokemon-card-${pokemon.id}-${pokemon.name}.png`;
        a.click();
        URL.revokeObjectURL(url);
        setDownloaded(true);
        setTimeout(() => setDownloaded(false), 2500);
      }, "image/png");
    } catch (e) {
      console.error("Export error:", e);
    }
    setExporting(false);
  };

  return (
    <div className="card-mode-overlay" onClick={onClose}>
      <div className="card-mode-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} style={{ position: "absolute", top: 14, right: 14, zIndex: 20 }}>✕</button>

        {/* The TCG-style card */}
        <div ref={cardRef} className={`tcg-card tcg-rarity-${rarity}`} style={{
          background: secondType
            ? `linear-gradient(135deg, ${color} 0%, ${color2} 100%)`
            : `linear-gradient(135deg, ${color}, ${color}aa)`,
        }}>
          {/* Holographic overlay */}
          <div className="tcg-holo" />

          {/* Header */}
          <div className="tcg-header">
            <div className="tcg-name-row">
              <h2 className="tcg-name">{name}</h2>
              <div className="tcg-hp">
                <span className="tcg-hp-label">HP</span>
                <span className="tcg-hp-val">{hp}</span>
              </div>
            </div>
            <div className="tcg-types">
              {pokemon.types.map(t => (
                <span key={t.type.name} className="tcg-type-badge"
                  style={{ background: typeColor(t.type.name) }}>
                  <span className="tcg-type-icon">{TYPE_SYMBOLS[t.type.name] ?? "⭐"}</span>
                  {typeName(t.type.name)}
                </span>
              ))}
            </div>
          </div>

          {/* Image area */}
          <div className="tcg-image-frame" style={{
            background: `radial-gradient(circle at 50% 40%, ${color}33, ${color}00 70%)`,
          }}>
            {img && <img src={img} alt={name} className="tcg-image" crossOrigin="anonymous" />}
            <div className="tcg-id-badge">{padId(pokemon.id)}</div>
          </div>

          {/* Stats bar */}
          <div className="tcg-stats">
            <div className="tcg-stat">⚔ <strong>{attack}</strong> ATK</div>
            <div className="tcg-stat">🛡 <strong>{defense}</strong> DEF</div>
            <div className="tcg-stat">⚡ <strong>{speed}</strong> SPD</div>
          </div>

          {/* Moves */}
          <div className="tcg-moves">
            {strongMoves.map((m, i) => (
              <div key={i} className="tcg-move">
                <span className="tcg-move-dot">●</span>
                <span className="tcg-move-name">{m.name}</span>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="tcg-footer">
            <span className="tcg-total">Total: {total}</span>
            <span className="tcg-rarity">{rarityStars} {rarity.toUpperCase()}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="card-mode-actions">
          <button className="card-mode-btn" onClick={handleExport} disabled={exporting}>
            {exporting ? "⏳ Generating..." : downloaded ? "✅ Downloaded!" : "📥 Download as PNG"}
          </button>
          <button className="card-mode-btn card-mode-share" onClick={async () => {
            if (navigator.share) {
              try {
                await navigator.share({
                  title: `${name} - Pokémon Card`,
                  text: `Check out my ${name} card! ${rarityStars}`,
                  url: window.location.href,
                });
              } catch (e) {}
            } else {
              navigator.clipboard?.writeText(`${name} - Pokémon Card ${rarityStars}`);
              alert("Link copied!");
            }
          }}>
            📤 Share
          </button>
        </div>

        <div className="card-mode-info">
          {lang === "th" ? "🎴 การ์ดสะสมแบบ TCG · กดดาวน์โหลดเพื่อบันทึก PNG"
           : lang === "ja" ? "🎴 TCGスタイルのカード · PNGをダウンロード"
           : "🎴 TCG-style trading card · Click download to save as PNG"}
        </div>
      </div>
    </div>
  );
}
