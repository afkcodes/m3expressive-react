/**
 * Compose's default fling decay (`rememberSplineBasedDecay` → SplineBasedFloatDecayAnimationSpec,
 * FlingCalculator, AndroidFlingSpline — ported line for line) with density 1 (1dp = 1 CSS px) and
 * Android's ViewConfiguration.SCROLL_FRICTION (0.015).
 */
const INFLECTION = 0.35; // Tension lines cross at (Inflection, 1)
const START_TENSION = 0.5;
const END_TENSION = 1.0;
const P1 = START_TENSION * INFLECTION;
const P2 = 1.0 - END_TENSION * (1.0 - INFLECTION);
const NB_SAMPLES = 100;
const GRAVITY_EARTH = 9.80665;
const INCHES_PER_METER = 39.37;
const DECELERATION_RATE = Math.log(0.78) / Math.log(0.9);
const SCROLL_FRICTION = 0.015;
const DENSITY = 1;
/** FlingCalculator.magicPhysicalCoefficient: computeDeceleration(0.84, density). */
const PHYSICAL_COEFFICIENT = GRAVITY_EARTH * INCHES_PER_METER * DENSITY * 160 * 0.84;

const SPLINE_POSITIONS = new Float64Array(NB_SAMPLES + 1);
{
  // computeSplineInfo (positions only; the times table isn't used by flingPosition).
  let xMin = 0;
  for (let i = 0; i < NB_SAMPLES; i++) {
    const alpha = i / NB_SAMPLES;
    let xMax = 1;
    let x: number;
    let coef: number;
    for (;;) {
      x = xMin + (xMax - xMin) / 2;
      coef = 3 * x * (1 - x);
      const tx = coef * ((1 - x) * P1 + x * P2) + x * x * x;
      if (Math.abs(tx - alpha) < 1e-5) break;
      if (tx > alpha) xMax = x;
      else xMin = x;
    }
    SPLINE_POSITIONS[i] = coef * ((1 - x) * START_TENSION + x) + x * x * x;
  }
  SPLINE_POSITIONS[NB_SAMPLES] = 1;
}

/** AndroidFlingSpline.flingPosition: distance coefficient (0…1) at fling progress `time` (0…1). */
function flingPosition(time: number) {
  const t = Math.min(1, Math.max(0, time));
  const index = Math.trunc(NB_SAMPLES * t);
  if (index >= NB_SAMPLES) return 1;
  const tInf = index / NB_SAMPLES;
  const tSup = (index + 1) / NB_SAMPLES;
  const dInf = SPLINE_POSITIONS[index]!;
  const dSup = SPLINE_POSITIONS[index + 1]!;
  return dInf + (t - tInf) * ((dSup - dInf) / (tSup - tInf));
}

const splineDeceleration = (velocity: number) =>
  Math.log((INFLECTION * Math.abs(velocity)) / (SCROLL_FRICTION * PHYSICAL_COEFFICIENT));

/** A fling from `velocity` (px/s): its distance (signed), duration (ms) and position at a time. */
export function splineFling(velocity: number) {
  if (velocity === 0) return { distance: 0, duration: 0, position: () => 0 };
  const l = splineDeceleration(velocity);
  const decelMinusOne = DECELERATION_RATE - 1;
  const distance =
    SCROLL_FRICTION * PHYSICAL_COEFFICIENT * Math.exp((DECELERATION_RATE / decelMinusOne) * l) * Math.sign(velocity);
  const duration = Math.trunc(1000 * Math.exp(l / decelMinusOne));
  return {
    distance,
    duration,
    position: (ms: number) => distance * flingPosition(duration > 0 ? Math.trunc(ms) / duration : 1),
  };
}
