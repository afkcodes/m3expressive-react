import { describe, expect, it } from 'vitest';
import { findLowestCostArrangement, itemCountOf } from './arrangement.ts';

/*
 * Expectations ported from Compose material3 carousel ArrangementTest.kt (androidHostTest). Compose
 * works in Float and asserts exact equality; the port works in doubles, where the medium-flex
 * redistribution can leave the large size an ulp off, so sizes compare to 9 decimals.
 */

/** One count each, small sizes clamped to 40…56 as CarouselDefaults does. */
function arrange(
  availableSpace: number,
  target: { small: number; medium: number; large: number },
  counts: { small: number; medium: number; large: number },
) {
  return findLowestCostArrangement(
    availableSpace,
    0,
    target.small,
    40,
    56,
    [counts.small],
    target.medium,
    [counts.medium],
    target.large,
    [counts.large],
  )!;
}

const targets = (small: number) => ({ small, large: small * 3, medium: (small * 3 + small) / 2 });
const ONE_EACH = { small: 1, medium: 1, large: 1 };

describe('Arrangement.fit (Compose ArrangementTest)', () => {
  it('1L 1M 1S: no adjustment when the targets fill the space', () => {
    const t = targets(56);
    const a = arrange(t.large + t.medium + t.small, t, ONE_EACH);
    expect([a.largeSize, a.mediumSize, a.smallSize]).toEqual([t.large, t.medium, t.small]);
  });

  it('1L 1M 1S: shrinks the small item first', () => {
    const t = targets(56);
    const a = arrange(t.large + t.medium + t.small - 10, t, ONE_EACH);
    expect(a.largeSize).toBeCloseTo(t.large, 9);
    expect(Math.round(a.mediumSize)).toBe(Math.round(t.medium));
    expect(a.smallSize).toBe(t.small - 10);
  });

  it('1L 1M 1S: grows the small item first', () => {
    const t = targets(40);
    const a = arrange(t.large + t.medium + t.small + 10, t, ONE_EACH);
    expect(a.largeSize).toBeCloseTo(t.large, 9);
    expect(Math.round(a.mediumSize)).toBe(Math.round(t.medium));
    expect(a.smallSize).toBe(t.small + 10);
  });

  it('1L 1M 1S: shrinks the medium item once the small one is at its minimum', () => {
    const t = targets(40);
    const adjustment = t.medium * 0.05;
    const a = arrange(t.large + t.medium + t.small - adjustment, t, ONE_EACH);
    expect(a.largeSize).toBeCloseTo(t.large, 9);
    expect(Math.round(a.mediumSize)).toBe(Math.round(t.medium - adjustment));
    expect(a.smallSize).toBe(t.small);
  });

  it('1L 1M 1S: grows the medium item once the small one is at its maximum', () => {
    const t = targets(56);
    const adjustment = t.medium * 0.05;
    const a = arrange(t.large + t.medium + t.small + adjustment, t, ONE_EACH);
    expect(a.largeSize).toBeCloseTo(t.large, 9);
    expect(Math.round(a.mediumSize)).toBe(Math.round(t.medium + adjustment));
    expect(a.smallSize).toBe(t.small);
  });

  it('1L 1M 2S: grows / shrinks both small items', () => {
    const grow = targets(40);
    const a = arrange(grow.large + grow.medium + grow.small * 2 + 20, grow, { ...ONE_EACH, small: 2 });
    expect(a.largeSize).toBeCloseTo(grow.large, 9);
    expect(Math.round(a.mediumSize)).toBe(Math.round(grow.medium));
    expect(a.smallSize).toBe(grow.small + 10);

    const shrink = targets(56);
    const b = arrange(shrink.large + shrink.medium + shrink.small * 2 - 20, shrink, { ...ONE_EACH, small: 2 });
    expect(b.largeSize).toBeCloseTo(shrink.large, 9);
    expect(Math.round(b.mediumSize)).toBe(Math.round(shrink.medium));
    expect(b.smallSize).toBe(shrink.small - 10);
  });

  it('2L 2M 2S: the medium items flex by up to 10% to keep the large size', () => {
    const counts = { small: 2, medium: 2, large: 2 };
    const up = targets(56);
    const upAdjustment = up.medium * 0.05;
    const a = arrange((up.large + up.medium + up.small + upAdjustment) * 2, up, counts);
    expect(a.largeSize).toBeCloseTo(up.large, 9);
    expect(Math.round(a.mediumSize)).toBe(Math.round(up.medium + upAdjustment));
    expect(a.smallSize).toBe(up.small);

    const down = targets(40);
    const downAdjustment = down.medium * 0.05;
    const b = arrange((down.large + down.medium + down.small - downAdjustment) * 2, down, counts);
    expect(b.largeSize).toBeCloseTo(down.large, 9);
    expect(Math.round(b.mediumSize)).toBe(Math.round(down.medium - downAdjustment));
    expect(b.smallSize).toBe(down.small);
  });
});

describe('findLowestCostArrangement', () => {
  it('multi-browse 500px / 120px items: three large, one medium, one small (hand-computed)', () => {
    // targetSmall = clamp(120 / 3, 40, 56) = 40, targetMedium = 80; large counts 5, 4, 3.
    // 5L1M1S → large 81.2 (cost 38.8 × p1), 5L0M1S → 92 (28 × p2), 4L1M1S → 99.5 (20.5 × p3),
    // 4L0M1S → 115 (5 × p4), 3L1M1S → small 56, large (500 − 84) / 3.5 + 8/7 = 120 (cost ≈ 0).
    const a = findLowestCostArrangement(500, 0, 40, 40, 56, [1], 80, [1, 0], 120, [5, 4, 3])!;
    expect([a.largeCount, a.mediumCount, a.smallCount]).toEqual([3, 1, 1]);
    expect(a.priority).toBe(5);
    expect(a.largeSize).toBeCloseTo(120, 9);
    expect(a.mediumSize).toBeCloseTo(84, 9);
    expect(a.smallSize).toBe(56);
    expect(a.largeSize * 3 + a.mediumSize + a.smallSize).toBeCloseTo(500, 9);
  });

  it('priority grows large → medium → small, so an earlier candidate wins a tie', () => {
    // 300px of 100px targets, no small / medium: 3 large (p1) is exact and returns at once.
    const a = findLowestCostArrangement(300, 0, 40, 40, 56, [0], 0, [0], 100, [3, 2])!;
    expect([a.priority, a.largeCount, a.largeSize]).toEqual([1, 3, 100]);
    // Spacing is taken off the space first: 3 items, 2 gaps of 6px.
    const spaced = findLowestCostArrangement(312, 6, 40, 40, 56, [0], 0, [0], 100, [3])!;
    expect(spaced.largeSize).toBe(100);
  });

  it('an invalid arrangement (large not above small) never beats a valid one', () => {
    // 2 large in 100px with one 40px small → large 30 < small: invalid (cost MAX); 1 large is valid.
    const a = findLowestCostArrangement(100, 0, 40, 40, 56, [1], 0, [0], 100, [2, 1])!;
    expect(a.largeCount).toBe(1);
    expect(a.largeSize).toBe(60);
    expect(a.largeSize).toBeGreaterThan(a.smallSize);
  });

  it('no small count leaves the small size at 0; itemCountOf sums every count', () => {
    const a = findLowestCostArrangement(200, 0, 40, 40, 56, [0], 0, [0], 100, [2])!;
    expect(a.smallSize).toBe(0);
    expect(itemCountOf(a)).toBe(2);
    expect(itemCountOf({ ...a, smallCount: 2, mediumCount: 1 })).toBe(5);
  });

  it('returns null when there is no candidate to try', () => {
    expect(findLowestCostArrangement(200, 0, 40, 40, 56, [1], 80, [1], 100, [])).toBeNull();
  });
});
