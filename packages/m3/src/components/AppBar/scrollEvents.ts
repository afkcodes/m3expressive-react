/** `scrollend`, or a 150ms pause in `scroll` events where the browser lacks it. Returns the cleanup. */
export function onScrollEnd(el: HTMLElement, fn: () => void): () => void {
  if ('onscrollend' in window) {
    el.addEventListener('scrollend', fn);
    return () => el.removeEventListener('scrollend', fn);
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  const onScroll = () => {
    clearTimeout(timer);
    timer = setTimeout(fn, 150);
  };
  el.addEventListener('scroll', onScroll, { passive: true });
  return () => {
    clearTimeout(timer);
    el.removeEventListener('scroll', onScroll);
  };
}

/** A user gesture on `el` takes over from a running settle. Returns the cleanup. */
export function onUserScroll(el: HTMLElement, fn: () => void): () => void {
  const events = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const;
  for (const e of events) el.addEventListener(e, fn, { passive: true });
  return () => {
    for (const e of events) el.removeEventListener(e, fn);
  };
}
