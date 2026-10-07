import { useCallback, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex.ts';
import { typescale } from '../../tokens/typescale.ts';
import { textBox } from '../../primitives/textBox.ts';
import { ModalShell } from '../../primitives/ModalShell.tsx';
import { ICON_PATHS, SvgIcon } from '../../primitives/SvgIcon.tsx';
import { Button } from '../Button/Button.tsx';
import { IconButton } from '../IconButton/IconButton.tsx';
import { dialogMotion } from '../../primitives/dialogMotion.ts';
import { CalendarMonth } from './CalendarMonth.tsx';
import { DATE_PICKER_ICONS } from './icons.ts';
import { dateFormat, defaultFormatter, makeDate, type DatePickerFormatter } from './calendar.ts';
import { useToday } from './useToday.ts';

/*
 * Figma kit, "Modal date picker / Full-screen (range)" (51954:18254; Compose DateRangePicker).
 *   Full screen, Surface Container High. Header 132px (Outline Variant rule): a 48px bar 12px
 *   down (close at the start, Save 12px from the end), then — 64px in — label-large "Depart –
 *   Return dates" over the title-large range, the edit button at the end (12px below). Weekday
 *   row 48px (12px sides), then the months scroll: each a 48px heading (label-large On Surface
 *   Variant, 24px in, 16px down) over its weeks; the range draws Secondary Container bands
 *   between the Primary start / end days. Actions 60px under an Outline Variant rule.
 */
const s = stylex.create({
  surface: {
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    width: '100%',
    height: '100%',
    color: color.onSurface,
    backgroundColor: color.surfaceContainerHigh,
  },
  header: {
    flexShrink: 0,
    height: 132,
    boxSizing: 'border-box',
    paddingTop: 12,
    boxShadow: `inset 0 -1px 0 ${color.outlineVariant}`,
  },
  bar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 48, paddingInlineEnd: 12 },
  title: {
    display: 'flex',
    alignItems: 'flex-end',
    columnGap: 8,
    height: 72,
    boxSizing: 'border-box',
    paddingInline: '64px 12px',
    paddingBottom: 12,
  },
  titleText: {
    display: 'flex',
    flexDirection: 'column',
    rowGap: 8,
    flexGrow: 1,
    minWidth: 0,
    alignSelf: 'flex-start',
    paddingBottom: 4,
  },
  label: { margin: 0, color: color.onSurfaceVariant },
  range: { margin: 0, color: color.onSurface, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  weekdays: { display: 'flex', flexShrink: 0, paddingInline: 12 },
  weekday: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
    flexShrink: 0,
    color: color.onSurface,
  },
  // Positioned, so months' offsetTop is measured from the list.
  months: {
    position: 'relative',
    flexGrow: 1,
    minHeight: 0,
    overflowY: 'auto',
    overflowX: 'hidden',
    paddingInline: 12,
    scrollbarWidth: 'none',
    '::-webkit-scrollbar': { display: 'none' },
  },
  monthTitle: {
    margin: 0,
    height: 48,
    boxSizing: 'border-box',
    paddingBlock: '16px 12px',
    paddingInline: 24,
    color: color.onSurfaceVariant,
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    columnGap: 8,
    flexShrink: 0,
    height: 60,
    boxSizing: 'border-box',
    paddingBlock: '4px 8px',
    paddingInline: 12,
    boxShadow: `inset 0 1px 0 ${color.outlineVariant}`,
  },
  end: { display: 'flex', columnGap: 8, marginInlineStart: 'auto' },
  popup: {
    position: 'fixed',
    inset: 0,
    outlineStyle: 'none',
  },
});

export interface DateRange {
  start: Date | null;
  end: Date | null;
}

export interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  /** The first month listed. Defaults to the start's month (or today's) when the picker mounts. */
  firstMonth?: Date;
  /** How many months to list (default 12). */
  monthCount?: number;
  today?: Date;
  firstDayOfWeek?: number;
  locale?: string;
  formatter?: Partial<DatePickerFormatter> & { range?: (r: DateRange) => string };
  supportingText?: ReactNode;
  placeholder?: ReactNode;
  onClose?: () => void;
  onSave?: () => void;
  onModeToggle?: () => void;
  onClear?: () => void;
  onCancel?: () => void;
  onConfirm?: () => void;
  labels?: { save?: string; close?: string; clear?: string; cancel?: string; confirm?: string; mode?: string };
  sx?: StyleXStyles;
}

/** The full-screen range picker: tap a start day, then an end day. */
export function DateRangePicker({
  value,
  onChange,
  firstMonth,
  monthCount = 12,
  today: todayProp,
  firstDayOfWeek = 0,
  locale,
  formatter: formatterProp,
  supportingText = 'Select dates',
  placeholder = 'Start date – End date',
  onClose,
  onSave,
  onModeToggle,
  onClear,
  onCancel,
  onConfirm,
  labels = {},
  sx,
}: DateRangePickerProps) {
  const formatter = useMemo(() => ({ ...defaultFormatter(locale), ...formatterProp }), [locale, formatterProp]);
  const today = useToday(todayProp);
  const short = dateFormat(locale, { month: 'short', day: 'numeric' });
  const rangeText =
    formatterProp?.range ??
    ((range: DateRange) =>
      range.start ? `${short.format(range.start)} – ${range.end ? short.format(range.end) : ''}` : '');
  // The list keeps its first month while days are picked (a new start doesn't shift the months).
  const [mountBase] = useState(() => value.start ?? today);
  const base = firstMonth ?? mountBase;
  const [baseYear, baseMonth] = [base.getFullYear(), base.getMonth()];
  const months = useMemo(
    () => Array.from({ length: monthCount }, (_, i) => makeDate(baseYear, baseMonth + i, 1)),
    [baseYear, baseMonth, monthCount],
  );
  const scroller = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  useLayoutEffect(() => {
    // Open on the start's month when it isn't the first listed.
    if (scrolled || !scroller.current || !value.start) return;
    const el = scroller.current.querySelector<HTMLElement>(
      `[data-month="${value.start.getFullYear()}-${value.start.getMonth()}"]`,
    );
    if (el && el.offsetTop > 0) scroller.current.scrollTop = el.offsetTop;
    setScrolled(true);
  }, [scrolled, value.start]);

  // Stable callbacks, so a pick re-renders only the months the range touches (CalendarMonth is memoised).
  const latest = useRef({ value, onChange });
  useLayoutEffect(() => {
    latest.current = { value, onChange };
  });
  const pick = useCallback((d: Date) => {
    const { value: v, onChange: change } = latest.current;
    if (!v.start || v.end || d < v.start) change({ start: d, end: null });
    else change({ start: v.start, end: d });
  }, []);

  // One tab stop for all the months: arrows / Home / End / PageUp / PageDown move it across month
  // boundaries (focus scrolls the day into view); it starts on the start day, today or the first day.
  const listEnd = makeDate(baseYear, baseMonth + monthCount, 1);
  const listed = (d: Date | null | undefined): d is Date => !!d && !!months[0] && d >= months[0] && d < listEnd;
  const [active, setActive] = useState<Date | null>(null);
  const tabDay = listed(active)
    ? active
    : listed(value.start)
      ? value.start
      : listed(today)
        ? today
        : (months[0] ?? null);
  const moveTo = useCallback((d: Date) => {
    const el = scroller.current?.querySelector<HTMLElement>(`[data-date="${d.toDateString()}"]`);
    if (!el) return; // past the listed months
    setActive(d);
    el.focus();
  }, []);
  const sameMonth = (a: Date | null, m: Date) =>
    !!a && a.getFullYear() === m.getFullYear() && a.getMonth() === m.getMonth();
  // The range only for the months it touches (the others keep their props and skip rendering).
  const rangeIn = (m: Date) => {
    const { start, end } = value;
    return start && start < makeDate(m.getFullYear(), m.getMonth() + 1, 1) && (end ?? start) >= m ? value : undefined;
  };

  return (
    <div {...stylex.props(s.surface, sx)}>
      <div {...stylex.props(s.header)}>
        <div {...stylex.props(s.bar)}>
          {onClose ? (
            <IconButton aria-label={labels.close ?? 'Close'} onClick={onClose}>
              <SvgIcon d={ICON_PATHS.close} />
            </IconButton>
          ) : (
            <span />
          )}
          {onSave && (
            <Button variant="text" onClick={onSave}>
              {labels.save ?? 'Save'}
            </Button>
          )}
        </div>
        <div {...stylex.props(s.title)}>
          <div {...stylex.props(s.titleText)}>
            <p {...stylex.props(typescale.labelLarge, s.label)}>{supportingText}</p>
            <p {...stylex.props(typescale.titleLarge, s.range)} aria-live="polite">
              {value.start ? rangeText(value) : placeholder}
            </p>
          </div>
          {onModeToggle && (
            <IconButton aria-label={labels.mode ?? 'Switch to text input'} onClick={onModeToggle}>
              <SvgIcon d={DATE_PICKER_ICONS.edit} />
            </IconButton>
          )}
        </div>
      </div>
      <div aria-hidden {...stylex.props(s.weekdays)}>
        {Array.from({ length: 7 }, (_, i) => (
          <span key={i} {...stylex.props(s.weekday)}>
            <span {...stylex.props(typescale.bodyLarge, textBox.hug)}>
              {formatter.weekdayNarrow(firstDayOfWeek + i)}
            </span>
          </span>
        ))}
      </div>
      <div ref={scroller} {...stylex.props(s.months)}>
        {months.map((m) => (
          <section key={m.getTime()} data-month={`${m.getFullYear()}-${m.getMonth()}`}>
            <h3 {...stylex.props(typescale.labelLarge, s.monthTitle)}>{formatter.monthYear(m)}</h3>
            <CalendarMonth
              month={m}
              range={rangeIn(m)}
              today={today}
              formatter={formatter}
              firstDayOfWeek={firstDayOfWeek}
              weekdays={false}
              onPick={pick}
              activeDay={sameMonth(tabDay, m) ? tabDay : null}
              onActiveDayChange={moveTo}
            />
          </section>
        ))}
      </div>
      {(onClear || onCancel || onConfirm) && (
        <div {...stylex.props(s.actions)}>
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
      )}
    </div>
  );
}

export interface ModalDateRangePickerProps extends Omit<
  DateRangePickerProps,
  'onClose' | 'onSave' | 'onCancel' | 'onConfirm' | 'value' | 'onChange'
> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: DateRange;
  onChange: (range: DateRange) => void;
}

/** The full-screen range picker in a dialog; Save / OK commit, close / Cancel / Escape discard. */
export function ModalDateRangePicker({
  open,
  onOpenChange,
  value,
  onChange,
  onClear,
  ...picker
}: ModalDateRangePickerProps) {
  const [draft, setDraft] = useState<DateRange>(value);
  // Each opening starts from the committed range; a parent re-render while open keeps the picks.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setDraft(value);
  }
  const commit = () => {
    onChange(draft);
    onOpenChange(false);
  };
  return (
    // Full screen: the surface covers the page, no scrim.
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      scrim={false}
      aria-label={typeof picker.supportingText === 'string' ? picker.supportingText : 'Select dates'}
      sx={[s.popup, dialogMotion.fadeRise]}
    >
      <DateRangePicker
        {...picker}
        value={draft}
        onChange={setDraft}
        onClose={() => onOpenChange(false)}
        onSave={commit}
        onClear={onClear ?? (() => setDraft({ start: null, end: null }))}
        onCancel={() => onOpenChange(false)}
        onConfirm={commit}
      />
    </ModalShell>
  );
}
