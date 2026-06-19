#!/usr/bin/env node
/**
 * Bump every hard-coded border-radius in the CSS to the "Soft" iOS scale.
 * Only touches `border-radius` / `border-*-radius` declarations; leaves pills
 * (≥40px), 0, and percentages (circles) alone. Run once.
 *
 *     node scripts/ios-radius.mjs
 */
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "src");
const FILES = ["App.css", "index.css", "responsive.css"];

// Soft-scale remap for the values that actually appear.
const TABLE = { 6:8, 7:9, 8:11, 9:12, 10:13, 11:14, 12:15, 14:17, 15:18, 16:19, 18:20, 20:22, 22:24, 24:26, 26:28, 28:30, 30:32, 32:34, 36:38 };
function mapPx(n) {
  if (n === 0 || n >= 40) return n;      // keep 0, pills and big circles
  if (n <= 5) return n;                  // keep tiny detail radii
  return TABLE[n] ?? Math.round(n * 1.15);
}

// Replace each <num>px inside a border-radius value.
const remapValue = (val) => val.replace(/(\d+)px/g, (_, d) => `${mapPx(+d)}px`);

let grand = 0;
for (const f of FILES) {
  const path = join(ROOT, f);
  let css;
  try { css = await readFile(path, "utf8"); } catch { continue; }
  let count = 0;
  const out = css.replace(/(border(?:-(?:top|bottom|left|right|start|end)(?:-(?:left|right|start|end))?)?-radius\s*:\s*)([^;}{]+)/gi,
    (m, prop, val) => {
      if (!/\d+px/.test(val)) return m;          // skip %/var/calc-only values
      const next = prop + remapValue(val);
      if (next !== m) count++;
      return next;
    });
  if (count) { await writeFile(path, out); grand += count; }
  console.log(`${f.padEnd(16)} ${count} border-radius declarations updated`);
}
console.log(`\nTotal: ${grand} updated to the Soft iOS scale.`);
