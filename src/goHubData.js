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

/**
 * The same official artwork the Pokedex draws, via the shared helper — the
 * 96px pixel sprites read as neither icon nor picture at 60px, and using a
 * second art set here would mean the same Pokemon looked different on two
 * pages of one app. It covers the mega and regional form ids too.
 */
export { artworkUrl as spriteUrl } from "./utils.js";

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

// ─── Mega forms ─────────────────────────────────────────────────────────────
//
// matchPokemonId() reads the base dex number out of the LeekDuck filename —
// "pm257.fMEGA.icon.png" is 257 — so a Mega boss was drawn as its plain form.
// Mega Blaziken and Blaziken looked identical, which is exactly the difference
// that matters in a raid list. PokeAPI keeps megas as separate varieties with
// their own ids (blaziken-mega is 10050), and the sprite repo has them.

const megaCache = new Map();   // `${baseId}:${variant}` -> id | null
const megaInflight = new Map();

/** "x" / "y" when the form is one of the split megas, else null. */
function megaVariantOf(name = "", image = "") {
  const src = `${name} ${image}`;
  if (/mega[\s_-]*x\b/i.test(src)) return "x";
  if (/mega[\s_-]*y\b/i.test(src)) return "y";
  return null;
}

export function isMega(boss) {
  return /\bmega\b/i.test(boss?.name ?? "") || /fMEGA/i.test(boss?.image ?? "");
}

// Regional forms are the same defect: "Alolan Marowak" was drawn as the
// Kantonian one, and telling them apart is the whole point of naming them.
const REGIONS = [
  [/\balolan?\b/i,   "-alola"],
  [/\bgalarian?\b/i, "-galar"],
  [/\bhisuian?\b/i,  "-hisui"],
  [/\bpaldean?\b/i,  "-paldea"],
];

/** The PokeAPI variety suffix this boss needs, or null for the base form. */
export function formSuffix(boss) {
  const name = boss?.name ?? "";
  for (const [re, suffix] of REGIONS) if (re.test(name)) return suffix;
  if (isMega(boss)) {
    const v = megaVariantOf(name, boss?.image ?? "");
    return v ? `-mega-${v}` : "-mega";
  }
  return null;
}

/**
 * The PokeAPI id of a mega variety, or null when there is not one.
 * Cached per base id, because a raid list repeats the same boss across tiers.
 */
export function variantFormId(baseId, suffix) {
  if (!baseId || !suffix) return Promise.resolve(null);
  const key = `${baseId}:${suffix}`;
  if (megaCache.has(key)) return Promise.resolve(megaCache.get(key));
  if (megaInflight.has(key)) return megaInflight.get(key);

  const req = fetch(`https://pokeapi.co/api/v2/pokemon-species/${baseId}`)
    .then(r => r.json())
    .then(d => {
      const names = (d.varieties ?? []).map(v => ({
        name: v.pokemon.name,
        id: Number(v.pokemon.url.split("/").filter(Boolean).pop()),
      }));
      // Exact suffix first; Charizard has -mega-x and -mega-y and no plain
      // -mega, so an unqualified mega request falls back to either.
      const hit = names.find(v => v.name.endsWith(suffix))
        ?? (suffix === "-mega" ? names.find(v => /-mega(-[xy])?$/.test(v.name)) : null);
      const id = hit?.id ?? null;
      megaCache.set(key, id);
      megaInflight.delete(key);
      return id;
    })
    .catch(() => { megaCache.set(key, null); megaInflight.delete(key); return null; });

  megaInflight.set(key, req);
  return req;
}

/**
 * Swaps mega ids in for a list of bosses once they resolve. Returns the list
 * with `id` already corrected, so callers render base art for one frame at
 * worst rather than an empty box.
 */
export function useMegaSprites(bosses) {
  const [ids, setIds] = useState({});

  const key = bosses?.map(b => `${b.id}${b.form ?? ""}`).join(",") ?? "";
  useEffect(() => {
    if (!bosses?.length) return;
    const need = bosses.filter(b => b.form && b.id && !(`${b.id}${b.form}` in ids));
    if (!need.length) return;
    let live = true;
    Promise.all(need.map(b =>
      variantFormId(b.id, b.form).then(id => [`${b.id}${b.form}`, id])))
      .then(pairs => {
        if (!live) return;
        setIds(prev => ({ ...prev, ...Object.fromEntries(pairs.filter(([, v]) => v)) }));
      });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!bosses) return bosses;
  return bosses.map(b => {
    const hit = b.form ? ids[`${b.id}${b.form}`] : null;
    return hit ? { ...b, id: hit } : b;
  });
}

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
      mega: isMega(b),
      form: formSuffix(b),
    }));
}

/**
 * Raid bosses grouped by the egg that hatches them.
 *
 * raids.json carries no egg image and LeekDuck's own asset paths do not
 * resolve, so the egg is drawn (see .gh-egg) rather than fetched. Shadow
 * bosses share the numeric tier with their normal counterparts but hatch from
 * a different egg, so the name has to split them.
 */
export const RAID_TIERS = [
  { key: "mega",     rank: 6, label: "Mega",       hue: "#a8442f", stars: null, big: true },
  { key: "5",        rank: 5, label: "5\u2605",       hue: "#8f2f2a", stars: 5, big: true },
  { key: "s5",       rank: 5, label: "Shadow 5\u2605", hue: "#5c5280", stars: 5, big: true, shadow: true },
  { key: "3",        rank: 3, label: "3\u2605",       hue: "#8a6524", stars: 3 },
  { key: "s3",       rank: 3, label: "Shadow 3\u2605", hue: "#6b6560", stars: 3, shadow: true },
  { key: "1",        rank: 1, label: "1\u2605",       hue: "#4d7a2e", stars: 1 },
  { key: "s1",       rank: 1, label: "Shadow 1\u2605", hue: "#5f544c", stars: 1, shadow: true },
];

function tierKey(boss) {
  const shadow = /^shadow\b/i.test(boss.name ?? "");
  const t = tierOf(boss.tier);
  if (t === "mega") return "mega";
  if (typeof t !== "number") return null;
  return shadow ? `s${t}` : String(t);
}

/** One entry per tier that actually has bosses open, strongest first. */
export function raidsByTier(data) {
  const list = data?.raids;
  if (!Array.isArray(list)) return null;
  const buckets = new Map();
  list.forEach(b => {
    const k = tierKey(b);
    if (!k) return;
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push({
      name: b.name,
      tier: tierOf(b.tier),
      shiny: !!b.canBeShiny,
      id: matchPokemonId(b),
      mega: isMega(b),
      form: formSuffix(b),
    });
  });
  return RAID_TIERS
    .map(t => ({ ...t, bosses: buckets.get(t.key) ?? [] }))
    .filter(t => t.bosses.length > 0);
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
