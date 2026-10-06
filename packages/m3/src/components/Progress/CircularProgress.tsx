import { forwardRef, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { Progress } from '@base-ui/react/progress';
import { color } from '../../tokens/color.stylex';
import { useReducedMotion } from '../../motion/context.tsx';
import { useForcedState } from '../../testing/ForceState.tsx';
import { CIRCULAR, circularFrame, circularShapes, type CircularFrame, type ProgressThickness, type ProgressType } from './geometry.ts';
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
  // A forced `time` renders the live animation at that instant; any other forced frame is still.
  const frozen = forced !== undefined && forced.time === undefined;
  const clock = forced?.time ?? ms;
  const shown = useSpringNumber(p, forced || reduced ? null : PROGRESS_SPRING);
  useFrameLoop(!forced && (indeterminate || (type === 'wave' && !reduced && p > 0)), setMs);

  const t = thickness;
  const k = CIRCULAR[type][t];
  let frame: CircularFrame | null;
  let spin = 0;
  if (indeterminate && frozen && forced.value !== undefined) {
    // The kit's Step frames: determinate arcs, rotated.
    frame = circularFrame(type, t, forced.value);
    spin = forced.rotation ?? 0;
  } else if (indeterminate) {
    // Live: the arc grows between the kit's 10% and 80% lengths with a constant gap (the 10%
    // frame's), while Compose's rotation keyframes turn it.
    const { grow, rotation } = circularIndeterminate(clock);
    const lo = k.ends[1] - k.start;
    const hi = k.ends[4] - k.start;
    const end = k.start + lo + grow * (hi - lo);
    frame = { start: k.start, end, trackStart: end + (k.tracks[1] - k.ends[1]), trackEnd: k.trackEnd };
    spin = rotation;
  } else frame = circularFrame(type, t, shown);
  const size = k.size;
  // The wave turns with the indeterminate arc (Compose rotates the whole drawing) and travels.
  const travel = frozen || reduced ? 0 : (clock / 1000) * WAVE_SPEED;
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
