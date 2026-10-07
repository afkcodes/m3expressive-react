import { forwardRef, useEffect, useRef, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox';
import { color } from '../../tokens/color.stylex';
import { motion } from '../../tokens/motion.stylex';
import { state } from '../../tokens/state.stylex';
import { interaction } from '../../primitives/state.stylex';
import { StateLayer, stateLayerHost } from '../../primitives/StateLayer.tsx';
import { Ripple } from '../../primitives/Ripple.tsx';
import { useForcedState } from '../../testing/ForceState.tsx';

/*
 * Figma kit, Checkboxes page (set "Checkboxes", 6 types × 5 states):
 *   48px target → 40px circular state layer → 18px box, 2px corners.
 *   Unselected: 2px inside stroke, on-surface-variant (on-surface when hovered/focused/pressed).
 *   Selected / indeterminate: primary fill, on-primary glyph (24px grid: check_small / dash).
 *   Error: error stroke / fill, on-error glyph.  Disabled: whole control at 38%, on-surface box,
 *   surface glyph.  State layer: type colour at 8 / 10 / 10 %.  Pressed: the ripple uses the
 *   *opposite* role (primary when unselected, on-surface when selected) at 20%.
 *
 * Motion — Compose material3 Checkbox.kt (CheckboxImpl, colorAnimationSpecForState):
 *   box + border colour: DefaultEffects into checked / indeterminate, FastEffects back to
 *   unchecked; snaps while disabled (and when `disabled` itself changes).
 *   Check draw (checkDrawFraction): DefaultSpatial from unchecked; to unchecked it snaps after
 *   100ms (SnapAnimationDelay) while the checkmark colour fades to transparent (FastEffects).
 *   The kit check's strokes run at 45°, so a left → right clip over the glyph's x extent
 *   (6 → 18) reveals it in proportion to path length, like Compose's PathMeasure segment.
 *   Check ⇄ indeterminate (checkCenterGravitationShiftFraction): the outline morphs on
 *   DefaultSpatial; it snaps when coming from unchecked, and after 100ms when going there.
 */
const CHECK = 'M10 16.4L6 12.4L7.4 11L10 13.6L16.6 7L18 8.4L10 16.4Z';
// The kit's dash (M6 13V11H18V13H6Z) rewritten as the check's 6-point outline: the same filled
// rectangle (collinear points at x 12), so CSS can interpolate `d` between the two glyphs.
// Point for point: elbow → centre, arm ends → the dash's ends (Compose gravitates the check's
// cross point to the centre and both arm ends to its height).
const DASH = 'M12 13L6 13L6 11L12 11L18 11L18 13L12 13Z';
type Visual = 'off' | 'on' | 'indeterminate';

const s = stylex.create({
  root: {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    width: 48,
    height: 48,
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
    outline: 'none',
    verticalAlign: 'middle',
  },
  disabled: { opacity: state.disabledContentOpacity, cursor: 'default' },
  circle: {
    position: 'relative',
    isolation: 'isolate',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: '50%',
    // Focus indicator: 3px secondary ring 2px outside the 40px circle (kit "Focus indicator" 44px r100).
    outlineStyle: { default: 'none', [stylex.when.ancestor(':focus-visible')]: 'solid' },
    outlineColor: color.secondary,
    outlineWidth: state.focusIndicatorThickness,
    outlineOffset: state.focusIndicatorOuterOffset,
  },
  ringForced: { outlineStyle: 'solid' },
  box: {
    position: 'relative',
    boxSizing: 'border-box',
    width: 18,
    height: 18,
    borderRadius: 2,
    borderWidth: 2,
    borderStyle: 'solid',
    transitionProperty: 'background-color, border-color',
  },
  // Colour specs (the destination style carries the transition).
  boxIn: { transitionDuration: motion.defaultEffectsDuration, transitionTimingFunction: motion.defaultEffectsEasing },
  boxOut: { transitionDuration: motion.fastEffectsDuration, transitionTimingFunction: motion.fastEffectsEasing },
  snap: { transitionDuration: '0s' },
  glyph: {
    position: 'absolute',
    left: 8,
    top: 8,
    width: 24,
    height: 24,
    pointerEvents: 'none',
    transitionProperty: 'clip-path, fill',
  },
  // Drawn: the clip spans the glyph's x extent exactly (6 → 18 in the 24 grid).
  glyphOn: {
    clipPath: 'inset(0 6px 0 6px)',
    transitionDuration: `${motion.defaultSpatialDuration}, ${motion.defaultEffectsDuration}`,
    transitionTimingFunction: `${motion.defaultSpatialEasing}, ${motion.defaultEffectsEasing}`,
    transitionDelay: '0s',
  },
  // Undrawn: zero width at the glyph's left edge; reached by a snap 100ms after the change while
  // the colour fades out.
  glyphOff: {
    clipPath: 'inset(0 18px 0 6px)',
    transitionDuration: `0s, ${motion.fastEffectsDuration}`,
    transitionTimingFunction: `linear, ${motion.fastEffectsEasing}`,
    transitionDelay: '100ms, 0s',
  },
  glyphColourSnap: { transitionDuration: `${motion.defaultSpatialDuration}, 0s` },
  glyphOffColourSnap: { transitionDuration: '0s, 0s' },
  path: { transitionProperty: 'd' },
  pathCheck: { d: `path("${CHECK}")` },
  pathDash: { d: `path("${DASH}")` },
  pathMorph: { transitionDuration: motion.defaultSpatialDuration, transitionTimingFunction: motion.defaultSpatialEasing, transitionDelay: '0s' },
  pathSnap: { transitionDuration: '0s', transitionDelay: '0s' },
  pathSnapLate: { transitionDuration: '0s', transitionDelay: '100ms' },
});

// Unselected box outline; hover/focus/press darken it to on-surface (kit).
const outline = stylex.create({
  normal: {
    backgroundColor: 'transparent',
    borderColor: {
      default: color.onSurfaceVariant,
      [stylex.when.ancestor(':hover')]: { default: null, '@media (hover: hover)': color.onSurface },
      [stylex.when.ancestor(':focus-visible')]: { default: color.onSurface, '@media (hover: hover)': color.onSurface },
      [stylex.when.ancestor(':active')]: { default: color.onSurface, '@media (hover: hover)': color.onSurface },
    },
  },
  normalInteracting: { borderColor: color.onSurface },
  error: { backgroundColor: 'transparent', borderColor: color.error },
  disabled: { backgroundColor: 'transparent', borderColor: color.onSurface },
});

const filled = stylex.create({
  normal: { backgroundColor: color.primary, borderColor: color.primary },
  error: { backgroundColor: color.error, borderColor: color.error },
  disabled: { backgroundColor: color.onSurface, borderColor: color.onSurface },
});

const roles = stylex.create({
  unselected: { [interaction.layerColor]: color.onSurface, [interaction.rippleColor]: color.primary },
  selected: { [interaction.layerColor]: color.primary, [interaction.rippleColor]: color.onSurface },
  error: { [interaction.layerColor]: color.error, [interaction.rippleColor]: color.error },
  ripple20: { [interaction.rippleOpacity]: '0.2' },
});

const glyphFill = stylex.create({
  normal: { fill: color.onPrimary },
  error: { fill: color.onError },
  disabled: { fill: color.surface },
  // Compose: the unchecked checkmark colour is transparent (disabled keeps one colour throughout).
  off: { fill: 'transparent' },
});

export interface CheckboxProps
  extends Omit<BaseCheckbox.Root.Props, 'className' | 'style' | 'render' | 'children'> {
  /** Error styling (also sets aria-invalid). */
  error?: boolean;
  sx?: StyleXStyles;
}

export const Checkbox = forwardRef<HTMLElement, CheckboxProps>(function Checkbox(
  { checked: checkedProp, defaultChecked = false, onCheckedChange, indeterminate = false, disabled = false, error = false, sx, ...rest },
  ref,
) {
  const [inner, setInner] = useState(defaultChecked);
  const checked = checkedProp ?? inner;
  const forced = useForcedState();
  const on = checked || indeterminate;
  const interactingForced = forced.state === 'hovered' || forced.state === 'focused' || forced.state === 'pressed';
  const visual: Visual = indeterminate ? 'indeterminate' : checked ? 'on' : 'off';
  // Compose picks some specs by the state the transition starts from: remember the last one.
  const prev = useRef({ visual, disabled });
  const from = prev.current;
  useEffect(() => {
    prev.current = { visual, disabled };
  });
  // Compose snaps colours while disabled and across an enabled ⇄ disabled change.
  const colourSnap = disabled || from.disabled !== disabled;
  const pathSpec = visual === 'off' ? s.pathSnapLate : from.visual === 'off' ? s.pathSnap : s.pathMorph;

  const boxStyle = disabled
    ? on ? filled.disabled : outline.disabled
    : on ? (error ? filled.error : filled.normal) : error ? outline.error : outline.normal;

  return (
    <BaseCheckbox.Root
      ref={ref}
      checked={checked}
      indeterminate={indeterminate}
      disabled={disabled}
      aria-invalid={error || undefined}
      onCheckedChange={(next, details) => {
        if (checkedProp === undefined) setInner(next);
        onCheckedChange?.(next, details);
      }}
      data-ripple-host=""
      {...rest}
      {...stylex.props(
        s.root,
        stylex.defaultMarker(),
        stateLayerHost.hostPressLayer,
        disabled && stateLayerHost.disabled,
        forced.state === 'hovered' && stateLayerHost.forceHover,
        forced.state === 'focused' && stateLayerHost.forceFocus,
        forced.state === 'pressed' && stateLayerHost.forcePressed,
        error ? roles.error : on ? roles.selected : roles.unselected,
        roles.ripple20,
        disabled && s.disabled,
        sx,
      )}
    >
      <span {...stylex.props(s.circle, forced.focusRing && s.ringForced)}>
        <StateLayer />
        <span
          data-part="box"
          {...stylex.props(s.box, boxStyle, !on && !disabled && !error && interactingForced && outline.normalInteracting, colourSnap ? s.snap : on ? s.boxIn : s.boxOut)}
        />
        <svg
          viewBox="0 0 24 24"
          aria-hidden
          {...stylex.props(
            s.glyph,
            disabled ? glyphFill.disabled : error ? glyphFill.error : glyphFill.normal,
            on ? s.glyphOn : s.glyphOff,
            !on && !disabled && glyphFill.off,
            colourSnap && (on ? s.glyphColourSnap : s.glyphOffColourSnap),
          )}
        >
          {/* The attribute keeps engines without CSS `d` (Safari) right; CSS `d` makes it morph. */}
          <path d={indeterminate ? DASH : CHECK} {...stylex.props(s.path, indeterminate ? s.pathDash : s.pathCheck, pathSpec)} />
        </svg>
        {/* Kit: the ripple is the top layer of the state layer, over the box and glyph. */}
        <Ripple disabled={disabled} above />
      </span>
    </BaseCheckbox.Root>
  );
});
