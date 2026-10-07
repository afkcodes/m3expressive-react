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
  /** Which part the forced state applies to, for multi-part components (range slider thumb). */
  thumb?: number;
  /** Text inputs under a forced focus draw the kit's static caret (default true). */
  caret?: boolean;
  /** Frozen progress-indicator frame (the kit's still frames of animated indicators). */
  progress?: ForcedProgressFrame;
  /**
   * A single part drawn outside its container (the kit's building-block sheets): its selection
   * (tab, navigation item, segment, connected-group item) …
   */
  selected?: boolean;
  /** … and its place in a row of segments. */
  position?: ForcedPosition;
}

export type ForcedPosition = 'start' | 'middle' | 'end' | 'only';

export interface ForcedProgressFrame {
  /** Render the live animation at this time (ms) instead of a still frame. */
  time?: number;
  /** Wave offset: px from the first active's start (linear) or degrees (circular). */
  phase?: number;
  /** Linear indeterminate: active centre-line frames, px. */
  actives?: [number, number][];
  /** Circular indeterminate: the determinate arc for `value`, rotated by `rotation` degrees. */
  value?: number;
  rotation?: number;
  /** Loading indicator: shape index (0-based). */
  step?: number;
}

const ForceStateContext = createContext<ForceStateValue>({});

export function ForceState({ children, ...value }: ForceStateValue & { children: ReactNode }) {
  return <ForceStateContext value={value}>{children}</ForceStateContext>;
}

export const useForcedState = () => useContext(ForceStateContext);

const NONE: ForceStateValue = {};

/** Stops a forced state at a part boundary (a search bar's nested icon buttons, a view's result rows). */
export function ForceStateBoundary({ children }: { children: ReactNode }) {
  return <ForceStateContext value={NONE}>{children}</ForceStateContext>;
}
