import { useContext, useMemo, type MouseEvent, type MouseEventHandler, type ReactNode, type Ref } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { useMergedRefs } from '../../hooks/useMergedRefs.ts';
import type { LinkOrButtonProps, SxProps } from '../../primitives/types.ts';
import { color } from '../../tokens/color.stylex.ts';
import { motion } from '../../tokens/motion.stylex.ts';
import { typescale } from '../../tokens/typescale.ts';
import { textBox, textCentred } from '../../primitives/textBox.ts';
import { interaction } from '../../primitives/state.stylex.ts';
import { forcedStateLayer, StateLayer, stateLayerHost } from '../../primitives/StateLayer.tsx';
import { visuallyHidden } from '../../primitives/visuallyHidden.ts';
import { useForcedState } from '../../testing/ForceState.tsx';
import { NavContext, type NavLayout } from './context.ts';
import { useRailLabelMetrics, useRailMorphGeometry } from './useRailItemMorph.tsx';

/* A navigation destination in its bar / rail layouts — kit geometry and motion in ./Navigation.tsx. */
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
  // ── rail morph (item parts placed per frame by useRailMorphGeometry: left / top / size) ──
  mItem: { alignSelf: 'flex-start', flexShrink: 0 },
  mPart: { position: 'absolute' },
  mAt: (x: number, y: number) => ({ position: 'absolute', left: x, top: y }),
  mLabel: { whiteSpace: 'nowrap' },
  mRound: { borderRadius: 9999, isolation: 'isolate' },
});

interface NavigationItemOwnProps {
  /** The value its bar / rail selects it by. */
  value: unknown;
  icon: ReactNode;
  /** Icon shown while selected (the kit swaps to the filled glyph). */
  selectedIcon?: ReactNode;
  /** A `<Badge>` (no children = the small dot). */
  badge?: ReactNode;
  badgeSize?: 'small' | 'large';
  disabled?: boolean;
  /** Makes the item a link (`<a>`); otherwise it is a `<button>`. */
  href?: string;
  onClick?: MouseEventHandler<HTMLElement>;
}

/** Native props of the item, whichever element it renders (`<a>` with `href`, else `<button>`). */
type ItemNativeProps = LinkOrButtonProps;

/** Native props, `ref` and `sx` go to the item's `<button>` (or `<a>`). */
interface NavigationItemBaseProps
  extends NavigationItemOwnProps, SxProps<Omit<ItemNativeProps, keyof NavigationItemOwnProps | 'aria-label'>> {
  ref?: Ref<HTMLAnchorElement | HTMLButtonElement>;
}

/**
 * Every destination needs a name: a `label` (also announced when a rail hides its labels), or an
 * `aria-label` for an icon-only item.
 */
export type NavigationItemProps = NavigationItemBaseProps &
  ({ label: NonNullable<ReactNode>; 'aria-label'?: string } | { label?: null; 'aria-label': string });

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
  sx,
  'aria-label': ariaLabel,
  ref,
  ...rest
}: NavigationItemProps) {
  const ctx = useContext(NavContext);
  const forced = useForcedState();
  // A single item drawn outside a bar / rail (the kit's building blocks) takes its selection from ForceState.
  const selected = forced.selected ?? (ctx.value !== undefined && ctx.value === value);
  const showLabel = label != null && (ctx.layout !== 'vertical' || ctx.showLabels);
  // Rail items: indicator from the start edge, label colour animated (bar items: neither).
  const rail = !ctx.fill;
  const morph = ctx.morph != null && label != null ? ctx.morph : null;
  const metrics = useRailLabelMetrics(morph != null, label);
  const { rootRef, indicatorRef, rippleRef, iconRef, labelRef } = useRailMorphGeometry(
    morph,
    ctx.progress,
    metrics?.box ?? null,
  );
  const itemRef = useMergedRefs<HTMLElement>(rootRef, ref);
  const iconEl = (
    <span {...stylex.props(s.icon, selected && s.iconSelected)}>
      {selected && selectedIcon != null ? selectedIcon : icon}
    </span>
  );
  const fill = <span aria-hidden {...stylex.props(s.fillLayer, rail && s.fillStart, selected && s.fillOn)} />;

  let body: ReactNode;
  let rootStyles: StyleXStyles[];
  if (morph) {
    // Collapsing / expanding rail: Compose AnimatedNavigationItem's parts, placed every frame by
    // useRailMorphGeometry once the label is measured.
    const box = metrics?.box ?? null;
    rootStyles = [s.item, box && s.mItem, selected && (morph.toExpanded ? s.railHSelected : s.selected)];
    body = (
      <>
        {metrics?.measurers}
        {box && (
          <>
            <span ref={indicatorRef} aria-hidden {...stylex.props(s.mPart, s.mRound)}>
              {fill}
            </span>
            <span ref={rippleRef} aria-hidden {...stylex.props(s.mPart, s.mRound)}>
              <StateLayer />
            </span>
            <span ref={iconRef} {...stylex.props(s.mPart)}>
              {iconEl}
              {badge != null && (badgeSize === 'small' || morph.topLabels) && (
                <span {...stylex.props(badgeSize === 'small' ? s.mAt(18, 0) : s.mAt(12, -2), s.railHBadgeLarge)}>
                  {badge}
                </span>
              )}
            </span>
            <span
              ref={labelRef}
              {...stylex.props(morph.topLabels ? typescale.labelMedium : typescale.labelLarge, s.mPart, s.mLabel)}
            >
              {label}
              {badge != null && badgeSize === 'large' && !morph.topLabels && (
                <span {...stylex.props(s.mAt(box.startWidth + 8, (box.startHeight - 16) / 2), s.railHBadgeLarge)}>
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
        {showLabel ? (
          <span {...stylex.props(typescale.labelMedium, s.label, textCentred.trimTracking)}>{label}</span>
        ) : (
          // A label that isn't drawn (collapsed rail without labels) still names the item.
          label != null && <span {...stylex.props(visuallyHidden.root)}>{label}</span>
        )}
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
    ...rest,
    ...stylex.props(
      rootStyles,
      rail && s.labelMotion,
      !disabled && stateLayerHost.hostPressLayer,
      disabled && s.itemDisabled,
      forcedStateLayer(forced.state, 'pressed'),
      sx,
    ),
    'aria-current': selected ? ('page' as const) : undefined,
    'aria-label': ariaLabel,
    onClick: (e: MouseEvent<HTMLElement>) => {
      if (disabled) return;
      onClick?.(e);
      ctx.onSelect?.(value);
    },
  };
  if (href != null && !disabled) {
    return (
      <a ref={itemRef} href={href} {...props}>
        {body}
      </a>
    );
  }
  return (
    <button ref={itemRef} type="button" disabled={disabled} {...props}>
      {body}
    </button>
  );
}

export interface NavigationScopeProps {
  /** `railHorizontal`: an expanded rail's item. */
  layout?: NavLayout;
  showLabels?: boolean;
  children: ReactNode;
}

/**
 * Item styling context without a bar or rail: items drawn on their own (the kit's building
 * blocks) fill their flex container. Exported from `@m3x/react/testing`.
 */
export function NavigationScope({ layout = 'vertical', showLabels = true, children }: NavigationScopeProps) {
  const ctx = useMemo(() => ({ layout, value: undefined, showLabels, fill: true }), [layout, showLabels]);
  return <NavContext value={ctx}>{children}</NavContext>;
}
