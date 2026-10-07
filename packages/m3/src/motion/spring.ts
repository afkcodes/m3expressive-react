/**
 * Damped harmonic oscillator — a line-for-line port of Jetpack Compose's
 * `androidx.compose.animation.core.SpringSimulation` (mass = 1).
 *
 * M3 Expressive defines every motion token as a spring (dampingRatio + stiffness),
 * so this is the single source of truth for motion. CSS easings in
 * `tokens/motion.stylex.ts` are generated from it by `scripts/gen-motion.ts`.
 *
 * This file must stay dependency-free: the generator imports it directly under Node.
 */

export interface SpringParams {
  readonly dampingRatio: number;
  readonly stiffness: number;
}

export interface SpringState {
  /** Current value. */
  readonly value: number;
  /** Units per second. */
  readonly velocity: number;
}

/**
 * Advance a spring by `dtMs` from `state` toward `target`.
 * Closed-form (no integration error), so it is frame-rate independent.
 */
export function stepSpring(
  { dampingRatio, stiffness }: SpringParams,
  state: SpringState,
  target: number,
  dtMs: number,
): SpringState {
  const naturalFreq = Math.sqrt(stiffness);
  const x0 = state.value - target;
  const v0 = state.velocity;
  const t = dtMs / 1000;
  const r = -dampingRatio * naturalFreq;

  let displacement: number;
  let velocity: number;

  if (dampingRatio > 1) {
    // Overdamped
    const s = naturalFreq * Math.sqrt(dampingRatio * dampingRatio - 1);
    const gammaPlus = r + s;
    const gammaMinus = r - s;
    const coeffB = (gammaMinus * x0 - v0) / (gammaMinus - gammaPlus);
    const coeffA = x0 - coeffB;
    const eMinus = Math.exp(gammaMinus * t);
    const ePlus = Math.exp(gammaPlus * t);
    displacement = coeffA * eMinus + coeffB * ePlus;
    velocity = coeffA * gammaMinus * eMinus + coeffB * gammaPlus * ePlus;
  } else if (dampingRatio === 1) {
    // Critically damped — every M3 "effects" token
    const coeffA = x0;
    const coeffB = v0 + naturalFreq * x0;
    const e = Math.exp(-naturalFreq * t);
    displacement = (coeffA + coeffB * t) * e;
    velocity = (coeffA + coeffB * t) * e * -naturalFreq + coeffB * e;
  } else {
    // Underdamped — every M3 "spatial" token (overshoots)
    const dampedFreq = naturalFreq * Math.sqrt(1 - dampingRatio * dampingRatio);
    const cosCoeff = x0;
    const sinCoeff = (1 / dampedFreq) * (-r * x0 + v0);
    const dFdT = dampedFreq * t;
    const e = Math.exp(r * t);
    const cos = Math.cos(dFdT);
    const sin = Math.sin(dFdT);
    displacement = e * (cosCoeff * cos + sinCoeff * sin);
    velocity = displacement * r + e * (-dampedFreq * cosCoeff * sin + dampedFreq * sinCoeff * cos);
  }

  return { value: displacement + target, velocity };
}

/**
 * Residual (as a fraction of travel) below which a spring counts as settled.
 * The generated `linear()` follows the spring exactly in time, so this only decides where
 * the invisible tail is cut (0.1% of travel; Compose cuts at its visibility threshold).
 * The durations Google publishes for web (350 / 500 / 650 ms …) belong to its cubic-bezier
 * approximations (`officialWebCurves`), not to spring settle times — only fast effects
 * (150 ms) coincides.
 */
export const SETTLE_THRESHOLD = 0.001;

/**
 * Milliseconds until a 0→1 spring (with optional initial velocity, in
 * travel-units/s) stays within `threshold` of the target for good.
 */
export function settleTimeMs(spring: SpringParams, initialVelocity = 0, threshold = SETTLE_THRESHOLD): number {
  const limit = 10_000;
  let lastOutside = 0;
  for (let ms = 1; ms <= limit; ms++) {
    const { value, velocity } = stepSpring(spring, { value: 0, velocity: initialVelocity }, 1, ms);
    // Velocity is scaled to "travel over one 60fps frame" so a fast pass through
    // the target is not mistaken for rest.
    if (Math.abs(value - 1) > threshold || Math.abs(velocity / 60) > threshold) lastOutside = ms;
  }
  return lastOutside + 1;
}

/** Sample a 0→1 spring at 1 ms resolution over `durationMs`. */
export function sampleSpring(spring: SpringParams, durationMs: number, initialVelocity = 0) {
  const points: Array<[t: number, value: number]> = [];
  for (let ms = 0; ms <= durationMs; ms++) {
    const { value } = stepSpring(spring, { value: 0, velocity: initialVelocity }, 1, ms);
    points.push([ms / durationMs, value]);
  }
  // Pin the end exactly on target so the CSS transition lands at the final value.
  points[points.length - 1] = [1, 1];
  return points;
}

/**
 * Exact CSS `linear()` easing for a spring: dense samples reduced with
 * Ramer–Douglas–Peucker so the polyline never deviates more than `tolerance`
 * from the true curve.
 */
export function springToLinear(spring: SpringParams, durationMs = settleTimeMs(spring), tolerance = 0.0005): string {
  const pts = simplify(sampleSpring(spring, durationMs), tolerance);
  const fmt = (n: number, d: number) => {
    const s = n.toFixed(d).replace(/\.?0+$/, '');
    return s === '-0' ? '0' : s;
  };
  const stops = pts.map(([t, v], i) => {
    if (i === 0) return fmt(v, 4);
    if (i === pts.length - 1) return fmt(v, 4);
    return `${fmt(v, 4)} ${fmt(t * 100, 2)}%`;
  });
  return `linear(${stops.join(', ')})`;
}

function simplify(points: Array<[number, number]>, tolerance: number): Array<[number, number]> {
  if (points.length <= 2) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: Array<[number, number]> = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const [ax, ay] = points[a]!;
    const [bx, by] = points[b]!;
    let maxDist = 0;
    let index = -1;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = points[i]!;
      // Vertical distance: the easing is evaluated at a given t, so that is the error that matters.
      const y = ay + ((by - ay) * (px - ax)) / (bx - ax);
      const dist = Math.abs(py - y);
      if (dist > maxDist) {
        maxDist = dist;
        index = i;
      }
    }
    if (maxDist > tolerance && index !== -1) {
      keep[index] = 1;
      stack.push([a, index], [index, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

/**
 * How long Compose runs a spring before snapping to the target — animation-core
 * SpringEstimation.kt `estimateAnimationDurationMillis`, ported line for line. Compose's
 * `FloatSpringSpec.getDurationNanos` passes displacement and velocity in units of the
 * visibility threshold with `delta = 1`, so a spring ends once its envelope is within one
 * threshold of the target (an overshoot that is still visible plays out).
 */
export function estimateDurationMs(
  spring: SpringParams,
  initialDisplacement: number,
  initialVelocity: number,
  delta = 1,
): number {
  const { stiffness, dampingRatio } = spring;
  if (dampingRatio === 0) return Number.MAX_SAFE_INTEGER;
  const dampingCoefficient = 2 * dampingRatio * Math.sqrt(stiffness);
  const partialRoot = dampingCoefficient * dampingCoefficient - 4 * stiffness;
  const partialRootReal = partialRoot < 0 ? 0 : Math.sqrt(partialRoot);
  const partialRootImaginary = partialRoot < 0 ? Math.sqrt(Math.abs(partialRoot)) : 0;
  const firstRootReal = (-dampingCoefficient + partialRootReal) * 0.5;
  const firstRootImaginary = partialRootImaginary * 0.5;
  const secondRootReal = (-dampingCoefficient - partialRootReal) * 0.5;

  if (initialDisplacement === 0 && initialVelocity === 0) return 0;
  const v0 = initialDisplacement < 0 ? -initialVelocity : initialVelocity;
  const p0 = Math.abs(initialDisplacement);
  const seconds =
    dampingRatio > 1
      ? estimateOverDamped(firstRootReal, secondRootReal, p0, v0, delta)
      : dampingRatio < 1
        ? estimateUnderDamped(firstRootReal, firstRootImaginary, p0, v0, delta)
        : estimateCriticallyDamped(firstRootReal, p0, v0, delta);
  return Math.trunc(seconds * 1000);
}

function estimateUnderDamped(r: number, imaginary: number, p0: number, v0: number, delta: number) {
  const c1 = p0;
  const c2 = (v0 - r * c1) / imaginary;
  const c = Math.sqrt(c1 * c1 + c2 * c2);
  return Math.log(delta / c) / r;
}

function estimateCriticallyDamped(r: number, p0: number, v0: number, delta: number) {
  const c1 = p0;
  const c2 = v0 - r * c1;
  const t1 = Math.log(Math.abs(delta / c1)) / r;
  const guess = Math.log(Math.abs(delta / c2));
  let g = guess;
  for (let i = 0; i <= 5; i++) g = guess - Math.log(Math.abs(g / r));
  const t2 = g / r;
  let tCurr = !Number.isFinite(t1) ? t2 : !Number.isFinite(t2) ? t1 : Math.max(t1, t2);

  const tInflection = -(r * c1 + c2) / (r * c2);
  const xInflection = c1 * Math.exp(r * tInflection) + c2 * tInflection * Math.exp(r * tInflection);
  let signedDelta: number;
  if (Number.isNaN(tInflection) || tInflection <= 0) {
    signedDelta = -delta;
  } else if (tInflection > 0 && -xInflection < delta) {
    if (c2 < 0 && c1 > 0) tCurr = 0;
    signedDelta = -delta;
  } else {
    tCurr = -(2 / r) - c1 / c2;
    signedDelta = delta;
  }

  let tDelta = Number.MAX_VALUE;
  for (let iterations = 0; tDelta > 0.001 && iterations < 100; iterations++) {
    const tLast = tCurr;
    const fn = (c1 + c2 * tCurr) * Math.exp(r * tCurr) + signedDelta;
    const fnPrime = (c2 * (r * tCurr + 1) + c1 * r) * Math.exp(r * tCurr);
    tCurr = tCurr - fn / fnPrime;
    tDelta = Math.abs(tLast - tCurr);
  }
  return tCurr;
}

function estimateOverDamped(r1: number, r2: number, p0: number, v0: number, delta: number) {
  const c2 = (r1 * p0 - v0) / (r1 - r2);
  const c1 = p0 - c2;
  const t1 = Math.log(Math.abs(delta / c1)) / r1;
  const t2 = Math.log(Math.abs(delta / c2)) / r2;
  let tCurr = !Number.isFinite(t1) ? t2 : !Number.isFinite(t2) ? t1 : Math.max(t1, t2);

  const tInflection = Math.log((c1 * r1) / (-c2 * r2)) / (r2 - r1);
  const xInflection = () => c1 * Math.exp(r1 * tInflection) + c2 * Math.exp(r2 * tInflection);
  let signedDelta: number;
  if (Number.isNaN(tInflection) || tInflection <= 0) {
    signedDelta = -delta;
  } else if (tInflection > 0 && -xInflection() < delta) {
    if (c2 > 0 && c1 < 0) tCurr = 0;
    signedDelta = -delta;
  } else {
    tCurr = Math.log(-(c2 * r2 * r2) / (c1 * r1 * r1)) / (r1 - r2);
    signedDelta = delta;
  }

  if (Math.abs(c1 * r1 * Math.exp(r1 * tCurr) + c2 * r2 * Math.exp(r2 * tCurr)) < 0.0001) return tCurr;
  let tDelta = Number.MAX_VALUE;
  for (let iterations = 0; tDelta > 0.001 && iterations < 100; iterations++) {
    const tLast = tCurr;
    const fn = c1 * Math.exp(r1 * tCurr) + c2 * Math.exp(r2 * tCurr) + signedDelta;
    const fnPrime = c1 * r1 * Math.exp(r1 * tCurr) + c2 * r2 * Math.exp(r2 * tCurr);
    tCurr = tCurr - fn / fnPrime;
    tDelta = Math.abs(tLast - tCurr);
  }
  return tCurr;
}
