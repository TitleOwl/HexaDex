import { requireKv } from "../_lib/kv.js";
import { getSession } from "../_lib/auth.js";
import { LEADERBOARD_KEY } from "./increment.js";

export default async function handler(req, res) {
  try {
    const kv = requireKv();

    const raw = await kv.zrange(LEADERBOARD_KEY, 0, 9, { rev: true, withScores: true });
    const pairs = [];
    for (let i = 0; i < raw.length; i += 2) pairs.push([raw[i], raw[i + 1]]);

    const users = pairs.length
      ? await kv.mget(...pairs.map(([lcUsername]) => `user:${lcUsername}`))
      : [];

    const top = pairs.map(([lcUsername, count], i) => ({
      username: users[i]?.username ?? lcUsername,
      trainerId: users[i]?.trainerId ?? null,
      count,
    }));

    const session = getSession(req);
    let me = null;
    if (session) {
      const lcUsername = session.username.toLowerCase();
      const rank0 = await kv.zrevrank(LEADERBOARD_KEY, lcUsername);
      if (rank0 !== null && rank0 !== undefined) {
        const count = await kv.zscore(LEADERBOARD_KEY, lcUsername);
        me = { username: session.username, trainerId: session.trainerId, count, rank: rank0 + 1, inTop10: rank0 < 10 };
      }
    }

    return res.status(200).json({ top, me });
  } catch (err) {
    console.error("leaderboard error", err);
    return res.status(err.status || 500).json({ error: err.message || "Server error" });
  }
}
