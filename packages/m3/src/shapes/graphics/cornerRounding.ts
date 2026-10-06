// Ported from AndroidX graphics-shapes CornerRounding.kt (Apache License 2.0).

/**
 * CornerRounding defines the amount and quality around a given vertex of a shape. [radius] defines
 * the radius of the circle which forms the basis of the rounding for the vertex. [smoothing]
 * defines the amount by which the curve is extended from the circular arc around the corner to the
 * edge between vertices.
 *
 * Each corner of a shape can be thought of as either:
 * - unrounded (with a corner radius of 0 and no smoothing)
 * - rounded with only a circular arc (with smoothing of 0). In this case, the rounding around the
 *   corner follows an approximated circular arc between the edges to adjacent vertices.
 * - rounded with three curves: There is an inner circular arc and two symmetric flanking curves.
 *   The flanking curves determine the curvature from the inner curve to the edges, with a value of
 *   0 (no smoothing) meaning that it is purely a circular curve and a value of 1 meaning that the
 *   flanking curves are maximized between the inner curve and the edges.
 *
 * @param radius a value of 0 or greater, representing the radius of the circle which defines the
 *   inner rounding arc of the corner. A value of 0 indicates that the corner is sharp, or
 *   completely unrounded. A positive value is the requested size of the radius. Note that this
 *   radius is an absolute size that should relate to the overall size of its shape.
 * @param smoothing the amount by which the arc is "smoothed" by extending the curve from the inner
 *   circular arc to the edge between vertices. A value of 0 (no smoothing) indicates that the
 *   corner is rounded by only a circular arc; there are no flanking curves. A value of 1 indicates
 *   that there is no circular arc in the center; the flanking curves on either side meet at the
 *   middle.
 */
export class CornerRounding {
  /** [Unrounded] has a rounding radius of zero, producing a sharp corner at a vertex. */
  static readonly Unrounded: CornerRounding = new CornerRounding();

  /** Range: 0 or greater. */
  readonly radius: number;
  /** Range: [0, 1]. */
  readonly smoothing: number;

  constructor(radius: number = 0, smoothing: number = 0) {
    this.radius = radius;
    this.smoothing = smoothing;
  }
}
