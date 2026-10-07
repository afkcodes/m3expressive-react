import { describe, expect, it } from 'vitest';
import type { KeylineList } from './keylineList.ts';
import {
  heroKeylineList,
  MAX_SMALL_ITEM_SIZE,
  MIN_SMALL_ITEM_SIZE,
  multiBrowseKeylineList,
  uncontainedKeylineList,
} from './keylineLayouts.ts';
import { Strategy } from './strategy.ts';

/*
 * Expectations ported from Compose material3 carousel MultiBrowseTest.kt, UncontainedTest.kt and
 * CenteredHeroTest.kt (androidHostTest, Density 1), plus hand-computed layouts at phone / tablet
 * widths (the arithmetic is in each test's comment).
 */

const ANCHOR = 10; // CarouselDefaults.AnchorSize
const sizes = (list: KeylineList) => list.keylines.map((k) => k.size);
const offsets = (list: KeylineList) => list.keylines.map((k) => k.offset);
const strategyFor = (list: KeylineList, main: number, spacing = 0) => new Strategy(list, main, spacing, 0, 0);

describe('multiBrowseKeylineList (Compose MultiBrowseTest)', () => {
  it('keeps the preferred size when there is room', () => {
    const list = multiBrowseKeylineList(500, 120, 0, 10);
    expect(strategyFor(list, 500).itemMainAxisSize).toBeCloseTo(120, 9);
  });

  it('an item larger than the container shrinks to fit one small item: [xs l s xs]', () => {
    const list = multiBrowseKeylineList(100, 200, 0, 10);
    expect(strategyFor(list, 100).itemMainAxisSize).toBeLessThanOrEqual(100);
    expect(list.length).toBe(4);
    expect(list.first.unadjustedOffset).toBeLessThan(0);
    expect(list.last.unadjustedOffset).toBeGreaterThan(100);
    expect(list.at(1).isFocal).toBe(true);
    expect(list.at(2).size).toBe(MIN_SMALL_ITEM_SIZE);
  });

  it('a container too small for a small item has none', () => {
    const list = multiBrowseKeylineList(MIN_SMALL_ITEM_SIZE, 200, 0, 10);
    expect(strategyFor(list, MIN_SMALL_ITEM_SIZE).itemMainAxisSize).toBe(MIN_SMALL_ITEM_SIZE);
    expect(list.firstFocal).toBe(list.firstNonAnchor);
    expect(list.lastFocal).toBe(list.lastNonAnchor);
  });

  it('is empty for a zero or negative container', () => {
    expect(multiBrowseKeylineList(0, 200, 0, 10).length).toBe(0);
    expect(multiBrowseKeylineList(-10, 200, 0, 10).length).toBe(0);
    expect(multiBrowseKeylineList(400, 0, 0, 10).length).toBe(0);
  });

  it('sizes the medium item between large and small: [xs l l m s xs]', () => {
    const main = 200 * 2 + MAX_SMALL_ITEM_SIZE * 2;
    const list = multiBrowseKeylineList(main, 200, 0, 10);
    expect(list.length).toBe(6);
    expect([list.at(1).isFocal, list.at(2).isFocal]).toEqual([true, true]);
    expect(list.at(3).size).toBeLessThan(list.at(2).size);
    expect(list.at(4).size).toBeLessThan(list.at(3).size);
  });

  it('drops keylines the items cannot fill (3 items: [xs l l s xs])', () => {
    const main = 200 * 2 + MAX_SMALL_ITEM_SIZE * 2;
    const list = multiBrowseKeylineList(main, 200, 0, 3);
    expect(list.length).toBe(5);
    expect([list.at(1).isFocal, list.at(2).isFocal]).toEqual([true, true]);
    expect(list.at(3).size).toBeLessThan(list.at(2).size);
  });

  it('accounts for item spacing (380px, 186px items, 8px gaps)', () => {
    const list = multiBrowseKeylineList(380, 186, 8, 10);
    const strategy = strategyFor(list, 380, 8);
    expect(list.firstFocal.size).toBe(186);
    expect(list.firstFocal.offset).toBe(186 / 2);
    expect(list.lastNonAnchor.offset + list.lastNonAnchor.size / 2).toBe(380);
    expect(strategy.itemMainAxisSize).toBe(186);
    expect(list.at(3).size).toBe(56);
    expect(list.at(3).offset).toBe(380 - 56 / 2);
    const maxScroll = 186 * 10 + 8 * 10 - 380;
    expect(strategy.getKeylineListForScrollOffset(0, maxScroll).keylines.map((k) => k.unadjustedOffset)).toEqual([
      -101, 93, 287, 481, 675,
    ]);
  });
});

describe('multi-browse at container widths (186px preferred, 8px gaps)', () => {
  it('360px: one 186px large, a 118px medium and a 40px small', () => {
    // Large counts [2, 1]; 2L1M1S costs 71.84, 2L0M1S 34 × p2 = 68, then 1L1M1S fits exactly:
    // small 56 → 40 (−16 of the −19 deficit), large (344 − 1.5 × 40) / 1.5 = 189.33 gives the
    // medium 3.33px of its 10% flex → large 186, medium 118.
    const list = multiBrowseKeylineList(360, 186, 8, 10);
    expect(sizes(list)).toEqual([ANCHOR, 186, 118, 40, ANCHOR].map((v) => expect.closeTo(v, 9)));
    expect(offsets(list)).toEqual([-13, 93, 253, 340, 373].map((v) => expect.closeTo(v, 9)));
  });

  it('412px: two 178px large and a 40px small (no medium)', () => {
    // Large counts [3, 2, 1]; 2L0M1S: small 56 → 40, large (396 − 40) / 2 = 178, cost 8 × p4 = 32;
    // 1L1M1S lands on 194.8 (cost 8.8 × p5 = 44).
    const list = multiBrowseKeylineList(412, 186, 8, 10);
    expect(sizes(list)).toEqual([ANCHOR, 178, 178, 40, ANCHOR]);
    expect(offsets(list)).toEqual([-13, 89, 275, 392, 425]);
  });

  it.each([360, 412, 600, 840])('%ipx: start-aligned, fills the container, small items within 40…56', (main) => {
    const list = multiBrowseKeylineList(main, 186, 8, 10);
    expect(list.firstFocal).toBe(list.firstNonAnchor);
    expect(list.firstFocal.offset - list.firstFocal.size / 2).toBeCloseTo(0, 9);
    expect(list.lastNonAnchor.offset + list.lastNonAnchor.size / 2).toBeCloseTo(main, 9);
    const items = list.keylines.filter((k) => !k.isAnchor);
    expect(items.reduce((sum, k) => sum + k.size, 0) + 8 * (items.length - 1)).toBeCloseTo(main, 9);
    // Sizes never grow after the focal range.
    for (let i = list.lastFocalIndex + 1; i <= list.lastNonAnchorIndex; i++)
      expect(list.at(i).size).toBeLessThan(list.at(i - 1).size);
    expect(list.lastNonAnchor.size).toBeGreaterThanOrEqual(MIN_SMALL_ITEM_SIZE);
    expect(list.lastNonAnchor.size).toBeLessThanOrEqual(MAX_SMALL_ITEM_SIZE);
    expect([list.first.size, list.last.size]).toEqual([ANCHOR, ANCHOR]);
  });
});

describe('heroKeylineList (Compose CenteredHeroTest)', () => {
  it('enough room for one large and two small items', () => {
    const list = heroKeylineList(180, null, 0, 6, true);
    expect(strategyFor(list, 180).itemMainAxisSize).toBe(100);
  });

  it('fewer than 3 items fall back to a start-aligned arrangement', () => {
    const list = heroKeylineList(180, null, 0, 2, true);
    expect(strategyFor(list, 180).itemMainAxisSize).toBeGreaterThan(100);
    expect(list.firstFocalIndex).toBe(1);
  });

  it('one item, or a container under the full-screen threshold, goes full screen', () => {
    expect(strategyFor(heroKeylineList(120, null, 0, 1, true), 120).itemMainAxisSize).toBe(120);
    expect(strategyFor(heroKeylineList(120, null, 0, 6, true), 120).itemMainAxisSize).toBe(120);
  });

  it.each([
    [0, 7],
    [12, 7],
    [12, 10],
  ])('max item width, %ipx gaps, %i items: the outer small items sit flush with the edges', (spacing, count) => {
    const main = 300 * 3 + 40 * 2;
    const list = heroKeylineList(main, 300, spacing, count, true);
    expect(list.firstNonAnchor.offset).toBe(20);
    expect(list.lastNonAnchor.offset).toBe(main - 20);
  });

  it('is empty for a zero or negative container', () => {
    expect(heroKeylineList(0, 100, 0, 5, true).length).toBe(0);
    expect(heroKeylineList(-10, 100, 0, 5, true).length).toBe(0);
  });
});

describe('hero at container widths (8px gaps)', () => {
  it.each([
    [360, 312],
    [412, 364],
    [600, 552],
    [840, 792],
  ])('%ipx start-aligned hero: one large item of %ipx and a 40px small', (main, large) => {
    // Target large = the container, small 56 → 40 (the full deficit exceeds its 16px of give).
    const list = heroKeylineList(main, null, 8, 10);
    expect(sizes(list)).toEqual([ANCHOR, large, 40, ANCHOR]);
    expect(list.firstFocal.offset).toBe(large / 2);
    expect(list.lastNonAnchor.offset + 20).toBe(main);
  });

  it('412px centred hero, 300px preferred: 48 | 300 | 48', () => {
    // Large counts [2, 1]: 2L costs 146; 1L0M2S takes the −16px deficit as −8px per small → exact.
    const list = heroKeylineList(412, 300, 8, 10, true);
    expect(sizes(list)).toEqual([ANCHOR, 48, 300, 48, ANCHOR]);
    expect(offsets(list)).toEqual([-13, 24, 206, 388, 425]);
  });

  it.each([360, 412, 600, 840])('%ipx centred hero is symmetric about the centre', (main) => {
    const list = heroKeylineList(main, 300, 8, 10, true);
    for (let i = 0; i < list.length; i++) {
      const mirror = list.at(list.lastIndex - i);
      expect(list.at(i).size).toBeCloseTo(mirror.size, 9);
      expect(list.at(i).offset).toBeCloseTo(main - mirror.offset, 9);
    }
  });
});

describe('uncontainedKeylineList (Compose UncontainedTest)', () => {
  it.each([
    [500, 500],
    [400, 500],
  ])('%ipx container, %ipx items: [xs l xs], the item as wide as the container, anchors outside', (main, itemSize) => {
    const list = strategyFor(uncontainedKeylineList(main, itemSize, 0), main).defaultKeylines;
    expect(list.length).toBe(3);
    expect(list.at(0).offset).toBe(-ANCHOR / 2);
    expect(list.at(1).size).toBe(main);
    expect(list.at(2).offset).toBe(main + ANCHOR / 2);
  });

  it('501px items in 1000px: the remainder becomes a full-size medium, the left anchor half of it', () => {
    const list = uncontainedKeylineList(1000, 501, 0);
    expect(list.length).toBe(4);
    expect(list.at(0).offset).toBe(-125.25);
    expect([list.at(1).size, list.at(2).size, list.at(3).size]).toEqual([501, 501, ANCHOR]);
    expect(list.at(3).offset).toBe(501 * 2 + ANCHOR / 2);
  });

  it('125px items in 400px: the 25px remainder is a medium cut off by a third (25 × 1.5)', () => {
    const list = uncontainedKeylineList(400, 125, 0);
    expect(sizes(list)).toEqual([18.75, 125, 125, 125, 37.5, ANCHOR]);
    expect(list.at(4).offset).toBe(393.75);
    expect(list.at(0).offset).toBe(-9.375);
    expect(list.at(5).offset).toBe(125 * 3 + 37.5 + ANCHOR / 2);
  });

  it('105px items in 400px: an 85px remainder is capped at 120% of itself (85% of large is less)', () => {
    const list = uncontainedKeylineList(400, 105, 0);
    expect(list.length).toBe(6);
    expect([list.at(1).size, list.at(2).size, list.at(3).size]).toEqual([105, 105, 105]);
    expect(list.at(4).size).toBeCloseTo(85 * 1.2, 9);
    expect(list.at(0).size).toBeCloseTo(85 * 1.2 * 0.5, 9);
    expect(list.at(5).size).toBe(ANCHOR);
    expect(list.at(0).offset).toBeCloseTo(-(85 * 1.2 * 0.5) / 2, 9);
    expect(list.at(5).offset).toBeCloseTo(105 * 3 + 85 * 1.2 + ANCHOR / 2, 9);
  });

  it('is empty for a zero or negative container or a zero item size', () => {
    expect(uncontainedKeylineList(-10, 100, 0).length).toBe(0);
    expect(uncontainedKeylineList(0, 100, 0).length).toBe(0);
    expect(uncontainedKeylineList(400, 0, 0).length).toBe(0);
  });

  it('840px, 200px items, 8px gaps: four 208px items (size + gap) and a 12px medium', () => {
    // largeItemSize = min(200 + 8, 840) = 208; floor(840 / 208) = 4, remainder 8 → medium
    // max(8 × 1.5, 10) = 12; left anchor max(min(10, 200), 12 / 2) = 10.
    const list = uncontainedKeylineList(840, 200, 8);
    expect(sizes(list)).toEqual([10, 208, 208, 208, 208, 12, 10]);
    expect(list.firstFocal.offset).toBe(104);
  });
});
