import type { ComponentPropsWithRef, ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex.ts';
import { typeface } from '../../tokens/typeface.stylex.ts';
import type { SxProps } from '../../primitives/types.ts';

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

export interface AvatarProps extends SxProps<ComponentPropsWithRef<'span'>> {
  /** Monogram content (e.g. an initial). Ignored when `src` is set. */
  children?: ReactNode;
  src?: string;
  alt?: string;
  /**
   * Diameter in px (default 40). A number, not the `xsmall`…`xlarge` scale: M3 has no avatar size
   * scale — avatars take whatever size their slot gives them (24 in a chip, 32 in an app bar, 40 in a list).
   */
  size?: number;
  /** Styles for the `src` image (e.g. a blend mode). */
  imageSx?: StyleXStyles;
}

export function Avatar({ ref, children, src, alt = '', size = 40, sx, imageSx, ...rest }: AvatarProps) {
  return (
    <span ref={ref} {...rest} {...stylex.props(styles.root, sizes.size(size), sx)}>
      {src ? <img src={src} alt={alt} {...stylex.props(styles.image, imageSx)} /> : children}
    </span>
  );
}
