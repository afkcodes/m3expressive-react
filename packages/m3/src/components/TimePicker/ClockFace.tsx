import {
  memo,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import * as stylex from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex.ts';
import { motion } from '../../tokens/motion.stylex.ts';
import { typescale } from '../../tokens/typescale.ts';
import { textBox } from '../../primitives/textBox.ts';
import { interaction } from '../../primitives/state.stylex.ts';
import { StateLayer, forcedStateLayer, stateLayerHost } from '../../primitives/StateLayer.tsx';
import { useForcedState } from '../../testing/ForceState.tsx';
import { useLabels, type M3Labels } from '../../theme/labels.tsx';
import { useSpringToken } from '../../motion/context.tsx';
import { useSpringChannel } from '../../motion/useSpringChannel.ts';
import { pointerSlop } from '../../motion/gesture.ts';
import { dialValue, dialValueText } from './time.ts';
import {
  CELL_HALF,
  CENTRE,
  HOUR_LABELS,
  INNER,
  INNER_LABELS,
  INNER_R,
  MINUTE_DEG,
  MINUTE_LABELS,
  OUTER,
  OUTER_R,
  REST_PRECISION,
  SLOT_DEG,
  handEnd,
  handFor,
  restsOn,
  type Point,
} from './dial.ts';

/*
 * Figma kit, "Date & time pickers" clock face (52949:28082; Compose ClockFace / ClockDialModifier).
 *   256px Surface Container Highest disc, 48px number cells (the kit's positions), the Primary
 *   selector circle on a 2px hand from an 8px centre dot.
 * Motion: a tap springs the hand to the tapped value on the default spatial spring (minutes in
 *   steps of 5); a drag sets the hand straight from the pointer and springs it to the picked value
 *   on release. With autoSwitchToMinute an hour tap moves on to minutes after 100ms, a drag at
 *   once. The hour and minute numbers cross-fade on default effects (Crossfade).
 * Rendering: the hand's frames (spring and drag) are written to the line and the selector circle
 *   directly; React renders only when the hand comes to rest on a value or leaves it (the selected
 *   number's colour), and the number rings re-render only when their selection changes.
 */
const s = stylex.create({
  face: {
    position: 'relative',
    flexShrink: 0,
    width: 256,
    height: 256,
    borderRadius: '50%',
    backgroundColor: color.surfaceContainerHighest,
    touchAction: 'none',
    userSelect: 'none',
    outlineStyle: 'none',
  },
  hand: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    overflow: 'visible',
    color: color.primary,
    fill: color.primary,
  },
  ring: {
    position: 'absolute',
    inset: 0,
    transitionProperty: 'opacity',
    transitionDuration: motion.defaultEffectsDuration,
    transitionTimingFunction: motion.defaultEffectsEasing,
  },
  ringHidden: { opacity: 0, pointerEvents: 'none' },
  num: {
    position: 'absolute',
    width: 48,
    height: 48,
    margin: 0,
    padding: 0,
    borderWidth: 0,
    borderStyle: 'none',
    borderRadius: 24,
    isolation: 'isolate',
    overflow: 'hidden',
    outlineStyle: 'none',
    cursor: 'pointer',
    color: color.onSurface,
    backgroundColor: 'transparent',
    [interaction.layerColor]: color.onSurface,
  },
  numOn: { color: color.onPrimary, [interaction.layerColor]: color.onPrimaryContainer },
  numStatic: { position: 'relative', display: 'block' },
  numSelected: { backgroundColor: color.primary },
  numLabel: { position: 'absolute', zIndex: 1, top: 12, left: '50%', transform: 'translateX(-50%)' },
  selectorDot: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: color.primary,
    pointerEvents: 'none',
  },
});

// ── Clock number (a dial cell on its own: the kit's Hour building block) ─────────────────────

export interface ClockNumberProps {
  label: string;
  selected?: boolean;
}

export function ClockNumber({ label, selected = false }: ClockNumberProps) {
  const forced = useForcedState();
  return (
    <span
      {...stylex.props(
        s.num,
        s.numStatic,
        selected && [s.numOn, s.numSelected],
        stateLayerHost.host,
        forcedStateLayer(forced.state, 'pressed'),
      )}
    >
      <StateLayer />
      <span {...stylex.props(typescale.bodyLarge, textBox.hug, s.numLabel)}>{label}</span>
    </span>
  );
}

/** One ring of numbers. Memoised: it re-renders only when its selected cell changes. */
const DialRing = memo(function DialRing({
  labels,
  cells,
  selected,
}: {
  labels: readonly string[];
  cells: readonly Point[];
  /** Index of the number under the resting selector, or −1. */
  selected: number;
}) {
  return labels.map((label, i) => (
    <span
      key={i}
      aria-hidden
      {...stylex.props(s.num, i === selected && s.numOn)}
      style={{ left: cells[i]![0], top: cells[i]![1] }}
    >
      <span {...stylex.props(typescale.bodyLarge, textBox.hug, s.numLabel)}>{label}</span>
    </span>
  ));
});

// ── Clock face ────────────────────────────────────────────────────────────────────────────────

export interface ClockFaceProps {
  mode: 'hour' | 'minute';
  /** 0–23 (hour) or 0–59 (minute). */
  value: number;
  is24Hour?: boolean;
  onValueChange: (value: number) => void;
  /** A tap / drag on the dial finished (Compose autoSwitchToMinute). */
  onCommit?: () => void;
  /** Default: the `hour` / `minute` label. */
  'aria-label'?: string;
  /** The value as read out (default `hourValue` / `minuteValue`: "7 o'clock" / "20 hours" / "30 minutes", as Compose). */
  'aria-valuetext'?: string;
  /** Overrides for the built-in strings (`hour`, `minute`, `hourValue`, `minuteValue`). */
  labels?: Partial<M3Labels>;
}

interface DragState {
  pointerId: number;
  x: number;
  y: number;
  slop: number;
  active: boolean;
}

/** The dial: tap or drag to pick; arrows step the value. */
export function ClockFace({
  mode,
  value: valueProp,
  is24Hour = false,
  onValueChange: onChange,
  onCommit,
  'aria-label': ariaLabel,
  'aria-valuetext': valueText,
  labels: labelsProp,
}: ClockFaceProps) {
  const labels = useLabels(labelsProp);
  // Out-of-range input lands on the nearest dial value (never off the kit's cells).
  const value = dialValue(mode, valueProp, is24Hour);
  const hand = handFor(mode, value, is24Hour);
  const face = useRef<HTMLDivElement>(null);
  const line = useRef<SVGLineElement>(null);
  const selector = useRef<HTMLSpanElement>(null);
  const spring = useSpringToken('default-spatial');
  const latestHand = useRef(hand);

  // The hand angle (degrees, clockwise from 12) as React last drew it. Frames don't update it —
  // only reaching or leaving the value does (the numbers' colours depend on that).
  const [drawnAngle, setDrawnAngle] = useState(hand.target);
  const atRest = restsOn(drawnAngle, hand);
  const drawnRest = useRef(atRest);

  /** Writes the hand at `angle` to the line and the selector; re-renders when it reaches / leaves the value. */
  const paint = (angle: number) => {
    const [x, y] = handEnd(angle, latestHand.current);
    line.current?.setAttribute('x2', String(x));
    line.current?.setAttribute('y2', String(y));
    if (selector.current) {
      selector.current.style.left = `${x - CELL_HALF}px`;
      selector.current.style.top = `${y - CELL_HALF}px`;
    }
    const resting = restsOn(angle, latestHand.current);
    if (resting !== drawnRest.current) {
      drawnRest.current = resting;
      setDrawnAngle(angle);
    }
  };
  // Hand angle: springs to the value, or follows the pointer.
  const angle = useSpringChannel(paint, { initial: hand.target, precision: REST_PRECISION });
  // After every commit: React drew the hand from `drawnAngle`; put it where it really is.
  useLayoutEffect(() => {
    latestHand.current = hand;
    drawnRest.current = atRest;
    paint(angle.value);
  });

  // The nearest equivalent of `to` to the shown angle (Compose endValueForAnimation: the short way round).
  const near = (to: number) => {
    const from = angle.value;
    while (to - from > 180) to -= 360;
    while (to - from <= -180) to += 360;
    return to;
  };
  const springTo = (to: number) => angle.to(near(to), spring);

  // A drag owns the hand until release; otherwise every new value springs it (animateToCurrent).
  const drag = useRef<DragState | null>(null);
  useEffect(() => {
    if (!drag.current?.active) springTo(hand.target);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run on a new value or spring only
  }, [hand.target, spring]);
  const switchTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(switchTimer.current), []);

  /** The pointer relative to the dial centre, and its angle (degrees, clockwise from 12). */
  const dialPoint = (clientX: number, clientY: number) => {
    const box = face.current!.getBoundingClientRect();
    const dx = clientX - box.left - CENTRE;
    const dy = clientY - box.top - CENTRE;
    return { dx, dy, deg: ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360 };
  };
  /** Pick from a dial point: minutes in `minuteStep`s (tap 5, drag 1 — Compose onTap / rotateTo). */
  const pick = ({ dx, dy, deg }: ReturnType<typeof dialPoint>, minuteStep: number) => {
    if (mode === 'minute') onChange((Math.round(deg / MINUTE_DEG / minuteStep) * minuteStep) % 60);
    else {
      const hour = Math.round(deg / SLOT_DEG) % 12;
      const innerRing = is24Hour && Math.hypot(dx, dy) < (OUTER_R + INNER_R) / 2;
      onChange(innerRing ? (hour === 0 ? 0 : hour + 12) : hour === 0 ? 12 : hour);
    }
  };
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !face.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    // Compose detectTapGestures onPress: only remember where the press is.
    drag.current = {
      pointerId: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      slop: pointerSlop(e.pointerType),
      active: false,
    };
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    if (!d.active) {
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) <= d.slop) return;
      d.active = true;
      window.clearTimeout(switchTimer.current);
    }
    // Dragging: the hand follows the pointer itself (anim.snapTo), the value its quantised angle.
    const point = dialPoint(e.clientX, e.clientY);
    angle.jump(near(point.deg));
    pick(point, 1);
  };
  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    drag.current = null;
    if (d.active) {
      // onDragEnd: switch at once, spring the hand to the picked value (onGestureEnd).
      springTo(latestHand.current.target);
      onCommit?.();
      return;
    }
    // onTap: spring to the tapped value; an hour tap moves on to minutes after delay(100).
    pick(dialPoint(e.clientX, e.clientY), 5);
    if (mode === 'hour') {
      window.clearTimeout(switchTimer.current);
      switchTimer.current = window.setTimeout(() => onCommit?.(), 100);
    } else onCommit?.();
  };
  const onPointerCancel = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId !== e.pointerId) return;
    const wasActive = drag.current.active;
    drag.current = null;
    if (wasActive) springTo(latestHand.current.target);
  };
  const onKey = (e: KeyboardEvent) => {
    const span = mode === 'minute' ? 60 : is24Hour ? 24 : 12;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      e.preventDefault();
      onChange(mode === 'hour' && !is24Hour ? (value % 12) + 1 : (value + 1) % span);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      e.preventDefault();
      onChange(mode === 'hour' && !is24Hour ? ((value + 10) % 12) + 1 : (value - 1 + span) % span);
    } else if (e.key === 'Enter') onCommit?.();
  };

  const [x, y] = handEnd(drawnAngle, hand);
  // The number under the resting selector, per ring.
  const selectedIn = (screen: 'hour' | 'minute', innerRing: boolean) =>
    screen === mode && atRest && innerRing === hand.inner ? hand.slot : -1;

  return (
    <div
      ref={face}
      role="slider"
      tabIndex={0}
      aria-label={ariaLabel ?? (mode === 'hour' ? labels.hour : labels.minute)}
      aria-valuemin={mode === 'minute' ? 0 : is24Hour ? 0 : 1}
      aria-valuemax={mode === 'minute' ? 59 : is24Hour ? 23 : 12}
      aria-valuenow={value}
      aria-valuetext={valueText ?? dialValueText(mode, value, is24Hour, labels)}
      onKeyDown={onKey}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      {...stylex.props(s.face)}
    >
      <svg aria-hidden width={256} height={256} {...stylex.props(s.hand)}>
        <line ref={line} x1={CENTRE} y1={CENTRE} x2={x} y2={y} stroke="currentColor" strokeWidth={2} />
      </svg>
      <span
        ref={selector}
        aria-hidden
        {...stylex.props(s.selectorDot)}
        style={{ left: x - CELL_HALF, top: y - CELL_HALF }}
      />
      {/* Both number sets stay mounted: switching hour ⇄ minute cross-fades them (Compose Crossfade). */}
      <span aria-hidden {...stylex.props(s.ring, mode !== 'hour' && s.ringHidden)}>
        <DialRing labels={HOUR_LABELS} cells={OUTER} selected={selectedIn('hour', false)} />
        {is24Hour && <DialRing labels={INNER_LABELS} cells={INNER} selected={selectedIn('hour', true)} />}
      </span>
      <span aria-hidden {...stylex.props(s.ring, mode !== 'minute' && s.ringHidden)}>
        <DialRing labels={MINUTE_LABELS} cells={OUTER} selected={selectedIn('minute', false)} />
      </span>
      <svg aria-hidden width={256} height={256} {...stylex.props(s.hand)}>
        <circle cx={CENTRE} cy={CENTRE} r={4.5} />
      </svg>
    </div>
  );
}
