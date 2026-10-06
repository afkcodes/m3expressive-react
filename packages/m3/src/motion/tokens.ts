import type { SpringParams } from './spring.ts';

/**
 * M3 motion physics tokens — `md.sys.motion.spring.{speed}.{type}`.
 *
 * Source: androidx compose/material3 tokens v0_14_0
 * (ExpressiveMotionTokens.kt / StandardMotionTokens.kt), cross-checked against
 * https://m3.material.io/styles/motion/overview/specs (2026-10-06).
 *
 * Spatial = position, size, rotation, corner radius (may overshoot).
 * Effects = color, opacity (never overshoots; dampingRatio is always 1).
 */
export type MotionSchemeName = 'expressive' | 'standard';
export type SpringSpeed = 'fast' | 'default' | 'slow';
export type SpringType = 'spatial' | 'effects';
export type SpringToken = `${SpringSpeed}-${SpringType}`;

export type MotionScheme = Readonly<Record<SpringToken, SpringParams>>;

export const motionSchemes = {
  expressive: {
    'fast-spatial': { dampingRatio: 0.6, stiffness: 800 },
    'default-spatial': { dampingRatio: 0.8, stiffness: 380 },
    'slow-spatial': { dampingRatio: 0.8, stiffness: 200 },
    'fast-effects': { dampingRatio: 1, stiffness: 3800 },
    'default-effects': { dampingRatio: 1, stiffness: 1600 },
    'slow-effects': { dampingRatio: 1, stiffness: 800 },
  },
  standard: {
    'fast-spatial': { dampingRatio: 0.9, stiffness: 1400 },
    'default-spatial': { dampingRatio: 0.9, stiffness: 700 },
    'slow-spatial': { dampingRatio: 0.9, stiffness: 300 },
    'fast-effects': { dampingRatio: 1, stiffness: 3800 },
    'default-effects': { dampingRatio: 1, stiffness: 1600 },
    'slow-effects': { dampingRatio: 1, stiffness: 800 },
  },
} as const satisfies Record<MotionSchemeName, MotionScheme>;

/**
 * Google's official cubic-bezier approximations for web ("Web: Convert springs
 * to curves"). Kept for parity/fallback; the generated `linear()` easings are
 * the exact springs and are what components use.
 */
export const officialWebCurves = {
  expressive: {
    'fast-spatial': { bezier: [0.42, 1.67, 0.21, 0.9], durationMs: 350 },
    'default-spatial': { bezier: [0.38, 1.21, 0.22, 1.0], durationMs: 500 },
    'slow-spatial': { bezier: [0.39, 1.29, 0.35, 0.98], durationMs: 650 },
    'fast-effects': { bezier: [0.31, 0.94, 0.34, 1.0], durationMs: 150 },
    'default-effects': { bezier: [0.34, 0.8, 0.34, 1.0], durationMs: 200 },
    'slow-effects': { bezier: [0.34, 0.88, 0.34, 1.0], durationMs: 300 },
  },
  standard: {
    'fast-spatial': { bezier: [0.27, 1.06, 0.18, 1.0], durationMs: 350 },
    'default-spatial': { bezier: [0.27, 1.06, 0.18, 1.0], durationMs: 500 },
    'slow-spatial': { bezier: [0.27, 1.06, 0.18, 1.0], durationMs: 750 },
    'fast-effects': { bezier: [0.31, 0.94, 0.34, 1.0], durationMs: 150 },
    'default-effects': { bezier: [0.34, 0.8, 0.34, 1.0], durationMs: 200 },
    'slow-effects': { bezier: [0.34, 0.88, 0.34, 1.0], durationMs: 300 },
  },
} as const;
