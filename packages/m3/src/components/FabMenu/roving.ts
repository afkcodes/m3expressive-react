import { rovingIndex as stepIndex, rovingMove } from '../../hooks/useRovingTabStop.ts';

/**
 * Arrow-key movement through the FAB menu's items (0 = top), wrapping at the ends; Home / End jump
 * to the first / last item — the shared vertical roving keys (hooks/useRovingTabStop). From
 * outside the items (`current` −1, the toggle below them) ArrowUp enters at the nearest (last)
 * item and ArrowDown at the first. Null: the key isn't handled.
 */
export function rovingIndex(key: string, current: number, count: number): number | null {
  if (count === 0) return null;
  const move = rovingMove(key, true, false);
  if (move === null) return null;
  if (current < 0 && (move === 'next' || move === 'prev')) return move === 'next' ? 0 : count - 1;
  return stepIndex(move, current, count);
}
