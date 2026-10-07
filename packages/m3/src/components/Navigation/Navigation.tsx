import { Children, useMemo, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex.ts';
import { NavContext } from './context.ts';

export type { NavigationItemLayout } from './context.ts';
export { NavigationItem, NavigationScope } from './NavigationItem.tsx';
export type { NavigationItemProps } from './NavigationItem.tsx';
export { NavigationRail, NavigationRailSection } from './NavigationRail.tsx';
export type { NavigationRailProps, NavigationRailSectionProps } from './NavigationRail.tsx';

/*
 * Figma kit, "Navigation" page (Navigation bar / rail building blocks; Compose ShortNavigationBar,
 * NavigationRail, WideNavigationRail, NavigationItem).
 *   Vertical item: a 56×32 pill (16px corners; 56×56 / 28px without a label) over a 12/16
 *   label-medium label 4px below, 6px vertical padding. Selected: Secondary Container pill, On
 *   Secondary Container icon (the filled glyph), Secondary label; otherwise On Surface Variant.
 *   Horizontal (wide bar): the pill is 40px tall and holds icon + label (16 / 8px padding, 4px gap).
 *   Rail horizontal (expanded rail): a 56px fully rounded pill, 16px padding, 8px gaps, label-large.
 *   Layers sit on the pill: hover 8%, focus and press 10% (no ripple). Badges sit on the icon's
 *   top-right (small 6px at +10/−? / large 16px), large ones after the label in the expanded rail.
 * Motion (Compose NavigationItem.kt): the selected indicator's width and alpha follow one default
 * spatial progress (alpha clamps at 1) — bar pills grow from their centre, rail indicators from
 * their start edge. Bar icon / label colours switch without animation; rail labels fade on default
 * effects. Expanding / collapsing the rail morphs every item on one default spatial progress
 * (AnimatedNavigationItem, see railMorph.ts): size, indicator, icon position, the label jumping
 * beside the icon halfway with alpha 4(p − ½)², item spacing and minimum height.
 * Parts: ./NavigationItem.tsx (items, their rail morph), ./NavigationRail.tsx (rail, sections,
 * the morph progress), ./railMorph.ts (the morph geometry).
 */
/** Kit: a horizontal-item bar's inline inset is 280 − 40px per item (160 / 120 / 80 / 40 for 3–6 items). */
const HORIZONTAL_INSET_BASE = 280;
const HORIZONTAL_INSET_STEP = 40;

const s = stylex.create({
  bar: {
    display: 'flex',
    boxSizing: 'border-box',
    width: '100%',
    height: 64,
    backgroundColor: color.surfaceContainer,
  },
  barHorizontal: { justifyContent: 'space-between' },
  barInset: (px: number) => ({ paddingInline: px }),
});

// ── Bar ───────────────────────────────────────────────────────────────────────────────────────

export interface NavigationBarProps {
  value?: unknown;
  onValueChange?: (value: unknown) => void;
  /** 'vertical' (icon over label, compact windows) or 'horizontal' (icon + label in a row). */
  itemLayout?: 'vertical' | 'horizontal';
  children: ReactNode;
  'aria-label'?: string;
  sx?: StyleXStyles;
}

/** Bottom navigation bar (Compose ShortNavigationBar): 64px, Surface Container. */
export function NavigationBar({
  value,
  onValueChange,
  itemLayout = 'vertical',
  children,
  'aria-label': ariaLabel,
  sx,
}: NavigationBarProps) {
  // Rendered items only (conditional children leave false / null behind).
  const count = Children.toArray(children).length;
  // Kit: horizontal-item bars inset their items 160 / 120 / 80 / 40px for 3 / 4 / 5 / 6 items.
  const inset = itemLayout === 'horizontal' ? Math.max(0, HORIZONTAL_INSET_BASE - HORIZONTAL_INSET_STEP * count) : 0;
  const ctx = useMemo(
    () => ({ layout: itemLayout, value, onSelect: onValueChange, showLabels: true, fill: true }),
    [itemLayout, value, onValueChange],
  );
  return (
    <nav
      aria-label={ariaLabel}
      {...stylex.props(s.bar, itemLayout === 'horizontal' && [s.barHorizontal, s.barInset(inset)], sx)}
    >
      <NavContext value={ctx}>{children}</NavContext>
    </nav>
  );
}
