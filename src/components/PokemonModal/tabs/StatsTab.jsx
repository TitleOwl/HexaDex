// Horizontal Stat Bars — modern stat visualization
function StatBars({ stats }) {
  const STAT_INFO = {
    "hp":              { label: "HP",   color: "#ef4444", glow: "rgba(239,68,68,0.35)"   },
    "attack":          { label: "ATK",  color: "#f97316", glow: "rgba(249,115,22,0.35)"  },
    "defense":         { label: "DEF",  color: "#eab308", glow: "rgba(234,179,8,0.35)"   },
    "special-attack":  { label: "SP.A", color: "#06b6d4", glow: "rgba(6,182,212,0.35)"   },
    "special-defense": { label: "SP.D", color: "#22c55e", glow: "rgba(34,197,94,0.35)"   },
    "speed":           { label: "SPD",  color: "#ec4899", glow: "rgba(236,72,153,0.35)"  },
  };
  const MAX = 200; // visual scale max (real max is 255 but most stats are <200)
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 6 }}>
      {stats.map(s => {
        const info = STAT_INFO[s.stat.name] ?? { label: s.stat.name, color: "#9c988e", glow: "rgba(148,163,184,0.3)" };
        const pct = Math.min(100, (s.base_stat / MAX) * 100);
        return (
          <div key={s.stat.name} style={{
            display: "grid",
            gridTemplateColumns: "56px 40px 1fr",
            alignItems: "center",
            gap: 14,
          }}>
            <div style={{
              fontSize: 10.5,
              fontWeight: 600,
              color: "var(--stat-lbl, #a89e8c)",
              letterSpacing: 2,
              textTransform: "uppercase",
            }}>
              {info.label}
            </div>
            <div style={{
              fontSize: 15,
              fontWeight: 400,
              color: "var(--stat-num, #3a352e)",
              textAlign: "right",
              fontVariantNumeric: "tabular-nums",
            }}>
              {s.base_stat}
            </div>
            <div style={{
              position: "relative",
              height: 4,
              background: "var(--stat-track, #ddd3c2)",
              borderRadius: 999,
              overflow: "hidden",
            }}>
              <div style={{
                position: "absolute",
                left: 0, top: 0, bottom: 0,
                width: `${pct}%`,
                background: "var(--stat-num, #3a352e)",
                borderRadius: 999,
                transition: "width 0.7s cubic-bezier(0.4, 0, 0.2, 1)",
              }} />
            </div>
          </div>
        );
      })}
      <style>{`
        :root { --stat-num: #3a352e; --stat-track: #ddd3c2; --stat-lbl: #a89e8c; }
        [data-theme="dark"] { --stat-num: #e7e1d6; --stat-track: #38332c; --stat-lbl: #8a8170; }
      `}</style>
    </div>
  );
}

export default function StatsTab({ stats, total, s }) {
  return (
    <div>
      <div className="modal-section-title">{s.baseStats}</div>
      <StatBars stats={stats} />
      <div className="stat-total-row">
        <span className="stat-total-label">{s.total}</span>
        <span className="stat-total-val">{total}</span>
      </div>
    </div>
  );
}
