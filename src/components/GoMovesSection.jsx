import { TYPE_NAMES_TH, TYPE_NAMES_JA } from "../data.js";
import { typeColor } from "../utils.js";

// Pokemon GO move data — curated for best movesets per type
const TYPE_BEST_MOVES = {
  fire:      { fast: "Fire Spin",     fastDPS: 13.6, fastEPS: 3.3,
               pvp:  "Aura Sphere",   pve: "Blast Burn",      coverage: "Solar Beam" },
  water:     { fast: "Waterfall",     fastDPS: 14.7, fastEPS: 2.7,
               pvp:  "Hydro Cannon",  pve: "Hydro Cannon",    coverage: "Ice Beam" },
  grass:     { fast: "Vine Whip",     fastDPS: 11.7, fastEPS: 4.0,
               pvp:  "Frenzy Plant",  pve: "Frenzy Plant",    coverage: "Sludge Bomb" },
  electric:  { fast: "Thunder Shock", fastDPS: 10.7, fastEPS: 4.0,
               pvp:  "Wild Charge",   pve: "Wild Charge",     coverage: "Volt Switch" },
  ice:       { fast: "Powder Snow",   fastDPS: 12.0, fastEPS: 4.0,
               pvp:  "Avalanche",     pve: "Avalanche",       coverage: "Ice Beam" },
  fighting:  { fast: "Counter",       fastDPS: 16.0, fastEPS: 3.5,
               pvp:  "Dynamic Punch", pve: "Aura Sphere",     coverage: "Power-Up Punch" },
  poison:    { fast: "Poison Jab",    fastDPS: 12.5, fastEPS: 3.5,
               pvp:  "Sludge Bomb",   pve: "Gunk Shot",       coverage: "Acid Spray" },
  ground:    { fast: "Mud Shot",      fastDPS: 7.5,  fastEPS: 4.5,
               pvp:  "Earthquake",    pve: "Earth Power",     coverage: "Stone Edge" },
  flying:    { fast: "Gust",          fastDPS: 11.5, fastEPS: 3.0,
               pvp:  "Sky Attack",    pve: "Brave Bird",      coverage: "Hurricane" },
  psychic:   { fast: "Confusion",     fastDPS: 14.2, fastEPS: 3.3,
               pvp:  "Psychic",       pve: "Psystrike",       coverage: "Shadow Ball" },
  bug:       { fast: "Fury Cutter",   fastDPS: 9.6,  fastEPS: 4.5,
               pvp:  "X-Scissor",     pve: "Megahorn",        coverage: "Bug Buzz" },
  rock:      { fast: "Smack Down",    fastDPS: 13.3, fastEPS: 2.7,
               pvp:  "Stone Edge",    pve: "Rock Slide",      coverage: "Stone Edge" },
  ghost:     { fast: "Shadow Claw",   fastDPS: 14.2, fastEPS: 3.3,
               pvp:  "Shadow Ball",   pve: "Shadow Ball",     coverage: "Shadow Punch" },
  dragon:    { fast: "Dragon Tail",   fastDPS: 13.7, fastEPS: 2.7,
               pvp:  "Outrage",       pve: "Draco Meteor",    coverage: "Dragon Claw" },
  dark:      { fast: "Snarl",         fastDPS: 12.3, fastEPS: 4.3,
               pvp:  "Foul Play",     pve: "Dark Pulse",      coverage: "Crunch" },
  steel:     { fast: "Metal Claw",    fastDPS: 9.6,  fastEPS: 3.5,
               pvp:  "Flash Cannon",  pve: "Meteor Mash",     coverage: "Iron Head" },
  fairy:     { fast: "Charm",         fastDPS: 16.0, fastEPS: 1.8,
               pvp:  "Moonblast",     pve: "Dazzling Gleam",  coverage: "Play Rough" },
  normal:    { fast: "Quick Attack",  fastDPS: 8.0,  fastEPS: 3.0,
               pvp:  "Body Slam",     pve: "Hyper Beam",      coverage: "Frustration" },
};

function getBestMoveset(pokemon) {
  const primaryType   = pokemon.types[0]?.type.name ?? "normal";
  const secondaryType = pokemon.types[1]?.type.name;
  const primary       = TYPE_BEST_MOVES[primaryType] ?? TYPE_BEST_MOVES.normal;
  const secondary     = secondaryType ? TYPE_BEST_MOVES[secondaryType] : null;

  return {
    fast: { name: primary.fast, type: primaryType, dps: primary.fastDPS, eps: primary.fastEPS },
    pvp:  { name: primary.pvp,  type: primaryType },
    pve:  { name: primary.pve,  type: primaryType },
    coverage: secondary
      ? { name: secondary.pve, type: secondaryType }
      : { name: primary.coverage, type: primaryType },
  };
}

export default function GoMovesSection({ pokemon, lang }) {
  const moveset = getBestMoveset(pokemon);

  const typeName = (tn) =>
    lang==="th" ? (TYPE_NAMES_TH[tn]??tn) : lang==="ja" ? (TYPE_NAMES_JA[tn]??tn) : tn;

  const labels = lang === "th" ? {
    title: "📋 Moveset แนะนำสำหรับ Pokémon GO",
    sub: "ท่าที่ดีที่สุดสำหรับ PvP / Raid / Coverage",
    fast: "⚡ Fast Move",
    fastDesc: "ท่าเร็ว · เก็บ Energy",
    pvp: "🏆 PvP Charge Move",
    pvpDesc: "Trainer Battle League",
    pve: "🔥 Raid/Gym Charge",
    pveDesc: "Damage สูงสุดสำหรับ Raid",
    coverage: "🛡️ Coverage Move",
    coverageDesc: "ครอบคลุมจุดอ่อน",
    tip: "💡 อ้างอิงจาก GO Hub meta · ใช้ Elite TM ปลดล็อค legacy moves ได้",
  } : lang === "ja" ? {
    title: "📋 ポケモンGO推奨わざ",
    sub: "PvP / レイド / コバレッジ最適",
    fast: "⚡ ノーマルアタック",
    fastDesc: "高速 · エネルギー蓄積",
    pvp: "🏆 PvP用スペシャル",
    pvpDesc: "トレーナーバトル",
    pve: "🔥 レイド用スペシャル",
    pveDesc: "レイド最大火力",
    coverage: "🛡️ サブアタック",
    coverageDesc: "弱点カバー",
    tip: "💡 GO Hubメタ基準 · わざマシンエリートで習得可能",
  } : {
    title: "📋 Best Pokémon GO Moveset",
    sub: "Recommended moves for PvP / Raid / Coverage",
    fast: "⚡ Fast Move",
    fastDesc: "Quick · Builds energy",
    pvp: "🏆 PvP Charge Move",
    pvpDesc: "Trainer Battle League",
    pve: "🔥 Raid/Gym Charge",
    pveDesc: "Max damage in raids",
    coverage: "🛡️ Coverage Move",
    coverageDesc: "Cover type weaknesses",
    tip: "💡 Based on GO Hub meta · Use Elite TM to unlock legacy moves",
  };

  return (
    <div className="go-moves-section">
      <div className="go-moves-header">
        <h3 className="go-moves-title">{labels.title}</h3>
        <p className="go-moves-sub">{labels.sub}</p>
      </div>

      <div className="go-moves-grid">
        {/* Fast Move */}
        <div className="go-move-cell go-move-fast"
          style={{ borderColor: typeColor(moveset.fast.type) }}>
          <div className="go-move-cell-header">
            <span className="go-move-cell-label">{labels.fast}</span>
            <span className="go-move-cell-type" style={{ background: typeColor(moveset.fast.type) }}>
              {typeName(moveset.fast.type)}
            </span>
          </div>
          <div className="go-move-cell-name">{moveset.fast.name}</div>
          <div className="go-move-cell-desc">{labels.fastDesc}</div>
          <div className="go-move-cell-stats">
            <span>⚡ DPS {moveset.fast.dps}</span>
            <span>🔋 EPS {moveset.fast.eps}</span>
          </div>
        </div>

        {/* PvP Charge */}
        <div className="go-move-cell go-move-pvp"
          style={{ borderColor: typeColor(moveset.pvp.type) }}>
          <div className="go-move-cell-header">
            <span className="go-move-cell-label">{labels.pvp}</span>
            <span className="go-move-cell-type" style={{ background: typeColor(moveset.pvp.type) }}>
              {typeName(moveset.pvp.type)}
            </span>
          </div>
          <div className="go-move-cell-name">{moveset.pvp.name}</div>
          <div className="go-move-cell-desc">{labels.pvpDesc}</div>
          <div className="go-move-cell-badge" style={{ background: "#b5302d" }}>
            ⚔️ Great / Ultra / Master League
          </div>
        </div>

        {/* PvE Charge */}
        <div className="go-move-cell go-move-pve"
          style={{ borderColor: typeColor(moveset.pve.type) }}>
          <div className="go-move-cell-header">
            <span className="go-move-cell-label">{labels.pve}</span>
            <span className="go-move-cell-type" style={{ background: typeColor(moveset.pve.type) }}>
              {typeName(moveset.pve.type)}
            </span>
          </div>
          <div className="go-move-cell-name">{moveset.pve.name}</div>
          <div className="go-move-cell-desc">{labels.pveDesc}</div>
          <div className="go-move-cell-badge" style={{ background: "#ef4444" }}>
            🐉 Raid Boss Slayer
          </div>
        </div>

        {/* Coverage */}
        <div className="go-move-cell go-move-coverage"
          style={{ borderColor: typeColor(moveset.coverage.type) }}>
          <div className="go-move-cell-header">
            <span className="go-move-cell-label">{labels.coverage}</span>
            <span className="go-move-cell-type" style={{ background: typeColor(moveset.coverage.type) }}>
              {typeName(moveset.coverage.type)}
            </span>
          </div>
          <div className="go-move-cell-name">{moveset.coverage.name}</div>
          <div className="go-move-cell-desc">{labels.coverageDesc}</div>
          <div className="go-move-cell-badge" style={{ background: "#f59e0b" }}>
            🎯 Secondary STAB
          </div>
        </div>
      </div>

      <div className="go-moves-tip">{labels.tip}</div>
    </div>
  );
}
