import { figmaShapes, type ShapeName } from './figmaPaths.ts';
import { Morph } from './graphics/morph.ts';
import { RoundedPolygon } from './graphics/roundedPolygon.ts';
import { SvgPathParser } from './graphics/svgPathParser.ts';
import { detectFeatures } from './graphics/featureDetector.ts';
import type { Cubic } from './graphics/cubic.ts';
import { morphToSvgPath, toSvgPath } from './graphics/svg.ts';

/**
 * Morphable polygons built from the kit's own vectors (not Compose's MaterialShapes, which
 * differ from the Figma shapes by up to 3.6% of area). Endpoints reproduce the Figma outline
 * to ≤ 0.07% of area; in-between frames come from the AndroidX morph algorithm.
 * Coordinates are in the 380×380 Figma frame, like `figmaShapes`.
 */
const FRAME_CENTER = 190;
const cache = new Map<ShapeName, RoundedPolygon>();

export function shapePolygon(name: ShapeName): RoundedPolygon {
  let poly = cache.get(name);
  if (!poly) {
    const features = SvgPathParser.parseFeatures(figmaShapes[name].d);
    poly = RoundedPolygon.fromFeatures(features, { centerX: FRAME_CENTER, centerY: FRAME_CENTER });
    cache.set(name, poly);
  }
  return poly;
}

/** A polygon from arbitrary outline cubics — used to restart a morph from an in-between frame. */
export function polygonFromCubics(cubics: readonly Cubic[]): RoundedPolygon {
  return RoundedPolygon.fromFeatures(detectFeatures(cubics), { centerX: FRAME_CENTER, centerY: FRAME_CENTER });
}

export function createShapeMorph(from: ShapeName | RoundedPolygon, to: ShapeName | RoundedPolygon): Morph {
  return new Morph(
    typeof from === 'string' ? shapePolygon(from) : from,
    typeof to === 'string' ? shapePolygon(to) : to,
  );
}

/** SVG path data for a morph frame (frame coordinates). Progress may overshoot [0, 1]. */
export const shapeMorphPath = (morph: Morph, progress: number) => morphToSvgPath(morph, progress);

export const polygonPath = (poly: RoundedPolygon) => toSvgPath(poly.cubics);
