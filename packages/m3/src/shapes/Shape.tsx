import type { ComponentPropsWithRef } from 'react';
import * as stylex from '@stylexjs/stylex';
import { color } from '../tokens/color.stylex.ts';
import type { SxProps } from '../primitives/types.ts';
import { isNamed } from './isNamed.ts';
import { SHAPE_FRAME, figmaShapes, type ShapeName } from './figmaPaths.ts';

const styles = stylex.create({
  root: {
    display: 'block',
    flexShrink: 0,
    color: color.primary,
    fill: 'currentColor',
  },
});

export interface ShapeProps extends SxProps<Omit<ComponentPropsWithRef<'svg'>, 'children'>> {
  /** One of the 35 M3 Expressive shapes. */
  shape: ShapeName;
  /** Edge length of the shape's frame: px (a free size — M3 has no shape size scale) or a CSS length. Default 48. */
  size?: number | string;
}

/**
 * Static M3 Expressive shape — the Figma component exactly: the vector sits
 * inside a square frame with the kit's per-shape padding, scaled to `size`. Filled with
 * `currentColor`, primary by default as in the kit (override with `sx`). `ref` reaches the `<svg>`.
 */
export function Shape({ shape, size = 48, sx, ...rest }: ShapeProps) {
  const s = figmaShapes[shape];
  const named = isNamed(rest);
  return (
    <svg
      viewBox={`0 0 ${SHAPE_FRAME} ${SHAPE_FRAME}`}
      width={size}
      height={size}
      role={named ? 'img' : undefined}
      aria-hidden={named ? undefined : true}
      {...rest}
      {...stylex.props(styles.root, sx)}
    >
      <path d={s.d} fillRule={s.fillRule} />
    </svg>
  );
}
