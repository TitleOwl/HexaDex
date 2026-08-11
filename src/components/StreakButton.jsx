// ─── StreakButton ────────────────────────────────────────────────────────────
//
// The flame used to be an inert <span> sharing a capsule with the favourites
// count: two unrelated numbers in one container, neither of them explaining
// itself, and one of them looking clickable without being it.
//
// Now it is a real button. The panel behind it is derived, not stored — a run
// of N days means the last min(N, 7) days on the strip are days you showed up,
// which is true by the definition of the counter, so nothing has to be logged
// to draw it honestly.

import { useEffect, useRef, useState } from "react";
import { Flame, X } from "lucide-react";
import { readStreakDetail } from "../visitStreak.js";

const t = (lang, en, th, ja) => (lang === "th" ? th : lang === "ja" ? ja : en);

const WEEKDAYS = {
  en: ["S", "M", "T", "W", "T", "F", "S"],
  th: ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"],
  ja: ["日", "月", "火", "水", "木", "金", "土"],
};

export default function StreakButton({ lang = "en" }) {
  const [open, setOpen] = useState(false);
  const [detail] = useState(readStreakDetail);
  const wrapRef = useRef(null);

  const { streak, best } = detail;
  // A single day is not a run. The flame stays grey until there is something
  // to be warm about, which also makes the colour itself carry the meaning.
  const lit = streak > 1;

  useEffect(() => {
    if (!open) return;
    const away = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    const esc  = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away);
    window.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      window.removeEventListener("keydown", esc);
    };
  }, [open]);

  // Seven cells ending today.
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return { label: (WEEKDAYS[lang] ?? WEEKDAYS.en)[d.getDay()], date: d.getDate(), on: (6 - i) < streak };
  });

  const label = t(lang,
    `Signed in ${streak} ${streak === 1 ? "day" : "days"} in a row`,
    `เข้าใช้งานติดต่อกัน ${streak} วัน`,
    `${streak}日連続でログイン`);

  return (
    <span className="nav-stat-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`nav-stat-btn nav-stat-streak${lit ? " lit" : ""}${open ? " open" : ""}`}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-label={label}
        title={label}
      >
        {/* Filled rather than outlined: at 16px an outlined flame reads as a
            droplet, which is exactly the wrong element. */}
        <Flame size={16} strokeWidth={2.2} fill={lit ? "currentColor" : "none"} />
        <span className="nav-stat-num">{streak}</span>
      </button>

      {open && (
        <div className="streak-pop" role="dialog" aria-label={label}>
          <button type="button" className="streak-pop-x" onClick={() => setOpen(false)}
            aria-label={t(lang, "Close", "ปิด", "閉じる")}>
            <X size={14} strokeWidth={2.6} />
          </button>

          <div className="streak-pop-head">
            <Flame size={20} strokeWidth={2.2} fill={lit ? "currentColor" : "none"}
              className={lit ? "streak-pop-flame lit" : "streak-pop-flame"} />
            <span className="streak-pop-big">{streak}</span>
            <span className="streak-pop-unit">{t(lang, streak === 1 ? "day" : "days", "วัน", "日")}</span>
          </div>
          <p className="streak-pop-sub">
            {t(lang, "in a row visiting HexaDex", "ที่เข้า HexaDex ติดต่อกัน", "連続でHexaDexを訪問")}
          </p>

          <div className="streak-pop-week">
            {days.map((d, i) => (
              <span key={i} className={`streak-day${d.on ? " on" : ""}`}>
                <span className="streak-day-lbl">{d.label}</span>
                <span className="streak-day-dot">{d.date}</span>
              </span>
            ))}
          </div>

          <div className="streak-pop-foot">
            {t(lang, "Best", "สถิติสูงสุด", "最高記録")}
            <b>{best} {t(lang, best === 1 ? "day" : "days", "วัน", "日")}</b>
          </div>
        </div>
      )}
    </span>
  );
}
