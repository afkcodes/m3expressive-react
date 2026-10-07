/**
 * Cubic-bezier easing — one solver for the whole library (CSS / Compose `CubicBezierEasing`
 * semantics), plus the named curves the ported motion uses.
 *
 * Solving x(t) = fraction: Newton–Raphson from t = fraction, falling back to bisection when the
 * slope is too flat (as browsers' UnitBezier does); accurate to 1e-7 in t.
 */
export type Easing = (fraction: number) => number;

const EPSILON = 1e-7;

export function cubicBezier(x1: number, y1: number, x2: number, y2: number): Easing {
  // Polynomial coefficients of B(t) = ((a·t + b)·t + c)·t for each axis.
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  const solveT = (x: number) => {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const err = sampleX(t) - x;
      if (Math.abs(err) < EPSILON) return t;
      const d = slopeX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    let lo = 0;
    let hi = 1;
    t = x;
    while (hi - lo > EPSILON) {
      if (sampleX(t) < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return t;
  };

  return (fraction) => (fraction <= 0 ? 0 : fraction >= 1 ? 1 : sampleY(solveT(fraction)));
}

/* Named curves — Compose animation-core easings and M3 MotionTokens (material3 tokens/MotionTokens.kt). */

/** animation-core FastOutSlowInEasing. */
export const fastOutSlowIn = cubicBezier(0.4, 0, 0.2, 1);
/** animation-core LinearOutSlowInEasing. */
export const linearOutSlowIn = cubicBezier(0, 0, 0.2, 1);
/** animation-core FastOutLinearInEasing. */
export const fastOutLinearIn = cubicBezier(0.4, 0, 1, 1);
/** M3 EasingStandard. */
export const standard = cubicBezier(0.2, 0, 0, 1);
/** M3 EasingStandardAccelerate. */
export const standardAccelerate = cubicBezier(0.3, 0, 1, 1);
/** M3 EasingStandardDecelerate. */
export const standardDecelerate = cubicBezier(0, 0, 0, 1);
/** M3 EasingEmphasizedAccelerate (Compose value; MDC-Android uses 0.3, 0, 0.8, 0.2). */
export const emphasizedAccelerate = cubicBezier(0.3, 0, 0.8, 0.15);
/** M3 EasingEmphasizedDecelerate (Compose value; MDC-Android uses 0.1, 0.7, 0.1, 1). */
export const emphasizedDecelerate = cubicBezier(0.05, 0.7, 0.1, 1);
