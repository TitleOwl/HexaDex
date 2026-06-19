#!/usr/bin/env node
/**
 * Elemental video helper — fetch candidate clips, then apply the chosen ones.
 *
 * Uses the Pexels Video API (free, commercial-OK, no attribution required).
 * Free key: https://www.pexels.com/api/
 *
 * MODES
 *  1) Fetch several candidates per type into public/effects/_candidates/ + manifest:
 *        PEXELS_KEY=xxx MODE=candidates node scripts/fetch-effects.mjs
 *        (options: COUNT=5  ONLY=fire,water)
 *
 *  2) Apply the clips you picked in the gallery (copies candidate → <type>.mp4):
 *        APPLY="fire=2,water=1,grass=3" node scripts/fetch-effects.mjs
 *
 *  3) Remove the temporary candidates folder (so it isn't deployed):
 *        MODE=cleanup node scripts/fetch-effects.mjs
 *
 *  4) (legacy) one best clip per type straight into <type>.mp4:
 *        PEXELS_KEY=xxx node scripts/fetch-effects.mjs   (FORCE=1, ONLY=… supported)
 */
import { writeFile, mkdir, access, copyFile, rm, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "public", "effects");
const CAND = join(OUT, "_candidates");

// type → Pexels search query (favouring pretty effects on a dark background)
const QUERIES = {
  normal:   "glowing particles black background",
  fire:     "fire flames black background",
  water:    "water splash black background",
  electric: "electric energy lightning black background",
  grass:    "green leaves falling black background",
  ice:      "snow particles falling black background",
  fighting: "energy explosion shockwave black background",
  poison:   "purple smoke black background",
  ground:   "sand particles dust black background",
  flying:   "white feathers falling black background",
  psychic:  "purple energy swirl black background",
  bug:      "green glowing particles black background",
  rock:     "debris explosion black background",
  ghost:    "smoke fog black background",
  dragon:   "blue energy flames black background",
  dark:     "black smoke dark background",
  steel:    "metal sparks black background",
  fairy:    "gold glitter particles black background",
};

const exists = (p) => access(p).then(() => true).catch(() => false);
const only = process.env.ONLY ? process.env.ONLY.split(",").map((s) => s.trim()) : null;
const MODE = process.env.MODE || (process.env.APPLY ? "apply" : "single");

// Pick a crisp HD rendition (~720p portrait), capped at 1080p to limit size.
function pickFile(files, { small = false } = {}) {
  const pool = [...files].sort((a, b) => (a.height || 0) - (b.height || 0));
  if (small) return pool[0];
  return (
    pool.find((f) => (f.height || 0) >= 1200 && (f.height || 0) <= 1920) ||   // 720p / 1080p portrait
    pool.filter((f) => (f.height || 0) <= 1920).pop() ||
    pool[pool.length - 1] ||
    pool[0]
  );
}

async function search(type, perPage) {
  const url =
    `https://api.pexels.com/videos/search?per_page=${perPage}&orientation=portrait&size=medium&query=` +
    encodeURIComponent(QUERIES[type]);
  const res = await fetch(url, { headers: { Authorization: process.env.PEXELS_KEY } });
  if (!res.ok) throw new Error(`Pexels API ${res.status}`);
  return (await res.json()).videos || [];
}

async function download(link, dest) {
  const bin = await fetch(link);
  const buf = Buffer.from(await bin.arrayBuffer());
  await writeFile(dest, buf);
  return buf.length;
}

// ── MODE: candidates ────────────────────────────────────────
async function runCandidates() {
  if (!process.env.PEXELS_KEY) throw new Error("Missing PEXELS_KEY (https://www.pexels.com/api/)");
  const count = Number(process.env.COUNT || 5);
  await mkdir(CAND, { recursive: true });
  const types = Object.keys(QUERIES).filter((t) => !only || only.includes(t));
  const manifest = {};
  console.log(`Fetching up to ${count} candidates each for ${types.length} type(s)…\n`);
  for (const type of types) {
    try {
      const vids = await search(type, count + 3);
      const items = [];
      for (const v of vids) {
        if (items.length >= count) break;
        const f = pickFile(v.video_files || []);
        if (!f?.link) continue;
        const idx = items.length + 1;
        const name = `${type}-${idx}.mp4`;
        const size = await download(f.link, join(CAND, name));
        items.push({ file: name, author: v.user?.name ?? "Pexels", w: f.width, h: f.height, mb: +(size / 1e6).toFixed(1) });
      }
      manifest[type] = items;
      console.log(`✓ ${type.padEnd(9)} ${items.length} clips`);
    } catch (e) {
      manifest[type] = [];
      console.log(`✗ ${type.padEnd(9)} ${e.message}`);
    }
  }
  await writeFile(join(CAND, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(`\nDone. Open the picker:  http://localhost:5174/effects-picker.html`);
}

// ── MODE: apply ─────────────────────────────────────────────
async function runApply() {
  const choices = process.env.APPLY.split(",").map((s) => s.trim()).filter(Boolean);
  console.log(`Applying ${choices.length} pick(s)…\n`);
  for (const c of choices) {
    const [type, idx] = c.split("=");
    const src = join(CAND, `${type}-${idx}.mp4`);
    if (!(await exists(src))) { console.log(`✗ ${type.padEnd(9)} candidate ${idx} not found`); continue; }
    await copyFile(src, join(OUT, `${type}.mp4`));
    console.log(`✓ ${type.padEnd(9)} → ${type}.mp4 (from candidate ${idx})`);
  }
  console.log(`\nDone. Hard-refresh the app. Run  MODE=cleanup  to delete _candidates when happy.`);
}

// ── MODE: cleanup ───────────────────────────────────────────
async function runCleanup() {
  if (await exists(CAND)) { await rm(CAND, { recursive: true, force: true }); console.log("✓ removed public/effects/_candidates/"); }
  else console.log("• nothing to clean");
}

// ── MODE: single (legacy) ───────────────────────────────────
async function runSingle() {
  if (!process.env.PEXELS_KEY) throw new Error("Missing PEXELS_KEY (https://www.pexels.com/api/)");
  const force = process.env.FORCE === "1";
  await mkdir(OUT, { recursive: true });
  const types = Object.keys(QUERIES).filter((t) => !only || only.includes(t));
  for (const type of types) {
    const dest = join(OUT, `${type}.mp4`);
    if (!force && (await exists(dest))) { console.log(`• ${type.padEnd(9)} skip (exists)`); continue; }
    try {
      const v = (await search(type, 5))[0];
      const f = v && pickFile(v.video_files || []);
      if (!f?.link) { console.log(`✗ ${type.padEnd(9)} no clip`); continue; }
      const size = await download(f.link, dest);
      console.log(`✓ ${type.padEnd(9)} ${(size / 1e6).toFixed(1)}MB by ${v.user?.name ?? "Pexels"}`);
    } catch (e) { console.log(`✗ ${type.padEnd(9)} ${e.message}`); }
  }
}

const runners = { candidates: runCandidates, apply: runApply, cleanup: runCleanup, single: runSingle };
try { await runners[MODE](); }
catch (e) { console.error("✗", e.message); process.exit(1); }
