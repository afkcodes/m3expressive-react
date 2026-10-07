import { createContext, useContext, useMemo, useRef, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Toast } from '@base-ui/react/toast';
import { motion } from '../../tokens/motion.stylex.ts';
import { usePortalContainer } from '../../theme/portal.tsx';
import { SnackbarAction, SnackbarClose, SnackbarSurface } from './Snackbar.tsx';

/* The snackbar host: Compose SnackbarHost's queue and motion on Base UI Toast (see ./Snackbar.tsx). */
const s = stylex.create({
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
  /** The action button; `onAction` runs when it is chosen (the snackbar then dismisses). */
  action?: { label: string; onAction?: () => void };
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

/** What `useSnackbar()` returns. */
export interface SnackbarApi {
  /** Queues a snackbar; returns its id. */
  show: (message: ReactNode, options?: ShowSnackbarOptions) => string;
  /** Dismisses a shown snackbar or drops a queued one. */
  close: (id: string) => void;
}

const SnackbarQueueContext = createContext<SnackbarApi | null>(null);
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
  // The store's add / close are stable (the manager object changes with every toast).
  const { add, close } = Toast.useToastManager();
  const state = useRef<{ queue: PendingSnackbar[]; current: string | null }>({ queue: [], current: null });

  const api = useMemo<SnackbarApi>(() => {
    const pump = () => {
      const st = state.current;
      if (st.current != null) return;
      const next = st.queue.shift();
      if (!next) return;
      st.current = next.id;
      add({
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
        const ms =
          options.timeout ??
          (options.duration
            ? DURATION_MS[options.duration]
            : (timeout ?? DURATION_MS[options.action ? 'indefinite' : 'short']));
        state.current.queue.push({
          id,
          message,
          timeout: ms,
          data: {
            actionLabel: options.action?.label,
            onAction: options.action?.onAction,
            withClose: options.withClose,
            stacked: options.stacked,
          },
        });
        pump();
        return id;
      },
      close(id) {
        const st = state.current;
        const queued = st.queue.findIndex((p) => p.id === id);
        if (queued >= 0) st.queue.splice(queued, 1);
        else close(id);
      },
    };
  }, [add, close, timeout]);

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
export function useSnackbar(): SnackbarApi {
  const api = useContext(SnackbarQueueContext);
  if (!api) throw new Error('useSnackbar() must be used inside <SnackbarProvider>.');
  return api;
}
