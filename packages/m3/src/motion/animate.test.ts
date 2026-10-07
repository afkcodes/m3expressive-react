import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { animateSpring } from './animate.ts';
import { estimateDurationMs, stepSpring, type SpringParams } from './spring.ts';
import { motionSchemes } from './tokens.ts';

/*
 * animateSpring against the Compose Animatable.animateTo contract it ports: each segment (start or
 * retarget) is the closed-form spring from that segment's start state, it ends after
 * estimateAnimationDurationMillis (displacement and velocity in units of the visibility
 * threshold) by snapping to the target, and a retarget keeps the current velocity.
 * requestAnimationFrame is a fake clock: `frame(t)` runs the callbacks queued for that frame.
 */

let queue = new Map<number, FrameRequestCallback>();
let nextId = 1;
const cancelled: number[] = [];

/** Run one animation frame at timestamp `now` (ms). */
function frame(now: number) {
  const callbacks = [...queue.values()];
  queue = new Map();
  for (const callback of callbacks) callback(now);
}

beforeEach(() => {
  queue = new Map();
  nextId = 1;
  cancelled.length = 0;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    const id = nextId++;
    queue.set(id, callback);
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    cancelled.push(id);
    queue.delete(id);
  });
});
afterEach(() => vi.unstubAllGlobals());

const loadingMorph: SpringParams = { dampingRatio: 0.6, stiffness: 200 };

function record(opts: Partial<Parameters<typeof animateSpring>[0]> = {}) {
  const updates: [number, number][] = [];
  const onComplete = vi.fn<() => void>();
  const animation = animateSpring({
    spring: loadingMorph,
    from: 0,
    to: 1,
    precision: 0.1,
    onUpdate: (value, velocity) => updates.push([value, velocity]),
    onComplete,
    ...opts,
  });
  return { animation, updates, onComplete };
}

describe('animateSpring', () => {
  it('requests a frame at once; the first frame is the segment start (elapsed 0)', () => {
    const { updates } = record();
    expect(queue.size).toBe(1);
    frame(1000);
    expect(updates).toEqual([[0, 0]]);
    expect(queue.size).toBe(1);
  });

  it('each frame is the closed-form spring at the time since the segment began', () => {
    const { animation, updates } = record();
    frame(1000);
    for (const t of [16, 33, 50, 120]) frame(1000 + t);
    const start = { value: 0, velocity: 0 };
    [16, 33, 50, 120].forEach((t, i) => {
      const expected = stepSpring(loadingMorph, start, 1, t);
      expect(updates[i + 1]![0]).toBeCloseTo(expected.value, 12);
      expect(updates[i + 1]![1]).toBeCloseTo(expected.velocity, 9);
    });
    expect(animation.value).toBe(updates.at(-1)![0]);
    expect(animation.target).toBe(1);
  });

  it('ends at the estimated duration (297ms for the loading-indicator morph), inside its overshoot', () => {
    // LoadingIndicator: spring(0.6, 200), visibility threshold 0.1, 0 → 1.
    expect(estimateDurationMs(loadingMorph, -1 / 0.1, 0)).toBe(297);
    const { updates, onComplete } = record();
    frame(0);
    frame(296);
    expect(updates.at(-1)![0]).toBeGreaterThan(1.09);
    expect(onComplete).not.toHaveBeenCalled();
    frame(297);
    expect(updates.at(-1)).toEqual([1, 0]);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(queue.size).toBe(0);
  });

  it('a finer precision runs longer: the duration is measured in units of the threshold', () => {
    const spring = motionSchemes.expressive['default-spatial'];
    for (const precision of [1, 0.5, 0.01]) {
      const { onComplete } = record({ spring, from: 0, to: 100, precision });
      const duration = estimateDurationMs(spring, -100 / precision, 0);
      frame(0);
      frame(duration - 1);
      expect(onComplete).not.toHaveBeenCalled();
      frame(duration);
      expect(onComplete).toHaveBeenCalledTimes(1);
    }
    expect(estimateDurationMs(spring, -100 / 0.01, 0)).toBeGreaterThan(estimateDurationMs(spring, -100 / 1, 0));
  });

  it('an initial velocity is carried into the spring and its duration estimate', () => {
    const spring = motionSchemes.expressive['fast-spatial'];
    const { updates } = record({ spring, from: 0, to: 0, velocity: 500, precision: 0.5 });
    frame(0);
    frame(10);
    expect(updates[1]![0]).toBeCloseTo(stepSpring(spring, { value: 0, velocity: 500 }, 0, 10).value, 12);
    expect(updates[1]![0]).toBeGreaterThan(0);
  });

  it('starting at the target with no velocity completes on the first frame', () => {
    const { updates, onComplete } = record({ from: 1, to: 1 });
    frame(0);
    expect(updates).toEqual([[1, 0]]);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('retarget keeps the current value and velocity and starts a new segment', () => {
    const { animation, updates, onComplete } = record();
    frame(0);
    frame(50);
    const at50 = { value: animation.value, velocity: animation.velocity };
    expect(at50.velocity).toBeGreaterThan(0);
    animation.retarget(0.5);
    expect([animation.value, animation.velocity, animation.target]).toEqual([at50.value, at50.velocity, 0.5]);
    // Still one frame in flight (no second loop).
    expect(queue.size).toBe(1);
    frame(66);
    // The new segment begins on this frame: nothing moves yet, the velocity is kept.
    expect(updates.at(-1)![0]).toBe(at50.value);
    expect(updates.at(-1)![1]).toBeCloseTo(at50.velocity, 9);
    frame(82);
    const expected = stepSpring(loadingMorph, at50, 0.5, 16);
    expect(updates.at(-1)![0]).toBeCloseTo(expected.value, 12);
    // It ends after the new segment's own estimate, at the new target.
    const duration = estimateDurationMs(loadingMorph, (at50.value - 0.5) / 0.1, at50.velocity / 0.1);
    frame(66 + duration - 1);
    expect(onComplete).not.toHaveBeenCalled();
    frame(66 + duration);
    expect(updates.at(-1)).toEqual([0.5, 0]);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('retarget can switch springs', () => {
    const stiff = motionSchemes.expressive['fast-effects'];
    const { animation, updates } = record();
    frame(0);
    frame(40);
    const at40 = { value: animation.value, velocity: animation.velocity };
    animation.retarget(2, stiff);
    frame(50);
    frame(60);
    expect(updates.at(-1)![0]).toBeCloseTo(stepSpring(stiff, at40, 2, 10).value, 12);
  });

  it('a retarget whose estimate is not positive ends on the next frame, at the target (as Compose)', () => {
    // Retargeting back to 0 while moving away from it at 55 thresholds/s, 1.26 thresholds out, on
    // fast effects: SpringEstimation gives −3ms, so playTime ≥ duration on the first frame.
    const stiff = motionSchemes.expressive['fast-effects'];
    const { animation, updates, onComplete } = record();
    frame(0);
    frame(40);
    expect(estimateDurationMs(stiff, animation.value / 0.1, animation.velocity / 0.1)).toBe(-3);
    animation.retarget(0, stiff);
    frame(50);
    expect(updates.at(-1)).toEqual([0, 0]);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  // Bug: estimateDurationMs returns NaN where Compose's Newton iteration hits a zero derivative —
  // critically damped (effects) springs started exactly one threshold out at rest (slow effects),
  // or ~1.3–1.4 thresholds out moving away at 30–45 thresholds/s (fast effects). Kotlin's
  // Double.toLong() maps NaN to 0, so Compose ends on the first frame; the port's Math.trunc keeps
  // NaN, `elapsed >= NaN` is never true and the rAF loop runs forever without onComplete.
  it.fails('a segment whose duration estimate is NaN still ends (Kotlin toLong: NaN → 0)', () => {
    const slowEffects = motionSchemes.expressive['slow-effects'];
    const { onComplete } = record({ spring: slowEffects, from: 0, to: 1, precision: 1 });
    frame(0);
    frame(1000);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('retarget after completion restarts the loop from rest at the old target', () => {
    const { animation, updates, onComplete } = record();
    frame(0);
    frame(297);
    expect(onComplete).toHaveBeenCalledTimes(1);
    animation.retarget(0);
    expect(queue.size).toBe(1);
    frame(1000);
    expect(updates.at(-1)).toEqual([1, 0]);
    frame(1016);
    expect(updates.at(-1)![0]).toBeCloseTo(stepSpring(loadingMorph, { value: 1, velocity: 0 }, 0, 16).value, 12);
  });

  it('finish() cancels the frame and jumps to the target; stop() halts without completing', () => {
    const a = record();
    frame(0);
    frame(30);
    a.animation.finish();
    expect(cancelled).toHaveLength(1);
    expect(a.updates.at(-1)).toEqual([1, 0]);
    expect(a.onComplete).toHaveBeenCalledTimes(1);
    expect(queue.size).toBe(0);

    const b = record();
    frame(100);
    frame(130);
    const value = b.animation.value;
    const count = b.updates.length;
    b.animation.stop();
    frame(146);
    expect(b.updates).toHaveLength(count);
    expect(b.animation.value).toBe(value);
    expect(b.onComplete).not.toHaveBeenCalled();
    expect(queue.size).toBe(0);
  });
});
