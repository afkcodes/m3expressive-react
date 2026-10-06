import { stepSpring, type SpringParams } from './spring.ts';

export interface SpringAnimationOptions {
  spring: SpringParams;
  from: number;
  to: number;
  /** Units per second. Carry this over when interrupting to keep motion continuous. */
  velocity?: number;
  /** Absolute distance from target treated as "at rest" (e.g. 0.5 for px, 0.001 for 0–1). */
  precision?: number;
  onUpdate: (value: number, velocity: number) => void;
  onComplete?: () => void;
}

export interface SpringAnimation {
  readonly value: number;
  readonly velocity: number;
  readonly target: number;
  /** Change destination mid-flight, preserving current value and velocity (Compose `animateTo`). */
  retarget(to: number, spring?: SpringParams): void;
  /** Jump to the target immediately. */
  finish(): void;
  /** Halt where it is. */
  stop(): void;
}

/**
 * rAF-driven spring for interruptible / gesture motion, where CSS transitions
 * would restart from zero velocity. Same physics as the CSS tokens.
 */
export function animateSpring(opts: SpringAnimationOptions): SpringAnimation {
  let spring = opts.spring;
  let value = opts.from;
  let velocity = opts.velocity ?? 0;
  let target = opts.to;
  const precision = opts.precision ?? 0.01;
  let last: number | undefined;
  let frame = 0;
  let running = true;

  const tick = (now: number) => {
    // Cap dt so a backgrounded tab resumes smoothly instead of teleporting.
    const dt = last === undefined ? 0 : Math.min(now - last, 64);
    last = now;
    ({ value, velocity } = stepSpring(spring, { value, velocity }, target, dt));
    const atRest =
      Math.abs(value - target) < precision && Math.abs(velocity) < precision * 60;
    if (atRest) {
      value = target;
      velocity = 0;
      running = false;
      opts.onUpdate(value, velocity);
      opts.onComplete?.();
      return;
    }
    opts.onUpdate(value, velocity);
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);

  return {
    get value() {
      return value;
    },
    get velocity() {
      return velocity;
    },
    get target() {
      return target;
    },
    retarget(to, nextSpring) {
      target = to;
      if (nextSpring) spring = nextSpring;
      if (!running) {
        running = true;
        last = undefined;
        frame = requestAnimationFrame(tick);
      }
    },
    finish() {
      cancelAnimationFrame(frame);
      running = false;
      value = target;
      velocity = 0;
      opts.onUpdate(value, velocity);
      opts.onComplete?.();
    },
    stop() {
      cancelAnimationFrame(frame);
      running = false;
    },
  };
}
