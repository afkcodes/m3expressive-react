import {
  Children,
  isValidElement,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type DragEvent,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import * as stylex from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex.ts';
import { useMergedRefs } from '../../hooks/useMergedRefs.ts';
import type { SxProps } from '../../primitives/types.ts';
import { useLabels, type M3Labels } from '../../theme/labels.tsx';
import {
  heroKeylineList,
  maxScrollOffset,
  multiBrowseKeylineList,
  Strategy,
  uncontainedKeylineList,
} from './keylines.ts';
import type { CarouselLayout } from './types.ts';
import { useCarouselScroll } from './useCarouselScroll.ts';

export type { CarouselLayout } from './types.ts';

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

/** Rendered slides (conditional children leave false / null behind). */
const itemCount = (children: ReactNode) => Children.toArray(children).length;

/** No keyline layout: nothing to snap to. */
const NO_SNAP_TARGETS: number[] = [];

/** Slides keep their element (and state) when children are reordered. */
const keyOf = (child: ReactNode, i: number) => (isValidElement(child) && child.key != null ? child.key : i);

/**
 * `ref` and the native props go to the scrolling viewport (`role="region"`, the root); handlers
 * you pass run before the carousel's own (keys, drags).
 */
export interface CarouselProps extends SxProps<Omit<ComponentPropsWithRef<'div'>, 'children'>> {
  /** Default `'multiBrowse'`. */
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
  /**
   * Item to bring into focus on mount (e.g. 1 for a centred hero's resting state). Uncontrolled:
   * scrolling, dragging and arrow keys move on from it.
   */
  defaultItem?: number;
  'aria-label': string;
  children: ReactNode;
  /** Overrides for the built-in strings (`carousel`, `slide`, `slidePosition`). */
  labels?: Partial<M3Labels>;
}

/** A carousel of `CarouselItem`s. */
export function Carousel({
  ref,
  layout = 'multiBrowse',
  preferredItemWidth,
  itemWidth,
  aspectRatios = [],
  itemSpacing = 8,
  contentPadding = 16,
  defaultItem = 0,
  labels: labelsProp,
  children,
  sx,
  onKeyDown: onKeyDownProp,
  onPointerDown: onPointerDownProp,
  onDragStart: onDragStartProp,
  ...rest
}: CarouselProps) {
  const labels = useLabels(labelsProp);
  const items = Children.toArray(children);
  // Counted apart from `items` (an array the render maps over), so the keyline memo depends on a number.
  const count = itemCount(children);
  const viewport = useRef<HTMLDivElement | null>(null);
  const setRef = useMergedRefs(viewport, ref);
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

  const keyed = layout === 'multiBrowse' || layout === 'hero' || layout === 'centeredHero' || layout === 'uncontained';
  const padStart = contentPadding;
  const padEnd = layout === 'uncontained' ? 0 : contentPadding;
  const available = Math.max(0, width - padStart - padEnd);

  // The keyline layout for the measured width (null: unmeasured, or a layout without keylines).
  const keylineLayout = useMemo(() => {
    if (!keyed || available === 0) return null;
    const keylines =
      layout === 'uncontained'
        ? // The visible item width (Compose adds the spacing to itemWidth for the keyline).
          uncontainedKeylineList(available, (itemWidth ?? available) - itemSpacing, itemSpacing)
        : layout === 'multiBrowse'
          ? multiBrowseKeylineList(available, preferredItemWidth ?? available / 2, itemSpacing, count)
          : heroKeylineList(available, preferredItemWidth ?? null, itemSpacing, count, layout === 'centeredHero');
    const strategy = new Strategy(keylines, available, itemSpacing);
    if (!strategy.isValid) return null;
    const max = maxScrollOffset(strategy, count);
    const pitch = strategy.itemMainAxisSize + itemSpacing;
    const snapTargets = Array.from({ length: count }, (_, i) =>
      Math.min(max, Math.max(0, i * pitch - strategy.snapPositionOffset(i, count))),
    );
    return { strategy, max, pitch, snapTargets };
  }, [keyed, available, layout, itemWidth, preferredItemWidth, itemSpacing, count]);
  const strategy = keylineLayout?.strategy ?? null;
  const max = keylineLayout?.max ?? 0;
  const pitch = keylineLayout?.pitch ?? 0;
  const snapTargets = keylineLayout?.snapTargets ?? NO_SNAP_TARGETS;

  const { onPointerDown, onKeyDown, itemRef } = useCarouselScroll({
    viewport,
    layout,
    strategy,
    count,
    max,
    pitch,
    padStart,
    rtl,
    snapTargets,
    initialItem: defaultItem,
  });

  const common = {
    ref: setRef,
    role: 'region',
    'aria-roledescription': labels.carousel,
    tabIndex: 0,
    'data-m3-no-drag': '',
    ...rest,
    // The keyline layouts add their drags (below); the others scroll natively.
    onPointerDown: onPointerDownProp,
    onDragStart: onDragStartProp,
    onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
      onKeyDownProp?.(e);
      onKeyDown(e);
    },
  };
  const slide = (i: number) =>
    ({
      role: 'group',
      'aria-roledescription': labels.slide,
      'aria-label': labels.slidePosition(i + 1, count),
    }) as const;

  if (layout === 'fullScreen') {
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

  if (layout === 'multiAspect') {
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
        : layout === 'multiBrowse'
          ? `calc((100cqw - ${padStart + padEnd + itemSpacing}px) / 2)`
          : `calc(100cqw - ${padStart + padEnd}px)`;
  const track = stylex.props(s.track, !strategy && s.trackStatic(padStart, padEnd, itemSpacing));
  return (
    <div
      {...common}
      onPointerDown={(e: PointerEvent<HTMLDivElement>) => {
        onPointerDownProp?.(e);
        onPointerDown(e);
      }}
      onDragStart={(e: DragEvent<HTMLDivElement>) => {
        onDragStartProp?.(e);
        e.preventDefault();
      }}
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
            ref={itemRef(i)}
            {...slide(i)}
            {...stylex.props(strategy ? s.item : [s.itemStatic, s.itemWidth(staticWidth)])}
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}

const itemStyles = stylex.create({
  fill: { position: 'absolute', inset: 0, display: 'block' },
});

export type CarouselItemProps = SxProps<ComponentPropsWithRef<'div'>>;

/** Carousel content: fills the item (images: use object-fit). */
export function CarouselItem({ sx, ...rest }: CarouselItemProps) {
  return <div {...rest} {...stylex.props(itemStyles.fill, sx)} />;
}
