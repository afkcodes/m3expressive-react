import * as stylex from '@stylexjs/stylex';

/** md.sys.state.* — state layer opacities (Compose StateTokens) + disabled roles. */
export const state = stylex.defineVars({
  hoverOpacity: '0.08',
  focusOpacity: '0.1',
  pressedOpacity: '0.1',
  draggedOpacity: '0.16',
  disabledContainerOpacity: '0.12',
  disabledContentOpacity: '0.38',
  /** Focus indicator (2024 spec): 3px ring, 2px outside the component, secondary colour. */
  focusIndicatorThickness: '3px',
  focusIndicatorOuterOffset: '2px',
});
