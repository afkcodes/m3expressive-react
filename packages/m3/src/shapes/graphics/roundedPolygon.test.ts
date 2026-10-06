// Ported from AndroidX graphics-shapes RoundedPolygonTest.kt (Apache License 2.0).
import { describe, expect, it } from 'vitest';
import { CornerRounding } from './cornerRounding.ts';
import { Cubic } from './cubic.ts';
import { Corner, Edge, Feature } from './features.ts';
import { IllegalArgumentError, coerceAtMost } from './kotlin.ts';
import { Point } from './point.ts';
import { RoundedPolygon } from './roundedPolygon.ts';
import { circle, pill, pillStar, rectangle, star } from './shapes.ts';
import { assertEqualish, assertEqualsTol, assertInBounds, assertPolygonsEqualish } from './testUtils.ts';

function pointsToFloats(points: readonly Point[]): number[] {
  const result: number[] = [];
  for (const point of points) {
    result.push(point.x, point.y);
  }
  return result;
}

function show(cr: CornerRounding) {
  return `(r=${cr.radius}, s=${cr.smoothing})`;
}

describe('RoundedPolygonTest', () => {
  const rounding = new CornerRounding(0.1);
  const perVtxRounded = [rounding, rounding, rounding, rounding];

  it('numVertsConstructorTest', () => {
    expect(() => RoundedPolygon.fromNumVertices(2)).toThrow(IllegalArgumentError);

    const square = RoundedPolygon.fromNumVertices(4);
    let min = new Point(-1, -1);
    let max = new Point(1, 1);
    assertInBounds(square.cubics, min, max);

    const doubleSquare = RoundedPolygon.fromNumVertices(4, { radius: 2 });
    min = min.times(2);
    max = max.times(2);
    assertInBounds(doubleSquare.cubics, min, max);

    const squareRounded = RoundedPolygon.fromNumVertices(4, { rounding });
    min = new Point(-1, -1);
    max = new Point(1, 1);
    assertInBounds(squareRounded.cubics, min, max);

    const squarePVRounded = RoundedPolygon.fromNumVertices(4, { perVertexRounding: perVtxRounded });
    min = new Point(-1, -1);
    max = new Point(1, 1);
    assertInBounds(squarePVRounded.cubics, min, max);
  });

  it('verticesConstructorTest', () => {
    const p0 = new Point(1, 0);
    const p1 = new Point(0, 1);
    const p2 = new Point(-1, 0);
    const p3 = new Point(0, -1);
    const verts = [p0.x, p0.y, p1.x, p1.y, p2.x, p2.y, p3.x, p3.y];

    expect(() => RoundedPolygon.fromVertices([p0.x, p0.y, p1.x, p1.y])).toThrow(IllegalArgumentError);

    const manualSquare = RoundedPolygon.fromVertices(verts);
    let min = new Point(-1, -1);
    let max = new Point(1, 1);
    assertInBounds(manualSquare.cubics, min, max);

    const offset = new Point(1, 2);
    const offsetVerts = [
      p0.x + offset.x,
      p0.y + offset.y,
      p1.x + offset.x,
      p1.y + offset.y,
      p2.x + offset.x,
      p2.y + offset.y,
      p3.x + offset.x,
      p3.y + offset.y,
    ];
    const manualSquareOffset = RoundedPolygon.fromVertices(offsetVerts, { centerX: offset.x, centerY: offset.y });
    min = new Point(0, 1);
    max = new Point(2, 3);
    assertInBounds(manualSquareOffset.cubics, min, max);

    const manualSquareRounded = RoundedPolygon.fromVertices(verts, { rounding });
    min = new Point(-1, -1);
    max = new Point(1, 1);
    assertInBounds(manualSquareRounded.cubics, min, max);

    const manualSquarePVRounded = RoundedPolygon.fromVertices(verts, { perVertexRounding: perVtxRounded });
    min = new Point(-1, -1);
    max = new Point(1, 1);
    assertInBounds(manualSquarePVRounded.cubics, min, max);
  });

  it('featuresConstructorThrowsForTooFewFeatures', () => {
    expect(() => RoundedPolygon.fromFeatures([])).toThrow(IllegalArgumentError);
    const corner = new Corner([Cubic.empty(0, 0)]);
    expect(() => RoundedPolygon.fromFeatures([corner])).toThrow(IllegalArgumentError);
  });

  it('featuresConstructorThrowsForNonContinuousFeatures', () => {
    const cubic1 = Cubic.straightLine(0, 0, 1, 0);
    const cubic2 = Cubic.straightLine(10, 10, 20, 20);
    expect(() => RoundedPolygon.fromFeatures([Feature.buildEdge(cubic1), Feature.buildEdge(cubic2)])).toThrow(
      IllegalArgumentError,
    );
  });

  it('featuresConstructorReconstructsSquare', () => {
    const base = rectangle();
    const actual = RoundedPolygon.fromFeatures(base.features);
    assertPolygonsEqualish(base, actual);
  });

  it('featuresConstructorReconstructsRoundedSquare', () => {
    const base = rectangle({ rounding: new CornerRounding(0.5, 0.2) });
    const actual = RoundedPolygon.fromFeatures(base.features);
    assertPolygonsEqualish(base, actual);
  });

  it('featuresConstructorReconstructsCircles', () => {
    for (let i = 3; i <= 20; i++) {
      const base = circle({ numVertices: i });
      const actual = RoundedPolygon.fromFeatures(base.features);
      assertPolygonsEqualish(base, actual);
    }
  });

  it('featuresConstructorReconstructsStars', () => {
    for (let i = 3; i <= 20; i++) {
      const base = star(i);
      const actual = RoundedPolygon.fromFeatures(base.features);
      assertPolygonsEqualish(base, actual);
    }
  });

  it('featuresConstructorReconstructsRoundedStars', () => {
    for (let i = 3; i <= 20; i++) {
      const base = star(i, { rounding: new CornerRounding(0.5, 0.2) });
      const actual = RoundedPolygon.fromFeatures(base.features);
      assertPolygonsEqualish(base, actual);
    }
  });

  it('featuresConstructorReconstructsPill', () => {
    const base = pill();
    const actual = RoundedPolygon.fromFeatures(base.features);
    assertPolygonsEqualish(base, actual);
  });

  it('featuresConstructorReconstructsPillStar', () => {
    const base = pillStar({ rounding: new CornerRounding(0.5, 0.2) });
    const actual = RoundedPolygon.fromFeatures(base.features);
    assertPolygonsEqualish(base, actual);
  });

  it('computeCenterTest', () => {
    const polygon = RoundedPolygon.fromVertices([0, 0, 1, 0, 0, 1, 1, 1]);

    assertEqualsTol(0.5, polygon.centerX, 1e-4);
    assertEqualsTol(0.5, polygon.centerY, 1e-4);
  });

  it('roundingSpaceUsageTest', () => {
    const p0 = new Point(0, 0);
    const p1 = new Point(1, 0);
    const p2 = new Point(0.5, 1);
    const pvRounding = [new CornerRounding(1, 0), new CornerRounding(1, 1), CornerRounding.Unrounded];
    const polygon = RoundedPolygon.fromVertices(pointsToFloats([p0, p1, p2]), { perVertexRounding: pvRounding });

    // Since there is not enough room in the p0 -> p1 side even for the roundings, we shouldn't
    // take smoothing into account, so the corners should end in the middle point.
    const lowerEdgeFeature = polygon.features.find((it) => it instanceof Edge) as Edge;
    expect(lowerEdgeFeature.cubics.length).toBe(1);

    const lowerEdge = lowerEdgeFeature.cubics[0]!;
    assertEqualish(0.5, lowerEdge.anchor0X);
    assertEqualish(0.0, lowerEdge.anchor0Y);
    assertEqualish(0.5, lowerEdge.anchor1X);
    assertEqualish(0.0, lowerEdge.anchor1Y);
  });

  /*
   * In the following tests, we check how much was cut for the top left (vertex 0) and bottom
   * left corner (vertex 3).
   * In particular, both vertex are competing for space in the left side.
   *
   *   Vertex 0            Vertex 1
   *      *---------------------*
   *      |                     |
   *      *---------------------*
   *   Vertex 3            Vertex 2
   */
  const points = 20;

  function doUnevenSmoothTest(
    // Corner rounding parameter for vertex 0 (top left)
    rounding0: CornerRounding,
    expectedV0SX: number, // Expected total cut from vertex 0 towards vertex 1
    expectedV0SY: number, // Expected total cut from vertex 0 towards vertex 3
    expectedV3SY: number, // Expected total cut from vertex 3 towards vertex 0
    // Corner rounding parameter for vertex 3 (bottom left)
    rounding3: CornerRounding = new CornerRounding(0.5),
  ) {
    const p0 = new Point(0, 0);
    const p1 = new Point(5, 0);
    const p2 = new Point(5, 1);
    const p3 = new Point(0, 1);

    const pvRounding = [rounding0, CornerRounding.Unrounded, CornerRounding.Unrounded, rounding3];
    const polygon = RoundedPolygon.fromVertices(pointsToFloats([p0, p1, p2, p3]), { perVertexRounding: pvRounding });
    const [e01, , , e30] = polygon.features.filter((it) => it instanceof Edge);
    const msg = `r0 = ${show(rounding0)}, r3 = ${show(rounding3)}`;
    assertEqualish(expectedV0SX, e01!.cubics[0]!.anchor0X, msg);
    assertEqualish(expectedV0SY, e30!.cubics[0]!.anchor1Y, msg);
    assertEqualish(expectedV3SY, 1 - e30!.cubics[0]!.anchor0Y, msg);
  }

  it('unevenSmoothingTest', () => {
    // Vertex 3 has the default 0.5 radius, 0 smoothing.
    // Vertex 0 has 0.4 radius, and smoothing varying from 0 to 1.
    for (let it = 0; it < points + 1; it++) {
      const smooth = it / points;
      doUnevenSmoothTest(
        new CornerRounding(0.4, smooth),
        0.4 * (1 + smooth),
        coerceAtMost(0.4 * (1 + smooth), 0.5),
        0.5,
      );
    }
  });

  it('unevenSmoothingTest2', () => {
    // Vertex 3 has 0.2f radius and 0.2f smoothing, so it takes at most 0.4f
    // Vertex 0 has 0.4f radius and smoothing varies from 0 to 1, when it reaches 0.5 it starts
    // competing with vertex 3 for space.
    for (let it = 0; it < points + 1; it++) {
      const smooth = it / points;

      const smoothWantedV0 = 0.4 * smooth;
      const smoothWantedV3 = 0.2;

      // There is 0.4f room for smoothing
      const factor = coerceAtMost(0.4 / (smoothWantedV0 + smoothWantedV3), 1);
      doUnevenSmoothTest(
        new CornerRounding(0.4, smooth),
        0.4 * (1 + smooth),
        0.4 + factor * smoothWantedV0,
        0.2 + factor * smoothWantedV3,
        new CornerRounding(0.2, 1),
      );
    }
  });

  it('unevenSmoothingTest3', () => {
    // Vertex 3 has 0.6f radius.
    // Vertex 0 has 0.4f radius and smoothing varies from 0 to 1. There is no room for smoothing
    // on the segment between these vertices, but vertex 0 can still have smoothing on the top
    // side.
    for (let it = 0; it < points + 1; it++) {
      const smooth = it / points;

      doUnevenSmoothTest(new CornerRounding(0.4, smooth), 0.4 * (1 + smooth), 0.4, 0.6, new CornerRounding(0.6));
    }
  });

  it('creatingFullSizeTest', () => {
    const radius = 400;
    const innerRadiusFactor = 0.35;
    const innerRadius = radius * innerRadiusFactor;
    const roundingFactor = 0.32;

    const fullSizeShape = star(4, {
      radius,
      innerRadius,
      rounding: new CornerRounding(radius * roundingFactor),
      innerRounding: new CornerRounding(radius * roundingFactor),
      centerX: radius,
      centerY: radius,
    }).transformed((x, y) => [(x - radius) / radius, (y - radius) / radius]);

    const canonicalShape = star(4, {
      radius: 1,
      innerRadius: innerRadiusFactor,
      rounding: new CornerRounding(roundingFactor),
      innerRounding: new CornerRounding(roundingFactor),
    });

    const cubics = canonicalShape.cubics;
    const cubics1 = fullSizeShape.cubics;
    expect(cubics1.length).toBe(cubics.length);
    cubics.forEach((cubic, i) => {
      const cubic1 = cubics1[i]!;
      assertEqualish(cubic.anchor0X, cubic1.anchor0X);
      assertEqualish(cubic.anchor0Y, cubic1.anchor0Y);
      assertEqualish(cubic.anchor1X, cubic1.anchor1X);
      assertEqualish(cubic.anchor1Y, cubic1.anchor1Y);
      assertEqualish(cubic.control0X, cubic1.control0X);
      assertEqualish(cubic.control0Y, cubic1.control0Y);
      assertEqualish(cubic.control1X, cubic1.control1X);
      assertEqualish(cubic.control1Y, cubic1.control1Y);
    });
  });
});
