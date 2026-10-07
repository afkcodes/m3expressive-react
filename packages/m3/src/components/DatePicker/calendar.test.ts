import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  addDays,
  dayForKey,
  defaultFormatter,
  inputFormatHint,
  makeDate,
  parseInputDate,
  weekEnd,
  weekStart,
} from './calendar.ts';

const ymd = (d: Date | null) => (d ? `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}` : null);

describe('parseInputDate', () => {
  it('reads the locale order: en-US month / day / year, en-GB day / month / year', () => {
    expect(ymd(parseInputDate('1/5/2025', 'en-US'))).toBe('2025-1-5');
    expect(ymd(parseInputDate('01/05/2025', 'en-US'))).toBe('2025-1-5');
    expect(ymd(parseInputDate('1/5/2025', 'en-GB'))).toBe('2025-5-1');
    expect(ymd(parseInputDate('24.12.2025', 'de-DE'))).toBe('2025-12-24');
  });

  it('needs the full four-digit year (partial typing is not a date)', () => {
    const partial = ['1/5/2', '1/5/20', '1/5/202', '1/5/25', '1/5/20250'];
    expect(partial.map((t) => parseInputDate(t, 'en-US'))).toEqual(partial.map(() => null));
  });

  it('keeps years below 100 (no 19xx remapping) and honours the year range', () => {
    expect(parseInputDate('1/5/0099', 'en-US')!.getFullYear()).toBe(99);
    expect(parseInputDate('1/5/0099', 'en-US', [1900, 2100])).toBeNull();
    expect(parseInputDate('1/5/2101', 'en-US', [1900, 2100])).toBeNull();
    expect(ymd(parseInputDate('1/5/2100', 'en-US', [1900, 2100]))).toBe('2100-1-5');
  });

  it('rejects impossible dates, extra parts and over-long month / day fields', () => {
    const bad = ['2/30/2025', '13/1/2025', '0/1/2025', '1/5/2025/1', '001/5/2025', '1/005/2025', '', 'abc'];
    expect(bad.map((t) => parseInputDate(t, 'en-US'))).toEqual(bad.map(() => null));
    expect(ymd(parseInputDate('2/29/2024', 'en-US'))).toBe('2024-2-29');
  });

  it('returns local midnight', () => {
    const d = parseInputDate('7/9/2025', 'en-US')!;
    expect([d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds()]).toEqual([0, 0, 0, 0]);
  });
});

describe('inputFormatHint', () => {
  it('follows the locale order and separators', () => {
    expect(inputFormatHint('en-US')).toBe('mm/dd/yyyy');
    expect(inputFormatHint('en-US', true)).toBe('MM/DD/YYYY');
    expect(inputFormatHint('en-GB')).toBe('dd/mm/yyyy');
    expect(inputFormatHint('de-DE')).toBe('dd.mm.yyyy');
  });
});

describe('defaultFormatter', () => {
  it('is cached per locale', () => {
    expect(defaultFormatter('en-US')).toBe(defaultFormatter('en-US'));
    expect(defaultFormatter('en-GB')).not.toBe(defaultFormatter('en-US'));
    expect(defaultFormatter('en-US').input(makeDate(2025, 6, 9))).toBe('7/9/2025');
    expect(defaultFormatter('en-GB').input(makeDate(2025, 6, 9))).toBe('09/07/2025');
  });
});

describe('calendar keys across a DST change (Europe/London)', () => {
  const tz = process.env.TZ;
  beforeAll(() => {
    process.env.TZ = 'Europe/London';
  });
  afterAll(() => {
    // process.env stringifies: an unset TZ must be removed again, not set to "undefined".
    if (tz === undefined) delete process.env.TZ;
    else process.env.TZ = tz;
  });

  it('runs in a zone with DST (2025-03-30 is 23 hours long)', () => {
    expect(makeDate(2025, 2, 31).getTime() - makeDate(2025, 2, 30).getTime()).toBe(23 * 3600000);
  });

  it('Home / End land on the week edges at midnight (not ± n × 24h)', () => {
    // Wed 2 April 2025 (BST); its week (Sunday first) starts Sun 30 March (the change day).
    const wed = makeDate(2025, 3, 2);
    expect(ymd(dayForKey(wed, 'Home'))).toBe('2025-3-30');
    expect(dayForKey(wed, 'Home')!.getHours()).toBe(0);
    // Wed 26 March (GMT): End is Sat 29 March; Monday-first, End is Sun 30 March.
    const wed26 = makeDate(2025, 2, 26);
    expect(ymd(dayForKey(wed26, 'End'))).toBe('2025-3-29');
    expect(ymd(dayForKey(wed26, 'End', 1))).toBe('2025-3-30');
    // Autumn: Sun 26 October 2025 is 25 hours long.
    expect(ymd(dayForKey(makeDate(2025, 9, 29), 'Home'))).toBe('2025-10-26');
    expect(ymd(dayForKey(makeDate(2025, 9, 23), 'End', 1))).toBe('2025-10-26');
    expect(ymd(weekStart(makeDate(2025, 9, 27), 1))).toBe('2025-10-27');
    expect(ymd(weekEnd(makeDate(2025, 9, 26), 1))).toBe('2025-10-26');
  });

  it('arrows step whole days and weeks', () => {
    expect(ymd(dayForKey(makeDate(2025, 2, 29), 'ArrowRight'))).toBe('2025-3-30');
    expect(ymd(dayForKey(makeDate(2025, 2, 30), 'ArrowRight'))).toBe('2025-3-31');
    expect(ymd(dayForKey(makeDate(2025, 2, 27), 'ArrowDown'))).toBe('2025-4-3');
    expect(ymd(addDays(makeDate(2025, 9, 27), -1))).toBe('2025-10-26');
  });
});

describe('dayForKey', () => {
  const wed = () => makeDate(2025, 6, 16); // Wed 16 July 2025

  it('moves by day, week, week edge and month', () => {
    const base = wed();
    expect(ymd(dayForKey(base, 'ArrowLeft'))).toBe('2025-7-15');
    expect(ymd(dayForKey(base, 'ArrowUp'))).toBe('2025-7-9');
    expect(ymd(dayForKey(base, 'Home'))).toBe('2025-7-13');
    expect(ymd(dayForKey(base, 'End'))).toBe('2025-7-19');
    expect(ymd(dayForKey(base, 'Home', 1))).toBe('2025-7-14');
    expect(ymd(dayForKey(base, 'End', 1))).toBe('2025-7-20');
    expect(ymd(dayForKey(base, 'PageUp'))).toBe('2025-6-16');
    expect(ymd(dayForKey(base, 'PageDown'))).toBe('2025-8-16');
    expect(dayForKey(base, 'Enter')).toBeNull();
  });

  it('PageUp / PageDown clamp to the target month length', () => {
    expect(ymd(dayForKey(makeDate(2025, 0, 31), 'PageDown'))).toBe('2025-2-28');
    expect(ymd(dayForKey(makeDate(2024, 2, 31), 'PageUp'))).toBe('2024-2-29');
    expect(ymd(dayForKey(makeDate(2025, 2, 31), 'PageDown'))).toBe('2025-4-30');
    expect(ymd(dayForKey(makeDate(2025, 11, 15), 'PageDown'))).toBe('2026-1-15');
  });

  it('skips disabled days in the direction of travel and never returns one', () => {
    const base = wed();
    const weekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;
    expect(ymd(dayForKey(makeDate(2025, 6, 18), 'ArrowRight', 0, weekend))).toBe('2025-7-21');
    expect(ymd(dayForKey(makeDate(2025, 6, 21), 'ArrowLeft', 0, weekend))).toBe('2025-7-18');
    expect(ymd(dayForKey(base, 'ArrowUp', 0, (d) => d.getDate() === 9))).toBe('2025-7-2');
    // A week step from a Saturday only meets Saturdays: no move.
    expect(dayForKey(makeDate(2025, 6, 19), 'ArrowUp', 0, weekend)).toBeNull();
    // Home / End stop at the first / last enabled day of the week.
    expect(ymd(dayForKey(base, 'Home', 0, weekend))).toBe('2025-7-14');
    expect(ymd(dayForKey(base, 'End', 0, weekend))).toBe('2025-7-18');
    // PageDown onto a Saturday moves on to Monday.
    expect(ymd(dayForKey(makeDate(2025, 6, 16), 'PageDown', 0, weekend))).toBe('2025-8-18');
    // Nothing enabled: no move.
    expect(dayForKey(base, 'ArrowRight', 0, () => true)).toBeNull();
    // Home with every earlier day of the week disabled stays put.
    expect(ymd(dayForKey(base, 'Home', 0, (d) => d < base))).toBe('2025-7-16');
  });
});
