import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authApi, catchApi } from "./auth.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authApi.me()
      .then((u) => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username, password, rememberMe = true) => {
    const u = await authApi.login(username, password, rememberMe);
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (username, password, confirmPassword) => {
    const u = await authApi.register(username, password, confirmPassword);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => {});
    setUser(null);
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

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
