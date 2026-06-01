import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import "./App.css";

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

// ─── Core Components ─────────────────────────────────────────
import Header             from "./components/Header.jsx";
import PokemonCard, { SkeletonCard } from "./components/PokemonCard.jsx";
import PokemonModal       from "./components/PokemonModal.jsx";
import TeamBuilder        from "./components/TeamBuilder.jsx";
import CompareView        from "./components/CompareView.jsx";
import DailyBanner        from "./components/DailyBanner.jsx";
import Footer             from "./components/Footer.jsx";

// ─── Hubs (main tabs) ────────────────────────────────────────
import GoToolsHub         from "./components/GoToolsHub.jsx";
import GamesHub           from "./components/GamesHub.jsx";

// ─── Overlays ────────────────────────────────────────────────
import CardMode           from "./components/CardMode.jsx";
import BirthdayPokemon    from "./components/BirthdayPokemon.jsx";
import MetaTierBrowser    from "./components/MetaTierBrowser.jsx";
import MultiplayerQuiz    from "./components/MultiplayerQuiz.jsx";

// ─── Search add-ons (passed to Header) ───────────────────────
import VoiceSearch        from "./components/VoiceSearch.jsx";
import SnapSearch         from "./components/SnapSearch.jsx";

// ─── 🎵 Music Player (NEW) ───────────────────────────────────
import MusicPlayer        from "./components/MusicPlayer.jsx";
import WeatherStatus      from "./components/WeatherStatus.jsx";


export default function App() {
  // ─── Language & Sound ──────────────────────────────────────
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem("pkdx_lang") ?? "en"; } catch { return "en"; }
  });
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());

  const { theme, toggleTheme, autoMode, enableAuto } = useTheme();
  useEffect(() => { try { localStorage.setItem("pkdx_lang", lang); } catch {} }, [lang]);

  // 🏷️ Update document title with HexaDex branding
  useEffect(() => {
    const title = lang === "th" ? "HexaDex — สารานุกรมโปเกม่อนสุดล้ำ"
                : lang === "ja" ? "HexaDex — 究極のポケモン図鑑"
                : "HexaDex — The Hexagonal Pokédex";
    document.title = title;
  }, [lang]);

  // ─── View Router (5 main tabs) ─────────────────────────────
  // pokedex | compare | team | gotools | games
  const [view, setView] = useState("pokedex");

  // ─── 🎵 Music: current generation for BGM switching ────────
  const [currentGen, setCurrentGen] = useState(null);

  // ─── Overlays ──────────────────────────────────────────────
  const [birthdayOpen, setBirthdayOpen]     = useState(false);
  const [tierOpen, setTierOpen]             = useState(false);
  const [multiplayerOpen, setMultiplayerOpen] = useState(false);
  const [cardModePokemon, setCardModePokemon] = useState(null);

  // ─── Pokemon Data ──────────────────────────────────────────
  const [allList, setAllList] = useState([]);
  const [loaded, setLoaded]   = useState([]);
  const [offset, setOffset]   = useState(0);
  const [search, setSearch]   = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [genIdx, setGenIdx]   = useState(0);
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem("pkdx_favs") ?? "[]"); } catch { return []; }
  });
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
    try { localStorage.setItem("pkdx_favs", JSON.stringify(favorites)); } catch {}
  }, [favorites]);

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

      const initial = list.slice(0, PAGE_SIZE);
      const fetched = await Promise.all(initial.map(p => cachedFetch(p.url)));
      if (cancelled) return;
      setLoaded(fetched);
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
  const localName = useCallback(
    (p) => getLocalName(p.id, lang, thaiArr, jpArr),
    [lang, thaiArr, jpArr]
  );

  const filtered = useMemo(() => {
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
  }, [loaded, genIdx, typeFilter, debouncedSearch, localName]);

  const sectionHeading = useMemo(() => {
    const s = STRINGS[lang];
    if (debouncedSearch) return s.resultsFor(debouncedSearch);
    if (typeFilter !== "all") {
      const tName = lang === "th" ? (TYPE_NAMES_TH[typeFilter] ?? typeFilter)
                  : lang === "ja" ? (TYPE_NAMES_JA[typeFilter] ?? typeFilter)
                  : typeFilter;
      return s.typeHeading(tName, filtered.length);
    }
    const gen = GENERATIONS[genIdx];
    const regionName = gen[lang] ?? gen.en;
    return `${regionName} · ${filtered.length} ${s.loaded}`;
  }, [lang, debouncedSearch, typeFilter, genIdx, filtered.length]);

  // ─── Helpers ───────────────────────────────────────────────
  const handleSelect = useCallback((p) => setSelected(p), []);
  const toggleFav = useCallback((id) => {
    setFavorites(f => f.includes(id) ? f.filter(x => x !== id) : [...f, id]);
  }, []);

  // ─── 🎵 Gen change handler (for music + filter) ───────────
  // Updates both pokedex filter AND music region together
  const handleGenChange = useCallback((idx) => {
    setGenIdx(idx);
    // genIdx 0 = "All" → null (random tracks)
    // genIdx 1-9 = Gen 1-9 → matches REGION_MUSIC keys
    setCurrentGen(idx === 0 ? null : idx);
  }, []);

  const s = STRINGS[lang];

  // ─── Voice & Snap UI (placed in Header search bar) ─────────
  const voiceSearchEl = !initializing ? (
    <VoiceSearch
      allList={allList} thaiArr={thaiArr} jpArr={jpArr} lang={lang}
      onOpen={handleSelect} onSetSearch={setSearch}
    />
  ) : null;

  const snapSearchEl = !initializing ? (
    <SnapSearch
      loaded={loaded} thaiArr={thaiArr} jpArr={jpArr} lang={lang}
      onOpen={handleSelect}
    />
  ) : null;

  return (
    <>
      <Header
        lang={lang} setLang={setLang}
        soundOn={soundOn} setSoundOn={setSoundOn}
        theme={theme} toggleTheme={toggleTheme}
        autoMode={autoMode} enableAuto={enableAuto}
        view={view} setView={setView}
        search={search} setSearch={setSearch}
        typeFilter={typeFilter} setTypeFilter={setTypeFilter}
        genIdx={genIdx} setGenIdx={handleGenChange}
        filteredCount={filtered.length}
        totalCount={allList.length}
        thaiLoading={thaiLoading} jpLoading={jpLoading}
        onOpenBirthday={() => setBirthdayOpen(true)}
        onOpenTier={() => setTierOpen(true)}
        onOpenMultiplayer={() => setMultiplayerOpen(true)}
        voiceSearchEl={voiceSearchEl}
        snapSearchEl={snapSearchEl}
      />

      {/* ── Pokédex View ── */}
      {view === "pokedex" && (
        <main className="grid-wrap">
          {!initializing && !debouncedSearch && typeFilter === "all" && genIdx === 0 && allList.length > 0 && (
            <DailyBanner
              allList={allList} thaiArr={thaiArr} jpArr={jpArr}
              lang={lang} cachedFetch={cachedFetch} onOpen={handleSelect}
            />
          )}

          {initializing ? (
            <div className="grid">
              {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">🔍</span>
              <div className="empty-title">{s.noResult}</div>
              <div className="empty-sub">{s.noResultSub}</div>
            </div>
          ) : (
            <>
              <div className="section-heading">{sectionHeading}</div>
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
              {!debouncedSearch && typeFilter === "all" && genIdx === 0 && offset < allList.length && (
                <div className="load-more-wrap">
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

      {/* ── Compare View ── */}
      {view === "compare" && (
        <CompareView
          allList={allList} thaiArr={thaiArr} jpArr={jpArr}
          lang={lang} cachedFetch={cachedFetch}
        />
      )}

      {/* ── Team Builder ── */}
      {view === "team" && (
        <TeamBuilder
          allList={allList} thaiArr={thaiArr} jpArr={jpArr}
          lang={lang} cachedFetch={cachedFetch}
          onClose={() => setView("pokedex")}
        />
      )}

      {/* ── GO Tools Hub ── */}
      {view === "gotools" && (
        <GoToolsHub
          allList={allList} loaded={loaded}
          thaiArr={thaiArr} jpArr={jpArr}
          lang={lang} cachedFetch={cachedFetch}
          onOpen={handleSelect}
        />
      )}

      {/* ── Games Hub ── */}
      {view === "games" && (
        <GamesHub
          allList={allList} loaded={loaded}
          thaiArr={thaiArr} jpArr={jpArr}
          lang={lang} cachedFetch={cachedFetch}
          genIdx={genIdx}
          onOpen={handleSelect}
          onOpenMultiplayer={() => setMultiplayerOpen(true)}
        />
      )}

      {/* ── Pokemon Modal ── */}
      {selected && (
        <PokemonModal
          pokemon={selected}
          onClose={() => setSelected(null)}
          onNavigate={(p) => setSelected(p)}
          lang={lang} thaiArr={thaiArr} jpArr={jpArr}
          speciesCache={speciesCache} evoCache={evoCache} moveCache={moveCache}
          onOpenCardMode={(p) => setCardModePokemon(p)}
        />
      )}

      {/* ── Overlays ── */}
      {birthdayOpen && (
        <BirthdayPokemon
          lang={lang} thaiArr={thaiArr} jpArr={jpArr}
          cachedFetch={cachedFetch} allList={allList}
          onOpen={(p) => { setBirthdayOpen(false); handleSelect(p); }}
          onClose={() => setBirthdayOpen(false)}
        />
      )}

      {tierOpen && (
        <MetaTierBrowser
          loaded={loaded} allList={allList} thaiArr={thaiArr} jpArr={jpArr}
          lang={lang} cachedFetch={cachedFetch}
          onOpen={(p) => { setTierOpen(false); handleSelect(p); }}
          onClose={() => setTierOpen(false)}
        />
      )}

      {multiplayerOpen && (
        <MultiplayerQuiz
          allList={allList} thaiArr={thaiArr} jpArr={jpArr}
          lang={lang}
          onClose={() => setMultiplayerOpen(false)}
        />
      )}

      {cardModePokemon && (
        <CardMode
          pokemon={cardModePokemon} lang={lang}
          thaiArr={thaiArr} jpArr={jpArr}
          onClose={() => setCardModePokemon(null)}
        />
      )}

      {/* ── 🎵 Music Player (always mounted, floats bottom-left) ── */}
      <MusicPlayer currentGen={currentGen} lang={lang} />
      <WeatherStatus lang={lang} />

      <Footer lang={lang} />
    </>
  );
}