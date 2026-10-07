import { describe, expect, test } from 'vitest';
import { fastOutSlowIn, VelocityTracker1D } from './gesture.ts';

describe('VelocityTracker1D (Compose Lsq2)', () => {
  test('constant speed', () => {
    const t = new VelocityTracker1D();
    for (let i = 0; i < 6; i++) t.add(1000 + i * 10, i * 10);
    expect(t.velocity()).toBeCloseTo(1000, 3);
  });
  test('a decelerating drag: slope of the quadratic at the newest sample', () => {
    const t = new VelocityTracker1D();
    for (const [ms, x] of [[0, 92], [4, 100], [8, 110], [23.7, 120], [41.4, 130]] as const) t.add(10125 + ms, x);
    // numpy.polyfit(t − 41.4, x, 2) → slope 0.042638 px/ms.
    expect(t.velocity()).toBeCloseTo(42.638, 2);
  });
  test('samples older than 100ms or after a 40ms pause are ignored', () => {
    const t = new VelocityTracker1D();
    t.add(0, 0);
    t.add(10, 50);
    t.add(60, 50);
    t.add(70, 60);
    expect(t.velocity()).toBeCloseTo(1000, 3);
  });
  test('needs two samples', () => {
    const t = new VelocityTracker1D();
    t.add(0, 0);
    expect(t.velocity()).toBe(0);
  });
});

test('fastOutSlowIn matches cubic-bezier(0.4, 0, 0.2, 1)', () => {
  expect(fastOutSlowIn(0)).toBe(0);
  expect(fastOutSlowIn(1)).toBe(1);
  expect(fastOutSlowIn(0.5)).toBeCloseTo(0.7752, 3);
});
