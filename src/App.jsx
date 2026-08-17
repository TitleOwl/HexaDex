import { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from "react";
import "./App.css";
import "./responsive.css";
import {
  STRINGS, TYPE_NAMES_TH, TYPE_NAMES_JA, GENERATIONS, ALL_TYPES,
  CACHE_KEY, LIST_KEY, THAI_KEY, JP_KEY,
  THAI_NAMES_URL, JP_NAMES_URL, PAGE_SIZE, SEARCH_DEBOUNCE,
} from "./data.js";
import {
  cache, compactPokemon, useDebouncedValue, useModelViewerScript,
  getLocalName, isSoundEnabled,
} from "./utils.js";
import { useTheme } from "./useTheme.js";
import { useAuth } from "./AuthContext.jsx";
import { favoritesApi } from "./auth.js";
import FavoriteLoginToast from "./components/FavoriteLoginToast.jsx";

// ─── Core Components ─────────────────────────────────────────
import Header             from "./components/Header.jsx";
import ScrollToTop        from "./components/ScrollToTop.jsx";
import PerfWatcher        from "./components/PerfWatcher.jsx";
import PokemonCard, { SkeletonCard } from "./components/PokemonCard.jsx";
import DailyBanner        from "./components/DailyBanner.jsx";
import Footer             from "./components/Footer.jsx";

// Lazy-loaded: tabs/overlays the user may never open in a given visit —
// each ships as its own chunk instead of bloating the initial bundle.
const PokemonModal    = lazy(() => import("./components/PokemonModal/index.jsx"));
const TeamBuilder     = lazy(() => import("./components/TeamBuilder.jsx"));
const GoToolsHub      = lazy(() => import("./components/GoToolsHub.jsx"));
const RaidSchedule    = lazy(() => import("./components/RaidSchedule.jsx"));
const GamesHub        = lazy(() => import("./components/GamesHub.jsx"));
const CardMode        = lazy(() => import("./components/CardMode.jsx"));
const BirthdayPokemon = lazy(() => import("./components/BirthdayPokemon.jsx"));
const MetaTierBrowser = lazy(() => import("./components/MetaTierBrowser.jsx"));
const MultiplayerQuiz = lazy(() => import("./components/MultiplayerQuiz.jsx"));
const Changelog       = lazy(() => import("./components/Changelog.jsx"));
const GenerationBand  = lazy(() => import("./components/GenerationBand.jsx"));

// Views that actually apply the ?gen= filter. Module scope so it is not a fresh
// array on every render, which would put it in setView's dependency list.
const GEN_AWARE_VIEWS = ["pokedex", "team"];

// ─── Hubs (main tabs) ────────────────────────────────────────
import BuddyCompanion     from "./components/BuddyCompanion.jsx";
import { trackView }       from "./components/petQuests.js";

// ─── Overlays ────────────────────────────────────────────────
import { hasUnseenVersion, fetchChangelog, getCurrentVersion, getLatestCommitDate } from "./data/changelog.js";
import { readRoute, pushRoute, replaceRoute } from "./router.js";
import MusicPlayer from "./components/MusicPlayer.jsx";

// ─── Search add-ons (passed to Header) ───────────────────────
import VoiceSearch        from "./components/VoiceSearch.jsx";
import SnapSearch         from "./components/SnapSearch.jsx";

// ─── 🎵 Music Player ─────────────────────────────────────────

// Suspense fallbacks for the lazy tabs/overlays above — just a spinner,
// shown only on the first open of each chunk (cached after that).
function ViewLoading() {
  return <div className="view-loading"><div className="loading-spinner" /></div>;
}
function OverlayLoading() {
  return <div className="overlay-loading"><div className="loading-spinner" /></div>;
}

export default function App() {
  // ─── Language & Sound ──────────────────────────────────────
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem("pkdx_lang") ?? "en"; } catch { return "en"; }
  });
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());
  const { theme, toggleTheme, autoMode, enableAuto } = useTheme();

  useEffect(() => { try { localStorage.setItem("pkdx_lang", lang); } catch {} }, [lang]);

  // 🔙 Global back-button trap — closes topmost modal instead of leaving SPA
  useEffect(() => {
    let modalStack = 0;
    let trapPushed = false;
    const pushTrap = () => {
      if (!trapPushed) {
        try { window.history.pushState({ hexadexTrap: true }, ""); trapPushed = true; } catch {}
      }
    };
    const onModalOpen  = () => { modalStack++; pushTrap(); };
    const onModalClose = () => { modalStack = Math.max(0, modalStack - 1); };
    const onPopstate = () => {
      trapPushed = false;
      if (modalStack > 0) {
        window.dispatchEvent(new CustomEvent("ui:back-pressed"));
        pushTrap();
        return;
      }
      // No modal is open, so this back press is a real navigation: put the view
      // and the filter back to whatever the address now says. Announced as an
      // event rather than handled here so this effect keeps its empty dep list
      // and does not resubscribe on every render.
      window.dispatchEvent(new CustomEvent("ui:route-changed"));
    };
    window.addEventListener("ui:modal:open",  onModalOpen);
    window.addEventListener("ui:modal:close", onModalClose);
    window.addEventListener("popstate", onPopstate);
    return () => {
      window.removeEventListener("ui:modal:open",  onModalOpen);
      window.removeEventListener("ui:modal:close", onModalClose);
      window.removeEventListener("popstate", onPopstate);
    };
  }, []);

  // 🏷️ Update document title with HexaDex branding
  useEffect(() => {
    const title = lang === "th" ? "HexaDex — สารานุกรมโปเกม่อนสุดล้ำ"
      : lang === "ja" ? "HexaDex — 究極のポケモン図鑑"
      : "HexaDex — The Hexagonal Pokédex";
    document.title = title;
  }, [lang]);

  // ─── View router — the URL is the source of truth (generations spec §2) ──
  // Seeded from the address so a deep link works on first paint, and kept in
  // step with it below. The tabs used to be state only, which meant nothing in
  // the app could be linked to or bookmarked.
  const [view, setViewState] = useState(() => readRoute().view);


  // ─── Overlays ──────────────────────────────────────────────
  const [birthdayOpen, setBirthdayOpen]     = useState(false);
  const [tierOpen, setTierOpen]             = useState(false);
  const [multiplayerOpen, setMultiplayerOpen] = useState(false);
  const [cardModePokemon, setCardModePokemon] = useState(null);
  const [buddyOpenPet, setBuddyOpenPet]       = useState(false);

  // ─── 📋 Changelog state ────────────────────────────────────
  const [showChangelog, setShowChangelog] = useState(false);
  const [hasUpdate, setHasUpdate]         = useState(false);
  const [currentVersion, setCurrentVersion] = useState(() => getCurrentVersion());
  const [latestDate, setLatestDate]         = useState(() => getLatestCommitDate());

  // Pre-warm: fetch changelog on mount → updates version + dot
  useEffect(() => {
    fetchChangelog().then(result => {
      if (result.version) setCurrentVersion(result.version);
      if (result.date)    setLatestDate(result.date);
      setHasUpdate(hasUnseenVersion());
    });
  }, []);

  // ─── Pokemon Data ──────────────────────────────────────────
  const [allList, setAllList] = useState([]);
  const [loaded, setLoaded]   = useState([]);
  const [offset, setOffset]   = useState(0);
  const [search, setSearch]   = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [genIdx, setGenIdx]   = useState(() => readRoute().gen);
  // Read by setView, which must not take genIdx as a dependency: it would be
  // rebuilt on every filter change and re-render the whole header with it.
  const genIdxRef = useRef(genIdx);
  // The observer callback is created once; refs let it read the current view
  // without tearing the observer down on every keystroke.
  const searchRef = useRef("");
  useEffect(() => { genIdxRef.current = genIdx; }, [genIdx]);

  // Back / forward, and any other address change: the URL leads, state follows.
  useEffect(() => {
    const sync = () => {
      const r = readRoute();
      setViewState(r.view);
      setGenIdx(r.gen);
    };
    window.addEventListener("ui:route-changed", sync);
    return () => window.removeEventListener("ui:route-changed", sync);
  }, []);

  // First paint: normalise the address without adding a history entry, so "/"
  // becomes "/pokedex" and a nonsense ?gen=99 stops being shown as if it meant
  // something (§2). replace, not push — landing on a page is not a navigation.
  useEffect(() => {
    const r = readRoute();
    replaceRoute(r.view, r.gen);
  }, []);

  // Guests keep favorites in memory only (gone on refresh); logged-in users
  // get them from the server so likes survive across sessions/devices.
  const { user } = useAuth();
  // PokemonCard is memoized and doesn't compare the onFav prop, so toggleFav
  // must keep a stable identity — read the live user via ref, not a closure.
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);
  const [favorites, setFavorites] = useState([]);
  const favoritesRef = useRef(favorites);
  useEffect(() => { favoritesRef.current = favorites; }, [favorites]);
  // Bumped each time a guest favorites something, to (re)trigger the
  // "log in to keep this" nudge banner.
  const [favToastPulse, setFavToastPulse] = useState(0);
  const [showFavsOnly, setShowFavsOnly] = useState(false);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  // ─── Localized names (lazy) ────────────────────────────────
  const [thaiArr, setThaiArr] = useState(null);
  const [jpArr, setJpArr]     = useState(null);
  const [thaiLoading, setThaiLoading] = useState(false);
  const [jpLoading, setJpLoading]     = useState(false);

  // ─── Caches ────────────────────────────────────────────────
  const detailCache  = useRef(new Map());
  const speciesCache = useRef(new Map());
  const evoCache     = useRef(new Map());
  const moveCache    = useRef(new Map());

  useEffect(() => {
    if (favorites.length === 0 && showFavsOnly) setShowFavsOnly(false);
  }, [favorites]);

  // Logged-in users: pull saved favorites from the server. Guests: nothing
  // to load — their favorites live only in this session's state.
  useEffect(() => {
    if (!user) { setFavorites([]); return; }
    let cancelled = false;
    favoritesApi.list().then((data) => {
      if (!cancelled) setFavorites(data.favorites ?? []);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [user]);

  useModelViewerScript();

  // ─── cachedFetch ───────────────────────────────────────────
  const cachedFetch = useCallback(async (url) => {
    const id = url.match(/\/pokemon\/(\d+)/)?.[1];
    if (id && detailCache.current.has(parseInt(id))) {
      return detailCache.current.get(parseInt(id));
    }
    const data = await fetch(url).then(r => r.json());
    const compact = compactPokemon(data);
    detailCache.current.set(compact.id, compact);
    return compact;
  }, []);

  // ─── Initial load ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let list = cache.get(LIST_KEY);
      if (!list) {
        try {
          const res = await fetch("https://pokeapi.co/api/v2/pokemon?limit=1500&offset=0");
          const data = await res.json();
          list = data.results;
          cache.set(LIST_KEY, list);
        } catch (e) { console.error("Failed to load list", e); return; }
      }
      if (cancelled) return;
      setAllList(list);

      const cachedDetails = cache.get(CACHE_KEY) ?? {};
      Object.values(cachedDetails).forEach(p => { detailCache.current.set(p.id, p); });

      // One screenful, then stop. This used to slice PAGE_SIZE when that was
      // 2000, so opening the site fired ~1,350 detail requests at once and
      // held the screen blank until the last one resolved.
      const first = await Promise.all(
        list.slice(0, PAGE_SIZE).map(p => cachedFetch(p.url)));
      if (cancelled) return;
      setLoaded(first);
      setOffset(PAGE_SIZE);
      setInitializing(false);

      setTimeout(() => {
        const all = {};
        detailCache.current.forEach((v, k) => { all[k] = v; });
        cache.set(CACHE_KEY, all);
      }, 3000);
    })();
    return () => { cancelled = true; };
  }, [cachedFetch]);

  // ─── Lazy Thai names ───────────────────────────────────────
  useEffect(() => {
    if (lang !== "th" || thaiArr) return;
    let c = cache.get(THAI_KEY);
    if (c) { setThaiArr(c); return; }
    setThaiLoading(true);
    fetch(THAI_NAMES_URL).then(r => r.json()).then(data => {
      setThaiArr(data); cache.set(THAI_KEY, data); setThaiLoading(false);
    }).catch(() => setThaiLoading(false));
  }, [lang, thaiArr]);

  // ─── Lazy JP names ─────────────────────────────────────────
  useEffect(() => {
    if (lang !== "ja" || jpArr) return;
    let c = cache.get(JP_KEY);
    if (c) { setJpArr(c); return; }
    setJpLoading(true);
    fetch(JP_NAMES_URL).then(r => r.json()).then(data => {
      setJpArr(data); cache.set(JP_KEY, data); setJpLoading(false);
    }).catch(() => setJpLoading(false));
  }, [lang, jpArr]);

  // ─── Load more pokemon ─────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (loading || offset >= allList.length) return;
    setLoading(true);
    const next = allList.slice(offset, offset + PAGE_SIZE);
    const fetched = await Promise.all(next.map(p => cachedFetch(p.url)));
    setLoaded(prev => [...prev, ...fetched]);
    setOffset(o => o + PAGE_SIZE);
    setLoading(false);

    const all = {};
    detailCache.current.forEach((v, k) => { all[k] = v; });
    cache.set(CACHE_KEY, all);
  }, [loading, offset, allList, cachedFetch]);


  // ─── Search & Filter ───────────────────────────────────────
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE);
  searchRef.current = debouncedSearch;
  const localName = useCallback(
    (p) => getLocalName(p.id, lang, thaiArr, jpArr),
    [lang, thaiArr, jpArr]
  );

  // ─── Filters need the whole dex, not the scrolled part ────────────────────
  //
  // Lazy loading traded away something the filters depended on: they read
  // `loaded`, so picking Unova on a fresh page matched nothing at all — the
  // #494-649 range had simply not been fetched yet. The light 1,351-entry
  // list has every id and name from the first request, so it can say which
  // entries a filter wants; this fetches exactly those and nothing else.
  const [filling, setFilling] = useState(false);
  // How far into a narrowed view we have fetched. Reset whenever the view
  // changes, grown by the same sentinel that pages the full list.
  const [narrowOffset, setNarrowOffset] = useState(PAGE_SIZE);
  useEffect(() => {
    const q = debouncedSearch.toLowerCase().trim();
    const gen = GENERATIONS[genIdx];
    const narrowed = genIdx > 0 || !!q;
    if (!narrowed || !allList.length) return;

    const wanted = allList.filter(p => {
      const id = Number(p.url.split("/").filter(Boolean).pop());
      if (!id) return false;
      if (id < gen.min || id > gen.max) return false;
      if (!q) return true;
      // Localised names live in the same arrays the list rendering uses, so a
      // Thai or Japanese query matches here too.
      const th = (getLocalName(id, "th", thaiArr, jpArr) ?? "").toLowerCase();
      const ja = (getLocalName(id, "ja", thaiArr, jpArr) ?? "").toLowerCase();
      return p.name.toLowerCase().includes(q) || th.includes(q)
        || ja.includes(q) || String(id).includes(q);
    });

    const have = new Set(loaded.map(p => p.id));
    const missing = wanted.slice(0, narrowOffset).filter(p =>
      !have.has(Number(p.url.split("/").filter(Boolean).pop())));
    if (!missing.length) { setFilling(false); return; }

    let live = true;
    setFilling(true);
    (async () => {
      // Capped: a type filter across the whole dex would otherwise be the
      // 1,351-request stampede this series just removed.
      // Only as far as the reader has actually got. A region used to pull its
      // whole range the moment its chip was pressed.
      for (let i = 0; i < missing.length && live; i += PAGE_SIZE) {
        const slice = missing.slice(i, i + 20);
        const got = await Promise.allSettled(slice.map(p => cachedFetch(p.url)));
        if (!live) return;
        const ok = got.filter(r => r.status === "fulfilled").map(r => r.value);
        if (ok.length) {
          setLoaded(prev => {
            const seen = new Set(prev.map(x => x.id));
            return [...prev, ...ok.filter(x => !seen.has(x.id))];
          });
        }
      }
      if (live) setFilling(false);
    })();
    return () => { live = false; };
    // `loaded` is deliberately absent: it changes as this effect fills, and
    // depending on it would restart the fetch on every batch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genIdx, debouncedSearch, allList, cachedFetch, thaiArr, jpArr, narrowOffset]);

  // A new region or query starts again from the first page.
  useEffect(() => { setNarrowOffset(PAGE_SIZE); }, [genIdx, debouncedSearch, typeFilter]);

  // Loading on scroll rather than on a click: the sentinel sits below the
  // grid with a margin, so the next 20 are already arriving by the time the
  // last row is on screen. The button stays for keyboard and for anyone who
  // would rather ask for it.
  const sentinelRef = useRef(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        if (genIdxRef.current > 0 || searchRef.current) setNarrowOffset(o => o + PAGE_SIZE);
        else loadMore();
      },
      { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
    // Switching region or typing swaps the sentinel for a different element,
    // and an observer still watching the old node never fires again.
  }, [loadMore, genIdx, debouncedSearch, typeFilter]);

  const filtered = useMemo(() => {
    if (showFavsOnly) {
      return loaded.filter(p => favorites.includes(p.id));
    }
    const gen = GENERATIONS[genIdx];
    const q = debouncedSearch.toLowerCase().trim();
    return loaded.filter(p => {
      if (p.id < gen.min || p.id > gen.max) return false;
      if (typeFilter !== "all" && !p.types.some(t => t.type.name === typeFilter)) return false;
      if (q) {
        const local = localName(p)?.toLowerCase() ?? "";
        if (!p.name.toLowerCase().includes(q) &&
            !local.includes(q) &&
            !String(p.id).includes(q)) return false;
      }
      return true;
    });
  }, [loaded, genIdx, typeFilter, debouncedSearch, localName, showFavsOnly, favorites]);

  // An empty grid while the fill is still running is not "nothing matched".
  const stillFilling = filling && filtered.length === 0;

  // Title plus a quieter sub-line. The dex range and species count used to be
  // the reason the generations hub existed; with that page gone they live here,
  // where they describe the list you are actually looking at.
  // How many the current view HAS, not how many have been fetched. The light
  // list knows every id from the first request, so this is settled before any
  // detail arrives — the count used to tick upward as you scrolled, which read
  // as the dex still being counted rather than still being drawn.
  const viewTotal = useMemo(() => {
    const gen = GENERATIONS[genIdx];
    // No 1025 cap: the grid lists every entry the API returns, alternate
    // forms included, so a total that stopped at the last base species was
    // describing a different list than the one on screen.
    return allList.reduce((n, p) => {
      const id = Number(p.url.split("/").filter(Boolean).pop());
      return (id && id >= gen.min && id <= gen.max) ? n + 1 : n;
    }, 0);
  }, [allList, genIdx]);

  const sectionHeading = useMemo(() => {
    const st = STRINGS[lang];
    // A search or a type filter has no knowable total until the matches are
    // in, so those keep counting what is actually on screen.
    const n = (debouncedSearch || typeFilter !== "all")
      ? filtered.length.toLocaleString()
      : viewTotal.toLocaleString();
    if (debouncedSearch) return { title: st.resultsFor(debouncedSearch), sub: `${n}` };
    if (typeFilter !== "all") {
      const tName = lang === "th" ? (TYPE_NAMES_TH[typeFilter] ?? typeFilter)
        : lang === "ja" ? (TYPE_NAMES_JA[typeFilter] ?? typeFilter)
        : typeFilter;
      return { title: tName, sub: `${n}` };
    }
    const gen = GENERATIONS[genIdx];
    if (genIdx === 0) {
      return {
        title: lang === "th" ? "โปเกม่อนทั้งหมด" : lang === "ja" ? "すべてのポケモン" : "All Pokémon",
        sub: `${n}`,
      };
    }
    const range = `#${String(gen.min).padStart(3, "0")}–${String(gen.max).padStart(3, "0")}`;
    const total = viewTotal;
    const unit = lang === "th" ? "ตัว" : lang === "ja" ? "匹" : "Pokémon";
    return { title: gen[lang] ?? gen.en, sub: `${range} · ${total} ${unit}` };
  }, [lang, debouncedSearch, typeFilter, genIdx, filtered.length, viewTotal]);

  // ─── Helpers ───────────────────────────────────────────────
  const handleSelect = useCallback((p) => {
    setSelected(p);
    trackView(); // buddy quest: viewing Pokémon earns food
    // let the roaming buddy react when you view its own evolution line
    try {
      const id = p?.id ?? parseInt(String(p?.url ?? "").split("/").filter(Boolean).pop(), 10);
      if (id) window.dispatchEvent(new CustomEvent("pokemon:viewed", { detail: { id } }));
    } catch {}
  }, []);
  const toggleFav = useCallback((id) => {
    const wasFav = favoritesRef.current.includes(id);
    setFavorites(f => f.includes(id) ? f.filter(x => x !== id) : [...f, id]);
    if (userRef.current) {
      // Sync to the server; toggle is its own inverse, so re-applying it
      // locally on failure cleanly reverts the optimistic update above.
      favoritesApi.toggle(id).catch(() => {
        setFavorites(f => f.includes(id) ? f.filter(x => x !== id) : [...f, id]);
      });
    } else if (!wasFav) {
      setFavToastPulse(p => p + 1);
    }
  }, []);

  // 🔊 Wrapped handler — opens Pokemon modal
  // Used by SnapSearch + VoiceSearch (both may pass id or pokemon object)
  // The Pokemon cry will play automatically from PokemonModal's useEffect
  const handleSearchOpen = useCallback(async (pokemonOrId) => {
    // Case 1: full pokemon object passed → use directly
    if (pokemonOrId && typeof pokemonOrId === "object" && pokemonOrId.types) {
      setSelected(pokemonOrId);
      return;
    }

    // Case 2: id passed (number or string) — need to find/fetch full data
    const id = Number(pokemonOrId?.id ?? pokemonOrId);
    if (!id || isNaN(id)) return;

    // Try in-memory caches first
    let pokemon = loaded.find(p => p.id === id) || detailCache.current.get(id);

    // Fallback: fetch from PokeAPI if not loaded yet
    if (!pokemon || !pokemon.types) {
      try {
        pokemon = await cachedFetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
      } catch (e) {
        console.error("Failed to fetch pokemon", id, e);
        return;
      }
    }

    setSelected(pokemon);
  }, [loaded, cachedFetch]);

  // ─── 🎵 Gen change handler (for music + filter) ───────────
  const handleGenChange = useCallback((idx) => {
    setGenIdx(idx);
    // The filter lives in the address, so changing it from the header chips is
    // a navigation like any other and the back button can undo it (§2).
    pushRoute("pokedex", idx);
  }, []);

  /** Switch tab and write the address. The gen filter rides along to the two
   *  views that actually apply it (§4.3) — ?gen= on the games tab would be a
   *  filter nothing acts on, which is worse than no param at all. */
  const setView = useCallback((next) => {
    setViewState(next);
    pushRoute(next, GEN_AWARE_VIEWS.includes(next) ? genIdxRef.current : 0);
  }, []);

  /** §4.2 — clearing the chip drops the param and shows everything. */
  const clearGenFilter = useCallback(() => {
    setGenIdx(0);
    pushRoute("pokedex", 0);
  }, []);

  const s = STRINGS[lang];

  // ─── Voice & Snap UI (placed in Header search bar) ─────────
  // Both use handleSearchOpen → plays cry when Pokemon is identified
  const voiceSearchEl = !initializing ? (
    <VoiceSearch
      allList={allList} thaiArr={thaiArr} jpArr={jpArr} lang={lang}
      onOpen={handleSearchOpen} onSetSearch={setSearch}
    />
  ) : null;
  const snapSearchEl = !initializing ? (
    <SnapSearch
      loaded={loaded} thaiArr={thaiArr} jpArr={jpArr} lang={lang}
      onOpen={handleSearchOpen}
    />
  ) : null;

  return (
    <>
      <FavoriteLoginToast
        pulse={favToastPulse}
        lang={lang}
        onLogin={() => window.dispatchEvent(new CustomEvent("auth:open-login"))}
      />
      <Header
        lang={lang} setLang={setLang}
        soundOn={soundOn} setSoundOn={setSoundOn}
        theme={theme} toggleTheme={toggleTheme}
        autoMode={autoMode} enableAuto={enableAuto}
        view={view} setView={setView}
        search={search} setSearch={setSearch}
        typeFilter={typeFilter} setTypeFilter={setTypeFilter}
        genIdx={genIdx} setGenIdx={handleGenChange}
        musicEl={<MusicPlayer lang={lang} inline />}
        thaiLoading={thaiLoading} jpLoading={jpLoading}
        onOpenBirthday={() => setBirthdayOpen(true)}
        onOpenTier={() => setTierOpen(true)}
        onOpenMultiplayer={() => setMultiplayerOpen(true)}
        onOpenChangelog={() => { setShowChangelog(true); setHasUpdate(false); }}
        hasUpdate={hasUpdate}
        currentVersion={currentVersion}
        latestDate={latestDate}
        voiceSearchEl={voiceSearchEl}
        snapSearchEl={snapSearchEl}
        favCount={favorites.length}
        showFavsOnly={showFavsOnly}
        onToggleFavs={() => setShowFavsOnly(v => !v)}
      />

      {/* ── Pokédex View ── */}
      {view === "pokedex" && (
        <main className="grid-wrap">
          {!initializing && !debouncedSearch && typeFilter === "all" && genIdx === 0 && !showFavsOnly && allList.length > 0 && (
            <DailyBanner
              allList={allList} thaiArr={thaiArr} jpArr={jpArr}
              lang={lang} cachedFetch={cachedFetch} onOpen={handleSelect}
            />
          )}
          {initializing ? (
            <div className="grid">
              {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : showFavsOnly && favorites.length === 0 ? (
            <div className="fav-empty-state">
              <div className="fav-empty-heart">♡</div>
              <div className="fav-empty-title">{s.favEmpty}</div>
              <div className="fav-empty-sub">{s.favEmptySub}</div>
            </div>
          ) : stillFilling ? (
            <div className="grid">
              {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={`fill-${i}`} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">🔍</span>
              <div className="empty-title">{s.noResult}</div>
              <div className="empty-sub">{s.noResultSub}</div>
            </div>
          ) : (
            <>
              {/* A chosen region gets the band; "All" keeps the plain heading,
                  because there is no single generation to describe. */}
              {genIdx > 0 && !debouncedSearch && typeFilter === "all" && !showFavsOnly ? (
                <Suspense fallback={null}>
                  <GenerationBand
                    gen={genIdx} lang={lang} pool={loaded}
                    thaiArr={thaiArr} jpArr={jpArr}
                    onOpenTeam={(g) => { setGenIdx(g); setViewState("team"); pushRoute("team", g); }}
                    onOpenQuiz={(g) => { setGenIdx(g); setViewState("games"); pushRoute("games", g); }}
                  />
                </Suspense>
              ) : (
                <div className="section-heading">
                  <span className="section-title">{sectionHeading.title}</span>
                  {/* Back beside the title: it is the result of a filter, not a
                      control, and standing between the pills and the region
                      chips it read as one more thing to press. */}
                  <span className="section-sub" role="status" aria-live="polite">
                    {sectionHeading.sub}
                  </span>
                </div>
              )}
              <div className="grid">
                {filtered.map((p) => (
                  <PokemonCard
                    key={p.id} pokemon={p} onSelect={handleSelect}
                    isFav={favorites.includes(p.id)} onFav={toggleFav}
                    lang={lang} localName={localName(p)}
                  />
                ))}
                {loading && Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={`sk-${i}`} />)}
              </div>
              {(genIdx > 0 || debouncedSearch) && narrowOffset < viewTotal && (
                <div className="load-more-wrap" ref={sentinelRef}>
                  <button className="load-more-btn" disabled={filling}
                    onClick={() => setNarrowOffset(o => o + PAGE_SIZE)}>
                    {filling ? <><div className="load-more-spinner" />{s.loading}</>
                      : s.loadMoreBtn(viewTotal - narrowOffset)}
                  </button>
                </div>
              )}
              {!debouncedSearch && typeFilter === "all" && genIdx === 0 && offset < allList.length && (
                <div className="load-more-wrap" ref={sentinelRef}>
                  <button className="load-more-btn" onClick={loadMore} disabled={loading}>
                    {loading
                      ? <><div className="load-more-spinner" />{s.loading}</>
                      : s.loadMoreBtn(allList.length - offset)}
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      )}

      {/* ── Team Builder ── */}
      {view === "team" && (
        <Suspense fallback={<ViewLoading />}>
          <TeamBuilder
            allList={allList} thaiArr={thaiArr} jpArr={jpArr}
            lang={lang} cachedFetch={cachedFetch}
            genFilter={genIdx} onClearGen={clearGenFilter}
            onClose={() => setView("pokedex")}
          />
        </Suspense>
      )}

      {/* ── GO Tools Hub ── */}
      {view === "gotools" && (
        <Suspense fallback={<ViewLoading />}>
          <GoToolsHub
            allList={allList} loaded={loaded}
            thaiArr={thaiArr} jpArr={jpArr}
            lang={lang} cachedFetch={cachedFetch}
            onOpen={handleSelect}
          />
        </Suspense>
      )}

      {/* ── Raid schedule ── */}
      {view === "raids" && (
        <Suspense fallback={<ViewLoading />}>
          <RaidSchedule
            lang={lang} allList={allList} cachedFetch={cachedFetch}
            onOpenCounters={() => setView("gotools")}
          />
        </Suspense>
      )}

      {/* ── Games Hub ── */}
      {view === "games" && (
        <Suspense fallback={<ViewLoading />}>
          <GamesHub
            allList={allList} loaded={loaded}
            thaiArr={thaiArr} jpArr={jpArr}
            lang={lang} cachedFetch={cachedFetch}
            genIdx={genIdx}
            onOpen={handleSelect}
            onOpenMultiplayer={() => setMultiplayerOpen(true)}
            autoOpenPet={buddyOpenPet}
            onAutoOpened={() => setBuddyOpenPet(false)}
          />
        </Suspense>
      )}

      {/* ── Pokemon Modal ── */}
      {selected && (
        <Suspense fallback={<OverlayLoading />}>
          <PokemonModal
            pokemon={selected}
            onClose={() => setSelected(null)}
            onNavigate={(p) => setSelected(p)}
            lang={lang} thaiArr={thaiArr} jpArr={jpArr}
            speciesCache={speciesCache} evoCache={evoCache} moveCache={moveCache}
            onOpenCardMode={(p) => setCardModePokemon(p)}
            isFav={favorites.includes(selected.id)}
            onFav={toggleFav}
          />
        </Suspense>
      )}

      {/* ── Overlays ── */}
      {birthdayOpen && (
        <Suspense fallback={<OverlayLoading />}>
          <BirthdayPokemon
            lang={lang} thaiArr={thaiArr} jpArr={jpArr}
            cachedFetch={cachedFetch} allList={allList}
            onOpen={(p) => { setBirthdayOpen(false); handleSelect(p); }}
            onClose={() => setBirthdayOpen(false)}
          />
        </Suspense>
      )}
      {tierOpen && (
        <Suspense fallback={<OverlayLoading />}>
          <MetaTierBrowser
            loaded={loaded} allList={allList} thaiArr={thaiArr} jpArr={jpArr}
            lang={lang} cachedFetch={cachedFetch}
            onOpen={(p) => { setTierOpen(false); handleSelect(p); }}
            onClose={() => setTierOpen(false)}
          />
        </Suspense>
      )}
      {multiplayerOpen && (
        <Suspense fallback={<OverlayLoading />}>
          <MultiplayerQuiz
            allList={allList} thaiArr={thaiArr} jpArr={jpArr}
            lang={lang}
            onClose={() => setMultiplayerOpen(false)}
          />
        </Suspense>
      )}
      {cardModePokemon && (
        <Suspense fallback={<OverlayLoading />}>
          <CardMode
            pokemon={cardModePokemon} lang={lang}
            thaiArr={thaiArr} jpArr={jpArr}
            onClose={() => setCardModePokemon(null)}
          />
        </Suspense>
      )}

      {/* ── 📋 Changelog Modal ── */}
      {showChangelog && (
        <Suspense fallback={<OverlayLoading />}>
          <Changelog
            lang={lang}
            onClose={() => setShowChangelog(false)}
          />
        </Suspense>
      )}

      {/* ── 🐾 Roaming buddy ── */}
      <BuddyCompanion
        lang={lang}
        onOpenGame={() => { setView("games"); setBuddyOpenPet(true); }}
      />

      {/* ── 🎵 Music Player + Weather ── */}
      <ScrollToTop />
      <PerfWatcher lang={lang} />
      <Footer lang={lang} />
    </>
  );
}