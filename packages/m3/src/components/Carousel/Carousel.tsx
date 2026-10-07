import {
  Children,
  forwardRef,
  isValidElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex.ts';
import { animateSpring, type SpringAnimation } from '../../motion/animate.ts';
import { PointerVelocityTracker, pointerSlop, suppressNextClick } from '../../motion/gesture.ts';
import { splineFling } from '../../motion/fling.ts';
import { prefersReducedMotion } from '../../motion/context.tsx';
import {
  heroKeylineList,
  itemPlacement,
  maxScrollOffset,
  multiBrowseKeylineList,
  Strategy,
  uncontainedKeylineList,
} from './keylines.ts';

/*
 * Figma kit, "Carousel" page (Carousel set 53912:27480, full screen 54577:26060, building blocks).
 *   Items: 28px corners, Surface Container High behind their content, 8px apart inside 16px side
 *   padding (uncontained: none at the end), 8px above / below.
 * Behaviour (Compose HorizontalMultiBrowseCarousel / HorizontalUncontainedCarousel /
 *   HorizontalCenteredHeroCarousel): the keyline model in ./keylines.ts — each item is sized to
 *   its interpolated keyline as it scrolls (large ⇄ medium ⇄ small ⇄ anchor) and pinned to its
 *   neighbours. Drags (touch, mouse, pen) are ours: on release multi-browse / hero / centred hero
 *   advance at most one item (CarouselDefaults.singleAdvanceFlingBehavior = PagerDefaults
 *   .flingBehavior with PagerSnapDistance.atMost(1): ≥ 400dp/s goes to the next / previous item,
 *   slower picks by the dragged fraction — past half an item onwards, past 56dp back, else the
 *   closest) and snap on spring(stiffness = StiffnessMediumLow 400, no bounce) from the release
 *   velocity; uncontained flings freely with Compose's spline decay and doesn't snap
 *   (noSnapFlingBehavior; touch keeps the browser's own scrolling there). Wheel / trackpad scrolling
 *   stays native and snaps to the nearest item when it ends (snapping layouts). The kit draws each item at its visible size
 *   with its image fitted, so the item box (not a mask over a full-size item) takes the keyline
 *   size — identical to Compose's masked crop for height-bound, cover-fitted content.
 * Multi-aspect ratio: items keep their aspect ratio at the carousel's height and scroll freely.
 * Full screen: one item at a time, vertical paging.
 * RTL: the keyline layout runs on the logical scroll (start → end), mirrored on screen; arrows
 * follow the screen. Before the first measurement (server rendering, a hidden carousel) the
 * keyline layouts show their items in a plain row at their preferred width.
 * The viewport carries `data-m3-no-drag`: a sheet around it leaves its drags to it.
 */
export type CarouselLayout = 'multi-browse' | 'hero' | 'center-hero' | 'uncontained' | 'multi-aspect' | 'full-screen';

/** singleAdvanceFlingBehavior's snapAnimationSpec: spring(stiffness = Spring.StiffnessMediumLow). */
const SNAP_SPRING = { dampingRatio: 1, stiffness: 400 };
/** SnapFlingBehavior MinFlingVelocityDp. */
const MIN_FLING_VELOCITY = 400;
/** PagerDefaults.flingBehavior snapPositionalThreshold. */
const SNAP_POSITIONAL_THRESHOLD = 0.5;
/** PagerState DefaultPositionThreshold (56dp). */
const DEFAULT_POSITION_THRESHOLD = 56;

const s = stylex.create({
  viewport: {
    position: 'relative',
    display: 'block',
    userSelect: 'none',
    boxSizing: 'border-box',
    width: '100%',
    height: '100%',
    overflowX: 'auto',
    overflowY: 'hidden',
    overscrollBehaviorX: 'contain',
    scrollbarWidth: 'none',
    outlineStyle: 'none',
    '::-webkit-scrollbar': { display: 'none' },
  },
  track: { position: 'relative', height: '100%' },
  // Unmeasured keyline layouts: a plain row at the preferred item width (cqw: the viewport).
  unmeasured: { containerType: 'inline-size' },
  trackStatic: (start: number, end: number, gap: number) => ({
    display: 'flex',
    columnGap: gap,
    boxSizing: 'border-box',
    width: 'max-content',
    paddingBlock: 8,
    paddingInlineStart: start,
    paddingInlineEnd: end,
  }),
  itemStatic: {
    position: 'relative',
    flexShrink: 0,
    height: '100%',
    overflow: 'hidden',
    borderRadius: 28,
    backgroundColor: color.surfaceContainerHigh,
  },
  itemWidth: (width: string) => ({ width }),
  // Snapping carousels take horizontal touch drags themselves (vertical pans still scroll the page).
  ownDrag: { touchAction: 'pan-y' },
  item: {
    position: 'absolute',
    top: 8,
    bottom: 8,
    insetInlineStart: 0,
    boxSizing: 'border-box',
    overflow: 'hidden',
    borderRadius: 28,
    backgroundColor: color.surfaceContainerHigh,
    willChange: 'transform, width',
  },
  // Multi-aspect: a plain scrolling row.
  row: {
    display: 'flex',
    columnGap: 8,
    height: '100%',
    boxSizing: 'border-box',
    paddingBlock: 8,
    paddingInline: 16,
    width: 'max-content',
  },
  rowItem: {
    position: 'relative',
    flexShrink: 0,
    height: '100%',
    overflow: 'hidden',
    borderRadius: 28,
    backgroundColor: color.surfaceContainerHigh,
  },
  // Full screen: vertical paging.
  pager: { overflowX: 'hidden', overflowY: 'auto', scrollSnapType: 'y mandatory', overscrollBehaviorY: 'contain' },
  page: {
    position: 'relative',
    flexShrink: 0,
    height: '100%',
    overflow: 'hidden',
    borderRadius: 28,
    backgroundColor: color.surfaceContainerHigh,
    scrollSnapAlign: 'start',
    scrollSnapStop: 'always',
  },
  pageGap: { display: 'flex', flexDirection: 'column', rowGap: 8, height: '100%' },
  aspect: (ratio: number) => ({ aspectRatio: String(ratio) }),
  // Keyline anchors (the 10px entering / leaving sizes) lie outside the container in Compose; here
  // the keyline space is inset by the padding, so clip to it — items leave under the padding edge.
  clip: (start: number, end: number) => ({ clipPath: `inset(0 ${end}px 0 ${start}px)` }),
});

/** The scroll position from the start edge (RTL scrollLeft runs from 0 to negative). */
const readScroll = (el: HTMLElement, rtl: boolean) => (rtl ? -el.scrollLeft : el.scrollLeft);
const writeScroll = (el: HTMLElement, rtl: boolean, value: number) => {
  el.scrollLeft = rtl ? -value : value;
};
/** Slides keep their element (and state) when children are reordered. */
const keyOf = (child: ReactNode, i: number) => (isValidElement(child) && child.key != null ? child.key : i);

export interface CarouselProps {
  layout?: CarouselLayout;
  /** Multi-browse / hero: the preferred large item width (Compose preferredItemWidth). */
  preferredItemWidth?: number;
  /** Uncontained: the item width. */
  itemWidth?: number;
  /** Multi-aspect: each item's aspect ratio (width / height), in order. */
  aspectRatios?: number[];
  /** Px between items (default 8). */
  itemSpacing?: number;
  /** Side padding (default 16; uncontained has none at the end). */
  contentPadding?: number;
  /** Item to bring into focus on mount (e.g. 1 for a centred hero's resting state). */
  initialItem?: number;
  'aria-label': string;
  children: ReactNode;
  sx?: StyleXStyles;
}

/** A carousel of `CarouselItem`s. */
export const Carousel = forwardRef<HTMLDivElement, CarouselProps>(function Carousel(
  {
    layout = 'multi-browse',
    preferredItemWidth,
    itemWidth,
    aspectRatios = [],
    itemSpacing = 8,
    contentPadding = 16,
    initialItem = 0,
    'aria-label': ariaLabel,
    children,
    sx,
  },
  forwarded,
) {
  const items = Children.toArray(children);
  const count = items.length;
  const viewport = useRef<HTMLDivElement | null>(null);
  const setRef = useCallback(
    (el: HTMLDivElement | null) => {
      viewport.current = el;
      if (typeof forwarded === 'function') forwarded(el);
      else if (forwarded) forwarded.current = el;
    },
    [forwarded],
  );
  const [geometry, setGeometry] = useState({ width: 0, rtl: false });
  useLayoutEffect(() => {
    const el = viewport.current;
    if (!el) return undefined;
    const measure = () => {
      const next = { width: el.clientWidth, rtl: getComputedStyle(el).direction === 'rtl' };
      setGeometry((g) => (g.width === next.width && g.rtl === next.rtl ? g : next));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined; // jsdom / very old engines: measured once
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const { width, rtl } = geometry;

  const keyed = layout === 'multi-browse' || layout === 'hero' || layout === 'center-hero' || layout === 'uncontained';
  const padStart = contentPadding;
  const padEnd = layout === 'uncontained' ? 0 : contentPadding;
  const available = Math.max(0, width - padStart - padEnd);

  const strategy = useMemo(() => {
    if (!keyed || available === 0) return null;
    const keylines =
      layout === 'uncontained'
        ? // The visible item width (Compose adds the spacing to itemWidth for the keyline).
          uncontainedKeylineList(available, (itemWidth ?? available) - itemSpacing, itemSpacing)
        : layout === 'multi-browse'
          ? multiBrowseKeylineList(available, preferredItemWidth ?? available / 2, itemSpacing, count)
          : heroKeylineList(available, preferredItemWidth ?? null, itemSpacing, count, layout === 'center-hero');
    const st = new Strategy(keylines, available, itemSpacing);
    return st.isValid ? st : null;
  }, [keyed, available, layout, itemWidth, preferredItemWidth, itemSpacing, count]);

  const max = strategy ? maxScrollOffset(strategy, count) : 0;
  const pitch = strategy ? strategy.itemMainAxisSize + itemSpacing : 0;
  const snapTargets = useMemo(
    () =>
      strategy
        ? Array.from({ length: count }, (_, i) =>
            Math.min(max, Math.max(0, i * pitch - strategy.snapPositionOffset(i, count))),
          )
        : [],
    [strategy, count, max, pitch],
  );

  const itemEls = useRef<(HTMLDivElement | null)[]>([]);
  const place = useCallback(() => {
    const el = viewport.current;
    if (!el) return;
    if (!strategy) {
      // The plain row (unmeasured): drop the keyline geometry.
      for (const item of itemEls.current) {
        if (!item) continue;
        item.style.width = '';
        item.style.transform = '';
        item.style.visibility = '';
      }
      return;
    }
    const scroll = Math.min(max, Math.max(0, readScroll(el, rtl)));
    const size = strategy.itemMainAxisSize;
    itemEls.current.forEach((item, i) => {
      if (!item) return;
      const { maskSize, translation } = itemPlacement(strategy, i, scroll, max);
      // Pager position + keyline translation, then centre the visible box on the item's centre
      // (from the start edge: mirrored in RTL).
      const left = padStart + i * pitch + translation + (size - maskSize) / 2;
      item.style.width = `${Math.max(0, maskSize)}px`;
      item.style.transform = `translateX(${rtl ? -left : left}px)`;
      item.style.visibility = maskSize <= 0.5 ? 'hidden' : '';
    });
  }, [strategy, max, padStart, pitch, rtl]);

  // Rest state: the initial item's snap position.
  const initialised = useRef(false);
  useLayoutEffect(() => {
    const el = viewport.current;
    if (!el || !strategy) return;
    if (!initialised.current) {
      writeScroll(el, rtl, snapTargets[Math.min(initialItem, count - 1)] ?? 0);
      initialised.current = true;
    }
  }, [strategy, snapTargets, initialItem, count, rtl]);
  // Every commit: items may have been added, removed or reordered (keyed elements move).
  useLayoutEffect(() => {
    place();
  });

  // Snap with the Compose snap spring (critically damped, stiffness 400) from `velocity` (px/s).
  const anim = useRef<SpringAnimation | (() => void) | null>(null);
  const stop = () => {
    const a = anim.current;
    if (typeof a === 'function') a();
    else a?.stop();
    anim.current = null;
  };
  /** Ends the pointer drag in progress (its window listeners); null when there is none. */
  const gesture = useRef<(() => void) | null>(null);
  // Unmounted: no drag, snap or fling may keep running on a detached viewport.
  useEffect(
    () => () => {
      gesture.current?.();
      const a = anim.current;
      if (typeof a === 'function') a();
      else a?.stop();
      anim.current = null;
    },
    [],
  );
  const settle = useCallback(
    (target?: number, velocity = 0) => {
      const el = viewport.current;
      if (!el || snapTargets.length === 0) return;
      const from = readScroll(el, rtl);
      const to =
        target ??
        snapTargets.reduce((best, t) => (Math.abs(t - from) < Math.abs(best - from) ? t : best), snapTargets[0]!);
      stop();
      if (Math.abs(to - from) < 0.5) return;
      if (prefersReducedMotion()) {
        writeScroll(el, rtl, to);
        place();
        return;
      }
      anim.current = animateSpring({
        spring: SNAP_SPRING,
        from,
        to,
        velocity,
        onUpdate: (v) => {
          writeScroll(el, rtl, v);
          place();
        },
        onComplete: () => {
          anim.current = null;
        },
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [snapTargets, place, rtl],
  );

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
    const el = viewport.current;
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
        const fling = splineFling(velocity);
        let start: number | undefined;
        let frame = requestAnimationFrame(function tick(now) {
          start ??= now;
          const t = now - start;
          const scroll = Math.min(max, Math.max(0, from + fling.position(t)));
          writeScroll(el, rtl, scroll);
          place();
          const atBound = scroll <= 0 || scroll >= max;
          if (t < fling.duration && !atBound) frame = requestAnimationFrame(tick);
          else anim.current = null;
        });
        anim.current = () => cancelAnimationFrame(frame);
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

  useLayoutEffect(() => {
    const el = viewport.current;
    if (!el || !strategy) return undefined;
    const onScroll = () => place();
    // Wheel / trackpad / keyboard scrolling (not our drags or snaps) settles on the nearest item;
    // uncontained doesn't snap.
    const onEnd = () => {
      if (anim.current == null && !dragging.current && layout !== 'uncontained') settle();
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    el.addEventListener('scrollend', onEnd);
    return () => {
      el.removeEventListener('scroll', onScroll);
      el.removeEventListener('scrollend', onEnd);
    };
  }, [strategy, place, settle, layout]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const el = viewport.current;
    if (!el) return;
    if (layout === 'full-screen') return;
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
      el.scrollBy({ left: right * 200, behavior: 'smooth' });
    }
  };

  const common = {
    ref: setRef,
    role: 'region',
    'aria-roledescription': 'carousel',
    'aria-label': ariaLabel,
    tabIndex: 0,
    'data-m3-no-drag': '',
    onKeyDown,
  } as const;
  const slide = (i: number) =>
    ({ role: 'group', 'aria-roledescription': 'slide', 'aria-label': `${i + 1} of ${count}` }) as const;

  if (layout === 'full-screen') {
    return (
      <div {...common} {...stylex.props(s.viewport, s.pager, sx)}>
        <div {...stylex.props(s.pageGap)}>
          {items.map((child, i) => (
            <div key={keyOf(child, i)} {...slide(i)} {...stylex.props(s.page)}>
              {child}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (layout === 'multi-aspect') {
    return (
      <div {...common} {...stylex.props(s.viewport, sx)}>
        <div {...stylex.props(s.row)}>
          {items.map((child, i) => (
            <div key={keyOf(child, i)} {...slide(i)} {...stylex.props(s.rowItem, s.aspect(aspectRatios[i] ?? 1))}>
              {child}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const trackWidth = available + max + padStart + padEnd;
  // Unmeasured: the preferred width, or a share of the viewport (cqw) like the keylines' defaults.
  const staticWidth =
    layout === 'uncontained'
      ? itemWidth != null
        ? `${itemWidth - itemSpacing}px`
        : `calc(100cqw - ${padStart + itemSpacing}px)`
      : preferredItemWidth != null
        ? `${preferredItemWidth}px`
        : layout === 'multi-browse'
          ? `calc((100cqw - ${padStart + padEnd + itemSpacing}px) / 2)`
          : `calc(100cqw - ${padStart + padEnd}px)`;
  const track = stylex.props(s.track, !strategy && s.trackStatic(padStart, padEnd, itemSpacing));
  return (
    <div
      {...common}
      onPointerDown={onPointerDown}
      onDragStart={(e) => e.preventDefault()}
      {...stylex.props(
        s.viewport,
        layout !== 'uncontained' && s.ownDrag,
        // The clip insets are physical: the start padding is on the right in RTL.
        rtl ? s.clip(padEnd, padStart) : s.clip(padStart, padEnd),
        !strategy && s.unmeasured,
        sx,
      )}
    >
      <div {...track} style={strategy ? { ...track.style, width: trackWidth } : track.style}>
        {items.map((child, i) => (
          <div
            key={keyOf(child, i)}
            ref={(el) => {
              itemEls.current[i] = el;
            }}
            {...slide(i)}
            {...stylex.props(strategy ? s.item : [s.itemStatic, s.itemWidth(staticWidth)])}
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  );
});

const itemStyles = stylex.create({
  fill: { position: 'absolute', inset: 0, display: 'block' },
});

/** Carousel content: fills the item (images: use object-fit). */
export function CarouselItem({ children, sx }: { children?: ReactNode; sx?: StyleXStyles }) {
  return <div {...stylex.props(itemStyles.fill, sx)}>{children}</div>;
}
