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

/* Easing tokens (androidx MotionTokens). */
const emphasizedAccelerate = cubicBezier(0.3, 0, 0.8, 0.15);
const standard = cubicBezier(0.2, 0, 0, 1);

/*
 * Linear indeterminate — Compose material3 ProgressIndicator.kt (androidx-main, 2026): a 1750ms
 * cycle of two lines. Each end runs 0 → 1 with EasingEmphasizedAccelerate in its window:
 * line 1 head 0–1000ms, tail 250–1250ms; line 2 head 650–1500ms, tail 900–1750ms.
 */
const LINEAR_CYCLE = 1750;
const LINES = [
  { head: [0, 1000], tail: [250, 1000] },
  { head: [650, 850], tail: [900, 850] },
] as const;

/** [tail, head] fractions of the track width for both lines at time `ms` (equal = not visible). */
export function linearIndeterminate(ms: number): [number, number][] {
  const t = ms % LINEAR_CYCLE;
  const at = ([delay, dur]: readonly [number, number]) => (t <= delay ? 0 : t >= delay + dur ? 1 : emphasizedAccelerate((t - delay) / dur));
  return LINES.map((l) => [at(l.tail), at(l.head)] as [number, number]);
}

/*
 * Circular indeterminate — Compose material3 (M3 Expressive) CircularProgressIndicator /
 * CircularWavyProgressIndicator, 6000ms cycle:
 *   - global rotation 0 → 1080° linear;
 *   - additional rotation: +90° every 1500ms, each step linear over 300ms (the spec's
 *     EmphasizedDecelerate `using` clauses sit on the hold intervals, so the steps are linear);
 *   - sweep 10% → 87% linear over 3000ms, then back to 10% with EasingStandard.
 */
const CIRCULAR_CYCLE = 6000;

export function circularIndeterminate(ms: number) {
  const t = ms % CIRCULAR_CYCLE;
  const global = (t / CIRCULAR_CYCLE) * 1080;
  const step = Math.floor(t / 1500);
  const additional = step * 90 + 90 * Math.min(1, (t - step * 1500) / 300);
  const sweep = t < 3000 ? 0.1 + 0.77 * (t / 3000) : 0.87 - 0.77 * standard((t - 3000) / 3000);
  return { sweep, rotation: global + additional };
}
