import * as stylex from '@stylexjs/stylex';

/**
 * Per-component interaction channel. A host sets `layerOpacity` from its own
 * :hover / :focus-visible state (see `stateLayerHost`), and <StateLayer/>
 * reads it — so the overlay needs no React state.
 */
export const interaction = stylex.defineVars({
  layerOpacity: '0',
  /** Colour of the state layer. Defaults to the host's content colour. */
  layerColor: 'currentColor',
  /** Ripple colour — defaults to the host's content colour (checkbox uses the opposite role). */
  rippleColor: 'currentColor',
  /** Ripple peak alpha — md.sys.state.pressed (0.1) unless a component's kit spec differs. */
  rippleOpacity: '0.1',
});
