import { TYPE_NAMES_TH, TYPE_NAMES_JA } from "../../../data.js";
import { typeColor, calcDefMatchups } from "../../../utils.js";

export default function TypeMatchupTab({ types, lang, s }) {
  const matchups = calcDefMatchups(types);
  const groups = {
    immune:  matchups.filter(m => m.mult === 0),
    quarter: matchups.filter(m => m.mult === 0.25),
    half:    matchups.filter(m => m.mult === 0.5),
    double:  matchups.filter(m => m.mult === 2),
    quad:    matchups.filter(m => m.mult === 4),
  };

  return (
    <div className="matchup-section">
      {[
        { key:"immune",  label:`${s.immune} (0×)`, tc:"#374151" },
        { key:"quarter", label:"¼×", tc:"#14532d" },
        { key:"half",    label:`${s.resist} (½×)`, tc:"#166534" },
        { key:"double",  label:`${s.weak} (2×)`, tc:"#9a3412" },
        { key:"quad",    label:"4×", tc:"#991b1b" },
      ].map(({ key, label, tc }) => groups[key].length === 0 ? null : (
        <div key={key} className="matchup-group">
          <div className="matchup-group-label" style={{ color:tc }}>{label}</div>
          <div className="matchup-pills">
            {groups[key].map(m => {
              const tn = m.type;
              const name = lang === "th" ? (TYPE_NAMES_TH[tn]??tn)
                         : lang === "ja" ? (TYPE_NAMES_JA[tn]??tn) : tn;
              return (
                <span key={tn} className="matchup-pill"
                  style={{ background:typeColor(tn), boxShadow:`0 2px 8px ${typeColor(tn)}55` }}>
                  {name}
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
