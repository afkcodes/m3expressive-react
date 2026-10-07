import * as stylex from '@stylexjs/stylex';

/**
 * Radio dot radius as a fraction of its 6dp target (Compose `animatedDotRadius`, FastSpatial).
 * A typed number (@property) with a literal name, so `transition-property` can name it and the
 * dot's scale can derive from it while it springs (and overshoots).
 */
export const radioVars = stylex.defineVars({
  '--m3x-radio-dot': stylex.types.number(1),
});
