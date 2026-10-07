import * as stylex from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex.ts';
import { motion } from '../../tokens/motion.stylex.ts';
import { state } from '../../tokens/state.stylex.ts';
import type { ButtonSize } from '../Button/buttonStyles.ts';

export type IconButtonWidth = 'narrow' | 'default' | 'wide';

/*
 * Figma kit, Buttons page, sets "Icon button" / "- standard" / "- outline" / "- tonal".
 * Container (w × h) per size and width; XS/S sit in a 48px touch target.
 *            narrow   default  wide     icon
 *   xsmall   28×32    32×32    40×32    20
 *   small    32×40    40×40    52×40    24
 *   medium   48×56    56×56    72×56    24
 *   large    64×96    96×96    128×96   32
 *   xlarge   104×136  136×136  184×136  40
 * Round = half the shorter side (the kit's 100, clamped); square / pressed radii as Button.
 */
export const ICON_BUTTON_SIZE: Record<
  ButtonSize,
  { height: number; widths: Record<IconButtonWidth, number>; icon: number }
> = {
  xsmall: { height: 32, widths: { narrow: 28, default: 32, wide: 40 }, icon: 20 },
  small: { height: 40, widths: { narrow: 32, default: 40, wide: 52 }, icon: 24 },
  medium: { height: 56, widths: { narrow: 48, default: 56, wide: 72 }, icon: 24 },
  large: { height: 96, widths: { narrow: 64, default: 96, wide: 128 }, icon: 32 },
  xlarge: { height: 136, widths: { narrow: 104, default: 136, wide: 184 }, icon: 40 },
};

/** Square-shape and pressed corner radii per size (as Button). */
export const SQUARE_RADIUS: Record<ButtonSize, number> = { xsmall: 12, small: 12, medium: 16, large: 28, xlarge: 28 };
export const PRESSED_RADIUS: Record<ButtonSize, number> = { xsmall: 8, small: 8, medium: 12, large: 16, xlarge: 16 };

/**
 * Compression limit inside a standard button group: Compose's default for icon buttons
 * (ButtonDefaults.ContentPadding end, 24dp).
 */
export const GROUP_COMPRESSION_LIMIT = 24;

/*
 * Shared parts. The container's focus indicator is `focusRing.part`, listed right after
 * `container` (as for buttons).
 */
export const iconButtonBase = stylex.create({
  root: {
    appearance: 'none',
    borderWidth: 0,
    margin: 0,
    padding: 0,
    backgroundColor: 'transparent',
    backgroundImage: 'none',
    color: 'inherit',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    verticalAlign: 'middle',
    flexShrink: 0,
    cursor: { default: 'pointer', ':disabled': 'default' },
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
    outline: 'none',
  },
  // The M3 48px minimum touch target (Button's TOUCH_TARGET; StyleX needs the literal here).
  touch48: { minWidth: 48, height: 48 },
  // Inside a button group: same 48px hit area, but as an overlay so the layout width stays the
  // container's (the kit's grouped XS icon buttons are 40px wide).
  touch48Overlay: {
    height: 48,
    '::before': {
      content: '""',
      position: 'absolute',
      insetBlock: 0,
      insetInline: 'min(0px, calc((100% - 48px) / 2))',
    },
  },
  container: {
    position: 'relative',
    isolation: 'isolate',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
    flexShrink: 0,
    // Press / checked morph on DefaultEffects — Compose IconButton.kt `shapeForInteraction`:
    // "DefaultEffects is intentional here to prevent any bounce" (IconButton and IconToggleButton).
    transitionProperty: 'border-radius',
    transitionDuration: motion.defaultEffectsDuration,
    transitionTimingFunction: motion.defaultEffectsEasing,
  },
  icon: { position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  stroke: {
    '::after': {
      content: '""',
      position: 'absolute',
      inset: 0,
      borderRadius: 'inherit',
      borderStyle: 'solid',
      borderColor: color.outlineVariant,
      pointerEvents: 'none',
    },
  },
});

export const iconButtonDims = stylex.create({
  box: (boxWidth: number, boxHeight: number) => ({ width: boxWidth, height: boxHeight }),
  icon: (px: number) => ({ width: px, height: px }),
});

export const iconButtonRadii = stylex.create({
  shape: (rest: string, pressed: string) => ({
    borderRadius: { default: rest, [stylex.when.ancestor(':active')]: pressed },
  }),
  pressed: (radius: string) => ({ borderRadius: radius }),
});

export const iconStrokeWidths = stylex.create({
  thin: { '::after': { borderWidth: 1 } },
  thick: { '::after': { borderWidth: 2 } },
});

/** Outline width by size: 1px up to medium, 2px for large / xlarge. */
export const iconStrokeWidth = (size: ButtonSize) =>
  size === 'large' || size === 'xlarge' ? iconStrokeWidths.thick : iconStrokeWidths.thin;

export const iconButtonDisabled = stylex.create({
  // Kit: filled/tonal get an on-surface 10% container; standard/outlined stay transparent (outline kept).
  filledContainer: {
    backgroundColor: `color-mix(in srgb, ${color.onSurface} 10%, transparent)`,
    color: color.onSurface,
  },
  clearContainer: { backgroundColor: 'transparent', color: color.onSurface },
  content: { opacity: state.disabledContentOpacity },
});
