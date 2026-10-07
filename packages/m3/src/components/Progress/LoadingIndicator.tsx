import { forwardRef, useEffect, useRef } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { Progress } from '@base-ui/react/progress';
import { color } from '../../tokens/color.stylex.ts';
import { useMergedRefs } from '../../hooks/useMergedRefs.ts';
import { Morph } from '../../shapes/graphics/morph.ts';
import { RoundedPolygon } from '../../shapes/graphics/roundedPolygon.ts';
import { SvgPathParser } from '../../shapes/graphics/svgPathParser.ts';
import { morphToSvgPath } from '../../shapes/graphics/svg.ts';
import { useForcedState } from '../../testing/ForceState.tsx';
import { loadingShapes } from './loadingShapes.ts';
import { MORPH_INTERVAL, MORPH_PRECISION, MORPH_SPRING, SPIN_MS, SpringAnimator } from './motion.ts';
import { observeOnScreen, onEveryFrame } from './frameClock.ts';

const s = stylex.create({
  root: { display: 'inline-block', width: 48, height: 48, flexShrink: 0, verticalAlign: 'middle' },
  svg: { display: 'block' },
  container: { fill: color.primaryContainer },
  shape: { fill: color.primary },
  shapeOnContainer: { fill: color.onPrimaryContainer },
});

/** Centre of the 48px indicator frame. */
const CENTRE = 24;

/*
 * The shapes as AndroidX polygons and the morph from each to the next, shared by every indicator.
 * Built lazily, one morph when it is first needed (a polygon fit and a Morph are not free), so a
 * mounting indicator builds two polygons and one morph instead of all seven.
 */
const polygons: RoundedPolygon[] = [];
const morphs: Morph[] = [];
const polygon = (i: number) =>
  (polygons[i] ??= RoundedPolygon.fromFeatures(SvgPathParser.parseFeatures(loadingShapes[i]!), {
    centerX: CENTRE,
    centerY: CENTRE,
  }));
const morphFrom = (i: number) => (morphs[i] ??= new Morph(polygon(i), polygon((i + 1) % loadingShapes.length)));

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
 * from the AndroidX Morph. Animation runs on the shared frame clock and writes the path directly
 * (no re-renders); off screen it skips drawing while its clock keeps running.
 */
export const LoadingIndicator = forwardRef<HTMLDivElement, LoadingIndicatorProps>(function LoadingIndicator(
  { container = false, sx, ...aria },
  ref,
) {
  const forced = useForcedState().progress;
  const step = forced?.step;
  const box = useRef<HTMLDivElement | null>(null);
  const setRefs = useMergedRefs(ref, box);
  const path = useRef<SVGPathElement>(null);
  const group = useRef<SVGGElement>(null);

  useEffect(() => {
    if (step !== undefined) return undefined;
    // Compose LoadingIndicatorImpl: `while (true) { val d = async { morph.animateTo(1f, spring) };
    // delay(650); d.await() }`. The spring (0.6, 200, threshold 0.1) ends at ≈297ms mid overshoot
    // (≈1.09) and snaps; then the next shape is current, progress snaps to 0 and the rotation
    // target advances a quarter turn. An iteration starts 650ms after the previous one, or when
    // its morph finishes if that is later. Drawing rotates by progress·90 + target + spin.
    let index = 0;
    let target = 90;
    let spring: SpringAnimator | null = null;
    let iteration = 0; // ms (from the first frame) at which the next iteration may start
    let finishedAt = 0;
    let t0: number | undefined;
    let visible = true;
    const draw = (now: number) => {
      t0 ??= now;
      const elapsed = now - t0;
      let progress = 0;
      if (spring) {
        progress = spring.tick(now);
        if (!spring.running) {
          index = (index + 1) % loadingShapes.length;
          progress = 0;
          target = (target + 90) % 360;
          finishedAt = performance.now() - t0;
          spring = null;
        }
      }
      if (!spring && elapsed >= iteration) {
        iteration = Math.max(iteration, finishedAt) + MORPH_INTERVAL;
        spring = new SpringAnimator(0, MORPH_PRECISION);
        spring.to(1, MORPH_SPRING);
      }
      if (!visible) return;
      path.current?.setAttribute(
        'd',
        progress === 0 ? loadingShapes[index]! : morphToSvgPath(morphFrom(index), progress),
      );
      const rotation = progress * 90 + target + (elapsed / SPIN_MS) * 360;
      group.current?.setAttribute('transform', `rotate(${rotation.toFixed(2)} ${CENTRE} ${CENTRE})`);
    };
    const stopLoop = onEveryFrame(draw);
    const stopObserving = box.current ? observeOnScreen(box.current, (onScreen) => (visible = onScreen)) : undefined;
    return () => {
      stopLoop();
      stopObserving?.();
    };
  }, [step]);

  return (
    <Progress.Root ref={setRefs} value={null} {...aria} {...stylex.props(s.root, sx)}>
      <svg width={48} height={48} viewBox="0 0 48 48" {...stylex.props(s.svg)} aria-hidden>
        {container && <circle cx={CENTRE} cy={CENTRE} r={24} {...stylex.props(s.container)} />}
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
