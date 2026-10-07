import { createContext } from 'react';

export type MenuVariant = 'standard' | 'vibrant' | 'baseline';
export type MenuDensity = 0 | -2 | -4;

export interface MenuContextValue {
  variant: MenuVariant;
  density: MenuDensity;
  /** Inside a Base UI menu popup (items are real, focusable menu items). */
  live: boolean;
}
export const MenuContext = createContext<MenuContextValue>({ variant: 'standard', density: 0, live: false });
/** Number of groups in the enclosing menu (shadow spread depends on it). */
export const GroupCountContext = createContext(1);
/**
 * Provided by an expressive menu: its groups register (returns the unregister), so groups rendered
 * by wrapper components count too. A group resets it for its own contents (no nested groups).
 */
export const GroupRegistryContext = createContext<(() => () => void) | null>(null);
