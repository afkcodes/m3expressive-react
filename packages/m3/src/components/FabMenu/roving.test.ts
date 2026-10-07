import { describe, expect, test } from 'vitest';
import { rovingIndex } from './roving.ts';

describe('rovingIndex', () => {
  test('arrows move and wrap', () => {
    expect(rovingIndex('ArrowDown', 0, 3)).toBe(1);
    expect(rovingIndex('ArrowDown', 2, 3)).toBe(0);
    expect(rovingIndex('ArrowUp', 1, 3)).toBe(0);
    expect(rovingIndex('ArrowUp', 0, 3)).toBe(2);
  });
  test('from the toggle: Up enters at the last item, Down at the first', () => {
    expect(rovingIndex('ArrowUp', -1, 3)).toBe(2);
    expect(rovingIndex('ArrowDown', -1, 3)).toBe(0);
  });
  test('Home / End', () => {
    expect(rovingIndex('Home', 2, 3)).toBe(0);
    expect(rovingIndex('End', 0, 3)).toBe(2);
  });
  test('unhandled keys and empty menus', () => {
    expect(rovingIndex('Tab', 0, 3)).toBeNull();
    expect(rovingIndex('ArrowDown', -1, 0)).toBeNull();
  });
});
