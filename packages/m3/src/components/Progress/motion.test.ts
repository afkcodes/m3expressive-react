import { describe, expect, it } from 'vitest';
import { circularIndeterminate, linearIndeterminate } from './motion.ts';

describe('indeterminate motion is continuous (no jumps at cycle boundaries)', () => {
  it('circular: rotation and arc growth move < 2° per ms-step over two full 6660ms cycles', () => {
    let prev = circularIndeterminate(0);
    for (let ms = 1; ms <= 13320; ms++) {
      const cur = circularIndeterminate(ms);
      const dRot = ((((cur.rotation - prev.rotation) % 360) + 540) % 360) - 180;
      expect(Math.abs(dRot)).toBeLessThan(2);
      expect(Math.abs(cur.grow - prev.grow)).toBeLessThan(0.01);
      prev = cur;
    }
  });

  it('linear: line ends move < 0.5% of the track per ms', () => {
    let prev = linearIndeterminate(0);
    for (let ms = 1; ms <= 3600; ms++) {
      const cur = linearIndeterminate(ms);
      if (cur.length === prev.length) cur.forEach(([a, b], i) => {
        expect(Math.abs(a - prev[i]![0])).toBeLessThan(0.005);
        expect(Math.abs(b - prev[i]![1])).toBeLessThan(0.005);
      });
      prev = cur;
    }
  });
});
