import { forwardRef, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import * as stylex from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex';
import { motion } from '../../tokens/motion.stylex';
import { typescale } from '../../tokens/typescale.ts';
import { textBox, textCentred } from '../../primitives/textBox.ts';
import { interaction } from '../../primitives/state.stylex';
import { StateLayer, stateLayerHost } from '../../primitives/StateLayer.tsx';
import { useForcedState } from '../../testing/ForceState.tsx';
import { useSpringToken } from '../../motion/context.tsx';
import { animateSpring, type SpringAnimation } from '../../motion/animate.ts';

/*
 * Figma kit, "Date & time pickers" time building blocks (52949:28082; Compose TimePicker /
 * TimeInput, TimePickerTokens).
 *   Time selector (dial header): 96×80 (116 for 24h), 8px corners, display-large; Primary
 *   Container / On Primary Container when selected, Surface Container Highest / On Surface
 *   otherwise. Keyboard field: 96×72, display-medium, a 2px Primary outline and cursor when
 *   focused, body-small label 7px below. Period selector: Outline-bordered 8px box, vertical
 *   52×80 (72 beside keyboard fields) or horizontal 216×38, the selected half Tertiary
 *   Container. Clock face: 256px Surface Container Highest disc, 48px number cells (the kit's
 *   positions), the Primary selector circle on a 2px hand from an 8px centre dot.
 * Motion: the hand rotates on the default spatial spring; hours ⇄ minutes cross-fade on default
 *   effects.
 */
const s = stylex.create({
  selector: {
    position: 'relative',
    isolation: 'isolate',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 96,
    height: 80,
    flexShrink: 0,
    margin: 0,
    padding: 0,
    boxSizing: 'border-box',
    borderWidth: 0,
    borderStyle: 'none',
    borderRadius: 8,
    overflow: 'hidden',
    outlineStyle: 'none',
    cursor: 'pointer',
    color: color.onSurface,
    backgroundColor: color.surfaceContainerHighest,
    [interaction.layerColor]: 'currentColor',
    transitionProperty: 'background-color, color',
    transitionDuration: motion.defaultEffectsDuration,
    transitionTimingFunction: motion.defaultEffectsEasing,
  },
  selector24: { width: 116 },
  selectorOn: { color: color.onPrimaryContainer, backgroundColor: color.primaryContainer },
  centred: { width: '100%', textAlign: 'center' },
  separator: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, flexShrink: 0, color: color.onSurface },
  // Keyboard field
  kbWrap: { display: 'flex', flexDirection: 'column', rowGap: 7, width: 96, flexShrink: 0 },
  kbField: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 72,
    boxSizing: 'border-box',
    borderRadius: 8,
    color: color.onSurface,
    backgroundColor: color.surfaceContainerHighest,
  },
  kbFieldOn: { color: color.onPrimaryContainer, backgroundColor: color.primaryContainer, boxShadow: `inset 0 0 0 2px ${color.primary}` },
  // The input box is the 52px line box (a native input centres by font metrics, not line height).
  kbInput: {
    width: '100%',
    height: 52,
    margin: 0,
    padding: 0,
    borderWidth: 0,
    borderStyle: 'none',
    outlineStyle: 'none',
    backgroundColor: 'transparent',
    color: 'inherit',
    textAlign: 'center',
    caretColor: color.primary,
  },
  kbStatic: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 1,
    pointerEvents: 'none',
  },
  kbHidden: { color: 'transparent' },
  cursor: { width: 2, height: 42, backgroundColor: color.primary },
  kbLabel: { margin: 0, color: color.onSurfaceVariant },
  // Period selector
  // The halves fill the box; the Outline border is drawn over them (the kit's inside stroke).
  period: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    boxSizing: 'border-box',
    width: 52,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: color.surfaceContainerHigh,
    '::after': {
      content: '""',
      position: 'absolute',
      inset: 0,
      zIndex: 1,
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: color.outline,
      borderRadius: 'inherit',
      pointerEvents: 'none',
    },
  },
  periodKb: { height: 72 },
  periodH: { flexDirection: 'row', width: 216, height: 38 },
  half: {
    position: 'relative',
    isolation: 'isolate',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
    flexBasis: 0,
    margin: 0,
    padding: 0,
    borderWidth: 0,
    borderStyle: 'none',
    outlineStyle: 'none',
    cursor: 'pointer',
    color: color.onSurfaceVariant,
    backgroundColor: 'transparent',
    [interaction.layerColor]: 'currentColor',
  },
  // The kit's divider is two centre-aligned 1px strokes: it straddles the halves' boundary.
  halfRuleEnd: { boxShadow: `inset 0 -0.5px 0 ${color.outline}` },
  halfRuleStart: { boxShadow: `inset 0 0.5px 0 ${color.outline}` },
  halfRuleEndH: { boxShadow: `inset -0.5px 0 0 ${color.outline}` },
  halfRuleStartH: { boxShadow: `inset 0.5px 0 0 ${color.outline}` },
  halfOn: { color: color.onTertiaryContainer, backgroundColor: color.tertiaryContainer },
  // Clock face
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
  hand: { position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible', color: color.primary, fill: color.primary },
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
  selectorDot: { position: 'absolute', width: 48, height: 48, borderRadius: 24, backgroundColor: color.primary, pointerEvents: 'none' },
});

// ── Time selector (the dial picker's hour / minute boxes) ─────────────────────────────────────

export interface TimeSelectorProps {
  value: string;
  selected?: boolean;
  wide?: boolean;
  onClick?: () => void;
  'aria-label'?: string;
}

export const TimeSelector = forwardRef<HTMLButtonElement, TimeSelectorProps>(function TimeSelector(
  { value, selected = false, wide = false, onClick, 'aria-label': ariaLabel },
  ref,
) {
  const forced = useForcedState();
  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={selected}
      aria-label={ariaLabel}
      onClick={onClick}
      {...stylex.props(
        s.selector,
        wide && s.selector24,
        selected && s.selectorOn,
        stateLayerHost.host,
        forced.state === 'hovered' && stateLayerHost.forceHover,
        forced.state === 'focused' && stateLayerHost.forceFocus,
      )}
    >
      <StateLayer />
      <span {...stylex.props(typescale.displayLarge, s.centred, textCentred.trimTracking)}>{value}</span>
    </button>
  );
});

export function TimeSeparator({ height = 80 }: { height?: number }) {
  return (
    <span aria-hidden {...stylex.props(typescale.displayLarge, s.separator)} style={{ height }}>
      :
    </span>
  );
}

// ── Keyboard field (the keyboard picker's hour / minute inputs) ───────────────────────────────

export interface TimeFieldProps {
  value: string;
  onValueChange: (value: string) => void;
  label: string;
  /** Focus styling (Primary Container + outline); follows focus when omitted. */
  selected?: boolean;
  onFocus?: () => void;
  onCommit?: () => void;
  max: number;
}

export const TimeField = forwardRef<HTMLInputElement, TimeFieldProps>(function TimeField(
  { value, onValueChange, label, selected, onFocus, onCommit, max },
  ref,
) {
  const forced = useForcedState();
  const [focused, setFocused] = useState(false);
  const on = selected ?? (focused || forced.state === 'focused');
  const showStatic = forced.state === 'focused' && forced.caret !== false;
  return (
    <span {...stylex.props(s.kbWrap)}>
      <span {...stylex.props(s.kbField, on && s.kbFieldOn)}>
        <input
          ref={ref}
          inputMode="numeric"
          aria-label={label}
          value={value}
          maxLength={2}
          onFocus={(e) => {
            setFocused(true);
            e.currentTarget.select();
            onFocus?.();
          }}
          onBlur={() => setFocused(false)}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '').slice(0, 2);
            if (digits === '' || Number(digits) <= max) onValueChange(digits);
            if (digits.length === 2) onCommit?.();
          }}
          {...stylex.props(typescale.displayMedium, s.kbInput, showStatic && s.kbHidden)}
        />
        {showStatic && (
          // The kit's static field: the value and a 2×42 Primary cursor, centred together.
          <span aria-hidden {...stylex.props(s.kbStatic)}>
            <span {...stylex.props(typescale.displayMedium, textBox.hug)}>{value}</span>
            <span {...stylex.props(s.cursor)} />
          </span>
        )}
      </span>
      <span {...stylex.props(typescale.bodySmall, s.kbLabel)}>{label}</span>
    </span>
  );
});

// ── Period selector ───────────────────────────────────────────────────────────────────────────

export interface PeriodSelectorProps {
  pm: boolean;
  onChange: (pm: boolean) => void;
  orientation?: 'vertical' | 'horizontal';
  /** Beside the keyboard fields (72px tall). */
  compact?: boolean;
  labels?: { am?: string; pm?: string };
}

export function PeriodSelector({ pm, onChange, orientation = 'vertical', compact = false, labels = {} }: PeriodSelectorProps) {
  const forced = useForcedState();
  const h = orientation === 'horizontal';
  const half = (isPm: boolean, text: string) => {
    const on = pm === isPm;
    return (
      <button
        type="button"
        role="radio"
        aria-checked={on}
        onClick={() => onChange(isPm)}
        {...stylex.props(
          s.half,
          isPm ? (h ? s.halfRuleStartH : s.halfRuleStart) : h ? s.halfRuleEndH : s.halfRuleEnd,
          on && s.halfOn,
          stateLayerHost.host,
          on && forced.state === 'hovered' && stateLayerHost.forceHover,
          on && forced.state === 'focused' && stateLayerHost.forceFocus,
        )}
      >
        <StateLayer />
        <span {...stylex.props(typescale.titleMedium, textBox.hug)}>{text}</span>
      </button>
    );
  };
  return (
    <span
      role="radiogroup"
      aria-label="Period"
      aria-orientation={orientation}
      {...stylex.props(s.period, compact && s.periodKb, h && s.periodH)}
    >
      {half(false, labels.am ?? 'AM')}
      {half(true, labels.pm ?? 'PM')}
    </span>
  );
}

// ── Clock number (a dial cell on its own: the kit's Hour building block) ─────────────────────

export function ClockNumber({ label, selected = false }: { label: string; selected?: boolean }) {
  const forced = useForcedState();
  return (
    <span
      {...stylex.props(
        s.num,
        s.numStatic,
        selected && [s.numOn, s.numSelected],
        stateLayerHost.host,
        forced.state === 'hovered' && stateLayerHost.forceHover,
        forced.state === 'focused' && stateLayerHost.forceFocus,
      )}
    >
      <StateLayer />
      <span {...stylex.props(typescale.bodyLarge, textBox.hug, s.numLabel)}>{label}</span>
    </span>
  );
}

// ── Clock face ────────────────────────────────────────────────────────────────────────────────

/** The kit's number cells (top-left, px) on the 256px dial: index 0 = 12 o'clock, clockwise. */
const OUTER: [number, number][] = [
  [104, 2],
  [154, 16],
  [192, 54],
  [206, 104],
  [192, 154],
  [154, 192],
  [104, 206],
  [54, 192],
  [16, 154],
  [2, 104],
  [16, 54],
  [54, 16],
];
/** The 24-hour inner ring (24, 13 … 23). */
const INNER: [number, number][] = [
  [104, 30],
  [141, 40],
  [168, 66],
  [177, 104],
  [172, 141],
  [142, 166],
  [104, 178],
  [70, 166],
  [41, 141],
  [30, 104],
  [41, 66],
  [70, 40],
];
const C = 128;
const OUTER_R = 101;
const INNER_R = 69;
const centreOf = ([x, y]: [number, number]) => [x + 24, y + 24] as const;

export interface ClockFaceProps {
  mode: 'hour' | 'minute';
  /** 0–23 (hour) or 0–59 (minute). */
  value: number;
  is24Hour?: boolean;
  onChange: (value: number) => void;
  /** A tap / drag on the dial finished (Compose autoSwitchToMinute). */
  onCommit?: () => void;
  'aria-label'?: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** The dial: tap or drag to pick; arrows step the value. */
export function ClockFace({ mode, value, is24Hour = false, onChange, onCommit, 'aria-label': ariaLabel }: ClockFaceProps) {
  const face = useRef<HTMLDivElement>(null);
  const spring = useSpringToken('default-spatial');
  const inner = mode === 'hour' && is24Hour && (value === 0 || value > 12);
  const slot = mode === 'hour' ? value % 12 : value / 5;
  const target = slot * 30;
  // Animated hand angle (degrees, clockwise from 12), taking the short way round.
  const [angle, setAngle] = useState(target);
  const anim = useRef<SpringAnimation | null>(null);
  const shown = useRef(target);
  useEffect(() => {
    let to = target;
    const from = shown.current;
    while (to - from > 180) to -= 360;
    while (to - from < -180) to += 360;
    if (!spring) {
      shown.current = to;
      setAngle(to);
      return;
    }
    if (anim.current) anim.current.retarget(to);
    else
      anim.current = animateSpring({
        spring,
        from,
        to,
        precision: 0.05,
        onUpdate: (v) => {
          shown.current = v;
          setAngle(v);
        },
        onComplete: () => {
          anim.current = null;
        },
      });
  }, [target, spring]);

  const atRest = Math.abs(angle - target) % 360 < 0.05 && Number.isInteger(slot);
  const r = inner ? INNER_R : OUTER_R;
  const rad = (angle * Math.PI) / 180;
  // At rest the selector sits on the kit's cell; in motion it follows the hand on its circle.
  const [cx, cy] = atRest ? centreOf((inner ? INNER : OUTER)[slot]!) : [C + r * Math.sin(rad), C - r * Math.cos(rad)];

  const pick = (e: ReactPointerEvent<HTMLDivElement>, commit: boolean) => {
    const el = face.current;
    if (!el) return;
    const b = el.getBoundingClientRect();
    const dx = e.clientX - b.left - C;
    const dy = e.clientY - b.top - C;
    const deg = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
    if (mode === 'minute') onChange(Math.round(deg / 6) % 60);
    else {
      const h = Math.round(deg / 30) % 12;
      const innerRing = is24Hour && Math.hypot(dx, dy) < (OUTER_R + INNER_R) / 2;
      onChange(innerRing ? (h === 0 ? 0 : h + 12) : h === 0 ? 12 : h);
    }
    if (commit) onCommit?.();
  };
  const onKey = (e: KeyboardEvent) => {
    const step = 1;
    const span = mode === 'minute' ? 60 : is24Hour ? 24 : 12;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      e.preventDefault();
      onChange(mode === 'hour' && !is24Hour ? (value % 12) + 1 : (value + step) % span);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      e.preventDefault();
      onChange(mode === 'hour' && !is24Hour ? ((value + 10) % 12) + 1 : (value - step + span) % span);
    } else if (e.key === 'Enter') onCommit?.();
  };

  const labelsOuter =
    mode === 'minute' ? Array.from({ length: 12 }, (_, i) => pad(i * 5)) : Array.from({ length: 12 }, (_, i) => String(i === 0 ? 12 : i));
  const labelsInner = Array.from({ length: 12 }, (_, i) => (i === 0 ? (is24Hour ? '24' : '') : String(i + 12)));
  const isOn = (ring: 'outer' | 'inner', i: number) =>
    atRest && (ring === 'inner') === inner && (mode === 'minute' ? value === i * 5 : i === slot);

  const cell = (ring: 'outer' | 'inner', i: number, label: string, pos: [number, number]) => (
    <span key={`${ring}${i}`} aria-hidden {...stylex.props(s.num, isOn(ring, i) && s.numOn)} style={{ left: pos[0], top: pos[1] }}>
      <span {...stylex.props(typescale.bodyLarge, textBox.hug, s.numLabel)}>{label}</span>
    </span>
  );

  return (
    <div
      ref={face}
      role="slider"
      tabIndex={0}
      aria-label={ariaLabel ?? (mode === 'hour' ? 'Hour' : 'Minute')}
      aria-valuemin={mode === 'minute' ? 0 : is24Hour ? 0 : 1}
      aria-valuemax={mode === 'minute' ? 59 : is24Hour ? 23 : 12}
      aria-valuenow={value}
      onKeyDown={onKey}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        pick(e, false);
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) pick(e, false);
      }}
      onPointerUp={(e) => pick(e, true)}
      {...stylex.props(s.face)}
    >
      <svg aria-hidden width={256} height={256} {...stylex.props(s.hand)}>
        <line x1={C} y1={C} x2={cx} y2={cy} stroke="currentColor" strokeWidth={2} />
      </svg>
      <span aria-hidden {...stylex.props(s.selectorDot)} style={{ left: cx - 24, top: cy - 24 }} />
      <span aria-hidden {...stylex.props(s.ring)}>
        {labelsOuter.map((l, i) => cell('outer', i, l, OUTER[i]!))}
        {mode === 'hour' && is24Hour && labelsInner.map((l, i) => cell('inner', i, l, INNER[i]!))}
      </span>
      <svg aria-hidden width={256} height={256} {...stylex.props(s.hand)}>
        <circle cx={C} cy={C} r={4.5} />
      </svg>
    </div>
  );
}
