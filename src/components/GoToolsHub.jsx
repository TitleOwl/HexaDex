import { useState, useEffect } from "react";
import { useWeather } from "../useWeather.js";
import { typeColor } from "../utils.js";
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
  CloudSun, Target, Zap, Camera, ArrowRight, Clock, Sparkles, Radio,
  Sun, Cloud, CloudRain, CloudSnow, CloudFog, MapPin, Route,
} from "lucide-react";

// ─── Live Thailand clock (ICT · UTC+7, ticks every second) ───
function ThaiClock({ lang }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const fmt = (opts) => now.toLocaleString("en-GB", { timeZone: "Asia/Bangkok", ...opts });
  const time = fmt({ hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const date = now.toLocaleDateString(lang === "th" ? "th-TH" : lang === "ja" ? "ja-JP" : "en-GB",
    { timeZone: "Asia/Bangkok", day: "numeric", month: "short", weekday: "short" });
  return (
    <div className="go-hub-clock">
      <div className="go-hub-clock-top">
        <Clock size={14} strokeWidth={2.4} />
        <span className="go-hub-clock-time">{time}</span>
        <span className="go-hub-clock-zone">ICT</span>
      </div>
      <div className="go-hub-clock-date">{date}</div>
    </div>
  );
}

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

// ─── Live Now panel: weather boost + weekly countdowns + world clocks ───
function LiveNow({ lang }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const { weather } = useWeather();

  const typeName = (tn) => lang === "th" ? (TYPE_NAMES_TH[tn] ?? tn) : lang === "ja" ? (TYPE_NAMES_JA[tn] ?? tn) : tn;
  const boost = weather ? CONDITION_BOOST[weather.condition] : null;
  const lbl = (o) => o[lang] ?? o.en;

  return (
    <div className="go-live-panel">
      {/* Weather boost */}
      <div className="go-live-card go-live-weather">
        <div className="go-live-card-head">
          {boost ? <boost.Icon size={15} strokeWidth={2.2} /> : <CloudSun size={15} strokeWidth={2.2} />}
          <span>{lang === "th" ? "ธาตุที่บูสต์ตอนนี้" : lang === "ja" ? "現在のブースト" : "Boosted now"}</span>
        </div>
        {boost ? (
          <div className="go-live-types">
            {boost.types.map(tp => (
              <span key={tp} className="go-live-type"
                style={{ color: typeColor(tp), background: `color-mix(in srgb, ${typeColor(tp)} 16%, transparent)` }}>
                {typeName(tp)}
              </span>
            ))}
          </div>
        ) : (
          <div className="go-live-weather-na">
            {lang === "th" ? "เปิดตำแหน่งเพื่อดูบูสต์" : lang === "ja" ? "位置情報を許可" : "Enable location"}
          </div>
        )}
      </div>

      {/* Weekly hour countdowns */}
      {WEEKLY_HOURS.map(ev => {
        const st = weeklyStatus(ev.day, ev.hour);
        return (
          <div key={ev.key} className={`go-live-card${st.live ? " is-live" : ""}`}
            style={{ "--ev-color": ev.color }}>
            <div className="go-live-card-head">
              <ev.Icon size={15} strokeWidth={2.2} style={{ color: ev.color }} />
              <span>{lbl(ev.label)}</span>
            </div>
            <div className="go-live-count">
              {st.live
                ? <><span className="go-live-now-dot" />{lang === "th" ? "กำลังจัด!" : lang === "ja" ? "開催中!" : "LIVE NOW"}</>
                : fmtCountdown(st.ms)}
            </div>
            <div className="go-live-sub">
              {st.live
                ? (lang === "th" ? "เหลือ " : lang === "ja" ? "残り " : "ends in ") + fmtCountdown(st.ms)
                : (lang === "th" ? "อีก" : lang === "ja" ? "後" : "until next")}
            </div>
          </div>
        );
      })}

      {/* World clocks */}
      <div className="go-live-card go-live-clocks">
        <div className="go-live-card-head">
          <Globe size={15} strokeWidth={2.2} />
          <span>{lang === "th" ? "เวลาทั่วโลก" : lang === "ja" ? "世界時計" : "World clocks"}</span>
        </div>
        <div className="go-live-zones">
          {WORLD_ZONES.map(z => (
            <div key={z.label} className="go-live-zone">
              <span className="go-live-zone-label">{z.label}</span>
              <span className="go-live-zone-time">
                {now.toLocaleTimeString("en-GB", { timeZone: z.tz, hour: "2-digit", minute: "2-digit", hour12: false })}
              </span>
            </div>
          ))}
        </div>
      </div>
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
      { id:"summary", Icon:BarChart3, color:"#900603", live: true,
        titleEn:"Live Activity Summary", titleTh:"สรุปกิจกรรมแบบสด", titleJa:"ライブアクティビティ概要",
        descEn:"All-in-one PoGO dashboard · save as image",
        descTh:"Dashboard รวมทุกอย่าง · เซฟเป็นรูปได้",
        descJa:"オールインワン · 画像保存可" },
      { id:"raidguide", Icon:Swords, color:"#dc2626", live: true,
        titleEn:"Raid Battle Guide", titleTh:"คู่มือ Raid Boss", titleJa:"レイドガイド",
        descEn:"All active raid bosses · TH Raid Hour · Community",
        descTh:"Raid Boss ทั้งหมด · Raid Hour ไทย · ชุมชน",
        descJa:"全レイドボス · タイレイドアワー · コミュニティ" },
      { id:"raid", Icon:Shield, color:"#f97316",
        titleEn:"Counter Battle Guide", titleTh:"คู่มือการสู้ Raid", titleJa:"対策ガイド",
        descEn:"Find best counters for any raid boss",
        descTh:"หาตัวสู้ Raid Boss ที่ดีที่สุด",
        descJa:"レイドボスへの最適な対策" },
      { id:"rocket", Icon:Rocket, color:"#1e293b", live: true,
        titleEn:"Team GO Rocket", titleTh:"Team GO Rocket", titleJa:"GOロケット団",
        descEn:"Giovanni / Sierra / Arlo / Cliff / Grunts lineups",
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
      { id:"events", Icon:CalendarDays, color:"#b5302d", live: true,
        titleEn:"Live Events", titleTh:"อีเวนต์ปัจจุบัน", titleJa:"ライブイベント",
        descEn:"Current & upcoming PoGO events with realtime countdown",
        descTh:"Event ตอนนี้และที่จะมา · มี countdown realtime",
        descJa:"現在/予定 · リアルタイムカウントダウン" },
      { id:"eggs", Icon:Egg, color:"#f59e0b", live: true,
        titleEn:"Egg Hatch Planner", titleTh:"วางแผนฟักไข่", titleJa:"タマゴ孵化プランナー",
        descEn:"Hatch distance planner + live egg pool (2–12 km)",
        descTh:"คำนวณระยะฟักไข่ + พูลไข่สด (2–12 กม.)",
        descJa:"孵化距離プランナー + ライブ孵化リスト" },
      { id:"research", Icon:ClipboardList, color:"#a31a16", live: true,
        titleEn:"Field Research", titleTh:"งานพิเศษ", titleJa:"フィールドリサーチ",
        descEn:"Current Field Research tasks & their rewards",
        descTh:"งานพิเศษและรางวัลที่ได้",
        descJa:"現在のフィールドリサーチタスクと報酬" },
      { id:"weather", Icon:CloudSun, color:"#0891b2",
        titleEn:"Weather Boost", titleTh:"Boost ตามอากาศ", titleJa:"天気ブースト",
        descEn:"Type boost calculator based on weather conditions",
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

      {/* ─── HERO HEADER ─── */}
      <div className="go-hub-header">
        <div style={{
          position: "absolute", top: 20, right: 30,
          width: 70, height: 70, opacity: 0.18,
          animation: "gth-float 4s ease-in-out infinite",
        }}>
          <svg viewBox="0 0 100 100">
            <polygon points="50,8 87,30 87,70 50,92 13,70 13,30"
              fill="none" stroke="white" strokeWidth="2" strokeLinejoin="round" />
            <polygon points="50,25 70,37 70,63 50,75 30,63 30,37"
              fill="white" opacity="0.3" />
          </svg>
        </div>
        <div style={{
          position: "absolute", bottom: 12, right: 110,
          width: 44, height: 44, opacity: 0.1,
          animation: "gth-float 5s ease-in-out infinite 1.5s",
        }}>
          <svg viewBox="0 0 100 100">
            <polygon points="50,8 87,30 87,70 50,92 13,70 13,30" fill="white" />
          </svg>
        </div>
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
          pointerEvents: "none",
        }} />

        <ThaiClock lang={lang} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <h2 className="go-hub-title" style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            <Target size={24} strokeWidth={2.2} /> {lang === "th" ? "Pokémon GO Tools" : lang === "ja" ? "ポケモンGOツール" : "Pokémon GO Tools"}
          </h2>
          <p className="go-hub-subtitle">
            {lang === "th" ? "ข้อมูล real-time จาก LeekDuck"
              : lang === "ja" ? "LeekDuckからのリアルタイムデータ"
              : "Real-time data from LeekDuck"}
          </p>

          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            {[
              { Ico: "live", label: "6 LIVE" },
              { Ico: Zap, label: lang === "th" ? "อัปเดต 1ชม." : lang === "ja" ? "1時間更新" : "1h refresh" },
              { Ico: Camera, label: lang === "th" ? "เซฟรูปได้" : lang === "ja" ? "画像保存" : "Image save" },
            ].map((s, i) => (
              <div key={i} className="go-hub-badge">
                {s.Ico === "live"
                  ? <span className="go-hub-live-dot" />
                  : <s.Ico size={13} strokeWidth={2.4} />}
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <LiveNow lang={lang} />

      {TOOL_CATEGORIES.map((cat, catIdx) => (
        <div key={cat.id} data-cat={cat.id} className="go-category">
          <div className="go-category-header">
            <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 9 }}>
              <cat.Icon size={16} strokeWidth={2.3} className="go-category-icon" />
              <span>{catTitle(cat)}</span>
              <span className="go-category-count">{cat.tools.length}</span>
            </div>
          </div>
          <div className="go-hub-grid">
            {cat.tools.map((t, i) => (
              <button key={t.id}
                className="go-hub-card"
                onClick={() => setActive(t.id)}
                style={{
                  "--tool-color": t.color,
                  animationDelay: `${(catIdx * 0.1 + i * 0.05)}s`,
                }}>
                <div className="go-hub-icon"
                  style={{ color: t.color,
                           background: `color-mix(in srgb, ${t.color} 14%, transparent)` }}>
                  <t.Icon size={24} strokeWidth={2.2} />
                </div>
                <div className="go-hub-info">
                  <div className="go-hub-title">
                    <span>{title(t)}</span>
                    {t.live && (
                      <span className="go-hub-live">
                        <span className="go-hub-live-dot" />
                        LIVE
                      </span>
                    )}
                  </div>
                  <div className="go-hub-desc">{desc(t)}</div>
                </div>
                <span className="go-hub-arrow"><ArrowRight size={18} strokeWidth={2.2} /></span>
              </button>
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