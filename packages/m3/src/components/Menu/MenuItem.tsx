import { useContext, type ComponentPropsWithRef, type MouseEventHandler, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { Menu as BaseMenu } from '@base-ui/react/menu';
import { color } from '../../tokens/color.stylex.ts';
import { motion } from '../../tokens/motion.stylex.ts';
import { typescale } from '../../tokens/typescale.ts';
import { interaction } from '../../primitives/state.stylex.ts';
import { state } from '../../tokens/state.stylex.ts';
import { forcedStateLayer, StateLayer, stateLayerHost } from '../../primitives/StateLayer.tsx';
import { Ripple } from '../../primitives/Ripple.tsx';
import { useForcedState } from '../../testing/ForceState.tsx';
import { useControllableState } from '../../hooks/useControllableState.ts';
import type { SxProps } from '../../primitives/types.ts';
import { MenuContext, type MenuDensity, type MenuVariant } from './context.ts';

/* Menu items (expressive and baseline rows) — kit geometry and motion in ./Menu.tsx. */
const s = stylex.create({
  // ── expressive item ────────────────────────────────────────────────────────────────────────
  item: {
    position: 'relative',
    display: 'flex',
    boxSizing: 'border-box',
    paddingBlock: 2,
    paddingInline: 4,
    outlineStyle: 'none',
    cursor: 'pointer',
    userSelect: 'none',
    color: color.onSurface,
    [interaction.layerColor]: color.onSurface,
    [interaction.rippleColor]: color.onSurface,
  },
  // Submenu trigger with its submenu open (kit "Active"): the hover layer stays.
  itemActive: { [interaction.layerOpacity]: { default: null, ':is([data-popup-open])': state.hoverOpacity } },
  itemVibrant: {
    color: color.onTertiaryContainer,
    // Kit: the vibrant hover / press layer is On Tertiary; focus uses On Tertiary Container.
    [interaction.layerColor]: { default: color.onTertiary, ':focus-visible': color.onTertiaryContainer },
    [interaction.rippleColor]: color.onTertiaryContainer,
  },
  itemVibrantFocusForced: { [interaction.layerColor]: color.onTertiaryContainer },
  itemSelected: {
    color: color.onTertiaryContainer,
    [interaction.layerColor]: color.onTertiaryContainer,
    [interaction.rippleColor]: color.onTertiaryContainer,
  },
  itemVibrantSelected: {
    color: color.onTertiary,
    [interaction.layerColor]: color.onTertiary,
    [interaction.rippleColor]: color.onTertiary,
  },
  itemDisabled: { cursor: 'default' },
  content: {
    position: 'relative',
    isolation: 'isolate',
    display: 'flex',
    alignItems: 'center',
    columnGap: 8,
    flexGrow: 1,
    minWidth: 0,
    boxSizing: 'border-box',
    minHeight: 44,
    padding: 12,
    borderRadius: 4,
    backgroundColor: 'transparent',
    transitionProperty: 'border-radius, background-color',
    transitionDuration: `${motion.fastSpatialDuration}, ${motion.fastEffectsDuration}`,
    transitionTimingFunction: `${motion.fastSpatialEasing}, ${motion.fastEffectsEasing}`,
  },
  contentSelected: { borderRadius: 12, backgroundColor: color.tertiaryContainer },
  contentVibrantSelected: { borderRadius: 12, backgroundColor: color.tertiary },
  icon: { display: 'flex', flexShrink: 0, width: 20, height: 20, color: color.onSurfaceVariant },
  iconInherit: { color: 'inherit' },
  // expandHorizontally / shrinkHorizontally (fast spatial, expandFrom End: the icon's end edge
  // leads) + fadeIn / fadeOut (fast effects). The 8px gap stays (Compose MenuArrangement).
  selectedSlot: {
    display: 'flex',
    justifyContent: 'flex-end',
    flexShrink: 0,
    overflow: 'hidden',
    width: 0,
    opacity: 0,
    transitionProperty: 'width, opacity',
    transitionDuration: `${motion.fastSpatialDuration}, ${motion.fastEffectsDuration}`,
    transitionTimingFunction: `${motion.fastSpatialEasing}, ${motion.fastEffectsEasing}`,
  },
  selectedSlotOn: (w: number) => ({ width: w, opacity: 1 }),
  slotIcon: { flexShrink: 0 },
  text: { display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0 },
  label: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  supporting: { color: color.onSurfaceVariant },
  trailing: { display: 'flex', alignItems: 'center', flexShrink: 0, columnGap: 8, color: color.onSurfaceVariant },
  dim: { opacity: 0.38 },
  // ── baseline item ──────────────────────────────────────────────────────────────────────────
  bItem: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    columnGap: 12,
    boxSizing: 'border-box',
    paddingInline: 12,
    outlineStyle: 'none',
    cursor: 'pointer',
    userSelect: 'none',
    color: color.onSurface,
    [interaction.layerColor]: color.onSurface,
    [interaction.rippleColor]: color.onSurface,
    transitionProperty: 'background-color',
    transitionDuration: motion.fastEffectsDuration,
    transitionTimingFunction: motion.fastEffectsEasing,
  },
  bDensity: (h: number) => ({ minHeight: h }),
  bSelected: {
    backgroundColor: color.secondaryContainer,
    color: color.onSecondaryContainer,
    [interaction.layerColor]: color.onSecondaryContainer,
    [interaction.rippleColor]: color.onSecondaryContainer,
  },
  bIcon: { display: 'flex', flexShrink: 0, width: 24, height: 24, color: color.onSurfaceVariant },
  bTrailing: { display: 'flex', alignItems: 'center', flexShrink: 0, columnGap: 12, color: color.onSurfaceVariant },
  bTrailingSelected: { color: color.onSecondaryContainer },
  bContent: { display: 'flex', alignItems: 'center', columnGap: 12, flexGrow: 1, minWidth: 0 },
  // Kit divider: a 1px Outline Variant line with 8px above and below.
  divider: { display: 'block', paddingBlock: 8, flexShrink: 0 },
  dividerLine: { display: 'block', height: 1, backgroundColor: color.outlineVariant },
});

const BASELINE_HEIGHT: Record<MenuDensity, number> = { 0: 56, [-2]: 48, [-4]: 40 };

// ── Items ─────────────────────────────────────────────────────────────────────────────────────

/** An item's own (visual) props; the rest are the row's native props. */
interface MenuItemOwnProps {
  /** The label. */
  children: ReactNode;
  /** Leading icon (20px expressive, 24px baseline). */
  leading?: ReactNode;
  /**
   * Icon shown while selected (e.g. a check). Without `leading` it expands in on selection and
   * collapses on deselection; with `leading` it replaces it while selected.
   */
  selectedLeading?: ReactNode;
  /** Trailing icon, badge or control. */
  trailing?: ReactNode;
  /** Trailing supporting text, e.g. a shortcut. */
  trailingText?: ReactNode;
  /** Expressive: a supporting line under the label. */
  supportingText?: ReactNode;
  selected?: boolean;
  disabled?: boolean;
}

/** Native props, `ref` and `sx` go to the item's row (Base UI's menu item `<div>` inside `<Menu>`). */
export interface MenuItemProps
  extends MenuItemOwnProps, SxProps<Omit<ComponentPropsWithRef<'div'>, keyof MenuItemOwnProps | 'onClick'>> {
  /** Runs the item (inside `<Menu>`; static rows in a `<MenuSurface>` don't handle clicks). */
  onClick?: MouseEventHandler<HTMLDivElement>;
  /** Close the menu when activated (default true). */
  closeOnClick?: boolean;
}

interface ItemVisualProps extends Omit<MenuItemProps, 'onClick' | 'closeOnClick'> {
  variant: MenuVariant;
  density: MenuDensity;
}

/** The leading slot: `leading`, swapped for / expanded into `selectedLeading` while selected. */
function leadingSlot(
  leading: ReactNode,
  selectedLeading: ReactNode,
  selected: boolean,
  iconStyles: StyleXStyles,
  size: number,
) {
  if (selectedLeading == null) return leading != null ? <span {...stylex.props(iconStyles)}>{leading}</span> : null;
  if (leading != null) return <span {...stylex.props(iconStyles)}>{selected ? selectedLeading : leading}</span>;
  return (
    <span aria-hidden={!selected || undefined} {...stylex.props(s.selectedSlot, selected && s.selectedSlotOn(size))}>
      <span {...stylex.props(iconStyles, s.slotIcon)}>{selectedLeading}</span>
    </span>
  );
}

export function useItemVisual({
  children,
  leading,
  selectedLeading,
  trailing,
  trailingText,
  supportingText,
  selected = false,
  disabled = false,
  sx,
  variant,
  density,
  ...native
}: ItemVisualProps) {
  const forced = useForcedState();
  const interactive = !disabled;
  const forcedStyles = forcedStateLayer(forced.state, 'hover');
  if (variant === 'baseline') {
    const rootProps = stylex.props(
      s.bItem,
      s.bDensity(BASELINE_HEIGHT[density]),
      interactive && stateLayerHost.host,
      interactive && s.itemActive,
      selected && s.bSelected,
      disabled && s.itemDisabled,
      forcedStyles,
      sx,
    );
    const body = (
      <>
        {interactive && <StateLayer />}
        {interactive && <Ripple />}
        <span {...stylex.props(s.bContent, disabled && s.dim)}>
          {leadingSlot(leading, selectedLeading, selected, s.bIcon, 24)}
          <span {...stylex.props(typescale.bodyLarge, s.text, s.label)}>{children}</span>
          {(trailing != null || trailingText != null) && (
            <span {...stylex.props(s.bTrailing, selected && s.bTrailingSelected)}>
              {trailingText != null && <span {...stylex.props(typescale.bodyLarge)}>{trailingText}</span>}
              {trailing != null && <span {...stylex.props(s.bIcon, s.iconInherit)}>{trailing}</span>}
            </span>
          )}
        </span>
      </>
    );
    return { rootProps, body, native };
  }
  const vibrant = variant === 'vibrant';
  const rootProps = stylex.props(
    s.item,
    interactive && stateLayerHost.host,
    interactive && s.itemActive,
    vibrant && s.itemVibrant,
    vibrant && !selected && forced.state === 'focused' && s.itemVibrantFocusForced,
    selected && (vibrant ? s.itemVibrantSelected : s.itemSelected),
    disabled && s.itemDisabled,
    forcedStyles,
    sx,
  );
  const onContainer = selected || vibrant;
  const body = (
    <span {...stylex.props(s.content, selected && (vibrant ? s.contentVibrantSelected : s.contentSelected))}>
      {interactive && <StateLayer />}
      {/* Kit: the ripple paints over the item's content (the trailing icon darkens under it). */}
      {interactive && <Ripple above />}
      {leadingSlot(leading, selectedLeading, selected, [s.icon, onContainer && s.iconInherit, disabled && s.dim], 20)}
      <span {...stylex.props(s.text, disabled && s.dim)}>
        <span {...stylex.props(typescale.labelLarge, s.label)}>{children}</span>
        {supportingText != null && (
          <span {...stylex.props(typescale.bodySmall, s.supporting, onContainer && s.iconInherit)}>
            {supportingText}
          </span>
        )}
      </span>
      {(trailing != null || trailingText != null) && (
        <span {...stylex.props(s.trailing, onContainer && s.iconInherit, disabled && s.dim)}>
          {trailingText != null && <span {...stylex.props(typescale.labelLarge)}>{trailingText}</span>}
          {trailing}
        </span>
      )}
    </span>
  );
  return { rootProps, body, native };
}

/** A menu item: a real menu item inside `<Menu>`, a static (presentational) row inside `<MenuSurface>`. */
export function MenuItem({ onClick, closeOnClick = true, ...props }: MenuItemProps) {
  const ctx = useContext(MenuContext);
  const { rootProps, body, native } = useItemVisual({ ...props, variant: ctx.variant, density: ctx.density });
  const common = { ...native, ...rootProps, 'data-ripple-host': props.disabled ? undefined : '' };
  if (ctx.live) {
    return (
      <BaseMenu.Item disabled={props.disabled} onClick={onClick} closeOnClick={closeOnClick} {...common}>
        {body}
      </BaseMenu.Item>
    );
  }
  return <div {...common}>{body}</div>;
}

export interface MenuCheckboxItemProps extends Omit<MenuItemProps, 'selected' | 'onClick'> {
  checked?: boolean;
  defaultChecked?: boolean;
  /** Base UI's change details (reason, event, `cancel()`) come second. */
  onCheckedChange?: (checked: boolean, details: BaseMenu.CheckboxItem.ChangeEventDetails) => void;
}

/** A toggleable item: checked items take the selected look (Compose CheckableDropdownMenuItem). */
export function MenuCheckboxItem({
  checked,
  defaultChecked = false,
  onCheckedChange,
  closeOnClick = false,
  ...props
}: MenuCheckboxItemProps) {
  const ctx = useContext(MenuContext);
  const [on, setOn] = useControllableState(checked, defaultChecked, onCheckedChange);
  const { rootProps, body, native } = useItemVisual({
    ...props,
    selected: on,
    variant: ctx.variant,
    density: ctx.density,
  });
  const common = { ...native, ...rootProps, 'data-ripple-host': props.disabled ? undefined : '' };
  if (ctx.live) {
    return (
      <BaseMenu.CheckboxItem
        checked={on}
        onCheckedChange={setOn}
        disabled={props.disabled}
        closeOnClick={closeOnClick}
        {...common}
      >
        {body}
      </BaseMenu.CheckboxItem>
    );
  }
  return <div {...common}>{body}</div>;
}

export interface MenuRadioItemProps extends Omit<MenuItemProps, 'selected' | 'onClick'> {
  value: unknown;
  /**
   * Static rendering only (inside `<MenuSurface>`, a documented static surface): whether this
   * option is the chosen one. Inside `<Menu>` the `MenuRadioGroup` value decides.
   */
  checked?: boolean;
}

/** One option of a `MenuRadioGroup`; the chosen option takes the selected look. */
export function MenuRadioItem({
  value,
  checked = false,
  closeOnClick = false,
  children,
  leading,
  selectedLeading,
  trailing,
  trailingText,
  supportingText,
  disabled,
  sx,
  ...native
}: MenuRadioItemProps) {
  const ctx = useContext(MenuContext);
  const visual = { children, leading, selectedLeading, trailing, trailingText, supportingText, disabled, sx };
  if (!ctx.live) return <ItemShell htmlProps={native} {...visual} selected={checked} />;
  return (
    <BaseMenu.RadioItem
      value={value}
      disabled={disabled}
      closeOnClick={closeOnClick}
      {...native}
      render={(htmlProps, st) => <ItemShell htmlProps={htmlProps} {...visual} selected={st.checked} />}
    />
  );
}

/** Renders an item's visuals onto a host element (Base UI render props, or a static row). */
function ItemShell({
  htmlProps,
  ...props
}: MenuItemOwnProps & { sx?: StyleXStyles; htmlProps?: ComponentPropsWithRef<'div'> }) {
  const ctx = useContext(MenuContext);
  const { rootProps, body } = useItemVisual({ ...props, variant: ctx.variant, density: ctx.density });
  return (
    <div {...htmlProps} {...rootProps} data-ripple-host={props.disabled ? undefined : ''}>
      {body}
    </div>
  );
}

/** `ref`, native props and `sx` go to the `<span role="separator">`. */
export type MenuDividerProps = SxProps<Omit<ComponentPropsWithRef<'span'>, 'children'>>;

/** Divider between items (baseline) or within a group. */
export function MenuDivider({ sx, ...rest }: MenuDividerProps) {
  return (
    <span role="separator" {...rest} {...stylex.props(s.divider, sx)}>
      <span {...stylex.props(s.dividerLine)} />
    </span>
  );
}
