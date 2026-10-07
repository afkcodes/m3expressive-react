import type { ComponentPropsWithRef, MouseEventHandler, ReactNode, Ref } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Button as BaseButton } from '@base-ui/react/button';
import { color } from '../../tokens/color.stylex.ts';
import { elevation } from '../../tokens/elevation.stylex.ts';
import { typescale } from '../../tokens/typescale.ts';
import { interaction } from '../../primitives/state.stylex.ts';
import { forcedStateLayer, StateLayer, stateLayerHost } from '../../primitives/StateLayer.tsx';
import { focusRing } from '../../primitives/focusRing.ts';
import { ICON_PATHS, SvgIcon } from '../../primitives/SvgIcon.tsx';
import { legacyLeading, textBox } from '../../primitives/textBox.ts';
import type { SxProps } from '../../primitives/types.ts';
import { useLabels, type M3Labels } from '../../theme/labels.tsx';
import { useForcedState, type ForceStateValue } from '../../testing/ForceState.tsx';

/*
 * Figma kit, "Snackbar" page: set "Snackbar" (text only / text & action / text & longer action ×
 * one / two lines × close affordance) and the action / close-affordance building blocks.
 *   Surface: inverse-surface, 4px corners, level 3 without spread (non-clipping frame), min 344px wide; body-medium inverse-on-surface
 *   text with 14px block padding (one line → 48px, two lines → 68px), 16px start padding.
 *   Action: text button, inverse-primary, 40px, padding 10/12; close: 48px target, 40px circle,
 *   24px icon. State layers in the content colour at 8 / 10 / 10% (press is a flat layer).
 *   Longer actions stack under the text, right-aligned.
 *
 * Host motion and queue — Compose material3 SnackbarHost.kt (SnackbarHostState, SnackbarHost,
 * FadeInFadeOutWithScale, SnackbarDuration.toMillis):
 *   one snackbar at a time, FIFO: the next waits until the current is dismissed, and its timer
 *   starts when it becomes current. Durations: short 4000ms, long 10000ms, indefinite; default
 *   indefinite with an action, short otherwise. The action and the close affordance dismiss it.
 *   Enter: scale 0.8 → 1 on FastSpatial + alpha 0 → 1 on FastEffects (about the centre).
 *   Exit: alpha → 0 on FastEffects + scale → 0.8 on FastSpatial; a replacement crossfades in the
 *   same place, drawn above the leaving one.
 *   Not Compose: the timer pauses while the snackbar is hovered or focused (WCAG 2.2.1; Android
 *   lengthens timeouts through the accessibility manager instead).
 * The host and queue: ./SnackbarHost.tsx.
 */
const s = stylex.create({
  surface: {
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    columnGap: 4,
    minWidth: 344,
    maxWidth: 672,
    minHeight: 48,
    paddingInlineStart: 16,
    borderRadius: 4,
    backgroundColor: color.inverseSurface,
    color: color.inverseOnSurface,
    // The kit's snackbar frames don't clip, so Figma draws their level-3 shadow without spread.
    boxShadow: elevation.level3NoSpread,
  },
  stacked: { flexDirection: 'column', alignItems: 'stretch', paddingInlineStart: 0 },
  endAction: { paddingInlineEnd: 8 },
  endClose: { paddingInlineEnd: 0 },
  endText: { paddingInlineEnd: 16 },
  text: { flexGrow: 1, flexBasis: 0, minWidth: 0, margin: 0, paddingBlock: 14, color: 'inherit' },
  twoLine: { minHeight: 40 },
  stackedText: { paddingTop: 14, paddingBottom: 0, paddingInline: 16, flexBasis: 'auto' },
  trailing: { display: 'flex', alignItems: 'center', flexShrink: 0 },
  stackedRow: { justifyContent: 'flex-end' },
  stackedRowAction: { paddingInline: 8, paddingBottom: 4, marginTop: 14 },
  stackedRowClose: { paddingInlineStart: 8, marginTop: 10 },
  // Action (inverse text button) and close affordance.
  button: {
    appearance: 'none',
    borderWidth: 0,
    margin: 0,
    backgroundColor: 'transparent',
    backgroundImage: 'none',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    lineHeight: 'inherit',
    letterSpacing: 'inherit',
    textAlign: 'inherit',
    position: 'relative',
    isolation: 'isolate',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxSizing: 'border-box',
    cursor: 'pointer',
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
  },
  action: {
    height: 40,
    paddingBlock: 10,
    paddingInline: 12,
    borderRadius: 20,
    color: color.inversePrimary,
    [interaction.layerColor]: color.inversePrimary,
  },
  close: {
    width: 48,
    height: 48,
    padding: 0,
    borderRadius: 24,
    color: color.inverseOnSurface,
    [interaction.layerColor]: color.inverseOnSurface,
    outlineStyle: 'none',
  },
  closeCircle: {
    position: 'relative',
    isolation: 'isolate',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  icon: { position: 'relative' },
  label: { position: 'relative', color: 'inherit' },
});

/** The kit's static states: a flat pressed layer, and the focus ring when the variant shows it. */
const forcedStyles = (forced: ForceStateValue) => [
  forcedStateLayer(forced.state, 'pressed'),
  forced.focusRing && focusRing.forced,
];

export interface SnackbarActionProps extends SxProps<Omit<BaseButton.Props, 'render' | 'children'>> {
  ref?: Ref<HTMLButtonElement>;
  children: ReactNode;
}

/** The snackbar's inverse text button. */
export function SnackbarAction({ children, sx, ...rest }: SnackbarActionProps) {
  const forced = useForcedState();
  return (
    <BaseButton
      {...rest}
      {...stylex.props(s.button, focusRing.host, s.action, stateLayerHost.hostPressLayer, forcedStyles(forced), sx)}
    >
      <StateLayer />
      <span {...stylex.props(typescale.labelLarge, textBox.hug, s.label)}>{children}</span>
    </BaseButton>
  );
}

export interface SnackbarCloseProps extends SxProps<Omit<BaseButton.Props, 'render' | 'children'>> {
  ref?: Ref<HTMLButtonElement>;
  /** Overrides the built-in strings (`dismiss`, the default accessible name). */
  labels?: Partial<M3Labels>;
}

/** The close affordance (48px target, 40px circle), named `labels.dismiss` unless `aria-label` is given. */
export function SnackbarClose({ sx, labels: labelOverrides, 'aria-label': ariaLabel, ...rest }: SnackbarCloseProps) {
  const forced = useForcedState();
  const labels = useLabels(labelOverrides);
  return (
    <BaseButton
      aria-label={ariaLabel ?? labels.dismiss}
      {...rest}
      {...stylex.props(
        s.button,
        focusRing.host,
        // The ring is drawn by the 40px circle, not the 48px target.
        s.close,
        stateLayerHost.hostPressLayer,
        stylex.defaultMarker(),
        forcedStateLayer(forced.state, 'pressed'),
        sx,
      )}
    >
      <span {...stylex.props(s.closeCircle, focusRing.part, forced.focusRing && focusRing.forced)}>
        <StateLayer />
        <SvgIcon d={ICON_PATHS.close} sx={s.icon} />
      </span>
    </BaseButton>
  );
}

/** The static snackbar surface `<div>` (`ref`, native props, `sx`). Apps show snackbars with `useSnackbar()`. */
export interface SnackbarProps extends SxProps<ComponentPropsWithRef<'div'>> {
  /** Supporting text. */
  children: ReactNode;
  /** A <SnackbarAction/>. */
  action?: ReactNode;
  /** Shows the close affordance. */
  onClose?: MouseEventHandler<HTMLButtonElement>;
  /** Long action label: the action moves under the text. */
  stacked?: boolean;
  /** Reserve two lines of text (kit "Two lines"). */
  twoLine?: boolean;
  /** Overrides the built-in strings (`dismiss`, the close affordance's name). */
  labels?: Partial<M3Labels>;
}

/** The snackbar surface (static). Use `useSnackbar()` to show one. */
export function Snackbar({ onClose, labels, ...rest }: SnackbarProps) {
  return <SnackbarSurface {...rest} close={onClose ? <SnackbarClose labels={labels} onClick={onClose} /> : null} />;
}

export interface SnackbarSurfaceProps extends Omit<SnackbarProps, 'onClose' | 'labels'> {
  /** The close affordance element (the host renders a Toast.Close). */
  close: ReactNode;
}

export function SnackbarSurface({
  children,
  action,
  close,
  stacked = false,
  twoLine = false,
  sx,
  ...rest
}: SnackbarSurfaceProps) {
  if (stacked) {
    return (
      <div {...rest} {...stylex.props(typescale.bodyMedium, s.surface, s.stacked, sx)}>
        <p {...stylex.props(s.text, s.stackedText, twoLine && s.twoLine)}>
          <span {...stylex.props(legacyLeading.shift(14, 20))}>{children}</span>
        </p>
        <div {...stylex.props(s.trailing, s.stackedRow, close ? s.stackedRowClose : s.stackedRowAction)}>
          {action}
          {close}
        </div>
      </div>
    );
  }
  return (
    <div
      {...rest}
      {...stylex.props(typescale.bodyMedium, s.surface, close ? s.endClose : action ? s.endAction : s.endText, sx)}
    >
      {/* The kit's snackbar text layers use Figma's legacy line height (see textBox.ts). */}
      <p {...stylex.props(s.text, twoLine && s.twoLine)}>
        <span {...stylex.props(legacyLeading.shift(14, 20))}>{children}</span>
      </p>
      {(action != null || close) && (
        <div {...stylex.props(s.trailing)}>
          {action}
          {close}
        </div>
      )}
    </div>
  );
}
