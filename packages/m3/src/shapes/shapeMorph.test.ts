import { describe, expect, it } from 'vitest';
import { figmaShapes, type ShapeName } from './figmaPaths.ts';
import { createShapeMorph, polygonFromCubics, shapeMorphPath, shapePolygon } from './shapeMorph.ts';

const names = Object.keys(figmaShapes) as ShapeName[];
const finite = (d: string) => d.length > 0 && !/NaN|Infinity/.test(d) && d.endsWith('Z');

describe('shape morphing on Figma-derived polygons', () => {
  it('builds a polygon for every kit shape, within the Figma vector box', () => {
    for (const n of names) {
      const b = shapePolygon(n).calculateBounds(new Float64Array(4), false);
      const [x, y, w, h] = figmaShapes[n].box;
      // ≤ 0.6px against the 380px frame — the curve parser keeps the outline.
      expect(Math.abs(b[0]! - x!)).toBeLessThan(0.6);
      expect(Math.abs(b[1]! - y!)).toBeLessThan(0.6);
      expect(Math.abs(b[2]! - (x! + w!))).toBeLessThan(0.6);
      expect(Math.abs(b[3]! - (y! + h!))).toBeLessThan(0.6);
    }
  });

  it('morphs every ordered pair to closed, finite outlines, including spring overshoot', () => {
    for (const a of names) {
      for (const b of names) {
        if (a === b) continue;
        const m = createShapeMorph(a, b);
        for (const t of [-0.1, 0, 0.5, 1, 1.1]) expect(finite(shapeMorphPath(m, t)), `${a}→${b}@${t}`).toBe(true);
      }
    }
  });

  it('restarts from an in-between frame without degenerating', () => {
    const m = createShapeMorph('circle', 'cookie9Sided');
    const mid = polygonFromCubics(m.asCubics(0.4));
    const m2 = createShapeMorph(mid, 'heart');
    for (const t of [0, 0.5, 1]) expect(finite(shapeMorphPath(m2, t))).toBe(true);
  });
});
