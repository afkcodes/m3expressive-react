import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

export interface CompareResult {
  sizeMatch: boolean;
  refSize: [number, number];
  actualSize: [number, number];
  /** Pixels that differ beyond `threshold` and are NOT anti-aliasing. Target: 0. */
  diffPixels: number;
  /** Pixels that differ only as anti-aliasing (pixelmatch's detector). Reported, not failed. */
  aaPixels: number;
  /**
   * Pixels pixelmatch flagged that sit on a high-contrast edge in BOTH images and
   * differ by ≤ RASTER_MAX_DELTA — glyph/curve edge coverage computed differently by
   * Figma's and Chrome's rasterisers. Reported, not failed. A ½px or 1px geometric
   * shift produces deltas of ~100–200/255 along whole edges, so it can't hide here.
   */
  rasterPixels: number;
  /** Largest luminance delta (0–255) among raster pixels. */
  rasterMaxDelta: number;
  /**
   * Subset of diffPixels found by the flat-region rule (pixelmatch's perceptual threshold
   * misses small uniform colour errors, e.g. a #EFEFEF vs #F7F2FA background).
   */
  flatDriftPixels: number;
  totalPixels: number;
  diffPng: Buffer;
}

/** Flatten RGBA over an opaque background so transparent edges compare like-for-like. */
function flatten(png: PNG, bg: [number, number, number]): PNG {
  const out = new PNG({ width: png.width, height: png.height });
  for (let i = 0; i < png.data.length; i += 4) {
    const a = png.data[i + 3]! / 255;
    out.data[i] = Math.round(png.data[i]! * a + bg[0] * (1 - a));
    out.data[i + 1] = Math.round(png.data[i + 1]! * a + bg[1] * (1 - a));
    out.data[i + 2] = Math.round(png.data[i + 2]! * a + bg[2] * (1 - a));
    out.data[i + 3] = 255;
  }
  return out;
}

/** Max luminance delta (0–255) for an edge pixel to count as rasterisation rather than drift. */
export const RASTER_MAX_DELTA = 48;
/** Min local luminance range (3×3) for a pixel to count as an edge. */
const EDGE_MIN_RANGE = 64;
/** Uniform areas (3×3 luminance range ≤ 1 in both images) must match within this, per channel. */
export const UNIFORM_MAX_DELTA = 2;
/**
 * Smooth gradients (range < 8 in both, e.g. drop shadows) may differ by this much: Figma and
 * Chrome use different blur kernels. The shadow calibration in scripts/gen-tokens.ts (blur × 0.92,
 * alpha × 1.03) removed the systematic bias (mean Δ ≈ 0, was −1.3 at level 1); kernel-shape tails
 * still reach 6/255 on a few pixels.
 */
export const GRADIENT_MAX_DELTA = 6;
const SMOOTH_MAX_RANGE = 8;

const luma = (d: Buffer, i: number) => d[i]! * 0.299 + d[i + 1]! * 0.587 + d[i + 2]! * 0.114;

function localRange(d: Buffer, w: number, h: number, x: number, y: number) {
  let lo = 255;
  let hi = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const l = luma(d, (ny * w + nx) * 4);
      lo = Math.min(lo, l);
      hi = Math.max(hi, l);
    }
  }
  return hi - lo;
}

const isEdge = (d: Buffer, w: number, h: number, x: number, y: number) =>
  localRange(d, w, h, x, y) >= EDGE_MIN_RANGE;

/**
 * Any visible edge (local contrast ≥ 16 in both images): coverage differences up to 24/255 are
 * rasterisation (≈10% of full contrast, invisible on an edge). A 1px shift of an edge with real
 * contrast moves ≥ 48/255, so it still fails; layout shifts are also caught by the box checks.
 */
const SOFT_EDGE_MIN_RANGE = 16;
export const SOFT_EDGE_MAX_DELTA = 24;
/**
 * Coverage moving between neighbours shows up as opposite-signed differences next to each other.
 * A colour / paint-order change shifts every pixel the same way — that must not pass as raster.
 */
function hasOppositeNeighbour(r: Buffer, a: Buffer, w: number, h: number, x: number, y: number) {
  const i0 = (y * w + x) * 4;
  const sign = Math.sign(luma(a, i0) - luma(r, i0));
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const i = (ny * w + nx) * 4;
      const d = luma(a, i) - luma(r, i);
      if (Math.abs(d) >= 4 && Math.sign(d) === -sign) return true;
    }
  }
  return false;
}

const isLowContrastRaster = (r: Buffer, a: Buffer, w: number, h: number, x: number, y: number, delta: number) =>
  delta <= SOFT_EDGE_MAX_DELTA &&
  localRange(r, w, h, x, y) >= SOFT_EDGE_MIN_RANGE &&
  localRange(a, w, h, x, y) >= SOFT_EDGE_MIN_RANGE &&
  hasOppositeNeighbour(r, a, w, h, x, y);

export function compareImages(
  refBuf: Buffer,
  actualBuf: Buffer,
  { threshold = 0.05, background = [255, 255, 255] as [number, number, number] } = {},
): CompareResult {
  const ref = flatten(PNG.sync.read(refBuf), background);
  const actual = flatten(PNG.sync.read(actualBuf), background);
  const refSize: [number, number] = [ref.width, ref.height];
  const actualSize: [number, number] = [actual.width, actual.height];
  const sizeMatch = ref.width === actual.width && ref.height === actual.height;

  // On a size mismatch compare the overlapping region so the diff image still helps.
  const w = Math.min(ref.width, actual.width);
  const h = Math.min(ref.height, actual.height);
  const crop = (p: PNG) => {
    if (p.width === w && p.height === h) return p.data;
    const out = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y++) p.data.copy(out, y * w * 4, y * p.width * 4, y * p.width * 4 + w * 4);
    return out;
  };

  const diff = new PNG({ width: w, height: h });
  const AA: [number, number, number] = [255, 200, 0];
  const DIFF: [number, number, number] = [255, 0, 64];
  const RASTER: [number, number, number] = [0, 160, 255];
  const refData = crop(ref);
  const actualData = crop(actual);
  pixelmatch(refData, actualData, diff.data, w, h, {
    threshold,
    includeAA: false,
    aaColor: AA,
    diffColor: DIFF,
    alpha: 0.15,
  });
  let aaPixels = 0;
  let diffPixels = 0;
  let rasterPixels = 0;
  let rasterMaxDelta = 0;
  let flatDriftPixels = 0;
  const FLAT: [number, number, number] = [200, 0, 255];
  const is = (i: number, c: [number, number, number]) =>
    diff.data[i] === c[0] && diff.data[i + 1] === c[1] && diff.data[i + 2] === c[2];
  for (let i = 0; i < diff.data.length; i += 4) {
    if (is(i, AA)) {
      aaPixels++;
    } else if (is(i, DIFF)) {
      const p = i / 4;
      const x = p % w;
      const y = Math.floor(p / w);
      const delta = Math.abs(luma(refData, i) - luma(actualData, i));
      if (
        (delta <= RASTER_MAX_DELTA && isEdge(refData, w, h, x, y) && isEdge(actualData, w, h, x, y)) ||
        isLowContrastRaster(refData, actualData, w, h, x, y, delta)
      ) {
        rasterPixels++;
        rasterMaxDelta = Math.max(rasterMaxDelta, Math.round(delta));
        diff.data.set(RASTER, i);
      } else {
        diffPixels++;
      }
    } else {
      // Flat-region rule for pixels pixelmatch considered equal.
      const p = i / 4;
      const x = p % w;
      const y = Math.floor(p / w);
      const d = Math.max(
        Math.abs(refData[i]! - actualData[i]!),
        Math.abs(refData[i + 1]! - actualData[i + 1]!),
        Math.abs(refData[i + 2]! - actualData[i + 2]!),
      );
      if (d <= UNIFORM_MAX_DELTA) continue;
      const rr = localRange(refData, w, h, x, y);
      const ra = localRange(actualData, w, h, x, y);
      const uniform = rr <= 1 && ra <= 1;
      const smooth = rr < SMOOTH_MAX_RANGE && ra < SMOOTH_MAX_RANGE;
      if (uniform || (smooth && d > GRADIENT_MAX_DELTA)) {
        diffPixels++;
        flatDriftPixels++;
        diff.data.set(FLAT, i);
      }
    }
  }

  return {
    sizeMatch,
    refSize,
    actualSize,
    diffPixels,
    aaPixels,
    rasterPixels,
    rasterMaxDelta,
    flatDriftPixels,
    totalPixels: w * h,
    diffPng: PNG.sync.write(diff),
  };
}
