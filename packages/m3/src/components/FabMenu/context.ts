import { createContext } from 'react';
import type { FabMenuColor } from './fabMenuStyles.ts';

/** What a FabMenu tells its items (memoised; each item's position comes from FabMenuIndexContext). */
export interface FabMenuContextValue {
  color: FabMenuColor;
  close: () => void;
  /** Inside a FabMenu: reveal / hide with the stagger. Standalone items are static. */
  animated: boolean;
  /** Number of items, and how many of them the stagger shows (item i while i >= total − visibleCount). */
  total: number;
  visibleCount: number;
  /** Roving tabindex: the index of the menu's tab stop. */
  tabStop: number;
  /** Item reports whether it is drawn (alpha > 0) so the menu can unmount the list after closing. */
  onShown: (index: number, shown: boolean) => void;
  /** Item received focus (it becomes the tab stop). */
  onItemFocus: (index: number) => void;
}

const noop = () => {};

export const FabMenuContext = createContext<FabMenuContextValue>({
  color: 'primary',
  close: noop,
  animated: false,
  total: 0,
  visibleCount: 0,
  tabStop: 0,
  onShown: noop,
  onItemFocus: noop,
});

/** The item's position in its menu, 0 = top (a number, so the provider value is stable). */
export const FabMenuIndexContext = createContext(0);
