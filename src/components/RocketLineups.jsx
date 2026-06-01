// ─── RocketLineups — Team GO Rocket guide ─────
// NOTE: ScrapedDuck does NOT provide rocket-lineups data (only raids/events/eggs/research)
// So this component provides:
//   • Static character info + classic team archetypes
//   • Direct link to LeekDuck for latest monthly rotation
//   • Type counter cheat sheet for grunts

import { useModalLifecycle } from "../perfUtils.js";

const TYPE_COLORS = {
  normal: "#A8A878", fire: "#F08030", water: "#6890F0", electric: "#F8D030",
  grass: "#78C850", ice: "#98D8D8", fighting: "#C03028", poison: "#A040A0",
  ground: "#E0C068", flying: "#A890F0", psychic: "#F85888", bug: "#A8B820",
  rock: "#B8A038", ghost: "#705898", dragon: "#7038F8", dark: "#705848",
  steel: "#B8B8D0", fairy: "#EE99AC",
};

const CHARACTERS = [
  {
    id: "giovanni",
    name: "Giovanni",
    role: { en: "Team GO Rocket Boss", th: "หัวหน้าใหญ่ Team GO Rocket", ja: "サカキ (ボス)" },
    color: "#dc2626",
    bg: "linear-gradient(135deg, #ef4444, #991b1b)",
    quote: { en: "I will not tolerate your interference.",
             th: "ฉันจะไม่ยอมให้แกขัดขวาง",
             ja: "邪魔はさせない" },
    description: { en: "Final boss · Uses a Shadow Legendary Pokémon",
                   th: "บอสตัวสุดท้าย · ใช้ Shadow Legendary",
                   ja: "最終ボス · シャドウ伝説を使用" },
    typical: ["Persian (Normal)", "Shadow Legendary"],
  },
  {
    id: "sierra",
    name: "Sierra",
    role: { en: "Rocket Leader", th: "หัวหน้าทีม Sierra", ja: "シエラ" },
    color: "#f59e0b",
    bg: "linear-gradient(135deg, #fbbf24, #d97706)",
    quote: { en: "I envy you—you get to battle me!",
             th: "อิจฉาเธอจัง — ได้สู้กับฉัน!",
             ja: "私と戦えるなんてうらやましいわ" },
    description: { en: "Aggressive Dark/Dragon-focused lineups",
                   th: "ทีมเน้นธาตุมืด/มังกร",
                   ja: "悪・ドラゴン中心の編成" },
    typical: ["Dark", "Dragon"],
  },
  {
    id: "arlo",
    name: "Arlo",
    role: { en: "Rocket Leader", th: "หัวหน้าทีม Arlo", ja: "アロエ" },
    color: "#3b82f6",
    bg: "linear-gradient(135deg, #60a5fa, #1d4ed8)",
    quote: { en: "It's time to learn your place in the world.",
             th: "ถึงเวลาที่เธอต้องรู้ที่ของตัวเอง",
             ja: "自分の立場をわきまえな" },
    description: { en: "Fast-hitting Flying & Bug specialists",
                   th: "เน้นบินและแมลงตีเร็ว",
                   ja: "ひこう・むしの高速攻撃" },
    typical: ["Flying", "Bug"],
  },
  {
    id: "cliff",
    name: "Cliff",
    role: { en: "Rocket Leader", th: "หัวหน้าทีม Cliff", ja: "クリフ" },
    color: "#8b5cf6",
    bg: "linear-gradient(135deg, #a78bfa, #6d28d9)",
    quote: { en: "My strength comes from my loyalty to Team GO Rocket.",
             th: "พลังของฉันมาจากความภักดีต่อ Team GO Rocket",
             ja: "ロケット団への忠誠が力の源" },
    description: { en: "Heavy Rock/Ground hitters",
                   th: "ทีมหินและพื้นพลังหนัก",
                   ja: "いわ・じめんのパワー型" },
    typical: ["Rock", "Ground"],
  },
];

const GRUNT_COUNTERS = [
  { theme: { en: "Fire grunts",    th: "ลูกน้องไฟ",    ja: "ほのおしたっぱ" }, types: ["fire"],   counters: ["water", "rock", "ground"] },
  { theme: { en: "Water grunts",   th: "ลูกน้องน้ำ",   ja: "みずしたっぱ" },  types: ["water"],  counters: ["grass", "electric"] },
  { theme: { en: "Grass grunts",   th: "ลูกน้องหญ้า",  ja: "くさしたっぱ" },  types: ["grass"],  counters: ["fire", "flying", "ice"] },
  { theme: { en: "Electric grunts",th: "ลูกน้องไฟฟ้า", ja: "でんきしたっぱ" },types: ["electric"], counters: ["ground"] },
  { theme: { en: "Dragon grunts",  th: "ลูกน้องมังกร", ja: "ドラゴンしたっぱ" }, types: ["dragon"], counters: ["ice", "fairy", "dragon"] },
  { theme: { en: "Psychic grunts", th: "ลูกน้องจิต",   ja: "エスパーしたっぱ" }, types: ["psychic"], counters: ["dark", "ghost", "bug"] },
  { theme: { en: "Dark grunts",    th: "ลูกน้องมืด",   ja: "あくしたっぱ" },  types: ["dark"],   counters: ["fighting", "fairy", "bug"] },
  { theme: { en: "Ghost grunts",   th: "ลูกน้องผี",    ja: "ゴーストしたっぱ" }, types: ["ghost"],  counters: ["dark", "ghost"] },
];

const LEEKDUCK_URL = "https://leekduck.com/rocket-lineups";

export default function RocketLineups({ lang = "en", onClose }) {
  useModalLifecycle();

  const t = (th, en, ja) => lang === "th" ? th : lang === "ja" ? (ja ?? en) : en;
  const pickLang = (obj) => obj[lang] ?? obj.en;

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 9000,
      background: "radial-gradient(ellipse at top, rgba(15, 23, 42, 0.92), rgba(2, 6, 23, 0.95))",
      backdropFilter: "blur(10px)",
      overflowY: "auto", padding: "20px 12px",
    }}>
      <style>{`
        @keyframes rl-card-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .rl-char-card { transition: transform 0.25s, box-shadow 0.25s; }
        .rl-char-card:hover { transform: translateY(-4px); box-shadow: 0 16px 36px rgba(0,0,0,0.3); }
      `}</style>

      <div onClick={(e) => e.stopPropagation()} style={{
        maxWidth: 1100, margin: "0 auto",
        background: "var(--rl-bg, #fff)",
        borderRadius: 22, padding: "22px 18px 26px",
        boxShadow: "0 28px 80px rgba(0, 0, 0, 0.5)",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: -40, right: -40,
          fontSize: 220, opacity: 0.05, fontWeight: 900,
          color: "#dc2626", pointerEvents: "none",
          fontFamily: "Impact, sans-serif",
        }}>R</div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                      flexWrap: "wrap", gap: 12, marginBottom: 20, position: "relative" }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0,
                         color: "var(--rl-fg, #1e293b)", letterSpacing: "-0.01em",
                         display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 38, height: 38,
                background: "linear-gradient(135deg, #ef4444, #991b1b)",
                color: "white", borderRadius: 10,
                fontFamily: "Impact, sans-serif", fontSize: 24,
                boxShadow: "0 4px 12px rgba(220, 38, 38, 0.4)",
              }}>R</span>
              {t("Team GO Rocket", "Team GO Rocket", "GOロケット団")}
            </h1>
            <div style={{ fontSize: 12, color: "var(--rl-muted, #64748b)", marginTop: 6, fontWeight: 600 }}>
              {t("คู่มือคร่าวๆ · ลายทีมจริงเปลี่ยนทุกเดือน",
                 "Quick guide · Real lineups rotate monthly",
                 "簡易ガイド · 実際の編成は月次更新")}
            </div>
          </div>
          <button onClick={onClose} style={{
            padding: "9px 16px", borderRadius: 12, border: "none",
            background: "linear-gradient(135deg, #ef4444, #b91c1c)",
            color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer",
          }}>
            ✕ {t("ปิด", "Close", "閉じる")}
          </button>
        </div>

        <a href={LEEKDUCK_URL} target="_blank" rel="noopener noreferrer"
          style={{
            display: "flex", alignItems: "center", gap: 14,
            background: "linear-gradient(135deg, rgba(220, 38, 38, 0.12), rgba(239, 68, 68, 0.06))",
            border: "1.5px solid rgba(220, 38, 38, 0.3)",
            borderRadius: 14, padding: "14px 18px", marginBottom: 20,
            color: "var(--rl-fg, #1e293b)", textDecoration: "none",
            transition: "transform 0.2s, box-shadow 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 10px 24px rgba(220, 38, 38, 0.25)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "none";
          }}>
          <div style={{ fontSize: 32 }}>📋</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#dc2626", letterSpacing: 0.3 }}>
              {t("ดูทีม Pokémon ปัจจุบัน (อัปเดตทุกเดือน) →",
                 "View current monthly lineups (live data) →",
                 "現在の月次編成を見る →")}
            </div>
            <div style={{ fontSize: 11, color: "var(--rl-muted, #64748b)", marginTop: 2, fontWeight: 600 }}>
              leekduck.com/rocket-lineups · {t("เปิดในแท็บใหม่", "opens in new tab", "新しいタブで開く")}
            </div>
          </div>
          <div style={{ fontSize: 18, color: "#dc2626" }}>↗</div>
        </a>

        <div style={{
          fontSize: 13, fontWeight: 900, letterSpacing: 0.6,
          color: "var(--rl-fg, #1e293b)", marginBottom: 12,
          textTransform: "uppercase",
        }}>
          ⚔️ {t("ตัวละครหลัก", "Main Characters", "主要キャラクター")}
        </div>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 12, marginBottom: 24,
        }}>
          {CHARACTERS.map((char, i) => (
            <div key={char.id}
              className="rl-char-card"
              style={{
                background: "var(--rl-card, #fff)",
                border: `2px solid ${char.color}30`,
                borderRadius: 14, padding: 14,
                boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                animation: `rl-card-in 0.35s ease ${i * 0.05}s backwards`,
                position: "relative", overflow: "hidden",
              }}>
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: 4,
                background: char.bg,
              }} />

              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, marginTop: 6 }}>
                <div style={{
                  background: char.bg, color: "white",
                  width: 44, height: 44, borderRadius: 12,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22, fontWeight: 900,
                  boxShadow: `0 4px 12px ${char.color}55`,
                  fontFamily: "Impact, sans-serif",
                }}>
                  {char.name[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 900, color: "var(--rl-fg, #1e293b)" }}>
                    {char.name}
                  </div>
                  <div style={{ fontSize: 11, color: char.color, fontWeight: 700 }}>
                    {pickLang(char.role)}
                  </div>
                </div>
              </div>

              <div style={{
                fontSize: 11, fontStyle: "italic",
                color: "var(--rl-muted, #64748b)",
                lineHeight: 1.4, marginBottom: 8,
                padding: "6px 10px",
                background: `${char.color}10`,
                borderLeft: `3px solid ${char.color}`,
                borderRadius: 6,
              }}>
                "{pickLang(char.quote)}"
              </div>

              <div style={{
                fontSize: 11, color: "var(--rl-fg, #1e293b)",
                lineHeight: 1.4, marginBottom: 8, fontWeight: 600,
              }}>
                {pickLang(char.description)}
              </div>

              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {char.typical.map((typ, j) => (
                  <span key={j} style={{
                    fontSize: 9, fontWeight: 800,
                    background: `${char.color}20`,
                    color: char.color,
                    padding: "3px 8px", borderRadius: 999,
                    border: `1px solid ${char.color}30`,
                  }}>
                    {typ}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{
          fontSize: 13, fontWeight: 900, letterSpacing: 0.6,
          color: "var(--rl-fg, #1e293b)", marginBottom: 12,
          textTransform: "uppercase",
        }}>
          💡 {t("วิธีปราบลูกน้อง (Grunts)", "Grunt Type Counters", "したっぱの対策")}
        </div>
        <div style={{
          background: "var(--rl-card, #fff)",
          border: "1.5px solid var(--rl-border, #e2e8f0)",
          borderRadius: 14, padding: 14,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 10,
        }}>
          {GRUNT_COUNTERS.map((entry, i) => (
            <div key={i} style={{
              padding: 10, borderRadius: 10,
              background: `${TYPE_COLORS[entry.types[0]]}0a`,
              border: `1px solid ${TYPE_COLORS[entry.types[0]]}30`,
              animation: `rl-card-in 0.35s ease ${i * 0.03}s backwards`,
            }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--rl-fg, #1e293b)", marginBottom: 5 }}>
                {pickLang(entry.theme)}
              </div>
              <div style={{
                fontSize: 9, color: "var(--rl-muted, #64748b)",
                marginBottom: 6, fontWeight: 600, letterSpacing: 0.3,
                textTransform: "uppercase",
              }}>
                {t("ใช้ธาตุ", "Use type", "対策タイプ")}:
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {entry.counters.map((c, j) => (
                  <span key={j} style={{
                    fontSize: 9, fontWeight: 800, color: "white",
                    background: TYPE_COLORS[c],
                    padding: "3px 8px", borderRadius: 999,
                    textTransform: "uppercase", letterSpacing: 0.3,
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  }}>{c}</span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: 18, paddingTop: 14,
          borderTop: "1px solid var(--rl-border, #e2e8f0)",
          fontSize: 10, color: "var(--rl-muted, #94a3b8)",
          textAlign: "center", letterSpacing: 0.3,
        }}>
          {t("ScrapedDuck ไม่มี API ทีม Rocket — แนะนำให้ดูข้อมูลล่าสุดบน LeekDuck",
             "ScrapedDuck has no Rocket API — for current lineups, see LeekDuck",
             "ScrapedDuckにはRocket APIなし — 最新編成はLeekDuckへ")}
        </div>

        <style>{`
          :root { --rl-bg: #fff; --rl-fg: #1e293b; --rl-muted: #64748b; --rl-card: #f8fafc; --rl-border: #e2e8f0; }
          [data-theme="dark"] { --rl-bg: #0f172a; --rl-fg: #f1f5f9; --rl-muted: #94a3b8; --rl-card: #1e293b; --rl-border: #334155; }
        `}</style>
      </div>
    </div>
  );
}