import * as stylex from '@stylexjs/stylex';

/**
 * The few Compose M3 animations that are fixed tweens, not motion-scheme springs.
 *
 * Elevation — material3 internal/Elevation.kt `ElevationDefaults` (buttons, FABs, cards, chips):
 *   entering any interaction (hover / focus / press / drag): 120 ms FastOutSlowIn;
 *   back to rest: 120 ms cubic(0.4, 0, 0.6, 1) from hover, 150 ms from press / focus / drag.
 * CSS can't tell which state is being left, so rest uses the hover exit on hover-capable
 * devices (a release there lands in hover, an "entering" tween) and the press exit on touch.
 * Disabled snaps (Compose `snapTo`): set the duration to 0s there.
 */
export const tween = stylex.defineVars({
  elevationInDuration: '120ms',
  elevationInEasing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  elevationOutDuration: { default: '120ms', '@media (hover: none)': '150ms' },
  elevationOutEasing: 'cubic-bezier(0.4, 0, 0.6, 1)',
});
