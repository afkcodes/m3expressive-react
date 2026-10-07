import { useRef, useState, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { useControllableState } from '../../hooks/useControllableState.ts';
import { ModalShell, type ModalOpenChangeDetails } from '../../primitives/ModalShell.tsx';
import { dialogMotion } from '../../primitives/dialogMotion.ts';
import { useLabels } from '../../theme/labels.tsx';
import { DatePicker, type DatePickerProps, type DatePickerView } from './DatePicker.tsx';
import { DateInputPanel } from './DateInput.tsx';
import { useModeTransition } from './useModeTransition.ts';

const s = stylex.create({
  popup: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    translate: '-50% -50%',
    outlineStyle: 'none',
  },
  /** A mode-switch slot: the leaving panel sits over the entering one until the motion ends. */
  wrap: { position: 'relative' },
  leaving: { position: 'absolute', top: 0, left: 0, pointerEvents: 'none' },
});

type DisplayMode = 'picker' | 'input';

/**
 * `ref`, the native props and `sx` go to the dialog popup (docs/API-CONVENTIONS.md §1); the
 * picker options go to the calendar / text input inside.
 */
export interface ModalDatePickerProps extends Omit<
  DatePickerProps,
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
  /** The confirmed date: changes when OK is pressed (Cancel / Escape keep it). */
  value?: Date | null;
  defaultValue?: Date | null;
  onValueChange?: (date: Date | null) => void;
}

/**
 * The modal date picker: pick a day, confirm with OK (Compose DatePickerDialog). The header's mode
 * button switches between the calendar and text input (Compose DisplayMode.Picker / Input) with
 * Compose's AnimatedContent motion (useModeTransition); the dialog fades and scales in (M3 dialog
 * motion).
 */
export function ModalDatePicker({
  ref,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  value: valueProp,
  defaultValue = null,
  onValueChange,
  month,
  defaultMonth,
  onMonthChange,
  view,
  defaultView = 'day',
  onViewChange,
  today,
  yearRange,
  firstDayOfWeek,
  locale,
  formatter,
  supportingText,
  placeholder,
  onClear,
  labels: labelsProp,
  sx,
  'aria-label': ariaLabel,
  ...popupProps
}: ModalDatePickerProps) {
  const labels = useLabels(labelsProp);
  const [open, setOpen] = useControllableState<boolean, [ModalOpenChangeDetails?]>(openProp, defaultOpen, onOpenChange);
  const [value, setValue] = useControllableState(valueProp, defaultValue, onValueChange);
  const [draft, setDraft] = useState<Date | null>(value);
  // Calendar ⇄ text input, from the header buttons.
  const [mode, setMode] = useState<DisplayMode>('picker');
  const [leaving, setLeaving] = useState<DisplayMode | null>(null);
  // The calendar's month and view live here so the leaving copy (and a return to the calendar)
  // keeps them; `month` / `view` props take over when controlled.
  const [innerMonth, setInnerMonth] = useState<Date | undefined>(undefined);
  const [innerView, setInnerView] = useState<DatePickerView>(defaultView);
  // Each opening starts from the confirmed value on the calendar; a parent re-render while open
  // (a new `value` object) keeps the pick in progress.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setDraft(value);
      setMode('picker');
      setLeaving(null);
      setInnerMonth(undefined);
      setInnerView(defaultView);
    }
  }
  const wrap = useRef<HTMLDivElement>(null);
  useModeTransition(wrap, leaving, () => setLeaving(null));
  const switchTo = (next: DisplayMode) => {
    if (next === mode) return;
    setLeaving(mode);
    setMode(next);
  };
  const close = () => setOpen(false);
  const confirm = () => {
    setValue(draft);
    setOpen(false);
  };
  const shows = (m: DisplayMode) => mode === m || leaving === m;
  const slot = (m: DisplayMode, panel: ReactNode) =>
    shows(m) && (
      <div key={m} data-mode-slot={m} inert={leaving === m || undefined} {...stylex.props(leaving === m && s.leaving)}>
        {panel}
      </div>
    );
  return (
    <ModalShell
      ref={ref}
      open={open}
      onOpenChange={setOpen}
      aria-label={ariaLabel ?? (typeof supportingText === 'string' ? supportingText : labels.selectDate)}
      {...popupProps}
      sx={[s.popup, dialogMotion.fadeScale, sx]}
    >
      <div ref={wrap} {...stylex.props(s.wrap)}>
        {slot(
          'picker',
          <DatePicker
            month={month !== undefined ? month : innerMonth}
            defaultMonth={defaultMonth}
            onMonthChange={(m) => {
              setInnerMonth(m);
              onMonthChange?.(m);
            }}
            view={view !== undefined ? view : innerView}
            onViewChange={(v) => {
              setInnerView(v);
              onViewChange?.(v);
            }}
            today={today}
            yearRange={yearRange}
            firstDayOfWeek={firstDayOfWeek}
            locale={locale}
            formatter={formatter}
            supportingText={supportingText}
            placeholder={placeholder}
            labels={labels}
            value={draft}
            onValueChange={setDraft}
            onModeToggle={() => switchTo('input')}
            onClear={onClear ?? (() => setDraft(null))}
            onCancel={close}
            onConfirm={confirm}
          />,
        )}
        {slot(
          'input',
          <DateInputPanel
            defaultValue={draft}
            onValueChange={setDraft}
            locale={locale}
            yearRange={yearRange}
            formatter={formatter}
            supportingText={supportingText}
            labels={labels}
            autoFocus
            onModeToggle={() => switchTo('picker')}
            onCancel={close}
            onConfirm={confirm}
          />,
        )}
      </div>
    </ModalShell>
  );
}
