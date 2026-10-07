import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex.ts';
import { motion } from '../../tokens/motion.stylex.ts';
import { typescale } from '../../tokens/typescale.ts';
import { legacyLeading } from '../../primitives/textBox.ts';
import { StandardIconTintContext } from '../IconButton/context.ts';
import { useSpringToken } from '../../motion/context.tsx';
import { animateSpring, type SpringAnimation } from '../../motion/animate.ts';
import { cubicBezier } from '../../motion/gesture.ts';
import { useRovingTabStop } from '../../hooks/useRovingTabStop.ts';
import { onScrollEnd, onUserScroll } from './scrollEvents.ts';

export type TopAppBarSize = 'small' | 'medium' | 'large';

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
    clipPath: `inset(${8 + collapsed}px 0 0 0)`,
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
  // exitAlways: the bar's height gives way to the scroll; its content stays top-placed and clips.
  bottomClip: (height: number) => ({ display: 'block', flexShrink: 0, width: '100%', height, overflow: 'hidden' }),
  bottomActions: { display: 'flex', alignItems: 'center', columnGap: 8 },
  bottomFab: { marginInlineStart: 'auto', display: 'flex' },
});

const HEADLINE = {
  small: typescale.titleLarge,
  medium: typescale.headlineMedium,
  large: typescale.displaySmall,
} as const;
const SUBTITLE = { small: typescale.labelMedium, medium: typescale.labelLarge, large: typescale.titleMedium } as const;
const EXPANDED = { small: 64, medium: 112, large: 120 } as const;
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
    <div
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

export interface AppBarScrollOptions {
  /**
   * Compose exitUntilCollapsedScrollBehavior (two-row bars): the scroll is consumed by the bar's
   * collapse first. The target is padded at the top by the collapsed amount so its content stays
   * on the shrinking bar's edge, and a scroll that stops part-way snaps to the nearer end.
   */
  exitUntilCollapsed?: boolean;
}

/** Scroll position → { overlapped, collapsedFraction } for a bar of `size` over `target`. */
export function useAppBarScroll(
  target: RefObject<HTMLElement | null> | undefined,
  size: TopAppBarSize,
  { exitUntilCollapsed = false }: AppBarScrollOptions = {},
) {
  const [state, setState] = useState({ overlapped: false, fraction: 0 });
  // TopAppBarDefaults.snapAnimationSpec = MotionSchemeKeyTokens.DefaultEffects.
  const snapSpring = useSpringToken('default-effects');
  useEffect(() => {
    const el = target?.current;
    if (!el) return undefined;
    const range = EXPANDED[size] - 64;
    const exit = exitUntilCollapsed && range > 0;
    const restore = { paddingTop: el.style.paddingTop, overflowAnchor: el.style.overflowAnchor };
    const basePadding = exit ? parseFloat(getComputedStyle(el).paddingTop) || 0 : 0;
    // Padding moves the content: scroll anchoring would fight it.
    if (exit) el.style.setProperty('overflow-anchor', 'none');
    let padded = 0;
    let settle: SpringAnimation | null = null;
    const update = () => {
      const top = Math.max(0, el.scrollTop);
      const collapsed = exit ? Math.min(range, top) : 0;
      if (exit && collapsed !== padded) {
        padded = collapsed;
        el.style.setProperty('padding-top', `${basePadding + collapsed}px`);
      }
      const overlapped = top > 0;
      const fraction = range > 0 ? Math.min(1, top / range) : 0;
      // Most scroll events change neither (e.g. scrolling further once collapsed): keep the state
      // object so React bails out of the render.
      setState((prev) =>
        prev.overlapped === overlapped && prev.fraction === fraction ? prev : { overlapped, fraction },
      );
    };
    const snap = () => {
      if (!exit || settle) return;
      const f = Math.min(1, Math.max(0, el.scrollTop) / range);
      // settleAppBar: nothing to do when (nearly) expanded or fully collapsed.
      if (f < 0.01 || f === 1) return;
      const to = f < 0.5 ? 0 : range;
      settle = animateSpring({
        spring: snapSpring!,
        from: el.scrollTop,
        to,
        precision: 0.01,
        onUpdate: (v) => el.scrollTo({ top: v, behavior: 'instant' }),
        onComplete: () => (settle = null),
      });
    };
    const takeOver = () => {
      settle?.stop();
      settle = null;
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const offEnd = onScrollEnd(el, snap);
    const offUser = onUserScroll(el, takeOver);
    return () => {
      takeOver();
      el.removeEventListener('scroll', update);
      offEnd();
      offUser();
      if (exit) {
        el.style.setProperty('padding-top', restore.paddingTop);
        el.style.setProperty('overflow-anchor', restore.overflowAnchor);
      }
    };
  }, [target, size, exitUntilCollapsed, snapSpring]);
  return state;
}

/** Compose FastOutLinearInEasing: cubic-bezier(0.4, 0, 1, 1). */
const fastOutLinearIn = cubicBezier(0.4, 0, 1, 1);
/** Compose TopTitleAlphaEasing: cubic-bezier(0.8, 0, 0.8, 0.15). */
const topTitleAlpha = cubicBezier(0.8, 0, 0.8, 0.15);

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
  /**
   * The scroll container under the bar: drives `scrolled` and `collapsedFraction`. Medium / large
   * bars collapse first (Compose exitUntilCollapsed): the bar pads the container's top by the
   * collapsed amount (its content stays on the bar's edge) and snaps a half-collapsed bar open or
   * shut when scrolling stops.
   */
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
  const twoRows = size !== 'small';
  const scroll = useAppBarScroll(scrollTarget, size, { exitUntilCollapsed: twoRows && fractionProp == null });
  const fraction = fractionProp ?? (scrollTarget ? scroll.fraction : 0);
  const scrolled = scrolledProp ?? (scrollTarget ? scroll.overlapped : false);

  if (!twoRows) {
    return (
      <header {...stylex.props(s.bar, scrolled && s.scrolled, sx)}>
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
  const collapsed = fraction * (expanded - 64);
  const height = expanded - collapsed;
  // Scroll-driven two-row bars: the container follows the collapse (Compose containerColor(
  // collapsedFraction)); an explicit `scrolled` keeps the kit's on-scroll fill.
  const driven = fractionProp != null || scrollTarget != null;
  const mix = Math.round(fastOutLinearIn(fraction) * 1000) / 10;
  const container =
    driven && scrolledProp == null
      ? mix <= 0
        ? s.containerFlat
        : mix >= 100
          ? s.containerFull
          : s.containerMix(mix)
      : scrolledProp && s.scrolled;
  return (
    <header {...stylex.props(s.bar, container, driven ? s.height(height) : null, sx)}>
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
      <div
        {...stylex.props(s.big, s.fade(1 - fraction), collapsed > 0 && s.bigRide(collapsed))}
        aria-hidden={fraction >= 0.5}
      >
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
  /** The toolbar's accessible name. */
  'aria-label'?: string;
  /** A FAB at the end (use `Fab elevated={false}`: the kit's bottom-bar FAB has no shadow). */
  fab?: ReactNode;
  /**
   * The scroll container above the bar: scrolling its content up hides the bar, any scroll back
   * shows it again (Compose BottomAppBarDefaults.exitAlwaysScrollBehavior).
   */
  scrollTarget?: RefObject<HTMLElement | null>;
  sx?: StyleXStyles;
}

const BOTTOM_HEIGHT = 80;

/**
 * exitAlways: the height offset follows every scroll delta (clamped to the bar's height); a
 * scroll that stops with the bar part-hidden snaps it (f < 0.5 shows) on fast spatial
 * (BottomAppBarDefaults.snapAnimationSpec), clamped like BottomAppBarState.heightOffset.
 */
function useBottomBarOffset(target: RefObject<HTMLElement | null> | undefined) {
  const [offset, setOffset] = useState(0);
  const offsetRef = useRef(0);
  const spring = useSpringToken('fast-spatial');
  useEffect(() => {
    const el = target?.current;
    if (!el) return undefined;
    const set = (v: number) => {
      offsetRef.current = Math.min(0, Math.max(-BOTTOM_HEIGHT, v));
      setOffset(offsetRef.current);
    };
    let last = el.scrollTop;
    let lastClient = el.clientHeight;
    let settle: SpringAnimation | null = null;
    const onScroll = () => {
      const top = el.scrollTop;
      const delta = top - last;
      const resized = el.clientHeight !== lastClient;
      last = top;
      lastClient = el.clientHeight;
      // The scroller grows as the bar hides; a clamp at the end of its content isn't a user scroll.
      if (resized && top >= el.scrollHeight - el.clientHeight - 0.5) return;
      if (delta !== 0 && !settle) set(offsetRef.current - delta);
    };
    const snap = () => {
      if (settle) return;
      const f = -offsetRef.current / BOTTOM_HEIGHT;
      if (f < 0.01 || f === 1) return;
      const to = f < 0.5 ? 0 : -BOTTOM_HEIGHT;
      if (!spring) {
        set(to);
        return;
      }
      settle = animateSpring({
        spring,
        from: offsetRef.current,
        to,
        precision: 0.01,
        onUpdate: set,
        onComplete: () => (settle = null),
      });
    };
    const takeOver = () => {
      settle?.stop();
      settle = null;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    const offEnd = onScrollEnd(el, snap);
    const offUser = onUserScroll(el, takeOver);
    return () => {
      takeOver();
      el.removeEventListener('scroll', onScroll);
      offEnd();
      offUser();
    };
  }, [target, spring]);
  return offset;
}

/**
 * Baseline bottom app bar: 80px Surface Container, actions from the start, FAB at the end. A
 * toolbar: one tab stop, arrow keys move between its buttons. Hidden by the scroll, it leaves the
 * tab order (inert) until it shows again.
 */
export function BottomAppBar({ actions, fab, scrollTarget, 'aria-label': ariaLabel, sx }: BottomAppBarProps) {
  const offset = useBottomBarOffset(scrollTarget);
  const ref = useRef<HTMLDivElement>(null);
  const { onFocus, onKeyDown } = useRovingTabStop(ref, false);
  const bar = (
    <div
      ref={ref}
      role="toolbar"
      aria-label={ariaLabel}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      {...stylex.props(s.bottom, scrollTarget == null && sx)}
    >
      {actions != null && <div {...stylex.props(s.bottomActions)}>{actions}</div>}
      {fab != null && <div {...stylex.props(s.bottomFab)}>{fab}</div>}
    </div>
  );
  if (scrollTarget == null) return bar;
  const hidden = offset <= -BOTTOM_HEIGHT;
  return (
    <div inert={hidden || undefined} {...stylex.props(s.bottomClip(BOTTOM_HEIGHT + offset), sx)}>
      {bar}
    </div>
  );
}
