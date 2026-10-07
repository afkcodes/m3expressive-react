/*
 * Port of androidx.compose.material3.carousel (Arrangement.kt, Keylines.kt, KeylineList.kt,
 * Strategy.kt, the carouselItem modifier and KeylineSnapPosition) — the keyline model that sizes,
 * masks and pins carousel items as they scroll. Kept structurally close to the Kotlin so it can be
 * diffed against upstream.
 */

export const MIN_SMALL_ITEM_SIZE = 40;
export const MAX_SMALL_ITEM_SIZE = 56;
const ANCHOR_SIZE = 10;
const MEDIUM_LARGE_ITEM_DIFF_THRESHOLD = 0.85;
const MEDIUM_ITEM_FLEX_PERCENTAGE = 0.1;

type Alignment = 'start' | 'center' | 'end';

const lerpF = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

// ── Arrangement ───────────────────────────────────────────────────────────────────────────────

export interface Arrangement {
  priority: number;
  smallSize: number;
  smallCount: number;
  mediumSize: number;
  mediumCount: number;
  largeSize: number;
  largeCount: number;
}

const itemCountOf = (a: Arrangement) => a.largeCount + a.mediumCount + a.smallCount;

function isValid(a: Arrangement): boolean {
  if (a.largeCount > 0 && a.smallCount > 0 && a.mediumCount > 0)
    return a.largeSize > a.mediumSize && a.mediumSize > a.smallSize;
  if (a.largeCount > 0 && a.smallCount > 0) return a.largeSize > a.smallSize;
  return true;
}

const cost = (a: Arrangement, targetLargeSize: number) =>
  isValid(a) ? Math.abs(targetLargeSize - a.largeSize) * a.priority : Number.MAX_VALUE;

function calculateLargeSize(
  availableSpace: number,
  smallCount: number,
  smallSize: number,
  mediumCount: number,
  largeCount: number,
) {
  return (availableSpace - (smallCount + mediumCount / 2) * smallSize) / (largeCount + mediumCount / 2);
}

function fit(
  priority: number,
  availableSpace: number,
  itemSpacing: number,
  smallCount: number,
  smallSize: number,
  minSmallSize: number,
  maxSmallSize: number,
  mediumCount: number,
  mediumSize: number,
  largeCount: number,
  largeSize: number,
): Arrangement {
  const totalItemCount = largeCount + mediumCount + smallCount;
  const availableSpaceWithoutSpacing = availableSpace - (totalItemCount - 1) * itemSpacing;
  let arrangedSmallSize = clamp(smallSize, minSmallSize, maxSmallSize);
  let arrangedMediumSize = mediumSize;
  let arrangedLargeSize = largeSize;
  const total = arrangedLargeSize * largeCount + arrangedMediumSize * mediumCount + arrangedSmallSize * smallCount;
  const delta = availableSpaceWithoutSpacing - total;
  if (smallCount > 0 && delta > 0) arrangedSmallSize += Math.min(delta / smallCount, maxSmallSize - arrangedSmallSize);
  else if (smallCount > 0 && delta < 0)
    arrangedSmallSize += Math.max(delta / smallCount, minSmallSize - arrangedSmallSize);
  arrangedSmallSize = smallCount > 0 ? arrangedSmallSize : 0;
  arrangedLargeSize = calculateLargeSize(
    availableSpaceWithoutSpacing,
    smallCount,
    arrangedSmallSize,
    mediumCount,
    largeCount,
  );
  arrangedMediumSize = (arrangedLargeSize + arrangedSmallSize) / 2;
  if (mediumCount > 0 && arrangedLargeSize !== largeSize) {
    const targetAdjustment = (largeSize - arrangedLargeSize) * largeCount;
    const availableMediumFlex = arrangedMediumSize * MEDIUM_ITEM_FLEX_PERCENTAGE * mediumCount;
    const distribute = Math.min(Math.abs(targetAdjustment), availableMediumFlex);
    if (targetAdjustment > 0) {
      arrangedMediumSize -= distribute / mediumCount;
      arrangedLargeSize += distribute / largeCount;
    } else {
      arrangedMediumSize += distribute / mediumCount;
      arrangedLargeSize -= distribute / largeCount;
    }
  }
  return {
    priority,
    smallSize: arrangedSmallSize,
    smallCount,
    mediumSize: arrangedMediumSize,
    mediumCount,
    largeSize: arrangedLargeSize,
    largeCount,
  };
}

function findLowestCostArrangement(
  availableSpace: number,
  itemSpacing: number,
  targetSmallSize: number,
  minSmallSize: number,
  maxSmallSize: number,
  smallCounts: number[],
  targetMediumSize: number,
  mediumCounts: number[],
  targetLargeSize: number,
  largeCounts: number[],
): Arrangement | null {
  let lowest: Arrangement | null = null;
  let priority = 1;
  for (const largeCount of largeCounts) {
    for (const mediumCount of mediumCounts) {
      for (const smallCount of smallCounts) {
        const a = fit(
          priority,
          availableSpace,
          itemSpacing,
          smallCount,
          targetSmallSize,
          minSmallSize,
          maxSmallSize,
          mediumCount,
          targetMediumSize,
          largeCount,
          targetLargeSize,
        );
        if (lowest == null || cost(a, targetLargeSize) < cost(lowest, targetLargeSize)) {
          lowest = a;
          if (cost(lowest, targetLargeSize) === 0) return lowest;
        }
        priority++;
      }
    }
  }
  return lowest;
}

// ── Keyline list ──────────────────────────────────────────────────────────────────────────────

export interface Keyline {
  size: number;
  offset: number;
  unadjustedOffset: number;
  isFocal: boolean;
  isAnchor: boolean;
  isPivot: boolean;
  cutoff: number;
}

export class KeylineList {
  readonly keylines: Keyline[];
  readonly minSize: number;
  readonly maxSize: number;
  readonly pivotIndex: number;
  readonly firstNonAnchorIndex: number;
  readonly lastNonAnchorIndex: number;
  readonly firstFocalIndex: number;
  readonly lastFocalIndex: number;

  constructor(keylines: Keyline[]) {
    this.keylines = keylines;
    let min = Number.MAX_VALUE;
    let max = 0;
    for (const k of keylines) {
      if (k.size < min) min = k.size;
      if (k.size > max) max = k.size;
    }
    this.minSize = min;
    this.maxSize = max;
    this.pivotIndex = keylines.findIndex((k) => k.isPivot);
    this.firstNonAnchorIndex = keylines.findIndex((k) => !k.isAnchor);
    this.lastNonAnchorIndex = findLastIndex(keylines, (k) => !k.isAnchor);
    this.firstFocalIndex = keylines.findIndex((k) => k.isFocal);
    this.lastFocalIndex = findLastIndex(keylines, (k) => k.isFocal);
  }

  get length() {
    return this.keylines.length;
  }
  get lastIndex() {
    return this.keylines.length - 1;
  }
  at(i: number) {
    return this.keylines[i]!;
  }
  get first() {
    return this.keylines[0]!;
  }
  get last() {
    return this.keylines[this.keylines.length - 1]!;
  }
  get pivot() {
    return this.at(this.pivotIndex);
  }
  get firstNonAnchor() {
    return this.at(this.firstNonAnchorIndex);
  }
  get lastNonAnchor() {
    return this.at(this.lastNonAnchorIndex);
  }
  get firstFocal() {
    return this.at(this.firstFocalIndex);
  }
  get lastFocal() {
    return this.at(this.lastFocalIndex);
  }
  get focalCount() {
    return this.lastFocalIndex - this.firstFocalIndex + 1;
  }

  isFirstFocalItemAtStartOfContainer() {
    const firstFocalLeft = this.firstFocal.offset - this.firstFocal.size / 2;
    return firstFocalLeft >= 0 && this.firstFocal === this.firstNonAnchor;
  }

  isLastFocalItemAtEndOfContainer(carouselMainAxisSize: number) {
    const lastFocalRight = this.lastFocal.offset + this.lastFocal.size / 2;
    return lastFocalRight <= carouselMainAxisSize && this.lastFocal === this.lastNonAnchor;
  }

  firstIndexAfterFocalRangeWithSize(size: number) {
    for (let i = this.lastFocalIndex; i <= this.lastIndex; i++) if (this.at(i).size === size) return i;
    return this.lastIndex;
  }

  lastIndexBeforeFocalRangeWithSize(size: number) {
    for (let i = this.firstFocalIndex - 1; i >= 0; i--) if (this.at(i).size === size) return i;
    return 0;
  }

  getKeylineBefore(unadjustedOffset: number): Keyline {
    for (let i = this.lastIndex; i >= 0; i--) if (this.at(i).unadjustedOffset < unadjustedOffset) return this.at(i);
    return this.first;
  }

  getKeylineAfter(unadjustedOffset: number): Keyline {
    return this.keylines.find((k) => k.unadjustedOffset >= unadjustedOffset) ?? this.last;
  }
}

function findLastIndex<T>(a: T[], p: (t: T) => boolean) {
  for (let i = a.length - 1; i >= 0; i--) if (p(a[i]!)) return i;
  return -1;
}

const EMPTY = new KeylineList([]);

interface TmpKeyline {
  size: number;
  isAnchor: boolean;
}

class KeylineListScope {
  private firstFocalIndex = -1;
  private focalItemSize = 0;
  readonly tmp: TmpKeyline[] = [];

  add(size: number, isAnchor = false) {
    this.tmp.push({ size, isAnchor });
    if (!isAnchor && size > this.focalItemSize) {
      this.firstFocalIndex = this.tmp.length - 1;
      this.focalItemSize = size;
    }
  }

  private findLastFocalIndex() {
    if (this.firstFocalIndex < 0) return -1;
    let last = this.firstFocalIndex;
    while (last < this.tmp.length - 1 && this.tmp[last + 1]!.size === this.focalItemSize) last++;
    return last;
  }

  createWithPivot(carouselMainAxisSize: number, itemSpacing: number, pivotIndex: number, pivotOffset: number) {
    return new KeylineList(
      createKeylinesWithPivot(
        pivotIndex,
        pivotOffset,
        this.firstFocalIndex,
        this.findLastFocalIndex(),
        this.focalItemSize,
        carouselMainAxisSize,
        itemSpacing,
        this.tmp,
      ),
    );
  }

  createWithAlignment(carouselMainAxisSize: number, itemSpacing: number, alignment: Alignment) {
    const lastFocalIndex = this.findLastFocalIndex();
    const focalItemCount = lastFocalIndex - this.firstFocalIndex;
    const pivotIndex = this.firstFocalIndex;
    let pivotOffset: number;
    if (alignment === 'center') {
      const itemSpacingSplit = itemSpacing === 0 || focalItemCount % 2 === 0 ? 0 : itemSpacing / 2;
      const itemSpaceCounts = Math.trunc(focalItemCount / 2) * itemSpacing;
      pivotOffset =
        carouselMainAxisSize / 2 - (this.focalItemSize / 2) * focalItemCount - itemSpacingSplit - itemSpaceCounts;
    } else if (alignment === 'end') pivotOffset = carouselMainAxisSize - this.focalItemSize / 2;
    else pivotOffset = this.focalItemSize / 2;
    return new KeylineList(
      createKeylinesWithPivot(
        pivotIndex,
        pivotOffset,
        this.firstFocalIndex,
        lastFocalIndex,
        this.focalItemSize,
        carouselMainAxisSize,
        itemSpacing,
        this.tmp,
      ),
    );
  }
}

const isCutoffLeft = (size: number, offset: number) => offset - size / 2 < 0 && offset + size / 2 > 0;
const isCutoffRight = (size: number, offset: number, main: number) =>
  offset - size / 2 < main && offset + size / 2 > main;

function createKeylinesWithPivot(
  pivotIndex: number,
  pivotOffset: number,
  firstFocalIndex: number,
  lastFocalIndex: number,
  itemMainAxisSize: number,
  carouselMainAxisSize: number,
  itemSpacing: number,
  tmp: TmpKeyline[],
): Keyline[] {
  if (tmp.length === 0 || pivotIndex < 0 || pivotIndex >= tmp.length) return [];
  const pivot = tmp[pivotIndex]!;
  const keylines: Keyline[] = [];
  const pivotCutoff = isCutoffLeft(pivot.size, pivotOffset)
    ? pivotOffset - pivot.size / 2
    : isCutoffRight(pivot.size, pivotOffset, carouselMainAxisSize)
      ? pivotOffset + pivot.size / 2 - carouselMainAxisSize
      : 0;
  const focal = (i: number) => i >= firstFocalIndex && i <= lastFocalIndex;
  keylines.push({
    size: pivot.size,
    offset: pivotOffset,
    unadjustedOffset: pivotOffset,
    isFocal: focal(pivotIndex),
    isAnchor: pivot.isAnchor,
    isPivot: true,
    cutoff: pivotCutoff,
  });

  let offset = pivotOffset - itemMainAxisSize / 2 - itemSpacing;
  let unadjusted = pivotOffset - itemMainAxisSize / 2 - itemSpacing;
  for (let i = pivotIndex - 1; i >= 0; i--) {
    const t = tmp[i]!;
    const tOffset = offset - t.size / 2;
    const tUnadjusted = unadjusted - itemMainAxisSize / 2;
    const cutoff = isCutoffLeft(t.size, tOffset) ? Math.abs(tOffset - t.size / 2) : 0;
    keylines.unshift({
      size: t.size,
      offset: tOffset,
      unadjustedOffset: tUnadjusted,
      isFocal: focal(i),
      isAnchor: t.isAnchor,
      isPivot: false,
      cutoff,
    });
    offset -= t.size + itemSpacing;
    unadjusted -= itemMainAxisSize + itemSpacing;
  }

  offset = pivotOffset + itemMainAxisSize / 2 + itemSpacing;
  unadjusted = pivotOffset + itemMainAxisSize / 2 + itemSpacing;
  for (let i = pivotIndex + 1; i < tmp.length; i++) {
    const t = tmp[i]!;
    const tOffset = offset + t.size / 2;
    const tUnadjusted = unadjusted + itemMainAxisSize / 2;
    const cutoff = isCutoffRight(t.size, tOffset, carouselMainAxisSize)
      ? tOffset + t.size / 2 - carouselMainAxisSize
      : 0;
    keylines.push({
      size: t.size,
      offset: tOffset,
      unadjustedOffset: tUnadjusted,
      isFocal: focal(i),
      isAnchor: t.isAnchor,
      isPivot: false,
      cutoff,
    });
    offset += t.size + itemSpacing;
    unadjusted += itemMainAxisSize + itemSpacing;
  }
  return keylines;
}

function keylineListOf(main: number, spacing: number, alignment: Alignment, build: (s: KeylineListScope) => void) {
  const scope = new KeylineListScope();
  build(scope);
  return scope.createWithAlignment(main, spacing, alignment);
}

function keylineListWithPivot(
  main: number,
  spacing: number,
  pivotIndex: number,
  pivotOffset: number,
  build: (s: KeylineListScope) => void,
) {
  const scope = new KeylineListScope();
  build(scope);
  return scope.createWithPivot(main, spacing, pivotIndex, pivotOffset);
}

function lerpKeyline(a: Keyline, b: Keyline, t: number): Keyline {
  return {
    size: lerpF(a.size, b.size, t),
    offset: lerpF(a.offset, b.offset, t),
    unadjustedOffset: lerpF(a.unadjustedOffset, b.unadjustedOffset, t),
    isFocal: t < 0.5 ? a.isFocal : b.isFocal,
    isAnchor: t < 0.5 ? a.isAnchor : b.isAnchor,
    isPivot: t < 0.5 ? a.isPivot : b.isPivot,
    cutoff: lerpF(a.cutoff, b.cutoff, t),
  };
}

const lerpList = (from: KeylineList, to: KeylineList, t: number) =>
  new KeylineList(from.keylines.map((k, i) => lerpKeyline(k, to.at(i), t)));

// ── Keyline builders (Keylines.kt) ────────────────────────────────────────────────────────────

export function createLeftAlignedKeylineList(
  main: number,
  spacing: number,
  leftAnchorSize: number,
  rightAnchorSize: number,
  a: Arrangement,
) {
  return keylineListOf(main, spacing, 'start', (s) => {
    s.add(leftAnchorSize, true);
    for (let i = 0; i < a.largeCount; i++) s.add(a.largeSize);
    for (let i = 0; i < a.mediumCount; i++) s.add(a.mediumSize);
    for (let i = 0; i < a.smallCount; i++) s.add(a.smallSize);
    s.add(rightAnchorSize, true);
  });
}

export function createCenterAlignedKeylineList(
  main: number,
  spacing: number,
  leftAnchorSize: number,
  rightAnchorSize: number,
  a: Arrangement,
) {
  return keylineListOf(main, spacing, 'center', (s) => {
    s.add(leftAnchorSize, true);
    for (let i = 0; i < Math.trunc(a.smallCount / 2); i++) s.add(a.smallSize);
    for (let i = 0; i < Math.trunc(a.mediumCount / 2); i++) s.add(a.mediumSize);
    for (let i = 0; i < a.largeCount; i++) s.add(a.largeSize);
    for (let i = 0; i < Math.trunc(a.mediumCount / 2); i++) s.add(a.mediumSize);
    for (let i = 0; i < Math.trunc(a.smallCount / 2); i++) s.add(a.smallSize);
    s.add(rightAnchorSize, true);
  });
}

export function multiBrowseKeylineList(
  main: number,
  preferredItemSize: number,
  spacing: number,
  itemCount: number,
  minSmall = MIN_SMALL_ITEM_SIZE,
  maxSmall = MAX_SMALL_ITEM_SIZE,
): KeylineList {
  if (main === 0 || preferredItemSize === 0) return EMPTY;
  let smallCounts = [1];
  const mediumCounts = [1, 0];
  const targetLargeSize = Math.min(preferredItemSize, main);
  const targetSmallSize = clamp(targetLargeSize / 3, minSmall, maxSmall);
  const targetMediumSize = (targetLargeSize + targetSmallSize) / 2;
  if (main < minSmall * 2) smallCounts = [0];
  const minAvailableLargeSpace =
    main - targetMediumSize * Math.max(...mediumCounts) - maxSmall * Math.max(...smallCounts);
  const minLargeCount = Math.max(1, Math.floor(minAvailableLargeSpace / targetLargeSize));
  const maxLargeCount = Math.ceil(main / targetLargeSize);
  const largeCounts = Array.from({ length: maxLargeCount - minLargeCount + 1 }, (_, i) => maxLargeCount - i);
  let a = findLowestCostArrangement(
    main,
    spacing,
    targetSmallSize,
    minSmall,
    maxSmall,
    smallCounts,
    targetMediumSize,
    mediumCounts,
    targetLargeSize,
    largeCounts,
  );
  if (a != null && itemCountOf(a) > itemCount) {
    let surplus = itemCountOf(a) - itemCount;
    let smallCount = a.smallCount;
    let mediumCount = a.mediumCount;
    while (surplus > 0) {
      if (smallCount > 0) smallCount -= 1;
      else if (mediumCount > 1) mediumCount -= 1;
      surplus -= 1;
    }
    a = findLowestCostArrangement(
      main,
      spacing,
      targetSmallSize,
      minSmall,
      maxSmall,
      [smallCount],
      targetMediumSize,
      [mediumCount],
      targetLargeSize,
      largeCounts,
    );
  }
  if (a == null) return EMPTY;
  return createLeftAlignedKeylineList(main, spacing, ANCHOR_SIZE, ANCHOR_SIZE, a);
}

function calculateMediumChildSize(minimumMediumSize: number, largeItemSize: number, remainingSpace: number) {
  let medium = Math.max(remainingSpace * 1.5, minimumMediumSize);
  const threshold = largeItemSize * MEDIUM_LARGE_ITEM_DIFF_THRESHOLD;
  if (medium > threshold) medium = Math.min(Math.max(threshold, remainingSpace * 1.2), largeItemSize);
  return medium;
}

export function uncontainedKeylineList(main: number, itemSize: number, spacing: number): KeylineList {
  if (main === 0 || itemSize === 0) return EMPTY;
  const largeItemSize = Math.min(itemSize + spacing, main);
  const largeCount = Math.max(1, Math.floor(main / largeItemSize));
  const remainingSpace = main - largeCount * largeItemSize;
  const mediumCount = remainingSpace > 0 ? 1 : 0;
  const mediumItemSize = calculateMediumChildSize(ANCHOR_SIZE, largeItemSize, remainingSpace);
  const a: Arrangement = {
    priority: 0,
    smallSize: 0,
    smallCount: 0,
    mediumSize: mediumItemSize,
    mediumCount,
    largeSize: largeItemSize,
    largeCount,
  };
  const xSmallSize = Math.min(ANCHOR_SIZE, itemSize);
  const leftAnchorSize = Math.max(xSmallSize, mediumItemSize * 0.5);
  return createLeftAlignedKeylineList(main, spacing, leftAnchorSize, ANCHOR_SIZE, a);
}

export function heroKeylineList(
  main: number,
  preferredItemSize: number | null,
  spacing: number,
  itemCount: number,
  isCentered = false,
  minSmall = MIN_SMALL_ITEM_SIZE,
  maxSmall = MAX_SMALL_ITEM_SIZE,
): KeylineList {
  if (main === 0) return EMPTY;
  const shouldCenter = isCentered && itemCount >= 3;
  let smallCounts = itemCount <= 1 ? [0] : shouldCenter ? [2] : [1];
  const targetLargeSize = Math.min(preferredItemSize ?? main, main);
  const targetSmallSize = clamp(targetLargeSize / 3, minSmall, maxSmall);
  const fullscreenThreshold = minSmall * Math.max(...smallCounts) + minSmall * 1.25;
  if (main < fullscreenThreshold) smallCounts = [0];
  const minAvailableLargeSpace = main - minSmall * Math.max(...smallCounts);
  const minLargeCount = Math.max(1, Math.floor(minAvailableLargeSpace / targetLargeSize));
  const maxLargeCount = Math.ceil(main / targetLargeSize);
  const largeCounts = Array.from({ length: maxLargeCount - minLargeCount + 1 }, (_, i) => maxLargeCount - i);
  const a = findLowestCostArrangement(
    main,
    spacing,
    targetSmallSize,
    minSmall,
    maxSmall,
    smallCounts,
    0,
    [0],
    targetLargeSize,
    largeCounts,
  );
  if (a == null) return EMPTY;
  return shouldCenter && itemCount >= itemCountOf(a)
    ? createCenterAlignedKeylineList(main, spacing, ANCHOR_SIZE, ANCHOR_SIZE, a)
    : createLeftAlignedKeylineList(main, spacing, ANCHOR_SIZE, ANCHOR_SIZE, a);
}

// ── Strategy (Strategy.kt) ────────────────────────────────────────────────────────────────────

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
    (s) => {
      for (const k of from.keylines) s.add(k.size - Math.abs(sizeReduction), k.isAnchor);
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
  const [k] = moved.splice(srcIndex, 1);
  moved.splice(dstIndex, 0, k!);
  return keylineListWithPivot(main, spacing, newPivotIndex, newPivotOffset, (s) => {
    for (const m of moved) s.add(m.size, m.isAnchor);
  });
}

function getStartKeylineSteps(d: KeylineList, main: number, spacing: number, beforePadding: number): KeylineList[] {
  if (d.length === 0) return [];
  const steps = [d];
  if (d.isFirstFocalItemAtStartOfContainer()) {
    if (beforePadding !== 0)
      steps.push(
        createShiftedKeylineListForContentPadding(d, main, spacing, beforePadding, d.firstFocal, d.firstFocalIndex),
      );
    return steps;
  }
  const startIndex = d.firstNonAnchorIndex;
  const endIndex = d.firstFocalIndex;
  const numberOfSteps = endIndex - startIndex;
  if (numberOfSteps <= 0 && d.firstFocal.cutoff > 0) {
    steps.push(moveKeylineAndCreateShiftedKeylineList(d, 0, 0, main, spacing));
    return steps;
  }
  for (let i = 0; i < numberOfSteps; i++) {
    const prev = steps[steps.length - 1]!;
    const originalItemIndex = startIndex + i;
    let dstIndex = d.lastIndex;
    if (originalItemIndex > 0) dstIndex = prev.firstIndexAfterFocalRangeWithSize(d.at(originalItemIndex - 1).size) - 1;
    steps.push(moveKeylineAndCreateShiftedKeylineList(prev, d.firstNonAnchorIndex, dstIndex, main, spacing));
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

function getEndKeylineSteps(d: KeylineList, main: number, spacing: number, afterPadding: number): KeylineList[] {
  if (d.length === 0) return [];
  const steps = [d];
  if (d.isLastFocalItemAtEndOfContainer(main)) {
    if (afterPadding !== 0)
      steps.push(
        createShiftedKeylineListForContentPadding(d, main, spacing, -afterPadding, d.lastFocal, d.lastFocalIndex),
      );
    return steps;
  }
  const startIndex = d.lastFocalIndex;
  const endIndex = d.lastNonAnchorIndex;
  const numberOfSteps = endIndex - startIndex;
  if (numberOfSteps <= 0 && d.lastFocal.cutoff > 0) {
    steps.push(moveKeylineAndCreateShiftedKeylineList(d, 0, 0, main, spacing));
    return steps;
  }
  for (let i = 0; i < numberOfSteps; i++) {
    const prev = steps[steps.length - 1]!;
    const originalItemIndex = endIndex - i;
    let dstIndex = 0;
    if (originalItemIndex < d.lastIndex)
      dstIndex = prev.lastIndexBeforeFocalRangeWithSize(d.at(originalItemIndex + 1).size) + 1;
    steps.push(moveKeylineAndCreateShiftedKeylineList(prev, d.lastNonAnchorIndex, dstIndex, main, spacing));
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
    for (const s of [...this.startKeylineSteps, ...this.endKeylineSteps]) {
      if (s.minSize < min) min = s.minSize;
      if (s.maxSize > max) max = s.maxSize;
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

/** carouselItem: the mask size and translation of item `index` at `scrollOffset`. */
export function itemPlacement(strategy: Strategy, index: number, scrollOffset: number, maxScrollOffset: number) {
  const keylines = strategy.getKeylineListForScrollOffset(scrollOffset, maxScrollOffset);
  const size = strategy.itemMainAxisSize;
  const withSpacing = size + strategy.itemSpacing;
  const unadjustedCenter = index * withSpacing + size / 2 - scrollOffset;
  const before = keylines.getKeylineBefore(unadjustedCenter);
  const after = keylines.getKeylineAfter(unadjustedCenter);
  const progress =
    before === after
      ? 1
      : (unadjustedCenter - before.unadjustedOffset) / (after.unadjustedOffset - before.unadjustedOffset);
  const k = lerpKeyline(before, after, progress);
  let translation = k.offset - unadjustedCenter;
  if (before === after) translation += (unadjustedCenter - k.unadjustedOffset) / k.size;
  return { maskSize: k.size, translation };
}

export function maxScrollOffset(strategy: Strategy, itemCount: number) {
  const total = strategy.itemMainAxisSize * itemCount + strategy.itemSpacing * (itemCount - 1);
  return Math.max(0, total - strategy.availableSpace);
}
