import * as stylex from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex.ts';
import { elevation } from '../../tokens/elevation.stylex.ts';
import { motion } from '../../tokens/motion.stylex.ts';
import { state } from '../../tokens/state.stylex.ts';
import { interaction } from '../../primitives/state.stylex.ts';
import { buttonBase, buttonDisabled, containerMotion, TOUCH_TARGET, type ButtonSize } from '../Button/buttonStyles.ts';

export type SplitButtonVariant = 'filled' | 'tonal' | 'outlined' | 'elevated';

/*
 * Figma kit, Buttons page, set "Split button" (5 sizes × 4 colours × 9 leading/trailing states).
 * A leading button (icon + label) and a trailing menu button (chevron), 2px apart.
 *            height  leading pad (start/end)  trailing w  chevron box  inner r  inner r (hover/press)
 *   xsmall   32      12 / 10                  48          22           4        8
 *   small    40      16 / 12                  48          22           4        12
 *   medium   56      24 / 24                  56          26           4        12
 *   large    96      48 / 48                  96          38           8        20
 *   xlarge   136     64 / 64                  136         50           12       20
 * Outer corners are fully round. The chevron sits off-centre towards the leading button
 * (-1/-1/-2/-3/-6px); pressed or expanded ("Selected") centres it and flips it up, and expanded
 * makes the trailing button fully round with the 10% layer. Focus draws only the focus ring (the
 * kit's Focused variants have no state layer). Outline: 1px at every size. Elevated: level 3 cast
 * by the fill-less group frame, so no spread; disabled drops it.
 */
export const HEIGHT: Record<ButtonSize, number> = { xsmall: 32, small: 40, medium: 56, large: 96, xlarge: 136 };
export const TRAILING_WIDTH: Record<ButtonSize, number> = { xsmall: 48, small: 48, medium: 56, large: 96, xlarge: 136 };
export const CHEVRON_SIZE: Record<ButtonSize, number> = { xsmall: 22, small: 22, medium: 26, large: 38, xlarge: 50 };
export const CHEVRON_SHIFT: Record<ButtonSize, number> = { xsmall: -1, small: -1, medium: -2, large: -3, xlarge: -6 };
export const INNER_RADII: Record<ButtonSize, [rest: number, active: number]> = {
  xsmall: [4, 8],
  small: [4, 12],
  medium: [4, 12],
  large: [8, 20],
  xlarge: [12, 20],
};
export const LEADING_PAD: Record<ButtonSize, [start: number, end: number]> = {
  xsmall: [12, 10],
  small: [16, 12],
  medium: [24, 24],
  large: [48, 48],
  xlarge: [64, 64],
};
export const KEYBOARD_ARROW_DOWN = 'M12 15.4L6 9.4L7.4 8L12 12.6L16.6 8L18 9.4L12 15.4Z';

export const splitStyles = stylex.create({
  group: {
    display: 'inline-flex',
    alignItems: 'center',
    columnGap: 2,
    verticalAlign: 'middle',
    // Own stacking context: the parts' shadow casters (z -1) paint under both buttons.
    isolation: 'isolate',
  },
  // Parts don't isolate, so their shadow casters join the group's stacking context.
  // Hover layer only: focus is shown by the ring alone (kit).
  part: {
    isolation: 'auto',
    [interaction.layerOpacity]: {
      default: '0',
      ':hover': { default: '0', '@media (hover: hover)': state.hoverOpacity },
    },
  },
  stroke: { '::after': { borderWidth: 1 } },
  container: { flexShrink: 0 },
  shadow: {
    position: 'absolute',
    insetInline: 0,
    zIndex: -1,
    pointerEvents: 'none',
    boxShadow: elevation.level3NoSpread,
    // Follows the container's corners (same spring).
    transitionProperty: 'border-radius',
    transitionDuration: motion.defaultEffectsDuration,
    transitionTimingFunction: motion.defaultEffectsEasing,
  },
  // The chevron's optical offset follows the morphing shape (Compose horizontalCenterOptically
  // reads the animated corners), so it shares the DefaultEffects spring.
  chevron: {
    display: 'block',
    flexShrink: 0,
    transitionProperty: 'translate',
    transitionDuration: motion.defaultEffectsDuration,
    transitionTimingFunction: motion.defaultEffectsEasing,
  },
  // Compose sample (SplitButtonSamples.kt): rotation via animateFloatAsState's default spring —
  // no bounce (ζ 1, stiffness 1500); DefaultEffects (ζ 1, 1600) is the matching scheme token.
  chevronPath: {
    transformBox: 'fill-box',
    transformOrigin: 'center',
    transitionProperty: 'rotate',
    transitionDuration: motion.defaultEffectsDuration,
    transitionTimingFunction: motion.defaultEffectsEasing,
  },
});

export const splitDyn = stylex.create({
  box: (w: number | null, h: number) => ({ width: w, height: h }),
  inset: (block: number) => ({ insetBlock: block }),
  pad: (start: number, end: number) => ({ paddingInlineStart: start, paddingInlineEnd: end }),
  // Leading: outer corners at the start; trailing: at the end. Inner corners grow on hover / press.
  leadingRadii: (outer: string, rest: string, active: string) => ({
    borderStartStartRadius: outer,
    borderEndStartRadius: outer,
    borderStartEndRadius: {
      default: rest,
      [stylex.when.ancestor(':hover')]: { default: null, '@media (hover: hover)': active },
      [stylex.when.ancestor(':active')]: { default: active, '@media (hover: hover)': active },
    },
    borderEndEndRadius: {
      default: rest,
      [stylex.when.ancestor(':hover')]: { default: null, '@media (hover: hover)': active },
      [stylex.when.ancestor(':active')]: { default: active, '@media (hover: hover)': active },
    },
  }),
  trailingRadii: (outer: string, rest: string, active: string) => ({
    borderStartEndRadius: outer,
    borderEndEndRadius: outer,
    borderStartStartRadius: {
      default: rest,
      [stylex.when.ancestor(':hover')]: { default: null, '@media (hover: hover)': active },
      [stylex.when.ancestor(':active')]: { default: active, '@media (hover: hover)': active },
    },
    borderEndStartRadius: {
      default: rest,
      [stylex.when.ancestor(':hover')]: { default: null, '@media (hover: hover)': active },
      [stylex.when.ancestor(':active')]: { default: active, '@media (hover: hover)': active },
    },
  }),
  // Static radii (disabled, forced states, expanded).
  radii: (ss: string, se: string, es: string, ee: string) => ({
    borderStartStartRadius: ss,
    borderStartEndRadius: se,
    borderEndStartRadius: es,
    borderEndEndRadius: ee,
  }),
  chevronShift: (px: string) => ({
    translate: { default: `${px} 0`, [stylex.when.ancestor(':active')]: '0 0' },
  }),
});

export const flip = stylex.create({
  // Pressed previews the expanded chevron (kit "Trailing state=Pressed").
  live: { rotate: { default: '0deg', [stylex.when.ancestor(':active')]: '180deg' } },
});

export const centred = stylex.create({
  chevron: { translate: '0 0' },
  path: { rotate: '180deg' },
});

const variants = stylex.create({
  filled: { backgroundColor: color.primary, color: color.onPrimary },
  tonal: { backgroundColor: color.secondaryContainer, color: color.onSecondaryContainer },
  outlined: { backgroundColor: 'transparent', color: color.onSurfaceVariant },
  elevated: { backgroundColor: color.surfaceContainerLow, color: color.primary },
});

const disabledOutlined = stylex.create({
  // Kit: outlined keeps no fill; its stroke turns on-surface 10%.
  container: {
    backgroundColor: 'transparent',
    color: color.onSurface,
    '::after': { borderColor: `color-mix(in srgb, ${color.onSurface} 10%, transparent)` },
  },
});

/** Each part's shadow caster: as tall as the container, centred in the 48px touch row. */
export const shadowInset = (size: ButtonSize) => Math.max(0, (TOUCH_TARGET - HEIGHT[size]) / 2);

export function containerStyles(variant: SplitButtonVariant, disabled: boolean) {
  return [
    // Inner-corner / checked morph on DefaultEffects (Compose SplitButtonDefaults Leading / TrailingButton).
    containerMotion.effects,
    variants[variant],
    variant === 'outlined' && buttonBase.stroke,
    variant === 'outlined' && splitStyles.stroke,
    disabled && (variant === 'outlined' ? disabledOutlined.container : buttonDisabled.container),
  ];
}
