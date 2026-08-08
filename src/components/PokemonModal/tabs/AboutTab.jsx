import { eggGroupName, abilityName, genusName } from "../../../pokeI18n.js";

// "About" tab — matches the reference layout: species/height/weight/
// abilities as simple label/value rows, then a "Breeding" section with
// gender ratio, egg groups, and egg cycle.
export default function AboutTab({ pokemon, species, s, lang }) {
  const speciesLabel = lang === "th" ? "ชนิด" : lang === "ja" ? "分類" : "Species";
  const metric = lang !== "en"; // ft/lbs mean nothing to TH/JA readers

  if (!species) return <div className="evo-loading">{s.evoLoading}</div>;

  // PokéAPI carries genera for en/ja (never th), so read the matching entry
  // and translate the English one for Thai.
  const apiLang = lang === "ja" ? "ja" : "en";
  const genus = species.genera?.find(g => g.language.name === apiLang)?.genus
    ?? species.genera?.find(g => g.language.name === "en")?.genus;
  // Genus is usually "X Pokémon" — the reference just shows "X".
  const cleanGenus = genus?.replace(/\s*(Pokémon|ポケモン)\s*$/i, "").trim() || genus;
  const localGenus = genusName(cleanGenus, lang);

  const genderRate = species.gender_rate;
  // gender_rate is in eighths-female; keep the .5 steps (e.g. ♀ 12.5%)
  const femaleChance = genderRate === -1 ? null : (genderRate / 8) * 100;
  const pct = (v) => (v % 1 === 0 ? v : v.toFixed(1));

  const meters = pokemon.height / 10;
  const kg = pokemon.weight / 10;
  const totalIn = meters * 39.3701;
  const feet = Math.floor(totalIn / 12);
  const inches = (totalIn - feet * 12).toFixed(1);
  const lbs = (kg * 2.20462).toFixed(1);

  // hatch_counter is egg CYCLES, not steps — a bare number reads as
  // meaningless, so spell out the unit and the approximate step count.
  const cycles = species.hatch_counter;
  const steps = cycles != null ? (cycles + 1) * 255 : null;
  const hatchLabel = lang === "th" ? "การฟักไข่" : lang === "ja" ? "タマゴサイクル" : "Egg Cycle";
  const hatchValue = cycles == null ? "—"
    : lang === "th" ? `${cycles} รอบ (≈ ${steps.toLocaleString()} ก้าว)`
    : lang === "ja" ? `${cycles} サイクル (約 ${steps.toLocaleString()} 歩)`
    : `${cycles} cycles (≈ ${steps.toLocaleString()} steps)`;

  const abilities = pokemon.abilities.map(a => {
    const name = abilityName(a.ability.name, lang);
    return a.is_hidden ? `${name} ${s.hiddenAbility}` : name;
  }).join(", ");

  const eggGroups = species.egg_groups?.map(g => eggGroupName(g.name, lang)).join(", ") || "—";

  return (
    <div className="about-tab">
      <div className="about-row">
        <span className="about-label">{speciesLabel}</span>
        <span className="about-val">{localGenus ?? "—"}</span>
      </div>
      <div className="about-row">
        <span className="about-label">{s.height}</span>
        <span className="about-val">
          {metric ? `${meters.toFixed(2)} m` : `${feet}'${inches}" (${meters.toFixed(2)} m)`}
        </span>
      </div>
      <div className="about-row">
        <span className="about-label">{s.weight}</span>
        <span className="about-val">
          {metric ? `${kg.toFixed(1)} kg` : `${lbs} lbs (${kg.toFixed(1)} kg)`}
        </span>
      </div>
      <div className="about-row">
        <span className="about-label">{s.abilities}</span>
        <span className="about-val">{abilities}</span>
      </div>

      <div className="about-section-title">{s.breeding}</div>
      <div className="about-row">
        <span className="about-label">{s.genderRatio}</span>
        <span className="about-val">
          {genderRate === -1 ? (
            s.genderless
          ) : (
            <>
              <span className="gender-m">♂</span> {pct(100 - femaleChance)}%
              <span className="gender-gap" aria-hidden />
              <span className="gender-f">♀</span> {pct(femaleChance)}%
            </>
          )}
        </span>
      </div>
      <div className="about-row">
        <span className="about-label">{s.eggGroups}</span>
        <span className="about-val">{eggGroups}</span>
      </div>
      <div className="about-row">
        <span className="about-label">{hatchLabel}</span>
        <span className="about-val">{hatchValue}</span>
      </div>
    </div>
  );
}
