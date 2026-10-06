// Ported from AndroidX graphics-shapes RoundedPolygon.kt (Apache License 2.0).
//
// Kotlin's overloaded top-level `RoundedPolygon(...)` factory functions map to static factories:
//   RoundedPolygon(numVertices, ...)      -> RoundedPolygon.fromNumVertices(numVertices, { ... })
//   RoundedPolygon(vertices: FloatArray)  -> RoundedPolygon.fromVertices(vertices, { ... })
//   RoundedPolygon(features: List<...>)   -> RoundedPolygon.fromFeatures(features, { ... })
//   RoundedPolygon(source)                -> RoundedPolygon.copyOf(source)
// Named/default Kotlin parameters become option objects with the same names and defaults.

import { CornerRounding } from './cornerRounding.ts';
import { Cubic, type FloatArray, type PointTransformer } from './cubic.ts';
import { Corner, Edge, type Feature } from './features.ts';
import { FloatMaxValue, FloatMinValue, IllegalArgumentError, require } from './kotlin.ts';
import { Point, interpolatePoint } from './point.ts';
import {
  DistanceEpsilon,
  FloatPi,
  convex,
  directionVector,
  distance,
  distanceSquared,
  radialToCartesian,
  square,
} from './utils.ts';

export interface NumVerticesOptions {
  /** Default 1. */
  radius?: number;
  /** Default 0. */
  centerX?: number;
  /** Default 0. */
  centerY?: number;
  /** Default [CornerRounding.Unrounded]. */
  rounding?: CornerRounding;
  /** Default null. Must have `numVertices` elements when given. */
  perVertexRounding?: readonly CornerRounding[] | null;
}

export interface VerticesOptions {
  /** Default [CornerRounding.Unrounded]. */
  rounding?: CornerRounding;
  /** Default null. Must have `vertices.length / 2` elements when given. */
  perVertexRounding?: readonly CornerRounding[] | null;
  /** Default `Float.MIN_VALUE` (a sentinel meaning "compute the center from the vertices"). */
  centerX?: number;
  /** Default `Float.MIN_VALUE` (a sentinel meaning "compute the center from the vertices"). */
  centerY?: number;
}

export interface FeaturesOptions {
  /** Default NaN (compute the center by averaging all cubic anchor points). */
  centerX?: number;
  /** Default NaN (compute the center by averaging all cubic anchor points). */
  centerY?: number;
}

/**
 * The RoundedPolygon class allows simple construction of polygonal shapes with optional rounding at
 * the vertices. Polygons can be constructed with either the number of vertices desired or an
 * ordered list of vertices.
 */
export class RoundedPolygon {
  readonly features: readonly Feature[];

  /** @internal */
  readonly center: Point;

  /** A flattened version of the [Feature]s, as a List<Cubic>. */
  readonly cubics: readonly Cubic[];

  /** Kotlin's internal primary constructor. Prefer the static factories. */
  constructor(features: readonly Feature[], center: Point) {
    this.features = features;
    this.center = center;
    const cubics: Cubic[] = [];
    // The first/last mechanism here ensures that the final anchor point in the shape
    // exactly matches the first anchor point. There can be rendering artifacts introduced
    // by those points being slightly off, even by much less than a pixel
    let firstCubic: Cubic | null = null;
    let lastCubic: Cubic | null = null;
    let firstFeatureSplitStart: Cubic[] | null = null;
    let firstFeatureSplitEnd: Cubic[] | null = null;
    if (features.length > 0 && features[0]!.cubics.length === 3) {
      const centerCubic = features[0]!.cubics[1]!;
      const [start, end] = centerCubic.split(0.5);
      firstFeatureSplitStart = [features[0]!.cubics[0]!, start];
      firstFeatureSplitEnd = [end, features[0]!.cubics[2]!];
    }
    // iterating one past the features list size allows us to insert the initial split
    // cubic if it exists
    for (let i = 0; i <= features.length; i++) {
      let featureCubics: readonly Cubic[];
      if (i === 0 && firstFeatureSplitEnd !== null) featureCubics = firstFeatureSplitEnd;
      else if (i === features.length) {
        if (firstFeatureSplitStart !== null) featureCubics = firstFeatureSplitStart;
        else break;
      } else featureCubics = features[i]!.cubics;
      for (let j = 0; j < featureCubics.length; j++) {
        // Skip zero-length curves; they add nothing and can trigger rendering artifacts
        const cubic = featureCubics[j]!;
        if (!cubic.zeroLength()) {
          if (lastCubic !== null) cubics.push(lastCubic);
          lastCubic = cubic;
          if (firstCubic === null) firstCubic = cubic;
        } else {
          if (lastCubic !== null) {
            // Dropping several zero-ish length curves in a row can lead to
            // enough discontinuity to throw an exception later, even though the
            // distances are quite small. Account for that by making the last
            // cubic use the latest anchor point, always.
            lastCubic = new Cubic(lastCubic.points.slice()); // Make a copy before mutating
            lastCubic.points[6] = cubic.anchor1X;
            lastCubic.points[7] = cubic.anchor1Y;
          }
        }
      }
    }
    if (lastCubic !== null && firstCubic !== null) {
      cubics.push(
        new Cubic(
          lastCubic.anchor0X,
          lastCubic.anchor0Y,
          lastCubic.control0X,
          lastCubic.control0Y,
          lastCubic.control1X,
          lastCubic.control1Y,
          firstCubic.anchor0X,
          firstCubic.anchor0Y,
        ),
      );
    } else {
      // Empty / 0-sized polygon.
      cubics.push(new Cubic(center.x, center.y, center.x, center.y, center.x, center.y, center.x, center.y));
    }
    this.cubics = cubics;

    // init
    let prevCubic = cubics[cubics.length - 1]!;
    for (let index = 0; index < cubics.length; index++) {
      const cubic = cubics[index]!;
      if (
        Math.abs(cubic.anchor0X - prevCubic.anchor1X) > DistanceEpsilon ||
        Math.abs(cubic.anchor0Y - prevCubic.anchor1Y) > DistanceEpsilon
      ) {
        throw new IllegalArgumentError(
          'RoundedPolygon must be contiguous, with the anchor points of all curves ' +
            'matching the anchor points of the preceding and succeeding cubics',
        );
      }
      prevCubic = cubic;
    }
  }

  get centerX(): number {
    return this.center.x;
  }

  get centerY(): number {
    return this.center.y;
  }

  /**
   * Transforms (scales/translates/etc.) this [RoundedPolygon] with the given [PointTransformer]
   * and returns a new [RoundedPolygon]. This is a low level API and there should be more platform
   * idiomatic ways to transform a [RoundedPolygon] provided by the platform specific wrapper.
   *
   * @param f The [PointTransformer] used to transform this [RoundedPolygon]
   */
  transformed(f: PointTransformer): RoundedPolygon {
    const center = this.center.transformed(f);
    const features: Feature[] = [];
    for (let i = 0; i < this.features.length; i++) {
      features.push(this.features[i]!.transformed(f));
    }
    return new RoundedPolygon(features, center);
  }

  /**
   * Creates a new RoundedPolygon, moving and resizing this one, so it's completely inside the
   * (0, 0) -> (1, 1) square, centered if there extra space in one direction
   */
  normalized(): RoundedPolygon {
    const bounds = this.calculateBounds();
    const width = bounds[2]! - bounds[0]!;
    const height = bounds[3]! - bounds[1]!;
    const side = Math.max(width, height);
    // Center the shape if bounds are not a square
    const offsetX = (side - width) / 2 - bounds[0]! /* left */;
    const offsetY = (side - height) / 2 - bounds[1]! /* top */;
    return this.transformed((x, y) => [(x + offsetX) / side, (y + offsetY) / side]);
  }

  toString(): string {
    return (
      '[RoundedPolygon.' +
      ' Cubics = ' +
      this.cubics.map((it) => it.toString()).join(', ') +
      ' || Features = ' +
      this.features.map((it) => it.toString()).join(', ') +
      ` || Center = (${this.centerX}, ${this.centerY})]`
    );
  }

  /**
   * Like [calculateBounds], this function calculates the axis-aligned bounds of the object and
   * returns that rectangle. But this function determines the max dimension of the shape (by
   * calculating the distance from its center to the start and midpoint of each curve) and returns
   * a square which can be used to hold the object in any rotation. This function can be used, for
   * example, to calculate the max size of a UI element meant to hold this shape in any rotation.
   *
   * @param bounds a buffer to hold the results. If not supplied, a temporary buffer will be
   *   created.
   * @return The axis-aligned max bounding box for this object, where the rectangles left, top,
   *   right, and bottom values will be stored in entries 0, 1, 2, and 3, in that order.
   */
  calculateMaxBounds<T extends FloatArray = Float64Array>(bounds: T = new Float64Array(4) as T): T {
    require(bounds.length >= 4, () => 'Required bounds size of 4');
    let maxDistSquared = 0;
    for (let i = 0; i < this.cubics.length; i++) {
      const cubic = this.cubics[i]!;
      const anchorDistance = distanceSquared(cubic.anchor0X - this.centerX, cubic.anchor0Y - this.centerY);
      const middlePoint = cubic.pointOnCurve(0.5);
      const middleDistance = distanceSquared(middlePoint.x - this.centerX, middlePoint.y - this.centerY);
      maxDistSquared = Math.max(maxDistSquared, Math.max(anchorDistance, middleDistance));
    }
    const distance = Math.sqrt(maxDistSquared);
    bounds[0] = this.centerX - distance;
    bounds[1] = this.centerY - distance;
    bounds[2] = this.centerX + distance;
    bounds[3] = this.centerY + distance;
    return bounds;
  }

  /**
   * Calculates the axis-aligned bounds of the object.
   *
   * @param approximate when true, uses a faster calculation to create the bounding box based on
   *   the min/max values of all anchor and control points that make up the shape. Default value is
   *   true.
   * @param bounds a buffer to hold the results. If not supplied, a temporary buffer will be
   *   created.
   * @return The axis-aligned bounding box for this object, where the rectangles left, top, right,
   *   and bottom values will be stored in entries 0, 1, 2, and 3, in that order.
   */
  calculateBounds<T extends FloatArray = Float64Array>(
    bounds: T = new Float64Array(4) as T,
    approximate: boolean = true,
  ): T {
    require(bounds.length >= 4, () => 'Required bounds size of 4');
    let minX = FloatMaxValue;
    let minY = FloatMaxValue;
    // Note: Kotlin's Float.MIN_VALUE is the smallest *positive* float, kept as-is.
    let maxX = FloatMinValue;
    let maxY = FloatMinValue;
    for (let i = 0; i < this.cubics.length; i++) {
      const cubic = this.cubics[i]!;
      cubic.calculateBounds(bounds, approximate);
      minX = Math.min(minX, bounds[0]!);
      minY = Math.min(minY, bounds[1]!);
      maxX = Math.max(maxX, bounds[2]!);
      maxY = Math.max(maxY, bounds[3]!);
    }
    bounds[0] = minX;
    bounds[1] = minY;
    bounds[2] = maxX;
    bounds[3] = maxY;
    return bounds;
  }

  /** Kotlin `equals`: `features == other.features` (features compare by identity). */
  equals(other: unknown): boolean {
    if (this === other) return true;
    if (!(other instanceof RoundedPolygon)) return false;
    if (this.features.length !== other.features.length) return false;
    for (let i = 0; i < this.features.length; i++) {
      if (this.features[i] !== other.features[i]) return false;
    }
    return true;
  }

  /**
   * This constructor takes the number of vertices in the resulting polygon. These vertices are
   * positioned on a virtual circle around a given center with each vertex positioned [radius]
   * distance from that center, equally spaced (with equal angles between them). If no radius is
   * supplied, the shape will be created with a default radius of 1, resulting in a shape whose
   * vertices lie on a unit circle, with width/height of 2. That default polygon will probably need
   * to be rescaled using [transformed] into the appropriate size for the UI in which it will be
   * drawn.
   *
   * The [rounding] and [perVertexRounding] parameters are optional. If not supplied, the result
   * will be a regular polygon with straight edges and unrounded corners.
   *
   * @param numVertices The number of vertices in this polygon (at least 3).
   * @throws IllegalArgumentError If [perVertexRounding] is not null and its size is not equal to
   *   [numVertices], or if [numVertices] is less than 3.
   */
  static fromNumVertices(
    numVertices: number,
    {
      radius = 1,
      centerX = 0,
      centerY = 0,
      rounding = CornerRounding.Unrounded,
      perVertexRounding = null,
    }: NumVerticesOptions = {},
  ): RoundedPolygon {
    return RoundedPolygon.fromVertices(verticesFromNumVerts(numVertices, radius, centerX, centerY), {
      rounding,
      perVertexRounding,
      centerX,
      centerY,
    });
  }

  /** Creates a copy of the given [RoundedPolygon] */
  static copyOf(source: RoundedPolygon): RoundedPolygon {
    return new RoundedPolygon(source.features, source.center);
  }

  /**
   * This function takes the vertices (either supplied or calculated, depending on the constructor
   * called), plus [CornerRounding] parameters, and creates the actual [RoundedPolygon] shape,
   * rounding around the vertices (or not) as specified. The result is a list of [Cubic] curves
   * which represent the geometry of the final shape.
   *
   * @param vertices The list of vertices in this polygon specified as pairs of x/y coordinates.
   *   This should be an ordered list (with the outline of the shape going from each vertex to the
   *   next in order of this list), otherwise the results will be undefined.
   * @throws IllegalArgumentError if the number of vertices is less than 3 (the [vertices]
   *   parameter has less than 6 Floats). Or if the [perVertexRounding] parameter is not null and
   *   the size doesn't match the number vertices.
   */
  // TODO(performance): Update the map calls to more efficient code that doesn't allocate Iterators
  //  unnecessarily.
  static fromVertices(
    vertices: ArrayLike<number>,
    {
      rounding = CornerRounding.Unrounded,
      perVertexRounding = null,
      centerX = FloatMinValue,
      centerY = FloatMinValue,
    }: VerticesOptions = {},
  ): RoundedPolygon {
    if (vertices.length < 6) {
      throw new IllegalArgumentError('Polygons must have at least 3 vertices');
    }
    if (vertices.length % 2 === 1) {
      throw new IllegalArgumentError('The vertices array should have even size');
    }
    if (perVertexRounding !== null && perVertexRounding.length * 2 !== vertices.length) {
      throw new IllegalArgumentError(
        'perVertexRounding list should be either null or ' +
          'the same size as the number of vertices (vertices.size / 2)',
      );
    }
    const corners: Cubic[][] = [];
    const n = vertices.length / 2;
    const roundedCorners: RoundedCorner[] = [];
    for (let i = 0; i < n; i++) {
      const vtxRounding = perVertexRounding?.[i] ?? rounding;
      const prevIndex = ((i + n - 1) % n) * 2;
      const nextIndex = ((i + 1) % n) * 2;
      roundedCorners.push(
        new RoundedCorner(
          new Point(vertices[prevIndex]!, vertices[prevIndex + 1]!),
          new Point(vertices[i * 2]!, vertices[i * 2 + 1]!),
          new Point(vertices[nextIndex]!, vertices[nextIndex + 1]!),
          vtxRounding,
        ),
      );
    }

    // For each side, check if we have enough space to do the cuts needed, and if not split
    // the available space, first for round cuts, then for smoothing if there is space left.
    // Each element in this list is a pair, that represent how much we can do of the cut for
    // the given side (side i goes from corner i to corner i+1), the elements of the pair are:
    // first is how much we can use of expectedRoundCut, second how much of expectedCut
    const cutAdjusts: Array<readonly [number, number]> = [];
    for (let ix = 0; ix < n; ix++) {
      const expectedRoundCut =
        roundedCorners[ix]!.expectedRoundCut + roundedCorners[(ix + 1) % n]!.expectedRoundCut;
      const expectedCut = roundedCorners[ix]!.expectedCut + roundedCorners[(ix + 1) % n]!.expectedCut;
      const vtxX = vertices[ix * 2]!;
      const vtxY = vertices[ix * 2 + 1]!;
      const nextVtxX = vertices[((ix + 1) % n) * 2]!;
      const nextVtxY = vertices[((ix + 1) % n) * 2 + 1]!;
      const sideSize = distance(vtxX - nextVtxX, vtxY - nextVtxY);

      // Check expectedRoundCut first, and ensure we fulfill rounding needs first for
      // both corners before using space for smoothing
      if (expectedRoundCut > sideSize) {
        // Not enough room for fully rounding, see how much we can actually do.
        cutAdjusts.push([sideSize / expectedRoundCut, 0]);
      } else if (expectedCut > sideSize) {
        // We can do full rounding, but not full smoothing.
        cutAdjusts.push([1, (sideSize - expectedRoundCut) / (expectedCut - expectedRoundCut)]);
      } else {
        // There is enough room for rounding & smoothing.
        cutAdjusts.push([1, 1]);
      }
    }
    // Create and store list of beziers for each [potentially] rounded corner
    for (let i = 0; i < n; i++) {
      // allowedCuts[0] is for the side from the previous corner to this one,
      // allowedCuts[1] is for the side from this corner to the next one.
      const allowedCuts: number[] = [];
      for (let delta = 0; delta <= 1; delta++) {
        const [roundCutRatio, cutRatio] = cutAdjusts[(i + n - 1 + delta) % n]!;
        allowedCuts.push(
          roundedCorners[i]!.expectedRoundCut * roundCutRatio +
            (roundedCorners[i]!.expectedCut - roundedCorners[i]!.expectedRoundCut) * cutRatio,
        );
      }
      corners.push(roundedCorners[i]!.getCubics(allowedCuts[0]!, allowedCuts[1]!));
    }
    // Finally, store the calculated cubics. This includes all of the rounded corners
    // from above, along with new cubics representing the edges between those corners.
    const tempFeatures: Feature[] = [];
    for (let i = 0; i < n; i++) {
      // Note that these indices are for pairs of values (points), they need to be
      // doubled to access the xy values in the vertices float array
      const prevVtxIndex = (i + n - 1) % n;
      const nextVtxIndex = (i + 1) % n;
      const currVertex = new Point(vertices[i * 2]!, vertices[i * 2 + 1]!);
      const prevVertex = new Point(vertices[prevVtxIndex * 2]!, vertices[prevVtxIndex * 2 + 1]!);
      const nextVertex = new Point(vertices[nextVtxIndex * 2]!, vertices[nextVtxIndex * 2 + 1]!);
      const isConvex = convex(prevVertex, currVertex, nextVertex);
      tempFeatures.push(new Corner(corners[i]!, isConvex));
      const cornerLast = corners[i]![corners[i]!.length - 1]!;
      const nextCornerFirst = corners[(i + 1) % n]![0]!;
      tempFeatures.push(
        new Edge([
          Cubic.straightLine(cornerLast.anchor1X, cornerLast.anchor1Y, nextCornerFirst.anchor0X, nextCornerFirst.anchor0Y),
        ]),
      );
    }

    let cx: number;
    let cy: number;
    if (centerX === FloatMinValue || centerY === FloatMinValue) {
      const c = calculateCenter(vertices);
      cx = c.x;
      cy = c.y;
    } else {
      cx = centerX;
      cy = centerY;
    }
    return RoundedPolygon.fromFeatures(tempFeatures, { centerX: cx, centerY: cy });
  }

  /**
   * This constructor takes a list of [Feature] objects that define the polygon's shape and curves.
   * By specifying the features directly, the summarization of [Cubic] objects to curves can be
   * precisely controlled. This affects [Morph]'s default mapping, as curves with the same type
   * (convex or concave) are mapped with each other. For example, if you have a convex curve in your
   * start polygon, [Morph] will map it to another convex curve in the end polygon.
   *
   * The [centerX] and [centerY] parameters are optional. If not supplied, they will be estimated by
   * calculating the average of all cubic anchor points.
   *
   * @param features The [Feature]s that describe the characteristics of each outline segment of the
   *   polygon.
   * @throws IllegalArgumentError [features] must be at least specify 2 features and describe a
   *   closed shape.
   */
  static fromFeatures(
    features: readonly Feature[],
    { centerX = Number.NaN, centerY = Number.NaN }: FeaturesOptions = {},
  ): RoundedPolygon {
    require(features.length >= 2, () => 'Polygons must have at least 2 features');

    const vertices: number[] = [];
    for (const feature of features) {
      for (const cubic of feature.cubics) {
        vertices.push(cubic.anchor0X);
        vertices.push(cubic.anchor0Y);
      }
    }

    const cX = Number.isNaN(centerX) ? calculateCenter(vertices).x : centerX;
    const cY = Number.isNaN(centerY) ? calculateCenter(vertices).y : centerY;

    return new RoundedPolygon(features, new Point(cX, cY));
  }
}

/**
 * Calculates an estimated center position for the polygon, returning it. This function should only
 * be called if the center is not already calculated or provided. The Polygon constructor which
 * takes `numVertices` calculates its own center, since it knows exactly where it is centered, at
 * (0, 0).
 *
 * Note that this center will be transformed whenever the shape itself is transformed. Any
 * transforms that occur before the center is calculated will be taken into account automatically
 * since the center calculation is an average of the current location of all cubic anchor points.
 */
export function calculateCenter(vertices: ArrayLike<number>): Point {
  let cumulativeX = 0;
  let cumulativeY = 0;
  let index = 0;
  while (index < vertices.length) {
    cumulativeX += vertices[index++]!;
    cumulativeY += vertices[index++]!;
  }
  const count = Math.trunc(vertices.length / 2);
  return new Point(cumulativeX / count, cumulativeY / count);
}

/**
 * Private utility class that holds the information about each corner in a polygon. The shape of
 * the corner can be returned by calling the [getCubics] function, which will return a list of
 * curves representing the corner geometry. The shape of the corner depends on the [rounding]
 * constructor parameter.
 *
 * If rounding is null, there is no rounding; the corner will simply be a single point at [p1]. This
 * point will be represented by a [Cubic] of length 0 at that point.
 *
 * If rounding is not null, the corner will be rounded either with a curve approximating a circular
 * arc of the radius specified in [rounding], or with three curves if [rounding] has a nonzero
 * smoothing parameter. These three curves are a circular arc in the middle and two symmetrical
 * flanking curves on either side. The smoothing parameter determines the curvature of the flanking
 * curves.
 *
 * This is a class because we usually need to do the work in 2 steps, and prefer to keep state
 * between: first we determine how much we want to cut to comply with the parameters, then we are
 * given how much we can actually cut (because of space restrictions outside this corner)
 *
 * @param p0 the vertex before the one being rounded
 * @param p1 the vertex of this rounded corner
 * @param p2 the vertex after the one being rounded
 * @param rounding the optional parameters specifying how this corner should be rounded
 */
class RoundedCorner {
  readonly p0: Point;
  readonly p1: Point;
  readonly p2: Point;
  readonly rounding: CornerRounding | null;
  readonly d1: Point;
  readonly d2: Point;
  readonly cornerRadius: number;
  readonly smoothing: number;
  readonly cosAngle: number;
  readonly sinAngle: number;
  readonly expectedRoundCut: number;

  // the center of the circle approximated by the rounding curve (or the middle of the three
  // curves if smoothing is requested). The center is the same as p0 if there is no rounding.
  center: Point = new Point(0, 0);

  constructor(p0: Point, p1: Point, p2: Point, rounding: CornerRounding | null = null) {
    this.p0 = p0;
    this.p1 = p1;
    this.p2 = p2;
    this.rounding = rounding;
    const v01 = p0.minus(p1);
    const v21 = p2.minus(p1);
    const d01 = v01.getDistance();
    const d21 = v21.getDistance();
    if (d01 > 0 && d21 > 0) {
      this.d1 = v01.div(d01);
      this.d2 = v21.div(d21);
      this.cornerRadius = rounding?.radius ?? 0;
      this.smoothing = rounding?.smoothing ?? 0;

      // cosine of angle at p1 is dot product of unit vectors to the other two vertices
      this.cosAngle = this.d1.dotProduct(this.d2);

      // identity: sin^2 + cos^2 = 1
      // sinAngle gives us the intersection
      this.sinAngle = Math.sqrt(1 - square(this.cosAngle));
      // How much we need to cut, as measured on a side, to get the required radius
      // calculating where the rounding circle hits the edge
      // This uses the identity of tan(A/2) = sinA/(1 + cosA), where tan(A/2) = radius/cut
      this.expectedRoundCut =
        this.sinAngle > 1e-3 ? (this.cornerRadius * (this.cosAngle + 1)) / this.sinAngle : 0;
    } else {
      // One (or both) of the sides is empty, not much we can do.
      this.d1 = new Point(0, 0);
      this.d2 = new Point(0, 0);
      this.cornerRadius = 0;
      this.smoothing = 0;
      this.cosAngle = 0;
      this.sinAngle = 0;
      this.expectedRoundCut = 0;
    }
  }

  // smoothing changes the actual cut. 0 is same as expectedRoundCut, 1 doubles it
  get expectedCut(): number {
    return (1 + this.smoothing) * this.expectedRoundCut;
  }

  getCubics(allowedCut0: number, allowedCut1: number = allowedCut0): Cubic[] {
    // We use the minimum of both cuts to determine the radius, but if there is more space
    // in one side we can use it for smoothing.
    const allowedCut = Math.min(allowedCut0, allowedCut1);
    // Nothing to do, just use lines, or a point
    if (
      this.expectedRoundCut < DistanceEpsilon ||
      allowedCut < DistanceEpsilon ||
      this.cornerRadius < DistanceEpsilon
    ) {
      this.center = this.p1;
      return [Cubic.straightLine(this.p1.x, this.p1.y, this.p1.x, this.p1.y)];
    }
    // How much of the cut is required for the rounding part.
    const actualRoundCut = Math.min(allowedCut, this.expectedRoundCut);
    // We have two smoothing values, one for each side of the vertex
    // Space is used for rounding values first. If there is space left over, then we
    // apply smoothing, if it was requested
    const actualSmoothing0 = this.calculateActualSmoothingValue(allowedCut0);
    const actualSmoothing1 = this.calculateActualSmoothingValue(allowedCut1);
    // Scale the radius if needed
    const actualR = (this.cornerRadius * actualRoundCut) / this.expectedRoundCut;
    // Distance from the corner (p1) to the center
    const centerDistance = Math.sqrt(square(actualR) + square(actualRoundCut));
    // Center of the arc we will use for rounding
    this.center = this.p1.plus(this.d1.plus(this.d2).div(2).getDirection().times(centerDistance));
    const circleIntersection0 = this.p1.plus(this.d1.times(actualRoundCut));
    const circleIntersection2 = this.p1.plus(this.d2.times(actualRoundCut));
    const flanking0 = this.computeFlankingCurve(
      actualRoundCut,
      actualSmoothing0,
      this.p1,
      this.p0,
      circleIntersection0,
      circleIntersection2,
      this.center,
      actualR,
    );
    const flanking2 = this.computeFlankingCurve(
      actualRoundCut,
      actualSmoothing1,
      this.p1,
      this.p2,
      circleIntersection2,
      circleIntersection0,
      this.center,
      actualR,
    ).reverse();
    return [
      flanking0,
      Cubic.circularArc(
        this.center.x,
        this.center.y,
        flanking0.anchor1X,
        flanking0.anchor1Y,
        flanking2.anchor0X,
        flanking2.anchor0Y,
      ),
      flanking2,
    ];
  }

  /**
   * If allowedCut (the amount we are able to cut) is greater than the expected cut (without
   * smoothing applied yet), then there is room to apply smoothing and we calculate the actual
   * smoothing value here.
   */
  private calculateActualSmoothingValue(allowedCut: number): number {
    if (allowedCut > this.expectedCut) {
      return this.smoothing;
    } else if (allowedCut > this.expectedRoundCut) {
      return (
        (this.smoothing * (allowedCut - this.expectedRoundCut)) / (this.expectedCut - this.expectedRoundCut)
      );
    } else {
      return 0;
    }
  }

  /**
   * Compute a Bezier to connect the linear segment defined by corner and sideStart with the
   * circular segment defined by circleCenter, circleSegmentIntersection,
   * otherCircleSegmentIntersection and actualR. The bezier will start at the linear segment and
   * end on the circular segment.
   *
   * @param actualRoundCut How much we are cutting of the corner to add the circular segment (this
   *   is before smoothing, that will cut some more).
   * @param actualSmoothingValues How much we want to smooth (this is the smooth parameter,
   *   adjusted down if there is not enough room).
   * @param corner The point at which the linear side ends
   * @param sideStart The point at which the linear side starts
   * @param circleSegmentIntersection The point at which the linear side and the circle intersect.
   * @param otherCircleSegmentIntersection The point at which the opposing linear side and the
   *   circle intersect.
   * @param circleCenter The center of the circle.
   * @param actualR The radius of the circle.
   * @return a Bezier cubic curve that connects from the (cut) linear side and the (cut) circular
   *   segment in a smooth way.
   */
  private computeFlankingCurve(
    actualRoundCut: number,
    actualSmoothingValues: number,
    corner: Point,
    sideStart: Point,
    circleSegmentIntersection: Point,
    otherCircleSegmentIntersection: Point,
    circleCenter: Point,
    actualR: number,
  ): Cubic {
    // sideStart is the anchor, 'anchor' is actual control point
    const sideDirection = sideStart.minus(corner).getDirection();
    const curveStart = corner.plus(sideDirection.times(actualRoundCut).times(1 + actualSmoothingValues));
    // We use an approximation to cut a part of the circle section proportional to 1 - smooth,
    // When smooth = 0, we take the full section, when smooth = 1, we take nothing.
    // TODO: revisit this, it can be problematic as it approaches 180 degrees
    const p = interpolatePoint(
      circleSegmentIntersection,
      circleSegmentIntersection.plus(otherCircleSegmentIntersection).div(2),
      actualSmoothingValues,
    );
    // The flanking curve ends on the circle
    const curveEnd = circleCenter.plus(
      directionVector(p.x - circleCenter.x, p.y - circleCenter.y).times(actualR),
    );
    // The anchor on the circle segment side is in the intersection between the tangent to the
    // circle in the circle/flanking curve boundary and the linear segment.
    const circleTangent = curveEnd.minus(circleCenter).rotate90();
    const anchorEnd =
      this.lineIntersection(sideStart, sideDirection, curveEnd, circleTangent) ?? circleSegmentIntersection;
    // From what remains, we pick a point for the start anchor.
    // 2/3 seems to come from design tools?
    const anchorStart = curveStart.plus(anchorEnd.times(2)).div(3);
    return Cubic.fromPoints(curveStart, anchorStart, anchorEnd, curveEnd);
  }

  /**
   * Returns the intersection point of the two lines d0->d1 and p0->p1, or null if the lines do not
   * intersect
   */
  private lineIntersection(p0: Point, d0: Point, p1: Point, d1: Point): Point | null {
    const rotatedD1 = d1.rotate90();
    const den = d0.dotProduct(rotatedD1);
    if (Math.abs(den) < DistanceEpsilon) return null;
    const num = p1.minus(p0).dotProduct(rotatedD1);
    // Also check the relative value. This is equivalent to abs(den/num) < DistanceEpsilon,
    // but avoid doing a division
    if (Math.abs(den) < DistanceEpsilon * Math.abs(num)) return null;
    const k = num / den;
    return p0.plus(d0.times(k));
  }
}

function verticesFromNumVerts(numVertices: number, radius: number, centerX: number, centerY: number): Float64Array {
  const result = new Float64Array(numVertices * 2);
  let arrayIndex = 0;
  for (let i = 0; i < numVertices; i++) {
    const vertex = radialToCartesian(radius, (FloatPi / numVertices) * 2 * i).plus(new Point(centerX, centerY));
    result[arrayIndex++] = vertex.x;
    result[arrayIndex++] = vertex.y;
  }
  return result;
}
