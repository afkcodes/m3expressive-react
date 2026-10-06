import { createContext } from 'react';

/**
 * Tint for standard icon buttons inside a container that recolours them — e.g. a top app bar's
 * navigation icon is On Surface while its actions stay On Surface Variant (M3 / the kit).
 */
export const StandardIconTintContext = createContext<'on-surface' | null>(null);
