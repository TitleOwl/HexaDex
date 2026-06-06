// ═══════════════════════════════════════════════════════════════════════
// Changelog.jsx — Clean minimal design
// Display only, no GitHub links, auto-version from commits
// ═══════════════════════════════════════════════════════════════════════
import { useEffect, useState } from "react";
import { useModalLifecycle } from "../perfUtils.js";
import {
  fetchChangelog,
  groupByDate,
  markVersionSeen,
  getCurrentVersion,
  getLatestCommitDate,
  getCommitStats,
} from "../data/changelog.js";

const TYPE_META = {
  feature:  { emoji: "✨", color: "#a855f7", labelEn: "Feature",  labelTh: "ฟีเจอร์",     labelJa: "新機能"  },
  fix:      { emoji: "🐛", color: "#ef4444", labelEn: "Fix",      labelTh: "แก้บั๊ก",      labelJa: "修正"    },
  ui:       { emoji: "🎨", color: "#0ea5e9", labelEn: "Design",   labelTh: "ดีไซน์",       labelJa: "デザイン" },
  perf:     { emoji: "⚡", color: "#f59e0b", labelEn: "Speed",    labelTh: "ความเร็ว",     labelJa: "速度"    },
  security: { emoji: "🔒", color: "#10b981", labelEn: "Security", labelTh: "ปลอดภัย",      labelJa: "セキュリティ" },
  chore:    { emoji: "🔧", color: "#94a3b8", labelEn: "Chore",    labelTh: "ทั่วไป",       labelJa: "雑務"    },
  other:    { emoji: "📝", color: "#94a3b8", labelEn: "Update",   labelTh: "อัปเดต",       labelJa: "更新"    },
};

export default function Changelog({ lang = "en", onClose }) {
  useModalLifecycle(onClose);

  const [commits, setCommits]   = useState([]);
  const [version, setVersion]   = useState("1.0.0");
  const [loading, setLoading]   = useState(true);
  const [fromCache, setFromCache] = useState(false);
  const [error, setError]       = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const t = (en, th, ja) => lang === "th" ? th : lang === "ja" ? ja : en;

  useEffect(() => {
    fetchChangelog()
      .then(result => {
        setCommits(result.commits);
        setVersion(result.version);
        setFromCache(result.fromCache);
        setError(result.error);
        if (result.commits.length) markVersionSeen();
      })
      .finally(() => setLoading(false));
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    const result = await fetchChangelog(true);
    setCommits(result.commits);
    setVersion(result.version);
    setFromCache(result.fromCache);
    setError(result.error);
    if (result.commits.length) markVersionSeen();
    setRefreshing(false);
  };

  const grouped = groupByDate(commits);
  const stats   = getCommitStats(commits);

  // Format date — relative for recent
  const formatDate = (dateStr) => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (dateStr === today)     return t("Today", "วันนี้", "今日");
    if (dateStr === yesterday) return t("Yesterday", "เมื่อวาน", "昨日");
    const d = new Date(dateStr);
    return d.toLocaleDateString(
      lang === "th" ? "th-TH" : lang === "ja" ? "ja-JP" : "en-US",
      { month: "short", day: "numeric", year: "numeric" }
    );
  };

  // Format time HH:MM
  const formatTime = (isoStr) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString(
        lang === "ja" ? "ja-JP" : "en-US",
        { hour: "2-digit", minute: "2-digit", hour12: lang !== "ja" }
      );
    } catch { return ""; }
  };

  // Top-level stats (only types that have items)
  const statBadges = ["feature", "fix", "ui", "perf", "security"]
    .filter(type => stats[type] > 0)
    .map(type => ({ type, count: stats[type], meta: TYPE_META[type] }));

  return (
    <div className="cl-overlay" onClick={onClose}>
      <div className="cl-modal" onClick={(e) => e.stopPropagation()}>
        {/* ─── HEADER ─── */}
        <header className="cl-header">
          <button className="cl-close" onClick={onClose} aria-label="Close">✕</button>

          <div className="cl-eyebrow">{t("What's New", "อัปเดตล่าสุด", "アップデート")}</div>

          <div className="cl-version-row">
            <div className="cl-version-num">v{version}</div>
            {fromCache && (
              <div className="cl-cache-badge" title={t("Cached", "แคชไว้", "キャッシュ")}>
                📦 {t("cached", "แคช", "キャッシュ")}
              </div>
            )}
            <button
              className="cl-refresh"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              title={t("Refresh", "รีเฟรช", "更新")}
            >
              <span style={{ animation: refreshing ? "cl-spin 0.8s linear infinite" : "none", display: "inline-block" }}>
                ↻
              </span>
            </button>
          </div>

          {/* Stats summary */}
          {statBadges.length > 0 && (
            <div className="cl-stats">
              {statBadges.map(({ type, count, meta }) => (
                <span key={type} className="cl-stat" style={{ "--c": meta.color }}>
                  <span className="cl-stat-emoji">{meta.emoji}</span>
                  <span className="cl-stat-count">{count}</span>
                  <span className="cl-stat-label">
                    {t(meta.labelEn, meta.labelTh, meta.labelJa)}
                  </span>
                </span>
              ))}
            </div>
          )}
        </header>

        {/* ─── CONTENT ─── */}
        <div className="cl-content">
          {loading && commits.length === 0 && (
            <div className="cl-loading">
              <div className="cl-spinner" />
              <p>{t("Loading updates…", "กำลังโหลด…", "読み込み中…")}</p>
            </div>
          )}

          {!loading && commits.length === 0 && (
            <div className="cl-empty">
              <div className="cl-empty-icon">📭</div>
              <div className="cl-empty-title">
                {t("No updates yet", "ยังไม่มีอัปเดต", "アップデートなし")}
              </div>
              <div className="cl-empty-sub">
                {t("Check back later", "กลับมาเช็คทีหลัง", "後でまた確認してください")}
              </div>
            </div>
          )}

          {/* Timeline view */}
          {grouped.map(({ date, items }) => (
            <section key={date} className="cl-day">
              <div className="cl-day-label">
                <span>{formatDate(date)}</span>
                <span className="cl-day-dot">·</span>
                <span className="cl-day-count">
                  {items.length} {items.length === 1
                    ? t("update", "อัปเดต", "更新")
                    : t("updates", "อัปเดต", "更新")}
                </span>
              </div>

              <div className="cl-entries">
                {items.map((c) => {
                  const meta = TYPE_META[c.type] || TYPE_META.other;
                  return (
                    <div
                      key={c.sha}
                      className="cl-entry"
                      style={{ "--c": meta.color }}
                    >
                      <div className="cl-entry-icon">
                        <span>{meta.emoji}</span>
                      </div>
                      <div className="cl-entry-body">
                        <div className="cl-entry-message">{c.message}</div>
                        <div className="cl-entry-meta">
                          <span className="cl-entry-type">
                            {t(meta.labelEn, meta.labelTh, meta.labelJa)}
                          </span>
                          <span className="cl-entry-dot">·</span>
                          <span className="cl-entry-time">{formatTime(c.time)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>

      <style>{`
        .cl-overlay {
          position: fixed; inset: 0; z-index: 9100;
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          overflow-y: auto;
          padding: 24px 16px;
          animation: cl-fade-in 0.25s ease;
        }
        @keyframes cl-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes cl-slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes cl-spin { to { transform: rotate(360deg); } }

        .cl-modal {
          max-width: 640px;
          margin: 0 auto;
          background: #ffffff;
          color: #1e293b;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 30px 80px rgba(0,0,0,0.5);
          animation: cl-slide-up 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }
        :root[data-theme="dark"] .cl-modal,
        [data-theme="dark"] .cl-modal {
          background: #0f172a;
          color: #f1f5f9;
        }

        /* ─── HEADER ─── */
        .cl-header {
          position: relative;
          padding: 28px 28px 24px;
          background: linear-gradient(160deg, #f8fafc 0%, #f1f5f9 100%);
          border-bottom: 1px solid rgba(148, 163, 184, 0.15);
        }
        :root[data-theme="dark"] .cl-header,
        [data-theme="dark"] .cl-header {
          background: linear-gradient(160deg, #1e293b 0%, #0f172a 100%);
          border-bottom-color: rgba(148, 163, 184, 0.1);
        }

        .cl-close {
          position: absolute; top: 16px; right: 16px;
          width: 32px; height: 32px;
          border-radius: 50%;
          border: none;
          background: rgba(148, 163, 184, 0.18);
          color: inherit;
          font-size: 14px; font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex; align-items: center; justify-content: center;
        }
        .cl-close:hover {
          background: rgba(148, 163, 184, 0.3);
          transform: rotate(90deg);
        }

        .cl-eyebrow {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          opacity: 0.55;
          margin-bottom: 8px;
        }

        .cl-version-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 18px;
        }
        .cl-version-num {
          font-family: 'SF Mono', 'Menlo', monospace;
          font-size: 38px;
          font-weight: 950;
          letter-spacing: -0.04em;
          background: linear-gradient(135deg, #7c3aed, #a855f7);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          line-height: 1;
        }
        .cl-cache-badge {
          font-size: 10px;
          font-weight: 700;
          padding: 4px 10px;
          background: rgba(148, 163, 184, 0.15);
          border-radius: 999px;
          opacity: 0.7;
        }
        .cl-refresh {
          margin-left: auto;
          width: 34px; height: 34px;
          border-radius: 50%;
          border: 1px solid rgba(148, 163, 184, 0.3);
          background: transparent;
          color: inherit;
          font-size: 16px; font-weight: 700;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s ease;
        }
        .cl-refresh:hover:not(:disabled) {
          background: rgba(124, 58, 237, 0.1);
          border-color: #7c3aed;
          color: #7c3aed;
        }
        .cl-refresh:disabled { opacity: 0.4; cursor: not-allowed; }

        /* Stats */
        .cl-stats {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .cl-stat {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          background: color-mix(in srgb, var(--c) 10%, transparent);
          border: 1px solid color-mix(in srgb, var(--c) 25%, transparent);
          border-radius: 999px;
          font-size: 12px;
        }
        .cl-stat-emoji { font-size: 13px; }
        .cl-stat-count {
          font-weight: 900;
          color: var(--c);
        }
        .cl-stat-label {
          font-weight: 600;
          opacity: 0.7;
        }

        /* ─── CONTENT ─── */
        .cl-content {
          padding: 24px 28px 28px;
          max-height: 60vh;
          overflow-y: auto;
        }

        .cl-loading {
          text-align: center;
          padding: 50px 20px;
          opacity: 0.6;
        }
        .cl-spinner {
          width: 28px; height: 28px;
          border: 3px solid rgba(124, 58, 237, 0.2);
          border-top-color: #7c3aed;
          border-radius: 50%;
          margin: 0 auto 14px;
          animation: cl-spin 0.8s linear infinite;
        }

        .cl-empty {
          text-align: center;
          padding: 50px 20px;
        }
        .cl-empty-icon { font-size: 40px; margin-bottom: 12px; opacity: 0.5; }
        .cl-empty-title { font-size: 15px; font-weight: 800; margin-bottom: 4px; }
        .cl-empty-sub { font-size: 12px; opacity: 0.6; }

        /* Day section */
        .cl-day {
          margin-bottom: 28px;
        }
        .cl-day:last-child { margin-bottom: 0; }
        .cl-day-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          opacity: 0.55;
          margin-bottom: 12px;
          padding-bottom: 10px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.15);
        }
        .cl-day-dot { opacity: 0.4; }
        .cl-day-count { font-weight: 600; }

        /* Entry */
        .cl-entries {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .cl-entry {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 12px 14px;
          border-radius: 12px;
          transition: background 0.2s ease;
        }
        .cl-entry:hover {
          background: rgba(148, 163, 184, 0.08);
        }
        :root[data-theme="dark"] .cl-entry:hover,
        [data-theme="dark"] .cl-entry:hover {
          background: rgba(148, 163, 184, 0.06);
        }

        .cl-entry-icon {
          flex-shrink: 0;
          width: 34px; height: 34px;
          border-radius: 10px;
          background: color-mix(in srgb, var(--c) 12%, transparent);
          border: 1px solid color-mix(in srgb, var(--c) 25%, transparent);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        }

        .cl-entry-body {
          flex: 1;
          min-width: 0;
        }
        .cl-entry-message {
          font-size: 14px;
          font-weight: 700;
          line-height: 1.45;
          letter-spacing: -0.005em;
        }
        .cl-entry-meta {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          margin-top: 3px;
        }
        .cl-entry-type {
          font-weight: 800;
          color: var(--c);
          letter-spacing: 0.02em;
        }
        .cl-entry-dot { opacity: 0.4; }
        .cl-entry-time { opacity: 0.55; font-weight: 600; }

        /* ─── Mobile ─── */
        @media (max-width: 640px) {
          .cl-overlay { padding: 12px 8px; }
          .cl-modal { border-radius: 20px; }
          .cl-header { padding: 22px 20px 18px; }
          .cl-version-num { font-size: 30px; }
          .cl-content { padding: 20px 18px 22px; max-height: 70vh; }
          .cl-stats { gap: 6px; }
          .cl-stat { padding: 4px 10px; font-size: 11px; }
          .cl-entry { padding: 10px 12px; gap: 12px; }
          .cl-entry-icon { width: 30px; height: 30px; font-size: 14px; }
          .cl-entry-message { font-size: 13px; }
        }
      `}</style>
    </div>
  );
}