import { createContext } from 'react';

/** How an item lays out: icon over label (bar / collapsed rail), or in a row (wide bar / expanded rail). */
export type NavigationItemLayout = 'vertical' | 'horizontal' | 'rail-horizontal';

/** A rail collapsing / expanding (see railMorph.ts). Changes only when the morph starts, flips or ends. */
export interface RailMorph {
  /** The target layout (Compose: iconPosition == Start). */
  toExpanded: boolean;
  /** Labels in the collapsed (label-medium, under the icon) style: collapsing and under halfway. */
  topLabels: boolean;
}

/**
 * The morph's iconPositionProgress (0 collapsed … 1 expanded; may overshoot). Published outside
 * React so a frame doesn't re-render the rail: parts read `value` and subscribe in layout
 * effects and write their geometry to their own elements.
 */
export interface RailProgress {
  readonly value: number;
  /** Calls `listener` with every new value; returns the unsubscribe. */
  subscribe: (listener: (value: number) => void) => () => void;
}

export function createRailProgress(initial: number): RailProgress & { set: (value: number) => void } {
  let current = initial;
  const listeners = new Set<(value: number) => void>();
  return {
    get value() {
      return current;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    set(value) {
      current = value;
      for (const listener of listeners) listener(value);
    },
  };
}

export interface NavContextValue {
  layout: NavigationItemLayout;
  value: unknown;
  onSelect?: (value: unknown) => void;
  /** Collapsed rail: show labels under icons (default true). */
  showLabels: boolean;
  /** Bar items share the bar's width. */
  fill: boolean;
  /** Rail collapsing / expanding (null at rest). */
  morph?: RailMorph | null;
  /** The rail's morph progress (rails only). */
  progress?: RailProgress;
}

export const NavContext = createContext<NavContextValue>({
  layout: 'vertical',
  value: undefined,
  showLabels: true,
  fill: false,
});
