// Ported from AndroidX graphics-shapes PolygonMeasureTest.kt (Apache License 2.0).
import { describe, expect, it } from 'vitest';
import { CornerRounding } from './cornerRounding.ts';
import { Cubic } from './cubic.ts';
import { Feature } from './features.ts';
import { LengthMeasurer, MeasuredPolygon } from './polygonMeasure.ts';
import { RoundedPolygon } from './roundedPolygon.ts';
import { circle } from './shapes.ts';
import { assertEqualish, assertEqualsTol, assertTrue } from './testUtils.ts';

describe('PolygonMeasureTest', () => {
  const measurer = new LengthMeasurer();

  function irregularPolygonMeasure(
    polygon: RoundedPolygon,
    extraChecks: (measuredPolygon: MeasuredPolygon) => void = () => {},
  ) {
    const measuredPolygon = MeasuredPolygon.measurePolygon(measurer, polygon);

    expect(measuredPolygon.first().startOutlineProgress).toBe(0);
    expect(measuredPolygon.last().endOutlineProgress).toBe(1);

    [...measuredPolygon].forEach((measuredCubic, index) => {
      if (index > 0) {
        expect(measuredCubic.startOutlineProgress).toBe(measuredPolygon.get(index - 1).endOutlineProgress);
      }
      assertTrue(measuredCubic.endOutlineProgress >= measuredCubic.startOutlineProgress);
    });

    measuredPolygon.features.forEach((progressableFeature, index) => {
      assertTrue(
        progressableFeature.progress >= 0 && progressableFeature.progress < 1,
        `Feature #${index} has invalid progress: ${progressableFeature.progress}`,
      );
    });

    extraChecks(measuredPolygon);
  }

  function regularPolygonMeasure(sides: number, rounding: CornerRounding = CornerRounding.Unrounded) {
    irregularPolygonMeasure(RoundedPolygon.fromNumVertices(sides, { rounding }), (measuredPolygon) => {
      expect(measuredPolygon.size).toBe(sides);

      [...measuredPolygon].forEach((measuredCubic, index) => {
        assertEqualish(index / sides, measuredCubic.startOutlineProgress);
      });
    });
  }

  function customPolygonMeasure(polygon: RoundedPolygon, progresses: readonly number[]) {
    irregularPolygonMeasure(polygon, (measuredPolygon) => {
      expect(measuredPolygon.size).toBe(progresses.length);

      [...measuredPolygon].forEach((measuredCubic, index) => {
        assertEqualish(progresses[index]!, measuredCubic.endOutlineProgress - measuredCubic.startOutlineProgress);
      });
    });
  }

  it('measureSharpTriangle', () => regularPolygonMeasure(3));

  it('measureSharpPentagon', () => regularPolygonMeasure(5));

  it('measureSharpOctagon', () => regularPolygonMeasure(8));

  it('measureSharpDodecagon', () => regularPolygonMeasure(12));

  it('measureSharpIcosagon', () => regularPolygonMeasure(20));

  it('measureSlightlyRoundedHexagon', () => {
    irregularPolygonMeasure(RoundedPolygon.fromNumVertices(6, { rounding: new CornerRounding(0.15) }));
  });

  it('measureMediumRoundedHexagon', () => {
    irregularPolygonMeasure(RoundedPolygon.fromNumVertices(6, { rounding: new CornerRounding(0.5) }));
  });

  it('measureMaximumRoundedHexagon', () => {
    irregularPolygonMeasure(RoundedPolygon.fromNumVertices(6, { rounding: new CornerRounding(1) }));
  });

  it('measureCircle', () => {
    // White box test: As the length measurer approximates arcs by linear segments,
    // this test validates if the chosen segment count approximates the arc length up to
    // an error of 1.5% from the true length
    const vertices = 4;
    const polygon = circle({ numVertices: vertices });

    const actualLength = polygon.cubics.reduce((sum, it) => sum + new LengthMeasurer().measureCubic(it), 0);
    const expectedLength = 2 * Math.PI;

    assertEqualsTol(expectedLength, actualLength, 0.015 * expectedLength);
  });

  it('irregularTriangleAngleMeasure', () =>
    irregularPolygonMeasure(
      RoundedPolygon.fromVertices([0, -1, 1, 1, 0, 0.5, -1, 1], {
        perVertexRounding: [
          new CornerRounding(0.2, 0.5),
          new CornerRounding(0.2, 0.5),
          new CornerRounding(0.4, 0),
          new CornerRounding(0.2, 0.5),
        ],
      }),
    ));

  it('quarterAngleMeasure', () =>
    irregularPolygonMeasure(
      RoundedPolygon.fromVertices([-1, -1, 1, -1, 1, 1, -1, 1], {
        perVertexRounding: [
          CornerRounding.Unrounded,
          CornerRounding.Unrounded,
          new CornerRounding(0.5, 0.5),
          CornerRounding.Unrounded,
        ],
      }),
    ));

  it('hourGlassMeasure', () => {
    // Regression test: Legacy measurer (AngleMeasurer) would skip the diagonal sides
    // as they are 0 degrees from the center.
    const unit = 1;
    const coordinates = [
      // lower glass
      0,
      0,
      unit,
      unit,
      -unit,
      unit,

      // upper glass
      0,
      0,
      -unit,
      -unit,
      unit,
      -unit,
    ];

    const diagonal = Math.sqrt(unit * unit + unit * unit);
    const horizontal = 2 * unit;
    const total = 4 * diagonal + 2 * horizontal;

    const polygon = RoundedPolygon.fromVertices(coordinates);
    customPolygonMeasure(polygon, [
      diagonal / total,
      horizontal / total,
      diagonal / total,
      diagonal / total,
      horizontal / total,
      diagonal / total,
    ]);
  });

  it('handlesEmptyFeatureLast', () => {
    const triangle = RoundedPolygon.fromFeatures([
      Feature.buildConvexCorner([Cubic.straightLine(0, 0, 1, 1)]),
      Feature.buildConvexCorner([Cubic.straightLine(1, 1, 1, 0)]),
      Feature.buildConvexCorner([Cubic.straightLine(1, 0, 0, 0)]),
      // Empty feature at the end.
      Feature.buildConvexCorner([Cubic.straightLine(0, 0, 0, 0)]),
    ]);

    irregularPolygonMeasure(triangle);
  });
});
