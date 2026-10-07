import { useSyncExternalStore } from 'react';

const subscribe = (onChange: () => void) => {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
};

/** The page id in `#/<id>` ('' for the home page). */
export function useHashRoute(): string {
  return useSyncExternalStore(
    subscribe,
    () => location.hash.replace(/^#\/?/, ''),
    () => '',
  );
}
