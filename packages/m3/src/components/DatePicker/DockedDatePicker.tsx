import { useMemo, useRef, useState, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { Popover } from '@base-ui/react/popover';
import { color } from '../../tokens/color.stylex.ts';
import { motion } from '../../tokens/motion.stylex.ts';
import { SvgIcon } from '../../primitives/SvgIcon.tsx';
import { useControllableState } from '../../hooks/useControllableState.ts';
import { usePortalContainer } from '../../theme/portal.tsx';
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

export interface DockedCalendarProps {
  value: Date | null;
  onChange: (date: Date) => void;
  month?: Date;
  onMonthChange?: (month: Date) => void;
  view?: DockedView;
  onViewChange?: (view: DockedView) => void;
  today?: Date;
  yearRange?: [number, number];
  firstDayOfWeek?: number;
  locale?: string;
  formatter?: Partial<DatePickerFormatter> & {
    monthShort?: (d: Date) => string;
    monthLong?: (monthIndex: number) => string;
    year?: (year: number) => string;
  };
  onCancel?: () => void;
  onConfirm?: () => void;
  labels?: { cancel?: string; confirm?: string };
  sx?: StyleXStyles;
}

/** The docked picker's panel (month / year menus, calendar, lists). */
export function DockedCalendar({
  value,
  onChange,
  month: monthProp,
  onMonthChange,
  view: viewProp,
  onViewChange,
  today: todayProp,
  yearRange = DEFAULT_YEAR_RANGE,
  firstDayOfWeek = 0,
  locale,
  formatter: formatterProp,
  onCancel,
  onConfirm,
  labels = {},
  sx,
}: DockedCalendarProps) {
  const formatter = useMemo(() => ({ ...defaultFormatter(locale), ...formatterProp }), [locale, formatterProp]);
  const monthShort = formatterProp?.monthShort ?? ((d: Date) => dateFormat(locale, { month: 'short' }).format(d));
  const monthLong =
    formatterProp?.monthLong ??
    ((monthIndex: number) => dateFormat(locale, { month: 'long' }).format(makeDate(2001, monthIndex, 1)));
  const yearLabel = formatterProp?.year ?? ((year: number) => String(year));
  const today = useToday(todayProp);
  const [anyDayOfMonth, setMonth] = useControllableState(
    monthProp,
    () => makeDate((value ?? today).getFullYear(), (value ?? today).getMonth(), 1),
    onMonthChange,
  );
  const [year, monthOfYear] = [anyDayOfMonth.getFullYear(), anyDayOfMonth.getMonth()];
  const month = useMemo(() => makeDate(year, monthOfYear, 1), [year, monthOfYear]);
  const [view, setView] = useControllableState<DockedView>(viewProp, 'day', onViewChange);
  const list = view !== 'day';
  const arrows = (unit: 'month' | 'year', dir: -1 | 1) => (
    <span {...stylex.props(list && s.hidden)}>
      <IconButton
        aria-label={`${dir < 0 ? 'Previous' : 'Next'} ${unit}`}
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
        aria-label={`${label}, select ${unit}`}
      >
        {label}
      </PickerMenuButton>
    );

  return (
    <div {...stylex.props(s.panel, list && s.panelList, sx)}>
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
                {labels.cancel ?? 'Cancel'}
              </Button>
            )}
            {onConfirm && (
              <Button variant="text" onClick={onConfirm}>
                {labels.confirm ?? 'OK'}
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

export interface DockedDatePickerProps extends Omit<
  DockedCalendarProps,
  'onCancel' | 'onConfirm' | 'onChange' | 'value'
> {
  value: Date | null;
  onChange: (date: Date | null) => void;
  label?: string;
  /** Under the field: the expected format (default from the locale, e.g. "MM/DD/YYYY", "DD/MM/YYYY"). */
  supportingText?: ReactNode;
  width?: number;
}

/** A text field with a docked calendar (desktop): type a date, or pick one from the panel. */
export function DockedDatePicker({
  value,
  onChange,
  label = 'Date',
  supportingText,
  width = 312,
  locale,
  formatter,
  ...cal
}: DockedDatePickerProps) {
  const portal = usePortalContainer();
  const format = useMemo(() => ({ ...defaultFormatter(locale), ...formatter }), [locale, formatter]);
  const yearRange = cal.yearRange ?? DEFAULT_YEAR_RANGE;
  const [open, setOpen] = useState(false);
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
  const onOpenChange = (next: boolean) => {
    // Each opening starts from the committed value.
    if (next && !open) setDraft(value);
    setOpen(next);
  };
  const anchor = useRef<HTMLDivElement>(null);
  return (
    <div ref={anchor} {...stylex.props(s.field, s.notch)}>
      <TextField
        variant="outlined"
        label={label}
        value={text}
        onValueChange={(typed) => {
          setText(typed);
          const date = parseInputDate(typed, locale, yearRange);
          if (date || typed === '') onChange(date);
        }}
        supportingText={supportingText ?? inputFormatHint(locale, true)}
        sx={s.fieldWidth(width)}
        trailingIcon={
          <Popover.Root open={open} onOpenChange={onOpenChange}>
            <Popover.Trigger
              render={
                <IconButton aria-label="Open calendar">
                  <SvgIcon d={ICONS.today} />
                </IconButton>
              }
            />
            <Popover.Portal container={portal}>
              <Popover.Positioner anchor={anchor} side="bottom" align="start" sideOffset={7}>
                <Popover.Popup aria-label="Choose date" {...stylex.props(s.popup)}>
                  <DockedCalendar
                    {...cal}
                    locale={locale}
                    formatter={formatter}
                    value={draft}
                    onChange={setDraft}
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
