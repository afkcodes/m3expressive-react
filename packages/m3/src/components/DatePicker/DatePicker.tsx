import {
  useLayoutEffect,
  useMemo,
  useState,
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type MouseEventHandler,
  type ReactNode,
} from 'react';
import * as stylex from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex.ts';
import { typescale } from '../../tokens/typescale.ts';
import { useControllableState } from '../../hooks/useControllableState.ts';
import { SvgIcon } from '../../primitives/SvgIcon.tsx';
import type { SxProps } from '../../primitives/types.ts';
import { useLabels, type M3Labels } from '../../theme/labels.tsx';
import { Button } from '../Button/Button.tsx';
import { IconButton } from '../IconButton/IconButton.tsx';
import { PickerMenuButton, YearChip } from './cells.tsx';
import { CalendarMonth } from './CalendarMonth.tsx';
import { MonthPager } from './MonthPager.tsx';
import { DATE_PICKER_ICONS } from './icons.ts';
import { addMonths, DEFAULT_YEAR_RANGE, defaultFormatter, makeDate, type DatePickerFormatter } from './calendar.ts';
import { useToday } from './useToday.ts';
import { useYearListTransition } from './useYearListTransition.ts';

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
 * Motion (Compose DatePicker): the dialog uses the M3 dialog fade + scale (ModalDatePicker);
 *   previous / next slide the month grids one width and a horizontal drag swipes months
 *   (./MonthPager); the year list expands over the calendar and shrinks back
 *   (./useYearListTransition). The menu button's arrow flips without animation, as in Compose.
 */
const ICONS = DATE_PICKER_ICONS;

const monthIndex = (d: Date) => d.getFullYear() * 12 + d.getMonth();

const s = stylex.create({
  surface: {
    // Cells stack with z-index: keep them inside the picker (an inline picker must not paint over popups).
    isolation: 'isolate',
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
  headerText: {
    display: 'flex',
    flexDirection: 'column',
    rowGap: 36,
    flexGrow: 1,
    minWidth: 0,
    alignSelf: 'flex-start',
  },
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
  area: { position: 'relative' },
  // The year list over the calendar while it expands / shrinks (content anchored at the bottom).
  yearsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    backgroundColor: color.surfaceContainerHigh,
  },
  years: {
    height: 280,
    flexShrink: 0,
    overflowY: 'auto',
    scrollbarWidth: 'none',
    '::-webkit-scrollbar': { display: 'none' },
  },
  yearGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    columnGap: 8,
    paddingBlock: 8,
    paddingInline: 24,
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
  },
  actionsRule: { boxShadow: `inset 0 1px 0 ${color.outlineVariant}` },
  end: { display: 'flex', columnGap: 8, marginInlineStart: 'auto' },
});

export type DatePickerView = 'day' | 'year';

/** `ref`, the native props and `sx` go to the picker's surface `<div>`. */
export interface DatePickerProps extends SxProps<Omit<ComponentPropsWithRef<'div'>, 'defaultValue' | 'placeholder'>> {
  /** The selected day (`null`: none). */
  value?: Date | null;
  /** The uncontrolled initial selection (default none). */
  defaultValue?: Date | null;
  onValueChange?: (date: Date | null) => void;
  /** The displayed month (any day in it). */
  month?: Date;
  /** The uncontrolled initial month (default: the value's month, else today's). */
  defaultMonth?: Date;
  onMonthChange?: (month: Date) => void;
  view?: DatePickerView;
  /** The uncontrolled initial view (default `'day'`). */
  defaultView?: DatePickerView;
  onViewChange?: (view: DatePickerView) => void;
  /** The day treated as today (default: the device date at mount). */
  today?: Date;
  /** Years offered in the year view (inclusive). */
  yearRange?: [number, number];
  /** 0 = Sunday (default). */
  firstDayOfWeek?: number;
  locale?: string;
  /** Overrides for the labels (month / headline / weekday / year …). */
  formatter?: Partial<DatePickerFormatter> & { year?: (year: number) => string };
  /** The header's label (default the `selectDate` label). */
  supportingText?: ReactNode;
  /** Headline when nothing is selected (default the `selectDate` label). */
  placeholder?: ReactNode;
  /** The header's mode button (switch to text input); hidden when omitted. */
  onModeToggle?: MouseEventHandler<HTMLButtonElement>;
  /** The Clear button (hidden when omitted). */
  onClear?: MouseEventHandler<HTMLButtonElement>;
  /** The Cancel button (hidden when omitted). */
  onCancel?: MouseEventHandler<HTMLButtonElement>;
  /** The OK button (hidden when omitted). */
  onConfirm?: MouseEventHandler<HTMLButtonElement>;
  /** Overrides for the built-in strings (`selectDate`, `previousMonth`, `nextMonth`, `year`, `clear`, `cancel`, `ok`…). */
  labels?: Partial<M3Labels>;
}

/** The date picker surface (the modal's content; see `ModalDatePicker`). */
export function DatePicker({
  ref,
  value: valueProp,
  defaultValue = null,
  onValueChange,
  month: monthProp,
  defaultMonth,
  onMonthChange,
  view: viewProp,
  defaultView = 'day',
  onViewChange,
  today: todayProp,
  yearRange = DEFAULT_YEAR_RANGE,
  firstDayOfWeek = 0,
  locale,
  formatter: formatterProp,
  supportingText,
  placeholder,
  onModeToggle,
  onClear,
  onCancel,
  onConfirm,
  labels: labelsProp,
  sx,
  ...rest
}: DatePickerProps) {
  const labels = useLabels(labelsProp);
  const formatter = useMemo(() => ({ ...defaultFormatter(locale), ...formatterProp }), [locale, formatterProp]);
  const today = useToday(todayProp);
  const [value, onChange] = useControllableState(valueProp, defaultValue, onValueChange);
  const [anyDayOfMonth, setMonth] = useControllableState(
    monthProp,
    () => defaultMonth ?? makeDate((value ?? today).getFullYear(), (value ?? today).getMonth(), 1),
    onMonthChange,
  );
  const [year, monthOfYear] = [anyDayOfMonth.getFullYear(), anyDayOfMonth.getMonth()];
  const month = useMemo(() => makeDate(year, monthOfYear, 1), [year, monthOfYear]);
  const [view, setView] = useControllableState<DatePickerView>(viewProp, defaultView, onViewChange);
  const { phase, area, yearsBox, years: yearsRef } = useYearListTransition(view);

  // A year pick jumps to its month (Compose scrollToItem); one-month steps slide. The jump target
  // is kept until the month changes again.
  const [jumpedTo, setJumpedTo] = useState<number | null>(null);
  if (jumpedTo !== null && jumpedTo !== monthIndex(month)) setJumpedTo(null);

  const yearLabel = formatterProp?.year ?? ((y: number) => String(y));
  const shownYear = month.getFullYear();
  useLayoutEffect(() => {
    const list = yearsRef.current;
    if (view !== 'year' || !list) return;
    const shown = list.querySelector<HTMLElement>(`[data-year="${shownYear}"]`);
    // Bring the displayed year into view (top-aligned rows, like the kit's list).
    if (shown) {
      const row = shown.closest('span')!;
      const top = row.offsetTop - 8;
      if (top + row.offsetHeight > list.clientHeight) list.scrollTop = top;
    }
  }, [view, shownYear, yearsRef]);

  // The year grid is a listbox with one tab stop (the displayed year, kept inside the range) that
  // arrows move: ±1 year, ±1 row of three; Home / End jump to the first / last year.
  const [firstYear, lastYear] = yearRange;
  const [focusYear, setFocusYear] = useState<number | null>(null);
  if (view !== 'year' && focusYear !== null) setFocusYear(null);
  const tabYear = Math.min(lastYear, Math.max(firstYear, focusYear ?? shownYear));
  const onYearKey = (e: KeyboardEvent) => {
    const steps: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3 };
    const next =
      e.key in steps ? tabYear + steps[e.key]! : e.key === 'Home' ? firstYear : e.key === 'End' ? lastYear : null;
    if (next === null) return;
    e.preventDefault();
    if (next < firstYear || next > lastYear) return;
    setFocusYear(next);
    yearsRef.current?.querySelector<HTMLElement>(`[data-year="${next}"]`)?.focus();
  };

  return (
    <div ref={ref} {...rest} {...stylex.props(s.surface, sx)}>
      <div data-dp-header="" {...stylex.props(s.header)}>
        <div {...stylex.props(s.headerText)}>
          <p {...stylex.props(typescale.labelLarge, s.supporting)}>
            {supportingText === undefined ? labels.selectDate : supportingText}
          </p>
          <p {...stylex.props(typescale.headlineLarge, s.headline)} aria-live="polite">
            {value ? formatter.selectedDate(value) : placeholder === undefined ? labels.selectDate : placeholder}
          </p>
        </div>
        {onModeToggle && (
          <IconButton aria-label={labels.switchToInput} onClick={onModeToggle}>
            <SvgIcon d={ICONS.edit} />
          </IconButton>
        )}
      </div>
      <div data-dp-body="">
        <div {...stylex.props(s.selection)}>
          <PickerMenuButton
            open={view === 'year'}
            onClick={() => setView(view === 'year' ? 'day' : 'year')}
            aria-label={labels.selectYear(formatter.monthYear(month))}
          >
            {formatter.monthYear(month)}
          </PickerMenuButton>
          {view === 'day' && (
            <div {...stylex.props(s.controls)}>
              <IconButton aria-label={labels.previousMonth} onClick={() => setMonth(addMonths(month, -1))}>
                <SvgIcon d={ICONS.prev} />
              </IconButton>
              <IconButton aria-label={labels.nextMonth} onClick={() => setMonth(addMonths(month, 1))}>
                <SvgIcon d={ICONS.next} />
              </IconButton>
            </div>
          )}
        </div>
        <div ref={area} {...stylex.props(s.area)}>
          {phase !== 'year' && (
            <MonthPager
              month={month}
              onSwipe={setMonth}
              instant={jumpedTo === monthIndex(month)}
              inert={view === 'year'}
            >
              {(m, copy) => (
                <CalendarMonth
                  month={m}
                  value={value}
                  today={today}
                  formatter={formatter}
                  firstDayOfWeek={firstDayOfWeek}
                  onPick={copy ? () => {} : onChange}
                  onNavigate={copy ? undefined : setMonth}
                  sx={s.grid}
                />
              )}
            </MonthPager>
          )}
          {phase !== 'day' && (
            <div
              ref={yearsBox}
              inert={view !== 'year' || undefined}
              {...stylex.props(phase !== 'year' && s.yearsOverlay)}
            >
              <div ref={yearsRef} {...stylex.props(s.years)}>
                <div role="listbox" aria-label={labels.year} onKeyDown={onYearKey} {...stylex.props(s.yearGrid)}>
                  {Array.from({ length: lastYear - firstYear + 1 }, (_, i) => firstYear + i).map((y) => (
                    <YearChip
                      key={y}
                      option
                      year={yearLabel(y)}
                      selected={y === shownYear}
                      data-year={y}
                      tabIndex={y === tabYear ? 0 : -1}
                      onClick={() => {
                        const picked = makeDate(y, month.getMonth(), 1);
                        setJumpedTo(monthIndex(picked));
                        setMonth(picked);
                        setView('day');
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <div data-dp-actions="" {...stylex.props(s.actions, view === 'year' && s.actionsRule)}>
        {onClear && (
          <Button variant="text" onClick={onClear}>
            {labels.clear}
          </Button>
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
    </div>
  );
}
