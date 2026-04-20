#!/usr/bin/env node
// Generates icon-192.png from an inline SVG.
//
// This is a one-time utility — the generated PNG is committed to the repo.
// Users customizing their own deployment can:
//   1. Edit BG / ACCENT below to match their palette (see palettes.js)
//   2. npm install --save-dev sharp
//   3. node scripts/generate-icon.mjs
//   4. npm uninstall sharp
//
// Or simply replace icon-192.png with their own 192x192 PNG.

import sharp from "sharp";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const BG = "#0B0E14";      // deep-ocean bg
const ACCENT = "#38BDF8";  // deep-ocean accent
const SIZE = 192;
const DOT_R = 32;

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <rect width="${SIZE}" height="${SIZE}" fill="${BG}"/>
  <circle cx="${SIZE / 2}" cy="${SIZE / 2}" r="${DOT_R}" fill="${ACCENT}"/>
</svg>
`;

const outPath = join(process.cwd(), "icon-192.png");

await sharp(Buffer.from(svg))
  .png()
  .toFile(outPath);

console.log(`✓ wrote ${outPath} (${SIZE}x${SIZE})`);
