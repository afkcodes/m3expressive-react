import type { ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex';
import { motion } from '../../tokens/motion.stylex';
import { state } from '../../tokens/state.stylex';
import { StateLayer } from '../../primitives/StateLayer.tsx';
import { Ripple } from '../../primitives/Ripple.tsx';
import type { ButtonShape, ButtonSize } from '../Button/buttonStyles.ts';

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
export const SIZE: Record<ButtonSize, { h: number; w: Record<IconButtonWidth, number>; icon: number }> = {
  xsmall: { h: 32, w: { narrow: 28, default: 32, wide: 40 }, icon: 20 },
  small: { h: 40, w: { narrow: 32, default: 40, wide: 52 }, icon: 24 },
  medium: { h: 56, w: { narrow: 48, default: 56, wide: 72 }, icon: 24 },
  large: { h: 96, w: { narrow: 64, default: 96, wide: 128 }, icon: 32 },
  xlarge: { h: 136, w: { narrow: 104, default: 136, wide: 184 }, icon: 40 },
};

export const base = stylex.create({
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
  touch48: { minWidth: 48, height: 48 },
  // Inside a button group: same 48px hit area, but as an overlay so the layout width stays the
  // container's (the kit's grouped XS icon buttons are 40px wide).
  touch48Overlay: {
    height: 48,
    '::before': { content: '""', position: 'absolute', insetBlock: 0, insetInline: 'min(0px, calc((100% - 48px) / 2))' },
  },
  container: {
    position: 'relative',
    isolation: 'isolate',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
    flexShrink: 0,
    outlineStyle: { default: 'none', [stylex.when.ancestor(':focus-visible')]: 'solid' },
    outlineColor: color.secondary,
    outlineWidth: state.focusIndicatorThickness,
    outlineOffset: state.focusIndicatorOuterOffset,
    // Press / checked morph on DefaultEffects — Compose IconButton.kt `shapeForInteraction`:
    // "DefaultEffects is intentional here to prevent any bounce" (IconButton and IconToggleButton).
    transitionProperty: 'border-radius',
    transitionDuration: motion.defaultEffectsDuration,
    transitionTimingFunction: motion.defaultEffectsEasing,
  },
  ringForced: { outlineStyle: 'solid' },
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

export const dims = stylex.create({
  box: (w: number, h: number) => ({ width: w, height: h }),
  icon: (px: number) => ({ width: px, height: px }),
});

export const radii = stylex.create({
  shape: (rest: string, pressed: string) => ({
    borderRadius: { default: rest, [stylex.when.ancestor(':active')]: pressed },
  }),
  pressed: (r: string) => ({ borderRadius: r }),
});

export const SQUARE: Record<ButtonSize, number> = { xsmall: 12, small: 12, medium: 16, large: 28, xlarge: 28 };
export const PRESSED: Record<ButtonSize, number> = { xsmall: 8, small: 8, medium: 12, large: 16, xlarge: 16 };

export const strokeWidths = stylex.create({
  thin: { '::after': { borderWidth: 1 } },
  thick: { '::after': { borderWidth: 2 } },
});


export const disabled = stylex.create({
  // Kit: filled/tonal get an on-surface 10% container; standard/outlined stay transparent (outline kept).
  filledContainer: { backgroundColor: `color-mix(in srgb, ${color.onSurface} 10%, transparent)`, color: color.onSurface },
  clearContainer: { backgroundColor: 'transparent', color: color.onSurface },
  content: { opacity: state.disabledContentOpacity },
});

/** Container + state layer + ripple + icon slot, shared by IconButton and ToggleIconButton. */
export function IconButtonFrame({
  size,
  width,
  shape,
  pressed,
  isDisabled,
  focusRing,
  container,
  children,
}: {
  size: ButtonSize;
  width: IconButtonWidth;
  shape: ButtonShape;
  pressed: boolean;
  isDisabled: boolean;
  focusRing: boolean;
  container: ReadonlyArray<StyleXStyles | false | null | undefined>;
  children: ReactNode;
}) {
  const { h, w: widths, icon } = SIZE[size];
  const w = widths[width];
  const rest = shape === 'round' ? `${Math.min(w, h) / 2}px` : `${SQUARE[size]}px`;
  const pressedR = `${PRESSED[size]}px`;
  return (
    <span
      {...stylex.props(
        base.container,
        dims.box(w, h),
        radii.shape(rest, pressedR),
        pressed && radii.pressed(pressedR),
        ...container,
        focusRing && base.ringForced,
      )}
    >
      <StateLayer />
      <Ripple disabled={isDisabled} />
      <span {...stylex.props(base.icon, dims.icon(icon), isDisabled && disabled.content)}>{children}</span>
    </span>
  );
}
