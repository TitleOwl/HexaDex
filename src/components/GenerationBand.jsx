// ─── GenerationBand ──────────────────────────────────────────────────────────
//
// Replaces the /generations page. Instead of sending the player to another
// screen and back, the heading above the grid grows into this band whenever a
// region chip is active — the information arrives where it is relevant and the
// list stays on screen underneath it.
//
// It reads the selected generation and nothing else. It does not filter, does
// not touch the grid, and holds no state the Pokédex depends on.

import { useEffect, useMemo, useRef, useState } from "react";
import { Swords, Brain } from "lucide-react";
import {
  GENERATIONS_INFO, STARTER_ORDER, genById, genCount, genRegion, generationStats,
} from "../data/generations.js";
import { TYPE_NAMES_TH, TYPE_NAMES_JA } from "../data.js";
import { artworkUrl, typeColor, getLocalName } from "../utils.js";
import { routeUrl } from "../router.js";

const t = (lang, en, th, ja) => (lang === "th" ? th : lang === "ja" ? ja : en);

export default function GenerationBand({
  gen, lang = "en", pool = [], thaiArr, jpArr, onOpenTeam, onOpenQuiz,
}) {
  // "All" has no generation to describe, so the band simply is not there and
  // the plain heading does the job.
  const show = gen > 0 && gen < GENERATIONS_INFO.length + 1;
  const info = show ? genById(gen) : null;

  // The content that is currently painted. It lags `gen` by one fade so the
  // outgoing generation stays legible while it dims — swapping the text at the
  // same moment as the opacity is what makes a crossfade read as a flicker.
  const [shown, setShown] = useState(info);
  const [fading, setFading] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (!info) { setShown(null); return; }
    if (shown && shown.id === info.id) return;
    if (!shown) { setShown(info); return; }
    setFading(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { setShown(info); setFading(false); }, 200);
    return () => clearTimeout(timer.current);
  }, [info, shown]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const stats = useMemo(
    () => (shown ? generationStats(shown.id, pool) : null),
    [shown, pool]
  );

  // One entry per slot, in draw order, each carrying its own label so the name
  // can sit under its own sprite rather than in a list somewhere else.
  const starters = useMemo(() => {
    if (!shown) return [];
    return STARTER_ORDER.map((slot) => {
      const st = shown.starters.find((x) => x.slot === slot);
      if (!st) return null;
      const local = getLocalName(st.id, lang, thaiArr, jpArr);
      const p = pool.find((x) => x.id === st.id);
      const name = local ?? (p ? p.name.charAt(0).toUpperCase() + p.name.slice(1) : null);
      return { slot, id: st.id, name };
    }).filter(Boolean);
  }, [shown, lang, thaiArr, jpArr, pool]);

  if (!shown) return null;

  const region = genRegion(shown, lang);
  const count = genCount(shown);
  const typeLabel = (n) => !n ? null
    : lang === "th" ? (TYPE_NAMES_TH[n] ?? n)
    : lang === "ja" ? (TYPE_NAMES_JA[n] ?? n)
    : n.charAt(0).toUpperCase() + n.slice(1);

  return (
    <section
      className={`gb${fading ? " fading" : ""}`}
      style={{ "--gb-accent": shown.accent }}
      // Announced as one sentence when the filter changes, so a screen-reader
      // user learns what the list now holds without hunting for it.
      aria-live="polite"
      aria-label={t(lang,
        `Filtered to ${shown.region}, ${count} Pokémon`,
        `กรองเป็น ${region} ${count} ตัว`,
        `${region}に絞り込み ${count}匹`)}
    >
      <div className="gb-top">
        {/* Grass → Fire → Water in every generation without exception, read
            from `slot` rather than the array's order. */}
        <div className="gb-starters">
          {starters.map((st) => (
            <span key={st.slot} className={`gb-starter-cell ${st.slot}`}>
              <img
                className={`gb-starter ${st.slot}`}
                src={artworkUrl(st.id)}
                alt=""
                // Eager: these are in view the moment a chip is pressed. Marked
                // lazy they queue behind the app's bulk Pokémon fetch and
                // arrive as broken frames.
                loading="eager"
                fetchPriority="high"
                decoding="async"
                draggable={false}
              />
              {/* A cast shadow, not a drop-shadow: it grounds the sprite on the
                  band instead of hovering a blur behind it. */}
              <span className="gb-starter-shadow" aria-hidden />
              {st.name && <span className="gb-starter-name">{st.name}</span>}
            </span>
          ))}
        </div>

        <div className="gb-text">
          <h2 className="gb-title">
            {region}
            <span className="gb-gen">
              {t(lang, `Gen ${shown.roman}`, `เจน ${shown.roman}`, `第${shown.roman}世代`)} · {shown.year}
            </span>
          </h2>
          <div className="gb-range">
            #{String(shown.min).padStart(3, "0")}–{String(shown.max).padStart(3, "0")} · {count}{" "}
            {t(lang, "Pokémon", "ตัว", "匹")}
          </div>
        </div>

        <div className="gb-actions">
          {/* Real links carrying the generation, so a middle-click opens them
              in a tab; the plain click is handled in-app because following the
              href would reload the whole SPA. */}
          <a
            className="gb-btn gb-btn-main"
            href={routeUrl("team", shown.id)}
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
              e.preventDefault(); onOpenTeam(shown.id);
            }}
          >
            <Swords size={14} strokeWidth={2.2} />
            {t(lang, `${shown.region} team`, `สร้างทีม ${region}`, `${region}のチーム`)}
          </a>
          <a
            className="gb-btn"
            href={routeUrl("games", shown.id)}
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
              e.preventDefault(); onOpenQuiz(shown.id);
            }}
          >
            <Brain size={14} strokeWidth={2.2} />
            {t(lang, `${shown.region} quiz`, `ควิซ ${region}`, `${region}クイズ`)}
          </a>
        </div>
      </div>

      {/* One line rather than four boxed cells: these are four short facts
          about the same thing, and a row of labelled tiles gave each of them
          the weight of a section heading. Labels recede, values lead. */}
      {(stats?.topType || stats?.avgTotal != null) && (
        <p className="gb-facts">
          {stats?.topType && (
            <>
              <span className="gb-lbl">{t(lang, "Most common", "ธาตุเด่น", "最多タイプ")}</span>
              <span className="gb-type" style={{ "--tt": typeColor(stats.topType) }}>
                {typeLabel(stats.topType)}
              </span>
            </>
          )}
          {stats?.avgTotal != null && (
            <>
              <span className="gb-dot" aria-hidden>·</span>
              <span className="gb-lbl">{t(lang, "Average", "เฉลี่ย", "平均")}</span>
              <b className="gb-val">{stats.avgTotal}</b>
            </>
          )}
          {stats?.strongestName && (
            <>
              <span className="gb-dot" aria-hidden>·</span>
              <span className="gb-lbl">{t(lang, "Strongest", "แข็งแกร่งสุด", "最強")}</span>
              <b className="gb-val gb-val-name">
                {getLocalName(
                  pool.find((x) => x.name === stats.strongestName)?.id, lang, thaiArr, jpArr,
                ) ?? stats.strongestName}{" "}
                {stats.strongestTotal}
              </b>
            </>
          )}
          <span className="gb-dot" aria-hidden>·</span>
          <span className="gb-lbl">{t(lang, "Legendary", "ในตำนาน", "伝説")}</span>
          <b className="gb-val">
            {shown.legendaries}{t(lang, "", " ตัว", "匹")}
          </b>
        </p>
      )}
    </section>
  );
}
