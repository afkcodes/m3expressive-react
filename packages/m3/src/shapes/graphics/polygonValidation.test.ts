// Ported from AndroidX graphics-shapes PolygonValidationTest.kt (Apache License 2.0).
import { describe, expect, it } from 'vitest';
import { CornerRounding } from './cornerRounding.ts';
import { PolygonValidator } from './polygonValidation.ts';
import { RoundedPolygon } from './roundedPolygon.ts';
import { assertPolygonsEqualish, assertTrue } from './testUtils.ts';

describe('PolygonValidationTest', () => {
  const pentagonPoints = [0.2, 0.0, 0.8, 0.0, 1.0, 0.6, 0.5, 1.0, 0.0, 0.6];

  const reverseOrientedPentagonPoints = [0.2, 0.0, 0.0, 0.6, 0.5, 1.0, 1.0, 0.6, 0.8, 0.0];

  function staysUnchanged(polygon: RoundedPolygon) {
    const copy = RoundedPolygon.copyOf(polygon);
    const fixedPolygon = PolygonValidator.fix(polygon);

    assertTrue(polygon === fixedPolygon);
    expect(copy.equals(polygon)).toBe(true);
  }

  function fixes(broken: RoundedPolygon, expected: RoundedPolygon) {
    const fixed = PolygonValidator.fix(broken);

    expect(broken.equals(fixed)).toBe(false);
    assertPolygonsEqualish(expected, fixed);
  }

  it('doesNotFixValidSharpPolygon', () => staysUnchanged(RoundedPolygon.fromNumVertices(5)));

  it('doesNotFixValidRoundPolygon', () =>
    staysUnchanged(RoundedPolygon.fromNumVertices(5, { rounding: new CornerRounding(0.5) })));

  it('fixesAntiClockwiseOrientedPolygon', () => {
    const valid = RoundedPolygon.fromVertices(pentagonPoints);

    const broken = RoundedPolygon.fromVertices(reverseOrientedPentagonPoints);

    fixes(broken, valid);
  });

  it('fixesAntiClockwiseOrientedRoundedPolygon', () => {
    const valid = RoundedPolygon.fromVertices(pentagonPoints, { rounding: new CornerRounding(0.5) });

    const broken = RoundedPolygon.fromVertices(reverseOrientedPentagonPoints, { rounding: new CornerRounding(0.5) });

    fixes(broken, valid);
  });
});
