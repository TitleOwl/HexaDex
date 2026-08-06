import { useState, useEffect } from "react";
import { useModalLifecycle } from "../../perfUtils.js";
import { STRINGS, TYPE_NAMES_TH, TYPE_NAMES_JA } from "../../data.js";
import {
  typeColor, padId, getArt, getLocalName,
  buildEvoTree, playCry, playTypeSound,
} from "../../utils.js";
import Pokemon3DViewer  from "../Pokemon3DViewer.jsx";
import TypeAmbiance     from "../TypeAmbiance.jsx";
import CatchAnimation   from "../CatchAnimation.jsx";
import MoveLearnset     from "../MoveLearnset.jsx";
import LocationsSection from "../LocationsSection.jsx";
import GoMovesSection   from "../GoMovesSection.jsx";
import {
  Sparkles, Layers, Volume2, Heart, X,
} from "lucide-react";

import { MODAL_CSS } from "./modalStyles.js";
import TabDropdown from "./TabDropdown.jsx";
import CryStylePicker from "./CryStylePicker.jsx";
import CatchHintBelow3D from "./CatchHintBelow3D.jsx";
import StatsTab from "./tabs/StatsTab.jsx";
import TypeMatchupTab from "./tabs/TypeMatchupTab.jsx";
import AbilitiesTab from "./tabs/AbilitiesTab.jsx";
import EvolutionsTab from "./tabs/EvolutionsTab.jsx";
import SpritesTab from "./tabs/SpritesTab.jsx";
import BreedingTab from "./tabs/BreedingTab.jsx";

export default function PokemonModal({
  pokemon, onClose, onNavigate, lang, thaiArr, jpArr,
  speciesCache, evoCache, moveCache,
  onPlayCry, onOpenCardMode,
  isFav = false, onFav,
}) {
  const [tab, setTab]         = useState(-1); // -1 = nothing shown until a section is picked
  const [species, setSpecies] = useState(null);
  const [evo, setEvo]         = useState(null);
  const [evoImgs, setEvoImgs] = useState({});
  const [view3d,  setView3d]  = useState(false);
  const [isShiny, setIsShiny] = useState(false);
  const [catchOpen, setCatchOpen] = useState(false);
  useModalLifecycle(onClose);

  useEffect(() => { setTab(-1); }, [pokemon.id]); // start collapsed — nothing shown until "Detail" is opened

  useEffect(() => {
    const t = pokemon.types[0]?.type.name ?? "normal";
    const timer = setTimeout(() => playTypeSound(t), 200);
    return () => clearTimeout(timer);
  }, [pokemon.id]);

  const s        = STRINGS[lang];
  const mainType = pokemon.types[0]?.type.name ?? "normal";
  const color    = typeColor(mainType);
  const img      = getArt(pokemon);
  const total    = pokemon.stats.reduce((a, st) => a + st.base_stat, 0);
  const localName = getLocalName(pokemon.id, lang, thaiArr, jpArr);
  const heroName  = localName ?? pokemon.name;

  // Shiny artwork URL for 2D mode
  const shinyArt = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/${pokemon.id}.png`;
  const displayImg = isShiny ? shinyArt : img;

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
          imgs[id] = getArt(d);
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

  const flavor = species?.flavor_text_entries?.find(f =>
    f.language.name === (lang === "th" ? "th" : lang === "ja" ? "ja" : "en")
  )?.flavor_text?.replace(/\f/g," ") ??
    species?.flavor_text_entries?.find(f => f.language.name === "en")?.flavor_text?.replace(/\f/g," ");

  const genus = species?.genera?.find(g =>
    g.language.name === (lang === "th" ? "th" : lang === "ja" ? "ja" : "en")
  )?.genus ?? species?.genera?.find(g => g.language.name === "en")?.genus;

  const playCryTracked = (id) => {
    playCry(id, 0.4, pokemon.name);
    onPlayCry?.();
  };

  const typeName = (tn) =>
    lang === "th" ? (TYPE_NAMES_TH[tn]??tn) : lang === "ja" ? (TYPE_NAMES_JA[tn]??tn) : tn;

  return (
    <div className="modal-overlay" onClick={onClose}>
      {/* ─── Modal Redesign v3 — scoped style overrides (see modalStyles.js) ─── */}
      <style>{MODAL_CSS}</style>

      <div className="modal" onClick={(e) => e.stopPropagation()}>

        {/* Hero — themed background per type in 3D mode */}
        <div
          className={`modal-hero${view3d ? " hero-3d" : ""}`}
          style={view3d
            ? { background:`linear-gradient(180deg, ${color}59 0%, ${color}26 34%, #15121c 64%)` }
            : { backgroundImage:`linear-gradient(180deg, ${color}c2 0%, ${color}5c 40%, ${color}24 68%, transparent 90%)` }}
        >
          <button className="modal-close" onClick={onClose}><X size={17} strokeWidth={2.4} /></button>

          {/* Top controls — always at edges */}
          <div className="hero-view-controls">
            <button
              className={`hero-shiny-btn${isShiny ? " active" : ""}`}
              onClick={() => setIsShiny(v => !v)}
              title={isShiny ? "Normal" : "Shiny"}
            ><Sparkles size={17} strokeWidth={2.2} /></button>
            {/* Card Mode button */}
            {onOpenCardMode && (
              <button
                className="hero-card-btn"
                onClick={() => onOpenCardMode(pokemon)}
                title="View as Trading Card"
              ><Layers size={17} strokeWidth={2.2} /></button>
            )}
            <div className="hero-view-toggle">
              <button className={`hv-btn${!view3d ? " active" : ""}`} onClick={() => setView3d(false)}>2D</button>
              <button className={`hv-btn${view3d ? " active" : ""}`} onClick={() => setView3d(true)}>3D</button>
            </div>
          </div>

          {/* ⭐ Catch FAB — small Pokeball by default, expands to show text on hover */}
          {!view3d && (
            <button
              className="catch-fab"
              onClick={() => setCatchOpen(true)}
              title={lang==="th" ? "ลองจับโปเกม่อนนี้!"
                   : lang==="ja" ? "捕まえてみよう！"
                   : "Try catching this Pokémon!"}>
              <span className="catch-fab-ball">
                <img
                  src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png"
                  width="32"
                  height="32"
                  alt=""
                  draggable={false}
                  style={{
                    imageRendering: "pixelated",
                    animation: "catch-cta-ball-spin 4s linear infinite",
                    filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.4))",
                  }}
                />
              </span>
              <span className="catch-fab-label">
                {lang==="th" ? "ลองจับ!"
                 : lang==="ja" ? "捕まえる！"
                 : "Try Catch!"}
              </span>
            </button>
          )}

          {/* 2D mode */}
          {!view3d && (
            <>
              <div className="modal-ball-wm" style={{ color }} aria-hidden />
              <div className="modal-accent" style={{ background: color, color: color }} aria-hidden />
              <div className="modal-genus">{genus ?? "Pokémon"} · {padId(pokemon.id)}</div>
              <div className="modal-name-row">
                <div className="modal-name" onClick={() => playCryTracked(pokemon.id)} title={s.playCry}>
                  {heroName}
                  {isShiny && <span className="hero-shiny-badge"><Sparkles size={15} strokeWidth={2.4} /></span>}
                  <span className="modal-name-cry"><Volume2 size={17} strokeWidth={2.2} /></span>
                </div>
                {onFav && (
                  <button
                    className={`modal-fav-btn${isFav ? " active" : ""}`}
                    onClick={() => onFav(pokemon.id)}
                    title={isFav ? s.removeFav : s.addFav}
                  >
                    <span className="modal-fav-icon">
                      <Heart size={18} strokeWidth={2.2} fill={isFav ? "currentColor" : "none"} />
                    </span>
                  </button>
                )}
              </div>
              <CryStylePicker lang={lang} />
              {lang !== "en" && localName && <div className="modal-name-en">{pokemon.name}</div>}
              <div className="modal-sprite-wrap">
                <div className="modal-sprite-glow" aria-hidden
                  style={{ background:`radial-gradient(circle, ${color}3a 0%, ${color}14 42%, transparent 68%)` }} />
                {displayImg && (
                  <img
                    src={displayImg}
                    alt={heroName}
                    className="modal-hero-img"
                    onClick={() => playCryTracked(pokemon.id)}
                    onError={(e) => { if (isShiny && img) e.currentTarget.src = img; }}
                    style={{
                      width: "min(68%, 270px)",
                      height: "auto",
                      maxHeight: 234,
                      objectFit: "contain",
                      filter: "drop-shadow(0 14px 28px rgba(0,0,0,0.25))",
                    }}
                  />
                )}
                <div className="modal-shadow-ring" />
              </div>
            </>
          )}

          {/* 3D mode */}
          {view3d && (
            <div className="hero-bg-layer hero-3d-stage" aria-hidden>
              <div className="stage-glow" style={{ background:`radial-gradient(circle, ${color}80 0%, ${color}2e 40%, transparent 66%)` }} />
              <div className="stage-floor" />
              <div className="stage-pad" style={{ background:`radial-gradient(ellipse, ${color}80, transparent 70%)` }} />
              <TypeAmbiance type={mainType} />
            </div>
          )}
          {view3d && (
            <div className="hero-3d-content">
              <div className="hero-3d-name" onClick={() => playCryTracked(pokemon.id)}>
                {heroName}
                {isShiny && <span className="hero-shiny-badge"><Sparkles size={14} strokeWidth={2.4} /> Shiny</span>}
              </div>
              <Pokemon3DViewer
                pokemonId={pokemon.id}
                pokemonName={heroName}
                color={color}
                isShiny={isShiny}
                lang={lang}
                types={pokemon.types}
              />
              <CatchHintBelow3D setCatchOpen={setCatchOpen} lang={lang} />
              <div className="hero-3d-hint">
                {lang === "th" ? "คลิกที่โปเกมอนเพื่อเปลี่ยนท่า · กด AR ดูในโลกจริง"
                 : lang === "ja" ? "ポケモンをクリックでポーズ切替 · ARで現実世界へ"
                 : "Tap Pokémon to change pose · Use AR to view in your room"}
              </div>
            </div>
          )}

          <div className="modal-type-tags" style={view3d ? { marginTop:8 } : {}}>
            {pokemon.types.map(t => (
              <span key={t.type.name} className="modal-type-tag"
                style={{ background: typeColor(t.type.name), borderColor: typeColor(t.type.name), color: "#fff" }}>
                {typeName(t.type.name)}
              </span>
            ))}
          </div>
        </div>

        <div className="modal-body"
          style={{ background:`linear-gradient(180deg, ${color}2e 0%, ${color}1b 35%, ${color}0c 70%, transparent 100%)` }}>
          <div className="info-row">
            <div className="info-pill"><div className="info-pill-label">{s.height}</div>
              <div className="info-pill-val">{(pokemon.height/10).toFixed(1)} m</div></div>
            <div className="info-pill"><div className="info-pill-label">{s.weight}</div>
              <div className="info-pill-val">{(pokemon.weight/10).toFixed(1)} kg</div></div>
            <div className="info-pill"><div className="info-pill-label">{s.baseExp}</div>
              <div className="info-pill-val">{pokemon.base_experience ?? "—"}</div></div>
          </div>

          {flavor && (
            <div className="flavor-box" style={{ "--modal-accent":color }}>"{flavor}"</div>
          )}

          <TabDropdown tabs={s.tabs} tab={tab} setTab={setTab} lang={lang} />

          {tab === 0 && <StatsTab stats={pokemon.stats} total={total} s={s} />}

          {tab === 1 && <TypeMatchupTab types={pokemon.types} lang={lang} s={s} />}

          {tab === 2 && <AbilitiesTab abilities={pokemon.abilities} s={s} />}

          {tab === 3 && (
            <EvolutionsTab
              evo={evo}
              currentId={pokemon.id}
              evoImgs={evoImgs}
              lang={lang}
              thaiArr={thaiArr}
              jpArr={jpArr}
              color={color}
              onNavigate={onNavigate}
              s={s}
            />
          )}

          {tab === 4 && <MoveLearnset pokemonId={pokemon.id} lang={lang} moveCache={moveCache} />}

          {tab === 5 && <GoMovesSection pokemon={pokemon} lang={lang} />}

          {tab === 6 && <SpritesTab pokemonId={pokemon.id} sprites={pokemon.sprites} lang={lang} s={s} />}

          {tab === 7 && <BreedingTab species={species} pokemon={pokemon} s={s} />}
          {tab === 8 && <LocationsSection pokemonId={pokemon.id} lang={lang} s={s} />}
        </div>
      </div>

      {/* ─── Pokemon GO-style fullscreen catch overlay ─── */}
      {catchOpen && (
        <CatchAnimation
          pokemon={pokemon}
          lang={lang}
          shiny={isShiny}
          onClose={() => setCatchOpen(false)}
        />
      )}
    </div>
  );
}
