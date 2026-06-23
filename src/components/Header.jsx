import { useState, useEffect } from "react";
import { STRINGS, GENERATIONS, ALL_TYPES, TYPE_NAMES_TH, TYPE_NAMES_JA } from "../data.js";
import { setSoundEnabled } from "../utils.js";
import { getPerfMode, setPerfMode } from "../perfMode.js";
import { readPetSave, PET_EVENT } from "./PetCareGame.jsx";
import HexaDexLogo from "./HexaDexLogo.jsx";
import {
  LayoutGrid, Swords, Target, Gamepad2, Search, Settings, Sun, Moon, Sparkles, Heart,
  BarChart3, Cake, Globe, Volume2, VolumeX, Palette, Info, Newspaper, SunMedium, Gauge,
} from "lucide-react";

// tiny helper: inline icon aligned with text
const Ico = ({ as: C, size = 15 }) => (
  <C size={size} strokeWidth={2.2} style={{ verticalAlign: "-2px", marginRight: 6, flexShrink: 0 }} />
);

export function ModeTabs({ view, setView, s, lang }) {
  const goLabel    = lang === "th" ? "GO Tools" : lang === "ja" ? "GOツール" : "GO Tools";
  const gamesLabel = lang === "th" ? "เกม"     : lang === "ja" ? "ゲーム"    : "Games";

  // Buddy needs care? → red dot on the Games tab
  const [petAlert, setPetAlert] = useState(false);
  useEffect(() => {
    const check = () => {
      try {
        const st = readPetSave()?.stats;
        setPetAlert(!!st && Math.min(st.hunger, st.happy, st.energy, st.clean) < 30);
      } catch { setPetAlert(false); }
    };
    check();
    window.addEventListener(PET_EVENT, check);
    window.addEventListener("storage", check);
    const iv = setInterval(check, 60000);
    return () => { window.removeEventListener(PET_EVENT, check); window.removeEventListener("storage", check); clearInterval(iv); };
  }, []);

  const tabs = [
    { id:"pokedex",  Icon: LayoutGrid, label:s.pokedex },
    { id:"team",     Icon: Swords,     label:s.teamBuilder },
    { id:"gotools",  Icon: Target,     label:goLabel },
    { id:"games",    Icon: Gamepad2,   label:gamesLabel },
  ];

  return (
    <div className="mode-tabs">
      {tabs.map(t => (
        <button key={t.id}
          className={`mode-tab${view === t.id ? " active" : ""}`}
          onClick={() => setView(t.id)}>
          <span className="mode-tab-icon">
            <t.Icon size={17} strokeWidth={2.2} />
            {t.id === "games" && petAlert && <span className="mode-tab-dot" />}
          </span>
          <span className="mode-tab-label">{t.label}</span>
        </button>
      ))}
    </div>
  );
}

// More menu — only secondary/discovery features now
function MoreMenu({ onOpenBirthday, onOpenTier, lang }) {
  const [open, setOpen] = useState(false);

  const groups = lang === "th" ? [
    { title: "สำรวจ & จัดอันดับ", items: [
      { Icon: BarChart3, label: "Meta Tier List",  fn: onOpenTier,     desc: "ระบบ tier S/A/B/C/D + Custom" },
    ]},
    { title: "พิเศษ", items: [
      { Icon: Cake, label: "โปเกมอนคู่ดวง",   fn: onOpenBirthday, desc: "ค้นหาโปเกมอนคู่ดวงจากวันเกิด" },
    ]},
  ] : lang === "ja" ? [
    { title: "ランキング", items: [
      { Icon: BarChart3, label: "メタティアリスト", fn: onOpenTier,     desc: "S/A/B/C/Dティア + カスタム" },
    ]},
    { title: "スペシャル", items: [
      { Icon: Cake, label: "誕生日ポケモン",   fn: onOpenBirthday, desc: "誕生日からポケモンを占う" },
    ]},
  ] : [
    { title: "Rankings", items: [
      { Icon: BarChart3, label: "Meta Tier List",  fn: onOpenTier,     desc: "S/A/B/C/D tiers + Custom builder" },
    ]},
    { title: "Special", items: [
      { Icon: Cake, label: "Birthday Pokémon", fn: onOpenBirthday, desc: "Find your destiny Pokémon from your birthday" },
    ]},
  ];

  return (
    <div className="more-menu-wrap">
      <button className="more-menu-btn" onClick={() => setOpen(v => !v)} title="More features">
        <Sparkles size={18} strokeWidth={2.2} />
      </button>
      {open && (
        <>
          <div className="more-menu-overlay" onClick={() => setOpen(false)} />
          <div className="more-menu-dropdown more-menu-grouped">
            {groups.map((g, gi) => (
              <div key={gi} className="more-menu-group">
                <div className="more-menu-group-title">{g.title}</div>
                {g.items.map((it, i) => (
                  <button key={i} className="more-menu-item more-menu-item-rich"
                    onClick={() => { it.fn(); setOpen(false); }}>
                    <span className="more-menu-item-icon"><it.Icon size={20} strokeWidth={2} /></span>
                    <span className="more-menu-item-text">
                      <span className="more-menu-item-label">{it.label}</span>
                      <span className="more-menu-item-desc">{it.desc}</span>
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ThemeToggle({ theme, onToggle, autoMode }) {
  return (
    <button className={`theme-toggle${autoMode ? " auto" : ""}`} onClick={onToggle}
      title={autoMode ? `Auto (${theme})` : theme}>
      {theme === "dark" ? <Moon size={17} strokeWidth={2.2} /> : <Sun size={17} strokeWidth={2.2} />}
    </button>
  );
}

function SettingsDrawer({ open, onClose, lang, setLang, soundOn, setSoundOn,
  cryStyle, setCryStyle,
  theme, toggleTheme, autoMode, enableAuto, s, onOpenChangelog,
  currentVersion, latestDate }) {
  const [perf, setPerf] = useState(getPerfMode());
  if (!open) return null;

  const t = (en, th, ja) => lang === "th" ? th : lang === "ja" ? ja : en;
  const pickPerf = (m) => { setPerfMode(m); setPerf(m); };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-drawer" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close settings-close" onClick={onClose}>✕</button>
        <h2 className="settings-title"><Ico as={Settings} size={18} />{s.settings}</h2>

        {/* ─── NEW: Version / What's New ─── */}
        <div className="settings-group">
          <div className="settings-label">
            <Ico as={Newspaper} />{t("What's New", "อัปเดตล่าสุด", "アップデート")}
          </div>
          <button
            onClick={() => { onClose(); onOpenChangelog(); }}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "14px 16px",
              background: "var(--bg-muted)",
              border: "1px solid var(--border)",
              borderRadius: 17,
              cursor: "pointer",
              textAlign: "left",
              transition: "background 0.2s ease, box-shadow 0.2s ease",
              color: "inherit",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--bg-card)";
              e.currentTarget.style.boxShadow = "var(--shadow-sm)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--bg-muted)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div style={{
              width: 44, height: 44,
              borderRadius: 15,
              background: "linear-gradient(135deg, #900603, #b5302d)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 12px rgba(144,6,3,0.35)",
              flexShrink: 0,
            }}><Newspaper size={22} color="#fff" strokeWidth={2.2} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                <span style={{
                  fontFamily: "'SF Mono', monospace",
                  fontSize: 14, fontWeight: 900, color: "#900603",
                  background: "rgba(144,6,3,0.1)",
                  padding: "2px 8px", borderRadius: 999,
                }}>v{currentVersion}</span>
                <span style={{ fontSize: 11, opacity: 0.6, fontWeight: 700 }}>{latestDate}</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.7, marginTop: 4 }}>
                {t("Click to see all updates →", "คลิกดูประวัติทั้งหมด →", "クリックして履歴を見る →")}
              </div>
            </div>
          </button>
        </div>

        <div className="settings-group">
          <div className="settings-label"><Ico as={Globe} />{s.language}</div>
          <div className="settings-options">
            {["en","th","ja"].map(l => (
              <button key={l} className={`settings-option${lang === l ? " active" : ""}`}
                onClick={() => setLang(l)}>
                {l === "en" ? "English" : l === "th" ? "ไทย" : "日本語"}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-group">
          <div className="settings-label"><Ico as={Volume2} />{s.sound}</div>
          <div className="settings-options">
            <button className={`settings-option${soundOn ? " active" : ""}`}
              onClick={() => { setSoundOn(true); setSoundEnabled(true); }}><Ico as={Volume2} size={14} />ON</button>
            <button className={`settings-option${!soundOn ? " active" : ""}`}
              onClick={() => { setSoundOn(false); setSoundEnabled(false); }}><Ico as={VolumeX} size={14} />OFF</button>
          </div>
        </div>


        <div className="settings-group">
          <div className="settings-label"><Ico as={Palette} />Theme</div>
          <div className="settings-options">
            <button className={`settings-option${autoMode ? " active" : ""}`} onClick={enableAuto}><Ico as={SunMedium} size={14} />Auto</button>
            <button className={`settings-option${!autoMode && theme === "light" ? " active" : ""}`}
              onClick={() => { if (theme !== "light") toggleTheme(); }}><Ico as={Sun} size={14} />Light</button>
            <button className={`settings-option${!autoMode && theme === "dark" ? " active" : ""}`}
              onClick={() => { if (theme !== "dark") toggleTheme(); }}><Ico as={Moon} size={14} />Dark</button>
          </div>
        </div>

        <div className="settings-group">
          <div className="settings-label"><Ico as={Gauge} />{t("Economy mode", "โหมดประหยัด", "省電力モード")}</div>
          <div className="settings-options">
            <button className={`settings-option${perf === "auto" ? " active" : ""}`}
              onClick={() => pickPerf("auto")}>{t("Auto", "อัตโนมัติ", "自動")}</button>
            <button className={`settings-option${perf === "lite" ? " active" : ""}`}
              onClick={() => pickPerf("lite")}>{t("On", "เปิด", "オン")}</button>
            <button className={`settings-option${perf === "full" ? " active" : ""}`}
              onClick={() => pickPerf("full")}>{t("Off", "ปิด", "オフ")}</button>
          </div>
          <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "8px 2px 0", lineHeight: 1.5 }}>
            {t("Reduces blur & animations to stop stutter on slower devices.",
               "ลดเอฟเฟกต์เบลอและอนิเมชัน เพื่อไม่ให้กระตุกบนเครื่องที่ช้า",
               "重い端末でのカクつきを抑えるため、ぼかしとアニメを減らします。")}
          </p>
        </div>

        <div className="settings-group">
          <div className="settings-label"><Ico as={Info} />{s.about}</div>
          <p className="settings-about">
            Data: <strong>PokéAPI</strong><br/>
            3D Models: <strong>Pokemon-3D-api</strong><br/>
            Names: <strong>sindresorhus/pokemon</strong><br/>
            Weather: <strong>Open-Meteo</strong>
          </p>
          <p className="settings-disclaimer">
            Pokémon © Nintendo / Creatures Inc. / GAME FREAK inc.
          </p>
        </div>
      </div>
    </div>
  );
}

function GenFilter({ genIdx, onSet, lang }) {
  return (
    <div className="gen-filter-wrap">
      {GENERATIONS.map((g, i) => {
        const regionName = g[lang] ?? g.en;
        const subLabel = g.sub?.[lang] ?? "";
        return (
          <button key={i} className={`gen-btn${genIdx === i ? " active" : ""}`}
            onClick={() => onSet(i)} title={subLabel ? `${regionName} · ${subLabel}` : regionName}>
            <span className="gen-btn-region">{regionName}</span>
            {subLabel && <span className="gen-btn-sub">{subLabel}</span>}
          </button>
        );
      })}
    </div>
  );
}

export default function Header({
  lang, setLang, soundOn, setSoundOn,
  cryStyle = "anime", setCryStyle,
  theme, toggleTheme, autoMode, enableAuto,
  view, setView,
  search, setSearch, typeFilter, setTypeFilter,
  genIdx, setGenIdx,
  filteredCount, totalCount,
  thaiLoading, jpLoading,
  onOpenBirthday, onOpenTier,
  onOpenChangelog, hasUpdate, currentVersion = "1.0.0", latestDate = "2026-06-04",
  voiceSearchEl, snapSearchEl,
  favCount = 0, showFavsOnly = false, onToggleFavs,
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const s = STRINGS[lang];
  const isLangLoading = (lang === "th" && thaiLoading) || (lang === "ja" && jpLoading);

  return (
    <>
      <header className="header">
        <style>{`
          .logo {
            display: flex !important;
            align-items: center !important;
            min-width: 0 !important;
            overflow: visible !important;
          }
          .logo > * {
            min-width: auto !important;
          }
          /* lucide icons — crisp + centred in their buttons */
          .header svg { display: block; }
          .mode-tab-icon, .search-icon, .fav-filter-icon { display: inline-flex; align-items: center; justify-content: center; }
          .settings-btn, .theme-toggle, .more-menu-btn { display: inline-flex; align-items: center; justify-content: center; }
          /* Red notification dot on settings button */
          .settings-btn { position: relative; }
          .settings-btn .settings-dot {
            position: absolute;
            top: 4px;
            right: 4px;
            width: 9px;
            height: 9px;
            border-radius: 50%;
            background: #ef4444;
            box-shadow: 0 0 8px rgba(239, 68, 68, 0.7);
            border: 2px solid white;
            animation: settings-dot-pulse 1.6s ease-in-out infinite;
          }
          [data-theme="dark"] .settings-btn .settings-dot {
            border-color: #1f2937;
          }
          @keyframes settings-dot-pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50%      { transform: scale(1.25); opacity: 0.7; }
          }
        `}</style>
        <div className="header-row header-row-main">
          <div className="logo">
            <HexaDexLogo
              size="md"
              mode="dark"
              tagline={s.subtitle}
            />
          </div>
          <ModeTabs view={view} setView={setView} s={s} lang={lang} />
          <div className="header-actions">
            <MoreMenu onOpenBirthday={onOpenBirthday} onOpenTier={onOpenTier} lang={lang} />
            <ThemeToggle theme={theme} onToggle={toggleTheme} autoMode={autoMode} />
            <button className="settings-btn" onClick={() => setSettingsOpen(true)} title={s.settings}>
              <Settings size={18} strokeWidth={2.2} />
              {hasUpdate && <span className="settings-dot" />}
            </button>
          </div>
        </div>

        {view === "pokedex" && (
          <>
            <div className="header-row header-row-filters">
              <div className="search-wrap">
                <span className="search-icon"><Search size={16} strokeWidth={2.4} /></span>
                <input className="search-box" placeholder={s.searchPlaceholder}
                  value={search} onChange={(e) => setSearch(e.target.value)} />
                {voiceSearchEl}
                {snapSearchEl}
              </div>
              {!showFavsOnly && (
                <select className="type-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                  <option value="all">{s.allTypes}</option>
                  {ALL_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {lang === "th" ? `${TYPE_NAMES_TH[t] ?? t}`
                        : lang === "ja" ? `${TYPE_NAMES_JA[t] ?? t}`
                        : t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              )}
              <button
                className={`fav-filter-btn${showFavsOnly ? " active" : ""}${favCount === 0 && !showFavsOnly ? " empty" : ""}`}
                onClick={onToggleFavs}
                title={s.favFilter}
              >
                <span className="fav-filter-icon">
                  <Heart size={17} strokeWidth={2.2} fill={showFavsOnly ? "currentColor" : "none"} />
                </span>
                {favCount > 0 && <span className="fav-filter-count">{favCount}</span>}
              </button>
              <div className="count-badge">
                <span className="count-num">{filteredCount.toLocaleString()}</span>
                <span className="count-label">{s.of} {totalCount.toLocaleString()}</span>
              </div>
            </div>
            <div className="header-gen-row">
              <GenFilter genIdx={genIdx} onSet={setGenIdx} lang={lang} />
            </div>
          </>
        )}

        {isLangLoading && (
          <div className="thai-loading-bar">
            <span className="thai-loading-text">
              <Ico as={Globe} size={14} />{lang === "th" ? s.loadingThaiNames : s.loadingJpNames}
            </span>
          </div>
        )}
      </header>

      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)}
        lang={lang} setLang={setLang} soundOn={soundOn} setSoundOn={setSoundOn}
        cryStyle={cryStyle} setCryStyle={setCryStyle}
        theme={theme} toggleTheme={toggleTheme} autoMode={autoMode} enableAuto={enableAuto} s={s}
        onOpenChangelog={onOpenChangelog}
        currentVersion={currentVersion} latestDate={latestDate} />
    </>
  );
}