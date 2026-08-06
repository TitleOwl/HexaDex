import { requireKv } from "../_lib/kv.js";
import { hashPassword, generateTrainerId, setSessionCookie, readJsonBody, publicUser } from "../_lib/auth.js";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const kv = requireKv();
    const { username, password, confirmPassword } = readJsonBody(req);

    if (!username || !password || !confirmPassword) {
      return res.status(400).json({ error: "กรุณากรอกข้อมูลให้ครบทุกช่อง" });
    }
    if (!USERNAME_RE.test(username)) {
      return res.status(400).json({ error: "ชื่อผู้ใช้ต้องเป็นตัวอักษร/ตัวเลข/_ ยาว 3-20 ตัวอักษร" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: "รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน" });
    }

    const key = `user:${username.toLowerCase()}`;
    const existing = await kv.get(key);
    if (existing) {
      return res.status(409).json({ error: "มีชื่อผู้ใช้นี้ในระบบแล้ว" });
    }

    const trainerId = await generateTrainerId();
    const user = {
      username,
      passwordHash: hashPassword(password),
      trainerId,
      createdAt: Date.now(),
    };

    await kv.set(key, user);
    await kv.set(`trainerid:${trainerId}`, username.toLowerCase());

    setSessionCookie(res, req, { username: user.username, trainerId });
    return res.status(200).json(publicUser(user));
  } catch (err) {
    console.error("register error", err);
    return res.status(err.status || 500).json({ error: err.message || "Server error" });
  }
}
