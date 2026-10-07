import { expect, test } from 'vitest';
import { clamp, lerpF } from './keylineMath.ts';

test('lerpF is Compose util lerp: exact at 0 and 1, linear between, extrapolates outside', () => {
  expect(lerpF(10, 20, 0)).toBe(10);
  expect(lerpF(10, 20, 1)).toBe(20);
  expect(lerpF(10, 20, 0.25)).toBe(12.5);
  expect(lerpF(20, 10, 0.25)).toBe(17.5);
  expect(lerpF(10, 20, 1.5)).toBe(25);
  expect(lerpF(10, 20, -0.5)).toBe(5);
});

test('clamp is coerceIn: the value inside the range, else the nearer bound', () => {
  // Multi-browse / hero small size: (large / 3).coerceIn(40, 56).
  expect(clamp(186 / 3, 40, 56)).toBe(56);
  expect(clamp(120 / 3, 40, 56)).toBe(40);
  expect(clamp(48, 40, 56)).toBe(48);
  expect(clamp(-10 / 3, 40, 56)).toBe(40);
});
