import { useEffect, useRef, useState, type ComponentPropsWithRef } from 'react';
import * as stylex from '@stylexjs/stylex';
import { color } from '../tokens/color.stylex.ts';
import { animateSpring, type SpringAnimation } from '../motion/animate.ts';
import { useSpringToken } from '../motion/context.tsx';
import type { SpringToken } from '../motion/tokens.ts';
import { SHAPE_FRAME, figmaShapes, type ShapeName } from './figmaPaths.ts';
import { createShapeMorph, polygonFromCubics, shapeMorphPath } from './shapeMorph.ts';
import { isNamed } from './isNamed.ts';
import type { SxProps } from '../primitives/types.ts';
import type { Morph } from './graphics/morph.ts';

const styles = stylex.create({
  root: { display: 'block', flexShrink: 0, color: color.primary, fill: 'currentColor' },
});

export interface MorphingShapeProps extends SxProps<Omit<ComponentPropsWithRef<'svg'>, 'children'>> {
  /** Target shape. Changing it morphs from wherever the outline currently is. */
  shape: ShapeName;
  /** Edge length: px (a free size) or a CSS length. Default 48. */
  size?: number | string;
  /** Spring for the morph progress. Shape is spatial motion; Compose uses spatial specs. */
  spring?: Extract<SpringToken, `${string}-spatial`>;
}

/**
 * Shape that morphs between M3 Expressive shapes with a spring. At rest it draws the exact Figma
 * path; while moving, frames come from the AndroidX Morph between Figma-derived polygons.
 * Interruptions restart from the current in-between outline (no jump). Reduced motion: instant.
 */
export function MorphingShape({ shape, size = 48, spring = 'default-spatial', sx, ...rest }: MorphingShapeProps) {
  const pathRef = useRef<SVGPathElement>(null);
  const current = useRef<{ morph: Morph | null; progress: number; target: ShapeName; anim: SpringAnimation | null }>({
    morph: null,
    progress: 1,
    target: shape,
    anim: null,
  });
  const params = useSpringToken(spring);
  // React renders the mount-time path only; every later outline is written by the effect below
  // (a re-render must never put a stale `d` back mid-morph).
  const [mountShape] = useState(shape);

  useEffect(() => {
    const state = current.current;
    const path = pathRef.current;
    if (!path || state.target === shape) return;

    const rest = (name: ShapeName) => {
      path.setAttribute('d', figmaShapes[name].d);
      path.setAttribute('fill-rule', figmaShapes[name].fillRule);
    };

    // Start from the outline as it is right now (mid-morph or at rest).
    const from = state.morph && state.anim ? polygonFromCubics(state.morph.asCubics(state.progress)) : state.target;
    state.anim?.stop();
    state.target = shape;

    if (!params) {
      state.morph = null;
      rest(shape);
      return;
    }

    const morph = createShapeMorph(from, shape);
    state.morph = morph;
    state.progress = 0;
    path.setAttribute('fill-rule', 'nonzero');
    state.anim = animateSpring({
      spring: params,
      from: 0,
      to: 1,
      precision: 0.001,
      onUpdate: (p) => {
        state.progress = p;
        path.setAttribute('d', shapeMorphPath(morph, p));
      },
      onComplete: () => {
        state.anim = null;
        state.morph = null;
        rest(shape);
      },
    });
  }, [shape, params]);

  useEffect(() => () => current.current.anim?.stop(), []);

  const initial = figmaShapes[mountShape];
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
      <path ref={pathRef} d={initial.d} fillRule={initial.fillRule} />
    </svg>
  );
}
