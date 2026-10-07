import * as stylex from '@stylexjs/stylex';

/*
 * Material Components' M3 dialog window animation (Compose dialogs still use the platform window
 * animation, so MDC is the reference): MaterialAlertDialog.Material3.Animation →
 *   m3_motion_fade_enter: medium4 (400ms), alpha 0 → 1 + scale 0.8 → 1 about the centre,
 *     m3_sys_motion_easing_emphasized_decelerate = cubic-bezier(0.1, 0.7, 0.1, 1);
 *   m3_motion_fade_exit: short3 (150ms), alpha 1 → 0,
 *     m3_sys_motion_easing_emphasized_accelerate = cubic-bezier(0.3, 0, 0.8, 0.2)
 * (material-components-android res/values/m3_sys_motion tokens.xml v34.0.0; Compose's
 * EasingEmphasized* tokens are 0.05 / 0.15 — not these.)
 * Reduced motion drops the scale (spatial) and keeps the fade (effects).
 */
export const EMPHASIZED_DECELERATE = 'cubic-bezier(0.1, 0.7, 0.1, 1)';
export const EMPHASIZED_ACCELERATE = 'cubic-bezier(0.3, 0, 0.8, 0.2)';

const REDUCED = '@media (prefers-reduced-motion: reduce)';

export const dialogMotion = stylex.create({
  fadeScale: {
    opacity: { default: 1, ':is([data-starting-style], [data-ending-style])': 0 },
    scale: { default: '1', ':is([data-starting-style])': { default: '0.8', [REDUCED]: '1' } },
    transitionProperty: 'opacity, scale',
    transitionDuration: { default: '400ms', ':is([data-ending-style])': '150ms' },
    transitionTimingFunction: { default: EMPHASIZED_DECELERATE, ':is([data-ending-style])': EMPHASIZED_ACCELERATE },
  },
  /**
   * Full-screen dialogs (the full-screen range picker): the same fade and easings with a 24px
   * rise instead of the scale — the rise has no source reference (unverified).
   */
  fadeRise: {
    opacity: { default: 1, ':is([data-starting-style], [data-ending-style])': 0 },
    translate: { default: '0 0', ':is([data-starting-style])': { default: '0 24px', [REDUCED]: '0 0' } },
    transitionProperty: 'opacity, translate',
    transitionDuration: { default: '400ms', ':is([data-ending-style])': '150ms' },
    transitionTimingFunction: { default: EMPHASIZED_DECELERATE, ':is([data-ending-style])': EMPHASIZED_ACCELERATE },
  },
});
