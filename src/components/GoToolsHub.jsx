import { useState, useEffect } from "react";
import {
  useGoHubData, spriteUrl, raidBosses, raidCount, liveEvents,
  eggHighlights, researchRewards, ROCKET_LEADERS,
} from "../goHubData.js";
import { useWeather } from "../useWeather.js";
import { TYPE_NAMES_TH, TYPE_NAMES_JA } from "../data.js";
import RaidCounterFinder from "./RaidCounterFinder.jsx";
import RaidGuide          from "./RaidGuide.jsx";
import RocketLineups     from "./RocketLineups.jsx";
import SummaryOverview   from "./SummaryOverview.jsx";
import WeatherBoost      from "./WeatherBoost.jsx";
import LiveEvents        from "./LiveEvents.jsx";
import EggPool           from "./EggPool.jsx";
import FieldResearch     from "./FieldResearch.jsx";
import { findPokemonInList } from "../perfUtils.js";
import {
  Swords, Globe, BarChart3, Shield, Rocket, CalendarDays, Egg, ClipboardList,
  CloudSun, Zap, ArrowRight, Sparkles, Sun, Cloud, CloudRain, CloudSnow, CloudFog, MapPin, RefreshCw,
  Camera,
} from "lucide-react";

// ─── Live Thailand clock (ICT · UTC+7, ticks every second) ───
// ─── Weekly recurring "hour" events (local 18:00–19:00) ───
function weeklyStatus(day, hour) {
  const now = Date.now();
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  const delta = (day - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + delta);
  let start = d.getTime();
  if (start + 3600000 <= now) start += 7 * 86400000; // window already passed → next week
  const end = start + 3600000;
  if (now >= start && now < end) return { live: true, ms: end - now };
  return { live: false, ms: start - now };
}
function fmtCountdown(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  return `${m}m ${sec}s`;
}

/** Same value without seconds, for anything more than an hour away. */
function fmtCoarse(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const WEEKLY_HOURS = [
  { key: "spotlight", Icon: Sparkles, day: 2, hour: 18, color: "#eab308", label: { en: "Spotlight Hour", th: "Spotlight Hour", ja: "スポットライト" } },
  { key: "raidhour",  Icon: Swords,   day: 3, hour: 18, color: "#dc2626", label: { en: "Raid Hour",      th: "Raid Hour",      ja: "レイドアワー" } },
  { key: "maxmonday", Icon: Zap,      day: 1, hour: 18, color: "#900603", label: { en: "Max Monday",     th: "Max Monday",     ja: "マックスマンデー" } },
];

// condition (from useWeather) → boosted GO types + icon
const CONDITION_BOOST = {
  "clear":         { Icon: Sun,       types: ["grass", "fire", "ground"] },
  "mostly-clear":  { Icon: Sun,       types: ["grass", "fire", "ground"] },
  "partly-cloudy": { Icon: CloudSun,  types: ["normal", "rock"] },
  "cloudy":        { Icon: Cloud,     types: ["fairy", "fighting", "poison"] },
  "fog":           { Icon: CloudFog,  types: ["dark", "ghost"] },
  "drizzle":       { Icon: CloudRain, types: ["water", "electric", "bug"] },
  "rain":          { Icon: CloudRain, types: ["water", "electric", "bug"] },
  "thunderstorm":  { Icon: CloudRain, types: ["water", "electric", "bug"] },
  "snow":          { Icon: CloudSnow, types: ["ice", "steel"] },
};

const WORLD_ZONES = [
  { tz: "Asia/Bangkok",    label: "ICT" },
  { tz: "Asia/Tokyo",      label: "JST" },
  { tz: "America/New_York",label: "ET"  },
  { tz: "Europe/London",   label: "UK"  },
];


// ─── Header ──────────────────────────────────────────────────────────────────
// Was a black banner carrying two floating hexagons, a clock with a stray
// pointer, and three chips that looked pressable but were not. One white row.

function HubHeader({ lang }) {
  const [zones, setZones] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [refreshedAt] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    const wake = () => { if (!document.hidden) setNow(new Date()); };
    document.addEventListener("visibilitychange", wake);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", wake); };
  }, []);

  const mins = Math.max(0, Math.round((now.getTime() - refreshedAt) / 60000));
  const ago = mins < 1
    ? (lang === "th" ? "เมื่อสักครู่" : lang === "ja" ? "たった今" : "just now")
    : (lang === "th" ? `${mins} นาทีที่แล้ว` : lang === "ja" ? `${mins}分前` : `${mins} min ago`);

  return (
    <header className="gh-bar">
      <div className="gh-bar-left">
        <h2 className="gh-bar-title">Pokémon GO</h2>
        <p className="gh-bar-sub">
          {lang === "th" ? "ข้อมูลสดจาก LeekDuck · อัปเดตล่าสุด "
            : lang === "ja" ? "LeekDuckのライブデータ · 最終更新 "
            : "Live data from LeekDuck · updated "}{ago}
        </p>
      </div>

      <div className="gh-bar-right">
        <span className="gh-bar-clock">
          {now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })}
          <em>ICT</em>
        </span>
        <button type="button" className="gh-bar-btn" onClick={() => window.location.reload()}>
          <RefreshCw size={14} strokeWidth={2.4} />
          {lang === "th" ? "รีเฟรช" : lang === "ja" ? "更新" : "Refresh"}
        </button>
        <div className="gh-zones-wrap">
          {/* The world clocks were a card the size of a card holding one
              number. Few people need them; they get a button. */}
          <button type="button" className="gh-bar-btn" aria-expanded={zones}
            onClick={() => setZones(v => !v)}>
            <Globe size={14} strokeWidth={2.4} />
            {lang === "th" ? "เขตเวลาอื่น" : lang === "ja" ? "他の時間帯" : "Other zones"}
          </button>
          {zones && (
            <div className="gh-zones">
              {WORLD_ZONES.map(z => (
                <div key={z.label} className="gh-zone">
                  <span>{z.label}</span>
                  <b>{now.toLocaleTimeString("en-GB",
                    { timeZone: z.tz, hour: "2-digit", minute: "2-digit", hour12: false })}</b>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

// ─── Now / Next ──────────────────────────────────────────────────────────────
//
// The old panel gave a weather card, three identical countdown cards and a
// world-clock card equal billing in one row. The one thing people open this
// page for — what is running right now — was a tile the same size as a list
// of timezones. Here the live event is the page, and the rest is a queue.

function NowNext({ lang }) {
  // Every value below is recomputed from Date.now() against a fixed target,
  // never by subtracting a second from the last value — that drifts as soon
  // as the tab is throttled or slept.
  const [, tick] = useState(0);
  useEffect(() => {
    const bump = () => tick(n => n + 1);
    const id = setInterval(bump, 1000);
    // A backgrounded tab stops getting timers; recompute the moment it
    // returns rather than showing whatever was on screen when it left.
    const wake = () => { if (!document.hidden) bump(); };
    document.addEventListener("visibilitychange", wake);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", wake); };
  }, []);

  // Announced once a minute. A polite region that changes every second is
  // read aloud continuously and makes the page unusable with a screen reader.
  // Updated during render rather than in an effect: the announced value has
  // to change with the minute, not one paint after it.
  const [spoken, setSpoken] = useState("");

  const lbl = (o) => o[lang] ?? o.en;

  // Every weekly hour with its status, soonest first. Live ones lead.
  const events = WEEKLY_HOURS
    .map(ev => ({ ...ev, st: weeklyStatus(ev.day, ev.hour) }))
    .sort((a, b) => (b.st.live - a.st.live) || (a.st.ms - b.st.ms));

  const lead = events[0];
  const queue = events.slice(1, 4);
  const liveCount = events.filter(e => e.st.live).length;

  const leadCoarse = fmtCoarse(lead.st.ms);
  if (spoken !== leadCoarse) setSpoken(leadCoarse);

  const when = (ev) => {
    const d = new Date();
    d.setHours(ev.hour, 0, 0, 0);
    d.setDate(d.getDate() + ((ev.day - d.getDay() + 7) % 7));
    return d.toLocaleString(lang === "th" ? "th-TH" : lang === "ja" ? "ja-JP" : "en-GB",
      { weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false });
  };

  // How far through its hour a live event is; for an upcoming one, how close.
  const pct = lead.st.live ? Math.round((1 - lead.st.ms / 3600000) * 100) : null;

  return (
    <section className="gh-now">
      <div className="gh-now-lead" style={{ "--ev": lead.color }}>
        <span className={`gh-flag${lead.st.live ? " live" : ""}`}>
          {lead.st.live && <span className="gh-flag-dot" aria-hidden />}
          {lead.st.live
            ? (lang === "th" ? "กำลังเกิดขึ้น" : lang === "ja" ? "開催中" : "Happening now")
            : (lang === "th" ? "กิจกรรมถัดไป" : lang === "ja" ? "次のイベント" : "Up next")}
          {liveCount > 0 && <span className="gh-flag-n">{liveCount}</span>}
        </span>

        <h3 className="gh-now-title">
          <lead.Icon size={22} strokeWidth={2.2} aria-hidden />
          {lbl(lead.label)}
        </h3>
        <p className="gh-now-desc">
          {lang === "th" ? "กิจกรรมประจำสัปดาห์ · 1 ชั่วโมง"
            : lang === "ja" ? "毎週開催 · 1時間" : "Weekly, one hour long"}
        </p>

        <div className="gh-now-foot">
          <div className="gh-now-time">
            <span className="gh-now-lbl">
              {lead.st.live
                ? (lang === "th" ? "เหลือเวลา" : lang === "ja" ? "残り" : "Time left")
                : (lang === "th" ? "เริ่มในอีก" : lang === "ja" ? "開始まで" : "Starts in")}
            </span>
            <b className="gh-now-count">{fmtCountdown(lead.st.ms)}</b>
            {/* The seconds are for the eye; only the minute is announced. */}
            <span className="sr-only" aria-live="polite">{spoken}</span>
          </div>
          {pct != null && (
            <div className="gh-now-bar">
              <span className="gh-now-fill" style={{ width: `${pct}%` }} />
            </div>
          )}
          <div className="gh-now-when">{when(lead)}</div>
        </div>
      </div>

      <div className="gh-next">
        <div className="gh-next-head">
          {lang === "th" ? "ถัดไป" : lang === "ja" ? "この後" : "Coming up"}
        </div>
        <ul className="gh-next-list">
          {queue.map(ev => (
            <li key={ev.key} className="gh-next-row">
              <span className="gh-next-ico" style={{ "--ev": ev.color }}>
                <ev.Icon size={16} strokeWidth={2.3} aria-hidden />
              </span>
              <span className="gh-next-copy">
                <span className="gh-next-name">{lbl(ev.label)}</span>
                <span className="gh-next-when">{when(ev)}</span>
              </span>
              {/* Days away: seconds would be noise, and re-rendering them
                  every second would be noise the browser pays for. */}
              <span className="gh-next-left">{fmtCoarse(ev.st.ms)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ─── Weather and location, on one line ───────────────────────────────────────
// These two were cards in a row of cards that otherwise held numbers, so an
// empty "Enable location" tile read as a tile that had failed to load.

function ContextBar({ lang, weather, loading, error, permissionState, requestLocation }) {
  const boost = weather ? CONDITION_BOOST[weather.condition] : null;
  const typeName = (tn) => lang === "th" ? (TYPE_NAMES_TH[tn] ?? tn)
    : lang === "ja" ? (TYPE_NAMES_JA[tn] ?? tn) : tn;

  return (
    <section className="gh-ctx">
      <div className="gh-ctx-half">
        <span className="gh-ctx-ico">
          {boost ? <boost.Icon size={17} strokeWidth={2.2} /> : <CloudSun size={17} strokeWidth={2.2} />}
        </span>
        <span className="gh-ctx-copy">
          <span className="gh-ctx-lbl">
            {lang === "th" ? "สภาพอากาศตอนนี้" : lang === "ja" ? "現在の天気" : "Weather now"}
          </span>
          {boost ? (
            <span className="gh-ctx-types">
              {boost.types.map(tp => (
                <span key={tp} className="tp" data-type={tp}>{typeName(tp)}</span>
              ))}
            </span>
          ) : (
            <span className="gh-ctx-na">
              {lang === "th" ? "ยังไม่ทราบ — เปิดตำแหน่งเพื่อดูธาตุที่ได้โบนัส"
                : lang === "ja" ? "位置情報を許可するとブーストが表示されます"
                : "Unknown — turn on location to see boosted types"}
            </span>
          )}
        </span>
      </div>

      <span className="gh-ctx-div" aria-hidden />

      <div className="gh-ctx-half">
        <span className="gh-ctx-ico"><MapPin size={17} strokeWidth={2.2} /></span>
        <span className="gh-ctx-copy">
          <span className="gh-ctx-lbl">
            {lang === "th" ? "ตำแหน่ง" : lang === "ja" ? "位置情報" : "Location"}
          </span>
          {/* The hook has no place name — it has coordinates and a reading.
              Showing the reading is both true and more useful than a city. */}
          {weather ? (
            <span className="gh-ctx-val">
              {weather.temp}&deg;C · {weather.latitude.toFixed(2)}, {weather.longitude.toFixed(2)}
            </span>
          ) : permissionState === "denied" ? (
            <span className="gh-ctx-na">
              {lang === "th" ? "ถูกปฏิเสธ — เปิดสิทธิ์ตำแหน่งในตั้งค่าเบราว์เซอร์"
                : lang === "ja" ? "拒否されました — ブラウザの設定で許可してください"
                : "Blocked — allow location in your browser settings"}
            </span>
          ) : (
            <button type="button" className="gh-ctx-btn"
              disabled={loading} onClick={requestLocation}>
              {loading
                ? (lang === "th" ? "กำลังขอ…" : lang === "ja" ? "取得中…" : "Locating…")
                : (lang === "th" ? "เปิดใช้ตำแหน่ง" : lang === "ja" ? "位置情報を許可" : "Enable location")}
            </button>
          )}
          {error && !weather && <span className="gh-ctx-na">{error}</span>}
        </span>
      </div>
    </section>
  );
}


function SumBlock({ label, onGo, children }) {
  return (
    <div className="gh-sum-block">
      {onGo ? (
        <button type="button" className="gh-sum-lbl go" onClick={onGo}>
          {label}<span aria-hidden>&rsaquo;</span>
        </button>
      ) : (
        <div className="gh-sum-lbl">{label}</div>
      )}
      {children}
    </div>
  );
}

// ─── Preview strip ───────────────────────────────────────────────────────────
//
// What turns this page from a menu into a dashboard: each card shows a little
// of what is behind it. Three rules make that safe — a fixed height so cards
// stay level whether or not their slice arrived, skeletons rather than pop-in,
// and silence rather than an empty rail when a fetch fails.

function Sprite({ id, name, tint, badge, onGo, big }) {
  const inner = (
    <>
      {id
        ? <img src={spriteUrl(id)} alt="" loading="lazy" decoding="async" className="gh-pv-img" />
        : <span className="gh-pv-txt">{(name ?? "?").slice(0, 3)}</span>}
      {badge && <span className="gh-pv-badge">{badge}</span>}
    </>
  );
  const cls = `gh-pv-cell${big ? " big" : ""}${onGo ? " go" : ""}`;
  const style = tint ? { "--pv": tint } : undefined;

  // A sprite alone does not say which Pokemon it is to someone who does not
  // already know, so the name is always reachable on hover.
  if (!onGo) return <span className={cls} style={style} title={name}>{inner}</span>;
  return (
    <button type="button" className={cls} style={style} title={name}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onGo(); }}
      aria-label={name}>
      {inner}
    </button>
  );
}

function PreviewStrip({ kind, data, status, lang, weatherTypes, now = 0, go, big, onLocate, locating }) {
  // Grey boxes the size of the real sprites: a card that grows when its data
  // lands is worse than one that never had a preview.
  if (status === "loading" && kind !== "weather") {
    return (
      <div className={`gh-pv${big ? " big" : ""}`} aria-hidden>
        {[0, 1, 2, 3].map(i => <span key={i} className={`gh-pv-cell${big ? " big" : ""} gh-pv-skel`} />)}
      </div>
    );
  }

  let cells = null, extra = null;

  if (kind === "raids" || kind === "counters") {
    const list = raidBosses(data, kind === "raids" ? 5 : 3);
    if (list?.length) {
      cells = list.map((b, i) => (
        <Sprite key={i} id={b.id} name={b.name} big={big}
          onGo={go ? () => go("raid", { boss: b.name }) : undefined}
          badge={typeof b.tier === "number" ? `${b.tier}\u2605` : b.tier === "mega" ? "M" : null} />
      ));
      const total = raidCount(data);
      if (kind === "raids" && total && total > list.length) extra = `+${total - list.length}`;
    }
  } else if (kind === "rocket") {
    cells = ROCKET_LEADERS.map(l => <Sprite key={l.who} id={l.id} name={l.who} big={big} onGo={go ? () => go("rocket") : undefined} />);
  } else if (kind === "events") {
    const evs = liveEvents(data, 2);
    if (evs?.length) {
      return (
        <div className={`gh-pv gh-pv-text${big ? " big" : ""}`}>
          {evs.map((e, i) => {
            const body = (<><b>{e.name}</b><em>{fmtCountdown(Math.max(0, e.end - now))}</em></>);
            return go
              ? <button key={i} type="button" className="gh-pv-ev go" title={e.name}
                  onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); go("events"); }}>{body}</button>
              : <span key={i} className="gh-pv-ev">{body}</span>;
          })}
        </div>
      );
    }
  } else if (kind === "eggs") {
    const groups = eggHighlights(data, 1);
    if (groups?.length) {
      cells = groups.map(g => (
        <Sprite key={g.km} id={g.mons[0]?.id} name={g.mons[0]?.name} big={big}
          onGo={go ? () => go("eggs", { km: g.km }) : undefined}
          badge={g.km.replace(" km", "k")} />
      ));
    }
  } else if (kind === "research") {
    const mons = researchRewards(data, 4);
    if (mons?.length) cells = mons.map((m, i) => <Sprite key={i} id={m.id} name={m.name} big={big} onGo={go ? () => go("research") : undefined} />);
  } else if (kind === "weather") {
    if (!weatherTypes?.length) {
      return (
        <div className={`gh-pv gh-pv-text${big ? " big" : ""}`}>
          <span className="gh-pv-hint">
            {lang === "th" ? "เปิดตำแหน่งเพื่อดูธาตุที่ได้โบนัส"
              : lang === "ja" ? "位置情報を許可するとブーストが表示されます"
              : "Turn on location to see boosted types"}
            {onLocate && (
              <button type="button" className="gh-ctx-btn" disabled={locating}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onLocate(); }}>
                {locating
                  ? (lang === "th" ? "กำลังขอ…" : lang === "ja" ? "取得中…" : "Locating…")
                  : (lang === "th" ? "เปิดใช้ตำแหน่ง" : lang === "ja" ? "許可する" : "Enable location")}
              </button>
            )}
          </span>
        </div>
      );
    }
    if (weatherTypes?.length) {
      return (
        <div className={`gh-pv gh-pv-text${big ? " big" : ""}`}>
          {weatherTypes.map(t => (
            <span key={t} className="tp" data-type={t}>
              {lang === "th" ? (TYPE_NAMES_TH[t] ?? t) : lang === "ja" ? (TYPE_NAMES_JA[t] ?? t) : t}
            </span>
          ))}
        </div>
      );
    }
  }

  // No data: the card keeps its icon and description, and the rail reserves
  // its height so the grid stays even.
  if (!cells?.length) return <div className={`gh-pv gh-pv-empty${big ? " big" : ""}`} aria-hidden />;

  return (
    <div className={`gh-pv${big ? " big" : ""}`}>
      {cells}
      {extra && (go
        ? <button type="button" className="gh-pv-more go"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); go("raidguide"); }}>{extra}</button>
        : <span className="gh-pv-more">{extra}</span>)}
    </div>
  );
}

const TOOL_CATEGORIES = [
  {
    id: "battle",
    Icon: Swords,
    titleEn: "Battle Preparation & Stats",
    titleTh: "เตรียมสู้และข้อมูล",
    titleJa: "バトル準備 & 統計",
    tools: [
      { id:"summary", hoisted: true, Icon:BarChart3, color:"#900603", live: true,
        titleEn:"Live Activity Summary", titleTh:"สรุปกิจกรรมแบบสด", titleJa:"ライブアクティビティ概要",
        descEn:"Everything today, saveable as an image",
        descTh:"Dashboard รวมทุกอย่าง · เซฟเป็นรูปได้",
        descJa:"オールインワン · 画像保存可" },
      { id:"raidguide", preview:"raids", Icon:Swords, color:"#dc2626", live: true,
        titleEn:"Raid Battle Guide", titleTh:"คู่มือ Raid Boss", titleJa:"レイドガイド",
        descEn:"Every active boss, by tier",
        descTh:"Raid Boss ทั้งหมด · Raid Hour ไทย · ชุมชน",
        descJa:"全レイドボス · タイレイドアワー · コミュニティ" },
      { id:"raid", preview:"counters", Icon:Shield, color:"#f97316",
        titleEn:"Counter Battle Guide", titleTh:"คู่มือการสู้ Raid", titleJa:"対策ガイド",
        descEn:"Find best counters for any raid boss",
        descTh:"หาตัวสู้ Raid Boss ที่ดีที่สุด",
        descJa:"レイドボスへの最適な対策" },
      { id:"rocket", preview:"rocket", Icon:Rocket, color:"#1e293b", live: true,
        titleEn:"Team GO Rocket", titleTh:"Team GO Rocket", titleJa:"GOロケット団",
        descEn:"Leader and grunt lineups",
        descTh:"ทีมของ Giovanni / Sierra / Arlo / Cliff / ลูกน้อง",
        descJa:"サカキ / シエラ / アロエ / クリフ / したっぱ" },
    ],
  },
  {
    id: "live",
    Icon: Globe,
    titleEn: "Environment & Live Data",
    titleTh: "ข้อมูลสดและสภาพแวดล้อม",
    titleJa: "ライブ & 環境",
    tools: [
      { id:"events", preview:"events", Icon:CalendarDays, color:"#b5302d", live: true,
        titleEn:"Live Events", titleTh:"อีเวนต์ปัจจุบัน", titleJa:"ライブイベント",
        descEn:"What is running, with countdowns",
        descTh:"Event ตอนนี้และที่จะมา · มี countdown realtime",
        descJa:"現在/予定 · リアルタイムカウントダウン" },
      { id:"eggs", preview:"eggs", Icon:Egg, color:"#f59e0b", live: true,
        titleEn:"Egg Hatch Planner", titleTh:"วางแผนฟักไข่", titleJa:"タマゴ孵化プランナー",
        descEn:"What hatches from each distance",
        descTh:"คำนวณระยะฟักไข่ + พูลไข่สด (2–12 กม.)",
        descJa:"孵化距離プランナー + ライブ孵化リスト" },
      { id:"research", preview:"research", Icon:ClipboardList, color:"#a31a16", live: true,
        titleEn:"Field Research", titleTh:"งานพิเศษ", titleJa:"フィールドリサーチ",
        descEn:"This month's tasks and rewards",
        descTh:"งานพิเศษและรางวัลที่ได้",
        descJa:"現在のフィールドリサーチタスクと報酬" },
      { id:"weather", preview:"weather", Icon:CloudSun, color:"#0891b2",
        titleEn:"Weather Boost", titleTh:"Boost ตามอากาศ", titleJa:"天気ブースト",
        descEn:"Which types the weather boosts",
        descTh:"คำนวณ Boost ของธาตุตามสภาพอากาศ",
        descJa:"天候による属性ブースト計算" },
    ],
  },
];

export default function GoToolsHub({ allList, loaded, thaiArr, jpArr, lang, cachedFetch, onOpen }) {
  const [active, setActive] = useState(null);
  const catTitle = (c) => lang === "th" ? c.titleTh : lang === "ja" ? c.titleJa : c.titleEn;
  const title    = (t) => lang === "th" ? t.titleTh : lang === "ja" ? t.titleJa : t.titleEn;
  const desc     = (t) => lang === "th" ? t.descTh  : lang === "ja" ? t.descJa  : t.descEn;

  // The whole page's data, fetched once (see goHubData.js).
  const go = useGoHubData();
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);
  const { weather, loading: locating, error: weatherError, permissionState, requestLocation } = useWeather();
  const boostTypes = weather ? CONDITION_BOOST[weather.condition]?.types : null;

  // The sprites in a preview are decoration with alt=""; the count they stand
  // for has to reach a screen reader some other way.
  const ariaFor = (t) => {
    const base = title(t);
    if (t.preview === "raids") {
      const n = raidCount(go.data);
      return n ? `${base} \u2014 ${n} raid bosses active` : base;
    }
    if (t.preview === "events") {
      const n = liveEvents(go.data, 9)?.length;
      return n ? `${base} \u2014 ${n} events running now` : base;
    }
    return base;
  };

  // Where a click inside a preview goes. The extra argument is the context
  // the destination should open with (a boss, an egg distance).
  const goTo = (toolId) => setActive(toolId);

  // The summary card is lifted out of the tool list into its own section.
  const summaryTool = TOOL_CATEGORIES.flatMap(c => c.tools).find(t => t.hoisted);

  // Match raid boss name to our Pokemon list (uses shared robust matcher)
  const matchPokemon = (boss) => findPokemonInList(boss, allList);

  return (
    <div className="go-tools-hub" style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 20px" }}>
      {/* ─── VISUAL-FIRST DESIGN (less text, bigger icons) ─── */}
      <style>{`
        /* ═══════════════════════════════════════════════════════════
           Design Tokens
           ═══════════════════════════════════════════════════════════ */
        .go-tools-hub {
          --gth-ease: cubic-bezier(0.16, 1, 0.3, 1);
          --gth-radius-md: 18px;
          --gth-radius-lg: 24px;
          --gth-shadow-sm: 0 4px 12px rgba(15, 23, 42, 0.06);
          --gth-shadow-md: 0 10px 24px rgba(15, 23, 42, 0.12);
          --gth-shadow-lg: 0 20px 48px rgba(15, 23, 42, 0.18);
        }

        @keyframes gth-fade-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes gth-pulse-dot {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%      { transform: scale(1.3); opacity: 0.55; }
        }
        @keyframes gth-float {
          0%, 100% { transform: translateY(0) rotate(0); }
          50%      { transform: translateY(-8px) rotate(3deg); }
        }
        @keyframes gth-shimmer {
          0%   { background-position: -200% 50%; }
          100% { background-position: 200% 50%; }
        }

        /* ═══════════════════════════════════════════════════════════
           Hero Header — clean dark mesh gradient
           ═══════════════════════════════════════════════════════════ */
        .go-tools-hub .go-hub-header {
          position: relative !important;
          padding: 26px 28px !important;
          margin-bottom: 26px !important;
          border-radius: 18px !important;
          background: #1f1d20 !important;
          color: #fff !important;
          overflow: hidden !important;
          border: 1px solid rgba(255,255,255,0.06) !important;
          box-shadow: var(--shadow-md) !important;
          animation: gth-fade-up 0.5s var(--gth-ease) !important;
        }
        .go-tools-hub .go-hub-header h2.go-hub-title {
          font-family: var(--font-body) !important;
          font-size: 24px !important;
          font-weight: 900 !important;
          margin: 0 0 6px 0 !important;
          letter-spacing: -0.02em !important;
          display: inline-flex !important;
          align-items: center !important;
          gap: 10px !important;
          background: none !important;
          -webkit-text-fill-color: #fff !important; color: #fff !important;
        }
        .go-tools-hub .go-hub-subtitle {
          font-size: 13px !important;
          color: rgba(255,255,255,0.7) !important;
          font-weight: 600 !important;
          margin: 0 !important;
          letter-spacing: 0.02em !important;
        }
        .go-tools-hub .go-hub-badge {
          display: inline-flex !important; align-items: center !important; gap: 6px !important;
          background: rgba(255,255,255,0.1) !important; border: 1px solid rgba(255,255,255,0.16) !important;
          padding: 5px 11px !important; border-radius: 999px !important;
          font-size: 11px !important; font-weight: 700 !important; color: #fff !important;
        }
        .go-tools-hub .go-hub-badge svg { color: rgba(255,255,255,0.85) !important; }
        .go-tools-hub .go-hub-live-dot {
          width: 6px !important; height: 6px !important; border-radius: 50% !important;
          background: #ff5a52 !important; flex-shrink: 0 !important;
          animation: gth-pulse-dot 1.6s ease-in-out infinite !important;
        }
        /* ── Live Thailand clock ── */
        .go-tools-hub .go-hub-clock {
          position: absolute !important; top: 20px !important; right: 22px !important; z-index: 2 !important;
          text-align: right !important;
        }
        .go-tools-hub .go-hub-clock-top {
          display: inline-flex !important; align-items: center !important; gap: 7px !important;
          background: rgba(255,255,255,0.1) !important; border: 1px solid rgba(255,255,255,0.16) !important;
          padding: 6px 13px !important; border-radius: 999px !important; color: #fff !important;
          backdrop-filter: blur(8px) !important;
        }
        .go-tools-hub .go-hub-clock-time {
          font-variant-numeric: tabular-nums !important; font-weight: 800 !important;
          font-size: 16px !important; letter-spacing: 0.5px !important; line-height: 1 !important;
        }
        .go-tools-hub .go-hub-clock-zone { font-size: 9px !important; font-weight: 800 !important; opacity: 0.55 !important; letter-spacing: 1px !important; }
        .go-tools-hub .go-hub-clock-date { font-size: 10px !important; color: rgba(255,255,255,0.6) !important; font-weight: 600 !important; margin-top: 6px !important; letter-spacing: 0.3px !important; }
        @media (max-width: 560px) {
          .go-tools-hub .go-hub-clock { position: static !important; text-align: left !important; margin-bottom: 14px !important; }
        }

        /* ── Live Now panel ── */
        .go-tools-hub .go-live-panel {
          display: grid !important;
          grid-template-columns: repeat(auto-fit, minmax(178px, 1fr)) !important;
          gap: 12px !important; margin-bottom: 26px !important;
        }
        .go-tools-hub .go-live-card {
          background: var(--bg-card) !important; border: 1px solid var(--border) !important;
          border-radius: 14px !important; padding: 14px !important; box-shadow: var(--shadow-sm) !important;
        }
        [data-theme="dark"] .go-tools-hub .go-live-card { border-color: rgba(255,255,255,0.08) !important; }
        .go-tools-hub .go-live-card.is-live { border-color: var(--ev-color) !important; box-shadow: inset 0 0 0 1px var(--ev-color) !important; }
        .go-tools-hub .go-live-card-head {
          display: flex !important; align-items: center !important; gap: 7px !important;
          font-size: 10.5px !important; font-weight: 800 !important; color: var(--text-muted) !important;
          letter-spacing: 0.04em !important; text-transform: uppercase !important; margin-bottom: 10px !important;
        }
        .go-tools-hub .go-live-count {
          font-variant-numeric: tabular-nums !important; font-weight: 900 !important; font-size: 19px !important;
          color: var(--text-primary) !important; letter-spacing: -0.01em !important;
          display: inline-flex !important; align-items: center !important; gap: 7px !important;
        }
        .go-tools-hub .go-live-card.is-live .go-live-count { color: var(--ev-color) !important; }
        .go-tools-hub .go-live-now-dot { width: 8px !important; height: 8px !important; border-radius: 50% !important; background: var(--ev-color) !important; animation: gth-pulse-dot 1.2s ease-in-out infinite !important; }
        .go-tools-hub .go-live-sub { font-size: 10px !important; color: var(--text-muted) !important; font-weight: 600 !important; margin-top: 4px !important; }
        .go-tools-hub .go-live-types { display: flex !important; flex-wrap: wrap !important; gap: 5px !important; }
        .go-tools-hub .go-live-type { padding: 4px 10px !important; border-radius: 999px !important; font-size: 11px !important; font-weight: 800 !important; text-transform: capitalize !important; }
        .go-tools-hub .go-live-weather-na { font-size: 11px !important; color: var(--text-muted) !important; font-weight: 600 !important; }
        .go-tools-hub .go-live-zones { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 6px 12px !important; }
        .go-tools-hub .go-live-zone { display: flex !important; align-items: baseline !important; justify-content: space-between !important; gap: 6px !important; }
        .go-tools-hub .go-live-zone-label { font-size: 10px !important; font-weight: 800 !important; color: var(--text-muted) !important; letter-spacing: 0.5px !important; }
        .go-tools-hub .go-live-zone-time { font-variant-numeric: tabular-nums !important; font-weight: 800 !important; font-size: 13px !important; color: var(--text-primary) !important; }

        /* ═══════════════════════════════════════════════════════════
           Category Section — minimal header
           ═══════════════════════════════════════════════════════════ */
        .go-tools-hub .go-category {
          margin-bottom: 28px;
          animation: gth-fade-up 0.5s var(--gth-ease) backwards;
        }
        .go-tools-hub .go-category:nth-of-type(2) { animation-delay: 0.1s; }
        .go-tools-hub .go-category:nth-of-type(3) { animation-delay: 0.18s; }

        .go-tools-hub .go-category-header {
          position: relative !important;
          padding: 0 2px 12px !important;
          margin-bottom: 16px !important;
          border-bottom: 1px solid var(--border) !important;
          font-size: 14px !important;
          font-weight: 800 !important;
          color: var(--text-primary) !important;
          letter-spacing: 0.01em !important;
        }
        .go-tools-hub .go-category-icon { color: var(--blue) !important; flex-shrink: 0 !important; }
        .go-tools-hub .go-category-count {
          margin-left: auto !important;
          background: var(--bg-muted) !important; border: 1px solid var(--border) !important;
          color: var(--text-muted) !important;
          padding: 2px 9px !important; border-radius: 999px !important;
          font-size: 10px !important; font-weight: 800 !important;
        }

        /* Card grid */
        .go-tools-hub .go-hub-grid {
          display: grid !important;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)) !important;
          gap: 12px !important;
        }

        /* ═══════════════════════════════════════════════════════════
           Tool Cards — modern tile style, equal size
           ═══════════════════════════════════════════════════════════ */
        .go-tools-hub .go-hub-card {
          position: relative !important;
          display: flex !important;
          flex-direction: row !important;
          align-items: center !important;
          gap: 13px !important;
          padding: 15px 16px !important;
          background: var(--bg-card) !important;
          border-radius: 16px !important;
          border: 1px solid var(--border) !important;
          cursor: pointer !important;
          text-align: left !important;
          transition: transform 0.25s var(--gth-ease), box-shadow 0.25s, border-color 0.2s !important;
          box-shadow: var(--shadow-sm) !important;
          overflow: hidden !important;
          animation: gth-fade-up 0.5s var(--gth-ease) backwards !important;
          min-height: 0 !important;
        }
        .go-tools-hub .go-hub-card::before { display: none !important; }
        .go-tools-hub .go-hub-card:hover {
          transform: translateY(-3px) !important;
          border-color: var(--tool-color, var(--blue)) !important;
          box-shadow: var(--shadow-md) !important;
        }

        /* Tool icon — soft tint (color + bg set inline) */
        .go-tools-hub .go-hub-icon {
          width: 46px !important;
          height: 46px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          border-radius: 13px !important;
          box-shadow: none !important;
          position: relative !important;
          z-index: 1 !important;
          transition: transform 0.25s var(--gth-ease) !important;
          flex-shrink: 0 !important;
        }
        .go-tools-hub .go-hub-card:hover .go-hub-icon { transform: scale(1.06) !important; }

        /* Card info */
        .go-tools-hub .go-hub-info {
          display: flex !important;
          flex-direction: column !important;
          align-items: flex-start !important;
          gap: 3px !important;
          position: relative !important;
          z-index: 1 !important;
          flex: 1 !important;
          min-width: 0 !important;
        }
        .go-tools-hub .go-hub-card .go-hub-title {
          font-family: var(--font-body) !important;
          font-size: 13.5px !important;
          font-weight: 800 !important;
          color: var(--text-primary) !important;
          letter-spacing: -0.01em !important;
          display: flex !important;
          align-items: center !important;
          gap: 6px !important;
          flex-wrap: wrap !important;
          justify-content: flex-start !important;
          margin: 0 !important;
          background: none !important;
          -webkit-text-fill-color: initial !important;
        }
        .go-tools-hub .go-hub-desc {
          font-size: 11px !important;
          color: var(--text-muted) !important;
          font-weight: 500 !important;
          line-height: 1.4 !important;
          margin-top: 1px !important;
        }
        .go-tools-hub .go-hub-arrow {
          color: var(--text-muted) !important; flex-shrink: 0 !important;
          display: inline-flex !important; align-items: center !important;
          transition: transform 0.2s, color 0.2s !important;
        }
        .go-tools-hub .go-hub-card:hover .go-hub-arrow {
          color: var(--tool-color, var(--blue)) !important; transform: translateX(3px) !important;
        }

        /* LIVE badge (on card) */
        .go-tools-hub .go-hub-live {
          display: inline-flex !important;
          align-items: center !important;
          gap: 4px !important;
          padding: 1px 7px !important;
          font-size: 8.5px !important;
          font-weight: 800 !important;
          color: #d23a4a !important;
          background: rgba(210,58,74,0.1) !important;
          border-radius: 999px !important;
          letter-spacing: 0.08em !important;
          box-shadow: none !important;
        }

        /* Dark mode */
        [data-theme="dark"] .go-tools-hub .go-hub-card {
          background: var(--bg-card) !important;
          border-color: rgba(255,255,255,0.08) !important;
        }
        [data-theme="dark"] .go-tools-hub .go-hub-card .go-hub-title { color: var(--text-primary) !important; }
        [data-theme="dark"] .go-tools-hub .go-hub-desc { color: var(--text-muted) !important; }
        [data-theme="dark"] .go-tools-hub .go-category-count { background: rgba(255,255,255,0.05) !important; border-color: rgba(255,255,255,0.1) !important; }

        /* Responsive */
        @media (max-width: 720px) {
          .go-tools-hub .go-hub-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important; }
          .go-tools-hub .go-hub-header { padding: 22px !important; }
          .go-tools-hub .go-hub-header h2.go-hub-title { font-size: 22px !important; }
        }
        @media (max-width: 420px) {
          .go-tools-hub .go-hub-grid { grid-template-columns: 1fr !important; }
        }

        @media (prefers-reduced-motion: reduce) {
          .go-tools-hub .go-hub-card,
          .go-tools-hub .go-hub-icon,
          .go-tools-hub .go-category,
          .go-tools-hub .go-hub-header { animation: none !important; transition: none !important; }
        }
      `}</style>

      {/* ─── HEADER ─── */}
      <HubHeader lang={lang} />

      <NowNext lang={lang} />
      <ContextBar lang={lang} weather={weather} loading={locating} error={weatherError}
        permissionState={permissionState} requestLocation={requestLocation} />


      {/* ─── TODAY, IN ONE PLACE ───
          It was a tile in the same grid as the tools it summarises. Being the
          sum of the others is exactly why it does not belong among them. */}
      {summaryTool && (
        <section className="gh-sum">
          <div className="gh-sum-head">
            <h3 className="gh-sum-title">
              {lang === "th" ? "สรุปกิจกรรมวันนี้" : lang === "ja" ? "今日のまとめ" : "Today at a glance"}
            </h3>
            <span className="go-hub-live gh-sum-live">
              <span className="go-hub-live-dot" aria-hidden />LIVE
            </span>
            {/* The reason this feature exists is the export, so it is the
                button, not a control hidden inside the overlay. */}
            <button type="button" className="gh-sum-save" onClick={() => setActive("summary")}>
              <Camera size={15} strokeWidth={2.4} />
              {lang === "th" ? "บันทึกเป็นรูป" : lang === "ja" ? "画像で保存" : "Save as image"}
            </button>
          </div>

          <div className="gh-sum-body">
            <SumBlock onGo={() => setActive("raidguide")}
              label={lang === "th" ? "บอสเรดวันนี้" : lang === "ja" ? "本日のレイド" : "Raid bosses"}>
              <PreviewStrip kind="raids" data={go.data} status={go.status} lang={lang} big go={goTo} />
            </SumBlock>
            <SumBlock onGo={() => setActive("events")}
              label={lang === "th" ? "อีเวนต์ที่กำลังจัด" : lang === "ja" ? "開催中" : "Running now"}>
              <PreviewStrip kind="events" data={go.data} status={go.status} lang={lang} now={nowMs} big go={goTo} />
            </SumBlock>
            <SumBlock onGo={() => setActive("eggs")}
              label={lang === "th" ? "ไข่ที่ฟักได้" : lang === "ja" ? "タマゴ" : "Hatching now"}>
              <PreviewStrip kind="eggs" data={go.data} status={go.status} lang={lang} big go={goTo} />
            </SumBlock>
            <SumBlock onGo={() => setActive("weather")}
              label={lang === "th" ? "ธาตุที่ได้โบนัส" : lang === "ja" ? "天候ブースト" : "Weather boost"}>
              <PreviewStrip kind="weather" data={go.data} status={go.status}
                lang={lang} weatherTypes={boostTypes} now={nowMs} big
                onLocate={requestLocation} locating={locating} />
            </SumBlock>
          </div>
        </section>
      )}

      {TOOL_CATEGORIES.map((cat, catIdx) => (
        <div key={cat.id} data-cat={cat.id} className="go-category">
          <div className="go-category-header">
            <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 9 }}>
              <span className="gh-cat-bar" style={{ background: cat.id === "battle" ? "#8f2f2a" : "#3a6294" }} aria-hidden />
              <span>{catTitle(cat)}</span>
              <span className="go-category-count">{cat.tools.filter(t => !t.hoisted).length}</span>
            </div>
          </div>
          <div className="go-hub-grid gh-rows">
            {cat.tools.filter(t => !t.hoisted).map((t, i) => (
              <a key={t.id}
                href={`#${t.id}`}
                className="go-hub-card gh-row"
                aria-label={ariaFor(t)}
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                  e.preventDefault(); setActive(t.id);
                }}
                style={{
                  "--tool-color": t.color,
                  animationDelay: `${(catIdx * 0.1 + i * 0.05)}s`,
                }}>
                <span className="gh-row-top">
                  <span className="go-hub-icon"
                    style={{ color: t.color,
                             background: `color-mix(in srgb, ${t.color} 14%, transparent)` }}>
                    <t.Icon size={19} strokeWidth={2.3} />
                  </span>
                  <span className="go-hub-info">
                    {/* LIVE always sits after the title on the same line, so
                        no row is a line taller than its neighbour. */}
                    <span className="go-hub-title">
                      <span className="gh-row-name">{title(t)}</span>
                      {t.live && (
                        <span className="go-hub-live">
                          <span className="go-hub-live-dot" aria-hidden />
                          LIVE
                        </span>
                      )}
                    </span>
                    <span className="go-hub-desc">{desc(t)}</span>
                  </span>
                  <span className="go-hub-arrow"><ArrowRight size={17} strokeWidth={2.2} /></span>
                </span>
                {t.preview && (
                  <PreviewStrip kind={t.preview} data={go.data} status={go.status}
                    lang={lang} weatherTypes={boostTypes} now={nowMs}
                    onLocate={requestLocation} locating={locating} />
                )}
              </a>
            ))}
          </div>
        </div>
      ))}

      {/* Tool overlays */}
      {active === "summary" && (
        <SummaryOverview
          lang={lang}
          allList={allList}
          onClose={() => setActive(null)}
          onOpenPokemon={(boss) => {
            const matched = matchPokemon(boss);
            if (matched && onOpen) { setActive(null); onOpen(matched); }
          }}
        />
      )}
      {active === "raidguide" && (
        <RaidGuide
          lang={lang}
          allList={allList}
          onClose={() => setActive(null)}
          onOpenPokemon={(boss) => {
            const matched = matchPokemon(boss);
            if (matched && onOpen) { setActive(null); onOpen(matched); }
          }}
        />
      )}
      {active === "rocket" && (
        <RocketLineups lang={lang} onClose={() => setActive(null)} />
      )}
      {active === "raid" && (
        <RaidCounterFinder allList={allList} loaded={loaded} thaiArr={thaiArr} jpArr={jpArr}
          lang={lang} cachedFetch={cachedFetch} onClose={() => setActive(null)}
          onOpenPokemon={(p) => { setActive(null); onOpen?.(p); }} />
      )}
      {active === "events" && (
        <LiveEvents lang={lang} onClose={() => setActive(null)} />
      )}
      {active === "eggs" && (
        <EggPool lang={lang} allList={allList} onClose={() => setActive(null)}
          onOpenPokemon={(boss) => {
            const matched = matchPokemon(boss);
            if (matched && onOpen) {
              setActive(null);
              onOpen(matched);
            }
          }} />
      )}
      {active === "research" && (
        <FieldResearch lang={lang} allList={allList} onClose={() => setActive(null)}
          onOpenPokemon={(boss) => {
            const matched = matchPokemon(boss);
            if (matched && onOpen) {
              setActive(null);
              onOpen(matched);
            }
          }} />
      )}
      {active === "weather" && (
        <WeatherBoost lang={lang} loaded={loaded} thaiArr={thaiArr} jpArr={jpArr}
          onOpen={onOpen} onClose={() => setActive(null)} />
      )}
    </div>
  );
}