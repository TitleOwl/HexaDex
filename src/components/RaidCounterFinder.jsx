import { useState, useMemo, useCallback, useEffect } from "react";
import { Target, X, Swords, AlertTriangle, RefreshCw, Trophy, Zap, Lightbulb } from "lucide-react";
import { STRINGS, TYPE_NAMES_TH, TYPE_NAMES_JA, TYPE_OFFENSE } from "../data.js";
import { typeColor, getArt, getLocalName, useDebouncedValue, padId } from "../utils.js";

// Suggested raid bosses (legendary pool)
const POPULAR_RAID_BOSSES = [
  150, 151, 144, 145, 146,        // Mewtwo, Mew, Articuno, Zapdos, Moltres
  249, 250, 243, 244, 245,        // Lugia, Ho-Oh, Raikou, Entei, Suicune
  382, 383, 384,                  // Kyogre, Groudon, Rayquaza
  483, 484, 487,                  // Dialga, Palkia, Giratina
  643, 644, 646,                  // Reshiram, Zekrom, Kyurem
  716, 717, 718,                  // Xerneas, Yveltal, Zygarde
  789, 791, 792,                  // Cosmog, Solgaleo, Lunala
  888, 889, 890,                  // Zacian, Zamazenta, Eternatus
];

// Get ATK and DEF (Pokemon GO style) for ranking
function getGoStats(p) {
  const atk = p.stats.find(s => s.stat.name === "attack")?.base_stat ?? 50;
  const spa = p.stats.find(s => s.stat.name === "special-attack")?.base_stat ?? 50;
  const def = p.stats.find(s => s.stat.name === "defense")?.base_stat ?? 50;
  const spd = p.stats.find(s => s.stat.name === "special-defense")?.base_stat ?? 50;
  return {
    goAtk: Math.max(atk, spa),
    goDef: (def + spd) / 2,
    primaryType: p.types[0]?.type.name,
  };
}

// Score each potential counter against the boss
function scoreCounter(counter, boss) {
  const counterStats = getGoStats(counter);
  const bossTypes = boss.types.map(t => t.type.name);

  // Best offensive type match this counter can hit boss with
  const counterTypes = counter.types.map(t => t.type.name);
  let bestEff = 0;
  counterTypes.forEach(ct => {
    let eff = 1;
    bossTypes.forEach(bt => { eff *= TYPE_OFFENSE[ct]?.[bt] ?? 1; });
    if (eff > bestEff) bestEff = eff;
  });

  // Boss attacking counter — penalty if super effective
  let bossDamage = 1;
  bossTypes.forEach(bt => {
    counterTypes.forEach(ct => { bossDamage *= TYPE_OFFENSE[bt]?.[ct] ?? 1; });
  });

  // DPS estimate: ATK × effectiveness
  const dps = counterStats.goAtk * bestEff;
  // TDO estimate: DPS × time alive (defense + HP) / boss damage taken
  const survivability = counterStats.goDef / Math.max(0.5, bossDamage);
  const tdo = dps * survivability * 0.1; // scaled

  return {
    dps: dps.toFixed(0),
    tdo: tdo.toFixed(0),
    eff: bestEff,
    bossEff: bossDamage,
    rating: dps * (1 + survivability * 0.05),
    bestType: counterTypes.reduce((best, ct) => {
      let eff = 1;
      bossTypes.forEach(bt => { eff *= TYPE_OFFENSE[ct]?.[bt] ?? 1; });
      return eff > (best.eff ?? 0) ? { type: ct, eff } : best;
    }, {}),
  };
}

export default function RaidCounterFinder({ allList, loaded, thaiArr, jpArr, lang, cachedFetch, onClose, onOpenPokemon }) {
  const s = STRINGS[lang];
  const [boss, setBoss] = useState(null);
  const [picking, setPicking] = useState(true);
  const [search, setSearch] = useState("");
  const debSearch = useDebouncedValue(search, 200);

  const allWithMeta = useMemo(() => {
    return allList.map(p => {
      const id = parseInt(p.url.split("/").filter(Boolean).pop(), 10);
      return { name: p.name, url: p.url, id };
    }).filter(p => p.id && p.id <= 1025);
  }, [allList]);

  const results = useMemo(() => {
    const q = debSearch.toLowerCase().trim();
    if (!q) {
      // Show popular bosses first
      const popularEntries = POPULAR_RAID_BOSSES
        .map(id => allWithMeta.find(p => p.id === id))
        .filter(Boolean);
      return popularEntries.slice(0, 30);
    }
    return allWithMeta.filter(p => {
      const th = (getLocalName(p.id, "th", thaiArr, jpArr) ?? "").toLowerCase();
      const ja = (getLocalName(p.id, "ja", thaiArr, jpArr) ?? "").toLowerCase();
      return p.name.toLowerCase().includes(q) || th.includes(q) || ja.includes(q) || String(p.id).includes(q);
    }).slice(0, 30);
  }, [debSearch, allWithMeta, thaiArr, jpArr]);

  const handlePickBoss = useCallback(async (entry) => {
    const full = await cachedFetch(entry.url);
    setBoss(full);
    setPicking(false);
  }, [cachedFetch]);

  // Score all loaded pokemon as counters
  const counters = useMemo(() => {
    if (!boss || loaded.length === 0) return [];
    const scored = loaded
      .filter(p => p.id !== boss.id && p.id <= 1025)
      .map(p => ({ pokemon: p, ...scoreCounter(p, boss) }))
      .filter(c => c.eff >= 1) // at least neutral
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 18);
    return scored;
  }, [boss, loaded]);

  const typeName = (tn) =>
    lang==="th" ? (TYPE_NAMES_TH[tn]??tn) : lang==="ja" ? (TYPE_NAMES_JA[tn]??tn) : tn;

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 9000,
      background: "rgba(20, 19, 22, 0.55)",
      backdropFilter: "blur(8px)",
      overflowY: "auto", padding: "20px 12px",
    }}>
      <style>{`
        :root { --rcf-bg: #fff; --rcf-fg: #1f1d20; --rcf-muted: #7a766e; }
        [data-theme="dark"] { --rcf-bg: #1a1816; --rcf-fg: #efece4; --rcf-muted: #9c988e; }
      `}</style>
      <div onClick={(e) => e.stopPropagation()} style={{
        maxWidth: 1100, margin: "0 auto",
        background: "var(--rcf-bg, #fff)",
        borderRadius: 20, padding: 18,
        boxShadow: "0 24px 60px rgba(20,19,22,0.3)",
        border: "1px solid var(--border)",
        position: "relative",
      }}>
        {/* Sticky top bar with close button */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 14, padding: "4px",
          position: "sticky", top: 0, zIndex: 10,
          background: "var(--rcf-bg, #fff)",
        }}>
          <div>
            <h1 style={{ fontSize: 21, fontWeight: 800, margin: 0,
                         color: "var(--rcf-fg, #1f1d20)", letterSpacing: "-0.01em",
                         display: "inline-flex", alignItems: "center", gap: 9 }}>
              <Target size={20} strokeWidth={2.2} style={{ color: "var(--blue)" }} /> Raid Counter Finder
            </h1>
            <div style={{ fontSize: 12, color: "var(--rcf-muted, #7a766e)", marginTop: 4, fontWeight: 600 }}>
              {lang==="th" ? "หาตัวสู้ที่ดีที่สุดสำหรับ Raid Boss"
               : lang==="ja" ? "レイドボス対策"
               : "Find optimal counters for any raid boss"}
            </div>
          </div>
          <button onClick={onClose} style={{
            padding: "8px 14px", borderRadius: 999, cursor: "pointer", flexShrink: 0,
            background: "var(--bg-muted)", border: "1px solid var(--border)",
            color: "var(--rcf-fg)", fontWeight: 700, fontSize: 13,
            display: "inline-flex", alignItems: "center", gap: 6,
          }}>
            <X size={15} strokeWidth={2.4} /> {lang==="th" ? "ปิด" : lang==="ja" ? "閉じる" : "Close"}
          </button>
        </div>

        {picking ? (
          <>
            {!debSearch && (
              <div className="raid-popular-label" style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                <Swords size={15} strokeWidth={2.2} /> {lang==="th"?"Raid Boss ยอดนิยม":lang==="ja"?"人気のレイドボス":"Popular Raid Bosses"}
              </div>
            )}
            <input className="team-add-search" placeholder={s.searchPlaceholder}
              value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
            <div className="team-add-grid">
              {results.map(p => {
                const name = getLocalName(p.id, lang, thaiArr, jpArr) ?? p.name;
                const img = `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/other/official-artwork/${p.id}.png`;
                return (
                  <button key={p.id} className="team-add-card" onClick={() => handlePickBoss(p)}>
                    <img src={img} alt={name} className="team-add-img" loading="lazy" />
                    <span className="team-add-num">#{String(p.id).padStart(4,"0")}</span>
                    <span className="team-add-name">{name}</span>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <div className="raid-boss-card" style={{
              background: `linear-gradient(135deg, ${typeColor(boss.types[0]?.type.name)}, ${typeColor(boss.types[1]?.type.name ?? boss.types[0]?.type.name)})`,
            }}>
              <img src={getArt(boss)} alt={boss.name} className="raid-boss-img" />
              <div className="raid-boss-info">
                <div className="raid-boss-label" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><AlertTriangle size={12} strokeWidth={2.4} /> RAID BOSS</div>
                <div className="raid-boss-name">
                  {getLocalName(boss.id, lang, thaiArr, jpArr) ?? boss.name}
                </div>
                <div className="raid-boss-types">
                  {boss.types.map(t => (
                    <span key={t.type.name} className="modal-type-tag">
                      {typeName(t.type.name)}
                    </span>
                  ))}
                </div>
              </div>
              <button className="iv-change-btn" onClick={() => setPicking(true)}><RefreshCw size={15} strokeWidth={2.4} /></button>
            </div>

            {counters.length === 0 ? (
              <div className="iv-empty">
                {lang==="th"?"กำลังประมวลผล — โหลดโปเกมอนเพิ่มก่อน":
                 "Load more Pokémon from the Pokédex first"}
              </div>
            ) : (
              <>
                <div className="modal-section-title" style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                  <Trophy size={15} strokeWidth={2.2} /> {lang==="th"?"ตัวสู้ที่แนะนำ Top 18":lang==="ja"?"おすすめ対策 Top 18":"Top 18 Counters"}
                </div>
                <div className="raid-counters-grid">
                  {counters.map((c, i) => {
                    const p = c.pokemon;
                    const name = getLocalName(p.id, lang, thaiArr, jpArr) ?? p.name;
                    const color = typeColor(p.types[0]?.type.name);
                    return (
                      <button key={p.id} className="raid-counter-card"
                        onClick={() => onOpenPokemon?.(p)}
                        style={{ borderColor: color }}>
                        <div className="raid-counter-rank">{i + 1}</div>
                        <img src={getArt(p)} alt={name} className="raid-counter-img" />
                        <div className="raid-counter-name">{name}</div>
                        <div className="raid-counter-stats">
                          <span className="raid-stat-dps" style={{ display: "inline-flex", alignItems: "center", gap: 3 }}><Zap size={11} strokeWidth={2.6} /> DPS {c.dps}</span>
                        </div>
                        {c.bestType.type && c.bestType.eff >= 2 && (
                          <div className="raid-counter-move"
                            style={{ background: typeColor(c.bestType.type) }}>
                            ×{c.bestType.eff} {typeName(c.bestType.type)}
                          </div>
                        )}
                        {c.bossEff >= 2 && (
                          <div className="raid-counter-warn" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><AlertTriangle size={11} strokeWidth={2.4} /> Weak to {boss.types.map(t => typeName(t.type.name)).join("/")}</div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="raid-help" style={{ display: "inline-flex", alignItems: "flex-start", gap: 6 }}>
                  <Lightbulb size={13} strokeWidth={2.2} style={{ flexShrink: 0, marginTop: 1 }} /> {lang==="th"?"คะแนนคำนวณจาก ATK × ประสิทธิภาพธาตุ × ความอึด (กดเพื่อดูรายละเอียด)":
                      lang==="ja"?"ATK × タイプ相性 × 耐久 で計算":
                      "Score = ATK × Type effectiveness × Survivability · Click to view details"}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}