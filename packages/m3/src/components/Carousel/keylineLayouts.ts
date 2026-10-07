/* Port of androidx.compose.material3.carousel Keylines.kt (see ./keylines.ts). */
import { findLowestCostArrangement, itemCountOf, type Arrangement } from './arrangement.ts';
import { EMPTY, keylineListOf, type KeylineList } from './keylineList.ts';
import { clamp } from './keylineMath.ts';

export const MIN_SMALL_ITEM_SIZE = 40;
export const MAX_SMALL_ITEM_SIZE = 56;
const ANCHOR_SIZE = 10;
const MEDIUM_LARGE_ITEM_DIFF_THRESHOLD = 0.85;

export function createLeftAlignedKeylineList(
  main: number,
  spacing: number,
  leftAnchorSize: number,
  rightAnchorSize: number,
  arrangement: Arrangement,
) {
  return keylineListOf(main, spacing, 'start', (scope) => {
    scope.add(leftAnchorSize, true);
    for (let i = 0; i < arrangement.largeCount; i++) scope.add(arrangement.largeSize);
    for (let i = 0; i < arrangement.mediumCount; i++) scope.add(arrangement.mediumSize);
    for (let i = 0; i < arrangement.smallCount; i++) scope.add(arrangement.smallSize);
    scope.add(rightAnchorSize, true);
  });
}

export function createCenterAlignedKeylineList(
  main: number,
  spacing: number,
  leftAnchorSize: number,
  rightAnchorSize: number,
  arrangement: Arrangement,
) {
  return keylineListOf(main, spacing, 'center', (scope) => {
    scope.add(leftAnchorSize, true);
    for (let i = 0; i < Math.trunc(arrangement.smallCount / 2); i++) scope.add(arrangement.smallSize);
    for (let i = 0; i < Math.trunc(arrangement.mediumCount / 2); i++) scope.add(arrangement.mediumSize);
    for (let i = 0; i < arrangement.largeCount; i++) scope.add(arrangement.largeSize);
    for (let i = 0; i < Math.trunc(arrangement.mediumCount / 2); i++) scope.add(arrangement.mediumSize);
    for (let i = 0; i < Math.trunc(arrangement.smallCount / 2); i++) scope.add(arrangement.smallSize);
    scope.add(rightAnchorSize, true);
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
  let arrangement = findLowestCostArrangement(
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
  if (arrangement != null && itemCountOf(arrangement) > itemCount) {
    let surplus = itemCountOf(arrangement) - itemCount;
    let smallCount = arrangement.smallCount;
    let mediumCount = arrangement.mediumCount;
    while (surplus > 0) {
      if (smallCount > 0) smallCount -= 1;
      else if (mediumCount > 1) mediumCount -= 1;
      surplus -= 1;
    }
    arrangement = findLowestCostArrangement(
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
  if (arrangement == null) return EMPTY;
  return createLeftAlignedKeylineList(main, spacing, ANCHOR_SIZE, ANCHOR_SIZE, arrangement);
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
  const arrangement: Arrangement = {
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
  return createLeftAlignedKeylineList(main, spacing, leftAnchorSize, ANCHOR_SIZE, arrangement);
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
  const arrangement = findLowestCostArrangement(
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
  if (arrangement == null) return EMPTY;
  return shouldCenter && itemCount >= itemCountOf(arrangement)
    ? createCenterAlignedKeylineList(main, spacing, ANCHOR_SIZE, ANCHOR_SIZE, arrangement)
    : createLeftAlignedKeylineList(main, spacing, ANCHOR_SIZE, ANCHOR_SIZE, arrangement);
}
