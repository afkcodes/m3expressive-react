import { describe, expect, test } from 'vitest';
import { swipeKey } from './swipeKeys.ts';

const item = { kind: 'item' } as const;
const action = (index: number) => ({ kind: 'action', index }) as const;

describe('swipeKey: item focused', () => {
  test('ArrowLeft reveals and enters the actions', () => {
    expect(swipeKey('ArrowLeft', item, 'closed', 3)).toEqual({ reveal: true, focus: 0 });
    expect(swipeKey('ArrowLeft', item, 'peek', 3)).toEqual({ reveal: true, focus: 0 });
    expect(swipeKey('ArrowLeft', item, 'revealed', 3)).toEqual({ focus: 0 });
  });
  test('ArrowRight / Escape hide an open reveal, and are ignored when closed', () => {
    expect(swipeKey('Escape', item, 'action', 3)).toEqual({ close: true });
    expect(swipeKey('ArrowRight', item, 'revealed', 3)).toEqual({ close: true });
    expect(swipeKey('Escape', item, 'revealed', 3)).toEqual({ close: true });
    expect(swipeKey('ArrowRight', item, 'closed', 3)).toBeNull();
    expect(swipeKey('Escape', item, 'closed', 3)).toBeNull();
  });
  test('other keys and items without actions pass through', () => {
    expect(swipeKey('Enter', item, 'closed', 3)).toBeNull();
    expect(swipeKey('ArrowLeft', item, 'closed', 0)).toBeNull();
  });
});

describe('swipeKey: action focused', () => {
  test('arrows move between actions without wrapping', () => {
    expect(swipeKey('ArrowLeft', action(1), 'revealed', 3)).toEqual({ focus: 0 });
    expect(swipeKey('ArrowRight', action(1), 'revealed', 3)).toEqual({ focus: 2 });
    expect(swipeKey('ArrowLeft', action(0), 'revealed', 3)).toBeNull();
    expect(swipeKey('ArrowRight', action(2), 'revealed', 3)).toBeNull();
  });
  test('Home / End jump to the ends', () => {
    expect(swipeKey('Home', action(2), 'revealed', 3)).toEqual({ focus: 0 });
    expect(swipeKey('End', action(0), 'revealed', 3)).toEqual({ focus: 2 });
  });
  test('Escape hides the actions and returns to the item', () => {
    expect(swipeKey('Escape', action(1), 'revealed', 3)).toEqual({ close: true, focus: 'item' });
  });
});
