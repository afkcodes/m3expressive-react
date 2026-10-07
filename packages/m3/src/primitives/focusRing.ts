import * as stylex from '@stylexjs/stylex';
import { color } from '../tokens/color.stylex.ts';
import { state } from '../tokens/state.stylex.ts';

/**
 * M3 focus indicator: 3px ring, 2px outside the component, secondary colour,
 * following the host's corner radius. Keyboard focus only.
 */
export const focusRing = stylex.create({
  host: {
    outlineStyle: { default: 'none', ':focus-visible': 'solid' },
    outlineColor: color.secondary,
    outlineWidth: state.focusIndicatorThickness,
    outlineOffset: state.focusIndicatorOuterOffset,
  },
  /** Visual-test hook. */
  forced: { outlineStyle: 'solid' },
});
