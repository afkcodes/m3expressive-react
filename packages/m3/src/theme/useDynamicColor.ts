import { useEffect, useMemo, useState } from 'react';
import {
  schemeFromSeed,
  seedColorsFromImage,
  type DynamicColorScheme,
  type DynamicSchemeOptions,
  type ImageSeedOptions,
  type ImageSeedSource,
} from './dynamicColor.ts';

export interface ImageSeedState {
  /** Seed candidates, best first (empty until extracted). */
  colors: readonly string[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: Error | null;
}

const IDLE: ImageSeedState = { colors: [], status: 'idle', error: null };

interface SettledSeeds {
  request: { source: ImageSeedSource; count: number | undefined; maxArea: number | undefined };
  state: ImageSeedState;
}

/**
 * Seed colours from an image, re-extracted when `source` changes; pass the first to
 * `useDynamicScheme` (or offer them all, like Android's wallpaper colour options).
 * A stale extraction (source changed meanwhile) is discarded.
 */
export function useSeedColorsFromImage(
  source: ImageSeedSource | null | undefined,
  options: ImageSeedOptions = {},
): ImageSeedState {
  const { count, maxArea } = options;
  // The last finished extraction and the request it answers; "loading" is derived from it.
  const [settled, setSettled] = useState<SettledSeeds | null>(null);
  // No source: forget the previous colours (a new source starts from empty, not from stale seeds).
  if (source == null && settled !== null) setSettled(null);
  useEffect(() => {
    if (source == null) return undefined;
    let current = true;
    const request = { source, count, maxArea };
    seedColorsFromImage(source, { count, maxArea }).then(
      (colors) => {
        if (current) setSettled({ request, state: { colors, status: 'ready', error: null } });
      },
      (error: unknown) => {
        if (!current) return;
        const failure = error instanceof Error ? error : new Error(String(error));
        setSettled({ request, state: { colors: [], status: 'error', error: failure } });
      },
    );
    return () => {
      current = false;
    };
  }, [source, count, maxArea]);
  return useMemo(() => {
    if (source == null) return IDLE;
    const { request } = settled ?? {};
    if (settled && request?.source === source && request.count === count && request.maxArea === maxArea) {
      return settled.state;
    }
    // A new request: keep showing the previous colours while it runs.
    return { colors: settled?.state.colors ?? [], status: 'loading', error: null };
  }, [source, count, maxArea, settled]);
}

/**
 * A memoised dynamic scheme for `<M3Provider colors>` from a seed colour (hard-coded or from
 * `useSeedColorsFromImage`); undefined while there is no seed. An invalid seed logs and returns
 * undefined (the baseline colours stay) instead of throwing during render.
 *
 * @example const colors = useDynamicScheme('#006A6A', { variant: 'expressive' }); <M3Provider colors={colors}>
 */
export function useDynamicScheme(
  seed: string | null | undefined,
  options: DynamicSchemeOptions = {},
): DynamicColorScheme | undefined {
  const { variant, contrast, specVersion } = options;
  return useMemo(() => {
    if (seed == null) return undefined;
    try {
      return schemeFromSeed(seed, { variant, contrast, specVersion });
    } catch (error) {
      console.error(error);
      return undefined;
    }
  }, [seed, variant, contrast, specVersion]);
}
