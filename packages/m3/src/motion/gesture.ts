/**
 * Pointer-gesture physics shared by the sheets, carousel, date / time pickers, search and list
 * swipe — ported from Compose / Android, not approximated:
 *
 * - `VelocityTracker1D` / `PointerVelocityTracker`: compose ui `VelocityTracker1D` (Strategy.Lsq2)
 *   and `Lsq2VelocityTracker` (the non-framework tracker Compose uses on every platform):
 *   samples within a 100ms horizon, a gap > 40ms between samples means the pointer stopped, a
 *   2nd-degree least-squares fit whose slope at the newest sample is the velocity; an up event
 *   more than 40ms after the last move resets the tracker (b/238654963).
 * - `closestAnchor` / `computeAnchorTarget`: foundation `DefaultDraggableAnchors.closestAnchor`
 *   and `AnchoredDraggable.computeTarget`.
 * - Slops: Android `ViewConfiguration.TOUCH_SLOP` (8dp) and Compose's mouse slop
 *   (`pointerSlop`: touchSlop × 0.125dp / 18dp).
 */

const ASSUME_POINTER_MOVE_STOPPED_MS = 40;
const HISTORY_SIZE = 20;
const HORIZON_MS = 100;
/** `ComposeUiFlags.isVelocityTrackerMinSampleSizeFixEnabled` (true): Lsq2 needs 2 samples. */
const MIN_SAMPLE_SIZE = 2;

/** Android ViewConfiguration.TOUCH_SLOP, px (1dp = 1 CSS px). */
export const TOUCH_SLOP = 8;
/** Compose DragGestureDetector `pointerSlop(Mouse)`: touchSlop × (0.125dp / 18dp). */
export const MOUSE_SLOP = TOUCH_SLOP * (0.125 / 18);
/** Android ViewConfiguration.MAXIMUM_FLING_VELOCITY (8000dp/s) — Compose's maximumFlingVelocity. */
export const MAX_FLING_VELOCITY = 8000;
/** Android ViewConfiguration.MINIMUM_FLING_VELOCITY (50dp/s). */
export const MIN_FLING_VELOCITY = 50;

export const pointerSlop = (pointerType: string) => (pointerType === 'mouse' ? MOUSE_SLOP : TOUCH_SLOP);

/** compose ui `VelocityTracker1D` (non-differential, Strategy.Lsq2). Velocity in units / s. */
export class VelocityTracker1D {
  private readonly samples: ({ time: number; value: number } | null)[] = new Array(HISTORY_SIZE).fill(null);
  private index = 0;

  addDataPoint(timeMs: number, value: number) {
    this.index = (this.index + 1) % HISTORY_SIZE;
    this.samples[this.index] = { time: timeMs, value };
  }

  calculateVelocity(maximumVelocity = Infinity): number {
    const dataPoints: number[] = [];
    const time: number[] = [];
    let index = this.index;
    const newest = this.samples[index];
    if (!newest) return 0;
    let previous = newest;
    let sampleCount = 0;
    do {
      const sample = this.samples[index];
      if (!sample) break;
      const age = newest.time - sample.time;
      const delta = Math.abs(sample.time - previous.time);
      previous = sample; // Lsq2: consecutive samples
      if (age > HORIZON_MS || delta > ASSUME_POINTER_MOVE_STOPPED_MS) break;
      dataPoints.push(sample.value);
      time.push(-age);
      index = (index === 0 ? HISTORY_SIZE : index) - 1;
      sampleCount++;
    } while (sampleCount < HISTORY_SIZE);
    if (sampleCount < MIN_SAMPLE_SIZE) return 0;
    let v: number;
    try {
      v = polyFitLeastSquares(time, dataPoints, sampleCount, 2)[1]! * 1000;
    } catch {
      v = 0;
    }
    if (v === 0 || Number.isNaN(v)) return 0;
    return Math.max(-maximumVelocity, Math.min(maximumVelocity, v));
  }

  reset() {
    this.samples.fill(null);
    this.index = 0;
  }
}

/** compose ui `polyFitLeastSquares` (Gram-Schmidt QR, unit weights). */
export function polyFitLeastSquares(x: number[], y: number[], sampleCount: number, degree: number): number[] {
  if (degree < 1) throw new Error('The degree must be at positive integer');
  if (sampleCount === 0) throw new Error('At least one point must be provided');
  const truncatedDegree = degree >= sampleCount ? sampleCount - 1 : degree;
  const coefficients = new Array<number>(degree + 1).fill(0);
  const m = sampleCount;
  const n = truncatedDegree + 1;
  const a = Array.from({ length: n }, () => new Array<number>(m).fill(0));
  for (let h = 0; h < m; h++) {
    a[0]![h] = 1;
    for (let i = 1; i < n; i++) a[i]![h] = a[i - 1]![h]! * x[h]!;
  }
  const q = Array.from({ length: n }, () => new Array<number>(m).fill(0));
  const r = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  const dot = (u: number[], v: number[]) => u.reduce((acc, ui, i) => acc + ui * v[i]!, 0);
  for (let j = 0; j < n; j++) {
    const w = q[j]!;
    for (let h = 0; h < m; h++) w[h] = a[j]![h]!;
    for (let i = 0; i < j; i++) {
      const z = q[i]!;
      const d = dot(w, z);
      for (let h = 0; h < m; h++) w[h]! -= d * z[h]!;
    }
    const inverseNorm = 1 / Math.max(Math.sqrt(dot(w, w)), 1e-6);
    for (let h = 0; h < m; h++) w[h]! *= inverseNorm;
    const v = r[j]!;
    for (let i = 0; i < n; i++) v[i] = i < j ? 0 : dot(w, a[i]!);
  }
  for (let i = n - 1; i >= 0; i--) {
    let c = dot(q[i]!, y.slice(0, m));
    const ri = r[i]!;
    for (let j = n - 1; j > i; j--) c -= ri[j]! * coefficients[j]!;
    coefficients[i] = c / ri[i]!;
  }
  return coefficients;
}

/**
 * compose ui `Lsq2VelocityTracker` fed from DOM pointer events (coalesced events stand in for
 * Android's historical samples). Velocities in px / s.
 */
export class PointerVelocityTracker {
  private readonly x = new VelocityTracker1D();
  private readonly y = new VelocityTracker1D();
  private lastEventTime = 0;

  /** Pointer down: start over. */
  down(e: { timeStamp: number; clientX: number; clientY: number }) {
    this.reset();
    this.add(e.timeStamp, e.clientX, e.clientY);
    this.lastEventTime = e.timeStamp;
  }

  move(e: PointerEvent | { timeStamp: number; clientX: number; clientY: number }) {
    const coalesced =
      'getCoalescedEvents' in e && typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [];
    if (coalesced.length > 1) for (const c of coalesced) this.add(c.timeStamp, c.clientX, c.clientY);
    else this.add(e.timeStamp, e.clientX, e.clientY);
    this.lastEventTime = e.timeStamp;
  }

  /** Pointer up: the up position isn't a sample; a pause of > 40ms before it means no fling. */
  up(e: { timeStamp: number }) {
    if (e.timeStamp - this.lastEventTime > ASSUME_POINTER_MOVE_STOPPED_MS) this.reset();
    this.lastEventTime = e.timeStamp;
  }

  velocity(max = MAX_FLING_VELOCITY): { x: number; y: number } {
    return { x: this.x.calculateVelocity(max), y: this.y.calculateVelocity(max) };
  }

  reset() {
    this.x.reset();
    this.y.reset();
    this.lastEventTime = 0;
  }

  private add(time: number, x: number, y: number) {
    this.x.addDataPoint(time, x);
    this.y.addDataPoint(time, y);
  }
}

/** foundation `DefaultDraggableAnchors.closestAnchor` (returns the anchor position). */
export function closestAnchor(anchors: readonly number[], position: number, searchUpwards?: boolean): number {
  let best = Number.NaN;
  let min = Infinity;
  for (const anchor of anchors) {
    let distance: number;
    if (searchUpwards === undefined) distance = Math.abs(position - anchor);
    else {
      const delta = searchUpwards ? anchor - position : position - anchor;
      distance = delta < 0 ? Infinity : delta;
    }
    if (distance <= min) {
      best = anchor;
      min = distance;
    }
  }
  return best;
}

/**
 * foundation `AnchoredDraggable.computeTarget`: not moving → closest anchor; at least the velocity
 * threshold → the next anchor in the fling direction; slower → past the positional threshold
 * (measured from the anchor it moves away from) the next anchor, otherwise back.
 */
export function computeAnchorTarget(
  anchors: readonly number[],
  offset: number,
  velocity: number,
  positionalThreshold: (distance: number) => number,
  velocityThreshold: number,
): number {
  const isMoving = Math.abs(velocity) > 0;
  const isMovingForward = isMoving && velocity > 0;
  if (!isMoving) return closestAnchor(anchors, offset);
  if (Math.abs(velocity) >= Math.abs(velocityThreshold)) return closestAnchor(anchors, offset, isMovingForward);
  const left = closestAnchor(anchors, offset, false);
  const right = closestAnchor(anchors, offset, true);
  const distance = Math.abs(left - right);
  const relativeThreshold = Math.abs(positionalThreshold(distance));
  const closestAnchorFromStart = isMovingForward ? left : right;
  const relativePosition = Math.abs(closestAnchorFromStart - offset);
  return relativePosition >= relativeThreshold ? (isMovingForward ? right : left) : isMovingForward ? left : right;
}

/** A tween over `duration` ms through `easing` (rAF). Returns a cancel function. */
export function tween(opts: {
  from: number;
  to: number;
  duration: number;
  delay?: number;
  easing: (t: number) => number;
  onUpdate: (value: number) => void;
  onComplete?: () => void;
}): () => void {
  const { from, to, duration, delay = 0, easing, onUpdate, onComplete } = opts;
  let start: number | undefined;
  let frame = requestAnimationFrame(function tick(now) {
    start ??= now;
    const t = duration <= 0 ? 1 : Math.min(1, Math.max(0, (now - start - delay) / duration));
    onUpdate(from + (to - from) * easing(t));
    if (t < 1) frame = requestAnimationFrame(tick);
    else onComplete?.();
  });
  return () => cancelAnimationFrame(frame);
}

// The cubic-bezier solver and named curves live in easing.ts; re-exported for existing imports.
export { cubicBezier, fastOutSlowIn } from './easing.ts';

/**
 * After a drag, the browser still fires a click on the element under the pointer: swallow it
 * (Compose cancels a child's tap once a parent drag passes its slop).
 */
export function suppressNextClick() {
  const swallow = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    done();
  };
  const done = () => {
    window.removeEventListener('click', swallow, true);
    clearTimeout(timer);
  };
  window.addEventListener('click', swallow, true);
  const timer = setTimeout(done, 100);
}
