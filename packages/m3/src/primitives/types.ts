import type { StyleXStyles } from '@stylexjs/stylex';

/**
 * Native props of a component's root with `className` / `style` replaced by StyleX `sx` — the
 * styling override every component takes (docs/API-CONVENTIONS.md §2).
 */
export type SxProps<P> = Omit<P, 'className' | 'style'> & {
  /** StyleX styles applied to the root, after the component's own. */
  sx?: StyleXStyles;
};
