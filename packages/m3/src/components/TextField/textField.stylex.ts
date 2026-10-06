import * as stylex from '@stylexjs/stylex';

export const textFieldVars = stylex.defineVars({
  /**
   * Fill behind the outlined field's floating-label notch. The notch is a real gap in the outline
   * (works on any background), so this defaults to transparent. The Figma kit draws the notch as a
   * Surface-coloured patch instead (Figma can't cut strokes); parity fixtures set it to Surface.
   */
  notchColor: 'transparent',
});
/** Marks the text field container so hover styles react to this field only. */
export const textFieldMarker = stylex.defineMarker();
