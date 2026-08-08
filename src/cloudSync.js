// Cloud-sync helpers shared by AuthContext.jsx for every "save this to my
// account" feature (pet care, team builder, catch stats, ...). Each slot
// reads/writes its own known localStorage keys directly here instead of
// importing from its component module — those are often heavy/lazy-loaded,
// and importing them into AuthContext (mounted eagerly at the app root)
// would undo that code-splitting.

export const PET_KEYS = [
  "pkdx_pet_v1", "pkdx_buddy_roaming", "pkdx_pet_coins", "pkdx_pet_food",
  "pkdx_pet_quests", "pkdx_pet_streak", "pkdx_pet_ach", "pkdx_pet_life",
  "pkdx_pet_hall", "pkdx_pet_sfx", "pkdx_pet_onboarded", "pkdx_seen_event",
];

export const TEAM_KEYS = [
  "pkdx_team_v1", "pkdx_team_mode_v2", "pkdx_team_data_v2",
  "pkdx_team_normal_v2", "pkdx_team_data_normal_v2",
];

export const CATCH_KEYS = [
  "pkdx_caught_count", "pkdx_catch_combo", "pkdx_candy", "pkdx_xp",
  "pkdx_catch_tutorial_seen",
];

// Every cloud-synced slot: `name` matches the /api/sync/<name> endpoint,
// `keys` are the localStorage keys it covers, and `primaryKey` is checked
// for existence to decide "has this device ever touched this feature" —
// if so, local data wins and never gets silently overwritten by the cloud.
export const SYNC_SLOTS = [
  { name: "pet",        keys: PET_KEYS,   primaryKey: "pkdx_pet_v1" },
  { name: "team",       keys: TEAM_KEYS,  primaryKey: "pkdx_team_v1" },
  { name: "catchstats", keys: CATCH_KEYS, primaryKey: "pkdx_caught_count" },
];

// Separate from `keys` on purpose: releasing a pet (or resetting a team)
// removes the slot's primaryKey from localStorage, but we still need to
// know "this device has synced this slot before" so that deletion gets
// pushed to the cloud too — otherwise the next login's restore (which only
// triggers when primaryKey is absent) would resurrect the released pet from
// the stale cloud copy instead of respecting the release.
function touchedKey(slotName) {
  return `pkdx_sync_touched_${slotName}`;
}

export function hasEverSynced(slotName) {
  try { return !!localStorage.getItem(touchedKey(slotName)); } catch { return false; }
}

export function markSynced(slotName) {
  try { localStorage.setItem(touchedKey(slotName), "1"); } catch {}
}

export function clearSynced(slotName) {
  try { localStorage.removeItem(touchedKey(slotName)); } catch {}
}

export function readSnapshot(keys) {
  const out = {};
  for (const k of keys) {
    try { const v = localStorage.getItem(k); if (v !== null) out[k] = v; } catch {}
  }
  return out;
}

export function writeSnapshot(keys, data) {
  for (const k of keys) {
    if (data[k] !== undefined) {
      try { localStorage.setItem(k, data[k]); } catch {}
    }
  }
}

// Wipe a slot's local data on logout — it's saved to the account now, so
// the browser goes back to a clean guest state instead of keeping showing
// someone else's progress.
export function clearSnapshot(keys) {
  for (const k of keys) {
    try { localStorage.removeItem(k); } catch {}
  }
}
