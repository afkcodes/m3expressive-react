import { useLayoutEffect, type FocusEvent, type KeyboardEvent, type RefObject } from 'react';

/**
 * Roving tab stop for toolbars (WAI-ARIA toolbar pattern): exactly one item is in the tab order;
 * arrow keys along the orientation (mirrored horizontally in RTL) move between items, wrapping,
 * and Home / End jump to the ends. Shared by `Toolbar` and `BottomAppBar`.
 */
const FOCUSABLE =
  'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])';

export type RovingMove = 'next' | 'prev' | 'first' | 'last';

/** The roving move a key asks for, or null. `rtl` mirrors the horizontal arrows. */
export function rovingMove(key: string, vertical: boolean, rtl: boolean): RovingMove | null {
  if (key === 'Home') return 'first';
  if (key === 'End') return 'last';
  if (vertical) return key === 'ArrowDown' ? 'next' : key === 'ArrowUp' ? 'prev' : null;
  if (key === 'ArrowRight') return rtl ? 'prev' : 'next';
  if (key === 'ArrowLeft') return rtl ? 'next' : 'prev';
  return null;
}

/** The item index a move lands on (arrows wrap). */
export function rovingIndex(move: RovingMove, index: number, length: number): number {
  if (move === 'first') return 0;
  if (move === 'last') return length - 1;
  return (index + (move === 'next' ? 1 : -1) + length) % length;
}

/** Input types whose arrow keys are free for the toolbar (no caret, no value to step). */
const BUTTON_LIKE_INPUTS = new Set(['button', 'submit', 'reset', 'checkbox', 'image', 'file', 'color']);

/**
 * Whether the focused item uses the key itself. Text fields keep Home / End and keep arrows while
 * the caret can still move that way (so arrows leave a field only from the end of its text);
 * selects, sliders, radios and other inputs without a caret position, and contenteditable
 * elements keep every arrow.
 */
export function ownsKey(el: Element, move: RovingMove): boolean {
  if ((el as HTMLElement).isContentEditable) return true;
  if (el.tagName === 'SELECT') return true;
  const textArea = el.tagName === 'TEXTAREA';
  if (!textArea && (el.tagName !== 'INPUT' || BUTTON_LIKE_INPUTS.has((el as HTMLInputElement).type))) return false;
  if (move === 'first' || move === 'last') return true;
  const field = el as HTMLInputElement | HTMLTextAreaElement;
  let start: number | null;
  let end: number | null;
  try {
    start = field.selectionStart;
    end = field.selectionEnd;
  } catch {
    return true;
  }
  if (start == null || end == null || start !== end) return true;
  return move === 'next' ? end < field.value.length : start > 0;
}

/** Wires the roving tab stop onto `ref`'s element; spread the handlers onto it. */
export function useRovingTabStop(ref: RefObject<HTMLElement | null>, vertical: boolean) {
  const items = () =>
    [...(ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])].filter((el) => !el.closest('[inert]'));
  const rove = (list: HTMLElement[], to: HTMLElement | undefined) => {
    for (const el of list) {
      const tabIndex = el === to ? 0 : -1;
      // Only real changes: this runs after every render.
      if (el.tabIndex !== tabIndex) el.tabIndex = tabIndex;
    }
  };
  // Items come and go with any render: keep exactly one in the tab order.
  useLayoutEffect(() => {
    const list = items();
    rove(list, list.find((el) => el.dataset.toolbarActive != null) ?? list[0]);
  });
  const onFocus = (e: FocusEvent<HTMLElement>) => {
    const list = items();
    const target = list.find((el) => el === e.target);
    if (!target) return;
    for (const el of list) delete el.dataset.toolbarActive;
    target.dataset.toolbarActive = '';
    rove(list, target);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const root = ref.current;
    if (!root || e.altKey || e.ctrlKey || e.metaKey) return;
    const move = rovingMove(e.key, vertical, getComputedStyle(root).direction === 'rtl');
    if (!move) return;
    const list = items();
    const i = list.indexOf(e.target as HTMLElement);
    if (i < 0 || ownsKey(list[i]!, move)) return;
    e.preventDefault();
    list[rovingIndex(move, i, list.length)]?.focus();
  };
  return { onFocus, onKeyDown };
}
