import { forwardRef, useRef, useState, type KeyboardEvent } from 'react';
import * as stylex from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex.ts';
import { typescale } from '../../tokens/typescale.ts';
import { textBox, textCentred } from '../../primitives/textBox.ts';
import { interaction } from '../../primitives/state.stylex.ts';
import { StateLayer, forcedStateLayer, stateLayerHost } from '../../primitives/StateLayer.tsx';
import { useForcedState } from '../../testing/ForceState.tsx';

export { ClockFace, ClockNumber } from './ClockFace.tsx';
export type { ClockFaceProps } from './ClockFace.tsx';

/*
 * Figma kit, "Date & time pickers" time building blocks (52949:28082; Compose TimePicker /
 * TimeInput, TimePickerTokens).
 *   Time selector (dial header): 96×80 (116 for 24h), 8px corners, display-large; Primary
 *   Container / On Primary Container when selected, Surface Container Highest / On Surface
 *   otherwise. Keyboard field: 96×72, display-medium, a 2px Primary outline and cursor when
 *   focused, body-small label 7px below. Period selector: Outline-bordered 8px box, vertical
 *   52×80 (72 beside keyboard fields) or horizontal 216×38, the selected half Tertiary
 *   Container. The clock face lives in ClockFace.tsx.
 * Motion: the selector boxes and period halves change colour at once (Compose doesn't animate
 *   them).
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
  },
  selector24: { width: 116 },
  selectorOn: { color: color.onPrimaryContainer, backgroundColor: color.primaryContainer },
  centred: { width: '100%', textAlign: 'center' },
  separator: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    flexShrink: 0,
    color: color.onSurface,
  },
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
  kbFieldOn: {
    color: color.onPrimaryContainer,
    backgroundColor: color.primaryContainer,
    boxShadow: `inset 0 0 0 2px ${color.primary}`,
  },
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
        forcedStateLayer(forced.state, 'pressed'),
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

export function PeriodSelector({
  pm,
  onChange,
  orientation = 'vertical',
  compact = false,
  labels = {},
}: PeriodSelectorProps) {
  const forced = useForcedState();
  const horizontal = orientation === 'horizontal';
  const am = useRef<HTMLButtonElement>(null);
  const pmRef = useRef<HTMLButtonElement>(null);
  // A radio group: the checked half is the tab stop; any arrow checks and focuses the other half.
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, isPm: boolean) => {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    e.preventDefault();
    onChange(!isPm);
    (isPm ? am : pmRef).current?.focus();
  };
  const half = (isPm: boolean, text: string) => {
    const on = pm === isPm;
    return (
      <button
        ref={isPm ? pmRef : am}
        type="button"
        role="radio"
        aria-checked={on}
        tabIndex={on ? 0 : -1}
        onClick={() => onChange(isPm)}
        onKeyDown={(e) => onKey(e, isPm)}
        {...stylex.props(
          s.half,
          isPm ? (horizontal ? s.halfRuleStartH : s.halfRuleStart) : horizontal ? s.halfRuleEndH : s.halfRuleEnd,
          on && s.halfOn,
          stateLayerHost.host,
          on && forcedStateLayer(forced.state, 'pressed'),
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
      {...stylex.props(s.period, compact && s.periodKb, horizontal && s.periodH)}
    >
      {half(false, labels.am ?? 'AM')}
      {half(true, labels.pm ?? 'PM')}
    </span>
  );
}
