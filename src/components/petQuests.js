// ─── petQuests — coins, daily missions & food shop for the buddy game ───
//
// Using the app earns COINS (open daily, view Pokémon to learn their faces,
// play mini-games). Spend coins in the shop to buy food, then feed the buddy.
// All state lives in localStorage; changes fire events so open UI refreshes.

const COIN_KEY = "pkdx_pet_coins";
const FOOD_KEY = "pkdx_pet_food";
const Q_KEY    = "pkdx_pet_quests";
export const COIN_EVENT  = "pet:coins";
export const FOOD_EVENT  = "pet:food";
export const QUEST_EVENT = "pet:quests";

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
