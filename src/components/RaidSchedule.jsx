// ─── RaidSchedule ────────────────────────────────────────────────────────────
//
// The full rotation calendar: every raid window grouped by the egg it hatches
// from, with a live countdown on each.
//
// The spec asked for a hand-maintained RaidSchedule entity because "the API
// only has current data, no start/end". That turned out not to hold —
// events.json carries eventType "raid-battles" with real ISO timestamps, and
// goHubData.raidRotations() already derives exactly the shape the spec
// describes. So this page reads that rather than a second, hand-typed copy
// that would go stale every Wednesday.

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, ChevronRight } from "lucide-react";
import { TYPE_NAMES_TH, TYPE_NAMES_JA } from "../data.js";
import {
  useGoHubData, spriteUrl, raidRotations, rotationState,
  RAID_TIERS, useMegaSprites, useRotationTypes,
} from "../goHubData.js";

const COLLAPSE_KEY = "pkdx_raidsched_collapsed";

const t = (lang, en, th, ja) => (lang === "th" ? th : lang === "ja" ? ja : en);

/** Format by distance: seconds only matter when they are about to matter. */
function fmt(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60), sec = s % 60;
  const p = (n) => String(n).padStart(2, "0");
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}:${p(m)}:${p(sec)}`;
  return `${p(m)}:${p(sec)}`;
}

/** Same value without seconds, for the polite live region. */
function fmtCoarse(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/**
 * The next rotation boundary: Wednesday 07:00 ICT, which is Tuesday 17:00 UTC.
 * Computed in UTC on purpose — deriving it from the viewer's local midnight
 * would land half a day out for anyone outside Thailand.
 */
function nextRotation(now = Date.now()) {
  const d = new Date(now);
  const target = new Date(Date.UTC(
    d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 17, 0, 0, 0));
  // Tuesday is 2 in getUTCDay().
  const delta = (2 - target.getUTCDay() + 7) % 7;
  target.setUTCDate(target.getUTCDate() + delta);
  if (target.getTime() <= now) target.setUTCDate(target.getUTCDate() + 7);
  return target.getTime();
}

/** One second, recomputed from timestamps, and correct again on wake. */
function useTick() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const go = () => setNow(Date.now());
    const id = setInterval(go, 1000);
    const wake = () => { if (!document.hidden) go(); };
    document.addEventListener("visibilitychange", wake);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", wake); };
  }, []);
  return now;
}

function Egg({ tier, size = 22 }) {
  const [failed, setFailed] = useState(false);
  if (tier.img && !failed) {
    return <img className="rs-egg-img" src={tier.img} alt="" aria-hidden
      referrerPolicy="no-referrer" width={size} height={size * 1.18}
      loading="lazy" decoding="async" onError={() => setFailed(true)} />;
  }
  return (
    <span className="rs-egg" style={{ "--eh": tier.hue, width: size, height: size * 1.18 }} aria-hidden>
      <b>{tier.key === "mega" ? "M" : tier.stars}</b>
    </span>
  );
}

function Row({ r, state, now, lang, onOpen }) {
  const label = (tp) => lang === "th" ? (TYPE_NAMES_TH[tp] ?? tp)
    : lang === "ja" ? (TYPE_NAMES_JA[tp] ?? tp) : tp;
  const date = (ms) => new Date(ms).toLocaleDateString(
    lang === "th" ? "th-TH" : lang === "ja" ? "ja-JP" : "en-GB",
    { day: "numeric", month: "short" });

  // Live counts to the end, upcoming to the start. Two different questions,
  // so each carries its own label — a bare number gets read as whichever the
  // reader assumed.
  const target = state === "live" ? r.end : r.start;
  const lead = state === "live" ? t(lang, "ends in", "จบในอีก", "終了まで")
    : state === "upcoming" ? t(lang, "starts in", "เริ่มในอีก", "開始まで") : null;

  const pct = state === "live"
    ? Math.min(100, Math.max(0, Math.round(((now - r.start) / (r.end - r.start)) * 100)))
    : null;

  const tint = r.types?.[0] ?? "normal";

  return (
    <a className={`rs-row ${state}`} href="#counters"
      aria-label={`${r.name} — ${state === "live" ? t(lang, "live now", "กำลังเปิด", "開催中")
        : state === "upcoming" ? t(lang, "upcoming", "ถัดไป", "予定") : t(lang, "ended", "จบแล้ว", "終了")}`}
      onClick={(e) => { if (e.metaKey || e.ctrlKey || e.button !== 0) return; e.preventDefault(); onOpen?.(r); }}>

      <span className="rs-art" data-tint={tint}>
        {r.id && <img src={spriteUrl(r.id)} alt="" loading="lazy" decoding="async" />}
        {r.shiny && state !== "ended" && (
          <span className="rs-star" aria-label={t(lang, "Shiny possible", "มีโอกาสได้ shiny", "色違いあり")}>✦</span>
        )}
      </span>

      <span className="rs-mid">
        <span className="rs-title">
          <b className="rs-name">{r.name}</b>
          {/* The state is a word first; the colour and the dimming sit on top
              of it rather than instead of it. */}
          <span className={`rs-state ${state}`}>
            {state === "live" && <i className="rs-dot" aria-hidden />}
            {state === "live" ? t(lang, "Live now", "กำลังเปิด", "開催中")
              : state === "upcoming" ? t(lang, "Upcoming", "ถัดไป", "予定")
              : t(lang, "Ended", "จบแล้ว", "終了")}
          </span>
        </span>

        {r.types?.length > 0 && (
          <span className="rs-types">
            {r.types.map(tp => <span key={tp} className="tp rs-tp" data-type={tp}>{label(tp)}</span>)}
          </span>
        )}

        {r.weaknesses?.length > 0 && state !== "ended" && (
          <span className="rs-weak">
            <span className="rs-weak-lbl">{t(lang, "Weak to", "อ่อนแอต่อ", "弱点")}</span>
            {r.weaknesses.slice(0, 4).map(tp =>
              <span key={tp} className="tp rs-tp-xs" data-type={tp}>{label(tp)}</span>)}
            {r.weaknesses.length > 4 && <span className="rs-weak-more">+{r.weaknesses.length - 4}</span>}
          </span>
        )}

        <span className="rs-when">{date(r.start)} – {date(r.end)}</span>

        {pct != null && <span className="rs-bar"><i style={{ width: `${pct}%` }} /></span>}
      </span>

      <span className="rs-right">
        {lead && <>
          <span className="rs-lead">{lead}</span>
          <b className="rs-cd num">{fmt(target - now)}</b>
        </>}
        {r.party && <span className="rs-party">{t(lang, `${r.party} players`, `ใช้ ${r.party} คน`, `${r.party}人`)}</span>}
        <span className="rs-go">{t(lang, "Counters", "ตัวเคาน์เตอร์", "対策")} <ChevronRight size={12} strokeWidth={2.6} /></span>
      </span>
    </a>
  );
}

export default function RaidSchedule({ lang = "en", allList = [], cachedFetch, onOpenCounters }) {
  const now = useTick();
  const go = useGoHubData();

  const [collapsed, setCollapsed] = useState(() => {
    try { return JSON.parse(localStorage.getItem(COLLAPSE_KEY) ?? "[]"); } catch { return []; }
  });
  const toggle = (key) => setCollapsed(prev => {
    const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
    try { localStorage.setItem(COLLAPSE_KEY, JSON.stringify(next)); } catch { /* private mode */ }
    return next;
  });

  const dex = useMemo(() => allList.map(p => ({
    name: p.name, id: Number(p.url.split("/").filter(Boolean).pop()),
  })), [allList]);

  const rows = useRotationTypes(useMegaSprites(raidRotations(go.data, dex) ?? []), cachedFetch);

  // State before date. Sorting by date alone puts finished windows on top.
  const ORDER = { live: 0, upcoming: 1, ended: 2 };
  const stateOf = (r) => {
    const s = rotationState(r, now);
    return s === "next" ? "upcoming" : s === "done" ? "ended" : "live";
  };

  const groups = RAID_TIERS.map(tier => ({
    tier,
    rows: rows.filter(r => r.tier === tier.key).sort((a, b) => {
      const da = ORDER[stateOf(a)], db = ORDER[stateOf(b)];
      return da !== db ? da - db : a.start - b.start;
    }),
  })).filter(g => g.rows.length > 0);

  const liveCount = rows.filter(r => stateOf(r) === "live").length;
  const rotMs = nextRotation(now) - now;

  // Announced once a minute; a polite region that changes every second is read
  // aloud without pause and makes the page unusable with a screen reader.
  const coarse = fmtCoarse(rotMs);
  const [spoken, setSpoken] = useState(coarse);
  if (spoken !== coarse) setSpoken(coarse);

  const clock = new Date(now).toLocaleTimeString("en-GB",
    { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const toRefresh = Math.ceil((3600000 - (now % 3600000)) / 60000);

  return (
    <main className="grid-wrap rs-page">
      <header className="rs-bar">
        <div className="rs-bar-left">
          <h1 className="rs-h1">{t(lang, "Raid schedule", "ตารางรอบเรด", "レイドスケジュール")}</h1>
          <p className="rs-sub">
            {t(lang,
              `Live data from LeekDuck · Thai time (ICT) · refreshes in ${toRefresh} min`,
              `ข้อมูลสดจาก LeekDuck · เวลาไทย (ICT) · อัปเดตอัตโนมัติอีก ${toRefresh} นาที`,
              `LeekDuckのライブデータ · タイ時間 (ICT) · ${toRefresh}分後に更新`)}
          </p>
        </div>

        <div className="rs-bar-right">
          <span className="rs-stat">
            <i>{t(lang, "Live now", "กำลังเปิด", "開催中")}</i>
            <b>{liveCount}</b>
          </span>
          {/* The most valuable number here: every tier turns over at once. */}
          <span className="rs-stat rs-stat-rot">
            <i>{t(lang, "Next rotation", "รอบถัดไปเปลี่ยนใน", "次のローテーション")}</i>
            <b className="num">{fmt(rotMs)}</b>
            <span className="sr-only" aria-live="polite">{spoken}</span>
          </span>
          <span className="rs-clock num">{clock}<em>ICT</em></span>
          <button type="button" className="rs-refresh" onClick={() => window.location.reload()}>
            <RefreshCw size={14} strokeWidth={2.4} />
            {t(lang, "Refresh", "รีเฟรช", "更新")}
          </button>
        </div>
      </header>

      {go.status === "loading" && (
        <div className="rs-card rs-loading">{t(lang, "Loading…", "กำลังโหลด…", "読み込み中…")}</div>
      )}
      {go.status === "error" && (
        <div className="rs-card rs-loading">
          {t(lang, "Could not load the schedule", "โหลดตารางไม่สำเร็จ", "スケジュールを読み込めません")}
        </div>
      )}

      {groups.map(g => {
        const open = !collapsed.includes(g.tier.key);
        const live = g.rows.filter(r => stateOf(r) === "live").length;
        return (
          <section key={g.tier.key} className="rs-card">
            <button type="button" className="rs-head" aria-expanded={open} onClick={() => toggle(g.tier.key)}>
              <Egg tier={g.tier} />
              <span className="rs-head-name">{g.tier.label}</span>
              {live > 0 && (
                <span className="rs-head-live">{t(lang, `${live} live`, `เปิดอยู่ ${live}`, `${live}開催中`)}</span>
              )}
              <span className="rs-head-n">{t(lang, `${g.rows.length} windows`, `${g.rows.length} รอบ`, `${g.rows.length}回`)}</span>
              <span className={`rs-caret${open ? " open" : ""}`} aria-hidden>
                <ChevronRight size={16} strokeWidth={2.4} />
              </span>
            </button>
            {open && (
              <div className="rs-rows">
                {g.rows.map(r => (
                  <Row key={r.key} r={r} state={stateOf(r)} now={now} lang={lang} onOpen={onOpenCounters} />
                ))}
              </div>
            )}
          </section>
        );
      })}

      {go.status === "ready" && groups.length === 0 && (
        <div className="rs-card rs-loading">
          {t(lang, "No raid windows published right now", "ยังไม่มีรอบเรดประกาศออกมา", "現在公開中のレイドはありません")}
        </div>
      )}
    </main>
  );
}
