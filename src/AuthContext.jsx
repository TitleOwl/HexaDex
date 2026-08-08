import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { authApi, catchApi, syncApi } from "./auth.js";
import {
  SYNC_SLOTS, readSnapshot, writeSnapshot, clearSnapshot,
  hasEverSynced, markSynced, clearSynced,
} from "./cloudSync.js";

const AuthContext = createContext(null);

// Reads the language App.jsx already persists to localStorage, so this toast
// matches the rest of the UI without needing `lang` threaded down into here.
function saveToastText() {
  let lang = "en";
  try { lang = localStorage.getItem("pkdx_lang") ?? "en"; } catch {}
  if (lang === "th") return "บันทึกข้อมูลแล้ว ✓ กำลังออกจากระบบ...";
  if (lang === "ja") return "データを保存しました ✓ ログアウトしています...";
  return "Data saved ✓ Logging out...";
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savedToast, setSavedToast] = useState(false);
  // Per-slot: the last snapshot JSON we successfully pushed, so both the
  // periodic sync effect and logout() can tell what's still unsaved.
  const lastSentRef = useRef({});
  // Set by an explicit login/register call, consumed by the sync effect
  // below — distinguishes "just logged in" from "page loaded with an
  // already-active session", so the buddy only greets you on the former.
  const justLoggedInRef = useRef(false);

  useEffect(() => {
    authApi.me()
      .then((u) => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username, password, rememberMe = true) => {
    const u = await authApi.login(username, password, rememberMe);
    justLoggedInRef.current = true;
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (username, password, confirmPassword) => {
    const u = await authApi.register(username, password, confirmPassword);
    justLoggedInRef.current = true;
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    // Flush any progress (pet, team, catch stats) that hasn't made it to
    // the server yet, so logging out never silently drops it.
    let savedAnything = false;
    for (const slot of SYNC_SLOTS) {
      const snap = readSnapshot(slot.keys);
      // Sync if there's data now, OR this slot was synced before and might
      // now be empty (e.g. a released pet) — that deletion needs to reach
      // the cloud too, or the next login's restore would resurrect it.
      if (!snap[slot.primaryKey] && !hasEverSynced(slot.name)) continue;
      const json = JSON.stringify(snap);
      if (json === lastSentRef.current[slot.name]) continue;
      try {
        await syncApi.save(slot.name, snap);
        lastSentRef.current[slot.name] = json;
        markSynced(slot.name);
        savedAnything = true;
      } catch {}
    }
    if (savedAnything) {
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 3200);
    }

    await authApi.logout().catch(() => {});
    setUser(null);

    // If the Pet Care screen is still open, force it closed first — its own
    // decay-tick effect writes the in-memory pet back to localStorage every
    // few seconds, which would undo the clear below if it were still
    // mounted. Give React a tick to actually unmount it before wiping.
    window.dispatchEvent(new CustomEvent("pet:force-close"));
    await new Promise((r) => setTimeout(r, 50));

    // Everything is safe on the account now — clear the local slate for
    // every slot so the home screen (roaming buddy, etc.) goes back to a
    // clean guest state instead of keeping showing someone else's progress.
    for (const slot of SYNC_SLOTS) { clearSnapshot(slot.keys); clearSynced(slot.name); }
    window.dispatchEvent(new CustomEvent("pet:update"));
  }, []);

  const updateProfile = useCallback(async (fields) => {
    const u = await authApi.updateProfile(fields);
    setUser(u);
    return u;
  }, []);

  // CatchAnimation.jsx already dispatches this on every successful catch
  // (it drives the in-game critical-catch-chance mechanic) — piggyback on it
  // to sync the server-side leaderboard count instead of touching that file.
  useEffect(() => {
    if (!user) return;
    const onCaught = () => { catchApi.increment().catch(() => {}); };
    window.addEventListener("pokemon:caught", onCaught);
    return () => window.removeEventListener("pokemon:caught", onCaught);
  }, [user]);

  // Cloud-sync every registered slot (pet care, team builder, catch stats)
  // for logged-in users, on top of the localStorage save guests already get.
  // Restore only kicks in on a device with no local data yet for that slot
  // — local play always wins, so logging in never silently overwrites
  // progress in front of you. After that, poll for changes and push
  // periodically + on hide/close, rather than hooking every game action.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    lastSentRef.current = {};
    const wasLogin = justLoggedInRef.current;
    justLoggedInRef.current = false;

    // Welcome-back: if this device already has a pet, send it out roaming
    // right away — no need to wait on the network for that part.
    if (wasLogin && localStorage.getItem("pkdx_pet_v1")) {
      try { localStorage.setItem("pkdx_buddy_roaming", "1"); } catch {}
      window.dispatchEvent(new CustomEvent("pet:update"));
      window.dispatchEvent(new CustomEvent("pet:welcome-back"));
    }

    for (const slot of SYNC_SLOTS) {
      syncApi.load(slot.name).then((res) => {
        if (cancelled || !res?.data) return;
        // Only restore onto a device that has truly never touched this
        // slot — if it was synced before and is empty now (e.g. released),
        // that's an intentional deletion, not a blank slate to fill in.
        if (!localStorage.getItem(slot.primaryKey) && !hasEverSynced(slot.name)) {
          writeSnapshot(slot.keys, res.data);
          lastSentRef.current[slot.name] = JSON.stringify(res.data);
          markSynced(slot.name);
          window.dispatchEvent(new CustomEvent("pet:update"));
          // Same greeting, for a pet that just got restored from the cloud
          // onto a fresh device (didn't have one locally a moment ago).
          if (slot.name === "pet" && wasLogin) {
            try { localStorage.setItem("pkdx_buddy_roaming", "1"); } catch {}
            window.dispatchEvent(new CustomEvent("pet:welcome-back"));
          }
        }
      }).catch(() => {});
    }

    const pushSlot = (slot, keepalive) => {
      const snap = readSnapshot(slot.keys);
      if (!snap[slot.primaryKey] && !hasEverSynced(slot.name)) return;
      const json = JSON.stringify(snap);
      if (json === lastSentRef.current[slot.name]) return;
      lastSentRef.current[slot.name] = json;
      if (keepalive) {
        try {
          fetch(`/api/sync/${slot.name}`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(snap),
            keepalive: true,
          });
        } catch {}
      } else {
        syncApi.save(slot.name, snap).catch(() => {});
      }
      markSynced(slot.name);
    };

    const pushAll = () => { for (const slot of SYNC_SLOTS) pushSlot(slot, false); };
    const flushOnHide = () => {
      if (document.visibilityState !== "hidden") return;
      for (const slot of SYNC_SLOTS) pushSlot(slot, true);
    };

    const interval = setInterval(pushAll, 20000);
    document.addEventListener("visibilitychange", flushOnHide);
    window.addEventListener("pagehide", flushOnHide);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", flushOnHide);
      window.removeEventListener("pagehide", flushOnHide);
    };
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile }}>
      {children}
      {savedToast && (
        <div className="pet-save-toast" role="status">
          {saveToastText()}
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
