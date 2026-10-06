// Ported from AndroidX graphics-shapes CubicTest.kt (Apache License 2.0).
import { describe, expect, it } from 'vitest';
import { Cubic } from './cubic.ts';
import { Point } from './point.ts';
import {
  assertCubicsEqualish,
  assertPointsEqualish,
  assertTrue,
  identityTransform,
  scaleTransform,
  translateTransform,
} from './testUtils.ts';

describe('CubicTest', () => {
  // These points create a roughly circular arc in the upper-right quadrant around (0,0)
  const zero = new Point(0, 0);
  const p0 = new Point(1, 0);
  const p1 = new Point(1, 0.5);
  const p2 = new Point(0.5, 1);
  const p3 = new Point(0, 1);
  const cubic = Cubic.fromPoints(p0, p1, p2, p3);

  it('constructionTest', () => {
    expect(new Point(cubic.anchor0X, cubic.anchor0Y)).toEqual(p0);
    expect(new Point(cubic.control0X, cubic.control0Y)).toEqual(p1);
    expect(new Point(cubic.control1X, cubic.control1Y)).toEqual(p2);
    expect(new Point(cubic.anchor1X, cubic.anchor1Y)).toEqual(p3);
  });

  it('circularArcTest', () => {
    const arcCubic = Cubic.circularArc(zero.x, zero.y, p0.x, p0.y, p3.x, p3.y);
    expect(new Point(arcCubic.anchor0X, arcCubic.anchor0Y)).toEqual(p0);
    expect(new Point(arcCubic.anchor1X, arcCubic.anchor1Y)).toEqual(p3);
  });

  it('divTest', () => {
    let divCubic = cubic.div(1);
    assertCubicsEqualish(cubic, divCubic);
    divCubic = cubic.div(1); // Int overload in Kotlin
    assertCubicsEqualish(cubic, divCubic);
    divCubic = cubic.div(2);
    assertPointsEqualish(p0.div(2), new Point(divCubic.anchor0X, divCubic.anchor0Y));
    assertPointsEqualish(p1.div(2), new Point(divCubic.control0X, divCubic.control0Y));
    assertPointsEqualish(p2.div(2), new Point(divCubic.control1X, divCubic.control1Y));
    assertPointsEqualish(p3.div(2), new Point(divCubic.anchor1X, divCubic.anchor1Y));
    divCubic = cubic.div(2); // Int overload in Kotlin
    assertPointsEqualish(p0.div(2), new Point(divCubic.anchor0X, divCubic.anchor0Y));
    assertPointsEqualish(p1.div(2), new Point(divCubic.control0X, divCubic.control0Y));
    assertPointsEqualish(p2.div(2), new Point(divCubic.control1X, divCubic.control1Y));
    assertPointsEqualish(p3.div(2), new Point(divCubic.anchor1X, divCubic.anchor1Y));
  });

  it('timesTest', () => {
    let timesCubic = cubic.times(1);
    expect(new Point(timesCubic.anchor0X, timesCubic.anchor0Y)).toEqual(p0);
    expect(new Point(timesCubic.control0X, timesCubic.control0Y)).toEqual(p1);
    expect(new Point(timesCubic.control1X, timesCubic.control1Y)).toEqual(p2);
    expect(new Point(timesCubic.anchor1X, timesCubic.anchor1Y)).toEqual(p3);
    timesCubic = cubic.times(1); // Int overload in Kotlin
    expect(new Point(timesCubic.anchor0X, timesCubic.anchor0Y)).toEqual(p0);
    expect(new Point(timesCubic.control0X, timesCubic.control0Y)).toEqual(p1);
    expect(new Point(timesCubic.control1X, timesCubic.control1Y)).toEqual(p2);
    expect(new Point(timesCubic.anchor1X, timesCubic.anchor1Y)).toEqual(p3);
    timesCubic = cubic.times(2);
    assertPointsEqualish(p0.times(2), new Point(timesCubic.anchor0X, timesCubic.anchor0Y));
    assertPointsEqualish(p1.times(2), new Point(timesCubic.control0X, timesCubic.control0Y));
    assertPointsEqualish(p2.times(2), new Point(timesCubic.control1X, timesCubic.control1Y));
    assertPointsEqualish(p3.times(2), new Point(timesCubic.anchor1X, timesCubic.anchor1Y));
    timesCubic = cubic.times(2); // Int overload in Kotlin
    assertPointsEqualish(p0.times(2), new Point(timesCubic.anchor0X, timesCubic.anchor0Y));
    assertPointsEqualish(p1.times(2), new Point(timesCubic.control0X, timesCubic.control0Y));
    assertPointsEqualish(p2.times(2), new Point(timesCubic.control1X, timesCubic.control1Y));
    assertPointsEqualish(p3.times(2), new Point(timesCubic.anchor1X, timesCubic.anchor1Y));
  });

  it('plusTest', () => {
    const offsetCubic = cubic.times(2);
    const plusCubic = cubic.plus(offsetCubic);
    assertPointsEqualish(
      p0.plus(new Point(offsetCubic.anchor0X, offsetCubic.anchor0Y)),
      new Point(plusCubic.anchor0X, plusCubic.anchor0Y),
    );
    assertPointsEqualish(
      p1.plus(new Point(offsetCubic.control0X, offsetCubic.control0Y)),
      new Point(plusCubic.control0X, plusCubic.control0Y),
    );
    assertPointsEqualish(
      p2.plus(new Point(offsetCubic.control1X, offsetCubic.control1Y)),
      new Point(plusCubic.control1X, plusCubic.control1Y),
    );
    assertPointsEqualish(
      p3.plus(new Point(offsetCubic.anchor1X, offsetCubic.anchor1Y)),
      new Point(plusCubic.anchor1X, plusCubic.anchor1Y),
    );
  });

  it('reverseTest', () => {
    const reverseCubic = cubic.reverse();
    expect(new Point(reverseCubic.anchor0X, reverseCubic.anchor0Y)).toEqual(p3);
    expect(new Point(reverseCubic.control0X, reverseCubic.control0Y)).toEqual(p2);
    expect(new Point(reverseCubic.control1X, reverseCubic.control1Y)).toEqual(p1);
    expect(new Point(reverseCubic.anchor1X, reverseCubic.anchor1Y)).toEqual(p0);
  });

  function assertBetween(end0: Point, end1: Point, actual: Point) {
    const minX = Math.min(end0.x, end1.x);
    const minY = Math.min(end0.y, end1.y);
    const maxX = Math.max(end0.x, end1.x);
    const maxY = Math.max(end0.y, end1.y);
    assertTrue(minX <= actual.x);
    assertTrue(minY <= actual.y);
    assertTrue(maxX >= actual.x);
    assertTrue(maxY >= actual.y);
  }

  it('straightLineTest', () => {
    const lineCubic = Cubic.straightLine(p0.x, p0.y, p3.x, p3.y);
    expect(new Point(lineCubic.anchor0X, lineCubic.anchor0Y)).toEqual(p0);
    expect(new Point(lineCubic.anchor1X, lineCubic.anchor1Y)).toEqual(p3);
    assertBetween(p0, p3, new Point(lineCubic.control0X, lineCubic.control0Y));
    assertBetween(p0, p3, new Point(lineCubic.control1X, lineCubic.control1Y));
  });

  it('splitTest', () => {
    const [split0, split1] = cubic.split(0.5);
    expect(new Point(split0.anchor0X, split0.anchor0Y)).toEqual(new Point(cubic.anchor0X, cubic.anchor0Y));
    expect(new Point(split1.anchor1X, split1.anchor1Y)).toEqual(new Point(cubic.anchor1X, cubic.anchor1Y));
    assertBetween(
      new Point(cubic.anchor0X, cubic.anchor0Y),
      new Point(cubic.anchor1X, cubic.anchor1Y),
      new Point(split0.anchor1X, split0.anchor1Y),
    );
    assertBetween(
      new Point(cubic.anchor0X, cubic.anchor0Y),
      new Point(cubic.anchor1X, cubic.anchor1Y),
      new Point(split1.anchor0X, split1.anchor0Y),
    );
  });

  it('pointOnCurveTest', () => {
    let halfway = cubic.pointOnCurve(0.5);
    assertBetween(new Point(cubic.anchor0X, cubic.anchor0Y), new Point(cubic.anchor1X, cubic.anchor1Y), halfway);
    const straightLineCubic = Cubic.straightLine(p0.x, p0.y, p3.x, p3.y);
    halfway = straightLineCubic.pointOnCurve(0.5);
    const computedHalfway = new Point(p0.x + 0.5 * (p3.x - p0.x), p0.y + 0.5 * (p3.y - p0.y));
    assertPointsEqualish(computedHalfway, halfway);
  });

  it('transformTest', () => {
    let transform = identityTransform();
    let transformedCubic = cubic.transformed(transform);
    assertCubicsEqualish(cubic, transformedCubic);

    transform = scaleTransform(3, 3);
    transformedCubic = cubic.transformed(transform);
    assertCubicsEqualish(cubic.times(3), transformedCubic);

    const tx = 200;
    const ty = 300;
    const translationVector = new Point(tx, ty);
    transform = translateTransform(tx, ty);
    transformedCubic = cubic.transformed(transform);
    assertPointsEqualish(
      new Point(cubic.anchor0X, cubic.anchor0Y).plus(translationVector),
      new Point(transformedCubic.anchor0X, transformedCubic.anchor0Y),
    );
    assertPointsEqualish(
      new Point(cubic.control0X, cubic.control0Y).plus(translationVector),
      new Point(transformedCubic.control0X, transformedCubic.control0Y),
    );
    assertPointsEqualish(
      new Point(cubic.control1X, cubic.control1Y).plus(translationVector),
      new Point(transformedCubic.control1X, transformedCubic.control1Y),
    );
    assertPointsEqualish(
      new Point(cubic.anchor1X, cubic.anchor1Y).plus(translationVector),
      new Point(transformedCubic.anchor1X, transformedCubic.anchor1Y),
    );
  });

  it('emptyCubicHasZeroLength', () => {
    assertTrue(Cubic.empty(10, 10).zeroLength());
  });
});
