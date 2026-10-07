import { describe, expect, test } from 'vitest';
import { MAX_TICKS, sortRange, thumbValueText, tickSteps } from './values.ts';

describe('tickSteps', () => {
  test('one tick per step, both ends included', () => {
    expect(tickSteps(0, 100, 10)).toBe(10);
    expect(tickSteps(0, 1, 0.1)).toBe(10);
  });
  test('capped: above MAX_TICKS steps nothing is drawn', () => {
    expect(tickSteps(0, MAX_TICKS, 1)).toBe(MAX_TICKS);
    expect(tickSteps(0, MAX_TICKS + 1, 1)).toBeNull();
    expect(tickSteps(0, 100, 0.01)).toBeNull();
  });
  test('no step or an empty range: no ticks', () => {
    expect(tickSteps(0, 100, 0)).toBeNull();
    expect(tickSteps(0, 100, -5)).toBeNull();
    expect(tickSteps(50, 50, 1)).toBeNull();
    expect(tickSteps(0, 100, 1000)).toBeNull();
  });
});

describe('sortRange', () => {
  test('keeps an ordered range, swaps a reversed one', () => {
    expect(sortRange([20, 80])).toEqual([20, 80]);
    expect(sortRange([80, 20])).toEqual([20, 80]);
    expect(sortRange([40, 40])).toEqual([40, 40]);
  });
});

describe('thumbValueText', () => {
  test('a text value label becomes the value text', () => {
    expect(thumbValueText('$20', '20', 0, false)).toBe('$20');
    expect(thumbValueText(7, '20', 0, false)).toBe('7');
  });
  test('range thumbs name their end, as Base UI does', () => {
    expect(thumbValueText('$20', '20', 0, true)).toBe('$20 start range');
    expect(thumbValueText('$80', '80', 1, true)).toBe('$80 end range');
  });
  test('non-text labels fall back to the formatted value', () => {
    expect(thumbValueText({ type: 'span' }, '1,000', 0, false)).toBe('1,000');
    expect(thumbValueText(null, '1,000', 1, true)).toBe('1,000 end range');
  });
});
