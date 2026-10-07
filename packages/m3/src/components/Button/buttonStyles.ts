import * as stylex from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex';
import { elevation } from '../../tokens/elevation.stylex';
import { motion } from '../../tokens/motion.stylex';
import { state } from '../../tokens/state.stylex';
import { tween } from '../../primitives/tweens.stylex';
import { typescale } from '../../tokens/typescale.ts';

export type ButtonSize = 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge';
export type ButtonShape = 'round' | 'square';

/*
 * Geometry from the Figma kit (Buttons page, sets Button / Button - tonal /
 * - outline / - elevated / - text). Container height = padding + label line
 * height, exactly as the kit's hug layout. "Round" radius is half the height
 * (renders like the kit's 100, but morphs from the real corner on press).
 */
export const base = stylex.create({
  root: {
    // <button> reset; the root is the full touch target.
    appearance: 'none',
    borderWidth: 0,
    margin: 0,
    padding: 0,
    // Longhands: StyleX doesn't reliably apply the shorthands over the UA button styles.
    backgroundColor: 'transparent',
    backgroundImage: 'none',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    lineHeight: 'inherit',
    letterSpacing: 'inherit',
    color: 'inherit',
    textAlign: 'inherit',
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
  container: {
    position: 'relative',
    isolation: 'isolate',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
    // Focus indicator: 3px secondary ring, 2px outside (the kit's hidden "Focus indicator" layer).
    outlineStyle: { default: 'none', [stylex.when.ancestor(':focus-visible')]: 'solid' },
    outlineColor: color.secondary,
    outlineWidth: state.focusIndicatorThickness,
    outlineOffset: state.focusIndicatorOuterOffset,
  },
  ringForced: { outlineStyle: 'solid' },
  content: {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    display: 'inline-flex',
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { color: 'inherit' },
  // Inside stroke (Figma strokeAlign INSIDE): drawn above the state layer, no layout impact.
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

/*
 * Container motion (Compose material3, androidx-main):
 *   - Button, SplitButton (and IconButton, see IconButtonFrame): the press / checked shape morph
 *     runs on MotionSchemeKeyTokens.DefaultEffects — "intentional here to prevent any bounce"
 *     (Button.kt `Button`, SplitButton.kt `LeadingButton` / `TrailingButton`).
 *   - ToggleButton and the connected group segments (ToggleButtons with connected shapes):
 *     FastSpatial (ToggleButton.kt `ToggleButton`).
 *   - A shadow that changes with the interaction follows Compose `animateElevation`
 *     (internal/Elevation.kt): 120 ms FastOutSlowIn into hover / focus / press, the out tween
 *     back to rest. The "in" tween sits on the state conditions (a CSS transition takes the
 *     destination style's timing). Disabled snaps: use the radius-only variant there.
 * stylex.when must stay inline, hence the repetition.
 */
export const containerMotion = stylex.create({
  effects: {
    transitionProperty: 'border-radius',
    transitionDuration: motion.defaultEffectsDuration,
    transitionTimingFunction: motion.defaultEffectsEasing,
  },
  spatial: {
    transitionProperty: 'border-radius',
    transitionDuration: motion.fastSpatialDuration,
    transitionTimingFunction: motion.fastSpatialEasing,
  },
  effectsElevated: {
    transitionProperty: 'border-radius, box-shadow',
    transitionDuration: {
      default: `${motion.defaultEffectsDuration}, ${tween.elevationOutDuration}`,
      [stylex.when.ancestor(':hover')]: { default: null, '@media (hover: hover)': `${motion.defaultEffectsDuration}, ${tween.elevationInDuration}` },
      [stylex.when.ancestor(':focus-visible')]: {
        default: `${motion.defaultEffectsDuration}, ${tween.elevationInDuration}`,
        '@media (hover: hover)': `${motion.defaultEffectsDuration}, ${tween.elevationInDuration}`,
      },
      [stylex.when.ancestor(':active')]: {
        default: `${motion.defaultEffectsDuration}, ${tween.elevationInDuration}`,
        '@media (hover: hover)': `${motion.defaultEffectsDuration}, ${tween.elevationInDuration}`,
      },
    },
    transitionTimingFunction: {
      default: `${motion.defaultEffectsEasing}, ${tween.elevationOutEasing}`,
      [stylex.when.ancestor(':hover')]: { default: null, '@media (hover: hover)': `${motion.defaultEffectsEasing}, ${tween.elevationInEasing}` },
      [stylex.when.ancestor(':focus-visible')]: {
        default: `${motion.defaultEffectsEasing}, ${tween.elevationInEasing}`,
        '@media (hover: hover)': `${motion.defaultEffectsEasing}, ${tween.elevationInEasing}`,
      },
      [stylex.when.ancestor(':active')]: {
        default: `${motion.defaultEffectsEasing}, ${tween.elevationInEasing}`,
        '@media (hover: hover)': `${motion.defaultEffectsEasing}, ${tween.elevationInEasing}`,
      },
    },
  },
  spatialElevated: {
    transitionProperty: 'border-radius, box-shadow',
    transitionDuration: {
      default: `${motion.fastSpatialDuration}, ${tween.elevationOutDuration}`,
      [stylex.when.ancestor(':hover')]: { default: null, '@media (hover: hover)': `${motion.fastSpatialDuration}, ${tween.elevationInDuration}` },
      [stylex.when.ancestor(':focus-visible')]: {
        default: `${motion.fastSpatialDuration}, ${tween.elevationInDuration}`,
        '@media (hover: hover)': `${motion.fastSpatialDuration}, ${tween.elevationInDuration}`,
      },
      [stylex.when.ancestor(':active')]: {
        default: `${motion.fastSpatialDuration}, ${tween.elevationInDuration}`,
        '@media (hover: hover)': `${motion.fastSpatialDuration}, ${tween.elevationInDuration}`,
      },
    },
    transitionTimingFunction: {
      default: `${motion.fastSpatialEasing}, ${tween.elevationOutEasing}`,
      [stylex.when.ancestor(':hover')]: { default: null, '@media (hover: hover)': `${motion.fastSpatialEasing}, ${tween.elevationInEasing}` },
      [stylex.when.ancestor(':focus-visible')]: {
        default: `${motion.fastSpatialEasing}, ${tween.elevationInEasing}`,
        '@media (hover: hover)': `${motion.fastSpatialEasing}, ${tween.elevationInEasing}`,
      },
      [stylex.when.ancestor(':active')]: {
        default: `${motion.fastSpatialEasing}, ${tween.elevationInEasing}`,
        '@media (hover: hover)': `${motion.fastSpatialEasing}, ${tween.elevationInEasing}`,
      },
    },
  },
});

export const sizes = stylex.create({
  xsmall: { height: 48 },
  small: { height: 48 },
  medium: {},
  large: {},
  xlarge: {},
});

/** Inline (start = end) padding per size, as in `containerSizes`. */
export const PAD_INLINE: Record<ButtonSize, number> = { xsmall: 12, small: 16, medium: 24, large: 48, xlarge: 64 };

export const containerSizes = stylex.create({
  xsmall: { paddingBlock: 6, paddingInline: 12 },
  small: { paddingBlock: 10, paddingInline: 16 },
  medium: { paddingBlock: 16, paddingInline: 24 },
  large: { paddingBlock: 32, paddingInline: 48 },
  xlarge: { paddingBlock: 48, paddingInline: 64 },
});

// Icon ↔ label gap (the kit's State-layer itemSpacing).
export const gaps = stylex.create({
  xsmall: { columnGap: 4 },
  small: { columnGap: 8 },
  medium: { columnGap: 8 },
  large: { columnGap: 12 },
  xlarge: { columnGap: 16 },
});

export const iconSizes = stylex.create({
  xsmall: { width: 20, height: 20 },
  small: { width: 20, height: 20 },
  medium: { width: 24, height: 24 },
  large: { width: 32, height: 32 },
  xlarge: { width: 40, height: 40 },
});

export const labelRole = {
  xsmall: typescale.labelLarge,
  small: typescale.labelLarge,
  medium: typescale.titleMedium,
  large: typescale.headlineSmall,
  xlarge: typescale.headlineLarge,
} as const;

// Corner radii: [round, square, pressed]. Pressed is the same for both shapes.
export const radii = stylex.create({
  xsmallRound: { borderRadius: { default: '16px', [stylex.when.ancestor(':active')]: '8px' } },
  xsmallSquare: { borderRadius: { default: '12px', [stylex.when.ancestor(':active')]: '8px' } },
  smallRound: { borderRadius: { default: '20px', [stylex.when.ancestor(':active')]: '8px' } },
  smallSquare: { borderRadius: { default: '12px', [stylex.when.ancestor(':active')]: '8px' } },
  mediumRound: { borderRadius: { default: '28px', [stylex.when.ancestor(':active')]: '12px' } },
  mediumSquare: { borderRadius: { default: '16px', [stylex.when.ancestor(':active')]: '12px' } },
  largeRound: { borderRadius: { default: '48px', [stylex.when.ancestor(':active')]: '16px' } },
  largeSquare: { borderRadius: { default: '28px', [stylex.when.ancestor(':active')]: '16px' } },
  xlargeRound: { borderRadius: { default: '68px', [stylex.when.ancestor(':active')]: '16px' } },
  xlargeSquare: { borderRadius: { default: '28px', [stylex.when.ancestor(':active')]: '16px' } },
  xsmallPressed: { borderRadius: '8px' },
  smallPressed: { borderRadius: '8px' },
  mediumPressed: { borderRadius: '12px' },
  largePressed: { borderRadius: '16px' },
  xlargePressed: { borderRadius: '16px' },
});

export const strokeWidths = stylex.create({
  xsmall: { '::after': { borderWidth: 1 } },
  small: { '::after': { borderWidth: 1 } },
  medium: { '::after': { borderWidth: 1 } },
  large: { '::after': { borderWidth: 2 } },
  xlarge: { '::after': { borderWidth: 2 } },
});


// The kit raises elevated buttons with size (level 1 at XS/S, 2 at M, 3 at L/XL).
// XL at rest: the kit puts the fill on an inner layer, so Figma drops the shadow spread (a frame
// without its own fill casts spread-less shadows); its hover/focus/pressed variants keep spread.
export const elevatedShadow = stylex.create({
  xsmall: { boxShadow: elevation.level1 },
  small: { boxShadow: elevation.level1 },
  medium: { boxShadow: elevation.level2 },
  large: { boxShadow: elevation.level3 },
  xlarge: {
    boxShadow: {
      default: elevation.level3NoSpread,
      [stylex.when.ancestor(':hover')]: { default: null, '@media (hover: hover)': elevation.level3 },
      [stylex.when.ancestor(':focus-visible')]: { default: elevation.level3, '@media (hover: hover)': elevation.level3 },
      [stylex.when.ancestor(':active')]: { default: elevation.level3, '@media (hover: hover)': elevation.level3 },
    },
  },
  xlargeInteracting: { boxShadow: elevation.level3 },
});

export const disabled = stylex.create({
  // Kit: container md.sys.color.on-surface @ 10% for every variant (incl. text/outlined).
  container: {
    backgroundColor: `color-mix(in srgb, ${color.onSurface} 10%, transparent)`,
    color: color.onSurface,
    boxShadow: 'none',
  },
  content: { opacity: state.disabledContentOpacity },
});
