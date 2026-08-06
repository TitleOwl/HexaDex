import { requireKv } from "../_lib/kv.js";
import { verifyPassword, setSessionCookie, readJsonBody, publicUser } from "../_lib/auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const kv = requireKv();
    const { username, password, rememberMe } = readJsonBody(req);

    if (!username || !password) {
      return res.status(400).json({ error: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน" });
    }

    const user = await kv.get(`user:${String(username).toLowerCase()}`);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
    }

    setSessionCookie(res, req, { username: user.username, trainerId: user.trainerId }, { remember: rememberMe !== false });
    return res.status(200).json(publicUser(user));
  } catch (err) {
    console.error("login error", err);
    return res.status(err.status || 500).json({ error: err.message || "Server error" });
  }
}
