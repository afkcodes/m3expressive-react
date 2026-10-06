import { createContext, useContext, useSyncExternalStore } from 'react';
import type { SpringParams } from './spring.ts';
import { motionSchemes, type MotionSchemeName, type SpringToken } from './tokens.ts';

export const MotionSchemeContext = createContext<MotionSchemeName>('expressive');

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeReducedMotion(onChange: () => void) {
  const mql = window.matchMedia(REDUCED_QUERY);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_QUERY).matches,
    () => false,
  );
}

/**
 * Resolve a spring token against the active motion scheme — the JS twin of the
 * `motion.*` CSS vars. Returns `null` for spatial tokens under reduced motion
 * (callers should jump straight to the end value).
 */
export function useSpringToken(token: SpringToken): SpringParams | null {
  const scheme = useContext(MotionSchemeContext);
  const reduced = useReducedMotion();
  if (reduced && token.endsWith('spatial')) return null;
  return motionSchemes[scheme][token];
}
