import { forwardRef, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { Button as BaseButton } from '@base-ui/react/button';
import { Toast } from '@base-ui/react/toast';
import { color } from '../../tokens/color.stylex';
import { elevation } from '../../tokens/elevation.stylex';
import { motion } from '../../tokens/motion.stylex';
import { state } from '../../tokens/state.stylex';
import { typescale } from '../../tokens/typescale.ts';
import { interaction } from '../../primitives/state.stylex';
import { StateLayer, stateLayerHost } from '../../primitives/StateLayer.tsx';
import { legacyLeading, textBox } from '../../primitives/textBox.ts';
import { useForcedState } from '../../testing/ForceState.tsx';
import { usePortalContainer } from '../../theme/portal.tsx';

/*
 * Figma kit, "Snackbar" page: set "Snackbar" (text only / text & action / text & longer action ×
 * one / two lines × close affordance) and the action / close-affordance building blocks.
 *   Surface: inverse-surface, 4px corners, level 3 without spread (non-clipping frame), min 344px wide; body-medium inverse-on-surface
 *   text with 14px block padding (one line → 48px, two lines → 68px), 16px start padding.
 *   Action: text button, inverse-primary, 40px, padding 10/12; close: 48px target, 40px circle,
 *   24px icon. State layers in the content colour at 8 / 10 / 10% (press is a flat layer).
 *   Longer actions stack under the text, right-aligned.
 */
const CLOSE = 'M6.4 19L5 17.6L10.6 12L5 6.4L6.4 5L12 10.6L17.6 5L19 6.4L13.4 12L19 17.6L17.6 19L12 13.4L6.4 19Z';

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
    outlineStyle: { default: 'none', ':focus-visible': 'solid' },
    outlineColor: color.secondary,
    outlineWidth: state.focusIndicatorThickness,
    outlineOffset: state.focusIndicatorOuterOffset,
  },
  action: {
    height: 40,
    paddingBlock: 10,
    paddingInline: 12,
    borderRadius: 20,
    color: color.inversePrimary,
    [interaction.layerColor]: color.inversePrimary,
  },
  close: { width: 48, height: 48, padding: 0, borderRadius: 24, color: color.inverseOnSurface, [interaction.layerColor]: color.inverseOnSurface, outlineStyle: 'none' },
  closeCircle: {
    position: 'relative',
    isolation: 'isolate',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
    outlineStyle: { default: 'none', [stylex.when.ancestor(':focus-visible')]: 'solid' },
    outlineColor: color.secondary,
    outlineWidth: state.focusIndicatorThickness,
    outlineOffset: state.focusIndicatorOuterOffset,
  },
  icon: { width: 24, height: 24, fill: 'currentColor', position: 'relative' },
  label: { position: 'relative', color: 'inherit' },
  ringForced: { outlineStyle: 'solid' },
  viewport: {
    position: 'fixed',
    insetInline: 0,
    bottom: 16,
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    rowGap: 8,
    pointerEvents: 'none',
  },
  toast: {
    pointerEvents: 'auto',
    opacity: { default: 1, ':is([data-starting-style], [data-ending-style])': 0 },
    translate: { default: '0 0', ':is([data-starting-style], [data-ending-style])': '0 16px' },
    transitionProperty: 'opacity, translate',
    transitionDuration: `${motion.fastEffectsDuration}, ${motion.defaultSpatialDuration}`,
    transitionTimingFunction: `${motion.fastEffectsEasing}, ${motion.defaultSpatialEasing}`,
  },
});

function forced(f: ReturnType<typeof useForcedState>) {
  return [
    f.state === 'hovered' && stateLayerHost.forceHover,
    f.state === 'focused' && stateLayerHost.forceFocus,
    f.state === 'pressed' && stateLayerHost.forcePressed,
    f.focusRing && s.ringForced,
  ];
}

export interface SnackbarActionProps extends Omit<BaseButton.Props, 'className' | 'style' | 'render' | 'children'> {
  children: ReactNode;
  sx?: StyleXStyles;
}

/** The snackbar's inverse text button. */
export const SnackbarAction = forwardRef<HTMLButtonElement, SnackbarActionProps>(function SnackbarAction({ children, sx, ...rest }, ref) {
  const f = useForcedState();
  return (
    <BaseButton ref={ref} {...rest} {...stylex.props(s.button, s.action, stateLayerHost.hostPressLayer, ...forced(f), sx)}>
      <StateLayer />
      <span {...stylex.props(typescale.labelLarge, textBox.hug, s.label)}>{children}</span>
    </BaseButton>
  );
});

export interface SnackbarCloseProps extends Omit<BaseButton.Props, 'className' | 'style' | 'render' | 'children'> {
  sx?: StyleXStyles;
}

/** The close affordance (48px target, 40px circle). */
export const SnackbarClose = forwardRef<HTMLButtonElement, SnackbarCloseProps>(function SnackbarClose({ sx, 'aria-label': label = 'Dismiss', ...rest }, ref) {
  const f = useForcedState();
  return (
    <BaseButton ref={ref} aria-label={label} {...rest} {...stylex.props(s.button, s.close, stateLayerHost.hostPressLayer, stylex.defaultMarker(), f.state === 'hovered' && stateLayerHost.forceHover, f.state === 'focused' && stateLayerHost.forceFocus, f.state === 'pressed' && stateLayerHost.forcePressed, sx)}>
      <span {...stylex.props(s.closeCircle, f.focusRing && s.ringForced)}>
        <StateLayer />
        <svg viewBox="0 0 24 24" aria-hidden {...stylex.props(s.icon)}>
          <path d={CLOSE} />
        </svg>
      </span>
    </BaseButton>
  );
});

export interface SnackbarProps {
  /** Supporting text. */
  children: ReactNode;
  /** A <SnackbarAction/>. */
  action?: ReactNode;
  /** Shows the close affordance. */
  onClose?: () => void;
  /** Long action label: the action moves under the text. */
  stacked?: boolean;
  /** Reserve two lines of text (kit "Two lines"). */
  twoLine?: boolean;
  sx?: StyleXStyles;
}

/** The snackbar surface (static). Use `useSnackbar()` to show one. */
export function Snackbar({ children, action, onClose, stacked = false, twoLine = false, sx }: SnackbarProps) {
  const close = onClose ? <SnackbarClose onClick={onClose} /> : null;
  if (stacked) {
    return (
      <div {...stylex.props(typescale.bodyMedium, s.surface, s.stacked, sx)}>
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
    <div {...stylex.props(typescale.bodyMedium, s.surface, close ? s.endClose : action ? s.endAction : s.endText, sx)}>
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

// ── Host ──────────────────────────────────────────────────────────────────────────────────────
interface SnackbarData {
  actionLabel?: string;
  onAction?: () => void;
  withClose?: boolean;
  stacked?: boolean;
}

export interface SnackbarProviderProps {
  children: ReactNode;
  /** Auto-dismiss after this many ms (M3: 4–10 s). */
  timeout?: number;
}

/** Queues snackbars (Base UI Toast: aria-live, focus handling, swipe/escape). */
export function SnackbarProvider({ children, timeout = 6000 }: SnackbarProviderProps) {
  const portalContainer = usePortalContainer();
  return (
    <Toast.Provider timeout={timeout} limit={1}>
      {children}
      <Toast.Portal container={portalContainer}>
        <Toast.Viewport {...stylex.props(s.viewport)}>
          <SnackbarList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}

function SnackbarList() {
  const { toasts } = Toast.useToastManager();
  return toasts.map((t) => {
    const data = (t.data ?? {}) as SnackbarData;
    return (
      <Toast.Root key={t.id} toast={t} {...stylex.props(s.toast)}>
        <Snackbar
          stacked={data.stacked}
          action={data.actionLabel ? <Toast.Action render={<SnackbarAction onClick={data.onAction}>{data.actionLabel}</SnackbarAction>} /> : undefined}
          onClose={data.withClose ? () => {} : undefined}
        >
          <Toast.Description render={<span />}>{t.description}</Toast.Description>
        </Snackbar>
      </Toast.Root>
    );
  });
}

export interface ShowSnackbarOptions {
  action?: { label: string; onClick?: () => void };
  withClose?: boolean;
  stacked?: boolean;
  timeout?: number;
}

/** `const snackbar = useSnackbar(); snackbar.show('Message sent', { action: { label: 'Undo' } })`. */
export function useSnackbar() {
  const manager = Toast.useToastManager();
  return {
    show: (message: ReactNode, options: ShowSnackbarOptions = {}) =>
      manager.add({
        description: message,
        timeout: options.timeout,
        data: { actionLabel: options.action?.label, onAction: options.action?.onClick, withClose: options.withClose, stacked: options.stacked } satisfies SnackbarData,
      }),
    close: (id: string) => manager.close(id),
  };
}
