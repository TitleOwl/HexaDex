import { useState, useEffect, useRef } from "react";
import { STRINGS, GENERATIONS, ALL_TYPES, TYPE_NAMES_TH, TYPE_NAMES_JA } from "../data.js";
import { setSoundEnabled } from "../utils.js";
import { getPerfMode, setPerfMode } from "../perfMode.js";
import { routeUrl } from "../router.js";
import { readVisitStreak } from "../visitStreak.js";
import { genById, genCount, STARTER_ORDER } from "../data/generations.js";
import { artworkUrl } from "../utils.js";

const t = (lang, en, th, ja) => (lang === "th" ? th : lang === "ja" ? ja : en);
import { readPetSave, PET_EVENT } from "./PetCareGame.jsx";
import HexaDexLogo from "./HexaDexLogo.jsx";
import AuthWidget from "./AuthWidget.jsx";
import {
  Gamepad2, Search, Settings, Sun, Moon, Sparkles, Heart, Swords,
  BarChart3, Cake, Globe, Volume2, VolumeX, Palette, Info, Newspaper, SunMedium, Gauge,
  Filter, ChevronDown, Flame,
} from "lucide-react";

// tiny helper: inline icon aligned with text
const Ico = ({ as: C, size = 15 }) => (
  <C size={size} strokeWidth={2.2} style={{ verticalAlign: "-2px", marginRight: 6, flexShrink: 0 }} />
);

// Flat Poké Ball line-icon for the Pokédex tab — same conventions as lucide
// icons (24x24 viewBox, currentColor stroke) so it drops into <t.Icon .../>
// and inherits the tab's gray/red active-state color automatically.
function PokeballIcon({ size = 17, strokeWidth = 2.2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="9" y2="12" />
      <line x1="15" y1="12" x2="22" y2="12" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// Pikachu-head icon for the Pokédex tab — the actual artwork (public/
// pikachu-icon.png), recolored via CSS mask so it still turns gray/red
// with the tab's active state instead of showing its native yellow/black
// colors. Ignores the incoming `size` (17px, sized for simple line icons)
// — a detailed photo-style mask needs to render noticeably bigger to
// carry the same visual weight as the other tabs' icons.
function PikachuHeadIcon() {
  const size = 38;
  const maskStyle = {
    display: "inline-block",
    width: size,
    height: size,
    backgroundColor: "currentColor",
    WebkitMaskImage: "url(/pikachu-icon.png)",
    maskImage: "url(/pikachu-icon.png)",
    WebkitMaskSize: "contain",
    maskSize: "contain",
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskPosition: "center",
    maskPosition: "center",
  };
  return <span aria-hidden="true" style={maskStyle} />;
}

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
    { id:"pokedex",  Icon: PikachuHeadIcon, label:s.pokedex },
    { id:"team",     Icon: Swords,          label:s.teamBuilder },
    { id:"gotools",  Icon: PokeballIcon,    label:goLabel },
    { id:"games",    Icon: Gamepad2,        label:gamesLabel },
  ];

  return (
    <div className="mode-tabs">
      {tabs.map(t => (
        // Anchors, not buttons: every tab has a real address now, so a
        // middle-click opens it in a tab like any other link. The handler
        // takes only the plain left-click, which the SPA serves without a
        // reload.
        <a key={t.id}
          href={routeUrl(t.id)}
          className={`mode-tab${view === t.id ? " active" : ""}`}
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
            e.preventDefault();
            setView(t.id);
          }}>
          <span className="mode-tab-icon">
            <t.Icon size={17} strokeWidth={2.2} />
            {t.id === "games" && petAlert && <span className="mode-tab-dot" />}
          </span>
          <span className="mode-tab-label">{t.label}</span>
        </a>
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

function SettingsDrawer({ open, onClose, lang, setLang, soundOn, setSoundOn,
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
  // Which chip is being pointed at, and where it sits on screen. Kept as a
  // rect rather than a ref because the preview is positioned with `fixed`: the
  // chip strip scrolls and clips its own overflow, so a popover rendered
  // inside it would be cut off at the strip's edge.
  const [peek, setPeek] = useState(null);
  const leaveTimer = useRef(null);

  // Declared before show(), which calls it. The 90ms grace stops the panel
  // flickering off and back on while the pointer crosses between two chips.
  const hide = () => {
    clearTimeout(leaveTimer.current);
    leaveTimer.current = setTimeout(() => setPeek(null), 90);
  };

  const show = (i, el) => {
    // "All" has no single generation to preview — and it has to actively
    // dismiss, not just decline: bare `return` left the previous chip's panel
    // hanging under a chip it did not belong to.
    if (i === 0) { hide(); return; }
    clearTimeout(leaveTimer.current);
    const r = el.getBoundingClientRect();
    setPeek({ gen: i, x: r.left + r.width / 2, y: r.bottom });
  };
  useEffect(() => () => clearTimeout(leaveTimer.current), []);

  return (
    <div className="gen-filter-wrap" onMouseLeave={hide}>
      {GENERATIONS.map((g, i) => {
        const regionName = g[lang] ?? g.en;
        const subLabel = g.sub?.[lang] ?? "";
        return (
          // One line, region only. The generation number rode along on a second
          // line that made every chip two-storey and both lines small; it is on
          // the tooltip and in the list heading instead, which is where someone
          // actually reads it.
          <button key={i} className={`gen-btn${genIdx === i ? " active" : ""}`}
            onClick={() => onSet(i)} title={subLabel ? `${regionName} · ${subLabel}` : regionName}
            // Focus as well as hover: a keyboard user gets the same preview
            // rather than a feature that only exists for mice.
            onMouseEnter={(e) => show(i, e.currentTarget)}
            onFocus={(e) => show(i, e.currentTarget)}
            onBlur={hide}>
            <span className="gen-btn-region">{regionName}</span>
          </button>
        );
      })}

      {/* Keyed by generation so moving to another chip REMOUNTS the panel.
          Without it React reuses the same element, and a CSS animation only
          plays on mount — the panel slid into place once and then swapped its
          contents silently for every chip after that. */}
      {peek && <StarterPeek key={peek.gen} gen={peek.gen} x={peek.x} y={peek.y} lang={lang} />}
    </div>
  );
}

/** The three starters of one generation, floating under its chip. */
function StarterPeek({ gen, x, y, lang }) {
  const info = genById(gen);
  const [pos, setPos] = useState({ left: x, top: y + 8 });
  const boxRef = useRef(null);

  // Nudge back inside the window once the real width is known, so a chip near
  // either edge does not push the panel off screen.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const w = el.offsetWidth;
    const half = w / 2;
    const left = Math.min(Math.max(x, half + 10), window.innerWidth - half - 10);
    setPos({ left, top: y + 8 });
  }, [x, y]);

  return (
    <div ref={boxRef} className="gen-peek" style={{ left: pos.left, top: pos.top }} aria-hidden>
      <div className="gen-peek-starters">
        {STARTER_ORDER.map((slot) => {
          const st = info.starters.find((v) => v.slot === slot);
          if (!st) return null;
          return (
            <img key={slot} className={`gen-peek-img ${slot}`} src={artworkUrl(st.id)}
              alt="" loading="eager" fetchPriority="high" decoding="async" draggable={false} />
          );
        })}
      </div>
      <div className="gen-peek-label">
        {lang === "th" ? `เจน ${info.roman} · ${genCount(info)} ตัว`
          : lang === "ja" ? `第${info.roman}世代 · ${genCount(info)}匹`
          : `Gen ${info.roman} · ${genCount(info)}`}
      </div>
    </div>
  );
}

export default function Header({
  lang, setLang, soundOn, setSoundOn,
  theme, toggleTheme, autoMode, enableAuto,
  view, setView,
  search, setSearch, typeFilter, setTypeFilter,
  genIdx, setGenIdx,
  thaiLoading, jpLoading,
  onOpenBirthday, onOpenTier,
  onOpenChangelog, hasUpdate, currentVersion = "1.0.0", latestDate = "2026-06-04",
  voiceSearchEl, snapSearchEl,
  favCount = 0, showFavsOnly = false, onToggleFavs,
  musicEl,
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const searchInputRef = useRef(null);
  // Read once per mount: the value only changes at midnight, and re-reading it
  // would roll the counter forward again on every render.
  const [streak] = useState(readVisitStreak);
  // Drives the shadow under the sticky row: only once the page has actually
  // moved, so a page that fits on screen never wears one.
  const [scrolled, setScrolled] = useState(false);
  // Whether the region strip has anything hidden past its right edge.
  const genRowRef = useRef(null);
  const [genMore, setGenMore] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const el = genRowRef.current;
    if (!el) return;
    // 2px of slack: sub-pixel widths make scrollWidth exceed clientWidth by a
    // hair on rows that are not really scrollable.
    const check = () => setGenMore(el.scrollWidth - el.clientWidth - el.scrollLeft > 2);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    el.addEventListener("scroll", check, { passive: true });
    return () => { ro.disconnect(); el.removeEventListener("scroll", check); };
  }, [view, lang]);
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
        {/* ── Row 1 — where you are ───────────────────────────────────────
            The main menu sits at the very top with the logo and your account:
            these are the things that are true of the whole app, whatever page
            is showing. */}
        <div className="header-row header-row-main">
          <div className="logo">
            <HexaDexLogo size="md" mode="light" />
          </div>

          <ModeTabs view={view} setView={setView} s={s} lang={lang} />

          <div className="header-actions">
            {/* One capsule, because these are two readings of the same kind:
                numbers about you. Five separate circles gave no clue which was
                which. */}
            <div className="nav-stats">
              <button
                className={`nav-stats-item${showFavsOnly ? " active" : ""}`}
                onClick={onToggleFavs}
                aria-pressed={showFavsOnly}
                aria-label={t(lang,
                  `Favourites, ${favCount}`, `รายการโปรด ${favCount} ตัว`, `お気に入り ${favCount}`)}
                title={s.favFilter}
              >
                <Heart size={14} strokeWidth={2.3} fill={showFavsOnly ? "currentColor" : "none"} />
                <span>{favCount}</span>
              </button>
              <span className="nav-stats-sep" aria-hidden />
              <span className="nav-stats-item nav-stats-static"
                aria-label={t(lang,
                  `Visit streak, ${streak} days`, `เข้าต่อเนื่อง ${streak} วัน`, `連続 ${streak}日`)}
                title={s.visitStreak}>
                <Flame size={14} strokeWidth={2.3} />
                <span>{streak}</span>
              </span>
            </div>

            {musicEl}
            <div className="header-icon-group">
              <MoreMenu onOpenBirthday={onOpenBirthday} onOpenTier={onOpenTier} lang={lang} />
            </div>
            <AuthWidget lang={lang}
              theme={theme} toggleTheme={toggleTheme} autoMode={autoMode}
              onOpenSettings={() => setSettingsOpen(true)} settingsHasUpdate={hasUpdate} />
          </div>
        </div>

        {/* ── Row 2 — everything that narrows the list, on one line ───────
            Search and its filters at the left, regions at the right. The two
            clusters counterweight each other, so the gap in the middle is the
            result of the layout rather than a hole to be filled — and it costs
            one row less height, which is one row sooner you see a Pokémon. */}
        {view === "pokedex" && (
          <div className={`header-row header-row-search${scrolled ? " stuck" : ""}`}>
            {/* Search and the type filter are one control, not two: both narrow
                the same list, and a gap between them made them look like
                unrelated tools that happen to sit near each other. */}
            <div className="nav-searchbar">
              <span className="nav-search">
                <Search size={16} strokeWidth={2.4} className="nav-search-icon" />
                <input
                  ref={searchInputRef}
                  className="nav-search-input"
                  placeholder={s.searchPlaceholder}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label={s.searchPlaceholder}
                />
                <span className="nav-search-tools">
                  {voiceSearchEl}
                  {snapSearchEl}
                </span>
              </span>

              <span className="nav-searchbar-sep" aria-hidden />

              <label className="nav-type">
                <Filter size={13} strokeWidth={2.4} />
                <select className="nav-pill-select" value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  aria-label={s.allTypes}>
                  <option value="all">{s.allTypes}</option>
                  {ALL_TYPES.map((ty) => (
                    <option key={ty} value={ty}>
                      {lang === "th" ? `${TYPE_NAMES_TH[ty] ?? ty}`
                        : lang === "ja" ? `${TYPE_NAMES_JA[ty] ?? ty}`
                        : ty.charAt(0).toUpperCase() + ty.slice(1)}
                    </option>
                  ))}
                </select>
                <ChevronDown size={13} strokeWidth={2.6} />
              </label>
            </div>

            {/* Kept: the regions really are a different group. The divider that
                used to stand between search and the type filter is gone with
                the merge. */}
            <span className="nav-group-sep" aria-hidden />

            {/* `more` is set only while the strip actually overflows, so the
                fade is a promise of more chips rather than a permanent smudge
                over Paldea on a wide screen. */}
            <div className={`header-gen-row${genMore ? " more" : ""}`} ref={genRowRef}>
              <GenFilter genIdx={genIdx} onSet={setGenIdx} lang={lang} />
            </div>
          </div>
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
        theme={theme} toggleTheme={toggleTheme} autoMode={autoMode} enableAuto={enableAuto} s={s}
        onOpenChangelog={onOpenChangelog}
        currentVersion={currentVersion} latestDate={latestDate} />
    </>
  );
}