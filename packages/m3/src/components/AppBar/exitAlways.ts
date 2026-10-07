import { useLayoutEffect, useMemo, useRef } from 'react';
import type { SpringParams } from '../../motion/spring.ts';
import { useSpringChannel } from '../../motion/useSpringChannel.ts';

/** settleAppBar / settleFloatingToolbar: a bar hidden less than this fraction is left as it is. */
const SETTLE_MIN_FRACTION = 0.01;
/** Visibility threshold of the settle spring (px; Compose's Float default). */
const SETTLE_PRECISION = 0.01;

export interface ExitAlwaysOffset {
  /** Move by a scroll delta (negative hides), clamped between shown (0) and hidden (`limit`). */
  follow(delta: number): void;
  /** The scroll ended: settle a part-hidden bar to the nearer end (shown while less than half hidden). */
  settle(): void;
  /** Halt a settle where it is. */
  stop(): void;
  /** A settle is running. */
  readonly settling: boolean;
}

/**
 * Compose's exitAlways scroll behaviour, shared by the bottom app bar (BottomAppBarState
 * .heightOffset) and the floating toolbar (FloatingToolbarState.offset): an offset between 0
 * (shown) and `limit()` (hidden, negative) that follows the content's scroll 1:1 and, when the
 * scroll ends part way, settles to the nearer end on `spring` (null: at once). `apply` writes each
 * offset to the element — no render per frame. Callers wire the scroll (which deltas count, what
 * interrupts a settle); `limit` and `spring` are read from the latest render.
 */
export function useExitAlwaysOffset(
  apply: (offset: number) => void,
  limit: () => number,
  spring: SpringParams | null,
): ExitAlwaysOffset {
  const latest = useRef({ limit, spring });
  useLayoutEffect(() => {
    latest.current = { limit, spring };
  });
  const channel = useSpringChannel(apply, { precision: SETTLE_PRECISION });
  return useMemo(
    () => ({
      follow(delta) {
        channel.jump(Math.min(0, Math.max(latest.current.limit(), channel.value + delta)));
      },
      settle() {
        if (channel.animating) return;
        const hidden = latest.current.limit();
        if (hidden === 0) return;
        const fraction = channel.value / hidden;
        if (fraction < SETTLE_MIN_FRACTION || fraction === 1) return;
        channel.to(fraction < 0.5 ? 0 : hidden, latest.current.spring);
      },
      stop() {
        channel.stop();
      },
      get settling() {
        return channel.animating;
      },
    }),
    [channel],
  );
}
