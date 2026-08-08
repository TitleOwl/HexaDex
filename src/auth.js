async function call(path, { method = "GET", body } = {}) {
  const res = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "เกิดข้อผิดพลาด กรุณาลองใหม่");
  return data;
}

export const authApi = {
  me: () => call("/api/auth/me"),
  login: (username, password, rememberMe = true) =>
    call("/api/auth/login", { method: "POST", body: { username, password, rememberMe } }),
  register: (username, password, confirmPassword) =>
    call("/api/auth/register", { method: "POST", body: { username, password, confirmPassword } }),
  logout: () => call("/api/auth/logout", { method: "POST" }),
  updateProfile: (fields) => call("/api/auth/profile", { method: "POST", body: fields }),
};

export const catchApi = {
  increment: () => call("/api/catch/increment", { method: "POST" }),
  leaderboard: () => call("/api/catch/leaderboard"),
};

export const favoritesApi = {
  list: () => call("/api/favorites"),
  toggle: (id) => call("/api/favorites", { method: "POST", body: { id } }),
};

export const syncApi = {
  load: (slot) => call(`/api/sync/${slot}`),
  save: (slot, data) => call(`/api/sync/${slot}`, { method: "POST", body: data }),
};
