// Ported from AndroidX graphics-shapes FloatMapping.kt (Apache License 2.0).

import { require } from './kotlin.ts';
import { DistanceEpsilon, positiveModulo } from './utils.ts';

/**
 * Checks if the given progress is in the given progress range, since progress is in the [0..1)
 * interval, and wraps, there is a special case when progressTo < progressFrom. For example, if the
 * progress range is 0.7 to 0.2, both 0.8 and 0.1 are inside and 0.5 is outside.
 */
export function progressInRange(progress: number, progressFrom: number, progressTo: number): boolean {
  if (progressTo >= progressFrom) {
    return progress >= progressFrom && progress <= progressTo;
  } else {
    return progress >= progressFrom || progress <= progressTo;
  }
}

/**
 * Maps from one set of progress values to another. This is used by DoubleMapper to retrieve the
 * value on one shape that maps to the appropriate value on the other.
 */
export function linearMap(xValues: readonly number[], yValues: readonly number[], x: number): number {
  require(x >= 0 && x <= 1, () => `Invalid progress: ${x}`);
  // xValues.indices.first { ... } throws NoSuchElementException when nothing matches
  let segmentStartIndex = -1;
  for (let it = 0; it < xValues.length; it++) {
    if (progressInRange(x, xValues[it]!, xValues[(it + 1) % xValues.length]!)) {
      segmentStartIndex = it;
      break;
    }
  }
  if (segmentStartIndex < 0) throw new Error('Collection contains no element matching the predicate.');
  const segmentEndIndex = (segmentStartIndex + 1) % xValues.length;
  const segmentSizeX = positiveModulo(xValues[segmentEndIndex]! - xValues[segmentStartIndex]!, 1);
  const segmentSizeY = positiveModulo(yValues[segmentEndIndex]! - yValues[segmentStartIndex]!, 1);
  const positionInSegment =
    segmentSizeX < 0.001 ? 0.5 : positiveModulo(x - xValues[segmentStartIndex]!, 1) / segmentSizeX;
  return positiveModulo(yValues[segmentStartIndex]! + segmentSizeY * positionInSegment, 1);
}

/**
 * DoubleMapper creates mappings from values in the [0..1) source space to values in the [0..1)
 * target space, and back. This mapping is created given a finite list of representative mappings,
 * and this is extended to the whole interval by linear interpolation, and wrapping around. For
 * example, if we have mappings 0.2 to 0.5 and 0.4 to 0.6, then 0.3 (which is in the middle of the
 * source interval) will be mapped to 0.55 (the middle of the targets for the interval), 0.21 will
 * map to 0.505, and so on. As a more complete example, if we use x to represent a value in the
 * source space and y for the target space, and given as input the mappings 0 to 0, 0.5 to 0.25,
 * this will create a mapping that: { if x in [0 .. 0.5] } y = x / 2 { if x in [0.5 .. 1] } y = 0.25
 * + (x - 0.5) * 1.5 = x * 1.5 - 0.5 The mapping can also be used the other way around (using the
 * mapBack function), resulting in: { if y in [0 .. 0.25] } x = y * 2 { if y in [0.25 .. 1] } x = (y
 * + 0.5) / 1.5 This is used to create mappings of progress values between the start and end shape,
 * which is then used to insert new curves and match curves overall.
 */
export class DoubleMapper {
  private readonly sourceValues: number[] = [];
  private readonly targetValues: number[] = [];

  constructor(...mappings: ReadonlyArray<readonly [number, number]>) {
    for (let i = 0; i < mappings.length; i++) {
      this.sourceValues.push(mappings[i]![0]);
      this.targetValues.push(mappings[i]![1]);
    }
    // Both source values and target values should be monotonically increasing, with the
    // exception of maybe one time (since progress wraps around).
    validateProgress(this.sourceValues);
    validateProgress(this.targetValues);
  }

  map(x: number): number {
    return linearMap(this.sourceValues, this.targetValues, x);
  }

  mapBack(x: number): number {
    return linearMap(this.targetValues, this.sourceValues, x);
  }

  static readonly Identity: DoubleMapper = new DoubleMapper(
    // We need any 2 points in the (x, x) diagonal, with x in the [0, 1) range,
    // We spread them as much as possible to minimize float errors.
    [0, 0],
    [0.5, 0.5],
  );
}

// Verify that a list of progress values are all in the range [0.0, 1.0) and is monotonically
// increasing, with the exception of maybe one time in which the progress wraps around, this check
// needs to include all pairs of consecutive elements in the list plus the last to first element
// pair.
// For example: (0.0, 0.3, 0.6) is a valid list, so are (0.3, 0.6, 0.0) and (0.6, 0.3, 0.0).
// On the other hand, something like (0.5, 0.0, 0.7) is not (since it goes down twice, from 0.5 to
// 0.0 and then from to 0.7 to 0.5).
export function validateProgress(p: readonly number[]): void {
  // FloatList.last() throws NoSuchElementException on an empty list
  if (p.length === 0) throw new Error('FloatList is empty.');
  let prev = p[p.length - 1]!;
  let wraps = 0;
  for (let i = 0; i < p.length; i++) {
    const curr = p[i]!;
    require(curr >= 0 && curr < 1, () => 'FloatMapping - Progress outside of range: ' + p.join(', '));
    require(
      progressDistance(curr, prev) > DistanceEpsilon,
      () => 'FloatMapping - Progress repeats a value: ' + p.join(', '),
    );
    if (curr < prev) {
      wraps++;
      require(wraps <= 1, () => 'FloatMapping - Progress wraps more than once: ' + p.join(', '));
    }
    prev = curr;
  }
}

// Distance between two progress values.
// Since progress wraps around, we consider a difference of 0.99 as a distance of 0.01
export function progressDistance(p1: number, p2: number): number {
  const it = Math.abs(p1 - p2);
  return Math.min(it, 1 - it);
}
