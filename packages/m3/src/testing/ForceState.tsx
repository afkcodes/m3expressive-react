import { createContext, useContext, type ReactNode } from 'react';

/**
 * Visual-test hook: renders interaction states statically, the way the Figma
 * kit draws its State=Hovered/Focused/Pressed/Dragged variants. Not part of the
 * public component API — exported from `@m3x/react/testing` only.
 */
export type ForcedState = 'hovered' | 'focused' | 'pressed' | 'dragged';

export interface ForceStateValue {
  state?: ForcedState;
  /** Figma's "Show focus indicator" boolean (off in the kit's default variants). */
  focusRing?: boolean;
  /** Frozen ripple blob from the Figma Pressed variant, in container-local px. */
  ripplePath?: string;
}

const ForceStateContext = createContext<ForceStateValue>({});

export function ForceState({ children, ...value }: ForceStateValue & { children: ReactNode }) {
  return <ForceStateContext value={value}>{children}</ForceStateContext>;
}

export const useForcedState = () => useContext(ForceStateContext);
