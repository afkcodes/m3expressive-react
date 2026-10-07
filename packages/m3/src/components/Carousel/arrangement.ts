/* Port of androidx.compose.material3.carousel Arrangement.kt (see ./keylines.ts). */
import { clamp } from './keylineMath.ts';

const MEDIUM_ITEM_FLEX_PERCENTAGE = 0.1;

export interface Arrangement {
  priority: number;
  smallSize: number;
  smallCount: number;
  mediumSize: number;
  mediumCount: number;
  largeSize: number;
  largeCount: number;
}

export const itemCountOf = (arrangement: Arrangement) =>
  arrangement.largeCount + arrangement.mediumCount + arrangement.smallCount;

function isValid(arrangement: Arrangement): boolean {
  if (arrangement.largeCount > 0 && arrangement.smallCount > 0 && arrangement.mediumCount > 0)
    return arrangement.largeSize > arrangement.mediumSize && arrangement.mediumSize > arrangement.smallSize;
  if (arrangement.largeCount > 0 && arrangement.smallCount > 0) return arrangement.largeSize > arrangement.smallSize;
  return true;
}

const cost = (arrangement: Arrangement, targetLargeSize: number) =>
  isValid(arrangement) ? Math.abs(targetLargeSize - arrangement.largeSize) * arrangement.priority : Number.MAX_VALUE;

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

export function findLowestCostArrangement(
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
        const arrangement = fit(
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
        if (lowest == null || cost(arrangement, targetLargeSize) < cost(lowest, targetLargeSize)) {
          lowest = arrangement;
          if (cost(lowest, targetLargeSize) === 0) return lowest;
        }
        priority++;
      }
    }
  }
  return lowest;
}
