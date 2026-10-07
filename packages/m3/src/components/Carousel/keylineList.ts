/* Port of androidx.compose.material3.carousel KeylineList.kt (see ./keylines.ts). */
import { lerpF } from './keylineMath.ts';

export type Alignment = 'start' | 'center' | 'end';

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

function findLastIndex<T>(items: T[], predicate: (item: T) => boolean) {
  for (let i = items.length - 1; i >= 0; i--) if (predicate(items[i]!)) return i;
  return -1;
}

export const EMPTY = new KeylineList([]);

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
    const tmpKeyline = tmp[i]!;
    const tmpOffset = offset - tmpKeyline.size / 2;
    const tmpUnadjusted = unadjusted - itemMainAxisSize / 2;
    const cutoff = isCutoffLeft(tmpKeyline.size, tmpOffset) ? Math.abs(tmpOffset - tmpKeyline.size / 2) : 0;
    keylines.unshift({
      size: tmpKeyline.size,
      offset: tmpOffset,
      unadjustedOffset: tmpUnadjusted,
      isFocal: focal(i),
      isAnchor: tmpKeyline.isAnchor,
      isPivot: false,
      cutoff,
    });
    offset -= tmpKeyline.size + itemSpacing;
    unadjusted -= itemMainAxisSize + itemSpacing;
  }

  offset = pivotOffset + itemMainAxisSize / 2 + itemSpacing;
  unadjusted = pivotOffset + itemMainAxisSize / 2 + itemSpacing;
  for (let i = pivotIndex + 1; i < tmp.length; i++) {
    const tmpKeyline = tmp[i]!;
    const tmpOffset = offset + tmpKeyline.size / 2;
    const tmpUnadjusted = unadjusted + itemMainAxisSize / 2;
    const cutoff = isCutoffRight(tmpKeyline.size, tmpOffset, carouselMainAxisSize)
      ? tmpOffset + tmpKeyline.size / 2 - carouselMainAxisSize
      : 0;
    keylines.push({
      size: tmpKeyline.size,
      offset: tmpOffset,
      unadjustedOffset: tmpUnadjusted,
      isFocal: focal(i),
      isAnchor: tmpKeyline.isAnchor,
      isPivot: false,
      cutoff,
    });
    offset += tmpKeyline.size + itemSpacing;
    unadjusted += itemMainAxisSize + itemSpacing;
  }
  return keylines;
}

export function keylineListOf(
  main: number,
  spacing: number,
  alignment: Alignment,
  build: (scope: KeylineListScope) => void,
) {
  const scope = new KeylineListScope();
  build(scope);
  return scope.createWithAlignment(main, spacing, alignment);
}

export function keylineListWithPivot(
  main: number,
  spacing: number,
  pivotIndex: number,
  pivotOffset: number,
  build: (scope: KeylineListScope) => void,
) {
  const scope = new KeylineListScope();
  build(scope);
  return scope.createWithPivot(main, spacing, pivotIndex, pivotOffset);
}

export function lerpKeyline(from: Keyline, to: Keyline, fraction: number): Keyline {
  return {
    size: lerpF(from.size, to.size, fraction),
    offset: lerpF(from.offset, to.offset, fraction),
    unadjustedOffset: lerpF(from.unadjustedOffset, to.unadjustedOffset, fraction),
    isFocal: fraction < 0.5 ? from.isFocal : to.isFocal,
    isAnchor: fraction < 0.5 ? from.isAnchor : to.isAnchor,
    isPivot: fraction < 0.5 ? from.isPivot : to.isPivot,
    cutoff: lerpF(from.cutoff, to.cutoff, fraction),
  };
}

export const lerpList = (from: KeylineList, to: KeylineList, fraction: number) =>
  new KeylineList(from.keylines.map((k, i) => lerpKeyline(k, to.at(i), fraction)));
