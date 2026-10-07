import {
  useId,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type FocusEventHandler,
  type KeyboardEvent,
  type Ref,
} from 'react';
import * as stylex from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex.ts';
import { typescale } from '../../tokens/typescale.ts';
import { textBox, textCentred } from '../../primitives/textBox.ts';
import { interaction } from '../../primitives/state.stylex.ts';
import { StateLayer, forcedStateLayer, stateLayerHost } from '../../primitives/StateLayer.tsx';
import { useForcedState } from '../../testing/ForceState.tsx';
import type { SxProps } from '../../primitives/types.ts';
import { useLabels, type M3Labels } from '../../theme/labels.tsx';

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

export interface TimeSelectorProps extends SxProps<Omit<ComponentPropsWithRef<'button'>, 'children' | 'value'>> {
  /**
   * The digits shown ("07"). They are the button's description: its name stays constant (the
   * picker passes `aria-label` "Hour" / "Minute") and `aria-pressed` says which one the dial edits.
   */
  value: string;
  selected?: boolean;
  wide?: boolean;
}

export function TimeSelector({ ref, value, selected = false, wide = false, sx, ...rest }: TimeSelectorProps) {
  const forced = useForcedState();
  const valueId = useId();
  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={selected}
      aria-describedby={valueId}
      {...rest}
      {...stylex.props(
        s.selector,
        wide && s.selector24,
        selected && s.selectorOn,
        stateLayerHost.host,
        forcedStateLayer(forced.state, 'pressed'),
        sx,
      )}
    >
      <StateLayer />
      <span id={valueId} {...stylex.props(typescale.displayLarge, s.centred, textCentred.trimTracking)}>
        {value}
      </span>
    </button>
  );
}

export interface TimeSeparatorProps {
  /** The row's height (80 beside the selectors, 72 beside the keyboard fields). */
  height?: number;
}

export function TimeSeparator({ height = 80 }: TimeSeparatorProps) {
  return (
    <span aria-hidden {...stylex.props(typescale.displayLarge, s.separator)} style={{ height }}>
      :
    </span>
  );
}

// ── Keyboard field (the keyboard picker's hour / minute inputs) ───────────────────────────────

export interface TimeFieldProps {
  /** The input element. */
  ref?: Ref<HTMLInputElement>;
  value: string;
  onValueChange: (value: string) => void;
  /** The visible label under the field, and the input's name. */
  label: string;
  /** Focus styling (Primary Container + outline); follows focus when omitted. */
  selected?: boolean;
  onFocus?: FocusEventHandler<HTMLInputElement>;
  /** Two digits were typed (the keyboard picker moves on to the minute). */
  onCommit?: () => void;
  max: number;
}

export function TimeField({ ref, value, onValueChange, label, selected, onFocus, onCommit, max }: TimeFieldProps) {
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
            onFocus?.(e);
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
}

// ── Period selector ───────────────────────────────────────────────────────────────────────────

export type Period = 'am' | 'pm';

export interface PeriodSelectorProps {
  value: Period;
  onValueChange: (value: Period) => void;
  orientation?: 'vertical' | 'horizontal';
  /** Beside the keyboard fields (72px tall). */
  compact?: boolean;
  /** Overrides for the built-in strings (`am`, `pm`, `period`). */
  labels?: Partial<M3Labels>;
}

export function PeriodSelector({
  value,
  onValueChange,
  orientation = 'vertical',
  compact = false,
  labels: labelsProp,
}: PeriodSelectorProps) {
  const labels = useLabels(labelsProp);
  const pm = value === 'pm';
  const forced = useForcedState();
  const horizontal = orientation === 'horizontal';
  const am = useRef<HTMLButtonElement>(null);
  const pmRef = useRef<HTMLButtonElement>(null);
  // A radio group: the checked half is the tab stop; any arrow checks and focuses the other half.
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, isPm: boolean) => {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    e.preventDefault();
    onValueChange(isPm ? 'am' : 'pm');
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
        onClick={() => onValueChange(isPm ? 'pm' : 'am')}
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
      aria-label={labels.period}
      aria-orientation={orientation}
      {...stylex.props(s.period, compact && s.periodKb, horizontal && s.periodH)}
    >
      {half(false, labels.am)}
      {half(true, labels.pm)}
    </span>
  );
}
