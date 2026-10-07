import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { Popover } from '@base-ui/react/popover';
import { color } from '../../tokens/color.stylex.ts';
import { motion } from '../../tokens/motion.stylex.ts';
import { typescale } from '../../tokens/typescale.ts';
import { textBox } from '../../primitives/textBox.ts';
import { usePortalContainer } from '../../theme/portal.tsx';
import { Button } from '../Button/Button.tsx';
import { IconButton } from '../IconButton/IconButton.tsx';
import { TextField } from '../TextField/TextField.tsx';
import { textFieldVars } from '../TextField/textField.stylex.ts';
import { PickerMenuButton } from './cells.tsx';
import { CalendarMonth } from './CalendarMonth.tsx';
import { MonthPager } from './MonthPager.tsx';
import { DATE_PICKER_ICONS } from './icons.ts';
import { addMonths, defaultFormatter, parseInputDate, startOfDay, type DatePickerFormatter } from './calendar.ts';

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

const Glyph = ({ d }: { d: string }) => (
  <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor" aria-hidden style={{ display: 'block' }}>
    <path d={d} />
  </svg>
);

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
  listWrap: { position: 'relative', height: 336, flexShrink: 0 },
  list: {
    height: '100%',
    overflowY: 'auto',
    scrollbarWidth: 'none',
    '::-webkit-scrollbar': { display: 'none' },
    margin: 0,
    padding: 0,
    paddingInlineEnd: 16,
    listStyle: 'none',
  },
  item: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    columnGap: 16,
    width: '100%',
    height: 48,
    boxSizing: 'border-box',
    margin: 0,
    paddingInline: 16,
    borderWidth: 0,
    borderStyle: 'none',
    outlineStyle: 'none',
    textAlign: 'start',
    cursor: 'pointer',
    color: color.onSurface,
    backgroundColor: {
      default: 'transparent',
      ':hover': `color-mix(in srgb, ${color.onSurface} 8%, transparent)`,
      ':focus-visible': `color-mix(in srgb, ${color.onSurface} 10%, transparent)`,
    },
  },
  itemSelected: { backgroundColor: `color-mix(in srgb, ${color.onSurface} 8%, transparent)` },
  check: { width: 24, height: 24, flexShrink: 0, color: color.onSurfaceVariant },
  thumb: { position: 'absolute', right: 4.4, width: 8.8, borderRadius: 4.4, backgroundColor: color.outline, pointerEvents: 'none' },
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
    monthLong?: (m: number) => string;
    year?: (y: number) => string;
  };
  onCancel?: () => void;
  onConfirm?: () => void;
  labels?: { cancel?: string; confirm?: string };
  sx?: StyleXStyles;
}

function ListView({
  items,
  selected,
  onPick,
  initialScroll,
}: {
  items: { key: number; label: ReactNode }[];
  selected: number;
  onPick: (key: number) => void;
  initialScroll: number;
}) {
  const list = useRef<HTMLUListElement>(null);
  const [thumb, setThumb] = useState<[number, number] | null>(null);
  const update = () => {
    const el = list.current;
    if (!el) return;
    const ratio = el.clientHeight / el.scrollHeight;
    if (ratio >= 1) return setThumb(null);
    const h = Math.max(32, el.clientHeight * ratio);
    setThumb([(el.scrollTop / (el.scrollHeight - el.clientHeight)) * (el.clientHeight - h), h]);
  };
  useLayoutEffect(() => {
    if (list.current) list.current.scrollTop = initialScroll;
    update();
  }, [initialScroll]);
  return (
    <div {...stylex.props(s.listWrap)}>
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-to-interactive-role -- a styled list with listbox semantics (options are its <li> buttons) */}
      <ul ref={list} role="listbox" onScroll={update} {...stylex.props(s.list)}>
        {items.map((it) => (
          <li key={it.key} role="presentation">
            <button
              type="button"
              role="option"
              aria-selected={it.key === selected}
              onClick={() => onPick(it.key)}
              {...stylex.props(s.item, it.key === selected && s.itemSelected)}
            >
              <span {...stylex.props(s.check)}>{it.key === selected && <Glyph d={ICONS.check} />}</span>
              <span {...stylex.props(typescale.bodyLarge, textBox.hug)}>{it.label}</span>
            </button>
          </li>
        ))}
      </ul>
      {thumb && <span aria-hidden {...stylex.props(s.thumb)} style={{ top: thumb[0], height: thumb[1] }} />}
    </div>
  );
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
  yearRange = [1900, 2100],
  firstDayOfWeek = 0,
  locale,
  formatter: fmt,
  onCancel,
  onConfirm,
  labels = {},
  sx,
}: DockedCalendarProps) {
  const f = useMemo(() => ({ ...defaultFormatter(locale), ...fmt }), [locale, fmt]);
  const monthShort = fmt?.monthShort ?? ((d: Date) => new Intl.DateTimeFormat(locale, { month: 'short' }).format(d));
  const monthLong = fmt?.monthLong ?? ((m: number) => new Intl.DateTimeFormat(locale, { month: 'long' }).format(new Date(2001, m, 1)));
  const yearLabel = fmt?.year ?? ((y: number) => String(y));
  const today = useMemo(() => startOfDay(todayProp ?? new Date()), [todayProp]);
  const [innerMonth, setInnerMonth] = useState(() => new Date((value ?? today).getFullYear(), (value ?? today).getMonth(), 1));
  const month = monthProp ? new Date(monthProp.getFullYear(), monthProp.getMonth(), 1) : innerMonth;
  const setMonth = (m: Date) => {
    if (!monthProp) setInnerMonth(m);
    onMonthChange?.(m);
  };
  const [innerView, setInnerView] = useState<DockedView>('day');
  const view = viewProp ?? innerView;
  const setView = (v: DockedView) => {
    if (!viewProp) setInnerView(v);
    onViewChange?.(v);
  };
  const y = month.getFullYear();
  const list = view !== 'day';
  const arrows = (unit: 'month' | 'year', dir: -1 | 1) => (
    <span {...stylex.props(list && s.hidden)}>
      <IconButton
        aria-label={`${dir < 0 ? 'Previous' : 'Next'} ${unit}`}
        tabIndex={list ? -1 : undefined}
        onClick={() => setMonth(unit === 'month' ? addMonths(month, dir) : new Date(y + dir, month.getMonth(), 1))}
      >
        <Glyph d={dir < 0 ? ICONS.prev : ICONS.next} />
      </IconButton>
    </span>
  );
  const menu = (unit: 'month' | 'year', label: string) =>
    list && view !== unit ? (
      <PickerMenuButton disabled hideArrow aria-label={label}>
        {label}
      </PickerMenuButton>
    ) : (
      <PickerMenuButton open={view === unit} onClick={() => setView(view === unit ? 'day' : unit)} aria-label={`${label}, select ${unit}`}>
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
          {menu('year', yearLabel(y))}
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
                formatter={f}
                firstDayOfWeek={firstDayOfWeek}
                outsideDays
                onPick={copy ? () => {} : onChange}
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
        <ListView
          items={Array.from({ length: 12 }, (_, i) => ({ key: i, label: monthLong(i) }))}
          selected={month.getMonth()}
          initialScroll={Math.max(0, month.getMonth() - 3) * 48}
          onPick={(m) => {
            setMonth(new Date(y, m, 1));
            setView('day');
          }}
        />
      )}
      {view === 'year' && (
        <ListView
          items={Array.from({ length: yearRange[1] - yearRange[0] + 1 }, (_, i) => ({
            key: yearRange[0] + i,
            label: yearLabel(yearRange[0] + i),
          }))}
          selected={y}
          initialScroll={(y - yearRange[0]) * 48}
          onPick={(yy) => {
            setMonth(new Date(yy, month.getMonth(), 1));
            setView('day');
          }}
        />
      )}
    </div>
  );
}

export interface DockedDatePickerProps extends Omit<DockedCalendarProps, 'onCancel' | 'onConfirm' | 'onChange' | 'value'> {
  value: Date | null;
  onChange: (date: Date | null) => void;
  label?: string;
  supportingText?: ReactNode;
  width?: number;
}

/** A text field with a docked calendar (desktop): type a date, or pick one from the panel. */
export function DockedDatePicker({
  value,
  onChange,
  label = 'Date',
  supportingText = 'MM/DD/YYYY',
  width = 312,
  locale,
  formatter,
  ...cal
}: DockedDatePickerProps) {
  const portal = usePortalContainer();
  const f = useMemo(() => ({ ...defaultFormatter(locale), ...formatter }), [locale, formatter]);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(value ? f.input(value) : '');
  const [draft, setDraft] = useState<Date | null>(value);
  useLayoutEffect(() => setText(value ? f.input(value) : ''), [value, f]);
  useLayoutEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);
  const anchor = useRef<HTMLDivElement>(null);
  return (
    <div ref={anchor} {...stylex.props(s.field, s.notch)}>
      <TextField
        variant="outlined"
        label={label}
        value={text}
        onValueChange={(t) => {
          setText(t);
          const d = parseInputDate(t, locale);
          if (d || t === '') onChange(d);
        }}
        supportingText={supportingText}
        sx={s.fieldWidth(width)}
        trailingIcon={
          <Popover.Root open={open} onOpenChange={setOpen}>
            <Popover.Trigger
              render={
                <IconButton aria-label="Open calendar">
                  <Glyph d={ICONS.today} />
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
