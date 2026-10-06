// Ported from AndroidX graphics-shapes CornerRoundingTest.kt (Apache License 2.0).
import { describe, expect, it } from 'vitest';
import { CornerRounding } from './cornerRounding.ts';

describe('CornerRoundingTest', () => {
  it('cornerRoundingTest', () => {
    const defaultCorner = new CornerRounding();
    expect(defaultCorner.radius).toBe(0);
    expect(defaultCorner.smoothing).toBe(0);

    const unrounded = CornerRounding.Unrounded;
    expect(unrounded.radius).toBe(0);
    expect(unrounded.smoothing).toBe(0);

    const rounded = new CornerRounding(5);
    expect(rounded.radius).toBe(5);
    expect(rounded.smoothing).toBe(0);

    const smoothed = new CornerRounding(undefined, 0.5);
    expect(smoothed.radius).toBe(0);
    expect(smoothed.smoothing).toBe(0.5);

    const roundedAndSmoothed = new CornerRounding(5, 0.5);
    expect(roundedAndSmoothed.radius).toBe(5);
    expect(roundedAndSmoothed.smoothing).toBe(0.5);
  });
});
