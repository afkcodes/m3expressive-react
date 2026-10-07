import { Children, createContext, isValidElement, useContext, useLayoutEffect, useRef, useState, type ReactElement, type ReactNode, type RefObject } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { Menu as BaseMenu } from '@base-ui/react/menu';
import { color } from '../../tokens/color.stylex.ts';
import { elevation } from '../../tokens/elevation.stylex.ts';
import { motion } from '../../tokens/motion.stylex.ts';
import { typescale } from '../../tokens/typescale.ts';
import { interaction } from '../../primitives/state.stylex.ts';
import { state } from '../../tokens/state.stylex.ts';
import { StateLayer, stateLayerHost } from '../../primitives/StateLayer.tsx';
import { Ripple } from '../../primitives/Ripple.tsx';
import { useForcedState } from '../../testing/ForceState.tsx';
import { usePortalContainer } from '../../theme/portal.tsx';

export type MenuVariant = 'standard' | 'vibrant' | 'baseline';
export type MenuDensity = 0 | -2 | -4;

interface MenuContextValue {
  variant: MenuVariant;
  density: MenuDensity;
  /** Inside a Base UI menu popup (items are real, focusable menu items). */
  live: boolean;
}
const MenuContext = createContext<MenuContextValue>({ variant: 'standard', density: 0, live: false });
/** Number of groups in the enclosing menu (shadow spread depends on it). */
const GroupCountContext = createContext(1);

/*
 * Figma kit, "Menu" page.
 * Expressive (Menu 58966:3975, Menu item/Standard + /Vibrant; Compose DropdownMenuGroup +
 *   DropdownMenuItem, SegmentedMenuTokens): groups 2px apart on a level-3 shadow; each group is a
 *   Surface Container Low (vibrant: Tertiary Container) column with 2px vertical padding, 8px
 *   corners and 16px at the menu's outer ends. Items are 48px: a 44px content box inset 4/2 with
 *   4px corners (selected: 12px, Tertiary Container / vibrant Tertiary), 12px padding, 8px gaps,
 *   20px icons and a label-large label. Shape morphs on the fast spatial spring, colours on fast
 *   effects; a group that stops being hovered settles to its 8px inactive shape (Compose).
 * Baseline (Menu (baseline) 54061:36963): Surface Container, 4px corners, 8px vertical padding,
 *   level 2; rows 56 / 48 / 40px (density 0 / -2 / -4), 12px padding and gaps, 24px icons,
 *   body-large label; selected = Secondary Container.
 * Popup motion (Compose DropdownMenuContent): scale 0.8 → 1 on the fast spatial spring and
 * alpha on fast effects, from Compose's transform origin (Menu.kt calculateTransformOrigin): the
 * centre of the anchor / menu overlap on each axis, or the anchor-facing edge when they don't
 * overlap — e.g. (overlap centre, 0) below the anchor, (0, overlap centre) for a submenu.
 * A `selectedLeading` icon without a `leading` one expands in (width on fast spatial, from the
 * end) and fades in on fast effects when the item is selected (Menu.kt AnimatedVisibility).
 */
const s = stylex.create({
  // ── containers ─────────────────────────────────────────────────────────────────────────────
  surface: {
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    minWidth: 112,
    maxWidth: 280,
    width: 'max-content',
    outlineStyle: 'none',
  },
  expressiveSurface: { rowGap: 2, isolation: 'isolate' },
  baselineSurface: {
    paddingBlock: 8,
    borderRadius: 4,
    backgroundColor: color.surfaceContainer,
    // The kit's baseline menu frame doesn't clip, so Figma draws level 2 without its spread.
    boxShadow: elevation.level2NoSpread,
  },
  width: (w: number) => ({ width: w, minWidth: 0, maxWidth: 'none' }),
  popupMotion: {
    transformOrigin: 'var(--m3x-menu-origin, var(--transform-origin))',
    opacity: { default: 1, ':is([data-starting-style], [data-ending-style])': 0 },
    scale: { default: '1', ':is([data-starting-style], [data-ending-style])': '0.8' },
    transitionProperty: 'opacity, scale',
    transitionDuration: `${motion.fastEffectsDuration}, ${motion.fastSpatialDuration}`,
    transitionTimingFunction: `${motion.fastEffectsEasing}, ${motion.fastSpatialEasing}`,
  },
  // The menu's shadow is cast by the union of its groups (the 2px gaps show it, as in the kit):
  // every group draws its shadow on a layer below all of them.
  group: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    paddingBlock: 2,
    borderTopLeftRadius: { default: 8, ':first-child': 16 },
    borderTopRightRadius: { default: 8, ':first-child': 16 },
    borderBottomLeftRadius: { default: 8, ':last-child': 16 },
    borderBottomRightRadius: { default: 8, ':last-child': 16 },
    transitionProperty: 'border-radius',
    transitionDuration: motion.fastSpatialDuration,
    transitionTimingFunction: motion.fastSpatialEasing,
    '::before': {
      content: '""',
      position: 'absolute',
      inset: 0,
      zIndex: -1,
      borderRadius: 'inherit',
      boxShadow: elevation.level3NoSpread,
      pointerEvents: 'none',
    },
  },
  // Figma draws the menu's level-3 shadow with its 3px spread only when the menu is one group.
  groupSolo: { '::before': { boxShadow: elevation.level3 } },
  groupInactive: { borderTopLeftRadius: 8, borderTopRightRadius: 8, borderBottomLeftRadius: 8, borderBottomRightRadius: 8 },
  groupStandard: { backgroundColor: color.surfaceContainerLow },
  groupVibrant: { backgroundColor: color.tertiaryContainer },
  // Kit "Label-basic": a 26px text box 6px from the top with its 20px line centred (line at y 9).
  sectionLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    boxSizing: 'border-box',
    height: 32,
    paddingTop: 9,
    paddingInline: 16,
    margin: 0,
    color: color.onSurfaceVariant,
  },
  sectionLabelVibrant: { color: color.onTertiaryContainer },
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

// ── Surface ───────────────────────────────────────────────────────────────────────────────────

export interface MenuSurfaceProps {
  variant?: MenuVariant;
  /** Baseline only: row height 56 / 48 / 40px. */
  density?: MenuDensity;
  /** Fixed width (px). By default the menu hugs its widest item (112–280px). */
  width?: number;
  children: ReactNode;
  sx?: StyleXStyles;
}

/** Wraps loose items of an expressive menu in a single group (a menu is always ≥ 1 group). */
function grouped(variant: MenuVariant, children: ReactNode) {
  if (variant === 'baseline') return children;
  const list = Children.toArray(children);
  const groups = list.filter((c) => isValidElement(c) && (c.type === MenuGroup || c.type === MenuRadioGroup)).length;
  return groups > 0 ? (
    <GroupCountContext value={groups}>{children}</GroupCountContext>
  ) : (
    <GroupCountContext value={1}>
      <MenuGroup>{children}</MenuGroup>
    </GroupCountContext>
  );
}

const surfaceStyles = (variant: MenuVariant, width?: number) => [
  s.surface,
  variant === 'baseline' ? s.baselineSurface : s.expressiveSurface,
  width != null && s.width(width),
];

/**
 * The menu's look on its own — a static, presentational rendering (kit building blocks, previews).
 * It carries no menu semantics or keyboard behaviour: for an interactive menu use `<Menu>`.
 */
export function MenuSurface({ variant = 'standard', density = 0, width, children, sx }: MenuSurfaceProps) {
  return (
    <MenuContext value={{ variant, density, live: false }}>
      <div {...stylex.props(surfaceStyles(variant, width), sx)}>
        {grouped(variant, children)}
      </div>
    </MenuContext>
  );
}

/** Menu styling context without a container: lay out menu parts in a custom surface. */
export function MenuScope({ variant = 'standard', density = 0, children }: { variant?: MenuVariant; density?: MenuDensity; children: ReactNode }) {
  return <MenuContext value={{ variant, density, live: false }}>{children}</MenuContext>;
}

/** A group's section label (kit "Label-basic" / "Label-vibrant"): 32px, label-large. */
export function MenuSectionLabel({ children, sx }: { children: ReactNode; sx?: StyleXStyles }) {
  const { variant, live } = useContext(MenuContext);
  const p = stylex.props(typescale.labelLarge, s.sectionLabel, variant === 'vibrant' && s.sectionLabelVibrant, sx);
  return live ? <BaseMenu.GroupLabel {...p}>{children}</BaseMenu.GroupLabel> : <div {...p}>{children}</div>;
}

// ── Group ─────────────────────────────────────────────────────────────────────────────────────

export interface MenuGroupProps {
  /** Section label shown above the group's items. */
  label?: ReactNode;
  children: ReactNode;
  sx?: StyleXStyles;
}

/** Group container props + label, shared by MenuGroup and MenuRadioGroup. */
function useGroup(label: ReactNode, sx: StyleXStyles | undefined) {
  const { variant, live } = useContext(MenuContext);
  const solo = useContext(GroupCountContext) === 1;
  // Compose DropdownMenuGroup: once hovered and left, the group settles on its inactive shape.
  const [hovered, setHovered] = useState(false);
  const [hasBeenHovered, setHasBeenHovered] = useState(false);
  const labelEl = label != null && <MenuSectionLabel>{label}</MenuSectionLabel>;
  const props = {
    onPointerEnter: () => {
      setHovered(true);
      setHasBeenHovered(true);
    },
    onPointerLeave: () => setHovered(false),
    ...stylex.props(
      s.group,
      solo && s.groupSolo,
      variant === 'vibrant' ? s.groupVibrant : s.groupStandard,
      hasBeenHovered && !hovered && s.groupInactive,
      sx,
    ),
  };
  return { variant, live, labelEl, props };
}

/** A segment of an expressive menu (baseline menus render their items directly). */
export function MenuGroup({ label, children, sx }: MenuGroupProps) {
  const { variant, live, labelEl, props } = useGroup(label, sx);
  if (variant === 'baseline') return <>{children}</>;
  if (live) {
    return (
      <BaseMenu.Group {...props}>
        {labelEl}
        {children}
      </BaseMenu.Group>
    );
  }
  return (
    <div role="group" {...props}>
      {labelEl}
      {children}
    </div>
  );
}

export interface MenuRadioGroupProps extends MenuGroupProps {
  value?: unknown;
  defaultValue?: unknown;
  onValueChange?: (value: unknown) => void;
}

/** Single-choice options (`MenuRadioItem`); renders as a menu group. */
export function MenuRadioGroup({ value, defaultValue, onValueChange, label, children, sx }: MenuRadioGroupProps) {
  const { variant, live, labelEl, props } = useGroup(label, sx);
  if (!live) return variant === 'baseline' ? <>{children}</> : <div role="group" {...props}>{labelEl}{children}</div>;
  return (
    <BaseMenu.RadioGroup
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange ? (v) => onValueChange(v) : undefined}
      {...(variant === 'baseline' ? {} : props)}
    >
      {labelEl}
      {children}
    </BaseMenu.RadioGroup>
  );
}

// ── Items ─────────────────────────────────────────────────────────────────────────────────────

export interface MenuItemProps {
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
  onClick?: () => void;
  /** Close the menu when activated (default true). */
  closeOnClick?: boolean;
  /** Visual-test hook: the kit's "Active" state (submenu open). */
  active?: boolean;
  sx?: StyleXStyles;
}

interface ItemVisualProps extends Omit<MenuItemProps, 'onClick' | 'closeOnClick'> {
  variant: MenuVariant;
  density: MenuDensity;
}

/** The leading slot: `leading`, swapped for / expanded into `selectedLeading` while selected. */
function leadingSlot(leading: ReactNode, selectedLeading: ReactNode, selected: boolean, iconStyles: StyleXStyles, size: number) {
  if (selectedLeading == null) return leading != null ? <span {...stylex.props(iconStyles)}>{leading}</span> : null;
  if (leading != null) return <span {...stylex.props(iconStyles)}>{selected ? selectedLeading : leading}</span>;
  return (
    <span aria-hidden={!selected || undefined} {...stylex.props(s.selectedSlot, selected && s.selectedSlotOn(size))}>
      <span {...stylex.props(iconStyles, s.slotIcon)}>{selectedLeading}</span>
    </span>
  );
}

function useItemVisual({ children, leading, selectedLeading, trailing, trailingText, supportingText, selected = false, disabled = false, active = false, sx, variant, density }: ItemVisualProps) {
  const forced = useForcedState();
  const interactive = !disabled;
  const forcedStyles = [
    (forced.state === 'hovered' || active) && stateLayerHost.forceHover,
    forced.state === 'focused' && stateLayerHost.forceFocus,
    forced.state === 'pressed' && stateLayerHost.forceHover,
  ];
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
    return { rootProps, body };
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
        {supportingText != null && <span {...stylex.props(typescale.bodySmall, s.supporting, onContainer && s.iconInherit)}>{supportingText}</span>}
      </span>
      {(trailing != null || trailingText != null) && (
        <span {...stylex.props(s.trailing, onContainer && s.iconInherit, disabled && s.dim)}>
          {trailingText != null && <span {...stylex.props(typescale.labelLarge)}>{trailingText}</span>}
          {trailing}
        </span>
      )}
    </span>
  );
  return { rootProps, body };
}

/** A menu item: a real menu item inside `<Menu>`, a static (presentational) row inside `<MenuSurface>`. */
export function MenuItem({ onClick, closeOnClick = true, ...props }: MenuItemProps) {
  const ctx = useContext(MenuContext);
  const { rootProps, body } = useItemVisual({ ...props, variant: ctx.variant, density: ctx.density });
  const common = { ...rootProps, 'data-ripple-host': props.disabled ? undefined : '' };
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
  onCheckedChange?: (checked: boolean) => void;
}

/** A toggleable item: checked items take the selected look (Compose CheckableDropdownMenuItem). */
export function MenuCheckboxItem({ checked, defaultChecked = false, onCheckedChange, closeOnClick = false, ...props }: MenuCheckboxItemProps) {
  const ctx = useContext(MenuContext);
  const [inner, setInner] = useState(defaultChecked);
  const on = checked ?? inner;
  const { rootProps, body } = useItemVisual({ ...props, selected: on, variant: ctx.variant, density: ctx.density });
  const common = { ...rootProps, 'data-ripple-host': props.disabled ? undefined : '' };
  const set = (v: boolean) => {
    if (checked === undefined) setInner(v);
    onCheckedChange?.(v);
  };
  if (ctx.live) {
    return (
      <BaseMenu.CheckboxItem checked={on} onCheckedChange={set} disabled={props.disabled} closeOnClick={closeOnClick} {...common}>
        {body}
      </BaseMenu.CheckboxItem>
    );
  }
  return <div {...common}>{body}</div>;
}

export interface MenuRadioItemProps extends Omit<MenuItemProps, 'selected' | 'onClick'> {
  value: unknown;
  /** Static rendering only (inside `<MenuSurface>`): whether this option is the chosen one. */
  checked?: boolean;
}

/** One option of a `MenuRadioGroup`; the chosen option takes the selected look. */
export function MenuRadioItem({ value, checked = false, closeOnClick = false, ...props }: MenuRadioItemProps) {
  const ctx = useContext(MenuContext);
  if (!ctx.live) return <ItemShell {...props} selected={checked} />;
  return (
    <BaseMenu.RadioItem
      value={value}
      disabled={props.disabled}
      closeOnClick={closeOnClick}
      render={(htmlProps, st) => <ItemShell htmlProps={htmlProps} {...props} selected={st.checked} />}
    />
  );
}

/** Renders an item's visuals onto a host element (Base UI render props, or a static row). */
function ItemShell({ htmlProps, ...props }: Omit<MenuItemProps, 'onClick' | 'closeOnClick'> & { htmlProps?: React.HTMLAttributes<HTMLElement> }) {
  const ctx = useContext(MenuContext);
  const { rootProps, body } = useItemVisual({ ...props, variant: ctx.variant, density: ctx.density });
  return (
    <div
      {...htmlProps}
      {...rootProps}
      data-ripple-host={props.disabled ? undefined : ''}
    >
      {body}
    </div>
  );
}

/** Divider between items (baseline) or within a group. */
export function MenuDivider({ sx }: { sx?: StyleXStyles }) {
  return (
    <span role="separator" {...stylex.props(s.divider, sx)}>
      <span {...stylex.props(s.dividerLine)} />
    </span>
  );
}

// ── Menu (popup) ──────────────────────────────────────────────────────────────────────────────

/** One axis of Compose `calculateTransformOrigin` (Menu.kt), in px from the menu's start edge. */
function pivot(anchorStart: number, anchorEnd: number, menuStart: number, menuEnd: number) {
  if (menuStart >= anchorEnd) return 0;
  if (menuEnd <= anchorStart) return menuEnd - menuStart;
  if (menuEnd === menuStart) return 0;
  return (Math.max(anchorStart, menuStart) + Math.min(anchorEnd, menuEnd)) / 2 - menuStart;
}

/**
 * Compose's popup transform origin, recomputed whenever Base UI (re)positions the menu — it
 * writes the positioner's inline style, so a MutationObserver sees every placement before paint.
 * Written to the popup as `--m3x-menu-origin` (Base UI's own `--transform-origin` is the aligned
 * edge offset by the side gap).
 */
function useComposeOrigin(): { anchor: RefObject<HTMLElement | null>; positionerRef: (el: HTMLDivElement | null) => void } {
  const anchor = useRef<HTMLElement | null>(null);
  const [positioner, setPositioner] = useState<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    if (!positioner) return;
    const update = () => {
      const popup = positioner.querySelector<HTMLElement>(':scope > [role="menu"]');
      if (!anchor.current || !popup) return;
      const a = anchor.current.getBoundingClientRect();
      // The positioner isn't scaled: its box is the menu's laid-out bounds.
      const m = positioner.getBoundingClientRect();
      popup.style.setProperty('--m3x-menu-origin', `${pivot(a.left, a.right, m.left, m.right)}px ${pivot(a.top, a.bottom, m.top, m.bottom)}px`);
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(positioner, { attributes: true, attributeFilter: ['style'] });
    return () => observer.disconnect();
  }, [positioner]);
  return { anchor, positionerRef: setPositioner };
}

export interface MenuProps extends Omit<MenuSurfaceProps, 'sx'> {
  /** The element that opens the menu (must forward its ref, e.g. a Button). */
  trigger: ReactElement;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  side?: 'top' | 'bottom' | 'left' | 'right' | 'inline-start' | 'inline-end';
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  alignOffset?: number;
  /** Pointer and focus outside close the menu and trap focus (default true). */
  modal?: boolean;
  sx?: StyleXStyles;
}

/** Dropdown menu: opens from `trigger`, positions itself, handles keyboard navigation. */
export function Menu({
  trigger,
  open,
  defaultOpen,
  onOpenChange,
  side = 'bottom',
  align = 'start',
  sideOffset = 4,
  alignOffset = 0,
  modal = true,
  variant = 'standard',
  density = 0,
  width,
  children,
  sx,
}: MenuProps) {
  const portalContainer = usePortalContainer();
  const origin = useComposeOrigin();
  return (
    <BaseMenu.Root open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange ? (o) => onOpenChange(o) : undefined} modal={modal}>
      <BaseMenu.Trigger ref={origin.anchor as React.Ref<HTMLButtonElement>} render={trigger} />
      <BaseMenu.Portal container={portalContainer}>
        <BaseMenu.Positioner ref={origin.positionerRef} side={side} align={align} sideOffset={sideOffset} alignOffset={alignOffset}>
          <BaseMenu.Popup {...stylex.props(surfaceStyles(variant, width), s.popupMotion, sx)}>
            <MenuContext value={{ variant, density, live: true }}>{grouped(variant, children)}</MenuContext>
          </BaseMenu.Popup>
        </BaseMenu.Positioner>
      </BaseMenu.Portal>
    </BaseMenu.Root>
  );
}

export interface SubmenuProps extends Omit<MenuItemProps, 'onClick' | 'closeOnClick' | 'selected'> {
  /** The submenu's items (or groups). */
  items: ReactNode;
  width?: number;
}

/** An item that opens a nested menu to its side; it keeps its hover layer while open (kit "Active"). */
export function Submenu({ items, width, ...item }: SubmenuProps) {
  const ctx = useContext(MenuContext);
  const portalContainer = usePortalContainer();
  const origin = useComposeOrigin();
  const { rootProps, body } = useItemVisual({ ...item, variant: ctx.variant, density: ctx.density });
  if (!ctx.live) {
    return (
      <div role="menuitem" aria-haspopup="menu" tabIndex={-1} {...rootProps}>
        {body}
      </div>
    );
  }
  return (
    <BaseMenu.SubmenuRoot>
      <BaseMenu.SubmenuTrigger ref={origin.anchor} disabled={item.disabled} {...rootProps} data-ripple-host={item.disabled ? undefined : ''}>
        {body}
      </BaseMenu.SubmenuTrigger>
      <BaseMenu.Portal container={portalContainer}>
        <BaseMenu.Positioner ref={origin.positionerRef} side="inline-end" align="start" sideOffset={4} alignOffset={-4}>
          <BaseMenu.Popup {...stylex.props(surfaceStyles(ctx.variant, width), s.popupMotion)}>
            <MenuContext value={ctx}>{grouped(ctx.variant, items)}</MenuContext>
          </BaseMenu.Popup>
        </BaseMenu.Positioner>
      </BaseMenu.Portal>
    </BaseMenu.SubmenuRoot>
  );
}
