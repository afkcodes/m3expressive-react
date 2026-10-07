import * as stylex from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex.ts';
import { motion } from '../../tokens/motion.stylex.ts';

/** The modal scrim: Scrim at 32% (Compose ScrimTokens), fading on default effects. */
export const scrim = stylex.create({
  backdrop: {
    position: 'fixed',
    inset: 0,
    backgroundColor: `color-mix(in srgb, ${color.scrim} 32%, transparent)`,
    opacity: { default: 1, ':is([data-starting-style], [data-ending-style])': 0 },
    transitionProperty: 'opacity',
    transitionDuration: motion.defaultEffectsDuration,
    transitionTimingFunction: motion.defaultEffectsEasing,
  },
  fill: { backgroundColor: `color-mix(in srgb, ${color.scrim} 32%, transparent)` },
});
