/*
 * Swipe helpers for SwipeableListItem, on the shared Compose ports in motion/gesture.ts:
 *   VelocityTracker1D — compose ui VelocityTracker1D (Strategy.Lsq2): 20-sample history, 100ms
 *     horizon, a gap over 40ms means the pointer stopped; velocity = the slope at the newest sample
 *     of a least-squares quadratic. This wrapper adds the newest sample's time.
 *   fastOutSlowIn — FastOutSlowInEasing, CubicBezierEasing(0.4, 0, 0.2, 1).
 */
import { VelocityTracker1D as ComposeVelocityTracker1D } from '../../motion/gesture.ts';

export { fastOutSlowIn } from '../../motion/gesture.ts';

export class VelocityTracker1D {
  private readonly tracker = new ComposeVelocityTracker1D();
  private newest = -Infinity;

  reset() {
    this.tracker.reset();
    this.newest = -Infinity;
  }

  /** A position (px) at a time (ms). */
  add(timeMs: number, value: number) {
    this.tracker.addDataPoint(timeMs, value);
    this.newest = timeMs;
  }

  /** Time (ms) of the newest sample (−∞ when empty). */
  lastTime(): number {
    return this.newest;
  }

  /** px/s at the newest sample (0 when it can't be estimated). */
  velocity(): number {
    return this.tracker.calculateVelocity();
  }
}
