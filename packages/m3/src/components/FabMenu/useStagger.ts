import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useSpringToken } from '../../motion/context.tsx';
import { useSpringChannel } from '../../motion/useSpringChannel.ts';

/**
 * Item stagger and list lifetime — Compose FloatingActionButtonMenu.kt: a visible-item count
 * springs to `total` (open) / 0 (close) on SlowEffects with visibilityThreshold 1, read as an Int
 * (truncated); item i (0 = top) is shown while i >= total − count, so the bottom item comes first
 * on open and the top item leaves first on close. The list unmounts once closed, at rest and with
 * every item faded out. `onItemShown` hears every item that starts being drawn (alpha > 0).
 */
export function useStagger(open: boolean, total: number, onItemShown: (index: number) => void) {
  const spring = useSpringToken('slow-effects');
  const [count, setCount] = useState(open ? total : 0);
  const [mounted, setMounted] = useState(open);
  // Opening mounts the list in the same render (closing keeps it until the items have faded out).
  if (open && !mounted) setMounted(true);
  /** Indices of the items currently drawn. */
  const shown = useRef(new Set<number>());
  // Latest props for the callbacks below (items call them from their effects and springs).
  const live = useRef({ open, onItemShown });
  useLayoutEffect(() => {
    live.current = { open, onItemShown };
  });
  const first = useRef(true);
  const unmountIfDone = useCallback((value: number, animating: boolean) => {
    if (!live.current.open && value === 0 && !animating && shown.current.size === 0) setMounted(false);
  }, []);
  // Animatable<Int> with spring(visibilityThreshold = 1); React hears only the truncated count.
  const stagger = useSpringChannel((value) => setCount(Math.trunc(value)), {
    initial: open ? total : 0,
    precision: 1,
    onRest: (value) => unmountIfDone(value, false),
  });
  const maybeUnmount = useCallback(() => unmountIfDone(stagger.value, stagger.animating), [unmountIfDone, stagger]);

  const onShown = useCallback(
    (index: number, isShown: boolean) => {
      if (isShown) shown.current.add(index);
      else shown.current.delete(index);
      if (isShown) live.current.onItemShown(index);
      maybeUnmount();
    },
    [maybeUnmount],
  );

  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const target = open ? total : 0;
    // Already there (count === trunc(value) === target): only the list's lifetime can change.
    if (!stagger.animating && stagger.value === target) {
      maybeUnmount();
      return;
    }
    stagger.to(target, spring);
  }, [open, total, spring, maybeUnmount, stagger]);

  return { count, mounted, onShown };
}
