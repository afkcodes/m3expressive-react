import { useRef, useState, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { ModalShell } from '../../primitives/ModalShell.tsx';
import { dialogMotion } from '../../primitives/dialogMotion.ts';
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

export interface ModalDatePickerProps extends Omit<DatePickerProps, 'onCancel' | 'onConfirm' | 'value' | 'onChange'> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The confirmed date. */
  value: Date | null;
  /** Called with the picked date when OK is pressed (Cancel / Escape keep the old value). */
  onChange: (date: Date | null) => void;
}

/**
 * The modal date picker: pick a day, confirm with OK (Compose DatePickerDialog). The header's mode
 * button switches between the calendar and text input (Compose DisplayMode.Picker / Input) with
 * Compose's AnimatedContent motion (useModeTransition); the dialog fades and scales in (M3 dialog
 * motion).
 */
export function ModalDatePicker({ open, onOpenChange, value, onChange, onClear, ...picker }: ModalDatePickerProps) {
  const [draft, setDraft] = useState<Date | null>(value);
  // Calendar ⇄ text input, from the header buttons.
  const [mode, setMode] = useState<DisplayMode>('picker');
  const [leaving, setLeaving] = useState<DisplayMode | null>(null);
  // The calendar's month and view live here so the leaving copy keeps them.
  const [innerMonth, setInnerMonth] = useState<Date | undefined>(undefined);
  const [innerView, setInnerView] = useState<DatePickerView>('day');
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
      setInnerView('day');
    }
  }
  const wrap = useRef<HTMLDivElement>(null);
  useModeTransition(wrap, leaving, () => setLeaving(null));
  const switchTo = (next: DisplayMode) => {
    if (next === mode) return;
    setLeaving(mode);
    setMode(next);
  };
  const confirm = () => {
    onChange(draft);
    onOpenChange(false);
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
      open={open}
      onOpenChange={onOpenChange}
      aria-label={typeof picker.supportingText === 'string' ? picker.supportingText : 'Select date'}
      sx={[s.popup, dialogMotion.fadeScale]}
    >
      <div ref={wrap} {...stylex.props(s.wrap)}>
        {slot(
          'picker',
          <DatePicker
            month={innerMonth}
            onMonthChange={setInnerMonth}
            view={innerView}
            onViewChange={setInnerView}
            {...picker}
            value={draft}
            onChange={setDraft}
            onModeToggle={() => switchTo('input')}
            onClear={onClear ?? (() => setDraft(null))}
            onCancel={() => onOpenChange(false)}
            onConfirm={confirm}
          />,
        )}
        {slot(
          'input',
          <DateInputPanel
            value={draft}
            onChange={setDraft}
            locale={picker.locale}
            yearRange={picker.yearRange}
            formatter={picker.formatter}
            supportingText={picker.supportingText}
            autoFocus
            onModeToggle={() => switchTo('picker')}
            onCancel={() => onOpenChange(false)}
            onConfirm={confirm}
          />,
        )}
      </div>
    </ModalShell>
  );
}
