import { useCallback, type Ref, type RefCallback } from 'react';

/** Assign `node` to a ref of any kind (callback or object). */
export function assignRef<T>(ref: Ref<T> | undefined | null, node: T | null): void {
  if (typeof ref === 'function') ref(node);
  else if (ref) (ref as { current: T | null }).current = node;
}

/**
 * One callback ref feeding several refs — e.g. a forwarded ref plus the component's own.
 * Stable while the refs are (pass refs, not inline callbacks, to keep it stable).
 */
export function useMergedRefs<T>(...refs: Array<Ref<T> | undefined | null>): RefCallback<T> {
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the refs themselves are the dependencies
  return useCallback((node: T | null) => refs.forEach((ref) => assignRef(ref, node)), refs);
}
