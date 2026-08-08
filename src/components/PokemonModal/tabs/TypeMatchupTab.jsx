import { TYPE_NAMES_TH, TYPE_NAMES_JA } from "../../../data.js";
import { calcDefMatchups } from "../../../utils.js";
import { pastelTypeColor } from "../palette.js";

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
        { key:"immune",  label:`${s.immune} (0×)`, tc:"#8F9396" },
        { key:"quarter", label:"¼×", tc:"#2FA98C" },
        { key:"half",    label:`${s.resist} (½×)`, tc:"#2FA98C" },
        { key:"double",  label:`${s.weak} (2×)`, tc:"#E05B5B" },
        { key:"quad",    label:"4×", tc:"#C74444" },
      ].map(({ key, label, tc }) => groups[key].length === 0 ? null : (
        <div key={key} className="matchup-group">
          <div className="matchup-group-label" style={{ color:tc }}>{label}</div>
          <div className="matchup-pills">
            {groups[key].map(m => {
              const tn = m.type;
              const name = lang === "th" ? (TYPE_NAMES_TH[tn]??tn)
                         : lang === "ja" ? (TYPE_NAMES_JA[tn]??tn) : tn;
              return (
                <span key={tn} className="matchup-pill" style={{ background: pastelTypeColor(tn) }}>
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
