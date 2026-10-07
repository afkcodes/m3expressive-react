import { describe, expect, it } from 'vitest';
import {
  KeylineList,
  keylineListOf,
  keylineListWithPivot,
  lerpKeyline,
  lerpList,
  type Keyline,
} from './keylineList.ts';

/*
 * Expectations ported from Compose material3 carousel KeylineTest.kt (androidHostTest); the
 * invariants at the end are the ones createKeylinesWithPivot is built on.
 */

const LARGE = 100;
const SMALL = 20;
const X_SMALL = 5;
const MEDIUM = (LARGE + SMALL) / 2;

/** [xs-s-s-m-l-l-m-s-s-xs], centred, no spacing (KeylineTest.createTestKeylineList). */
const testList = () =>
  keylineListOf(X_SMALL * 2 + SMALL * 4 + MEDIUM * 2 + LARGE * 2, 0, 'center', (s) => {
    s.add(X_SMALL, true);
    s.add(SMALL);
    s.add(SMALL);
    s.add(MEDIUM);
    s.add(LARGE);
    s.add(LARGE);
    s.add(MEDIUM);
    s.add(SMALL);
    s.add(SMALL);
    s.add(X_SMALL, true);
  });

const keyline = (
  size: number,
  offset: number,
  unadjustedOffset: number,
  isFocal: boolean,
  isAnchor: boolean,
  isPivot: boolean,
  cutoff: number,
): Keyline => ({ size, offset, unadjustedOffset, isFocal, isAnchor, isPivot, cutoff });

describe('KeylineList (Compose KeylineTest)', () => {
  it('finds the first and last focal keylines', () => {
    const list = testList();
    expect([list.firstFocalIndex, list.lastFocalIndex]).toEqual([4, 5]);
    expect(list.focalCount).toBe(2);
    expect([list.firstNonAnchorIndex, list.lastNonAnchorIndex]).toEqual([1, 8]);
  });

  it('cuts off an item that crosses the end of the container', () => {
    const main = LARGE + Math.round(MEDIUM * 0.75);
    const list = keylineListOf(main, 0, 'start', (s) => {
      s.add(SMALL, true);
      s.add(LARGE);
      s.add(MEDIUM);
      s.add(SMALL, true);
    });
    expect(list.at(2).cutoff).toBe(MEDIUM - Math.round(MEDIUM * 0.75));
  });

  it('cuts off an item that crosses the start of the container', () => {
    const main = Math.round(MEDIUM * 0.75) + LARGE;
    const list = keylineListOf(main, 0, 'end', (s) => {
      s.add(SMALL, true);
      s.add(MEDIUM);
      s.add(LARGE);
      s.add(SMALL, true);
    });
    expect(list.at(1).cutoff).toBe(MEDIUM * 0.25);
  });

  it('finds keylines of a size outside the focal range', () => {
    const list = testList();
    expect(list.firstIndexAfterFocalRangeWithSize(SMALL)).toBe(7);
    expect(list.lastIndexBeforeFocalRangeWithSize(SMALL)).toBe(2);
    // No match: the last / first index.
    expect(list.firstIndexAfterFocalRangeWithSize(1234)).toBe(list.lastIndex);
    expect(list.lastIndexBeforeFocalRangeWithSize(1234)).toBe(0);
  });

  it('getKeylineBefore / getKeylineAfter, clamped to the ends', () => {
    const list = testList();
    expect(list.getKeylineBefore(60)).toBe(list.at(3));
    expect(list.getKeylineBefore(-Number.MAX_VALUE)).toBe(list.at(0));
    expect(list.getKeylineBefore(Number.MAX_VALUE)).toBe(list.last);
    expect(list.getKeylineAfter(60)).toBe(list.at(4));
    expect(list.getKeylineAfter(-Number.MAX_VALUE)).toBe(list.at(0));
    expect(list.getKeylineAfter(Number.MAX_VALUE)).toBe(list.last);
  });

  it('lerps two lists keyline by keyline (flags switch at 0.5)', () => {
    const main = LARGE + MEDIUM + SMALL;
    const from = keylineListWithPivot(main, 0, 1, LARGE / 2, (s) => {
      s.add(X_SMALL, true);
      s.add(LARGE);
      s.add(MEDIUM);
      s.add(SMALL);
      s.add(X_SMALL, true);
    });
    const to = keylineListWithPivot(main, 0, 2, SMALL + LARGE / 2, (s) => {
      s.add(X_SMALL, true);
      s.add(SMALL);
      s.add(LARGE);
      s.add(MEDIUM);
      s.add(X_SMALL, true);
    });
    const half = new KeylineList([
      keyline(X_SMALL, -2.5, -90, false, true, false, 0),
      keyline(60, 30, 10, false, false, false, 0),
      keyline(80, 100, 110, true, false, true, 0),
      keyline(40, 160, 210, false, false, false, 0),
      keyline(X_SMALL, 182.5, 310, false, true, false, 0),
    ]);
    expect(lerpList(from, to, 0)).toEqual(from);
    expect(lerpList(from, to, 1)).toEqual(to);
    expect(lerpList(from, to, 0.5)).toEqual(half);
    expect(lerpKeyline(from.at(2), to.at(2), 0.4999).isPivot).toBe(false);
  });

  it('equal scopes build equal lists; a different size does not', () => {
    const build = (firstAnchor: number) =>
      keylineListOf(120, 0, 'start', (s) => {
        s.add(firstAnchor, true);
        s.add(100);
        s.add(20);
        s.add(10, true);
      });
    expect(build(10)).toEqual(build(10));
    expect(build(11)).not.toEqual(build(10));
  });

  it('start alignment adds the spacing between items', () => {
    const list = keylineListOf(380, 8, 'start', (s) => {
      s.add(10, true);
      s.add(186);
      s.add(122);
      s.add(56);
      s.add(10, true);
    });
    expect(list.keylines.map((k) => k.offset)).toEqual([-13, 93, 255, 352, 393]);
    expect(list.keylines.map((k) => k.unadjustedOffset)).toEqual([-101, 93, 287, 481, 675]);
  });

  it('centre alignment adds the spacing between items', () => {
    const list = keylineListOf(768, 8, 'center', (s) => {
      s.add(10, true);
      s.add(56);
      s.add(122);
      s.add(186);
      s.add(186);
      s.add(122);
      s.add(56);
      s.add(10, true);
    });
    expect(list.keylines.map((k) => k.offset)).toEqual([-13, 28, 125, 287, 481, 643, 740, 781]);
    expect(list.keylines.map((k) => k.unadjustedOffset)).toEqual([-295, -101, 93, 287, 481, 675, 869, 1063]);
  });

  it('end alignment adds the spacing between items', () => {
    const list = keylineListOf(380, 8, 'end', (s) => {
      s.add(10, true);
      s.add(56);
      s.add(122);
      s.add(186);
      s.add(10, true);
    });
    expect(list.keylines.map((k) => k.offset)).toEqual([-13, 28, 125, 287, 393]);
    expect(list.keylines.map((k) => k.unadjustedOffset)).toEqual([-295, -101, 93, 287, 481]);
  });

  it('is empty for an empty scope, anchors only, non-positive sizes or a pivot out of range', () => {
    expect(keylineListOf(100, 0, 'start', () => {}).length).toBe(0);
    expect(
      keylineListOf(100, 0, 'start', (s) => {
        s.add(10, true);
        s.add(10, true);
      }).length,
    ).toBe(0);
    expect(
      keylineListOf(100, 0, 'start', (s) => {
        s.add(0);
        s.add(-10);
      }).length,
    ).toBe(0);
    expect(keylineListWithPivot(100, 0, 10, 50, (s) => s.add(100)).length).toBe(0);
  });
});

describe('keyline list invariants (createKeylinesWithPivot), lists that fill the container, 8px spacing', () => {
  const lists = {
    start: keylineListOf(380, 8, 'start', (s) => {
      s.add(10, true);
      s.add(186);
      s.add(122);
      s.add(56);
      s.add(10, true);
    }),
    centre: keylineListOf(768, 8, 'center', (s) => {
      s.add(10, true);
      s.add(56);
      s.add(122);
      s.add(186);
      s.add(186);
      s.add(122);
      s.add(56);
      s.add(10, true);
    }),
    end: keylineListOf(380, 8, 'end', (s) => {
      s.add(10, true);
      s.add(56);
      s.add(122);
      s.add(186);
      s.add(10, true);
    }),
  };
  const mains = { start: 380, centre: 768, end: 380 };

  it('anchors sit at both ends, just outside the container, never focal', () => {
    for (const [name, list] of Object.entries(lists) as [keyof typeof lists, KeylineList][]) {
      const main = mains[name];
      expect([list.first.isAnchor, list.last.isAnchor]).toEqual([true, true]);
      expect(list.keylines.slice(1, -1).every((k) => !k.isAnchor)).toBe(true);
      expect(list.first.offset + list.first.size / 2).toBeLessThanOrEqual(0);
      expect(list.last.offset - list.last.size / 2).toBeGreaterThanOrEqual(main);
      expect(list.first.isFocal || list.last.isFocal).toBe(false);
    }
  });

  it('the focal range is contiguous, holds the largest size and contains the one pivot', () => {
    for (const list of Object.values(lists)) {
      const focal = list.keylines.map((k) => k.isFocal);
      expect(focal.indexOf(true)).toBe(list.firstFocalIndex);
      expect(focal.lastIndexOf(true)).toBe(list.lastFocalIndex);
      expect(focal.slice(list.firstFocalIndex, list.lastFocalIndex + 1).every(Boolean)).toBe(true);
      for (let i = list.firstFocalIndex; i <= list.lastFocalIndex; i++) expect(list.at(i).size).toBe(list.maxSize);
      expect(list.keylines.filter((k) => k.isPivot)).toHaveLength(1);
      expect(list.pivotIndex).toBe(list.firstFocalIndex);
    }
  });

  it('items pack edge to edge with the spacing; unadjusted offsets step by the focal size', () => {
    for (const list of Object.values(lists)) {
      for (let i = 1; i < list.length; i++) {
        const [a, b] = [list.at(i - 1), list.at(i)];
        expect(b.offset - a.offset).toBeCloseTo((a.size + b.size) / 2 + 8, 9);
        expect(b.unadjustedOffset - a.unadjustedOffset).toBeCloseTo(list.maxSize + 8, 9);
      }
    }
  });

  it('cutoff is the part of an item outside the container (0 when inside or entirely outside)', () => {
    for (const [name, list] of Object.entries(lists) as [keyof typeof lists, KeylineList][]) {
      const main = mains[name];
      for (const k of list.keylines) {
        const [left, right] = [k.offset - k.size / 2, k.offset + k.size / 2];
        const expected = left < 0 && right > 0 ? -left : left < main && right > main ? right - main : 0;
        expect(k.cutoff).toBeCloseTo(expected, 9);
      }
    }
  });
});
