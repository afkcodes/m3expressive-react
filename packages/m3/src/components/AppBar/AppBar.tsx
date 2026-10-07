import { useLayoutEffect, useRef, useState, type ComponentPropsWithRef, type ReactNode, type RefObject } from 'react';
import * as stylex from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex.ts';
import { motion } from '../../tokens/motion.stylex.ts';
import { typescale } from '../../tokens/typescale.ts';
import { legacyLeading } from '../../primitives/textBox.ts';
import type { SxProps } from '../../primitives/types.ts';
import { useMergedRefs } from '../../hooks/useMergedRefs.ts';
import { cubicBezier, fastOutLinearIn } from '../../motion/easing.ts';
import { StandardIconTintContext } from '../IconButton/context.ts';
import {
  COLLAPSED_HEIGHT,
  EXPANDED_HEIGHT,
  useAppBarScrollEvents,
  type AppBarScrollState,
  type TopAppBarSize,
} from './useAppBarScroll.ts';

export { useAppBarScroll } from './useAppBarScroll.ts';
export type { AppBarScrollOptions, AppBarScrollState, TopAppBarSize } from './useAppBarScroll.ts';
export { BottomAppBar } from './BottomAppBar.tsx';
export type { BottomAppBarProps } from './BottomAppBar.tsx';

/*
 * Figma kit, "App bars" page (App bar 58114:20565; Compose TopAppBar / CenterAlignedTopAppBar /
 * MediumFlexibleTopAppBar / LargeFlexibleTopAppBar, BottomAppBar).
 *   Small: 64px, 8px vertical / 4px side padding, 48px icon buttons, a title-large title (centred
 *   variant: centred across the bar) or an image / search field in its place (8px from the icons).
 *   Medium / large: a 56px icon row over a 28/36 (medium) or 36/44 (large) title 16px in, 8px
 *   below the row and 12px above the bottom; subtitles label-medium / label-large / title-medium.
 *   Flat bars have no container; scrolled bars Surface Container.
 * Motion (Compose AppBar.kt): the small bar's container fades to the scrolled colour on default
 * effects once content scrolls under it. Medium / large bars over a `scrollTarget` behave like
 * exitUntilCollapsedScrollBehavior: the scroll is spent on the bar's height first, so the content
 * stays on the bar's edge (the scroller is padded by the collapsed amount), the big title rides up
 * with that edge under the top row, fading out (1 − f) as the row title fades in (cubic 0.8, 0,
 * 0.8, 0.15); the container is lerp(container, scrolled, FastOutLinearIn(f)) with no timed
 * transition; stopping part-way snaps to the nearer end (f < 0.5 expands) on default effects
 * (TopAppBarDefaults.snapAnimationSpec). The bottom app bar over a `scrollTarget` hides with the
 * scroll and shows again on any scroll back (exitAlways), snapping on fast spatial.
 * Parts: ./useAppBarScroll.ts (scroll → collapse, exitUntilCollapsed), ./BottomAppBar.tsx and
 * ./exitAlways.ts (exitAlways, shared with the floating toolbar).
 */
/** The big title's clip starts this far below the bar's top row (the bottom row's 8px top padding). */
const BIG_TITLE_CLIP_TOP = 8;

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
  // Two-row bars: lerp(container, scrolled, FastOutLinearIn(f)) per frame, nothing timed. The flat
  // container is no fill (the kit), so the scrolled colour is mixed with transparent.
  containerMix: (percent: number) => ({
    backgroundColor: `color-mix(in oklab, ${color.surfaceContainer} ${percent}%, transparent)`,
    transitionProperty: 'none',
  }),
  containerFlat: { backgroundColor: 'transparent', transitionProperty: 'none' },
  containerFull: { backgroundColor: color.surfaceContainer, transitionProperty: 'none' },
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
  centredTitle: {
    position: 'absolute',
    left: 56,
    right: 56,
    top: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  trailing: { display: 'flex', alignItems: 'center', flexShrink: 0, marginInlineStart: 'auto' },
  big: { paddingInline: 16, paddingTop: 8, paddingBottom: 12, flexShrink: 0 },
  // Compose: the bottom row clips (from y 64, below the 64px top row) with the title anchored to its
  // bottom, so the title rides up with the bar's edge as it collapses.
  bigRide: (collapsed: number) => ({
    transform: `translateY(${-collapsed}px)`,
    clipPath: `inset(${BIG_TITLE_CLIP_TOP + collapsed}px 0 0 0)`,
  }),
  fade: (o: number) => ({ opacity: o }),
  height: (px: number) => ({ height: px }),
  // ── title block ──
  title: { display: 'flex', flexDirection: 'column', minWidth: 0, flexGrow: 1 },
  titleCentered: { alignItems: 'center', textAlign: 'center' },
  titleMediumGap: { rowGap: 4 },
  titleLargeGap: { rowGap: 8 },
  headline: {
    margin: 0,
    color: color.onSurface,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '100%',
  },
  subtitle: {
    margin: 0,
    color: color.onSurfaceVariant,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '100%',
  },
});

const HEADLINE = {
  small: typescale.titleLarge,
  medium: typescale.headlineMedium,
  large: typescale.displaySmall,
} as const;
const SUBTITLE = { small: typescale.labelMedium, medium: typescale.labelLarge, large: typescale.titleMedium } as const;
const LEGACY_HEADLINE = {
  small: legacyLeading.shift(22, 28),
  medium: legacyLeading.shift(28, 36),
  large: legacyLeading.shift(36, 44),
} as const;
const LEGACY_SUBTITLE = {
  small: legacyLeading.shift(12, 16),
  medium: legacyLeading.shift(14, 20),
  large: legacyLeading.shift(16, 24),
} as const;
// Measured on the kit layers: the small title sits 1px above Figma's legacy baseline and the large
// subtitle 1px below it (every other title / subtitle lands exactly on it).
const nudge = stylex.create({ up: { transform: 'translateY(-1px)' }, down: { transform: 'translateY(1px)' } });

export interface AppBarTitleProps extends SxProps<ComponentPropsWithRef<'div'>> {
  size?: TopAppBarSize;
  centered?: boolean;
  /** The headline (an `<h1>`). */
  children: ReactNode;
  subtitle?: ReactNode;
}

/** An app bar's title (and optional subtitle), sized per bar (kit "Text Small / Medium / Large"). */
export function AppBarTitle({ size = 'small', centered = false, children, subtitle, sx, ...rest }: AppBarTitleProps) {
  return (
    <div
      {...rest}
      {...stylex.props(
        s.title,
        centered && s.titleCentered,
        size === 'medium' && s.titleMediumGap,
        size === 'large' && s.titleLargeGap,
        sx,
      )}
    >
      {/* The kit's app bar text layers use Figma's legacy line height (glyphs sit higher). */}
      <h1 {...stylex.props(HEADLINE[size], s.headline, LEGACY_HEADLINE[size], size === 'small' && nudge.up)}>
        {children}
      </h1>
      {subtitle != null && (
        <p {...stylex.props(SUBTITLE[size], s.subtitle, LEGACY_SUBTITLE[size], size === 'large' && nudge.down)}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

/** Compose TopTitleAlphaEasing: cubic-bezier(0.8, 0, 0.8, 0.15). */
const topTitleAlpha = cubicBezier(0.8, 0, 0.8, 0.15);
/** A two-row bar's frame at collapsed `fraction` (Compose TwoRowsTopAppBar). */
function twoRowFrame(size: Exclude<TopAppBarSize, 'small'>, fraction: number) {
  const collapsed = fraction * (EXPANDED_HEIGHT[size] - COLLAPSED_HEIGHT);
  return {
    collapsed,
    height: EXPANDED_HEIGHT[size] - collapsed,
    /** % of the scrolled container colour: lerp(container, scrolled, FastOutLinearIn(fraction)). */
    containerMix: Math.round(fastOutLinearIn(fraction) * 1000) / 10,
    rowTitleAlpha: topTitleAlpha(fraction),
    bigTitleAlpha: 1 - fraction,
  };
}

/** The container colour for a mix percentage (the flat container is no fill: mixed with transparent). */
const containerColor = (mix: number) =>
  mix <= 0
    ? 'transparent'
    : mix >= 100
      ? color.surfaceContainer
      : `color-mix(in oklab, ${color.surfaceContainer} ${mix}%, transparent)`;

/** Renders differ only when content goes under the bar, the row title mounts or the titles swap. */
const sameRender = (a: AppBarScrollState, b: AppBarScrollState) =>
  a.overlapped === b.overlapped && a.fraction > 0 === b.fraction > 0 && a.fraction >= 0.5 === b.fraction >= 0.5;

/**
 * The root is the `<header>` (`ref`, native props, `sx`). The text is `headline` (not the native
 * `title` attribute); `content` replaces it in small bars (the native `content` attribute is omitted).
 */
export interface TopAppBarProps extends SxProps<
  Omit<ComponentPropsWithRef<'header'>, 'title' | 'content' | 'children'>
> {
  size?: TopAppBarSize;
  /** Small bars: centre the headline across the bar. */
  centered?: boolean;
  headline?: ReactNode;
  subtitle?: ReactNode;
  /** Leading icon button (navigation / menu). */
  navigationIcon?: ReactNode;
  /** Trailing icon buttons / avatar. */
  actions?: ReactNode;
  /** Small bars: custom content in the headline's place (e.g. an image). */
  content?: ReactNode;
  /** Small bars: a search field between the icons. */
  search?: ReactNode;
  /** Content is scrolled under the bar (Surface Container). Derived from `scrollTarget` if set. */
  scrolled?: boolean;
  /** Medium / large: 0 (expanded) … 1 (collapsed to 64px). Derived from `scrollTarget` if set. */
  collapsedFraction?: number;
  /**
   * The scroll container under the bar: drives `scrolled` and `collapsedFraction`. Medium / large
   * bars collapse first (Compose exitUntilCollapsed): the bar pads the container's top by the
   * collapsed amount (its content stays on the bar's edge) and snaps a half-collapsed bar open or
   * shut when scrolling stops.
   */
  scrollTarget?: RefObject<HTMLElement | null>;
}

export function TopAppBar({
  size = 'small',
  centered = false,
  headline,
  subtitle,
  navigationIcon,
  actions,
  content,
  search,
  scrolled: scrolledProp,
  collapsedFraction: fractionProp,
  scrollTarget,
  sx,
  ref,
  ...rest
}: TopAppBarProps) {
  const twoRows = size !== 'small';
  // Two-row bars collapsed by `scrollTarget`: every scroll event writes the bar's frame (height,
  // fades, title ride, colour) to the elements; React renders only when `sameRender` says so.
  const scrollDriven = twoRows && fractionProp == null && scrollTarget != null;
  const header = useRef<HTMLElement>(null);
  const setHeader = useMergedRefs(header, ref);
  const rowTitle = useRef<HTMLSpanElement>(null);
  const bigTitle = useRef<HTMLDivElement>(null);
  const latestFraction = useRef(0);
  const [scroll, setScroll] = useState<AppBarScrollState>({ overlapped: false, fraction: 0 });

  const paint = (fraction: number) => {
    if (size === 'small' || !header.current || !rowTitle.current || !bigTitle.current) return;
    const frame = twoRowFrame(size, fraction);
    header.current.style.height = `${frame.height}px`;
    if (scrolledProp == null) header.current.style.backgroundColor = containerColor(frame.containerMix);
    rowTitle.current.style.opacity = String(frame.rowTitleAlpha);
    const big = bigTitle.current.style;
    big.opacity = String(frame.bigTitleAlpha);
    if (frame.collapsed > 0) {
      big.transform = `translateY(${-frame.collapsed}px)`;
      big.clipPath = `inset(${BIG_TITLE_CLIP_TOP + frame.collapsed}px 0 0 0)`;
    } else {
      big.removeProperty('transform');
      big.removeProperty('clip-path');
    }
  };
  useAppBarScrollEvents(scrollTarget, size, { exitUntilCollapsed: twoRows && fractionProp == null }, (next) => {
    if (scrollDriven) {
      latestFraction.current = next.fraction;
      paint(next.fraction);
    }
    setScroll((prev) => (sameRender(prev, next) ? prev : next));
  });
  // A render (a flip, new props) keeps the latest scroll frame over the rendered one; leaving
  // scroll-driven mode hands the bar back to its rendered styles.
  useLayoutEffect(() => {
    if (!scrollDriven) return undefined;
    paint(latestFraction.current);
    const elements = [header.current, rowTitle.current, bigTitle.current];
    return () => {
      for (const el of elements)
        for (const property of ['height', 'background-color', 'opacity', 'transform', 'clip-path'])
          el?.style.removeProperty(property);
    };
  });

  const fraction = fractionProp ?? (scrollTarget ? scroll.fraction : 0);
  const scrolled = scrolledProp ?? (scrollTarget ? scroll.overlapped : false);

  if (size === 'small') {
    return (
      <header ref={setHeader} {...rest} {...stylex.props(s.bar, scrolled && s.scrolled, sx)}>
        <div {...stylex.props(s.row, search != null && s.rowSearch)}>
          {navigationIcon != null && (
            <span {...stylex.props(s.slot)}>
              {/* The navigation icon is On Surface; actions keep On Surface Variant. */}
              <StandardIconTintContext value="onSurface">{navigationIcon}</StandardIconTintContext>
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
              <AppBarTitle subtitle={subtitle}>{headline}</AppBarTitle>
            </span>
          )}
          {actions != null && <span {...stylex.props(s.trailing)}>{actions}</span>}
        </div>
        {centered && search == null && content == null && (
          <div {...stylex.props(s.centredTitle)}>
            <AppBarTitle centered subtitle={subtitle}>
              {headline}
            </AppBarTitle>
          </div>
        )}
      </header>
    );
  }
  const frame = twoRowFrame(size, fraction);
  // Scroll-driven two-row bars: the container follows the collapse (Compose containerColor(
  // collapsedFraction)); an explicit `scrolled` keeps the kit's on-scroll fill.
  const driven = fractionProp != null || scrollTarget != null;
  const container =
    driven && scrolledProp == null
      ? frame.containerMix <= 0
        ? s.containerFlat
        : frame.containerMix >= 100
          ? s.containerFull
          : s.containerMix(frame.containerMix)
      : scrolledProp && s.scrolled;
  return (
    <header ref={setHeader} {...rest} {...stylex.props(s.bar, container, driven ? s.height(frame.height) : null, sx)}>
      <div {...stylex.props(s.row, s.rowTwoRows)}>
        {navigationIcon != null && (
          <span {...stylex.props(s.slot)}>
            {/* The navigation icon is On Surface; actions keep On Surface Variant. */}
            <StandardIconTintContext value="onSurface">{navigationIcon}</StandardIconTintContext>
          </span>
        )}
        <span ref={rowTitle} {...stylex.props(s.centre, s.fade(frame.rowTitleAlpha))} aria-hidden={fraction < 0.5}>
          {fraction > 0 && <AppBarTitle>{headline}</AppBarTitle>}
        </span>
        {actions != null && <span {...stylex.props(s.trailing)}>{actions}</span>}
      </div>
      <div
        ref={bigTitle}
        {...stylex.props(s.big, s.fade(frame.bigTitleAlpha), frame.collapsed > 0 && s.bigRide(frame.collapsed))}
        aria-hidden={fraction >= 0.5}
      >
        <AppBarTitle size={size} centered={centered} subtitle={subtitle}>
          {headline}
        </AppBarTitle>
      </div>
    </header>
  );
}
