import * as stylex from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex.ts';
import { motion } from '../../tokens/motion.stylex.ts';
import { textFieldMarker, textFieldVars } from './textField.stylex.ts';

/*
 * Text field styles (Figma kit "Text fields", set 52798:24373 — see TextField.tsx for the spec).
 * Motion (Compose TextFieldImpl / TextFieldDefaults): stroke width on FastSpatial; indicator,
 * outline, label and container colours on FastEffects (indicator and outline snap when disabled);
 * placeholder fades on Fast / SlowEffects. The label float is a spring (useLabelFloat).
 */
const effects = { transitionDuration: motion.fastEffectsDuration, transitionTimingFunction: motion.fastEffectsEasing };
/** Three transitioned properties: two spatial (FastSpatial) and one colour (FastEffects), in this order. */
const spatialSpatialEffects = {
  transitionDuration: `${motion.fastSpatialDuration}, ${motion.fastSpatialDuration}, ${motion.fastEffectsDuration}`,
  transitionTimingFunction: `${motion.fastSpatialEasing}, ${motion.fastSpatialEasing}, ${motion.fastEffectsEasing}`,
};
const mix = (c: string, pct: number) => `color-mix(in srgb, ${c} ${pct}%, transparent)`;

export const s = stylex.create({
  root: {
    display: 'inline-flex',
    flexDirection: 'column',
    width: 210,
    flexShrink: 0,
    boxSizing: 'border-box',
    textAlign: 'start',
  },
  container: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    columnGap: 4,
    boxSizing: 'border-box',
    height: 56,
    flexShrink: 0,
    cursor: 'text',
    isolation: 'isolate',
  },
  padStart: { paddingInlineStart: 16 },
  padStartIcon: { paddingInlineStart: 0 },
  padEnd: { paddingInlineEnd: 16 },
  padEndIcon: { paddingInlineEnd: 0 },
  // Compose TextFieldDefaults.Container: the container colour animates on FastEffects (enable ⇄ disable).
  filled: {
    backgroundColor: color.surfaceContainerHighest,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    transitionProperty: 'background-color',
    ...effects,
  },
  filledDisabled: { backgroundColor: mix(color.onSurface, 4) },
  outlined: { borderRadius: 4 },
  stateLayer: {
    position: 'absolute',
    inset: 0,
    borderRadius: 'inherit',
    pointerEvents: 'none',
    zIndex: -1,
    backgroundColor: color.onSurface,
    opacity: { default: 0, [stylex.when.ancestor(':hover', textFieldMarker)]: 0.08 },
    transitionProperty: 'opacity',
    ...effects,
  },
  stateLayerHover: { opacity: 0.08 },
  dim: { opacity: 0.38 },
  icon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
    flexShrink: 0,
    color: color.onSurfaceVariant,
  },
  iconError: { color: color.error },
  content: { position: 'relative', flexGrow: 1, minWidth: 0, alignSelf: 'stretch' },
  input: {
    position: 'absolute',
    insetInline: 0,
    boxSizing: 'border-box',
    width: '100%',
    height: 24,
    margin: 0,
    padding: 0,
    borderWidth: 0,
    borderStyle: 'none',
    outlineStyle: 'none',
    backgroundColor: 'transparent',
    color: color.onSurface,
    caretColor: color.primary,
    textOverflow: 'ellipsis',
    '::placeholder': {
      color: color.onSurfaceVariant,
      opacity: 1,
      transitionProperty: 'opacity',
      transitionDuration: motion.fastEffectsDuration,
      transitionTimingFunction: motion.fastEffectsEasing,
    },
  },
  inputHidePlaceholder: { '::placeholder': { opacity: 0 } },
  // Compose `placeholderOpacity`: SlowEffects for UnfocusedEmpty → Focused and
  // UnfocusedNotEmpty → UnfocusedEmpty, FastEffects otherwise.
  placeholderSlow: {
    '::placeholder': {
      transitionDuration: motion.slowEffectsDuration,
      transitionTimingFunction: motion.slowEffectsEasing,
    },
  },
  inputError: { caretColor: color.error },
  inputDisabled: { color: mix(color.onSurface, 38), '::placeholder': { color: mix(color.onSurface, 38) } },
  cDisabled: { color: mix(color.onSurface, 38) },
  inputFilledLabel: { top: 24 },
  inputCentered: { top: 16 },
  label: {
    position: 'absolute',
    left: 0,
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    transformOrigin: 'left center',
    // The float itself is a spring driven per frame (see `useLabelFloat`); colours fade in CSS.
    transitionProperty: 'color',
    ...effects,
  },
  labelRest: { top: 16 },
  labelFloatFilled: { top: 8 },
  // The floating outlined label carries the notch fill (transparent by default; the outline itself
  // is cut by the fieldset legend). 4px padding = the kit's notch frame (label + 4px each side).
  labelFloatOutlined: (dx: number) => ({
    top: -8,
    left: dx - 4,
    paddingInline: 4,
    backgroundColor: textFieldVars.notchColor,
  }),
  cOnSurfaceVariant: { color: color.onSurfaceVariant },
  cIdleOutlined: {
    color: { default: color.onSurfaceVariant, [stylex.when.ancestor(':hover', textFieldMarker)]: color.onSurface },
  },
  cOnSurface: { color: color.onSurface },
  cPrimary: { color: color.primary },
  cError: { color: color.error },
  indicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    pointerEvents: 'none',
    // Compose IndicatorLineNode: width on FastSpatial, colour on FastEffects.
    transitionProperty: 'top, height, background-color',
    ...spatialSpatialEffects,
  },
  indicatorW: (w: number) => ({ top: 56 - w, height: w }),
  bgOnSurfaceVariant: { backgroundColor: color.onSurfaceVariant },
  bgIdle: {
    backgroundColor: {
      default: color.onSurfaceVariant,
      [stylex.when.ancestor(':hover', textFieldMarker)]: color.onSurface,
    },
  },
  bgOnSurface: { backgroundColor: color.onSurface },
  bgPrimary: { backgroundColor: color.primary },
  bgError: { backgroundColor: color.error },
  // Disabled: Compose snaps the indicator (`snap()` while disabled).
  bgOnSurfaceDim: { backgroundColor: color.onSurface, opacity: 0.38, transitionDuration: '0s' },
  // Outlined stroke: a fieldset whose legend cuts the notch for the floating label.
  outline: {
    position: 'absolute',
    inset: 0,
    margin: 0,
    paddingBlock: 0,
    paddingInlineEnd: 0,
    minWidth: 0,
    boxSizing: 'border-box',
    borderStyle: 'solid',
    borderRadius: 4,
    pointerEvents: 'none',
    // Compose animateBorderStrokeAsState: thickness on FastSpatial, colour on FastEffects.
    transitionProperty: 'border-width, padding-inline-start, border-color',
    ...spatialSpatialEffects,
  },
  outlineW: (w: number, notchX: number) => ({ borderWidth: w, paddingInlineStart: notchX - w }),
  outlineCentered: {
    inset: 'auto',
    top: 0,
    left: 0,
    width: 'calc(100% + 1px)',
    height: 'calc(100% + 1px)',
    transform: 'translate(-0.5px, -0.5px)',
  },
  bOutline: { borderColor: color.outline },
  bIdle: {
    borderColor: { default: color.outline, [stylex.when.ancestor(':hover', textFieldMarker)]: color.onSurface },
  },
  bOnSurface: { borderColor: color.onSurface },
  bPrimary: { borderColor: color.primary },
  bError: { borderColor: color.error },
  // Disabled: Compose doesn't animate the stroke (rememberUpdatedState while disabled).
  bDisabledInner: { borderColor: mix(color.onSurface, 4), transitionDuration: '0s' },
  bDisabledCenter: { borderColor: mix(color.onSurface, 10), transitionDuration: '0s' },
  legend: {
    float: 'none',
    boxSizing: 'border-box',
    padding: 0,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    lineHeight: 0,
    maxWidth: 0.01,
    visibility: 'visible',
    color: 'transparent',
  },
  legendOpen: { maxWidth: '100%', paddingInline: 4 },
  legendH: (w: number) => ({ height: w }),
  caret: { position: 'absolute', width: 1, height: 17, pointerEvents: 'none' },
  caretMirror: { visibility: 'hidden', whiteSpace: 'pre' },
  // Compose doesn't animate the supporting-text colour (error on / off switches at once).
  supporting: { flexShrink: 0, margin: 0, paddingTop: 4, paddingInline: 16, color: color.onSurfaceVariant },
});
