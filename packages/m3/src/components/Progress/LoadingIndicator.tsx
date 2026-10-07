import { forwardRef, useEffect, useRef } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { Progress } from '@base-ui/react/progress';
import { color } from '../../tokens/color.stylex.ts';
import { animateSpring, type SpringAnimation } from '../../motion/animate.ts';
import { Morph } from '../../shapes/graphics/morph.ts';
import { RoundedPolygon } from '../../shapes/graphics/roundedPolygon.ts';
import { SvgPathParser } from '../../shapes/graphics/svgPathParser.ts';
import { morphToSvgPath } from '../../shapes/graphics/svg.ts';
import { useForcedState } from '../../testing/ForceState.tsx';
import { loadingShapes } from './loadingShapes.ts';
import { MORPH_INTERVAL, MORPH_PRECISION, MORPH_SPRING, SPIN_MS } from './motion.ts';

const s = stylex.create({
  root: { display: 'inline-block', width: 48, height: 48, flexShrink: 0, verticalAlign: 'middle' },
  svg: { display: 'block' },
  container: { fill: color.primaryContainer },
  shape: { fill: color.primary },
  shapeOnContainer: { fill: color.onPrimaryContainer },
});

const C = 24;

let morphs: Morph[] | null = null;
const getMorphs = () => {
  if (!morphs) {
    const polys = loadingShapes.map((d) =>
      RoundedPolygon.fromFeatures(SvgPathParser.parseFeatures(d), { centerX: C, centerY: C }),
    );
    morphs = polys.map((p, i) => new Morph(p, polys[(i + 1) % polys.length]!));
  }
  return morphs;
};

export interface LoadingIndicatorProps {
  /** "Show container": a 48px primary-container circle behind the shape. */
  container?: boolean;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  sx?: StyleXStyles;
}

/**
 * Loading indicator (kit set "Loading indicator"): the 38px active shape cycles through the kit's
 * seven shapes (Steps 1–7). At rest each step is the exact Figma vector; in-between frames come
 * from the AndroidX Morph. Animation runs on rAF and writes the path directly (no re-renders).
 */
export const LoadingIndicator = forwardRef<HTMLDivElement, LoadingIndicatorProps>(function LoadingIndicator(
  { container = false, sx, ...aria },
  ref,
) {
  const forced = useForcedState().progress;
  const step = forced?.step;
  const path = useRef<SVGPathElement>(null);
  const group = useRef<SVGGElement>(null);

  useEffect(() => {
    if (step !== undefined) return;
    const list = getMorphs();
    // Compose LoadingIndicatorImpl: `while (true) { val d = async { morph.animateTo(1f, spring) };
    // delay(650); d.await() }`. The spring (0.6, 200, threshold 0.1) ends at ≈297ms mid overshoot
    // (≈1.09) and snaps; then the next shape is current, progress snaps to 0 and the rotation
    // target advances a quarter turn. An iteration starts 650ms after the previous one, or when
    // its morph finishes if that is later. Drawing rotates by progress·90 + target + spin.
    let index = 0;
    let progress = 0;
    let target = 90;
    let spring: SpringAnimation | null = null;
    let iteration = 0; // ms (from the first frame) at which the next iteration may start
    let finishedAt = 0;
    let t0: number | undefined;
    let frame = 0;
    const draw = (now: number) => {
      t0 ??= now;
      const t = now - t0;
      if (!spring && t >= iteration) {
        iteration = Math.max(iteration, finishedAt) + MORPH_INTERVAL;
        spring = animateSpring({
          spring: MORPH_SPRING,
          from: 0,
          to: 1,
          precision: MORPH_PRECISION,
          onUpdate: (v) => (progress = v),
          onComplete: () => {
            index = (index + 1) % list.length;
            progress = 0;
            target = (target + 90) % 360;
            finishedAt = performance.now() - t0!;
            spring = null;
          },
        });
      }
      path.current?.setAttribute('d', progress === 0 ? loadingShapes[index]! : morphToSvgPath(list[index]!, progress));
      const rotation = progress * 90 + target + (t / SPIN_MS) * 360;
      group.current?.setAttribute('transform', `rotate(${rotation.toFixed(2)} ${C} ${C})`);
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      spring?.stop();
    };
  }, [step]);

  return (
    <Progress.Root ref={ref} value={null} {...aria} {...stylex.props(s.root, sx)}>
      <svg width={48} height={48} viewBox="0 0 48 48" {...stylex.props(s.svg)} aria-hidden>
        {container && <circle cx={C} cy={C} r={24} {...stylex.props(s.container)} />}
        <g ref={group}>
          <path
            ref={path}
            d={loadingShapes[(step ?? 0) % loadingShapes.length]}
            {...stylex.props(container ? s.shapeOnContainer : s.shape)}
          />
        </g>
      </svg>
    </Progress.Root>
  );
});
