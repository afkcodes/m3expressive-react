// Ported from AndroidX graphics-shapes Point.kt (Apache License 2.0).
//
// Upstream `Point` is a typealias for androidx.collection.FloatFloatPair with operator extension
// functions; here it is a small immutable class with the same operations as methods.

import type { PointTransformer } from './cubic.ts';
import { require } from './kotlin.ts';

export class Point {
  readonly x: number;
  readonly y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  copy(x: number = this.x, y: number = this.y): Point {
    return new Point(x, y);
  }

  /**
   * The magnitude of the Point, which is the distance of this point from (0, 0).
   *
   * If you need this value to compare it to another [Point]'s distance, consider using
   * [getDistanceSquared] instead, since it is cheaper to compute.
   */
  getDistance(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  /**
   * The square of the magnitude (which is the distance of this point from (0, 0)) of the Point.
   *
   * This is cheaper than computing the [getDistance] itself.
   */
  getDistanceSquared(): number {
    return this.x * this.x + this.y * this.y;
  }

  dotProduct(other: Point): number;
  dotProduct(otherX: number, otherY: number): number;
  dotProduct(a: Point | number, b?: number): number {
    if (typeof a === 'number') return this.x * a + this.y * b!;
    return this.x * a.x + this.y * a.y;
  }

  /**
   * Compute the Z coordinate of the cross product of two vectors, to check if the second vector is
   * going clockwise ( > 0 ) or counterclockwise (< 0) compared with the first one. It could also be
   * 0, if the vectors are co-linear.
   */
  clockwise(other: Point): boolean {
    return this.x * other.y - this.y * other.x > 0;
  }

  /** Returns unit vector representing the direction to this point from (0, 0) */
  getDirection(): Point {
    const d = this.getDistance();
    require(d > 0, () => "Can't get the direction of a 0-length vector");
    return this.div(d);
  }

  /** Unary negation operator. */
  unaryMinus(): Point {
    return new Point(-this.x, -this.y);
  }

  /** Binary subtraction operator. */
  minus(other: Point): Point {
    return new Point(this.x - other.x, this.y - other.y);
  }

  /** Binary addition operator. */
  plus(other: Point): Point {
    return new Point(this.x + other.x, this.y + other.y);
  }

  /** Multiplication by a scalar. */
  times(operand: number): Point {
    return new Point(this.x * operand, this.y * operand);
  }

  /** Division by a scalar. */
  div(operand: number): Point {
    return new Point(this.x / operand, this.y / operand);
  }

  /** Modulo (remainder) by a scalar. */
  rem(operand: number): Point {
    return new Point(this.x % operand, this.y % operand);
  }

  /** From Utils.kt: `Point.rotate90() = Point(-y, x)`. */
  rotate90(): Point {
    return new Point(-this.y, this.x);
  }

  transformed(f: PointTransformer): Point {
    const result = f(this.x, this.y);
    return new Point(result[0], result[1]);
  }

  toString(): string {
    return `(${this.x}, ${this.y})`;
  }
}

/**
 * Linearly interpolate between two Points (Kotlin's `interpolate(Point, Point, Float)` overload).
 *
 * The [fraction] argument represents position on the timeline, with 0.0 meaning that the
 * interpolation has not started, returning [start], 1.0 meaning that the interpolation has
 * finished, returning [stop]. The interpolation can be extrapolated beyond 0.0 and 1.0.
 */
export function interpolatePoint(start: Point, stop: Point, fraction: number): Point {
  // Same arithmetic as `Point(interpolate(start.x, stop.x, fraction), ...)`, inlined to avoid a
  // circular import with utils.ts.
  return new Point((1 - fraction) * start.x + fraction * stop.x, (1 - fraction) * start.y + fraction * stop.y);
}
