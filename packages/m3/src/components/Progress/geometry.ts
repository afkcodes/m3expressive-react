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
 * Circular: an arc (or a 9-point rounded star, for the wave — star.ts) from `start` to `end`
 *   (degrees, clockwise from 12 o'clock), and a track arc after a gap at each end.
 */

import { num, polar, rad } from './pathMath.ts';
import { STAR_CREST, blendedStarPath, starPath } from './star.ts';

export { STAR_CREST, blendedStarPath, starPath } from './star.ts';

export type ProgressType = 'flat' | 'wave';
export type ProgressThickness = 4 | 8;

/* ------------------------------------------------------------------ linear */

export const linearHeight = (type: ProgressType, thickness: ProgressThickness) =>
  type === 'wave' && thickness === 8 ? 14 : 12;
/** Visible space between the active indicator and the track (Compose TrackActiveSpace). */
export const TRACK_ACTIVE_SPACE = 4;
/** The stop dot's size, and its inset from the track's end (kit). */
const STOP_SIZE = 4;
const stopInset = (thickness: ProgressThickness) => (thickness === 4 ? 4 : 6);

/** Arc geometry of one half-wavelength (the Figma segment's clamped corner). */
export function waveArc(wavelength: number) {
  const quarter = wavelength / 4;
  const phi = Math.atan2(6, quarter); // segment polyline: 6px rise over a quarter wavelength
  const r = quarter / Math.sin(phi);
  return { r, sag: r * (1 - Math.cos(phi)) };
}

/**
 * Centre line of the wave from x0 to x1. `phase` (px) is x0's offset into the wave; at phase 0
 * the first half-wave bulges down from x0 (as the kit's segments do). `amp` 0…1 flattens it.
 */
export function wavePath(x0: number, x1: number, cy: number, wavelength: number, phase: number, amp: number): string {
  if (x1 - x0 < 1e-3) return `M${num(x0)} ${num(cy)}h0`;
  const half = wavelength / 2;
  const sag = waveArc(wavelength).sag * amp;
  if (sag < 0.01) return `M${num(x0)} ${num(cy)}H${num(x1)}`;
  const r = (half * half) / 4 / (2 * sag) + sag / 2;
  // Half-wave i spans [x0 − offset + i·half, … + half]; even i bulges down. x0 lies in
  // i = ⌊offset / half⌋.
  const offset = ((phase % wavelength) + wavelength) % wavelength;
  const startOf = (i: number) => x0 - offset + i * half;
  const yAt = (i: number, x: number) => {
    const dy = Math.sqrt(Math.max(0, r * r - (x - startOf(i) - half / 2) ** 2)) - (r - sag);
    return cy + (i % 2 === 0 ? dy : -dy);
  };
  let i = Math.floor(offset / half);
  let d = `M${num(x0)} ${num(yAt(i, x0))}`;
  for (;;) {
    const end = Math.min(startOf(i + 1), x1);
    d += `A${num(r)} ${num(r)} 0 0 ${i % 2 === 0 ? 0 : 1} ${num(end)} ${num(yAt(i, end))}`;
    if (end >= x1) return d;
    i++;
  }
}

export interface LinearSpec {
  width: number;
  thickness: ProgressThickness;
  type: ProgressType;
  /** Active segments as centre-line frames [start, end] (px). Empty = no active indicator. */
  actives: readonly (readonly [number, number])[];
  /** Determinate only: the stop dot at the end of the track. */
  stop: boolean;
  /**
   * Wavy stop (Compose internal_LinearWavyProgressModifiers `drawStopIndicator`): once the active
   * reaches the dot it shrinks from its start edge until gone. Flat (ProgressIndicator.kt) draws
   * it at a fixed size whatever the progress.
   */
  stopShrink?: boolean;
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
  /** Drawn above the active indicator (Compose draws it last). */
  stop: { x: number; size: number } | null;
}

export function linearShapes(spec: LinearSpec): LinearShapes {
  const { width, thickness } = spec;
  const height = linearHeight(spec.type, thickness);
  const cy = height / 2;
  // Centre-line end → track edge: the cap plus the visible space (6 / 8px at the kit's 4 / 8dp).
  const gap = thickness / 2 + (spec.gap ?? TRACK_ACTIVE_SPACE);
  const active: string[] = [];
  const tracks: { x: number; width: number }[] = [];
  let cursor = 0;
  let activeEnd = -Infinity; // visible end (cap included) of the last active
  const len = (n: number) => (spec.snap ? Math.round(n) : n);
  for (const [start, stop] of spec.actives) {
    if (stop - start <= 0) continue; // a line that hasn't entered (Compose draws nothing)
    const end = start + len(stop - start);
    const trackWidth = len(start - gap - cursor);
    if (trackWidth > 0) tracks.push({ x: cursor, width: trackWidth });
    active.push(
      spec.type === 'wave' && spec.amp > 0
        ? wavePath(start, end, cy, spec.wavelength, start - spec.waveOrigin, spec.amp)
        : `M${num(start)} ${num(cy)}H${num(end)}`,
    );
    cursor = stop + gap;
    activeEnd = end + thickness / 2;
  }
  const trackWidth = len(width - cursor);
  if (trackWidth > 0) tracks.push({ x: cursor, width: trackWidth });
  let stop: LinearShapes['stop'] = null;
  if (spec.stop) {
    // The dot sits `stopInset` before the track's end (Figma's whole-px track end in still frames).
    let x = (trackWidth > 0 ? cursor + trackWidth : width) - stopInset(thickness);
    let size = STOP_SIZE;
    if (spec.stopShrink) {
      if (activeEnd > x) {
        size = Math.max(0, size - (activeEnd - x));
        x = activeEnd;
      }
      if (size > 0) stop = { x, size };
    } else if (activeEnd < width) stop = { x, size }; // a full-width active covers it exactly
  }
  return { height, cy, active, tracks, stop };
}

/**
 * Visible active ↔ track space of a determinate indicator whose active centre line ends at
 * `head` (px from the start; the line starts at `pad`). Both grow from 0 as the value leaves 0:
 *   - flat (ProgressIndicator.kt LinearProgressIndicator): the track starts at
 *     p + min(p, gap + stroke) of the width, i.e. it overlaps the active until the head passes
 *     one stroke and the space reaches 4px at head = 4 + stroke;
 *   - wavy (internal_LinearWavyProgressModifiers `updateDrawPaths`): min(head − cap, 4).
 */
export function determinateTrackSpace(type: ProgressType, thickness: ProgressThickness, head: number) {
  return type === 'wave'
    ? Math.min(Math.max(0, head - thickness / 2), TRACK_ACTIVE_SPACE)
    : Math.min(head, TRACK_ACTIVE_SPACE + thickness) - thickness;
}

/** Determinate active frame: L = p·(W − 8) flat, p·(W − 4) wavy (the kit's two formulas). */
export function linearDeterminate(width: number, thickness: ProgressThickness, value: number, amp: number) {
  const pad = thickness / 2;
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
    8: {
      size: 44,
      start: 10,
      trackEnd: 330,
      ends: [10, 35, 90, 165, 285, 370],
      tracks: [50, 75, 130, 205, 327.5, 330],
    },
  },
  wave: {
    4: {
      size: 48,
      start: 7.6,
      trackEnd: 345,
      ends: [7.6, 62.46, 102.57, 184.18, 302.53, 367.6],
      tracks: [30.2, 85, 125, 204.92, 325.09, 345],
    },
    8: {
      size: 52,
      start: 7.6,
      trackEnd: 335,
      ends: [7.6, 62.46, 102.57, 184.18, 302.53, 367.6],
      tracks: [40.2, 95, 135, 215, 334.38, 335],
    },
  },
} as const;
const SAMPLES = [0, 0.1, 0.3, 0.5, 0.8, 1];

function keyframe(values: readonly number[], value: number) {
  let i = 1;
  while (i < SAMPLES.length - 1 && value > SAMPLES[i]!) i++;
  const fraction = (value - SAMPLES[i - 1]!) / (SAMPLES[i]! - SAMPLES[i - 1]!);
  return values[i - 1]! + fraction * (values[i]! - values[i - 1]!);
}

export interface CircularFrame {
  start: number;
  end: number;
  trackStart: number;
  trackEnd: number;
}

/**
 * How far the active ↔ track gaps are open (0…1) for an active sweep of `sweep` degrees: both gaps
 * grow from 0 as the value leaves 0, and are fully open by the kit's 10% frame.
 *   - flat (ProgressIndicator.kt CircularProgressIndicator): gap = min(sweep, gapSweep). The kit's
 *     gap (25° at 4 dp) is open once the sweep reaches it; at 8 dp its 10% frame already shows the
 *     full 40° gap after a 25° sweep, so the gap opens over the first 25°.
 *   - wavy (internal_CircularWavyProgressModifiers `updateDrawPaths`): the track spacing is
 *     2·min(L, cap) + min(L, gap) along the path, L = the active's length — scaled onto the kit's
 *     gaps. Below 10% the wavy active is flat (on the crest circle), so L is measured there.
 */
export function gapOpening(type: ProgressType, thickness: ProgressThickness, sweep: number) {
  const kit = CIRCULAR[type][thickness];
  if (sweep <= 0) return 0;
  if (type === 'flat') return Math.min(1, sweep / Math.min(kit.tracks[1] - kit.ends[1], kit.ends[1] - kit.start));
  const length = rad(sweep) * STAR_CREST;
  const cap = thickness / 2;
  return Math.min(
    1,
    (2 * Math.min(length, cap) + Math.min(length, TRACK_ACTIVE_SPACE)) / (2 * cap + TRACK_ACTIVE_SPACE),
  );
}

/** Arc angles for a determinate value 0…1 (null at 0: the full track ring). */
export function circularFrame(type: ProgressType, thickness: ProgressThickness, value: number): CircularFrame | null {
  const kit = CIRCULAR[type][thickness];
  if (value <= 0) return null;
  if (value >= 1) return { start: kit.start, end: kit.start + 360, trackStart: kit.trackEnd, trackEnd: kit.trackEnd };
  const end = keyframe(kit.ends, value);
  const minGap = Math.min(...kit.tracks.slice(1, 5).map((track, i) => track - kit.ends[i + 1]!));
  const trackStart = Math.max(keyframe(kit.tracks, value), end + minGap);
  const open = gapOpening(type, thickness, end - kit.start);
  if (open >= 1) return { start: kit.start, end, trackStart, trackEnd: kit.trackEnd };
  return {
    start: kit.start,
    end,
    trackStart: end + (trackStart - end) * open,
    trackEnd: kit.start + 360 - (kit.start + 360 - kit.trackEnd) * open,
  };
}

/** Arc of radius r from a0 to a1 (degrees, clockwise from top), centred at (c, c). */
export function arcPath(r: number, a0: number, a1: number, c: number): string {
  const sweep = a1 - a0;
  if (sweep >= 360 - 1e-6) {
    const [x, y] = polar(r, a0, c);
    const [x2, y2] = polar(r, a0 + 180, c);
    return `M${num(x)} ${num(y)}A${r} ${r} 0 1 1 ${num(x2)} ${num(y2)}A${r} ${r} 0 1 1 ${num(x)} ${num(y)}Z`;
  }
  const [x0, y0] = polar(r, a0, c);
  const [x1, y1] = polar(r, a1, c);
  return `M${num(x0)} ${num(y0)}A${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${num(x1)} ${num(y1)}`;
}

export interface CircularShapes {
  size: number;
  c: number;
  /** null = no active (0%). */
  active: string | null;
  track: string | null;
}

/**
 * `frame` null = full track ring. `rotation` turns the whole drawing; `phase` turns the wave;
 * `amp` (0…1) flattens it onto the crest circle (1 = the kit's star).
 */
export function circularShapes(
  type: ProgressType,
  thickness: ProgressThickness,
  frame: CircularFrame | null,
  rotation: number,
  phase: number,
  amp = 1,
): CircularShapes {
  const { size } = CIRCULAR[type][thickness];
  const c = size / 2;
  const trackR = type === 'wave' ? STAR_CREST : (size - thickness) / 2;
  if (!frame) return { size, c, active: null, track: arcPath(trackR, 0, 360, c) };
  const a0 = frame.start + rotation;
  const a1 = frame.end + rotation;
  const full = frame.end - frame.start >= 360 - 1e-6;
  const active =
    type === 'wave' && amp >= 1
      ? starPath(a0, a1, phase, c)
      : type === 'wave' && amp > 0
        ? blendedStarPath(a0, full ? a0 + 360 : a1, phase, c, amp)
        : arcPath(trackR, a0, full ? a0 + 360 : a1, c);
  const track =
    !full && frame.trackEnd - frame.trackStart > 1e-3
      ? arcPath(trackR, frame.trackStart + rotation, frame.trackEnd + rotation, c)
      : null;
  return { size, c, active, track };
}
