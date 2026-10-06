// Ported from AndroidX graphics-shapes FeatureMappingTest.kt and the androidDeviceTest
// AndroidFeatureMappingTest.kt (Apache License 2.0).
import { describe, expect, it } from 'vitest';
import { CornerRounding } from './cornerRounding.ts';
import { doMapping, featureDistSquared } from './featureMapping.ts';
import { LengthMeasurer, MeasuredPolygon } from './polygonMeasure.ts';
import { RoundedPolygon } from './roundedPolygon.ts';
import { star } from './shapes.ts';
import { assertEqualish, assertTrue, pointRotator } from './testUtils.ts';

function verifyMapping(p1: RoundedPolygon, p2: RoundedPolygon, validator: (distances: number[]) => void) {
  const f1 = MeasuredPolygon.measurePolygon(new LengthMeasurer(), p1).features;
  const f2 = MeasuredPolygon.measurePolygon(new LengthMeasurer(), p2).features;

  // Maps progress in p1 to progress in p2
  const map = doMapping(f1, f2);

  // See which features where actually mapped and the distance between their representative
  // points
  const distances: number[] = [];
  map.forEach(([progress1, progress2]) => {
    const feature1 = f1.find((it) => it.progress === progress1)!;
    const feature2 = f2.find((it) => it.progress === progress2)!;
    distances.push(featureDistSquared(feature1.feature, feature2.feature));
  });

  validator(distances.sort((a, b) => b - a));
}

describe('FeatureMappingTest', () => {
  const triangleWithRoundings = RoundedPolygon.fromNumVertices(3, { rounding: new CornerRounding(0.2) });
  const triangle = RoundedPolygon.fromNumVertices(3);
  const square = RoundedPolygon.fromNumVertices(4);

  it('featureMappingTriangles', () =>
    verifyMapping(triangleWithRoundings, triangle, (distances) => {
      distances.forEach((it) => assertTrue(it < 0.1));
    }));

  it('featureMappingTriangleToSquare', () =>
    verifyMapping(triangle, square, (distances) => {
      // We have one exact match (both have points at 0 degrees), and 2 close ones
      expect(distances.length).toBe(3);
      assertEqualish(distances[0]!, distances[1]!);
      assertTrue(distances[0]! < 0.3);
      assertTrue(distances[2]! < 1e-6);
    }));

  it('featureMappingSquareToTriangle', () =>
    verifyMapping(square, triangle, (distances) => {
      // We have one exact match (both have points at 0 degrees), and 2 close ones
      expect(distances.length).toBe(3);

      assertEqualish(distances[0]!, distances[1]!);
      assertTrue(distances[0]! < 0.3);
      assertTrue(distances[2]! < 1e-6);
    }));

  // Upstream marks this @IgnoreJsTarget ("Due to float rounding issue it fails with 'There can't be
  // two features with the same progress'"); it passes in this port.
  it('featureMappingDoesNotCrash', () => {
    // Verify that complicated shapes can be matched (this used to crash before).
    const checkmark = RoundedPolygon.fromVertices([
      400, -304, 240, -464, 296, -520, 400, -416, 664, -680, 720, -624, 400, -304,
    ]).normalized();
    const verySunny = star(8, { innerRadius: 0.65, rounding: new CornerRounding(0.15) }).normalized();
    verifyMapping(checkmark, verySunny, (it) => {
      // Most vertices on the checkmark map to a feature in the second shape.
      assertTrue(it.length >= 6);

      // And they are close enough
      assertTrue(it[0]! < 0.15);
    });
  });

  // From AndroidFeatureMappingTest (androidDeviceTest), which extends FeatureMappingTest.
  const squareRotated = RoundedPolygon.fromNumVertices(4).transformed(pointRotator(45));

  it('featureMappingSquareRotatedToTriangle', () =>
    verifyMapping(squareRotated, triangle, (distances) => {
      // We have a very bad mapping (the triangle vertex just in the middle of one of the
      // square's sides) and 2 decent ones.
      assertTrue(distances.length === 3);

      assertTrue(distances[0]! > 0.5);
      assertEqualish(distances[1]!, distances[2]!);
      assertTrue(distances[2]! < 0.1);
    }));
});
