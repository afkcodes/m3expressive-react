import { createContext } from 'react';

export type TabsVariant = 'primary' | 'secondary';

export interface TabsContextValue {
  variant: TabsVariant;
  scrollable: boolean;
  /** Inside a live `<Tabs>` row (real Base UI tabs); otherwise static renderings. */
  live: boolean;
}

export const TabsContext = createContext<TabsContextValue>({ variant: 'primary', scrollable: false, live: false });
