import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { estimateDurationMs, sampleSpring, settleTimeMs, springToLinear, stepSpring } from './spring.ts';
import { motionSchemes, officialWebCurves, type SpringToken } from './tokens.ts';

const tokens = Object.keys(motionSchemes.expressive) as SpringToken[];
const value = (p: (typeof motionSchemes)['expressive'][SpringToken], ms: number) =>
  stepSpring(p, { value: 0, velocity: 0 }, 1, ms).value;

/** Evaluate a CSS linear() easing string at progress t. */
function evalLinear(easing: string, t: number): number {
  const stops = easing
    .slice('linear('.length, -1)
    .split(',')
    .map((s, i, all) => {
      const [v, pct] = s.trim().split(' ');
      return [pct ? parseFloat(pct) / 100 : i === 0 ? 0 : i === all.length - 1 ? 1 : NaN, parseFloat(v!)] as const;
    });
  for (let i = 1; i < stops.length; i++) {
    const [t0, v0] = stops[i - 1]!;
    const [t1, v1] = stops[i]!;
    if (t <= t1) return v0 + ((v1 - v0) * (t - t0)) / (t1 - t0);
  }
  return 1;
}

describe('stepSpring (Compose SpringSimulation port)', () => {
  it('is closed-form: two half steps equal one full step', () => {
    for (const scheme of Object.values(motionSchemes)) {
      for (const p of Object.values(scheme)) {
        const half = stepSpring(p, { value: 0, velocity: 0 }, 1, 40);
        const two = stepSpring(p, half, 1, 40);
        const one = stepSpring(p, { value: 0, velocity: 0 }, 1, 80);
        expect(two.value).toBeCloseTo(one.value, 10);
        expect(two.velocity).toBeCloseTo(one.velocity, 8);
      }
    }
  });

  it('matches the analytic critically-damped solution', () => {
    const p = motionSchemes.expressive['default-effects'];
    const w = Math.sqrt(p.stiffness);
    for (const ms of [10, 50, 120]) {
      const t = ms / 1000;
      expect(value(p, ms)).toBeCloseTo(1 - (1 + w * t) * Math.exp(-w * t), 12);
    }
  });

  it('spatial springs overshoot, effects springs never do', () => {
    for (const scheme of Object.values(motionSchemes)) {
      for (const [token, p] of Object.entries(scheme)) {
        const peak = Math.max(...sampleSpring(p, 2000).map(([, v]) => v));
        // Spatial springs overshoot; effects springs (dampingRatio 1) never do.
        expect({ token, overshoots: peak > 1 }).toEqual({ token, overshoots: token.endsWith('spatial') });
      }
    }
  });

  it('expressive fast spatial overshoots by the theoretical exp(-πζ/√(1-ζ²))', () => {
    const { dampingRatio: z } = motionSchemes.expressive['fast-spatial'];
    const peak = Math.max(...sampleSpring(motionSchemes.expressive['fast-spatial'], 2000).map(([, v]) => v));
    expect(peak - 1).toBeCloseTo(Math.exp((-Math.PI * z) / Math.sqrt(1 - z * z)), 3);
  });
});

describe('CSS conversion', () => {
  it('settle times track the durations Google publishes for web (expressive, ±70ms)', () => {
    for (const t of tokens) {
      const ours = settleTimeMs(motionSchemes.expressive[t]);
      expect(Math.abs(ours - officialWebCurves.expressive[t].durationMs)).toBeLessThanOrEqual(70);
    }
  });

  it('linear() never deviates from the true spring by more than 0.1% of travel', () => {
    for (const scheme of Object.values(motionSchemes)) {
      for (const p of Object.values(scheme)) {
        const duration = settleTimeMs(p);
        const easing = springToLinear(p, duration);
        let maxErr = 0;
        for (let ms = 0; ms <= duration; ms++) {
          maxErr = Math.max(maxErr, Math.abs(evalLinear(easing, ms / duration) - value(p, ms)));
        }
        expect(maxErr).toBeLessThan(0.001);
      }
    }
  });

  it('generated motion.stylex.ts is in sync with tokens.ts (run `pnpm gen:motion`)', () => {
    const generated = readFileSync(new URL('../tokens/motion.stylex.ts', import.meta.url), 'utf8');
    for (const t of tokens) {
      const p = motionSchemes.expressive[t];
      expect(generated).toContain(springToLinear(p));
      expect(generated).toContain(`'${settleTimeMs(p)}ms'`);
    }
  });
});

describe('estimateDurationMs (Compose SpringEstimation port)', () => {
  it('ends the loading-indicator morph at 297 ms, inside its visible overshoot', () => {
    // LoadingIndicator: spring(0.6, 200, visibilityThreshold 0.1), progress 0 → 1.
    const ms = estimateDurationMs({ dampingRatio: 0.6, stiffness: 200 }, -1 / 0.1, 0);
    expect(ms).toBe(297);
    expect(stepSpring({ dampingRatio: 0.6, stiffness: 200 }, { value: 0, velocity: 0 }, 1, ms).value).toBeGreaterThan(
      1.09,
    );
  });
  it('handles critically and over-damped springs and a spring already at rest', () => {
    expect(estimateDurationMs({ dampingRatio: 1, stiffness: 1600 }, -100, 0)).toBe(165);
    expect(estimateDurationMs({ dampingRatio: 1.2, stiffness: 400 }, -100, 0)).toBe(460);
    expect(estimateDurationMs({ dampingRatio: 0.8, stiffness: 380 }, 0, 0)).toBe(0);
  });
});
