import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex';
import { typescale } from '../../tokens/typescale.ts';
import { textBox } from '../../primitives/textBox.ts';
import { CalendarDay, type CalendarDayKind } from './cells.tsx';
import { monthWeeks, sameDay, type DatePickerFormatter } from './calendar.ts';

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
  sx?: StyleXStyles;
}

const DAY = 86400000;

/** The weekday row and the weeks of one month, with roving arrow-key focus. */
export function CalendarMonth({
  month,
  value = null,
  range,
  today,
  formatter: f,
  firstDayOfWeek = 0,
  outsideDays = false,
  weekdays = true,
  onPick,
  onNavigate,
  isDisabled,
  sx,
}: CalendarMonthProps) {
  const y = month.getFullYear();
  const m = month.getMonth();
  let weeks = monthWeeks(y, m, firstDayOfWeek);
  if (outsideDays) {
    // Fill the leading / trailing blanks with the neighbouring months and pad to six weeks.
    const first = weeks[0]!.findIndex((d) => d != null);
    const start = new Date(y, m, 1 - first);
    const count = 42;
    const days = Array.from({ length: count }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
    weeks = Array.from({ length: 6 }, (_, w) => days.slice(w * 7, w * 7 + 7));
  }
  const inMonth = (d: Date) => d.getMonth() === m && d.getFullYear() === y;
  const grid = useRef<HTMLDivElement>(null);
  const [focusDay, setFocusDay] = useState<Date | null>(null);
  const inThisMonth = (d: Date | null | undefined) => !!d && inMonth(d);
  const tabDay = inThisMonth(focusDay) ? focusDay! : inThisMonth(value) ? value! : inThisMonth(today) ? today : new Date(y, m, 1);

  useLayoutEffect(() => {
    if (!focusDay || !grid.current) return;
    grid.current.querySelector<HTMLElement>(`[data-date="${focusDay.toDateString()}"]`)?.focus();
  }, [focusDay]);

  const onKey = (e: KeyboardEvent) => {
    const step: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (!(e.key in step) && e.key !== 'PageUp' && e.key !== 'PageDown' && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    const base = focusDay ?? tabDay;
    let next: Date;
    if (e.key === 'PageUp' || e.key === 'PageDown')
      next = new Date(base.getFullYear(), base.getMonth() + (e.key === 'PageUp' ? -1 : 1), Math.min(base.getDate(), 28));
    else if (e.key === 'Home') next = new Date(base.getTime() - ((base.getDay() - firstDayOfWeek + 7) % 7) * DAY);
    else if (e.key === 'End') next = new Date(base.getTime() + ((firstDayOfWeek + 6 - base.getDay() + 7) % 7) * DAY);
    else next = new Date(base.getFullYear(), base.getMonth(), base.getDate() + step[e.key]!);
    if (!inMonth(next)) onNavigate?.(new Date(next.getFullYear(), next.getMonth(), 1));
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
    <div ref={grid} role="grid" aria-label={f.monthYear(month)} onKeyDown={onKey} {...stylex.props(s.grid, sx)}>
      {weekdays && (
        <div role="row" {...stylex.props(s.week)}>
          {Array.from({ length: 7 }, (_, i) => (
            <span key={i} role="columnheader" aria-label={f.weekdayLong(firstDayOfWeek + i)} {...stylex.props(s.weekday)}>
              <span aria-hidden {...stylex.props(typescale.bodyLarge, textBox.hug)}>
                {f.weekdayNarrow(firstDayOfWeek + i)}
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
                  rangeStart={hasRange && sameDay(d, range!.start)}
                  rangeEnd={hasRange && sameDay(d, range!.end)}
                  disabled={isDisabled?.(d)}
                  aria-label={f.fullDate(d)}
                  aria-current={sameDay(d, today) ? 'date' : undefined}
                  tabIndex={sameDay(d, tabDay) ? 0 : -1}
                  data-date={d.toDateString()}
                  onClick={() => {
                    setFocusDay(d);
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
