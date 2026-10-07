import { estimateDurationMs, stepSpring, type SpringParams } from './spring.ts';

export interface SpringAnimationOptions {
  spring: SpringParams;
  from: number;
  to: number;
  /** Units per second. Carry this over when interrupting to keep motion continuous. */
  velocity?: number;
  /**
   * Visibility threshold in the animated unit (Compose: 0.01 for Float, 0.1 for Dp, 0.5 for px
   * offsets). The animation ends once the spring's envelope is within it of the target.
   */
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
 *
 * Ends like Compose's `Animatable.animateTo`: each segment (start or retarget) runs for
 * `estimateAnimationDurationMillis` with displacement and velocity measured in units of
 * `precision` (Compose's visibility threshold), then snaps to the target — so a visible
 * overshoot plays out instead of being cut when the value first comes within `precision`.
 */
export function animateSpring(opts: SpringAnimationOptions): SpringAnimation {
  let spring = opts.spring;
  let value = opts.from;
  let velocity = opts.velocity ?? 0;
  let target = opts.to;
  const precision = opts.precision ?? 0.01;
  // Current segment: analytic from its start state.
  let segStart = { value, velocity };
  let segDuration = 0;
  let segBegin: number | undefined;
  let frame = 0;
  let running = true;

  const beginSegment = () => {
    segStart = { value, velocity };
    segDuration = estimateDurationMs(spring, (value - target) / precision, velocity / precision);
    segBegin = undefined;
  };

  const tick = (now: number) => {
    if (segBegin === undefined) segBegin = now;
    const elapsed = now - segBegin;
    if (elapsed >= segDuration) {
      value = target;
      velocity = 0;
      running = false;
      opts.onUpdate(value, velocity);
      opts.onComplete?.();
      return;
    }
    ({ value, velocity } = stepSpring(spring, segStart, target, elapsed));
    opts.onUpdate(value, velocity);
    frame = requestAnimationFrame(tick);
  };
  beginSegment();
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
      beginSegment();
      if (!running) {
        running = true;
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
