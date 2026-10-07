import type { AnchorHTMLAttributes, HTMLAttributes } from 'react';
import type { StyleXStyles } from '@stylexjs/stylex';

/**
 * Native props of a component's root with `className` / `style` replaced by StyleX `sx` — the
 * styling override every component takes (docs/API-CONVENTIONS.md §2).
 */
export type SxProps<P> = Omit<P, 'className' | 'style'> & {
  /** StyleX styles applied to the root, after the component's own. */
  sx?: StyleXStyles;
};

/**
 * Native props of a part that renders a link with `href` and a button (or plain element) without:
 * the shared HTML attributes plus the anchor-only ones that make sense on a navigation target.
 */
export type LinkOrButtonProps = HTMLAttributes<HTMLElement> &
  Pick<AnchorHTMLAttributes<HTMLAnchorElement>, 'target' | 'rel' | 'download' | 'hrefLang' | 'ping' | 'referrerPolicy'>;
