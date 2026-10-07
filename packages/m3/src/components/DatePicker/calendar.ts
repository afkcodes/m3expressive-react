/** Date helpers for the date pickers (local calendar dates; no time-of-day). */

export const sameDay = (a: Date | null | undefined, b: Date | null | undefined) =>
  !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);

export const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

/** Weeks of the month (7 cells each, null outside the month), starting on `firstDayOfWeek` (0 = Sunday). */
export function monthWeeks(year: number, month: number, firstDayOfWeek = 0): (Date | null)[][] {
  const lead = (new Date(year, month, 1).getDay() - firstDayOfWeek + 7) % 7;
  const total = daysInMonth(year, month);
  const cells: (Date | null)[] = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: total }, (_, i) => new Date(year, month, i + 1)),
  ];
  while (cells.length % 7) cells.push(null);
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export interface DatePickerFormatter {
  /** "August 2025" — the menu button and month headings. */
  monthYear: (d: Date) => string;
  /** "Mon, Aug 17" — the selected date headline. */
  selectedDate: (d: Date) => string;
  /** "S", "M", … — weekday column headings, starting on the first day of the week. */
  weekdayNarrow: (dayIndex: number) => string;
  /** Accessible weekday name. */
  weekdayLong: (dayIndex: number) => string;
  /** "August 17, 2025" — a day's accessible name. */
  fullDate: (d: Date) => string;
  /** "8/17/2025" — the text-field representation. */
  input: (d: Date) => string;
}

const sunday = new Date(2023, 0, 1); // a Sunday

export function defaultFormatter(locale?: string): DatePickerFormatter {
  const day = (i: number) => new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + i);
  const monthYear = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' });
  const selected = new Intl.DateTimeFormat(locale, { weekday: 'short', month: 'short', day: 'numeric' });
  const narrow = new Intl.DateTimeFormat(locale, { weekday: 'narrow' });
  const long = new Intl.DateTimeFormat(locale, { weekday: 'long' });
  const full = new Intl.DateTimeFormat(locale, { month: 'long', day: 'numeric', year: 'numeric' });
  const input = new Intl.DateTimeFormat(locale, { month: 'numeric', day: 'numeric', year: 'numeric' });
  return {
    monthYear: (d) => monthYear.format(d),
    selectedDate: (d) => selected.format(d),
    weekdayNarrow: (i) => narrow.format(day(i % 7)),
    weekdayLong: (i) => long.format(day(i % 7)),
    fullDate: (d) => full.format(d),
    input: (d) => input.format(d),
  };
}

/** Parses the input format (numeric month / day / year in the locale's order). */
export function parseInputDate(text: string, locale?: string): Date | null {
  const parts = text
    .split(/[^0-9]+/)
    .filter(Boolean)
    .map(Number);
  if (parts.length !== 3) return null;
  const order = new Intl.DateTimeFormat(locale, { month: 'numeric', day: 'numeric', year: 'numeric' })
    .formatToParts(new Date(2001, 10, 22))
    .filter((p) => p.type === 'month' || p.type === 'day' || p.type === 'year')
    .map((p) => p.type);
  const v: Record<string, number> = {};
  order.forEach((k, i) => (v[k] = parts[i]!));
  const d = new Date(v.year!, v.month! - 1, v.day);
  return d.getMonth() === v.month! - 1 && d.getDate() === v.day ? d : null;
}
