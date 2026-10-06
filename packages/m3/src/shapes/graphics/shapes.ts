// Ported from AndroidX graphics-shapes Shapes.kt (Apache License 2.0).
//
// Upstream these are companion extensions (`RoundedPolygon.circle(...)` etc.); here they are
// standalone factory functions. Kotlin named/default parameters become option objects.

import { CornerRounding } from './cornerRounding.ts';
import { IllegalArgumentError, coerceAtLeast } from './kotlin.ts';
import { Point } from './point.ts';
import { RoundedPolygon } from './roundedPolygon.ts';
import { FloatPi, TwoPi, interpolate, radialToCartesian } from './utils.ts';

export interface CircleOptions {
  /** The number of vertices in the underlying polygon (at least 3). Default 8. */
  numVertices?: number;
  /** Default 1. */
  radius?: number;
  /** Default 0. */
  centerX?: number;
  /** Default 0. */
  centerY?: number;
}

/**
 * Creates a circular shape, approximating the rounding of the shape around the underlying polygon
 * vertices.
 *
 * @throws IllegalArgumentError [numVertices] must be at least 3
 */
export function circle({ numVertices = 8, radius = 1, centerX = 0, centerY = 0 }: CircleOptions = {}): RoundedPolygon {
  if (numVertices < 3) throw new IllegalArgumentError('Circle must have at least three vertices');

  // Half of the angle between two adjacent vertices on the polygon
  const theta = FloatPi / numVertices;
  // Radius of the underlying RoundedPolygon object given the desired radius of the circle
  const polygonRadius = radius / Math.cos(theta);
  return RoundedPolygon.fromNumVertices(numVertices, {
    rounding: new CornerRounding(radius),
    radius: polygonRadius,
    centerX,
    centerY,
  });
}

export interface RectangleOptions {
  /** Default 2. */
  width?: number;
  /** Default 2. */
  height?: number;
  /** Default [CornerRounding.Unrounded]. */
  rounding?: CornerRounding;
  /** Default null. Must be of size 4 when given. */
  perVertexRounding?: readonly CornerRounding[] | null;
  /** Default 0. */
  centerX?: number;
  /** Default 0. */
  centerY?: number;
}

/**
 * Creates a rectangular shape with the given width/height around the given center. Optional
 * rounding parameters can be used to create a rounded rectangle instead.
 *
 * As with all [RoundedPolygon] objects, if this shape is created with default dimensions and
 * center, it is sized to fit within the 2x2 bounding box around a center of (0, 0) and will need to
 * be scaled and moved using [RoundedPolygon.transformed] to fit the intended area in a UI.
 */
export function rectangle({
  width = 2,
  height = 2,
  rounding = CornerRounding.Unrounded,
  perVertexRounding = null,
  centerX = 0,
  centerY = 0,
}: RectangleOptions = {}): RoundedPolygon {
  const left = centerX - width / 2;
  const top = centerY - height / 2;
  const right = centerX + width / 2;
  const bottom = centerY + height / 2;

  return RoundedPolygon.fromVertices([right, bottom, left, bottom, left, top, right, top], {
    rounding,
    perVertexRounding,
    centerX,
    centerY,
  });
}

export interface StarOptions {
  /** Outer radius, must be greater than 0. Default 1. */
  radius?: number;
  /** Inner radius, must be greater than 0 and less than [radius]. Default .5. */
  innerRadius?: number;
  /** Default [CornerRounding.Unrounded]. */
  rounding?: CornerRounding;
  /** Rounding for the inner vertices. Default null (inner vertices use [rounding]). */
  innerRounding?: CornerRounding | null;
  /** Default null. Must have 2 * numVerticesPerRadius elements when given. */
  perVertexRounding?: readonly CornerRounding[] | null;
  /** Default 0. */
  centerX?: number;
  /** Default 0. */
  centerY?: number;
}

/**
 * Creates a star polygon, which is like a regular polygon except every other vertex is on either an
 * inner or outer radius. The two radii specified in the constructor must both both nonzero. If the
 * radii are equal, the result will be a regular (not star) polygon with twice the number of
 * vertices specified in [numVerticesPerRadius].
 *
 * @param numVerticesPerRadius The number of vertices along each of the two radii.
 * @throws IllegalArgumentError if either [radius] or [innerRadius] are <= 0 or [innerRadius] >=
 *   [radius].
 */
export function star(
  numVerticesPerRadius: number,
  {
    radius = 1,
    innerRadius = 0.5,
    rounding = CornerRounding.Unrounded,
    innerRounding = null,
    perVertexRounding = null,
    centerX = 0,
    centerY = 0,
  }: StarOptions = {},
): RoundedPolygon {
  if (radius <= 0 || innerRadius <= 0) {
    throw new IllegalArgumentError('Star radii must both be greater than 0');
  }
  if (innerRadius >= radius) {
    throw new IllegalArgumentError('innerRadius must be less than radius');
  }

  let pvRounding = perVertexRounding;
  // If no per-vertex rounding supplied and caller asked for inner rounding,
  // create per-vertex rounding list based on supplied outer/inner rounding parameters
  if (pvRounding === null && innerRounding !== null) {
    const list: CornerRounding[] = [];
    for (let i = 0; i < numVerticesPerRadius; i++) list.push(rounding, innerRounding);
    pvRounding = list;
  }

  // Star polygon is just a polygon with all vertices supplied (where we generate
  // those vertices to be on the inner/outer radii)
  return RoundedPolygon.fromVertices(
    starVerticesFromNumVerts(numVerticesPerRadius, radius, innerRadius, centerX, centerY),
    { rounding, perVertexRounding: pvRounding, centerX, centerY },
  );
}

export interface PillOptions {
  /** Default 2. */
  width?: number;
  /** Default 1. */
  height?: number;
  /** Default 0. */
  smoothing?: number;
  /** Default 0. */
  centerX?: number;
  /** Default 0. */
  centerY?: number;
}

/**
 * A pill shape consists of a rectangle shape bounded by two semicircles at either of the long ends
 * of the rectangle.
 *
 * @throws IllegalArgumentError if either [width] or [height] are <= 0.
 */
export function pill({ width = 2, height = 1, smoothing = 0, centerX = 0, centerY = 0 }: PillOptions = {}): RoundedPolygon {
  if (!(width > 0 && height > 0)) {
    throw new IllegalArgumentError('Pill shapes must have positive width and height');
  }

  const wHalf = width / 2;
  const hHalf = height / 2;
  return RoundedPolygon.fromVertices(
    [
      wHalf + centerX,
      hHalf + centerY,
      -wHalf + centerX,
      hHalf + centerY,
      -wHalf + centerX,
      -hHalf + centerY,
      wHalf + centerX,
      -hHalf + centerY,
    ],
    { rounding: new CornerRounding(Math.min(wHalf, hHalf), smoothing), centerX, centerY },
  );
}

export interface PillStarOptions {
  /** Default 2. */
  width?: number;
  /** Default 1. */
  height?: number;
  /** Default 8. */
  numVerticesPerRadius?: number;
  /** In (0, 1]. Default .5. */
  innerRadiusRatio?: number;
  /** Default [CornerRounding.Unrounded]. */
  rounding?: CornerRounding;
  /** Default null. */
  innerRounding?: CornerRounding | null;
  /** Default null. */
  perVertexRounding?: readonly CornerRounding[] | null;
  /** In [0, 1]. Default .5. */
  vertexSpacing?: number;
  /** In [0, 1]. Default 0. */
  startLocation?: number;
  /** Default 0. */
  centerX?: number;
  /** Default 0. */
  centerY?: number;
}

/**
 * A pillStar shape is like a [pill] except it has inner and outer radii along its pill-shaped
 * outline, just like a [star] has inner and outer radii along its circular outline. The parameters
 * for a [pillStar] are similar to those of a [star] except, like [pill], it has a [width] and
 * [height] to determine the general shape of the underlying pill. Also, there is a subtle
 * complication with the way that inner and outer vertices proceed along the circular ends of the
 * shape, depending on the magnitudes of the [rounding], [innerRounding], and [innerRadiusRatio]
 * parameters.
 *
 * The default approach, reflected by the default value of [vertexSpacing], is to use the average of
 * the outer and inner radii, such that each set of vertices falls equally to the other side of the
 * pill outline on the curved ends. A value of 0 for [vertexSpacing] is equivalent to aligning the
 * inner vertices along the circular curve, and a value of 1 is equivalent to aligning the outer
 * vertices along that curve.
 *
 * @throws IllegalArgumentError if either [width] or [height] are <= 0 or if [innerRadiusRatio] is
 *   outside the range of (0, 1].
 */
export function pillStar({
  width = 2,
  height = 1,
  numVerticesPerRadius = 8,
  innerRadiusRatio = 0.5,
  rounding = CornerRounding.Unrounded,
  innerRounding = null,
  perVertexRounding = null,
  vertexSpacing = 0.5,
  startLocation = 0,
  centerX = 0,
  centerY = 0,
}: PillStarOptions = {}): RoundedPolygon {
  if (!(width > 0 && height > 0)) {
    throw new IllegalArgumentError('Pill shapes must have positive width and height');
  }
  if (!(innerRadiusRatio > 0 && innerRadiusRatio <= 1)) {
    throw new IllegalArgumentError('innerRadius must be between 0 and 1');
  }

  let pvRounding = perVertexRounding;
  // If no per-vertex rounding supplied and caller asked for inner rounding,
  // create per-vertex rounding list based on supplied outer/inner rounding parameters
  if (pvRounding === null && innerRounding !== null) {
    const list: CornerRounding[] = [];
    for (let i = 0; i < numVerticesPerRadius; i++) list.push(rounding, innerRounding);
    pvRounding = list;
  }
  return RoundedPolygon.fromVertices(
    pillStarVerticesFromNumVerts(
      numVerticesPerRadius,
      width,
      height,
      innerRadiusRatio,
      vertexSpacing,
      startLocation,
      centerX,
      centerY,
    ),
    { rounding, perVertexRounding: pvRounding, centerX, centerY },
  );
}

function pillStarVerticesFromNumVerts(
  numVerticesPerRadius: number,
  width: number,
  height: number,
  innerRadius: number,
  vertexSpacing: number,
  startLocation: number,
  centerX: number,
  centerY: number,
): Float64Array {
  // The general approach here is to get the perimeter of the underlying pill outline,
  // then the t value for each vertex as we walk that perimeter. This tells us where
  // on the outline to place that vertex, then we figure out where to place the vertex
  // depending on which "section" it is in. The possible sections are the vertical edges
  // on the sides, the circular sections on all four corners, or the horizontal edges
  // on the top and bottom. Note that either the vertical or horizontal edges will be
  // of length zero (whichever dimension is smaller gets only circular curvature for the
  // pill shape).
  const endcapRadius = Math.min(width, height);
  const vSegLen = coerceAtLeast(height - width, 0);
  const hSegLen = coerceAtLeast(width - height, 0);
  const vSegHalf = vSegLen / 2;
  const hSegHalf = hSegLen / 2;
  // vertexSpacing is used to position the vertices on the end caps. The caller has the choice
  // of spacing the inner (0) or outer (1) vertices like those along the edges, causing the
  // other vertices to be either further apart (0) or closer (1). The default is .5, which
  // averages things. The magnitude of the inner and rounding parameters may cause the caller
  // to want a different value.
  const circlePerimeter = TwoPi * endcapRadius * interpolate(innerRadius, 1, vertexSpacing);
  // perimeter is circle perimeter plus horizontal and vertical sections of inner rectangle,
  // whether either (or even both) might be of length zero.
  const perimeter = 2 * hSegLen + 2 * vSegLen + circlePerimeter;

  // The sections array holds the t start values of that part of the outline. We use these to
  // determine which section a given vertex lies in, based on its t value, as well as where
  // in that section it lies.
  const sections = new Float64Array(11);
  sections[0] = 0;
  sections[1] = vSegLen / 2;
  sections[2] = sections[1] + circlePerimeter / 4;
  sections[3] = sections[2] + hSegLen;
  sections[4] = sections[3] + circlePerimeter / 4;
  sections[5] = sections[4] + vSegLen;
  sections[6] = sections[5] + circlePerimeter / 4;
  sections[7] = sections[6] + hSegLen;
  sections[8] = sections[7] + circlePerimeter / 4;
  sections[9] = sections[8] + vSegLen / 2;
  sections[10] = perimeter;

  // "t" is the length along the entire pill outline for a given vertex. With vertices spaced
  // evenly along this contour, we can determine for any vertex where it should lie.
  const tPerVertex = perimeter / (2 * numVerticesPerRadius);
  // separate iteration for inner vs outer, unlike the other shapes, because
  // the vertices can lie in different quadrants so each needs their own calculation
  let inner = false;
  // Increment section index as we walk around the pill contour with our increasing t values
  let currSecIndex = 0;
  // secStart/End are used to determine how far along a given vertex is in the section
  // in which it lands
  let secStart = 0;
  let secEnd = sections[1]!;
  // t value is used to place each vertex. 0 is on the positive x axis,
  // moving into section 0 to begin with. startLocation, a value from 0 to 1, varies the location
  // anywhere on the perimeter of the shape
  let t = startLocation * perimeter;
  // The list of vertices to be returned
  const result = new Float64Array(numVerticesPerRadius * 4);
  let arrayIndex = 0;
  const rectBR = new Point(hSegHalf, vSegHalf);
  const rectBL = new Point(-hSegHalf, vSegHalf);
  const rectTL = new Point(-hSegHalf, -vSegHalf);
  const rectTR = new Point(hSegHalf, -vSegHalf);
  // Each iteration through this loop uses the next t value as we walk around the shape
  for (let i = 0; i < numVerticesPerRadius * 2; i++) {
    // t could start (and end) after 0; extra boundedT logic makes sure it does the right
    // thing when crossing the boundar past 0 again
    const boundedT = t % perimeter;
    if (boundedT < secStart) currSecIndex = 0;
    while (boundedT >= sections[(currSecIndex + 1) % sections.length]!) {
      currSecIndex = (currSecIndex + 1) % sections.length;
      secStart = sections[currSecIndex]!;
      secEnd = sections[(currSecIndex + 1) % sections.length]!;
    }

    // find t in section and its proportion of that section's total length
    const tInSection = boundedT - secStart;
    const tProportion = tInSection / (secEnd - secStart);

    // The vertex placement in a section varies depending on whether it is on one of the
    // semicircle endcaps or along one of the straight edges. For the endcaps, we use
    // tProportion to get the angle along that circular cap and add
    // the starting angle for that section. For the edges we use a straight linear calculation
    // given tProportion and the start/end t values for that edge.
    const currRadius = inner ? endcapRadius * innerRadius : endcapRadius;
    let vertex: Point;
    switch (currSecIndex) {
      case 0:
        vertex = new Point(currRadius, tProportion * vSegHalf);
        break;
      case 1:
        vertex = radialToCartesian(currRadius, (tProportion * FloatPi) / 2).plus(rectBR);
        break;
      case 2:
        vertex = new Point(hSegHalf - tProportion * hSegLen, currRadius);
        break;
      case 3:
        vertex = radialToCartesian(currRadius, FloatPi / 2 + (tProportion * FloatPi) / 2).plus(rectBL);
        break;
      case 4:
        vertex = new Point(-currRadius, vSegHalf - tProportion * vSegLen);
        break;
      case 5:
        vertex = radialToCartesian(currRadius, FloatPi + (tProportion * FloatPi) / 2).plus(rectTL);
        break;
      case 6:
        vertex = new Point(-hSegHalf + tProportion * hSegLen, -currRadius);
        break;
      case 7:
        vertex = radialToCartesian(currRadius, FloatPi * 1.5 + (tProportion * FloatPi) / 2).plus(rectTR);
        break;
      // 8
      default:
        vertex = new Point(currRadius, -vSegHalf + tProportion * vSegHalf);
        break;
    }
    result[arrayIndex++] = vertex.x + centerX;
    result[arrayIndex++] = vertex.y + centerY;
    t += tPerVertex;
    inner = !inner;
  }
  return result;
}

function starVerticesFromNumVerts(
  numVerticesPerRadius: number,
  radius: number,
  innerRadius: number,
  centerX: number,
  centerY: number,
): Float64Array {
  const result = new Float64Array(numVerticesPerRadius * 4);
  let arrayIndex = 0;
  for (let i = 0; i < numVerticesPerRadius; i++) {
    let vertex = radialToCartesian(radius, (FloatPi / numVerticesPerRadius) * 2 * i);
    result[arrayIndex++] = vertex.x + centerX;
    result[arrayIndex++] = vertex.y + centerY;
    vertex = radialToCartesian(innerRadius, (FloatPi / numVerticesPerRadius) * (2 * i + 1));
    result[arrayIndex++] = vertex.x + centerX;
    result[arrayIndex++] = vertex.y + centerY;
  }
  return result;
}
