import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Tabs as BaseTabs } from '@base-ui/react/tabs';
import { color } from '../../tokens/color.stylex.ts';
import { useReducedMotion, useSpringToken } from '../../motion/context.tsx';
import { useSpringChannel } from '../../motion/useSpringChannel.ts';
import type { TabsVariant } from './context.ts';

/* The row of tabs with its sprung indicator and centring scroll — kit geometry and motion in ./Tabs.tsx. */
const s = stylex.create({
  // The list carries the Surface (panels below keep their own background).
  list: {
    position: 'relative',
    display: 'flex',
    alignItems: 'stretch',
    outlineStyle: 'none',
    backgroundColor: color.surface,
  },
  listScrollable: {
    overflowX: 'auto',
    overflowY: 'hidden',
    scrollbarWidth: 'none',
    // Compose ScrollableTabRow: edge padding on both ends (layoutWidth = padding × 2 + tabs).
    paddingInlineStart: 52,
    paddingInlineEnd: 52,
    '::-webkit-scrollbar': { display: 'none' },
  },
  // Live indicator: placed by JS (content box for primary, tab box for secondary), sprung.
  indicator: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    pointerEvents: 'none',
    backgroundColor: color.primary,
    zIndex: 1,
  },
  indicatorPrimary: { height: 3, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  indicatorSecondary: { height: 2 },
  geometry: (x: number, w: number) => ({ transform: `translateX(${x}px)`, width: w }),
});

/** The primary indicator: the tab content's width less this much on each side. */
const PRIMARY_INDICATOR_INSET = 2;
/** Visibility thresholds: the indicator in px (Compose Dp: 0.1), the scroll as a Float (0.01). */
const INDICATOR_PRECISION = 0.1;
const SCROLL_PRECISION = 0.01;

interface IndicatorGeometry {
  x: number;
  w: number;
}

/** A frame of the sprung indicator over its StyleX geometry (null: back to the resting geometry). */
function paintIndicator(node: HTMLElement | null, geometry: IndicatorGeometry | null) {
  if (!node) return;
  if (geometry) {
    node.style.transform = `translateX(${geometry.x}px)`;
    node.style.width = `${geometry.w}px`;
  } else {
    node.style.removeProperty('transform');
    node.style.removeProperty('width');
  }
}

export function TabList({
  variant,
  scrollable,
  current,
  ariaLabel,
  children,
}: {
  variant: TabsVariant;
  scrollable: boolean;
  /** The selected value (Base UI owns it when uncontrolled): a new one re-places the indicator. */
  current: unknown;
  ariaLabel?: string;
  children: ReactNode;
}) {
  const list = useRef<HTMLDivElement>(null);
  const indicator = useRef<HTMLSpanElement>(null);
  const spring = useSpringToken('default-spatial');
  const reduced = useReducedMotion();
  // The indicator's resting geometry (StyleX). While it springs, frames are written straight to
  // the element (the same transform / width) instead of re-rendering the row every frame.
  const [geo, setGeo] = useState<IndicatorGeometry | null>(null);
  // The geometry on screen (the springs' values); null until first placed.
  const shown = useRef<IndicatorGeometry | null>(null);
  // The value the row last scrolled for (Compose ScrollableTabData.selectedTab; unset at first).
  const scrolledFor = useRef<{ value: unknown } | null>(null);

  const paintShown = (key: keyof IndicatorGeometry, value: number) => {
    if (!shown.current) return;
    shown.current = { ...shown.current, [key]: value };
    paintIndicator(indicator.current, shown.current);
  };
  // Once both springs have landed the resting geometry takes over again.
  const indicatorX = useSpringChannel((v) => paintShown('x', v), {
    precision: INDICATOR_PRECISION,
    onRest: () => settleIndicator(),
  });
  const indicatorW = useSpringChannel((v) => paintShown('w', v), {
    precision: INDICATOR_PRECISION,
    onRest: () => settleIndicator(),
  });
  const settleIndicator = () => {
    if (!indicatorX.animating && !indicatorW.animating) paintIndicator(indicator.current, null);
  };
  const scroll = useSpringChannel(
    (v) => {
      if (list.current) list.current.scrollLeft = v;
    },
    { precision: SCROLL_PRECISION },
  );

  // Places the indicator on the active tab — sprung, or at once (first layout, resizes, reduced motion).
  const place = useCallback(
    (animate: boolean) => {
      const el = list.current;
      if (!el) return;
      // Whole-pixel geometry (offsetLeft / offsetWidth), as the kit's indicators sit: the kit's hug
      // text boxes are whole-pixel wide, so the label box lands on whole pixels too.
      const tab = el.querySelector<HTMLElement>('[data-active]');
      if (!tab) return;
      let target: IndicatorGeometry;
      if (variant === 'secondary') target = { x: tab.offsetLeft, w: tab.offsetWidth };
      else {
        const content = tab.querySelector<HTMLElement>('[data-tab-content]');
        if (!content) return;
        target = {
          x: tab.offsetLeft + content.offsetLeft + PRIMARY_INDICATOR_INSET,
          w: content.offsetWidth - 2 * PRIMARY_INDICATOR_INSET,
        };
      }
      const from = shown.current;
      if (!animate || !from || !spring || reduced) {
        // Snap: the springs' values follow, the resting geometry shows.
        shown.current = target;
        indicatorX.jump(target.x);
        indicatorW.jump(target.w);
        paintIndicator(indicator.current, null);
        setGeo(target);
        return;
      }
      // The resting geometry moves to the target now; the frames cover it until both springs land.
      paintIndicator(indicator.current, from);
      setGeo(target);
      indicatorX.to(target.x, spring);
      indicatorW.to(target.w, spring);
      // Neither moves (already there): nothing will land, so rest now.
      if (!indicatorX.animating && !indicatorW.animating) paintIndicator(indicator.current, null);
    },
    [variant, spring, reduced, indicatorX, indicatorW],
  );

  useLayoutEffect(() => {
    const el = list.current;
    if (!el) return undefined;
    // Scrollable rows: centre the selected tab, clamped (ScrollableTabData.calculateTabOffset), once
    // per selection including the first layout. animateScrollTo cancels a running scroll and
    // starts again at zero velocity.
    const scrollToSelected = () => {
      const tab = el.querySelector<HTMLElement>('[data-active]');
      if (!scrollable || !tab || (scrolledFor.current && scrolledFor.current.value === current)) return;
      scrolledFor.current = { value: current };
      const visible = el.clientWidth;
      const available = Math.max(0, el.scrollWidth - visible);
      const centred = tab.offsetLeft - (Math.trunc(visible / 2) - Math.trunc(tab.offsetWidth / 2));
      const to = Math.min(available, Math.max(0, centred));
      if (to === el.scrollLeft) return;
      scroll.jump(el.scrollLeft);
      scroll.to(to, spring);
    };
    place(true);
    // The first layout waits for web fonts: tab widths (and so the centred offset) depend on them.
    let cancelled = false;
    // document.fonts is missing in jsdom: treat fonts as loaded.
    if (scrolledFor.current == null && document.fonts && document.fonts.status !== 'loaded') {
      void document.fonts.ready.then(() => {
        if (!cancelled) scrollToSelected();
      });
    } else scrollToSelected();
    return () => {
      cancelled = true;
    };
  }, [current, scrollable, place, spring, scroll]);

  // Re-place (no motion) when the row or a tab resizes, e.g. once web fonts have loaded. One
  // observer per placement function; tabs that come or go are observed / dropped as the list's
  // children change. A target's first report is its initial size, not a resize: acting on it
  // snapped a selection's indicator one frame in.
  useLayoutEffect(() => {
    const el = list.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined; // jsdom / very old engines: no re-placement on resize
    const observed = new Set<Element>();
    const unreported = new Set<Element>();
    const resizes = new ResizeObserver((entries) => {
      let resized = false;
      for (const entry of entries) if (!unreported.delete(entry.target)) resized = true;
      if (resized) place(false);
    });
    const syncTargets = () => {
      const targets = new Set<Element>([el, ...el.querySelectorAll('[role="tab"]')]);
      for (const target of observed) {
        if (targets.has(target)) continue;
        resizes.unobserve(target);
        observed.delete(target);
        unreported.delete(target);
      }
      for (const target of targets) {
        if (observed.has(target)) continue;
        observed.add(target);
        unreported.add(target);
        resizes.observe(target);
      }
    };
    syncTargets();
    const children = new MutationObserver(syncTargets);
    children.observe(el, { childList: true });
    return () => {
      resizes.disconnect();
      children.disconnect();
    };
  }, [place]);

  return (
    <BaseTabs.List ref={list} aria-label={ariaLabel} {...stylex.props(s.list, scrollable && s.listScrollable)}>
      {children}
      {geo && (
        <span
          ref={indicator}
          aria-hidden
          {...stylex.props(
            s.indicator,
            variant === 'primary' ? s.indicatorPrimary : s.indicatorSecondary,
            s.geometry(geo.x, geo.w),
          )}
        />
      )}
    </BaseTabs.List>
  );
}
