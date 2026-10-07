import { createContext, useContext, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { Tabs as BaseTabs } from '@base-ui/react/tabs';
import { color } from '../../tokens/color.stylex.ts';
import { motion } from '../../tokens/motion.stylex.ts';
import { typescale } from '../../tokens/typescale.ts';
import { interaction } from '../../primitives/state.stylex.ts';
import { StateLayer, stateLayerHost } from '../../primitives/StateLayer.tsx';
import { Ripple } from '../../primitives/Ripple.tsx';
import { useForcedState } from '../../testing/ForceState.tsx';
import { useReducedMotion, useSpringToken } from '../../motion/context.tsx';
import { animateSpring, type SpringAnimation } from '../../motion/animate.ts';

export type TabsVariant = 'primary' | 'secondary';

const TabsContext = createContext<{ variant: TabsVariant; scrollable: boolean; live: boolean }>({
  variant: 'primary',
  scrollable: false,
  live: false,
});

/*
 * Figma kit, "Tabs" page (Tabs 54563:40023; Primary / Secondary tab sets; Compose PrimaryTabRow /
 * SecondaryTabRow + Tab, PrimaryNavigationTabTokens).
 *   Tab: Surface, 16px inline padding, 48px (64px with icon + label, the icon stacked 2px above a
 *   title-small label). Inactive content On Surface Variant (On Surface while hovered, focused or
 *   pressed); active Primary (secondary tabs keep On Surface). Layers 8 / 10%.
 *   Indicator: primary — 3px, 3px top corners, the content's width less 2px each side;
 *   secondary — 2px across the tab. Both sit on the row's bottom edge, above a 1px divider.
 *   Fixed rows share the width; scrollable rows start 52px in, with 90px-minimum tabs.
 * Motion (Compose): the indicator's offset and width spring on the default spatial spring;
 * content colour fades in on default effects and out on fast effects. A scrollable row scrolls the
 * selected tab to its centre (clamped to the ends) on the default spatial spring — also on first
 * layout — and a new selection restarts that scroll from where it is (TabRow.kt ScrollableTabData).
 */
const s = stylex.create({
  // minWidth 0: as a grid / flex item the row must not grow to its tabs (scrollable rows scroll).
  row: { display: 'flex', flexDirection: 'column', boxSizing: 'border-box', width: '100%', minWidth: 0 },
  // The list carries the Surface (panels below keep their own background).
  list: { position: 'relative', display: 'flex', alignItems: 'stretch', outlineStyle: 'none', backgroundColor: color.surface },
  listScrollable: {
    overflowX: 'auto',
    overflowY: 'hidden',
    scrollbarWidth: 'none',
    // Compose ScrollableTabRow: edge padding on both ends (layoutWidth = padding × 2 + tabs).
    paddingInlineStart: 52,
    paddingInlineEnd: 52,
    '::-webkit-scrollbar': { display: 'none' },
  },
  divider: { display: 'block', height: 1, flexShrink: 0, backgroundColor: color.outlineVariant },
  tab: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
    minHeight: 48,
    paddingInline: 16,
    margin: 0,
    borderWidth: 0,
    borderStyle: 'none',
    borderRadius: 0,
    outlineStyle: 'none',
    backgroundColor: color.surface,
    cursor: 'pointer',
    userSelect: 'none',
    overflow: 'hidden',
    fontFamily: 'inherit',
    color: { default: color.onSurfaceVariant, ':hover': color.onSurface, ':focus-visible': color.onSurface, ':active': color.onSurface },
    [interaction.layerColor]: color.onSurface,
    [interaction.rippleColor]: color.onSurface,
    // Deselect fades out on fast effects (Compose TabTransition).
    transitionProperty: 'color',
    transitionDuration: motion.fastEffectsDuration,
    transitionTimingFunction: motion.fastEffectsEasing,
  },
  // In a row the tab stops 1px short of the row's 48 / 64px: the divider takes the last pixel.
  tabInRow: { minHeight: 0, height: 47, flexGrow: 1, flexBasis: 0 },
  tabScrollable: { flexGrow: 0, flexBasis: 'auto', minWidth: 90, flexShrink: 0 },
  forcedOnSurface: { color: color.onSurface },
  tabPrimaryActive: {
    color: color.primary,
    [interaction.layerColor]: color.primary,
    [interaction.rippleColor]: color.primary,
    // Select fades in on default effects.
    transitionDuration: motion.defaultEffectsDuration,
    transitionTimingFunction: motion.defaultEffectsEasing,
  },
  tabSecondaryActive: {
    color: color.onSurface,
    transitionDuration: motion.defaultEffectsDuration,
    transitionTimingFunction: motion.defaultEffectsEasing,
  },
  tabStacked: { minHeight: 64 },
  tabStackedInRow: { height: 63 },
  content: { position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  contentStacked: { flexDirection: 'column', rowGap: 2, paddingTop: 10, paddingBottom: 8 },
  contentInline: { columnGap: 8 },
  // In a row the tab is 47 / 63px: the kit centres content on the half pixel (labels 0.5px up,
  // icon-only content 1px up); Chrome snaps layout offsets, so the remainder is a transform.
  rowShiftHalf: { transform: 'translateY(-0.5px)' },
  rowShiftOne: { transform: 'translateY(-1px)' },
  icon: { position: 'relative', display: 'flex', width: 24, height: 24, flexShrink: 0 },
  label: { whiteSpace: 'nowrap' },
  badgeOnIcon: { position: 'absolute', left: 14, top: 0 },
  // Static indicator (a selected tab outside a live row draws its own).
  // The tab hugs its content (16px padding): the content's width less 2px each side.
  staticPrimary: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 0,
    height: 3,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    backgroundColor: color.primary,
  },
  // Above the ripple: the kit's secondary indicator sits outside the tab's state layer.
  staticSecondary: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, zIndex: 2, backgroundColor: color.primary },
  // Live indicator: placed by JS (content box for primary, tab box for secondary), sprung.
  indicator: { position: 'absolute', left: 0, bottom: 0, pointerEvents: 'none', backgroundColor: color.primary, zIndex: 1 },
  indicatorPrimary: { height: 3, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  indicatorSecondary: { height: 2 },
  geometry: (x: number, w: number) => ({ transform: `translateX(${x}px)`, width: w }),
});

// ── Tab ───────────────────────────────────────────────────────────────────────────────────────

export interface TabProps {
  /** Identifies the tab (and its panel). */
  value: unknown;
  label?: ReactNode;
  icon?: ReactNode;
  /** Badge on the icon (or after the label when there's no icon). */
  badge?: ReactNode;
  disabled?: boolean;
  /** Static rendering (outside `<Tabs>`): draw the tab as selected. */
  selected?: boolean;
  sx?: StyleXStyles;
}

function TabBody({ label, icon, badge, variant, inRow }: Pick<TabProps, 'label' | 'icon' | 'badge'> & { variant: TabsVariant; inRow: boolean }) {
  const stacked = icon != null && label != null && variant === 'primary';
  return (
    <>
      <StateLayer />
      {/* Kit: the pressed ripple paints over the tab's content. */}
      <Ripple above />
      <span
        data-tab-content=""
        {...stylex.props(s.content, stacked ? s.contentStacked : s.contentInline, inRow && (label == null ? s.rowShiftOne : s.rowShiftHalf))}
      >
        {icon != null && (
          <span {...stylex.props(s.icon)}>
            {icon}
            {badge != null && <span {...stylex.props(s.badgeOnIcon)}>{badge}</span>}
          </span>
        )}
        {label != null && <span {...stylex.props(typescale.titleSmall, s.label)}>{label}</span>}
        {badge != null && icon == null && badge}
      </span>
    </>
  );
}

/** A tab: inside `<Tabs>` a real tab (Base UI); alone, a static rendering of one. */
export function Tab({ value, label, icon, badge, disabled = false, selected = false, sx }: TabProps) {
  const { variant, scrollable, live } = useContext(TabsContext);
  const forced = useForcedState();
  const stacked = icon != null && label != null && variant === 'primary';
  const style = (active: boolean) =>
    stylex.props(
      s.tab,
      stateLayerHost.host,
      live && s.tabInRow,
      live && scrollable && s.tabScrollable,
      stacked && (live ? s.tabStackedInRow : s.tabStacked),
      forced.state != null && s.forcedOnSurface,
      active && (variant === 'primary' ? s.tabPrimaryActive : s.tabSecondaryActive),
      forced.state === 'hovered' && stateLayerHost.forceHover,
      forced.state === 'focused' && stateLayerHost.forceFocus,
      forced.state === 'pressed' && stateLayerHost.forceHover,
      sx,
    );
  if (!live) {
    return (
      <div role="tab" aria-selected={selected} data-ripple-host="" {...style(selected)}>
        <TabBody label={label} icon={icon} badge={badge} variant={variant} inRow={false} />
        {selected && <span aria-hidden {...stylex.props(variant === 'primary' ? s.staticPrimary : s.staticSecondary)} />}
      </div>
    );
  }
  return (
    <BaseTabs.Tab
      value={value}
      disabled={disabled}
      data-ripple-host=""
      render={(props, state) => (
        <button type="button" {...props} {...style(state.active)}>
          <TabBody label={label} icon={icon} badge={badge} variant={variant} inRow />
        </button>
      )}
    />
  );
}

/** Static tab styling context (render `<Tab>`s outside a live row). */
export function TabScope({ variant = 'primary', children }: { variant?: TabsVariant; children: ReactNode }) {
  return <TabsContext value={{ variant, scrollable: false, live: false }}>{children}</TabsContext>;
}

// ── Tabs (row) ────────────────────────────────────────────────────────────────────────────────

export interface TabsProps {
  value?: unknown;
  defaultValue?: unknown;
  onValueChange?: (value: unknown) => void;
  variant?: TabsVariant;
  /** Scrollable row (52px edge padding, tabs hug their content, ≥ 90px). Default: fixed. */
  scrollable?: boolean;
  /** The `<Tab>`s. */
  children: ReactNode;
  /** Tab panels (`<TabPanel>`), rendered under the row. */
  panels?: ReactNode;
  'aria-label'?: string;
  sx?: StyleXStyles;
}

export function Tabs({
  value,
  defaultValue,
  onValueChange,
  variant = 'primary',
  scrollable = false,
  children,
  panels,
  'aria-label': ariaLabel,
  sx,
}: TabsProps) {
  // Tracks the active value (Base UI owns it when uncontrolled) to re-place the indicator.
  const [inner, setInner] = useState<unknown>(defaultValue);
  const current = value !== undefined ? value : inner;
  return (
    <BaseTabs.Root
      {...(value !== undefined ? { value } : { defaultValue })}
      onValueChange={(v) => {
        setInner(v);
        onValueChange?.(v);
      }}
      {...stylex.props(s.row, sx)}
    >
      <TabsContext value={{ variant, scrollable, live: true }}>
        <TabList variant={variant} scrollable={scrollable} current={current} ariaLabel={ariaLabel}>
          {children}
        </TabList>
      </TabsContext>
      <span aria-hidden {...stylex.props(s.divider)} />
      {panels}
    </BaseTabs.Root>
  );
}

function TabList({ variant, scrollable, current, ariaLabel, children }: { variant: TabsVariant; scrollable: boolean; current: unknown; ariaLabel?: string; children: ReactNode }) {
  const list = useRef<HTMLDivElement>(null);
  const spring = useSpringToken('default-spatial');
  const reduced = useReducedMotion();
  const [geo, setGeo] = useState<{ x: number; w: number } | null>(null);
  const anims = useRef<{ x?: SpringAnimation; w?: SpringAnimation; scroll?: SpringAnimation }>({});
  const shown = useRef<{ x: number; w: number } | null>(null);
  // The value the row last scrolled for (Compose ScrollableTabData.selectedTab; unset at first).
  const scrolledFor = useRef<{ value: unknown } | null>(null);

  useLayoutEffect(() => {
    const el = list.current;
    if (!el) return;
    // Whole-pixel geometry (offsetLeft / offsetWidth), as the kit's indicators sit: the kit's hug
    // text boxes are whole-pixel wide, so the label box lands on whole pixels too.
    const measure = () => {
      const tab = el.querySelector<HTMLElement>('[data-active]');
      if (!tab) return null;
      if (variant === 'secondary') return { x: tab.offsetLeft, w: tab.offsetWidth };
      const content = tab.querySelector<HTMLElement>('[data-tab-content]');
      if (!content) return null;
      return { x: tab.offsetLeft + content.offsetLeft + 2, w: content.offsetWidth - 4 };
    };
    const place = (animate: boolean) => {
      const target = measure();
      if (!target) return;
      const from = shown.current;
      if (!animate || !from || !spring || reduced) {
        anims.current.x?.stop();
        anims.current.w?.stop();
        shown.current = target;
        setGeo(target);
        return;
      }
      const run = (key: 'x' | 'w') => {
        const a = anims.current[key];
        if (a) a.retarget(target[key], spring);
        else
          anims.current[key] = animateSpring({
            spring,
            from: from[key],
            to: target[key],
            precision: 0.1,
            onUpdate: (v) => {
              shown.current = { ...(shown.current ?? target), [key]: v };
              setGeo(shown.current);
            },
            onComplete: () => (anims.current[key] = undefined),
          });
      };
      run('x');
      run('w');
    };
    // Scrollable rows: centre the selected tab, clamped (ScrollableTabData.calculateTabOffset), once
    // per selection including the first layout. animateScrollTo cancels a running scroll and
    // starts again at zero velocity; Float visibility threshold 0.01.
    const scrollToSelected = () => {
      const tab = el.querySelector<HTMLElement>('[data-active]');
      if (!scrollable || !tab || (scrolledFor.current && scrolledFor.current.value === current)) return;
      scrolledFor.current = { value: current };
      const visible = el.clientWidth;
      const available = Math.max(0, el.scrollWidth - visible);
      const centred = tab.offsetLeft - (Math.trunc(visible / 2) - Math.trunc(tab.offsetWidth / 2));
      const to = Math.min(available, Math.max(0, centred));
      if (to === el.scrollLeft) return;
      anims.current.scroll?.stop();
      anims.current.scroll = undefined;
      if (!spring || reduced) {
        el.scrollLeft = to;
        return;
      }
      anims.current.scroll = animateSpring({ spring, from: el.scrollLeft, to, precision: 0.01, onUpdate: (v) => (el.scrollLeft = v) });
    };
    place(true);
    // The first layout waits for web fonts: tab widths (and so the centred offset) depend on them.
    let cancelled = false;
    if (scrolledFor.current == null && document.fonts.status !== 'loaded') {
      void document.fonts.ready.then(() => {
        if (!cancelled) scrollToSelected();
      });
    } else scrollToSelected();
    // Re-place (no motion) when the row or a tab resizes, e.g. once web fonts have loaded. The
    // observer's initial report isn't a resize: acting on it snapped every selection's indicator
    // to its target one frame in.
    let initial = true;
    const ro = new ResizeObserver(() => {
      if (initial) initial = false;
      else place(false);
    });
    ro.observe(el);
    for (const tab of el.querySelectorAll('[role="tab"]')) ro.observe(tab);
    return () => {
      cancelled = true;
      ro.disconnect();
    };
  }, [current, variant, scrollable, spring, reduced]);

  return (
    <BaseTabs.List ref={list} aria-label={ariaLabel} {...stylex.props(s.list, scrollable && s.listScrollable)}>
      {children}
      {geo && <span aria-hidden {...stylex.props(s.indicator, variant === 'primary' ? s.indicatorPrimary : s.indicatorSecondary, s.geometry(geo.x, geo.w))} />}
    </BaseTabs.List>
  );
}

export function TabPanel({ value, children, sx }: { value: unknown; children: ReactNode; sx?: StyleXStyles }) {
  return (
    <BaseTabs.Panel value={value} {...stylex.props(sx)}>
      {children}
    </BaseTabs.Panel>
  );
}
