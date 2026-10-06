/**
 * Cut per-variant reference PNGs out of whole-frame Figma exports.
 *
 *   node scripts/figma-crop.ts <component>
 *
 * For every variant with `crop` in figma/<component>/manifest.json, takes
 * (crop.x + renderBounds.x, crop.y + renderBounds.y, renderBounds.w, renderBounds.h)
 * × scale from frames[crop.frame] and writes figma/<component>/<variant>.png.
 * Exporting a component set once and cropping is exact (same renderer, same
 * pixels) and avoids one Figma call per variant.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import type { Manifest } from '../tests/visual/manifest.ts';

const component = process.argv[2];
if (!component) {
  console.error('usage: node scripts/figma-crop.ts <component>');
  process.exit(1);
}
const dir = join(process.cwd(), 'figma', component);
const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')) as Manifest;
const frames = new Map<string, PNG>();
const s = manifest.scale;

for (const [name, v] of Object.entries(manifest.variants)) {
  if (!v.crop) continue;
  const frameDef = manifest.frames?.[v.crop.frame];
  if (!frameDef) throw new Error(`${name}: unknown frame "${v.crop.frame}"`);
  if (!frames.has(v.crop.frame)) frames.set(v.crop.frame, PNG.sync.read(readFileSync(join(dir, frameDef.file))));
  const src = frames.get(v.crop.frame)!;

  const [rx, ry, rw, rh] = v.renderBounds ?? [0, 0, v.size[0], v.size[1]];
  // The export's top-left is the frame's render-bounds origin (shadows can extend past the frame).
  const [ox, oy] = frameDef.origin ?? [0, 0];
  const x0 = (v.crop.x - ox + rx) * s;
  const y0 = (v.crop.y - oy + ry) * s;
  const w = rw * s;
  const h = rh * s;
  if (![x0, y0, w, h].every(Number.isInteger)) {
    throw new Error(`${name}: crop is not pixel-aligned at ${s}x (${x0},${y0} ${w}×${h})`);
  }
  if (x0 < 0 || y0 < 0 || x0 + w > src.width || y0 + h > src.height) {
    throw new Error(`${name}: crop ${x0},${y0} ${w}×${h} outside frame ${src.width}×${src.height}`);
  }
  const out = new PNG({ width: w, height: h });
  PNG.bitblt(src, out, x0, y0, w, h, 0, 0);
  writeFileSync(join(dir, `${name}.png`), PNG.sync.write(out));
  console.log(`✓ ${name}  ${w}×${h}`);
}
