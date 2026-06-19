#!/usr/bin/env node
/**
 * Bump inline `borderRadius` values in JSX to the Soft iOS scale.
 * Handles  borderRadius: 12   and  borderRadius: "12px".
 * Skips percentages ("50%"), pills/circles (>=40), and tiny radii (<=5).
 *
 *     node scripts/ios-radius-jsx.mjs
 */
import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "src");
const TABLE = { 6:8, 7:9, 8:11, 9:12, 10:13, 11:14, 12:15, 14:17, 15:18, 16:19, 18:20, 20:22, 22:24, 24:26, 26:28, 28:30, 30:32, 32:34, 36:38 };
const mapPx = (n) => (n === 0 || n >= 40 || n <= 5) ? n : (TABLE[n] ?? Math.round(n * 1.15));

async function walk(dir, out = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) await walk(p, out);
    else if (e.name.endsWith(".jsx")) out.push(p);
  }
  return out;
}

let grand = 0;
for (const file of await walk(SRC)) {
  let src = await readFile(file, "utf8");
  let count = 0;
  // borderRadius: "12px"
  src = src.replace(/borderRadius:(\s*)"(\d+)px"/g, (m, sp, d) => {
    const v = mapPx(+d); if (v === +d) return m; count++; return `borderRadius:${sp}"${v}px"`;
  });
  // borderRadius: 12   (bare integer, not quoted, not followed by % or more digits)
  src = src.replace(/borderRadius:(\s*)(\d+)(?![\d.%])/g, (m, sp, d) => {
    const v = mapPx(+d); if (v === +d) return m; count++; return `borderRadius:${sp}${v}`;
  });
  if (count) { await writeFile(file, src); grand += count; console.log(`${file.replace(SRC + "/", "").padEnd(34)} ${count}`); }
}
console.log(`\nTotal: ${grand} inline borderRadius values bumped to Soft.`);
