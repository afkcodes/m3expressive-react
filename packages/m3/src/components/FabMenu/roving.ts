/**
 * Arrow-key movement through the FAB menu's items (0 = top), wrapping at the ends; Home / End jump
 * to the first / last item. From outside the items (`current` −1, the toggle below them) ArrowUp
 * enters at the nearest (last) item and ArrowDown at the first. Null: the key isn't handled.
 */
export function rovingIndex(key: string, current: number, count: number): number | null {
  if (count === 0) return null;
  switch (key) {
    case 'ArrowDown':
      return current < 0 ? 0 : (current + 1) % count;
    case 'ArrowUp':
      return current < 0 ? count - 1 : (current - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}
