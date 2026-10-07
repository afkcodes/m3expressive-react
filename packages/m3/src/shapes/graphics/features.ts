// Ported from AndroidX graphics-shapes Features.kt (Apache License 2.0).
//
// Upstream nests the internal subclasses as `Feature.Edge` / `Feature.Corner`; here they are the
// exported classes `Edge` and `Corner` (use `instanceof` where Kotlin uses `is`).

import type { Cubic, PointTransformer } from './cubic.ts';
import { require } from './kotlin.ts';
import { DistanceEpsilon } from './utils.ts';

// TODO: b/374764251 Introduce an IgnorableFeature?

/**
 * While a polygon's shape can be drawn solely using a list of [Cubic] objects representing its raw
 * curves and lines, features add an extra layer of context to groups of cubics. Features group
 * cubics into (straight) edges, convex corners, or concave corners. For example, rounding a
 * rectangle adds many cubics around its edges, but the rectangle's overall number of corners
 * remains the same. [Morph] therefore uses this grouping for several reasons:
 * - Noise Reduction: Grouping cubics reduces the amount of noise introduced by individual cubics
 *   (as seen in the rounded rectangle example).
 * - Mapping Base: The grouping serves as the base set for [Morph]'s mapping process.
 * - Curve Type Mapping: [Morph] maps similar curve types (convex, concave) together. Note that
 *   edges or features created with [buildIgnorableFeature] are ignored in the default mapping.
 *
 * By using features, you can manipulate polygon shapes with more context and control.
 */
export abstract class Feature {
  readonly cubics: readonly Cubic[];

  constructor(cubics: readonly Cubic[]) {
    this.cubics = cubics;
  }

  abstract toString(): string;

  /**
   * Group a list of [Cubic] objects to a feature that should be ignored in the default [Morph]
   * mapping. The feature can have any indentation.
   *
   * Sometimes, it's helpful to ignore certain features when morphing shapes. This is because only
   * the features you mark as important will be smoothly transitioned between the start and end
   * shapes. Additionally, the default morph algorithm will try to match convex corners to convex
   * corners and concave to concave. Marking features as ignorable will influence this matching.
   *
   * @param cubics The list of raw cubics describing the feature's shape
   * @throws IllegalArgumentError for lists of empty cubics or non-continuous cubics
   */
  static buildIgnorableFeature(cubics: readonly Cubic[]): Feature {
    return Feature.validated(new Edge(cubics));
  }

  /**
   * Group a [Cubic] object to an edge (neither inward or outward identification in a shape).
   *
   * @param cubic The raw cubic describing the edge's shape
   */
  static buildEdge(cubic: Cubic): Feature {
    return new Edge([cubic]);
  }

  /**
   * Group a list of [Cubic] objects to a convex corner (outward indentation in a shape).
   *
   * @param cubics The list of raw cubics describing the corner's shape
   * @throws IllegalArgumentError for lists of empty cubics or non-continuous cubics
   */
  static buildConvexCorner(cubics: readonly Cubic[]): Feature {
    return Feature.validated(new Corner(cubics, true));
  }

  /**
   * Group a list of [Cubic] objects to a concave corner (inward indentation in a shape).
   *
   * @param cubics The list of raw cubics describing the corner's shape
   * @throws IllegalArgumentError for lists of empty cubics or non-continuous cubics
   */
  static buildConcaveCorner(cubics: readonly Cubic[]): Feature {
    return Feature.validated(new Corner(cubics, false));
  }

  private static validated(feature: Feature): Feature {
    require(feature.cubics.length > 0, () => 'Features need at least one cubic.');

    require(Feature.isContinuous(feature), () =>
      'Feature must be continuous, with the anchor points of all cubics ' +
      'matching the anchor points of the preceding and succeeding cubics');

    return feature;
  }

  private static isContinuous(feature: Feature): boolean {
    let prevCubic = feature.cubics[0]!;
    for (let index = 1; index <= feature.cubics.length - 1; index++) {
      const cubic = feature.cubics[index]!;
      if (
        Math.abs(cubic.anchor0X - prevCubic.anchor1X) > DistanceEpsilon ||
        Math.abs(cubic.anchor0Y - prevCubic.anchor1Y) > DistanceEpsilon
      ) {
        return false;
      }
      prevCubic = cubic;
    }
    return true;
  }

  /**
   * Transforms the points in this [Feature] with the given [PointTransformer] and returns a new
   * [Feature]
   *
   * @param f The [PointTransformer] used to transform this [Feature]
   */
  abstract transformed(f: PointTransformer): Feature;

  /**
   * Returns a new [Feature] with the points that define the shape of this [Feature] in reversed
   * order.
   */
  abstract reversed(): Feature;

  /**
   * Whether this Feature gets ignored in the Morph mapping. See [buildIgnorableFeature] for more
   * details.
   */
  abstract readonly isIgnorableFeature: boolean;

  /** Whether this Feature is an Edge with no inward or outward indentation. */
  abstract readonly isEdge: boolean;

  /** Whether this Feature is a convex corner (outward indentation in a shape). */
  abstract readonly isConvexCorner: boolean;

  /** Whether this Feature is a concave corner (inward indentation in a shape). */
  abstract readonly isConcaveCorner: boolean;
}

/**
 * Edges have only a list of the cubic curves which make up the edge. Edges lie between corners and
 * have no vertex or concavity; the curves are simply straight lines (represented by Cubic curves).
 */
export class Edge extends Feature {
  override transformed(f: PointTransformer): Edge {
    const transformedCubics: Cubic[] = [];
    // Performance: Builds the list by avoiding creating an unnecessary Iterator to
    // iterate through the cubics List.
    for (let i = 0; i < this.cubics.length; i++) {
      transformedCubics.push(this.cubics[i]!.transformed(f));
    }
    return new Edge(transformedCubics);
  }

  override reversed(): Edge {
    const reversedCubics: Cubic[] = [];

    for (let i = this.cubics.length - 1; i >= 0; i--) {
      reversedCubics.push(this.cubics[i]!.reverse());
    }

    return new Edge(reversedCubics);
  }

  override toString(): string {
    return 'Edge';
  }

  override readonly isIgnorableFeature = true;

  override readonly isEdge = true;

  override readonly isConvexCorner = false;

  override readonly isConcaveCorner = false;
}

/**
 * Corners contain the list of cubic curves which describe how the corner is rounded (or not), and a
 * flag indicating whether the corner is convex. A regular polygon has all convex corners, while a
 * star polygon generally (but not necessarily) has both convex (outer) and concave (inner) corners.
 */
export class Corner extends Feature {
  override readonly isIgnorableFeature = false;

  override readonly isEdge = false;

  override readonly isConvexCorner: boolean;

  override readonly isConcaveCorner: boolean;

  readonly convex: boolean;

  constructor(cubics: readonly Cubic[], convex: boolean = true) {
    super(cubics);
    this.convex = convex;
    this.isConvexCorner = convex;
    this.isConcaveCorner = !convex;
  }

  override transformed(f: PointTransformer): Feature {
    const transformedCubics: Cubic[] = [];
    // Performance: Builds the list by avoiding creating an unnecessary Iterator to
    // iterate through the cubics List.
    for (let i = 0; i < this.cubics.length; i++) {
      transformedCubics.push(this.cubics[i]!.transformed(f));
    }
    return new Corner(transformedCubics, this.convex);
  }

  override reversed(): Corner {
    const reversedCubics: Cubic[] = [];

    for (let i = this.cubics.length - 1; i >= 0; i--) {
      reversedCubics.push(this.cubics[i]!.reverse());
    }

    // TODO: b/369320447 - Revert flag negation when [RoundedPolygon] ignores orientation
    // for setting the flag
    return new Corner(reversedCubics, !this.convex);
  }

  override toString(): string {
    return `Corner: cubics=${this.cubics.map((it) => `[${it.toString()}]`).join(', ')} convex=${this.convex}`;
  }
}
