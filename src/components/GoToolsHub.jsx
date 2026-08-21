// ─── Pokémon GO Dashboard ────────────────────────────────────────────────────
//
// One page, four tables, one table language. The previous hub — a bento of
// status tiles over a grid of tool links — is gone entirely; this is a
// rebuild, not a layer on top.
//
// Data keeps its existing paths: raid windows come from goHubData (ScrapedDuck
// + PokéAPI), and eggs, Rocket line-ups and weather pairings are static in
// goDashboardData because the game fixes them rather than publishing them.

import { useEffect, useState } from "react";
import { Radio, RefreshCw, Zap, ChevronRight, Loader2 } from "lucide-react";
import { useGoHubData, RAID_TIERS, raidsByTier, eggPool, rocketLineups } from "../goHubData.js";
import { useRaidRows, nextRotation } from "./RaidSchedule.jsx";
import {
  TYPE_COLOR, TIER_ORDER, TIER_LABEL, EGG_COLORS, EGG_ROTATION,
  ROCKET_LINEUPS, WEATHER_TABLE, CONDITION_ROW, leekIcon, EGG_IMG, LEADER_IMG,
} from "../goDashboardData.js";
import { useWeather } from "../useWeather.js";

const t = (lang, en, th) => (lang === "th" ? th : en);

// ─── Countdown ───────────────────────────────────────────────────────────────
// §5.5. Recomputed from the target every tick rather than decremented, so a
// throttled or slept tab cannot drift, and recomputed again on wake.
function fmt(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  return `${m}m ${sec}s`;
}

function useClock() {
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

// ─── Shared pieces ───────────────────────────────────────────────────────────

/** §6.4 / §7 — a solid type badge. */
function TypeBadge({ type }) {
  const c = TYPE_COLOR[type] ?? TYPE_COLOR.normal;
  return (
    <span className="gd-type" style={{ background: c.bg, color: c.fg }}>
      {type}
    </span>
  );
}

/** §3.2 — the egg that leads a distance row. */
function EggIcon({ km, size = 30 }) {
  const [failed, setFailed] = useState(false);
  const src = EGG_IMG[km];
  if (src && !failed) {
    // Fandom refuses hotlinks by Referer — sending none is what makes these
    // load at all, the same fix the raid eggs needed.
    return (
      <img className="gd-egg-img" src={src} alt="" aria-hidden
        referrerPolicy="no-referrer" width={size} height={size}
        loading="lazy" decoding="async" onError={() => setFailed(true)} />
    );
  }
  const [from, to] = EGG_COLORS[km] ?? ["#e6e2da", "#c4beb6"];
  return (
    <span className="gd-egg" aria-hidden
      style={{ width: size * 0.85, height: size, background: `linear-gradient(160deg, ${from}, ${to})` }} />
  );
}

/**
 * §2 — the one sprite rail all three tables use.
 *
 * The wrap rule, the size-by-count rule and the +N chip were fixed three
 * separate times, in three separate places, and Rocket never got them. One
 * component means the next fix lands everywhere at once.
 */
export function SpriteRail({ pokemon = [], maxVisible = 3, showNames = true, size = "auto" }) {
  const shown = pokemon.slice(0, maxVisible);
  const extra = pokemon.length - shown.length;
  // 1 → 76, 2 → 64, 3+ → 54. A fixed size wins when the caller asks for one.
  const px = size === "auto" ? (shown.length === 1 ? 76 : shown.length === 2 ? 64 : 54) : size;

  return (
    <span className="sr-rail" data-names={showNames ? "y" : "n"}>
      {shown.map((m, i) => (
        <span key={m.name ?? i} className="sr-item" style={{ width: px }}>
          <span className="sr-box" style={{ width: px, height: px }}>
            {m.id && <img src={leekIcon(m.id)} alt={m.name ?? ""} loading="lazy" decoding="async" />}
            {m.shiny && <span className="sr-star" aria-hidden>✦</span>}
          </span>
          {showNames && m.name && <span className="sr-name">{m.name}</span>}
        </span>
      ))}
      {extra > 0 && (
        <span className="sr-more" style={{ width: px, height: px }}>+{extra}</span>
      )}
    </span>
  );
}

/** A Pokémon in a table cell: LeekDuck's cropped icon over the pale box. */
function Mon({ dex, name, small }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={`gd-mon${small ? " sm" : ""}`}>
      <span className="gd-mon-box">
        {failed
          ? <span className="gd-mon-fallback">{(name ?? "?").slice(0, 2)}</span>
          : <img src={leekIcon(dex)} alt="" loading="lazy" decoding="async"
              onError={() => setFailed(true)} />}
      </span>
      {!small && <span className="gd-mon-name">{name}</span>}
    </span>
  );
}

// ─── §5 · Raid Boss Schedule ─────────────────────────────────────────────────

function RaidRow({ r, now, lang }) {
  const state = now >= r.start && now <= r.end ? "live"
    : now < r.start ? "upcoming" : "ended";
  const range = `${new Date(r.start).toLocaleString("en-US",
    { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} - ${
    new Date(r.end).toLocaleString("en-US",
    { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`;

  return (
    <div className={`gd-raid ${state}`}>
      <span className="gd-raid-arts">
        {(r.group ?? [r]).map(m => (
          <span key={m.key} className="gd-raid-art">
            {m.id && <img src={leekIcon(m.id)} alt="" loading="lazy" decoding="async" />}
          </span>
        ))}
      </span>

      <span className="gd-raid-mid">
        <span className="gd-raid-top">
          <b>{(r.group ?? [r]).map(m => m.name).join(", ")}</b>
          {r.shiny && (
            <Zap size={14} strokeWidth={2.6} className="gd-shiny"
              aria-label={t(lang, "Shiny available", "มีโอกาสได้ shiny")} />
          )}
        </span>
        <span className="gd-raid-meta">
          <span className={`gd-state ${state}`}>
            {state === "live" && <i aria-hidden />}
            {state === "live" ? t(lang, "Live now", "กำลังเปิด")
              : state === "upcoming" ? t(lang, "Upcoming", "ถัดไป") : t(lang, "Ended", "จบแล้ว")}
          </span>
          <span className="gd-dot" aria-hidden>·</span>
          <span className="gd-range">{range}</span>
        </span>
        {state !== "ended" && (
          <span className={`gd-cd ${state}`}>
            {state === "live"
              ? `${t(lang, "Ends in", "จบในอีก")} ${fmt(r.end - now)}`
              : `${t(lang, "Starts in", "เริ่มในอีก")} ${fmt(r.start - now)}`}
          </span>
        )}
      </span>

      <span className="gd-raid-types">
        {[...new Set((r.group ?? [r]).flatMap(m => m.types ?? []))]
          .slice(0, 2).map(tp => <TypeBadge key={tp} type={tp} />)}
      </span>
    </div>
  );
}

/** The real raid egg for a tier label, from the table RaidGuide already uses. */
const tierEggImg = (label) =>
  RAID_TIERS.find(x => TIER_LABEL[x.key] === label)?.img ?? null;

/** Drawn fallback, in case a hotlinked egg ever fails. */
const TIER_EGG = {
  Mega:            ["#e88a6a", "#c9563c"],
  "5★ Legendary":  ["#4a4560", "#2b2838"],
  "Shadow 5★":     ["#8f6ac4", "#5b3f8a"],
  "3★ Rare":       ["#e8cf6a", "#c9a83c"],
  "1★ Common":     ["#e8a0b8", "#c96a8a"],
};

/**
 * Raids as a rotation table.
 *
 * Eggs and raids are the same shape of fact — a category against a week — and
 * showing one as a table and the other as a vertical list made a reader
 * re-learn the page every time they switched. Same table, same columns.
 */
/** The egg that leads a tier row: the Wiki art, with the gradient behind it. */
function TierEgg({ label }) {
  const [failed, setFailed] = useState(false);
  const src = tierEggImg(label);
  if (src && !failed) {
    // Fandom refuses hotlinks by Referer; sending none is what makes these
    // load at all — the same fix the egg-distance art needed.
    return (
      <img className="gd-egg-img" src={src} alt="" aria-hidden
        referrerPolicy="no-referrer" width={24} height={29}
        loading="lazy" decoding="async" onError={() => setFailed(true)} />
    );
  }
  const [from, to] = TIER_EGG[label] ?? ["#e6e2da", "#c4beb6"];
  return (
    <span className="gd-egg" aria-hidden
      style={{ width: 24, height: 29, background: `linear-gradient(160deg, ${from}, ${to})` }} />
  );
}

function RaidSection({ lang, rows, status, now, data }) {
  const [openShadow, setOpenShadow] = useState(null);
  const thisEnd = nextRotation(now);
  const WEEK = 7 * 86400000;
  const cols = [
    { key: "last", from: thisEnd - 2 * WEEK, to: thisEnd - WEEK, head: t(lang, "Last week", "สัปดาห์ที่แล้ว") },
    { key: "now",  from: thisEnd - WEEK,     to: thisEnd,        head: t(lang, "This week", "สัปดาห์นี้") },
    { key: "next", from: thisEnd,            to: thisEnd + WEEK, head: t(lang, "Next week", "สัปดาห์หน้า") },
  ];

  const cell = (label, col) => {
    const found = rows.filter(r => TIER_LABEL[r.tier] === label && r.start < col.to && r.end > col.from);
    // One window, one entry: the Regis share a slot and should share a cell.
    const byWindow = new Map();
    found.forEach(r => {
      const k = `${r.start}:${r.end}`;
      if (!byWindow.has(k)) byWindow.set(k, []);
      byWindow.get(k).push(r);
    });
    return [...byWindow.values()];
  };

  // raids.json lists every tier that is open right now but carries no dates;
  // events.json carries the dates but only names Mega and 5-star. Neither
  // file alone can fill this table, so the rotation supplies what it knows
  // and the current roster fills the "this week" column for the rest.
  const current = raidsByTier(data) ?? [];
  const currentFor = (label) => {
    const t = current.find(x => TIER_LABEL[x.key] === label);
    // Every tier turns over on the same boundary, so a boss known only from
    // the current roster still has a window: this one.
    return t ? [t.bosses.map(b => ({
      ...b, key: `${label}:${b.name}`, start: thisEnd - WEEK, end: thisEnd,
    }))] : [];
  };

  const has = (label) => cols.some(c => cell(label, c).length > 0) || currentFor(label).length > 0;
  const isShadow = (label) => /shadow/i.test(label);
  const tiers = TIER_ORDER.filter(l => !isShadow(l) && has(l));
  const shadowTiers = TIER_ORDER.filter(l => isShadow(l) && has(l));

  if (status === "loading") {
    return <div className="gd-state-box"><Loader2 size={32} strokeWidth={2.2} className="gd-spin" /></div>;
  }
  if (status === "error") {
    return <div className="gd-error">{t(lang, "Could not load raid data", "โหลดข้อมูลเรดไม่สำเร็จ")}</div>;
  }
  if (tiers.length === 0) {
    return <div className="gd-empty">{t(lang, "No data yet", "ยังไม่มีข้อมูล")}</div>;
  }

  return (
    <div className="gd-scroll">
      <table className="gd-table gd-raidtable">
        <colgroup>
          <col className="gd-rowhead" />
          {cols.map(c => <col key={c.key} className={c.key === "now" ? "gd-nowcol" : undefined} />)}
        </colgroup>
        <thead>
          <tr>
            <th scope="col">{t(lang, "Tier", "ระดับ")}</th>
            {cols.map(c => (
              <th key={c.key} scope="col" className={c.key === "now" ? "is-now" : undefined}>
                {c.head}
                {c.key === "now" && <em className="gd-nowtag">{t(lang, "now", "ตอนนี้")}</em>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tiers.map(label => {
            return (
              <tr key={label}>
                <th scope="row" className="gd-rowlabel">
                  <TierEgg label={label} />
                  <span>{label}</span>
                </th>
                {cols.map(col => {
                  // Fall back to the live roster only in the current column —
                  // it says what is open, not when it opened.
                  let groups = cell(label, col);
                  if (groups.length === 0 && col.key === "now") groups = currentFor(label);
                  return (
                    <td key={col.key}
                      className={`${col.key === "now" ? "is-now" : ""}${col.key === "last" ? " is-past" : ""}`}>
                      {groups.length === 0 ? (
                        <span className="gd-none">
                          {col.key === "last" ? t(lang, "No history", "ไม่มีข้อมูลย้อนหลัง")
                            : col.key === "next" ? t(lang, "Not announced", "ยังไม่ประกาศ")
                            : "—"}
                        </span>
                      ) : groups.map((g, i) => (
                        <span key={i} className="gd-rcell" data-n={Math.min(g.length, 3)}>
                          <SpriteRail pokemon={g} maxVisible={3} showNames={false} />
                          <span className="gd-rcell-meta">
                          {/* A count leads; the names follow small, because
                              truncating the count loses more than truncating
                              a list of names. */}
                          {g.length > 1 ? (
                            <>
                              <span className="gd-rcell-name">
                                {t(lang, `${g.length} bosses`, `${g.length} ตัว`)}
                              </span>
                              <span className="gd-rcell-list">{g.map(m => m.name).join(" · ")}</span>
                            </>
                          ) : (
                            <span className="gd-rcell-name">{g[0].name}</span>
                          )}
                          <span className="gd-rcell-types">
                            {[...new Set(g.flatMap(m => m.types ?? []))].slice(0, 2)
                              .map(tp => <TypeBadge key={tp} type={tp} />)}
                          </span>
                          {col.key === "now" && (
                            <span className="gd-rcell-cd live">
                              {t(lang, "Ends in", "จบใน")} {fmt(g[0].end - now)}
                            </span>
                          )}
                          {col.key === "next" && (
                            <span className="gd-rcell-cd next">
                              {t(lang, "Starts in", "เริ่มใน")} {fmt(g[0].start - now)}
                            </span>
                          )}
                          {col.key === "last" && (
                            <span className="gd-rcell-cd done">{t(lang, "Ended", "จบไปแล้ว")}</span>
                          )}
                          </span>
                        </span>
                      ))}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      {shadowTiers.length > 0 && (
        <div className="gd-shadowbar">
          <div className="gd-shadowbar-h">Shadow Raids</div>
          <div className="gd-shadowbar-row">
            {shadowTiers.map(label => {
              const g = currentFor(label)[0] ?? [];
              return (
                <button key={label} type="button" className="gd-schip"
                  onClick={() => setOpenShadow(openShadow === label ? null : label)}
                  aria-expanded={openShadow === label}>
                  <TierEgg label={label} />
                  <span className="gd-schip-name">{label}</span>
                  <span className="gd-schip-arts">
                    {g.slice(0, 3).map(m => (
                      <span key={m.key} className="gd-schip-art">
                        {m.id && <img src={leekIcon(m.id)} alt="" loading="lazy" decoding="async" />}
                      </span>
                    ))}
                  </span>
                  <span className="gd-schip-n">{t(lang, `${g.length}`, `${g.length} ตัว`)}</span>
                </button>
              );
            })}
          </div>
          {openShadow && (
            <div className="gd-shadowlist">
              {(currentFor(openShadow)[0] ?? []).map(m => (
                <span key={m.key} className="gd-rcell" data-n="1">
                  <span className="gd-rcell-arts">
                    <span className="gd-rcell-art">
                      {m.id && <img src={leekIcon(m.id)} alt="" loading="lazy" decoding="async" />}
                    </span>
                  </span>
                  <span className="gd-rcell-meta">
                    <span className="gd-rcell-name">{m.name}</span>
                    <span className="gd-rcell-types">
                      {(m.types ?? []).slice(0, 2).map(tp => <TypeBadge key={tp} type={tp} />)}
                    </span>
                    <span className="gd-rcell-cd live">
                      {t(lang, "Ends in", "จบใน")} {fmt(thisEnd - now)}
                    </span>
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── §3 · Egg rotation ───────────────────────────────────────────────────────

/** §5.1 — one shell per distance, numbered, so the row reads without colour. */
const EGG_SHELL = {
  1:  ["#a8c8e8", "#5c7fa8"],
  2:  ["#a8d98a", "#5c9440"],
  5:  ["#f0d98a", "#c9a83c"],
  7:  ["#f0a8c4", "#c96a8a"],
  10: ["#c4a8e0", "#7a4d9e"],
  12: ["#e08a8a", "#a83c3c"],
};

/** §5.2 — where each egg actually comes from, for anyone who does not know. */
const EGG_SOURCE = {
  1:  { en: "Weekly Adventure Sync", th: "Adventure Sync รายสัปดาห์" },
  2:  { en: "PokéStops · Gyms",      th: "PokéStop · Gym" },
  5:  { en: "PokéStops · Gyms",      th: "PokéStop · Gym" },
  7:  { en: "Gifts from friends",    th: "ของขวัญจากเพื่อน" },
  10: { en: "PokéStops · Gyms",      th: "PokéStop · Gym" },
  12: { en: "Team GO Rocket leaders", th: "หัวหน้า Team GO Rocket" },
};

function Shell({ km }) {
  const [failed, setFailed] = useState(false);
  const src = EGG_IMG[km];
  if (src && !failed) {
    // The real art, with the distance still stamped on it — the 2 km and
    // 10 km shells are close enough in the game's own palette that the
    // number is what tells them apart at a glance.
    return (
      <span className="eg-shell eg-shell-img" aria-hidden>
        <img src={src} alt="" referrerPolicy="no-referrer"
          loading="lazy" decoding="async" onError={() => setFailed(true)} />
        <b>{km}</b>
      </span>
    );
  }
  const [from, to] = EGG_SHELL[km] ?? ["#e6e2da", "#c4beb6"];
  return (
    <span className="eg-shell" aria-hidden
      style={{ background: `linear-gradient(160deg, ${from}, ${to})` }}>
      <b>{km}</b>
    </span>
  );
}

function EggCard({ m, lang }) {
  return (
    <a className="eg-card" href={m.id ? `/pokedex?q=${encodeURIComponent(m.name)}` : "#"}
      onClick={(e) => { if (!m.id) e.preventDefault(); }}>
      <span className="eg-card-art">
        {m.id && <img src={leekIcon(m.id)} alt="" loading="lazy" decoding="async" />}
        {m.shiny && (
          <span className="eg-star" aria-label={t(lang, "Shiny possible", "มีโอกาสได้ shiny")}>✦</span>
        )}
      </span>
      <span className="eg-card-name">{m.name}</span>
      {m.cpMin != null && (
        <span className="eg-card-cp num">
          CP {m.cpMin}{m.cpMax > m.cpMin ? `–${m.cpMax}` : ""}
        </span>
      )}
    </a>
  );
}

const CAP = 12;

function EggRow({ row, lang, open, onToggle }) {
  const [all, setAll] = useState(false);
  const km = parseInt(row.km, 10);
  const src = EGG_SOURCE[km];
  const shown = all ? row.mons : row.mons.slice(0, CAP);
  const id = `eg-panel-${km}`;

  return (
    <div className="eg-row">
      <button type="button" className="eg-head" aria-expanded={open} aria-controls={id}
        onClick={onToggle}>
        <Shell km={km} />
        <span className="eg-title">
          <span className="eg-km">{row.km}</span>
          {src && <span className="eg-src">{t(lang, src.en, src.th)}</span>}
        </span>
        {open ? (
          <span className="eg-openhint">
            {(() => {
              const shiny = row.mons.filter(m => m.shiny).length;
              const top = row.mons.reduce((a, m) => Math.max(a, m.cpMax ?? 0), 0);
              return t(lang,
                `${shiny} can be shiny · highest CP ${top}`,
                `shiny ได้ ${shiny} ตัว · CP สูงสุด ${top}`);
            })()}
          </span>
        ) : (
        <span className="eg-peek">
          <SpriteRail pokemon={row.mons} maxVisible={3} showNames={false} size={46} />
        </span>
        )}
        <span className="eg-count">{t(lang, `${row.mons.length}`, `${row.mons.length} ตัว`)}</span>
        <ChevronRight size={13} strokeWidth={2.6} className={`eg-caret${open ? " open" : ""}`} aria-hidden />
      </button>

      {open && (
        <div className="eg-panel" id={id}>
          <div className="eg-grid">
            {shown.map(m => <EggCard key={m.name} m={m} lang={lang} />)}
          </div>
          {row.mons.length > CAP && !all && (
            <button type="button" className="eg-more" onClick={() => setAll(true)}>
              {t(lang, `See ${row.mons.length - CAP} more`, `ดูอีก ${row.mons.length - CAP} ตัว`)} ›
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function EggSection({ lang, now, data, status }) {
  const thisEnd = nextRotation(now);
  const pool = eggPool(data);

  const [open, setOpen] = useState(() => {
    try { return JSON.parse(localStorage.getItem("pkdx_egg_open") ?? "[]"); } catch { return []; }
  });
  const toggle = (km) => setOpen(prev => {
    const next = prev.includes(km) ? prev.filter(x => x !== km) : [...prev, km];
    try { localStorage.setItem("pkdx_egg_open", JSON.stringify(next)); } catch { /* private mode */ }
    return next;
  });

  // Announced once a minute; every distance ends together, so one region.
  const coarse = fmt(thisEnd - now).replace(/\s\d+s$/, "");
  const [spoken, setSpoken] = useState(coarse);
  if (spoken !== coarse) setSpoken(coarse);

  if (status === "loading") {
    return (
      <div className="eg-skel">
        {[0,1,2,3,4].map(i => <span key={i} className="eg-skel-row" />)}
      </div>
    );
  }
  if (!pool) {
    return (
      <div className="gd-error">
        {t(lang, "Could not load the egg pool", "โหลดพูลไข่ไม่สำเร็จ")}
        <button type="button" className="gd-refresh" style={{ marginLeft: 12 }}
          onClick={() => window.location.reload()}>
          {t(lang, "Try again", "ลองใหม่")}
        </button>
      </div>
    );
  }

  // A distance with nothing in it is hidden rather than shown empty.
  const rows = pool.filter(r => r.mons.length > 0);

  return (
    <>
      <header className="eg-cardhead">
        <div>
          <h2 className="gd-h2">{t(lang, "Egg rotation", "รอบหมุนไข่")}</h2>
          <p className="gd-sub">
            {t(lang, "What hatches right now · live from LeekDuck",
                 "โปเกมอนที่ฟักได้ตอนนี้ · ข้อมูลสดจาก LeekDuck")}
          </p>
        </div>
        {/* One countdown: every distance turns over on the same boundary, so
            repeating it per row would be the same number six times. */}
        <div className="eg-cd">
          <span>{t(lang, "This rotation ends in", "รอบนี้จบใน")}</span>
          <b className="num">{fmt(thisEnd - now)}</b>
          <span className="sr-only" aria-live="polite">{spoken}</span>
        </div>
      </header>

      <div className="eg-list">
        {rows.map(row => (
          <EggRow key={row.km} row={row} lang={lang}
            open={open.includes(row.km)} onToggle={() => toggle(row.km)} />
        ))}
      </div>
    </>
  );
}

// ─── §4 · Team GO Rocket ─────────────────────────────────────────────────────

function RocketSection({ lang, data, status }) {
  const [showGrunts, setShowGrunts] = useState(false);
  const all = rocketLineups(data);

  if (status === "loading") {
    return <div className="gd-state-box"><Loader2 size={32} strokeWidth={2.2} className="gd-spin" /></div>;
  }
  if (!all) {
    return (
      <div className="gd-error">
        {t(lang, "Could not load Rocket line-ups", "โหลดทีม Rocket ไม่สำเร็จ")}
        <button type="button" className="gd-refresh" style={{ marginLeft: 12 }}
          onClick={() => window.location.reload()}>{t(lang, "Try again", "ลองใหม่")}</button>
      </div>
    );
  }

  const leaders = all.filter(x => x.kind !== "grunt");
  const grunts = all.filter(x => x.kind === "grunt");

  const Row = ({ e }) => (
    <tr>
      <th scope="row" className="gd-rowlabel gd-leader"
        title={e.kind === "boss" ? t(lang, "Needs a Super Rocket Radar", "ต้องใช้ Super Rocket Radar") : undefined}>
        {LEADER_IMG[e.name] && (
          <span className="gd-leader-face">
            <img src={LEADER_IMG[e.name]} alt={e.name} loading="lazy" decoding="async" />
          </span>
        )}
        <span className="rk-who">
          <span className="gd-leader-name">{e.name}</span>
          {e.type && <span className="tp" data-type={e.type}>{e.type}</span>}
          {e.kind === "boss" && (
            <em className="rk-note">{t(lang, "Super Rocket Radar", "ต้องใช้ Super Rocket Radar")}</em>
          )}
        </span>
      </th>
      {e.slots.map((slot, i) => (
        <td key={i}>
          <span className="rk-cell">
            <SpriteRail pokemon={slot} maxVisible={3} />
            <span className="rk-types">
              {[...new Set(slot.flatMap(m => m.types))].slice(0, 3)
                .map(tp => <span key={tp} className="tp rk-tp" data-type={tp}>{tp}</span>)}
            </span>
            <span className="rk-meta">
              {slot.length > 1
                ? t(lang, `1 of ${slot.length} at random`, `สุ่ม 1 ใน ${slot.length}`)
                : t(lang, "Always first", "คงที่เสมอ")}
            </span>
          </span>
        </td>
      ))}
      <td>
        {e.reward ? (
          <span className="rk-cell">
            <SpriteRail pokemon={[e.reward]} maxVisible={1} showNames={false} size={54} />
            <span className="rk-meta">
              <b className="rk-reward">{e.reward.name}</b>
              {t(lang, "catchable", "จับได้")}
            </span>
          </span>
        ) : <span className="gd-none">—</span>}
      </td>
    </tr>
  );

  const head = (
    <tr>
      <th scope="col">{t(lang, "Who", "ใคร")}</th>
      <th scope="col">{t(lang, "First", "ตัวแรก")}</th>
      <th scope="col">{t(lang, "Second", "ตัวที่สอง")}</th>
      <th scope="col">{t(lang, "Third", "ตัวที่สาม")}</th>
      <th scope="col">{t(lang, "Catchable", "จับได้")}</th>
    </tr>
  );

  return (
    <>
      <header className="gd-head gd-head-sub">
        <div>
          <h2 className="gd-h2">Team GO Rocket</h2>
          <p className="gd-sub">
            {t(lang, "Live line-ups from LeekDuck", "ทีมสดจาก LeekDuck")}
          </p>
        </div>
      </header>

      <div className="gd-scroll">
        <table className="gd-table rk-table">
          <thead>{head}</thead>
          <tbody>{leaders.map(e => <Row key={e.name} e={e} />)}</tbody>
        </table>
      </div>

      {grunts.length > 0 && (
        <div className="rk-grunts">
          <button type="button" className="rk-gtoggle" aria-expanded={showGrunts}
            onClick={() => setShowGrunts(v => !v)}>
            {t(lang, `Grunt line-ups (${grunts.length})`, `ทีมของ Grunt (${grunts.length})`)}
            <ChevronRight size={14} strokeWidth={2.6}
              className={`eg-caret${showGrunts ? " open" : ""}`} aria-hidden />
          </button>
          {showGrunts && (
            <div className="gd-scroll">
              <table className="gd-table rk-table">
                <thead>{head}</thead>
                <tbody>{grunts.map(e => <Row key={e.name} e={e} />)}</tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ─── §6 · Weather bonuses ────────────────────────────────────────────────────

function WeatherSection({ lang, weather, locating, requestLocation }) {
  const activeKey = weather ? CONDITION_ROW[weather.condition] : null;
  return (
    <>
      <header className="gd-head gd-head-sub">
        <div>
          <h2 className="gd-h2">{t(lang, "Weather bonuses", "โบนัสจากสภาพอากาศ")}</h2>
          <p className="gd-sub">{t(lang, "Types boosted in each condition", "ธาตุที่ได้โบนัสในแต่ละสภาพอากาศ")}</p>
        </div>
        {!weather && (
          <button type="button" className="gd-refresh" disabled={locating} onClick={requestLocation}>
            {locating ? t(lang, "Locating…", "กำลังขอ…") : t(lang, "Enable location", "เปิดใช้ตำแหน่ง")}
          </button>
        )}
      </header>
      <div className="gd-scroll">
        <table className="gd-table">
          <thead>
            <tr>
              <th scope="col">{t(lang, "Weather", "สภาพอากาศ")}</th>
              <th scope="col">{t(lang, "Boosted types", "ธาตุที่ได้โบนัส")}</th>
            </tr>
          </thead>
          <tbody>
            {WEATHER_TABLE.map(row => {
              const on = row.key === activeKey;
              return (
                <tr key={row.key} className={on ? "is-now-row" : undefined}>
                  <th scope="row" className="gd-rowlabel">
                    {on && <span className="gd-nowdot" aria-hidden />}
                    <span>{t(lang, row.en, row.th)}</span>
                    {on && <em className="gd-nowtag">{t(lang, "now", "ตอนนี้")}</em>}
                  </th>
                  <td>
                    <span className="gd-types">
                      {row.types.map(tp => <TypeBadge key={tp} type={tp} />)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

const TABS = [
  { key: "raids",   color: "#8f2f2a", en: "Raid bosses",    th: "บอสเรด" },
  { key: "eggs",    color: "#b58aa8", en: "Egg rotation",   th: "รอบหมุนไข่" },
  { key: "rocket",  color: "#4a3b35", en: "Team Rocket",    th: "ทีม Rocket" },
  { key: "weather", color: "#6b9ef0", en: "Weather",        th: "โบนัสอากาศ" },
];

export default function GoToolsHub({ allList = [], lang = "en", cachedFetch }) {
  const now = useClock();
  const { weather, loading: locating, requestLocation } = useWeather();
  const { go, rows } = useRaidRows({ allList, cachedFetch });

  // Four tables stacked is a long scroll for someone who came for one of
  // them, so only the chosen one is drawn — and the choice is remembered.
  const [tab, setTabRaw] = useState(() => {
    try { return TABS.some(x => x.key === localStorage.getItem("pkdx_gd_tab"))
      ? localStorage.getItem("pkdx_gd_tab") : "raids"; } catch { return "raids"; }
  });
  const setTab = (k) => {
    setTabRaw(k);
    try { localStorage.setItem("pkdx_gd_tab", k); } catch { /* private mode */ }
  };

  const liveCount = rows.filter(r => now >= r.start && now <= r.end).length;
  const clock = new Date(now).toLocaleTimeString("en-GB",
    { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

  return (
    <main className="gd-page">
      <section className="gd-card gd-shell">
        <header className="gd-shell-head">
          <div className="gd-shell-left">
            <h1>Pokémon GO Dashboard</h1>
            <p className="gd-live">
              <span className="gd-livedot" aria-hidden />
              {t(lang, `${liveCount} live now`, `กำลังเปิด ${liveCount} ตัว`)}
              <span className="gd-dot" aria-hidden>·</span>
              <span className="gd-num">{clock}</span><em className="gd-tz">ICT</em>
              <span className="gd-dot" aria-hidden>·</span>
              {t(lang, "rotation changes Wed 06:00", "รอบเปลี่ยนทุกพุธ 06:00")}
            </p>
          </div>
          <button type="button" className="gd-refresh" onClick={() => window.location.reload()}>
            <RefreshCw size={14} strokeWidth={2.4}
              className={go.status === "loading" ? "gd-spin" : undefined} />
            {t(lang, "Refresh", "รีเฟรช")}
          </button>
        </header>

        <div className="gd-tabs" role="tablist">
          {TABS.map(x => (
            <button key={x.key} type="button" role="tab" aria-selected={tab === x.key}
              className={`gd-tab${tab === x.key ? " on" : ""}`}
              style={{ "--tabc": x.color }} onClick={() => setTab(x.key)}>
              <span className="gd-tab-dot" aria-hidden />
              {t(lang, x.en, x.th)}
            </button>
          ))}
        </div>

        <div className="gd-panel">
          {tab === "raids"   && <RaidSection lang={lang} rows={rows} status={go.status}
                                  now={now} data={go.data} />}
          {tab === "eggs"    && <EggSection lang={lang} now={now} data={go.data} status={go.status} />}
          {tab === "rocket"  && <RocketSection lang={lang} data={go.data} status={go.status} />}
          {tab === "weather" && (
            <WeatherSection lang={lang} weather={weather}
              locating={locating} requestLocation={requestLocation} />
          )}
        </div>
      </section>
    </main>
  );
}
