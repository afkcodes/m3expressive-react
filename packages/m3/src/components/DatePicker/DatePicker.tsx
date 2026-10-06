import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { color } from '../../tokens/color.stylex';
import { typescale } from '../../tokens/typescale.ts';
import { usePortalContainer } from '../../theme/portal.tsx';
import { Button } from '../Button/Button.tsx';
import { IconButton } from '../IconButton/IconButton.tsx';
import { scrim } from '../Sheet/scrim.ts';
import { PickerMenuButton, YearChip } from './cells.tsx';
import { CalendarMonth } from './CalendarMonth.tsx';
import { DATE_PICKER_ICONS } from './icons.ts';
import { DateInputPanel } from './DateInput.tsx';
import { addMonths, defaultFormatter, startOfDay, type DatePickerFormatter } from './calendar.ts';

/*
 * Figma kit, "Modal date picker" (51954:18136; Compose DatePicker / DatePickerDialog).
 *   360px, Surface Container High, 28px corners. Header 120px (16px top, 24px start, 12px end /
 *   bottom; Outline Variant rule under it): label-large On Surface Variant "Select date", the
 *   headline-large On Surface date 36px below, the mode button at the bottom end. Selection row
 *   56px: the month menu button (16px in) and previous / next buttons (12px from the end).
 *   Calendar: 12px sides, weekday row + weeks of 48px cells. Actions 60px: Clear at the start,
 *   Cancel / OK at the end (12px sides, 4px top, 8px bottom). Year view: the menu button's arrow
 *   flips, years in three 8px-spaced columns (24px sides, 8px top) scroll in a 280px area, and a
 *   rule sits above the actions.
 * Motion: the dialog uses the M3 dialog fade + scale (Dialog); views swap without animation
 *   (Compose cross-fades on a 0ms-tween in the year list).
 */
const ICONS = DATE_PICKER_ICONS;

const Glyph = ({ d }: { d: string }) => (
  <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor" aria-hidden style={{ display: 'block' }}>
    <path d={d} />
  </svg>
);

const s = stylex.create({
  surface: {
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    width: 360,
    overflow: 'hidden',
    color: color.onSurface,
    backgroundColor: color.surfaceContainerHigh,
    borderRadius: 28,
  },
  header: {
    display: 'flex',
    alignItems: 'flex-end',
    columnGap: 8,
    flexShrink: 0,
    height: 120,
    boxSizing: 'border-box',
    paddingBlock: '16px 12px',
    paddingInline: '24px 12px',
    // Figma strokes don't take layout space: the rule is an inset shadow.
    boxShadow: `inset 0 -1px 0 ${color.outlineVariant}`,
  },
  headerText: { display: 'flex', flexDirection: 'column', rowGap: 36, flexGrow: 1, minWidth: 0, alignSelf: 'flex-start' },
  // The kit's label box is 16px tall with a 20px line: the text overflows it downwards.
  supporting: { height: 16, margin: 0, color: color.onSurfaceVariant },
  headline: { margin: 0, color: color.onSurface, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  selection: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
    height: 56,
    boxSizing: 'border-box',
    paddingInline: '16px 12px',
  },
  controls: { display: 'flex' },
  grid: { display: 'flex', flexDirection: 'column', flexShrink: 0, paddingInline: 12 },
  years: { height: 280, flexShrink: 0, overflowY: 'auto', scrollbarWidth: 'none', '::-webkit-scrollbar': { display: 'none' } },
  yearGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', columnGap: 8, paddingBlock: 8, paddingInline: 24 },
  actions: {
    display: 'flex',
    alignItems: 'center',
    columnGap: 8,
    flexShrink: 0,
    height: 60,
    boxSizing: 'border-box',
    paddingBlock: '4px 8px',
    paddingInline: 12,
  },
  actionsRule: { boxShadow: `inset 0 1px 0 ${color.outlineVariant}` },
  end: { display: 'flex', columnGap: 8, marginInlineStart: 'auto' },
  popup: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    translate: '-50% -50%',
    outlineStyle: 'none',
    opacity: { default: 1, ':is([data-starting-style], [data-ending-style])': 0 },
    scale: { default: '1', ':is([data-starting-style])': '0.8' },
    transitionProperty: 'opacity, scale',
    transitionDuration: { default: '400ms', ':is([data-ending-style])': '150ms', '@media (prefers-reduced-motion: reduce)': '0ms' },
    transitionTimingFunction: { default: 'cubic-bezier(0.05, 0.7, 0.1, 1)', ':is([data-ending-style])': 'cubic-bezier(0.3, 0, 0.8, 0.15)' },
  },
});

export type DatePickerView = 'day' | 'year';

export interface DatePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  /** The displayed month (any day in it). Uncontrolled from `value` / today when omitted. */
  month?: Date;
  onMonthChange?: (month: Date) => void;
  view?: DatePickerView;
  onViewChange?: (view: DatePickerView) => void;
  today?: Date;
  /** Years offered in the year view (inclusive). */
  yearRange?: [number, number];
  /** 0 = Sunday (default). */
  firstDayOfWeek?: number;
  locale?: string;
  /** Overrides for the labels (month / headline / weekday / year …). */
  formatter?: Partial<DatePickerFormatter> & { year?: (year: number) => string };
  supportingText?: ReactNode;
  /** Headline when nothing is selected. */
  placeholder?: ReactNode;
  /** The header's mode button (switch to text input); hidden when omitted. */
  onModeToggle?: () => void;
  onClear?: () => void;
  onCancel?: () => void;
  onConfirm?: () => void;
  labels?: { clear?: string; cancel?: string; confirm?: string; previous?: string; next?: string; mode?: string };
  sx?: StyleXStyles;
}

/** The date picker surface (the modal's content; see `ModalDatePicker`). */
export function DatePicker({
  value,
  onChange,
  month: monthProp,
  onMonthChange,
  view: viewProp,
  onViewChange,
  today: todayProp,
  yearRange = [1900, 2100],
  firstDayOfWeek = 0,
  locale,
  formatter: fmt,
  supportingText = 'Select date',
  placeholder = 'Select date',
  onModeToggle,
  onClear,
  onCancel,
  onConfirm,
  labels = {},
  sx,
}: DatePickerProps) {
  const f = useMemo(() => ({ ...defaultFormatter(locale), ...fmt }), [locale, fmt]);
  const today = useMemo(() => startOfDay(todayProp ?? new Date()), [todayProp]);
  const [innerMonth, setInnerMonth] = useState(() => new Date((value ?? today).getFullYear(), (value ?? today).getMonth(), 1));
  const month = monthProp ? new Date(monthProp.getFullYear(), monthProp.getMonth(), 1) : innerMonth;
  const setMonth = (m: Date) => {
    if (!monthProp) setInnerMonth(m);
    onMonthChange?.(m);
  };
  const [innerView, setInnerView] = useState<DatePickerView>('day');
  const view = viewProp ?? innerView;
  const setView = (v: DatePickerView) => {
    if (!viewProp) setInnerView(v);
    onViewChange?.(v);
  };

  const yearLabel = fmt?.year ?? ((y: number) => String(y));
  const yearsRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (view !== 'year' || !yearsRef.current) return;
    const sel = yearsRef.current.querySelector<HTMLElement>(`[data-year="${month.getFullYear()}"]`);
    // Bring the displayed year into view (top-aligned rows, like the kit's list).
    if (sel) {
      const row = sel.closest('span')!;
      const top = row.offsetTop - 8;
      if (top + row.offsetHeight > yearsRef.current.clientHeight) yearsRef.current.scrollTop = top;
    }
  }, [view, month]);

  return (
    <div {...stylex.props(s.surface, sx)}>
      <div {...stylex.props(s.header)}>
        <div {...stylex.props(s.headerText)}>
          <p {...stylex.props(typescale.labelLarge, s.supporting)}>{supportingText}</p>
          <p {...stylex.props(typescale.headlineLarge, s.headline)} aria-live="polite">
            {value ? f.selectedDate(value) : placeholder}
          </p>
        </div>
        {onModeToggle && (
          <IconButton aria-label={labels.mode ?? 'Switch to text input'} onClick={onModeToggle}>
            <Glyph d={ICONS.edit} />
          </IconButton>
        )}
      </div>
      <div {...stylex.props(s.selection)}>
        <PickerMenuButton
          open={view === 'year'}
          onClick={() => setView(view === 'year' ? 'day' : 'year')}
          aria-label={`${f.monthYear(month)}, select year`}
        >
          {f.monthYear(month)}
        </PickerMenuButton>
        {view === 'day' && (
          <div {...stylex.props(s.controls)}>
            <IconButton aria-label={labels.previous ?? 'Previous month'} onClick={() => setMonth(addMonths(month, -1))}>
              <Glyph d={ICONS.prev} />
            </IconButton>
            <IconButton aria-label={labels.next ?? 'Next month'} onClick={() => setMonth(addMonths(month, 1))}>
              <Glyph d={ICONS.next} />
            </IconButton>
          </div>
        )}
      </div>
      {view === 'day' ? (
        <CalendarMonth
          month={month}
          value={value}
          today={today}
          formatter={f}
          firstDayOfWeek={firstDayOfWeek}
          onPick={onChange}
          onNavigate={setMonth}
          sx={s.grid}
        />
      ) : (
        <div ref={yearsRef} {...stylex.props(s.years)}>
          <div role="listbox" aria-label="Year" {...stylex.props(s.yearGrid)}>
            {Array.from({ length: yearRange[1] - yearRange[0] + 1 }, (_, i) => yearRange[0] + i).map((y) => (
              <YearChip
                key={y}
                year={yearLabel(y)}
                selected={y === month.getFullYear()}
                data-year={y}
                tabIndex={y === month.getFullYear() ? 0 : -1}
                onClick={() => {
                  setMonth(new Date(y, month.getMonth(), 1));
                  setView('day');
                }}
              />
            ))}
          </div>
        </div>
      )}
      <div {...stylex.props(s.actions, view === 'year' && s.actionsRule)}>
        {onClear && (
          <Button variant="text" onClick={onClear}>
            {labels.clear ?? 'Clear'}
          </Button>
        )}
        <span {...stylex.props(s.end)}>
          {onCancel && (
            <Button variant="text" onClick={onCancel}>
              {labels.cancel ?? 'Cancel'}
            </Button>
          )}
          {onConfirm && (
            <Button variant="text" onClick={onConfirm}>
              {labels.confirm ?? 'OK'}
            </Button>
          )}
        </span>
      </div>
    </div>
  );
}

export interface ModalDatePickerProps extends Omit<DatePickerProps, 'onCancel' | 'onConfirm' | 'value' | 'onChange'> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The confirmed date. */
  value: Date | null;
  /** Called with the picked date when OK is pressed (Cancel / Escape keep the old value). */
  onChange: (date: Date | null) => void;
}

/** The modal date picker: pick a day, confirm with OK (Compose DatePickerDialog). */
export function ModalDatePicker({ open, onOpenChange, value, onChange, onClear, ...picker }: ModalDatePickerProps) {
  const portal = usePortalContainer();
  const [draft, setDraft] = useState<Date | null>(value);
  // Calendar ⇄ text input (Compose DisplayMode.Picker / Input), from the header buttons.
  const [mode, setMode] = useState<'picker' | 'input'>('picker');
  useLayoutEffect(() => {
    if (open) {
      setDraft(value);
      setMode('picker');
    }
  }, [open, value]);
  const confirm = () => {
    onChange(draft);
    onOpenChange(false);
  };
  return (
    <BaseDialog.Root open={open} onOpenChange={(next) => onOpenChange(next)}>
      <BaseDialog.Portal container={portal}>
        <BaseDialog.Backdrop {...stylex.props(scrim.backdrop)} />
        <BaseDialog.Popup
          aria-label={typeof picker.supportingText === 'string' ? picker.supportingText : 'Select date'}
          {...stylex.props(s.popup)}
        >
          {mode === 'picker' ? (
            <DatePicker
              {...picker}
              value={draft}
              onChange={setDraft}
              onModeToggle={() => setMode('input')}
              onClear={onClear ?? (() => setDraft(null))}
              onCancel={() => onOpenChange(false)}
              onConfirm={confirm}
            />
          ) : (
            <DateInputPanel
              value={draft}
              onChange={setDraft}
              locale={picker.locale}
              formatter={picker.formatter}
              supportingText={picker.supportingText}
              autoFocus
              onModeToggle={() => setMode('picker')}
              onCancel={() => onOpenChange(false)}
              onConfirm={confirm}
            />
          )}
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
