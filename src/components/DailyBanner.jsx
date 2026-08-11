import { useState, useEffect, useMemo } from "react";
import {
  STRINGS, TYPE_NAMES_TH, TYPE_NAMES_JA,
} from "../data.js";
import {
  typeColor, getArt, getLocalName, getDailyPokemonId,
} from "../utils.js";
import { ChevronRight } from "lucide-react";

const t = (lang, en, th, ja) => (lang === "th" ? th : lang === "ja" ? ja : en);

export default function DailyBanner({ allList, thaiArr, jpArr, lang, cachedFetch, onOpen }) {
  const s = STRINGS[lang];
  const dailyId = useMemo(() => getDailyPokemonId(), []);
  const [pokemon, setPokemon] = useState(null);
  const [loading, setLoading] = useState(true);
  // Genus ("Seed Pokemon") reads better than the raw measurements, but it is a
  // second request that can fail; height and weight already arrived with the
  // Pokemon, so they are the floor rather than a blank line.
  const [genus, setGenus] = useState(null);


  useEffect(() => {
    if (!allList.length) return;
    const entry = allList[dailyId - 1];
    if (!entry) { setLoading(false); return; }
    cachedFetch(entry.url)
      .then(p => { setPokemon(p); setLoading(false); })
      .catch(() => setLoading(false));
    // Plain fetch, not cachedFetch: that helper compacts every response into a
    // Pokemon record and stores it in the detail cache under its id, so putting
    // a species through it would overwrite the real entry for this id.
    fetch(`https://pokeapi.co/api/v2/pokemon-species/${dailyId}`)
      .then(r => r.json())
      .then(sp => {
        const g = sp.genera?.find(x => x.language.name === (lang === "ja" ? "ja" : "en"));
        if (g) setGenus(g.genus);
      })
      .catch(() => {});
  }, [dailyId, allList, cachedFetch, lang]);

  if (loading || !pokemon) {
    return (
      <div className="daily-banner daily-banner-loading">
        <div className="skeleton-pulse" style={{ width: 52, height: 52, borderRadius: "50%" }} />
        <div className="skeleton-pulse skel-line" style={{ height: 16, width: 200 }} />
      </div>
    );
  }

  const mainType = pokemon.types[0]?.type.name ?? "normal";
  const color    = typeColor(mainType);
  const img      = getArt(pokemon);
  const name     = getLocalName(pokemon.id, lang, thaiArr, jpArr) ?? pokemon.name;
  const dateStr  = new Date().toLocaleDateString(
    lang === "th" ? "th-TH" : lang === "ja" ? "ja-JP" : "en-US",
    { day: "numeric", month: "short" });

  return (
    // One line, ~76px tall instead of ~230. The tint is the Pokémon's own type
    // colour, mixed down to a wash so it belongs to the same colour system as
    // the cards below rather than being one fixed green that matched nothing.
    // Text is dark on that wash: white on a pale tint was the least readable
    // thing on the page.
    // The wash is built here with the same hex-alpha steps the cards use in
    // card-img-wrap, rather than a colour-mix in the stylesheet: mixing 26% of
    // the type into the card colour made Bug read as mustard while the Caterpie
    // card beside it was pale green, from the very same token.
    <button type="button" className="daily-strip" onClick={() => onOpen(pokemon)}
      style={{
        "--dtype": color,
        // Stronger than the cards' wash on purpose: this is one banner meant to
        // be noticed, not one of forty tiles meant to sit quietly in a grid.
        background: `linear-gradient(100deg, ${color}66 0%, ${color}33 46%, ${color}12 100%)`,
      }}>
      {/* Pokéball watermark — a flat pair of gradients rather than an image, so
          it costs no request and scales with the banner. */}
      <span className="daily-strip-wm" aria-hidden />
      {img && <img src={img} alt="" className="daily-strip-img" />}

      <span className="daily-strip-text">
        <span className="daily-strip-kicker">
          {s.dailyPokemon} · {dateStr}
        </span>
        <span className="daily-strip-name">
          {name}
          <span className="daily-strip-num">#{String(pokemon.id).padStart(4, "0")}</span>
        </span>
        <span className="daily-strip-meta">
          {genus && <span className="daily-strip-genus">{genus}</span>}
          {genus && <span className="daily-strip-mdot" aria-hidden>·</span>}
          <span>{(pokemon.height / 10).toFixed(1)} m</span>
          <span className="daily-strip-mdot" aria-hidden>·</span>
          <span>{(pokemon.weight / 10).toFixed(1)} kg</span>
        </span>
      </span>

      <span className="daily-strip-right">
      <span className="daily-strip-types">
        {pokemon.types.map((t) => (
          <span key={t.type.name} className="daily-strip-type"
            style={{ "--tt": typeColor(t.type.name) }}>
            {lang === "th" ? (TYPE_NAMES_TH[t.type.name] ?? t.type.name)
              : lang === "ja" ? (TYPE_NAMES_JA[t.type.name] ?? t.type.name)
              : t.type.name}
          </span>
        ))}
      </span>

      {/* A bare chevron said "there is more" without saying what. */}
      <span className="daily-strip-cta">
        {t(lang, `Meet ${name}`, `ดูรายละเอียด`, `くわしく見る`)}
        <ChevronRight size={15} strokeWidth={2.6} aria-hidden />
      </span>
      </span>
    </button>
  );
}
