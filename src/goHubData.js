// ─── goHubData — one fetch for the whole GO Tools page ───────────────────────
//
// Every card on the hub used to be a link that fetched nothing; showing real
// content in each one naively would mean seven components each pulling the
// same four ScrapedDuck files. This module fetches them once, caches them for
// a refresh cycle, and hands the same object to everyone.
//
// The cache is module-level rather than component state on purpose: navigating
// away from the hub and back should not re-fetch, and the data only changes on
// LeekDuck's own schedule.

import { useEffect, useState } from "react";
import { matchPokemonId } from "./perfUtils.js";

const BASE = "https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data";
const FILES = {
  raids:    `${BASE}/raids.json`,
  events:   `${BASE}/events.json`,
  eggs:     `${BASE}/eggs.json`,
  research: `${BASE}/research.json`,
};

/** One hour — the same cadence the old header chip claimed. */
const TTL = 60 * 60 * 1000;

let cache = null;      // { at, data }
let inflight = null;

/** Small sprite, not full artwork: this page renders 25+ of them at 40px. */
export function spriteUrl(id) {
  return id
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`
    : null;
}

/** "5-Star Raids" → 5, "Mega Raids" → "mega". Used for the star badges. */
export function tierOf(raw = "") {
  const m = /^(\d)/.exec(raw);
  if (m) return Number(m[1]);
  if (/mega/i.test(raw)) return "mega";
  return null;
}

async function loadAll(force = false) {
  if (!force && cache && Date.now() - cache.at < TTL) return cache.data;
  if (inflight) return inflight;

  inflight = (async () => {
    const entries = await Promise.allSettled(
      Object.entries(FILES).map(async ([key, url]) => {
        const res = await fetch(url, { cache: force ? "reload" : "default" });
        if (!res.ok) throw new Error(`${key} ${res.status}`);
        return [key, await res.json()];
      })
    );

    // Partial success is still useful: a card whose slice is missing falls
    // back to its plain form rather than the whole page failing.
    const data = { raids: null, events: null, eggs: null, research: null };
    entries.forEach(e => { if (e.status === "fulfilled") data[e.value[0]] = e.value[1]; });

    cache = { at: Date.now(), data };
    inflight = null;
    return data;
  })();

  return inflight;
}

/**
 * The page's single data source.
 * `status` is "loading" until the first response, then "ready" or "error";
 * `data` may still have null slices when only some files came back.
 */
export function useGoHubData() {
  const [state, setState] = useState(() =>
    cache && Date.now() - cache.at < TTL
      ? { status: "ready", data: cache.data }
      : { status: "loading", data: null });

  useEffect(() => {
    if (state.status === "ready") return;
    let live = true;
    loadAll()
      .then(data => { if (live) setState({ status: "ready", data }); })
      .catch(() => { if (live) setState({ status: "error", data: null }); });
    return () => { live = false; };
  }, [state.status]);

  return state;
}

/** Milliseconds since the cached copy was fetched, for the header's "updated". */
export function cachedAt() {
  return cache?.at ?? null;
}

// ─── Slices ─────────────────────────────────────────────────────────────────
// Each card asks for exactly what it shows. Everything below tolerates null,
// because a failed file must degrade one card rather than the page.

/** Active raid bosses, strongest tier first, with a resolved sprite id. */
export function raidBosses(data, limit = 5) {
  const list = data?.raids;
  if (!Array.isArray(list)) return null;
  const rank = (b) => {
    const t = tierOf(b.tier);
    return t === "mega" ? 6 : (typeof t === "number" ? t : 0);
  };
  return [...list]
    .sort((a, b) => rank(b) - rank(a))
    .slice(0, limit)
    .map(b => ({
      name: b.name,
      tier: tierOf(b.tier),
      shiny: !!b.canBeShiny,
      id: matchPokemonId(b),
    }));
}

export function raidCount(data) {
  return Array.isArray(data?.raids) ? data.raids.length : null;
}

/** Events running right now, soonest to end first. */
export function liveEvents(data, limit = 2) {
  const list = data?.events;
  if (!Array.isArray(list)) return null;
  const now = Date.now();
  return list
    .filter(e => {
      const s = Date.parse(e.start), t = Date.parse(e.end);
      return Number.isFinite(s) && Number.isFinite(t) && s <= now && now < t;
    })
    .sort((a, b) => Date.parse(a.end) - Date.parse(b.end))
    .slice(0, limit)
    .map(e => ({ name: e.name, end: Date.parse(e.end), heading: e.heading }));
}

/** One highlight Pokémon per egg distance, in distance order. */
export function eggHighlights(data, perGroup = 1) {
  const list = data?.eggs;
  if (!Array.isArray(list)) return null;
  const groups = new Map();
  list.forEach(e => {
    const km = e.eggType ?? e.type ?? "";
    if (!groups.has(km)) groups.set(km, []);
    groups.get(km).push(e);
  });
  const order = ["2 km", "5 km", "7 km", "10 km", "12 km"];
  return [...groups.entries()]
    .sort((a, b) => {
      const ai = order.indexOf(a[0]), bi = order.indexOf(b[0]);
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
    })
    .slice(0, 4)
    .map(([km, items]) => ({
      km,
      mons: items.slice(0, perGroup).map(i => ({
        name: i.name, id: matchPokemonId(i),
      })),
    }));
}

/** Research rewards, rarest first — shiny-capable ones lead. */
export function researchRewards(data, limit = 4) {
  const list = data?.research;
  if (!Array.isArray(list)) return null;
  const mons = [];
  const seen = new Set();
  list.forEach(task => {
    (task.rewards ?? []).forEach(r => {
      if (!r?.name || seen.has(r.name)) return;
      seen.add(r.name);
      mons.push({ name: r.name, shiny: !!r.canBeShiny, id: matchPokemonId(r) });
    });
  });
  return mons.sort((a, b) => b.shiny - a.shiny).slice(0, limit);
}

/** Team GO Rocket leaders — a fixed cast, so their signatures are constants. */
export const ROCKET_LEADERS = [
  { who: "Giovanni", id: 150 },   // Mewtwo, the recurring shadow legendary slot
  { who: "Sierra",   id: 373 },
  { who: "Arlo",     id: 260 },
  { who: "Cliff",    id: 68  },
];
