import { expect, test } from 'vitest';
import { railItemGeometry, railItemSpacing } from './railMorph.ts';

const m = { topWidth: 30.5, topHeight: 16, startWidth: 33, startHeight: 20 };

test('p = 0 is the kit collapsed item (64px: 56×32 pill at 20,6, icon 36,10, label centred at y 42)', () => {
  const g = railItemGeometry(0, false, m);
  expect([g.width, g.height]).toEqual([96, 64]);
  expect(g.indicator).toEqual({ x: 20, y: 6, width: 56, height: 32 });
  expect(g.icon).toEqual({ x: 36, y: 10 });
  expect(g.label).toEqual({ x: (96 - 30.5) / 2, y: 42, alpha: 1, style: 'top' });
  expect(railItemSpacing(0)).toBe(4);
});

test('p = 1 is the kit expanded item (56px pill from x 20, icon 36,16, label 68,18)', () => {
  const g = railItemGeometry(1, true, m);
  expect([g.width, g.height]).toEqual([20 + 64 + 33, 56]);
  expect(g.indicator).toEqual({ x: 20, y: 0, width: 64 + 33, height: 56 });
  expect(g.icon).toEqual({ x: 36, y: 16 });
  expect(g.label).toEqual({ x: 68, y: 18, alpha: 1, style: 'start' });
  expect(railItemSpacing(1)).toBe(0);
});

test('halfway the label is invisible and switches layout (Compose placeAnimatedLabelAndIcon)', () => {
  expect(railItemGeometry(0.49, true, m).label.alpha).toBeCloseTo(0.0004, 4);
  expect(railItemGeometry(0.5, true, m).label.x).toBeCloseTo((68 - 10) * 0.5);
  expect(railItemGeometry(0.5, false, m).label.x).toBeCloseTo(68 * 0.5);
  // Collapsing keeps the expanded style until under halfway.
  expect(railItemGeometry(0.6, false, m).label.style).toBe('start');
  expect(railItemGeometry(0.4, false, m).label.style).toBe('top');
  expect(railItemGeometry(0.4, true, m).label.style).toBe('start');
});
