import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { useSpringToken } from '../../motion/context.tsx';
import { animateSpring, type SpringAnimation } from '../../motion/animate.ts';
import { onScrollEnd, onUserScroll } from './scrollEvents.ts';

export type TopAppBarSize = 'small' | 'medium' | 'large';

/** Top app bar heights: expanded per size, and the 64px every bar collapses to. */
export const EXPANDED_HEIGHT = { small: 64, medium: 112, large: 120 } as const;
export const COLLAPSED_HEIGHT = 64;

/** settleAppBar: a bar collapsed less than this fraction is left as it is. */
const SETTLE_MIN_FRACTION = 0.01;
/** Visibility threshold of the settle spring (scroll px; Compose Float default). */
const SETTLE_PRECISION = 0.01;

export interface AppBarScrollOptions {
  /**
   * Compose exitUntilCollapsedScrollBehavior (two-row bars): the scroll is consumed by the bar's
   * collapse first. The target is padded at the top by the collapsed amount so its content stays
   * on the shrinking bar's edge, and a scroll that stops part-way snaps to the nearer end.
   */
  exitUntilCollapsed?: boolean;
}

export interface AppBarScrollState {
  /** Content is scrolled under the bar. */
  overlapped: boolean;
  /** 0 (expanded) … 1 (collapsed to 64px); always 0 for small bars. */
  fraction: number;
}

/**
 * The scroll of `target` as an app bar of `size` sees it, reported to `onChange` on every scroll
 * event (and once on attach) — the engine behind `useAppBarScroll`, for callers that write the
 * result to the DOM instead of rendering it.
 */
export function useAppBarScrollEvents(
  target: RefObject<HTMLElement | null> | undefined,
  size: TopAppBarSize,
  { exitUntilCollapsed = false }: AppBarScrollOptions,
  onChange: (state: AppBarScrollState) => void,
) {
  const latest = useRef(onChange);
  useLayoutEffect(() => {
    latest.current = onChange;
  });
  // TopAppBarDefaults.snapAnimationSpec = MotionSchemeKeyTokens.DefaultEffects.
  const snapSpring = useSpringToken('default-effects');
  useEffect(() => {
    const el = target?.current;
    if (!el) return undefined;
    const range = EXPANDED_HEIGHT[size] - COLLAPSED_HEIGHT;
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
      latest.current({ overlapped: top > 0, fraction: range > 0 ? Math.min(1, top / range) : 0 });
    };
    const snap = () => {
      if (!exit || settle) return;
      const fraction = Math.min(1, Math.max(0, el.scrollTop) / range);
      // settleAppBar: nothing to do when (nearly) expanded or fully collapsed.
      if (fraction < SETTLE_MIN_FRACTION || fraction === 1) return;
      settle = animateSpring({
        spring: snapSpring,
        from: el.scrollTop,
        to: fraction < 0.5 ? 0 : range,
        precision: SETTLE_PRECISION,
        onUpdate: (value) => el.scrollTo({ top: value, behavior: 'instant' }),
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
}

/** Scroll position → { overlapped, collapsedFraction } for a bar of `size` over `target`. */
export function useAppBarScroll(
  target: RefObject<HTMLElement | null> | undefined,
  size: TopAppBarSize,
  options: AppBarScrollOptions = {},
): AppBarScrollState {
  const [state, setState] = useState<AppBarScrollState>({ overlapped: false, fraction: 0 });
  // Most scroll events change neither (e.g. scrolling further once collapsed): keep the state
  // object so React bails out of the render.
  useAppBarScrollEvents(target, size, options, (next) =>
    setState((prev) => (prev.overlapped === next.overlapped && prev.fraction === next.fraction ? prev : next)),
  );
  return state;
}
