import type { ReactNode } from 'react';

export interface FixtureVariant {
  /** Figma node id of this variant (e.g. "123:456"). Refs are keyed by variant name. */
  node?: string;
  colorScheme?: 'light' | 'dark';
  /** Explicit size for fill-container components (Figma node width/height). */
  width?: number;
  height?: number;
  /**
   * Page padding around the node (default FIXTURE_PADDING = 32). Raise it for render bounds that
   * extend further (slider value indicators: ~52px). Chrome's raster depends on page position
   * (tile alignment), so a variant must be verified at the padding it declares.
   */
  padding?: number;
  /**
   * Figma layer name → CSS selector inside the fixture, for box-level checks
   * against manifest.json `layers`.
   */
  layers?: Record<string, string>;
  render: () => ReactNode;
}

export interface FixtureModule {
  /** Matches the folder name under /figma. */
  component: string;
  variants: Record<string, FixtureVariant>;
}
