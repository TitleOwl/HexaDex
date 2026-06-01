// ═══════════════════════════════════════════════════════════
// trainerLevel.js — Pokemon GO-style trainer level system
// • XP accumulates across catches
// • Level unlocks better balls/berries
// • Trainer Rank tiers (Rookie → Master)
// ═══════════════════════════════════════════════════════════

const STORAGE_KEY = "pkdx_trainer_xp";
const MAX_LEVEL = 50;

// XP required to LEVEL UP from level N (going N → N+1)
// Scales gradually so early levels are quick, later ones grindy
function xpForLevel(level) {
  if (level <= 5)  return 100 + (level - 1) * 100;       // 100, 200, 300, 400, 500
  if (level <= 15) return 500 + (level - 5) * 200;       // 700, 900, 1100, ...
  if (level <= 25) return 2500 + (level - 15) * 400;     // 2900, 3300, ...
  if (level <= 35) return 6500 + (level - 25) * 800;     // 7300, 8100, ...
  return 14500 + (level - 35) * 1500;                    // 16000, 17500, ...
}

export function getStoredXP() {
  try { return parseInt(localStorage.getItem(STORAGE_KEY) ?? "0", 10); }
  catch { return 0; }
}

export function getLevelInfo(totalXP = getStoredXP()) {
  let level = 1;
  let remaining = totalXP;
  let needed = xpForLevel(level);
  while (remaining >= needed && level < MAX_LEVEL) {
    remaining -= needed;
    level++;
    needed = xpForLevel(level);
  }
  return {
    level,
    currentXP: remaining,
    xpToNext: Math.max(0, needed - remaining),
    nextLevelXP: needed,
    progress: Math.min(1, remaining / needed),
    totalXP,
    isMax: level >= MAX_LEVEL,
  };
}

export function addXP(amount) {
  const current = getStoredXP();
  const newTotal = current + amount;
  try { localStorage.setItem(STORAGE_KEY, String(newTotal)); } catch {}
  const before = getLevelInfo(current);
  const after = getLevelInfo(newTotal);
  return { before, after, leveledUp: after.level > before.level };
}

// ─── Trainer Rank Tiers ──────────────────────────────────────
export function getTrainerRank(level) {
  if (level >= 40) return { name: "Master",     icon: "👑", gradient: "linear-gradient(135deg, #a855f7 0%, #6d28d9 100%)", color: "#a855f7" };
  if (level >= 30) return { name: "Expert",     icon: "⭐", gradient: "linear-gradient(135deg, #fbbf24 0%, #b45309 100%)", color: "#f59e0b" };
  if (level >= 20) return { name: "Veteran",    icon: "💎", gradient: "linear-gradient(135deg, #06b6d4 0%, #0e7490 100%)", color: "#06b6d4" };
  if (level >= 10) return { name: "Adventurer", icon: "🌿", gradient: "linear-gradient(135deg, #22c55e 0%, #15803d 100%)", color: "#22c55e" };
  if (level >= 5)  return { name: "Trainer",    icon: "🎓", gradient: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)", color: "#3b82f6" };
  return                  { name: "Rookie",     icon: "🌱", gradient: "linear-gradient(135deg, #94a3b8 0%, #475569 100%)", color: "#94a3b8" };
}

// ─── Unlock requirements (Pokemon GO inspired) ───────────────
// Format: itemId → level required
export const UNLOCK_LEVELS = {
  // Standard balls
  "poke-ball":    1,
  "great-ball":   8,
  "ultra-ball":   12,
  "master-ball":  30,
  // Apricorn balls (Johto, available from Lv 5)
  "fast-ball":    5,
  "level-ball":   5,
  "lure-ball":    5,
  "heavy-ball":   5,
  "love-ball":    10,
  "friend-ball":  10,
  "moon-ball":    10,
  // Special balls
  "safari-ball":  15,
  "sport-ball":   15,
  "net-ball":     5,
  "nest-ball":    8,
  "repeat-ball":  12,
  "timer-ball":   15,
  "luxury-ball":  18,
  "premier-ball": 20,
  "dive-ball":    12,
  "dusk-ball":    15,
  "heal-ball":    8,
  "quick-ball":   15,
  "cherish-ball": 25,
  // Mythical balls
  "park-ball":    35,
  "dream-ball":   20,
  "beast-ball":   40,
  // Berries
  "razz-berry":   1,
  "nanab-berry":  3,
  "pinap-berry":  5,
  "golden-razz":  20,
  "silver-pinap": 25,
};

export function getUnlockLevel(itemId) {
  return UNLOCK_LEVELS[itemId] ?? 1;
}

export function isUnlocked(itemId, level) {
  return level >= getUnlockLevel(itemId);
}
