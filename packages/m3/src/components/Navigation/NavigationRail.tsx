import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useContext,
  type ComponentPropsWithRef,
  type ReactNode,
} from 'react';
import * as stylex from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex.ts';
import { useControllableState } from '../../hooks/useControllableState.ts';
import { useMergedRefs } from '../../hooks/useMergedRefs.ts';
import type { SxProps } from '../../primitives/types.ts';
import { motion } from '../../tokens/motion.stylex.ts';
import { typescale } from '../../tokens/typescale.ts';
import { useSpringToken } from '../../motion/context.tsx';
import { useSpringChannel } from '../../motion/useSpringChannel.ts';
import { createRailProgress, NavContext, type RailMorph, type RailProgress } from './context.ts';
import { railItemSpacing } from './railMorph.ts';

/** Kit rail widths and bottom padding: collapsed (Compose NavigationRail) / expanded (WideNavigationRail). */
const COLLAPSED_WIDTH = 96;
const EXPANDED_WIDTH = 220;
const COLLAPSED_PADDING_BOTTOM = 56;
const EXPANDED_PADDING_BOTTOM = 20;

/* The rail container — kit geometry and motion in ./Navigation.tsx. */
const s = stylex.create({
  rail: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    rowGap: 40,
    boxSizing: 'border-box',
    width: COLLAPSED_WIDTH,
    height: '100%',
    paddingTop: 44,
    paddingBottom: COLLAPSED_PADDING_BOTTOM,
    overflow: 'hidden',
    transitionProperty: 'width',
    transitionDuration: motion.defaultSpatialDuration,
    transitionTimingFunction: motion.defaultSpatialEasing,
  },
  railExpanded: {
    width: EXPANDED_WIDTH,
    alignItems: 'stretch',
    paddingInline: 20,
    paddingBottom: EXPANDED_PADDING_BOTTOM,
  },
  // Mid-morph the rail is driven per frame (width, padding and item spacing written by
  // useRailMorph) — Compose's layout: items from x 0 with their 20px start padding inside.
  railMorph: { alignItems: 'flex-start', paddingInline: 0, transitionProperty: 'none' },
  railHeaderMorphCollapsed: { width: COLLAPSED_WIDTH },
  railHeaderMorphExpanded: { alignSelf: 'stretch', alignItems: 'flex-start', paddingInline: 20 },
  railItemsMorph: { alignItems: 'flex-start' },
  railFloating: { backgroundColor: color.surfaceContainer, borderRadius: 16 },
  railHeader: { display: 'flex', flexDirection: 'column', alignItems: 'center', rowGap: 4 },
  railHeaderExpanded: { alignItems: 'flex-start' },
  railItems: { display: 'flex', flexDirection: 'column', alignItems: 'center', rowGap: 4 },
  // Items in an expanded rail touch (Compose spacing 0); sections sit 12px apart (kit).
  railItemsExpanded: { alignItems: 'stretch', rowGap: 0 },
  section: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginTop: { default: 0, ':not(:first-child)': 12 },
  },
  sectionHeaderMorph: { marginInlineStart: 20 },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    boxSizing: 'border-box',
    alignSelf: 'stretch',
    height: 36,
    paddingInline: 16,
    margin: 0,
    color: color.onSurfaceVariant,
  },
});

/** `ref`, native props and `sx` go to the `<nav>`. */
export interface NavigationRailProps extends SxProps<Omit<ComponentPropsWithRef<'nav'>, 'defaultValue'>> {
  /** The selected destination (the `value` of a `NavigationItem`). */
  value?: unknown;
  defaultValue?: unknown;
  onValueChange?: (value: unknown) => void;
  /**
   * Expanded rail (220px, items in rows). Controlled only: layout state the rail never changes
   * itself (your menu button toggles it), so there is no `defaultExpanded` / `onExpandedChange`.
   */
  expanded?: boolean;
  /** Expanded rails: docked (no container) or floating (Surface Container, 16px corners). */
  layout?: 'docked' | 'floating';
  alignment?: 'top' | 'middle';
  /** Collapsed rails: labels under the icons (default true). */
  showLabels?: boolean;
  /** Menu button and FAB above the destinations. */
  header?: ReactNode;
  children: ReactNode;
}

const lerp = (from: number, to: number, fraction: number) => from + (to - from) * fraction;
const px = (value: number) => `${value}px`;

/** Navigation rail (Compose NavigationRail / WideNavigationRail); width springs when expanding. */
export function NavigationRail({
  value,
  defaultValue,
  onValueChange,
  expanded = false,
  layout = 'docked',
  alignment = 'top',
  showLabels = true,
  header,
  children,
  sx,
  ref,
  ...rest
}: NavigationRailProps) {
  const middle = alignment === 'middle';
  const [selected, setSelected] = useControllableState(value, defaultValue, onValueChange);
  const rail = useRef<HTMLElement>(null);
  const railRef = useMergedRefs(rail, ref);
  const items = useRef<HTMLDivElement>(null);
  const [headerEl, setHeaderEl] = useState<HTMLDivElement | null>(null);
  const { morph, progress } = useRailMorph(expanded, showLabels);

  // Mid-morph: the rail's width, bottom padding and item spacing follow the progress (written per
  // frame; dropped at rest, where the kit's classes take over).
  useLayoutEffect(() => {
    const nav = rail.current;
    const list = items.current;
    if (!morph || !nav || !list) return undefined;
    const apply = (value: number) => {
      nav.style.width = px(lerp(COLLAPSED_WIDTH, EXPANDED_WIDTH, value));
      nav.style.paddingBottom = px(lerp(COLLAPSED_PADDING_BOTTOM, EXPANDED_PADDING_BOTTOM, value));
      list.style.rowGap = px(railItemSpacing(value));
    };
    apply(progress.value);
    const unsubscribe = progress.subscribe(apply);
    return () => {
      unsubscribe();
      nav.style.removeProperty('width');
      nav.style.removeProperty('padding-bottom');
      list.style.removeProperty('row-gap');
    };
  }, [morph, progress]);

  // Middle: the destinations centre in the rail's full height (overlapping the header gap if need
  // be, as the kit's 6-item rail does); when that would reach the header they stay where a
  // top-aligned rail puts them. Measured, then applied as a transform (layout stays top-aligned):
  // now, and whenever the rail, its destinations or the header resize — an expand / collapse
  // included (observers report before paint). The header element is observed, not the `header`
  // node (a ReactNode is new on every render).
  useLayoutEffect(() => {
    const list = items.current;
    const nav = list?.parentElement;
    if (!middle || !list || !nav) return undefined;
    const measure = () => {
      const centred = (nav.clientHeight - list.offsetHeight) / 2;
      const headerBottom = headerEl ? headerEl.offsetTop + headerEl.offsetHeight : 0;
      const shift = centred >= headerBottom ? centred - list.offsetTop : 0;
      list.style.transform = shift !== 0 ? `translateY(${shift}px)` : '';
    };
    measure();
    const resizes = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure); // jsdom / very old engines: measured once
    resizes?.observe(nav);
    resizes?.observe(list);
    if (headerEl) resizes?.observe(headerEl);
    return () => {
      resizes?.disconnect();
      list.style.removeProperty('transform');
    };
  }, [middle, headerEl]);

  const ctx = useMemo(
    () => ({
      layout: expanded ? ('railHorizontal' as const) : ('vertical' as const),
      value: selected,
      onSelect: setSelected,
      showLabels,
      fill: false,
      morph,
      progress,
    }),
    [expanded, selected, setSelected, showLabels, morph, progress],
  );
  return (
    <nav
      {...rest}
      ref={railRef}
      {...stylex.props(
        s.rail,
        expanded && s.railExpanded,
        expanded && layout === 'floating' && s.railFloating,
        morph && s.railMorph,
        sx,
      )}
    >
      {header != null && (
        <div
          ref={setHeaderEl}
          {...stylex.props(
            s.railHeader,
            expanded && s.railHeaderExpanded,
            morph && (expanded ? s.railHeaderMorphExpanded : s.railHeaderMorphCollapsed),
          )}
        >
          {header}
        </div>
      )}
      <div ref={items} {...stylex.props(s.railItems, expanded && s.railItemsExpanded, morph && s.railItemsMorph)}>
        <NavContext value={ctx}>{children}</NavContext>
      </div>
    </nav>
  );
}

/**
 * The rail's collapse / expand progress (Compose: each item's iconPositionProgress plus the rail's
 * width, item spacing and minimum height, all DefaultSpatial — one spring here). Retargets keep
 * velocity (animateFloatAsState). The progress is published outside React (a frame re-renders
 * nothing); `morph` is null at rest, so the kit's rest layouts render untouched, and changes only
 * when a morph starts, crosses halfway while collapsing (the label style) or ends.
 * Collapsed rails without labels switch instantly (Compose has no hidden-label wide rail item).
 */
function useRailMorph(expanded: boolean, showLabels: boolean): { morph: RailMorph | null; progress: RailProgress } {
  const spring = useSpringToken('default-spatial');
  const [progress] = useState(() => createRailProgress(expanded ? 1 : 0));
  const [toExpanded, setToExpanded] = useState<boolean | null>(null);
  // A change of `expanded` starts the morph (or snaps) in the same render.
  const [prevExpanded, setPrevExpanded] = useState(expanded);
  if (prevExpanded !== expanded) {
    setPrevExpanded(expanded);
    setToExpanded(spring && showLabels ? expanded : null);
  }
  // AnimatedNavigationItem: the collapsed text style only while collapsing and under halfway.
  const topLabels = useSyncExternalStore(
    progress.subscribe,
    () => toExpanded === false && progress.value < 0.5,
    () => false,
  );
  const channel = useSpringChannel((value) => progress.set(value), {
    initial: expanded ? 1 : 0,
    onRest: () => setToExpanded(null),
  });
  useLayoutEffect(() => {
    channel.to(expanded ? 1 : 0, showLabels ? spring : null);
  }, [channel, expanded, spring, showLabels]);
  const morph = useMemo(() => (toExpanded == null ? null : { toExpanded, topLabels }), [toExpanded, topLabels]);
  return { morph, progress };
}

/** `ref`, native props and `sx` go to the `<div role="group">`. */
export interface NavigationRailSectionProps extends SxProps<ComponentPropsWithRef<'div'>> {
  /** Section header (label-large, 36px). */
  label?: ReactNode;
  /** The section's `NavigationItem`s. */
  children: ReactNode;
}

/** A labelled group of destinations in an expanded rail (sections sit 12px apart). */
export function NavigationRailSection({ label, children, sx, ...rest }: NavigationRailSectionProps) {
  const { morph } = useContext(NavContext);
  return (
    <div role="group" {...rest} {...stylex.props(s.section, sx)}>
      {label != null && (
        <p {...stylex.props(typescale.labelLarge, s.sectionHeader, morph && s.sectionHeaderMorph)}>{label}</p>
      )}
      {children}
    </div>
  );
}
