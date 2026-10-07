/*
 * Keyboard path for SwipeableListItem (WCAG 2.1.1 / 2.5.1: the swipe has a non-gesture
 * alternative). Keys follow the gesture's physical direction (the item always slides left):
 *   item focused    ArrowLeft → reveal the actions and focus the first one;
 *                   ArrowRight / Escape → hide them.
 *   action focused  ArrowLeft / ArrowRight / Home / End → move between the actions;
 *                   Escape → hide them and return to the item.
 */

/** The item's reveal state (SwipeRevealState). */
type RevealState = 'closed' | 'peek' | 'revealed' | 'action';

/** What has focus inside the swipeable item. */
export type SwipeKeyTarget = { kind: 'item' } | { kind: 'action'; index: number };

export interface SwipeKeyResult {
  /** Open the reveal (settle on "revealed"). */
  reveal?: boolean;
  /** Close it (settle on "closed"). */
  close?: boolean;
  /** Move focus to the item or to the action at this index. */
  focus?: 'item' | number;
}

/** The reaction to `key`, or null when the key isn't handled (let it through). */
export function swipeKey(
  key: string,
  target: SwipeKeyTarget,
  state: RevealState,
  actions: number,
): SwipeKeyResult | null {
  if (actions === 0) return null;
  if (target.kind === 'item') {
    if (key === 'ArrowLeft') return state === 'revealed' ? { focus: 0 } : { reveal: true, focus: 0 };
    if ((key === 'ArrowRight' || key === 'Escape') && state !== 'closed') return { close: true };
    return null;
  }
  const last = actions - 1;
  switch (key) {
    case 'ArrowLeft':
      return target.index > 0 ? { focus: target.index - 1 } : null;
    case 'ArrowRight':
      return target.index < last ? { focus: target.index + 1 } : null;
    case 'Home':
      return { focus: 0 };
    case 'End':
      return { focus: last };
    case 'Escape':
      return { close: true, focus: 'item' };
    default:
      return null;
  }
}
