import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * figma/<component>/manifest.json — written when a component is captured from
 * Figma (via the Figma MCP or scripts/figma-pull.ts). Boxes are in CSS px,
 * relative to the variant node's top-left.
 */
export interface Manifest {
  component: string;
  fileKey: string;
  /** Export scale of the PNGs. */
  scale: number;
  /**
   * Whole-frame exports that variant refs are cropped from (scripts/figma-crop.ts) —
   * one export per component set instead of one per variant.
   */
  frames?: Record<string, { node: string; file: string; origin?: [x: number, y: number] }>;
  variants: Record<string, ManifestVariant>;
}

export interface ManifestVariant {
  node: string;
  /** Node size [w, h]. */
  size: [number, number];
  /** Exported image bounds relative to the node (shadows / focus rings extend past it). */
  renderBounds?: [x: number, y: number, w: number, h: number];
  layers?: Array<{ name: string; box: [x: number, y: number, w: number, h: number] }>;
  /** Opaque colour both images are flattened onto (what the node sits on in Figma). Default white. */
  background?: string;
  /** Node position inside `frames[frame]`, in CSS px. */
  crop?: { frame: string; x: number; y: number };
  /**
   * Reference exported from the node itself (used where a frame crop would include a
   * neighbour's shadow). Copied to <variant>.png; figma-crop leaves it alone.
   */
  ref?: string;
  /** Max non-AA diff pixels tolerated. Default 0 — anything else needs a written reason. */
  allowedDiffPixels?: number;
  allowedDiffReason?: string;
}

export const REFS_DIR = process.env.M3_REFS_DIR ?? join(process.cwd(), 'figma');

export function loadManifests(): Manifest[] {
  if (!existsSync(REFS_DIR)) return [];
  return readdirSync(REFS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(REFS_DIR, d.name, 'manifest.json')))
    .map((d) => JSON.parse(readFileSync(join(REFS_DIR, d.name, 'manifest.json'), 'utf8')) as Manifest);
}
