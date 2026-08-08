import { requireKv } from "./kv.js";
import { getSession } from "./auth.js";
import { readJsonBody } from "./auth.js";

// Shared GET/POST blob-save logic behind every /api/sync/<slot> endpoint —
// pet care, team builder, catch stats, and anything else added later all
// just save a snapshot of their own localStorage keys under their own
// per-user key. Each slot's file is a one-liner: createSyncHandler("name").
export function createSyncHandler(slotName) {
  return async function handler(req, res) {
    const session = getSession(req);
    if (!session) {
      // Guests keep playing locally — nothing to sync.
      return res.status(401).json({ error: "not authenticated" });
    }

    try {
      const kv = requireKv();
      const key = `sync:${slotName}:${session.username.toLowerCase()}`;

      if (req.method === "GET") {
        const data = await kv.get(key);
        return res.status(200).json({ data: data ?? null });
      }

      if (req.method === "POST") {
        const body = readJsonBody(req);
        if (!body || typeof body !== "object" || Array.isArray(body)) {
          return res.status(400).json({ error: "invalid save data" });
        }
        await kv.set(key, body);
        return res.status(200).json({ ok: true });
      }

      return res.status(405).json({ error: "Method not allowed" });
    } catch (err) {
      console.error(`sync/${slotName} error`, err);
      return res.status(err.status || 500).json({ error: err.message || "Server error" });
    }
  };
}
