// Ported from AndroidX graphics-shapes FeatureDetectorTest.kt (Apache License 2.0).
import { describe, expect, it } from 'vitest';
import { CornerRounding } from './cornerRounding.ts';
import { Cubic } from './cubic.ts';
import { alignsIshWith, asFeature, detectFeatures, smoothesIntoIsh, straightIsh } from './featureDetector.ts';
import { Corner, Edge, type Feature } from './features.ts';
import { Point } from './point.ts';
import { RoundedPolygon } from './roundedPolygon.ts';
import { pillStar } from './shapes.ts';
import { assertFeaturesEqualish, assertPointsEqualish, assertTrue } from './testUtils.ts';

function zipWithNextAll(features: readonly Feature[], predicate: (first: Feature, second: Feature) => boolean) {
  for (let i = 0; i < features.length - 1; i++) {
    if (!predicate(features[i]!, features[i + 1]!)) return false;
  }
  return true;
}

const edgeCornerAlternates = (first: Feature, second: Feature) =>
  (first instanceof Edge && second instanceof Corner) || (first instanceof Corner && second instanceof Edge);

describe('FeatureDetectorTest', () => {
  it('recognizesStraightness', () => {
    assertTrue(straightIsh(Cubic.straightLine(0, 0, 1, 0)));
  });

  it('recognizesStraightnessIsh', () => {
    const slightlyNotStraightCubic = new Cubic(323.508, 201.759, 317.35, 192.008, 311.193, 182.227, 305.035, 172.475);
    assertTrue(straightIsh(slightlyNotStraightCubic));
  });

  it('recognizesCurvature', () => {
    const roundCubic = new Cubic(0, 0, 0.5, 0.5, 0.5, 0.5, 1, 0);
    expect(straightIsh(roundCubic)).toBe(false);
  });

  it('recognizesSmoothnessForCurvedCubic', () => {
    const baseCubic = new Cubic(0, 0, 0, 10, 10, 10, 10, 0);
    const smoothContinuation = new Cubic(10, 0, 10, -10, 20, -10, 20, 0);

    assertTrue(smoothesIntoIsh(baseCubic, smoothContinuation));
  });

  it('recognizesSmoothnessForStraightCubic', () => {
    const baseCubic = Cubic.straightLine(0, 0, 10, 0);
    const smoothContinuation = Cubic.straightLine(10, 0, 20, 0);

    assertTrue(smoothesIntoIsh(baseCubic, smoothContinuation));
  });

  it('recognizesSmoothnessWithinRelativeTolerance', () => {
    // These two cubics are from the edge of an imported shape. Even though they don't
    // count as smooth within the absolute distance epsilon, relatively seen they should count.
    const baseCubic = new Cubic(323.508, 201.759, 317.35, 192.008, 311.193, 182.227, 305.008, 172.475);
    const smoothContinuation = new Cubic(305.008, 172.475, 290.812, 149.962, 276.617, 127.42, 262.422, 104.907);

    assertTrue(smoothesIntoIsh(baseCubic, smoothContinuation));
  });

  it('emptyCubicsAreNotStraightIsh', () => {
    expect(straightIsh(Cubic.empty(10, 10))).toBe(false);
  });

  it('recognizesAlignmentForStraightLines', () => {
    const baseCubic = Cubic.straightLine(0, 0, 10, 0);
    const smoothContinuation = Cubic.straightLine(10, 0, 20, 0);

    assertTrue(alignsIshWith(baseCubic, smoothContinuation));
  });

  it('recognizesAlignmentWithinRelativeTolerance', () => {
    // These two cubics are from the edge of an imported shape. Even though the second edge
    // is very small within the given scale, it is not empty. However, even the length of
    // 0.027 is so relatively tiny in the given range of coordinates, that it should be seen as
    // an empty cubic. Therefore, the second can be seen as an extend of the first.
    const baseCubic = new Cubic(323.508, 201.759, 317.35, 192.008, 311.193, 182.227, 305.035, 172.475);
    const smoothContinuation = Cubic.straightLine(305.035, 172.475, 305.008, 172.475);

    assertTrue(alignsIshWith(baseCubic, smoothContinuation));
  });

  it('includesAlignmentForEmptyCubics', () => {
    const base = Cubic.straightLine(0, 0, 10, 0);
    const empty = Cubic.empty(10, 0);

    assertTrue(alignsIshWith(base, empty));
    assertTrue(alignsIshWith(empty, base));
  });

  it('convertsStraightCubicToEdge', () => {
    const cubic = Cubic.straightLine(0, 0, 10, 0);
    const followingCubic = Cubic.straightLine(10, 0, 20, 0);

    const converted = asFeature(cubic, followingCubic);
    const expected = new Edge([cubic]);

    assertTrue(converted instanceof Edge);
    assertFeaturesEqualish(expected, converted);
  });

  it('convertsCurvedCubicToCorner', () => {
    const cubic = new Cubic(0, 0, 0.5, 0.5, 0.5, 0.5, 1, 0);
    const followingCubic = new Cubic(1, 0, 1.5, 1.5, 1.5, 1.5, 2, 0);

    const converted = asFeature(cubic, followingCubic);
    const expected = new Corner([cubic], false);

    assertTrue(converted instanceof Corner);
    assertFeaturesEqualish(expected, converted);
  });

  it('convertsEmptyCubicToCorner', () => {
    const cubic = Cubic.empty(1, 0);
    const followingCubic = new Cubic(1, 0, 1.5, 1.5, 1.5, 1.5, 2, 0);

    const converted = asFeature(cubic, followingCubic);
    const expected = new Corner([cubic], false);

    assertTrue(converted instanceof Corner);
    assertFeaturesEqualish(expected, converted);
  });

  it('reconstructsPillStar', () => {
    const originalPolygon = pillStar();
    const splitCubics = originalPolygon.cubics.flatMap((it) => it.split(0.5));

    const createdPolygon = RoundedPolygon.fromFeatures(detectFeatures(splitCubics), {
      centerX: originalPolygon.centerX,
      centerY: originalPolygon.centerY,
    });

    // It's okay if the cubics' control points aren't the same, as long as the shape is the same
    expect(createdPolygon.cubics.length).toBe(originalPolygon.cubics.length);
    createdPolygon.cubics.forEach((created, i) => {
      const original = originalPolygon.cubics[i]!;

      // pillStar has no roundings, so the created cubics shouldn't be as well
      assertTrue(straightIsh(created));
      assertTrue(straightIsh(original));

      assertPointsEqualish(
        new Point(created.anchor0X, created.anchor0Y),
        new Point(original.anchor0X, original.anchor0Y),
      );
      assertPointsEqualish(
        new Point(created.anchor1X, created.anchor1Y),
        new Point(original.anchor1X, original.anchor1Y),
      );
    });

    // The order of the features can be different, as long as they describe the same shape
    expect(createdPolygon.features.length).toBe(originalPolygon.features.length);
    expect(createdPolygon.features.filter((it) => it instanceof Corner).length).toBe(
      originalPolygon.features.filter((it) => it instanceof Corner).length,
    );
    expect(createdPolygon.features.filter((it) => it instanceof Edge).length).toBe(
      originalPolygon.features.filter((it) => it instanceof Edge).length,
    );
    assertTrue(zipWithNextAll(createdPolygon.features, edgeCornerAlternates));
    assertTrue(
      createdPolygon.features
        .filter((it) => it instanceof Corner)
        .every((it) => it.cubics.length === 1 && it.cubics[0]!.zeroLength()),
    );
  });

  it('reconstructsRoundedPillStarCloseEnough', () => {
    // This test aims to ensure that our distance epsilon is not set too high that
    // the roundings of pill star gets pointy as they are small in the [0,1] space
    const originalPolygon = pillStar({ rounding: new CornerRounding(0.2) });
    const createdPolygon = RoundedPolygon.fromFeatures(detectFeatures(originalPolygon.cubics), {
      centerX: originalPolygon.centerX,
      centerY: originalPolygon.centerY,
    });

    expect(createdPolygon.cubics.length).toBe(originalPolygon.cubics.length);
    // Allow up to one difference...
    expect(1).toBe(Math.abs(originalPolygon.features.length - createdPolygon.features.length));
    // ...as long as the edge - corner pattern persists
    assertTrue(zipWithNextAll(createdPolygon.features, edgeCornerAlternates));
  });
});
