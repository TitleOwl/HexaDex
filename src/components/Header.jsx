import { useState } from "react";
import { STRINGS, GENERATIONS, ALL_TYPES, TYPE_NAMES_TH, TYPE_NAMES_JA } from "../data.js";
import { setSoundEnabled } from "../utils.js";
import HexaDexLogo from "./HexaDexLogo.jsx";

export function ModeTabs({ view, setView, s, lang }) {
  const goLabel    = lang === "th" ? "GO Tools" : lang === "ja" ? "GOツール" : "GO Tools";
  const gamesLabel = lang === "th" ? "เกม"     : lang === "ja" ? "ゲーム"    : "Games";

  // Main tabs = key selling points + most-used
  const tabs = [
    { id:"pokedex",  icon:"🏠", label:s.pokedex },
    { id:"team",     icon:"⚔️", label:s.teamBuilder },
    { id:"gotools",  icon:"🎯", label:goLabel },
    { id:"games",    icon:"🎮", label:gamesLabel },
  ];
  return (
    <div className="mode-tabs">
      {tabs.map(t => (
        <button key={t.id}
          className={`mode-tab${view === t.id ? " active" : ""}${t.highlight ? " mode-tab-go" : ""}`}
          onClick={() => setView(t.id)}>
          <span className="mode-tab-icon">{t.icon}</span>
          <span className="mode-tab-label">{t.label}</span>
        </button>
      ))}
    </div>
  );
}

// More menu — only secondary/discovery features now
function MoreMenu({ onOpenBirthday, onOpenTier, lang }) {
  const [open, setOpen] = useState(false);

  // Grouped by category — "Discover & Browse" only (since main features are in tabs)
  const groups = lang === "th" ? [
    { title: "📊 สำรวจ & จัดอันดับ", items: [
      { icon: "📊", label: "Meta Tier List",  fn: onOpenTier,     desc: "ระบบ tier S/A/B/C/D + Custom" },
    ]},
    { title: "✨ พิเศษ", items: [
      { icon: "🎂", label: "โปเกมอนคู่ดวง",   fn: onOpenBirthday, desc: "ค้นหาโปเกมอนคู่ดวงจากวันเกิด" },
    ]},
  ] : lang === "ja" ? [
    { title: "📊 ランキング", items: [
      { icon: "📊", label: "メタティアリスト", fn: onOpenTier,     desc: "S/A/B/C/Dティア + カスタム" },
    ]},
    { title: "✨ スペシャル", items: [
      { icon: "🎂", label: "誕生日ポケモン",   fn: onOpenBirthday, desc: "誕生日からポケモンを占う" },
    ]},
  ] : [
    { title: "📊 Rankings", items: [
      { icon: "📊", label: "Meta Tier List",  fn: onOpenTier,     desc: "S/A/B/C/D tiers + Custom builder" },
    ]},
    { title: "✨ Special", items: [
      { icon: "🎂", label: "Birthday Pokémon", fn: onOpenBirthday, desc: "Find your destiny Pokémon from your birthday" },
    ]},
  ];

  return (
    <div className="more-menu-wrap">
      <button className="more-menu-btn" onClick={() => setOpen(v => !v)} title="More features">✨</button>
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
                    <span className="more-menu-item-icon">{it.icon}</span>
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
      {theme === "dark" ? "🌙" : "☀️"}
    </button>
  );
}

function SettingsDrawer({ open, onClose, lang, setLang, soundOn, setSoundOn,
  theme, toggleTheme, autoMode, enableAuto, s }) {
  if (!open) return null;
  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-drawer" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close settings-close" onClick={onClose}>✕</button>
        <h2 className="settings-title">⚙️ {s.settings}</h2>

        <div className="settings-group">
          <div className="settings-label">🌐 {s.language}</div>
          <div className="settings-options">
            {["en","th","ja"].map(l => (
              <button key={l} className={`settings-option${lang === l ? " active" : ""}`}
                onClick={() => setLang(l)}>
                {l === "en" ? "🇺🇸 English" : l === "th" ? "🇹🇭 ไทย" : "🇯🇵 日本語"}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-group">
          <div className="settings-label">🔊 {s.sound}</div>
          <div className="settings-options">
            <button className={`settings-option${soundOn ? " active" : ""}`}
              onClick={() => { setSoundOn(true); setSoundEnabled(true); }}>🔊 ON</button>
            <button className={`settings-option${!soundOn ? " active" : ""}`}
              onClick={() => { setSoundOn(false); setSoundEnabled(false); }}>🔇 OFF</button>
          </div>
        </div>

        <div className="settings-group">
          <div className="settings-label">🌓 Theme</div>
          <div className="settings-options">
            <button className={`settings-option${autoMode ? " active" : ""}`} onClick={enableAuto}>🌅 Auto</button>
            <button className={`settings-option${!autoMode && theme === "light" ? " active" : ""}`}
              onClick={() => { if (theme !== "light") toggleTheme(); }}>☀️ Light</button>
            <button className={`settings-option${!autoMode && theme === "dark" ? " active" : ""}`}
              onClick={() => { if (theme !== "dark") toggleTheme(); }}>🌙 Dark</button>
          </div>
        </div>

        <div className="settings-group">
          <div className="settings-label">ℹ️ {s.about}</div>
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
  theme, toggleTheme, autoMode, enableAuto,
  view, setView,
  search, setSearch, typeFilter, setTypeFilter,
  genIdx, setGenIdx,
  filteredCount, totalCount,
  thaiLoading, jpLoading,
  onOpenBirthday, onOpenTier,
  voiceSearchEl, snapSearchEl,
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
            <button className="settings-btn" onClick={() => setSettingsOpen(true)} title={s.settings}>⚙️</button>
          </div>
        </div>

        {view === "pokedex" && (
          <>
            <div className="header-row header-row-filters">
              <div className="search-wrap">
                <span className="search-icon">🔍</span>
                <input className="search-box" placeholder={s.searchPlaceholder}
                  value={search} onChange={(e) => setSearch(e.target.value)} />
                {voiceSearchEl}
                {snapSearchEl}
              </div>

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
              🌏 {lang === "th" ? s.loadingThaiNames : s.loadingJpNames}
            </span>
          </div>
        )}
      </header>

      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)}
        lang={lang} setLang={setLang} soundOn={soundOn} setSoundOn={setSoundOn}
        theme={theme} toggleTheme={toggleTheme} autoMode={autoMode} enableAuto={enableAuto} s={s} />
    </>
  );
}