import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { animateSpring, type SpringAnimation } from './animate.ts';
import type { SpringParams } from './spring.ts';

export interface SpringChannelOptions {
  /** Starting value (default 0). */
  initial?: number;
  /** Visibility threshold in the animated unit (Compose: 0.01 for Float, 0.5 for px). */
  precision?: number;
  /**
   * Called when a `to()` comes to rest at its target — after the spring lands, at once when `spring`
   * is null, and at once when the value is already there (Compose `animateTo` always completes).
   * Not called for a `to()` that is retargeted or stopped before it lands.
   */
  onRest?: (value: number) => void;
}

export interface SpringChannel {
  /** Spring to `target` (retargeting keeps velocity); `spring` null (reduced motion) jumps. */
  to(target: number, spring: SpringParams | null, velocity?: number): void;
  /** Set the value now, stopping any motion; `onUpdate` paints it. */
  jump(value: number): void;
  /**
   * Re-sync the value with what is already on screen (a user scroll moved it), stopping any motion;
   * `onUpdate` is not called.
   */
  set(value: number): void;
  /** Halt where it is. */
  stop(): void;
  readonly value: number;
  readonly animating: boolean;
}

interface Callbacks {
  onUpdate: (value: number, velocity: number) => void;
  onRest?: (value: number) => void;
}

function createSpringChannel(initial: number, precision: number, callbacks: Required<Callbacks>): SpringChannel {
  let anim: SpringAnimation | null = null;
  let value = initial;
  const apply = (next: number, velocity: number) => {
    value = next;
    callbacks.onUpdate(next, velocity);
  };
  const halt = () => {
    anim?.stop();
    anim = null;
  };
  return {
    to(target, spring, velocity) {
      if (!spring) {
        halt();
        apply(target, 0);
        callbacks.onRest(target);
        return;
      }
      if (anim) {
        anim.retarget(target, spring);
        return;
      }
      if (value === target && !velocity) {
        callbacks.onRest(target);
        return;
      }
      anim = animateSpring({
        spring,
        from: value,
        to: target,
        velocity: velocity ?? 0,
        precision,
        onUpdate: apply,
        onComplete: () => {
          anim = null;
          callbacks.onRest(value);
        },
      });
    },
    jump(next) {
      halt();
      apply(next, 0);
    },
    set(next) {
      halt();
      value = next;
    },
    stop: halt,
    get value() {
      return value;
    },
    get animating() {
      return anim !== null;
    },
  };
}

/**
 * One interruptible spring value bound to the component's lifetime — the Compose `Animatable`
 * pattern behind most of the library's JS motion. `onUpdate` runs every frame (write styles to the
 * DOM there, not React state) and always sees the latest props; the spring stops on unmount.
 * `initial` and `precision` are read once, on mount.
 */
export function useSpringChannel(
  onUpdate: (value: number, velocity: number) => void,
  options: SpringChannelOptions = {},
): SpringChannel {
  const { initial = 0, precision = 0.01, onRest } = options;
  const latest = useRef<Callbacks>({ onUpdate, onRest });
  useLayoutEffect(() => {
    latest.current = { onUpdate, onRest };
  });
  // oxlint-disable-next-line react/refs -- the callbacks read `latest` per frame, never during render
  const [channel] = useState(() =>
    createSpringChannel(initial, precision, {
      onUpdate: (value, velocity) => latest.current.onUpdate(value, velocity),
      onRest: (value) => latest.current.onRest?.(value),
    }),
  );
  useEffect(() => () => channel.stop(), [channel]);
  return channel;
}
