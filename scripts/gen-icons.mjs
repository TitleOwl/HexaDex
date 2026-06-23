#!/usr/bin/env node
// Rasterise the pokéball favicon SVG into PWA PNG icons.
//   node scripts/gen-icons.mjs
import sharp from "sharp";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PUB = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const SVG = join(PUB, "hexadex-favicon.svg");
const BG = { r: 255, g: 255, b: 255, alpha: 1 }; // clean white tile

async function gen(size, file, pad) {
  const inner = Math.round(size * (1 - pad * 2));
  const icon = await sharp(SVG)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: icon, gravity: "center" }])
    .png().toFile(join(PUB, file));
  console.log(`✓ ${file} (${size}px)`);
}

await gen(180, "apple-touch-icon.png", 0.10);  // iOS home-screen icon
await gen(192, "icon-192.png", 0.16);          // Android (safe-zone padded)
await gen(512, "icon-512.png", 0.16);
console.log("done");
