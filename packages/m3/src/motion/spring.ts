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
    velocity =
      displacement * r + e * (-dampedFreq * cosCoeff * sin + dampedFreq * sinCoeff * cos);
  }

  return { value: displacement + target, velocity };
}

/**
 * Residual (as a fraction of travel) below which a spring counts as settled.
 * 0.001 reproduces the durations Google publishes for web
 * (e.g. expressive slow spatial → 650 ms, fast effects → 150 ms).
 */
export const SETTLE_THRESHOLD = 0.001;

/**
 * Milliseconds until a 0→1 spring (with optional initial velocity, in
 * travel-units/s) stays within `threshold` of the target for good.
 */
export function settleTimeMs(
  spring: SpringParams,
  initialVelocity = 0,
  threshold = SETTLE_THRESHOLD,
): number {
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
export function springToLinear(
  spring: SpringParams,
  durationMs = settleTimeMs(spring),
  tolerance = 0.0005,
): string {
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
