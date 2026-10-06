import * as stylex from '@stylexjs/stylex';

/** Card-internal channel: where the outline sits relative to the state layer (z -1). */
export const cardVars = stylex.defineVars({
  strokeZ: '-1',
});
