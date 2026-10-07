import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEventHandler,
  type ReactNode,
} from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex.ts';
import { motion } from '../../tokens/motion.stylex.ts';
import { typescale } from '../../tokens/typescale.ts';
import { textBox, textCentred } from '../../primitives/textBox.ts';
import { interaction } from '../../primitives/state.stylex.ts';
import { StateLayer, stateLayerHost } from '../../primitives/StateLayer.tsx';
import { useForcedState } from '../../testing/ForceState.tsx';
import { useSpringToken } from '../../motion/context.tsx';
import { animateSpring, type SpringAnimation } from '../../motion/animate.ts';
import { railItemGeometry, railItemSpacing, type RailLabelMetrics } from './railMorph.ts';

/** How an item lays out: icon over label (bar / collapsed rail), or in a row (wide bar / expanded rail). */
export type NavigationItemLayout = 'vertical' | 'horizontal' | 'rail-horizontal';

interface NavContextValue {
  layout: NavigationItemLayout;
  value: unknown;
  onSelect?: (value: unknown) => void;
  /** Collapsed rail: show labels under icons (default true). */
  showLabels: boolean;
  /** Bar items share the bar's width. */
  fill: boolean;
  /** Rail collapsing / expanding: the items' iconPositionProgress (0 collapsed … 1 expanded). */
  morph?: { p: number; toExpanded: boolean } | null;
}
const NavContext = createContext<NavContextValue>({
  layout: 'vertical',
  value: undefined,
  showLabels: true,
  fill: false,
});

/*
 * Figma kit, "Navigation" page (Navigation bar / rail building blocks; Compose ShortNavigationBar,
 * NavigationRail, WideNavigationRail, NavigationItem).
 *   Vertical item: a 56×32 pill (16px corners; 56×56 / 28px without a label) over a 12/16
 *   label-medium label 4px below, 6px vertical padding. Selected: Secondary Container pill, On
 *   Secondary Container icon (the filled glyph), Secondary label; otherwise On Surface Variant.
 *   Horizontal (wide bar): the pill is 40px tall and holds icon + label (16 / 8px padding, 4px gap).
 *   Rail horizontal (expanded rail): a 56px fully rounded pill, 16px padding, 8px gaps, label-large.
 *   Layers sit on the pill: hover 8%, focus and press 10% (no ripple). Badges sit on the icon's
 *   top-right (small 6px at +10/−? / large 16px), large ones after the label in the expanded rail.
 * Motion (Compose NavigationItem.kt): the selected indicator's width and alpha follow one default
 * spatial progress (alpha clamps at 1) — bar pills grow from their centre, rail indicators from
 * their start edge. Bar icon / label colours switch without animation; rail labels fade on default
 * effects. Expanding / collapsing the rail morphs every item on one default spatial progress
 * (AnimatedNavigationItem, see railMorph.ts): size, indicator, icon position, the label jumping
 * beside the icon halfway with alpha 4(p − ½)², item spacing and minimum height.
 */
const s = stylex.create({
  item: {
    position: 'relative',
    display: 'flex',
    boxSizing: 'border-box',
    margin: 0,
    padding: 0,
    borderWidth: 0,
    borderStyle: 'none',
    backgroundColor: 'transparent',
    outlineStyle: 'none',
    cursor: 'pointer',
    userSelect: 'none',
    textDecoration: 'none',
    fontFamily: 'inherit',
    color: color.onSurfaceVariant,
    [interaction.layerColor]: color.onSurface,
  },
  itemDisabled: { cursor: 'default', opacity: 0.38 },
  // ── vertical ──
  // Pills are centred with a transform (50cqw − 50%): items are often fractional-width (412 / 4)
  // and Chrome snaps layout offsets to whole px, transforms keep Figma's exact position.
  vertical: {
    flexDirection: 'column',
    alignItems: 'center',
    rowGap: 4,
    paddingBlock: 6,
    minWidth: 0,
    containerType: 'inline-size',
  },
  centreX: { alignSelf: 'flex-start', transform: 'translateX(calc(50cqw - 50%))' },
  verticalNoLabel: { paddingBlock: 4 },
  fill: { flexGrow: 1, flexBasis: 0 },
  railWidth: { width: 96 },
  pill: {
    position: 'relative',
    isolation: 'isolate',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    width: 56,
    height: 32,
    borderRadius: 16,
  },
  pillTall: { height: 56, borderRadius: 28 },
  // The selected fill: width × progress and alpha = progress on one default spatial spring (bar:
  // from the pill's centre; rail: from its start edge, fillStart).
  fillLayer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: 0,
    opacity: 0,
    zIndex: -2,
    borderRadius: 'inherit',
    transform: 'translateX(-50%)',
    backgroundColor: color.secondaryContainer,
    transitionProperty: 'width, opacity',
    transitionDuration: motion.defaultSpatialDuration,
    transitionTimingFunction: motion.defaultSpatialEasing,
  },
  fillStart: { left: 0, transform: 'none' },
  fillOn: { width: '100%', opacity: 1 },
  // Icons carry their colour in both states (Compose: icon colour isn't animated).
  icon: { position: 'relative', display: 'flex', width: 24, height: 24, flexShrink: 0, color: color.onSurfaceVariant },
  // Rail labels fade on default effects (Compose StyledLabel animateColor); bar labels don't. On the
  // item root, which the label inherits from (icons carry their own colour), so the fade survives
  // the switch between rest and morph layouts.
  labelMotion: {
    transitionProperty: 'color',
    transitionDuration: motion.defaultEffectsDuration,
    transitionTimingFunction: motion.defaultEffectsEasing,
  },
  label: { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' },
  selected: { color: color.secondary, [interaction.layerColor]: color.onSecondaryContainer },
  iconSelected: { color: color.onSecondaryContainer },
  // Badge wrappers are flex boxes (no line box under the badge).
  badgeSmall: { position: 'absolute', display: 'flex', left: 34, top: 4 },
  badgeSmallTall: { top: 16 },
  badgeLarge: { position: 'absolute', display: 'flex', left: 28, top: 2 },
  badgeLargeTall: { top: 14 },
  // ── horizontal (wide bar) ──
  horizontal: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: 64,
    minWidth: 0,
    containerType: 'inline-size',
  },
  hPill: {
    position: 'relative',
    isolation: 'isolate',
    display: 'flex',
    alignItems: 'center',
    columnGap: 4,
    boxSizing: 'border-box',
    height: 40,
    paddingInline: 16,
    paddingBlock: 8,
    borderRadius: 20,
  },
  hSelected: { color: color.onSecondaryContainer },
  hLayer: { [interaction.layerColor]: color.onSecondaryContainer },
  hBadgeSmall: { position: 'absolute', display: 'flex', left: 34, top: 8 },
  hBadgeLarge: { position: 'absolute', display: 'flex', left: 28, top: 6 },
  // ── rail horizontal (expanded rail) ──
  railH: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    columnGap: 8,
    height: 56,
    paddingInline: 16,
    borderRadius: 28,
    isolation: 'isolate',
  },
  railHSelected: { color: color.onSecondaryContainer, [interaction.layerColor]: color.onSecondaryContainer },
  railHBadgeSmall: { position: 'absolute', display: 'flex', left: 34, top: 16 },
  railHBadgeLarge: { display: 'flex' },
  // ── containers ──
  bar: {
    display: 'flex',
    boxSizing: 'border-box',
    width: '100%',
    height: 64,
    backgroundColor: color.surfaceContainer,
  },
  barHorizontal: { justifyContent: 'space-between' },
  barInset: (px: number) => ({ paddingInline: px }),
  rail: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    rowGap: 40,
    boxSizing: 'border-box',
    width: 96,
    height: '100%',
    paddingTop: 44,
    paddingBottom: 56,
    overflow: 'hidden',
    transitionProperty: 'width',
    transitionDuration: motion.defaultSpatialDuration,
    transitionTimingFunction: motion.defaultSpatialEasing,
  },
  railExpanded: { width: 220, alignItems: 'stretch', paddingInline: 20, paddingBottom: 20 },
  // Mid-morph the rail is driven per frame (width, items) — Compose's layout: items from x 0 with
  // their 20px start padding inside.
  railMorph: { alignItems: 'flex-start', paddingInline: 0, transitionProperty: 'none' },
  railMorphSize: (width: number, paddingBottom: number) => ({ width, paddingBottom }),
  railHeaderMorphCollapsed: { width: 96 },
  railHeaderMorphExpanded: { alignSelf: 'stretch', alignItems: 'flex-start', paddingInline: 20 },
  railItemsMorph: (gap: number) => ({ alignItems: 'flex-start', rowGap: gap }),
  railFloating: { backgroundColor: color.surfaceContainer, borderRadius: 16 },
  railHeader: { display: 'flex', flexDirection: 'column', alignItems: 'center', rowGap: 4 },
  railHeaderExpanded: { alignItems: 'flex-start' },
  railItems: { display: 'flex', flexDirection: 'column', alignItems: 'center', rowGap: 4 },
  // Items in an expanded rail touch (Compose spacing 0); sections sit 12px apart (kit).
  railItemsExpanded: { alignItems: 'stretch', rowGap: 0 },
  // Middle: the destinations centre in the rail's full height (overlapping the header gap if need
  // be, as the kit's 6-item rail does); when that would reach the header they stay where a
  // top-aligned rail puts them. Measured, then applied as a transform (layout stays top-aligned).
  railMiddleShift: (px: number) => ({ transform: `translateY(${px}px)` }),
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
  // ── rail morph (item parts placed per frame) ──
  mItem: (width: number, height: number) => ({ width, height, alignSelf: 'flex-start', flexShrink: 0 }),
  mBox: (x: number, y: number, width: number, height: number) => ({
    position: 'absolute',
    left: x,
    top: y,
    width,
    height,
  }),
  mAt: (x: number, y: number) => ({ position: 'absolute', left: x, top: y }),
  mLabel: (alpha: number) => ({ whiteSpace: 'nowrap', opacity: alpha }),
  mRound: { borderRadius: 9999, isolation: 'isolate' },
  measure: { position: 'absolute', left: 0, top: 0, visibility: 'hidden', whiteSpace: 'nowrap', pointerEvents: 'none' },
});

export interface NavigationItemProps {
  value: unknown;
  icon: ReactNode;
  /** Icon shown while selected (the kit swaps to the filled glyph). */
  selectedIcon?: ReactNode;
  label?: ReactNode;
  /** A `<Badge>` (no children = the small dot). */
  badge?: ReactNode;
  badgeSize?: 'small' | 'large';
  disabled?: boolean;
  href?: string;
  onClick?: MouseEventHandler<HTMLElement>;
  /** Static rendering (outside a bar / rail). */
  selected?: boolean;
  sx?: StyleXStyles;
}

/** A destination in a navigation bar or rail. */
export function NavigationItem({
  value,
  icon,
  selectedIcon,
  label,
  badge,
  badgeSize = 'large',
  disabled = false,
  href,
  onClick,
  selected: selectedProp,
  sx,
}: NavigationItemProps) {
  const ctx = useContext(NavContext);
  const forced = useForcedState();
  const selected = selectedProp ?? (ctx.value !== undefined && ctx.value === value);
  const showLabel = label != null && (ctx.layout !== 'vertical' || ctx.showLabels);
  // Rail items: indicator from the start edge, label colour animated (bar items: neither).
  const rail = !ctx.fill;
  const morph = ctx.morph != null && label != null ? ctx.morph : null;
  const metrics = useRailLabelMetrics(morph != null, label);
  const forcedLayer = [
    forced.state === 'hovered' && stateLayerHost.forceHover,
    forced.state === 'focused' && stateLayerHost.forceFocus,
    forced.state === 'pressed' && stateLayerHost.forcePressed,
  ];
  const iconEl = (
    <span {...stylex.props(s.icon, selected && s.iconSelected)}>
      {selected && selectedIcon != null ? selectedIcon : icon}
    </span>
  );
  const fill = <span aria-hidden {...stylex.props(s.fillLayer, rail && s.fillStart, selected && s.fillOn)} />;

  let body: ReactNode;
  let rootStyles: StyleXStyles[];
  if (morph) {
    // Collapsing / expanding rail: Compose AnimatedNavigationItem geometry for this frame.
    const box = metrics?.box ?? null;
    const g = box ? railItemGeometry(morph.p, morph.toExpanded, box) : null;
    rootStyles = [
      s.item,
      g && s.mItem(g.width, g.height),
      selected && (morph.toExpanded ? s.railHSelected : s.selected),
    ];
    body = (
      <>
        {metrics?.measurers}
        {g && (
          <>
            <span
              aria-hidden
              {...stylex.props(s.mBox(g.indicator.x, g.indicator.y, g.indicator.width, g.indicator.height), s.mRound)}
            >
              {fill}
            </span>
            <span
              aria-hidden
              {...stylex.props(s.mBox(g.ripple.x, g.ripple.y, g.ripple.width, g.ripple.height), s.mRound)}
            >
              <StateLayer />
            </span>
            <span {...stylex.props(s.mAt(g.icon.x, g.icon.y))}>
              {iconEl}
              {badge != null && (badgeSize === 'small' || g.label.style === 'top') && (
                <span {...stylex.props(badgeSize === 'small' ? s.mAt(18, 0) : s.mAt(12, -2), s.railHBadgeLarge)}>
                  {badge}
                </span>
              )}
            </span>
            <span
              {...stylex.props(
                g.label.style === 'top' ? typescale.labelMedium : typescale.labelLarge,
                s.mAt(g.label.x, g.label.y),
                s.mLabel(Math.min(1, g.label.alpha)),
              )}
            >
              {label}
              {badge != null && badgeSize === 'large' && g.label.style === 'start' && (
                <span {...stylex.props(s.mAt(box!.startWidth + 8, (box!.startHeight - 16) / 2), s.railHBadgeLarge)}>
                  {badge}
                </span>
              )}
            </span>
          </>
        )}
      </>
    );
  } else if (ctx.layout === 'vertical') {
    const tall = !showLabel;
    rootStyles = [
      s.item,
      s.vertical,
      tall && s.verticalNoLabel,
      ctx.fill ? s.fill : s.railWidth,
      selected && s.selected,
    ];
    body = (
      <>
        <span {...stylex.props(s.pill, tall && s.pillTall, s.centreX)}>
          {fill}
          <StateLayer />
          {iconEl}
          {badge != null && (
            <span
              {...stylex.props(
                badgeSize === 'small'
                  ? [s.badgeSmall, tall && s.badgeSmallTall]
                  : [s.badgeLarge, tall && s.badgeLargeTall],
              )}
            >
              {badge}
            </span>
          )}
        </span>
        {showLabel && <span {...stylex.props(typescale.labelMedium, s.label, textCentred.trimTracking)}>{label}</span>}
      </>
    );
  } else if (ctx.layout === 'horizontal') {
    rootStyles = [s.item, s.horizontal, ctx.fill && s.fill, s.hLayer, selected && s.hSelected];
    body = (
      <span {...stylex.props(s.hPill, s.centreX)}>
        {fill}
        <StateLayer />
        {iconEl}
        {badge != null && <span {...stylex.props(badgeSize === 'small' ? s.hBadgeSmall : s.hBadgeLarge)}>{badge}</span>}
        {label != null && <span {...stylex.props(typescale.labelMedium, textBox.hug, s.label)}>{label}</span>}
      </span>
    );
  } else {
    rootStyles = [s.item, s.railH, selected && s.railHSelected];
    body = (
      <>
        {fill}
        <StateLayer />
        {iconEl}
        {badge != null && badgeSize === 'small' && <span {...stylex.props(s.railHBadgeSmall)}>{badge}</span>}
        {label != null && <span {...stylex.props(typescale.labelLarge, textBox.hug, s.label)}>{label}</span>}
        {badge != null && badgeSize === 'large' && <span {...stylex.props(s.railHBadgeLarge)}>{badge}</span>}
      </>
    );
  }
  const props = {
    ...stylex.props(
      rootStyles,
      rail && s.labelMotion,
      !disabled && stateLayerHost.hostPressLayer,
      disabled && s.itemDisabled,
      forcedLayer,
      sx,
    ),
    'aria-current': selected ? ('page' as const) : undefined,
    onClick: (e: React.MouseEvent<HTMLElement>) => {
      if (disabled) return;
      onClick?.(e);
      ctx.onSelect?.(value);
    },
  };
  if (href != null && !disabled) {
    return (
      <a href={href} {...props}>
        {body}
      </a>
    );
  }
  return (
    <button type="button" disabled={disabled} {...props}>
      {body}
    </button>
  );
}

/**
 * The label's box in both rail text styles, measured (hidden) when a morph starts: Compose
 * measures the label with the style of the moment, and the kit's rest layouts size it the same
 * way (collapsed: centred without its trailing tracking; expanded: a hug box).
 */
function useRailLabelMetrics(
  active: boolean,
  label: ReactNode,
): { box: RailLabelMetrics | null; measurers: ReactNode } | null {
  const top = useRef<HTMLSpanElement>(null);
  const start = useRef<HTMLSpanElement>(null);
  const [box, setBox] = useState<RailLabelMetrics | null>(null);
  useLayoutEffect(() => {
    if (!active || !top.current || !start.current) return;
    const a = top.current.getBoundingClientRect();
    const trim = parseFloat(getComputedStyle(top.current).marginRight) || 0;
    const b = start.current.getBoundingClientRect();
    setBox({ topWidth: a.width + trim, topHeight: a.height, startWidth: b.width, startHeight: b.height });
  }, [active, label]);
  if (!active) return null;
  const measurers = (
    <>
      <span ref={top} aria-hidden {...stylex.props(typescale.labelMedium, textCentred.trimTracking, s.measure)}>
        {label}
      </span>
      <span ref={start} aria-hidden {...stylex.props(typescale.labelLarge, textBox.hug, s.measure)}>
        {label}
      </span>
    </>
  );
  return { box, measurers };
}

/** Static item styling context (items outside a bar / rail fill their flex container). */
export function NavigationScope({
  layout = 'vertical',
  showLabels = true,
  children,
}: {
  layout?: NavigationItemLayout;
  showLabels?: boolean;
  children: ReactNode;
}) {
  return <NavContext value={{ layout, value: undefined, showLabels, fill: true }}>{children}</NavContext>;
}

// ── Bar ───────────────────────────────────────────────────────────────────────────────────────

export interface NavigationBarProps {
  value?: unknown;
  onValueChange?: (value: unknown) => void;
  /** 'vertical' (icon over label, compact windows) or 'horizontal' (icon + label in a row). */
  itemLayout?: 'vertical' | 'horizontal';
  children: ReactNode;
  'aria-label'?: string;
  sx?: StyleXStyles;
}

/** Bottom navigation bar (Compose ShortNavigationBar): 64px, Surface Container. */
export function NavigationBar({
  value,
  onValueChange,
  itemLayout = 'vertical',
  children,
  'aria-label': ariaLabel,
  sx,
}: NavigationBarProps) {
  const count = Array.isArray(children) ? children.length : 1;
  // Kit: horizontal-item bars inset their items 160 / 120 / 80 / 40px for 3 / 4 / 5 / 6 items.
  const inset = itemLayout === 'horizontal' ? Math.max(0, 280 - 40 * count) : 0;
  return (
    <nav
      aria-label={ariaLabel}
      {...stylex.props(s.bar, itemLayout === 'horizontal' && [s.barHorizontal, s.barInset(inset)], sx)}
    >
      <NavContext value={{ layout: itemLayout, value, onSelect: onValueChange, showLabels: true, fill: true }}>
        {children}
      </NavContext>
    </nav>
  );
}

// ── Rail ──────────────────────────────────────────────────────────────────────────────────────

export interface NavigationRailProps {
  value?: unknown;
  onValueChange?: (value: unknown) => void;
  /** Expanded rail (220px, items in rows). */
  expanded?: boolean;
  /** Expanded rails: docked (no container) or floating (Surface Container, 16px corners). */
  type?: 'docked' | 'floating';
  alignment?: 'top' | 'middle';
  /** Collapsed rails: labels under the icons (default true). */
  showLabels?: boolean;
  /** Menu button and FAB above the destinations. */
  header?: ReactNode;
  children: ReactNode;
  'aria-label'?: string;
  sx?: StyleXStyles;
}

/** Navigation rail (Compose NavigationRail / WideNavigationRail); width springs when expanding. */
export function NavigationRail({
  value,
  onValueChange,
  expanded = false,
  type = 'docked',
  alignment = 'top',
  showLabels = true,
  header,
  children,
  'aria-label': ariaLabel,
  sx,
}: NavigationRailProps) {
  const middle = alignment === 'middle';
  const items = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [shift, setShift] = useState(0);
  const morph = useRailMorph(expanded, showLabels);
  useLayoutEffect(() => {
    const el = items.current;
    const rail = el?.parentElement;
    if (!middle || !el || !rail) {
      setShift(0);
      return;
    }
    const measure = () => {
      const centred = (rail.clientHeight - el.offsetHeight) / 2;
      const headerBottom = headerRef.current ? headerRef.current.offsetTop + headerRef.current.offsetHeight : 0;
      setShift(centred >= headerBottom ? centred - el.offsetTop : 0);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(rail);
    ro.observe(el);
    return () => ro.disconnect();
  }, [middle, expanded, header]);
  const p = morph?.p ?? 0;
  return (
    <nav
      aria-label={ariaLabel}
      {...stylex.props(
        s.rail,
        expanded && s.railExpanded,
        expanded && type === 'floating' && s.railFloating,
        morph && [s.railMorph, s.railMorphSize(96 + (220 - 96) * p, 56 + (20 - 56) * p)],
        sx,
      )}
    >
      {header != null && (
        <div
          ref={headerRef}
          {...stylex.props(
            s.railHeader,
            expanded && s.railHeaderExpanded,
            morph && (expanded ? s.railHeaderMorphExpanded : s.railHeaderMorphCollapsed),
          )}
        >
          {header}
        </div>
      )}
      <div
        ref={items}
        {...stylex.props(
          s.railItems,
          expanded && s.railItemsExpanded,
          morph && s.railItemsMorph(railItemSpacing(p)),
          middle && shift !== 0 && s.railMiddleShift(shift),
        )}
      >
        <NavContext
          value={{
            layout: expanded ? 'rail-horizontal' : 'vertical',
            value,
            onSelect: onValueChange,
            showLabels,
            fill: false,
            morph,
          }}
        >
          {children}
        </NavContext>
      </div>
    </nav>
  );
}

/**
 * The rail's collapse / expand progress (Compose: each item's iconPositionProgress plus the rail's
 * width, item spacing and minimum height, all DefaultSpatial — one spring here). Null at rest, so
 * the kit's rest layouts render untouched. Retargets keep velocity (animateFloatAsState).
 * Collapsed rails without labels switch instantly (Compose has no hidden-label wide rail item).
 */
function useRailMorph(expanded: boolean, showLabels: boolean) {
  const spring = useSpringToken('default-spatial');
  const [morph, setMorph] = useState<{ p: number; toExpanded: boolean } | null>(null);
  const anim = useRef<SpringAnimation | null>(null);
  const progress = useRef(expanded ? 1 : 0);
  const toExpanded = useRef(expanded);
  useLayoutEffect(() => {
    if (toExpanded.current === expanded) return;
    toExpanded.current = expanded;
    const target = expanded ? 1 : 0;
    if (!spring || !showLabels) {
      anim.current?.stop();
      anim.current = null;
      progress.current = target;
      setMorph(null);
      return;
    }
    setMorph({ p: progress.current, toExpanded: expanded });
    if (anim.current) anim.current.retarget(target, spring);
    else
      anim.current = animateSpring({
        spring,
        from: progress.current,
        to: target,
        precision: 0.01,
        onUpdate: (v) => {
          progress.current = v;
          setMorph({ p: v, toExpanded: toExpanded.current });
        },
        onComplete: () => {
          anim.current = null;
          setMorph(null);
        },
      });
  }, [expanded, spring, showLabels]);
  useEffect(() => () => anim.current?.stop(), []);
  return morph;
}

export interface NavigationRailSectionProps {
  /** Section header (label-large, 36px). */
  label?: ReactNode;
  /** The section's `NavigationItem`s. */
  children: ReactNode;
}

/** A labelled group of destinations in an expanded rail (sections sit 12px apart). */
export function NavigationRailSection({ label, children }: NavigationRailSectionProps) {
  const { morph } = useContext(NavContext);
  return (
    <div role="group" {...stylex.props(s.section)}>
      {label != null && (
        <p {...stylex.props(typescale.labelLarge, s.sectionHeader, morph && s.sectionHeaderMorph)}>{label}</p>
      )}
      {children}
    </div>
  );
}
