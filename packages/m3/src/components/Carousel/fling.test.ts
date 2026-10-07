import { describe, expect, it } from 'vitest';
import { splineFling } from './fling.ts';

describe('splineFling (Compose SplineBasedFloatDecayAnimationSpec, density 1)', () => {
  it('flings further and longer with more velocity, ending exactly at its distance', () => {
    const slow = splineFling(500);
    const fast = splineFling(4000);
    expect(fast.distance).toBeGreaterThan(slow.distance);
    expect(fast.duration).toBeGreaterThan(slow.duration);
    expect(fast.position(fast.duration)).toBeCloseTo(fast.distance, 6);
    expect(splineFling(-4000).distance).toBeCloseTo(-fast.distance, 6);
  });
  it('starts at the fling velocity', () => {
    const f = splineFling(2000);
    // Slope over the first millisecond ≈ the initial velocity (px/ms), within the 100-sample spline.
    expect(f.position(10) / 10).toBeGreaterThan(1.6);
    expect(f.position(10) / 10).toBeLessThan(2.2);
  });
});
