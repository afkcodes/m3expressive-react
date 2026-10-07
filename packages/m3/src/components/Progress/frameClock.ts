/**
 * One requestAnimationFrame loop for every animating progress indicator: each subscriber is called
 * with the frame timestamp, in subscription order, and the loop stops when the last one leaves.
 * (Indicators used to run a rAF per animator — up to four per instance.)
 */
type FrameCallback = (now: number) => void;

const subscribers = new Set<FrameCallback>();
let frame = 0;

function tick(now: number) {
  frame = 0;
  for (const callback of [...subscribers]) {
    // A callback may unsubscribe another one during this frame.
    if (subscribers.has(callback)) callback(now);
  }
  if (subscribers.size > 0 && frame === 0) frame = requestAnimationFrame(tick);
}

/** Calls `callback(now)` every animation frame until the returned function is called. */
export function onEveryFrame(callback: FrameCallback): () => void {
  subscribers.add(callback);
  if (frame === 0) frame = requestAnimationFrame(tick);
  return () => {
    subscribers.delete(callback);
    if (subscribers.size === 0 && frame !== 0) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  };
}

/**
 * Reports whether `element` is on screen (IntersectionObserver), so an indicator scrolled away can
 * skip drawing while its clock keeps running. Without IntersectionObserver (jsdom, SSR) it is
 * always treated as visible.
 */
export function observeOnScreen(element: Element, onChange: (visible: boolean) => void): () => void {
  if (typeof IntersectionObserver === 'undefined') return () => {};
  const observer = new IntersectionObserver((entries) => {
    const entry = entries[entries.length - 1];
    if (entry) onChange(entry.isIntersecting);
  });
  observer.observe(element);
  return () => observer.disconnect();
}
