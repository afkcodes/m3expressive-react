import { describe, expect, it } from 'vitest';
import { materialShapeNames, materialShapes, type MaterialShapeName } from '../materialShapes.ts';
import type { Cubic } from './cubic.ts';
import { Morph } from './morph.ts';
import { morphToSvgPath } from './svg.ts';

/** Flattens [cubics] into a polyline: [x0, y0, x1, y1, ...] per cubic, `segments` segments each. */
function polyline(cubics: readonly Cubic[], segments: number): Float64Array[] {
  return cubics.map((cubic) => {
    const pts = new Float64Array((segments + 1) * 2);
    for (let s = 0; s <= segments; s++) {
      const p = cubic.pointOnCurve(s / segments);
      pts[s * 2] = p.x;
      pts[s * 2 + 1] = p.y;
    }
    return pts;
  });
}

/** Distance from (px, py) to the nearest point of the polyline. */
function distanceToPolyline(px: number, py: number, lines: readonly Float64Array[]): number {
  let best = Number.POSITIVE_INFINITY;
  for (const pts of lines) {
    for (let i = 0; i + 3 < pts.length; i += 2) {
      const ax = pts[i]!;
      const ay = pts[i + 1]!;
      const dx = pts[i + 2]! - ax;
      const dy = pts[i + 3]! - ay;
      const len2 = dx * dx + dy * dy;
      const t = len2 === 0 ? 0 : Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy) / len2));
      const ex = ax + dx * t - px;
      const ey = ay + dy * t - py;
      best = Math.min(best, ex * ex + ey * ey);
    }
  }
  return Math.sqrt(best);
}

/** Largest distance from a sample of [a]'s outline to [b]'s outline, both ways (Hausdorff-ish). */
function outlineDistance(a: readonly Cubic[], b: readonly Cubic[]): number {
  let worst = 0;
  for (const [from, to] of [
    [a, b],
    [b, a],
  ] as const) {
    const target = polyline(to, 48);
    for (const cubic of from) {
      for (let s = 0; s <= 8; s++) {
        const p = cubic.pointOnCurve(s / 8);
        worst = Math.max(worst, distanceToPolyline(p.x, p.y, target));
      }
    }
  }
  return worst;
}

function expectClosedAndFinite(cubics: readonly Cubic[]) {
  expect(cubics.length).toBeGreaterThan(0);
  for (let i = 0; i < cubics.length; i++) {
    const cubic = cubics[i]!;
    const next = cubics[(i + 1) % cubics.length]!;
    for (const v of cubic.points) expect(Number.isFinite(v)).toBe(true);
    expect(Math.abs(cubic.anchor1X - next.anchor0X)).toBeLessThan(1e-4);
    expect(Math.abs(cubic.anchor1Y - next.anchor0Y)).toBeLessThan(1e-4);
  }
  // asCubics() ends the outline exactly on its first anchor
  const first = cubics[0]!;
  const last = cubics[cubics.length - 1]!;
  expect(last.anchor1X).toBe(first.anchor0X);
  expect(last.anchor1Y).toBe(first.anchor0Y);
}

describe('materialShapes', () => {
  it('exposes the 35 M3 Expressive shapes, built lazily and cached', () => {
    expect(materialShapeNames).toHaveLength(35);
    expect(Object.keys(materialShapes)).toEqual([...materialShapeNames]);
    expect(materialShapes.heart).toBe(materialShapes.heart);
  });

  // normalized() scales by the *approximate* bounds (anchor + control point hull), so those span
  // exactly 1 in the larger dimension and are centered; the true curve bounds lie inside them.
  it.each(materialShapeNames)('%s is normalized into [0,1]²', (name) => {
    const polygon = materialShapes[name];
    const approx = polygon.calculateBounds();
    const exact = polygon.calculateBounds(new Float64Array(4), false);
    for (const [minX, minY, maxX, maxY] of [approx, exact]) {
      expect(minX).toBeGreaterThanOrEqual(-1e-4);
      expect(minY).toBeGreaterThanOrEqual(-1e-4);
      expect(maxX).toBeLessThanOrEqual(1 + 1e-4);
      expect(maxY).toBeLessThanOrEqual(1 + 1e-4);
    }
    const [minX, minY, maxX, maxY] = approx;
    expect(Math.abs(Math.max(maxX! - minX!, maxY! - minY!) - 1)).toBeLessThan(1e-4);
    expect(Math.abs(minX! + maxX! - 1)).toBeLessThan(1e-4);
    expect(Math.abs(minY! + maxY! - 1)).toBeLessThan(1e-4);
    expect(exact[0]!).toBeGreaterThanOrEqual(approx[0]! - 1e-9);
    expect(exact[2]!).toBeLessThanOrEqual(approx[2]! + 1e-9);
  });
});

describe('Morph between material shapes', () => {
  const namedPairs: Array<[MaterialShapeName, MaterialShapeName]> = [
    ['circle', 'cookie9Sided'],
    ['square', 'sunny'],
    ['heart', 'burst'],
  ];
  // Every shape is used as a start and an end at least once: each shape morphs to the next one.
  const ring = materialShapeNames.map(
    (name, i) =>
      [name, materialShapeNames[(i + 1) % materialShapeNames.length]!] as [MaterialShapeName, MaterialShapeName],
  );
  const endpointPairs = [
    ...namedPairs,
    ...namedPairs.map(([a, b]) => [b, a] as [MaterialShapeName, MaterialShapeName]),
    ...ring,
  ];

  it.each(endpointPairs)('Morph(%s, %s) matches the start shape at 0 and the end shape at 1', (a, b) => {
    const morph = new Morph(materialShapes[a], materialShapes[b]);
    expect(outlineDistance(morph.asCubics(0), materialShapes[a].cubics)).toBeLessThan(1e-3);
    expect(outlineDistance(morph.asCubics(1), materialShapes[b].cubics)).toBeLessThan(1e-3);
  });

  const few: MaterialShapeName[] = ['circle', 'cookie9Sided', 'square', 'sunny', 'heart', 'burst'];
  const allPairs = few.flatMap((a) => few.filter((b) => b !== a).map((b) => [a, b] as const));

  it.each(allPairs)('Morph(%s, %s) produces closed, finite outlines', (a, b) => {
    const morph = new Morph(materialShapes[a], materialShapes[b]);
    for (let step = -2; step <= 12; step++) {
      const progress = step / 10; // includes slight over/undershoot, as used by spring animations
      expectClosedAndFinite(morph.asCubics(progress));

      const d = morphToSvgPath(morph, progress, 48);
      expect(d.startsWith('M')).toBe(true);
      expect(d.endsWith('Z')).toBe(true);
      expect(d).not.toMatch(/NaN|Infinity/);
      expect(d.match(/C/g)).toHaveLength(morph.morphMatch.length);
    }
  });
});
