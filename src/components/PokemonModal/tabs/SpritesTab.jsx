import SpriteTimeline from "../../SpriteTimeline.jsx";

export default function SpritesTab({ pokemonId, sprites, lang, s }) {
  return (
    <div>
      <div className="modal-section-title">{s.sprites}</div>
      <div className="sprites-grid">
        {[
          { src: sprites?.front_default, label: s.front },
          { src: sprites?.back_default,  label: s.back },
          { src: sprites?.front_shiny,   label: s.shiny },
          { src: sprites?.back_shiny,    label: s.shinyBack },
          { src: sprites?.front_female,  label: s.female },
          { src: sprites?.back_female,   label: s.femaleBack },
        ].filter(sp => sp.src).map((sp, i) => (
          <div key={i} className="sprite-cell">
            <img src={sp.src} alt={sp.label} className="sprite-img" loading="lazy" />
            <span className="sprite-label">{sp.label}</span>
          </div>
        ))}
      </div>
      {/* ⭐ Sprite Evolution Timeline */}
      <div style={{ marginTop: 28 }}>
        <SpriteTimeline pokemonId={pokemonId} lang={lang} />
      </div>
    </div>
  );
}
