// Ported from AndroidX graphics-shapes Cubic.kt (Apache License 2.0).

import { require } from './kotlin.ts';
import { Point } from './point.ts';
import { DistanceEpsilon, convex, directionVector, distance, interpolate } from './utils.ts';

/** Kotlin `FloatArray` stand-in used for bounds buffers. */
export type FloatArray = Float64Array | number[];

/** This interface is used refer to Points that can be modified, as a scope to [PointTransformer] */
export interface MutablePoint {
  /** The x coordinate of the Point */
  x: number;
  /** The y coordinate of the Point */
  y: number;
}

/** Upstream: `typealias TransformResult = FloatFloatPair` — here an `[x, y]` tuple. */
export type TransformResult = readonly [x: number, y: number];

/**
 * Interface for a function that can transform (rotate/scale/translate/etc.) points: given the x
 * and y parameters, return the transformed point as a [TransformResult].
 */
export type PointTransformer = (x: number, y: number) => TransformResult;

/**
 * This class holds the anchor and control point data for a single cubic Bézier curve, with anchor
 * points ([anchor0X], [anchor0Y]) and ([anchor1X], [anchor1Y]) at either end and control points
 * ([control0X], [control0Y]) and ([control1X], [control1Y]) determining the slope of the curve
 * between the anchor points.
 *
 * Construct with the eight coordinates (`new Cubic(a0x, a0y, c0x, c0y, c1x, c1y, a1x, a1y)`, the
 * public Kotlin factory) or with a points array of size 8 (the internal Kotlin constructor).
 */
export class Cubic {
  /** @internal anchor0X, anchor0Y, control0X, control0Y, control1X, control1Y, anchor1X, anchor1Y */
  readonly points: Float64Array;

  constructor(points?: Float64Array);
  constructor(
    anchor0X: number,
    anchor0Y: number,
    control0X: number,
    control0Y: number,
    control1X: number,
    control1Y: number,
    anchor1X: number,
    anchor1Y: number,
  );
  constructor(
    a?: Float64Array | number,
    b?: number,
    c?: number,
    d?: number,
    e?: number,
    f?: number,
    g?: number,
    h?: number,
  ) {
    if (typeof a === 'number') {
      this.points = Float64Array.of(a, b!, c!, d!, e!, f!, g!, h!);
    } else {
      this.points = a ?? new Float64Array(8);
      require(this.points.length === 8, () => 'Points array size should be 8');
    }
  }

  /** Kotlin's internal `Cubic(anchor0: Point, control0: Point, control1: Point, anchor1: Point)`. */
  static fromPoints(anchor0: Point, control0: Point, control1: Point, anchor1: Point): Cubic {
    return new Cubic(
      Float64Array.of(anchor0.x, anchor0.y, control0.x, control0.y, control1.x, control1.y, anchor1.x, anchor1.y),
    );
  }

  /** The first anchor point x coordinate */
  get anchor0X(): number {
    return this.points[0]!;
  }

  /** The first anchor point y coordinate */
  get anchor0Y(): number {
    return this.points[1]!;
  }

  /** The first control point x coordinate */
  get control0X(): number {
    return this.points[2]!;
  }

  /** The first control point y coordinate */
  get control0Y(): number {
    return this.points[3]!;
  }

  /** The second control point x coordinate */
  get control1X(): number {
    return this.points[4]!;
  }

  /** The second control point y coordinate */
  get control1Y(): number {
    return this.points[5]!;
  }

  /** The second anchor point x coordinate */
  get anchor1X(): number {
    return this.points[6]!;
  }

  /** The second anchor point y coordinate */
  get anchor1Y(): number {
    return this.points[7]!;
  }

  /**
   * Returns a point on the curve for parameter t, representing the proportional distance along
   * the curve between its starting point at anchor0 and ending point at anchor1.
   *
   * @param t The distance along the curve between the anchor points, where 0 is at anchor0 and 1
   *   is at anchor1
   */
  pointOnCurve(t: number): Point {
    const u = 1 - t;
    return new Point(
      this.anchor0X * (u * u * u) +
        this.control0X * (3 * t * u * u) +
        this.control1X * (3 * t * t * u) +
        this.anchor1X * (t * t * t),
      this.anchor0Y * (u * u * u) +
        this.control0Y * (3 * t * u * u) +
        this.control1Y * (3 * t * t * u) +
        this.anchor1Y * (t * t * t),
    );
  }

  zeroLength(): boolean {
    return (
      Math.abs(this.anchor0X - this.anchor1X) < DistanceEpsilon &&
      Math.abs(this.anchor0Y - this.anchor1Y) < DistanceEpsilon
    );
  }

  convexTo(next: Cubic): boolean {
    const prevVertex = new Point(this.anchor0X, this.anchor0Y);
    const currVertex = new Point(this.anchor1X, this.anchor1Y);
    const nextVertex = new Point(next.anchor1X, next.anchor1Y);
    return convex(prevVertex, currVertex, nextVertex);
  }

  private zeroIsh(value: number): boolean {
    return Math.abs(value) < DistanceEpsilon;
  }

  /**
   * This function returns the true bounds of this curve, filling [bounds] with the axis-aligned
   * bounding box values for left, top, right, and bottom, in that order.
   */
  calculateBounds(bounds: FloatArray = new Float64Array(4), approximate: boolean = false): void {
    // A curve might be of zero-length, with both anchors co-lated.
    // Just return the point itself.
    if (this.zeroLength()) {
      bounds[0] = this.anchor0X;
      bounds[1] = this.anchor0Y;
      bounds[2] = this.anchor0X;
      bounds[3] = this.anchor0Y;
      return;
    }

    let minX = Math.min(this.anchor0X, this.anchor1X);
    let minY = Math.min(this.anchor0Y, this.anchor1Y);
    let maxX = Math.max(this.anchor0X, this.anchor1X);
    let maxY = Math.max(this.anchor0Y, this.anchor1Y);

    if (approximate) {
      // Approximate bounds use the bounding box of all anchors and controls
      bounds[0] = Math.min(minX, Math.min(this.control0X, this.control1X));
      bounds[1] = Math.min(minY, Math.min(this.control0Y, this.control1Y));
      bounds[2] = Math.max(maxX, Math.max(this.control0X, this.control1X));
      bounds[3] = Math.max(maxY, Math.max(this.control0Y, this.control1Y));
      return;
    }

    // Find the derivative, which is a quadratic Bezier. Then we can solve for t using
    // the quadratic formula
    const xa = -this.anchor0X + 3 * this.control0X - 3 * this.control1X + this.anchor1X;
    const xb = 2 * this.anchor0X - 4 * this.control0X + 2 * this.control1X;
    const xc = -this.anchor0X + this.control0X;

    if (this.zeroIsh(xa)) {
      // Try Muller's method instead; it can find a single root when a is 0
      if (xb !== 0) {
        const t = (2 * xc) / (-2 * xb);
        if (t >= 0 && t <= 1) {
          const it = this.pointOnCurve(t).x;
          if (it < minX) minX = it;
          if (it > maxX) maxX = it;
        }
      }
    } else {
      const xs = xb * xb - 4 * xa * xc;
      if (xs >= 0) {
        const t1 = (-xb + Math.sqrt(xs)) / (2 * xa);
        if (t1 >= 0 && t1 <= 1) {
          const it = this.pointOnCurve(t1).x;
          if (it < minX) minX = it;
          if (it > maxX) maxX = it;
        }

        const t2 = (-xb - Math.sqrt(xs)) / (2 * xa);
        if (t2 >= 0 && t2 <= 1) {
          const it = this.pointOnCurve(t2).x;
          if (it < minX) minX = it;
          if (it > maxX) maxX = it;
        }
      }
    }

    // Repeat the above for y coordinate
    const ya = -this.anchor0Y + 3 * this.control0Y - 3 * this.control1Y + this.anchor1Y;
    const yb = 2 * this.anchor0Y - 4 * this.control0Y + 2 * this.control1Y;
    const yc = -this.anchor0Y + this.control0Y;

    if (this.zeroIsh(ya)) {
      if (yb !== 0) {
        const t = (2 * yc) / (-2 * yb);
        if (t >= 0 && t <= 1) {
          const it = this.pointOnCurve(t).y;
          if (it < minY) minY = it;
          if (it > maxY) maxY = it;
        }
      }
    } else {
      const ys = yb * yb - 4 * ya * yc;
      if (ys >= 0) {
        const t1 = (-yb + Math.sqrt(ys)) / (2 * ya);
        if (t1 >= 0 && t1 <= 1) {
          const it = this.pointOnCurve(t1).y;
          if (it < minY) minY = it;
          if (it > maxY) maxY = it;
        }

        const t2 = (-yb - Math.sqrt(ys)) / (2 * ya);
        if (t2 >= 0 && t2 <= 1) {
          const it = this.pointOnCurve(t2).y;
          if (it < minY) minY = it;
          if (it > maxY) maxY = it;
        }
      }
    }
    bounds[0] = minX;
    bounds[1] = minY;
    bounds[2] = maxX;
    bounds[3] = maxY;
  }

  /**
   * Returns two Cubics, created by splitting this curve at the given distance of [t] between the
   * original starting and ending anchor points.
   */
  // TODO: cartesian optimization?
  split(t: number): [Cubic, Cubic] {
    const u = 1 - t;
    const pointOnCurve = this.pointOnCurve(t);
    return [
      new Cubic(
        this.anchor0X,
        this.anchor0Y,
        this.anchor0X * u + this.control0X * t,
        this.anchor0Y * u + this.control0Y * t,
        this.anchor0X * (u * u) + this.control0X * (2 * u * t) + this.control1X * (t * t),
        this.anchor0Y * (u * u) + this.control0Y * (2 * u * t) + this.control1Y * (t * t),
        pointOnCurve.x,
        pointOnCurve.y,
      ),
      new Cubic(
        // TODO: should calculate once and share the result
        pointOnCurve.x,
        pointOnCurve.y,
        this.control0X * (u * u) + this.control1X * (2 * u * t) + this.anchor1X * (t * t),
        this.control0Y * (u * u) + this.control1Y * (2 * u * t) + this.anchor1Y * (t * t),
        this.control1X * u + this.anchor1X * t,
        this.control1Y * u + this.anchor1Y * t,
        this.anchor1X,
        this.anchor1Y,
      ),
    ];
  }

  /** Utility function to reverse the control/anchor points for this curve. */
  reverse(): Cubic {
    return new Cubic(
      this.anchor1X,
      this.anchor1Y,
      this.control1X,
      this.control1Y,
      this.control0X,
      this.control0Y,
      this.anchor0X,
      this.anchor0Y,
    );
  }

  /** Operator overload `c0 + c1`. */
  plus(o: Cubic): Cubic {
    const result = new Float64Array(8);
    for (let it = 0; it < 8; it++) result[it] = this.points[it]! + o.points[it]!;
    return new Cubic(result);
  }

  /** Operator overload `c0 * x` (Kotlin has Float and Int overloads; identical here). */
  times(x: number): Cubic {
    const result = new Float64Array(8);
    for (let it = 0; it < 8; it++) result[it] = this.points[it]! * x;
    return new Cubic(result);
  }

  /** Operator overload `c0 / x` (Kotlin has Float and Int overloads; identical here). */
  div(x: number): Cubic {
    return this.times(1 / x);
  }

  toString(): string {
    return (
      `anchor0: (${this.anchor0X}, ${this.anchor0Y}) control0: (${this.control0X}, ${this.control0Y}), ` +
      `control1: (${this.control1X}, ${this.control1Y}), anchor1: (${this.anchor1X}, ${this.anchor1Y})`
    );
  }

  /** Kotlin `equals`: same class hierarchy and `points.contentEquals(other.points)`. */
  equals(other: unknown): boolean {
    if (this === other) return true;
    if (!(other instanceof Cubic)) return false;
    for (let i = 0; i < 8; i++) {
      // FloatArray.contentEquals compares with Float.equals (NaN == NaN, 0.0 != -0.0)
      if (!Object.is(this.points[i], other.points[i])) return false;
    }
    return true;
  }

  /**
   * Transforms the points in this [Cubic] with the given [PointTransformer] and returns a new
   * [Cubic]
   *
   * @param f The [PointTransformer] used to transform this [Cubic]
   */
  transformed(f: PointTransformer): Cubic {
    const newCubic = new MutableCubic();
    newCubic.points.set(this.points);
    newCubic.transform(f);
    return newCubic;
  }

  /**
   * Generates a bezier curve that is a straight line between the given anchor points. The control
   * points lie 1/3 of the distance from their respective anchor points.
   */
  static straightLine(x0: number, y0: number, x1: number, y1: number): Cubic {
    return new Cubic(
      x0,
      y0,
      interpolate(x0, x1, 1 / 3),
      interpolate(y0, y1, 1 / 3),
      interpolate(x0, x1, 2 / 3),
      interpolate(y0, y1, 2 / 3),
      x1,
      y1,
    );
  }

  // TODO: consider a more general function (maybe in addition to this) that allows
  // caller to get a list of curves surpassing 180 degrees
  /**
   * Generates a bezier curve that approximates a circular arc, with p0 and p1 as the starting and
   * ending anchor points. The curve generated is the smallest of the two possible arcs around the
   * entire 360-degree circle. Arcs of greater than 180 degrees should use more than one arc
   * together. Note that p0 and p1 should be equidistant from the center.
   */
  static circularArc(centerX: number, centerY: number, x0: number, y0: number, x1: number, y1: number): Cubic {
    const p0d = directionVector(x0 - centerX, y0 - centerY);
    const p1d = directionVector(x1 - centerX, y1 - centerY);
    const rotatedP0 = p0d.rotate90();
    const rotatedP1 = p1d.rotate90();
    const clockwise = rotatedP0.dotProduct(x1 - centerX, y1 - centerY) >= 0;
    const cosa = p0d.dotProduct(p1d);
    if (cosa > 0.999) /* p0 ~= p1 */ return Cubic.straightLine(x0, y0, x1, y1);
    const k =
      ((((distance(x0 - centerX, y0 - centerY) * 4) / 3) *
        (Math.sqrt(2 * (1 - cosa)) - Math.sqrt(1 - cosa * cosa))) /
        (1 - cosa)) *
      (clockwise ? 1 : -1);
    return new Cubic(
      x0,
      y0,
      x0 + rotatedP0.x * k,
      y0 + rotatedP0.y * k,
      x1 - rotatedP1.x * k,
      y1 - rotatedP1.y * k,
      x1,
      y1,
    );
  }

  /** Generates an empty Cubic defined at (x0, y0) */
  static empty(x0: number, y0: number): Cubic {
    return new Cubic(x0, y0, x0, y0, x0, y0, x0, y0);
  }
}

/**
 * This is a Mutable version of [Cubic], used mostly for performance critical paths so we can avoid
 * creating new [Cubic]s
 *
 * This is used in Morph.forEachCubic, reusing a [MutableCubic] instance to avoid creating new
 * [Cubic]s.
 */
export class MutableCubic extends Cubic {
  constructor() {
    super();
  }

  private transformOnePoint(f: PointTransformer, ix: number): void {
    const result = f(this.points[ix]!, this.points[ix + 1]!);
    this.points[ix] = result[0];
    this.points[ix + 1] = result[1];
  }

  transform(f: PointTransformer): void {
    this.transformOnePoint(f, 0);
    this.transformOnePoint(f, 2);
    this.transformOnePoint(f, 4);
    this.transformOnePoint(f, 6);
  }

  interpolate(c1: Cubic, c2: Cubic, progress: number): void {
    for (let it = 0; it < 8; it++) {
      this.points[it] = interpolate(c1.points[it]!, c2.points[it]!, progress);
    }
  }
}
