import { useContext, useMemo, type ReactElement, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { Menu as BaseMenu } from '@base-ui/react/menu';
import { color } from '../../tokens/color.stylex.ts';
import { elevation } from '../../tokens/elevation.stylex.ts';
import { motion } from '../../tokens/motion.stylex.ts';
import { usePortalContainer } from '../../theme/portal.tsx';
import { MenuContext, type MenuDensity, type MenuVariant } from './context.ts';
import { Grouped } from './MenuGroup.tsx';
import { useItemVisual, type MenuItemProps } from './MenuItem.tsx';
import { useComposeOrigin } from './useComposeOrigin.ts';

export type { MenuDensity, MenuVariant } from './context.ts';
export { MenuGroup, MenuRadioGroup, MenuSectionLabel } from './MenuGroup.tsx';
export type { MenuGroupProps, MenuRadioGroupProps } from './MenuGroup.tsx';
export { MenuCheckboxItem, MenuDivider, MenuItem, MenuRadioItem } from './MenuItem.tsx';
export type { MenuCheckboxItemProps, MenuItemProps, MenuRadioItemProps } from './MenuItem.tsx';

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
 * Parts: ./MenuGroup.tsx (groups, section labels), ./MenuItem.tsx (items, divider),
 * ./useComposeOrigin.ts (the popup's transform origin).
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
});

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
  const ctx = useMemo(() => ({ variant, density, live: false }), [variant, density]);
  return (
    <MenuContext value={ctx}>
      <div {...stylex.props(surfaceStyles(variant, width), sx)}>
        <Grouped variant={variant}>{children}</Grouped>
      </div>
    </MenuContext>
  );
}

/** Menu styling context without a container: lay out menu parts in a custom surface. */
export function MenuScope({
  variant = 'standard',
  density = 0,
  children,
}: {
  variant?: MenuVariant;
  density?: MenuDensity;
  children: ReactNode;
}) {
  const ctx = useMemo(() => ({ variant, density, live: false }), [variant, density]);
  return <MenuContext value={ctx}>{children}</MenuContext>;
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
  const { anchorRef, positionerRef } = useComposeOrigin();
  const ctx = useMemo(() => ({ variant, density, live: true }), [variant, density]);
  return (
    <BaseMenu.Root
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange ? (o) => onOpenChange(o) : undefined}
      modal={modal}
    >
      <BaseMenu.Trigger ref={anchorRef} render={trigger} />
      <BaseMenu.Portal container={portalContainer}>
        <BaseMenu.Positioner
          ref={positionerRef}
          side={side}
          align={align}
          sideOffset={sideOffset}
          alignOffset={alignOffset}
        >
          <BaseMenu.Popup {...stylex.props(surfaceStyles(variant, width), s.popupMotion, sx)}>
            <MenuContext value={ctx}>
              <Grouped variant={variant}>{children}</Grouped>
            </MenuContext>
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
  const { anchorRef, positionerRef } = useComposeOrigin();
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
      <BaseMenu.SubmenuTrigger
        ref={anchorRef}
        disabled={item.disabled}
        {...rootProps}
        data-ripple-host={item.disabled ? undefined : ''}
      >
        {body}
      </BaseMenu.SubmenuTrigger>
      <BaseMenu.Portal container={portalContainer}>
        <BaseMenu.Positioner ref={positionerRef} side="inline-end" align="start" sideOffset={4} alignOffset={-4}>
          <BaseMenu.Popup {...stylex.props(surfaceStyles(ctx.variant, width), s.popupMotion)}>
            <MenuContext value={ctx}>
              <Grouped variant={ctx.variant}>{items}</Grouped>
            </MenuContext>
          </BaseMenu.Popup>
        </BaseMenu.Positioner>
      </BaseMenu.Portal>
    </BaseMenu.SubmenuRoot>
  );
}
