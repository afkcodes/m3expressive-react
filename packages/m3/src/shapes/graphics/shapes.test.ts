// Ported from AndroidX graphics-shapes ShapesTest.kt (Apache License 2.0).
import { describe, expect, it } from 'vitest';
import { CornerRounding } from './cornerRounding.ts';
import type { Cubic } from './cubic.ts';
import { IllegalArgumentError } from './kotlin.ts';
import { Point } from './point.ts';
import { circle, star } from './shapes.ts';
import { assertEqualsTol, assertInBounds } from './testUtils.ts';

/** Tests the utility shape-creating functions like Circle and Star */
describe('ShapesTest', () => {
  const Zero = new Point(0, 0);
  const Epsilon = 0.01;

  function distance(start: Point, end: Point): number {
    const vector = end.minus(start);
    return Math.sqrt(vector.x * vector.x + vector.y * vector.y);
  }

  /**
   * Test that the given point is radius distance away from [center]. If two radii are provided it
   * is sufficient to lie on either one (used for testing points on stars).
   */
  function assertPointOnRadii(point: Point, radius1: number, radius2: number = radius1, center: Point = Zero) {
    const dist = distance(center, point);
    try {
      assertEqualsTol(radius1, dist, Epsilon);
    } catch {
      assertEqualsTol(radius2, dist, Epsilon);
    }
  }

  function assertCubicOnRadii(cubic: Cubic, radius1: number, radius2: number = radius1, center: Point = Zero) {
    assertPointOnRadii(new Point(cubic.anchor0X, cubic.anchor0Y), radius1, radius2, center);
    assertPointOnRadii(new Point(cubic.anchor1X, cubic.anchor1Y), radius1, radius2, center);
  }

  /**
   * Tests points along the curve of the cubic by comparing the distance from that point to the
   * center, compared to the requested radius. The test is very lenient since the Circle shape is
   * only a 4x cubic approximation of the circle and varies from the true circle.
   */
  function assertCircularCubic(cubic: Cubic, radius: number, center: Point) {
    let t = 0;
    while (t <= 1) {
      const pointOnCurve = cubic.pointOnCurve(t);
      const distanceToPoint = distance(center, pointOnCurve);
      assertEqualsTol(radius, distanceToPoint, Epsilon);
      t += 0.1;
    }
  }

  function assertCircleShape(shape: readonly Cubic[], radius: number = 1, center: Point = Zero) {
    for (const cubic of shape) {
      assertCircularCubic(cubic, radius, center);
    }
  }

  it('circleTest', () => {
    expect(() => circle({ numVertices: 2 })).toThrow(IllegalArgumentError);

    const c = circle();
    assertCircleShape(c.cubics);

    const simpleCircle = circle({ numVertices: 3 });
    assertCircleShape(simpleCircle.cubics);

    const complexCircle = circle({ numVertices: 20 });
    assertCircleShape(complexCircle.cubics);

    const bigCircle = circle({ radius: 3 });
    assertCircleShape(bigCircle.cubics, 3);

    const center = new Point(1, 2);
    const offsetCircle = circle({ centerX: center.x, centerY: center.y });
    assertCircleShape(offsetCircle.cubics, undefined, center);
  });

  /**
   * Stars are complicated. For the unrounded version, we can check whether the vertices are the
   * right distance from the center. For the rounded versions, just check that the shape is within
   * the appropriate bounds.
   */
  it('starTest', () => {
    let s = star(4, { innerRadius: 0.5 });
    let shape = s.cubics;
    let radius = 1;
    let innerRadius = 0.5;
    for (const cubic of shape) {
      assertCubicOnRadii(cubic, radius, innerRadius);
    }

    const center = new Point(1, 2);
    s = star(4, { innerRadius, centerX: center.x, centerY: center.y });
    shape = s.cubics;
    for (const cubic of shape) {
      assertCubicOnRadii(cubic, radius, innerRadius, center);
    }

    radius = 4;
    innerRadius = 2;
    s = star(4, { radius, innerRadius });
    shape = s.cubics;
    for (const cubic of shape) {
      assertCubicOnRadii(cubic, radius, innerRadius);
    }
  });

  it('roundedStarTest', () => {
    const rounding = new CornerRounding(0.1);
    const innerRounding = new CornerRounding(0.2);
    const perVtxRounded = [
      rounding,
      innerRounding,
      rounding,
      innerRounding,
      rounding,
      innerRounding,
      rounding,
      innerRounding,
    ];

    let s = star(4, { innerRadius: 0.5, rounding });
    const min = new Point(-1, -1);
    const max = new Point(1, 1);
    assertInBounds(s.cubics, min, max);

    s = star(4, { innerRadius: 0.5, innerRounding });
    assertInBounds(s.cubics, min, max);

    s = star(4, { innerRadius: 0.5, rounding, innerRounding });
    assertInBounds(s.cubics, min, max);

    s = star(4, { innerRadius: 0.5, perVertexRounding: perVtxRounded });
    assertInBounds(s.cubics, min, max);

    expect(() => star(6, { innerRadius: 0.5, perVertexRounding: perVtxRounded })).toThrow(IllegalArgumentError);
  });
});
