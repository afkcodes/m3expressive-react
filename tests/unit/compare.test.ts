import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import { compareImages, RASTER_MAX_DELTA, UNIFORM_MAX_DELTA } from '../visual/compare.ts';

/*
 * The parity classifier decides what counts as drift. These synthetic cases pin each rule down —
 * especially the ones that must NOT excuse real differences (CLAUDE.md §2: the sign-check rule exists
 * because a global tolerance once hid a systematic colour change).
 */

type Pixel = [number, number, number];
const W = 24;
const H = 24;

function image(paint: (x: number, y: number) => Pixel, w = W, h = H): Buffer {
  const png = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const [r, g, b] = paint(x, y);
      png.data[i] = r;
      png.data[i + 1] = g;
      png.data[i + 2] = b;
      png.data[i + 3] = 255;
    }
  return PNG.sync.write(png);
}

const grey = (v: number): Pixel => [v, v, v];
/** A vertical black / white edge at x = `at` (fractional `at` = one partially covered column). */
const edge = (at: number) => (x: number) => {
  const cover = Math.min(1, Math.max(0, at - x)); // share of pixel x left of the edge
  return grey(Math.round(255 * (1 - cover)));
};

describe('compareImages', () => {
  it('identical images: nothing to report', () => {
    const img = image(edge(12));
    const r = compareImages(img, img);
    expect(r.sizeMatch).toBe(true);
    expect([r.diffPixels, r.aaPixels, r.rasterPixels]).toEqual([0, 0, 0]);
  });

  it(`flat areas match within ±${UNIFORM_MAX_DELTA} per channel — and not one more`, () => {
    const ref = image(() => [240, 236, 248]);
    expect(
      compareImages(
        ref,
        image(() => [242, 238, 246]),
      ).diffPixels,
    ).toBe(0);
    const off = compareImages(
      ref,
      image(() => [243, 236, 248]),
    );
    expect(off.flatDriftPixels).toBe(W * H);
    expect(off.diffPixels).toBe(W * H);
  });

  it(`edge coverage moved between neighbours (≤ ${RASTER_MAX_DELTA}/255) is raster, not drift`, () => {
    // Figma vs Chrome antialiasing: the partially covered column differs a little, opposite signs
    // on either side of the edge.
    const ref = image(edge(12.5));
    const actual = image((x) => (x === 12 ? grey(150) : x === 11 ? grey(20) : edge(12.5)(x)));
    const r = compareImages(ref, actual);
    expect(r.diffPixels).toBe(0);
    expect(r.rasterPixels + r.aaPixels).toBeGreaterThan(0);
  });

  it('a 1px shift of a high-contrast edge is drift', () => {
    const r = compareImages(image(edge(12)), image(edge(13)));
    expect(r.diffPixels).toBeGreaterThan(0);
  });

  it('a uniform colour change on a soft edge is drift (same sign everywhere: not coverage)', () => {
    // A soft edge (contrast ≥ 16) whose every pixel got 20 levels darker — a token / paint-order
    // change, which the low-contrast raster rule must not excuse.
    const soft = (x: number) => grey(200 + Math.max(-30, Math.min(30, (x - 12) * 15)));
    const darker = (x: number) => {
      const [v] = soft(x);
      return grey(v - 20);
    };
    const r = compareImages(image(soft), image(darker));
    expect(r.diffPixels).toBeGreaterThan(0);
  });

  it('size mismatch is reported (and the overlap still compared)', () => {
    const r = compareImages(
      image(() => grey(255)),
      image(() => grey(255), W + 2, H),
    );
    expect(r.sizeMatch).toBe(false);
    expect(r.refSize).toEqual([W, H]);
    expect(r.actualSize).toEqual([W + 2, H]);
  });

  it('transparent pixels are flattened onto the given background first', () => {
    const transparent = new PNG({ width: W, height: H }); // all zeros: fully transparent
    const r = compareImages(
      PNG.sync.write(transparent),
      image(() => [247, 242, 250]),
      { background: [247, 242, 250] },
    );
    expect(r.diffPixels).toBe(0);
  });
});
