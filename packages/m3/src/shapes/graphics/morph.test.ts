// Ported from AndroidX graphics-shapes MorphTest.kt and the androidDeviceTest AndroidMorphTest.kt
// (Apache License 2.0).
import { describe, it } from 'vitest';
import type { Cubic } from './cubic.ts';
import { Morph } from './morph.ts';
import { Point } from './point.ts';
import { RoundedPolygon } from './roundedPolygon.ts';
import { assertTrue, cubicsEqualish } from './testUtils.ts';

/** Shortest distance from [p] to the outline of [cubics], approximated by a fine polyline. */
function distanceToOutline(p: Point, cubics: readonly Cubic[], segmentsPerCubic = 64): number {
  let best = Number.POSITIVE_INFINITY;
  for (const cubic of cubics) {
    let prev = cubic.pointOnCurve(0);
    for (let s = 1; s <= segmentsPerCubic; s++) {
      const next = cubic.pointOnCurve(s / segmentsPerCubic);
      const d = next.minus(prev);
      const len2 = d.getDistanceSquared();
      const t = len2 === 0 ? 0 : Math.min(1, Math.max(0, p.minus(prev).dotProduct(d) / len2));
      best = Math.min(best, p.minus(prev.plus(d.times(t))).getDistance());
      prev = next;
    }
  }
  return best;
}

describe('MorphTest', () => {
  const RADIUS = 50;
  const SCALE = RADIUS;

  const poly1 = RoundedPolygon.fromNumVertices(3, { centerX: 0.5, centerY: 0.5 });
  const poly2 = RoundedPolygon.fromNumVertices(4, { centerX: 0.5, centerY: 0.5 });
  const morph11 = new Morph(poly1, poly1);
  const morph12 = new Morph(poly1, poly2);

  /**
   * Simple test to verify that a Morph with the same start and end shape has curves equivalent to
   * those in that shape.
   */
  it('cubicsTest', () => {
    const p1Cubics = poly1.cubics;
    const cubics11 = morph11.asCubics(0);
    assertTrue(cubics11.length > 0);
    // The structure of a morph and its component shapes may not match exactly, because morph
    // calculations may optimize some of the zero-length curves out. But in general, every
    // curve in the morph *should* exist somewhere in the shape it is based on, so we
    // do an exhaustive search for such existence. Note that this assertion only works because
    // we constructed the Morph from/to the same shape. A Morph between different shapes
    // may not have the curves replicated exactly.
    for (const morphCubic of cubics11) {
      let matched = false;
      for (const p1Cubic of p1Cubics) {
        if (cubicsEqualish(morphCubic, p1Cubic)) {
          matched = true;
          continue;
        }
      }
      assertTrue(matched);
    }
  });

  /**
   * AndroidMorphTest.morphDrawingTest renders poly1/poly2 and morph12 at progress 0/1 to bitmaps
   * (scaled by SCALE) and requires identical pixels. Without a rasterizer, the equivalent check
   * here is geometric: every sampled point of the morph outline lies on the polygon's outline and
   * vice versa, within a fraction of a pixel at that scale.
   */
  it('morphDrawingTest (geometric equivalent)', () => {
    const tolerance = 0.01 / SCALE; // 1/100 px at the test's 100x100 px bitmap size
    const pairs: Array<[number, RoundedPolygon]> = [
      [0, poly1],
      [1, poly2],
    ];
    for (const [progress, polygon] of pairs) {
      const morphCubics = morph12.asCubics(progress);
      for (const [from, to] of [
        [morphCubics, polygon.cubics],
        [polygon.cubics, morphCubics],
      ] as const) {
        for (const cubic of from) {
          for (let s = 0; s <= 16; s++) {
            const d = distanceToOutline(cubic.pointOnCurve(s / 16), to);
            assertTrue(d < tolerance, `progress ${progress}: outline mismatch ${d}`);
          }
        }
      }
    }
  });
});
