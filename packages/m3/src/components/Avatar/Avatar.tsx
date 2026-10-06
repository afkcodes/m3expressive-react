import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex';
import { typeface } from '../../tokens/typeface.stylex';

/*
 * Figma kit "Generic avatar" (used by cards, lists…): 40px circle.
 * Monogram: primary-container fill, on-primary-container initial, Roboto Medium 16/24, 0.1px tracking.
 */
const styles = stylex.create({
  root: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
    borderRadius: '50%',
    backgroundColor: color.primaryContainer,
    color: color.onPrimaryContainer,
    fontFamily: typeface.plain,
    fontWeight: typeface.weightMedium,
    fontSize: 16,
    lineHeight: '24px',
    letterSpacing: '0.1px',
    userSelect: 'none',
  },
  image: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
});

const sizes = stylex.create({ size: (px: number) => ({ width: px, height: px }) });

export interface AvatarProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'className' | 'style' | 'children'> {
  /** Monogram content (e.g. an initial). Ignored when `src` is set. */
  children?: ReactNode;
  src?: string;
  alt?: string;
  size?: number;
  sx?: StyleXStyles;
}

export const Avatar = forwardRef<HTMLSpanElement, AvatarProps>(function Avatar(
  { children, src, alt = '', size = 40, sx, ...rest },
  ref,
) {
  return (
    <span ref={ref} {...rest} {...stylex.props(styles.root, sizes.size(size), sx)}>
      {src ? <img src={src} alt={alt} {...stylex.props(styles.image)} /> : children}
    </span>
  );
});
