/**
 * Progress indicator geometry, reverse-engineered from the kit's "Loading & progress" page
 * (sets 58005:7997 / 8284 / 8459 / 8525). Pure functions → SVG path data; the components only
 * animate the inputs.
 *
 * Linear: an active line (round caps) followed by a track piece (rounded rect) and a 4×4 stop dot.
 *   - The active is a centre line from `pad` (= thickness / 2, so it starts flush with the edge).
 *   - Track pieces start 4px (Compose TrackActiveSpace) after an active's round cap, and end 4px
 *     before the next one's.
 *   - Figma resizes the line and track vectors inside instances to whole pixels; we round the same
 *     lengths so caps, gaps and the stop land on the kit's subpixels.
 *   - The wave is the kit's segment, a polyline M0 6 L10 12 L30 0 L40 6 with corner radius 24 that
 *     Figma clamps into two circular arcs per wavelength.
 * Circular: an arc (or a 9-point rounded star, for the wave) from `start` to `end` (degrees,
 *   clockwise from 12 o'clock), and a track arc after a gap at each end.
 */

export type ProgressType = 'flat' | 'wave';
export type ProgressThickness = 4 | 8;

const rad = (deg: number) => (deg * Math.PI) / 180;
const f = (n: number) => +n.toFixed(3);

/* ------------------------------------------------------------------ linear */

export const linearHeight = (type: ProgressType, t: ProgressThickness) => (type === 'wave' && t === 8 ? 14 : 12);
/** Visible space between the active indicator and the track (Compose TrackActiveSpace). */
export const TRACK_ACTIVE_SPACE = 4;
const STOP = 4;
const stopInset = (t: ProgressThickness) => (t === 4 ? 4 : 6);

/** Arc geometry of one half-wavelength (the Figma segment's clamped corner). */
export function waveArc(wavelength: number) {
  const q = wavelength / 4;
  const phi = Math.atan2(6, q); // segment polyline: 6px rise over a quarter wavelength
  const r = q / Math.sin(phi);
  return { r, sag: r * (1 - Math.cos(phi)) };
}

/**
 * Centre line of the wave from x0 to x1. `phase` (px) is x0's offset into the wave; at phase 0
 * the first half-wave bulges down from x0 (as the kit's segments do). `amp` 0…1 flattens it.
 */
export function wavePath(x0: number, x1: number, cy: number, wavelength: number, phase: number, amp: number): string {
  if (x1 - x0 < 1e-3) return `M${f(x0)} ${f(cy)}h0`;
  const half = wavelength / 2;
  const sag = waveArc(wavelength).sag * amp;
  if (sag < 0.01) return `M${f(x0)} ${f(cy)}H${f(x1)}`;
  const r = (half * half) / 4 / (2 * sag) + sag / 2;
  // Half-wave i spans [x0 − p + i·half, … + half]; even i bulges down. x0 lies in i = ⌊p / half⌋.
  const p = ((phase % wavelength) + wavelength) % wavelength;
  const startOf = (i: number) => x0 - p + i * half;
  const yAt = (i: number, x: number) => {
    const d = Math.sqrt(Math.max(0, r * r - (x - startOf(i) - half / 2) ** 2)) - (r - sag);
    return cy + (i % 2 === 0 ? d : -d);
  };
  let k = Math.floor(p / half);
  let d = `M${f(x0)} ${f(yAt(k, x0))}`;
  for (;;) {
    const end = Math.min(startOf(k + 1), x1);
    d += `A${f(r)} ${f(r)} 0 0 ${k % 2 === 0 ? 0 : 1} ${f(end)} ${f(yAt(k, end))}`;
    if (end >= x1) return d;
    k++;
  }
}

export interface LinearSpec {
  width: number;
  thickness: ProgressThickness;
  type: ProgressType;
  /** Active segments as centre-line frames [start, end] (px). Empty = no active indicator. */
  actives: readonly (readonly [number, number])[];
  /** Determinate only: the stop dot at the end of the last track piece. */
  stop: boolean;
  wavelength: number;
  /** x (px) where a downward half-wave starts: the wave is anchored to the track, not to the
   *  moving segments, and travels by moving this origin. */
  waveOrigin: number;
  /** Wave amplitude 0…1 (0 draws the flat line). */
  amp: number;
  /** Whole-px line and track lengths, as Figma draws its still frames. Off while moving (the
   *  1px steps would make the gaps flicker). */
  snap: boolean;
  /** Visible active ↔ track space (default 4; Compose shrinks it while a line enters). */
  gap?: number;
}

export interface LinearShapes {
  height: number;
  cy: number;
  active: string[];
  tracks: { x: number; width: number }[];
  stop: { x: number } | null;
}

export function linearShapes(s: LinearSpec): LinearShapes {
  const { width: W, thickness: t } = s;
  const height = linearHeight(s.type, t);
  const cy = height / 2;
  // Centre-line end → track edge: the cap plus the visible space (6 / 8px at the kit's 4 / 8dp).
  const gap = t / 2 + (s.gap ?? TRACK_ACTIVE_SPACE);
  const active: string[] = [];
  const tracks: { x: number; width: number }[] = [];
  let cursor = 0;
  const len = (n: number) => (s.snap ? Math.round(n) : n);
  for (const [a, b] of s.actives) {
    if (b - a <= 0) continue; // a line that hasn't entered (Compose draws nothing)
    const end = a + len(b - a);
    const tw = len(a - gap - cursor);
    if (tw > 0) tracks.push({ x: cursor, width: tw });
    active.push(
      s.type === 'wave' && s.amp > 0
        ? wavePath(a, end, cy, s.wavelength, a - s.waveOrigin, s.amp)
        : `M${f(a)} ${f(cy)}H${f(end)}`,
    );
    cursor = b + gap;
  }
  const tw = len(W - cursor);
  let stop: { x: number } | null = null;
  if (tw > 0) {
    tracks.push({ x: cursor, width: tw });
    if (s.stop && tw >= STOP) stop = { x: cursor + tw - stopInset(t) };
  }
  return { height, cy, active, tracks, stop };
}

/** Determinate active frame: L = p·(W − 8) flat, p·(W − 4) wavy (the kit's two formulas). */
export function linearDeterminate(width: number, t: ProgressThickness, value: number, amp: number) {
  const pad = t / 2;
  if (value <= 0) return [] as [number, number][];
  if (value >= 1) return [[pad, width - pad]] as [number, number][];
  return [[pad, pad + value * (width - 8 + 4 * amp)]] as [number, number][];
}

/* ---------------------------------------------------------------- circular */

/**
 * Per type × thickness, the kit's keyframes at its samples (0 / 10 / 30 / 50 / 80 / 100%): the
 * active end and the track start (degrees). The kit draws arc lengths and gaps by eye, so they are
 * keyframes rather than a formula; we interpolate linearly between them. The active always starts
 * at `start`, the track always ends at `trackEnd`. The track never comes closer to the active end
 * than the kit's smallest gap.
 */
export const CIRCULAR = {
  flat: {
    4: { size: 40, start: 5, trackEnd: 340, ends: [5, 55, 85, 175, 295, 365], tracks: [30, 80, 110, 200, 320, 340] },
    8: { size: 44, start: 10, trackEnd: 330, ends: [10, 35, 90, 165, 285, 370], tracks: [50, 75, 130, 205, 327.5, 330] },
  },
  wave: {
    4: { size: 48, start: 7.6, trackEnd: 345, ends: [7.6, 62.46, 102.57, 184.18, 302.53, 367.6], tracks: [30.2, 85, 125, 204.92, 325.09, 345] },
    8: { size: 52, start: 7.6, trackEnd: 335, ends: [7.6, 62.46, 102.57, 184.18, 302.53, 367.6], tracks: [40.2, 95, 135, 215, 334.38, 335] },
  },
} as const;
const SAMPLES = [0, 0.1, 0.3, 0.5, 0.8, 1];

function keyframe(values: readonly number[], v: number) {
  let i = 1;
  while (i < SAMPLES.length - 1 && v > SAMPLES[i]!) i++;
  const u = (v - SAMPLES[i - 1]!) / (SAMPLES[i]! - SAMPLES[i - 1]!);
  return values[i - 1]! + u * (values[i]! - values[i - 1]!);
}

export interface CircularFrame {
  start: number;
  end: number;
  trackStart: number;
  trackEnd: number;
}

/** Arc angles for a determinate value 0…1 (null at 0: the full track ring). */
export function circularFrame(type: ProgressType, t: ProgressThickness, value: number): CircularFrame | null {
  const k = CIRCULAR[type][t];
  if (value <= 0) return null;
  if (value >= 1) return { start: k.start, end: k.start + 360, trackStart: k.trackEnd, trackEnd: k.trackEnd };
  const end = keyframe(k.ends, value);
  const minGap = Math.min(...k.tracks.slice(1, 5).map((tr, i) => tr - k.ends[i + 1]!));
  return { start: k.start, end, trackStart: Math.max(keyframe(k.tracks, value), end + minGap), trackEnd: k.trackEnd };
}

const polar = (r: number, deg: number, c: number): [number, number] => [c + r * Math.sin(rad(deg)), c - r * Math.cos(rad(deg))];

/** Arc of radius r from a0 to a1 (degrees, clockwise from top), centred at (c, c). */
export function arcPath(r: number, a0: number, a1: number, c: number): string {
  const sweep = a1 - a0;
  if (sweep >= 360 - 1e-6) {
    const [x, y] = polar(r, a0, c);
    const [x2, y2] = polar(r, a0 + 180, c);
    return `M${f(x)} ${f(y)}A${r} ${r} 0 1 1 ${f(x2)} ${f(y2)}A${r} ${r} 0 1 1 ${f(x)} ${f(y)}Z`;
  }
  const [x0, y0] = polar(r, a0, c);
  const [x1, y1] = polar(r, a1, c);
  return `M${f(x0)} ${f(y0)}A${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${f(x1)} ${f(y1)}`;
}

/* The wavy active is a 9-point star with every corner rounded by a 4.793px circular arc (Figma's
 * corner radius), fitted to the kit's outlines to 0.001px rms: outer vertices 25.1685, inner
 * 18.1555. The flat track ring sits on the wave crests (radius ≈ 22.08). */
const STAR = { points: 9, outer: 25.1685, inner: 18.1555, rho: 4.793 };

type Prim =
  | { kind: 'arc'; c: [number, number]; r: number; a: [number, number]; b: [number, number]; cw: boolean }
  | { kind: 'line'; a: [number, number]; b: [number, number] };

function starPrims(phase: number): Prim[] {
  const n = STAR.points * 2;
  const V: [number, number][] = [];
  for (let k = 0; k < n; k++) {
    const a = rad(phase + (k * 180) / STAR.points);
    const r = k % 2 === 0 ? STAR.outer : STAR.inner;
    V.push([r * Math.sin(a), -r * Math.cos(a)]);
  }
  const corners = V.map((P, k) => {
    const A = V[(k + n - 1) % n]!, B = V[(k + 1) % n]!;
    const u = norm([A[0] - P[0], A[1] - P[1]]), w = norm([B[0] - P[0], B[1] - P[1]]);
    const th = Math.acos(Math.max(-1, Math.min(1, u[0] * w[0] + u[1] * w[1])));
    const tl = STAR.rho / Math.tan(th / 2);
    const bis = norm([u[0] + w[0], u[1] + w[1]]);
    const dc = STAR.rho / Math.sin(th / 2);
    const c: [number, number] = [P[0] + bis[0] * dc, P[1] + bis[1] * dc];
    const a: [number, number] = [P[0] + u[0] * tl, P[1] + u[1] * tl];
    const b: [number, number] = [P[0] + w[0] * tl, P[1] + w[1] * tl];
    const cw = (a[0] - c[0]) * (b[1] - c[1]) - (a[1] - c[1]) * (b[0] - c[0]) > 0;
    return { kind: 'arc' as const, c, r: STAR.rho, a, b, cw };
  });
  const out: Prim[] = [];
  for (let k = 0; k < n; k++) {
    out.push(corners[k]!, { kind: 'line', a: corners[k]!.b, b: corners[(k + 1) % n]!.a });
  }
  return out;
}
function norm(v: [number, number]): [number, number] {
  const l = Math.hypot(v[0], v[1]);
  return [v[0] / l, v[1] / l];
}
const angleOf = (p: [number, number]) => (((Math.atan2(p[0], -p[1]) * 180) / Math.PI) % 360 + 360) % 360;

/** Crest radius of the star (where the flat track ring sits). */
export const STAR_CREST = (() => {
  const prims = starPrims(0);
  const arc = prims[0] as Extract<Prim, { kind: 'arc' }>;
  return Math.hypot(arc.c[0], arc.c[1]) + arc.r;
})();

/** Point where the ray at `deg` crosses primitive `p`, or null. */
function cross(p: Prim, deg: number): [number, number] | null {
  const u: [number, number] = [Math.sin(rad(deg)), -Math.cos(rad(deg))];
  if (p.kind === 'line') {
    const d: [number, number] = [p.b[0] - p.a[0], p.b[1] - p.a[1]];
    const den = u[0] * d[1] - u[1] * d[0];
    if (Math.abs(den) < 1e-12) return null;
    const s = (p.a[0] * d[1] - p.a[1] * d[0]) / den; // along ray
    const q = (p.a[0] * u[1] - p.a[1] * u[0]) / den; // along segment
    return s > 0 && q >= -1e-9 && q <= 1 + 1e-9 ? [u[0] * s, u[1] * s] : null;
  }
  const uc = u[0] * p.c[0] + u[1] * p.c[1];
  const disc = uc * uc - (p.c[0] ** 2 + p.c[1] ** 2) + p.r * p.r;
  if (disc < 0) return null;
  for (const s of [uc + Math.sqrt(disc), uc - Math.sqrt(disc)]) {
    const pt: [number, number] = [u[0] * s, u[1] * s];
    if (s > 0 && onArc(p, pt)) return pt;
  }
  return null;
}
function onArc(p: Extract<Prim, { kind: 'arc' }>, pt: [number, number]) {
  const cr = (x: [number, number], y: [number, number]) => x[0] * y[1] - x[1] * y[0];
  const a: [number, number] = [p.a[0] - p.c[0], p.a[1] - p.c[1]];
  const b: [number, number] = [p.b[0] - p.c[0], p.b[1] - p.c[1]];
  const v: [number, number] = [pt[0] - p.c[0], pt[1] - p.c[1]];
  const s = cr(a, b);
  return cr(a, v) * s >= -1e-9 && cr(v, b) * s >= -1e-9 && v[0] * (a[0] + b[0]) + v[1] * (a[1] + b[1]) >= 0;
}

/**
 * The star's centre line between polar angles a0 → a1 (clockwise, degrees from top), centred at
 * (c, c). `phase` rotates the star under fixed endpoints (the wave's travel).
 */
export function starPath(a0: number, a1: number, phase: number, c: number): string {
  const prims = starPrims(phase);
  const P = (q: [number, number]) => `${f(q[0] + c)} ${f(q[1] + c)}`;
  const seg = (p: Prim, to: [number, number]) => (p.kind === 'line' ? `L${P(to)}` : `A${p.r} ${p.r} 0 0 ${p.cw ? 1 : 0} ${P(to)}`);
  if (a1 - a0 >= 360 - 1e-6) {
    let d = `M${P(prims[prims.length - 1]!.b)}`;
    for (const p of prims) d += seg(p, p.b);
    return d + 'Z';
  }
  // Order primitives clockwise starting from the one containing a0.
  const span = (p: Prim) => [angleOf(p.a), angleOf(p.b)] as const;
  const within = (deg: number, [s, e]: readonly [number, number]) => {
    const len = (e - s + 360) % 360;
    return (deg - s + 360) % 360 <= len + 1e-9;
  };
  const norm0 = ((a0 % 360) + 360) % 360;
  let i = prims.findIndex((p) => within(norm0, span(p)));
  const start = cross(prims[i]!, norm0)!;
  let d = `M${P(start)}`;
  let remaining = a1 - a0;
  let at = norm0;
  for (let guard = 0; guard < prims.length * 2 + 2; guard++) {
    const p = prims[i]!;
    const [, e] = span(p);
    const toEnd = (e - at + 360) % 360;
    if (remaining <= toEnd + 1e-9) {
      d += seg(p, cross(p, at + remaining) ?? p.b);
      return d;
    }
    d += seg(p, p.b);
    remaining -= toEnd;
    at = e;
    i = (i + 1) % prims.length;
  }
  return d;
}

export interface CircularShapes {
  size: number;
  c: number;
  /** null = no active (0%). */
  active: string | null;
  track: string | null;
}

/** `frame` null = full track ring. `rotation` turns the whole drawing; `phase` turns the wave. */
export function circularShapes(
  type: ProgressType,
  t: ProgressThickness,
  frame: CircularFrame | null,
  rotation: number,
  phase: number,
): CircularShapes {
  const { size } = CIRCULAR[type][t];
  const c = size / 2;
  const trackR = type === 'wave' ? STAR_CREST : (size - t) / 2;
  if (!frame) return { size, c, active: null, track: arcPath(trackR, 0, 360, c) };
  const a0 = frame.start + rotation;
  const a1 = frame.end + rotation;
  const full = frame.end - frame.start >= 360 - 1e-6;
  const active = type === 'wave' ? starPath(a0, a1, phase, c) : arcPath(trackR, a0, full ? a0 + 360 : a1, c);
  const track = !full && frame.trackEnd - frame.trackStart > 1e-3 ? arcPath(trackR, frame.trackStart + rotation, frame.trackEnd + rotation, c) : null;
  return { size, c, active, track };
}
