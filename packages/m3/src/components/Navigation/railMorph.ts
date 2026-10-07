/*
 * Collapsed ⇄ expanded rail item geometry — a port of Compose's AnimatedNavigationItem layout
 * (material3 NavigationItem.kt: AnimatedMeasurePolicy + placeAnimatedLabelAndIcon, androidx-main)
 * with WideNavigationRailItem's values (WideNavigationRail.kt) and the rail's per-item spacing /
 * minimum height (WideNavigationRailLayout). `p` is iconPositionProgress: 0 = collapsed (icon over
 * label), 1 = expanded (icon beside label), sprung on DefaultSpatial (it may overshoot past 1).
 * Positions are px from the item's top-left; the item spans the rail from x 0 (the 20px start
 * padding is inside it, as in Compose). At p = 0 / 1 this is exactly the kit's collapsed /
 * expanded item.
 */

/** WNRItemHorizontalPadding. */
const ITEM_H_PADDING = 20;
/** NavigationRailBaselineItemTokens.IconSize. */
const ICON = 24;
/** Indicator padding: collapsed (56 − 24) / 2 × (32 − 24) / 2; expanded FullWidthLeadingSpace 16 × (56 − 24) / 2. */
const PAD_H = 16;
const PAD_V_COLLAPSED = 4;
const PAD_V_EXPANDED = 16;
/** NavigationRailVerticalItemTokens.IconLabelSpace / NavigationRailHorizontalItemTokens.IconLabelSpace. */
const TOP_ICON_LABEL_GAP = 4;
const START_ICON_LABEL_GAP = 8;
/** TopIconItemMinHeight (ContainerHeight 64) → minimumA11ySize (48); item spacing 4 → 0. */
const MIN_HEIGHT_COLLAPSED = 64;
const MIN_HEIGHT_EXPANDED = 48;
const SPACING_COLLAPSED = 4;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Compose `lerp(Int, Int, Float)`: start + round((stop − start) × fraction). */
const lerpInt = (a: number, b: number, t: number) => a + Math.round((b - a) * t);

export interface RailLabelMetrics {
  /** Label box in the collapsed text style (label-medium). */
  topWidth: number;
  topHeight: number;
  /** Label box in the expanded text style (label-large). */
  startWidth: number;
  startHeight: number;
}

export interface RailItemGeometry {
  width: number;
  height: number;
  /** Selected indicator box (full width; the selection progress scales it from its start). */
  indicator: { x: number; y: number; width: number; height: number };
  /** Hover / focus / press layer box (Compose IndicatorRipple). */
  ripple: { x: number; y: number; width: number; height: number };
  icon: { x: number; y: number };
  label: { x: number; y: number; alpha: number; style: 'top' | 'start' };
}

/**
 * @param toExpanded the target layout (Compose: iconPosition == Start).
 */
export function railItemGeometry(p: number, toExpanded: boolean, m: RailLabelMetrics): RailItemGeometry {
  p = Math.max(0, p); // iconPositionProgress.coerceAtLeast(0f)
  const isTop = !toExpanded;
  // AnimatedNavigationItem: the top style only while collapsing and under halfway.
  const style = isTop && p < 0.5 ? 'top' : 'start';
  const labelW = style === 'top' ? m.topWidth : m.startWidth;
  const labelH = style === 'top' ? m.topHeight : m.startHeight;
  // DynamicPaddingValues clamps its progress to 0..1.
  const dp = Math.min(1, p);
  const padV = lerp(PAD_V_COLLAPSED, PAD_V_EXPANDED, dp);

  const indicatorWidth = lerpInt(ICON, ICON + labelW + START_ICON_LABEL_GAP, p) + 2 * PAD_H;
  const indicatorHeight = lerpInt(ICON, Math.max(ICON, labelH), p) + Math.round(2 * padV);

  const widthTop = Math.max(labelW, ICON + 2 * ITEM_H_PADDING + 2 * PAD_H);
  const widthStart = indicatorWidth + ITEM_H_PADDING;
  const width = widthTop + (widthStart - widthTop) * p;
  const heightTop = Math.round(indicatorHeight + TOP_ICON_LABEL_GAP + labelH);
  const contentHeight = lerpInt(heightTop, indicatorHeight, p);

  const rippleX = lerpInt(ITEM_H_PADDING, Math.round((ITEM_H_PADDING + width - indicatorWidth) / 2), p);
  const iconX = ITEM_H_PADDING + PAD_H;
  const iconYTop = Math.round(padV);
  const iconYStart = (contentHeight - ICON) / 2 - iconYTop;
  const iconY = lerpInt(0, iconYStart, p) + iconYTop;

  const labelXTop = (ICON + 2 * PAD_H + 2 * ITEM_H_PADDING - labelW) / 2;
  const labelYTop = iconY + ICON + Math.round(padV + TOP_ICON_LABEL_GAP);
  const startOffset = isTop && p > 0 ? 0 : ITEM_H_PADDING * (1 - p);
  const labelXStart = iconX + ICON + START_ICON_LABEL_GAP - startOffset;
  const labelYStart = (contentHeight - labelH) / 2;
  const labelX = p < 0.5 ? labelXTop : labelXStart * p;
  const labelY = p < 0.5 ? labelYTop : labelYStart;

  // The rail measures items with minHeight animating 64 → 48 (same spring); a shorter item is
  // centred in it (Placeable alignment within constraints).
  const minHeight = lerp(MIN_HEIGHT_COLLAPSED, MIN_HEIGHT_EXPANDED, p);
  const height = Math.max(minHeight, contentHeight);
  const dy = (height - contentHeight) / 2;

  return {
    width,
    height,
    indicator: { x: ITEM_H_PADDING, y: dy, width: indicatorWidth, height: indicatorHeight },
    ripple: { x: rippleX, y: dy, width: indicatorWidth, height: indicatorHeight },
    icon: { x: iconX, y: dy + iconY },
    // Compose truncates labelX to whole px; kept exact so the end frames meet the kit's layout.
    label: { x: labelX, y: dy + labelY, alpha: 4 * (p - 0.5) * (p - 0.5), style },
  };
}

/** WideNavigationRailLayout: itemVerticalSpacedBy 4 → 0 on the same progress. */
export function railItemSpacing(p: number) {
  return lerp(SPACING_COLLAPSED, 0, p);
}
