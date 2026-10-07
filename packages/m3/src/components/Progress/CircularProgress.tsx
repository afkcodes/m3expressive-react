import { useLayoutEffect, useRef } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Progress } from '@base-ui/react/progress';
import { color } from '../../tokens/color.stylex.ts';
import { useReducedMotion } from '../../motion/context.tsx';
import { useMergedRefs } from '../../hooks/useMergedRefs.ts';
import type { SxProps } from '../../primitives/types.ts';
import { useForcedState, type ForcedProgressFrame } from '../../testing/ForceState.tsx';
import {
  CIRCULAR,
  circularFrame,
  circularShapes,
  type CircularFrame,
  type CircularShapes,
  type ProgressThickness,
  type ProgressShape,
} from './geometry.ts';
import {
  AmplitudeRamp,
  PROGRESS_SPRING,
  SpringAnimator,
  circularIndeterminate,
  circularWaveAmplitude,
} from './motion.ts';
import { observeOnScreen, onEveryFrame } from '../../motion/frameClock.ts';

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
/** Spring visibility threshold for the drawn progress (0…1). */
const PROGRESS_PRECISION = 0.001;

/** The root is Base UI's Progress `<div role="progressbar">` (`ref`, native props, `sx`). */
export interface CircularProgressProps extends SxProps<
  Omit<Progress.Root.Props, 'render' | 'children' | 'value' | 'min' | 'max'>
> {
  /** 0…max. Omit (or null) for the indeterminate indicator. */
  value?: number | null;
  max?: number;
  /** The active indicator: `flat` or `wavy` (the kit's "Flat" / "Wave"; Expressive). */
  shape?: ProgressShape;
  thickness?: ProgressThickness;
}

/** Everything a frame of the drawing depends on besides the animated values. */
interface CircularInputs {
  shape: ProgressShape;
  thickness: ProgressThickness;
  /** Target progress 0…1 (0 while indeterminate). */
  progress: number;
  indeterminate: boolean;
  reduced: boolean;
  forced: ForcedProgressFrame | undefined;
}

/** The animated values of a frame: drawn progress, wave amplitude, clock (ms). */
interface CircularMotion {
  shown: number;
  amp: number;
  clock: number;
}

const ampTargetOf = (shape: ProgressShape, indeterminate: boolean, shown: number) =>
  shape !== 'wavy' ? 0 : indeterminate ? 1 : circularWaveAmplitude(shown);

/** The drawing at one instant — the still frames and every animation frame alike. */
function circularDrawing(inputs: CircularInputs, { shown, amp, clock }: CircularMotion): CircularShapes {
  const { shape, thickness, indeterminate, reduced, forced } = inputs;
  // A forced `time` renders the live animation at that instant; any other forced frame is still.
  const frozen = forced !== undefined && forced.time === undefined;
  const kit = CIRCULAR[shape][thickness];
  let frame: CircularFrame | null;
  let spin = 0;
  if (indeterminate && frozen && forced.value !== undefined) {
    // The kit's Step frames: determinate arcs, rotated.
    frame = circularFrame(shape, thickness, forced.value);
    spin = forced.rotation ?? 0;
  } else if (indeterminate) {
    // Live: Compose's M3 Expressive indeterminate — the arc sweeps 10% ↔ 87% while the drawing
    // turns (constant spin + a 90° step every 1.5s). The gap is the kit's (its 10% frame).
    const { sweep, rotation } = circularIndeterminate(clock);
    const sweepDeg = sweep * 360;
    const gap = Math.min(sweepDeg, kit.tracks[1] - kit.ends[1]);
    frame = {
      start: kit.start,
      end: kit.start + sweepDeg,
      trackStart: kit.start + sweepDeg + gap,
      trackEnd: kit.start + 360 - gap,
    };
    spin = rotation;
  } else frame = circularFrame(shape, thickness, shown);
  // The wave turns with the indeterminate arc (Compose rotates the whole drawing) and travels
  // backwards under the fixed arc ends, one wave per second (Compose rotates the segment by
  // −offset).
  const travel = frozen || reduced ? 0 : (clock / 1000) * WAVE_SPEED;
  const phase = (forced?.phase ?? WAVE_PHASE) + spin - travel;
  return circularShapes(shape, thickness, frame, spin, phase, amp);
}

/** The frame React renders: a forced frame, or the indicator at rest on its target. */
const restingMotion = (inputs: CircularInputs): CircularMotion => {
  const shown = inputs.indeterminate ? 0 : inputs.progress;
  return { shown, amp: ampTargetOf(inputs.shape, inputs.indeterminate, shown), clock: inputs.forced?.time ?? 0 };
};

/** Writes a frame into the track / active paths rendered by `CircularProgress`. */
function paintCircular(svg: SVGSVGElement, g: CircularShapes) {
  const [track, active] = svg.children;
  for (const [el, d] of [
    [track, g.track],
    [active, g.active],
  ] as const) {
    if (d === null) el!.removeAttribute('d');
    else el!.setAttribute('d', d);
  }
}

/** Per-instance animation state, ticked by the shared frame clock. */
interface CircularDriver {
  spring: SpringAnimator;
  ramp: AmplitudeRamp;
  /** Frame timestamp the clock counts from (unset while the drawing is still). */
  clockStart: number | undefined;
  clock: number;
  visible: boolean;
  stopLoop: (() => void) | null;
}

/**
 * Circular progress indicator (kit sets "Circular-determinate / -indeterminate progress
 * indicator"): 40 / 44px flat, 48 / 52px wavy. The active arc starts just right of 12 o'clock and
 * the track continues after a gap. Arc lengths follow the kit's samples (0 / 10 / 30 / 50 / 80 /
 * 100%), interpolated in between; the gaps grow from 0 as the value leaves 0. Value changes use
 * Compose's progress spring for both types (the circular wavy KDoc recommends it). The wave is flat
 * below 10% (the kit draws 10% and 100% wavy) and ramps its amplitude over 500ms; it travels while
 * it has one.
 * Indeterminate: M3 Expressive motion as Material Components Android and the m3.material.io spec
 * video draw it (6s cycle: spin, Standard-eased 90° steps, 10% ↔ 87% Standard-eased sweep — see
 * motion.ts); the kit's Step frames (its 10% / 50% arcs, rotated) are reproduced as still frames.
 *
 * Rendering: React renders the resting (or forced) frame; while anything moves, one shared frame
 * callback advances the animators and writes the paths directly — no re-render per frame, and no
 * drawing while the indicator is off screen (its clock keeps running).
 */
export function CircularProgress({
  value = null,
  max = 100,
  shape = 'flat',
  thickness = 4,
  sx,
  ref,
  ...rest
}: CircularProgressProps) {
  const forced = useForcedState().progress;
  const reduced = useReducedMotion();
  const box = useRef<HTMLDivElement | null>(null);
  const svg = useRef<SVGSVGElement | null>(null);
  const setRefs = useMergedRefs(ref, box);
  const indeterminate = value == null;
  const progress = indeterminate ? 0 : Math.min(1, Math.max(0, value / max));
  const inputs: CircularInputs = { shape, thickness, progress, indeterminate, reduced, forced };

  // The latest inputs for the frame callback (updated after each commit, read only there).
  const latest = useRef(inputs);
  const driver = useRef<CircularDriver | null>(null);
  const paint = (d: CircularDriver, current: CircularInputs, motion: CircularMotion) => {
    if (d.visible && svg.current) paintCircular(svg.current, circularDrawing(current, motion));
  };

  // Frame callback: advance the animators, draw, and leave the clock once everything is at rest.
  const onFrame = useRef<(now: number) => void>(() => {});
  useLayoutEffect(() => {
    onFrame.current = (now: number) => {
      const d = driver.current;
      if (!d) return;
      const current = latest.current;
      const motion = advance(d, current, now);
      paint(d, current, motion);
      if (!needsFrames(d, current, motion)) {
        d.stopLoop?.();
        d.stopLoop = null;
      }
    };
  });

  // After every commit: hand the new inputs to the animators and repaint the live frame (React has
  // just rendered the resting one), starting the clock when something moves.
  useLayoutEffect(() => {
    latest.current = inputs;
    if (forced) {
      driver.current?.stopLoop?.();
      driver.current = null;
      return;
    }
    const d = (driver.current ??= {
      spring: new SpringAnimator(progress, PROGRESS_PRECISION),
      ramp: new AmplitudeRamp(ampTargetOf(shape, indeterminate, progress)),
      clockStart: undefined,
      clock: 0,
      visible: true,
      stopLoop: null,
    });
    retarget(d, inputs);
    const motion = currentMotion(d);
    paint(d, inputs, motion);
    if (!d.stopLoop && needsFrames(d, inputs, motion)) {
      d.stopLoop = onEveryFrame((now) => onFrame.current(now));
    }
  });

  // Off screen: skip drawing (the clock keeps running) and catch up on return. Unmount: stop.
  useLayoutEffect(() => {
    const el = box.current;
    const stopObserving = el
      ? observeOnScreen(el, (visible) => {
          const d = driver.current;
          if (!d) return;
          d.visible = visible;
          paint(d, latest.current, currentMotion(d));
        })
      : undefined;
    return () => {
      stopObserving?.();
      driver.current?.stopLoop?.();
      driver.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `paint` reads refs only
  }, []);

  const { size } = CIRCULAR[shape][thickness];
  const g = circularDrawing(inputs, restingMotion(inputs));

  return (
    <Progress.Root
      ref={setRefs}
      value={indeterminate ? null : progress * 100}
      {...rest}
      {...stylex.props(s.root, s.size(size), sx)}
    >
      <svg ref={svg} width={size} height={size} {...stylex.props(s.svg)} aria-hidden>
        <path d={g.track ?? undefined} strokeWidth={thickness} {...stylex.props(s.track)} />
        <path d={g.active ?? undefined} strokeWidth={thickness} {...stylex.props(s.active)} />
      </svg>
    </Progress.Root>
  );
}

/** New props: retarget the animators (Compose's animate*AsState) — a jump when motion is reduced. */
function retarget(d: CircularDriver, { progress, reduced, shape, indeterminate }: CircularInputs) {
  // Compose's circular wavy indicator recommends ProgressIndicatorDefaults.ProgressAnimationSpec
  // (the flat spring, WavyProgressIndicator.kt:249); only the linear wavy one uses the 500ms tween.
  if (reduced) d.spring.jump(progress);
  else d.spring.to(progress, PROGRESS_SPRING);
  const ampTarget = ampTargetOf(shape, indeterminate, d.spring.value);
  if (reduced) d.ramp.jump(ampTarget);
  else d.ramp.setTarget(ampTarget);
}

const currentMotion = (d: CircularDriver): CircularMotion => ({
  shown: d.spring.value,
  amp: d.ramp.value,
  clock: d.clock,
});

/** Advances the animators to `now`; returns the frame's animated values. */
function advance(d: CircularDriver, inputs: CircularInputs, now: number): CircularMotion {
  const shown = d.spring.tick(now);
  // Compose evaluates the amplitude on the drawn (animated) progress; indeterminate stays at 1.
  const ampTarget = ampTargetOf(inputs.shape, inputs.indeterminate, shown);
  if (inputs.reduced) d.ramp.jump(ampTarget);
  else d.ramp.setTarget(ampTarget);
  const amp = d.ramp.tick(now);
  if (runsClock(inputs, { shown, amp })) {
    d.clockStart ??= now;
    d.clock = now - d.clockStart;
  } else d.clockStart = undefined;
  return { shown, amp, clock: d.clock };
}

/** Indeterminate always runs on the clock; the wave travels while it has an amplitude (Compose
 *  stops the offset animation at 0). */
const runsClock = (inputs: CircularInputs, { shown, amp }: Pick<CircularMotion, 'shown' | 'amp'>) =>
  inputs.indeterminate || (inputs.shape === 'wavy' && !inputs.reduced && amp > 0 && shown > 0);

const needsFrames = (d: CircularDriver, inputs: CircularInputs, motion: CircularMotion) =>
  d.spring.running || d.ramp.running || runsClock(inputs, motion);
