import { useState, useEffect, useRef, useMemo } from "react";
import { Images, ChevronLeft, ChevronRight, X } from "lucide-react";

const t = (lang, en, th, ja) => (lang === "th" ? th : lang === "ja" ? ja : en);

const BASE = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";

/**
 * One entry per game era, oldest first — the row IS a time axis, so the order
 * is the content, not a presentation choice.
 *
 * `back` and `shiny` say what the sprite set actually contains: Gen I shipped
 * no shiny sprites at all, and from Gen VI the repo has no back sprites. A
 * column that cannot answer the current view is shown empty rather than
 * dropped, because a gap in a timeline reads as a gap in history.
 */
const ERAS = [
  { gen: "I",    game: "Red/Blue",             short: "Red/Blue",  year: "1996", path: "versions/generation-i/red-blue",              back: true,  shiny: false },
  { gen: "I",    game: "Yellow",               short: "Yellow",    year: "1998", path: "versions/generation-i/yellow",                back: true,  shiny: false },
  { gen: "II",   game: "Gold",                 short: "Gold",      year: "1999", path: "versions/generation-ii/gold",                 back: true,  shiny: true  },
  { gen: "II",   game: "Crystal",              short: "Crystal",   year: "2000", path: "versions/generation-ii/crystal",              back: true,  shiny: true  },
  { gen: "III",  game: "Ruby/Sapphire",        short: "Ruby",      year: "2002", path: "versions/generation-iii/ruby-sapphire",       back: true,  shiny: true  },
  { gen: "III",  game: "Emerald",              short: "Emerald",   year: "2004", path: "versions/generation-iii/emerald",             back: false, shiny: true  },
  { gen: "III",  game: "FireRed/LeafGreen",    short: "FireRed",   year: "2004", path: "versions/generation-iii/firered-leafgreen",   back: true,  shiny: true  },
  { gen: "IV",   game: "Diamond/Pearl",        short: "Diamond",   year: "2006", path: "versions/generation-iv/diamond-pearl",        back: true,  shiny: true  },
  { gen: "IV",   game: "Platinum",             short: "Platinum",  year: "2008", path: "versions/generation-iv/platinum",             back: true,  shiny: true  },
  { gen: "IV",   game: "HeartGold/SoulSilver", short: "HeartGold", year: "2009", path: "versions/generation-iv/heartgold-soulsilver", back: true,  shiny: true  },
  { gen: "V",    game: "Black/White",          short: "Black",     year: "2010", path: "versions/generation-v/black-white",           back: true,  shiny: true  },
  { gen: "VI",   game: "X/Y",                  short: "X/Y",       year: "2013", path: "versions/generation-vi/x-y",                  back: false, shiny: true  },
  { gen: "VII",  game: "Sun/Moon",             short: "Sun/Moon",  year: "2017", path: "versions/generation-vii/ultra-sun-ultra-moon", back: false, shiny: true },
  { gen: "VIII", game: "Official Artwork",     short: "Artwork",   year: "2019", path: "other/official-artwork",                      back: false, shiny: true  },
];

/** URL for one era in the current view, or null when that era has no such set. */
function spriteUrl(era, id, side, shiny) {
  if (side === "back" && !era.back) return null;
  if (shiny && !era.shiny) return null;
  const parts = [BASE, era.path];
  if (side === "back") parts.push("back");
  if (shiny) parts.push("shiny");
  return `${parts.join("/")}/${id}.png`;
}

function Segmented({ options, value, onChange, label }) {
  return (
    <div className="st-seg" role="group" aria-label={label}>
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          className={`st-seg-btn${value === o.value ? " on" : ""}`}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function SpriteTimeline({ pokemonId, lang }) {
  const [idx, setIdx]     = useState(0);
  const [side, setSide]   = useState("front");
  const [shiny, setShiny] = useState(false);
  // Which URLs 404'd. The repo's coverage is uneven beyond the flags above,
  // so the only reliable signal for some entries is the image failing.
  const [broken, setBroken] = useState({});
  const [zoom, setZoom]   = useState(false);
  const railRef = useRef(null);
  const cellRefs = useRef([]);

  // Reset during render rather than in an effect: an effect would paint the
  // previous Pokémon's selection for one frame before correcting it, and it is
  // the pattern React documents for "adjust state when a prop changes".
  const [lastId, setLastId] = useState(pokemonId);
  if (lastId !== pokemonId) {
    setLastId(pokemonId);
    setIdx(0); setBroken({}); setZoom(false);
  }

  const urls = useMemo(
    () => ERAS.map(e => spriteUrl(e, pokemonId, side, shiny)),
    [pokemonId, side, shiny]
  );

  const available = (i) => urls[i] && !broken[urls[i]];

  // Keep the selection on screen when it moves, including the jump back to the
  // first era when the Pokémon changes.
  useEffect(() => {
    const el = cellRefs.current[idx];
    if (el) el.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [idx, pokemonId]);

  const step = (d) => setIdx(i => Math.min(ERAS.length - 1, Math.max(0, i + d)));

  const era = ERAS[idx];

  return (
    <section className="st">
      <div className="st-head">
        <div className="modal-section-title st-title">
          <Images size={15} strokeWidth={2.4} />
          {t(lang, "Sprite Evolution", "วิวัฒนาการสไปรต์", "スプライトの変遷")}
        </div>

        <div className="st-controls">
          <Segmented
            label={t(lang, "Side", "ด้าน", "向き")}
            value={side}
            onChange={setSide}
            options={[
              { value: "front", label: t(lang, "Front", "ด้านหน้า", "前") },
              { value: "back",  label: t(lang, "Back",  "ด้านหลัง", "後") },
            ]}
          />
          <Segmented
            label={t(lang, "Colour", "สี", "色")}
            value={shiny ? "shiny" : "normal"}
            onChange={(v) => setShiny(v === "shiny")}
            options={[
              { value: "normal", label: t(lang, "Normal", "ปกติ", "通常") },
              { value: "shiny",  label: t(lang, "Shiny",  "ไชนี่", "色違い") },
            ]}
          />
        </div>
      </div>

      <div className="st-rail-wrap">
        <button type="button" className="st-arrow left" onClick={() => step(-1)}
          disabled={idx === 0} aria-label={t(lang, "Previous era", "ยุคก่อนหน้า", "前の世代")}>
          <ChevronLeft size={16} strokeWidth={2.6} />
        </button>

        <div
          className="st-rail"
          ref={railRef}
          role="tablist"
          aria-label={t(lang, "Sprite eras", "ยุคของสไปรต์", "スプライトの世代")}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
            if (e.key === "ArrowLeft")  { e.preventDefault(); step(-1); }
          }}
        >
          {/* The axis the dots sit on. One element behind the row rather than a
              border per cell, so it reads as a single continuous line. */}
          <div className="st-axis" aria-hidden />

          {ERAS.map((e, i) => {
            const first = i === 0 || ERAS[i - 1].gen !== e.gen;
            const url = urls[i];
            const has = available(i);
            return (
              <button
                key={e.game}
                ref={(el) => { cellRefs.current[i] = el; }}
                type="button"
                role="tab"
                className={`st-cell${i === idx ? " on" : ""}`}
                aria-selected={i === idx}
                aria-current={i === idx ? "true" : undefined}
                title={`${e.game} · ${e.year}`}
                aria-label={t(lang,
                  `${e.game}, ${e.year}, generation ${e.gen}`,
                  `${e.game} ปี ${e.year} เจนเนอเรชั่นที่ ${e.gen}`,
                  `${e.game} ${e.year}年 第${e.gen}世代`)}
                onClick={() => { if (i === idx && has) setZoom(true); else setIdx(i); }}
              >
                {/* The generation is named once per group; repeating it above
                    all three Gen III columns said the same thing three times. */}
                <span className="st-gen">{first ? `GEN ${e.gen}` : ""}</span>

                <span className="st-box">
                  {has ? (
                    <img
                      src={url}
                      alt=""
                      className="st-img"
                      loading="lazy"
                      decoding="async"
                      onError={() => setBroken(b => ({ ...b, [url]: true }))}
                    />
                  ) : (
                    <span className="st-none">{t(lang, "No data", "ไม่มีข้อมูล", "データなし")}</span>
                  )}
                </span>

                <span className="st-dot" aria-hidden />
                <span className="st-year">{e.year}</span>
                <span className="st-game">{e.short}</span>
              </button>
            );
          })}
        </div>

        <button type="button" className="st-arrow right" onClick={() => step(1)}
          disabled={idx === ERAS.length - 1} aria-label={t(lang, "Next era", "ยุคถัดไป", "次の世代")}>
          <ChevronRight size={16} strokeWidth={2.6} />
        </button>
      </div>

      <div className="st-foot">
        <div className="st-now">
          <span className="st-now-lbl">{t(lang, "Viewing", "กำลังดู", "表示中")}</span>
          <b>{era.game}</b>
          <span className="st-now-sep">·</span>
          <span>Gen {era.gen}</span>
          <span className="st-now-sep">·</span>
          <span>{era.year}</span>
        </div>
        <div className="st-foot-nav">
          <button type="button" className="st-round" onClick={() => step(-1)} disabled={idx === 0}
            aria-label={t(lang, "Previous era", "ยุคก่อนหน้า", "前の世代")}>
            <ChevronLeft size={15} strokeWidth={2.6} />
          </button>
          <button type="button" className="st-round" onClick={() => step(1)} disabled={idx === ERAS.length - 1}
            aria-label={t(lang, "Next era", "ยุคถัดไป", "次の世代")}>
            <ChevronRight size={15} strokeWidth={2.6} />
          </button>
        </div>
      </div>

      {zoom && available(idx) && (
        <div className="st-zoom" onClick={() => setZoom(false)} role="dialog" aria-modal="true">
          <div className="st-zoom-box" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="st-zoom-close" onClick={() => setZoom(false)}
              aria-label={t(lang, "Close", "ปิด", "閉じる")}>
              <X size={16} strokeWidth={2.6} />
            </button>
            {/* pixelated: these are 96px pixel-art sprites, and smoothing them
                up to 280px turns the detail into mush. */}
            <img src={urls[idx]} alt={era.game} className="st-zoom-img" />
            <div className="st-zoom-cap">{era.game} · {era.year}</div>
          </div>
        </div>
      )}
    </section>
  );
}
