import { describe, expect, test } from 'vitest';
import { rovingIndex, rovingMove } from './roving.ts';

describe('rovingMove (WAI-ARIA toolbar keys)', () => {
  test('horizontal: right is next, left is previous; RTL mirrors them', () => {
    expect(rovingMove('ArrowRight', false, false)).toBe('next');
    expect(rovingMove('ArrowLeft', false, false)).toBe('prev');
    expect(rovingMove('ArrowRight', false, true)).toBe('prev');
    expect(rovingMove('ArrowLeft', false, true)).toBe('next');
    expect(rovingMove('ArrowDown', false, false)).toBeNull();
  });
  test('vertical: down / up whatever the direction; horizontal arrows do nothing', () => {
    for (const rtl of [false, true]) {
      expect(rovingMove('ArrowDown', true, rtl)).toBe('next');
      expect(rovingMove('ArrowUp', true, rtl)).toBe('prev');
      expect(rovingMove('ArrowRight', true, rtl)).toBeNull();
    }
  });
  test('Home / End jump; other keys are ignored', () => {
    expect(rovingMove('Home', false, true)).toBe('first');
    expect(rovingMove('End', true, false)).toBe('last');
    expect(rovingMove('a', false, false)).toBeNull();
    expect(rovingMove('Tab', false, false)).toBeNull();
  });
});

describe('rovingIndex', () => {
  test('arrows wrap around, Home / End go to the ends', () => {
    expect(rovingIndex('next', 0, 3)).toBe(1);
    expect(rovingIndex('next', 2, 3)).toBe(0);
    expect(rovingIndex('prev', 0, 3)).toBe(2);
    expect(rovingIndex('first', 2, 3)).toBe(0);
    expect(rovingIndex('last', 0, 3)).toBe(2);
    expect(rovingIndex('next', 0, 1)).toBe(0);
  });
});
