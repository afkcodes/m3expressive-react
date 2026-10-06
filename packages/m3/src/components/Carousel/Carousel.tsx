import { Children, forwardRef, useCallback, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex';
import { heroKeylineList, itemPlacement, maxScrollOffset, multiBrowseKeylineList, Strategy, uncontainedKeylineList } from './keylines.ts';

/*
 * Figma kit, "Carousel" page (Carousel set 53912:27480, full screen 54577:26060, building blocks).
 *   Items: 28px corners, Surface Container High behind their content, 8px apart inside 16px side
 *   padding (uncontained: none at the end), 8px above / below.
 * Behaviour (Compose HorizontalMultiBrowseCarousel / HorizontalUncontainedCarousel /
 *   HorizontalCenteredHeroCarousel): the keyline model in ./keylines.ts — each item is sized to
 *   its interpolated keyline as it scrolls (large ⇄ medium ⇄ small ⇄ anchor) and pinned to its
 *   neighbours; scrolling settles on the nearest item (singleAdvanceFlingBehavior: spring,
 *   stiffness 400 / StiffnessMediumLow, no bounce). The kit draws each item at its visible size
 *   with its image fitted, so the item box (not a mask over a full-size item) takes the keyline
 *   size — identical to Compose's masked crop for height-bound, cover-fitted content.
 * Multi-aspect ratio: items keep their aspect ratio at the carousel's height and scroll freely.
 * Full screen: one item at a time, vertical paging.
 */
export type CarouselLayout = 'multi-browse' | 'hero' | 'center-hero' | 'uncontained' | 'multi-aspect' | 'full-screen';

const SPRING_STIFFNESS = 400;

const s = stylex.create({
  viewport: {
    position: 'relative',
    display: 'block',
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
  item: {
    position: 'absolute',
    top: 8,
    bottom: 8,
    left: 0,
    boxSizing: 'border-box',
    overflow: 'hidden',
    borderRadius: 28,
    backgroundColor: color.surfaceContainerHigh,
    willChange: 'transform, width',
  },
  // Multi-aspect: a plain scrolling row.
  row: { display: 'flex', columnGap: 8, height: '100%', boxSizing: 'border-box', paddingBlock: 8, paddingInline: 16, width: 'max-content' },
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
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

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
        ? Array.from({ length: count }, (_, i) => Math.min(max, Math.max(0, i * pitch - strategy.snapPositionOffset(i, count))))
        : [],
    [strategy, count, max, pitch],
  );

  const itemEls = useRef<(HTMLDivElement | null)[]>([]);
  const place = useCallback(() => {
    const el = viewport.current;
    if (!el || !strategy) return;
    const scroll = Math.min(max, Math.max(0, el.scrollLeft));
    const size = strategy.itemMainAxisSize;
    itemEls.current.forEach((item, i) => {
      if (!item) return;
      const { maskSize, translation } = itemPlacement(strategy, i, scroll, max);
      // Pager position + keyline translation, then centre the visible box on the item's centre.
      const left = padStart + i * pitch + translation + (size - maskSize) / 2;
      item.style.width = `${Math.max(0, maskSize)}px`;
      item.style.transform = `translateX(${left}px)`;
      item.style.visibility = maskSize <= 0.5 ? 'hidden' : '';
    });
  }, [strategy, max, padStart, pitch]);

  // Rest state: the initial item's snap position.
  const initialised = useRef(false);
  useLayoutEffect(() => {
    const el = viewport.current;
    if (!el || !strategy) return;
    if (!initialised.current) {
      el.scrollLeft = snapTargets[Math.min(initialItem, count - 1)] ?? 0;
      initialised.current = true;
    }
    place();
  }, [strategy, snapTargets, initialItem, count, place]);

  // Settle on the nearest item with the Compose snap spring (critically damped, stiffness 400).
  const anim = useRef<number | null>(null);
  const settle = useCallback(
    (target?: number) => {
      const el = viewport.current;
      if (!el || snapTargets.length === 0) return;
      const from = el.scrollLeft;
      const to = target ?? snapTargets.reduce((best, t) => (Math.abs(t - from) < Math.abs(best - from) ? t : best), snapTargets[0]!);
      if (Math.abs(to - from) < 0.5) return;
      if (anim.current) cancelAnimationFrame(anim.current);
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced) {
        el.scrollLeft = to;
        return;
      }
      const w = Math.sqrt(SPRING_STIFFNESS);
      const x0 = from - to;
      const t0 = performance.now();
      const step = (now: number) => {
        const t = (now - t0) / 1000;
        const x = (x0 + w * x0 * t) * Math.exp(-w * t);
        el.scrollLeft = to + x;
        if (Math.abs(x) > 0.3) anim.current = requestAnimationFrame(step);
        else {
          el.scrollLeft = to;
          anim.current = null;
        }
      };
      anim.current = requestAnimationFrame(step);
    },
    [snapTargets],
  );

  useLayoutEffect(() => {
    const el = viewport.current;
    if (!el || !strategy) return;
    const onScroll = () => place();
    const onEnd = () => {
      if (anim.current == null) settle();
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    el.addEventListener('scrollend', onEnd);
    return () => {
      el.removeEventListener('scroll', onScroll);
      el.removeEventListener('scrollend', onEnd);
    };
  }, [strategy, place, settle]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const el = viewport.current;
    if (!el) return;
    if (layout === 'full-screen') return;
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    if (strategy) {
      const current = snapTargets.reduce(
        (bi, t, i) => (Math.abs(t - el.scrollLeft) < Math.abs(snapTargets[bi]! - el.scrollLeft) ? i : bi),
        0,
      );
      const next = Math.min(count - 1, Math.max(0, current + dir));
      settle(snapTargets[next]);
    } else {
      el.scrollBy({ left: dir * 200, behavior: 'smooth' });
    }
  };

  const common = {
    ref: setRef,
    role: 'region',
    'aria-roledescription': 'carousel',
    'aria-label': ariaLabel,
    tabIndex: 0,
    onKeyDown,
  } as const;
  const slide = (i: number) => ({ role: 'group', 'aria-roledescription': 'slide', 'aria-label': `${i + 1} of ${count}` }) as const;

  if (layout === 'full-screen') {
    return (
      <div {...common} {...stylex.props(s.viewport, s.pager, sx)}>
        <div {...stylex.props(s.pageGap)}>
          {items.map((child, i) => (
            <div key={i} {...slide(i)} {...stylex.props(s.page)}>
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
            <div key={i} {...slide(i)} {...stylex.props(s.rowItem, s.aspect(aspectRatios[i] ?? 1))}>
              {child}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const trackWidth = available + max + padStart + padEnd;
  return (
    <div {...common} {...stylex.props(s.viewport, s.clip(padStart, padEnd), sx)}>
      <div style={{ width: trackWidth }} {...stylex.props(s.track)}>
        {strategy &&
          items.map((child, i) => (
            <div
              key={i}
              ref={(el) => {
                itemEls.current[i] = el;
              }}
              {...slide(i)}
              {...stylex.props(s.item)}
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
