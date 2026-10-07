import { memo, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex.ts';
import { typescale } from '../../tokens/typescale.ts';
import { textBox } from '../../primitives/textBox.ts';
import { CalendarDay, type CalendarDayKind } from './cells.tsx';
import {
  addDays,
  dayForKey,
  daysInMonth,
  firstEnabled,
  makeDate,
  monthWeeks,
  sameDay,
  type DatePickerFormatter,
} from './calendar.ts';

const s = stylex.create({
  grid: { display: 'flex', flexDirection: 'column', flexShrink: 0 },
  week: { display: 'flex' },
  weekday: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
    flexShrink: 0,
    margin: 0,
    color: color.onSurface,
  },
});

export interface CalendarMonthProps {
  /** Any day in the month. */
  month: Date;
  value?: Date | null;
  /** A selected range (start…end); days between take the range band. */
  range?: { start: Date | null; end: Date | null };
  today: Date;
  formatter: DatePickerFormatter;
  firstDayOfWeek?: number;
  /** Show the neighbouring months' days (On Surface 38%) and always six weeks (the docked picker). */
  outsideDays?: boolean;
  /** Draw the weekday headings (the full-screen range picker draws them once, above all months). */
  weekdays?: boolean;
  onPick: (day: Date) => void;
  /** Keyboard navigation crossed into another month. */
  onNavigate?: (month: Date) => void;
  isDisabled?: (day: Date) => boolean;
  /**
   * Shared roving focus (one tab stop across several months, as in the range picker): the day
   * holding the tab stop, when it is in this month. With `onActiveDayChange` the month keeps no
   * focus of its own — clicks and calendar keys report the next day there and the owner moves focus.
   */
  activeDay?: Date | null;
  onActiveDayChange?: (day: Date) => void;
  sx?: StyleXStyles;
}

const KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown']);

/** The weekday row and the weeks of one month, with roving arrow-key focus. */
function CalendarMonthGrid({
  month,
  value = null,
  range,
  today,
  formatter,
  firstDayOfWeek = 0,
  outsideDays = false,
  weekdays = true,
  onPick,
  onNavigate,
  isDisabled,
  activeDay,
  onActiveDayChange,
  sx,
}: CalendarMonthProps) {
  const year = month.getFullYear();
  const monthOfYear = month.getMonth();
  let weeks = monthWeeks(year, monthOfYear, firstDayOfWeek);
  if (outsideDays) {
    // Fill the leading / trailing blanks with the neighbouring months and pad to six weeks.
    const first = weeks[0]!.findIndex((d) => d != null);
    const start = makeDate(year, monthOfYear, 1 - first);
    weeks = Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, i) => addDays(start, w * 7 + i)));
  }
  const inMonth = (d: Date) => d.getMonth() === monthOfYear && d.getFullYear() === year;
  const grid = useRef<HTMLDivElement>(null);
  const controlled = !!onActiveDayChange;
  const [focusDay, setFocusDay] = useState<Date | null>(null);
  // The tab stop: a day of this month that can take focus (a disabled day can't).
  const usable = (d: Date | null | undefined): d is Date => !!d && inMonth(d) && !isDisabled?.(d);
  const firstUsable = () => {
    const d = firstEnabled(makeDate(year, monthOfYear, 1), 1, isDisabled, daysInMonth(year, monthOfYear) - 1);
    return d && inMonth(d) ? d : null;
  };
  const tabDay = controlled
    ? usable(activeDay)
      ? activeDay
      : null
    : usable(focusDay)
      ? focusDay
      : usable(value)
        ? value
        : usable(today)
          ? today
          : firstUsable();

  useLayoutEffect(() => {
    if (!focusDay || !grid.current) return;
    grid.current.querySelector<HTMLElement>(`[data-date="${focusDay.toDateString()}"]`)?.focus();
  }, [focusDay]);

  const onKey = (e: KeyboardEvent) => {
    if (!KEYS.has(e.key)) return;
    e.preventDefault();
    // From the focused day (a clicked outside day, or the tab stop after a month change).
    const attr = (e.target as HTMLElement).closest('[data-date]')?.getAttribute('data-date');
    const focused = attr ? weeks.flat().find((d) => d?.toDateString() === attr) : null;
    const base = focused ?? (controlled ? activeDay : null) ?? tabDay;
    const next = base && dayForKey(base, e.key, firstDayOfWeek, isDisabled);
    if (!base || !next || sameDay(next, base)) return;
    if (controlled) {
      onActiveDayChange(next);
      return;
    }
    if (!inMonth(next)) onNavigate?.(makeDate(next.getFullYear(), next.getMonth(), 1));
    setFocusDay(next);
  };

  const between = (d: Date) => !!range?.start && !!range?.end && d > range.start && d < range.end;
  const kindOf = (d: Date): CalendarDayKind => {
    if (!inMonth(d)) return 'outside';
    if (sameDay(d, value) || sameDay(d, range?.start) || sameDay(d, range?.end)) return 'selected';
    if (between(d)) return 'range';
    return sameDay(d, today) ? 'today' : 'default';
  };
  const hasRange = !!range?.start && !!range?.end;

  return (
    <div ref={grid} role="grid" aria-label={formatter.monthYear(month)} onKeyDown={onKey} {...stylex.props(s.grid, sx)}>
      {weekdays && (
        <div role="row" {...stylex.props(s.week)}>
          {Array.from({ length: 7 }, (_, i) => (
            <span
              key={i}
              role="columnheader"
              aria-label={formatter.weekdayLong(firstDayOfWeek + i)}
              {...stylex.props(s.weekday)}
            >
              {/* The letter stays in the tree (a header with no exposed text is "empty"); the label names it. */}
              <span {...stylex.props(typescale.bodyLarge, textBox.hug)}>
                {formatter.weekdayNarrow(firstDayOfWeek + i)}
              </span>
            </span>
          ))}
        </div>
      )}
      {weeks.map((week, wi) => (
        <div key={wi} role="row" {...stylex.props(s.week)}>
          {week.map((d, di) =>
            d ? (
              <span key={di} role="gridcell" aria-selected={kindOf(d) === 'selected'}>
                <CalendarDay
                  label={d.getDate()}
                  kind={kindOf(d)}
                  rangeStart={hasRange && sameDay(d, range.start)}
                  rangeEnd={hasRange && sameDay(d, range.end)}
                  disabled={isDisabled?.(d)}
                  aria-label={formatter.fullDate(d)}
                  aria-current={sameDay(d, today) ? 'date' : undefined}
                  tabIndex={sameDay(d, tabDay) ? 0 : -1}
                  data-date={d.toDateString()}
                  onClick={() => {
                    if (controlled) onActiveDayChange(d);
                    else setFocusDay(d);
                    onPick(d);
                  }}
                />
              </span>
            ) : (
              <span key={di} role="gridcell">
                <CalendarDay kind="empty" />
              </span>
            ),
          )}
        </div>
      ))}
    </div>
  );
}

const sameTime = (a: Date | null | undefined, b: Date | null | undefined) =>
  a === b || (!!a && !!b && a.getTime() === b.getTime());

/** Props compare by value: dates by time, the month by year / month, everything else by identity. */
function sameProps(a: CalendarMonthProps, b: CalendarMonthProps): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)] as (keyof CalendarMonthProps)[]);
  for (const k of keys) {
    if (k === 'month') {
      if (a.month.getFullYear() !== b.month.getFullYear() || a.month.getMonth() !== b.month.getMonth()) return false;
    } else if (k === 'value' || k === 'today' || k === 'activeDay') {
      if (!sameTime(a[k], b[k])) return false;
    } else if (k === 'range') {
      if (!sameTime(a.range?.start, b.range?.start) || !sameTime(a.range?.end, b.range?.end)) return false;
    } else if (a[k] !== b[k]) return false;
  }
  return true;
}

/**
 * The weekday row and the weeks of one month, with roving arrow-key focus. Memoised on its
 * props' values (a new Date for the same day doesn't re-render the month's cells).
 */
export const CalendarMonth = memo(CalendarMonthGrid, sameProps);
