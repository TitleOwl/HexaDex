import SpriteTimeline from "../../SpriteTimeline.jsx";

export default function SpritesTab({ pokemonId, sprites, lang, s }) {
  return (
    <div>
      {/* Sprite evolution leads the tab: it is the one view here you cannot
          get anywhere else, and it was sitting underneath six thumbnails of
          the same Pokémon. The static set follows it. */}
      <div className="sprite-timeline-lead">
        <SpriteTimeline pokemonId={pokemonId} lang={lang} />
      </div>

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
    </div>
  );
}
