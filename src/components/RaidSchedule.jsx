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
import { RefreshCw, ChevronRight, Radio, Zap } from "lucide-react";
import { TYPE_NAMES_TH, TYPE_NAMES_JA } from "../data.js";
import {
  useGoHubData, spriteUrl, raidRotations, rotationState,
  RAID_TIERS, useMegaSprites, useRotationTypes,
} from "../goHubData.js";

const COLLAPSE_KEY = "pkdx_raidsched_collapsed";

const t = (lang, en, th, ja) => (lang === "th" ? th : lang === "ja" ? ja : en);

const TIER_NAME = {
  mega: "Mega", "5": "5\u2605 Legendary", s5: "Shadow",
  "3": "3\u2605", s3: "Shadow 3\u2605", "1": "1\u2605", s1: "Shadow 1\u2605",
};

/** "Wed, Aug 12 at 07:00 AM" — the window in full, as the spec asks. */
function stamp(ms, lang, short = false) {
  const d = new Date(ms);
  const loc = lang === "th" ? "th-TH" : lang === "ja" ? "ja-JP" : "en-US";
  const day = d.toLocaleDateString(loc, short
    ? { month: "short", day: "numeric" }
    : { weekday: "short", month: "short", day: "numeric" });
  const time = d.toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit", hour12: true });
  return short ? `${day}, ${time}` : `${day} at ${time}`;
}

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

function Row({ r, state, now, lang, onOpen, narrow }) {
  const [open, setOpen] = useState(false);
  const label = (tp) => lang === "th" ? (TYPE_NAMES_TH[tp] ?? tp)
    : lang === "ja" ? (TYPE_NAMES_JA[tp] ?? tp) : tp;

  // Live counts to the end, upcoming to the start. Two different questions,
  // so each says which one it is answering.
  const target = state === "live" ? r.end : r.start;
  const lead = state === "live" ? t(lang, "Ends in", "จบในอีก", "終了まで")
    : state === "upcoming" ? t(lang, "Starts in", "เริ่มในอีก", "開始まで") : null;

  return (
    <div className={`rs-row ${state}${open ? " open" : ""}`} role="button" tabIndex={0}
      aria-expanded={open}
      aria-label={`${r.name} — ${state === "live" ? t(lang, "live now", "กำลังเปิด", "開催中")
        : state === "upcoming" ? t(lang, "upcoming", "ถัดไป", "予定") : t(lang, "ended", "จบแล้ว", "終了")}`}
      onClick={() => setOpen(o => !o)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(o => !o); } }}>

      <span className="rs-art">
        {r.id && <img src={spriteUrl(r.id)} alt="" loading="lazy" decoding="async" />}
      </span>

      <span className="rs-mid">
        <span className="rs-title">
          <b className="rs-name">{r.name}</b>
          {r.shiny && (
            <span className="rs-bolt" aria-label={t(lang, "Shiny available", "มีโอกาสได้ shiny", "色違いあり")}>
              <Zap size={15} strokeWidth={2.4} fill="currentColor" />
            </span>
          )}
        </span>

        {/* The state is a word before it is a colour. */}
        <span className="rs-meta">
          <span className={`rs-state ${state}`}>
            {state === "live" && <i className="rs-dot" aria-hidden />}
            {state === "live" ? t(lang, "Live now", "กำลังเปิด", "開催中")
              : state === "upcoming" ? t(lang, "Upcoming", "ถัดไป", "予定")
              : t(lang, "Ended", "จบแล้ว", "終了")}
          </span>
          <span className="rs-sep" aria-hidden>·</span>
          <span className="rs-when">
            {stamp(r.start, lang, narrow)} – {stamp(r.end, lang, narrow)}
          </span>
        </span>

        {lead && (
          <span className={`rs-cd ${state}`}>
            {lead} <b className="num">{fmt(target - now)}</b>
          </span>
        )}
      </span>

      {r.types?.length > 0 && (
        <span className="rs-types">
          {r.types.map(tp => (
            <span key={tp} className="rs-pill" data-t={tp}>{label(tp)}</span>
          ))}
        </span>
      )}

      {/* Everything a row needed but could not hold in three lines. Folded
          away rather than dropped: the mock reads well because each row is
          three lines, and packing four back in undoes exactly that. */}
      {open && (
        <div className="rs-more" onClick={(e) => e.stopPropagation()}>
          {r.weaknesses?.length > 0 && (
            <div className="rs-more-weak">
              <span className="rs-more-lbl">{t(lang, "Weak to", "อ่อนแอต่อ", "弱点")}</span>
              {r.weaknesses.map(tp => (
                <span key={tp} className="rs-pill rs-pill-s" data-t={tp}>{label(tp)}</span>
              ))}
            </div>
          )}
          <div className="rs-more-foot">
            {r.party && (
              <span className="rs-more-party">
                {t(lang, `Needs ${r.party} players`, `ใช้ ${r.party} คน`, `${r.party}人必要`)}
              </span>
            )}
            <button type="button" className="rs-more-btn"
              onClick={(e) => { e.stopPropagation(); onOpen?.(r); }}>
              {t(lang, "See counters", "ดูตัวเคาน์เตอร์", "対策を見る")}
              <ChevronRight size={13} strokeWidth={2.6} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * The tier accordions. Exported because the GO Tools hub shows the same list
 * full-width — one implementation, not a second copy that drifts.
 */
export function RaidTierList({ lang = "en", allList = [], cachedFetch, onOpenCounters, now }) {
  const tick = useTick();
  const at = now ?? tick;
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
    const s = rotationState(r, at);
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

  const clock = new Date(now).toLocaleTimeString("en-US",
    { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });

  // Below 480px the full "Wed, Aug 12 at 07:00 AM" cannot fit, so the range
  // shortens rather than wrapping into four lines.
  const [narrow, setNarrow] = useState(() => window.matchMedia("(max-width: 479px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 479px)");
    const on = (e) => setNarrow(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  return (
    <>
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
              <span className="rs-head-name">{TIER_NAME[g.tier.key] ?? g.tier.label}</span>
              {live > 0 && (
                <span className="rs-head-live">{t(lang, `${live} live`, `เปิดอยู่ ${live}`, `${live}開催中`)}</span>
              )}
              <span className="rs-head-n">{t(lang, `${g.rows.length} bosses`, `${g.rows.length} ตัว`, `${g.rows.length}体`)}</span>
              <span className={`rs-caret${open ? " open" : ""}`} aria-hidden>
                <ChevronRight size={16} strokeWidth={2.4} />
              </span>
            </button>
            {open && (
              <div className="rs-rows">
                {g.rows.map(r => (
                  <Row key={r.key} r={r} state={stateOf(r)} now={at} lang={lang}
                    onOpen={onOpenCounters} narrow={narrow} />
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
    </>
  );
}

/** The standalone page: the header, then the same list. */
export default function RaidSchedule(props) {
  const now = useTick();
  const go = useGoHubData();
  const rows = useRotationTypes(
    useMegaSprites(raidRotations(go.data, (props.allList ?? []).map(p => ({
      name: p.name, id: Number(p.url.split("/").filter(Boolean).pop()),
    }))) ?? []), props.cachedFetch);
  const liveCount = rows.filter(r => rotationState(r, now) === "live").length;
  const rotMs = nextRotation(now) - now;
  const lang = props.lang ?? "en";
  const clock = new Date(now).toLocaleTimeString("en-US",
    { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });

  return (
    <main className="grid-wrap rs-page">
      <header className="rs-bar">
        <div className="rs-bar-left">
          <h1 className="rs-h1">
            {t(lang, "Pokémon GO Raid Schedule", "ตารางรอบเรด Pokémon GO", "ポケモンGO レイドスケジュール")}
          </h1>
          <p className="rs-sub">
            <Radio size={15} strokeWidth={2.4} className="rs-sub-ico" aria-hidden />
            {t(lang, `${liveCount} live now`, `กำลังเปิด ${liveCount} รอบ`, `${liveCount}件 開催中`)}
            <span className="rs-sep" aria-hidden>·</span>
            <span className="num">{clock}</span>
            <span className="rs-sep" aria-hidden>·</span>
            {t(lang, `next rotation ${fmtCoarse(rotMs)}`,
              `รอบถัดไปอีก ${fmtCoarse(rotMs)}`, `次のローテーション ${fmtCoarse(rotMs)}`)}
          </p>
        </div>
        <button type="button" className="rs-refresh" onClick={() => window.location.reload()}>
          <RefreshCw size={15} strokeWidth={2.4} />
          {t(lang, "Refresh", "รีเฟรช", "更新")}
        </button>
      </header>
      <RaidTierList {...props} now={now} />
    </main>
  );
}
