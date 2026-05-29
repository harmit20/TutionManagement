/**
 * Generates all required PWA PNG icons from public/icons/icon.svg.
 * Run once before production build: npm run icons
 *
 * Requires: npm i -D sharp
 */
import sharp from 'sharp';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir  = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dir, '../public/icons');
const svgBuf = readFileSync(join(outDir, 'icon.svg'));

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

for (const s of sizes) {
  await sharp(svgBuf).resize(s, s).png().toFile(join(outDir, `icon-${s}.png`));
  console.log(`  ✓ icon-${s}.png`);
}

// Maskable variants (same graphic; manifest lists them separately so adaptive icons work on Android)
await sharp(svgBuf).resize(192, 192).png().toFile(join(outDir, 'icon-192-maskable.png'));
await sharp(svgBuf).resize(512, 512).png().toFile(join(outDir, 'icon-512-maskable.png'));

// Notification badge (small monochrome)
await sharp(svgBuf).resize(72, 72).png().toFile(join(outDir, 'badge-72x72.png'));

console.log('\nAll PWA icons generated in public/icons/');
