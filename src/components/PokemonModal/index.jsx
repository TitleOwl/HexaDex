import { useState, useEffect } from "react";
import { useModalLifecycle } from "../../perfUtils.js";
import { STRINGS, TYPE_NAMES_TH, TYPE_NAMES_JA } from "../../data.js";
import {
  typeColor, getArt, getLocalName,
  buildEvoTree, playCry, playTypeSound,
} from "../../utils.js";
import MoveLearnset from "../MoveLearnset.jsx";
import Pokemon3DViewer from "../Pokemon3DViewer.jsx";
import CatchScreen from "../../catch/CatchScreen.jsx";
import LocationsSection from "../LocationsSection.jsx";
import { ArrowLeft, Heart } from "lucide-react";

import { MODAL_CSS } from "./modalStyles.js";
import TabBar from "./TabBar.jsx";
import AboutTab from "./tabs/AboutTab.jsx";
import StatsTab from "./tabs/StatsTab.jsx";
import EvolutionsTab from "./tabs/EvolutionsTab.jsx";
import SpritesTab from "./tabs/SpritesTab.jsx";
import CatchFab from "./CatchFab.jsx";

import { PASTEL_TYPE_COLORS } from "./palette.js";

export default function PokemonModal({
  pokemon, onClose, onNavigate, lang, thaiArr, jpArr,
  speciesCache, evoCache, moveCache,
  onPlayCry,
  isFav = false, onFav,
}) {
  const [tab, setTab]         = useState(0);
  const [species, setSpecies] = useState(null);
  const [evo, setEvo]         = useState(null);
  const [evoImgs, setEvoImgs] = useState({});
  const [view3d, setView3d]   = useState(false);
  const [catchOpen, setCatchOpen] = useState(false);
  useModalLifecycle(onClose);

  // Switching Pokémon resets the hero back to the flat 2D card.
  useEffect(() => { setTab(0); setView3d(false); }, [pokemon.id]);

  useEffect(() => {
    const t = pokemon.types[0]?.type.name ?? "normal";
    const timer = setTimeout(() => playTypeSound(t), 200);
    return () => clearTimeout(timer);
  }, [pokemon.id]);

  const s        = STRINGS[lang];
  // Normal's pastel is a desaturated grey-violet, and a whole hero panel in it
  // reads as "this page is disabled" rather than as a colour choice. A Normal
  // Pokémon with a second type borrows that one (Pidgey becomes Flying blue);
  // a pure Normal gets a warm cream instead of the grey.
  const firstType  = pokemon.types[0]?.type.name ?? "normal";
  const secondType = pokemon.types[1]?.type.name ?? null;
  const mainType   = (firstType === "normal" && secondType) ? secondType : firstType;
  const color = mainType === "normal"
    ? "#E8DCC4"
    : (PASTEL_TYPE_COLORS[mainType] ?? typeColor(mainType));
  const img      = getArt(pokemon);
  const total    = pokemon.stats.reduce((a, st) => a + st.base_stat, 0);
  const localName = getLocalName(pokemon.id, lang, thaiArr, jpArr);
  const heroName  = localName ?? pokemon.name;

  useEffect(() => {
    setSpecies(null); setEvo(null); setEvoImgs({});
    const hit = speciesCache.current.get(pokemon.id);
    if (hit) { setSpecies(hit.species); setEvo(hit.chain); setEvoImgs(hit.evoImgs); return; }

    fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokemon.id}`)
      .then(r => r.json())
      .then(async data => {
        setSpecies(data);
        let chain = evoCache.current.get(data.evolution_chain.url);
        if (!chain) {
          const ev = await fetch(data.evolution_chain.url).then(r => r.json());
          chain = buildEvoTree(ev.chain);
          evoCache.current.set(data.evolution_chain.url, chain);
        }
        setEvo(chain);
        // Collect all ids from tree
        const collectIds = (node) => [node.id, ...node.children.flatMap(collectIds)];
        const allIds = collectIds(chain);
        const imgs = {};
        await Promise.allSettled(allIds.map(async id => {
          const d = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`).then(r => r.json());
          // Everything the Evolution tab needs per form: art (normal +
          // shiny), its OWN types, base stats for the growth badges, and
          // height/weight for the true-size comparison. All of it already
          // arrives in this one response, so nothing extra is fetched.
          const stats = d.stats ?? [];
          imgs[id] = {
            img: getArt(d),
            shiny: d.sprites?.other?.["official-artwork"]?.front_shiny
              ?? d.sprites?.front_shiny ?? null,
            types: d.types?.map(t => t.type.name) ?? [],
            stats: Object.fromEntries(stats.map(st => [st.stat.name, st.base_stat])),
            total: stats.reduce((a, st) => a + st.base_stat, 0),
            height: d.height,
            weight: d.weight,
            apiName: d.name,
          };
        }));
        setEvoImgs(imgs);
        speciesCache.current.set(pokemon.id, { species:data, chain, evoImgs:imgs });
      });
  }, [pokemon.id, speciesCache, evoCache]);

  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const playCryTracked = (id) => {
    playCry(id, 0.4, pokemon.name);
    onPlayCry?.();
  };

  const typeName = (tn) =>
    lang === "th" ? (TYPE_NAMES_TH[tn]??tn) : lang === "ja" ? (TYPE_NAMES_JA[tn]??tn) : tn;

  const tabLabels = [s.about, s.baseStats, s.evolutions, s.tabs[4], s.sprites, s.locations];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <style>{MODAL_CSS}</style>

      {/* Whole card takes the pastel type color; the white sheet with big
          rounded corners sits on top and the artwork straddles the seam. */}
      <div className="modal detail-modal" style={{ background: color }} onClick={(e) => e.stopPropagation()}>

        <div className="modal-hero">
          <div className="hero-ball-outline" aria-hidden />

          <div className="hero-top-row">
            <button className="hero-back-btn" onClick={onClose} aria-label={lang === "th" ? "ปิด" : "Close"} title={lang === "th" ? "ปิด" : "Close"}>
              <ArrowLeft size={22} strokeWidth={2.4} />
            </button>
            {onFav && (
              <button
                className={`hero-fav-btn${isFav ? " active" : ""}`}
                onClick={() => onFav(pokemon.id)}
                aria-label={isFav ? s.removeFav : s.addFav}
                title={isFav ? s.removeFav : s.addFav}
              >
                <Heart size={20} strokeWidth={2.2} fill={isFav ? "currentColor" : "none"} />
              </button>
            )}
          </div>

          <div className="hero-title-row">
            <h1 className="hero-name" onClick={() => playCryTracked(pokemon.id)} title={s.playCry}>
              {heroName}
            </h1>
            {/* Single toggle sitting right after the name — its label is the
                mode you'll get, not the one you're in. */}
            <button
              className={`hero-3d-btn${view3d ? " active" : ""}`}
              onClick={() => setView3d(v => !v)}
              aria-pressed={view3d}
              title={view3d ? "2D" : "3D"}
            >
              {view3d ? "2D" : "3D"}
            </button>
            <span className="hero-dex-num">#{String(pokemon.id).padStart(3, "0")}</span>
          </div>
          {lang !== "en" && localName && <div className="hero-name-en">{pokemon.name}</div>}

          <div className="hero-type-tags">
            {pokemon.types.map(t => (
              <span key={t.type.name} className="hero-type-tag">{typeName(t.type.name)}</span>
            ))}
          </div>

          {view3d ? (
            <div className="hero-3d-wrap">
              <div className="hero-3d-hint">
                {lang === "th" ? "แตะที่โปเกมอนเพื่อให้ขยับและฟังเสียงร้อง · กด AR ดูในโลกจริง"
                  : lang === "ja" ? "ポケモンをタップで動かす・鳴き声 · ARで現実世界へ"
                  : "Tap the Pokémon to animate it and hear its cry · Use AR to view in your room"}
              </div>
              <Pokemon3DViewer
                pokemonId={pokemon.id}
                pokemonName={heroName}
                color={color}
                isShiny={false}
                lang={lang}
                onTap={() => playCryTracked(pokemon.id)}
              />
            </div>
          ) : (
            <div className="hero-art-wrap">
              {img && (
                <img
                  src={img}
                  alt={heroName}
                  className="hero-art"
                  draggable={false}
                  onDragStart={(e) => e.preventDefault()}
                  onClick={() => playCryTracked(pokemon.id)}
                />
              )}
            </div>
          )}

          {/* Same button, same corner, in both 2D and 3D */}
          <CatchFab onClick={() => setCatchOpen(true)} lang={lang} />
        </div>

        <div className="modal-body detail-sheet" style={{ "--modal-accent": color }}>
          <TabBar tabs={tabLabels} tab={tab} setTab={setTab} />

          {/* key={tab} remounts the wrapper so the slide-in plays per switch */}
          <div key={tab} className="tab-content-anim">
            {tab === 0 && <AboutTab pokemon={pokemon} species={species} s={s} lang={lang} />}

            {tab === 1 && <StatsTab stats={pokemon.stats} total={total} types={pokemon.types} lang={lang} s={s} name={heroName} />}

            {tab === 2 && (
              <EvolutionsTab
                evo={evo}
                currentId={pokemon.id}
                evoImgs={evoImgs}
                lang={lang}
                thaiArr={thaiArr}
                jpArr={jpArr}
                onNavigate={onNavigate}
                onPlayCry={onPlayCry}
                s={s}
              />
            )}

            {tab === 3 && <MoveLearnset pokemonId={pokemon.id} lang={lang} moveCache={moveCache} />}

            {tab === 4 && <SpritesTab pokemonId={pokemon.id} sprites={pokemon.sprites} lang={lang} s={s} />}

            {tab === 5 && <LocationsSection pokemonId={pokemon.id} lang={lang} s={s} />}
          </div>
        </div>
      </div>

      {/* Pokémon GO-style fullscreen catch overlay */}
      {catchOpen && (
        <CatchScreen
          pokemon={pokemon}
          lang={lang}
          thaiArr={thaiArr}
          jpArr={jpArr}
          onClose={() => setCatchOpen(false)}
        />
      )}
    </div>
  );
}
