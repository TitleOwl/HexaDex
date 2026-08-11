import SpriteTimeline from "../../SpriteTimeline.jsx";

/**
 * The tab is the timeline now. The static grid that used to sit underneath —
 * Front / Back / Shiny / Shiny Back / Female / Female Back for one generation —
 * showed a subset of what the timeline already covers across every era, with
 * its own Front/Back and Normal/Shiny switches. Two answers to one question.
 */
export default function SpritesTab({ pokemonId, lang }) {
  return <SpriteTimeline pokemonId={pokemonId} lang={lang} />;
}
