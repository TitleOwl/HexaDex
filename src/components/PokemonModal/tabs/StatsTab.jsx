import TypeMatchups from "./TypeMatchups.jsx";

// Length says HOW MUCH, color says WHICH STAT — two separate data
// dimensions. Stat colors are FIXED across every Pokémon (never the type
// color), so "the blue row is Sp. Atk" stays learnable page to page.
const STAT_META = {
  "hp":              { label: "HP",      abbr: "HP",  color: "#E24B5B" },
  "attack":          { label: "Attack",  abbr: "ATK", color: "#F0913E" },
  "defense":         { label: "Defense", abbr: "DEF", color: "#F5CB44" },
  "special-attack":  { label: "Sp. Atk", abbr: "SpA", color: "#6FC7EE" },
  "special-defense": { label: "Sp. Def", abbr: "SpD", color: "#8ED98A" },
  "speed":           { label: "Speed",   abbr: "SPD", color: "#F08497" },
};
const TOTAL_COLOR = "#4C57C8";

// Scale caps: 180 for single stats (most sit 40–130, so /255 would squash
// them into an unreadable stub) and 720 for the six-stat total.
const STAT_MAX  = 180;
const TOTAL_MAX = 720;
const AVERAGE   = 80; // marker position, shared by all six stat rows

function StatRow({ meta, value, max, delay, marker, thick }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className={`stat-row${thick ? " total" : ""}`}>
      <span className="stat-badge" style={{ background: meta.color }}>{meta.abbr}</span>
      <span className="stat-value">{value}</span>
      <div className="stat-track">
        <div
          className="stat-fill"
          style={{ width: `${pct}%`, background: meta.color, "--stagger": `${delay}ms` }}
        />
        {marker != null && (
          <span className="stat-marker" style={{ left: `${(marker / max) * 100}%` }} aria-hidden />
        )}
      </div>
    </div>
  );
}

export default function StatsTab({ stats, total, types, lang, s }) {
  const markerNote = lang === "th" ? `เส้น = ค่าเฉลี่ยทั่วไป (${AVERAGE})`
    : lang === "ja" ? `線 = 平均値 (${AVERAGE})`
    : `Line = typical average (${AVERAGE})`;

  return (
    <div>
      <div className="stat-rows">
        {stats.map((st, i) => {
          const meta = STAT_META[st.stat.name]
            ?? { label: st.stat.name, abbr: st.stat.name.slice(0, 3).toUpperCase(), color: TOTAL_COLOR };
          return (
            <StatRow
              key={st.stat.name}
              meta={meta}
              value={st.base_stat}
              max={STAT_MAX}
              delay={i * 40}
              marker={AVERAGE}
            />
          );
        })}
      </div>

      <div className="stat-total-wrap">
        <StatRow
          meta={{ label: s.total, abbr: "TOT", color: TOTAL_COLOR }}
          value={total}
          max={TOTAL_MAX}
          delay={240}
          thick
        />
      </div>

      <p className="stat-marker-note">{markerNote}</p>

      <TypeMatchups types={types} lang={lang} />
    </div>
  );
}
