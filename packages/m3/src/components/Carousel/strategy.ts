/* Port of androidx.compose.material3.carousel Strategy.kt and the carouselItem placement (see ./keylines.ts). */
import { KeylineList, keylineListWithPivot, lerpKeyline, lerpList, type Keyline } from './keylineList.ts';
import { clamp, lerpF } from './keylineMath.ts';

function createShiftedKeylineListForContentPadding(
  from: KeylineList,
  main: number,
  spacing: number,
  contentPadding: number,
  pivot: Keyline,
  pivotIndex: number,
) {
  const nonAnchor = from.keylines.filter((k) => !k.isAnchor).length;
  const sizeReduction = contentPadding / nonAnchor;
  const next = keylineListWithPivot(
    main,
    spacing,
    pivotIndex,
    pivot.offset - sizeReduction / 2 + contentPadding,
    (scope) => {
      for (const k of from.keylines) scope.add(k.size - Math.abs(sizeReduction), k.isAnchor);
    },
  );
  return new KeylineList(next.keylines.map((k, i) => ({ ...k, unadjustedOffset: from.at(i).unadjustedOffset })));
}

function moveKeylineAndCreateShiftedKeylineList(
  from: KeylineList,
  srcIndex: number,
  dstIndex: number,
  main: number,
  spacing: number,
) {
  const pivotDir = srcIndex > dstIndex ? 1 : -1;
  const pivotDelta = (from.at(srcIndex).size - from.at(srcIndex).cutoff + spacing) * pivotDir;
  const newPivotIndex = from.pivotIndex + pivotDir;
  const newPivotOffset = from.pivot.offset + pivotDelta;
  const moved = [...from.keylines];
  const [movedKeyline] = moved.splice(srcIndex, 1);
  moved.splice(dstIndex, 0, movedKeyline!);
  return keylineListWithPivot(main, spacing, newPivotIndex, newPivotOffset, (scope) => {
    for (const keyline of moved) scope.add(keyline.size, keyline.isAnchor);
  });
}

function getStartKeylineSteps(
  defaultKeylines: KeylineList,
  main: number,
  spacing: number,
  beforePadding: number,
): KeylineList[] {
  if (defaultKeylines.length === 0) return [];
  const steps = [defaultKeylines];
  if (defaultKeylines.isFirstFocalItemAtStartOfContainer()) {
    if (beforePadding !== 0)
      steps.push(
        createShiftedKeylineListForContentPadding(
          defaultKeylines,
          main,
          spacing,
          beforePadding,
          defaultKeylines.firstFocal,
          defaultKeylines.firstFocalIndex,
        ),
      );
    return steps;
  }
  const startIndex = defaultKeylines.firstNonAnchorIndex;
  const endIndex = defaultKeylines.firstFocalIndex;
  const numberOfSteps = endIndex - startIndex;
  if (numberOfSteps <= 0 && defaultKeylines.firstFocal.cutoff > 0) {
    steps.push(moveKeylineAndCreateShiftedKeylineList(defaultKeylines, 0, 0, main, spacing));
    return steps;
  }
  for (let i = 0; i < numberOfSteps; i++) {
    const prev = steps[steps.length - 1]!;
    const originalItemIndex = startIndex + i;
    let dstIndex = defaultKeylines.lastIndex;
    if (originalItemIndex > 0)
      dstIndex = prev.firstIndexAfterFocalRangeWithSize(defaultKeylines.at(originalItemIndex - 1).size) - 1;
    steps.push(
      moveKeylineAndCreateShiftedKeylineList(prev, defaultKeylines.firstNonAnchorIndex, dstIndex, main, spacing),
    );
  }
  if (beforePadding !== 0) {
    const last = steps[steps.length - 1]!;
    steps[steps.length - 1] = createShiftedKeylineListForContentPadding(
      last,
      main,
      spacing,
      beforePadding,
      last.firstFocal,
      last.firstFocalIndex,
    );
  }
  return steps;
}

function getEndKeylineSteps(
  defaultKeylines: KeylineList,
  main: number,
  spacing: number,
  afterPadding: number,
): KeylineList[] {
  if (defaultKeylines.length === 0) return [];
  const steps = [defaultKeylines];
  if (defaultKeylines.isLastFocalItemAtEndOfContainer(main)) {
    if (afterPadding !== 0)
      steps.push(
        createShiftedKeylineListForContentPadding(
          defaultKeylines,
          main,
          spacing,
          -afterPadding,
          defaultKeylines.lastFocal,
          defaultKeylines.lastFocalIndex,
        ),
      );
    return steps;
  }
  const startIndex = defaultKeylines.lastFocalIndex;
  const endIndex = defaultKeylines.lastNonAnchorIndex;
  const numberOfSteps = endIndex - startIndex;
  if (numberOfSteps <= 0 && defaultKeylines.lastFocal.cutoff > 0) {
    steps.push(moveKeylineAndCreateShiftedKeylineList(defaultKeylines, 0, 0, main, spacing));
    return steps;
  }
  for (let i = 0; i < numberOfSteps; i++) {
    const prev = steps[steps.length - 1]!;
    const originalItemIndex = endIndex - i;
    let dstIndex = 0;
    if (originalItemIndex < defaultKeylines.lastIndex)
      dstIndex = prev.lastIndexBeforeFocalRangeWithSize(defaultKeylines.at(originalItemIndex + 1).size) + 1;
    steps.push(
      moveKeylineAndCreateShiftedKeylineList(prev, defaultKeylines.lastNonAnchorIndex, dstIndex, main, spacing),
    );
  }
  if (afterPadding !== 0) {
    const last = steps[steps.length - 1]!;
    steps[steps.length - 1] = createShiftedKeylineListForContentPadding(
      last,
      main,
      spacing,
      -afterPadding,
      last.lastFocal,
      last.lastFocalIndex,
    );
  }
  return steps;
}

function getStepInterpolationPoints(
  totalShiftDistance: number,
  steps: KeylineList[],
  isShiftingLeft: boolean,
): number[] {
  const points = [0];
  if (totalShiftDistance === 0 || steps.length === 0) return points;
  for (let i = 1; i < steps.length; i++) {
    const prev = steps[i - 1]!;
    const curr = steps[i]!;
    const shifted = isShiftingLeft
      ? curr.first.unadjustedOffset - prev.first.unadjustedOffset
      : prev.last.unadjustedOffset - curr.last.unadjustedOffset;
    points.push(i === steps.length - 1 ? 1 : points[i - 1]! + shifted / totalShiftDistance);
  }
  return points;
}

const lerpRange = (outMin: number, outMax: number, inMin: number, inMax: number, v: number) =>
  v <= inMin ? outMin : v >= inMax ? outMax : lerpF(outMin, outMax, (v - inMin) / (inMax - inMin));

export class Strategy {
  readonly startKeylineSteps: KeylineList[];
  readonly endKeylineSteps: KeylineList[];
  readonly minItemSize: number;
  readonly maxItemSize: number;
  private readonly startShiftDistance: number;
  private readonly endShiftDistance: number;
  private readonly startShiftPoints: number[];
  private readonly endShiftPoints: number[];

  readonly defaultKeylines: KeylineList;
  readonly availableSpace: number;
  readonly itemSpacing: number;
  readonly beforeContentPadding: number;
  readonly afterContentPadding: number;

  constructor(
    defaultKeylines: KeylineList,
    availableSpace: number,
    itemSpacing: number,
    beforeContentPadding = 0,
    afterContentPadding = 0,
  ) {
    this.defaultKeylines = defaultKeylines;
    this.availableSpace = availableSpace;
    this.itemSpacing = itemSpacing;
    this.beforeContentPadding = beforeContentPadding;
    this.afterContentPadding = afterContentPadding;
    this.startKeylineSteps = getStartKeylineSteps(defaultKeylines, availableSpace, itemSpacing, beforeContentPadding);
    this.endKeylineSteps = getEndKeylineSteps(defaultKeylines, availableSpace, itemSpacing, afterContentPadding);
    let min = defaultKeylines.minSize;
    let max = defaultKeylines.maxSize;
    for (const step of [...this.startKeylineSteps, ...this.endKeylineSteps]) {
      if (step.minSize < min) min = step.minSize;
      if (step.maxSize > max) max = step.maxSize;
    }
    this.minItemSize = min;
    this.maxItemSize = max;
    const ss = this.startKeylineSteps;
    const es = this.endKeylineSteps;
    this.startShiftDistance =
      ss.length === 0
        ? 0
        : Math.max(ss[ss.length - 1]!.first.unadjustedOffset - ss[0]!.first.unadjustedOffset, beforeContentPadding);
    this.endShiftDistance =
      es.length === 0
        ? 0
        : Math.max(es[0]!.last.unadjustedOffset - es[es.length - 1]!.last.unadjustedOffset, afterContentPadding);
    this.startShiftPoints = getStepInterpolationPoints(this.startShiftDistance, ss, true);
    this.endShiftPoints = getStepInterpolationPoints(this.endShiftDistance, es, false);
  }

  get itemMainAxisSize() {
    return this.defaultKeylines.length ? this.defaultKeylines.firstFocal.size : 0;
  }

  get isValid() {
    return this.defaultKeylines.length > 0 && this.availableSpace !== 0 && this.itemMainAxisSize !== 0;
  }

  /** The default range of scroll offsets (start shift … end shift) in which keylines don't move. */
  defaultRange(maxScrollOffset: number): [number, number] {
    return [this.startShiftDistance, Math.max(0, maxScrollOffset - this.endShiftDistance)];
  }

  getKeylineListForScrollOffset(
    scrollOffset: number,
    maxScrollOffset: number,
    roundToNearestStep = false,
  ): KeylineList {
    const positive = Math.max(0, scrollOffset);
    const startShiftOffset = this.startShiftDistance;
    const endShiftOffset = Math.max(0, maxScrollOffset - this.endShiftDistance);
    if (positive >= startShiftOffset && positive <= endShiftOffset) return this.defaultKeylines;
    let interpolation = lerpRange(1, 0, 0, startShiftOffset, positive);
    let shiftPoints = this.startShiftPoints;
    let steps = this.startKeylineSteps;
    if (positive > endShiftOffset) {
      interpolation = lerpRange(0, 1, endShiftOffset, maxScrollOffset, positive);
      shiftPoints = this.endShiftPoints;
      steps = this.endKeylineSteps;
      if (endShiftOffset < 0.01 && this.startKeylineSteps.length === 2 && this.endKeylineSteps.length === 2) {
        steps = [
          this.startKeylineSteps[this.startKeylineSteps.length - 1]!,
          this.endKeylineSteps[this.endKeylineSteps.length - 1]!,
        ];
      }
    }
    let fromStepIndex = 0;
    let toStepIndex = 0;
    let stepped = 0;
    let lower = shiftPoints[0]!;
    for (let i = 1; i < steps.length; i++) {
      const upper = shiftPoints[i]!;
      if (interpolation <= upper) {
        fromStepIndex = i - 1;
        toStepIndex = i;
        stepped = lerpRange(0, 1, lower, upper, interpolation);
        break;
      }
      lower = upper;
    }
    if (roundToNearestStep) return steps[Math.round(stepped) === 0 ? fromStepIndex : toStepIndex]!;
    return lerpList(steps[fromStepIndex]!, steps[toStepIndex]!, stepped);
  }

  /** KeylineSnapPosition.getSnapPositionOffset: where item `index` rests when snapped. */
  snapPositionOffset(index: number, itemCount: number): number {
    if (!this.isValid) return 0;
    let offset = Math.round(this.defaultKeylines.firstFocal.unadjustedOffset - this.itemMainAxisSize / 2);
    const ss = this.startKeylineSteps;
    if (index <= ss.length - 1) {
      const stepIndex = clamp(ss.length - 1 - index, 0, ss.length - 1);
      offset = Math.round(ss[stepIndex]!.firstFocal.unadjustedOffset - this.itemMainAxisSize / 2);
    }
    const es = this.endKeylineSteps;
    const lastItemIndex = itemCount - 1;
    if (index >= lastItemIndex - (es.length - 1) && itemCount > this.defaultKeylines.focalCount) {
      const stepIndex = clamp(es.length - 1 - (lastItemIndex - index), 0, es.length - 1);
      offset = Math.round(es[stepIndex]!.lastFocal.unadjustedOffset - this.itemMainAxisSize / 2);
    }
    return offset;
  }
}

/**
 * carouselItem: the mask size and translation of item `index` at `scrollOffset`, given the keyline
 * list for that offset (`strategy.getKeylineListForScrollOffset` — one list serves every item).
 */
export function itemPlacement(strategy: Strategy, keylines: KeylineList, index: number, scrollOffset: number) {
  const size = strategy.itemMainAxisSize;
  const withSpacing = size + strategy.itemSpacing;
  const unadjustedCenter = index * withSpacing + size / 2 - scrollOffset;
  const before = keylines.getKeylineBefore(unadjustedCenter);
  const after = keylines.getKeylineAfter(unadjustedCenter);
  const progress =
    before === after
      ? 1
      : (unadjustedCenter - before.unadjustedOffset) / (after.unadjustedOffset - before.unadjustedOffset);
  const keyline = lerpKeyline(before, after, progress);
  let translation = keyline.offset - unadjustedCenter;
  if (before === after) translation += (unadjustedCenter - keyline.unadjustedOffset) / keyline.size;
  return { maskSize: keyline.size, translation };
}

export function maxScrollOffset(strategy: Strategy, itemCount: number) {
  const total = strategy.itemMainAxisSize * itemCount + strategy.itemSpacing * (itemCount - 1);
  return Math.max(0, total - strategy.availableSpace);
}
