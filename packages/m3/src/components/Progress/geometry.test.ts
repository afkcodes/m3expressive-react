import { describe, expect, it } from 'vitest';
import {
  CIRCULAR,
  STAR_CREST,
  blendedStarPath,
  circularFrame,
  determinateTrackSpace,
  gapOpening,
  linearDeterminate,
  linearShapes,
  waveArc,
} from './geometry.ts';

describe('progress geometry (kit-derived)', () => {
  it('wave segment: 40px wavelength → r 19.437, sagitta 2.770 (Figma-clamped corner radius)', () => {
    const { r, sag } = waveArc(40);
    expect(r).toBeCloseTo(19.437, 3);
    expect(sag).toBeCloseTo(2.77, 3);
  });

  it('wavy ring crests sit on the track ring radius (≈22.08)', () => {
    expect(STAR_CREST).toBeCloseTo(22.08, 2);
  });

  it('linear flat 4dp 10%: whole-px line, track and stop on the kit subpixels', () => {
    const g = linearShapes({
      width: 404,
      thickness: 4,
      shape: 'flat',
      actives: linearDeterminate(404, 4, 0.1, 0),
      stop: true,
      wavelength: 40,
      waveOrigin: 2,
      amp: 0,
      snap: true,
    });
    expect(g.active).toEqual(['M2 6H42']);
    expect(g.tracks).toEqual([{ x: 47.6, width: 356 }]);
    expect(g.stop?.x).toBeCloseTo(399.6, 5);
  });

  it('circular keyframes hit the kit samples and stay ordered in between', () => {
    expect(circularFrame('flat', 4, 0.5)).toEqual({ start: 5, end: 175, trackStart: 200, trackEnd: 340 });
    expect(circularFrame('flat', 4, 0)).toBeNull();
    for (let v = 0.01; v < 1; v += 0.01) {
      const f = circularFrame('wavy', 8, v)!;
      expect(f.trackStart).toBeGreaterThan(f.end);
    }
  });

  it('determinate active ↔ track space grows from 0 (flat: p + min(p, gap + stroke); wavy: min(head − cap, 4))', () => {
    expect(determinateTrackSpace('flat', 4, 2)).toBe(-2); // overlaps the dot until the head passes a stroke
    expect(determinateTrackSpace('flat', 4, 6)).toBe(2);
    expect(determinateTrackSpace('flat', 4, 41.6)).toBe(4);
    expect(determinateTrackSpace('flat', 8, 12)).toBe(4);
    expect(determinateTrackSpace('wavy', 4, 2)).toBe(0);
    expect(determinateTrackSpace('wavy', 4, 4.5)).toBe(2.5);
    expect(determinateTrackSpace('wavy', 8, 30)).toBe(4);
  });

  it('stop dot: flat stays put whatever the progress; wavy shrinks from its start as the active reaches it', () => {
    const at = (shape: 'flat' | 'wavy', head: number) =>
      linearShapes({
        width: 404,
        thickness: 4,
        shape,
        actives: [[2, head]],
        stop: true,
        stopShrink: shape === 'wavy',
        wavelength: 40,
        waveOrigin: 2,
        amp: 0,
        snap: false,
        gap: 4,
      }).stop;
    expect(at('flat', 399)).toEqual({ x: 400, size: 4 });
    expect(at('flat', 402)).toBeNull(); // a full active covers it
    expect(at('wavy', 396)).toEqual({ x: 400, size: 4 });
    expect(at('wavy', 399)).toEqual({ x: 401, size: 3 });
    expect(at('wavy', 402)).toBeNull();
  });

  it('circular gaps open from 0 and are fully open at the kit samples (≥ 10%)', () => {
    for (const shape of ['flat', 'wavy'] as const) {
      for (const t of [4, 8] as const) {
        const k = CIRCULAR[shape][t];
        expect(gapOpening(shape, t, 0)).toBe(0);
        expect(gapOpening(shape, t, k.ends[1] - k.start)).toBe(1);
        // At 0.1% both gaps are under 2° (the kit's open gaps are 22.5–40°).
        const f = circularFrame(shape, t, 0.001)!;
        expect(f.trackStart - f.end).toBeGreaterThan(0);
        expect(f.trackStart - f.end).toBeLessThan(2);
        expect(f.start + 360 - f.trackEnd).toBeLessThan(2);
        const ten = circularFrame(shape, t, 0.1)!;
        expect([ten.end, ten.trackStart, ten.trackEnd]).toEqual([k.ends[1], k.tracks[1], k.trackEnd]);
      }
    }
  });

  it('wave amplitude 0 lies on the crest circle (the track ring)', () => {
    const d = blendedStarPath(10, 100, 0, 24, 0);
    const pts = [...d.matchAll(/[ML]([\d.-]+) ([\d.-]+)/g)].map((m) => Math.hypot(+m[1]! - 24, +m[2]! - 24));
    expect(pts.length).toBe(91);
    for (const r of pts) expect(r).toBeCloseTo(STAR_CREST, 2);
  });
});
