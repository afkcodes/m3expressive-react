import { createContext } from 'react';

export type ListItemVariant = 'expressive' | 'baseline';

export interface ListContextValue {
  inList: boolean;
  segmented: boolean;
  variant: ListItemVariant;
}

/** Provided by <List>: items render as <li> and pick up the list's style. */
export const ListContext = createContext<ListContextValue>({
  inList: false,
  segmented: false,
  variant: 'expressive',
});
