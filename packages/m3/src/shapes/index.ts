/**
 * `@m3x/react/shapes` — the shape engine behind `Shape` / `MorphingShape`: the kit's exact paths and
 * the AndroidX graphics-shapes port (polygons, morphs).
 */
export { figmaShapes, SHAPE_FRAME } from './figmaPaths.ts';
export type { ShapeName } from './figmaPaths.ts';
export { Morph, RoundedPolygon, CornerRounding } from './graphics/index.ts';
export { createShapeMorph, shapePolygon, shapeMorphPath } from './shapeMorph.ts';
