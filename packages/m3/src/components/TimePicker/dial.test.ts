import { describe, expect, it } from 'vitest';
import { handEnd, handFor, restsOn } from './dial.ts';

describe('clock face hand', () => {
  it('rests on the kit cell of its value; in motion it rides the circle', () => {
    const three = handFor('hour', 3, false);
    expect(three).toEqual({ inner: false, slot: 3, target: 90 });
    expect(handEnd(90, three)).toEqual([230, 128]); // kit cell [206, 104] + 24
    expect(handEnd(45, three)[0]).toBeCloseTo(128 + 101 * Math.sin(Math.PI / 4), 9);
    expect(restsOn(90.049, three)).toBe(true);
    expect(restsOn(90.051, three)).toBe(false);
  });

  it('24-hour hours 13–23 and 0 use the inner ring; minutes off the 5s never rest on a cell', () => {
    expect(handFor('hour', 0, true).inner).toBe(true);
    expect(handFor('hour', 12, true).inner).toBe(false);
    expect(handEnd(30, handFor('hour', 13, true))).toEqual([165, 64]); // inner cell [141, 40] + 24
    const seven = handFor('minute', 7, false);
    expect(seven.target).toBeCloseTo(42, 9);
    expect(restsOn(seven.target, seven)).toBe(false);
  });
});
