import type { SVGProps } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { color } from '../tokens/color.stylex.ts';
import { SHAPE_FRAME, figmaShapes, type ShapeName } from './figmaPaths.ts';

const styles = stylex.create({
  root: {
    display: 'block',
    flexShrink: 0,
    color: color.primary,
    fill: 'currentColor',
  },
});

export interface ShapeProps extends Omit<SVGProps<SVGSVGElement>, 'style' | 'className' | 'children'> {
  /** One of the 35 M3 Expressive shapes. */
  shape: ShapeName;
  /** Edge length of the shape's frame (CSS length or px number). Default 48. */
  size?: number | string;
  /** Colour etc. — defaults to md.sys.color.primary, as in the kit. */
  sx?: StyleXStyles;
  /** Accessible name. Without it the shape is decorative (aria-hidden). */
  label?: string;
}

/**
 * Static M3 Expressive shape — the Figma component exactly: the vector sits
 * inside a square frame with the kit's per-shape padding, scaled to `size`.
 */
export function Shape({ shape, size = 48, sx, label, ...rest }: ShapeProps) {
  const s = figmaShapes[shape];
  return (
    <svg
      viewBox={`0 0 ${SHAPE_FRAME} ${SHAPE_FRAME}`}
      width={size}
      height={size}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      {...rest}
      {...stylex.props(styles.root, sx)}
    >
      <path d={s.d} fillRule={s.fillRule} />
    </svg>
  );
}
