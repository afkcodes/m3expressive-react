import * as stylex from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex.ts';
import { elevation } from '../../tokens/elevation.stylex.ts';

export type FabMenuColor = 'primary' | 'secondary' | 'tertiary';

/** Item inline padding (the reveal's overshoot adds to the start side). */
export const ITEM_PAD = 24;
/** Item pill radius — half its 56px height (the reveal's clip follows it). */
export const ITEM_RADIUS = 28;
/** Toggle corner radius closed (the FAB) and open (the close button), and its icon size. */
export const TOGGLE_RADIUS = { closed: 16, open: 28 } as const;
export const TOGGLE_ICON = { closed: 24, open: 20 } as const;

/*
 * Figma kit, Buttons page, "FAB menu" + building blocks (per colour: Segment, FAB).
 *   Item: 56px pill, padding 16/24, gap 8, 24px icon, title-medium label, {colour}-container fill,
 *         on-{colour}-container content, no elevation. Hover 8% / focus 10% / press 8% + ripple.
 *   Close: 56px circle, {colour} fill, 20px "close" icon, level 3 (hover 4; focused: no spread).
 *   Layout: items right-aligned 4px apart, 8px above the close button.
 * Closed, the menu is a regular FAB in the {colour}-container colour.
 * Buttons draw their focus indicator with focusRing.host, listed right after `button`.
 */
export const fabMenuStyles = stylex.create({
  root: { display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', rowGap: 8, verticalAlign: 'bottom' },
  list: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', rowGap: 4, margin: 0, padding: 0 },
  button: {
    appearance: 'none',
    borderWidth: 0,
    margin: 0,
    backgroundImage: 'none',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    lineHeight: 'inherit',
    letterSpacing: 'inherit',
    textAlign: 'inherit',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
    flexShrink: 0,
    cursor: 'pointer',
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
  },
  item: {
    height: 56,
    paddingBlock: 16,
    paddingInline: ITEM_PAD,
    columnGap: 8,
    borderRadius: ITEM_RADIUS,
  },
  close: {
    width: 56,
    height: 56,
    padding: 0,
    borderRadius: 28,
    boxShadow: {
      default: elevation.level3,
      ':hover': { default: null, '@media (hover: hover)': elevation.level4 },
      ':focus-visible': { default: elevation.level3NoSpread, '@media (hover: hover)': elevation.level3NoSpread },
      ':active': { default: elevation.level3, '@media (hover: hover)': elevation.level3 },
    },
  },
  // Closed: the FAB's 16px corners (ToggleFloatingActionButton at progress 0).
  closed: { borderRadius: 16 },
  closeHovered: { boxShadow: elevation.level4 },
  closeFocused: { boxShadow: elevation.level3NoSpread },
  icon: { position: 'relative', display: 'inline-flex', flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  icon24: { width: 24, height: 24 },
  // While the toggle morphs, the icon box follows --m3-fab-icon (set per frame).
  iconMorph: { width: 'var(--m3-fab-icon)', height: 'var(--m3-fab-icon)' },
  label: { position: 'relative', color: 'inherit' },
});

export const itemColors = stylex.create({
  primary: { backgroundColor: color.primaryContainer, color: color.onPrimaryContainer },
  secondary: { backgroundColor: color.secondaryContainer, color: color.onSecondaryContainer },
  tertiary: { backgroundColor: color.tertiaryContainer, color: color.onTertiaryContainer },
});

export const closeColors = stylex.create({
  primary: { backgroundColor: color.primary, color: color.onPrimary },
  secondary: { backgroundColor: color.secondary, color: color.onSecondary },
  tertiary: { backgroundColor: color.tertiary, color: color.onTertiary },
});

/** [closed, open] container and content colours of the toggle, for the per-frame Oklab mix. */
export const TOGGLE_COLORS: Record<FabMenuColor, { container: [string, string]; content: [string, string] }> = {
  primary: { container: [color.primaryContainer, color.primary], content: [color.onPrimaryContainer, color.onPrimary] },
  secondary: {
    container: [color.secondaryContainer, color.secondary],
    content: [color.onSecondaryContainer, color.onSecondary],
  },
  tertiary: {
    container: [color.tertiaryContainer, color.tertiary],
    content: [color.onTertiaryContainer, color.onTertiary],
  },
};
