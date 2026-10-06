import { forwardRef, useState } from 'react';
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
 */
const CHECK = 'M10 16.4L6 12.4L7.4 11L10 13.6L16.6 7L18 8.4L10 16.4Z';
const DASH = 'M6 13V11H18V13H6Z';

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
    transitionDuration: motion.fastEffectsDuration,
    transitionTimingFunction: motion.fastEffectsEasing,
  },
  glyph: {
    position: 'absolute',
    left: 8,
    top: 8,
    width: 24,
    height: 24,
    pointerEvents: 'none',
    // Draw-on: wipe left → right on the fast spatial spring (Compose draws the check progressively).
    clipPath: 'inset(0 0 0 0)',
    transitionProperty: 'clip-path, fill',
    transitionDuration: `${motion.fastSpatialDuration}, ${motion.fastEffectsDuration}`,
    transitionTimingFunction: `${motion.fastSpatialEasing}, ${motion.fastEffectsEasing}`,
  },
  glyphHidden: { clipPath: 'inset(0 100% 0 0)' },
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
        <span data-part="box" {...stylex.props(s.box, boxStyle, !on && !disabled && !error && interactingForced && outline.normalInteracting)} />
        <svg
          viewBox="0 0 24 24"
          aria-hidden
          {...stylex.props(s.glyph, disabled ? glyphFill.disabled : error ? glyphFill.error : glyphFill.normal, !on && s.glyphHidden)}
        >
          <path d={indeterminate ? DASH : CHECK} />
        </svg>
        {/* Kit: the ripple is the top layer of the state layer, over the box and glyph. */}
        <Ripple disabled={disabled} above />
      </span>
    </BaseCheckbox.Root>
  );
});
