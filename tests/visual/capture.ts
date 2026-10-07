import type { Locator, Page } from '@playwright/test';
import { PNG } from 'pngjs';

export const DPR = 2;

/** Crop a PNG buffer to an exact device-pixel rectangle. */
export function cropDevicePx(buf: Buffer, r: { x: number; y: number; width: number; height: number }): Buffer {
  const src = PNG.sync.read(buf);
  const [x, y, w, h] = [r.x, r.y, r.width, r.height].map(Math.round) as [number, number, number, number];
  if (x === 0 && y === 0 && w === src.width && h === src.height) return buf;
  const out = new PNG({ width: w, height: h });
  PNG.bitblt(src, out, x, y, w, h, 0, 0);
  return PNG.sync.write(out);
}

/**
 * Screenshot `renderBounds` (CSS px, relative to the node's top-left) at device-pixel precision.
 * Playwright rounds clips to whole CSS px, so capture the enclosing rect and cut it down.
 */
export async function captureRegion(
  page: Page,
  node: Locator,
  [rx, ry, rw, rh]: readonly [number, number, number, number] | number[],
): Promise<Buffer> {
  const box = (await node.boundingBox())!;
  const want = { x: box.x + rx, y: box.y + ry, width: rw, height: rh };
  const outer = {
    x: Math.floor(want.x),
    y: Math.floor(want.y),
    width: Math.ceil(want.x + want.width) - Math.floor(want.x),
    height: Math.ceil(want.y + want.height) - Math.floor(want.y),
  };
  const raw = await page.screenshot({ clip: outer, omitBackground: true, animations: 'allow' });
  return cropDevicePx(raw, {
    x: (want.x - outer.x) * DPR,
    y: (want.y - outer.y) * DPR,
    width: want.width * DPR,
    height: want.height * DPR,
  });
}

export const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
