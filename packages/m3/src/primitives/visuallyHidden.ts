import * as stylex from '@stylexjs/stylex';

/** Hidden visually, still read by assistive technology (names for icon-only controls, hidden labels). */
export const visuallyHidden = stylex.create({
  root: {
    position: 'absolute',
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: 'hidden',
    clipPath: 'inset(50%)',
    whiteSpace: 'nowrap',
    borderWidth: 0,
  },
});
