import { describe, expect, it } from 'vitest';
import { STAR_CREST, circularFrame, linearDeterminate, linearShapes, waveArc } from './geometry.ts';

describe('progress geometry (kit-derived)', () => {
  it('wave segment: 40px wavelength → r 19.437, sagitta 2.770 (Figma-clamped corner radius)', () => {
    const { r, sag } = waveArc(40);
    expect(r).toBeCloseTo(19.437, 3);
    expect(sag).toBeCloseTo(2.770, 3);
  });

  it('wavy ring crests sit on the track ring radius (≈22.08)', () => {
    expect(STAR_CREST).toBeCloseTo(22.08, 2);
  });

  it('linear flat 4dp 10%: whole-px line, track and stop on the kit subpixels', () => {
    const g = linearShapes({ width: 404, thickness: 4, type: 'flat', actives: linearDeterminate(404, 4, 0.1, 0), stop: true, wavelength: 40, phase: 0, amp: 0 });
    expect(g.active).toEqual(['M2 6H42']);
    expect(g.tracks).toEqual([{ x: 47.6, width: 356 }]);
    expect(g.stop?.x).toBeCloseTo(399.6, 5);
  });

  it('circular keyframes hit the kit samples and stay ordered in between', () => {
    expect(circularFrame('flat', 4, 0.5)).toEqual({ start: 5, end: 175, trackStart: 200, trackEnd: 340 });
    expect(circularFrame('flat', 4, 0)).toBeNull();
    for (let v = 0.01; v < 1; v += 0.01) {
      const f = circularFrame('wave', 8, v)!;
      expect(f.trackStart).toBeGreaterThan(f.end);
    }
  });
});
