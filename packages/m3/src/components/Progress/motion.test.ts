import { describe, expect, it } from 'vitest';
import { circularIndeterminate, linearIndeterminate } from './motion.ts';

describe('indeterminate motion (Compose material3 keyframes)', () => {
  it('circular: continuous rotation and sweep across 6s cycles; sweep spans 10%–87%', () => {
    let prev = circularIndeterminate(0);
    let lo = 1, hi = 0;
    for (let ms = 1; ms <= 12000; ms++) {
      const cur = circularIndeterminate(ms);
      const d = ((((cur.rotation - prev.rotation) % 360) + 540) % 360) - 180;
      expect(d).toBeGreaterThanOrEqual(0); // always turning clockwise
      expect(d).toBeLessThan(1);
      expect(Math.abs(cur.sweep - prev.sweep)).toBeLessThan(0.002);
      lo = Math.min(lo, cur.sweep);
      hi = Math.max(hi, cur.sweep);
      prev = cur;
    }
    expect(lo).toBeCloseTo(0.1, 3);
    expect(hi).toBeCloseTo(0.87, 3);
    expect(circularIndeterminate(300).rotation).toBeCloseTo(54 + 90, 6); // global 54° + one step
  });

  it('linear: line windows and continuity', () => {
    expect(linearIndeterminate(0)).toEqual([[0, 0], [0, 0]]);
    const [l1, l2] = linearIndeterminate(1000);
    expect(l1![1]).toBe(1);
    expect(l2![0]).toBeGreaterThan(0);
    expect(linearIndeterminate(1749)[1]![0]).toBeGreaterThan(0.99);
    let prev = linearIndeterminate(0);
    for (let ms = 1; ms < 1750; ms++) {
      const cur = linearIndeterminate(ms);
      cur.forEach(([a, b], i) => {
        expect(Math.abs(a - prev[i]![0])).toBeLessThan(0.01);
        expect(Math.abs(b - prev[i]![1])).toBeLessThan(0.01);
      });
      prev = cur;
    }
  });
});
