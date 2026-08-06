import { requireKv } from "../_lib/kv.js";
import { getSession } from "../_lib/auth.js";
import { readJsonBody } from "../_lib/auth.js";

function favoritesKey(username) {
  return `favorites:${username.toLowerCase()}`;
}

export default async function handler(req, res) {
  const session = getSession(req);
  if (!session) {
    // Guests keep favorites client-side only — nothing to sync.
    return res.status(401).json({ error: "not authenticated" });
  }

  try {
    const kv = requireKv();
    const key = favoritesKey(session.username);

    if (req.method === "GET") {
      const ids = await kv.smembers(key);
      return res.status(200).json({ favorites: (ids || []).map(Number) });
    }

    if (req.method === "POST") {
      const { id } = readJsonBody(req);
      const pokemonId = Number(id);
      if (!Number.isInteger(pokemonId) || pokemonId <= 0) {
        return res.status(400).json({ error: "invalid pokemon id" });
      }

      const isMember = await kv.sismember(key, pokemonId);
      if (isMember) {
        await kv.srem(key, pokemonId);
      } else {
        await kv.sadd(key, pokemonId);
      }

      const ids = await kv.smembers(key);
      return res.status(200).json({ favorites: ids.map(Number) });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("favorites error", err);
    return res.status(err.status || 500).json({ error: err.message || "Server error" });
  }
}
