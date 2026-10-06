import { forwardRef, useCallback, useLayoutEffect, useRef, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { Progress } from '@base-ui/react/progress';
import { color } from '../../tokens/color.stylex';
import { useReducedMotion, useSpringToken } from '../../motion/context.tsx';
import { useForcedState } from '../../testing/ForceState.tsx';
import { linearDeterminate, linearHeight, linearShapes, type ProgressThickness, type ProgressType } from './geometry.ts';
import { PROGRESS_SPRING, linearIndeterminate, useFrameLoop, useSpringNumber } from './motion.ts';

const s = stylex.create({
  root: { display: 'block', width: '100%', flexShrink: 0, position: 'relative' },
  h: (px: number) => ({ height: px }),
  svg: { display: 'block', overflow: 'visible' },
  active: { fill: 'none', stroke: color.primary, strokeLinecap: 'round', strokeLinejoin: 'round' },
  track: { fill: color.secondaryContainer },
  stop: { fill: color.primary },
});

/** Compose `LinearDeterminateWavelength` / `LinearIndeterminateWavelength`. */
const WAVELENGTH = { determinate: 40, indeterminate: 20 };
/** Determinate wave travel, wavelengths per second (Compose `waveSpeed = wavelength`). */
const WAVE_SPEED_PER_WAVELENGTH = 1;

export interface LinearProgressProps {
  /** 0…max. Omit (or null) for the indeterminate indicator. */
  value?: number | null;
  max?: number;
  /** "Flat" or "Wave" (Expressive wavy active indicator). */
  type?: ProgressType;
  /** Active indicator / track thickness: 4 or 8 dp. */
  thickness?: ProgressThickness;
  /** Wave length in px (Compose `wavelength`). Default 40 determinate, 20 indeterminate. */
  wavelength?: number;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-valuetext'?: string;
  sx?: StyleXStyles;
}

/**
 * Linear progress indicator (kit sets "Linear-determinate / -indeterminate progress indicator").
 * Fills its container's width. Determinate: active from the start, track + stop dot to the end;
 * value changes spring (Compose ProgressAnimationSpec). Wave: 40px wavelength travelling one
 * wavelength per second, flattened at ≤10% and ≥95% (Compose's amplitude rule, as the kit's 10% /
 * 100% frames show). Indeterminate: Compose's two-line keyframes; the wave uses a 20px wavelength.
 */
export const LinearProgress = forwardRef<HTMLDivElement, LinearProgressProps>(function LinearProgress(
  { value = null, max = 100, type = 'flat', thickness = 4, wavelength, sx, ...aria },
  ref,
) {
  const forced = useForcedState().progress;
  const reduced = useReducedMotion();
  const effects = useSpringToken('slow-effects');
  const box = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const [ms, setMs] = useState(0);
  const indeterminate = value == null;
  const p = indeterminate ? 0 : Math.min(1, Math.max(0, value / max));

  const setRefs = useCallback(
    (el: HTMLDivElement | null) => {
      box.current = el;
      if (typeof ref === 'function') ref(el);
      else if (ref) ref.current = el;
    },
    [ref],
  );
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    setWidth(el.getBoundingClientRect().width);
    const ro = new ResizeObserver(([e]) => setWidth(e!.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // A forced `time` renders the live animation at that instant; any other forced frame is still.
  const frozen = forced !== undefined && forced.time === undefined;
  const clock = forced?.time ?? ms;
  const wavyNow = type === 'wave' && (indeterminate || (p > 0.1 && p < 0.95));
  const amp = useSpringNumber(wavyNow ? 1 : 0, forced ? null : effects);
  const shown = useSpringNumber(p, forced || reduced ? null : PROGRESS_SPRING);
  const travelling = !forced && width > 0 && (indeterminate || (type === 'wave' && !reduced && amp > 0));
  useFrameLoop(travelling, setMs);

  const t = thickness;
  const pad = t / 2;
  let actives: [number, number][];
  if (indeterminate) {
    const span = width - 2 * pad;
    actives = (frozen && forced.actives) || linearIndeterminate(clock).map(([a, b]) => [pad + a * span, pad + b * span]);
  } else actives = linearDeterminate(width, t, shown, type === 'wave' ? amp : 0);
  const wl = wavelength ?? (indeterminate ? WAVELENGTH.indeterminate : WAVELENGTH.determinate);
  const travel = frozen || reduced ? 0 : (clock / 1000) * WAVE_SPEED_PER_WAVELENGTH * wl;
  const waveOrigin = frozen ? (actives[0]?.[0] ?? pad) + (forced.phase ?? 0) : pad + travel;
  const g = linearShapes({
    width,
    thickness: t,
    type,
    actives,
    stop: !indeterminate,
    wavelength: wl,
    waveOrigin,
    amp: type === 'wave' ? amp : 0,
    snap: frozen || (!indeterminate && shown === p),
  });
  const height = linearHeight(type, t);

  return (
    <Progress.Root
      ref={setRefs}
      value={indeterminate ? null : p * 100}
      {...aria}
      {...stylex.props(s.root, s.h(height), sx)}
    >
      {width > 0 && (
        <svg width={width} height={height} {...stylex.props(s.svg)} aria-hidden>
          {g.tracks.map((tr, i) => (
            <rect key={i} x={tr.x} y={g.cy - t / 2} width={tr.width} height={t} rx={t / 2} {...stylex.props(s.track)} />
          ))}
          {g.stop && <rect x={g.stop.x} y={g.cy - 2} width={4} height={4} rx={2} {...stylex.props(s.stop)} />}
          {g.active.map((d, i) => (
            <path key={i} d={d} strokeWidth={t} {...stylex.props(s.active)} />
          ))}
        </svg>
      )}
    </Progress.Root>
  );
});
