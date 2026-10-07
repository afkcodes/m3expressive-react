import { createContext, useContext, useMemo, type ReactNode } from 'react';

/**
 * Every built-in string the components render or announce (accessible names, button text, value
 * text). English defaults; override app-wide with `<M3Provider labels>` and per component with its
 * `labels` prop. Templated strings are functions.
 */
export interface M3Labels {
  // Shared actions
  ok: string;
  cancel: string;
  clear: string;
  close: string;
  dismiss: string;
  /** Verb + item name, e.g. "Remove Ada" (input chips). */
  remove: (item: string) => string;
  /** Verb + item name, e.g. "Expand Billing" (expandable list items; state is in aria-expanded). */
  expand: (item: string) => string;
  // Sheets and menus
  closeSheet: string;
  closeMenu: string;
  // Search
  searchResults: string;
  // Carousel
  /** Slide position, e.g. "3 of 8". */
  slidePosition: (index: number, count: number) => string;
  // Date pickers
  selectDate: string;
  selectDates: string;
  enterDate: string;
  chooseDate: string;
  openCalendar: string;
  previousMonth: string;
  nextMonth: string;
  year: string;
  /** e.g. "October 2026, select year". */
  selectYear: (monthYear: string) => string;
  // Time pickers
  selectTime: string;
  enterTime: string;
  hour: string;
  minute: string;
  period: string;
  /** Dial value text (Compose strings), e.g. "7 o'clock" / "20 hours". */
  hourValue: (hour: number, is24Hour: boolean) => string;
  /** e.g. "30 minutes". */
  minuteValue: (minute: number) => string;
}

export const defaultLabels: M3Labels = {
  ok: 'OK',
  cancel: 'Cancel',
  clear: 'Clear',
  close: 'Close',
  dismiss: 'Dismiss',
  remove: (item) => `Remove ${item}`,
  expand: (item) => `Expand ${item}`,
  closeSheet: 'Close sheet',
  closeMenu: 'Close menu',
  searchResults: 'Results',
  slidePosition: (index, count) => `${index} of ${count}`,
  selectDate: 'Select date',
  selectDates: 'Select dates',
  enterDate: 'Enter date',
  chooseDate: 'Choose date',
  openCalendar: 'Open calendar',
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  year: 'Year',
  selectYear: (monthYear) => `${monthYear}, select year`,
  selectTime: 'Select time',
  enterTime: 'Enter time',
  hour: 'Hour',
  minute: 'Minute',
  period: 'Period',
  hourValue: (hour, is24Hour) => (is24Hour ? `${hour} hours` : `${hour} o'clock`),
  minuteValue: (minute) => `${minute} minutes`,
};

const LabelsContext = createContext<M3Labels>(defaultLabels);

/** Provides app-wide label overrides (used by `M3Provider labels`). */
export function LabelsProvider({ labels, children }: { labels?: Partial<M3Labels>; children: ReactNode }) {
  const parent = useContext(LabelsContext);
  const value = useMemo(() => (labels ? { ...parent, ...labels } : parent), [parent, labels]);
  return <LabelsContext value={value}>{children}</LabelsContext>;
}

/** The labels in effect, with a component's own `labels` prop applied on top. */
export function useLabels(overrides?: Partial<M3Labels>): M3Labels {
  const labels = useContext(LabelsContext);
  return useMemo(() => (overrides ? { ...labels, ...overrides } : labels), [labels, overrides]);
}
