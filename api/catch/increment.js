import { requireKv } from "../_lib/kv.js";
import { getSession } from "../_lib/auth.js";

export const LEADERBOARD_KEY = "leaderboard:catches";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = getSession(req);
  if (!session) {
    // Guests still play the catch game locally — just nothing to sync.
    return res.status(401).json({ error: "not authenticated" });
  }

  try {
    const kv = requireKv();
    const total = await kv.zincrby(LEADERBOARD_KEY, 1, session.username.toLowerCase());
    return res.status(200).json({ total });
  } catch (err) {
    console.error("catch increment error", err);
    return res.status(err.status || 500).json({ error: err.message || "Server error" });
  }
}
