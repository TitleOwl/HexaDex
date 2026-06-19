// ─── RocketLineups — Team GO Rocket guide (live lineups) ─────
// Live data: ScrapedDuck `rocketLineups.json` (leaders + grunts, refreshed monthly).
// Shows each character's portrait + their possible Pokémon as 2D Pokédex artwork,
// with shiny ✦ and catchable (encounter) markers. Falls back gracefully if offline.

import { useState, useEffect, useRef } from "react";
import { X, Sparkles, RefreshCw, Loader2, Swords, Ghost, Star, ChevronDown, Filter } from "lucide-react";
import { useModalLifecycle } from "../perfUtils.js";

const ROCKET_URL = "https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/rocketLineups.json";
const CHAR_BASE = "https://cdn.leekduck.com/assets/img/rocket/";
const CACHE_KEY = "pkdx_rocket_lineups_v1";
const TTL = 6 * 3600 * 1000; // 6h

const TYPE_COLORS = {
  normal: "#A8A878", fire: "#F08030", water: "#6890F0", electric: "#F8D030",
  grass: "#78C850", ice: "#98D8D8", fighting: "#C03028", poison: "#A040A0",
  ground: "#E0C068", flying: "#A890F0", psychic: "#F85888", bug: "#A8B820",
  rock: "#B8A038", ghost: "#705898", dragon: "#7038F8", dark: "#705848",
  steel: "#B8B8D0", fairy: "#EE99AC",
};

const artById = (id) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
const dexIdFromImage = (url) => { const m = /pm(\d+)/i.exec(url || ""); return m ? parseInt(m[1], 10) : null; };

function charImage(entry) {
  const title = entry.title || "";
  if (/Boss/i.test(title)) return CHAR_BASE + "boss-giovanni.png";
  if (/Leader/i.test(title)) return CHAR_BASE + "leader-" + entry.name.toLowerCase() + ".png";
  return CHAR_BASE + (/female/i.test(entry.name) ? "female-grunt.png" : "male-grunt.png");
}

let _rocketCache = null;
async function fetchRocket(force = false) {
  if (_rocketCache && !force) return _rocketCache;
  if (!force) {
    try {
      const c = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
      if (c && Date.now() - c.ts < TTL && Array.isArray(c.data)) { _rocketCache = c.data; return c.data; }
    } catch {}
  }
  try {
    const data = await fetch(ROCKET_URL).then(r => r.ok ? r.json() : null);
    if (Array.isArray(data) && data.length) {
      _rocketCache = data;
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data })); } catch {}
      return data;
    }
  } catch {}
  return null;
}

export default function RocketLineups({ lang = "en", onClose }) {
  useModalLifecycle(onClose);
  const t = (th, en, ja) => lang === "th" ? th : lang === "ja" ? (ja ?? en) : en;

  const [lineups, setLineups] = useState(() => _rocketCache);
  const [loading, setLoading] = useState(!_rocketCache);
  const [error, setError] = useState(false);

  const load = (force) => {
    setLoading(true); setError(false);
    fetchRocket(force).then(d => {
      if (d) setLineups(d); else setError(true);
    }).finally(() => setLoading(false));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(false); }, []);

  const leaders = (lineups || []).filter(e => /Boss|Leader/i.test(e.title));
  const grunts  = (lineups || []).filter(e => !/Boss|Leader/i.test(e.title));

  // grunt type filter (dropdown) — keeps the list short
  const typeOpts = [...new Set(grunts.filter(e => e.type).map(e => e.type))];
  const gruntOptions = grunts.length
    ? ["all", ...typeOpts, ...(grunts.some(e => !e.type) ? ["other"] : [])]
    : [];
  const [gruntSel, setGruntSel] = useState(null);
  const [ddOpen, setDdOpen] = useState(false);
  const ddRef = useRef(null);
  const sel = gruntSel ?? "all"; // default to All
  const shownGrunts = sel === "all" ? grunts
    : grunts.filter(e => sel === "other" ? !e.type : e.type === sel);

  useEffect(() => {
    if (!ddOpen) return;
    const onDown = (ev) => { if (ddRef.current && !ddRef.current.contains(ev.target)) setDdOpen(false); };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [ddOpen]);

  const typeName = (tn) => tn; // GO grunt theme types stay english (short)
  const optColor = (o) => (o === "other" || o === "all") ? "var(--blue)" : (TYPE_COLORS[o] || "#888");
  const optLabel = (o) => o === "all" ? t("ทั้งหมด", "All", "すべて")
    : o === "other" ? t("ทั่วไป", "Other", "その他")
    : (o.charAt(0).toUpperCase() + o.slice(1));

  const Mon = ({ m }) => {
    const id = dexIdFromImage(m.image);
    const primary = (m.types || [])[0];
    return (
      <div className={`rl-mon${m.isEncounter ? " catch" : ""}`} title={m.name}>
        <div className="rl-mon-art" style={{ "--mc": TYPE_COLORS[primary] || "#888" }}>
          <img src={id ? artById(id) : m.image} alt={m.name} loading="lazy"
            onError={(e) => { if (m.image && e.currentTarget.src !== m.image) e.currentTarget.src = m.image; }} />
          {m.canBeShiny && <span className="rl-shiny"><Sparkles size={10} strokeWidth={2.6} /></span>}
          {m.isEncounter && <span className="rl-catch"><Star size={9} strokeWidth={2.6} fill="currentColor" /></span>}
        </div>
        <div className="rl-mon-name">{m.name}</div>
      </div>
    );
  };

  const Lineup = ({ e }) => (
    <div className="rl-lineup">
      {[e.firstPokemon, e.secondPokemon, e.thirdPokemon].map((mons, idx) => (
        <div key={idx} className="rl-slot">
          <div className="rl-slot-n">{idx + 1}</div>
          <div className="rl-slot-mons">{(mons || []).map((m, i) => <Mon key={i} m={m} />)}</div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="rl-overlay" onClick={onClose}>
      <style>{RL_CSS}</style>
      <div className="rl-card" onClick={(e) => e.stopPropagation()}>
        <button className="rl-close" onClick={onClose}><X size={16} strokeWidth={2.4} /></button>

        <div className="rl-head">
          <span className="rl-head-ic"><Swords size={22} strokeWidth={2.2} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 className="rl-title">Team GO Rocket</h1>
            <p className="rl-sub">{t("ทีมล่าสุดของบอส/ลีดเดอร์/ลูกน้อง (อัปเดตสด)", "Latest boss · leader · grunt lineups (live)", "ボス・リーダー・したっぱの最新編成")}</p>
          </div>
          <button className="rl-refresh" onClick={() => load(true)} disabled={loading} title={t("รีเฟรช", "Refresh", "更新")}>
            {loading ? <Loader2 size={15} strokeWidth={2.4} className="rl-spin" /> : <RefreshCw size={15} strokeWidth={2.2} />}
          </button>
        </div>

        <div className="rl-legend">
          <span><Sparkles size={12} strokeWidth={2.4} style={{ color: "#e0a92e" }} /> {t("เป็น Shiny ได้", "Can be Shiny", "色違い可")}</span>
          <span><Star size={12} strokeWidth={2.4} style={{ color: "var(--blue)" }} /> {t("จับได้ (รางวัล)", "Catchable reward", "捕獲可")}</span>
        </div>

        {loading && !lineups && (
          <div className="rl-state"><Loader2 size={36} strokeWidth={2} className="rl-spin" /><div>{t("กำลังโหลดทีมล่าสุด...", "Loading latest lineups...", "最新編成を読込中...")}</div></div>
        )}
        {error && !lineups && (
          <div className="rl-state"><Ghost size={36} strokeWidth={2} /><div>{t("โหลดข้อมูลไม่ได้ ลองรีเฟรช", "Couldn't load data — try refresh", "読込失敗 — 更新してね")}</div></div>
        )}

        {lineups && (
          <>
            {/* Leaders */}
            <div className="rl-section-title">{t("บอส & ลีดเดอร์", "Boss & Leaders", "ボス & リーダー")}</div>
            <div className="rl-leaders">
              {leaders.map((e, i) => (
                <div key={i} className="rl-char rl-leader" style={{ "--ac": /Boss/i.test(e.title) ? "#dc2626" : "var(--blue)" }}>
                  <div className="rl-char-head">
                    <div className="rl-char-portrait"><img src={charImage(e)} alt={e.name} loading="lazy" /></div>
                    <div>
                      <div className="rl-char-name">{e.name}</div>
                      <div className="rl-char-role">{e.title}</div>
                    </div>
                  </div>
                  <Lineup e={e} />
                </div>
              ))}
            </div>

            {/* Grunts */}
            <div className="rl-section-title">{t("ลูกน้อง", "Grunts", "したっぱ")}</div>
            {gruntOptions.length > 0 && (
              <div className="rl-filter">
                <span className="rl-filter-label"><Filter size={14} strokeWidth={2.3} /> {t("กรองตามธาตุ", "Filter by type", "タイプで絞り込み")}</span>
                <div className="rl-dd" ref={ddRef}>
                  <button className="rl-dd-btn" onClick={() => setDdOpen(o => !o)}>
                    <span className="rl-dd-dot" style={{ background: optColor(sel) }} />
                    <span className="rl-dd-cur">{optLabel(sel)}</span>
                    <ChevronDown size={16} strokeWidth={2.4} style={{ marginLeft: "auto", transform: ddOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
                  </button>
                  {ddOpen && (
                    <div className="rl-dd-menu">
                      {gruntOptions.map(o => (
                        <button key={o} className={`rl-dd-item${o === sel ? " active" : ""}`}
                          onClick={() => { setGruntSel(o); setDdOpen(false); }}>
                          <span className="rl-dd-dot" style={{ background: optColor(o) }} />
                          {optLabel(o)}
                          {o === sel && <span className="rl-dd-check">✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="rl-grunts">
              {shownGrunts.map((e, i) => (
                <div key={i} className="rl-char rl-grunt" style={{ "--ac": TYPE_COLORS[e.type] || "var(--blue)" }}>
                  <div className="rl-char-head">
                    <div className="rl-char-portrait"><img src={charImage(e)} alt={e.name} loading="lazy" /></div>
                    <div style={{ minWidth: 0 }}>
                      {e.type
                        ? <span className="rl-grunt-type" style={{ background: TYPE_COLORS[e.type] || "#888" }}>{typeName(e.type)}</span>
                        : <div className="rl-char-name" style={{ fontSize: 14 }}>{e.name}</div>}
                      <div className="rl-char-role">{/female/i.test(e.name) ? t("ลูกน้องหญิง", "Female Grunt", "女したっぱ") : t("ลูกน้องชาย", "Male Grunt", "男したっぱ")}</div>
                    </div>
                  </div>
                  <Lineup e={e} />
                </div>
              ))}
            </div>

            <div className="rl-credit">{t("ข้อมูลจาก LeekDuck / ScrapedDuck", "Data: LeekDuck / ScrapedDuck", "データ: LeekDuck / ScrapedDuck")}</div>
          </>
        )}
      </div>
    </div>
  );
}

const RL_CSS = `
  .rl-overlay {
    position: fixed; inset: 0; z-index: 9000;
    background: rgba(20,18,20,0.5); backdrop-filter: blur(18px) saturate(120%); -webkit-backdrop-filter: blur(18px) saturate(120%);
    overflow-y: auto; padding: 24px 12px;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif;
    -webkit-font-smoothing: antialiased; animation: rl-fade 0.25s ease;
  }
  @keyframes rl-fade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes rl-spin { to { transform: rotate(360deg); } }
  .rl-spin { animation: rl-spin 1s linear infinite; }
  .rl-card {
    max-width: 1080px; margin: 0 auto; position: relative;
    background: var(--bg-card); color: var(--text-primary);
    border-radius: 28px; padding: 22px 20px 26px;
    box-shadow: 0 40px 90px rgba(0,0,0,0.4), 0 0 0 0.5px var(--border) inset;
    animation: rl-pop 0.4s cubic-bezier(0.34,1.56,0.64,1);
  }
  @keyframes rl-pop { from { opacity: 0; transform: translateY(16px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
  .rl-close {
    position: absolute; top: 16px; right: 16px; width: 38px; height: 38px; border-radius: 50%;
    background: var(--bg-muted); border: none; color: var(--text-secondary); cursor: pointer;
    display: inline-flex; align-items: center; justify-content: center; z-index: 2; transition: background .2s, color .2s;
  }
  .rl-close:hover { background: var(--blue); color: #fff; }
  .rl-head { display: flex; align-items: center; gap: 13px; margin-bottom: 14px; padding-right: 44px; }
  .rl-head-ic { width: 46px; height: 46px; border-radius: 14px; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center;
    background: color-mix(in srgb, var(--blue) 14%, transparent); color: var(--blue); }
  .rl-title { font-size: 21px; font-weight: 800; letter-spacing: -0.02em; margin: 0; }
  .rl-sub { font-size: 12.5px; font-weight: 500; color: var(--text-secondary); margin: 2px 0 0; }
  .rl-refresh { width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0; cursor: pointer; border: none;
    background: var(--bg-muted); color: var(--text-secondary); display: inline-flex; align-items: center; justify-content: center; }
  .rl-refresh:hover:not(:disabled) { color: var(--text-primary); }
  .rl-refresh:disabled { opacity: 0.5; cursor: wait; }

  .rl-legend { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; font-size: 11.5px; font-weight: 600; color: var(--text-secondary); }
  .rl-legend span { display: inline-flex; align-items: center; gap: 5px; }

  .rl-state { text-align: center; padding: 50px 20px; color: var(--text-muted); display: flex; flex-direction: column; align-items: center; gap: 12px; font-size: 13px; font-weight: 600; }

  .rl-section-title { font-size: 12px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--text-secondary); margin: 20px 2px 12px; }
  /* filter bar — clear, easy to find */
  .rl-filter {
    display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
    margin: 0 2px 14px;
    padding: 10px 12px; border-radius: 14px;
    background: var(--bg-muted);
  }
  .rl-filter-label { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 700; color: var(--text-secondary); letter-spacing: -0.01em; }

  /* minimal type dropdown */
  .rl-dd { position: relative; flex: 1; min-width: 180px; }
  .rl-dd-btn {
    display: flex; align-items: center; gap: 9px; cursor: pointer; width: 100%;
    padding: 11px 14px; border-radius: 12px; font-family: inherit;
    background: var(--bg-card); border: 1px solid var(--border); color: var(--text-primary);
    font-size: 14px; font-weight: 700; letter-spacing: -0.01em; transition: border-color .18s, box-shadow .18s;
  }
  .rl-dd-btn:hover { border-color: color-mix(in srgb, var(--blue) 45%, var(--border)); }
  .rl-dd-cur { text-transform: capitalize; text-align: left; }
  .rl-dd-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
  .rl-dd-menu {
    position: absolute; top: calc(100% + 6px); left: 0; right: 0; z-index: 10;
    max-height: 340px; overflow-y: auto;
    background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px;
    padding: 6px; box-shadow: 0 16px 40px rgba(0,0,0,0.22);
    animation: rl-dd-in .16s ease;
  }
  @keyframes rl-dd-in { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
  .rl-dd-item {
    display: flex; align-items: center; gap: 9px; width: 100%; cursor: pointer;
    padding: 10px 11px; border-radius: 10px; border: none; background: transparent;
    font-family: inherit; font-size: 13.5px; font-weight: 600; color: var(--text-primary);
    text-transform: capitalize; text-align: left; transition: background .15s;
  }
  .rl-dd-item:hover { background: var(--bg-muted); }
  .rl-dd-item.active { background: color-mix(in srgb, var(--blue) 12%, transparent); color: var(--blue); font-weight: 700; }
  .rl-dd-check { margin-left: auto; font-weight: 900; }
  .rl-leaders { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 14px; }
  .rl-grunts  { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 14px; }

  .rl-char {
    background: color-mix(in srgb, var(--ac) 17%, var(--bg-card));
    border: 1px solid color-mix(in srgb, var(--ac) 42%, transparent);
    border-radius: 20px; padding: 16px 16px 14px;
  }
  .rl-char-head { display: flex; align-items: center; gap: 13px; margin-bottom: 14px; }
  .rl-char-portrait {
    width: 76px; height: 76px; flex-shrink: 0; border-radius: 50%;
    background: color-mix(in srgb, var(--ac) 16%, transparent);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--ac) 32%, transparent);
    display: flex; align-items: flex-end; justify-content: center; overflow: hidden;
  }
  .rl-char-portrait img { width: 70px; height: 70px; object-fit: contain; }
  .rl-char-name { font-size: 17px; font-weight: 800; letter-spacing: -0.01em; color: var(--text-primary); }
  .rl-char-role { font-size: 11.5px; font-weight: 600; color: var(--text-muted); margin-top: 2px; }
  .rl-grunt-type { display: inline-block; color: #fff; font-size: 11px; font-weight: 800; padding: 3px 11px; border-radius: 999px; text-transform: capitalize; }

  /* lineup: 3 columns = battle order 1 → 2 → 3 */
  .rl-lineup { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;
    background: var(--bg-card); border-radius: 16px; padding: 12px 8px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
  .rl-slot { display: flex; flex-direction: column; align-items: center; gap: 9px; position: relative; }
  .rl-slot + .rl-slot::before { content: ""; position: absolute; left: -3px; top: 6px; bottom: 6px; width: 1px; background: var(--border); }
  .rl-slot-n { width: 19px; height: 19px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
    font-size: 10.5px; font-weight: 800; color: var(--ac);
    background: color-mix(in srgb, var(--ac) 16%, transparent); }
  .rl-slot-mons { display: flex; flex-direction: column; align-items: center; gap: 11px; width: 100%; }

  .rl-mon { display: flex; flex-direction: column; align-items: center; gap: 4px; width: 100%; }
  .rl-mon-art { position: relative; width: 74px; height: 74px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    background: radial-gradient(circle at 50% 40%, color-mix(in srgb, var(--mc) 28%, transparent), transparent 72%); }
  .rl-mon.catch .rl-mon-art { box-shadow: 0 0 0 2px var(--blue); }
  .rl-mon-art img { width: 70px; height: 70px; object-fit: contain; }
  .rl-shiny { position: absolute; top: 0px; right: 0px; color: #e0a92e; display: inline-flex;
    background: var(--bg-card); border-radius: 50%; padding: 2px; box-shadow: 0 1px 3px rgba(0,0,0,0.25); }
  .rl-catch { position: absolute; bottom: 0px; right: 0px; color: var(--blue); display: inline-flex;
    background: var(--bg-card); border-radius: 50%; padding: 2px; box-shadow: 0 1px 3px rgba(0,0,0,0.25); }
  .rl-mon-name { font-size: 11px; font-weight: 700; text-align: center; line-height: 1.15; color: var(--text-primary); }

  .rl-credit { text-align: center; font-size: 10.5px; font-weight: 500; color: var(--text-muted); margin-top: 22px; }

  @media (max-width: 560px) {
    .rl-leaders, .rl-grunts { grid-template-columns: 1fr; }
  }
`;
