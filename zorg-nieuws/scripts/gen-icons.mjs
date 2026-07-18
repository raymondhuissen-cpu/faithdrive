import sharp from "sharp";
import { mkdirSync } from "fs";

mkdirSync("public/icons", { recursive: true });

// Blauwe achtergrond met wit kruis als zorgicoon
const svg = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${size * 0.18}" fill="#2563eb"/>
  <rect x="${size * 0.42}" y="${size * 0.22}" width="${size * 0.16}" height="${size * 0.56}" rx="${size * 0.04}" fill="white"/>
  <rect x="${size * 0.22}" y="${size * 0.42}" width="${size * 0.56}" height="${size * 0.16}" rx="${size * 0.04}" fill="white"/>
</svg>`;

for (const size of [192, 512]) {
  await sharp(Buffer.from(svg(size)))
    .png()
    .toFile(`public/icons/icon-${size}.png`);
  console.log(`✓ icon-${size}.png`);
}
