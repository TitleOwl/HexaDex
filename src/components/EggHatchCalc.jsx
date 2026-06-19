// ─── EggHatchCalc — Pokémon GO egg hatch distance / time planner ──
// Pick how many eggs of each type you're incubating → see total walking
// distance, estimated time at your pace, and a per-egg breakdown.

import { useState } from "react";
import { Egg as EggIcon, Footprints, RotateCcw, Lightbulb, Minus, Plus, Box } from "lucide-react";

const WIKIA = "https://static.wikia.nocookie.net/pokemongo/images";
const EGG_TYPES = [
  { km: 1,  color: "#22c55e", img: "https://archives.bulbagarden.net/media/upload/c/c7/GO_Daily_Adventure_Egg.png",
    label: { en: "1 km", th: "1 กม.", ja: "1km" } },
  { km: 2,  color: "#10b981", img: `${WIKIA}/f/f2/Egg_2k.png/revision/latest?cb=20211208153113`,
    label: { en: "2 km", th: "2 กม.", ja: "2km" } },
  { km: 5,  color: "#f59e0b", img: `${WIKIA}/3/33/Egg_5k.png/revision/latest?cb=20211208153322`,
    label: { en: "5 km", th: "5 กม.", ja: "5km" } },
  { km: 7,  color: "#ec4899", img: `${WIKIA}/f/f5/Egg_7k.png/revision/latest?cb=20211208153329`,
    label: { en: "7 km", th: "7 กม.", ja: "7km" } },
  { km: 10, color: "#b5302d", img: `${WIKIA}/f/f6/Egg_10k.png/revision/latest?cb=20211208153343`,
    label: { en: "10 km", th: "10 กม.", ja: "10km" } },
  { km: 12, color: "#dc2626", img: `${WIKIA}/e/ee/Egg_12k.png/revision/latest?cb=20211208153349`,
    label: { en: "12 km", th: "12 กม.", ja: "12km" } },
];

// Incubator types (real Pokémon GO Wiki item images, CORS-open)
// factor = distance multiplier: Super hatches at 1.5× → needs only 2/3 distance
const INCUBATORS = [
  { id: "unlimited", factor: 1,       img: `${WIKIA}/a/a4/Incubator_Unlimited.png/revision/latest?cb=20170822025125`,
    label: { en: "Infinity", th: "ไม่จำกัด", ja: "無限" }, note: { en: "∞ uses", th: "ใช้ไม่จำกัด", ja: "無制限" } },
  { id: "standard",  factor: 1,       img: `${WIKIA}/d/db/Incubator_Limited.png/revision/latest?cb=20170822025124`,
    label: { en: "Standard", th: "ธรรมดา", ja: "通常" }, note: { en: "3 uses", th: "3 ครั้ง", ja: "3回" } },
  { id: "super",     factor: 1 / 1.5, img: `${WIKIA}/d/d5/Super_Incubator.png/revision/latest?cb=20170822025125`,
    label: { en: "Super", th: "ซูเปอร์", ja: "スーパー" }, note: { en: "×1.5 · 3 uses", th: "×1.5 · 3 ครั้ง", ja: "×1.5 · 3回" } },
];

// PoGO only counts distance up to ~10.5 km/h, so "pace" presets stay realistic
const PACES = [
  { id: "walk", kmh: 4,  label: { en: "Walk", th: "เดิน", ja: "徒歩" } },
  { id: "brisk", kmh: 6, label: { en: "Brisk", th: "เดินเร็ว", ja: "早歩き" } },
  { id: "jog", kmh: 9,  label: { en: "Jog", th: "วิ่งเหยาะ", ja: "ジョグ" } },
  { id: "bike", kmh: 10.5, label: { en: "Bike (cap)", th: "จักรยาน", ja: "自転車" } },
];

function EggThumb({ type, size = 40 }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <EggIcon size={size * 0.7} strokeWidth={2} style={{ color: type.color }} />;
  return (
    <img src={type.img} alt="" width={size} height={size} loading="lazy" referrerPolicy="no-referrer"
      style={{ objectFit: "contain", display: "block", flexShrink: 0,
               filter: "drop-shadow(0 3px 5px rgba(0,0,0,0.16))" }}
      onError={() => setFailed(true)} />
  );
}

function IncImg({ src, size = 22 }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <Box size={Math.round(size * 0.8)} strokeWidth={2.2} />;
  return (
    <img src={src} alt="" width={size} height={size} loading="lazy" referrerPolicy="no-referrer"
      style={{ objectFit: "contain", display: "block", flexShrink: 0 }}
      onError={() => setFailed(true)} />
  );
}

export default function HatchPlannerPanel({ lang = "en" }) {
  const t = (th, en, ja) => lang === "th" ? th : lang === "ja" ? (ja ?? en) : en;

  const [counts, setCounts] = useState({}); // { km: n }
  const [paceId, setPaceId] = useState("walk");
  const [incubators, setIncubators] = useState(1);
  const [incType, setIncType] = useState("unlimited");
  const pace = PACES.find(p => p.id === paceId) ?? PACES[0];
  const inc = INCUBATORS.find(i => i.id === incType) ?? INCUBATORS[0];

  const setCount = (km, v) => setCounts(c => ({ ...c, [km]: Math.max(0, Math.min(99, v)) }));
  const reset = () => { setCounts({}); };

  const totalEggs = EGG_TYPES.reduce((s, e) => s + (counts[e.km] || 0), 0);
  const rawKm = EGG_TYPES.reduce((s, e) => s + (counts[e.km] || 0) * e.km, 0);
  const maxKm = EGG_TYPES.reduce((m, e) => (counts[e.km] || 0) > 0 ? Math.max(m, e.km) : m, 0);
  // Super Incubator hatches at 1.5× → only 2/3 of the distance needed
  const factor = inc.factor;
  // Eggs in active incubators progress in parallel as you walk → actual walk
  // distance ≈ max(longest egg, total egg-distance / incubators)
  const nInc = Math.max(1, incubators);
  const walkKm = Math.max(maxKm, rawKm / nInc) * factor;
  const totalKm = walkKm; // distance the player actually walks
  const hours = totalKm / pace.kmh;
  const fmtTime = (h) => {
    if (h <= 0) return "0m";
    const d = Math.floor(h / 24), hh = Math.floor(h % 24), m = Math.round((h % 1) * 60);
    if (d > 0) return `${d}d ${hh}h`;
    if (hh > 0) return `${hh}h ${m}m`;
    return `${m}m`;
  };

  return (
    <div>
      <style>{`
        :root { --eh-bg:#fff; --eh-fg:#1f1d20; --eh-muted:#7a766e; --eh-card:#f4f2ec; --eh-border:#e5e0d5; }
        [data-theme="dark"] { --eh-bg:#1a1816; --eh-fg:#efece4; --eh-muted:#9c988e; --eh-card:#211f20; --eh-border:#2c2926; }
        .eh-step { width:30px; height:30px; border-radius:9px; border:1px solid var(--eh-border);
          background:var(--eh-bg); color:var(--eh-fg); cursor:pointer; display:inline-flex;
          align-items:center; justify-content:center; transition:all .15s; }
        .eh-step:hover { border-color:var(--blue); color:var(--blue); }
        .eh-step:disabled { opacity:.4; cursor:default; }
        .eh-pace { padding:7px 14px; border-radius:999px; border:1px solid var(--eh-border);
          background:var(--eh-card); color:var(--eh-fg); font-weight:700; font-size:12px; cursor:pointer;
          transition:all .18s; }
        .eh-pace.active { background:var(--blue); border-color:var(--blue); color:#fff; }
        .eh-inc { display:inline-flex; align-items:center; gap:9px; padding:9px 13px 9px 10px;
          border-radius:13px; border:1px solid var(--eh-border); background:var(--eh-card);
          cursor:pointer; transition:all .18s; }
        .eh-inc:hover { border-color:var(--blue); }
        .eh-inc.active { border-color:var(--blue); background:color-mix(in srgb, var(--blue) 9%, var(--eh-bg));
          box-shadow:inset 0 0 0 1px var(--blue); }
        .eh-inc-text { display:flex; flex-direction:column; align-items:flex-start; line-height:1.1; }
        .eh-inc-name { font-size:12.5px; font-weight:800; color:var(--eh-fg); }
        .eh-inc-note { font-size:9.5px; font-weight:600; color:var(--eh-muted); margin-top:2px; }
        .eh-section { display:flex; align-items:center; gap:8px; font-size:13px; font-weight:800;
          color:var(--eh-fg); margin-bottom:10px; letter-spacing:-0.01em; }
        .eh-num { width:20px; height:20px; border-radius:50%; flex-shrink:0; background:var(--blue);
          color:#fff; font-size:11px; font-weight:900; display:inline-flex; align-items:center; justify-content:center; }
        .eh-egg-row { display:flex; align-items:center; gap:14px; padding:12px 14px; border-radius:14px;
          background:var(--eh-card); border:1px solid var(--eh-border); }
      `}</style>

        {/* ─── Result banner (always on top, updates live) ─── */}
        <div style={{
          display: "flex", alignItems: "center", gap: 14,
          background: totalEggs ? "color-mix(in srgb, var(--blue) 9%, var(--eh-bg))" : "var(--eh-card)",
          border: `1px solid ${totalEggs ? "color-mix(in srgb, var(--blue) 32%, transparent)" : "var(--eh-border)"}`,
          borderRadius: 19, padding: "16px 18px", marginBottom: 20,
        }}>
          <div style={{ width: 48, height: 48, borderRadius: 17, flexShrink: 0,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            background: totalEggs ? "var(--blue)" : "var(--eh-border)", color: "#fff" }}>
            <Footprints size={24} strokeWidth={2.2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {totalEggs ? (
              <>
                <div style={{ fontSize: 23, fontWeight: 900, color: "var(--eh-fg)", letterSpacing: "-0.02em",
                              fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>
                  {t("เดิน", "Walk", "歩く")} {Math.round(walkKm)} km
                  <span style={{ fontSize: 15, fontWeight: 700, color: "var(--eh-muted)" }}>  ·  ≈ {fmtTime(hours)}</span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--eh-muted)", marginTop: 4 }}>
                  {totalEggs} {t("ฟอง", "eggs", "個")}
                  {nInc > 1 ? ` · ${t("ฟัก", "hatch", "孵化")} ${Math.min(nInc, totalEggs)} ${t("ฟองพร้อมกัน", "at once", "同時")}` : ""}
                  {factor < 1 ? "  ·  Super ×1.5" : ""}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--eh-muted)" }}>
                {t("เพิ่มไข่ด้านล่างเพื่อเริ่มคำนวณ", "Add eggs below to start", "下でタマゴを追加")}
              </div>
            )}
          </div>
        </div>

        {/* ① Your eggs */}
        <div className="eh-section">
          <span className="eh-num">1</span> {t("ใส่จำนวนไข่ที่มี", "Add your eggs", "タマゴを追加")}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 6 }}>
          {EGG_TYPES.map(e => {
            const n = counts[e.km] || 0;
            const sub = n * e.km;
            return (
              <div key={e.km} className="eh-egg-row">
                <EggThumb type={e} size={42} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "var(--eh-fg)" }}>
                    {e.label[lang] ?? e.label.en}
                  </div>
                  {n > 0 && (
                    <div style={{ fontSize: 11, fontWeight: 700, color: e.color, marginTop: 1 }}>
                      = {sub} km
                    </div>
                  )}
                </div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <button className="eh-step" onClick={() => setCount(e.km, n - 1)} disabled={n === 0}
                    aria-label="minus"><Minus size={15} strokeWidth={2.6} /></button>
                  <span style={{ minWidth: 22, textAlign: "center", fontWeight: 900, fontSize: 16,
                                 color: "var(--eh-fg)", fontVariantNumeric: "tabular-nums" }}>{n}</span>
                  <button className="eh-step" onClick={() => setCount(e.km, n + 1)}
                    aria-label="plus"><Plus size={15} strokeWidth={2.6} /></button>
                </div>
              </div>
            );
          })}
        </div>

        {/* ② Incubator & pace */}
        <div className="eh-section" style={{ marginTop: 20 }}>
          <span className="eh-num">2</span> {t("ตัวฟักไข่ & ความเร็วเดิน", "Incubator & pace", "孵化装置 & ペース")}
        </div>

        {/* incubator type */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {INCUBATORS.map(it => (
            <button key={it.id} className={`eh-inc${incType === it.id ? " active" : ""}`}
              onClick={() => setIncType(it.id)}>
              <IncImg src={it.img} size={30} />
              <span className="eh-inc-text">
                <span className="eh-inc-name">{it.label[lang] ?? it.label.en}</span>
                <span className="eh-inc-note">{it.note[lang] ?? it.note.en}</span>
              </span>
            </button>
          ))}
        </div>

        {/* running at once + pace, on one tidy row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 4 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: "var(--eh-muted)" }}>
              {t("ฟักพร้อมกัน", "Run at once", "同時")}
            </span>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <button className="eh-step" onClick={() => setIncubators(n => Math.max(1, n - 1))} disabled={incubators <= 1}
                aria-label="fewer"><Minus size={15} strokeWidth={2.6} /></button>
              <span style={{ minWidth: 22, textAlign: "center", fontWeight: 900, fontSize: 16, color: "var(--eh-fg)",
                             fontVariantNumeric: "tabular-nums" }}>{incubators}</span>
              <button className="eh-step" onClick={() => setIncubators(n => Math.min(20, n + 1))}
                aria-label="more"><Plus size={15} strokeWidth={2.6} /></button>
            </div>
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <Footprints size={14} strokeWidth={2.2} style={{ color: "var(--eh-muted)" }} />
            {PACES.map(p => (
              <button key={p.id} className={`eh-pace${paceId === p.id ? " active" : ""}`}
                onClick={() => setPaceId(p.id)}>
                {p.label[lang] ?? p.label.en}
              </button>
            ))}
          </div>
        </div>

        {/* Actions + tip */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginTop: 16 }}>
          <div style={{ fontSize: 11, color: "var(--eh-muted)", fontWeight: 600,
                        display: "inline-flex", alignItems: "flex-start", gap: 6, lineHeight: 1.4 }}>
            <Lightbulb size={13} strokeWidth={2.2} style={{ flexShrink: 0, marginTop: 1, color: "var(--blue)" }} />
            {t("เปิด Adventure Sync ให้ระยะนับตอนไม่ได้เปิดเกม · เกมนับสูงสุด ~10.5 กม./ชม.",
               "Enable Adventure Sync to track distance with the app closed · game caps at ~10.5 km/h",
               "アドベンチャーシンクで距離を記録 · 上限 約10.5km/h")}
          </div>
          {totalEggs > 0 && (
            <button onClick={reset} style={{
              padding: "8px 13px", borderRadius: 999, border: "1px solid var(--eh-border)",
              background: "var(--eh-card)", color: "var(--eh-muted)", fontWeight: 700, fontSize: 12,
              cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0,
            }}>
              <RotateCcw size={13} strokeWidth={2.2} /> {t("ล้าง", "Reset", "リセット")}
            </button>
          )}
        </div>
    </div>
  );
}
