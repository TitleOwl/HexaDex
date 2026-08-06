import { Redis } from "@upstash/redis";

// Vercel's Redis (Upstash) marketplace integration exposes REST creds under
// KV_REST_API_* by default, but a renamed/custom integration may expose them
// as UPSTASH_REDIS_REST_*. Accept either so this works regardless of the
// integration name chosen in the Vercel dashboard.
const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

if (!url || !token) {
  console.warn(
    "[kv] No Redis REST credentials found — set KV_REST_API_URL/KV_REST_API_TOKEN " +
    "(or UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN) via a Vercel Redis integration."
  );
}

export const kv = url && token ? new Redis({ url, token }) : null;

export function requireKv() {
  if (!kv) {
    const err = new Error("Database not configured — missing Redis env vars");
    err.status = 500;
    throw err;
  }
  return kv;
}
