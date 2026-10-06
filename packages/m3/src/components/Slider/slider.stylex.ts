import * as stylex from '@stylexjs/stylex';

/** Handle widths (4px at rest, 2px pressed); every track edge next to a handle reads these. */
export const sliderVars = stylex.defineVars({ hw0: '4px', hw1: '4px' });
/** Markers so the root can react to each thumb's pressed (data-dragging) state. */
export const thumb0 = stylex.defineMarker();
export const thumb1 = stylex.defineMarker();
