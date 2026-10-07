/**
 * Pointer input inside a drag container (sheet, swipeable list item) that must not become a drag:
 * text entry (caret placement, selection), selects, sliders, and anything inside `[data-m3-no-drag]`
 * — the escape hatch for content with its own drag handling (the carousel sets it on its viewport).
 */
export const NO_DRAG_SELECTOR =
  'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="slider"], [data-m3-no-drag]';

interface GuardEvent {
  target: EventTarget | null;
  defaultPrevented: boolean;
  /** Pointer events: a descendant that captured this pointer owns the gesture. */
  pointerId?: number;
  pointerType?: string;
}

const isElement = (t: EventTarget | null): t is Element =>
  t != null && typeof (t as Partial<Element>).closest === 'function';

/**
 * True when a press on `host` (the drag container) belongs to its content rather than to the
 * container: the event was already handled (`preventDefault`), it started on a `NO_DRAG_SELECTOR`
 * element inside it, or a descendant captured the pointer (Base UI's slider control, the time
 * picker dial). Touch pointers are captured implicitly by their target, so only an ancestor of
 * the target that took the capture counts for them.
 */
export function isNoDragTarget(e: GuardEvent, host: Element): boolean {
  if (e.defaultPrevented) return true;
  const target = e.target;
  if (!isElement(target)) return false;
  const exempt = target.closest(NO_DRAG_SELECTOR);
  if (exempt && host.contains(exempt)) return true;
  if (e.pointerId == null) return false;
  for (let el: Element | null = target; el && el !== host; el = el.parentElement) {
    if (el === target && e.pointerType !== 'mouse') continue;
    if (typeof el.hasPointerCapture === 'function' && el.hasPointerCapture(e.pointerId)) return true;
  }
  return false;
}
