import { describe, expect, it } from 'vitest';
import {
  cubicBezier,
  emphasizedAccelerate,
  emphasizedDecelerate,
  fastOutLinearIn,
  fastOutSlowIn,
  linearOutSlowIn,
  standard,
  standardAccelerate,
  standardDecelerate,
  type Easing,
} from './easing.ts';

/*
 * Reference values: an independent 200-step bisection of the Bézier in float64 (x(t) = fraction,
 * then y(t)), rounded to 9 places. The solver promises 1e-7 in t, so values compare to 6 places.
 */

describe('cubicBezier', () => {
  it('pins the endpoints and clamps fractions outside 0…1', () => {
    const e = cubicBezier(0.25, 0.1, 0.25, 1);
    expect([e(0), e(1), e(-0.5), e(1.5)]).toEqual([0, 1, 0, 1]);
  });

  it('CSS `ease` (0.25, 0.1, 0.25, 1) matches its known values', () => {
    const ease = cubicBezier(0.25, 0.1, 0.25, 1);
    const expected = [0.094796306, 0.408510591, 0.802403388, 0.960458978, 0.994316477];
    [0.1, 0.25, 0.5, 0.75, 0.9].forEach((x, i) => expect(ease(x)).toBeCloseTo(expected[i]!, 6));
  });

  it('the linear control points give the identity', () => {
    const linear = cubicBezier(0, 0, 1, 1);
    for (let x = 0; x <= 1; x += 0.05) expect(linear(x)).toBeCloseTo(x, 6);
  });

  it('a point-symmetric curve (ease-in-out) is 0.5 at 0.5 and e(x) + e(1 − x) = 1', () => {
    const e = cubicBezier(0.42, 0, 0.58, 1);
    expect(e(0.5)).toBeCloseTo(0.5, 9);
    for (const x of [0.1, 0.2, 0.3, 0.4]) expect(e(x) + e(1 - x)).toBeCloseTo(1, 6);
  });

  it('falls back to bisection where x(t) is flat (Newton would stall)', () => {
    // (1, 0, 0, 1): x(t) = 4t³ − 6t² + 3t has zero slope at t = 0.5, so 2x − 1 = (2t − 1)³ and
    // t = (1 + ∛(2x − 1)) / 2; y(t) = 3t² − 2t³.
    const e = cubicBezier(1, 0, 0, 1);
    const exact = (x: number) => {
      const t = (1 + Math.cbrt(2 * x - 1)) / 2;
      return 3 * t * t - 2 * t * t * t;
    };
    for (const x of [0.3, 0.4999, 0.5, 0.5001, 0.51, 0.7]) expect(e(x)).toBeCloseTo(exact(x), 6);
  });

  it('control points above 1 overshoot (y is not clamped between the ends)', () => {
    const back = cubicBezier(0.34, 1.56, 0.64, 1);
    const peak = Math.max(...Array.from({ length: 101 }, (_, i) => back(i / 100)));
    expect(peak).toBeGreaterThan(1.05);
  });

  it('monotone control points give a non-decreasing curve', () => {
    for (const e of [fastOutSlowIn, standard, emphasizedDecelerate, emphasizedAccelerate]) {
      let previous = 0;
      for (let i = 1; i <= 200; i++) {
        const value = e(i / 200);
        expect(value).toBeGreaterThanOrEqual(previous - 1e-9);
        previous = value;
      }
    }
  });
});

describe('named curves (Compose animation-core easings and M3 MotionTokens)', () => {
  const curves: [string, Easing, number[]][] = [
    ['FastOutSlowIn (0.4, 0, 0.2, 1)', fastOutSlowIn, [0.025863015, 0.23658736, 0.775561311, 0.959367737, 0.994353929]],
    [
      'LinearOutSlowIn (0, 0, 0.2, 1)',
      linearOutSlowIn,
      [0.303847577, 0.577572928, 0.839245058, 0.964216366, 0.994601418],
    ],
    ['FastOutLinearIn (0.4, 0, 1, 1)', fastOutLinearIn, [0.018372884, 0.098626561, 0.324814611, 0.630085317, 0.84375]],
    ['EasingStandard (0.2, 0, 0, 1)', standard, [0.15625, 0.607220362, 0.877833605, 0.975480068, 0.996459041]],
    [
      'EasingStandardAccelerate (0.3, 0, 1, 1)',
      standardAccelerate,
      [0.027562284, 0.128502121, 0.372029386, 0.667568486, 0.862555917],
    ],
    [
      'EasingStandardDecelerate (0, 0, 0, 1)',
      standardDecelerate,
      [0.446330407, 0.690550789, 0.889881575, 0.976445437, 0.996509255],
    ],
    [
      'EasingEmphasizedAccelerate (0.3, 0, 0.8, 0.15)',
      emphasizedAccelerate,
      [0.005538248, 0.035342649, 0.153998192, 0.405585509, 0.683300925],
    ],
    [
      'EasingEmphasizedDecelerate (0.05, 0.7, 0.1, 1)',
      emphasizedDecelerate,
      [0.621384396, 0.831529746, 0.950247475, 0.990510957, 0.998666346],
    ],
  ];

  it.each(curves)('%s: 0 at 0, 1 at 1, reference values between', (_, e, expected) => {
    expect([e(0), e(1)]).toEqual([0, 1]);
    [0.1, 0.25, 0.5, 0.75, 0.9].forEach((x, i) => expect(e(x)).toBeCloseTo(expected[i]!, 6));
  });

  it('accelerate / decelerate pairs: slow start below the diagonal, fast start above it', () => {
    for (const e of [fastOutLinearIn, standardAccelerate, emphasizedAccelerate]) expect(e(0.5)).toBeLessThan(0.5);
    for (const e of [linearOutSlowIn, standardDecelerate, emphasizedDecelerate, fastOutSlowIn, standard])
      expect(e(0.5)).toBeGreaterThan(0.5);
  });
});
