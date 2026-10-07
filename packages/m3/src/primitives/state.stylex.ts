import * as stylex from '@stylexjs/stylex';

/**
 * Per-component interaction channel. A host sets `layerOpacity` from its own
 * :hover / :focus-visible state (see `stateLayerHost`), and <StateLayer/>
 * reads it — so the overlay needs no React state.
 */
export const interaction = stylex.defineVars({
  layerOpacity: '0',
  /**
   * State-layer fade. Compose material-ripple `StateLayer`: every change is a 15 ms linear
   * tween, except entering focus / drag (45 ms) and leaving drag (150 ms).
   */
  layerDuration: '15ms',
  /** Colour of the state layer. Defaults to the host's content colour. */
  layerColor: 'currentColor',
  /** Ripple colour — defaults to the host's content colour (checkbox uses the opposite role). */
  rippleColor: 'currentColor',
  /** Ripple peak alpha — md.sys.state.pressed (0.1) unless a component's kit spec differs. */
  rippleOpacity: '0.1',
});
