import { describe, expect, it } from 'vitest';
import { computeSettleDuration, quinticOut, shouldHideOnRelease } from './sideSheetDrag.ts';

/*
 * The modal side sheet's release, against the Android sources it ports: ViewDragHelper
 * (computeSettleDuration / computeAxisDuration, sInterpolator) and Material Components
 * SideSheetBehavior.calculateTargetStateOnViewReleased with the Right / LeftSheetDelegate.
 * Expected values are hand-computed from those formulas.
 */

describe('quinticOut (ViewDragHelper sInterpolator: t⁵ + 1 for t − 1)', () => {
  it('runs 0 → 1 and decelerates', () => {
    expect([quinticOut(0), quinticOut(1)]).toEqual([0, 1]);
    expect(quinticOut(0.5)).toBe(1 - 0.5 ** 5);
    expect(quinticOut(0.2)).toBeCloseTo(1 - 0.8 ** 5, 12);
    expect(quinticOut(0.2)).toBeGreaterThan(0.2 * 3);
  });
});

describe('computeSettleDuration (ViewDragHelper, horizontal drag)', () => {
  // A 412px wide parent; the sheet's horizontal drag range is 376px (360 + 16 inner margin).
  const PARENT = 412;
  const RANGE = 376;

  it('without a fling: (|dx| / range + 1) × 256ms, at most 600ms', () => {
    expect(computeSettleDuration(200, 0, 0, RANGE, PARENT)).toBe(Math.trunc((200 / RANGE + 1) * 256)); // 392
    expect(computeSettleDuration(RANGE, 0, 0, RANGE, PARENT)).toBe(512);
    expect(computeSettleDuration(1000, 0, 0, RANGE, PARENT)).toBe(600);
    expect(computeSettleDuration(0, 0, 0, RANGE, PARENT)).toBe(0);
  });

  it('a fling: 4 × round(1000 × distance / |v|), the distance eased by sin around half the parent', () => {
    // distance = 206 + 206 · sin((200/412 − 0.5) · 0.15π) = 204.586…; 1000 · 204.586 / 3000 = 68.2.
    expect(computeSettleDuration(200, 3000, 0, RANGE, PARENT)).toBe(4 * 68);
    expect(computeSettleDuration(-200, -3000, 0, RANGE, PARENT)).toBe(4 * 68);
    // Slow flings hit the 600ms cap.
    expect(computeSettleDuration(200, 1000, 0, RANGE, PARENT)).toBe(600);
  });

  it('velocities are clamped to 50 … 8000 px/s first (below the minimum counts as no fling)', () => {
    expect(computeSettleDuration(200, 30, 0, RANGE, PARENT)).toBe(computeSettleDuration(200, 0, 0, RANGE, PARENT));
    // 8000 px/s: 1000 · 204.586 / 8000 = 25.6 → 26.
    expect(computeSettleDuration(200, 20000, 0, RANGE, PARENT)).toBe(4 * 26);
  });

  it('a vertical velocity component takes its share of the weight', () => {
    // xweight = |xvel| / (|xvel| + |yvel|) = 0.75; the vertical axis has no range.
    expect(computeSettleDuration(200, 3000, 1000, RANGE, PARENT)).toBe(Math.trunc(272 * 0.75));
    expect(computeSettleDuration(200, 3000, -1000, RANGE, PARENT)).toBe(204);
  });
});

describe('shouldHideOnRelease (SideSheetBehavior.calculateTargetStateOnViewReleased)', () => {
  // A 256px sheet with a 16px inner margin in a 400px parent.
  const right = { right: true, parentWidth: 400, childWidth: 256, innerMargin: 16 };
  const left = { right: false, parentWidth: 400, childWidth: 256, innerMargin: 16 };

  it('right sheet: expanded at x 128, hidden at 400; released past the midpoint (264) it hides', () => {
    expect(shouldHideOnRelease(right, 136, 0, 0)).toBe(false); // left edge 264: not past it
    expect(shouldHideOnRelease(right, 137, 0, 0)).toBe(true);
    expect(shouldHideOnRelease(right, 10, 0, 0)).toBe(false);
  });

  it('right sheet: a significant (> 500px/s), mostly horizontal swipe outwards hides it from anywhere', () => {
    expect(shouldHideOnRelease(right, 10, 600, 0)).toBe(true);
    expect(shouldHideOnRelease(right, 10, 400, 0)).toBe(false);
    // Not mostly horizontal: the midpoint decides.
    expect(shouldHideOnRelease(right, 10, 600, 700)).toBe(false);
    expect(shouldHideOnRelease(right, 200, 600, 700)).toBe(true);
  });

  it('right sheet: any swipe back inwards (vx < 0) keeps it open', () => {
    expect(shouldHideOnRelease(right, 250, -1, 0)).toBe(false);
    expect(shouldHideOnRelease(right, 250, -3000, 0)).toBe(false);
  });

  it('left sheet: expanded at x 16, hidden at −272; its right edge past 144 back hides it', () => {
    // left = 16 − inward; hides when left + 256 < (16 + 272) / 2 = 144, i.e. inward > 128.
    expect(shouldHideOnRelease(left, 128, 0, 0)).toBe(false);
    expect(shouldHideOnRelease(left, 129, 0, 0)).toBe(true);
    expect(shouldHideOnRelease(left, 10, -600, 0)).toBe(true);
    expect(shouldHideOnRelease(left, 10, -400, 0)).toBe(false);
    expect(shouldHideOnRelease(left, 200, 1, 0)).toBe(false);
  });

  it('released at rest on its expanded edge it stays; a slow swipe outwards there hides it (MDC last branch)', () => {
    // left = 0: |0 + vx · 0.1| ≤ 0.5 skips the hide check; at rest the nearer anchor wins (expanded
    // 16 vs hidden −272), a horizontal velocity falls through to STATE_HIDDEN.
    expect(shouldHideOnRelease(left, 16, 0, 0)).toBe(false);
    expect(shouldHideOnRelease(left, 16, -3, 0)).toBe(true);
    expect(shouldHideOnRelease(left, 16, -3, 5)).toBe(false);
  });

  it('a sheet wider than the parent expands at 0 (expanded offset never negative)', () => {
    const wide = { right: true, parentWidth: 300, childWidth: 320, innerMargin: 16 };
    // Expanded 0, hidden 300: the midpoint is 150.
    expect(shouldHideOnRelease(wide, 150, 0, 0)).toBe(false);
    expect(shouldHideOnRelease(wide, 151, 0, 0)).toBe(true);
  });
});
