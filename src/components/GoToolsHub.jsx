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
import { useGoHubData } from "../goHubData.js";
import { useRaidRows } from "./RaidSchedule.jsx";
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

function RaidSection({ lang, rows, status, now }) {
  const [closed, setClosed] = useState([]);
  const toggle = (k) => setClosed(p => p.includes(k) ? p.filter(x => x !== k) : [...p, k]);

  const liveCount = rows.filter(r => now >= r.start && now <= r.end).length;
  const clock = new Date(now).toLocaleTimeString("en-GB",
    { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

  // §5.4 — group by tier in TIER_ORDER, and inside a tier live before
  // upcoming before ended.
  const rank = (r) => (now >= r.start && now <= r.end) ? 0 : (now < r.start ? 1 : 2);
  const groups = TIER_ORDER
    .map(label => ({
      label,
      // Regirock, Regice and Registeel share one window; three identical
      // rows said the same thing three times. One row, three sprites.
      rows: (() => {
        const mine = rows.filter(r => TIER_LABEL[r.tier] === label)
          .sort((a, b) => rank(a) - rank(b) || a.start - b.start);
        const byWindow = new Map();
        mine.forEach(r => {
          const k = `${r.start}:${r.end}`;
          if (!byWindow.has(k)) byWindow.set(k, { ...r, group: [] });
          byWindow.get(k).group.push(r);
        });
        return [...byWindow.values()];
      })(),
    }))
    .filter(g => g.rows.length > 0);

  return (
    <section className="gd-card">
      <header className="gd-head">
        <div>
          <h2 className="gd-h2">{t(lang, "Raid Boss Schedule", "ตารางบอสเรด")}</h2>
          <p className="gd-live">
            <Radio size={14} strokeWidth={2.4} className="gd-live-ico" aria-hidden />
            {t(lang, `${liveCount} live now`, `กำลังเปิด ${liveCount}`)}
            <span className="gd-dot" aria-hidden>·</span>
            <span className="gd-num">{clock}</span>
            <em className="gd-tz">ICT</em>
          </p>
        </div>
        <button type="button" className="gd-refresh" onClick={() => window.location.reload()}>
          <RefreshCw size={14} strokeWidth={2.4} className={status === "loading" ? "gd-spin" : undefined} />
          {t(lang, "Refresh", "รีเฟรช")}
        </button>
      </header>

      {status === "loading" && (
        <div className="gd-state-box"><Loader2 size={32} strokeWidth={2.2} className="gd-spin" /></div>
      )}
      {status === "error" && (
        <div className="gd-error">{t(lang, "Could not load raid data", "โหลดข้อมูลเรดไม่สำเร็จ")}</div>
      )}
      {status === "ready" && groups.length === 0 && (
        <div className="gd-empty">{t(lang, "No data yet", "ยังไม่มีข้อมูล")}</div>
      )}

      {groups.map(g => {
        const open = !closed.includes(g.label);
        const live = g.rows.filter(r => rank(r) === 0).length;
        return (
          <div key={g.label} className="gd-tier">
            <button type="button" className="gd-tier-head" aria-expanded={open}
              onClick={() => toggle(g.label)}>
              <span className="gd-tier-name">{g.label}</span>
              {live > 0 && <span className="gd-chip">{live} live</span>}
              <span className="gd-tier-n">
                {g.rows.length} {t(lang, "bosses", "ตัว")}
              </span>
              <ChevronRight size={16} strokeWidth={2.4}
                className={`gd-caret${open ? " open" : ""}`} aria-hidden />
            </button>
            {open && g.rows.map(r => <RaidRow key={r.key} r={r} now={now} lang={lang} />)}
          </div>
        );
      })}
    </section>
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
    <section className="gd-card">
      <header className="gd-head">
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
    </section>
  );
}

// ─── §4 · Team GO Rocket ─────────────────────────────────────────────────────

function RocketSection({ lang }) {
  return (
    <section className="gd-card">
      <header className="gd-head">
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
    </section>
  );
}

// ─── §6 · Weather bonuses ────────────────────────────────────────────────────

function WeatherSection({ lang, weather, locating, requestLocation }) {
  const activeKey = weather ? CONDITION_ROW[weather.condition] : null;
  return (
    <section className="gd-card">
      <header className="gd-head">
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
    </section>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function GoToolsHub({ allList = [], lang = "en", cachedFetch }) {
  const now = useClock();
  const { weather, loading: locating, requestLocation } = useWeather();
  const { go, rows } = useRaidRows({ allList, cachedFetch });
  useGoHubData();

  return (
    <main className="gd-page">
      <header className="gd-card gd-title">
        <h1>Pokémon GO Dashboard</h1>
        <p>{t(lang,
          "Raids, eggs, Rocket line-ups and weather bonuses — everything in one page.",
          "เรด ไข่ ทีม Rocket และโบนัสอากาศ — ครบในหน้าเดียว")}</p>
      </header>

      <RaidSection lang={lang} rows={rows} status={go.status} now={now} />

      {/* Full width each: Rocket has five columns and none of them is a
          week, so it cannot shed one to fit half the page. */}
      <EggSection lang={lang} />
      <RocketSection lang={lang} />

      <WeatherSection lang={lang} weather={weather}
        locating={locating} requestLocation={requestLocation} />
    </main>
  );
}
