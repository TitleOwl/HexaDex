// ─── petQuests — coins, daily missions & food shop for the buddy game ───
//
// Using the app earns COINS (open daily, view Pokémon to learn their faces,
// play mini-games). Spend coins in the shop to buy food, then feed the buddy.
// All state lives in localStorage; changes fire events so open UI refreshes.

const COIN_KEY = "pkdx_pet_coins";
const FOOD_KEY = "pkdx_pet_food";
const Q_KEY    = "pkdx_pet_quests";
const STREAK_KEY = "pkdx_pet_streak";
const ACH_KEY    = "pkdx_pet_ach";
const LIFE_KEY   = "pkdx_pet_life";
const HALL_KEY   = "pkdx_pet_hall";
export const COIN_EVENT  = "pet:coins";
export const FOOD_EVENT  = "pet:food";
export const QUEST_EVENT = "pet:quests";
export const ACH_EVENT   = "pet:ach";

// Food tiers — price (coins) and hunger restored
export const FOOD = [
  { key: "t1", tier: 1, th: "เบอร์รี่",   en: "Berry",  slug: "oran-berry",   hunger: 12, price: 5  },
  { key: "t2", tier: 2, th: "ผลไม้พิเศษ", en: "Sitrus", slug: "sitrus-berry", hunger: 28, price: 12 },
  { key: "t3", tier: 3, th: "มื้อใหญ่",   en: "Feast",  slug: "casteliacone", hunger: 55, price: 25 },
];

// Daily missions — completing them awards COINS
export const QUESTS = [
  { id: "login",  type: "login", goal: 1,  coins: 10,
    th: "เปิดแอปวันนี้",      en: "Open the app today" },
  { id: "view8",  type: "view",  goal: 8,  coins: 15,
    th: "ดูโปเกมอน 8 ตัว",   en: "View 8 Pokémon" },
  { id: "view25", type: "view",  goal: 25, coins: 30,
    th: "ดูโปเกมอน 25 ตัว",  en: "View 25 Pokémon" },
  { id: "game",   type: "game",  goal: 1,  coins: 12,
    th: "เล่นมินิเกม 1 รอบ", en: "Play a mini-game" },
];

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};
const dayStr = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
const yesterdayStr = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dayStr(d); };

// ─── Coins ───
export function readCoins() {
  try {
    const raw = localStorage.getItem(COIN_KEY);
    if (raw != null) return parseInt(raw) || 0;
  } catch {}
  try { localStorage.setItem(COIN_KEY, "25"); } catch {} // small starter purse
  return 25;
}
function writeCoins(n) {
  try { localStorage.setItem(COIN_KEY, String(Math.max(0, n))); } catch {}
  try { window.dispatchEvent(new CustomEvent(COIN_EVENT)); } catch {}
}
// Public helper to grant coins (mini-game wins, streak bonus, etc.)
export function awardCoins(n) {
  const next = readCoins() + Math.max(0, Math.round(n));
  writeCoins(next);
  return next;
}

// ─── Food inventory ───
export function readFood() {
  try {
    const raw = localStorage.getItem(FOOD_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const start = { t1: 2, t2: 0, t3: 0 }; // a couple of berries to begin
  try { localStorage.setItem(FOOD_KEY, JSON.stringify(start)); } catch {}
  return start;
}
function writeFood(f) {
  try { localStorage.setItem(FOOD_KEY, JSON.stringify(f)); } catch {}
  try { window.dispatchEvent(new CustomEvent(FOOD_EVENT)); } catch {}
}
export function totalFood(f = readFood()) {
  return (f.t1 || 0) + (f.t2 || 0) + (f.t3 || 0);
}

// Buy one food of a tier with coins; returns true on success
export function buyFood(tierKey) {
  const food = FOOD.find(x => x.key === tierKey);
  if (!food) return false;
  const coins = readCoins();
  if (coins < food.price) return false;
  writeCoins(coins - food.price);
  const f = readFood();
  f[tierKey] = (f[tierKey] || 0) + 1;
  writeFood(f);
  return true;
}

// Consume one food of the given tier; returns hunger restored (or 0 if none)
export function consumeFood(tierKey) {
  const f = readFood();
  if ((f[tierKey] || 0) <= 0) return 0;
  f[tierKey] -= 1;
  writeFood(f);
  return FOOD.find(x => x.key === tierKey)?.hunger ?? 0;
}

// ─── Quests (reset daily) ───
export function readQuests() {
  let q;
  try { q = JSON.parse(localStorage.getItem(Q_KEY) || "null"); } catch { q = null; }
  if (!q || q.date !== todayStr()) {
    q = { date: todayStr(), viewCount: 0, gameCount: 0, claimed: {} };
    try { localStorage.setItem(Q_KEY, JSON.stringify(q)); } catch {}
  }
  return q;
}
function writeQuests(q) {
  try { localStorage.setItem(Q_KEY, JSON.stringify(q)); } catch {}
  try { window.dispatchEvent(new CustomEvent(QUEST_EVENT)); } catch {}
}

export function questProgress(quest, q = readQuests()) {
  const cur = quest.type === "view" ? q.viewCount
            : quest.type === "game" ? q.gameCount
            : 1; // login is always met for today
  return Math.min(cur, quest.goal);
}
export function isClaimable(quest, q = readQuests()) {
  return !q.claimed?.[quest.id] && questProgress(quest, q) >= quest.goal;
}

// Called as the player uses the app
export function trackView() {
  const q = readQuests();
  q.viewCount = (q.viewCount || 0) + 1;
  writeQuests(q);
}
export function trackGame() {
  const q = readQuests();
  q.gameCount = (q.gameCount || 0) + 1;
  writeQuests(q);
}

// Claim a finished quest → adds coins. Returns coins awarded (or 0).
export function claimQuest(id) {
  const q = readQuests();
  const quest = QUESTS.find(x => x.id === id);
  if (!quest || !isClaimable(quest, q)) return 0;
  q.claimed = { ...(q.claimed || {}), [id]: true };
  writeQuests(q);
  writeCoins(readCoins() + quest.coins);
  return quest.coins;
}

// How many quests are ready to claim (for a badge)
export function claimableCount() {
  const q = readQuests();
  return QUESTS.filter(x => isClaimable(x, q)).length;
}

// ─── Daily care streak ───
export function readStreak() {
  let s; try { s = JSON.parse(localStorage.getItem(STREAK_KEY) || "null"); } catch {}
  return s || { count: 0, last: null, bonusDate: null };
}
function writeStreak(s) {
  try { localStorage.setItem(STREAK_KEY, JSON.stringify(s)); } catch {}
}
// Call once when the game opens — advances/keeps/resets the streak for today.
export function touchStreak() {
  const s = readStreak();
  const today = todayStr();
  if (s.last === today) return s;            // already counted today
  s.count = (s.last === yesterdayStr()) ? (s.count || 0) + 1 : 1;
  s.last = today;
  writeStreak(s);
  bumpLife("maxStreak", 0); // ensure life store exists
  const life = readLife();
  if (s.count > (life.maxStreak || 0)) { life.maxStreak = s.count; writeLife(life); }
  return s;
}
// Daily bonus scales with streak length; claimable once per day.
export function streakBonusAvailable() {
  const s = readStreak();
  return s.bonusDate !== todayStr();
}
export function streakBonusAmount(count = readStreak().count) {
  return 8 + Math.min(count, 7) * 4; // 12 (day1) … 36 (day7+)
}
export function claimStreakBonus() {
  const s = readStreak();
  if (s.bonusDate === todayStr()) return 0;
  const amt = streakBonusAmount(s.count);
  s.bonusDate = todayStr();
  writeStreak(s);
  awardCoins(amt);
  return amt;
}

// ─── Lifetime counters (drive achievements) ───
export function readLife() {
  let l; try { l = JSON.parse(localStorage.getItem(LIFE_KEY) || "null"); } catch {}
  return l || { feeds: 0, pats: 0, plays: 0, games: 0, evolves: 0, maxStreak: 0, hall: 0, maxBond: 0 };
}
function writeLife(l) {
  try { localStorage.setItem(LIFE_KEY, JSON.stringify(l)); } catch {}
}
export function bumpLife(key, n = 1) {
  const l = readLife();
  l[key] = (l[key] || 0) + n;
  writeLife(l);
  return l;
}
export function setLifeMax(key, val) {
  const l = readLife();
  if (val > (l[key] || 0)) { l[key] = val; writeLife(l); }
  return l;
}

// ─── Achievements ───
export const ACHIEVEMENTS = [
  { id: "adopt",   icon: "Egg",          th: "เพื่อนคนแรก",   en: "First Friend",  desc_th: "รับเลี้ยงบัดดี้",        desc_en: "Adopt a buddy" },
  { id: "evolve",  icon: "Sparkles",     th: "วิวัฒนาการ!",   en: "Evolution!",    desc_th: "ทำให้น้องวิวัฒนาการ",   desc_en: "Evolve your buddy" },
  { id: "final",   icon: "Crown",        th: "ร่างสุดท้าย",   en: "Final Form",    desc_th: "ไปถึงร่างสุดท้าย",       desc_en: "Reach the final stage" },
  { id: "lv10",    icon: "TrendingUp",   th: "ฝึกหนัก",       en: "Hard Worker",   desc_th: "เลี้ยงถึงเลเวล 10",     desc_en: "Reach level 10" },
  { id: "bond",    icon: "Heart",        th: "เพื่อนซี้",     en: "Best Friends",  desc_th: "ความผูกพันเต็ม 100",     desc_en: "Max out the bond" },
  { id: "feed25",  icon: "Drumstick",    th: "พ่อครัว",       en: "Chef",          desc_th: "ให้อาหาร 25 ครั้ง",      desc_en: "Feed 25 times" },
  { id: "game5",   icon: "Gamepad2",     th: "นักเล่นเกม",    en: "Gamer",         desc_th: "เล่นมินิเกม 5 รอบ",      desc_en: "Play 5 mini-games" },
  { id: "streak7", icon: "Flame",        th: "ขยันสุดๆ",      en: "Dedicated",     desc_th: "ดูแลต่อเนื่อง 7 วัน",    desc_en: "7-day care streak" },
  { id: "collect3",icon: "Trophy",       th: "นักสะสม",       en: "Collector",     desc_th: "สะสมน้องครบ 3 ตัว",      desc_en: "Collect 3 buddies" },
];
const ACH_BY_ID = Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a]));

export function readAchievements() {
  let a; try { a = JSON.parse(localStorage.getItem(ACH_KEY) || "null"); } catch {}
  return a || {};
}
function writeAch(a) {
  try { localStorage.setItem(ACH_KEY, JSON.stringify(a)); } catch {}
  try { window.dispatchEvent(new CustomEvent(ACH_EVENT)); } catch {}
}
// Unlock an achievement; returns its definition if NEWLY unlocked, else null.
export function unlockAchievement(id) {
  if (!ACH_BY_ID[id]) return null;
  const a = readAchievements();
  if (a[id]) return null;
  a[id] = Date.now();
  writeAch(a);
  return ACH_BY_ID[id];
}
export function achievementsUnlockedCount() {
  return Object.keys(readAchievements()).length;
}

// ─── Hall of Fame (released buddies) ───
export function readHall() {
  let h; try { h = JSON.parse(localStorage.getItem(HALL_KEY) || "null"); } catch {}
  return Array.isArray(h) ? h : [];
}
export function addToHall(entry) {
  const h = readHall();
  h.unshift({ ...entry, releasedAt: Date.now() });
  try { localStorage.setItem(HALL_KEY, JSON.stringify(h.slice(0, 60))); } catch {}
  setLifeMax("hall", h.length);
  return h;
}
