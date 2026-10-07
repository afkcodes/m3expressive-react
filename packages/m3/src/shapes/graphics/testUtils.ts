// Ported from AndroidX graphics-shapes TestUtils.kt (+ TestUtils.android.kt) (Apache License 2.0).
// Test-only helpers: imported by the *.test.ts files, never by library code.
//
// The asserts throw plain Errors (like kotlin.test) rather than using `expect`, so they stay cheap
// inside the large loops some upstream tests run.

import type { Cubic, PointTransformer } from './cubic.ts';
import { Corner, type Feature } from './features.ts';
import { Point } from './point.ts';
import type { RoundedPolygon } from './roundedPolygon.ts';

const Epsilon = 1e-4;

function fail(message: string): never {
  throw new Error(message);
}

/** kotlin.test `assertEquals(expected, actual, absoluteTolerance, message)` for floats. */
export function assertEqualsTol(expected: number, actual: number, absoluteTolerance: number, message?: string): void {
  if (!(Math.abs(expected - actual) <= absoluteTolerance)) {
    fail(
      `${message ? `${message}. ` : ''}Expected <${expected}>, actual <${actual}>, should differ no more than <${absoluteTolerance}>.`,
    );
  }
}

/** kotlin.test `assertTrue(actual, message)`. */
export function assertTrue(actual: boolean, message?: string): void {
  if (!actual) fail(message ?? 'Expected value to be true.');
}

// Test equality within Epsilon
export function assertPointsEqualish(expected: Point, actual: Point): void {
  const msg = `${expected.toString()} vs. ${actual.toString()}`;
  assertEqualsTol(expected.x, actual.x, Epsilon, msg);
  assertEqualsTol(expected.y, actual.y, Epsilon, msg);
}

export function equalish(f0: number, f1: number, epsilon: number): boolean {
  return Math.abs(f0 - f1) < epsilon;
}

export function pointsEqualish(p0: Point, p1: Point): boolean {
  return equalish(p0.x, p1.x, Epsilon) && equalish(p0.y, p1.y, Epsilon);
}

export function cubicsEqualish(c0: Cubic, c1: Cubic): boolean {
  return (
    pointsEqualish(new Point(c0.anchor0X, c0.anchor0Y), new Point(c1.anchor0X, c1.anchor0Y)) &&
    pointsEqualish(new Point(c0.anchor1X, c0.anchor1Y), new Point(c1.anchor1X, c1.anchor1Y)) &&
    pointsEqualish(new Point(c0.control0X, c0.control0Y), new Point(c1.control0X, c1.control0Y)) &&
    pointsEqualish(new Point(c0.control1X, c0.control1Y), new Point(c1.control1X, c1.control1Y))
  );
}

export function assertCubicsEqualish(expected: Cubic, actual: Cubic): void {
  assertPointsEqualish(new Point(expected.anchor0X, expected.anchor0Y), new Point(actual.anchor0X, actual.anchor0Y));
  assertPointsEqualish(
    new Point(expected.control0X, expected.control0Y),
    new Point(actual.control0X, actual.control0Y),
  );
  assertPointsEqualish(
    new Point(expected.control1X, expected.control1Y),
    new Point(actual.control1X, actual.control1Y),
  );
  assertPointsEqualish(new Point(expected.anchor1X, expected.anchor1Y), new Point(actual.anchor1X, actual.anchor1Y));
}

export function assertCubicListsEqualish(expected: readonly Cubic[], actual: readonly Cubic[]): void {
  if (expected.length !== actual.length) fail(`Expected <${expected.length}>, actual <${actual.length}>.`);
  for (let i = 0; i < expected.length; i++) {
    assertCubicsEqualish(expected[i]!, actual[i]!);
  }
}

export function assertFeaturesEqualish(expected: Feature, actual: Feature): void {
  assertCubicListsEqualish(expected.cubics, actual.cubics);
  if (expected.constructor !== actual.constructor) {
    fail(`Expected <${expected.constructor.name}>, actual <${actual.constructor.name}>.`);
  }

  if (expected instanceof Corner && actual instanceof Corner) {
    if (expected.convex !== actual.convex) fail(`Expected convex <${expected.convex}>, actual <${actual.convex}>.`);
  }
}

export function assertPolygonsEqualish(expected: RoundedPolygon, actual: RoundedPolygon): void {
  assertCubicListsEqualish(expected.cubics, actual.cubics);

  if (expected.features.length !== actual.features.length) {
    fail(`Expected <${expected.features.length}> features, actual <${actual.features.length}>.`);
  }
  for (let i = 0; i < expected.features.length; i++) {
    assertFeaturesEqualish(expected.features[i]!, actual.features[i]!);
  }
}

export function assertPointGreaterish(expected: Point, actual: Point): void {
  assertTrue(actual.x >= expected.x - Epsilon);
  assertTrue(actual.y >= expected.y - Epsilon);
}

export function assertPointLessish(expected: Point, actual: Point): void {
  assertTrue(actual.x <= expected.x + Epsilon);
  assertTrue(actual.y <= expected.y + Epsilon);
}

export function assertEqualish(expected: number, actual: number, message?: string): void {
  assertEqualsTol(expected, actual, Epsilon, message);
}

export function assertInBounds(shape: readonly Cubic[], minPoint: Point, maxPoint: Point): void {
  for (const cubic of shape) {
    assertPointGreaterish(minPoint, new Point(cubic.anchor0X, cubic.anchor0Y));
    assertPointLessish(maxPoint, new Point(cubic.anchor0X, cubic.anchor0Y));
    assertPointGreaterish(minPoint, new Point(cubic.control0X, cubic.control0Y));
    assertPointLessish(maxPoint, new Point(cubic.control0X, cubic.control0Y));
    assertPointGreaterish(minPoint, new Point(cubic.control1X, cubic.control1Y));
    assertPointLessish(maxPoint, new Point(cubic.control1X, cubic.control1Y));
    assertPointGreaterish(minPoint, new Point(cubic.anchor1X, cubic.anchor1Y));
    assertPointLessish(maxPoint, new Point(cubic.anchor1X, cubic.anchor1Y));
  }
}

export function identityTransform(): PointTransformer {
  return (x, y) => [x, y];
}

export function scaleTransform(sx: number, sy: number): PointTransformer {
  return (x, y) => [x * sx, y * sy];
}

export function translateTransform(dx: number, dy: number): PointTransformer {
  return (x, y) => [x + dx, y + dy];
}

/** TestUtils.android.kt: `Matrix().apply { setRotate(angle) }` mapped over points. */
export function pointRotator(angle: number): PointTransformer {
  const r = (angle * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return (x, y) => [c * x - s * y, s * x + c * y];
}
