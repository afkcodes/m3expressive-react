import { num, polar, rad } from './pathMath.ts';

/*
 * The circular wavy active indicator: a 9-point star with every corner rounded by a 4.793px
 * circular arc (Figma's corner radius), fitted to the kit's outlines to 0.001px rms — outer
 * vertices at 25.1685, inner at 18.1555. The flat track ring sits on the wave crests (radius
 * ≈ 22.08).
 */
const STAR = { points: 9, outer: 25.1685, inner: 18.1555, cornerRadius: 4.793 };

type Point = [number, number];
type Primitive =
  | { kind: 'arc'; centre: Point; r: number; from: Point; to: Point; clockwise: boolean }
  | { kind: 'line'; from: Point; to: Point };
type Arc = Extract<Primitive, { kind: 'arc' }>;

function unit(v: Point): Point {
  const length = Math.hypot(v[0], v[1]);
  return [v[0] / length, v[1] / length];
}

/** The star outline (centred on the origin) as alternating corner arcs and straight edges. */
function starPrimitives(phase: number): Primitive[] {
  const n = STAR.points * 2;
  const vertices: Point[] = [];
  for (let k = 0; k < n; k++) {
    const angle = rad(phase + (k * 180) / STAR.points);
    const r = k % 2 === 0 ? STAR.outer : STAR.inner;
    vertices.push([r * Math.sin(angle), -r * Math.cos(angle)]);
  }
  const corners = vertices.map((vertex, k): Arc => {
    const prev = vertices[(k + n - 1) % n]!;
    const next = vertices[(k + 1) % n]!;
    const toPrev = unit([prev[0] - vertex[0], prev[1] - vertex[1]]);
    const toNext = unit([next[0] - vertex[0], next[1] - vertex[1]]);
    const cornerAngle = Math.acos(Math.max(-1, Math.min(1, toPrev[0] * toNext[0] + toPrev[1] * toNext[1])));
    const tangentLength = STAR.cornerRadius / Math.tan(cornerAngle / 2);
    const bisector = unit([toPrev[0] + toNext[0], toPrev[1] + toNext[1]]);
    const centreDistance = STAR.cornerRadius / Math.sin(cornerAngle / 2);
    const centre: Point = [vertex[0] + bisector[0] * centreDistance, vertex[1] + bisector[1] * centreDistance];
    const from: Point = [vertex[0] + toPrev[0] * tangentLength, vertex[1] + toPrev[1] * tangentLength];
    const to: Point = [vertex[0] + toNext[0] * tangentLength, vertex[1] + toNext[1] * tangentLength];
    const clockwise = (from[0] - centre[0]) * (to[1] - centre[1]) - (from[1] - centre[1]) * (to[0] - centre[0]) > 0;
    return { kind: 'arc', centre, r: STAR.cornerRadius, from, to, clockwise };
  });
  const out: Primitive[] = [];
  for (let k = 0; k < n; k++) {
    out.push(corners[k]!, { kind: 'line', from: corners[k]!.to, to: corners[(k + 1) % n]!.from });
  }
  return out;
}

const angleOf = (p: Point) => ((((Math.atan2(p[0], -p[1]) * 180) / Math.PI) % 360) + 360) % 360;

/** Crest radius of the star (where the flat track ring sits). */
export const STAR_CREST = (() => {
  const arc = starPrimitives(0)[0] as Arc;
  return Math.hypot(arc.centre[0], arc.centre[1]) + arc.r;
})();

const cross2 = (a: Point, b: Point) => a[0] * b[1] - a[1] * b[0];

function onArc(arc: Arc, point: Point) {
  const a: Point = [arc.from[0] - arc.centre[0], arc.from[1] - arc.centre[1]];
  const b: Point = [arc.to[0] - arc.centre[0], arc.to[1] - arc.centre[1]];
  const v: Point = [point[0] - arc.centre[0], point[1] - arc.centre[1]];
  const turn = cross2(a, b);
  return (
    cross2(a, v) * turn >= -1e-9 && cross2(v, b) * turn >= -1e-9 && v[0] * (a[0] + b[0]) + v[1] * (a[1] + b[1]) >= 0
  );
}

/** Point where the ray at `deg` crosses primitive `p`, or null. */
function rayCrossing(p: Primitive, deg: number): Point | null {
  const ray: Point = [Math.sin(rad(deg)), -Math.cos(rad(deg))];
  if (p.kind === 'line') {
    const d: Point = [p.to[0] - p.from[0], p.to[1] - p.from[1]];
    const den = ray[0] * d[1] - ray[1] * d[0];
    if (Math.abs(den) < 1e-12) return null;
    const alongRay = (p.from[0] * d[1] - p.from[1] * d[0]) / den;
    const alongSegment = (p.from[0] * ray[1] - p.from[1] * ray[0]) / den;
    return alongRay > 0 && alongSegment >= -1e-9 && alongSegment <= 1 + 1e-9
      ? [ray[0] * alongRay, ray[1] * alongRay]
      : null;
  }
  const projection = ray[0] * p.centre[0] + ray[1] * p.centre[1];
  const disc = projection * projection - (p.centre[0] ** 2 + p.centre[1] ** 2) + p.r * p.r;
  if (disc < 0) return null;
  for (const along of [projection + Math.sqrt(disc), projection - Math.sqrt(disc)]) {
    const point: Point = [ray[0] * along, ray[1] * along];
    if (along > 0 && onArc(p, point)) return point;
  }
  return null;
}

/**
 * The wave at partial amplitude between polar angles a0 → a1: Compose morphs the active from the
 * track circle to the star (`Morph(circle, star)` at progress = amplitude), which moves each point
 * radially between the crest circle and the star outline. Sampled every degree (≤ 0.004px from
 * the curve at this size).
 */
export function blendedStarPath(a0: number, a1: number, phase: number, c: number, amp: number): string {
  const primitives = starPrimitives(phase);
  const radius = (deg: number) => {
    for (const p of primitives) {
      const q = rayCrossing(p, ((deg % 360) + 360) % 360);
      if (q) return Math.hypot(q[0], q[1]);
    }
    return STAR_CREST;
  };
  const full = a1 - a0 >= 360 - 1e-6;
  const n = Math.max(1, Math.ceil(a1 - a0));
  let d = '';
  for (let i = 0; i <= (full ? n - 1 : n); i++) {
    const deg = a0 + ((a1 - a0) * i) / n;
    const r = STAR_CREST + amp * (radius(deg) - STAR_CREST);
    const [x, y] = polar(r, deg, c);
    d += `${i === 0 ? 'M' : 'L'}${num(x)} ${num(y)}`;
  }
  return full ? d + 'Z' : d;
}

/**
 * The star's centre line between polar angles a0 → a1 (clockwise, degrees from top), centred at
 * (c, c). `phase` rotates the star under fixed endpoints (the wave's travel).
 */
export function starPath(a0: number, a1: number, phase: number, c: number): string {
  const primitives = starPrimitives(phase);
  const at = (q: Point) => `${num(q[0] + c)} ${num(q[1] + c)}`;
  const segment = (p: Primitive, to: Point) =>
    p.kind === 'line' ? `L${at(to)}` : `A${p.r} ${p.r} 0 0 ${p.clockwise ? 1 : 0} ${at(to)}`;
  if (a1 - a0 >= 360 - 1e-6) {
    let d = `M${at(primitives[primitives.length - 1]!.to)}`;
    for (const p of primitives) d += segment(p, p.to);
    return d + 'Z';
  }
  // Order primitives clockwise starting from the one containing a0.
  const span = (p: Primitive) => [angleOf(p.from), angleOf(p.to)] as const;
  const within = (deg: number, [start, end]: readonly [number, number]) => {
    const length = (end - start + 360) % 360;
    return (deg - start + 360) % 360 <= length + 1e-9;
  };
  const startDeg = ((a0 % 360) + 360) % 360;
  let i = primitives.findIndex((p) => within(startDeg, span(p)));
  let d = `M${at(rayCrossing(primitives[i]!, startDeg)!)}`;
  let remaining = a1 - a0;
  let cursor = startDeg;
  for (let guard = 0; guard < primitives.length * 2 + 2; guard++) {
    const p = primitives[i]!;
    const [, end] = span(p);
    const toEnd = (end - cursor + 360) % 360;
    if (remaining <= toEnd + 1e-9) {
      d += segment(p, rayCrossing(p, cursor + remaining) ?? p.to);
      return d;
    }
    d += segment(p, p.to);
    remaining -= toEnd;
    cursor = end;
    i = (i + 1) % primitives.length;
  }
  return d;
}
