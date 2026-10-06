// Ported from AndroidX graphics-shapes PolygonTest.kt and the androidDeviceTest
// AndroidPolygonTest.kt (Apache License 2.0).
import { describe, expect, it } from 'vitest';
import { CornerRounding } from './cornerRounding.ts';
import type { Cubic, PointTransformer } from './cubic.ts';
import { Point } from './point.ts';
import { RoundedPolygon } from './roundedPolygon.ts';
import {
  assertCubicListsEqualish,
  assertCubicsEqualish,
  assertEqualish,
  assertInBounds,
  assertPointsEqualish,
  assertTrue,
  identityTransform,
  scaleTransform,
  translateTransform,
} from './testUtils.ts';

function nonzeroCubics(original: readonly Cubic[]): Cubic[] {
  const result: Cubic[] = [];
  for (let i = 0; i < original.length; i++) {
    if (!original[i]!.zeroLength()) result.push(original[i]!);
  }
  return result;
}

describe('PolygonTest', () => {
  const square = RoundedPolygon.fromNumVertices(4);
  const roundedSquare = RoundedPolygon.fromNumVertices(4, { rounding: new CornerRounding(0.2) });
  const pentagon = RoundedPolygon.fromNumVertices(5);

  it('constructionTest', () => {
    // We can't be too specific on how exactly the square is constructed, but
    // we can at least test whether all points are within the unit square
    let min = new Point(-1, -1);
    let max = new Point(1, 1);
    assertInBounds(square.cubics, min, max);

    const doubleSquare = RoundedPolygon.fromNumVertices(4, { radius: 2 });
    min = min.times(2);
    max = max.times(2);
    assertInBounds(doubleSquare.cubics, min, max);

    const offsetSquare = RoundedPolygon.fromNumVertices(4, { centerX: 1, centerY: 2 });
    min = new Point(0, 1);
    max = new Point(2, 3);
    assertInBounds(offsetSquare.cubics, min, max);

    const squareCopy = RoundedPolygon.copyOf(square);
    min = new Point(-1, -1);
    max = new Point(1, 1);
    assertInBounds(squareCopy.cubics, min, max);

    const p0 = new Point(1, 0);
    const p1 = new Point(0, 1);
    const p2 = new Point(-1, 0);
    const p3 = new Point(0, -1);
    const manualSquare = RoundedPolygon.fromVertices([p0.x, p0.y, p1.x, p1.y, p2.x, p2.y, p3.x, p3.y]);
    min = new Point(-1, -1);
    max = new Point(1, 1);
    assertInBounds(manualSquare.cubics, min, max);

    const offset = new Point(1, 2);
    const p0Offset = p0.plus(offset);
    const p1Offset = p1.plus(offset);
    const p2Offset = p2.plus(offset);
    const p3Offset = p3.plus(offset);
    const manualSquareOffset = RoundedPolygon.fromVertices(
      [p0Offset.x, p0Offset.y, p1Offset.x, p1Offset.y, p2Offset.x, p2Offset.y, p3Offset.x, p3Offset.y],
      { centerX: offset.x, centerY: offset.y },
    );
    min = new Point(0, 1);
    max = new Point(2, 3);
    assertInBounds(manualSquareOffset.cubics, min, max);
  });

  it('boundsTest', () => {
    let bounds = square.calculateBounds();
    assertEqualish(-1, bounds[0]!); // Left
    assertEqualish(-1, bounds[1]!); // Top
    assertEqualish(1, bounds[2]!); // Right
    assertEqualish(1, bounds[3]!); // Bottom

    let betterBounds = square.calculateBounds(undefined, false);
    assertEqualish(-1, betterBounds[0]!); // Left
    assertEqualish(-1, betterBounds[1]!); // Top
    assertEqualish(1, betterBounds[2]!); // Right
    assertEqualish(1, betterBounds[3]!); // Bottom

    // roundedSquare's approximate bounds will be larger due to control points
    bounds = roundedSquare.calculateBounds();
    betterBounds = roundedSquare.calculateBounds(undefined, false);
    assertTrue(
      betterBounds[2]! - betterBounds[0]! < bounds[2]! - bounds[0]!,
      `bounds ${bounds[0]}, ${bounds[1]}, ${bounds[2]}, ${bounds[3]}, ` +
        `betterBounds = ${betterBounds[0]}, ${betterBounds[1]}, ${betterBounds[2]}, ` +
        `${betterBounds[3]}`,
    );

    bounds = pentagon.calculateBounds();
    const maxBounds = pentagon.calculateMaxBounds();
    assertTrue(maxBounds[2]! - maxBounds[0]! > bounds[2]! - bounds[0]!);
  });

  it('centerTest', () => {
    assertPointsEqualish(new Point(0, 0), new Point(square.centerX, square.centerY));
  });

  it('transformTest', () => {
    // First, make sure the shape doesn't change when transformed by the identity
    const squareCopy = square.transformed(identityTransform());
    const n = square.cubics.length;

    expect(squareCopy.cubics.length).toBe(n);
    for (let i = 0; i < n; i++) {
      assertCubicsEqualish(square.cubics[i]!, squareCopy.cubics[i]!);
    }

    // Now create a function which translates points by (1, 2) and make sure
    // the shape is translated similarly by it
    const offset = new Point(1, 2);
    const squareCubics = square.cubics;
    const translator = translateTransform(offset.x, offset.y);
    const translatedSquareCubics = square.transformed(translator).cubics;

    for (let i = 0; i < squareCubics.length; i++) {
      const c = squareCubics[i]!;
      const t = translatedSquareCubics[i]!;
      assertPointsEqualish(new Point(c.anchor0X, c.anchor0Y).plus(offset), new Point(t.anchor0X, t.anchor0Y));
      assertPointsEqualish(new Point(c.control0X, c.control0Y).plus(offset), new Point(t.control0X, t.control0Y));
      assertPointsEqualish(new Point(c.control1X, c.control1Y).plus(offset), new Point(t.control1X, t.control1Y));
      assertPointsEqualish(new Point(c.anchor1X, c.anchor1Y).plus(offset), new Point(t.anchor1X, t.anchor1Y));
    }
  });

  it('featuresTest', () => {
    const squareFeatures = square.features;

    // Verify that cubics of polygon == nonzero cubics of features of that polygon
    // Note the Equalish test since some points may be adjusted in conversion from raw
    // cubics in the feature to the cubics list for the shape
    let nonzero = nonzeroCubics(squareFeatures.flatMap((it) => it.cubics));
    assertCubicListsEqualish(square.cubics, nonzero);

    // Same as the first polygon test, but with a copy of that polygon
    const squareCopy = RoundedPolygon.copyOf(square);
    const squareCopyFeatures = squareCopy.features;
    nonzero = nonzeroCubics(squareCopyFeatures.flatMap((it) => it.cubics));
    assertCubicListsEqualish(squareCopy.cubics, nonzero);
  });

  it('emptyPolygonTest', () => {
    const poly = RoundedPolygon.fromNumVertices(6, { radius: 0, rounding: new CornerRounding(0.1) });
    expect(poly.cubics.length).toBe(1);

    const stillEmpty = poly.transformed(scaleTransform(10, 20));
    expect(stillEmpty.cubics.length).toBe(1);
    assertTrue(stillEmpty.cubics[0]!.zeroLength());
  });

  it('emptySideTest', () => {
    const poly1 = RoundedPolygon.fromVertices(
      [0, 0, 1, 0, 1, 0, 0, 1], // Triangle with one point repeated
    );
    const poly2 = RoundedPolygon.fromVertices(
      [0, 0, 1, 0, 0, 1], // Triangle
    );
    assertCubicListsEqualish(poly1.cubics, poly2.cubics);
  });

  // From AndroidPolygonTest (androidDeviceTest): android.graphics.Matrix with
  // postRotate(45), postScale(648, 648), postTranslate(540, 1212).
  it('transformKeepsContiguousAnchorsEqual', () => {
    const r = (45 * Math.PI) / 180;
    const c = Math.cos(r);
    const s = Math.sin(r);
    const matrix: PointTransformer = (x, y) => [(c * x - s * y) * 648 + 540, (s * x + c * y) * 648 + 1212];
    const poly = RoundedPolygon.fromNumVertices(4, { radius: 1, rounding: new CornerRounding(7 / 15) }).transformed(
      matrix,
    );
    poly.cubics.forEach((cubic, i) => {
      // It has to be the same point
      const next = poly.cubics[(i + 1) % poly.cubics.length]!;
      expect(next.anchor0X, `Failed at X, index ${i}`).toBe(cubic.anchor1X);
      expect(next.anchor0Y, `Failed at Y, index ${i}`).toBe(cubic.anchor1Y);
    });
  });
});
