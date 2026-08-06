// ─── BirthdayPokemon — Pokémon Horoscope / Fortune Teller ─────
// Input: date of birth → matched Pokemon + personality + fortune + lucky colors + postcard

import { useState, useEffect, useRef } from "react";
import { Sparkles, Cake, Download, Loader2, X, Search } from "lucide-react";
import { TYPE_NAMES_TH, TYPE_NAMES_JA } from "../data.js";
import { typeColor, getArt, getLocalName, padId, birthdayToPokemonId } from "../utils.js";
import { useModalLifecycle } from "../perfUtils.js";
import { MINIMAL_FEATURE_CSS } from "./MetaTierBrowser.jsx";

const BP_CSS = `
  .bp-input-card { background: var(--bg-muted); border-radius: 16px; padding: 16px; margin-bottom: 16px; }
  .bp-input-label { display: flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 9px; letter-spacing: -0.01em; }
  .bp-date { width: 100%; max-width: 280px; padding: 11px 14px; border-radius: 12px; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-primary); font-size: 15px; font-weight: 600; font-family: inherit; outline: none; }
  .bp-date:focus { border-color: var(--blue); }
  .bp-empty { text-align: center; padding: 44px 20px; color: var(--text-muted); }
  .bp-empty-ic { display: inline-flex; color: var(--blue); margin-bottom: 14px; }
  .bp-empty-txt { font-size: 13.5px; font-weight: 500; max-width: 300px; margin: 0 auto; line-height: 1.6; }
  .bp-spin { animation: bp-spin 1s linear infinite; color: var(--blue); }
  @keyframes bp-spin { to { transform: rotate(360deg); } }
  .bp-msg { padding: 9px 14px; border-radius: 10px; font-size: 12px; font-weight: 600; margin-bottom: 12px; text-align: center; }
  .bp-msg.ok { background: rgba(52,199,89,0.14); color: #2e9e54; }
  .bp-msg.err { background: rgba(239,68,68,0.14); color: #ef4444; }

  .bp-card { --ac: #888; border-radius: 20px; padding: 20px; position: relative; overflow: hidden;
    background: color-mix(in srgb, var(--ac) 7%, var(--bg-card)); box-shadow: 0 0 0 0.5px var(--border) inset; }
  .bp-pc-head { text-align: center; margin-bottom: 16px; }
  .bp-pc-title { font-size: 18px; font-weight: 800; letter-spacing: -0.02em; color: var(--ac); display: inline-flex; align-items: center; gap: 7px; }
  .bp-pc-date { font-size: 11px; color: var(--text-muted); font-weight: 600; margin-top: 4px; }
  .bp-hero { display: flex; align-items: center; gap: 14px; padding: 14px; border-radius: 16px; background: var(--bg-card); box-shadow: 0 0 0 0.5px var(--border) inset; margin-bottom: 12px; flex-wrap: wrap; }
  .bp-hero-art { width: 116px; height: 116px; flex-shrink: 0; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: color-mix(in srgb, var(--ac) 16%, transparent); }
  .bp-hero-art img { width: 100px; height: 100px; object-fit: contain; }
  .bp-hero-id { font-size: 11px; font-weight: 700; color: var(--text-muted); }
  .bp-hero-name { font-size: 25px; font-weight: 800; color: var(--text-primary); text-transform: capitalize; line-height: 1.1; letter-spacing: -0.02em; }
  .bp-types { display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap; }
  .bp-type { color: #fff; padding: 3px 11px; border-radius: 999px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; }
  .bp-sec { background: var(--bg-card); border-radius: 14px; padding: 13px 14px; margin-top: 10px; box-shadow: 0 0 0 0.5px var(--border) inset; }
  .bp-sec-title { font-size: 11px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 7px; }
  .bp-sec-body { font-size: 13px; color: var(--text-primary); line-height: 1.6; font-weight: 500; }
  .bp-fortune { font-size: 13px; color: var(--text-primary); line-height: 1.6; font-weight: 500; font-style: italic; padding: 9px 12px; border-radius: 10px; background: color-mix(in srgb, var(--ac) 10%, transparent); border-left: 3px solid var(--ac); }
  .bp-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(128px, 1fr)); gap: 8px; margin-top: 10px; }
  .bp-stat { background: var(--bg-card); border-radius: 14px; padding: 12px; text-align: center; box-shadow: 0 0 0 0.5px var(--border) inset; }
  .bp-stat-label { font-size: 9px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; color: var(--text-muted); }
  .bp-stat-val { font-size: 15px; font-weight: 800; color: var(--text-primary); margin-top: 5px; display: flex; align-items: center; justify-content: center; gap: 6px; }
  .bp-swatch { width: 14px; height: 14px; border-radius: 5px; box-shadow: 0 0 0 2px var(--bg-card); }
  .bp-pc-foot { margin-top: 14px; padding-top: 10px; border-top: 1px dashed var(--border); display: flex; justify-content: space-between; font-size: 9px; color: var(--text-muted); font-weight: 600; }
  .bp-actions { display: flex; gap: 8px; margin-top: 14px; }
  .bp-btn { flex: 1; padding: 13px; border-radius: 14px; border: none; cursor: pointer; font-family: inherit; font-size: 13.5px; font-weight: 600; letter-spacing: -0.01em; display: inline-flex; align-items: center; justify-content: center; gap: 7px; transition: background .2s, transform .15s; }
  .bp-btn:active { transform: scale(0.98); }
  .bp-btn.primary { background: var(--blue); color: #fff; }
  .bp-btn.ghost { background: var(--bg-muted); color: var(--text-primary); }
  .bp-btn:disabled { opacity: 0.5; cursor: default; }
`;

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
              unlucky: { name: { th: "น้ำเงิน", en: "Blue", ja: "青" }, hex: "#900603" } },
  water:    { lucky: { name: { th: "ฟ้า / น้ำเงิน", en: "Blue / Cyan", ja: "青 / 水色" }, hex: "#900603" },
              unlucky: { name: { th: "เหลือง", en: "Yellow", ja: "黄色" }, hex: "#facc15" } },
  grass:    { lucky: { name: { th: "เขียว", en: "Green", ja: "緑" }, hex: "#16a34a" },
              unlucky: { name: { th: "แดง / ส้ม", en: "Red / Orange", ja: "赤 / オレンジ" }, hex: "#ef4444" } },
  electric: { lucky: { name: { th: "เหลือง / ทอง", en: "Yellow / Gold", ja: "黄 / 金" }, hex: "#facc15" },
              unlucky: { name: { th: "น้ำตาล", en: "Brown", ja: "茶色" }, hex: "#92400e" } },
  psychic:  { lucky: { name: { th: "ชมพู / ม่วง", en: "Pink / Purple", ja: "ピンク / 紫" }, hex: "#ec4899" },
              unlucky: { name: { th: "ดำ", en: "Black", ja: "黒" }, hex: "#1f2937" } },
  dark:     { lucky: { name: { th: "ดำ / น้ำเงินเข้ม", en: "Black / Navy", ja: "黒 / 紺" }, hex: "#1f2937" },
              unlucky: { name: { th: "ชมพู", en: "Pink", ja: "ピンク" }, hex: "#ec4899" } },
  ghost:    { lucky: { name: { th: "ม่วง", en: "Purple", ja: "紫" }, hex: "#b5302d" },
              unlucky: { name: { th: "ขาว", en: "White", ja: "白" }, hex: "#f3f4f6" } },
  steel:    { lucky: { name: { th: "เงิน / เทา", en: "Silver / Gray", ja: "銀 / 灰色" }, hex: "#94a3b8" },
              unlucky: { name: { th: "แดง", en: "Red", ja: "赤" }, hex: "#ef4444" } },
  dragon:   { lucky: { name: { th: "ม่วงทอง", en: "Royal Purple", ja: "ロイヤルパープル" }, hex: "#900603" },
              unlucky: { name: { th: "ฟ้าอ่อน", en: "Light Blue", ja: "水色" }, hex: "#7dd3fc" } },
  fairy:    { lucky: { name: { th: "ชมพู / พีช", en: "Pink / Peach", ja: "ピンク / ピーチ" }, hex: "#f472b6" },
              unlucky: { name: { th: "เทาดำ", en: "Dark Gray", ja: "ダークグレー" }, hex: "#374151" } },
  fighting: { lucky: { name: { th: "ส้มเลือดหมู", en: "Burnt Orange", ja: "バーントオレンジ" }, hex: "#ea580c" },
              unlucky: { name: { th: "ม่วง", en: "Purple", ja: "紫" }, hex: "#b5302d" } },
  ground:   { lucky: { name: { th: "น้ำตาล / เบจ", en: "Brown / Beige", ja: "茶 / ベージュ" }, hex: "#a16207" },
              unlucky: { name: { th: "ฟ้า", en: "Sky Blue", ja: "空色" }, hex: "#a31a16" } },
  rock:     { lucky: { name: { th: "น้ำตาลเข้ม", en: "Dark Brown", ja: "ダークブラウン" }, hex: "#78350f" },
              unlucky: { name: { th: "เขียว", en: "Green", ja: "緑" }, hex: "#16a34a" } },
  ice:      { lucky: { name: { th: "ฟ้าใส / ขาว", en: "Ice Blue / White", ja: "アイスブルー / 白" }, hex: "#67e8f9" },
              unlucky: { name: { th: "แดง", en: "Red", ja: "赤" }, hex: "#dc2626" } },
  bug:      { lucky: { name: { th: "เขียวมะกอก", en: "Olive Green", ja: "オリーブグリーン" }, hex: "#65a30d" },
              unlucky: { name: { th: "ส้มสด", en: "Bright Orange", ja: "オレンジ" }, hex: "#f97316" } },
  flying:   { lucky: { name: { th: "ฟ้าใส", en: "Sky Blue", ja: "空色" }, hex: "#be3a34" },
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
    <div className="mf-overlay" onClick={onClose}>
      <style>{MINIMAL_FEATURE_CSS + BP_CSS}</style>
      <div className="mf-card" onClick={(e) => e.stopPropagation()}>
        <button className="mf-close" onClick={onClose}><X size={16} strokeWidth={2.4} /></button>

        <div className="mf-head">
          <span className="mf-head-ic"><Sparkles size={22} strokeWidth={2.2} /></span>
          <div>
            <h1 className="mf-title">{t("ดูดวงโปเกมอน", "Pokémon Horoscope", "ポケモン占い")}</h1>
            <p className="mf-sub">{t("กรอกวันเกิด ค้นพบคู่ดวงและคำทำนาย", "Enter your birthday for your match & fortune", "誕生日から運命を占う")}</p>
          </div>
        </div>

        {savedMsg && (
          <div className={`bp-msg ${savedMsg.includes("ล้มเหลว") || savedMsg.includes("failed") || savedMsg.includes("失敗") ? "err" : "ok"}`}>
            {savedMsg}
          </div>
        )}

        {/* Date input */}
        <div className="bp-input-card">
          <label className="bp-input-label"><Cake size={14} strokeWidth={2.2} /> {t("วันเกิดของคุณ", "Your Birthday", "あなたの誕生日")}</label>
          <input className="bp-date" type="date" value={birthday}
            max={new Date().toISOString().slice(0,10)}
            onChange={(e) => setBirthday(e.target.value)} />
        </div>

        {!birthday && (
          <div className="bp-empty">
            <div className="bp-empty-ic"><Sparkles size={52} strokeWidth={1.8} /></div>
            <div className="bp-empty-txt">
              {t("กรอกวันเกิดเพื่อค้นพบโปเกมอนคู่ดวงและคำทำนายของคุณ",
                 "Enter your birthday to discover your Pokémon soulmate and fortune",
                 "誕生日を入力して、ポケモンソウルメイトと占いを発見しよう")}
            </div>
          </div>
        )}

        {loading && (
          <div className="bp-empty">
            <div className="bp-empty-ic"><Loader2 size={40} strokeWidth={2} className="bp-spin" /></div>
            <div className="bp-empty-txt">{t("กำลังค้นหาโปเกมอนคู่ดวง...","Reading your fortune...","運命のポケモン検索中...")}</div>
          </div>
        )}

        {/* POSTCARD — captured by html2canvas */}
        {pokemon && !loading && (
          <div ref={postcardRef} className="bp-card" style={{ "--ac": typeColor(primaryType) }}>
            <div className="bp-pc-head">
              <div className="bp-pc-title"><Sparkles size={16} strokeWidth={2.2} /> {t("โปเกมอนคู่ดวงของคุณ", "Your Pokémon Soulmate", "あなたのポケモン")}</div>
              <div className="bp-pc-date">{dateInfo?.formatted} · {dateInfo?.element} {dateInfo?.dayName}</div>
            </div>

            <div className="bp-hero">
              <div className="bp-hero-art">
                {artUrl && <img src={artUrl} alt={pokeName} crossOrigin="anonymous" />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="bp-hero-id">{padId(pokemon.id)}</div>
                <div className="bp-hero-name">{pokeName}</div>
                <div className="bp-types">
                  {pokemon.types.map((tp) => {
                    const tname = tp.type.name;
                    const local = lang === "th" ? TYPE_NAMES_TH[tname]
                                : lang === "ja" ? TYPE_NAMES_JA[tname]
                                : tname.charAt(0).toUpperCase() + tname.slice(1);
                    return <span key={tname} className="bp-type" style={{ background: typeColor(tname) }}>{local}</span>;
                  })}
                </div>
              </div>
            </div>

            <Section title={t("บุคลิกของคุณ", "Your Personality", "あなたの性格")}>
              <div className="bp-sec-body">{personality[lang] ?? personality.en}</div>
            </Section>

            <Section title={t("คำทำนายประจำวัน", "Daily Fortune", "今日の運勢")}>
              <div className="bp-fortune">"{dailyFortune}"</div>
            </Section>

            <div className="bp-stats">
              <StatCard label={t("เลขนำโชค","Lucky Number","ラッキーナンバー")} value={luckyNumber} />
              <StatCard label={t("สีมงคล","Lucky Color","ラッキーカラー")}
                        value={colorFortune.lucky.name[lang] ?? colorFortune.lucky.name.en} swatch={colorFortune.lucky.hex} />
              <StatCard label={t("สีอัปมงคล","Unlucky Color","アンラッキーカラー")}
                        value={colorFortune.unlucky.name[lang] ?? colorFortune.unlucky.name.en} swatch={colorFortune.unlucky.hex} />
            </div>

            {compatibles.length > 0 && (
              <Section title={t("ธาตุที่เข้ากันได้","Compatible Types","相性の良いタイプ")}>
                <div className="bp-types">
                  {compatibles.map((typ) => {
                    const local = lang === "th" ? TYPE_NAMES_TH[typ]
                                : lang === "ja" ? TYPE_NAMES_JA[typ]
                                : typ.charAt(0).toUpperCase() + typ.slice(1);
                    return <span key={typ} className="bp-type" style={{ background: typeColor(typ) }}>{local}</span>;
                  })}
                </div>
              </Section>
            )}

            <div className="bp-pc-foot">
              <span>✦ HexaDex Horoscope</span>
              <span>{new Date().toISOString().slice(0,10)}</span>
            </div>
          </div>
        )}

        {/* Actions */}
        {pokemon && !loading && (
          <div className="bp-actions">
            <button className="bp-btn ghost" onClick={handleSavePostcard} disabled={saving}>
              {saving ? <Loader2 size={15} strokeWidth={2.2} className="bp-spin" /> : <Download size={15} strokeWidth={2.2} />}
              {saving ? t("กำลังบันทึก...","Saving...","保存中...") : t("เซฟการ์ด","Save Card","保存")}
            </button>
            <button className="bp-btn primary" onClick={() => { onClose?.(); onOpen?.(pokemon); }}>
              <Search size={15} strokeWidth={2.2} /> {t("ดูข้อมูลเต็ม","Full Entry","完全データ")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bp-sec">
      <div className="bp-sec-title">{title}</div>
      {children}
    </div>
  );
}

function StatCard({ label, value, swatch }) {
  return (
    <div className="bp-stat">
      <div className="bp-stat-label">{label}</div>
      <div className="bp-stat-val">
        {swatch && <span className="bp-swatch" style={{ background: swatch }} />}
        {value}
      </div>
    </div>
  );
}