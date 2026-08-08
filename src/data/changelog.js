// ═══════════════════════════════════════════════════════════════════════
// changelog.js — Hand-written release notes (no GitHub fetch)
// ───────────────────────────────────────────────────────────────────────
// Edit CURRENT_VERSION + ENTRIES below before each deploy.
// Same public API as before, so the Changelog UI keeps working unchanged.
// ═══════════════════════════════════════════════════════════════════════

export const CURRENT_VERSION = "2.2.0";
const RELEASE_DATE = "2026-08-09";

// type: feature | fix | ui | perf | security | chore | other
// (newest first — group by `date` for display)
// One-line highlight per version (shown at the top of each section)
export const VERSION_SUMMARY = {
  "2.2.0": "ยกเครื่องหน้าจับโปเกมอนใหม่ ขว้างของได้ทุกอย่างจากช่องเดียว จับบอลหมุนเล่นได้ แล้วก็มีบอลกับเบอร์รี่ครบชุดแบบ Pokémon GO",
  "2.1.0": "ยกเครื่องเกมเลี้ยงโปเกมอนใหม่หมด น้องมีชีวิตขึ้นเยอะ เล่นเหมือน The Sims เลย",
  "2.0.0": "อัปเดตใหญ่รอบนี้ แต่งหน้าตาใหม่หมด ใส่เอฟเฟกต์ธาตุในหน้า 3D แล้วก็จูนให้ลื่นขึ้นเยอะ",
  "1.0.0": "เวอร์ชันแรกของ HexaDex เปิดให้ใช้กันแล้ว",
};

const ENTRIES = [
  // ─── v2.2.0 — 2026-08-09 ───────────────────────────────────────────
  { version: "2.2.0", type: "feature", date: "2026-08-09", message: "หน้าจับโปเกมอนกลายเป็นการ์ดลอยกลางจอ ข้างหลังเบลอเห็นหน้าโปเกมอนเดิมที่เปิดค้างไว้ (มือถือยังเต็มจอเหมือนเดิม)" },
  { version: "2.2.0", type: "feature", date: "2026-08-09", message: "หยิบบอลลากไปไหนก็ได้ ขว้างจากตรงนั้นได้เลย แล้วบอลก็หมุนตามมือที่เหวี่ยง" },
  { version: "2.2.0", type: "feature", date: "2026-08-09", message: "ช่องขว้างกลางจอใส่ของได้ทีละอย่าง — เบอร์รี่ก็ขว้างเองด้วยท่าเดียวกับบอล ขว้างโดนแล้วโปเกมอนกินให้ดู" },
  { version: "2.2.0", type: "feature", date: "2026-08-09", message: "บอลครบชุด Pokémon GO 7 แบบ (เพิ่ม Premier, Safari, Beast, Master) และเบอร์รี่ 5 แบบ (เพิ่ม Golden Razz, Pinap, Silver Pinap)" },
  { version: "2.2.0", type: "feature", date: "2026-08-09", message: "บอลกับเบอร์รี่ใช้ได้ไม่จำกัดแล้ว ขว้างพลาดไม่ต้องเสียดาย" },
  { version: "2.2.0", type: "ui",      date: "2026-08-09", message: "หางบอลตอนขว้างเปลี่ยนจากจุดเรียงๆ เป็นเส้นโค้งเรียวสีตามธาตุ" },
  { version: "2.2.0", type: "ui",      date: "2026-08-09", message: "เก็บกวาดหน้าจอให้โล่ง เอาวงเป้า หลอดสปิน ตัวนับบอล และคำแนะนำที่ค้างอยู่ออก เหลือแต่ฉากกับโปเกมอน" },
  { version: "2.2.0", type: "fix",     date: "2026-08-09", message: "แก้เบอร์รี่ทำให้อยู่นิ่งที่กินแล้วไม่มีอะไรเกิดขึ้นมาตั้งแต่ต้น ตอนนี้โปเกมอนช้าลงจริงและเห็นด้วยตา" },
  { version: "2.2.0", type: "fix",     date: "2026-08-09", message: "แก้โปเกมอนลอยเหนือพื้นและเงาที่หลุดจากตัว ตอนนี้ยืนบนพื้นหญ้าจริงทุกขนาดจอ" },

  // ─── v2.1.0 — 2026-06-23 ───────────────────────────────────────────
  { version: "2.1.0", type: "feature", date: "2026-06-23", message: "น้องพูดได้ เดิน-วิ่ง-นอนสมจริงขึ้น และทำกิจกรรมมีหลอดเวลาแบบ The Sims" },
  { version: "2.1.0", type: "feature", date: "2026-06-23", message: "แต่งห้องได้กว้างขึ้น 3 โซน + เลือกสีเฟอร์นิเจอร์เป็นโทนพาสเทล + เพิ่มหมวดห้องน้ำ" },
  { version: "2.1.0", type: "feature", date: "2026-06-23", message: "น้องตามมาที่หน้าจับโปเกมอน แถมแบ่งเหรียญโบนัสให้ตามความผูกพัน" },
  { version: "2.1.0", type: "feature", date: "2026-06-23", message: "มีจุดแจ้งเตือนบนแท็บเกมเวลาน้องหิว/ง่วง/อยากเล่น" },
  { version: "2.1.0", type: "ui",      date: "2026-06-23", message: "เฟอร์นิเจอร์และไอคอนสวยขึ้น (โทนมันวาว) + รองรับใส่รูปฉากห้องเอง" },
  { version: "2.1.0", type: "perf",    date: "2026-06-23", message: "จูนการดูแลน้องให้สมจริงและเสถียรขึ้น (สถิติลดช้าลง กันกดรัว)" },

  // ─── v2.0.0 — 2026-06-19 ───────────────────────────────────────────
  { version: "2.0.0", type: "feature", date: "2026-06-19", message: "ใส่เอฟเฟกต์ฉากหลังตามธาตุในหน้า 3D ครบ 18 ธาตุ ไฟก็มีไฟ น้ำก็มีฟอง" },
  { version: "2.0.0", type: "feature", date: "2026-06-19", message: "น้อง Buddy ตามมาเดินเล่นในหน้าจับโปเกมอนด้วย แถมกระโดดดีใจตอนจับได้" },
  { version: "2.0.0", type: "feature", date: "2026-06-19", message: "เพิ่มโหมดประหยัด ถ้าเครื่องอืดจะเด้งมาถามให้เปิดเองเลย" },
  { version: "2.0.0", type: "ui",      date: "2026-06-19", message: "ยกเครื่องหน้าตาทั้งแอปให้ดูคลีนๆ สไตล์ iOS" },
  { version: "2.0.0", type: "ui",      date: "2026-06-19", message: "แต่งหน้า Daily Pokémon ใหม่ มีแสงเรืองๆ เปลวไฟขยับได้ แล้วก็นับวันต่อเนื่อง" },
  { version: "2.0.0", type: "ui",      date: "2026-06-19", message: "จัดหน้าตั้งค่าใหม่ให้ดูง่ายขึ้น" },
  { version: "2.0.0", type: "ui",      date: "2026-06-19", message: "ย้ายปุ่มเด้งขึ้นบนมาไว้ตรงกลาง เปลี่ยนเป็นสีแดงให้เห็นชัดๆ" },
  { version: "2.0.0", type: "perf",    date: "2026-06-19", message: "จูนให้เลื่อนลื่นขึ้น ไม่ค่อยกระตุกแล้ว" },
  { version: "2.0.0", type: "fix",     date: "2026-06-19", message: "แก้สีแดงในโหมดมืดให้เหมือนกับโหมดสว่าง" },
  { version: "2.0.0", type: "chore",   date: "2026-06-19", message: "เก็บกวาดโค้ดข้างใน แล้วก็มาเขียนอัปเดตเองแบบนี้แหละ" },

  // ─── v1.0.0 — 2026-06-04 ───────────────────────────────────────────
  { version: "1.0.0", type: "feature", date: "2026-06-04", message: "เปิดตัว HexaDex รวม Pokédex เครื่องมือสาย GO เกม แล้วก็ระบบเลี้ยงโปเกมอนไว้ครบ" },
];

// Decorate entries with the fields the UI expects (sha key, time, author).
const COMMITS = ENTRIES.map((e, i) => ({
  sha:     `rel-${String(ENTRIES.length - i).padStart(3, "0")}`,
  version: e.version,
  type:    e.type,
  message: e.message,
  date:    e.date,
  time:    `${e.date}T${String(9 + (i % 8)).padStart(2, "0")}:00:00Z`,
  author:  "TitleOwl",
}));

// ─── Synchronous getters ─────────────────────────────────────────────
export function getCurrentVersion() { return CURRENT_VERSION; }
export function getLatestCommitDate() { return RELEASE_DATE; }

// ─── Main fetch (async to match the previous API; just returns the data) ──
export async function fetchChangelog() {
  return {
    commits: COMMITS,
    version: CURRENT_VERSION,
    date: RELEASE_DATE,
    fromCache: true,
    error: null,
  };
}

// ─── Group commits by version (newest first, preserving order) ───────
export function groupByVersion(commits) {
  const order = [];
  const map = {};
  commits.forEach(c => {
    const v = c.version || "1.0.0";
    if (!map[v]) { map[v] = { version: v, date: c.date, items: [] }; order.push(v); }
    map[v].items.push(c);
  });
  return order.map(v => map[v]);
}

// ─── Group commits by date ───────────────────────────────────────────
export function groupByDate(commits) {
  const groups = {};
  commits.forEach(c => {
    if (!groups[c.date]) groups[c.date] = [];
    groups[c.date].push(c);
  });
  return Object.entries(groups)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, items]) => ({ date, items }));
}

// ─── Count entries by type (for stats) ───────────────────────────────
export function getCommitStats(commits) {
  const stats = { feature: 0, fix: 0, ui: 0, perf: 0, security: 0, chore: 0, other: 0 };
  commits.forEach(c => { if (stats[c.type] !== undefined) stats[c.type]++; });
  return stats;
}

// ─── Unseen detection (by version) ───────────────────────────────────
const SEEN_KEY = "pkdx_last_seen_version";

export function hasUnseenVersion() {
  try { return localStorage.getItem(SEEN_KEY) !== CURRENT_VERSION; }
  catch { return false; }
}

export function markVersionSeen() {
  try { localStorage.setItem(SEEN_KEY, CURRENT_VERSION); } catch {}
}

// No-op kept for compatibility (nothing to pre-warm without a network call).
export function prewarmChangelog() {}
