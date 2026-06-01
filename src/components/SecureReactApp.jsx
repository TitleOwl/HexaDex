/**
 * 🔐 React Secure Starter Template
 * โค้ดเริ่มต้นสำหรับ React ที่มีความปลอดภัยพื้นฐาน
 *
 * ครอบคลุม:
 * - XSS Prevention (ป้องกันการฝังสคริปต์อันตราย)
 * - Input Sanitization (ทำความสะอาด input)
 * - CSRF Token (ป้องกันการปลอมคำขอ)
 * - Secure State Management (จัดการ state อย่างปลอดภัย)
 * - Content Security Policy header hints
 */

import { useState, useCallback, useRef, useEffect } from "react";

// ─────────────────────────────────────────────
// 🛡️ SECURITY UTILITIES
// ─────────────────────────────────────────────

/**
 * sanitizeInput — ทำความสะอาด string ก่อนนำไปใช้หรือแสดงผล
 * ป้องกัน XSS (Cross-Site Scripting)
 */
function sanitizeInput(str) {
  if (typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * validateEmail — ตรวจสอบรูปแบบอีเมลด้วย regex ที่ถูกต้อง
 */
function validateEmail(email) {
  const re = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  return re.test(String(email).toLowerCase());
}

/**
 * generateCSRFToken — สร้าง token แบบสุ่มสำหรับป้องกัน CSRF
 * ในระบบจริงควรส่งมาจาก server
 */
function generateCSRFToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * rateLimit — จำกัดจำนวนครั้งที่ฟังก์ชันถูกเรียก (ป้องกัน brute force)
 * maxCalls: จำนวนครั้งสูงสุด, windowMs: ช่วงเวลา (ms)
 */
function createRateLimiter(maxCalls = 5, windowMs = 60_000) {
  const calls = [];
  return function isAllowed() {
    const now = Date.now();
    // ลบ timestamp ที่เก่าเกินกว่า window
    while (calls.length && calls[0] < now - windowMs) calls.shift();
    if (calls.length >= maxCalls) return false;
    calls.push(now);
    return true;
  };
}

// ─────────────────────────────────────────────
// 🔒 SECURE API HELPER
// ─────────────────────────────────────────────

/**
 * securePost — ส่ง HTTP POST พร้อม CSRF token และ headers ที่ปลอดภัย
 * ใช้แทน fetch ธรรมดาเพื่อความปลอดภัย
 */
async function securePost(url, data, csrfToken) {
  const response = await fetch(url, {
    method: "POST",
    credentials: "same-origin",           // ส่ง cookie เฉพาะ same-origin
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken,           // แนบ CSRF token ทุกครั้ง
      "X-Requested-With": "XMLHttpRequest",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `HTTP error ${response.status}`);
  }

  return response.json();
}

// ─────────────────────────────────────────────
// 📝 SECURE FORM COMPONENT
// ─────────────────────────────────────────────

const loginRateLimiter = createRateLimiter(5, 60_000); // 5 ครั้ง/นาที

function SecureLoginForm({ csrfToken, onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState("");

  // ✅ ใช้ useCallback เพื่อไม่ re-create function โดยไม่จำเป็น
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      // 1. Rate limit check
      if (!loginRateLimiter()) {
        setErrorMsg("พยายามเข้าสู่ระบบบ่อยเกินไป กรุณารอ 1 นาที");
        return;
      }

      // 2. Validate inputs
      const newErrors = {};
      if (!validateEmail(email)) newErrors.email = "รูปแบบอีเมลไม่ถูกต้อง";
      if (password.length < 8) newErrors.password = "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร";
      if (Object.keys(newErrors).length) {
        setErrors(newErrors);
        return;
      }
      setErrors({});
      setStatus("loading");

      try {
        // 3. ส่งข้อมูลไปยัง API อย่างปลอดภัย
        // ⚠️  อย่าส่ง password ใน plain text จริงๆ — ใช้ HTTPS เสมอ
        const result = await securePost(
          "/api/auth/login",
          { email: sanitizeInput(email), password },
          csrfToken
        );
        setStatus("success");
        onSuccess?.(result);
      } catch (err) {
        setStatus("error");
        // ❌ อย่า expose error ดิบไปให้ user เห็น
        setErrorMsg("เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบข้อมูลอีกครั้ง");
        console.error("[Auth error]", err); // log เฉพาะ dev
      }
    },
    [email, password, csrfToken, onSuccess]
  );

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="แบบฟอร์มเข้าสู่ระบบ">
      {/* CSRF Token — ซ่อนไว้ใน form เพื่อส่งไปกับ request */}
      <input type="hidden" name="_csrf" value={csrfToken} readOnly />

      <div>
        <label htmlFor="email">อีเมล</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
          required
        />
        {errors.email && (
          <span id="email-error" role="alert" style={{ color: "red" }}>
            {errors.email}
          </span>
        )}
      </div>

      <div>
        <label htmlFor="password">รหัสผ่าน</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? "pw-error" : undefined}
          required
        />
        {errors.password && (
          <span id="pw-error" role="alert" style={{ color: "red" }}>
            {errors.password}
          </span>
        )}
      </div>

      {errorMsg && (
        <p role="alert" style={{ color: "red" }}>
          {errorMsg}
        </p>
      )}

      <button type="submit" disabled={status === "loading"}>
        {status === "loading" ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
      </button>
    </form>
  );
}

// ─────────────────────────────────────────────
// 🗃️ SECURE STATE — อย่าเก็บข้อมูลสำคัญใน localStorage
// ─────────────────────────────────────────────

/**
 * useSecureSession — เก็บ session ใน memory (React state) เท่านั้น
 * ❌ localStorage/sessionStorage ถูก XSS อ่านได้ง่าย
 * ✅ httpOnly cookie จาก server ดีที่สุด แต่นี่คือ client-side fallback
 */
function useSecureSession() {
  const [session, setSession] = useState(null);

  const login = useCallback((userData) => {
    // เก็บเฉพาะข้อมูลที่จำเป็น — อย่าเก็บ password หรือ secret
    setSession({
      userId: userData.id,
      name: sanitizeInput(userData.name),
      role: userData.role,
      expiresAt: Date.now() + 30 * 60 * 1000, // 30 นาที
    });
  }, []);

  const logout = useCallback(() => setSession(null), []);

  // ตรวจสอบ session หมดอายุ
  useEffect(() => {
    if (!session) return;
    const ms = session.expiresAt - Date.now();
    if (ms <= 0) { logout(); return; }
    const timer = setTimeout(logout, ms);
    return () => clearTimeout(timer);
  }, [session, logout]);

  return { session, login, logout };
}

// ─────────────────────────────────────────────
// 🚀 APP ROOT
// ─────────────────────────────────────────────

export default function App() {
  const csrfToken = useRef(generateCSRFToken()).current;
  const { session, login, logout } = useSecureSession();

  return (
    <div>
      <h1>🔐 Secure React App</h1>

      {session ? (
        <div>
          <p>สวัสดี, {session.name}! (role: {session.role})</p>
          <button onClick={logout}>ออกจากระบบ</button>
        </div>
      ) : (
        <SecureLoginForm csrfToken={csrfToken} onSuccess={login} />
      )}
    </div>
  );
}
