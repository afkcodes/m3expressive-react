// Ported from AndroidX graphics-shapes FeatureDetector.kt (Apache License 2.0).
//
// Upstream's `Cubic.asFeature(next)` style extension functions become functions taking the cubic
// as their first argument.

import { Cubic } from './cubic.ts';
import { Corner, Edge, type Feature } from './features.ts';
import { RelaxedDistanceEpsilon, collinearIsh } from './utils.ts';

/**
 * Convert cubics to Features in a 1:1 mapping of [asFeature] unless
 * - two subsequent cubics are not continuous, in which case an empty corner needs to be added in
 *   between. Example for C1, C2: /C1\/C2\ -> /C\C/C\.
 * - multiple subsequent cubics can be expressed as a single feature. Example for C1, C2:
 *   --C1----C2-- -> -----E----. One exception to the latter rule is for the first and last cubic,
 *   that remain the same in order to persist the start position. Assumes the list of cubics is
 *   continuous.
 */
export function detectFeatures(cubics: readonly Cubic[]): Feature[] {
  if (cubics.length === 0) return [];

  // TODO: b/372651969 Try different heuristics for corner grouping
  const result: Feature[] = [];
  let current = cubics[0]!;

  // Do one roundabout in which (current == last, next == first) is the last iteration.
  // Just like a snowball, subsequent cubics that align to one feature merge until
  // the streak breaks, the result is added, and a new streak starts.
  for (let i = 0; i < cubics.length; i++) {
    const next = cubics[(i + 1) % cubics.length]!;

    if (i < cubics.length - 1 && alignsIshWith(current, next)) {
      current = extend(current, next);
      continue;
    }

    result.push(asFeature(current, next));

    if (!smoothesIntoIsh(current, next)) {
      result.push(asFeature(Cubic.empty(current.anchor1X, current.anchor1Y), next));
    }

    current = next;
  }
  return result;
}

/**
 * Convert to [Edge] if this cubic describes a straight line, otherwise to a [Corner]. Corner
 * convexity is determined by [Cubic.convexTo].
 */
export function asFeature(cubic: Cubic, next: Cubic): Feature {
  return straightIsh(cubic) ? new Edge([cubic]) : new Corner([cubic], cubic.convexTo(next));
}

/** Determine if the cubic is close to a straight line. Empty cubics don't count as straightIsh. */
export function straightIsh(cubic: Cubic): boolean {
  return (
    !cubic.zeroLength() &&
    collinearIsh(
      cubic.anchor0X,
      cubic.anchor0Y,
      cubic.anchor1X,
      cubic.anchor1Y,
      cubic.control0X,
      cubic.control0Y,
      RelaxedDistanceEpsilon,
    ) &&
    collinearIsh(
      cubic.anchor0X,
      cubic.anchor0Y,
      cubic.anchor1X,
      cubic.anchor1Y,
      cubic.control1X,
      cubic.control1Y,
      RelaxedDistanceEpsilon,
    )
  );
}

/**
 * Determines if next is a smooth continuation of this cubic. Smooth meaning that the first control
 * point of next is a reflection of this' second control point, similar to the S/s or t/T command in
 * svg paths https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths#b%C3%A9zier_curves
 */
export function smoothesIntoIsh(cubic: Cubic, next: Cubic): boolean {
  return collinearIsh(
    cubic.control1X,
    cubic.control1Y,
    next.control0X,
    next.control0Y,
    cubic.anchor1X,
    cubic.anchor1Y,
    RelaxedDistanceEpsilon,
  );
}

/**
 * Determines if all of this' points align with next's points. For straight lines, this is the same
 * as if next was a continuation of this.
 */
export function alignsIshWith(cubic: Cubic, next: Cubic): boolean {
  return (
    (straightIsh(cubic) && straightIsh(next) && smoothesIntoIsh(cubic, next)) || cubic.zeroLength() || next.zeroLength()
  );
}

/** Create a new cubic by extending A to B's second anchor point */
function extend(a: Cubic, b: Cubic): Cubic {
  return a.zeroLength()
    ? new Cubic(a.anchor0X, a.anchor0Y, b.control0X, b.control0Y, b.control1X, b.control1Y, b.anchor1X, b.anchor1Y)
    : new Cubic(a.anchor0X, a.anchor0Y, a.control0X, a.control0Y, a.control1X, a.control1Y, b.anchor1X, b.anchor1Y);
}
