// ─── BirthdayPokemon — Pokémon Horoscope / Fortune Teller ─────
// Input: date of birth → matched Pokemon + personality + fortune + lucky colors + postcard

import { useState, useEffect, useRef } from "react";
import { TYPE_NAMES_TH, TYPE_NAMES_JA } from "../data.js";
import { typeColor, getArt, getLocalName, padId } from "../utils.js";
import { useModalLifecycle } from "../perfUtils.js";

// ─── Deterministic hash: birthday → Pokémon ID ───
function birthdayToPokemonId(birthday, maxId = 1025) {
  const [y, m, d] = birthday.split("-").map(Number);
  let h = (y * 10000) + (m * 100) + d;
  h = ((h * 2654435761) >>> 0) & 0x7fffffff;
  return (h % maxId) + 1;
}

// Lucky number: sum of digits in birthday (reduced to 1-9)
function getLuckyNumber(birthday) {
  const digits = birthday.replace(/-/g, "");
  let sum = digits.split("").reduce((a, c) => a + +c, 0);
  while (sum > 9) sum = String(sum).split("").reduce((a, c) => a + +c, 0);
  return sum;
}

// Personality archetype based on PRIMARY type
const PERSONALITY_BY_TYPE = {
  fire:     { th: "หลงใหลและกล้าหาญ มีไฟในตัวสูง พร้อมเป็นผู้นำ — บางครั้งใจร้อน ควรหายใจลึกก่อนตัดสินใจ",
              en: "Passionate and brave, natural leader — sometimes impulsive, breathe deep before deciding",
              ja: "情熱的で勇敢、生まれながらのリーダー — 時に衝動的、決断前に深呼吸を" },
  water:    { th: "ปรับตัวเก่ง ใจเย็น สังหรณ์ใจแม่นยำ — มีอารมณ์ลึก ความรู้สึกเข้มข้น",
              en: "Adaptable, calm, intuitive — deep emotions and rich inner world",
              ja: "適応力があり、冷静で直感的 — 深い感情と豊かな内面" },
  grass:    { th: "อดทน ใจเย็น เติบโตช้าๆ แต่มั่นคง รักธรรมชาติและความสงบ",
              en: "Patient and steady, lover of nature and peace — slow but reliable growth",
              ja: "忍耐強く穏やか、自然と平和を愛する — 着実な成長型" },
  electric: { th: "ฉลาดเปรี้ยง คล่องแคล่ว มีพลัง charisma ตื่นเต้นง่าย หลงเสน่ห์ความใหม่",
              en: "Quick-witted, charismatic, easily excited by novelty",
              ja: "頭の回転が速くカリスマ的、新しいものに興奮しやすい" },
  psychic:  { th: "ฉลาดล้ำลึก ช่างสังเกต มีปัญญาญาณ — บางทีอ่อนไหวเกินไป",
              en: "Wise and observant, intuitive insight — sometimes overly sensitive",
              ja: "知恵深く観察眼があり直感的 — 時に敏感すぎる" },
  dark:     { th: "อิสระ ลึกลับ เก่งวางแผน ภักดีต่อเพื่อน — ดูเย็นชาแต่ใจดี",
              en: "Independent, mysterious, loyal to friends — cool exterior, warm heart",
              ja: "独立心が強く神秘的、友人に忠実 — クールに見えて優しい" },
  ghost:    { th: "ครีเอทีฟ มีเอกลักษณ์ มองเห็นในสิ่งที่คนอื่นไม่เห็น มีโลกของตัวเอง",
              en: "Creative and unique, sees what others miss, has own world",
              ja: "創造的で独特、他人が見逃すものを見る、自分の世界を持つ" },
  steel:    { th: "มุ่งมั่น เชื่อถือได้ แข็งแกร่ง — ก้าวช้าแต่ไม่หยุด",
              en: "Determined, reliable, strong — slow steps but never stops",
              ja: "決意固く信頼でき強い — ゆっくりだが止まらない" },
  dragon:   { th: "มั่นใจ ทรงพลัง ทะเยอทะยาน มี aura ของผู้นำ — ระวังหยิ่ง",
              en: "Confident, powerful, ambitious with leader's aura — beware of pride",
              ja: "自信があり強力で野心的、リーダーのオーラ — 高慢に注意" },
  fairy:    { th: "เสน่ห์ดี ใจดี รักษาคนรอบข้าง มีพลังบวก — เป็นความหวังของคนอื่น",
              en: "Charming, kind, healer of those around — a source of hope",
              ja: "魅力的で優しく、周りを癒す — 希望の光" },
  fighting: { th: "กล้าหาญ มีระเบียบวินัย ทำงานหนัก — รักการแข่งขัน",
              en: "Brave, disciplined, hardworking — loves a good challenge",
              ja: "勇敢で規律正しく勤勉 — 挑戦が好き" },
  ground:   { th: "มั่นคงเหมือนผืนแผ่นดิน ใช้งานได้จริง พึ่งพาได้",
              en: "Grounded, practical, dependable like the earth itself",
              ja: "地面のように堅実で実用的、頼りになる" },
  rock:     { th: "ใจแข็ง อดทน ยึดถือประเพณี — บางครั้งดื้อ",
              en: "Strong-willed, traditional, enduring — sometimes stubborn",
              ja: "意志強く伝統的で持久力がある — 頑固な面も" },
  ice:      { th: "เย็น คมคิด สงบในวิกฤต — เก็บอารมณ์เก่ง",
              en: "Cool, clear-headed, calm under pressure — masters their emotions",
              ja: "冷静で明晰、危機でも落ち着く — 感情管理が上手" },
  bug:      { th: "ขยัน อยากรู้อยากเห็น ปรับตัวเร็ว — มองเห็นโอกาสในรายละเอียดเล็กๆ",
              en: "Industrious, curious, quick to adapt — spots opportunity in details",
              ja: "勤勉で好奇心旺盛、適応が早い — 細部に機会を見つける" },
  flying:   { th: "อิสระเหมือนลม ทะยานสูง ฝันใหญ่ — แต่บางทีฟุ้งซ่าน",
              en: "Free as the wind, soars high, dreams big — sometimes scattered",
              ja: "風のように自由、高く飛び大きな夢を持つ — 散漫な時も" },
  poison:   { th: "เก๋า ทนต่อสภาวะลำบาก เปลี่ยนแปลงได้ — มีอารมณ์ขันแบบ dark",
              en: "Edgy, resilient through hardship, transformative — dark humor",
              ja: "尖っていて困難に強く変化する — ダークなユーモア" },
  normal:   { th: "อเนกประสงค์ สมดุล เป็นมิตร — เก่งหลายอย่าง รักความสงบ",
              en: "Versatile, balanced, friendly — jack of all trades, peace lover",
              ja: "万能でバランスが良く親しみやすい — 多才で平和を愛する" },
};

// Lucky / unlucky colors per type
const COLOR_FORTUNE = {
  fire:     { lucky: { name: { th: "แดง / ส้ม", en: "Red / Orange", ja: "赤 / オレンジ" }, hex: "#ef4444" },
              unlucky: { name: { th: "น้ำเงิน", en: "Blue", ja: "青" }, hex: "#3b82f6" } },
  water:    { lucky: { name: { th: "ฟ้า / น้ำเงิน", en: "Blue / Cyan", ja: "青 / 水色" }, hex: "#3b82f6" },
              unlucky: { name: { th: "เหลือง", en: "Yellow", ja: "黄色" }, hex: "#facc15" } },
  grass:    { lucky: { name: { th: "เขียว", en: "Green", ja: "緑" }, hex: "#16a34a" },
              unlucky: { name: { th: "แดง / ส้ม", en: "Red / Orange", ja: "赤 / オレンジ" }, hex: "#ef4444" } },
  electric: { lucky: { name: { th: "เหลือง / ทอง", en: "Yellow / Gold", ja: "黄 / 金" }, hex: "#facc15" },
              unlucky: { name: { th: "น้ำตาล", en: "Brown", ja: "茶色" }, hex: "#92400e" } },
  psychic:  { lucky: { name: { th: "ชมพู / ม่วง", en: "Pink / Purple", ja: "ピンク / 紫" }, hex: "#ec4899" },
              unlucky: { name: { th: "ดำ", en: "Black", ja: "黒" }, hex: "#1f2937" } },
  dark:     { lucky: { name: { th: "ดำ / น้ำเงินเข้ม", en: "Black / Navy", ja: "黒 / 紺" }, hex: "#1f2937" },
              unlucky: { name: { th: "ชมพู", en: "Pink", ja: "ピンク" }, hex: "#ec4899" } },
  ghost:    { lucky: { name: { th: "ม่วง", en: "Purple", ja: "紫" }, hex: "#a855f7" },
              unlucky: { name: { th: "ขาว", en: "White", ja: "白" }, hex: "#f3f4f6" } },
  steel:    { lucky: { name: { th: "เงิน / เทา", en: "Silver / Gray", ja: "銀 / 灰色" }, hex: "#94a3b8" },
              unlucky: { name: { th: "แดง", en: "Red", ja: "赤" }, hex: "#ef4444" } },
  dragon:   { lucky: { name: { th: "ม่วงทอง", en: "Royal Purple", ja: "ロイヤルパープル" }, hex: "#7c3aed" },
              unlucky: { name: { th: "ฟ้าอ่อน", en: "Light Blue", ja: "水色" }, hex: "#7dd3fc" } },
  fairy:    { lucky: { name: { th: "ชมพู / พีช", en: "Pink / Peach", ja: "ピンク / ピーチ" }, hex: "#f472b6" },
              unlucky: { name: { th: "เทาดำ", en: "Dark Gray", ja: "ダークグレー" }, hex: "#374151" } },
  fighting: { lucky: { name: { th: "ส้มเลือดหมู", en: "Burnt Orange", ja: "バーントオレンジ" }, hex: "#ea580c" },
              unlucky: { name: { th: "ม่วง", en: "Purple", ja: "紫" }, hex: "#a855f7" } },
  ground:   { lucky: { name: { th: "น้ำตาล / เบจ", en: "Brown / Beige", ja: "茶 / ベージュ" }, hex: "#a16207" },
              unlucky: { name: { th: "ฟ้า", en: "Sky Blue", ja: "空色" }, hex: "#0ea5e9" } },
  rock:     { lucky: { name: { th: "น้ำตาลเข้ม", en: "Dark Brown", ja: "ダークブラウン" }, hex: "#78350f" },
              unlucky: { name: { th: "เขียว", en: "Green", ja: "緑" }, hex: "#16a34a" } },
  ice:      { lucky: { name: { th: "ฟ้าใส / ขาว", en: "Ice Blue / White", ja: "アイスブルー / 白" }, hex: "#67e8f9" },
              unlucky: { name: { th: "แดง", en: "Red", ja: "赤" }, hex: "#dc2626" } },
  bug:      { lucky: { name: { th: "เขียวมะกอก", en: "Olive Green", ja: "オリーブグリーン" }, hex: "#65a30d" },
              unlucky: { name: { th: "ส้มสด", en: "Bright Orange", ja: "オレンジ" }, hex: "#f97316" } },
  flying:   { lucky: { name: { th: "ฟ้าใส", en: "Sky Blue", ja: "空色" }, hex: "#38bdf8" },
              unlucky: { name: { th: "เทาเข้ม", en: "Dark Gray", ja: "ダークグレー" }, hex: "#374151" } },
  poison:   { lucky: { name: { th: "ม่วงเข้ม", en: "Deep Purple", ja: "深紫" }, hex: "#7c2d12" },
              unlucky: { name: { th: "ชมพูสด", en: "Bright Pink", ja: "明るいピンク" }, hex: "#f9a8d4" } },
  normal:   { lucky: { name: { th: "ครีม / เบจ", en: "Cream / Beige", ja: "クリーム / ベージュ" }, hex: "#fef3c7" },
              unlucky: { name: { th: "ดำ", en: "Black", ja: "黒" }, hex: "#1f2937" } },
};

// Daily fortune messages (rotated by day-of-year)
const DAILY_FORTUNES = {
  th: [
    "วันนี้เหมาะกับการเริ่มต้นใหม่ มีเรื่องดีรออยู่",
    "เพื่อนเก่าจะมาทักทาย เก็บรอยยิ้มไว้แบ่งปัน",
    "ระวังของหายในช่วงบ่าย ตั้งสติให้ดี",
    "โชคมาทางการเงิน ลองตรวจสอบรายรับ",
    "เปิดใจรับโอกาสใหม่ที่ไม่คาดคิด",
    "การพักผ่อนคือยาวิเศษวันนี้",
    "มีคนคิดถึง อยากบอกอะไรบางอย่าง",
    "ความคิดสร้างสรรค์พลุ่งพล่าน เหมาะจะเริ่มงานศิลปะ",
    "อาจเจอเพื่อนใหม่ในที่ที่ไม่คาดฝัน",
    "ฟังเสียงในใจตัวเอง สังหรณ์จะแม่นวันนี้",
  ],
  en: [
    "Today is perfect for new beginnings — something good awaits",
    "An old friend will reach out — keep your smile ready",
    "Beware of losing things in the afternoon — stay mindful",
    "Luck flows in finances — review your incoming earnings",
    "Open your heart to unexpected opportunities",
    "Rest is your magic medicine today",
    "Someone is thinking of you — they have something to say",
    "Creativity is overflowing — perfect for starting art projects",
    "You may meet new friends in unexpected places",
    "Trust your inner voice — your intuition is sharp today",
  ],
  ja: [
    "今日は新しい始まりに最適 — 良いことが待っている",
    "古い友人が連絡してくる — 笑顔を準備して",
    "午後は物を失くしやすい — 注意深く",
    "金運上昇 — 収入を確認して",
    "予期せぬ機会に心を開いて",
    "休息が今日の魔法の薬",
    "誰かがあなたを想っている — 何か伝えたいことが",
    "創造力溢れる — アート開始に最適",
    "予期せぬ場所で新しい友人に出会うかも",
    "内なる声を信じて — 今日は直感が鋭い" ,
  ],
};

const ELEMENT_BY_MONTH = ["💧","🔥","🌿","⚡","❄️","🌪","🌑","✨","🌍","🪨","🌊","🌟"];
const MONTHS_TH = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
const MONTHS_JA = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];
const MONTHS_EN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_NAMES_TH = ["อาทิตย์","จันทร์","อังคาร","พุธ","พฤหัสบดี","ศุกร์","เสาร์"];
const DAY_NAMES_EN = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const DAY_NAMES_JA = ["日","月","火","水","木","金","土"];

// Compatible types (best friends)
const COMPATIBLE_TYPES = {
  fire: ["grass", "ice", "bug", "steel"],
  water: ["fire", "ground", "rock"],
  grass: ["water", "ground", "rock"],
  electric: ["water", "flying"],
  psychic: ["fighting", "poison"],
  dark: ["psychic", "ghost"],
  ghost: ["psychic", "ghost"],
  steel: ["fairy", "ice", "rock"],
  dragon: ["dragon"],
  fairy: ["dragon", "dark", "fighting"],
  fighting: ["normal", "ice", "rock", "dark", "steel"],
  ground: ["fire", "electric", "poison", "rock", "steel"],
  rock: ["fire", "ice", "flying", "bug"],
  ice: ["grass", "ground", "flying", "dragon"],
  bug: ["grass", "psychic", "dark"],
  flying: ["grass", "fighting", "bug"],
  poison: ["grass", "fairy"],
  normal: ["normal", "fighting"],
};

function loadHtml2Canvas() {
  return new Promise((resolve, reject) => {
    if (window.html2canvas) return resolve(window.html2canvas);
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
    script.onload = () => resolve(window.html2canvas);
    script.onerror = () => reject(new Error("Failed to load html2canvas"));
    document.head.appendChild(script);
  });
}

export default function BirthdayPokemon({
  lang, thaiArr, jpArr, cachedFetch, allList, onOpen, onClose,
}) {
  useModalLifecycle(onClose);
  const postcardRef = useRef(null);
  const [birthday, setBirthday] = useState(() => {
    try { return localStorage.getItem("pkdx_birthday") ?? ""; } catch { return ""; }
  });
  const [pokemon, setPokemon] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(null);

  const t = (th, en, ja) => lang === "th" ? th : lang === "ja" ? (ja ?? en) : en;

  // Compute Pokemon when birthday changes
  useEffect(() => {
    if (!birthday) { setPokemon(null); return; }
    try { localStorage.setItem("pkdx_birthday", birthday); } catch {}

    const id = birthdayToPokemonId(birthday);
    setLoading(true);
    cachedFetch(`https://pokeapi.co/api/v2/pokemon/${id}`)
      .then(p => { if (p) setPokemon(p); })
      .finally(() => setLoading(false));
  }, [birthday]);

  // Save postcard as image
  const handleSavePostcard = async () => {
    if (!postcardRef.current) return;
    setSaving(true);
    setSavedMsg(null);
    try {
      const html2canvas = await loadHtml2Canvas();
      const canvas = await html2canvas(postcardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
      });
      canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `hexadex-fortune-${birthday}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setSavedMsg(t("บันทึก postcard สำเร็จ!", "Postcard saved!", "ポストカード保存!"));
        setTimeout(() => setSavedMsg(null), 3000);
      }, "image/png", 0.95);
    } catch (e) {
      setSavedMsg(t("บันทึกล้มเหลว", "Save failed", "保存失敗"));
      setTimeout(() => setSavedMsg(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  // ─── Derived data when pokemon loaded ───
  const primaryType = pokemon?.types?.[0]?.type?.name ?? "normal";
  const secondaryType = pokemon?.types?.[1]?.type?.name;
  const personality = PERSONALITY_BY_TYPE[primaryType] ?? PERSONALITY_BY_TYPE.normal;
  const colorFortune = COLOR_FORTUNE[primaryType] ?? COLOR_FORTUNE.normal;
  const compatibles = (COMPATIBLE_TYPES[primaryType] || []).slice(0, 3);

  // Date metadata
  const dateInfo = (() => {
    if (!birthday) return null;
    const [y, m, d] = birthday.split("-").map(Number);
    const dt = new Date(birthday);
    const dayIdx = dt.getDay();
    const months = lang === "th" ? MONTHS_TH : lang === "ja" ? MONTHS_JA : MONTHS_EN;
    const dayNames = lang === "th" ? DAY_NAMES_TH : lang === "ja" ? DAY_NAMES_JA : DAY_NAMES_EN;
    return {
      formatted: lang === "th" ? `${d} ${months[m-1]} ${y + 543}`
                : lang === "ja" ? `${y}年${months[m-1]}${d}日`
                : `${months[m-1]} ${d}, ${y}`,
      dayName: dayNames[dayIdx],
      element: ELEMENT_BY_MONTH[m - 1],
      yearShort: y,
      month: m,
      day: d,
    };
  })();

  // Daily fortune (deterministic by date)
  const dailyFortune = (() => {
    if (!birthday) return null;
    const messages = DAILY_FORTUNES[lang] ?? DAILY_FORTUNES.en;
    const [y, m, d] = birthday.split("-").map(Number);
    const idx = (y + m + d) % messages.length;
    return messages[idx];
  })();

  const luckyNumber = birthday ? getLuckyNumber(birthday) : null;
  const pokeName = pokemon ? (getLocalName(pokemon.id, lang, thaiArr, jpArr) ?? pokemon.name) : null;
  const artUrl = pokemon ? getArt(pokemon) : null;

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 9100,
      background: "radial-gradient(ellipse at top, rgba(76, 29, 149, 0.6), rgba(15, 23, 42, 0.92))",
      backdropFilter: "blur(14px)",
      overflowY: "auto", padding: "20px 12px",
    }}>
      <style>{`
        @keyframes bp-sparkle {
          0%, 100% { opacity: 0.3; transform: scale(0.8) rotate(0deg); }
          50%      { opacity: 1; transform: scale(1.1) rotate(180deg); }
        }
        @keyframes bp-pop {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes bp-float {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-10px); }
        }
        .bp-stat-card { transition: transform 0.25s; }
        .bp-stat-card:hover { transform: translateY(-4px); }
      `}</style>

      <div onClick={(e) => e.stopPropagation()} style={{
        maxWidth: 920, margin: "0 auto",
        background: "var(--bp-bg, #fff)",
        borderRadius: 22, padding: 18,
        boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
        position: "relative",
      }}>
        {/* Top bar (NOT captured) */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 12,
        }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--bp-muted, #64748b)" }}>
            🔮 {t("ดูดวงโปเกม่อน", "Pokémon Horoscope", "ポケモン占い")}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {pokemon && (
              <button onClick={handleSavePostcard} disabled={saving} style={{
                padding: "8px 14px", borderRadius: 10, border: "none",
                background: "linear-gradient(135deg, #ec4899, #a855f7)",
                color: "white", fontWeight: 800, fontSize: 12,
                cursor: saving ? "wait" : "pointer", opacity: saving ? 0.6 : 1,
                boxShadow: "0 4px 14px rgba(236, 72, 153, 0.4)",
              }}>
                {saving ? "⏳" : "💌"} {saving ? t("กำลังบันทึก...","Saving...","保存中...") : t("เซฟ Postcard","Save Postcard","ポストカード保存")}
              </button>
            )}
            <button onClick={onClose} style={{
              padding: "8px 14px", borderRadius: 10, border: "none",
              background: "linear-gradient(135deg, #ef4444, #b91c1c)",
              color: "white", fontWeight: 800, fontSize: 12, cursor: "pointer",
            }}>
              ✕ {t("ปิด","Close","閉じる")}
            </button>
          </div>
        </div>

        {savedMsg && (
          <div style={{
            background: savedMsg.includes("ล้มเหลว") || savedMsg.includes("failed") ? "#fee2e2" : "#dcfce7",
            color: savedMsg.includes("ล้มเหลว") || savedMsg.includes("failed") ? "#991b1b" : "#15803d",
            padding: "8px 14px", borderRadius: 10,
            fontSize: 12, fontWeight: 700, marginBottom: 10, textAlign: "center",
          }}>
            {savedMsg}
          </div>
        )}

        {/* Date input */}
        <div style={{
          background: "linear-gradient(135deg, #fdf2f8, #fae8ff)",
          padding: 18, borderRadius: 16, marginBottom: 14,
          border: "1.5px solid rgba(168, 85, 247, 0.2)",
        }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: "#7c3aed", marginBottom: 6 }}>
            🎂 {t("วันเกิดของคุณ", "Your Birthday", "あなたの誕生日")}
          </label>
          <input
            type="date"
            value={birthday}
            max={new Date().toISOString().slice(0,10)}
            onChange={(e) => setBirthday(e.target.value)}
            style={{
              width: "100%", maxWidth: 280,
              padding: "10px 14px",
              borderRadius: 12,
              border: "2px solid rgba(168, 85, 247, 0.3)",
              fontSize: 15,
              background: "white",
              color: "#1e293b",
              fontWeight: 700,
              outline: "none",
            }}
          />
        </div>

        {!birthday && (
          <div style={{
            textAlign: "center", padding: "40px 20px",
            color: "var(--bp-muted, #64748b)",
          }}>
            <div style={{ fontSize: 64, marginBottom: 12, animation: "bp-float 3s ease-in-out infinite" }}>🔮</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>
              {t("กรอกวันเกิดเพื่อค้นพบ Pokémon คู่ดวงและคำทำนายของคุณ",
                 "Enter your birthday to discover your Pokémon soulmate and fortune",
                 "誕生日を入力して、ポケモンソウルメイトと占いを発見しよう")}
            </div>
          </div>
        )}

        {loading && (
          <div style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 48 }}>🔮</div>
            <div style={{ marginTop: 10, fontSize: 13, fontWeight: 700, color: "var(--bp-muted, #64748b)" }}>
              {t("กำลังค้นหา Pokémon คู่ดวง...","Reading your fortune...","運命のポケモン検索中...")}
            </div>
          </div>
        )}

        {/* POSTCARD AREA — captured by html2canvas */}
        {pokemon && !loading && (
          <div ref={postcardRef} style={{
            background: `linear-gradient(160deg,
              ${typeColor(primaryType)}22 0%,
              ${typeColor(secondaryType || primaryType)}14 50%,
              ${colorFortune.lucky.hex}22 100%)`,
            borderRadius: 18, padding: 22,
            position: "relative", overflow: "hidden",
            animation: "bp-pop 0.5s ease",
          }}>
            {/* Floating sparkles */}
            {[
              { top: 12, left: "15%", delay: "0s" },
              { top: 30, left: "85%", delay: "0.5s" },
              { top: 60, left: "10%", delay: "1s" },
              { top: 80, left: "90%", delay: "0.3s" },
            ].map((s, i) => (
              <span key={i} style={{
                position: "absolute", top: s.top, left: s.left,
                fontSize: 16, animation: `bp-sparkle 2.5s ease-in-out infinite ${s.delay}`,
                color: colorFortune.lucky.hex,
                filter: `drop-shadow(0 0 8px ${colorFortune.lucky.hex})`,
                pointerEvents: "none",
              }}>✨</span>
            ))}

            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div style={{
                fontSize: 22, fontWeight: 900,
                background: `linear-gradient(135deg, ${typeColor(primaryType)}, ${colorFortune.lucky.hex})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                letterSpacing: "-0.02em",
              }}>
                ✨ {t("Pokémon คู่ดวงของคุณ", "Your Pokémon Soulmate", "あなたのポケモン")}
              </div>
              <div style={{ fontSize: 11, color: "var(--bp-muted, #64748b)", fontWeight: 700, marginTop: 4 }}>
                {dateInfo?.formatted} · {dateInfo?.element} {dateInfo?.dayName}
              </div>
            </div>

            {/* Pokemon hero */}
            <div style={{
              display: "flex", alignItems: "center", gap: 16,
              padding: 14, borderRadius: 14,
              background: "rgba(255,255,255,0.45)",
              backdropFilter: "blur(8px)",
              border: "1.5px solid rgba(255,255,255,0.6)",
              marginBottom: 14, flexWrap: "wrap",
            }}>
              <div style={{
                width: 130, height: 130, flexShrink: 0,
                background: `radial-gradient(circle, ${typeColor(primaryType)}44, transparent 70%)`,
                borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                animation: "bp-float 3s ease-in-out infinite",
              }}>
                {artUrl && (
                  <img src={artUrl} alt={pokeName}
                    crossOrigin="anonymous"
                    style={{ width: 120, height: 120, objectFit: "contain",
                             filter: `drop-shadow(0 6px 14px ${typeColor(primaryType)}66)` }} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--bp-muted, #64748b)", marginBottom: 2 }}>
                  {padId(pokemon.id)}
                </div>
                <div style={{ fontSize: 26, fontWeight: 900, color: "var(--bp-fg, #1e293b)",
                              textTransform: "capitalize", lineHeight: 1.1, letterSpacing: "-0.02em" }}>
                  {pokeName}
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                  {pokemon.types.map((tp) => {
                    const tname = tp.type.name;
                    const local = lang === "th" ? TYPE_NAMES_TH[tname]
                                : lang === "ja" ? TYPE_NAMES_JA[tname]
                                : tname.charAt(0).toUpperCase() + tname.slice(1);
                    return (
                      <span key={tname} style={{
                        background: typeColor(tname), color: "white",
                        padding: "3px 10px", borderRadius: 999,
                        fontSize: 10, fontWeight: 900, letterSpacing: 0.5,
                        textTransform: "uppercase",
                        boxShadow: `0 3px 8px ${typeColor(tname)}66`,
                      }}>{local}</span>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Personality */}
            <Section title={t("✨ บุคลิกของคุณ", "✨ Your Personality", "✨ あなたの性格")}
                     accent={typeColor(primaryType)}>
              <div style={{ fontSize: 13, color: "var(--bp-fg, #1e293b)", lineHeight: 1.6, fontWeight: 500 }}>
                {personality[lang] ?? personality.en}
              </div>
            </Section>

            {/* Daily fortune */}
            <Section title={t("🔮 คำทำนายประจำวัน", "🔮 Daily Fortune", "🔮 今日の運勢")}
                     accent={colorFortune.lucky.hex}>
              <div style={{
                fontSize: 13, color: "var(--bp-fg, #1e293b)",
                lineHeight: 1.6, fontWeight: 600, fontStyle: "italic",
                padding: "8px 12px",
                background: `${colorFortune.lucky.hex}15`,
                borderRadius: 10, borderLeft: `3px solid ${colorFortune.lucky.hex}`,
              }}>
                "{dailyFortune}"
              </div>
            </Section>

            {/* 3-col stats */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 10, marginTop: 12,
            }}>
              {/* Lucky number */}
              <StatCard label={t("เลขนำโชค","Lucky Number","ラッキーナンバー")}
                         icon="🎰" value={luckyNumber} color="#fbbf24" />
              {/* Lucky color */}
              <StatCard label={t("สีมงคล","Lucky Color","ラッキーカラー")}
                         icon="🎨" value={colorFortune.lucky.name[lang] ?? colorFortune.lucky.name.en}
                         color={colorFortune.lucky.hex} swatch={colorFortune.lucky.hex} />
              {/* Unlucky color */}
              <StatCard label={t("สีอัปมงคล","Unlucky Color","アンラッキーカラー")}
                         icon="⚠️" value={colorFortune.unlucky.name[lang] ?? colorFortune.unlucky.name.en}
                         color="#64748b" swatch={colorFortune.unlucky.hex} />
            </div>

            {/* Compatible types */}
            {compatibles.length > 0 && (
              <Section title={t("💞 ธาตุเข้ากันได้","💞 Compatible Types","💞 相性の良いタイプ")}
                       accent="#ec4899" mt={12}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {compatibles.map((typ) => {
                    const local = lang === "th" ? TYPE_NAMES_TH[typ]
                                : lang === "ja" ? TYPE_NAMES_JA[typ]
                                : typ.charAt(0).toUpperCase() + typ.slice(1);
                    return (
                      <span key={typ} style={{
                        background: typeColor(typ), color: "white",
                        padding: "5px 12px", borderRadius: 999,
                        fontSize: 11, fontWeight: 900,
                        boxShadow: `0 3px 8px ${typeColor(typ)}66`,
                      }}>{local}</span>
                    );
                  })}
                </div>
              </Section>
            )}

            {/* Branding footer */}
            <div style={{
              marginTop: 14, paddingTop: 10,
              borderTop: "1px dashed rgba(0,0,0,0.1)",
              display: "flex", justifyContent: "space-between",
              fontSize: 9, color: "var(--bp-muted, #94a3b8)", fontWeight: 600,
            }}>
              <span>🔮 HexaDex Horoscope</span>
              <span>{new Date().toISOString().slice(0,10)}</span>
            </div>
          </div>
        )}

        {/* Click-to-view full Pokemon */}
        {pokemon && !loading && (
          <div style={{ textAlign: "center", marginTop: 14 }}>
            <button onClick={() => { onClose?.(); onOpen?.(pokemon); }} style={{
              padding: "10px 22px", borderRadius: 12, border: "none",
              background: `linear-gradient(135deg, ${typeColor(primaryType)}, ${colorFortune.lucky.hex})`,
              color: "white", fontWeight: 900, fontSize: 13,
              cursor: "pointer", letterSpacing: 0.5,
              boxShadow: `0 8px 22px ${typeColor(primaryType)}66`,
            }}>
              🔍 {t("ดูข้อมูล Pokémon เต็ม","View Full Pokédex Entry","完全データを見る")}
            </button>
          </div>
        )}

        <style>{`
          :root { --bp-bg: #fff; --bp-fg: #1e293b; --bp-muted: #64748b; }
          [data-theme="dark"] { --bp-bg: #0f172a; --bp-fg: #f1f5f9; --bp-muted: #94a3b8; }
        `}</style>
      </div>
    </div>
  );
}

function Section({ title, accent, children, mt = 14 }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.45)",
      backdropFilter: "blur(6px)",
      border: "1.5px solid rgba(255,255,255,0.6)",
      borderLeft: `4px solid ${accent}`,
      borderRadius: 12,
      padding: 12,
      marginTop: mt,
    }}>
      <div style={{
        fontSize: 11, fontWeight: 900, letterSpacing: 0.6,
        color: accent, marginBottom: 6,
        textTransform: "uppercase",
      }}>{title}</div>
      {children}
    </div>
  );
}

function StatCard({ label, icon, value, color, swatch }) {
  return (
    <div className="bp-stat-card" style={{
      background: "rgba(255,255,255,0.55)",
      backdropFilter: "blur(8px)",
      border: `1.5px solid ${color}40`,
      borderRadius: 12,
      padding: 12,
      textAlign: "center",
    }}>
      <div style={{ fontSize: 22 }}>{icon}</div>
      <div style={{
        fontSize: 9, fontWeight: 800, color: "var(--bp-muted, #64748b)",
        letterSpacing: 0.5, marginTop: 4, textTransform: "uppercase",
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 14, fontWeight: 900, color: "var(--bp-fg, #1e293b)",
        marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
      }}>
        {swatch && (
          <span style={{
            width: 14, height: 14, borderRadius: 4,
            background: swatch,
            boxShadow: `0 2px 6px ${swatch}88, 0 0 0 2px white`,
          }} />
        )}
        {value}
      </div>
    </div>
  );
}