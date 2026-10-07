import * as stylex from '@stylexjs/stylex';
import { color } from '../tokens/color.stylex.ts';
import { state } from '../tokens/state.stylex.ts';

/**
 * M3 focus indicator: 3px ring, 2px outside the component, secondary colour, following the
 * element's corner radius. Keyboard focus only (`:focus-visible`).
 *
 * Pick the variant by where focus lands:
 *   - `host`   — the element that takes focus draws the ring;
 *   - `part`   — an inner part draws it when the interactive root (marked with
 *                `stylex.defaultMarker()`) has keyboard focus;
 *   - `within` — a container draws it when any descendant has keyboard focus.
 * `forced` is the visual-test hook (`<ForceState focusRing>`). Components with their own offset or
 * radius override `outlineOffset` / `borderRadius` after these styles.
 */
export const focusRing = stylex.create({
  host: {
    outlineStyle: { default: 'none', ':focus-visible': 'solid' },
    outlineColor: color.secondary,
    outlineWidth: state.focusIndicatorThickness,
    outlineOffset: state.focusIndicatorOuterOffset,
  },
  part: {
    outlineStyle: { default: 'none', [stylex.when.ancestor(':focus-visible')]: 'solid' },
    outlineColor: color.secondary,
    outlineWidth: state.focusIndicatorThickness,
    outlineOffset: state.focusIndicatorOuterOffset,
  },
  within: {
    outlineStyle: { default: 'none', ':has(:focus-visible)': 'solid' },
    outlineColor: color.secondary,
    outlineWidth: state.focusIndicatorThickness,
    outlineOffset: state.focusIndicatorOuterOffset,
  },
  forced: { outlineStyle: 'solid' },
});
