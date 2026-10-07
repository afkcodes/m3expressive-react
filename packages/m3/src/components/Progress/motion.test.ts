import { describe, expect, it } from 'vitest';
import { estimateDurationMs, stepSpring } from '../../motion/spring.ts';
import {
  AMPLITUDE_DOWN,
  AMPLITUDE_UP,
  AmplitudeRamp,
  MORPH_PRECISION,
  MORPH_SPRING,
  TweenAnimator,
  WAVY_PROGRESS_TWEEN,
  circularIndeterminate,
  circularWaveAmplitude,
  cubicBezier,
  linearIndeterminate,
  linearWaveAmplitude,
} from './motion.ts';

describe('indeterminate motion (Compose material3 keyframes)', () => {
  it('circular: continuous rotation and sweep across 6s cycles; sweep spans 10%–87%', () => {
    let prev = circularIndeterminate(0);
    let lo = 1,
      hi = 0;
    for (let ms = 1; ms <= 12000; ms++) {
      const cur = circularIndeterminate(ms);
      const d = ((((cur.rotation - prev.rotation) % 360) + 540) % 360) - 180;
      expect(d).toBeGreaterThanOrEqual(0); // always turning clockwise
      expect(d).toBeLessThan(1);
      expect(Math.abs(cur.sweep - prev.sweep)).toBeLessThan(0.002);
      lo = Math.min(lo, cur.sweep);
      hi = Math.max(hi, cur.sweep);
      prev = cur;
    }
    expect(lo).toBeCloseTo(0.1, 3);
    expect(hi).toBeCloseTo(0.87, 3);
    // MDC: global 54° + the first 90° spin, Standard-eased over 500ms (Standard(0.6) of the way).
    expect(circularIndeterminate(300).rotation).toBeGreaterThan(54 + 90 * 0.8);
    expect(circularIndeterminate(500).rotation).toBeCloseTo(90 + 90, 6);
    // Both halves on Standard easing (m3.material.io spec video): half the growth by ~0.6s.
    expect(circularIndeterminate(600).sweep).toBeGreaterThan(0.1 + 0.77 * 0.4);
    expect(circularIndeterminate(3600).sweep).toBeLessThan(0.87 - 0.77 * 0.4);
  });

  it('linear: line windows and continuity', () => {
    expect(linearIndeterminate(0)).toEqual([
      [0, 0],
      [0, 0],
    ]);
    const [l1, l2] = linearIndeterminate(1000);
    expect(l1![1]).toBe(1);
    expect(l2![0]).toBeGreaterThan(0);
    expect(linearIndeterminate(1749)[1]![0]).toBeGreaterThan(0.99);
    let prev = linearIndeterminate(0);
    for (let ms = 1; ms < 1750; ms++) {
      const cur = linearIndeterminate(ms);
      cur.forEach(([a, b], i) => {
        expect(Math.abs(a - prev[i]![0])).toBeLessThan(0.01);
        expect(Math.abs(b - prev[i]![1])).toBeLessThan(0.01);
      });
      prev = cur;
    }
  });
});

describe('determinate motion (Compose wavy indicators)', () => {
  it('wavy value change: tween(500, linear); a new target restarts a full tween from the current value', () => {
    const a = new TweenAnimator(0.3);
    a.to(0.8, WAVY_PROGRESS_TWEEN);
    expect(a.tick(1000)).toBeCloseTo(0.3, 9); // the clock starts on the first frame
    expect(a.tick(1250)).toBeCloseTo(0.55, 9);
    a.to(0.2, WAVY_PROGRESS_TWEEN, 1250);
    expect(a.tick(1250)).toBeCloseTo(0.55, 9);
    expect(a.tick(1500)).toBeCloseTo(0.375, 9);
    expect(a.tick(1750)).toBe(0.2);
    expect(a.running).toBe(false);
  });

  it('amplitude: flat at ≤10% / ≥95% (linear); circular only below 10% (the kit draws 10% and 100% wavy)', () => {
    expect([0, 0.1, 0.11, 0.94, 0.95, 1].map(linearWaveAmplitude)).toEqual([0, 0, 1, 1, 0, 0]);
    expect([0, 0.09, 0.1, 0.95, 1].map(circularWaveAmplitude)).toEqual([0, 0, 1, 1, 1]);
  });

  it('amplitude ramp: 500ms Standard up / EmphasizedAccelerate down; a running ramp is not retargeted', () => {
    expect(AMPLITUDE_UP.easing).toBeTypeOf('function');
    const standard = cubicBezier(0.2, 0, 0, 1);
    const accel = cubicBezier(0.3, 0, 0.8, 0.15);
    const r = new AmplitudeRamp(0);
    r.setTarget(1);
    expect(r.tick(0)).toBe(0);
    expect(r.tick(250)).toBeCloseTo(standard(0.5), 9);
    r.setTarget(0); // ignored until the ramp up completes
    expect(r.tick(400)).toBeCloseTo(standard(0.8), 9);
    expect(r.tick(500)).toBe(1); // completes, then the pending target starts a ramp down
    expect(r.running).toBe(true);
    expect(r.tick(750)).toBeCloseTo(1 - accel(0.5), 9);
    expect(r.tick(1000)).toBe(0);
    expect(r.running).toBe(false);
    expect(AMPLITUDE_DOWN.duration).toBe(500);
  });
});

describe('loading indicator morph (Compose spring(0.6, 200), visibility threshold 0.1)', () => {
  it('peaks ≈1.09 near 278ms and ends (snaps) at ≈297ms, still mid overshoot', () => {
    let peak = 0;
    let at = 0;
    for (let ms = 0; ms <= 600; ms += 0.5) {
      const v = stepSpring(MORPH_SPRING, { value: 0, velocity: 0 }, 1, ms).value;
      if (v > peak) [peak, at] = [v, ms];
    }
    expect(peak).toBeCloseTo(1.0948, 3);
    expect(at).toBeGreaterThan(275);
    expect(at).toBeLessThan(281);
    const end = estimateDurationMs(MORPH_SPRING, -1 / MORPH_PRECISION, 0);
    expect(end).toBeGreaterThanOrEqual(295);
    expect(end).toBeLessThanOrEqual(299);
    expect(stepSpring(MORPH_SPRING, { value: 0, velocity: 0 }, 1, end).value).toBeGreaterThan(1.08);
  });
});
