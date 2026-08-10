import { useState, useRef, memo } from "react";
import { Heart } from "lucide-react";
import { TYPE_NAMES_TH, TYPE_NAMES_JA } from "../data.js";
import { typeColor, typeGlow, padId, getArt } from "../utils.js";

// ─── Skeleton placeholder ─────────────────────────────────────────────────────
export function SkeletonCard() {
  return (
    <div className="poke-card" style={{ cursor:"default", pointerEvents:"none" }}>
      <div className="card-img-wrap" style={{ background:"rgba(144,6,3,0.04)" }}>
        <div className="skeleton-pulse skel-img-circle" />
      </div>
      <div className="card-body">
        <div className="skeleton-pulse skel-line w-40" style={{ marginBottom:6 }} />
        <div className="skeleton-pulse skel-line" style={{ height:20, marginBottom:10 }} />
        <div style={{ display:"flex", gap:6 }}>
          <div className="skeleton-pulse skel-tag" />
          <div className="skeleton-pulse skel-tag" />
        </div>
      </div>
    </div>
  );
}

// ─── Pokemon Card (memoized) ──────────────────────────────────────────────────
const PokemonCard = memo(function PokemonCard({
  pokemon, onSelect, isFav, onFav, lang, localName,
  // ⭐ Compare mode props
  compareMode = false, compareSlot = null, // null | "A" | "B"
  onCompareSelect,
}) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [favAnim, setFavAnim]     = useState(false);
  const favTimerRef = useRef(null);
  const mainType    = pokemon.types[0]?.type.name ?? "normal";
  const color       = typeColor(mainType);
  const img         = getArt(pokemon);
  const displayName = localName ?? pokemon.name;

  const handleClick = (e) => {
    if (compareMode) {
      e.stopPropagation();
      onCompareSelect?.(pokemon);
    } else {
      onSelect(pokemon);
    }
  };

  return (
    <div
      className={`poke-card${compareMode ? " compare-mode" : ""}${compareSlot ? ` slot-${compareSlot.toLowerCase()}` : ""}`}
      onClick={handleClick}
      style={{ "--card-type-color":color, "--card-type-glow":typeGlow(mainType) }}
    >
      {compareSlot && (
        <div className="card-compare-badge">{compareSlot}</div>
      )}

      <div className="card-img-wrap"
        style={{ background:`linear-gradient(180deg, ${color}14 0%, ${color}05 55%, transparent 100%)` }}
      >
        {/* Over the gradient rather than in the body: it saved a whole line of
            card height, and a dex number is a label, not content. */}
        <span className="card-num">{padId(pokemon.id)}</span>
        {!compareMode && (
          <button
            className={`fav-btn${isFav ? " fav-active-state" : ""}${favAnim ? " fav-active" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              onFav(pokemon.id);
              clearTimeout(favTimerRef.current);
              setFavAnim(true);
              favTimerRef.current = setTimeout(() => setFavAnim(false), 400);
            }}
            aria-label="favourite"
          ><Heart size={15} strokeWidth={2.2} fill={isFav ? "currentColor" : "none"} /></button>
        )}

        {img && (
          <img src={img} alt={displayName}
            className={`card-pokemon-img ${imgLoaded?"img-visible":"img-hidden"}`}
            onLoad={()=>setImgLoaded(true)}
            loading="lazy" decoding="async"
          />
        )}
        {!imgLoaded && <div className="skeleton-pulse" style={{ width:100, height:100, borderRadius:"50%" }} />}
      </div>

      <div className="card-body">
        <div className="card-name">{displayName}</div>
        {lang !== "en" && localName && <div className="card-name-en">{pokemon.name}</div>}
        <div className="type-tags">
          {pokemon.types.map((t) => {
            const tn = t.type.name;
            const label = lang === "th" ? (TYPE_NAMES_TH[tn]??tn)
                        : lang === "ja" ? (TYPE_NAMES_JA[tn]??tn) : tn;
            // A soft tint of the type instead of the full-strength fill: at
            // solid saturation two pills out-shouted the Pokémon they belong to.
            return (
              <span key={tn} className="type-tag" style={{ "--tt": typeColor(tn) }}>
                {label}
              </span>
            );
          })}
        </div>
      </div>
      <div className="card-type-bar" style={{ background:color }} />
    </div>
  );
}, (p, n) =>
  p.pokemon.id === n.pokemon.id &&
  p.isFav === n.isFav &&
  p.lang === n.lang &&
  p.localName === n.localName &&
  p.compareMode === n.compareMode &&
  p.compareSlot === n.compareSlot
);

export default PokemonCard;
