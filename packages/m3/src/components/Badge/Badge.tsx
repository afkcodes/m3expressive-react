import type { ComponentPropsWithRef, ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex.ts';
import { shape } from '../../tokens/shape.stylex.ts';
import { typescale } from '../../tokens/typescale.ts';
import { textBox } from '../../primitives/textBox.ts';
import type { SxProps } from '../../primitives/types.ts';

/*
 * Figma kit, Badges page (set "Badges"):
 *   Small  6×6 dot (2px padding around a 2px spacer), Error.
 *   Large  16px tall, hug width with min 16 / max 34, 4px side padding, Error fill,
 *          label-small On Error, label fills the box and is centred.
 */
const styles = stylex.create({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
    flexShrink: 0,
    borderRadius: shape.cornerFull,
    backgroundColor: color.error,
    color: color.onError,
    verticalAlign: 'middle',
  },
  small: { width: 6, height: 6 },
  large: {
    height: 16,
    minWidth: 16,
    maxWidth: 34,
    paddingInline: 4,
    overflow: 'hidden',
  },
  label: {
    flexGrow: 1,
    textAlign: 'center',
  },
});

export interface BadgeProps extends SxProps<Omit<ComponentPropsWithRef<'span'>, 'children'>> {
  /** Badge content. Omit for the small dot badge. */
  children?: ReactNode;
  /** Numeric content; values above `max` render as `${max}+` (M3: at most 4 characters). */
  count?: number;
  max?: number;
}

export function Badge({ children, count, max = 999, sx, ...rest }: BadgeProps) {
  const content = count !== undefined ? (count > max ? `${max}+` : String(count)) : children;
  const large = content !== undefined && content !== null && content !== false;
  return (
    <span {...rest} {...stylex.props(styles.base, large ? styles.large : styles.small, sx)}>
      {large && <span {...stylex.props(typescale.labelSmall, textBox.hug, styles.label)}>{content}</span>}
    </span>
  );
}
