import { forwardRef } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { Switch as BaseSwitch } from '@base-ui/react/switch';
import { color } from '../../tokens/color.stylex.ts';
import { motion } from '../../tokens/motion.stylex.ts';
import { state } from '../../tokens/state.stylex.ts';
import { interaction } from '../../primitives/state.stylex.ts';
import { StateLayer, forcedStateLayer, isInteractionState, stateLayerHost } from '../../primitives/StateLayer.tsx';
import { focusRing } from '../../primitives/focusRing.ts';
import { ICON_PATHS, SvgIcon } from '../../primitives/SvgIcon.tsx';
import { useControllableState } from '../../hooks/useControllableState.ts';
import { useForcedState } from '../../testing/ForceState.tsx';

/*
 * Figma kit, "Switch" page, set "Switch" (selected × icon × 5 states).
 *   Track 52×32, fully round. On: primary. Off: surface-container-highest + 2px outline stroke.
 *   Handle (centre x 36 on / 16 off): on 24px on-primary (hover/focus/press primary-container);
 *   off 16px outline (24px with an icon; hover/focus/press on-surface-variant); pressed 28px.
 *   A 40px state layer (primary on / on-surface off) circles the handle; press = flat 10% layer.
 *   Icons 16px: check (on-primary-container) / close (surface-container-highest).
 *   Disabled on: track on-surface 10%, handle surface, icon on-surface 38%.
 *   Disabled off: track surface-variant 10% + on-surface 10% stroke, handle on-surface (whole handle
 *   incl. icon at 38%).
 *
 * Motion — Compose material3 Switch.kt (ThumbNode, SwitchImpl):
 *   handle size and offset spring on FastSpatial, except while pressed: the press into the 28px
 *   handle is a snap (SnapSpec); the release springs back. Track, outline, handle and icon colours
 *   are not animated in Compose — they change with the state.
 */
const CHECK = 'M9.55 18L3.85 12.3L5.275 10.875L9.55 15.15L18.725 5.975L20.15 7.4L9.55 18Z';
/** Icon size inside the handle. */
const ICON_SIZE = 16;

const s = stylex.create({
  root: {
    position: 'relative',
    display: 'inline-flex',
    flexShrink: 0,
    boxSizing: 'border-box',
    width: 52,
    height: 32,
    borderRadius: 16,
    padding: 0,
    margin: 0,
    borderWidth: 0,
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
    verticalAlign: 'middle',
  },
  disabled: { cursor: 'default' },
  on: { backgroundColor: color.primary, [interaction.layerColor]: color.primary },
  off: {
    backgroundColor: color.surfaceContainerHighest,
    [interaction.layerColor]: color.onSurface,
    '::after': {
      content: '""',
      position: 'absolute',
      inset: 0,
      borderRadius: 'inherit',
      borderWidth: 2,
      borderStyle: 'solid',
      borderColor: color.outline,
      pointerEvents: 'none',
    },
  },
  onDisabled: { backgroundColor: `color-mix(in srgb, ${color.onSurface} 10%, transparent)` },
  offDisabled: {
    backgroundColor: `color-mix(in srgb, ${color.surfaceVariant} 10%, transparent)`,
    '::after': { borderColor: `color-mix(in srgb, ${color.onSurface} 10%, transparent)` },
  },
  // 40px state-layer circle; the handle is centred in it. Slides 20px between off and on.
  thumb: {
    position: 'absolute',
    insetInlineStart: -4,
    top: -4,
    width: 40,
    height: 40,
    borderRadius: '50%',
    isolation: 'isolate',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    transitionProperty: 'translate',
    // Compose: SnapSpec while pressed, FastSpatial otherwise (the destination style's spec).
    transitionDuration: { default: motion.fastSpatialDuration, [stylex.when.ancestor(':active')]: '0s' },
    transitionTimingFunction: motion.fastSpatialEasing,
  },
  thumbOn: { translate: '20px 0' },
  handle: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    transitionProperty: 'width, height',
    // Pressing snaps into the 28px handle (Compose SnapSpec); releasing springs back.
    transitionDuration: { default: motion.fastSpatialDuration, [stylex.when.ancestor(':active')]: '0s' },
    transitionTimingFunction: motion.fastSpatialEasing,
  },
  // Kit: the off+disabled icon has its own 38% inside the 38% handle.
  iconOffDisabled: { opacity: state.disabledContentOpacity },
});

const dyn = stylex.create({
  size: (rest: number) => ({
    width: { default: rest, [stylex.when.ancestor(':active')]: 28 },
    height: { default: rest, [stylex.when.ancestor(':active')]: 28 },
  }),
  fixed: (px: number) => ({ width: px, height: px }),
});

const handle = stylex.create({
  on: {
    backgroundColor: {
      default: color.onPrimary,
      [stylex.when.ancestor(':hover')]: { default: null, '@media (hover: hover)': color.primaryContainer },
      [stylex.when.ancestor(':focus-visible')]: {
        default: color.primaryContainer,
        '@media (hover: hover)': color.primaryContainer,
      },
      [stylex.when.ancestor(':active')]: {
        default: color.primaryContainer,
        '@media (hover: hover)': color.primaryContainer,
      },
    },
    color: color.onPrimaryContainer,
  },
  onInteracting: { backgroundColor: color.primaryContainer },
  off: {
    backgroundColor: {
      default: color.outline,
      [stylex.when.ancestor(':hover')]: { default: null, '@media (hover: hover)': color.onSurfaceVariant },
      [stylex.when.ancestor(':focus-visible')]: {
        default: color.onSurfaceVariant,
        '@media (hover: hover)': color.onSurfaceVariant,
      },
      [stylex.when.ancestor(':active')]: {
        default: color.onSurfaceVariant,
        '@media (hover: hover)': color.onSurfaceVariant,
      },
    },
    color: color.surfaceContainerHighest,
  },
  offInteracting: { backgroundColor: color.onSurfaceVariant },
  onDisabled: { backgroundColor: color.surface, color: `color-mix(in srgb, ${color.onSurface} 38%, transparent)` },
  // Kit: the whole handle (icon included) at 38%.
  offDisabled: {
    backgroundColor: color.onSurface,
    color: color.surfaceContainerHighest,
    opacity: state.disabledContentOpacity,
  },
});

export interface SwitchProps extends Omit<BaseSwitch.Root.Props, 'className' | 'style' | 'render' | 'children'> {
  /** Show the check / close icons in the handle. */
  icons?: boolean;
  sx?: StyleXStyles;
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  { checked: checkedProp, defaultChecked = false, onCheckedChange, icons = false, disabled = false, sx, ...rest },
  ref,
) {
  const [on, setOn] = useControllableState(checkedProp, defaultChecked, onCheckedChange);
  const forced = useForcedState();
  const interacting = isInteractionState(forced.state);
  const restSize = on || icons ? 24 : 16;
  return (
    <BaseSwitch.Root
      ref={ref}
      checked={on}
      disabled={disabled}
      onCheckedChange={setOn}
      {...rest}
      {...stylex.props(
        s.root,
        focusRing.host,
        stylex.defaultMarker(),
        stateLayerHost.hostPressLayer,
        disabled && stateLayerHost.disabled,
        forcedStateLayer(forced.state, 'pressed'),
        on ? s.on : s.off,
        disabled && (on ? s.onDisabled : s.offDisabled),
        disabled && s.disabled,
        forced.focusRing && focusRing.forced,
        sx,
      )}
    >
      <span {...stylex.props(s.thumb, on && s.thumbOn)}>
        <StateLayer />
        <span
          {...stylex.props(
            s.handle,
            forced.state === 'pressed' ? dyn.fixed(28) : disabled ? dyn.fixed(restSize) : dyn.size(restSize),
            on ? handle.on : handle.off,
            interacting && (on ? handle.onInteracting : handle.offInteracting),
            disabled && (on ? handle.onDisabled : handle.offDisabled),
          )}
        >
          {icons && (
            <SvgIcon d={on ? CHECK : ICON_PATHS.close} size={ICON_SIZE} sx={disabled && !on && s.iconOffDisabled} />
          )}
        </span>
      </span>
    </BaseSwitch.Root>
  );
});
