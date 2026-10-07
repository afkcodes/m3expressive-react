import {
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type MouseEventHandler,
  type ReactNode,
} from 'react';
import * as stylex from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex.ts';
import { typescale } from '../../tokens/typescale.ts';
import { useControllableState } from '../../hooks/useControllableState.ts';
import { Button } from '../Button/Button.tsx';
import { IconButton } from '../IconButton/IconButton.tsx';
import { ModalShell, type ModalOpenChangeDetails } from '../../primitives/ModalShell.tsx';
import { SvgIcon } from '../../primitives/SvgIcon.tsx';
import { dialogMotion } from '../../primitives/dialogMotion.ts';
import type { SxProps } from '../../primitives/types.ts';
import { ForceStateBoundary } from '../../testing/ForceState.tsx';
import { useLabels, type M3Labels } from '../../theme/labels.tsx';
import { ClockFace } from './ClockFace.tsx';
import { PeriodSelector, TimeField, TimeSelector, TimeSeparator } from './parts.tsx';
import { normalizeTime, type Time } from './time.ts';

export type { Time } from './time.ts';

/*
 * Figma kit, "Dial picker" (52949:27916) and "Keyboard picker" (52949:28053); Compose TimePicker /
 * TimeInput in a TimePickerDialog.
 *   Surface Container High, 28px corners. Header 40px: label-medium On Surface Variant 24px in.
 *   Dial, vertical (328×520, 20px gaps): hour : minute boxes + the period selector (24px sides;
 *   24h: 116px boxes, 36px sides), the 256px dial 36px below, actions 68px (the keyboard toggle at
 *   the start, Cancel / OK 24px from the end, 20px below). Horizontal (572×384): the boxes and a
 *   horizontal period selector (72px down, 16px gap) beside the dial (52px gap), actions 88px.
 *   Keyboard (328×243; 24h 264): hour : minute fields with labels + the 72px period selector.
 * Motion: the dialog uses the M3 dialog fade + scale; the dial's hand rotates on the default
 *   spatial spring and hours ⇄ minutes cross-fade on default effects.
 */
const KEYBOARD =
  'M4 19C3.45 19 2.97917 18.8042 2.5875 18.4125C2.19583 18.0208 2 17.55 2 17V7C2 6.45 2.19583 5.97917 2.5875 5.5875C2.97917 5.19583 3.45 5 4 5H20C20.55 5 21.0208 5.19583 21.4125 5.5875C21.8042 5.97917 22 6.45 22 7V17C22 17.55 21.8042 18.0208 21.4125 18.4125C21.0208 18.8042 20.55 19 20 19H4ZM8 16H16V14H8V16ZM5 13H7V11H5V13ZM8 13H10V11H8V13ZM11 13H13V11H11V13ZM14 13H16V11H14V13ZM17 13H19V11H17V13ZM5 10H7V8H5V10ZM8 10H10V8H8V10ZM11 10H13V8H11V10ZM14 10H16V8H14V10ZM17 10H19V8H17V10Z';
const SCHEDULE =
  'M15.3 16.7L16.7 15.3L13 11.6V7H11V12.4L15.3 16.7ZM12 22C10.6167 22 9.31667 21.7375 8.1 21.2125C6.88333 20.6875 5.825 19.975 4.925 19.075C4.025 18.175 3.3125 17.1167 2.7875 15.9C2.2625 14.6833 2 13.3833 2 12C2 10.6167 2.2625 9.31667 2.7875 8.1C3.3125 6.88333 4.025 5.825 4.925 4.925C5.825 4.025 6.88333 3.3125 8.1 2.7875C9.31667 2.2625 10.6167 2 12 2C13.3833 2 14.6833 2.2625 15.9 2.7875C17.1167 3.3125 18.175 4.025 19.075 4.925C19.975 5.825 20.6875 6.88333 21.2125 8.1C21.7375 9.31667 22 10.6167 22 12C22 13.3833 21.7375 14.6833 21.2125 15.9C20.6875 17.1167 19.975 18.175 19.075 19.075C18.175 19.975 17.1167 20.6875 15.9 21.2125C14.6833 21.7375 13.3833 22 12 22Z';

const s = stylex.create({
  surface: {
    display: 'flex',
    flexDirection: 'column',
    rowGap: 20,
    boxSizing: 'border-box',
    width: 328,
    overflow: 'hidden',
    color: color.onSurface,
    backgroundColor: color.surfaceContainerHigh,
    borderRadius: 28,
  },
  surfaceH: { width: 572, rowGap: 0 },
  surfaceKb24: { width: 264 },
  header: { height: 40, boxSizing: 'border-box', paddingTop: 24, paddingInline: 24, flexShrink: 0 },
  title: { margin: 0, height: 16, color: color.onSurfaceVariant },
  body: { display: 'flex', flexDirection: 'column', alignItems: 'center', rowGap: 36, paddingInline: 24 },
  body24: { paddingInline: 36 },
  bodyH: { flexDirection: 'row', alignItems: 'flex-start', columnGap: 52 },
  inputs: { display: 'flex', columnGap: 12, alignSelf: 'stretch' },
  inputsCol: { flexDirection: 'column', rowGap: 16, width: 216, paddingTop: 72, paddingBottom: 50 },
  // 24h: no period selector under the boxes — they centre beside the dial.
  inputsCol24: { justifyContent: 'center', alignSelf: 'stretch', paddingTop: 0, paddingBottom: 0 },
  boxes: { display: 'flex' },
  actions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
    height: 68,
    boxSizing: 'border-box',
    paddingInline: '12px 24px',
    paddingBottom: 20,
  },
  actionsH: { height: 88, paddingBlock: 20 },
  end: { display: 'flex', columnGap: 8 },
  kbRow: { display: 'flex', columnGap: 12, paddingInline: 24 },
  popup: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    translate: '-50% -50%',
    outlineStyle: 'none',
  },
});

const pad = (n: number) => String(n).padStart(2, '0');
const display12 = (h: number) => (h % 12 === 0 ? 12 : h % 12);

/** The time a picker shows without `value` / `defaultValue`: 00:00 (Compose rememberTimePickerState). */
const MIDNIGHT: Time = { hour: 0, minute: 0 };

/** Which field the dial edits. */
export type TimePickerSelection = 'hour' | 'minute';

/** `ref`, the native props and `sx` go to the picker's surface `<div>`. */
export interface TimePickerProps extends SxProps<Omit<ComponentPropsWithRef<'div'>, 'defaultValue'>> {
  value?: Time;
  /** The uncontrolled initial time (default 00:00, as Compose). */
  defaultValue?: Time;
  onValueChange?: (time: Time) => void;
  is24Hour?: boolean;
  orientation?: 'vertical' | 'horizontal';
  /** Which field the dial edits. */
  selection?: TimePickerSelection;
  /** The uncontrolled initial selection (default `'hour'`). */
  defaultSelection?: TimePickerSelection;
  onSelectionChange?: (selection: TimePickerSelection) => void;
  /** Move to minutes after an hour is picked on the dial (default true, as Compose). */
  autoSwitchToMinute?: boolean;
  /** The line above the picker (M3 "headline"; default the `selectTime` label). */
  headline?: ReactNode;
  /** The keyboard-mode button (hidden when omitted). */
  onModeToggle?: MouseEventHandler<HTMLButtonElement>;
  /** The Cancel button (hidden when omitted). */
  onCancel?: MouseEventHandler<HTMLButtonElement>;
  /** The OK button (hidden when omitted). */
  onConfirm?: MouseEventHandler<HTMLButtonElement>;
  /** Overrides for the built-in strings (`selectTime`, `hour`, `minute`, `am`, `pm`, `switchToInput`, `cancel`, `ok`…). */
  labels?: Partial<M3Labels>;
}

/** The dial time picker (the dialog's content; see `ModalTimePicker`). */
export function TimePicker({
  ref,
  value: valueProp,
  defaultValue,
  onValueChange,
  is24Hour = false,
  orientation = 'vertical',
  selection: selProp,
  defaultSelection = 'hour',
  onSelectionChange,
  autoSwitchToMinute = true,
  headline,
  onModeToggle,
  onCancel,
  onConfirm,
  labels: labelsProp,
  sx,
  ...rest
}: TimePickerProps) {
  const labels = useLabels(labelsProp);
  const [current, onChange] = useControllableState(valueProp, defaultValue ?? MIDNIGHT, onValueChange);
  const value = normalizeTime(current);
  const [sel, setSel] = useControllableState<TimePickerSelection>(selProp, defaultSelection, onSelectionChange);
  const horizontal = orientation === 'horizontal';
  const pm = value.hour >= 12;
  const dialHour = is24Hour ? value.hour : display12(value.hour);
  const setHourFromDial = (v: number) => {
    const hour = is24Hour ? v % 24 : (v % 12) + (pm ? 12 : 0);
    onChange({ hour, minute: value.minute });
  };
  // The selectors' names stay "Hour" / "Minute"; the digits are their description.
  const boxes = (
    <span {...stylex.props(s.boxes)}>
      <TimeSelector
        value={pad(dialHour)}
        selected={sel === 'hour'}
        wide={is24Hour && !horizontal}
        onClick={() => setSel('hour')}
        aria-label={labels.hour}
      />
      <TimeSeparator />
      <ForceStateBoundary>
        <TimeSelector
          value={pad(value.minute)}
          selected={sel === 'minute'}
          wide={is24Hour && !horizontal}
          onClick={() => setSel('minute')}
          aria-label={labels.minute}
        />
      </ForceStateBoundary>
    </span>
  );
  const period = !is24Hour && (
    <ForceStateBoundary>
      <PeriodSelector
        value={pm ? 'pm' : 'am'}
        orientation={horizontal ? 'horizontal' : 'vertical'}
        labels={labels}
        onValueChange={(p) => onChange({ hour: (value.hour % 12) + (p === 'pm' ? 12 : 0), minute: value.minute })}
      />
    </ForceStateBoundary>
  );
  return (
    <div ref={ref} {...rest} {...stylex.props(s.surface, horizontal && s.surfaceH, sx)}>
      <div {...stylex.props(s.header)}>
        <p {...stylex.props(typescale.labelMedium, s.title)}>{headline ?? labels.selectTime}</p>
      </div>
      <div {...stylex.props(s.body, is24Hour && !horizontal && s.body24, horizontal && s.bodyH)}>
        <div {...stylex.props(s.inputs, horizontal && s.inputsCol, horizontal && is24Hour && s.inputsCol24)}>
          {boxes}
          {period}
        </div>
        <ForceStateBoundary>
          <ClockFace
            mode={sel}
            value={sel === 'hour' ? (is24Hour ? value.hour : dialHour) : value.minute}
            is24Hour={is24Hour}
            labels={labels}
            onValueChange={(v) => (sel === 'hour' ? setHourFromDial(v) : onChange({ hour: value.hour, minute: v }))}
            onCommit={() => sel === 'hour' && autoSwitchToMinute && setSel('minute')}
          />
        </ForceStateBoundary>
      </div>
      {(onModeToggle || onCancel || onConfirm) && (
        <ForceStateBoundary>
          <div {...stylex.props(s.actions, horizontal && s.actionsH)}>
            {onModeToggle ? (
              <IconButton aria-label={labels.switchToInput} onClick={onModeToggle}>
                <SvgIcon d={KEYBOARD} />
              </IconButton>
            ) : (
              <span />
            )}
            <span {...stylex.props(s.end)}>
              {onCancel && (
                <Button variant="text" onClick={onCancel}>
                  {labels.cancel}
                </Button>
              )}
              {onConfirm && (
                <Button variant="text" onClick={onConfirm}>
                  {labels.ok}
                </Button>
              )}
            </span>
          </div>
        </ForceStateBoundary>
      )}
    </div>
  );
}

export interface TimeInputProps extends Omit<
  TimePickerProps,
  'orientation' | 'selection' | 'defaultSelection' | 'onSelectionChange' | 'autoSwitchToMinute'
> {
  /** Focus the hour field on mount. */
  autoFocus?: boolean;
}

/**
 * The keyboard time picker (Compose TimeInput). `headline` defaults to the `enterTime` label. The
 * fields keep what is typed; each complete entry is reported through `onValueChange`.
 */
export function TimeInput({
  ref,
  value: valueProp,
  defaultValue,
  onValueChange,
  is24Hour = false,
  headline,
  onModeToggle,
  onCancel,
  onConfirm,
  labels: labelsProp,
  autoFocus,
  sx,
  ...rest
}: TimeInputProps) {
  const labels = useLabels(labelsProp);
  const [current, onChange] = useControllableState(valueProp, defaultValue ?? MIDNIGHT, onValueChange);
  const value = normalizeTime(current);
  const pm = value.hour >= 12;
  const [hourText, setHourText] = useState(pad(is24Hour ? value.hour : display12(value.hour)));
  const [minuteText, setMinuteText] = useState(pad(value.minute));
  const minuteRef = useRef<HTMLInputElement>(null);
  const hourRef = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => {
    if (autoFocus) hourRef.current?.focus();
  }, [autoFocus]);
  return (
    <div ref={ref} {...rest} {...stylex.props(s.surface, is24Hour && s.surfaceKb24, sx)}>
      <div {...stylex.props(s.header)}>
        <p {...stylex.props(typescale.labelMedium, s.title)}>{headline ?? labels.enterTime}</p>
      </div>
      <div {...stylex.props(s.kbRow)}>
        <span {...stylex.props(s.boxes)}>
          <TimeField
            ref={hourRef}
            label={labels.hour}
            value={hourText}
            max={is24Hour ? 23 : 12}
            onValueChange={(text) => {
              setHourText(text);
              if (text !== '') {
                const hour = Number(text);
                onChange({ hour: is24Hour ? hour : (hour % 12) + (pm ? 12 : 0), minute: value.minute });
              }
            }}
            onCommit={() => minuteRef.current?.focus()}
          />
          <TimeSeparator height={72} />
          <ForceStateBoundary>
            <TimeField
              ref={minuteRef}
              label={labels.minute}
              value={minuteText}
              max={59}
              onValueChange={(text) => {
                setMinuteText(text);
                if (text !== '') onChange({ hour: value.hour, minute: Number(text) });
              }}
            />
          </ForceStateBoundary>
        </span>
        {!is24Hour && (
          <ForceStateBoundary>
            <PeriodSelector
              value={pm ? 'pm' : 'am'}
              compact
              labels={labels}
              onValueChange={(p) => onChange({ hour: (value.hour % 12) + (p === 'pm' ? 12 : 0), minute: value.minute })}
            />
          </ForceStateBoundary>
        )}
      </div>
      {(onModeToggle || onCancel || onConfirm) && (
        <ForceStateBoundary>
          <div {...stylex.props(s.actions)}>
            {onModeToggle ? (
              <IconButton aria-label={labels.switchToClock} onClick={onModeToggle}>
                <SvgIcon d={SCHEDULE} />
              </IconButton>
            ) : (
              <span />
            )}
            <span {...stylex.props(s.end)}>
              {onCancel && (
                <Button variant="text" onClick={onCancel}>
                  {labels.cancel}
                </Button>
              )}
              {onConfirm && (
                <Button variant="text" onClick={onConfirm}>
                  {labels.ok}
                </Button>
              )}
            </span>
          </div>
        </ForceStateBoundary>
      )}
    </div>
  );
}

/**
 * `ref`, the native props and `sx` go to the dialog popup (docs/API-CONVENTIONS.md §1); the
 * picker options go to the dial / keyboard picker inside.
 */
export interface ModalTimePickerProps extends Omit<
  TimePickerProps,
  'onCancel' | 'onConfirm' | 'onModeToggle' | 'role' | 'children'
> {
  open?: boolean;
  /** The uncontrolled initial open state (default false). */
  defaultOpen?: boolean;
  /**
   * `details` are Base UI's (reason, event, `cancel()`) when the dialog closes itself (Escape, the
   * scrim); the picker's Cancel / OK buttons close it without them.
   */
  onOpenChange?: (open: boolean, details?: ModalOpenChangeDetails) => void;
  /** The confirmed time: changes when OK is pressed (Cancel / Escape keep it). */
  value?: Time;
  defaultValue?: Time;
  onValueChange?: (time: Time) => void;
}

/** The time picker dialog: dial ⇄ keyboard, OK commits, Cancel / Escape discard. */
export function ModalTimePicker({
  ref,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  value: valueProp,
  defaultValue,
  onValueChange,
  is24Hour,
  orientation,
  selection,
  defaultSelection,
  onSelectionChange,
  autoSwitchToMinute,
  headline,
  labels: labelsProp,
  sx,
  'aria-label': ariaLabel,
  ...popupProps
}: ModalTimePickerProps) {
  const labels = useLabels(labelsProp);
  const [open, setOpen] = useControllableState<boolean, [ModalOpenChangeDetails?]>(openProp, defaultOpen, onOpenChange);
  const [value, setValue] = useControllableState(valueProp, defaultValue ?? MIDNIGHT, onValueChange);
  const [draft, setDraft] = useState<Time>(() => normalizeTime(value));
  const [mode, setMode] = useState<'dial' | 'keyboard'>('dial');
  // Each opening starts from the confirmed time on the dial; a parent re-render while open keeps
  // the time being picked.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setDraft(normalizeTime(value));
      setMode('dial');
    }
  }
  const close = () => setOpen(false);
  const confirm = () => {
    setValue(draft);
    setOpen(false);
  };
  return (
    <ModalShell
      ref={ref}
      open={open}
      onOpenChange={setOpen}
      aria-label={ariaLabel ?? (mode === 'dial' ? labels.selectTime : labels.enterTime)}
      {...popupProps}
      sx={[s.popup, dialogMotion.fadeScale, sx]}
    >
      {mode === 'dial' ? (
        <TimePicker
          value={draft}
          onValueChange={setDraft}
          is24Hour={is24Hour}
          orientation={orientation}
          selection={selection}
          defaultSelection={defaultSelection}
          onSelectionChange={onSelectionChange}
          autoSwitchToMinute={autoSwitchToMinute}
          headline={headline}
          labels={labels}
          onModeToggle={() => setMode('keyboard')}
          onCancel={close}
          onConfirm={confirm}
        />
      ) : (
        <TimeInput
          value={draft}
          onValueChange={setDraft}
          is24Hour={is24Hour}
          labels={labels}
          autoFocus
          onModeToggle={() => setMode('dial')}
          onCancel={close}
          onConfirm={confirm}
        />
      )}
    </ModalShell>
  );
}
