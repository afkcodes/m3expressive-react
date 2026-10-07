import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { useSpringToken } from '../../motion/context.tsx';
import { useExitAlwaysOffset } from '../AppBar/exitAlways.ts';
import { onScrollEnd } from '../AppBar/scrollEvents.ts';

/** FloatingToolbarDefaults.ScrollDistanceThreshold (40dp). */
export const SCROLL_DISTANCE_THRESHOLD = 40;

/**
 * A ref callback for a scrolling element that reports its vertical scroll as Compose nested-scroll
 * deltas (`consumed.y`: positive when the content moves down, i.e. scrolling up).
 */
function useScrollDeltas(onDelta: (delta: number) => void, onEnd?: () => void) {
  const latest = useRef({ onDelta, onEnd });
  useLayoutEffect(() => {
    latest.current = { onDelta, onEnd };
  });
  const cleanup = useRef<(() => void) | null>(null);
  useEffect(() => () => cleanup.current?.(), []);
  return useCallback((el: HTMLElement | null) => {
    cleanup.current?.();
    cleanup.current = null;
    if (!el) return;
    let last = el.scrollTop;
    const scroll = () => {
      const top = el.scrollTop;
      const delta = last - top;
      last = top;
      if (delta !== 0) latest.current.onDelta(delta);
    };
    el.addEventListener('scroll', scroll, { passive: true });
    // Browsers without `scrollend`: a 150ms pause in scrolling.
    const offEnd = onScrollEnd(el, () => latest.current.onEnd?.());
    cleanup.current = () => {
      el.removeEventListener('scroll', scroll);
      offEnd();
    };
  }, []);
}

export interface FloatingToolbarNestedScrollOptions {
  /** The toolbar's current expanded state. */
  expanded: boolean;
  /** The scroll asks to expand (true) or collapse (false) the toolbar. */
  onExpandedChange: (expanded: boolean) => void;
  /** Scroll distance (px) back up that expands the toolbar (default 40). */
  expandScrollDistanceThreshold?: number;
  /** Scroll distance (px) down that collapses it (default 40). */
  collapseScrollDistanceThreshold?: number;
  /** The content scrolls in reverse (e.g. a chat log anchored at the bottom). */
  reverseLayout?: boolean;
}

/**
 * Compose `Modifier.floatingToolbarVerticalNestedScroll` (FloatingToolbar.kt
 * VerticalNestedScrollExpansionNode): collapses the toolbar after 40px of scrolling down and
 * expands it after 40px back up, measured from the last turn (each threshold ratchets with the
 * scroll, so the two directions have hysteresis). Returns a ref for the scrolling element.
 */
export function useFloatingToolbarNestedScroll({
  expanded,
  onExpandedChange,
  expandScrollDistanceThreshold = SCROLL_DISTANCE_THRESHOLD,
  collapseScrollDistanceThreshold = SCROLL_DISTANCE_THRESHOLD,
  reverseLayout = false,
}: FloatingToolbarNestedScrollOptions): (el: HTMLElement | null) => void {
  const st = useRef({ contentOffset: 0, threshold: 0 });
  const opts = { onExpandedChange, expandScrollDistanceThreshold, collapseScrollDistanceThreshold, reverseLayout };

  // updateThreshold: whenever the state or the thresholds change.
  useEffect(() => {
    const scroll = st.current;
    scroll.threshold = expanded
      ? scroll.contentOffset - collapseScrollDistanceThreshold
      : scroll.contentOffset + expandScrollDistanceThreshold;
  }, [expanded, expandScrollDistanceThreshold, collapseScrollDistanceThreshold]);

  return useScrollDeltas((consumed) => {
    const scroll = st.current;
    const scrollDelta = consumed * (opts.reverseLayout ? -1 : 1);
    scroll.contentOffset += scrollDelta;
    if (scrollDelta < 0 && scroll.contentOffset <= scroll.threshold) {
      scroll.threshold = scroll.contentOffset + opts.expandScrollDistanceThreshold;
      opts.onExpandedChange(false);
    } else if (scrollDelta > 0 && scroll.contentOffset >= scroll.threshold) {
      scroll.threshold = scroll.contentOffset - opts.collapseScrollDistanceThreshold;
      opts.onExpandedChange(true);
    }
  });
}

export type FloatingToolbarExitDirection = 'bottom' | 'top' | 'start' | 'end';

type PhysicalSide = 'top' | 'bottom' | 'left' | 'right';

interface ExitGeometry {
  /** The screen edge the toolbar leaves by. */
  side: PhysicalSide;
  /** state.offsetLimit: the distance to the parent's edge plus the element's size, negative. */
  limit: number;
}

/**
 * Compose `FloatingToolbarDefaults.exitAlwaysScrollBehavior` (ExitAlwaysFloatingToolbarScrollBehavior):
 * the toolbar moves off screen by the content's scroll, 1:1 (clamped between in place and fully
 * past its parent's edge), and when the scroll ends part way it settles — back in when less than
 * half hidden, out otherwise — on the default effects spring (snapAnimationSpec). Attach `ref` to
 * the element that moves (the toolbar or its positioned wrapper) and `scrollRef` to the scroller.
 * Only vertical content scrolling drives it, as in Compose's onPostScroll (consumed.y).
 */
export function useFloatingToolbarExitAlways(exitDirection: FloatingToolbarExitDirection = 'bottom') {
  const snapSpec = useSpringToken('default-effects');
  const el = useRef<HTMLElement | null>(null);
  // The exit side and limit don't change while the content scrolls (the toolbar moves by a
  // translate): measured once per scroll, not on every event / frame.
  const geometry = useRef<ExitGeometry | null>(null);
  /** The last scroll has ended: the next one measures again. */
  const ended = useRef(true);

  const measure = (): ExitGeometry | null => {
    const element = el.current;
    if (!element) return null;
    const side: PhysicalSide =
      exitDirection === 'top' || exitDirection === 'bottom'
        ? exitDirection
        : (exitDirection === 'start') !== (getComputedStyle(element).direction === 'rtl')
          ? 'left'
          : 'right';
    const parent = element.offsetParent as HTMLElement | null;
    if (!parent) return { side, limit: 0 };
    const distance =
      side === 'top'
        ? element.offsetHeight + element.offsetTop
        : side === 'bottom'
          ? parent.clientHeight - element.offsetTop
          : side === 'left'
            ? element.offsetWidth + element.offsetLeft
            : parent.clientWidth - element.offsetLeft;
    return { side, limit: -distance };
  };
  const current = () => (geometry.current ??= measure());

  const offset = useExitAlwaysOffset(
    (value) => {
      const element = el.current;
      const side = current()?.side;
      if (!element || !side) return;
      element.style.translate =
        side === 'top'
          ? `0 ${value}px`
          : side === 'bottom'
            ? `0 ${-value}px`
            : side === 'left'
              ? `${value}px 0`
              : `${-value}px 0`;
    },
    () => current()?.limit ?? 0,
    snapSpec,
  );

  const ref = useCallback((node: HTMLElement | null) => {
    el.current = node;
  }, []);

  const scrollRef = useScrollDeltas(
    (consumed) => {
      if (ended.current) {
        ended.current = false;
        geometry.current = null;
      }
      // onPostScroll: state.offset += consumed.y (a running settle stops).
      offset.follow(consumed);
    },
    // settleFloatingToolbar once the content's scroll (including the browser's fling) ends.
    () => {
      if (ended.current) geometry.current = null;
      offset.settle();
      ended.current = true;
    },
  );

  return { ref, scrollRef };
}
