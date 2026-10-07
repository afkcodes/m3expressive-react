import { createContext } from 'react';

/**
 * A list's style. Expressive: `standard` (items on the background) or `segmented` (filled tiles,
 * 2px gaps); `baseline` is the classic M3 list (the kit has no segmented baseline list).
 */
export type ListVariant = 'standard' | 'segmented' | 'baseline';

export interface ListContextValue {
  inList: boolean;
  variant: ListVariant;
}

/** Provided by <List>: items render as <li> and pick up the list's style. */
export const ListContext = createContext<ListContextValue>({ inList: false, variant: 'standard' });

/** Provided by a ListItem to its slots: media follow the item's style and selection. */
export interface ListItemContextValue {
  variant: ListVariant;
  selected: boolean;
}

export const ListItemContext = createContext<ListItemContextValue | null>(null);
