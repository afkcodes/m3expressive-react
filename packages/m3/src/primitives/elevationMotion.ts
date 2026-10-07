import * as stylex from '@stylexjs/stylex';
import { tween } from './tweens.stylex.ts';

/**
 * Shadow transition for an interactive surface whose elevation follows its own :hover /
 * :focus-visible / :active — Compose `animateElevation` (see tweens.stylex.ts). A CSS
 * transition takes the spec of the style being entered, so the "in" tween sits on the state
 * conditions and the "out" tween on the rest style.
 */
export const elevationMotion = stylex.create({
  host: {
    transitionProperty: 'box-shadow',
    transitionDuration: {
      default: tween.elevationOutDuration,
      ':hover': { default: null, '@media (hover: hover)': tween.elevationInDuration },
      ':focus-visible': { default: tween.elevationInDuration, '@media (hover: hover)': tween.elevationInDuration },
      ':active': { default: tween.elevationInDuration, '@media (hover: hover)': tween.elevationInDuration },
    },
    transitionTimingFunction: {
      default: tween.elevationOutEasing,
      ':hover': { default: null, '@media (hover: hover)': tween.elevationInEasing },
      ':focus-visible': { default: tween.elevationInEasing, '@media (hover: hover)': tween.elevationInEasing },
      ':active': { default: tween.elevationInEasing, '@media (hover: hover)': tween.elevationInEasing },
    },
  },
  /** Compose snaps elevation when disabled. */
  none: { transitionDuration: '0s' },
});
