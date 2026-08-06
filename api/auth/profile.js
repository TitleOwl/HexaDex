import { requireKv } from "../_lib/kv.js";
import { getSession, publicUser, readJsonBody } from "../_lib/auth.js";

const BIRTHDAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const MIN_YEAR = 1900;

function isValidBirthday(value) {
  if (!BIRTHDAY_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  if (y < MIN_YEAR || y > new Date().getFullYear()) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d && dt.getTime() <= Date.now();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = getSession(req);
  if (!session) {
    return res.status(401).json({ error: "not authenticated" });
  }

  try {
    const kv = requireKv();
    const key = `user:${session.username.toLowerCase()}`;
    const user = await kv.get(key);
    if (!user) {
      return res.status(401).json({ error: "not authenticated" });
    }

    const { birthday, starter } = readJsonBody(req);

    if (birthday !== undefined) {
      if (birthday === null) {
        user.birthday = null;
      } else if (isValidBirthday(birthday)) {
        user.birthday = birthday;
      } else {
        return res.status(400).json({ error: "รูปแบบวันเกิดไม่ถูกต้อง" });
      }
    }

    if (starter !== undefined) {
      if (starter === null) {
        user.starter = null;
      } else if (Number.isInteger(starter) && starter >= 1 && starter <= 1025) {
        user.starter = starter;
      } else {
        return res.status(400).json({ error: "โปเกม่อนเริ่มต้นไม่ถูกต้อง" });
      }
    }

    await kv.set(key, user);
    return res.status(200).json(publicUser(user));
  } catch (err) {
    console.error("profile update error", err);
    return res.status(err.status || 500).json({ error: err.message || "Server error" });
  }
}
