import { estimateDurationMs, stepSpring, type SpringParams } from '../../motion/spring.ts';
import { emphasizedAccelerate, standard } from '../../motion/easing.ts';

export { cubicBezier } from '../../motion/easing.ts';

/*
 * The indicators' animators are plain objects ticked from one frame callback (motion/frameClock.ts):
 * each frame computes the drawing and writes it to the SVG, so React renders only when props,
 * size or a forced still frame change.
 */

/**
 * A number that springs to its target, ticked by the caller — `animateSpring` semantics
 * (motion/animate.ts) without its own rAF: each segment (start or retarget, which keeps the value
 * and velocity) is timed from its first tick and runs for Compose's estimated duration in units of
 * `precision`, then snaps to the target. Like Compose's animateFloatAsState it starts at rest.
 */
export class SpringAnimator {
  value: number;
  velocity = 0;
  private target: number;
  private readonly precision: number;
  private spring: SpringParams | null = null;
  private seg: { value: number; velocity: number; duration: number; begin?: number } | null = null;
  constructor(value: number, precision: number) {
    this.value = value;
    this.target = value;
    this.precision = precision;
  }
  get running() {
    return this.seg !== null;
  }
  /** Spring to `target`; a call that changes nothing (same target and spring) keeps the motion as is. */
  to(target: number, spring: SpringParams) {
    if (this.seg ? target === this.target && spring === this.spring : this.value === target) return;
    this.target = target;
    this.spring = spring;
    const { value, velocity, precision } = this;
    this.seg = {
      value,
      velocity,
      duration: estimateDurationMs(spring, (value - target) / precision, velocity / precision),
    };
  }
  jump(value: number) {
    this.seg = null;
    this.value = value;
    this.velocity = 0;
    this.target = value;
  }
  tick(now: number) {
    const seg = this.seg;
    if (!seg || !this.spring) return this.value;
    seg.begin ??= now;
    const elapsed = now - seg.begin;
    if (elapsed >= seg.duration) {
      this.jump(this.target);
      return this.value;
    }
    ({ value: this.value, velocity: this.velocity } = stepSpring(this.spring, seg, this.target, elapsed));
    return this.value;
  }
}

/** Compose `ProgressIndicatorDefaults.ProgressAnimationSpec`: no bounce, StiffnessVeryLow. */
export const PROGRESS_SPRING: SpringParams = { dampingRatio: 1, stiffness: 50 };

/* Easing tokens (androidx MotionTokens). */

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
  const at = ([delay, dur]: readonly [number, number]) =>
    t <= delay ? 0 : t >= delay + dur ? 1 : emphasizedAccelerate((t - delay) / dur);
  return LINES.map((l) => [at(l.tail), at(l.head)] as [number, number]);
}

/*
 * Circular indeterminate — M3 Expressive, 6000ms cycle, as Material Components Android draws it
 * (CircularIndeterminateRetreatAnimatorDelegate) and as m3.material.io's progress-indicator spec
 * video shows it:
 *   - constant rotation 0 → 1080° linear;
 *   - spin: +90° at 0 / 1500 / 3000 / 4500ms, each over 500ms on EasingStandard;
 *   - sweep 10% → 87% over 3000ms on EasingStandard, then back to 10% over 3000ms on EasingStandard.
 * Compose's keyframes (ProgressIndicator.kt) declare the same easings but attach them with `using`
 * to the keyframe *after* each move, so at runtime they ease only the shrinking half (its rotation
 * steps and growth run linear, steps over 300ms). Fitted to the spec video's frames (2026-10-07),
 * the MDC timing is within 3.7° rms on the sweep (Compose's 35.7°) and 1.6° on the rotation (4.1°).
 */
const CIRCULAR_CYCLE = 6000;
const SPIN_DELAYS = [0, 1500, 3000, 4500];
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export function circularIndeterminate(ms: number) {
  const t = ms % CIRCULAR_CYCLE;
  const constant = (t / CIRCULAR_CYCLE) * 1080;
  const spin = SPIN_DELAYS.reduce((sum, d) => sum + 90 * standard(clamp01((t - d) / 500)), 0);
  const grow = standard(clamp01(t / 3000)) - standard(clamp01((t - 3000) / 3000));
  return { sweep: 0.1 + 0.77 * grow, rotation: constant + spin };
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
