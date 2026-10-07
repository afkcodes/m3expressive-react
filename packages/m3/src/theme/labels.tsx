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
  save: string;
  /**
   * Verb for a button named "<verb> <visible label>" (input chip remove): the button's `aria-label`,
   * joined to the label through `aria-labelledby`. Other word orders: override per item with `aria-label`.
   */
  remove: string;
  /** Verb for an expandable list item's button (as `remove`; the state is in `aria-expanded`). */
  expand: string;
  // Sheets
  closeSheet: string;
  // Search
  searchResults: string;
  // Carousel
  /** `aria-roledescription` of the carousel and of each slide. */
  carousel: string;
  slide: string;
  /** Slide position, e.g. "3 of 8". */
  slidePosition: (index: number, count: number) => string;
  // Date pickers
  selectDate: string;
  selectDates: string;
  enterDate: string;
  enterDates: string;
  chooseDate: string;
  openCalendar: string;
  /** Input-mode field labels. */
  date: string;
  endDate: string;
  /** Range picker headline while nothing is selected. */
  dateRangePlaceholder: string;
  previousMonth: string;
  nextMonth: string;
  previousYear: string;
  nextYear: string;
  year: string;
  /** e.g. "October, select month" (docked picker). */
  selectMonth: (month: string) => string;
  /** e.g. "October 2026, select year". */
  selectYear: (monthYear: string) => string;
  /** Mode toggles (date / time pickers). */
  switchToInput: string;
  switchToCalendar: string;
  switchToClock: string;
  // Time pickers
  selectTime: string;
  enterTime: string;
  hour: string;
  minute: string;
  period: string;
  am: string;
  pm: string;
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
  save: 'Save',
  remove: 'Remove',
  expand: 'Expand',
  closeSheet: 'Close sheet',
  searchResults: 'Results',
  carousel: 'carousel',
  slide: 'slide',
  slidePosition: (index, count) => `${index} of ${count}`,
  selectDate: 'Select date',
  selectDates: 'Select dates',
  enterDate: 'Enter date',
  enterDates: 'Enter dates',
  chooseDate: 'Choose date',
  openCalendar: 'Open calendar',
  date: 'Date',
  endDate: 'End date',
  dateRangePlaceholder: 'Start date – End date',
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  previousYear: 'Previous year',
  nextYear: 'Next year',
  year: 'Year',
  selectMonth: (month) => `${month}, select month`,
  selectYear: (monthYear) => `${monthYear}, select year`,
  switchToInput: 'Switch to text input',
  switchToCalendar: 'Switch to calendar',
  switchToClock: 'Switch to clock',
  selectTime: 'Select time',
  enterTime: 'Enter time',
  hour: 'Hour',
  minute: 'Minute',
  period: 'Period',
  am: 'AM',
  pm: 'PM',
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
