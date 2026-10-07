import { forwardRef, useCallback, useLayoutEffect, useRef, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { Progress } from '@base-ui/react/progress';
import { color } from '../../tokens/color.stylex.ts';
import { useReducedMotion } from '../../motion/context.tsx';
import { useForcedState } from '../../testing/ForceState.tsx';
import {
  determinateTrackSpace,
  linearDeterminate,
  linearHeight,
  linearShapes,
  type ProgressThickness,
  type ProgressType,
} from './geometry.ts';
import {
  PROGRESS_SPRING,
  WAVY_PROGRESS_TWEEN,
  linearIndeterminate,
  linearWaveAmplitude,
  useFrameLoop,
  useSpringNumber,
  useTweenNumber,
  useWaveAmplitude,
} from './motion.ts';

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
 * value changes spring (Compose ProgressIndicatorDefaults.ProgressAnimationSpec) — the wave tweens
 * them linearly over 500ms (WavyProgressIndicatorDefaults.ProgressAnimationSpec). The active ↔
 * track space grows from 0 as the value leaves 0; the wavy stop dot shrinks away as the active
 * reaches it. Wave: 40px wavelength travelling one wavelength per second, flattened at ≤10% and
 * ≥95% (Compose's amplitude rule, as the kit's 10% / 100% frames show), ramping over 500ms.
 * Indeterminate: Compose's two-line keyframes; the wave uses a 20px wavelength. Waves travel
 * towards the start, one wavelength per second, as in Compose.
 */
export const LinearProgress = forwardRef<HTMLDivElement, LinearProgressProps>(function LinearProgress(
  { value = null, max = 100, type = 'flat', thickness = 4, wavelength, sx, ...aria },
  ref,
) {
  const forced = useForcedState().progress;
  const reduced = useReducedMotion();
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
  const still = !!forced || reduced;
  const wave = type === 'wave';
  const sprung = useSpringNumber(p, still || wave ? null : PROGRESS_SPRING);
  const tweened = useTweenNumber(p, still || !wave ? null : WAVY_PROGRESS_TWEEN);
  const shown = wave ? tweened : sprung;
  // Compose evaluates the amplitude on the drawn (animated) progress; indeterminate stays at 1.
  const ampTarget = !wave ? 0 : indeterminate ? 1 : linearWaveAmplitude(shown);
  const amp = useWaveAmplitude(ampTarget, !still);
  const travelling = !forced && width > 0 && (indeterminate || (type === 'wave' && !reduced && amp > 0));
  useFrameLoop(travelling, setMs);

  const t = thickness;
  const pad = t / 2;
  let actives: [number, number][];
  let gap: number | undefined;
  if (indeterminate && frozen && forced.actives) actives = forced.actives;
  else if (indeterminate) {
    // Compose: line ends at fraction × width, clamped so the caps stay inside; while the leading
    // line enters, the active ↔ track space grows from 0 with its head.
    const lines = linearIndeterminate(clock);
    const clamp = (x: number) => Math.min(width - pad, Math.max(pad, x * width));
    actives = lines.map(([a, b]) => [clamp(a), clamp(b)]);
    const head = lines[0]![1] * width;
    gap = head < pad ? 0 : Math.min(head - pad, 4);
  } else {
    actives = linearDeterminate(width, t, shown, type === 'wave' ? amp : 0);
    gap = determinateTrackSpace(type, t, actives[0]?.[1] ?? 0);
  }
  const wl = wavelength ?? (indeterminate ? WAVELENGTH.indeterminate : WAVELENGTH.determinate);
  const travel = frozen || reduced ? 0 : (clock / 1000) * WAVE_SPEED_PER_WAVELENGTH * wl;
  // Compose moves the wave towards the start (a crest at x is drawn at x − shift).
  const waveOrigin = frozen ? (actives[0]?.[0] ?? pad) + (forced.phase ?? 0) : pad - travel;
  const g = linearShapes({
    width,
    thickness: t,
    type,
    actives,
    stop: !indeterminate,
    stopShrink: type === 'wave',
    wavelength: wl,
    waveOrigin,
    amp: type === 'wave' ? amp : 0,
    snap: frozen || (!indeterminate && shown === p && amp === ampTarget),
    gap,
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
          {g.active.map((d, i) => (
            <path key={i} d={d} strokeWidth={t} {...stylex.props(s.active)} />
          ))}
          {g.stop && (
            <rect
              x={g.stop.x}
              y={g.cy - g.stop.size / 2}
              width={g.stop.size}
              height={g.stop.size}
              rx={g.stop.size / 2}
              {...stylex.props(s.stop)}
            />
          )}
        </svg>
      )}
    </Progress.Root>
  );
});
