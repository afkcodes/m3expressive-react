import { forwardRef, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { Progress } from '@base-ui/react/progress';
import { color } from '../../tokens/color.stylex';
import { useReducedMotion } from '../../motion/context.tsx';
import { useForcedState } from '../../testing/ForceState.tsx';
import { CIRCULAR, circularFrame, circularShapes, type ProgressThickness, type ProgressType } from './geometry.ts';
import { PROGRESS_SPRING, circularIndeterminate, useFrameLoop, useSpringNumber } from './motion.ts';

const s = stylex.create({
  root: { display: 'inline-block', flexShrink: 0, verticalAlign: 'middle' },
  size: (px: number) => ({ width: px, height: px }),
  svg: { display: 'block', overflow: 'visible' },
  active: { fill: 'none', stroke: color.primary, strokeLinecap: 'round', strokeLinejoin: 'round' },
  track: { fill: 'none', stroke: color.secondaryContainer, strokeLinecap: 'round' },
});

/** The kit's wave phase for its still frames (the wave group is rotated 5°). */
const WAVE_PHASE = -5;
/** Determinate wave travel ≈ one wave (40°) per second (Compose `waveSpeed = wavelength`). */
const WAVE_SPEED = 40;

export interface CircularProgressProps {
  /** 0…max. Omit (or null) for the indeterminate indicator. */
  value?: number | null;
  max?: number;
  type?: ProgressType;
  thickness?: ProgressThickness;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-valuetext'?: string;
  sx?: StyleXStyles;
}

/**
 * Circular progress indicator (kit sets "Circular-determinate / -indeterminate progress
 * indicator"): 40 / 44px flat, 48 / 52px wavy. The active arc starts just right of 12 o'clock and
 * the track continues after a gap. Arc lengths follow the kit's samples (0 / 10 / 30 / 50 / 80 /
 * 100%), interpolated in between. Indeterminate: Compose's rotation + head/tail keyframes, with
 * the arc growing between the kit's 10% and 80% lengths (its Step frames are those arcs rotated).
 */
export const CircularProgress = forwardRef<HTMLDivElement, CircularProgressProps>(function CircularProgress(
  { value = null, max = 100, type = 'flat', thickness = 4, sx, ...aria },
  ref,
) {
  const forced = useForcedState().progress;
  const reduced = useReducedMotion();
  const [ms, setMs] = useState(0);
  const indeterminate = value == null;
  const p = indeterminate ? 0 : Math.min(1, Math.max(0, value / max));
  const frozen = forced !== undefined;
  const shown = useSpringNumber(p, frozen || reduced ? null : PROGRESS_SPRING);
  useFrameLoop(!frozen && (indeterminate || (type === 'wave' && !reduced && p > 0)), setMs);

  const t = thickness;
  const { size } = CIRCULAR[type][t];
  // Indeterminate: the arc grows between the kit's 10% and 80% arcs while the drawing spins.
  const indet = indeterminate
    ? forced?.value !== undefined
      ? { v: forced.value, spin: forced.rotation ?? 0 }
      : (({ grow, rotation }) => ({ v: 0.1 + grow * 0.7, spin: rotation }))(circularIndeterminate(ms))
    : null;
  const frame = circularFrame(type, t, indet ? indet.v : shown);
  const spin = indet?.spin ?? 0;
  // The wave turns with the indeterminate arc (Compose rotates the whole drawing) and travels.
  const travel = frozen || reduced ? 0 : (ms / 1000) * WAVE_SPEED;
  const phase = (forced?.phase ?? WAVE_PHASE) + spin + travel;
  const g = circularShapes(type, t, frame, spin, phase);

  return (
    <Progress.Root ref={ref} value={indeterminate ? null : p * 100} {...aria} {...stylex.props(s.root, s.size(size), sx)}>
      <svg width={size} height={size} {...stylex.props(s.svg)} aria-hidden>
        {g.track && <path d={g.track} strokeWidth={t} {...stylex.props(s.track)} />}
        {g.active && <path d={g.active} strokeWidth={t} {...stylex.props(s.active)} />}
      </svg>
    </Progress.Root>
  );
});
