import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { color } from '../../tokens/color.stylex';
import { typescale } from '../../tokens/typescale.ts';
import { textBox } from '../../primitives/textBox.ts';
import { usePortalContainer } from '../../theme/portal.tsx';
import { Button } from '../Button/Button.tsx';
import { IconButton } from '../IconButton/IconButton.tsx';
import { dialogMotion } from '../Dialog/dialogMotion.ts';
import { CalendarMonth } from './CalendarMonth.tsx';
import { DATE_PICKER_ICONS } from './icons.ts';
import { defaultFormatter, startOfDay, type DatePickerFormatter } from './calendar.ts';

/*
 * Figma kit, "Modal date picker / Full-screen (range)" (51954:18254; Compose DateRangePicker).
 *   Full screen, Surface Container High. Header 132px (Outline Variant rule): a 48px bar 12px
 *   down (close at the start, Save 12px from the end), then — 64px in — label-large "Depart –
 *   Return dates" over the title-large range, the edit button at the end (12px below). Weekday
 *   row 48px (12px sides), then the months scroll: each a 48px heading (label-large On Surface
 *   Variant, 24px in, 16px down) over its weeks; the range draws Secondary Container bands
 *   between the Primary start / end days. Actions 60px under an Outline Variant rule.
 */
const Glyph = ({ d }: { d: string }) => (
  <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor" aria-hidden style={{ display: 'block' }}>
    <path d={d} />
  </svg>
);
const CLOSE = 'M6.4 19L5 17.6L10.6 12L5 6.4L6.4 5L12 10.6L17.6 5L19 6.4L13.4 12L19 17.6L17.6 19L12 13.4L6.4 19Z';

const s = stylex.create({
  surface: {
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    width: '100%',
    height: '100%',
    color: color.onSurface,
    backgroundColor: color.surfaceContainerHigh,
  },
  header: { flexShrink: 0, height: 132, boxSizing: 'border-box', paddingTop: 12, boxShadow: `inset 0 -1px 0 ${color.outlineVariant}` },
  bar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 48, paddingInlineEnd: 12 },
  title: {
    display: 'flex',
    alignItems: 'flex-end',
    columnGap: 8,
    height: 72,
    boxSizing: 'border-box',
    paddingInline: '64px 12px',
    paddingBottom: 12,
  },
  titleText: { display: 'flex', flexDirection: 'column', rowGap: 8, flexGrow: 1, minWidth: 0, alignSelf: 'flex-start', paddingBottom: 4 },
  label: { margin: 0, color: color.onSurfaceVariant },
  range: { margin: 0, color: color.onSurface, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  weekdays: { display: 'flex', flexShrink: 0, paddingInline: 12 },
  weekday: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
    flexShrink: 0,
    color: color.onSurface,
  },
  // Positioned, so months' offsetTop is measured from the list.
  months: {
    position: 'relative',
    flexGrow: 1,
    minHeight: 0,
    overflowY: 'auto',
    overflowX: 'hidden',
    paddingInline: 12,
    scrollbarWidth: 'none',
    '::-webkit-scrollbar': { display: 'none' },
  },
  monthTitle: {
    margin: 0,
    height: 48,
    boxSizing: 'border-box',
    paddingBlock: '16px 12px',
    paddingInline: 24,
    color: color.onSurfaceVariant,
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
    boxShadow: `inset 0 1px 0 ${color.outlineVariant}`,
  },
  end: { display: 'flex', columnGap: 8, marginInlineStart: 'auto' },
  popup: {
    position: 'fixed',
    inset: 0,
    outlineStyle: 'none',
  },
});

export interface DateRange {
  start: Date | null;
  end: Date | null;
}

export interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  /** The first month listed. Defaults to the start's month (or today's). */
  firstMonth?: Date;
  /** How many months to list (default 12). */
  monthCount?: number;
  today?: Date;
  firstDayOfWeek?: number;
  locale?: string;
  formatter?: Partial<DatePickerFormatter> & { range?: (r: DateRange) => string };
  supportingText?: ReactNode;
  placeholder?: ReactNode;
  onClose?: () => void;
  onSave?: () => void;
  onModeToggle?: () => void;
  onClear?: () => void;
  onCancel?: () => void;
  onConfirm?: () => void;
  labels?: { save?: string; close?: string; clear?: string; cancel?: string; confirm?: string; mode?: string };
  sx?: StyleXStyles;
}

/** The full-screen range picker: tap a start day, then an end day. */
export function DateRangePicker({
  value,
  onChange,
  firstMonth,
  monthCount = 12,
  today: todayProp,
  firstDayOfWeek = 0,
  locale,
  formatter: fmt,
  supportingText = 'Select dates',
  placeholder = 'Start date – End date',
  onClose,
  onSave,
  onModeToggle,
  onClear,
  onCancel,
  onConfirm,
  labels = {},
  sx,
}: DateRangePickerProps) {
  const f = useMemo(() => ({ ...defaultFormatter(locale), ...fmt }), [locale, fmt]);
  const today = useMemo(() => startOfDay(todayProp ?? new Date()), [todayProp]);
  const short = useMemo(() => new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }), [locale]);
  const rangeText = fmt?.range ?? ((r: DateRange) => (r.start ? `${short.format(r.start)} – ${r.end ? short.format(r.end) : ''}` : ''));
  const base = firstMonth ?? value.start ?? today;
  const months = Array.from({ length: monthCount }, (_, i) => new Date(base.getFullYear(), base.getMonth() + i, 1));
  const scroller = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  useLayoutEffect(() => {
    // Open on the start's month when it isn't the first listed.
    if (scrolled || !scroller.current || !value.start) return;
    const el = scroller.current.querySelector<HTMLElement>(`[data-month="${value.start.getFullYear()}-${value.start.getMonth()}"]`);
    if (el && el.offsetTop > 0) scroller.current.scrollTop = el.offsetTop;
    setScrolled(true);
  }, [scrolled, value.start]);

  const pick = (d: Date) => {
    if (!value.start || value.end || d < value.start) onChange({ start: d, end: null });
    else onChange({ start: value.start, end: d });
  };

  return (
    <div {...stylex.props(s.surface, sx)}>
      <div {...stylex.props(s.header)}>
        <div {...stylex.props(s.bar)}>
          {onClose ? (
            <IconButton aria-label={labels.close ?? 'Close'} onClick={onClose}>
              <Glyph d={CLOSE} />
            </IconButton>
          ) : (
            <span />
          )}
          {onSave && (
            <Button variant="text" onClick={onSave}>
              {labels.save ?? 'Save'}
            </Button>
          )}
        </div>
        <div {...stylex.props(s.title)}>
          <div {...stylex.props(s.titleText)}>
            <p {...stylex.props(typescale.labelLarge, s.label)}>{supportingText}</p>
            <p {...stylex.props(typescale.titleLarge, s.range)} aria-live="polite">
              {value.start ? rangeText(value) : placeholder}
            </p>
          </div>
          {onModeToggle && (
            <IconButton aria-label={labels.mode ?? 'Switch to text input'} onClick={onModeToggle}>
              <Glyph d={DATE_PICKER_ICONS.edit} />
            </IconButton>
          )}
        </div>
      </div>
      <div aria-hidden {...stylex.props(s.weekdays)}>
        {Array.from({ length: 7 }, (_, i) => (
          <span key={i} {...stylex.props(s.weekday)}>
            <span {...stylex.props(typescale.bodyLarge, textBox.hug)}>{f.weekdayNarrow(firstDayOfWeek + i)}</span>
          </span>
        ))}
      </div>
      <div ref={scroller} {...stylex.props(s.months)}>
        {months.map((m) => (
          <section key={m.getTime()} data-month={`${m.getFullYear()}-${m.getMonth()}`}>
            <h3 {...stylex.props(typescale.labelLarge, s.monthTitle)}>{f.monthYear(m)}</h3>
            <CalendarMonth
              month={m}
              range={value}
              today={today}
              formatter={f}
              firstDayOfWeek={firstDayOfWeek}
              weekdays={false}
              onPick={pick}
            />
          </section>
        ))}
      </div>
      {(onClear || onCancel || onConfirm) && (
        <div {...stylex.props(s.actions)}>
          {onClear && (
            <Button variant="text" onClick={onClear}>
              {labels.clear ?? 'Clear'}
            </Button>
          )}
          <span {...stylex.props(s.end)}>
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
          </span>
        </div>
      )}
    </div>
  );
}

export interface ModalDateRangePickerProps extends Omit<
  DateRangePickerProps,
  'onClose' | 'onSave' | 'onCancel' | 'onConfirm' | 'value' | 'onChange'
> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: DateRange;
  onChange: (range: DateRange) => void;
}

/** The full-screen range picker in a dialog; Save / OK commit, close / Cancel / Escape discard. */
export function ModalDateRangePicker({ open, onOpenChange, value, onChange, onClear, ...picker }: ModalDateRangePickerProps) {
  const portal = usePortalContainer();
  const [draft, setDraft] = useState<DateRange>(value);
  useLayoutEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);
  const commit = () => {
    onChange(draft);
    onOpenChange(false);
  };
  return (
    <BaseDialog.Root open={open} onOpenChange={(next) => onOpenChange(next)}>
      <BaseDialog.Portal container={portal}>
        <BaseDialog.Popup
          aria-label={typeof picker.supportingText === 'string' ? picker.supportingText : 'Select dates'}
          {...stylex.props(s.popup, dialogMotion.fadeRise)}
        >
          <DateRangePicker
            {...picker}
            value={draft}
            onChange={setDraft}
            onClose={() => onOpenChange(false)}
            onSave={commit}
            onClear={onClear ?? (() => setDraft({ start: null, end: null }))}
            onCancel={() => onOpenChange(false)}
            onConfirm={commit}
          />
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
