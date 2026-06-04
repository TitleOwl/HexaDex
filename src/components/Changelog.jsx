// ═══════════════════════════════════════════════════════════════════════
// Changelog.jsx — Version history modal
// ───────────────────────────────────────────────────────────────────────
// Shows all version updates with categories (feature/fix/ui/perf/security)
// Marks current version as "seen" on open → removes notification dot
// ═══════════════════════════════════════════════════════════════════════

import { useEffect } from "react";
import { useModalLifecycle } from "../perfUtils.js";
import { CHANGELOG, APP_VERSION, APP_BUILD_DATE, markVersionSeen } from "../data/changelog.js";

const TYPE_META = {
  feature:  { emoji: "✨", color: "#a855f7", labelEn: "New",      labelTh: "ใหม่",       labelJa: "新機能" },
  fix:      { emoji: "🐛", color: "#ef4444", labelEn: "Fixed",    labelTh: "แก้บั๊ก",     labelJa: "修正"  },
  ui:       { emoji: "🎨", color: "#0ea5e9", labelEn: "Design",   labelTh: "ดีไซน์",      labelJa: "デザイン" },
  perf:     { emoji: "⚡", color: "#f59e0b", labelEn: "Speed",    labelTh: "ความเร็ว",    labelJa: "速度"   },
  security: { emoji: "🔒", color: "#10b981", labelEn: "Security", labelTh: "ความปลอดภัย", labelJa: "セキュリティ" },
};

export default function Changelog({ lang = "en", onClose }) {
  useModalLifecycle(onClose);

  // Mark this version as seen → removes "New!" dot from settings
  useEffect(() => { markVersionSeen(); }, []);

  const t = (en, th, ja) => lang === "th" ? th : lang === "ja" ? ja : en;
  const txt = (obj) => obj ? (lang === "th" ? obj.th : lang === "ja" ? obj.ja : obj.en) || obj.en : "";

  return (
    <div className="cl-overlay" onClick={onClose}>
      <div className="cl-modal" onClick={(e) => e.stopPropagation()}>
        {/* ─── Header ─── */}
        <div className="cl-header">
          <button className="cl-close" onClick={onClose} aria-label="Close">✕</button>
          <div className="cl-header-content">
            <div className="cl-header-emoji">📋</div>
            <div>
              <h2 className="cl-title">
                {t("What's New", "อัปเดตล่าสุด", "アップデート")}
              </h2>
              <p className="cl-subtitle">
                {t("Version history & release notes", "ประวัติการอัปเดต", "バージョン履歴")}
              </p>
            </div>
            <div className="cl-current-badge">
              <div className="cl-current-label">{t("Current", "ตอนนี้", "現在")}</div>
              <div className="cl-current-version">v{APP_VERSION}</div>
              <div className="cl-current-date">{APP_BUILD_DATE}</div>
            </div>
          </div>
        </div>

        {/* ─── Version list ─── */}
        <div className="cl-content">
          {CHANGELOG.map((ver, idx) => {
            // Group changes by type for visual separation
            const grouped = ver.changes.reduce((acc, c) => {
              (acc[c.type] = acc[c.type] || []).push(c);
              return acc;
            }, {});

            return (
              <div key={ver.version} className={`cl-version ${idx === 0 ? "cl-version-latest" : ""}`}>
                {/* Version header */}
                <div className="cl-version-header">
                  <div className="cl-version-meta">
                    <span className="cl-version-number">v{ver.version}</span>
                    <span className="cl-version-date">{ver.date}</span>
                    {ver.badge && (
                      <span className="cl-version-badge" style={{ background: ver.badgeColor || "#7c3aed" }}>
                        {txt(ver.badge)}
                      </span>
                    )}
                  </div>
                  <h3 className="cl-version-title">{txt(ver.title)}</h3>
                </div>

                {/* Changes grouped by type */}
                <div className="cl-changes">
                  {Object.entries(grouped).map(([type, items]) => {
                    const meta = TYPE_META[type] || TYPE_META.feature;
                    return (
                      <div key={type} className="cl-change-group">
                        <div className="cl-change-group-header" style={{ "--type-color": meta.color }}>
                          <span className="cl-change-emoji">{meta.emoji}</span>
                          <span className="cl-change-label">
                            {t(meta.labelEn, meta.labelTh, meta.labelJa)}
                          </span>
                        </div>
                        <ul className="cl-change-list">
                          {items.map((c, i) => (
                            <li key={i} className="cl-change-item">
                              <span className="cl-change-dot" style={{ background: meta.color }} />
                              <span className="cl-change-text">{txt(c.text)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Footer note */}
          <div className="cl-footer">
            <span>🛡️ {t(
              "Powered by Vercel · Built with React + Vite",
              "ขับเคลื่อนโดย Vercel · พัฒนาด้วย React + Vite",
              "Vercelで動作 · React + Vite で構築"
            )}</span>
          </div>
        </div>
      </div>

      <style>{`
        .cl-overlay {
          position: fixed; inset: 0; z-index: 9100;
          background: radial-gradient(circle at center, rgba(15, 23, 42, 0.85), rgba(0,0,0,0.92));
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          overflow-y: auto;
          padding: 24px 16px;
          animation: cl-fade-in 0.3s ease;
        }
        @keyframes cl-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes cl-slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

        .cl-modal {
          max-width: 720px;
          margin: 0 auto;
          background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
          color: #1e293b;
          border-radius: 26px;
          overflow: hidden;
          box-shadow: 0 30px 80px rgba(0,0,0,0.5);
          animation: cl-slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        :root[data-theme="dark"] .cl-modal,
        [data-theme="dark"] .cl-modal {
          background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
          color: #f1f5f9;
        }

        /* ─── Header ─── */
        .cl-header {
          position: relative;
          padding: 26px 28px;
          background: linear-gradient(135deg, #4c1d95 0%, #6d28d9 50%, #7c3aed 100%);
          color: white;
        }
        .cl-close {
          position: absolute; top: 14px; right: 14px;
          width: 36px; height: 36px;
          border-radius: 50%; border: none;
          background: rgba(255,255,255,0.18);
          color: white; cursor: pointer;
          font-size: 16px; font-weight: 900;
          backdrop-filter: blur(8px);
          transition: all 0.2s ease;
        }
        .cl-close:hover { background: rgba(255,255,255,0.3); transform: rotate(90deg); }

        .cl-header-content {
          display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
        }
        .cl-header-emoji {
          font-size: 40px;
          filter: drop-shadow(0 4px 10px rgba(0,0,0,0.3));
        }
        .cl-title {
          font-size: 24px; font-weight: 950;
          letter-spacing: -0.02em;
          margin: 0 0 4px;
        }
        .cl-subtitle {
          font-size: 12px; opacity: 0.85;
          margin: 0;
        }
        .cl-current-badge {
          margin-left: auto;
          background: rgba(255,255,255,0.15);
          padding: 10px 16px;
          border-radius: 14px;
          text-align: center;
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.2);
        }
        .cl-current-label { font-size: 9px; font-weight: 800; opacity: 0.8; letter-spacing: 0.08em; }
        .cl-current-version { font-size: 18px; font-weight: 950; margin: 2px 0; }
        .cl-current-date { font-size: 10px; opacity: 0.75; }

        /* ─── Content ─── */
        .cl-content {
          padding: 24px 28px 28px;
          max-height: 70vh;
          overflow-y: auto;
        }

        .cl-version {
          padding: 20px;
          margin-bottom: 16px;
          background: rgba(248, 250, 252, 0.6);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 18px;
          transition: all 0.3s ease;
        }
        :root[data-theme="dark"] .cl-version,
        [data-theme="dark"] .cl-version {
          background: rgba(30, 41, 59, 0.5);
          border-color: rgba(148, 163, 184, 0.15);
        }
        .cl-version-latest {
          border-color: #7c3aed;
          background: linear-gradient(135deg, rgba(124, 58, 237, 0.06), rgba(168, 85, 247, 0.03));
          box-shadow: 0 8px 24px rgba(124, 58, 237, 0.12);
        }

        .cl-version-header {
          margin-bottom: 16px;
          padding-bottom: 14px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.2);
        }
        .cl-version-meta {
          display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
          margin-bottom: 6px;
        }
        .cl-version-number {
          font-family: 'SF Mono', monospace;
          font-size: 14px; font-weight: 900;
          color: #7c3aed;
          background: rgba(124, 58, 237, 0.1);
          padding: 3px 10px;
          border-radius: 999px;
        }
        .cl-version-date { font-size: 11px; opacity: 0.6; font-weight: 700; }
        .cl-version-badge {
          font-size: 9px; font-weight: 900;
          color: white;
          padding: 3px 10px; border-radius: 999px;
          letter-spacing: 0.08em;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }
        .cl-version-title {
          font-size: 18px; font-weight: 900;
          margin: 0;
          letter-spacing: -0.02em;
        }

        /* ─── Changes by type ─── */
        .cl-changes { display: flex; flex-direction: column; gap: 14px; }
        .cl-change-group {}
        .cl-change-group-header {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 5px 12px;
          background: color-mix(in srgb, var(--type-color) 12%, transparent);
          border: 1px solid color-mix(in srgb, var(--type-color) 35%, transparent);
          border-radius: 999px;
          margin-bottom: 8px;
        }
        .cl-change-emoji { font-size: 14px; }
        .cl-change-label {
          font-size: 11px; font-weight: 900;
          color: var(--type-color);
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .cl-change-list {
          list-style: none; padding: 0; margin: 0;
          display: flex; flex-direction: column; gap: 8px;
        }
        .cl-change-item {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.4);
          border-radius: 10px;
          font-size: 13px; line-height: 1.5;
        }
        :root[data-theme="dark"] .cl-change-item,
        [data-theme="dark"] .cl-change-item {
          background: rgba(15, 23, 42, 0.4);
        }
        .cl-change-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          margin-top: 7px;
          flex-shrink: 0;
        }
        .cl-change-text { flex: 1; font-weight: 600; }

        /* ─── Footer ─── */
        .cl-footer {
          margin-top: 20px;
          padding: 16px;
          text-align: center;
          font-size: 11px;
          opacity: 0.6;
          border-top: 1px dashed rgba(148, 163, 184, 0.3);
        }

        /* ─── Mobile ─── */
        @media (max-width: 640px) {
          .cl-overlay { padding: 12px 8px; }
          .cl-modal { border-radius: 20px; }
          .cl-header { padding: 20px 18px; }
          .cl-header-content { gap: 12px; }
          .cl-header-emoji { font-size: 32px; }
          .cl-title { font-size: 20px; }
          .cl-current-badge { margin-left: 0; margin-top: 8px; flex-basis: 100%; }
          .cl-content { padding: 18px; max-height: 75vh; }
          .cl-version { padding: 16px; }
          .cl-version-title { font-size: 15px; }
          .cl-change-item { font-size: 12px; }
        }
      `}</style>
    </div>
  );
}
