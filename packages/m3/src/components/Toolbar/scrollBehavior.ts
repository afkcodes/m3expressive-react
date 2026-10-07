import { useCallback, useEffect, useRef } from 'react';
import { useSpringToken } from '../../motion/context.tsx';
import { animateSpring, type SpringAnimation } from '../../motion/animate.ts';

/** FloatingToolbarDefaults.ScrollDistanceThreshold (40dp). */
export const SCROLL_DISTANCE_THRESHOLD = 40;

/**
 * A ref callback for a scrolling element that reports its vertical scroll as Compose nested-scroll
 * deltas (`consumed.y`: positive when the content moves down, i.e. scrolling up).
 */
function useScrollDeltas(onDelta: (delta: number) => void, onEnd?: () => void) {
  const latest = useRef({ onDelta, onEnd });
  latest.current = { onDelta, onEnd };
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
    const end = () => latest.current.onEnd?.();
    el.addEventListener('scroll', scroll, { passive: true });
    el.addEventListener('scrollend', end);
    cleanup.current = () => {
      el.removeEventListener('scroll', scroll);
      el.removeEventListener('scrollend', end);
    };
  }, []);
}

export interface FloatingToolbarNestedScrollOptions {
  /** The toolbar's current expanded state. */
  expanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
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
  onExpand,
  onCollapse,
  expandScrollDistanceThreshold = SCROLL_DISTANCE_THRESHOLD,
  collapseScrollDistanceThreshold = SCROLL_DISTANCE_THRESHOLD,
  reverseLayout = false,
}: FloatingToolbarNestedScrollOptions): (el: HTMLElement | null) => void {
  const st = useRef({ contentOffset: 0, threshold: 0 });
  const opts = { onExpand, onCollapse, expandScrollDistanceThreshold, collapseScrollDistanceThreshold, reverseLayout };

  // updateThreshold: whenever the state or the thresholds change.
  useEffect(() => {
    const s = st.current;
    s.threshold = expanded ? s.contentOffset - collapseScrollDistanceThreshold : s.contentOffset + expandScrollDistanceThreshold;
  }, [expanded, expandScrollDistanceThreshold, collapseScrollDistanceThreshold]);

  return useScrollDeltas((consumed) => {
    const s = st.current;
    const scrollDelta = consumed * (opts.reverseLayout ? -1 : 1);
    s.contentOffset += scrollDelta;
    if (scrollDelta < 0 && s.contentOffset <= s.threshold) {
      s.threshold = s.contentOffset + opts.expandScrollDistanceThreshold;
      opts.onCollapse();
    } else if (scrollDelta > 0 && s.contentOffset >= s.threshold) {
      s.threshold = s.contentOffset - opts.collapseScrollDistanceThreshold;
      opts.onExpand();
    }
  });
}

export type FloatingToolbarExitDirection = 'bottom' | 'top' | 'start' | 'end';

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
  const st = useRef({ offset: 0, settle: null as SpringAnimation | null });
  useEffect(() => () => st.current.settle?.stop(), []);

  const physical = () => {
    const e = el.current!;
    const rtl = getComputedStyle(e).direction === 'rtl';
    if (exitDirection === 'top' || exitDirection === 'bottom') return exitDirection;
    return (exitDirection === 'start') !== rtl ? 'left' : 'right';
  };
  /** state.offsetLimit: the distance to the parent's edge plus the element's size, negative. */
  const limit = () => {
    const e = el.current;
    const parent = e?.offsetParent as HTMLElement | null;
    if (!e || !parent) return 0;
    const side = physical();
    const distance =
      side === 'top'
        ? e.offsetHeight + e.offsetTop
        : side === 'bottom'
          ? parent.clientHeight - e.offsetTop
          : side === 'left'
            ? e.offsetWidth + e.offsetLeft
            : parent.clientWidth - e.offsetLeft;
    return -distance;
  };
  const apply = () => {
    const e = el.current;
    if (!e) return;
    const o = st.current.offset;
    const side = physical();
    e.style.translate = side === 'top' ? `0 ${o}px` : side === 'bottom' ? `0 ${-o}px` : side === 'left' ? `${o}px 0` : `${-o}px 0`;
  };
  const setOffset = (value: number) => {
    st.current.offset = Math.min(0, Math.max(limit(), value));
    apply();
  };

  const ref = useCallback((node: HTMLElement | null) => {
    el.current = node;
  }, []);

  const scrollRef = useScrollDeltas(
    (consumed) => {
      const s = st.current;
      s.settle?.stop();
      s.settle = null;
      // onPostScroll: state.offset += consumed.y.
      setOffset(s.offset + consumed);
    },
    // settleFloatingToolbar once the content's scroll (including the browser's fling) ends.
    () => {
      const s = st.current;
      const lim = limit();
      if (lim === 0 || s.settle) return;
      const fraction = s.offset / lim;
      if (fraction < 0.01 || fraction === 1) return;
      const to = fraction < 0.5 ? 0 : lim;
      if (!snapSpec) return setOffset(to);
      s.settle = animateSpring({
        spring: snapSpec,
        from: s.offset,
        to,
        onUpdate: (v) => {
          s.offset = v;
          apply();
        },
        onComplete: () => {
          s.settle = null;
        },
      });
    },
  );

  return { ref, scrollRef };
}
