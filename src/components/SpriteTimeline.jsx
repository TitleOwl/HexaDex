import { useState, useEffect } from "react";

function getSpriteUrls(id) {
  const base = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions";
  return [
    { gen: "I",    game: "Red/Blue",                  url: `${base}/generation-i/red-blue/${id}.png`, era: "1996" },
    { gen: "I",    game: "Yellow",                    url: `${base}/generation-i/yellow/${id}.png`, era: "1998" },
    { gen: "II",   game: "Gold",                      url: `${base}/generation-ii/gold/${id}.png`, era: "1999" },
    { gen: "II",   game: "Crystal",                   url: `${base}/generation-ii/crystal/${id}.png`, era: "2000" },
    { gen: "III",  game: "Ruby/Sapphire",             url: `${base}/generation-iii/ruby-sapphire/${id}.png`, era: "2002" },
    { gen: "III",  game: "Emerald",                   url: `${base}/generation-iii/emerald/${id}.png`, era: "2004" },
    { gen: "III",  game: "FireRed/LeafGreen",         url: `${base}/generation-iii/firered-leafgreen/${id}.png`, era: "2004" },
    { gen: "IV",   game: "Diamond/Pearl",             url: `${base}/generation-iv/diamond-pearl/${id}.png`, era: "2006" },
    { gen: "IV",   game: "Platinum",                  url: `${base}/generation-iv/platinum/${id}.png`, era: "2008" },
    { gen: "IV",   game: "HeartGold/SoulSilver",      url: `${base}/generation-iv/heartgold-soulsilver/${id}.png`, era: "2009" },
    { gen: "V",    game: "Black/White",               url: `${base}/generation-v/black-white/${id}.png`, era: "2010" },
    { gen: "VI",   game: "X/Y",                       url: `${base}/generation-vi/x-y/${id}.png`, era: "2013" },
    { gen: "VII",  game: "Sun/Moon",                  url: `${base}/generation-vii/ultra-sun-ultra-moon/${id}.png`, era: "2017" },
    { gen: "VIII+", game: "Official Artwork",         url: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`, era: "2019+" },
  ];
}

export default function SpriteTimeline({ pokemonId, lang }) {
  const sprites = getSpriteUrls(pokemonId);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loadedMap, setLoadedMap] = useState({});

  useEffect(() => { setCurrentIdx(0); setPlaying(false); setLoadedMap({}); }, [pokemonId]);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setCurrentIdx(i => (i + 1) % sprites.length), 700);
    return () => clearInterval(t);
  }, [playing, sprites.length]);

  const markLoaded = (idx, ok) =>
    setLoadedMap(prev => ({ ...prev, [idx]: ok }));

  const title = lang==="th"?"วิวัฒนาการสไปรท์":lang==="ja"?"スプライト進化":"Sprite Evolution";

  return (
    <div className="sprite-timeline-section">
      <div className="modal-section-title">🎨 {title}</div>

      <div className="sprite-mini-preview">
        <div className="sprite-mini-frame">
          {sprites[currentIdx] && (
            <img src={sprites[currentIdx].url} alt={`Gen ${sprites[currentIdx].gen}`}
              className="sprite-mini-img"
              style={{ imageRendering: currentIdx < 11 ? "pixelated" : "auto" }}
              onLoad={() => markLoaded(currentIdx, true)}
              onError={(e) => { e.currentTarget.style.opacity = 0.2; markLoaded(currentIdx, false); }} />
          )}
        </div>
        <div className="sprite-mini-info">
          <div className="sprite-mini-gen">Gen {sprites[currentIdx]?.gen}</div>
          <div className="sprite-mini-game">{sprites[currentIdx]?.game}</div>
          <div className="sprite-mini-year">{sprites[currentIdx]?.era}</div>
        </div>
        <div className="sprite-mini-ctrls">
          <button onClick={() => setCurrentIdx(i => (i - 1 + sprites.length) % sprites.length)}>◀</button>
          <button className="sprite-ctrl-play"
            onClick={() => setPlaying(p => !p)}>
            {playing ? "⏸" : "▶"}
          </button>
          <button onClick={() => setCurrentIdx(i => (i + 1) % sprites.length)}>▶</button>
        </div>
      </div>

      <div className="sprite-timeline-row">
        {sprites.map((sp, i) => (
          <button key={i}
            className={`sprite-cell${currentIdx === i ? " active" : ""}${loadedMap[i] === false ? " missing" : ""}`}
            onClick={() => { setCurrentIdx(i); setPlaying(false); }}
            title={`${sp.game} (${sp.era})`}>
            <img src={sp.url} alt={sp.game}
              style={{ imageRendering: i < 11 ? "pixelated" : "auto" }}
              onLoad={() => markLoaded(i, true)}
              onError={(e) => { e.currentTarget.style.opacity = 0.15; markLoaded(i, false); }} />
            <span>G{sp.gen}</span>
          </button>
        ))}
      </div>
    </div>
  );
}