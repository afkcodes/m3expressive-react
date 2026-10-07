import { createContext, forwardRef, useContext, useMemo, useRef, type ReactNode } from 'react';
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
  // One grid cell: a leaving snackbar and its replacement overlap (Compose draws both in a Box).
  viewport: {
    position: 'fixed',
    insetInline: 0,
    bottom: 16,
    zIndex: 1000,
    display: 'grid',
    justifyItems: 'center',
    alignItems: 'end',
    pointerEvents: 'none',
  },
  toast: {
    gridArea: '1 / 1',
    // The current one is drawn above the one fading out (Compose appends it last).
    zIndex: { default: 1, ':is([data-ending-style])': 0 },
    pointerEvents: { default: 'auto', ':is([data-ending-style])': 'none' },
    transformOrigin: 'center',
    opacity: { default: 1, ':is([data-starting-style], [data-ending-style])': 0 },
    scale: { default: '1', ':is([data-starting-style], [data-ending-style])': '0.8' },
    transitionProperty: 'opacity, scale',
    transitionDuration: `${motion.fastEffectsDuration}, ${motion.fastSpatialDuration}`,
    transitionTimingFunction: `${motion.fastEffectsEasing}, ${motion.fastSpatialEasing}`,
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
export function Snackbar({ onClose, ...rest }: SnackbarProps) {
  return <SnackbarSurface {...rest} close={onClose ? <SnackbarClose onClick={onClose} /> : null} />;
}

interface SnackbarSurfaceProps extends Omit<SnackbarProps, 'onClose'> {
  /** The close affordance element (the host renders a Toast.Close). */
  close: ReactNode;
}

function SnackbarSurface({ children, action, close, stacked = false, twoLine = false, sx }: SnackbarSurfaceProps) {
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
/** Compose SnackbarDuration. */
export type SnackbarDuration = 'short' | 'long' | 'indefinite';

/** SnackbarDuration.toMillis (indefinite = no timer). */
const DURATION_MS: Record<SnackbarDuration, number> = { short: 4000, long: 10000, indefinite: 0 };

interface SnackbarData {
  actionLabel?: string;
  onAction?: () => void;
  withClose?: boolean;
  stacked?: boolean;
}

export interface SnackbarProviderProps {
  children: ReactNode;
  /**
   * Auto-dismiss every snackbar after this many ms unless it sets its own `duration` / `timeout`
   * (0 = never). Default: Compose's durations (indefinite with an action, short otherwise).
   */
  timeout?: number;
}

export interface ShowSnackbarOptions {
  action?: { label: string; onClick?: () => void };
  withClose?: boolean;
  stacked?: boolean;
  /** Compose SnackbarDuration. Default: 'indefinite' with an action, 'short' otherwise. */
  duration?: SnackbarDuration;
  /** Exact auto-dismiss time in ms (overrides `duration`; 0 = never). */
  timeout?: number;
}

interface PendingSnackbar {
  id: string;
  message: ReactNode;
  timeout: number;
  data: SnackbarData;
}

interface SnackbarQueueApi {
  show: (message: ReactNode, options?: ShowSnackbarOptions) => string;
  close: (id: string) => void;
}

const SnackbarQueueContext = createContext<SnackbarQueueApi | null>(null);
let snackbarCount = 0;

/** Queues snackbars (Base UI Toast: aria-live, focus handling, escape). */
export function SnackbarProvider({ children, timeout }: SnackbarProviderProps) {
  const portalContainer = usePortalContainer();
  return (
    <Toast.Provider limit={1}>
      <SnackbarQueue timeout={timeout}>{children}</SnackbarQueue>
      <Toast.Portal container={portalContainer}>
        <Toast.Viewport {...stylex.props(s.viewport)}>
          <SnackbarList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}

/**
 * SnackbarHostState: a FIFO queue in front of Base UI's toast store, which only ever holds the
 * current snackbar (plus the one fading out) — so each timer starts when its snackbar is shown.
 */
function SnackbarQueue({ timeout, children }: { timeout?: number; children: ReactNode }) {
  const manager = Toast.useToastManager();
  const managerRef = useRef(manager);
  managerRef.current = manager;
  const timeoutRef = useRef(timeout);
  timeoutRef.current = timeout;
  const state = useRef<{ queue: PendingSnackbar[]; current: string | null }>({ queue: [], current: null });

  const api = useMemo<SnackbarQueueApi>(() => {
    const pump = () => {
      const st = state.current;
      if (st.current != null) return;
      const next = st.queue.shift();
      if (!next) return;
      st.current = next.id;
      managerRef.current.add({
        id: next.id,
        description: next.message,
        timeout: next.timeout,
        data: next.data,
        onClose: () => {
          if (state.current.current !== next.id) return;
          state.current.current = null;
          // After the store has finished closing this one: the next replaces it (crossfade).
          queueMicrotask(pump);
        },
      });
    };
    return {
      show(message, options = {}) {
        const id = `m3x-snackbar-${++snackbarCount}`;
        const ms = options.timeout ?? (options.duration ? DURATION_MS[options.duration] : (timeoutRef.current ?? DURATION_MS[options.action ? 'indefinite' : 'short']));
        state.current.queue.push({
          id,
          message,
          timeout: ms,
          data: { actionLabel: options.action?.label, onAction: options.action?.onClick, withClose: options.withClose, stacked: options.stacked },
        });
        pump();
        return id;
      },
      close(id) {
        const st = state.current;
        const queued = st.queue.findIndex((p) => p.id === id);
        if (queued >= 0) st.queue.splice(queued, 1);
        else managerRef.current.close(id);
      },
    };
  }, []);

  return <SnackbarQueueContext value={api}>{children}</SnackbarQueueContext>;
}

function SnackbarList() {
  const { toasts, close } = Toast.useToastManager();
  return toasts.map((t) => {
    const data = (t.data ?? {}) as SnackbarData;
    return (
      <Toast.Root key={t.id} toast={t} {...stylex.props(s.toast)}>
        <SnackbarSurface
          stacked={data.stacked}
          action={
            data.actionLabel ? (
              <Toast.Action
                render={
                  // Compose: performAction() also dismisses the snackbar.
                  <SnackbarAction
                    onClick={() => {
                      data.onAction?.();
                      close(t.id);
                    }}
                  >
                    {data.actionLabel}
                  </SnackbarAction>
                }
              />
            ) : undefined
          }
          // Always exposed: a snackbar is never collapsed into a stack (Base UI hides Close then).
          close={data.withClose ? <Toast.Close aria-hidden={false} render={<SnackbarClose />} /> : null}
        >
          <Toast.Description render={<span />}>{t.description}</Toast.Description>
        </SnackbarSurface>
      </Toast.Root>
    );
  });
}

/**
 * `const snackbar = useSnackbar(); snackbar.show('Message sent', { action: { label: 'Undo' } })`.
 * Snackbars queue (first in, first out) and show one at a time.
 */
export function useSnackbar(): SnackbarQueueApi {
  const api = useContext(SnackbarQueueContext);
  if (!api) throw new Error('useSnackbar() must be used inside <SnackbarProvider>.');
  return api;
}
