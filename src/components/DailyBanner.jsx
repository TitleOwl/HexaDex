import { useState, useEffect, useMemo } from "react";
import {
  STRINGS, TYPE_NAMES_TH, TYPE_NAMES_JA,
} from "../data.js";
import {
  typeColor, getArt, getLocalName, getDailyPokemonId,
} from "../utils.js";

export default function DailyBanner({ allList, thaiArr, jpArr, lang, cachedFetch, onOpen }) {
  const s = STRINGS[lang];
  const dailyId = useMemo(() => getDailyPokemonId(), []);
  const [pokemon, setPokemon] = useState(null);
  const [loading, setLoading] = useState(true);

  const [streak] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("pkdx_streak") ?? "{}");
      const today = new Date().toISOString().slice(0, 10);
      const last  = saved.lastDate;
      if (last === today) return saved.streak || 1;
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const newStreak = last === yesterday ? (saved.streak || 0) + 1 : 1;
      localStorage.setItem("pkdx_streak", JSON.stringify({ lastDate: today, streak: newStreak }));
      return newStreak;
    } catch { return 1; }
  });

  useEffect(() => {
    if (!allList.length) return;
    const entry = allList[dailyId - 1];
    if (!entry) { setLoading(false); return; }
    cachedFetch(entry.url)
      .then(p => { setPokemon(p); setLoading(false); })
      .catch(() => setLoading(false));
  }, [dailyId, allList, cachedFetch]);

  if (loading || !pokemon) {
    return (
      <div className="daily-banner daily-banner-loading">
        <div className="skeleton-pulse" style={{ width: 90, height: 90, borderRadius: "50%" }} />
        <div className="daily-info">
          <div className="skeleton-pulse skel-line w-40" style={{ marginBottom: 8 }} />
          <div className="skeleton-pulse skel-line" style={{ height: 24, width: "60%" }} />
        </div>
      </div>
    );
  }

  const mainType = pokemon.types[0]?.type.name ?? "normal";
  const color    = typeColor(mainType);
  const img      = getArt(pokemon);
  const name     = getLocalName(pokemon.id, lang, thaiArr, jpArr) ?? pokemon.name;

  return (
    <div className="daily-banner"
      onClick={() => onOpen(pokemon)}
      style={{ background: `linear-gradient(110deg, ${color}f0 0%, ${color}b0 55%, ${color}66 100%)` }}>
      <div className="daily-glow" />
      <div className="daily-img-wrap">
        {img && <img src={img} alt={name} className="daily-img" />}
    <div className="daily-img-ring" />
      </div>
      <div className="daily-info">
        <div className="daily-tag">⭐ {s.dailyPokemon}</div>
        <div className="daily-name">{name}</div>
        <div className="daily-meta">
          <span className="daily-num">#{String(pokemon.id).padStart(4, "0")}</span>
          {pokemon.types.map((t) => (
            <span key={t.type.name} className="type-tag daily-type"
              style={{ background: "rgba(255,255,255,0.25)", color: "#fff",
                       border: "1px solid rgba(255,255,255,0.4)" }}>
              {lang === "th" ? (TYPE_NAMES_TH[t.type.name] ?? t.type.name)
                : lang === "ja" ? (TYPE_NAMES_JA[t.type.name] ?? t.type.name)
                : t.type.name}
            </span>
          ))}
        </div>
      </div>
      <div className="daily-streak">
        <div className="daily-streak-flame">🔥</div>
        <div className="daily-streak-num">{streak}</div>
        <div className="daily-streak-label">{s.visitStreak}</div>
      </div>
    </div>
  );
}
