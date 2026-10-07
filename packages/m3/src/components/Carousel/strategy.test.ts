import { describe, expect, it } from 'vitest';
import { keylineListOf, keylineListWithPivot, type KeylineList } from './keylineList.ts';
import { multiBrowseKeylineList } from './keylineLayouts.ts';
import { itemPlacement, maxScrollOffset, Strategy } from './strategy.ts';

/*
 * Expectations ported from Compose material3 carousel StrategyTest.kt and
 * KeylineSnapPositionTest.kt (androidHostTest), plus the carouselItem placement (Carousel.kt) and
 * the interpolation at the shift boundaries, hand-computed.
 */

const large = 100;
const small = 20;
const medium = (large + small) / 2;
const xSmall = 5;

/** Field-by-field comparison: Compose asserts exact Float equality (or 0.01 in the step tests). */
function assertKeylines(actual: KeylineList, expected: KeylineList, digits = 9) {
  expect(actual.length).toBe(expected.length);
  actual.keylines.forEach((k, i) => {
    const e = expected.at(i);
    expect({ i, isFocal: k.isFocal, isAnchor: k.isAnchor, isPivot: k.isPivot }).toEqual({
      i,
      isFocal: e.isFocal,
      isAnchor: e.isAnchor,
      isPivot: e.isPivot,
    });
    expect(k.size).toBeCloseTo(e.size, digits);
    expect(k.offset).toBeCloseTo(e.offset, digits);
    expect(k.unadjustedOffset).toBeCloseTo(e.unadjustedOffset, digits);
    expect(k.cutoff).toBeCloseTo(e.cutoff, digits);
  });
}

/** [xs | s s m l l m s s | xs] */
const centerAligned = () =>
  keylineListOf(small * 2 + medium + large * 2 + medium + small * 2, 0, 'center', (s) => {
    s.add(xSmall, true);
    s.add(small);
    s.add(small);
    s.add(medium);
    s.add(large);
    s.add(large);
    s.add(medium);
    s.add(small);
    s.add(small);
    s.add(xSmall, true);
  });

/** [xs | l m s | xs] */
const startAligned = () =>
  keylineListOf(large + medium + small, 0, 'start', (s) => {
    s.add(xSmall, true);
    s.add(large);
    s.add(medium);
    s.add(small);
    s.add(xSmall, true);
  });

const listOf = (main: number, pivotIndex: number, pivotOffset: number, items: number[]) =>
  keylineListWithPivot(main, 0, pivotIndex, pivotOffset, (s) => {
    s.add(xSmall, true);
    for (const size of items) s.add(size);
    s.add(xSmall, true);
  });

describe('Strategy keyline steps (Compose StrategyTest)', () => {
  it('a start-aligned strategy shifts at the end', () => {
    const main = large + medium + small;
    const maxScroll = 10 * large - main;
    const defaults = startAligned();
    const strategy = new Strategy(defaults, main, 0);
    expect(strategy.getKeylineListForScrollOffset(0, maxScroll)).toBe(defaults);
    const end = strategy.getKeylineListForScrollOffset(maxScroll, maxScroll);
    expect(end.keylines.map((k) => k.offset)).toEqual([-2.5, 10, 50, 130, 182.5]);
    expect(end.keylines.map((k) => k.unadjustedOffset)).toEqual([130 - 300, 130 - 200, 130 - 100, 130, 130 + 100]);
  });

  it('a start-aligned cutoff strategy shifts the cutoff to the start at the end', () => {
    const main = large + medium + medium;
    const cutoff = 50;
    const defaults = keylineListOf(main, 0, 'start', (s) => {
      s.add(xSmall, true);
      s.add(large + cutoff);
      s.add(medium);
      s.add(medium);
      s.add(xSmall, true);
    });
    const end = new Strategy(defaults, main, 0).endKeylineSteps.at(-1)!;
    expect(defaults.lastNonAnchor.cutoff).toBe(cutoff);
    expect(defaults.firstNonAnchor.offset - defaults.firstNonAnchor.size / 2).toBe(0);
    expect(end.firstNonAnchor.cutoff).toBe(cutoff);
    expect(end.firstNonAnchor.offset - end.firstNonAnchor.size / 2).toBe(-cutoff);
    expect(end.lastNonAnchor.offset + end.lastNonAnchor.size / 2).toBe(main);
  });

  it('an end-aligned cutoff strategy shifts the cutoff to the end at the start', () => {
    const main = large + medium + medium;
    const cutoff = 50;
    const defaults = keylineListOf(main, 0, 'end', (s) => {
      s.add(xSmall, true);
      s.add(medium);
      s.add(medium);
      s.add(large + cutoff);
      s.add(xSmall, true);
    });
    const start = new Strategy(defaults, main, 0).startKeylineSteps.at(-1)!;
    expect(defaults.firstNonAnchor.cutoff).toBe(cutoff);
    expect(defaults.lastNonAnchor.offset + defaults.lastNonAnchor.size / 2).toBe(main);
    expect(start.lastNonAnchor.cutoff).toBe(cutoff);
    expect(start.firstNonAnchor.offset - start.firstNonAnchor.size / 2).toBe(0);
    expect(start.lastNonAnchor.offset + start.lastNonAnchor.size / 2).toBe(main + cutoff);
  });

  it('overlapping shift ranges skip the default keylines (content padding 24 / 48)', () => {
    const main = large + small;
    const maxScroll = large * 2 - main;
    const defaults = keylineListOf(main, 0, 'start', (s) => {
      s.add(xSmall, true);
      s.add(large);
      s.add(small);
      s.add(xSmall, true);
    });
    const strategy = new Strategy(defaults, main, 0, 24, 48);
    const start = strategy.getKeylineListForScrollOffset(0, maxScroll);
    expect(start.firstFocal.offset).toBeCloseTo(24 + start.firstFocal.size / 2, 9);
    const end = strategy.getKeylineListForScrollOffset(maxScroll, maxScroll);
    expect(end.lastFocal.offset).toBeCloseTo(main - 48 - end.lastFocal.size / 2, 9);
    const midpoint = strategy.getKeylineListForScrollOffset(maxScroll / 2, maxScroll, true);
    expect(midpoint.keylines.map((k) => k.offset)).not.toEqual(defaults.keylines.map((k) => k.offset));
  });

  it('a centre-aligned strategy shifts at the start, one step per item', () => {
    const main = small * 2 + medium + large * 2 + medium + small * 2;
    const maxScroll = 12 * large - main;
    const strategy = new Strategy(centerAligned(), main, 0);
    const steps = [
      centerAligned(),
      listOf(main, 3, small + medium + large / 2, [small, medium, large, large, medium, small, small, small]),
      listOf(main, 2, medium + large / 2, [medium, large, large, medium, small, small, small, small]),
      listOf(main, 1, large / 2, [large, large, medium, medium, small, small, small, small]),
    ];
    const shifted = strategy.getKeylineListForScrollOffset(0, maxScroll);
    assertKeylines(shifted, steps[3]!);
    expect(shifted.firstFocal.offset - shifted.firstFocal.size / 2).toBe(0);
    const total = steps[3]!.first.unadjustedOffset - steps[0]!.first.unadjustedOffset;
    for (const step of steps) {
      const scroll = total - (step.first.unadjustedOffset - steps[0]!.first.unadjustedOffset);
      assertKeylines(strategy.getKeylineListForScrollOffset(scroll, maxScroll), step, 2);
    }
  });

  /** StrategyTest.testStrategy_centerAlignedShiftsEnd: the strategy, its expected steps and their scroll offsets. */
  function centreEnd() {
    const main = small * 2 + medium + large * 2 + medium + small * 2;
    const maxScroll = 12 * large - main;
    const strategy = new Strategy(centerAligned(), main, 0);
    const steps = [
      centerAligned(),
      listOf(main, 5, small * 3 + medium + large / 2, [small, small, small, medium, large, large, medium, small]),
      listOf(main, 6, small * 4 + medium + large / 2, [small, small, small, small, medium, large, large, medium]),
      listOf(main, 7, small * 4 + medium * 2 + large / 2, [small, small, small, small, medium, medium, large, large]),
    ];
    const total = steps[0]!.last.unadjustedOffset - steps[3]!.last.unadjustedOffset;
    const scrolls = steps.map(
      (step) => maxScroll - total - (step.last.unadjustedOffset - steps[0]!.last.unadjustedOffset),
    );
    /** The scroll offset `fraction` of the way from step `from` to the next. */
    const at = (from: number, fraction: number) => scrolls[from]! + (scrolls[from + 1]! - scrolls[from]!) * fraction;
    return { main, maxScroll, strategy, steps, scrolls, at };
  }

  it('a centre-aligned strategy shifts at the end, one step per item', () => {
    const { main, maxScroll, strategy, steps, scrolls } = centreEnd();
    const shifted = strategy.getKeylineListForScrollOffset(maxScroll, maxScroll);
    assertKeylines(shifted, steps[3]!);
    expect(shifted.lastFocal.offset + shifted.lastFocal.size / 2).toBe(main);
    steps.forEach((step, i) => assertKeylines(strategy.getKeylineListForScrollOffset(scrolls[i]!, maxScroll), step, 2));
  });

  it('roundToNearestStep returns the nearer step itself', () => {
    const { maxScroll, strategy, at } = centreEnd();
    expect(strategy.getKeylineListForScrollOffset(at(0, 0.75), maxScroll, true)).toBe(strategy.endKeylineSteps[1]);
    expect(strategy.getKeylineListForScrollOffset(at(2, 0.1), maxScroll, true)).toBe(strategy.endKeylineSteps[2]);
  });

  // Bug (Compose parity, path unused by the library): exactly half-way between two steps Compose
  // rounds up to the next step — in Float, (0.6f − 0.4f) / 0.4f = 0.50000006 — but the port's
  // doubles give (0.6 − 0.4) / 0.4 = 0.49999999999999994, so Math.round keeps the previous step.
  it.fails('roundToNearestStep half-way between steps 1 and 2 picks step 2 (Compose)', () => {
    const { maxScroll, strategy, at } = centreEnd();
    expect(strategy.getKeylineListForScrollOffset(at(1, 0.5), maxScroll, true)).toBe(strategy.endKeylineSteps[2]);
  });

  it('a negative max scroll offset keeps the default keylines', () => {
    const main = large + medium + small;
    const defaults = startAligned();
    expect(new Strategy(defaults, main, 0).getKeylineListForScrollOffset(0, large - main)).toBe(defaults);
  });

  it('start-aligned end steps account for item spacing', () => {
    const strategy = new Strategy(
      keylineListOf(380, 8, 'start', (s) => {
        s.add(10, true);
        s.add(186);
        s.add(122);
        s.add(56);
        s.add(10, true);
      }),
      380,
      8,
    );
    const [, middle, end] = strategy.endKeylineSteps;
    expect(middle!.keylines.map((k) => k.offset)).toEqual([-13, 28, 157, 319, 393]);
    expect(middle!.keylines.map((k) => k.unadjustedOffset)).toEqual([-231, -37, 157, 351, 545]);
    expect(end!.keylines.map((k) => k.offset)).toEqual([-13, 28, 125, 287, 393]);
    expect(end!.keylines.map((k) => k.unadjustedOffset)).toEqual([-295, -101, 93, 287, 481]);
  });

  it('centre-aligned start and end steps account for item spacing', () => {
    const strategy = new Strategy(
      keylineListOf(768, 8, 'center', (s) => {
        s.add(10, true);
        s.add(56);
        s.add(122);
        s.add(186);
        s.add(186);
        s.add(122);
        s.add(56);
        s.add(10, true);
      }),
      768,
      8,
    );
    expect(strategy.startKeylineSteps).toHaveLength(3);
    expect(strategy.endKeylineSteps).toHaveLength(3);
    const offsetsOf = (l: KeylineList) => [l.keylines.map((k) => k.offset), l.keylines.map((k) => k.unadjustedOffset)];
    // One small moves from start to end: xs m l l m s s xs.
    expect(offsetsOf(strategy.startKeylineSteps[1]!)).toEqual([
      [-13, 61, 223, 417, 579, 676, 740, 781],
      [-165, 29, 223, 417, 611, 805, 999, 1193],
    ]);
    // xs l l m m s s xs.
    expect(offsetsOf(strategy.startKeylineSteps[2]!)).toEqual([
      [-13, 93, 287, 449, 579, 676, 740, 781],
      [-101, 93, 287, 481, 675, 869, 1063, 1257],
    ]);
    // One small moves to the start: xs s s m l l m xs.
    expect(offsetsOf(strategy.endKeylineSteps[1]!)).toEqual([
      [-13, 28, 92, 189, 351, 545, 707, 781],
      [-425, -231, -37, 157, 351, 545, 739, 933],
    ]);
    // Then one medium.
    expect(offsetsOf(strategy.endKeylineSteps[2]!)).toEqual([
      [-13, 28, 92, 189, 319, 481, 675, 781],
      [-489, -295, -101, 93, 287, 481, 675, 869],
    ]);
  });

  it('centre-aligned steps account for content padding (16 before, 24 after)', () => {
    const strategy = new Strategy(
      keylineListOf(500, 0, 'center', (s) => {
        s.add(10, true);
        s.add(50);
        s.add(100);
        s.add(200);
        s.add(100);
        s.add(50);
        s.add(10, true);
      }),
      500,
      0,
      16,
      24,
    );
    const lastStart = strategy.startKeylineSteps.at(-1)!;
    const lastEnd = strategy.endKeylineSteps.at(-1)!;
    expect(lastStart.firstFocal.offset - lastStart.firstFocal.size / 2).toBeCloseTo(16, 9);
    expect(lastStart.lastNonAnchor.offset + lastStart.lastNonAnchor.size / 2).toBeCloseTo(500, 9);
    expect(lastEnd.lastFocal.offset + lastEnd.lastFocal.size / 2).toBeCloseTo(500 - 24, 9);
    expect(lastEnd.firstNonAnchor.offset - lastEnd.firstNonAnchor.size / 2).toBeCloseTo(0, 2);
  });

  it('start-aligned two large one small: padding shrinks the items, edges stay flush', () => {
    const strategy = new Strategy(
      keylineListOf(444, 8, 'start', (s) => {
        s.add(10, true);
        s.add(186);
        s.add(186);
        s.add(56);
        s.add(10, true);
      }),
      444,
      8,
      16,
      16,
    );
    expect(strategy.itemMainAxisSize).toBe(186);
    const startSmall = strategy.startKeylineSteps.at(-1)!.at(3);
    expect(startSmall.offset + startSmall.size / 2).toBeCloseTo(444, 3);
    const end = strategy.endKeylineSteps.at(-1)!;
    expect(end.at(1).size + 8 + end.at(2).size + 8 + end.at(3).size).toBeCloseTo(444 - 16, 9);
    expect(end.at(1).offset - end.at(1).size / 2).toBeCloseTo(0, 3);
  });

  it('min / max item size span every step; isValid needs keylines, space and a focal size', () => {
    const strategy = new Strategy(centerAligned(), 400, 0);
    expect([strategy.minItemSize, strategy.maxItemSize]).toEqual([xSmall, large]);
    expect(strategy.isValid).toBe(true);
    expect(
      new Strategy(
        keylineListOf(0, 0, 'start', () => {}),
        360,
        0,
      ).isValid,
    ).toBe(false);
    expect(new Strategy(centerAligned(), 0, 0).isValid).toBe(false);
    const multiBrowse = (space: number) => new Strategy(multiBrowseKeylineList(space, large, 0, 10), space, 0);
    expect(multiBrowse(500)).toEqual(multiBrowse(500));
    expect(multiBrowse(500)).not.toEqual(multiBrowse(501));
  });
});

describe('getKeylineListForScrollOffset at the shift boundaries', () => {
  // [xs | l m s | xs] in 180px, 10 items of 100px (max scroll 820): no start shift. The end shift
  // takes two steps — the small item moves to the front (the pivot shifts by 20), then the medium
  // (by 60) — so the last keyline's unadjusted offset goes 350 → 270 → 230: a 120px shift with
  // interpolation points [0, 80 / 120, 1]. The defaults hold from 0 to 820 − 120 = 700.
  const main = large + medium + small;
  const maxScroll = 10 * large - main;
  const defaults = startAligned();
  const strategy = new Strategy(defaults, main, 0);
  const [d, s1, s2] = strategy.endKeylineSteps as [KeylineList, KeylineList, KeylineList];
  /** The expected blend of two steps. */
  function assertBlend(actual: KeylineList, from: KeylineList, to: KeylineList, fraction: number) {
    actual.keylines.forEach((k, i) => {
      expect(k.size).toBeCloseTo(from.at(i).size + (to.at(i).size - from.at(i).size) * fraction, 9);
      expect(k.offset).toBeCloseTo(from.at(i).offset + (to.at(i).offset - from.at(i).offset) * fraction, 9);
    });
  }

  it('the default range is [start shift, max − end shift]', () => {
    expect(strategy.defaultRange(maxScroll)).toEqual([0, 700]);
    expect(strategy.defaultRange(50)).toEqual([0, 0]);
    expect(strategy.endKeylineSteps.map((s) => s.last.unadjustedOffset)).toEqual([350, 270, 230]);
  });

  it('returns the default list itself inside the range, inclusive of both ends; clamps negative scroll', () => {
    for (const scroll of [-5, 0, 350, 700])
      expect(strategy.getKeylineListForScrollOffset(scroll, maxScroll)).toBe(defaults);
    expect(strategy.getKeylineListForScrollOffset(700.001, maxScroll)).not.toBe(defaults);
  });

  it('lands on each step at its shift point and clamps past the end', () => {
    // Step 1 at 700 + 120 × 2/3 = 780, step 2 at the max scroll.
    assertKeylines(strategy.getKeylineListForScrollOffset(780, maxScroll), s1);
    assertKeylines(strategy.getKeylineListForScrollOffset(maxScroll, maxScroll), s2);
    assertKeylines(strategy.getKeylineListForScrollOffset(9999, maxScroll), s2);
  });

  it('interpolates linearly within each step', () => {
    // 720: interpolation 20 / 120 = 1/6, a quarter of the way to step 1 (at 2/3).
    assertBlend(strategy.getKeylineListForScrollOffset(720, maxScroll), d, s1, 0.25);
    // 800: interpolation 5/6, half-way from step 1 (2/3) to step 2 (1).
    assertBlend(strategy.getKeylineListForScrollOffset(800, maxScroll), s1, s2, 0.5);
  });

  it('roundToNearestStep returns a step itself, never a blend', () => {
    expect(strategy.getKeylineListForScrollOffset(720, maxScroll, true)).toBe(d);
    // 770: 7/12 of the shift, 7/8 of the way to step 1.
    expect(strategy.getKeylineListForScrollOffset(770, maxScroll, true)).toBe(s1);
  });
});

describe('snapPositionOffset (Compose KeylineSnapPositionTest)', () => {
  const snaps = (strategy: Strategy, count: number) =>
    Array.from({ length: count }, (_, i) => strategy.snapPositionOffset(i, count));

  it('centre-aligned, single focal item', () => {
    const list = keylineListOf(1000, 0, 'center', (s) => {
      s.add(5, true);
      s.add(100);
      s.add(200);
      s.add(400);
      s.add(200);
      s.add(100);
      s.add(5, true);
    });
    expect(snaps(new Strategy(list, 1000, 0), 6)).toEqual([0, 200, 300, 300, 400, 600]);
  });

  it('centre-aligned, two focal items', () => {
    const main = 10 + 40 + 100 + 100 + 40 + 10;
    const list = keylineListOf(main, 0, 'center', (s) => {
      s.add(5, true);
      s.add(10);
      s.add(40);
      s.add(100);
      s.add(100);
      s.add(40);
      s.add(10);
      s.add(5, true);
    });
    expect(snaps(new Strategy(list, main, 0), 10)).toEqual([0, 40, 50, 50, 50, 50, 50, 150, 160, 200]);
  });

  it('start-aligned', () => {
    const list = keylineListOf(1000, 0, 'start', (s) => {
      s.add(5, true);
      s.add(400);
      s.add(200);
      s.add(200);
      s.add(100);
      s.add(100);
      s.add(5, true);
    });
    expect(snaps(new Strategy(list, 1000, 0), 6)).toEqual([0, 0, 100, 200, 400, 600]);
  });

  describe('start-aligned, two focal items [xs l l m s xs]', () => {
    const list = keylineListOf(1000, 0, 'start', (s) => {
      s.add(5, true);
      s.add(400);
      s.add(400);
      s.add(125);
      s.add(75);
      s.add(5, true);
    });
    const strategy = new Strategy(list, 1000, 0);

    it('more items than keylines', () => {
      expect(snaps(strategy, 5)).toEqual([0, 0, 400, 475, 600]);
    });

    it('as many items as keylines', () => {
      expect(snaps(strategy, 4)).toEqual([0, 400, 475, 600]);
    });

    it('fewer items than focal keylines', () => {
      expect(snaps(strategy, 1)).toEqual([0]);
    });
  });

  it('an invalid strategy snaps everything to 0', () => {
    expect(
      new Strategy(
        keylineListOf(0, 0, 'start', () => {}),
        0,
        0,
      ).snapPositionOffset(3, 10),
    ).toBe(0);
  });
});

describe('itemPlacement (carouselItem) and maxScrollOffset', () => {
  // [xs | l m s | xs] in 180px, no spacing: unadjusted offsets −50, 50, 150, 250, 350.
  const strategy = new Strategy(startAligned(), large + medium + small, 0);
  const at = (index: number, scroll: number) =>
    itemPlacement(
      strategy,
      strategy.getKeylineListForScrollOffset(scroll, maxScrollOffset(strategy, 10)),
      index,
      scroll,
    );

  it('at rest each item takes its keyline: masked to its size, translated onto its offset', () => {
    expect(at(0, 0)).toEqual({ maskSize: 100, translation: 0 });
    expect(at(1, 0)).toEqual({ maskSize: 60, translation: 130 - 150 });
    expect(at(2, 0)).toEqual({ maskSize: 20, translation: 170 - 250 });
  });

  it('between keylines the mask and offset are interpolated', () => {
    // Item 1's centre at 100 is half-way from keyline 1 (50) to keyline 2 (150).
    expect(at(1, 50)).toEqual({ maskSize: 80, translation: 90 - 100 });
  });

  it('past the first keyline an item keeps the anchor and drifts by distance / size', () => {
    // Item 0's centre at −100: before = after = the 5px anchor at −2.5 (unadjusted −50).
    const p = at(0, 150);
    expect(p.maskSize).toBe(xSmall);
    expect(p.translation).toBeCloseTo(-2.5 + 100 + (-100 + 50) / xSmall, 9);
  });

  it('maxScrollOffset: items and gaps minus the container, never negative', () => {
    expect(maxScrollOffset(strategy, 10)).toBe(1000 - 180);
    expect(maxScrollOffset(strategy, 1)).toBe(0);
    const spaced = new Strategy(multiBrowseKeylineList(380, 186, 8, 10), 380, 8);
    expect(maxScrollOffset(spaced, 10)).toBe(186 * 10 + 8 * 9 - 380);
  });
});
