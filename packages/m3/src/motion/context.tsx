import { createContext, useContext, useSyncExternalStore } from 'react';
import type { SpringParams } from './spring.ts';
import { motionSchemes, type MotionSchemeName, type SpringToken } from './tokens.ts';

export const MotionSchemeContext = createContext<MotionSchemeName>('expressive');

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

/*
 * One MediaQueryList for the whole app (not one per component), created lazily and only where
 * matchMedia exists — server rendering and jsdom have none, and then motion is never "reduced".
 */
let reducedQuery: MediaQueryList | null | undefined;
const reducedListeners = new Set<() => void>();
const notifyReduced = () => reducedListeners.forEach((listener) => listener());

function reducedMotionQuery(): MediaQueryList | null {
  if (reducedQuery === undefined) {
    reducedQuery =
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia(REDUCED_QUERY)
        : null;
  }
  return reducedQuery;
}

function subscribeReducedMotion(onChange: () => void) {
  const query = reducedMotionQuery();
  if (!query) return () => {};
  if (reducedListeners.size === 0) query.addEventListener('change', notifyReduced);
  reducedListeners.add(onChange);
  return () => {
    reducedListeners.delete(onChange);
    if (reducedListeners.size === 0) query.removeEventListener('change', notifyReduced);
  };
}

/** Whether the user asked for reduced motion — for event handlers; components use `useReducedMotion`. */
export function prefersReducedMotion(): boolean {
  return reducedMotionQuery()?.matches ?? false;
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReducedMotion, prefersReducedMotion, () => false);
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
