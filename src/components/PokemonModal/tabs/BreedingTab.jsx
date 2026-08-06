import { STAT_LABELS } from "../../../data.js";

export default function BreedingTab({ species, pokemon, s }) {
  if (!species) return <div className="evo-loading">{s.evoLoading}</div>;
  const genderRate = species.gender_rate;
  const femaleChance = genderRate === -1 ? null : Math.round((genderRate / 8) * 100);
  const hatchSteps = species.hatch_counter ? (species.hatch_counter + 1) * 255 : null;
  const evYield = pokemon.stats.filter(st => st.effort > 0);

  return (
    <div className="breeding-section">
      {evYield.length > 0 && (
        <div className="breed-block">
          <div className="modal-section-title">{s.evYield}</div>
          <div className="ev-yield-row">
            {evYield.map(st => (
              <div key={st.stat.name} className="ev-chip">
                <span className="ev-chip-val">+{st.effort}</span>
                <span className="ev-chip-stat">{STAT_LABELS[st.stat.name]??st.stat.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="breed-block">
        <div className="modal-section-title">{s.eggGroups}</div>
        <div className="abilities-grid">
          {species.egg_groups?.map(g => (
            <span key={g.name} className="ability-chip">{g.name.replace(/-/g," ")}</span>
          ))}
        </div>
      </div>
      <div className="breed-block">
        <div className="modal-section-title">{s.genderRatio}</div>
        {genderRate === -1 ? (
          <span className="ability-chip">{s.genderless}</span>
        ) : (
          <div className="gender-bar">
            {femaleChance < 100 && (
              <div className="gender-male" style={{ width:`${100-femaleChance}%` }}>
                {s.male} {100-femaleChance}%
              </div>
            )}
            {femaleChance > 0 && (
              <div className="gender-female" style={{ width:`${femaleChance}%` }}>
                {s.female2} {femaleChance}%
              </div>
            )}
          </div>
        )}
      </div>
      {hatchSteps && (
        <div className="breed-block">
          <div className="modal-section-title">{s.hatchTime}</div>
          <div className="breed-info-row">
            <span className="info-pill" style={{ display:"inline-block", padding:"10px 18px" }}>
              <div className="info-pill-label">{s.hatchTime}</div>
              <div className="info-pill-val">{hatchSteps.toLocaleString()} {s.steps}</div>
            </span>
            <span className="info-pill" style={{ display:"inline-block", padding:"10px 18px" }}>
              <div className="info-pill-label">{s.captureRate}</div>
              <div className="info-pill-val">{species.capture_rate}</div>
            </span>
            <span className="info-pill" style={{ display:"inline-block", padding:"10px 18px" }}>
              <div className="info-pill-label">{s.happiness}</div>
              <div className="info-pill-val">{species.base_happiness ?? "—"}</div>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
