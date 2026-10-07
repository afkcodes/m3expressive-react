import { useLayoutEffect, useRef, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Progress } from '@base-ui/react/progress';
import { color } from '../../tokens/color.stylex.ts';
import { useReducedMotion } from '../../motion/context.tsx';
import { useMergedRefs } from '../../hooks/useMergedRefs.ts';
import type { SxProps } from '../../primitives/types.ts';
import { useForcedState, type ForcedProgressFrame } from '../../testing/ForceState.tsx';
import {
  determinateTrackSpace,
  linearDeterminate,
  linearHeight,
  linearShapes,
  type LinearShapes,
  type ProgressThickness,
  type ProgressShape,
} from './geometry.ts';
import {
  AmplitudeRamp,
  PROGRESS_SPRING,
  SpringAnimator,
  TweenAnimator,
  WAVY_PROGRESS_TWEEN,
  linearIndeterminate,
  linearWaveAmplitude,
} from './motion.ts';
import { observeOnScreen, onEveryFrame } from '../../motion/frameClock.ts';

const s = stylex.create({
  root: { display: 'block', width: '100%', flexShrink: 0, position: 'relative' },
  height: (px: number) => ({ height: px }),
  svg: { display: 'block', overflow: 'visible' },
  active: { fill: 'none', stroke: color.primary, strokeLinecap: 'round', strokeLinejoin: 'round' },
  track: { fill: color.secondaryContainer },
  stop: { fill: color.primary },
});

/** Compose `LinearDeterminateWavelength` / `LinearIndeterminateWavelength`. */
const WAVELENGTH = { determinate: 40, indeterminate: 20 };
/** Determinate wave travel, wavelengths per second (Compose `waveSpeed = wavelength`). */
const WAVE_SPEED_PER_WAVELENGTH = 1;
/** Spring visibility threshold for the drawn progress (0…1). */
const PROGRESS_PRECISION = 0.001;
/**
 * SVG slots, always rendered in paint order so frames can be written without re-rendering: up to
 * three track pieces, the active lines (two indeterminate, one determinate), the stop dot. Unused
 * slots carry no geometry (an SVG rect without a size or a path without `d` draws nothing).
 */
const TRACK_SLOTS = 3;
const activeSlots = (indeterminate: boolean) => (indeterminate ? 2 : 1);

/** The root is Base UI's Progress `<div role="progressbar">` (`ref`, native props, `sx`). */
export interface LinearProgressProps extends SxProps<
  Omit<Progress.Root.Props, 'render' | 'children' | 'value' | 'min' | 'max'>
> {
  /** 0…max. Omit (or null) for the indeterminate indicator. */
  value?: number | null;
  max?: number;
  /** The active indicator: `flat` or `wavy` (the kit's "Flat" / "Wave"; Expressive). */
  shape?: ProgressShape;
  /** Active indicator / track thickness: 4 or 8 dp. */
  thickness?: ProgressThickness;
  /** Wave length in px (Compose `wavelength`). Default 40 determinate, 20 indeterminate. */
  wavelength?: number;
}

/** Everything a frame of the drawing depends on besides the animated values. */
interface LinearInputs {
  width: number;
  thickness: ProgressThickness;
  shape: ProgressShape;
  wavelength: number | undefined;
  /** Target progress 0…1 (0 while indeterminate). */
  progress: number;
  indeterminate: boolean;
  reduced: boolean;
  forced: ForcedProgressFrame | undefined;
}

/** The animated values of a frame: drawn progress, wave amplitude, clock (ms). */
interface LinearMotion {
  shown: number;
  amp: number;
  clock: number;
}

const ampTargetOf = (shape: ProgressShape, indeterminate: boolean, shown: number) =>
  shape !== 'wavy' ? 0 : indeterminate ? 1 : linearWaveAmplitude(shown);

/** The drawing at one instant — the still frames and every animation frame alike. */
function linearFrame(inputs: LinearInputs, { shown, amp, clock }: LinearMotion): LinearShapes {
  const { width, thickness, shape, progress, indeterminate, reduced, forced } = inputs;
  // A forced `time` renders the live animation at that instant; any other forced frame is still.
  const frozen = forced !== undefined && forced.time === undefined;
  const pad = thickness / 2;
  let actives: [number, number][];
  let gap: number | undefined;
  if (indeterminate && frozen && forced.actives) actives = forced.actives;
  else if (indeterminate) {
    // Compose: line ends at fraction × width, clamped so the caps stay inside; while the leading
    // line enters, the active ↔ track space grows from 0 with its head.
    const lines = linearIndeterminate(clock);
    const clamp = (x: number) => Math.min(width - pad, Math.max(pad, x * width));
    actives = lines.map(([tail, head]) => [clamp(tail), clamp(head)]);
    const head = lines[0]![1] * width;
    gap = head < pad ? 0 : Math.min(head - pad, 4);
  } else {
    actives = linearDeterminate(width, thickness, shown, shape === 'wavy' ? amp : 0);
    gap = determinateTrackSpace(shape, thickness, actives[0]?.[1] ?? 0);
  }
  const wavelength = inputs.wavelength ?? (indeterminate ? WAVELENGTH.indeterminate : WAVELENGTH.determinate);
  const travel = frozen || reduced ? 0 : (clock / 1000) * WAVE_SPEED_PER_WAVELENGTH * wavelength;
  // Compose moves the wave towards the start (a crest at x is drawn at x − shift).
  const waveOrigin = frozen ? (actives[0]?.[0] ?? pad) + (forced.phase ?? 0) : pad - travel;
  const ampTarget = ampTargetOf(shape, indeterminate, shown);
  return linearShapes({
    width,
    thickness,
    shape,
    actives,
    stop: !indeterminate,
    stopShrink: shape === 'wavy',
    wavelength,
    waveOrigin,
    amp: shape === 'wavy' ? amp : 0,
    snap: frozen || (!indeterminate && shown === progress && amp === ampTarget),
    gap,
  });
}

/** The frame React renders: a forced frame, or the indicator at rest on its target. */
const restingMotion = (inputs: LinearInputs): LinearMotion => {
  const shown = inputs.indeterminate ? 0 : inputs.progress;
  return { shown, amp: ampTargetOf(inputs.shape, inputs.indeterminate, shown), clock: inputs.forced?.time ?? 0 };
};

const setAttrs = (el: Element, attrs: Record<string, number | string> | null, names: readonly string[]) => {
  for (const name of names) {
    const value = attrs?.[name];
    if (value === undefined) el.removeAttribute(name);
    else el.setAttribute(name, String(value));
  }
};
const RECT_ATTRS = ['x', 'y', 'width', 'height', 'rx'] as const;

/** Writes a frame into the slots rendered by `LinearProgress` (the same attributes React renders). */
function paintLinear(svg: SVGSVGElement, g: LinearShapes, thickness: ProgressThickness) {
  const slots = svg.children;
  const actives = slots.length - TRACK_SLOTS - 1;
  for (let i = 0; i < TRACK_SLOTS; i++) setAttrs(slots[i]!, trackAttrs(g, i, thickness), RECT_ATTRS);
  for (let i = 0; i < actives; i++) {
    const d = g.active[i];
    if (d === undefined) slots[TRACK_SLOTS + i]!.removeAttribute('d');
    else slots[TRACK_SLOTS + i]!.setAttribute('d', d);
  }
  setAttrs(slots[TRACK_SLOTS + actives]!, stopAttrs(g), RECT_ATTRS);
}

function trackAttrs(g: LinearShapes, i: number, thickness: ProgressThickness) {
  const track = g.tracks[i];
  return track
    ? { x: track.x, y: g.cy - thickness / 2, width: track.width, height: thickness, rx: thickness / 2 }
    : null;
}
function stopAttrs(g: LinearShapes) {
  const { stop } = g;
  return stop ? { x: stop.x, y: g.cy - stop.size / 2, width: stop.size, height: stop.size, rx: stop.size / 2 } : null;
}

/** Per-instance animation state, ticked by the shared frame clock. */
interface LinearDriver {
  spring: SpringAnimator;
  tween: TweenAnimator;
  ramp: AmplitudeRamp;
  /** Frame timestamp the travelling clock counts from (unset while the drawing is still). */
  clockStart: number | undefined;
  clock: number;
  visible: boolean;
  stopLoop: (() => void) | null;
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
 *
 * Rendering: React renders the resting (or forced) frame; while anything moves, one shared frame
 * callback advances the animators and writes the SVG attributes directly — no re-render per frame,
 * and no drawing while the indicator is off screen (its clock keeps running).
 */
export function LinearProgress({
  value = null,
  max = 100,
  shape = 'flat',
  thickness = 4,
  wavelength,
  sx,
  ref,
  ...rest
}: LinearProgressProps) {
  const forced = useForcedState().progress;
  const reduced = useReducedMotion();
  const box = useRef<HTMLDivElement | null>(null);
  const svg = useRef<SVGSVGElement | null>(null);
  const setRefs = useMergedRefs(ref, box);
  const [width, setWidth] = useState(0);
  const indeterminate = value == null;
  const progress = indeterminate ? 0 : Math.min(1, Math.max(0, value / max));
  const inputs: LinearInputs = { width, thickness, shape, wavelength, progress, indeterminate, reduced, forced };

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    setWidth(el.getBoundingClientRect().width);
    if (typeof ResizeObserver === 'undefined') return undefined; // jsdom / very old engines: measured once
    const ro = new ResizeObserver(([entry]) => setWidth(entry!.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // The latest inputs for the frame callback (updated after each commit, read only there).
  const latest = useRef(inputs);
  const driver = useRef<LinearDriver | null>(null);
  const paint = (d: LinearDriver, current: LinearInputs, motion: LinearMotion) => {
    if (d.visible && svg.current) paintLinear(svg.current, linearFrame(current, motion), current.thickness);
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
      if (!needsFrames(d, current, motion.amp)) {
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
      tween: new TweenAnimator(progress),
      ramp: new AmplitudeRamp(ampTargetOf(shape, indeterminate, progress)),
      clockStart: undefined,
      clock: 0,
      visible: true,
      stopLoop: null,
    });
    retarget(d, inputs);
    paint(d, inputs, currentMotion(d, inputs));
    if (!d.stopLoop && needsFrames(d, inputs, d.ramp.value)) {
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
          paint(d, latest.current, currentMotion(d, latest.current));
        })
      : undefined;
    return () => {
      stopObserving?.();
      driver.current?.stopLoop?.();
      driver.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `paint` reads refs only
  }, []);

  const height = linearHeight(shape, thickness);
  const g = width > 0 ? linearFrame(inputs, restingMotion(inputs)) : null;
  const stop = g ? stopAttrs(g) : null;

  return (
    <Progress.Root
      ref={setRefs}
      value={indeterminate ? null : progress * 100}
      {...rest}
      {...stylex.props(s.root, s.height(height), sx)}
    >
      {g && (
        <svg ref={svg} width={width} height={height} {...stylex.props(s.svg)} aria-hidden>
          {Array.from({ length: TRACK_SLOTS }, (_, i) => (
            <rect key={`track${i}`} {...trackAttrs(g, i, thickness)} {...stylex.props(s.track)} />
          ))}
          {Array.from({ length: activeSlots(indeterminate) }, (_, i) => (
            <path key={`active${i}`} d={g.active[i]} strokeWidth={thickness} {...stylex.props(s.active)} />
          ))}
          <rect {...stop} {...stylex.props(s.stop)} />
        </svg>
      )}
    </Progress.Root>
  );
}

/** New props: retarget the animators (Compose's animate*AsState) — a jump when motion is reduced. */
function retarget(d: LinearDriver, inputs: LinearInputs) {
  const { progress, reduced, shape, indeterminate } = inputs;
  const wave = shape === 'wavy';
  if (reduced || wave) d.spring.jump(progress);
  else d.spring.to(progress, PROGRESS_SPRING);
  if (reduced || !wave) d.tween.jump(progress);
  else d.tween.to(progress, WAVY_PROGRESS_TWEEN);
  const ampTarget = ampTargetOf(shape, indeterminate, wave ? d.tween.value : d.spring.value);
  if (reduced) d.ramp.jump(ampTarget);
  else d.ramp.setTarget(ampTarget);
}

const currentMotion = (d: LinearDriver, inputs: LinearInputs): LinearMotion => ({
  shown: inputs.shape === 'wavy' ? d.tween.value : d.spring.value,
  amp: d.ramp.value,
  clock: d.clock,
});

/** Advances the animators to `now`; returns the frame's animated values. */
function advance(d: LinearDriver, inputs: LinearInputs, now: number): LinearMotion {
  const shown = inputs.shape === 'wavy' ? d.tween.tick(now) : d.spring.tick(now);
  // Compose evaluates the amplitude on the drawn (animated) progress; indeterminate stays at 1.
  const ampTarget = ampTargetOf(inputs.shape, inputs.indeterminate, shown);
  if (inputs.reduced) d.ramp.jump(ampTarget);
  else d.ramp.setTarget(ampTarget);
  const amp = d.ramp.tick(now);
  if (travels(inputs, amp)) {
    d.clockStart ??= now;
    d.clock = now - d.clockStart;
  } else d.clockStart = undefined;
  return { shown, amp, clock: d.clock };
}

/** The wave travels (and indeterminate lines run) on the clock. */
const travels = (inputs: LinearInputs, amp: number) =>
  inputs.width > 0 && (inputs.indeterminate || (inputs.shape === 'wavy' && !inputs.reduced && amp > 0));

const needsFrames = (d: LinearDriver, inputs: LinearInputs, amp: number) =>
  d.spring.running || d.tween.running || d.ramp.running || travels(inputs, amp);
