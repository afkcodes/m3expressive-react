import { useEffect, useState, type ReactNode, type RefObject } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex';
import { motion } from '../../tokens/motion.stylex';
import { typescale } from '../../tokens/typescale.ts';
import { legacyLeading } from '../../primitives/textBox.ts';
import { StandardIconTintContext } from '../IconButton/context.ts';

export type TopAppBarSize = 'small' | 'medium' | 'large';

/*
 * Figma kit, "App bars" page (App bar 58114:20565; Compose TopAppBar / CenterAlignedTopAppBar /
 * MediumFlexibleTopAppBar / LargeFlexibleTopAppBar, BottomAppBar).
 *   Small: 64px, 8px vertical / 4px side padding, 48px icon buttons, a title-large title (centred
 *   variant: centred across the bar) or an image / search field in its place (8px from the icons).
 *   Medium / large: a 56px icon row over a 28/36 (medium) or 36/44 (large) title 16px in, 8px
 *   below the row and 12px above the bottom; subtitles label-medium / label-large / title-medium.
 *   Flat bars have no container; scrolled bars Surface Container.
 * Motion (Compose): the small bar's container fades to the scrolled colour on default effects once
 * content scrolls under it; medium / large collapse with the scroll (height → 64px), the large
 * title fading out (1 − f) as the row title fades in (cubic 0.8, 0, 0.8, 0.15) and the container
 * colour following FastOutLinearIn(f).
 */
const s = stylex.create({
  // flexShrink 0: in a column layout the bar keeps its height when the content below overflows.
  bar: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    boxSizing: 'border-box',
    width: '100%',
    overflow: 'hidden',
    color: color.onSurface,
    backgroundColor: 'transparent',
    transitionProperty: 'background-color',
    transitionDuration: motion.defaultEffectsDuration,
    transitionTimingFunction: motion.defaultEffectsEasing,
  },
  scrolled: { backgroundColor: color.surfaceContainer },
  row: {
    display: 'flex',
    alignItems: 'center',
    columnGap: 4,
    boxSizing: 'border-box',
    height: 64,
    paddingBlock: 8,
    paddingInline: 4,
    flexShrink: 0,
  },
  rowTwoRows: { height: 56, paddingBottom: 0, alignItems: 'flex-start' },
  rowSearch: { columnGap: 8 },
  slot: { display: 'flex', alignItems: 'center', flexShrink: 0 },
  centre: { display: 'flex', alignItems: 'center', flexGrow: 1, minWidth: 0, height: '100%' },
  centreCentered: { justifyContent: 'center' },
  // Centred titles centre across the whole bar (Compose CenterAlignedTopAppBar), not between icons.
  centredTitle: { position: 'absolute', left: 56, right: 56, top: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' },
  trailing: { display: 'flex', alignItems: 'center', flexShrink: 0, marginInlineStart: 'auto' },
  big: { paddingInline: 16, paddingTop: 8, paddingBottom: 12, flexShrink: 0 },
  fade: (o: number) => ({ opacity: o }),
  height: (px: number) => ({ height: px }),
  // ── title block ──
  title: { display: 'flex', flexDirection: 'column', minWidth: 0, flexGrow: 1 },
  titleCentered: { alignItems: 'center', textAlign: 'center' },
  titleMediumGap: { rowGap: 4 },
  titleLargeGap: { rowGap: 8 },
  headline: { margin: 0, color: color.onSurface, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' },
  subtitle: { margin: 0, color: color.onSurfaceVariant, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' },
  // ── bottom app bar ──
  bottom: {
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
    boxSizing: 'border-box',
    width: '100%',
    height: 80,
    paddingInlineStart: 4,
    paddingInlineEnd: 16,
    backgroundColor: color.surfaceContainer,
  },
  bottomActions: { display: 'flex', alignItems: 'center', columnGap: 8 },
  bottomFab: { marginInlineStart: 'auto', display: 'flex' },
});

const HEADLINE = { small: typescale.titleLarge, medium: typescale.headlineMedium, large: typescale.displaySmall } as const;
const SUBTITLE = { small: typescale.labelMedium, medium: typescale.labelLarge, large: typescale.titleMedium } as const;
const EXPANDED = { small: 64, medium: 112, large: 120 } as const;
const LEGACY_HEADLINE = { small: legacyLeading.shift(22, 28), medium: legacyLeading.shift(28, 36), large: legacyLeading.shift(36, 44) } as const;
const LEGACY_SUBTITLE = { small: legacyLeading.shift(12, 16), medium: legacyLeading.shift(14, 20), large: legacyLeading.shift(16, 24) } as const;
// Measured on the kit layers: the small title sits 1px above Figma's legacy baseline and the large
// subtitle 1px below it (every other title / subtitle lands exactly on it).
const nudge = stylex.create({ up: { transform: 'translateY(-1px)' }, down: { transform: 'translateY(1px)' } });

export interface AppBarTitleProps {
  size?: TopAppBarSize;
  centered?: boolean;
  children: ReactNode;
  subtitle?: ReactNode;
  sx?: StyleXStyles;
}

/** An app bar's title (and optional subtitle), sized per bar (kit "Text Small / Medium / Large"). */
export function AppBarTitle({ size = 'small', centered = false, children, subtitle, sx }: AppBarTitleProps) {
  return (
    <div {...stylex.props(s.title, centered && s.titleCentered, size === 'medium' && s.titleMediumGap, size === 'large' && s.titleLargeGap, sx)}>
      {/* The kit's app bar text layers use Figma's legacy line height (glyphs sit higher). */}
      <h1 {...stylex.props(HEADLINE[size], s.headline, LEGACY_HEADLINE[size], size === 'small' && nudge.up)}>{children}</h1>
      {subtitle != null && <p {...stylex.props(SUBTITLE[size], s.subtitle, LEGACY_SUBTITLE[size], size === 'large' && nudge.down)}>{subtitle}</p>}
    </div>
  );
}

/** Scroll position → { overlapped, collapsedFraction } for a bar of `size` over `target`. */
export function useAppBarScroll(target: RefObject<HTMLElement | null> | undefined, size: TopAppBarSize) {
  const [state, setState] = useState({ overlapped: false, fraction: 0 });
  useEffect(() => {
    const el = target?.current;
    if (!el) return;
    const range = EXPANDED[size] - 64;
    const update = () => {
      const top = el.scrollTop;
      setState({ overlapped: top > 0, fraction: range > 0 ? Math.min(1, Math.max(0, top / range)) : 0 });
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    return () => el.removeEventListener('scroll', update);
  }, [target, size]);
  return state;
}

/** Compose TopTitleAlphaEasing: cubic-bezier(0.8, 0, 0.8, 0.15). */
function topTitleAlpha(f: number) {
  // Solve x(t) = f for the cubic, then return y(t).
  const x = (t: number) => 3 * 0.8 * t * (1 - t) ** 2 + 3 * 0.8 * t * t * (1 - t) + t ** 3;
  const y = (t: number) => 3 * 0.15 * t * t * (1 - t) + t ** 3;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    if (x(mid) < f) lo = mid;
    else hi = mid;
  }
  return y((lo + hi) / 2);
}

export interface TopAppBarProps {
  size?: TopAppBarSize;
  /** Small bars: centre the title across the bar. */
  centered?: boolean;
  title?: ReactNode;
  subtitle?: ReactNode;
  /** Leading icon button (navigation / menu). */
  navigationIcon?: ReactNode;
  /** Trailing icon buttons / avatar. */
  actions?: ReactNode;
  /** Small bars: custom content in the title's place (e.g. an image). */
  content?: ReactNode;
  /** Small bars: a search field between the icons. */
  search?: ReactNode;
  /** Content is scrolled under the bar (Surface Container). Derived from `scrollTarget` if set. */
  scrolled?: boolean;
  /** Medium / large: 0 (expanded) … 1 (collapsed to 64px). Derived from `scrollTarget` if set. */
  collapsedFraction?: number;
  /** The scroll container under the bar: drives `scrolled` and `collapsedFraction`. */
  scrollTarget?: RefObject<HTMLElement | null>;
  sx?: StyleXStyles;
}

export function TopAppBar({
  size = 'small',
  centered = false,
  title,
  subtitle,
  navigationIcon,
  actions,
  content,
  search,
  scrolled: scrolledProp,
  collapsedFraction: fractionProp,
  scrollTarget,
  sx,
}: TopAppBarProps) {
  const scroll = useAppBarScroll(scrollTarget, size);
  const twoRows = size !== 'small';
  const fraction = fractionProp ?? (scrollTarget ? scroll.fraction : 0);
  const scrolled = scrolledProp ?? (scrollTarget ? scroll.overlapped : false);
  // Two-row bars: the container follows the collapse (FastOutLinearIn), else the overlap.
  const onContainer = twoRows ? scrolled || fraction > 0 : scrolled;

  if (!twoRows) {
    return (
      <header {...stylex.props(s.bar, onContainer && s.scrolled, sx)}>
        <div {...stylex.props(s.row, search != null && s.rowSearch)}>
          {navigationIcon != null && (
          <span {...stylex.props(s.slot)}>
            {/* The navigation icon is On Surface; actions keep On Surface Variant. */}
            <StandardIconTintContext value="on-surface">{navigationIcon}</StandardIconTintContext>
          </span>
        )}
          {search != null ? (
            <span {...stylex.props(s.centre)}>{search}</span>
          ) : content != null ? (
            <span {...stylex.props(s.centre)}>{content}</span>
          ) : centered ? (
            <span {...stylex.props(s.centre)} />
          ) : (
            <span {...stylex.props(s.centre)}>
              <AppBarTitle subtitle={subtitle}>{title}</AppBarTitle>
            </span>
          )}
          {actions != null && <span {...stylex.props(s.trailing)}>{actions}</span>}
        </div>
        {centered && search == null && content == null && (
          <div {...stylex.props(s.centredTitle)}>
            <AppBarTitle centered subtitle={subtitle}>
              {title}
            </AppBarTitle>
          </div>
        )}
      </header>
    );
  }
  const expanded = EXPANDED[size];
  const height = expanded - fraction * (expanded - 64);
  return (
    <header {...stylex.props(s.bar, onContainer && s.scrolled, fractionProp != null || scrollTarget ? s.height(height) : null, sx)}>
      <div {...stylex.props(s.row, s.rowTwoRows)}>
        {navigationIcon != null && (
          <span {...stylex.props(s.slot)}>
            {/* The navigation icon is On Surface; actions keep On Surface Variant. */}
            <StandardIconTintContext value="on-surface">{navigationIcon}</StandardIconTintContext>
          </span>
        )}
        <span {...stylex.props(s.centre, s.fade(topTitleAlpha(fraction)))} aria-hidden={fraction < 0.5}>
          {fraction > 0 && <AppBarTitle>{title}</AppBarTitle>}
        </span>
        {actions != null && <span {...stylex.props(s.trailing)}>{actions}</span>}
      </div>
      <div {...stylex.props(s.big, s.fade(1 - fraction))} aria-hidden={fraction >= 0.5}>
        <AppBarTitle size={size} centered={centered} subtitle={subtitle}>
          {title}
        </AppBarTitle>
      </div>
    </header>
  );
}

export interface BottomAppBarProps {
  /** Icon buttons, from the start. */
  actions?: ReactNode;
  /** A FAB at the end (use `Fab elevated={false}`: the kit's bottom-bar FAB has no shadow). */
  fab?: ReactNode;
  sx?: StyleXStyles;
}

/** Baseline bottom app bar: 80px Surface Container, actions from the start, FAB at the end. */
export function BottomAppBar({ actions, fab, sx }: BottomAppBarProps) {
  return (
    <div role="toolbar" {...stylex.props(s.bottom, sx)}>
      {actions != null && <div {...stylex.props(s.bottomActions)}>{actions}</div>}
      {fab != null && <div {...stylex.props(s.bottomFab)}>{fab}</div>}
    </div>
  );
}
