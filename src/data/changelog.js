// ═══════════════════════════════════════════════════════════════════════
// changelog.js — HexaDex version history
// ───────────────────────────────────────────────────────────────────────
// To add a new version: prepend it to CHANGELOG array (newest first)
// and update APP_VERSION
//
// Change types: "feature" ✨ · "fix" 🐛 · "ui" 🎨 · "perf" ⚡ · "security" 🔒
// ═══════════════════════════════════════════════════════════════════════

export const APP_VERSION = "1.0.0";
export const APP_BUILD_DATE = "2026-06-04";

export const CHANGELOG = [
  {
    version: "1.0.0",
    date: "2026-06-04",
    badge: { en: "LAUNCH", th: "เปิดตัว", ja: "リリース" },
    badgeColor: "#f59e0b",
    title: {
      en: "Production Launch 🎉",
      th: "เปิดตัว Production 🎉",
      ja: "本番リリース 🎉",
    },
    changes: [
      { type: "feature", text: {
        en: "Complete Pokédex with 1,350+ Pokemon across 9 generations",
        th: "Pokédex สมบูรณ์ พร้อมโปเกม่อน 1,350+ ตัวจาก 9 ภูมิภาค",
        ja: "9世代 1,350匹以上の完全な図鑑",
      }},
      { type: "feature", text: {
        en: "SnapSearch — AI camera identification (Google Gemini)",
        th: "SnapSearch — ระบุโปเกม่อนจากรูปด้วย AI (Google Gemini)",
        ja: "SnapSearch — AIカメラ識別 (Google Gemini)",
      }},
      { type: "feature", text: {
        en: "Team Builder — Pokemon GO mode (3) + Normal mode (6)",
        th: "Team Builder — โหมด Pokemon GO (3) + โหมดปกติ (6)",
        ja: "チームビルダー — GO モード (3) + 通常モード (6)",
      }},
      { type: "feature", text: {
        en: "GO Tools Hub — Raid Guide, Events, Eggs, Research, Weather",
        th: "GO Tools — คู่มือ Raid, อีเวนต์, ไข่, งานพิเศษ, Boost ตามอากาศ",
        ja: "GO ツール — レイドガイド、イベント、タマゴ、リサーチ、天気",
      }},
      { type: "feature", text: {
        en: "Raid Guide with TH Raid Hour countdown + community links",
        th: "คู่มือ Raid พร้อม Raid Hour ไทย + ลิงก์ชุมชน",
        ja: "タイレイドアワー + コミュニティリンク付きレイドガイド",
      }},
      { type: "feature", text: {
        en: "Games Hub — Who's That Pokemon? + Birthday + Multiplayer",
        th: "Games Hub — โปเกม่อนตัวอะไรเอ่ย + วันเกิด + ผู้เล่นหลายคน",
        ja: "ゲームハブ — ポケモン当てクイズ + 誕生日 + マルチプレイヤー",
      }},
      { type: "ui", text: {
        en: "Responsive design — fully optimized for mobile",
        th: "Responsive design — ปรับสำหรับมือถือเต็มรูปแบบ",
        ja: "レスポンシブデザイン — モバイル完全対応",
      }},
      { type: "ui", text: {
        en: "Dark + Light theme with auto-switching",
        th: "ธีมมืด + สว่าง พร้อมสลับอัตโนมัติ",
        ja: "ダーク + ライトテーマ (自動切替対応)",
      }},
      { type: "security", text: {
        en: "API keys secured server-side via Vercel functions",
        th: "API keys เก็บอย่างปลอดภัยใน Vercel functions",
        ja: "Vercel関数経由でAPIキーをサーバーサイド保護",
      }},
    ],
  },
  // ─────────────────────────────────────────────────────────────────
  // Add new versions here (newest first):
  //
  // {
  //   version: "1.1.0",
  //   date: "2026-XX-XX",
  //   badge: { en: "NEW", th: "ใหม่", ja: "新規" },
  //   badgeColor: "#10b981",
  //   title: { en: "...", th: "...", ja: "..." },
  //   changes: [
  //     { type: "feature", text: { en: "...", th: "...", ja: "..." } },
  //   ],
  // },
  // ─────────────────────────────────────────────────────────────────
];

// ─── Helper: has the user seen the latest version? ────────────────────
export function hasUnseenVersion() {
  try {
    const lastSeen = localStorage.getItem("pkdx_last_seen_version");
    return lastSeen !== APP_VERSION;
  } catch {
    return false;
  }
}

export function markVersionSeen() {
  try {
    localStorage.setItem("pkdx_last_seen_version", APP_VERSION);
  } catch {}
}
