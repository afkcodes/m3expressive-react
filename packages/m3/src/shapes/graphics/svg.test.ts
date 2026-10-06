import { describe, expect, it } from 'vitest';
import { CornerRounding } from './cornerRounding.ts';
import { Cubic } from './cubic.ts';
import { Morph } from './morph.ts';
import { circle, rectangle, star } from './shapes.ts';
import { morphToSvgPath, toSvgPath } from './svg.ts';

describe('toSvgPath', () => {
  it('emits an absolute M … C … Z path, one C per cubic', () => {
    expect(toSvgPath(rectangle().cubics)).toBe(
      'M1 1C0.3333 1 -0.3333 1 -1 1C-1 0.3333 -1 -0.3333 -1 -1C-0.3333 -1 0.3333 -1 1 -1C1 -0.3333 1 0.3333 1 1Z',
    );
  });

  it('applies scale, then offset', () => {
    expect(toSvgPath(rectangle().cubics, 10, 5, 7)).toBe(
      'M15 17C8.3333 17 1.6667 17 -5 17C-5 10.3333 -5 3.6667 -5 -3C1.6667 -3 8.3333 -3 15 -3C15 3.6667 15 10.3333 15 17Z',
    );
  });

  it('rounds to fractionDigits and never prints -0', () => {
    expect(toSvgPath([new Cubic(-0.00001, 0.123456, 0, 0, 1, 1, 1.5, 2)], 1, 0, 0, 2)).toBe('M0 0.12C0 0 1 1 1.5 2Z');
  });

  it('returns an empty string for no cubics', () => {
    expect(toSvgPath([])).toBe('');
  });
});

describe('morphToSvgPath', () => {
  const morph = new Morph(circle(), star(5, { rounding: new CornerRounding(0.1) }));

  it('matches toSvgPath(morph.asCubics(progress))', () => {
    for (const progress of [0, 0.37, 1]) {
      expect(morphToSvgPath(morph, progress, 24, 1, 2)).toBe(toSvgPath(morph.asCubics(progress), 24, 1, 2));
    }
  });
});
