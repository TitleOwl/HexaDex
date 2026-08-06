import { requireKv } from "../_lib/kv.js";
import { getSession, publicUser } from "../_lib/auth.js";

export default async function handler(req, res) {
  const session = getSession(req);
  if (!session) {
    return res.status(401).json({ error: "not authenticated" });
  }

  try {
    const kv = requireKv();
    const user = await kv.get(`user:${session.username.toLowerCase()}`);
    if (!user) {
      return res.status(401).json({ error: "not authenticated" });
    }
    return res.status(200).json(publicUser(user));
  } catch (err) {
    console.error("me error", err);
    return res.status(err.status || 500).json({ error: err.message || "Server error" });
  }
}
