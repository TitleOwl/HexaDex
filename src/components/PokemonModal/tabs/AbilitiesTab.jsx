export default function AbilitiesTab({ abilities, s }) {
  return (
    <div>
      <div className="modal-section-title">{s.abilities}</div>
      <div className="abilities-grid">
        {abilities.map(a => (
          <span key={a.ability.name} className={`ability-chip${a.is_hidden ? " hidden-ability" : ""}`}>
            {a.ability.name.replace(/-/g, " ")}
            {a.is_hidden && <span className="hidden-label"> {s.hiddenAbility}</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
