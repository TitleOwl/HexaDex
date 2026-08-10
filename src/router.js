// ─── router.js — URL ↔ view state ────────────────────────────────────────────
//
// The app has always been a single screen with a `view` state and no addresses,
// which is fine until something has to be LINKABLE. The generations spec (§2)
// asks for exactly that: /pokedex?gen=3 must survive a copy-paste into a new
// tab, the browser's back button must return to the hub, and a card must be a
// real <a> so middle-click opens a tab.
//
// So this is the smallest thing that gives addresses without adding a router
// dependency or restructuring App.jsx: a path table, a reader, and a writer.
// vercel.json already rewrites every path to index.html, so deep links land.

import { GENERATIONS } from "./data.js";

// The four existing tabs plus the new hub. `pokedex` is also what "/" means, so
// the site keeps working for anyone with the bare domain bookmarked.
export const VIEW_PATHS = {
  pokedex:  "/pokedex",
  team:     "/team-builder",
  gotools:  "/go-tools",
  games:    "/games",
};

// Retired paths, kept so old links and bookmarks land somewhere sensible
// instead of silently falling through to the Pokédex with no explanation.
// /generations was replaced by the generation band on the list itself.
const REDIRECTS = { "/generations": "pokedex" };

const PATH_VIEWS = Object.fromEntries(
  Object.entries(VIEW_PATHS).map(([view, path]) => [path, view])
);

// Index 0 of GENERATIONS is the "All" pseudo-generation, so a real generation
// number is also its index — gen=3 is GENERATIONS[3], Hoenn.
export const LAST_GEN = GENERATIONS.length - 1;

/**
 * §2 — a gen that is out of range, not a number, or the "All" slot is simply
 * not a filter. It is deliberately NOT an error: the spec says show every
 * Pokémon and hide the chip rather than 404, because a stale or hand-edited
 * link should still land somewhere useful.
 */
export function parseGen(raw) {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > LAST_GEN) return 0;
  return n;
}

/** Current address as state. Unknown paths fall back to the Pokédex. */
export function readRoute(loc = window.location) {
  const path = loc.pathname.replace(/\/+$/, "") || "/";
  const view = PATH_VIEWS[path] ?? REDIRECTS[path] ?? "pokedex";
  return { view, gen: parseGen(new URLSearchParams(loc.search).get("gen")) };
}

/**
 * The address for a view. Any OTHER query param already on the URL is carried
 * over untouched — the multiplayer quiz shares links with ?quizroom=, and a
 * tab switch must not silently drop somebody's room code.
 */
export function routeUrl(view, gen = 0, loc = window.location) {
  const params = new URLSearchParams(loc.search);
  params.delete("gen");
  if (gen > 0) params.set("gen", String(gen));
  const qs = params.toString();
  return `${VIEW_PATHS[view] ?? VIEW_PATHS.pokedex}${qs ? `?${qs}` : ""}`;
}

/**
 * Write the address, but only when it actually changes — pushing an identical
 * entry would stack duplicates that the back button then has to chew through
 * one press at a time.
 */
export function pushRoute(view, gen = 0) {
  const url = routeUrl(view, gen);
  if (url === window.location.pathname + window.location.search) return;
  try { window.history.pushState({ hexadexRoute: true }, "", url); } catch {}
}

/** Replace instead of push — for the first paint, which is not a navigation. */
export function replaceRoute(view, gen = 0) {
  const url = routeUrl(view, gen);
  if (url === window.location.pathname + window.location.search) return;
  try { window.history.replaceState({ hexadexRoute: true }, "", url); } catch {}
}
