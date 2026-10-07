import { describe, expect, it } from 'vitest';
import { computeAnchorTarget, cubicBezier, PointerVelocityTracker, VelocityTracker1D } from './gesture.ts';

describe('VelocityTracker1D (Compose Lsq2)', () => {
  it('measures constant velocity exactly', () => {
    const t = new VelocityTracker1D();
    for (let i = 0; i <= 10; i++) t.addDataPoint(i * 8, i * 8 * 1.5); // 1.5 px/ms
    expect(t.calculateVelocity()).toBeCloseTo(1500, 3);
  });

  it('measures the slope at the newest sample of an accelerating pointer', () => {
    const t = new VelocityTracker1D();
    // x = t² / 100 (px, ms) → dx/dt at t = 80 is 1.6 px/ms.
    for (let i = 0; i <= 10; i++) t.addDataPoint(i * 8, (i * 8) ** 2 / 100);
    expect(t.calculateVelocity()).toBeCloseTo(1600, 1);
  });

  it('only uses the last 100ms, and stops at a gap over 40ms', () => {
    const t = new VelocityTracker1D();
    for (let i = 0; i <= 10; i++) t.addDataPoint(i * 8, 0); // still
    t.addDataPoint(200, 0); // 120ms gap: older samples are ignored → one sample → 0
    expect(t.calculateVelocity()).toBe(0);
    t.addDataPoint(208, 8);
    expect(t.calculateVelocity()).toBeCloseTo(1000, 3);
  });

  it('clamps to the maximum', () => {
    const t = new VelocityTracker1D();
    t.addDataPoint(0, 0);
    t.addDataPoint(1, 100);
    expect(t.calculateVelocity(8000)).toBe(8000);
  });
});

describe('PointerVelocityTracker', () => {
  it('resets when the pointer rested > 40ms before release', () => {
    const p = new PointerVelocityTracker();
    p.down({ timeStamp: 0, clientX: 0, clientY: 0 });
    for (let i = 1; i <= 6; i++) p.move({ timeStamp: i * 10, clientX: 0, clientY: i * 10 });
    expect(p.velocity().y).toBeCloseTo(1000, 3);
    p.up({ timeStamp: 60 + 41 });
    expect(p.velocity().y).toBe(0);
  });
});

describe('computeAnchorTarget (AnchoredDraggable.computeTarget)', () => {
  // A modal bottom sheet: Expanded at 0, Hidden at 400 (px offset down).
  const anchors = [0, 400];
  const pos = () => 56;
  const vel = 125;
  it('not moving: closest anchor', () => {
    expect(computeAnchorTarget(anchors, 150, 0, pos, vel)).toBe(0);
    expect(computeAnchorTarget(anchors, 250, 0, pos, vel)).toBe(400);
  });
  it('fast: next anchor in the fling direction', () => {
    expect(computeAnchorTarget(anchors, 10, 125, pos, vel)).toBe(400);
    expect(computeAnchorTarget(anchors, 390, -125, pos, vel)).toBe(0);
  });
  it('slow down: hides past 56px from Expanded, else returns', () => {
    expect(computeAnchorTarget(anchors, 56, 50, pos, vel)).toBe(400);
    expect(computeAnchorTarget(anchors, 55, 50, pos, vel)).toBe(0);
  });
  it('slow up: stays unless within 56px of Hidden', () => {
    expect(computeAnchorTarget(anchors, 300, -50, pos, vel)).toBe(0);
    expect(computeAnchorTarget(anchors, 345, -50, pos, vel)).toBe(400);
    expect(computeAnchorTarget(anchors, 343, -50, pos, vel)).toBe(0);
  });
});

describe('cubicBezier', () => {
  it('matches the endpoints and the linear case', () => {
    const e = cubicBezier(0.3, 0, 1, 1);
    expect(e(0)).toBe(0);
    expect(e(1)).toBe(1);
    expect(cubicBezier(0, 0, 1, 1)(0.37)).toBeCloseTo(0.37, 5);
  });
});
