// ─── LiveEvents — Pokemon GO events with live countdown timers ──
// Data source: ScrapedDuck (events.json from LeekDuck)
// Updates: countdown ticks every second when tab visible.

import { useState, useEffect, useMemo, useCallback } from "react";
import { useModalLifecycle } from "../perfUtils.js";
import { usePageVisible } from "../perfUtils.js";

const EVENTS_URL = "https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/events.json";
const CACHE_KEY  = "pkdx_events_cache_v1";
const CACHE_TTL  = 30 * 60 * 1000; // 30 min

// ─── Event type metadata (color, icon, label) ─────────────
const EVENT_TYPE_META = {
  "community-day":         { emoji: "🌟", color: "#f59e0b", bg: "linear-gradient(135deg, #fcd34d, #d97706)",
                             label: { en: "Community Day",        th: "Community Day",        ja: "コミュニティ・デイ" } },
  "raid-day":              { emoji: "🎯", color: "#dc2626", bg: "linear-gradient(135deg, #fca5a5, #b91c1c)",
                             label: { en: "Raid Day",             th: "Raid Day",             ja: "レイドデイ" } },
  "raid-hour":             { emoji: "🎯", color: "#ef4444", bg: "linear-gradient(135deg, #fca5a5, #dc2626)",
                             label: { en: "Raid Hour",            th: "Raid Hour",            ja: "レイドアワー" } },
  "raid-weekend":          { emoji: "⚔️", color: "#991b1b", bg: "linear-gradient(135deg, #f87171, #7f1d1d)",
                             label: { en: "Raid Weekend",         th: "Raid Weekend",         ja: "レイドウィークエンド" } },
  "raid-battles":          { emoji: "⚔️", color: "#dc2626", bg: "linear-gradient(135deg, #fca5a5, #991b1b)",
                             label: { en: "Raid Battles",         th: "Raid Battles",         ja: "レイドバトル" } },
  "mega-raid-day":         { emoji: "💎", color: "#be185d", bg: "linear-gradient(135deg, #f9a8d4, #be185d)",
                             label: { en: "Mega Raid Day",        th: "เมก้าเรดเดย์",         ja: "メガレイドデイ" } },
  "pokemon-spotlight-hour":{ emoji: "✨", color: "#eab308", bg: "linear-gradient(135deg, #fde047, #ca8a04)",
                             label: { en: "Spotlight Hour",       th: "Spotlight Hour",       ja: "スポットライトアワー" } },
  "pokemon-go-fest":       { emoji: "🎉", color: "#a855f7", bg: "linear-gradient(135deg, #d8b4fe, #7e22ce)",
                             label: { en: "GO Fest",              th: "GO Fest",              ja: "GOフェスト" } },
  "pokemon-go-tour":       { emoji: "🌍", color: "#7c3aed", bg: "linear-gradient(135deg, #c4b5fd, #6d28d9)",
                             label: { en: "GO Tour",              th: "GO Tour",              ja: "GOツアー" } },
  "season":                { emoji: "🌸", color: "#8b5cf6", bg: "linear-gradient(135deg, #c4b5fd, #6d28d9)",
                             label: { en: "Season",               th: "ซีซั่นใหม่",            ja: "シーズン" } },
  "event":                 { emoji: "🎁", color: "#14b8a6", bg: "linear-gradient(135deg, #5eead4, #0f766e)",
                             label: { en: "Event",                th: "อีเวนต์",              ja: "イベント" } },
  "timed-research":        { emoji: "📋", color: "#0ea5e9", bg: "linear-gradient(135deg, #7dd3fc, #0369a1)",
                             label: { en: "Timed Research",       th: "Timed Research",       ja: "タイムリサーチ" } },
  "research":              { emoji: "📋", color: "#0ea5e9", bg: "linear-gradient(135deg, #7dd3fc, #0369a1)",
                             label: { en: "Research",             th: "Research",             ja: "リサーチ" } },
  "update":                { emoji: "🔧", color: "#64748b", bg: "linear-gradient(135deg, #cbd5e1, #475569)",
                             label: { en: "Update",               th: "อัปเดตเกม",            ja: "アップデート" } },
  "live":                  { emoji: "📺", color: "#e11d48", bg: "linear-gradient(135deg, #fda4af, #be123c)",
                             label: { en: "Live Event",           th: "Live Event",           ja: "ライブイベント" } },
  "max-monday":            { emoji: "⚡", color: "#6366f1", bg: "linear-gradient(135deg, #a5b4fc, #4338ca)",
                             label: { en: "Max Monday",           th: "Max Monday",           ja: "マックスマンデー" } },
  "max-out-weekend":       { emoji: "⚡", color: "#6366f1", bg: "linear-gradient(135deg, #a5b4fc, #4338ca)",
                             label: { en: "Max Weekend",          th: "Max Weekend",          ja: "マックスウィークエンド" } },
  "global-challenge":      { emoji: "🌐", color: "#06b6d4", bg: "linear-gradient(135deg, #67e8f9, #0891b2)",
                             label: { en: "Global Challenge",     th: "Global Challenge",     ja: "グローバルチャレンジ" } },
  "ticketed-event":        { emoji: "🎫", color: "#ec4899", bg: "linear-gradient(135deg, #f9a8d4, #db2777)",
                             label: { en: "Ticketed Event",       th: "Event มีตั๋ว",         ja: "チケットイベント" } },
  "default":               { emoji: "📌", color: "#0891b2", bg: "linear-gradient(135deg, #67e8f9, #0e7490)",
                             label: { en: "Event",                th: "อีเวนต์",              ja: "イベント" } },
};

function getEventTypeMeta(type) {
  return EVENT_TYPE_META[type] ?? EVENT_TYPE_META.default;
}

export default function LiveEvents({ lang = "en", onClose }) {
  useModalLifecycle();
  const [events,  setEvents]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [filter,  setFilter]  = useState("active"); // "active" | "upcoming" | "all"
  const [now,     setNow]     = useState(Date.now());
  const visible = usePageVisible();

  // ─── Tick now state every second (pause when tab hidden) ─
  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [visible]);

  // ─── Fetch events (with cache + timeout + fallback) ──────
  const fetchEvents = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);

    if (!force) {
      try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
          setEvents(cached.data);
          setLastUpdated(cached.timestamp);
          setLoading(false);
          return;
        }
      } catch {}
    }

    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch(EVENTS_URL, {
        signal: controller.signal,
        cache: force ? "reload" : "default",
      });
      clearTimeout(tid);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setEvents(data);
      const t = Date.now();
      setLastUpdated(t);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: t }));
      } catch {}
    } catch (e) {
      clearTimeout(tid);
      setError(e.name === "AbortError"
        ? (lang === "th" ? "หมดเวลาเชื่อมต่อ" : "Connection timed out")
        : e.message);
      // Fall back to stale cache if available
      try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
        if (cached?.data) {
          setEvents(cached.data);
          setLastUpdated(cached.timestamp);
        }
      } catch {}
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // ─── Categorize events by status ─────────────────────────
  const categorized = useMemo(() => {
    if (!events || !Array.isArray(events)) return { active: [], upcoming: [], past: [] };
    const active = [], upcoming = [], past = [];
    events.forEach(ev => {
      const start = ev.start ? new Date(ev.start).getTime() : 0;
      const end   = ev.end   ? new Date(ev.end).getTime()   : 0;
      if (!start) return;
      if (end && end < now) past.push(ev);
      else if (start <= now && (!end || end > now)) active.push(ev);
      else if (start > now) upcoming.push(ev);
    });
    // Sort: active by end-soon, upcoming by start-soon, past by end-recent
    active.sort((a, b) => (new Date(a.end || a.start).getTime()) - (new Date(b.end || b.start).getTime()));
    upcoming.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    past.sort((a, b) => new Date(b.end || b.start).getTime() - new Date(a.end || a.start).getTime());
    return { active, upcoming, past };
  }, [events, now]);

  const t = (th, en, ja) => lang === "th" ? th : lang === "ja" ? (ja ?? en) : en;

  // Display list based on filter
  const list = filter === "active"   ? categorized.active
             : filter === "upcoming" ? categorized.upcoming
             : [...categorized.active, ...categorized.upcoming, ...categorized.past.slice(0, 10)];

  const formatAge = (ts) => {
    if (!ts) return "";
    const mins = Math.floor((Date.now() - ts) / 60000);
    if (mins < 1) return t("เมื่อสักครู่", "just now", "たった今");
    if (mins < 60) return t(`${mins} นาทีก่อน`, `${mins}m ago`, `${mins}分前`);
    return t(`${Math.floor(mins / 60)} ชม.ก่อน`, `${Math.floor(mins / 60)}h ago`, `${Math.floor(mins / 60)}時間前`);
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed",
      inset: 0,
      zIndex: 9000,
      background: "rgba(15, 23, 42, 0.85)",
      backdropFilter: "blur(8px)",
      overflowY: "auto",
      padding: "20px 12px",
      animation: "le-overlay-in 0.3s ease",
    }}>
      <style>{`
        @keyframes le-overlay-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes le-card-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes le-spin { to { transform: rotate(360deg); } }
        @keyframes le-shimmer { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        @keyframes le-pulse-dot { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.7); } }
        .le-card { transition: transform 0.2s, box-shadow 0.2s; }
        .le-card:hover { transform: translateY(-3px); box-shadow: 0 14px 32px rgba(0,0,0,0.25); }
      `}</style>

      <div onClick={(e) => e.stopPropagation()} style={{
        maxWidth: 1100,
        margin: "0 auto",
        background: "var(--le-bg, #fff)",
        borderRadius: 22,
        padding: "20px 16px 24px",
        boxShadow: "0 28px 80px rgba(0,0,0,0.4)",
        minHeight: "85vh",
      }}>
        {/* ─── Header ─── */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 16,
          padding: "0 4px",
        }}>
          <div>
            <h1 style={{
              fontSize: 22, fontWeight: 900, margin: 0,
              color: "var(--le-fg, #1e293b)", letterSpacing: "-0.01em",
            }}>
              📅 {t("Event Pokémon GO ทั้งหมด", "Live Pokémon GO Events", "ポケモンGOイベント")}
            </h1>
            <div style={{ fontSize: 12, color: "var(--le-muted, #64748b)", marginTop: 4, fontWeight: 600 }}>
              {t(
                `อัปเดต ${formatAge(lastUpdated)} · countdown realtime ⏱️`,
                `Updated ${formatAge(lastUpdated)} · Live countdown ⏱️`,
                `更新: ${formatAge(lastUpdated)} · リアルタイムカウントダウン ⏱️`
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => fetchEvents(true)} disabled={loading}
              style={{
                padding: "8px 14px", borderRadius: 10,
                border: "1.5px solid var(--le-border, #e2e8f0)",
                background: "var(--le-card, #f8fafc)",
                color: "var(--le-fg, #475569)",
                fontWeight: 700, fontSize: 12,
                cursor: loading ? "wait" : "pointer", opacity: loading ? 0.6 : 1,
                display: "inline-flex", alignItems: "center", gap: 6,
              }}>
              <span style={{ display: "inline-block", animation: loading ? "le-spin 1s linear infinite" : "none" }}>🔄</span>
              {t("รีเฟรช", "Refresh", "更新")}
            </button>
            <button onClick={onClose} style={{
              padding: "8px 14px", borderRadius: 10, border: "none",
              background: "linear-gradient(135deg, #ef4444, #b91c1c)",
              color: "white", fontWeight: 700, fontSize: 12, cursor: "pointer",
            }}>
              ✕ {t("ปิด", "Close", "閉じる")}
            </button>
          </div>
        </div>

        {/* ─── Filter tabs ─── */}
        {events && (
          <div style={{
            display: "flex",
            gap: 6,
            marginBottom: 18,
            padding: "4px",
            background: "var(--le-card, #f1f5f9)",
            borderRadius: 12,
            border: "1px solid var(--le-border, #e2e8f0)",
            overflowX: "auto",
          }}>
            {[
              { id: "active",   icon: "🟢", count: categorized.active.length,   label: { th: "Active", en: "Active",   ja: "進行中" } },
              { id: "upcoming", icon: "🔵", count: categorized.upcoming.length, label: { th: "เร็วๆนี้", en: "Upcoming", ja: "近日中" } },
              { id: "all",      icon: "📋", count: events.length,               label: { th: "ทั้งหมด", en: "All",      ja: "全て" } },
            ].map(tab => (
              <button key={tab.id} onClick={() => setFilter(tab.id)} style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: 8,
                border: "none",
                background: filter === tab.id
                  ? "linear-gradient(135deg, #06b6d4, #3b82f6)"
                  : "transparent",
                color: filter === tab.id ? "white" : "var(--le-fg, #475569)",
                fontWeight: 800, fontSize: 12, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                transition: "all 0.2s",
                whiteSpace: "nowrap",
                boxShadow: filter === tab.id ? "0 4px 12px rgba(59,130,246,0.35)" : "none",
              }}>
                <span>{tab.icon}</span>
                <span>{tab.label[lang] ?? tab.label.en}</span>
                <span style={{
                  background: filter === tab.id ? "rgba(255,255,255,0.25)" : "var(--le-border, #cbd5e1)",
                  padding: "1px 7px",
                  borderRadius: 999,
                  fontSize: 10,
                  fontWeight: 900,
                }}>{tab.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* ─── Loading state ─── */}
        {loading && !events && (
          <div style={{ padding: "30px 10px" }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{
                display: "inline-block",
                width: 48, height: 48,
                border: "4px solid var(--le-border, #e2e8f0)",
                borderTopColor: "#3b82f6",
                borderRadius: "50%",
                animation: "le-spin 0.8s linear infinite",
              }} />
              <div style={{ marginTop: 12, color: "var(--le-muted, #64748b)", fontSize: 13, fontWeight: 600 }}>
                {t("กำลังโหลดอีเวนต์...", "Loading events...", "イベントを読み込み中...")}
              </div>
            </div>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                height: 100,
                background: "linear-gradient(90deg, var(--le-card, #f1f5f9) 0%, var(--le-border, #e2e8f0) 50%, var(--le-card, #f1f5f9) 100%)",
                backgroundSize: "200% 100%",
                borderRadius: 14,
                marginBottom: 12,
                animation: "le-shimmer 1.5s ease-in-out infinite",
              }} />
            ))}
          </div>
        )}

        {/* ─── Error state ─── */}
        {error && !events && (
          <div style={{
            padding: "40px 20px",
            textAlign: "center",
            background: "rgba(239, 68, 68, 0.08)",
            border: "1.5px solid rgba(239, 68, 68, 0.25)",
            borderRadius: 14,
          }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>⚠️</div>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#dc2626", marginBottom: 6 }}>
              {t("โหลดไม่สำเร็จ", "Failed to load", "読み込み失敗")}
            </div>
            <div style={{ fontSize: 12, color: "#7f1d1d" }}>{error}</div>
          </div>
        )}

        {/* ─── Events list ─── */}
        {events && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 12,
          }}>
            {list.map((ev, i) => (
              <EventCard
                key={`${ev.eventID || ev.name}-${i}`}
                event={ev}
                lang={lang}
                now={now}
                delay={i * 0.03}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {events && list.length === 0 && (
          <div style={{
            padding: "60px 20px",
            textAlign: "center",
            color: "var(--le-muted, #64748b)",
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🌙</div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>
              {filter === "active"
                ? t("ไม่มี event ที่กำลัง active", "No active events right now", "現在開催中のイベントはありません")
                : t("ไม่มี event ในหมวดนี้", "No events in this category", "このカテゴリにイベントはありません")}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{
          marginTop: 24,
          paddingTop: 14,
          borderTop: "1px solid var(--le-border, #e2e8f0)",
          fontSize: 10,
          color: "var(--le-muted, #94a3b8)",
          textAlign: "center",
          letterSpacing: 0.3,
        }}>
          {t(
            "ข้อมูลจาก LeekDuck.com ผ่าน ScrapedDuck · countdown อัปเดตทุก 1 วินาที",
            "Data from LeekDuck.com via ScrapedDuck · countdown ticks every second",
            "データ元: LeekDuck.com (ScrapedDuck) · カウントダウンは1秒毎"
          )}
        </div>

        <style>{`
          :root {
            --le-bg: #fff;
            --le-fg: #1e293b;
            --le-muted: #64748b;
            --le-card: #f8fafc;
            --le-border: #e2e8f0;
          }
          [data-theme="dark"] {
            --le-bg: #0f172a;
            --le-fg: #f1f5f9;
            --le-muted: #94a3b8;
            --le-card: #1e293b;
            --le-border: #334155;
          }
        `}</style>
      </div>
    </div>
  );
}

// ─── Single event card with realtime countdown ────────────
function EventCard({ event, lang, now, delay = 0 }) {
  const meta = getEventTypeMeta(event.eventType);
  const startMs = event.start ? new Date(event.start).getTime() : null;
  const endMs   = event.end   ? new Date(event.end).getTime()   : null;

  // Status determination
  let status, statusColor, statusBg;
  if (!startMs) {
    status = "tba"; statusColor = "#64748b"; statusBg = "rgba(100, 116, 139, 0.15)";
  } else if (endMs && endMs < now) {
    status = "past"; statusColor = "#71717a"; statusBg = "rgba(113, 113, 122, 0.15)";
  } else if (startMs <= now && (!endMs || endMs > now)) {
    status = "active"; statusColor = "#10b981"; statusBg = "rgba(16, 185, 129, 0.15)";
  } else {
    status = "upcoming"; statusColor = "#3b82f6"; statusBg = "rgba(59, 130, 246, 0.15)";
  }

  // Compute time difference for countdown
  const targetMs = status === "active" ? endMs : status === "upcoming" ? startMs : null;
  const diff = targetMs ? targetMs - now : null;

  // Format countdown (Xd Yh Zm Ws)
  const formatCountdown = (ms) => {
    if (ms == null || ms < 0) return "";
    const totalSec = Math.floor(ms / 1000);
    const d = Math.floor(totalSec / 86400);
    const h = Math.floor((totalSec % 86400) / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const t = (th, en, ja) => lang === "th" ? th : lang === "ja" ? (ja ?? en) : en;
  const statusLabel = {
    active:   t("🟢 กำลังจัด · เหลือ",     "🟢 ACTIVE · ends in",   "🟢 開催中 · 残り"),
    upcoming: t("🔵 เริ่มอีก",            "🔵 STARTS IN",          "🔵 開始まで"),
    past:     t("⚫ จบไปแล้ว",            "⚫ ENDED",              "⚫ 終了"),
    tba:      t("⚪ ยังไม่ระบุเวลา",       "⚪ TBA",                "⚪ 未定"),
  };

  // Format start/end dates for display
  const formatDate = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleString(lang === "th" ? "th-TH" : lang === "ja" ? "ja-JP" : "en-US", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  return (
    <a
      href={event.link || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="le-card"
      style={{
        display: "block",
        textDecoration: "none",
        background: "var(--le-card, #fff)",
        border: `2px solid ${meta.color}33`,
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
        color: "inherit",
        animation: `le-card-in 0.35s ease ${delay}s backwards`,
        opacity: status === "past" ? 0.7 : 1,
      }}>
      {/* Top color band */}
      <div style={{ height: 4, background: meta.bg }} />

      {/* Event image */}
      {event.image && (
        <div style={{
          width: "100%",
          height: 120,
          background: `linear-gradient(135deg, ${meta.color}15, ${meta.color}05)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          position: "relative",
        }}>
          <img src={event.image} alt={event.name} loading="lazy"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: status === "past" ? "grayscale(60%)" : "none",
            }}
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
          {/* Type tag overlay */}
          <div style={{
            position: "absolute",
            top: 8,
            left: 8,
            background: meta.bg,
            color: "white",
            padding: "3px 10px",
            borderRadius: 999,
            fontSize: 10,
            fontWeight: 900,
            letterSpacing: 0.5,
            textTransform: "uppercase",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
            backdropFilter: "blur(6px)",
          }}>
            <span style={{ fontSize: 12 }}>{meta.emoji}</span>
            <span>{meta.label[lang] ?? meta.label.en}</span>
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{ padding: "12px 14px 14px" }}>
        <div style={{
          fontSize: 14,
          fontWeight: 800,
          color: "var(--le-fg, #1e293b)",
          marginBottom: 8,
          lineHeight: 1.3,
          minHeight: "2.6em",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}>
          {event.name}
        </div>

        {/* Status + Countdown */}
        <div style={{
          background: statusBg,
          padding: "8px 10px",
          borderRadius: 8,
          marginBottom: 8,
          fontSize: 11,
          fontWeight: 800,
          color: statusColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
        }}>
          <span>{statusLabel[status]}</span>
          {diff != null && diff > 0 && (
            <span style={{
              fontFamily: "ui-monospace, Menlo, monospace",
              fontSize: 12,
              background: "rgba(255,255,255,0.7)",
              color: statusColor,
              padding: "2px 8px",
              borderRadius: 6,
              fontVariantNumeric: "tabular-nums",
              animation: status === "active" ? "le-pulse-dot 2s ease-in-out infinite" : "none",
            }}>
              {formatCountdown(diff)}
            </span>
          )}
        </div>

        {/* Date range */}
        <div style={{
          fontSize: 10,
          color: "var(--le-muted, #64748b)",
          fontWeight: 600,
          lineHeight: 1.5,
        }}>
          <div>📅 {formatDate(event.start)}</div>
          {endMs && <div>⏰ {formatDate(event.end)}</div>}
        </div>
      </div>
    </a>
  );
}