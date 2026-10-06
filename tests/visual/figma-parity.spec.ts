import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { PNG } from 'pngjs';
import { compareImages } from './compare';
import { loadManifests, REFS_DIR } from './manifest';

const OUT = join(process.cwd(), 'tests/visual/__output__');

const DPR = 2;

function cropDevicePx(buf: Buffer, r: { x: number; y: number; width: number; height: number }): Buffer {
  const src = PNG.sync.read(buf);
  const [x, y, w, h] = [r.x, r.y, r.width, r.height].map(Math.round) as [number, number, number, number];
  if (x === 0 && y === 0 && w === src.width && h === src.height) return buf;
  const out = new PNG({ width: w, height: h });
  PNG.bitblt(src, out, x, y, w, h, 0, 0);
  return PNG.sync.write(out);
}

/** px. Covers Figma's 3-decimal export precision; ~1/30 of a device pixel at 2x. */
const BOX_EPSILON = 0.015;

const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

for (const manifest of loadManifests()) {
  test.describe(manifest.component, () => {
    for (const [name, v] of Object.entries(manifest.variants)) {
      const refPath = join(REFS_DIR, manifest.component, `${name}.png`);

      test(name, async ({ page }) => {
        test.skip(!existsSync(refPath), `no Figma ref at ${refPath}`);
        await page.goto(`/fixture/${manifest.component}/${name}`);
        await page.evaluate(() => document.fonts.ready);
        const node = page.locator('[data-fixture-node]');
        await expect(node).toBeVisible();
        const box = (await node.boundingBox())!;

        // 1. Node geometry must match exactly.
        expect.soft([box.width, box.height], 'node size (px)').toEqual(v.size);

        // 2. Layer boxes must match (fixture maps Figma layer names → selectors). Tolerance is
        //    numeric precision only: Figma exports path coordinates to 3 decimals.
        const layerMap = JSON.parse((await node.getAttribute('data-layer-map')) ?? '{}') as Record<string, string>;
        let maxBoxDelta = 0;
        for (const layer of v.layers ?? []) {
          const sel = layerMap[layer.name];
          if (!sel) continue;
          const lb = (await node.locator(sel).first().boundingBox())!;
          const rel = [lb.x - box.x, lb.y - box.y, lb.width, lb.height];
          const delta = Math.max(...rel.map((n, i) => Math.abs(n - layer.box[i]!)));
          maxBoxDelta = Math.max(maxBoxDelta, delta);
          expect
            .soft(delta, `layer "${layer.name}" box ${rel.map((n) => n.toFixed(3))} vs Figma ${layer.box}`)
            .toBeLessThanOrEqual(BOX_EPSILON);
        }

        // 3. Pixels. Clip to the same render bounds Figma exported. Playwright rounds clips to
        //    whole CSS px, so capture the enclosing whole-px rect and cut the exact device-px
        //    region ourselves (render bounds may sit on the 0.5px grid at 2x).
        const [rx, ry, rw, rh] = v.renderBounds ?? [0, 0, v.size[0], v.size[1]];
        const want = { x: box.x + rx, y: box.y + ry, width: rw, height: rh };
        const outer = {
          x: Math.floor(want.x),
          y: Math.floor(want.y),
          width: Math.ceil(want.x + want.width) - Math.floor(want.x),
          height: Math.ceil(want.y + want.height) - Math.floor(want.y),
        };
        const raw = await page.screenshot({ clip: outer, omitBackground: true, animations: 'disabled' });
        const shot = cropDevicePx(raw, {
          x: (want.x - outer.x) * DPR,
          y: (want.y - outer.y) * DPR,
          width: want.width * DPR,
          height: want.height * DPR,
        });
        const result = compareImages(readFileSync(refPath), shot, { background: hexToRgb(v.background ?? '#FFFFFF') });

        mkdirSync(join(OUT, manifest.component), { recursive: true });
        writeFileSync(join(OUT, manifest.component, `${name}.actual.png`), shot);
        writeFileSync(join(OUT, manifest.component, `${name}.diff.png`), result.diffPng);
        await test.info().attach('diff', { body: result.diffPng, contentType: 'image/png' });
        await test.info().attach('actual', { body: shot, contentType: 'image/png' });

        const pct = ((result.diffPixels / result.totalPixels) * 100).toFixed(3);
        test.info().annotations.push({
          type: 'parity',
          description: `${result.diffPixels} drift px (${pct}%; ${result.flatDriftPixels} flat) · ${result.aaPixels} AA · ${result.rasterPixels} glyph-edge raster (max Δ${result.rasterMaxDelta}/255)${v.layers?.length ? ` · layer Δ ${maxBoxDelta.toFixed(3)}px` : ''}`,
        });
        expect(result.sizeMatch, `image size ref ${result.refSize} vs actual ${result.actualSize}`).toBe(true);
        expect(result.diffPixels, `non-AA pixel drift (${pct}%)`).toBeLessThanOrEqual(v.allowedDiffPixels ?? 0);
      });
    }
  });
}
