#!/usr/bin/env node
/**
 * Recover which candidate each current public/effects/<type>.mp4 came from, by
 * comparing low-res frame fingerprints against the HD candidates in _candidates/.
 * Prints an APPLY="…" string (and the match confidence per type).
 *
 *     node scripts/match-picks.mjs
 */
import { readdir, access } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import ffmpeg from "ffmpeg-static";

const run = promisify(execFile);
const DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "effects");
const CAND = join(DIR, "_candidates");
const TIMES = [0.3, 0.7, 1.1, 1.5, 1.9, 2.4];   // sample several moments
const GRID = 40;

const exists = (p) => access(p).then(() => true).catch(() => false);

// Concatenated grayscale fingerprint across several timestamps.
async function fingerprint(file) {
  const parts = [];
  for (const t of TIMES) {
    try {
      const { stdout } = await run(
        ffmpeg,
        ["-ss", String(t), "-i", file, "-frames:v", "1", "-vf", `scale=${GRID}:${GRID}`,
         "-pix_fmt", "rgb24", "-f", "rawvideo", "-loglevel", "error", "-"],
        { encoding: "buffer", maxBuffer: 1 << 22 }
      );
      parts.push(stdout);
    } catch { parts.push(Buffer.alloc(GRID * GRID * 3)); }
  }
  return Buffer.concat(parts);
}

function sad(a, b) {
  const n = Math.min(a.length, b.length);
  if (!n) return Infinity;
  let s = 0;
  for (let i = 0; i < n; i++) s += Math.abs(a[i] - b[i]);
  return s / n; // mean abs diff per byte
}

const manifest = JSON.parse(
  await (await import("node:fs/promises")).readFile(join(CAND, "manifest.json"), "utf8")
);

const picks = [];
console.log("Matching current clips to HD candidates…\n");
for (const type of Object.keys(manifest)) {
  const target = join(DIR, `${type}.mp4`);
  if (!(await exists(target)) || !manifest[type]?.length) continue;
  const tfp = await fingerprint(target);
  const scores = [];
  for (let i = 0; i < manifest[type].length; i++) {
    const cand = join(CAND, `${type}-${i + 1}.mp4`);
    if (!(await exists(cand))) { scores.push(Infinity); continue; }
    scores.push(sad(tfp, await fingerprint(cand)));
  }
  const best = scores.indexOf(Math.min(...scores));
  const sorted = [...scores].sort((a, b) => a - b);
  const conf = sorted[1] ? (sorted[1] - sorted[0]) / sorted[1] : 1; // gap to runner-up
  const flag = conf < 0.12 ? "  ⚠ ไม่ชัวร์" : "";
  picks.push(`${type}=${best + 1}`);
  console.log(`${type.padEnd(9)} → #${best + 1}  (diff ${scores[best].toFixed(1)}, conf ${(conf * 100).toFixed(0)}%)${flag}`);
}

console.log(`\nAPPLY="${picks.join(",")}"`);
