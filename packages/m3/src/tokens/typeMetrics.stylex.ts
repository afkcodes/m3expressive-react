import * as stylex from '@stylexjs/stylex';

/**
 * Set by every typescale role so layout primitives can reproduce Figma's text
 * box maths (see primitives/textBox.ts).
 */
export const typeMetrics = stylex.defineVars({
  tracking: '0px',
});
