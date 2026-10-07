import { describe, expect, it } from 'vitest';
import { dialValue, dialValueText, normalizeTime } from './time.ts';

describe('normalizeTime', () => {
  it('keeps a valid time (same object)', () => {
    const t = { hour: 19, minute: 5 };
    expect(normalizeTime(t)).toBe(t);
  });

  it('clamps out-of-range values, rounds fractions and maps NaN to 0', () => {
    expect(normalizeTime({ hour: 24, minute: 60 })).toEqual({ hour: 23, minute: 59 });
    expect(normalizeTime({ hour: -1, minute: -5 })).toEqual({ hour: 0, minute: 0 });
    expect(normalizeTime({ hour: 7.6, minute: 29.4 })).toEqual({ hour: 8, minute: 29 });
    expect(normalizeTime({ hour: Number.NaN, minute: Number.POSITIVE_INFINITY })).toEqual({ hour: 0, minute: 0 });
  });
});

describe('dialValue', () => {
  it('minutes 0–59', () => {
    expect([dialValue('minute', 60), dialValue('minute', -1), dialValue('minute', 30)]).toEqual([59, 0, 30]);
  });

  it('24-hour hours 0–23', () => {
    expect([dialValue('hour', 24, true), dialValue('hour', 0, true), dialValue('hour', 20, true)]).toEqual([23, 0, 20]);
  });

  it('12-hour hours 1–12 (0–23 map onto the dial)', () => {
    expect([0, 12, 13, 23, 7, -3, 99, Number.NaN].map((h) => dialValue('hour', h))).toEqual([
      12, 12, 1, 11, 7, 12, 11, 12,
    ]);
  });
});

describe('dialValueText', () => {
  it("reads like Compose's suffix strings", () => {
    expect(dialValueText('hour', 7)).toBe("7 o'clock");
    expect(dialValueText('hour', 20, true)).toBe('20 hours');
    expect(dialValueText('minute', 30)).toBe('30 minutes');
  });
});
