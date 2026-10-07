/*
 * Gesture helpers ported from Compose (androidx-main):
 *   VelocityTracker1D — compose/ui/ui/.../input/pointer/util/VelocityTracker.kt (Strategy.Lsq2,
 *     the default for positions): 20-sample history, 100ms horizon, a gap over 40ms means the
 *     pointer stopped; velocity = the slope at the newest sample of a least-squares quadratic.
 *   fastOutSlowIn — FastOutSlowInEasing, CubicBezierEasing(0.4, 0, 0.2, 1).
 */
const HISTORY_SIZE = 20;
const HORIZON_MS = 100;
const ASSUME_STOPPED_MS = 40;
const MIN_SAMPLES = 2;

export class VelocityTracker1D {
  private times: number[] = [];
  private values: number[] = [];

  reset() {
    this.times = [];
    this.values = [];
  }

  /** A position (px) at a time (ms). */
  add(timeMs: number, value: number) {
    this.times.push(timeMs);
    this.values.push(value);
    if (this.times.length > HISTORY_SIZE) {
      this.times.shift();
      this.values.shift();
    }
  }

  /** Time (ms) of the newest sample (−∞ when empty). */
  lastTime(): number {
    return this.times.at(-1) ?? -Infinity;
  }

  /** px/s at the newest sample (0 when it can't be estimated). */
  velocity(): number {
    const n = this.times.length;
    if (n === 0) return 0;
    const newest = this.times[n - 1]!;
    const x: number[] = [];
    const y: number[] = [];
    let previous = newest;
    for (let i = n - 1; i >= 0; i--) {
      const t = this.times[i]!;
      const age = newest - t;
      const gap = Math.abs(t - previous);
      previous = t;
      if (age > HORIZON_MS || gap > ASSUME_STOPPED_MS) break;
      x.push(-age);
      y.push(this.values[i]!);
    }
    if (x.length < MIN_SAMPLES) return 0;
    const v = polyFitLeastSquares(x, y, 2)[1] ?? 0;
    return Number.isFinite(v) ? v * 1000 : 0;
  }
}

/** Least-squares polynomial fit by Gram-Schmidt QR (VelocityTracker.kt polyFitLeastSquares). */
function polyFitLeastSquares(x: number[], y: number[], degree: number): number[] {
  const m = x.length;
  const n = Math.min(degree, m - 1) + 1;
  const a: number[][] = Array.from({ length: n }, () => new Array<number>(m).fill(0));
  for (let h = 0; h < m; h++) {
    a[0]![h] = 1;
    for (let i = 1; i < n; i++) a[i]![h] = a[i - 1]![h]! * x[h]!;
  }
  const dot = (p: number[], q: number[]) => p.reduce((sum, v, i) => sum + v * q[i]!, 0);
  const q: number[][] = [];
  const r: number[][] = [];
  for (let j = 0; j < n; j++) {
    const w = a[j]!.slice();
    for (let i = 0; i < j; i++) {
      const d = dot(w, q[i]!);
      for (let h = 0; h < m; h++) w[h]! -= d * q[i]![h]!;
    }
    const inv = 1 / Math.max(Math.sqrt(dot(w, w)), 1e-6);
    for (let h = 0; h < m; h++) w[h]! *= inv;
    q.push(w);
    r.push(Array.from({ length: n }, (_, i) => (i < j ? 0 : dot(w, a[i]!))));
  }
  const coefficients = new Array<number>(degree + 1).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let c = dot(q[i]!, y);
    for (let j = n - 1; j > i; j--) c -= r[i]![j]! * coefficients[j]!;
    coefficients[i] = c / r[i]![i]!;
  }
  return coefficients;
}

/** FastOutSlowInEasing: cubic-bezier(0.4, 0, 0.2, 1). */
export function fastOutSlowIn(p: number): number {
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  const bx = (t: number) => 3 * 0.4 * t * (1 - t) ** 2 + 3 * 0.2 * t * t * (1 - t) + t ** 3;
  const by = (t: number) => 3 * t * t * (1 - t) + t ** 3;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (bx(mid) < p) lo = mid;
    else hi = mid;
  }
  return by((lo + hi) / 2);
}
