import { useContext, useMemo, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { Tabs as BaseTabs } from '@base-ui/react/tabs';
import { color } from '../../tokens/color.stylex.ts';
import { motion } from '../../tokens/motion.stylex.ts';
import { typescale } from '../../tokens/typescale.ts';
import { interaction } from '../../primitives/state.stylex.ts';
import { forcedStateLayer, StateLayer, stateLayerHost } from '../../primitives/StateLayer.tsx';
import { Ripple } from '../../primitives/Ripple.tsx';
import { useForcedState } from '../../testing/ForceState.tsx';
import { TabsContext, type TabsVariant } from './context.ts';

/* The tab itself — kit geometry and motion in ./Tabs.tsx. */
const s = stylex.create({
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
    color: {
      default: color.onSurfaceVariant,
      ':hover': color.onSurface,
      ':focus-visible': color.onSurface,
      ':active': color.onSurface,
    },
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
  staticSecondary: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    zIndex: 2,
    backgroundColor: color.primary,
  },
});

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

function TabBody({
  label,
  icon,
  badge,
  variant,
  inRow,
}: Pick<TabProps, 'label' | 'icon' | 'badge'> & { variant: TabsVariant; inRow: boolean }) {
  const stacked = icon != null && label != null && variant === 'primary';
  return (
    <>
      <StateLayer />
      {/* Kit: the pressed ripple paints over the tab's content. */}
      <Ripple above />
      <span
        data-tab-content=""
        {...stylex.props(
          s.content,
          stacked ? s.contentStacked : s.contentInline,
          inRow && (label == null ? s.rowShiftOne : s.rowShiftHalf),
        )}
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
      forcedStateLayer(forced.state, 'hover'),
      sx,
    );
  if (!live) {
    return (
      <div role="tab" aria-selected={selected} data-ripple-host="" {...style(selected)}>
        <TabBody label={label} icon={icon} badge={badge} variant={variant} inRow={false} />
        {selected && (
          <span aria-hidden {...stylex.props(variant === 'primary' ? s.staticPrimary : s.staticSecondary)} />
        )}
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
  const ctx = useMemo(() => ({ variant, scrollable: false, live: false }), [variant]);
  return <TabsContext value={ctx}>{children}</TabsContext>;
}
