/** Date helpers for the date pickers (local calendar dates; no time-of-day). */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const sameDay = (a: Date | null | undefined, b: Date | null | undefined) =>
  !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** A local calendar date at midnight. `setFullYear` keeps years 0–99 (the Date constructor maps them to 1900–1999). */
export function makeDate(year: number, monthIndex: number, day: number): Date {
  const d = new Date(2000, 0, 1);
  d.setFullYear(year, monthIndex, day);
  return d;
}

export const startOfDay = (d: Date) => makeDate(d.getFullYear(), d.getMonth(), d.getDate());

export const addMonths = (d: Date, n: number) => makeDate(d.getFullYear(), d.getMonth() + n, 1);

/** Calendar arithmetic (local midnight): never ± n × 24h, which lands on the wrong day across a DST change. */
export const addDays = (d: Date, n: number) => makeDate(d.getFullYear(), d.getMonth(), d.getDate() + n);

export const daysInMonth = (year: number, month: number) => makeDate(year, month + 1, 0).getDate();

/** The first / last day of `d`'s week, for weeks starting on `firstDayOfWeek` (0 = Sunday). */
export const weekStart = (d: Date, firstDayOfWeek = 0) => addDays(d, -((d.getDay() - firstDayOfWeek + 7) % 7));
export const weekEnd = (d: Date, firstDayOfWeek = 0) => addDays(d, (firstDayOfWeek + 6 - d.getDay() + 14) % 7);

/** The first enabled day from `from` (inclusive) stepping `dir` days, within `limit` steps (null: none). */
export function firstEnabled(from: Date, dir: 1 | -1, isDisabled?: (d: Date) => boolean, limit = 366): Date | null {
  for (let i = 0, d = from; i <= limit; i++, d = addDays(d, dir)) if (!isDisabled?.(d)) return d;
  return null;
}

/**
 * The day a calendar key moves focus to from `base` (the grid pattern): arrows ±1 day / ±1 week,
 * Home / End the first / last day of the week, PageUp / PageDown the same day of the previous /
 * next month (clamped to its length). Disabled days are skipped in the direction of travel
 * (Home / End never pass `base`); null when the key isn't a calendar key or nothing is enabled.
 */
export function dayForKey(base: Date, key: string, firstDayOfWeek = 0, isDisabled?: (d: Date) => boolean): Date | null {
  const steps: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
  const step = steps[key];
  if (step) {
    const limit = Math.ceil(366 / Math.abs(step));
    for (let i = 1, d = addDays(base, step); i <= limit; i++, d = addDays(d, step)) if (!isDisabled?.(d)) return d;
    return null;
  }
  if (key === 'Home' || key === 'End') {
    const home = key === 'Home';
    const edge = home ? weekStart(base, firstDayOfWeek) : weekEnd(base, firstDayOfWeek);
    // A day count (rounded: a DST change makes a day 23 or 25 hours long).
    const span = Math.round(Math.abs(base.getTime() - edge.getTime()) / MS_PER_DAY);
    return firstEnabled(edge, home ? 1 : -1, isDisabled, span) ?? base;
  }
  if (key === 'PageUp' || key === 'PageDown') {
    const dir = key === 'PageUp' ? -1 : 1;
    const year = base.getFullYear();
    const month = base.getMonth() + dir;
    return firstEnabled(makeDate(year, month, Math.min(base.getDate(), daysInMonth(year, month))), dir, isDisabled);
  }
  return null;
}

/** The years offered when a picker isn't given a `yearRange`. */
export const DEFAULT_YEAR_RANGE: [number, number] = [1900, 2100];

/** Weeks of the month (7 cells each, null outside the month), starting on `firstDayOfWeek` (0 = Sunday). */
export function monthWeeks(year: number, month: number, firstDayOfWeek = 0): (Date | null)[][] {
  const lead = (makeDate(year, month, 1).getDay() - firstDayOfWeek + 7) % 7;
  const total = daysInMonth(year, month);
  const cells: (Date | null)[] = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: total }, (_, i) => makeDate(year, month, i + 1)),
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

const formats = new Map<string, Intl.DateTimeFormat>();

/** One shared `Intl.DateTimeFormat` per locale and options (constructing one is expensive). */
export function dateFormat(locale: string | undefined, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale ?? ''}|${JSON.stringify(options)}`;
  let format = formats.get(key);
  if (!format) {
    format = new Intl.DateTimeFormat(locale, options);
    formats.set(key, format);
  }
  return format;
}

const INPUT_FORMAT: Intl.DateTimeFormatOptions = { month: 'numeric', day: 'numeric', year: 'numeric' };
const sunday = makeDate(2023, 0, 1); // a Sunday
const formatters = new Map<string, DatePickerFormatter>();

/** The `Intl` labels for `locale` (cached: one formatter set per locale). */
export function defaultFormatter(locale?: string): DatePickerFormatter {
  const key = locale ?? '';
  const cached = formatters.get(key);
  if (cached) return cached;
  const day = (i: number) => addDays(sunday, i);
  const monthYear = dateFormat(locale, { month: 'long', year: 'numeric' });
  const selected = dateFormat(locale, { weekday: 'short', month: 'short', day: 'numeric' });
  const narrow = dateFormat(locale, { weekday: 'narrow' });
  const long = dateFormat(locale, { weekday: 'long' });
  const full = dateFormat(locale, { month: 'long', day: 'numeric', year: 'numeric' });
  const input = dateFormat(locale, INPUT_FORMAT);
  const f: DatePickerFormatter = {
    monthYear: (d) => monthYear.format(d),
    selectedDate: (d) => selected.format(d),
    weekdayNarrow: (i) => narrow.format(day(i % 7)),
    weekdayLong: (i) => long.format(day(i % 7)),
    fullDate: (d) => full.format(d),
    input: (d) => input.format(d),
  };
  formatters.set(key, f);
  return f;
}

type InputPart = { type: 'month' | 'day' | 'year' } | { type: 'literal'; value: string };

/** The numeric date's parts in the locale's order (e.g. en-US month / day / year, en-GB day / month / year). */
function inputParts(locale?: string): InputPart[] {
  return dateFormat(locale, INPUT_FORMAT)
    .formatToParts(makeDate(2001, 10, 22))
    .flatMap((p): InputPart[] =>
      p.type === 'month' || p.type === 'day' || p.type === 'year'
        ? [{ type: p.type }]
        : p.type === 'literal'
          ? [{ type: 'literal', value: p.value }]
          : [],
    );
}

/**
 * The expected input format for `locale`, e.g. "mm/dd/yyyy" (en-US), "dd/mm/yyyy" (en-GB),
 * "dd.mm.yyyy" (de-DE); `upper` gives "MM/DD/YYYY".
 */
export function inputFormatHint(locale?: string, upper = false): string {
  const token = { month: 'mm', day: 'dd', year: 'yyyy' } as const;
  const hint = inputParts(locale)
    .map((p) => (p.type === 'literal' ? p.value : token[p.type]))
    .join('');
  return upper ? hint.toUpperCase() : hint;
}

/**
 * Parses the input format (numeric month / day / year in the locale's order). The year must be
 * typed in full (four digits) — "1/5/2" is incomplete, not 1902 — and, when `yearRange` is given,
 * lie within it.
 */
export function parseInputDate(text: string, locale?: string, yearRange?: [number, number]): Date | null {
  const parts = text.split(/[^0-9]+/).filter(Boolean);
  if (parts.length !== 3) return null;
  const order = inputParts(locale).flatMap((part) => (part.type === 'literal' ? [] : [part.type]));
  const fields: Partial<Record<'month' | 'day' | 'year', string>> = {};
  order.forEach((field, i) => (fields[field] = parts[i]));
  const { year: yearText, month: monthText, day: dayText } = fields;
  if (!yearText || !monthText || !dayText || yearText.length !== 4 || monthText.length > 2 || dayText.length > 2) {
    return null;
  }
  const [year, month, day] = [Number(yearText), Number(monthText), Number(dayText)];
  if (yearRange && (year < yearRange[0] || year > yearRange[1])) return null;
  const date = makeDate(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}
