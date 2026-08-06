import crypto from "node:crypto";
import { requireKv } from "./kv.js";

const SESSION_SECRET = process.env.AUTH_SECRET || "hexadex-dev-insecure-secret";
const COOKIE_NAME = "hexadex_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days, in seconds

// ─── Password hashing (scrypt, no extra deps) ──────────────────
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || "").split(":");
  if (!salt || !hash) return false;
  const test = crypto.scryptSync(password, salt, 64).toString("hex");
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(test, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ─── Session tokens (HMAC-signed, stateless) ───────────────────
function signToken(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", SESSION_SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verifyToken(token) {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = crypto.createHmac("sha256", SESSION_SECRET).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getCookie(req, name) {
  const header = req.headers?.cookie;
  if (!header) return null;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return null;
}

function isSecureRequest(req) {
  return process.env.VERCEL === "1" || req.headers?.["x-forwarded-proto"] === "https";
}

export function getSession(req) {
  return verifyToken(getCookie(req, COOKIE_NAME));
}

// `remember: false` drops Max-Age so the cookie dies with the browser
// session instead of persisting 30 days — the "Remember me" checkbox.
export function setSessionCookie(res, req, payload, { remember = true } = {}) {
  const token = signToken({ ...payload, exp: Date.now() + SESSION_MAX_AGE * 1000 });
  const secure = isSecureRequest(req) ? " Secure;" : "";
  const maxAge = remember ? ` Max-Age=${SESSION_MAX_AGE};` : "";
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${token}; HttpOnly; Path=/;${maxAge} SameSite=Lax;${secure}`
  );
}

export function clearSessionCookie(res, req) {
  const secure = isSecureRequest(req) ? " Secure;" : "";
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax;${secure}`);
}

// ─── Trainer ID — random 6-digit ID, Pokémon-style ─────────────
export async function generateTrainerId() {
  const kv = requireKv();
  for (let i = 0; i < 8; i++) {
    const id = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
    const taken = await kv.get(`trainerid:${id}`);
    if (!taken) return id;
  }
  throw new Error("Could not generate a unique Trainer ID, try again");
}

export function readJsonBody(req) {
  return req.body && typeof req.body === "object" ? req.body : {};
}

// ─── Shape a KV user record for API responses (never leak passwordHash) ─
export function publicUser(u) {
  return {
    username: u.username,
    trainerId: u.trainerId,
    birthday: u.birthday ?? null,
    starter: u.starter ?? null,
  };
}
