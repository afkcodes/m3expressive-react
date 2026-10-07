import { describe, expect, test } from 'vitest';
import { swipeLayout, swipeMode, swipeOffset, swipeTarget } from './swipeGeometry.ts';

describe('swipe geometry (kit "Reveal element")', () => {
  test('settled offsets: pills, 48px buttons (52 alone), the 120px swipe action; 2px gaps', () => {
    expect(swipeOffset(3, 'closed')).toBe(0);
    expect(swipeOffset(3, 'peek')).toBe(3 * 8 + 2 * 2 + 2);
    expect(swipeOffset(3, 'revealed')).toBe(3 * 48 + 2 * 2 + 2);
    expect(swipeOffset(1, 'revealed')).toBe(52 + 2);
    expect(swipeOffset(3, 'action')).toBe(120 + 2 * (8 + 2) + 2);
  });

  test('widths follow the offset: even buttons while dragging, the primary grows in action mode', () => {
    expect(swipeLayout(3, 0, 'drag')).toEqual([0, 0, 0]);
    expect(swipeLayout(3, 150, 'drag')).toEqual([48, 48, 48]);
    expect(swipeLayout(3, 400, 'drag')).toEqual([48, 48, 48]);
    expect(swipeLayout(3, 142, 'action')).toEqual([8, 8, 120]);
    expect(swipeLayout(0, 100, 'drag')).toEqual([]);
  });

  test('a full swipe engages 24px past the revealed width', () => {
    expect(swipeMode(3, 150 + 24)).toBe('drag');
    expect(swipeMode(3, 150 + 25)).toBe('action');
  });
});

describe('swipeTarget (AnchoredDraggable computeTarget over closed / revealed)', () => {
  test('at rest: the closest anchor; a tie picks the later one', () => {
    expect(swipeTarget(3, 70, 0, 'drag')).toBe('closed');
    expect(swipeTarget(3, 75, 0, 'drag')).toBe('revealed');
    expect(swipeTarget(3, 80, 0, 'drag')).toBe('revealed');
  });

  test('a fling (≥ 125dp/s) goes to the next anchor in its direction', () => {
    expect(swipeTarget(3, 10, 125, 'drag')).toBe('revealed');
    expect(swipeTarget(3, 140, -200, 'drag')).toBe('closed');
  });

  test('slower releases move on once 56dp past the anchor they left', () => {
    expect(swipeTarget(3, 60, 50, 'drag')).toBe('revealed');
    expect(swipeTarget(3, 50, 50, 'drag')).toBe('closed');
    expect(swipeTarget(3, 90, -50, 'drag')).toBe('closed');
    expect(swipeTarget(3, 100, -50, 'drag')).toBe('revealed');
  });

  test('a full swipe runs unless flung back', () => {
    expect(swipeTarget(3, 180, 0, 'action')).toBe('action');
    expect(swipeTarget(3, 180, -125, 'action')).toBe('revealed');
    expect(swipeTarget(0, 180, 0, 'drag')).toBe('closed');
  });
});
