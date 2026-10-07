import { useMemo, useRef, useState, type ComponentPropsWithRef, type MouseEventHandler, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Popover } from '@base-ui/react/popover';
import { color } from '../../tokens/color.stylex.ts';
import { motion } from '../../tokens/motion.stylex.ts';
import { SvgIcon } from '../../primitives/SvgIcon.tsx';
import type { SxProps } from '../../primitives/types.ts';
import { useControllableState } from '../../hooks/useControllableState.ts';
import { useMergedRefs } from '../../hooks/useMergedRefs.ts';
import { usePortalContainer } from '../../theme/portal.tsx';
import { useLabels, type M3Labels } from '../../theme/labels.tsx';
import { Button } from '../Button/Button.tsx';
import { IconButton } from '../IconButton/IconButton.tsx';
import { TextField } from '../TextField/TextField.tsx';
import { textFieldVars } from '../TextField/textField.stylex.ts';
import { PickerMenuButton } from './cells.tsx';
import { CalendarMonth } from './CalendarMonth.tsx';
import { MonthPager } from './MonthPager.tsx';
import { DATE_PICKER_ICONS } from './icons.ts';
import { DockedList } from './DockedList.tsx';
import {
  addMonths,
  dateFormat,
  DEFAULT_YEAR_RANGE,
  defaultFormatter,
  inputFormatHint,
  makeDate,
  parseInputDate,
  sameDay,
  type DatePickerFormatter,
} from './calendar.ts';
import { useToday } from './useToday.ts';

/*
 * Figma kit, "Docked input date picker [desktop]" (51954:18567).
 *   An outlined text field (MM/DD/YYYY supporting text, a calendar button) over a 360px Surface
 *   Container High panel with 16px corners, 7px below the supporting text. Selection row 64px:
 *   ‹ month ▾ › at the start, ‹ year ▾ › at the end. Day view: 12px sides, weekday row + six weeks
 *   including the neighbouring months' days, 4px below; Cancel / OK (56px row). Month / year
 *   views: the row keeps both menus in place (the inactive one dims to 38%, arrows hidden) over an
 *   Outline Variant rule; a 336px list of 48px rows (check + body-large, the selected row under an
 *   8% layer; 16px end gutter for the Outline scroll thumb), 20px below.
 */
const ICONS = DATE_PICKER_ICONS;

const s = stylex.create({
  panel: {
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    width: 360,
    overflow: 'hidden',
    color: color.onSurface,
    backgroundColor: color.surfaceContainerHigh,
    borderRadius: 16,
  },
  panelList: { paddingBottom: 20, rowGap: 8 },
  row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, height: 64 },
  rowRule: { boxShadow: `inset 0 -1px 0 ${color.outlineVariant}` },
  group: { display: 'flex', alignItems: 'center' },
  hidden: { visibility: 'hidden' },
  grid: { paddingInline: 12, paddingBottom: 4 },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    columnGap: 8,
    flexShrink: 0,
    height: 56,
    boxSizing: 'border-box',
    paddingBlock: 4,
    paddingInline: 12,
  },
  field: { display: 'flex', flexDirection: 'column', rowGap: 7, alignItems: 'flex-start' },
  notch: { [textFieldVars.notchColor]: color.surface },
  fieldWidth: (w: number) => ({ width: w }),
  popup: {
    outlineStyle: 'none',
    opacity: { default: 1, ':is([data-starting-style], [data-ending-style])': 0 },
    translate: { default: '0 0', ':is([data-starting-style], [data-ending-style])': '0 -8px' },
    transitionProperty: 'opacity, translate',
    transitionDuration: motion.fastEffectsDuration,
    transitionTimingFunction: motion.fastEffectsEasing,
  },
});

export type DockedView = 'day' | 'month' | 'year';

const noop = () => {};

/** The calendar options the docked picker passes on to its panel. */
interface DockedCalendarOptions {
  /** The displayed month (any day in it). */
  month?: Date;
  /** The uncontrolled initial month (default: the value's month, else today's). */
  defaultMonth?: Date;
  onMonthChange?: (month: Date) => void;
  view?: DockedView;
  /** The uncontrolled initial view (default `'day'`). */
  defaultView?: DockedView;
  onViewChange?: (view: DockedView) => void;
  /** The day treated as today (default: the device date at mount). */
  today?: Date;
  /** Years offered in the year list (inclusive). */
  yearRange?: [number, number];
  firstDayOfWeek?: number;
  locale?: string;
  formatter?: Partial<DatePickerFormatter> & {
    monthShort?: (d: Date) => string;
    monthLong?: (monthIndex: number) => string;
    year?: (year: number) => string;
  };
  /** Overrides for the built-in strings (`previousMonth`, `nextMonth`, `previousYear`, `nextYear`, `selectMonth`, `selectYear`, `cancel`, `ok`…). */
  labels?: Partial<M3Labels>;
}

/** `ref`, the native props and `sx` go to the panel `<div>`. */
export interface DockedCalendarProps
  extends DockedCalendarOptions, SxProps<Omit<ComponentPropsWithRef<'div'>, 'defaultValue'>> {
  /** The picked day (`null`: none). */
  value?: Date | null;
  defaultValue?: Date | null;
  onValueChange?: (date: Date | null) => void;
  onCancel?: MouseEventHandler<HTMLButtonElement>;
  onConfirm?: MouseEventHandler<HTMLButtonElement>;
}

/** The docked picker's panel (month / year menus, calendar, lists). */
export function DockedCalendar({
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
  onCancel,
  onConfirm,
  labels: labelsProp,
  sx,
  ...rest
}: DockedCalendarProps) {
  const labels = useLabels(labelsProp);
  const [value, onChange] = useControllableState(valueProp, defaultValue, onValueChange);
  const formatter = useMemo(() => ({ ...defaultFormatter(locale), ...formatterProp }), [locale, formatterProp]);
  const monthShort = formatterProp?.monthShort ?? ((d: Date) => dateFormat(locale, { month: 'short' }).format(d));
  const monthLong =
    formatterProp?.monthLong ??
    ((monthIndex: number) => dateFormat(locale, { month: 'long' }).format(makeDate(2001, monthIndex, 1)));
  const yearLabel = formatterProp?.year ?? ((year: number) => String(year));
  const today = useToday(todayProp);
  const [anyDayOfMonth, setMonth] = useControllableState(
    monthProp,
    () => defaultMonth ?? makeDate((value ?? today).getFullYear(), (value ?? today).getMonth(), 1),
    onMonthChange,
  );
  const [year, monthOfYear] = [anyDayOfMonth.getFullYear(), anyDayOfMonth.getMonth()];
  const month = useMemo(() => makeDate(year, monthOfYear, 1), [year, monthOfYear]);
  const [view, setView] = useControllableState<DockedView>(viewProp, defaultView, onViewChange);
  const list = view !== 'day';
  const arrowLabel = {
    month: [labels.previousMonth, labels.nextMonth],
    year: [labels.previousYear, labels.nextYear],
  } as const;
  const arrows = (unit: 'month' | 'year', dir: -1 | 1) => (
    <span {...stylex.props(list && s.hidden)}>
      <IconButton
        aria-label={arrowLabel[unit][dir < 0 ? 0 : 1]}
        tabIndex={list ? -1 : undefined}
        onClick={() => setMonth(unit === 'month' ? addMonths(month, dir) : makeDate(year + dir, month.getMonth(), 1))}
      >
        <SvgIcon d={dir < 0 ? ICONS.prev : ICONS.next} />
      </IconButton>
    </span>
  );
  const menu = (unit: 'month' | 'year', label: string) =>
    list && view !== unit ? (
      <PickerMenuButton disabled hideArrow aria-label={label}>
        {label}
      </PickerMenuButton>
    ) : (
      <PickerMenuButton
        open={view === unit}
        onClick={() => setView(view === unit ? 'day' : unit)}
        aria-label={unit === 'month' ? labels.selectMonth(label) : labels.selectYear(label)}
      >
        {label}
      </PickerMenuButton>
    );

  return (
    <div ref={ref} {...rest} {...stylex.props(s.panel, list && s.panelList, sx)}>
      <div {...stylex.props(s.row, list && s.rowRule)}>
        <span {...stylex.props(s.group)}>
          {arrows('month', -1)}
          {menu('month', monthShort(month))}
          {arrows('month', 1)}
        </span>
        <span {...stylex.props(s.group)}>
          {arrows('year', -1)}
          {menu('year', yearLabel(year))}
          {arrows('year', 1)}
        </span>
      </div>
      {view === 'day' && (
        <>
          <MonthPager month={month} onSwipe={setMonth}>
            {(m, copy) => (
              <CalendarMonth
                month={m}
                value={value}
                today={today}
                formatter={formatter}
                firstDayOfWeek={firstDayOfWeek}
                outsideDays
                onPick={copy ? noop : onChange}
                onNavigate={copy ? undefined : setMonth}
                sx={s.grid}
              />
            )}
          </MonthPager>
          <div {...stylex.props(s.actions)}>
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
          </div>
        </>
      )}
      {view === 'month' && (
        <DockedList
          items={Array.from({ length: 12 }, (_, i) => ({ key: i, label: monthLong(i) }))}
          selected={month.getMonth()}
          initialScroll={Math.max(0, month.getMonth() - 3) * 48}
          onPick={(picked) => {
            setMonth(makeDate(year, picked, 1));
            setView('day');
          }}
        />
      )}
      {view === 'year' && (
        <DockedList
          items={Array.from({ length: yearRange[1] - yearRange[0] + 1 }, (_, i) => ({
            key: yearRange[0] + i,
            label: yearLabel(yearRange[0] + i),
          }))}
          selected={year}
          initialScroll={(year - yearRange[0]) * 48}
          onPick={(picked) => {
            setMonth(makeDate(picked, month.getMonth(), 1));
            setView('day');
          }}
        />
      )}
    </div>
  );
}

/**
 * `ref`, the native props and `sx` go to the root (the field and its supporting text); the
 * calendar options go to the docked panel.
 */
export interface DockedDatePickerProps
  extends DockedCalendarOptions, SxProps<Omit<ComponentPropsWithRef<'div'>, 'defaultValue'>> {
  /** The committed date: changes when a complete date is typed, the field is cleared, or OK is pressed in the panel. */
  value?: Date | null;
  defaultValue?: Date | null;
  onValueChange?: (date: Date | null) => void;
  /** Whether the calendar panel is open. */
  open?: boolean;
  /** The uncontrolled initial open state (default false). */
  defaultOpen?: boolean;
  /**
   * `details` are Base UI's (reason, event, `cancel()`) when the popover opens or closes itself (the
   * calendar button, Escape, an outside press); the panel's Cancel / OK close it without them.
   */
  onOpenChange?: (open: boolean, details?: Popover.Root.ChangeEventDetails) => void;
  /** The field label (default the `date` label). */
  label?: string;
  /** Under the field: the expected format (default from the locale, e.g. "MM/DD/YYYY", "DD/MM/YYYY"). */
  supportingText?: ReactNode;
  /** The field's width in px (default 312). */
  width?: number;
}

/** A text field with a docked calendar (desktop): type a date, or pick one from the panel. */
export function DockedDatePicker({
  ref,
  value: valueProp,
  defaultValue = null,
  onValueChange,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  label,
  supportingText,
  width = 312,
  locale,
  formatter,
  month,
  defaultMonth,
  onMonthChange,
  view,
  defaultView,
  onViewChange,
  today,
  yearRange: yearRangeProp,
  firstDayOfWeek,
  labels: labelsProp,
  sx,
  ...rest
}: DockedDatePickerProps) {
  const portal = usePortalContainer();
  const labels = useLabels(labelsProp);
  const format = useMemo(() => ({ ...defaultFormatter(locale), ...formatter }), [locale, formatter]);
  const yearRange = yearRangeProp ?? DEFAULT_YEAR_RANGE;
  const [value, onChange] = useControllableState(valueProp, defaultValue, onValueChange);
  const [open, setOpen] = useControllableState<boolean, [Popover.Root.ChangeEventDetails?]>(
    openProp,
    defaultOpen,
    onOpenChange,
  );
  const [text, setText] = useState(value ? format.input(value) : '');
  const [draft, setDraft] = useState<Date | null>(value);
  // The field follows `value` when it changes to a day other than the one typed (a pick, a reset);
  // a value that echoes the typing (or a new Date for the same day) leaves the text alone.
  const time = value && !Number.isNaN(value.getTime()) ? value.getTime() : null;
  const [synced, setSynced] = useState({ time, locale });
  if (time !== synced.time || locale !== synced.locale) {
    setSynced({ time, locale });
    const typed = parseInputDate(text, locale, yearRange);
    if (locale !== synced.locale || !(value ? sameDay(typed, value) : !typed))
      setText(value ? format.input(value) : '');
  }
  // Each opening starts from the committed value.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setDraft(value);
  }
  const anchor = useRef<HTMLDivElement>(null);
  const rootRef = useMergedRefs(anchor, ref);
  return (
    <div ref={rootRef} {...rest} {...stylex.props(s.field, s.notch, sx)}>
      <TextField
        variant="outlined"
        label={label ?? labels.date}
        value={text}
        onValueChange={(typed) => {
          setText(typed);
          const date = parseInputDate(typed, locale, yearRange);
          if (date || typed === '') onChange(date);
        }}
        supportingText={supportingText ?? inputFormatHint(locale, true)}
        sx={s.fieldWidth(width)}
        trailingIcon={
          <Popover.Root open={open} onOpenChange={setOpen}>
            <Popover.Trigger
              render={
                <IconButton aria-label={labels.openCalendar}>
                  <SvgIcon d={ICONS.today} />
                </IconButton>
              }
            />
            <Popover.Portal container={portal}>
              <Popover.Positioner anchor={anchor} side="bottom" align="start" sideOffset={7}>
                <Popover.Popup aria-label={labels.chooseDate} {...stylex.props(s.popup)}>
                  <DockedCalendar
                    month={month}
                    defaultMonth={defaultMonth}
                    onMonthChange={onMonthChange}
                    view={view}
                    defaultView={defaultView}
                    onViewChange={onViewChange}
                    today={today}
                    yearRange={yearRangeProp}
                    firstDayOfWeek={firstDayOfWeek}
                    locale={locale}
                    formatter={formatter}
                    labels={labels}
                    value={draft}
                    onValueChange={setDraft}
                    onCancel={() => setOpen(false)}
                    onConfirm={() => {
                      onChange(draft);
                      setOpen(false);
                    }}
                  />
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
        }
      />
    </div>
  );
}
