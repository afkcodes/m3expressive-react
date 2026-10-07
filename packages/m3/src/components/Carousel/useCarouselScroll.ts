import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';
import { PointerVelocityTracker, pointerSlop, suppressNextClick } from '../../motion/gesture.ts';
import { splineFling } from '../../motion/fling.ts';
import { prefersReducedMotion } from '../../motion/context.tsx';
import { useSpringChannel } from '../../motion/useSpringChannel.ts';
import { itemPlacement, type Strategy } from './keylines.ts';
import type { CarouselLayout } from './types.ts';

/** singleAdvanceFlingBehavior's snapAnimationSpec: spring(stiffness = Spring.StiffnessMediumLow). */
const SNAP_SPRING = { dampingRatio: 1, stiffness: 400 };
/** SnapFlingBehavior MinFlingVelocityDp. */
const MIN_FLING_VELOCITY = 400;
/** PagerDefaults.flingBehavior snapPositionalThreshold. */
const SNAP_POSITIONAL_THRESHOLD = 0.5;
/** PagerState DefaultPositionThreshold (56dp). */
const DEFAULT_POSITION_THRESHOLD = 56;
/** A snap shorter than this (px) isn't started. */
const MIN_SNAP_DISTANCE = 0.5;
/** An item narrower than this (px) is hidden (an anchor keyline's leftover). */
const MIN_VISIBLE_SIZE = 0.5;
/** Arrow keys on a carousel without keylines scroll by this much (px). */
const KEY_SCROLL_STEP = 200;

/** The scroll position from the start edge (RTL scrollLeft runs from 0 to negative). */
const readScroll = (el: HTMLElement, rtl: boolean) => (rtl ? -el.scrollLeft : el.scrollLeft);
const writeScroll = (el: HTMLElement, rtl: boolean, value: number) => {
  el.scrollLeft = rtl ? -value : value;
};

/** The keyline geometry an item element was last given (unchanged values aren't written again). */
interface ItemStyle {
  width: string;
  transform: string;
  visibility: string;
}

export interface CarouselScrollOptions {
  viewport: RefObject<HTMLDivElement | null>;
  layout: CarouselLayout;
  /** The keyline strategy; null while unmeasured (or for layouts without keylines). */
  strategy: Strategy | null;
  count: number;
  /** maxScrollOffset of the keyline layout. */
  max: number;
  /** Item size + spacing (the pager's page). */
  pitch: number;
  padStart: number;
  rtl: boolean;
  /** Each item's snapped scroll position. */
  snapTargets: number[];
  initialItem: number;
}

/**
 * The keyline layouts' scrolling: every item placed for the scroll position (Compose
 * carouselItem), our pointer drags with the single-advance snap or the uncontained decay fling,
 * the snap after native scrolling, and arrow keys. Returns the handlers for the viewport and a ref
 * for each item.
 */
export function useCarouselScroll({
  viewport: viewportRef,
  layout,
  strategy,
  count,
  max,
  pitch,
  padStart,
  rtl,
  snapTargets,
  initialItem,
}: CarouselScrollOptions) {
  const itemEls = useRef<(HTMLDivElement | null)[]>([]);
  const [written] = useState(() => new WeakMap<HTMLElement, ItemStyle>());
  /** The scroll position the items were last placed for (scroll events at it are skipped). */
  const placedAt = useRef<number | null>(null);

  const writeItem = useCallback(
    (item: HTMLElement, next: ItemStyle) => {
      const prev = written.get(item);
      if (prev?.width !== next.width) item.style.width = next.width;
      if (prev?.transform !== next.transform) item.style.transform = next.transform;
      if (prev?.visibility !== next.visibility) item.style.visibility = next.visibility;
      written.set(item, next);
    },
    [written],
  );

  const place = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    if (!strategy) {
      // The plain row (unmeasured): drop the keyline geometry.
      placedAt.current = null;
      for (const item of itemEls.current) if (item) writeItem(item, { width: '', transform: '', visibility: '' });
      return;
    }
    const raw = readScroll(el, rtl);
    placedAt.current = raw;
    const scroll = Math.min(max, Math.max(0, raw));
    const size = strategy.itemMainAxisSize;
    // One keyline list for every item at this position.
    const keylines = strategy.getKeylineListForScrollOffset(scroll, max);
    itemEls.current.forEach((item, i) => {
      if (!item) return;
      const { maskSize, translation } = itemPlacement(strategy, keylines, i, scroll);
      // Pager position + keyline translation, then centre the visible box on the item's centre
      // (from the start edge: mirrored in RTL).
      const left = padStart + i * pitch + translation + (size - maskSize) / 2;
      writeItem(item, {
        width: `${Math.max(0, maskSize)}px`,
        transform: `translateX(${rtl ? -left : left}px)`,
        visibility: maskSize <= MIN_VISIBLE_SIZE ? 'hidden' : '',
      });
    });
  }, [viewportRef, strategy, max, padStart, pitch, rtl, writeItem]);

  // Rest state: the initial item's snap position.
  const initialised = useRef(false);
  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el || !strategy) return;
    if (!initialised.current) {
      writeScroll(el, rtl, snapTargets[Math.min(initialItem, count - 1)] ?? 0);
      initialised.current = true;
    }
  }, [viewportRef, strategy, snapTargets, initialItem, count, rtl]);
  // Every commit: items may have been added, removed or reordered (keyed elements move).
  useLayoutEffect(() => {
    place();
  });

  // Snap with the Compose snap spring (critically damped, stiffness 400) from a release velocity.
  const snap = useSpringChannel((value) => {
    const el = viewportRef.current;
    if (!el) return;
    writeScroll(el, rtl, value);
    place();
  });
  /** Cancels the uncontained decay fling in progress; null when there is none. */
  const fling = useRef<(() => void) | null>(null);
  const stop = () => {
    snap.stop();
    fling.current?.();
    fling.current = null;
  };
  /** Ends the pointer drag in progress (its window listeners); null when there is none. */
  const gesture = useRef<(() => void) | null>(null);
  // Unmounted: no drag or fling may keep running on a detached viewport (the snap stops itself).
  useEffect(
    () => () => {
      gesture.current?.();
      fling.current?.();
      fling.current = null;
    },
    [],
  );

  const settle = (target?: number, velocity = 0) => {
    const el = viewportRef.current;
    if (!el || snapTargets.length === 0) return;
    const from = readScroll(el, rtl);
    const to =
      target ??
      snapTargets.reduce((best, t) => (Math.abs(t - from) < Math.abs(best - from) ? t : best), snapTargets[0]!);
    stop();
    if (Math.abs(to - from) < MIN_SNAP_DISTANCE) return;
    // From where the scroll is now (the channel last moved it; a drag or the wheel may have since).
    snap.set(from);
    snap.to(to, prefersReducedMotion() ? null : SNAP_SPRING, velocity);
  };

  /**
   * PagerSnapLayoutInfoProvider calculateFinalSnappingBound for a release at `scroll` with scroll
   * velocity `velocity` (px/s, + forward) after a drag of `dragDelta` px (up − down, pointer x).
   */
  const singleAdvanceTarget = (scroll: number, velocity: number, dragDelta: number) => {
    let lower = -Infinity;
    let upper = Infinity;
    for (const t of snapTargets) {
      if (t <= scroll && t > lower) lower = t;
      if (t >= scroll && t < upper) upper = t;
    }
    if (lower === -Infinity) lower = upper;
    if (upper === Infinity) upper = lower;
    const notGesture = Math.trunc(dragDelta) === 0;
    const forward = !((notGesture ? -velocity : dragDelta) > 0);
    if (scroll >= max) {
      upper = scroll;
      if (forward) lower = scroll;
    }
    if (scroll <= 0) {
      lower = scroll;
      if (!forward) upper = scroll;
    }
    if (Math.abs(velocity) >= MIN_FLING_VELOCITY) return velocity > 0 ? upper : lower;
    const pageSize = strategy!.itemMainAxisSize;
    const offset = pageSize === 0 ? 0 : dragDelta / pageSize;
    const overflow = offset - Math.trunc(offset);
    const positionThresholdFraction = Math.min(DEFAULT_POSITION_THRESHOLD, pageSize / 2) / pageSize;
    if (Math.abs(overflow) > SNAP_POSITIONAL_THRESHOLD) return forward ? upper : lower;
    if (Math.abs(offset) >= Math.abs(positionThresholdFraction)) return forward ? lower : upper;
    return Math.abs(lower - scroll) < Math.abs(upper - scroll) ? lower : upper;
  };

  const dragging = useRef(false);
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = viewportRef.current;
    if (!el || !strategy || e.button !== 0) return;
    // Uncontained keeps the browser's touch scrolling (its momentum is the decay).
    if (layout === 'uncontained' && e.pointerType === 'touch') return;
    gesture.current?.();
    // Pointer x → logical scroll: dragging towards the end edge scrolls back.
    const toward = rtl ? -1 : 1;
    const id = e.pointerId;
    const downX = e.clientX;
    let x0 = e.clientX;
    let scroll0 = readScroll(el, rtl);
    let active = false;
    const slop = pointerSlop(e.pointerType);
    const tracker = new PointerVelocityTracker();
    tracker.down(e);
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== id) return;
      tracker.move(ev);
      if (!active) {
        const dx = ev.clientX - x0;
        if (Math.abs(dx) <= slop) return;
        active = true;
        dragging.current = true;
        stop();
        scroll0 = readScroll(el, rtl);
        x0 += Math.sign(dx) * slop; // Compose's overSlop
      }
      writeScroll(el, rtl, Math.min(max, Math.max(0, scroll0 - toward * (ev.clientX - x0))));
      place();
    };
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== id) return;
      end();
      if (!active) return;
      dragging.current = false;
      tracker.up(ev);
      suppressNextClick();
      const velocity = -toward * tracker.velocity().x;
      if (layout === 'uncontained') {
        // noSnapFlingBehavior: decay, no snap.
        if (velocity === 0 || prefersReducedMotion()) return;
        const from = readScroll(el, rtl);
        const decay = splineFling(velocity);
        let start: number | undefined;
        let frame = requestAnimationFrame(function tick(now) {
          start ??= now;
          const elapsed = now - start;
          const scroll = Math.min(max, Math.max(0, from + decay.position(elapsed)));
          writeScroll(el, rtl, scroll);
          place();
          const atBound = scroll <= 0 || scroll >= max;
          if (elapsed < decay.duration && !atBound) frame = requestAnimationFrame(tick);
          else fling.current = null;
        });
        fling.current = () => cancelAnimationFrame(frame);
        return;
      }
      settle(singleAdvanceTarget(readScroll(el, rtl), velocity, toward * (ev.clientX - downX)), velocity);
    };
    const end = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      if (gesture.current === end) gesture.current = null;
      dragging.current = false;
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    gesture.current = end;
  };

  // Native scrolling places the items (our drags / snaps / flings already have: their scroll
  // events find the items placed). Wheel / trackpad / keyboard scrolling settles on the nearest
  // item when it ends; uncontained doesn't snap. Read through a ref: the listeners stay attached.
  const onScrollEnd = useRef(() => {});
  useLayoutEffect(() => {
    onScrollEnd.current = () => {
      if (!snap.animating && fling.current == null && !dragging.current && layout !== 'uncontained') settle();
    };
  });
  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el || !strategy) return undefined;
    const onScroll = () => {
      if (readScroll(el, rtl) !== placedAt.current) place();
    };
    const onEnd = () => onScrollEnd.current();
    el.addEventListener('scroll', onScroll, { passive: true });
    el.addEventListener('scrollend', onEnd);
    return () => {
      el.removeEventListener('scroll', onScroll);
      el.removeEventListener('scrollend', onEnd);
    };
  }, [viewportRef, strategy, place, rtl]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const el = viewportRef.current;
    if (!el) return;
    if (layout === 'fullScreen') return;
    // Screen direction: in RTL the right arrow goes back towards the start.
    const right = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!right) return;
    e.preventDefault();
    if (strategy) {
      const pos = readScroll(el, rtl);
      const current = snapTargets.reduce(
        (bi, t, i) => (Math.abs(t - pos) < Math.abs(snapTargets[bi]! - pos) ? i : bi),
        0,
      );
      const next = Math.min(count - 1, Math.max(0, current + (rtl ? -right : right)));
      settle(snapTargets[next]);
    } else {
      el.scrollBy({ left: right * KEY_SCROLL_STEP, behavior: 'smooth' });
    }
  };

  const itemRef = (i: number) => (el: HTMLDivElement | null) => {
    itemEls.current[i] = el;
  };

  return { onPointerDown, onKeyDown, itemRef };
}
