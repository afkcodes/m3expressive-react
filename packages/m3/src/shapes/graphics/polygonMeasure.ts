// Ported from AndroidX graphics-shapes PolygonMeasure.kt (Apache License 2.0).

import type { Cubic } from './cubic.ts';
import { ProgressableFeature } from './featureMapping.ts';
import { Corner, type Feature } from './features.ts';
import { coerceIn, require } from './kotlin.ts';
import { Point } from './point.ts';
import type { RoundedPolygon } from './roundedPolygon.ts';
import { DistanceEpsilon, positiveModulo } from './utils.ts';

/**
 * Upstream `MeasuredPolygon : AbstractList<MeasuredCubic>`; here a read-only list-like class with
 * `size`, `get`, `getOrNull`, `first`, `last` and iteration.
 */
export class MeasuredPolygon implements Iterable<MeasuredCubic> {
  private readonly measurer: Measurer;
  private readonly cubics: readonly MeasuredCubic[];
  readonly features: readonly ProgressableFeature[];

  private constructor(
    measurer: Measurer,
    features: readonly ProgressableFeature[],
    cubics: readonly Cubic[],
    outlineProgress: readonly number[],
  ) {
    require(
      outlineProgress.length === cubics.length + 1,
      () => 'Outline progress size is expected to be the cubics size + 1',
    );
    require(outlineProgress[0] === 0, () => 'First outline progress value is expected to be zero');
    require(
      outlineProgress[outlineProgress.length - 1] === 1,
      () => 'Last outline progress value is expected to be one',
    );
    this.measurer = measurer;
    this.features = features;

    const measuredCubics: MeasuredCubic[] = [];
    let startOutlineProgress = 0;
    for (let index = 0; index < cubics.length; index++) {
      // Filter out "empty" cubics
      if (outlineProgress[index + 1]! - outlineProgress[index]! > DistanceEpsilon) {
        measuredCubics.push(
          new MeasuredCubic(measurer, cubics[index]!, startOutlineProgress, outlineProgress[index + 1]!),
        );
        // The next measured cubic will start exactly where this one ends.
        startOutlineProgress = outlineProgress[index + 1]!;
      }
    }
    // We could have removed empty cubics at the end. Ensure the last measured cubic ends at 1f
    measuredCubics[measuredCubics.length - 1]!.updateProgressRange(undefined, 1);
    this.cubics = measuredCubics;
  }

  /**
   * Finds the point in the input list of measured cubics that pass the given outline progress,
   * and generates a new MeasuredPolygon (equivalent to this), that starts at that point. This
   * usually means cutting the cubic that crosses the outline progress (unless the cut is at one of
   * its ends) For example, given outline progress 0.4f and measured cubics on these outline
   * progress ranges:
   *
   * c1 [0 -> 0.2] c2 [0.2 -> 0.5] c3 [0.5 -> 1.0]
   *
   * c2 will be cut in two, at the given outline progress, we can name these c2a [0.2 -> 0.4] and
   * c2b [0.4 -> 0.5]
   *
   * The return then will have measured cubics [c2b, c3, c1, c2a], and they will have their outline
   * progress ranges adjusted so the new list starts at 0. c2b [0 -> 0.1] c3 [0.1 -> 0.6] c1 [0.6
   * -> 0.8] c2a [0.8 -> 1.0]
   */
  cutAndShift(cuttingPoint: number): MeasuredPolygon {
    require(cuttingPoint >= 0 && cuttingPoint <= 1, () => 'Cutting point is expected to be between 0 and 1');
    if (cuttingPoint < DistanceEpsilon) return this;

    // Find the index of cubic we want to cut
    const targetIndex = this.cubics.findIndex(
      (it) => cuttingPoint >= it.startOutlineProgress && cuttingPoint <= it.endOutlineProgress,
    );
    const target = this.cubics[targetIndex]!;
    // Cut the target cubic.
    // b1, b2 are two resulting cubics after cut
    const [b1, b2] = target.cutAtProgress(cuttingPoint);

    // Construct the list of the cubics we need:
    // * The second part of the target cubic (after the cut)
    // * All cubics after the target, until the end + All cubics from the start, before the
    //   target cubic
    // * The first part of the target cubic (before the cut)
    const retCubics: Cubic[] = [b2.cubic];
    for (let i = 1; i < this.cubics.length; i++) {
      retCubics.push(this.cubics[(i + targetIndex) % this.cubics.length]!.cubic);
    }
    retCubics.push(b1.cubic);

    // Construct the array of outline progress.
    // For example, if we have 3 cubics with outline progress [0 .. 0.3], [0.3 .. 0.8] &
    // [0.8 .. 1.0], and we cut + shift at 0.6:
    // 0.  0123456789
    //     |--|--/-|-|
    // The outline progresses will start at 0 (the cutting point, that shifs to 0.0),
    // then 0.8 - 0.6 = 0.2, then 1 - 0.6 = 0.4, then 0.3 - 0.6 + 1 = 0.7,
    // then 1 (the cutting point again),
    // all together: (0.0, 0.2, 0.4, 0.7, 1.0)
    const retOutlineProgress: number[] = [];
    for (let index = 0; index < this.cubics.length + 2; index++) {
      if (index === 0) {
        retOutlineProgress.push(0);
      } else if (index === this.cubics.length + 1) {
        retOutlineProgress.push(1);
      } else {
        const cubicIndex = (targetIndex + index - 1) % this.cubics.length;
        retOutlineProgress.push(positiveModulo(this.cubics[cubicIndex]!.endOutlineProgress - cuttingPoint, 1));
      }
    }

    // Shift the feature's outline progress too.
    const newFeatures: ProgressableFeature[] = [];
    for (let i = 0; i < this.features.length; i++) {
      newFeatures.push(
        new ProgressableFeature(
          positiveModulo(this.features[i]!.progress - cuttingPoint, 1),
          this.features[i]!.feature,
        ),
      );
    }

    // Filter out all empty cubics (i.e. start and end anchor are (almost) the same point.)
    return new MeasuredPolygon(this.measurer, newFeatures, retCubics, retOutlineProgress);
  }

  // Implementation of AbstractList.
  get size(): number {
    return this.cubics.length;
  }

  /** Kotlin `get(index)`: throws when out of bounds. */
  get(index: number): MeasuredCubic {
    const cubic = this.cubics[index];
    if (cubic === undefined) throw new RangeError(`Index ${index} out of bounds for length ${this.cubics.length}`);
    return cubic;
  }

  getOrNull(index: number): MeasuredCubic | null {
    return this.cubics[index] ?? null;
  }

  first(): MeasuredCubic {
    return this.get(0);
  }

  last(): MeasuredCubic {
    return this.get(this.cubics.length - 1);
  }

  [Symbol.iterator](): Iterator<MeasuredCubic> {
    return this.cubics[Symbol.iterator]();
  }

  static measurePolygon(measurer: Measurer, polygon: RoundedPolygon): MeasuredPolygon {
    const cubics: Cubic[] = [];
    const featureToCubic: Array<[Feature, number]> = [];

    // Get the cubics from the polygon, at the same time, extract the features and keep a
    // reference to the representative cubic we will use.
    for (let featureIndex = 0; featureIndex < polygon.features.length; featureIndex++) {
      const feature = polygon.features[featureIndex]!;
      for (let cubicIndex = 0; cubicIndex < feature.cubics.length; cubicIndex++) {
        if (feature instanceof Corner && cubicIndex === Math.trunc(feature.cubics.length / 2)) {
          featureToCubic.push([feature, cubics.length]);
        }
        cubics.push(feature.cubics[cubicIndex]!);
      }
    }
    // cubics.scan(0f) { measure, cubic -> measure + measurer.measureCubic(cubic) }
    const measures: number[] = [0];
    let measure = 0;
    for (const cubic of cubics) {
      const it = measurer.measureCubic(cubic);
      require(it >= 0, () => 'Measured cubic is expected to be greater or equal to zero');
      measure = measure + it;
      measures.push(measure);
    }
    const totalMeasure = measures[measures.length - 1]!;

    // Equivalent to `measures.map { it / totalMeasure }` but without Iterator allocation.
    const outlineProgress: number[] = [];
    for (let i = 0; i < measures.length; i++) {
      outlineProgress.push(measures[i]! / totalMeasure);
    }

    const features: ProgressableFeature[] = [];
    for (let i = 0; i < featureToCubic.length; i++) {
      const ix = featureToCubic[i]![1];
      features.push(
        new ProgressableFeature(
          positiveModulo((outlineProgress[ix]! + outlineProgress[ix + 1]!) / 2, 1),
          featureToCubic[i]![0],
        ),
      );
    }

    return new MeasuredPolygon(measurer, features, cubics, outlineProgress);
  }
}

/**
 * A MeasuredCubic holds information about the cubic itself, the feature (if any) associated with
 * it, and the outline progress values (start and end) for the cubic. This information is used to
 * match cubics between shapes that lie at similar outline progress positions along their
 * respective shapes (after matching features and shifting).
 *
 * Outline progress is a value in [0..1) that represents the distance traveled along the overall
 * outline path of the shape.
 *
 * Upstream this is an `inner class` of MeasuredPolygon; the outer `measurer` is passed explicitly.
 */
export class MeasuredCubic {
  private readonly measurer: Measurer;
  readonly cubic: Cubic;
  readonly measuredSize: number;
  private _startOutlineProgress: number;
  private _endOutlineProgress: number;

  /**
   * @param startOutlineProgress Range [0, 1].
   * @param endOutlineProgress Range [0, 1].
   */
  constructor(measurer: Measurer, cubic: Cubic, startOutlineProgress: number, endOutlineProgress: number) {
    this.measurer = measurer;
    this.cubic = cubic;
    require(
      endOutlineProgress >= startOutlineProgress,
      () => 'endOutlineProgress is expected to be equal or greater than startOutlineProgress',
    );
    this.measuredSize = measurer.measureCubic(cubic);
    this._startOutlineProgress = startOutlineProgress;
    this._endOutlineProgress = endOutlineProgress;
  }

  get startOutlineProgress(): number {
    return this._startOutlineProgress;
  }

  get endOutlineProgress(): number {
    return this._endOutlineProgress;
  }

  updateProgressRange(
    startOutlineProgress: number = this._startOutlineProgress,
    endOutlineProgress: number = this._endOutlineProgress,
  ): void {
    require(
      endOutlineProgress >= startOutlineProgress,
      () => 'endOutlineProgress is expected to be equal or greater than startOutlineProgress',
    );
    this._startOutlineProgress = startOutlineProgress;
    this._endOutlineProgress = endOutlineProgress;
  }

  /** Cut this MeasuredCubic into two MeasuredCubics at the given outline progress value. */
  cutAtProgress(cutOutlineProgress: number): [MeasuredCubic, MeasuredCubic] {
    // Floating point errors further up can cause cutOutlineProgress to land just
    // slightly outside of the start/end progress for this cubic, so we limit it
    // to those bounds to avoid further errors later
    const boundedCutOutlineProgress = coerceIn(
      cutOutlineProgress,
      this._startOutlineProgress,
      this._endOutlineProgress,
    );
    const outlineProgressSize = this._endOutlineProgress - this._startOutlineProgress;
    const progressFromStart = boundedCutOutlineProgress - this._startOutlineProgress;

    // Note that in earlier parts of the computation, we have empty MeasuredCubics (cubics
    // with progressSize == 0f), but those cubics are filtered out before this method is
    // called.
    const relativeProgress = progressFromStart / outlineProgressSize;
    const t = this.measurer.findCubicCutPoint(this.cubic, relativeProgress * this.measuredSize);
    require(t >= 0 && t <= 1, () => 'Cubic cut point is expected to be between 0 and 1');

    // c1/c2 are the two new cubics, then we return MeasuredCubics created from them
    const [c1, c2] = this.cubic.split(t);
    return [
      new MeasuredCubic(this.measurer, c1, this._startOutlineProgress, boundedCutOutlineProgress),
      new MeasuredCubic(this.measurer, c2, boundedCutOutlineProgress, this._endOutlineProgress),
    ];
  }

  toString(): string {
    return (
      'MeasuredCubic(outlineProgress=' +
      `[${this._startOutlineProgress} .. ${this._endOutlineProgress}], ` +
      `size=${this.measuredSize}, cubic=${this.cubic.toString()})`
    );
  }
}

/**
 * Interface for measuring a cubic. Implementations can use whatever algorithm desired to produce
 * these measurement values.
 */
export interface Measurer {
  /**
   * Returns size of given cubic, according to however the implementation wants to measure the
   * size (angle, length, etc). It has to be greater or equal to 0.
   */
  measureCubic(c: Cubic): number;

  /**
   * Given a cubic and a measure that should be between 0 and the value returned by measureCubic
   * (If not, it will be capped), finds the parameter t of the cubic at which that measure is
   * reached.
   */
  findCubicCutPoint(c: Cubic, m: number): number;
}

/**
 * Approximates the arc lengths of cubics by splitting the arc into segments and calculating their
 * sizes. The more segments, the more accurate the result will be to the true arc length. The
 * default implementation has at least 98.5% accuracy on the case of a circular arc, which is the
 * worst case for our standard shapes.
 */
export class LengthMeasurer implements Measurer {
  // The minimum number needed to achieve up to 98.5% accuracy from the true arc length
  // See PolygonMeasureTest.measureCircle
  private readonly segments = 3;

  measureCubic(c: Cubic): number {
    return this.closestProgressTo(c, Number.POSITIVE_INFINITY)[1];
  }

  findCubicCutPoint(c: Cubic, m: number): number {
    return this.closestProgressTo(c, m)[0];
  }

  private closestProgressTo(cubic: Cubic, threshold: number): [number, number] {
    let total = 0;
    let remainder = threshold;
    let prev = new Point(cubic.anchor0X, cubic.anchor0Y);

    for (let i = 1; i <= this.segments; i++) {
      const progress = i / this.segments;
      const point = cubic.pointOnCurve(progress);
      const segment = point.minus(prev).getDistance();

      if (segment >= remainder) {
        return [progress - (1.0 - remainder / segment) / this.segments, threshold];
      }

      remainder -= segment;
      total += segment;
      prev = point;
    }

    return [1.0, total];
  }
}
