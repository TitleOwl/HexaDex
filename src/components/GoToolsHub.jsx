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
import { useGoHubData, RAID_TIERS, raidsByTier } from "../goHubData.js";
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
    return t ? [t.bosses.map(b => ({ ...b, key: `${label}:${b.name}`, start: 0, end: 0 }))] : [];
  };

  const tiers = TIER_ORDER.filter(label =>
    cols.some(c => cell(label, c).length > 0) || currentFor(label).length > 0);

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
                      {groups.length === 0 ? <span className="gd-none">—</span> : groups.map((g, i) => (
                        <span key={i} className="gd-rcell">
                          <span className="gd-rcell-arts">
                            {g.map(m => (
                              <span key={m.key} className="gd-rcell-art">
                                {m.id && <img src={leekIcon(m.id)} alt="" loading="lazy" decoding="async" />}
                              </span>
                            ))}
                          </span>
                          <span className="gd-rcell-name">{g.map(m => m.name).join(", ")}</span>
                          <span className="gd-rcell-types">
                            {[...new Set(g.flatMap(m => m.types ?? []))].slice(0, 2)
                              .map(tp => <TypeBadge key={tp} type={tp} />)}
                          </span>
                          {col.key === "now" && g[0].end > 0 && (
                            <span className="gd-rcell-cd live">
                              {t(lang, "Ends in", "จบใน")} {fmt(g[0].end - now)}
                            </span>
                          )}
                          {col.key === "next" && (
                            <span className="gd-rcell-cd next">
                              {t(lang, "Starts in", "เริ่มใน")} {fmt(g[0].start - now)}
                            </span>
                          )}
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
    </div>
  );
}

// ─── §3 · Egg rotation ───────────────────────────────────────────────────────

function EggSection({ lang }) {
  const cols = [
    t(lang, "Last week", "สัปดาห์ที่แล้ว"),
    t(lang, "This week", "สัปดาห์นี้"),
    t(lang, "Next week", "สัปดาห์หน้า"),
  ];
  return (
    <>
      <header className="gd-head gd-head-sub">
        <div>
          <h2 className="gd-h2">{t(lang, "Egg rotation", "รอบหมุนไข่")}</h2>
          <p className="gd-sub">{t(lang, "What hatches from each distance", "ตัวที่ฟักได้จากไข่แต่ละระยะ")}</p>
        </div>
      </header>
      <div className="gd-scroll">
        <table className="gd-table">
          <colgroup>
            <col className="gd-rowhead" />
            {cols.map((c, i) => <col key={c} className={i === 1 ? "gd-nowcol" : undefined} />)}
          </colgroup>
          <thead>
            <tr>
              <th scope="col">{t(lang, "Distance", "ระยะทาง")}</th>
              {cols.map((c, i) => (
                <th key={c} scope="col" className={i === 1 ? "is-now" : undefined}>
                  {c}{i === 1 && <em className="gd-nowtag">{t(lang, "now", "ตอนนี้")}</em>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {EGG_ROTATION.map(row => (
              <tr key={row.km}>
                <th scope="row" className="gd-rowlabel">
                  <EggIcon km={row.km} />
                  <span>{row.km} km</span>
                </th>
                {row.weeks.map((week, i) => (
                  <td key={i} className={`${i === 1 ? "is-now" : ""}${i === 0 ? " is-past" : ""}`}>
                    {week.length === 0 ? <span className="gd-none">—</span>
                      : week.map(m => <Mon key={m.dex + m.name} dex={m.dex} name={m.name} />)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ─── §4 · Team GO Rocket ─────────────────────────────────────────────────────

function RocketSection({ lang }) {
  return (
    <>
      <header className="gd-head gd-head-sub">
        <div>
          <h2 className="gd-h2">Team GO Rocket</h2>
          <p className="gd-sub">{t(lang, "Line-ups to counter before you fight", "ทีมที่ต้องเจอ เอาไว้จัดตัวเคาน์เตอร์")}</p>
        </div>
      </header>
      <div className="gd-scroll">
        <table className="gd-table">
          <thead>
            <tr>
              <th scope="col">{t(lang, "Leader", "หัวหน้า")}</th>
              <th scope="col">{t(lang, "First", "ตัวแรก")}</th>
              <th scope="col">{t(lang, "Second", "ตัวที่สอง")}</th>
              <th scope="col">{t(lang, "Third", "ตัวที่สาม")}</th>
              <th scope="col">{t(lang, "Reward", "รางวัล")}</th>
            </tr>
          </thead>
          <tbody>
            {ROCKET_LINEUPS.map(l => (
              <tr key={l.leader}>
                <th scope="row" className="gd-rowlabel gd-leader"
                  title={l.sub ? t(lang, l.subEn, l.sub) : undefined}>
                  <span className="gd-leader-face">
                    <img src={LEADER_IMG[l.leader]} alt="" aria-hidden
                      loading="lazy" decoding="async" />
                  </span>
                  <span className="gd-leader-name">{l.leader}</span>
                </th>
                {l.slots.map((slot, i) => (
                  <td key={i}>
                    {slot.random ? (
                      <span className="gd-random">
                        <span className="gd-random-row">
                          {slot.mons.map(m => <Mon key={m.dex} dex={m.dex} name={m.name} small />)}
                        </span>
                        <em>{t(lang, "1 of 3 at random", "สุ่ม 1 ใน 3")}</em>
                      </span>
                    ) : (
                      slot.mons.map(m => <Mon key={m.dex} dex={m.dex} name={m.name} />)
                    )}
                  </td>
                ))}
                <td>
                  <span className="gd-reward" style={{
                    background: (TYPE_COLOR[l.reward.type] ?? TYPE_COLOR.normal).bg,
                    color: (TYPE_COLOR[l.reward.type] ?? TYPE_COLOR.normal).fg }}>
                    {l.reward.name}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
          {tab === "eggs"    && <EggSection lang={lang} />}
          {tab === "rocket"  && <RocketSection lang={lang} />}
          {tab === "weather" && (
            <WeatherSection lang={lang} weather={weather}
              locating={locating} requestLocation={requestLocation} />
          )}
        </div>
      </section>
    </main>
  );
}
