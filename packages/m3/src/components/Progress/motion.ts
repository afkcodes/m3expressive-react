import { useEffect, useReducer, useRef, useState } from 'react';
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

/** A Compose `tween(durationMillis, easing)`. */
export interface Tween {
  readonly duration: number;
  readonly easing: (fraction: number) => number;
}

/**
 * `WavyProgressIndicatorDefaults.ProgressAnimationSpec` (WavyProgressIndicator.kt):
 * tween(MotionTokens.DurationLong2 = 500ms, EasingLinear) — the wavy indicators' value change.
 */
export const WAVY_PROGRESS_TWEEN: Tween = { duration: 500, easing: (u) => u };
/** `IncreasingAmplitudeAnimationSpec`: tween(DurationLong2, EasingStandard). */
export const AMPLITUDE_UP: Tween = { duration: 500, easing: standard };
/** `DecreasingAmplitudeAnimationSpec`: tween(DurationLong2, EasingEmphasizedAccelerate). */
export const AMPLITUDE_DOWN: Tween = { duration: 500, easing: emphasizedAccelerate };

/** `WavyProgressIndicatorDefaults.indicatorAmplitude`: flat at ≤ 10% and ≥ 95% (linear kit frames agree). */
export const linearWaveAmplitude = (progress: number) => (progress <= 0.1 || progress >= 0.95 ? 0 : 1);
/**
 * Circular wavy amplitude. The kit draws its 10% and 100% circular frames wavy (Compose's
 * `indicatorAmplitude` would flatten both), so only values below 10% are flat.
 */
export const circularWaveAmplitude = (progress: number) => (progress < 0.1 ? 0 : 1);

type Segment = { from: number; to: number; spec: Tween; start?: number };
/** The segment's value at `now`, or null once it has ended. Its clock starts on its first frame. */
const sample = (seg: Segment, now: number) => {
  seg.start ??= now;
  const u = (now - seg.start) / seg.spec.duration;
  return u >= 1 ? null : seg.from + (seg.to - seg.from) * seg.spec.easing(Math.max(0, u));
};

/**
 * Compose `animateFloatAsState(target, tween)`: every new target starts a fresh tween (full
 * duration) from the current value; tweens ignore velocity.
 */
export class TweenAnimator {
  value: number;
  private seg: Segment | null = null;
  constructor(value: number) {
    this.value = value;
  }
  get running() {
    return this.seg !== null;
  }
  get target() {
    return this.seg?.to ?? this.value;
  }
  to(target: number, spec: Tween, now?: number) {
    if (target === this.target) return;
    if (now !== undefined) this.tick(now);
    this.seg = { from: this.value, to: target, spec };
  }
  jump(value: number) {
    this.seg = null;
    this.value = value;
  }
  tick(now: number) {
    if (!this.seg) return this.value;
    const v = sample(this.seg, now);
    if (v === null) {
      this.value = this.seg.to;
      this.seg = null;
    } else this.value = v;
    return this.value;
  }
}

/**
 * The wavy indicators' amplitude (internal_LinearWavyProgressModifiers `updateAmplitudeAnimation`,
 * internal_CircularWavyProgressModifiers' determinate node): a change starts a 500ms ramp —
 * Increasing (EasingStandard) or Decreasing (EasingEmphasizedAccelerate) by direction. A running
 * ramp is never retargeted: the latest target is taken once it completes.
 */
export class AmplitudeRamp {
  value: number;
  private wanted: number;
  private seg: Segment | null = null;
  constructor(value: number) {
    this.value = value;
    this.wanted = value;
  }
  get running() {
    return this.seg !== null || this.wanted !== this.value;
  }
  setTarget(target: number) {
    this.wanted = target;
  }
  jump(value: number) {
    this.seg = null;
    this.value = value;
    this.wanted = value;
  }
  tick(now: number) {
    if (this.seg) {
      const v = sample(this.seg, now);
      if (v !== null) return (this.value = v);
      this.value = this.seg.to;
      this.seg = null;
    }
    if (this.wanted !== this.value) {
      const spec = this.value < this.wanted ? AMPLITUDE_UP : AMPLITUDE_DOWN;
      this.seg = { from: this.value, to: this.wanted, spec, start: now };
    }
    return this.value;
  }
}

/** Drives an animator on rAF while it runs; re-renders the caller each frame. */
function useAnimatorLoop(anim: { running: boolean; tick(now: number): number }, kick: unknown[]) {
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    if (!anim.running) return;
    let frame = 0;
    const loop = (now: number) => {
      anim.tick(now);
      rerender();
      if (anim.running) frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, kick);
}

/** A number that tweens to `target` (`spec` null jumps). The first render starts at the target. */
export function useTweenNumber(target: number, spec: Tween | null) {
  const anim = useRef<TweenAnimator | null>(null);
  anim.current ??= new TweenAnimator(target);
  const a = anim.current;
  if (!spec) a.jump(target);
  else a.to(target, spec);
  useAnimatorLoop(a, [target, spec]);
  return a.value;
}

/** The wave amplitude 0…1 ramping to `target` (`animate` false jumps). Starts at the target. */
export function useWaveAmplitude(target: number, animate: boolean) {
  const ramp = useRef<AmplitudeRamp | null>(null);
  ramp.current ??= new AmplitudeRamp(target);
  const r = ramp.current;
  if (!animate) r.jump(target);
  else r.setTarget(target);
  useAnimatorLoop(r, [target, animate]);
  return r.value;
}

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

/*
 * LoadingIndicator — Compose LoadingIndicator.kt (LoadingIndicatorImpl): each morph to the next
 * shape runs on spring(0.6, 200) with a 0.1 visibility threshold (so it ends at ≈297ms, mid
 * overshoot, and snaps); the loop launches a morph, delays MorphIntervalMillis (650) and then
 * awaits it. Every finished morph advances the rotation target a quarter turn; the drawing turns
 * by progress·90 + target + a global 4666ms linear spin.
 */
export const MORPH_INTERVAL = 650;
export const MORPH_SPRING: SpringParams = { dampingRatio: 0.6, stiffness: 200 };
export const MORPH_PRECISION = 0.1;
export const SPIN_MS = 4666;
