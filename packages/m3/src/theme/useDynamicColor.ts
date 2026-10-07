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
  const [state, setState] = useState<ImageSeedState>(IDLE);
  useEffect(() => {
    if (source == null) {
      setState(IDLE);
      return;
    }
    let current = true;
    setState((s) => ({ ...s, status: 'loading', error: null }));
    seedColorsFromImage(source, { count, maxArea }).then(
      (colors) => current && setState({ colors, status: 'ready', error: null }),
      (error: unknown) =>
        current &&
        setState({ colors: [], status: 'error', error: error instanceof Error ? error : new Error(String(error)) }),
    );
    return () => {
      current = false;
    };
  }, [source, count, maxArea]);
  return state;
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
