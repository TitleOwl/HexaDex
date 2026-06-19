#!/usr/bin/env node
/**
 * Compress every public/effects/<type>.mp4 for the web using the bundled
 * ffmpeg-static binary (no system install needed).
 *
 *     node scripts/compress-effects.mjs
 *     CRF=32 MAXW=480 node scripts/compress-effects.mjs   (smaller)
 *     ONLY=flying,normal node scripts/compress-effects.mjs (just these)
 *
 * Re-encodes in place only when the result is actually smaller.
 */
import { readdir, stat, rename, unlink } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import ffmpeg from "ffmpeg-static";

const run = promisify(execFile);
const DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "effects");
const CRF = process.env.CRF || "24";
const MAXW = process.env.MAXW || "720";
const only = process.env.ONLY ? process.env.ONLY.split(",").map((s) => s.trim()) : null;
const mb = (n) => (n / 1e6).toFixed(1) + "MB";

const files = (await readdir(DIR)).filter((f) => f.endsWith(".mp4") && (!only || only.includes(f.replace(".mp4", ""))));
let before = 0, after = 0;
console.log(`Compressing ${files.length} clip(s)  (crf=${CRF}, max width=${MAXW}px)…\n`);

for (const f of files) {
  const src = join(DIR, f);
  const tmp = join(DIR, `.tmp-${f}`);
  const sizeIn = (await stat(src)).size;
  try {
    await run(ffmpeg, [
      "-y", "-i", src,
      "-an",
      "-vf", `scale='min(${MAXW},iw)':-2,fps=30`,
      "-c:v", "libx264", "-crf", CRF, "-preset", "slow",
      "-pix_fmt", "yuv420p", "-movflags", "+faststart",
      tmp,
    ], { maxBuffer: 1 << 26 });
    const sizeOut = (await stat(tmp)).size;
    if (sizeOut < sizeIn) {
      await rename(tmp, src);
      before += sizeIn; after += sizeOut;
      console.log(`✓ ${f.padEnd(13)} ${mb(sizeIn)} → ${mb(sizeOut)}  (-${Math.round((1 - sizeOut / sizeIn) * 100)}%)`);
    } else {
      await unlink(tmp);
      before += sizeIn; after += sizeIn;
      console.log(`• ${f.padEnd(13)} ${mb(sizeIn)} (kept — already small)`);
    }
  } catch (e) {
    await unlink(tmp).catch(() => {});
    console.log(`✗ ${f.padEnd(13)} ${e.message.split("\n")[0]}`);
  }
}
console.log(`\nTotal: ${mb(before)} → ${mb(after)}  (-${Math.round((1 - after / before) * 100)}%)`);
