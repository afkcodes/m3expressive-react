// Ported from AndroidX graphics-shapes Morph.kt (Apache License 2.0).

import { Cubic, MutableCubic, type FloatArray } from './cubic.ts';
import { featureMapper } from './featureMapping.ts';
import { require } from './kotlin.ts';
import { LengthMeasurer, MeasuredPolygon, type MeasuredCubic } from './polygonMeasure.ts';
import type { RoundedPolygon } from './roundedPolygon.ts';
import { AngleEpsilon, interpolate, positiveModulo } from './utils.ts';

/**
 * This class is used to animate between start and end polygons objects.
 *
 * Morphing between arbitrary objects can be problematic because it can be difficult to determine
 * how the points of a given shape map to the points of some other shape. [Morph] simplifies the
 * problem by only operating on [RoundedPolygon] objects, which are known to have similar,
 * contiguous structures. For one thing, the shape of a polygon is contiguous from start to end
 * (compared to an arbitrary Path object, which could have one or more `moveTo` operations in the
 * shape). Also, all edges of a polygon shape are represented by [Cubic] objects, thus the start and
 * end shapes use similar operations. Two Polygon shapes then only differ in the quantity and
 * placement of their curves. The morph works by determining how to map the curves of the two shapes
 * together (based on proximity and other information, such as distance to polygon vertices and
 * concavity), and splitting curves when the shapes do not have the same number of curves or when
 * the curve placement within the shapes is very different.
 */
export class Morph {
  /**
   * The structure which holds the actual shape being morphed. It contains all cubics necessary to
   * represent the start and end shapes (the original cubics in the shapes may be cut to align the
   * start/end shapes), matched one to one in each Pair.
   *
   * @internal (`@PublishedApi internal` upstream)
   */
  readonly morphMatch: ReadonlyArray<readonly [Cubic, Cubic]>;

  private readonly start: RoundedPolygon;
  private readonly end: RoundedPolygon;

  constructor(start: RoundedPolygon, end: RoundedPolygon) {
    this.start = start;
    this.end = end;
    this.morphMatch = Morph.match(start, end);
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
    this.start.calculateBounds(bounds, approximate);
    const minX = bounds[0]!;
    const minY = bounds[1]!;
    const maxX = bounds[2]!;
    const maxY = bounds[3]!;
    this.end.calculateBounds(bounds, approximate);
    bounds[0] = Math.min(minX, bounds[0]!);
    bounds[1] = Math.min(minY, bounds[1]!);
    bounds[2] = Math.max(maxX, bounds[2]!);
    bounds[3] = Math.max(maxY, bounds[3]!);
    return bounds;
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
    this.start.calculateMaxBounds(bounds);
    const minX = bounds[0]!;
    const minY = bounds[1]!;
    const maxX = bounds[2]!;
    const maxY = bounds[3]!;
    this.end.calculateMaxBounds(bounds);
    bounds[0] = Math.min(minX, bounds[0]!);
    bounds[1] = Math.min(minY, bounds[1]!);
    bounds[2] = Math.max(maxX, bounds[2]!);
    bounds[3] = Math.max(maxY, bounds[3]!);
    return bounds;
  }

  /**
   * Returns a representation of the morph object at a given [progress] value as a list of Cubics.
   * Note that this function causes a new list to be created and populated, so there is some
   * overhead.
   *
   * @param progress a value from 0 to 1 that determines the morph's current shape, between the
   *   start and end shapes provided at construction time. A value of 0 results in the start shape,
   *   a value of 1 results in the end shape, and any value in between results in a shape which is a
   *   linear interpolation between those two shapes. The range is generally [0..1] and values
   *   outside could result in undefined shapes, but values close to (but outside) the range can be
   *   used to get an exaggerated effect (e.g., for a bounce or overshoot animation).
   */
  asCubics(progress: number): Cubic[] {
    const result: Cubic[] = [];
    // The first/last mechanism here ensures that the final anchor point in the shape
    // exactly matches the first anchor point. There can be rendering artifacts introduced
    // by those points being slightly off, even by much less than a pixel
    let firstCubic: Cubic | null = null;
    let lastCubic: Cubic | null = null;
    for (let i = 0; i < this.morphMatch.length; i++) {
      const [first, second] = this.morphMatch[i]!;
      const points = new Float64Array(8);
      for (let it = 0; it < 8; it++) {
        points[it] = interpolate(first.points[it]!, second.points[it]!, progress);
      }
      const cubic = new Cubic(points);
      if (firstCubic === null) firstCubic = cubic;
      if (lastCubic !== null) result.push(lastCubic);
      lastCubic = cubic;
    }
    if (lastCubic !== null && firstCubic !== null) {
      result.push(
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
    }
    return result;
  }

  /**
   * Returns a representation of the morph object at a given [progress] value, iterating over the
   * cubics and calling the callback. This function is faster than [asCubics], since it doesn't
   * allocate new [Cubic] instances, but to do this it reuses the same [MutableCubic] instance
   * during iteration.
   *
   * (Kotlin signature order is `(progress, mutableCubic, callback)` with a trailing lambda; here
   * the optional [mutableCubic] comes last.)
   *
   * @param progress a value from 0 to 1 that determines the morph's current shape, between the
   *   start and end shapes provided at construction time.
   * @param callback The function to be called for each Cubic
   * @param mutableCubic An instance of [MutableCubic] that will be used to set each cubic in time.
   */
  forEachCubic(
    progress: number,
    callback: (cubic: MutableCubic) => void,
    mutableCubic: MutableCubic = new MutableCubic(),
  ): void {
    for (let i = 0; i < this.morphMatch.length; i++) {
      const [first, second] = this.morphMatch[i]!;
      mutableCubic.interpolate(first, second, progress);
      callback(mutableCubic);
    }
  }

  /**
   * [match], called at Morph construction time, creates the structure used to animate between the
   * start and end shapes. The technique is to match geometry (curves) between the shapes when and
   * where possible, and to create new/placeholder curves when necessary (when one of the shapes
   * has more curves than the other). The result is a list of pairs of Cubic curves. Those curves
   * are the matched pairs: the first of each pair holds the geometry of the start shape, the second
   * holds the geometry for the end shape. Changing the progress of a Morph object simply
   * interpolates between all pairs of curves for the morph shape.
   *
   * Curves on both shapes are matched by running the [Measurer] to determine where the points are
   * in each shape (proportionally, along the outline), and then running [featureMapper] which
   * decides how to map (match) all of the curves with each other.
   *
   * @internal
   */
  static match(p1: RoundedPolygon, p2: RoundedPolygon): Array<readonly [Cubic, Cubic]> {
    // Measure polygons, returns lists of measured cubics for each polygon, which
    // we then use to match start/end curves
    const measuredPolygon1 = MeasuredPolygon.measurePolygon(new LengthMeasurer(), p1);
    const measuredPolygon2 = MeasuredPolygon.measurePolygon(new LengthMeasurer(), p2);

    // features1 and 2 will contain the list of corners (just the inner circular curve)
    // along with the progress at the middle of those corners. These measurement values
    // are then used to compare and match between the two polygons
    const features1 = measuredPolygon1.features;
    const features2 = measuredPolygon2.features;

    // Map features: doubleMapper is the result of mapping the features in each shape to the
    // closest feature in the other shape.
    // Given a progress in one of the shapes it can be used to find the corresponding
    // progress in the other shape (in both directions)
    const doubleMapper = featureMapper(features1, features2);

    // cut point on poly2 is the mapping of the 0 point on poly1
    const polygon2CutPoint = doubleMapper.map(0);

    // Cut and rotate.
    // Polygons start at progress 0, and the featureMapper has decided that we want to match
    // progress 0 in the first polygon to `polygon2CutPoint` on the second polygon.
    // So we need to cut the second polygon there and "rotate it", so as we walk through
    // both polygons we can find the matching.
    // The resulting bs1/2 are MeasuredPolygons, whose MeasuredCubics start from
    // outlineProgress=0 and increasing until outlineProgress=1
    const bs1 = measuredPolygon1;
    const bs2 = measuredPolygon2.cutAndShift(polygon2CutPoint);

    // Match
    // Now we can compare the two lists of measured cubics and create a list of pairs
    // of cubics [ret], which are the start/end curves that represent the Morph object
    // and the start and end shapes, and which can be interpolated to animate the
    // between those shapes.
    const ret: Array<readonly [Cubic, Cubic]> = [];
    // i1/i2 are the indices of the current cubic on the start (1) and end (2) shapes
    let i1 = 0;
    let i2 = 0;
    // b1, b2 are the current measured cubic for each polygon
    let b1: MeasuredCubic | null = bs1.getOrNull(i1++);
    let b2: MeasuredCubic | null = bs2.getOrNull(i2++);
    // Iterate until all curves are accounted for and matched
    while (b1 !== null && b2 !== null) {
      // Progresses are in shape1's perspective
      // b1a, b2a are ending progress values of current measured cubics in [0,1] range
      const b1a = i1 === bs1.size ? 1 : b1.endOutlineProgress;
      const b2a =
        i2 === bs2.size ? 1 : doubleMapper.mapBack(positiveModulo(b2.endOutlineProgress + polygon2CutPoint, 1));
      const minb = Math.min(b1a, b2a);
      // min b is the progress at which the curve that ends first ends.
      // If both curves ends roughly there, no cutting is needed, we have a match.
      // If one curve extends beyond, we need to cut it.
      let seg1: MeasuredCubic;
      let newb1: MeasuredCubic | null;
      if (b1a > minb + AngleEpsilon) {
        [seg1, newb1] = b1.cutAtProgress(minb);
      } else {
        seg1 = b1;
        newb1 = bs1.getOrNull(i1++);
      }
      let seg2: MeasuredCubic;
      let newb2: MeasuredCubic | null;
      if (b2a > minb + AngleEpsilon) {
        [seg2, newb2] = b2.cutAtProgress(positiveModulo(doubleMapper.map(minb) - polygon2CutPoint, 1));
      } else {
        seg2 = b2;
        newb2 = bs2.getOrNull(i2++);
      }
      ret.push([seg1.cubic, seg2.cubic]);
      b1 = newb1;
      b2 = newb2;
    }
    require(b1 === null && b2 === null, () => "Expected both Polygon's Cubic to be fully matched");

    return ret;
  }
}
