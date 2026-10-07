import { useEffect, useLayoutEffect, useRef } from 'react';
import { animateSpring, type SpringAnimation } from './animate.ts';
import type { SpringParams } from './spring.ts';

export interface SpringChannelOptions {
  /** Starting value (default 0). */
  initial?: number;
  /** Visibility threshold in the animated unit (Compose: 0.01 for Float, 0.5 for px). */
  precision?: number;
  /** Called once the value has come to rest at its target. */
  onRest?: (value: number) => void;
}

export interface SpringChannel {
  /** Spring to `target` (retargeting keeps velocity); `spring` null (reduced motion) jumps. */
  to(target: number, spring: SpringParams | null, velocity?: number): void;
  /** Set the value now, stopping any motion. */
  jump(value: number): void;
  /** Halt where it is. */
  stop(): void;
  readonly value: number;
  readonly animating: boolean;
}

/**
 * One interruptible spring value bound to the component's lifetime — the Compose `Animatable`
 * pattern behind most of the library's JS motion. `onUpdate` runs every frame (write styles to the
 * DOM there, not React state) and always sees the latest props; the spring stops on unmount.
 */
export function useSpringChannel(
  onUpdate: (value: number, velocity: number) => void,
  options: SpringChannelOptions = {},
): SpringChannel {
  const { initial = 0, precision = 0.01 } = options;
  const anim = useRef<SpringAnimation | null>(null);
  const value = useRef(initial);
  const latest = useRef({ onUpdate, onRest: options.onRest });
  useLayoutEffect(() => {
    latest.current = { onUpdate, onRest: options.onRest };
  });
  useEffect(() => () => anim.current?.stop(), []);

  const channel = useRef<SpringChannel | null>(null);
  if (channel.current === null) {
    const apply = (v: number, velocity: number) => {
      value.current = v;
      latest.current.onUpdate(v, velocity);
    };
    channel.current = {
      to(target, spring, velocity) {
        if (!spring) {
          this.jump(target);
          latest.current.onRest?.(target);
          return;
        }
        if (anim.current) {
          anim.current.retarget(target, spring);
          return;
        }
        if (value.current === target && !velocity) return;
        anim.current = animateSpring({
          spring,
          from: value.current,
          to: target,
          velocity: velocity ?? 0,
          precision,
          onUpdate: apply,
          onComplete: () => {
            anim.current = null;
            latest.current.onRest?.(value.current);
          },
        });
      },
      jump(v) {
        anim.current?.stop();
        anim.current = null;
        apply(v, 0);
      },
      stop() {
        anim.current?.stop();
        anim.current = null;
      },
      get value() {
        return value.current;
      },
      get animating() {
        return anim.current !== null;
      },
    };
  }
  return channel.current;
}
