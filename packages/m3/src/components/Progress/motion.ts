import { useEffect, useRef, useState } from 'react';
import { animateSpring, type SpringAnimation } from '../../motion/animate.ts';
import type { SpringParams } from '../../motion/spring.ts';

/** CSS cubic-bezier as a function of time fraction (Newton + bisection, like browsers). */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const bx = (t: number) => 3 * x1 * t * (1 - t) ** 2 + 3 * x2 * t * t * (1 - t) + t ** 3;
  const by = (t: number) => 3 * y1 * t * (1 - t) ** 2 + 3 * y2 * t * t * (1 - t) + t ** 3;
  const dx = (t: number) => 3 * x1 * (1 - t) ** 2 + 6 * (x2 - x1) * t * (1 - t) + 3 * (1 - x2) * t * t;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const e = bx(t) - x;
      if (Math.abs(e) < 1e-6) return by(t);
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    let lo = 0, hi = 1;
    t = x;
    while (hi - lo > 1e-6) {
      if (bx(t) < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return by(t);
  };
}

/** Calls `onFrame(ms since start)` every animation frame while `active`. */
export function useFrameLoop(active: boolean, onFrame: (ms: number) => void) {
  const cb = useRef(onFrame);
  cb.current = onFrame;
  useEffect(() => {
    if (!active) return;
    let id = 0;
    let t0: number | undefined;
    const tick = (now: number) => {
      t0 ??= now;
      cb.current(now - t0);
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [active]);
}

/**
 * A number that springs to `target`. `spring` null (reduced motion / frozen) jumps. The first
 * render starts at the target (no entrance animation), like Compose's animateFloatAsState.
 */
export function useSpringNumber(target: number, spring: SpringParams | null, precision = 0.001) {
  const [value, setValue] = useState(target);
  const anim = useRef<SpringAnimation | null>(null);
  const current = useRef(target);
  useEffect(() => {
    if (!spring) {
      anim.current?.stop();
      anim.current = null;
      current.current = target;
      setValue(target);
      return;
    }
    if (anim.current) {
      anim.current.retarget(target, spring);
      return;
    }
    if (current.current === target) return;
    anim.current = animateSpring({
      spring,
      from: current.current,
      to: target,
      precision,
      onUpdate: (v) => {
        current.current = v;
        setValue(v);
      },
      onComplete: () => {
        anim.current = null;
      },
    });
  }, [target, spring, precision]);
  useEffect(() => () => anim.current?.stop(), []);
  return value;
}

/** Compose `ProgressIndicatorDefaults.ProgressAnimationSpec`: no bounce, StiffnessVeryLow. */
export const PROGRESS_SPRING: SpringParams = { dampingRatio: 1, stiffness: 50 };

/* Linear indeterminate — Compose material3 LinearProgressIndicator keyframes (1800ms cycle). */
const LINEAR_CYCLE = 1800;
const LINES = [
  { head: [0, 750, cubicBezier(0.2, 0, 0.8, 1)], tail: [333, 850, cubicBezier(0.4, 0, 1, 1)] },
  { head: [1000, 567, cubicBezier(0, 0, 0.65, 1)], tail: [1267, 533, cubicBezier(0.1, 0, 0.45, 1)] },
] as const;

/** [tail, head] fractions of the track length for each visible line at time `ms`. */
export function linearIndeterminate(ms: number): [number, number][] {
  const t = ms % LINEAR_CYCLE;
  const at = ([delay, dur, ease]: readonly [number, number, (x: number) => number]) => ease((t - delay) / dur);
  return LINES.map((l) => [at(l.tail), at(l.head)] as [number, number]).filter(([a, b]) => b - a > 1e-3);
}

/* Circular indeterminate — Compose material3 CircularProgressIndicator keyframes. */
const ROTATION_MS = 1332;
const ROTATIONS_PER_CYCLE = 5;
const BASE_ROTATION = 286;
const JUMP_ROTATION = 290;
const ROTATION_OFFSET = (BASE_ROTATION + JUMP_ROTATION) % 360;
const circularEasing = cubicBezier(0.4, 0, 0.2, 1);

/** `grow` 0…1 (how far the arc has extended) and the rotation (degrees) at time `ms`. */
export function circularIndeterminate(ms: number) {
  const step = Math.floor((ms % (ROTATION_MS * ROTATIONS_PER_CYCLE)) / ROTATION_MS); // Int 0…4, as in Compose
  const t = ms % ROTATION_MS;
  const half = ROTATION_MS / 2;
  const end = circularEasing(Math.min(1, t / half)) * JUMP_ROTATION;
  const start = circularEasing(Math.max(0, (t - half) / half)) * JUMP_ROTATION;
  // Per-cycle jumps (−286 base, −290 start, +216 step offset) cancel out: the rotation is continuous.
  const rotation = ((step * ROTATION_OFFSET) % 360) + (t / ROTATION_MS) * BASE_ROTATION + start;
  return { grow: (end - start) / JUMP_ROTATION, rotation };
}
