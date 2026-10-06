// Ported from AndroidX graphics-shapes Utils.kt (Apache License 2.0).
//
// Numeric note: Kotlin `Float` is IEEE float32; this port computes in float64 throughout and
// does not emulate float32 rounding. Constants such as `1e-4f` or `PI.toFloat()` are therefore
// the exact decimal / double values here (e.g. FloatPi = Math.PI, not fround(Math.PI)).

import { require } from './kotlin.ts';
import { Point } from './point.ts';

/** This class has all internal methods, used by Polygon, Morph, etc. */
export function distance(x: number, y: number): number {
  return Math.sqrt(x * x + y * y);
}

export function distanceSquared(x: number, y: number): number {
  return x * x + y * y;
}

/** Returns unit vector representing the direction to this point from (0, 0) */
export function directionVector(x: number, y: number): Point;
/** Returns the unit vector for the given angle (radians). */
export function directionVector(angleRadians: number): Point;
export function directionVector(a: number, b?: number): Point {
  if (b === undefined) {
    return new Point(Math.cos(a), Math.sin(a));
  }
  const d = distance(a, b);
  require(d > 0, () => 'Required distance greater than zero');
  return new Point(a / d, b / d);
}

export function radialToCartesian(radius: number, angleRadians: number, center: Point = Zero): Point {
  return directionVector(angleRadians).times(radius).plus(center);
}

/**
 * These epsilon values are used internally to determine when two points are the same, within some
 * reasonable roundoff error. The distance epsilon is smaller, with the intention that the roundoff
 * should not be larger than a pixel on any reasonable sized display.
 */
export const DistanceEpsilon = 1e-4;
export const AngleEpsilon = 1e-6;

/**
 * This epsilon is based on the observation that people tend to see e.g. collinearity much more
 * relaxed than what is mathematically correct. This effect is heightened on smaller displays. Use
 * this epsilon for operations that allow higher tolerances.
 */
export const RelaxedDistanceEpsilon = 5e-3;

// `Point.rotate90()` lives on the Point class (see point.ts).

export const Zero = new Point(0, 0);

export const FloatPi = Math.PI;

export const TwoPi = 2 * Math.PI;

export function square(x: number): number {
  return x * x;
}

/** Linearly interpolate between [start] and [stop] with [fraction] fraction between them. */
export function interpolate(start: number, stop: number, fraction: number): number {
  return (1 - fraction) * start + fraction * stop;
}

/**
 * Similar to num % mod, but ensures the result is always positive. For example: 4 % 3 =
 * positiveModulo(4, 3) = 1, but: -4 % 3 = -1 positiveModulo(-4, 3) = 2
 */
export function positiveModulo(num: number, mod: number): number {
  return ((num % mod) + mod) % mod;
}

/** Returns whether C is on the line defined by the two points AB */
export function collinearIsh(
  aX: number,
  aY: number,
  bX: number,
  bY: number,
  cX: number,
  cY: number,
  tolerance: number = DistanceEpsilon,
): boolean {
  // The dot product of a perpendicular angle is 0. By rotating one of the vectors,
  // we save the calculations to convert the dot product to degrees afterwards.
  const ab = new Point(bX - aX, bY - aY).rotate90();
  const ac = new Point(cX - aX, cY - aY);
  const dotProduct = Math.abs(ab.dotProduct(ac));
  const relativeTolerance = tolerance * ab.getDistance() * ac.getDistance();

  return dotProduct < tolerance || dotProduct < relativeTolerance;
}

/**
 * Approximates whether corner at this vertex is concave or convex, based on the relationship of the
 * prev->curr/curr->next vectors.
 */
export function convex(previous: Point, current: Point, next: Point): boolean {
  // TODO: b/369320447 - This is a fast, but not reliable calculation.
  return current.minus(previous).clockwise(next.minus(current));
}

/** A functional interface for computing a Float value when finding the minimum at [findMinimum]. */
export type FindMinimumFunction = (value: number) => number;

/*
 * Does a ternary search in [v0..v1] to find the parameter that minimizes the given function.
 * Stops when the search space size is reduced below the given tolerance.
 */
export function findMinimum(v0: number, v1: number, tolerance: number = 1e-3, f: FindMinimumFunction): number {
  let a = v0;
  let b = v1;
  while (b - a > tolerance) {
    const c1 = (2 * a + b) / 3;
    const c2 = (2 * b + a) / 3;
    if (f(c1) < f(c2)) {
      b = c2;
    } else {
      a = c1;
    }
  }
  return (a + b) / 2;
}

/**
 * Upstream compiles debug logging out (`DEBUG = false`); the port keeps the switch and helper but
 * omits the individual `debugLog` call sites, which are inert in release builds.
 */
export const DEBUG = false;

export function debugLog(tag: string, messageFactory: () => string): void {
  if (DEBUG) {
    console.log(`${tag}: ${messageFactory()}`);
  }
}
