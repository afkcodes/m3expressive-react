import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { color } from '../../tokens/color.stylex.ts';
import { typescale } from '../../tokens/typescale.ts';
import { useSpringToken } from '../../motion/context.tsx';
import { animateSpring, type SpringAnimation } from '../../motion/animate.ts';
import { usePortalContainer } from '../../theme/portal.tsx';
import { Button } from '../Button/Button.tsx';
import { IconButton } from '../IconButton/IconButton.tsx';
import { scrim } from '../../primitives/scrim.ts';
import { dialogMotion } from '../../primitives/dialogMotion.ts';
import { PickerMenuButton, YearChip } from './cells.tsx';
import { CalendarMonth } from './CalendarMonth.tsx';
import { MonthPager } from './MonthPager.tsx';
import { DATE_PICKER_ICONS } from './icons.ts';
import { DateInputPanel } from './DateInput.tsx';
import { addMonths, DEFAULT_YEAR_RANGE, defaultFormatter, makeDate, type DatePickerFormatter } from './calendar.ts';
import { useToday } from './useToday.ts';

/*
 * Figma kit, "Modal date picker" (51954:18136; Compose DatePicker / DatePickerDialog).
 *   360px, Surface Container High, 28px corners. Header 120px (16px top, 24px start, 12px end /
 *   bottom; Outline Variant rule under it): label-large On Surface Variant "Select date", the
 *   headline-large On Surface date 36px below, the mode button at the bottom end. Selection row
 *   56px: the month menu button (16px in) and previous / next buttons (12px from the end).
 *   Calendar: 12px sides, weekday row + weeks of 48px cells. Actions 60px: Clear at the start,
 *   Cancel / OK at the end (12px sides, 4px top, 8px bottom). Year view: the menu button's arrow
 *   flips, years in three 8px-spaced columns (24px sides, 8px top) scroll in a 280px area, and a
 *   rule sits above the actions.
 * Motion (Compose DatePicker): the dialog uses the M3 dialog fade + scale (./Dialog/dialogMotion);
 *   previous / next slide the month grids one width and a horizontal drag swipes months
 *   (./MonthPager); the year list expands over the calendar from its top edge with its content
 *   anchored at the bottom (expandVertically) while fading in from 60% (both default effects) and
 *   shrinks back on default effects while fading out on fast effects (DatePicker.kt
 *   YearPicker AnimatedVisibility); our kit's year list is shorter than the calendar, so the area
 *   resizes on the same spring. The menu button's arrow flips without animation, as in Compose.
 */
const ICONS = DATE_PICKER_ICONS;

const Glyph = ({ d }: { d: string }) => (
  <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor" aria-hidden style={{ display: 'block' }}>
    <path d={d} />
  </svg>
);

const s = stylex.create({
  surface: {
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    width: 360,
    overflow: 'hidden',
    color: color.onSurface,
    backgroundColor: color.surfaceContainerHigh,
    borderRadius: 28,
  },
  header: {
    display: 'flex',
    alignItems: 'flex-end',
    columnGap: 8,
    flexShrink: 0,
    height: 120,
    boxSizing: 'border-box',
    paddingBlock: '16px 12px',
    paddingInline: '24px 12px',
    // Figma strokes don't take layout space: the rule is an inset shadow.
    boxShadow: `inset 0 -1px 0 ${color.outlineVariant}`,
  },
  headerText: {
    display: 'flex',
    flexDirection: 'column',
    rowGap: 36,
    flexGrow: 1,
    minWidth: 0,
    alignSelf: 'flex-start',
  },
  // The kit's label box is 16px tall with a 20px line: the text overflows it downwards.
  supporting: { height: 16, margin: 0, color: color.onSurfaceVariant },
  headline: { margin: 0, color: color.onSurface, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  selection: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
    height: 56,
    boxSizing: 'border-box',
    paddingInline: '16px 12px',
  },
  controls: { display: 'flex' },
  grid: { display: 'flex', flexDirection: 'column', flexShrink: 0, paddingInline: 12 },
  area: { position: 'relative' },
  // The year list over the calendar while it expands / shrinks (content anchored at the bottom).
  yearsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    backgroundColor: color.surfaceContainerHigh,
  },
  years: {
    height: 280,
    flexShrink: 0,
    overflowY: 'auto',
    scrollbarWidth: 'none',
    '::-webkit-scrollbar': { display: 'none' },
  },
  yearGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    columnGap: 8,
    paddingBlock: 8,
    paddingInline: 24,
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
  },
  actionsRule: { boxShadow: `inset 0 1px 0 ${color.outlineVariant}` },
  end: { display: 'flex', columnGap: 8, marginInlineStart: 'auto' },
  popup: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    translate: '-50% -50%',
    outlineStyle: 'none',
  },
});

export type DatePickerView = 'day' | 'year';

export interface DatePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  /** The displayed month (any day in it). Uncontrolled from `value` / today when omitted. */
  month?: Date;
  onMonthChange?: (month: Date) => void;
  view?: DatePickerView;
  onViewChange?: (view: DatePickerView) => void;
  today?: Date;
  /** Years offered in the year view (inclusive). */
  yearRange?: [number, number];
  /** 0 = Sunday (default). */
  firstDayOfWeek?: number;
  locale?: string;
  /** Overrides for the labels (month / headline / weekday / year …). */
  formatter?: Partial<DatePickerFormatter> & { year?: (year: number) => string };
  supportingText?: ReactNode;
  /** Headline when nothing is selected. */
  placeholder?: ReactNode;
  /** The header's mode button (switch to text input); hidden when omitted. */
  onModeToggle?: () => void;
  onClear?: () => void;
  onCancel?: () => void;
  onConfirm?: () => void;
  labels?: { clear?: string; cancel?: string; confirm?: string; previous?: string; next?: string; mode?: string };
  sx?: StyleXStyles;
}

/** The date picker surface (the modal's content; see `ModalDatePicker`). */
export function DatePicker({
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
  formatter: fmt,
  supportingText = 'Select date',
  placeholder = 'Select date',
  onModeToggle,
  onClear,
  onCancel,
  onConfirm,
  labels = {},
  sx,
}: DatePickerProps) {
  const f = useMemo(() => ({ ...defaultFormatter(locale), ...fmt }), [locale, fmt]);
  const today = useToday(todayProp);
  const [innerMonth, setInnerMonth] = useState(() =>
    makeDate((value ?? today).getFullYear(), (value ?? today).getMonth(), 1),
  );
  const month = monthProp ? makeDate(monthProp.getFullYear(), monthProp.getMonth(), 1) : innerMonth;
  const setMonth = (m: Date) => {
    if (!monthProp) setInnerMonth(m);
    onMonthChange?.(m);
  };
  const [innerView, setInnerView] = useState<DatePickerView>('day');
  const view = viewProp ?? innerView;
  const setView = (v: DatePickerView) => {
    if (!viewProp) setInnerView(v);
    onViewChange?.(v);
  };

  // Day ⇄ year: the year list expands over the calendar / shrinks away before the rest state.
  type Phase = 'day' | 'year' | 'to-year' | 'to-day';
  const [phase, setPhase] = useState<Phase>(view);
  if (view === 'year' && (phase === 'day' || phase === 'to-day')) setPhase('to-year');
  if (view === 'day' && (phase === 'year' || phase === 'to-year')) setPhase('to-day');
  const area = useRef<HTMLDivElement>(null);
  const yearsBox = useRef<HTMLDivElement>(null);
  const defaultEffects = useSpringToken('default-effects');
  const fastEffects = useSpringToken('fast-effects');
  useLayoutEffect(() => {
    if (phase !== 'to-year' && phase !== 'to-day') return undefined;
    const a = area.current;
    const box = yearsBox.current;
    const years = yearsRef.current;
    const calendar = a?.firstElementChild as HTMLElement | null;
    if (!a || !box || !years || !calendar || !defaultEffects || !fastEffects) return undefined;
    const entering = phase === 'to-year';
    const calH = calendar.offsetHeight;
    const yearsH = years.offsetHeight;
    // Interrupted: carry on from where the last run left the inline styles.
    const num = (v: string, fallback: number) => (v ? parseFloat(v) : fallback);
    const boxFrom = num(box.style.height, entering ? 0 : yearsH);
    const areaFrom = num(a.style.height, entering ? calH : yearsH);
    const alphaFrom = num(box.style.opacity, entering ? 0.6 : 1);
    const [boxTo, areaTo, alphaTo] = entering ? [yearsH, yearsH, 1] : [0, calH, 0];
    a.style.overflow = 'hidden';
    const running: SpringAnimation[] = [];
    let left = 2;
    const finish = () => {
      if (--left > 0) return;
      a.style.height = '';
      a.style.overflow = '';
      box.style.height = '';
      box.style.opacity = '';
      setPhase(entering ? 'year' : 'day');
    };
    const size = (t: number) => {
      box.style.height = `${boxFrom + (boxTo - boxFrom) * t}px`;
      a.style.height = `${areaFrom + (areaTo - areaFrom) * t}px`;
    };
    size(0);
    box.style.opacity = String(alphaFrom);
    // expandVertically / shrinkVertically: default effects; fadeIn default effects (from 60%), fadeOut fast effects.
    running.push(
      animateSpring({ spring: defaultEffects, from: 0, to: 1, precision: 0.001, onUpdate: size, onComplete: finish }),
    );
    running.push(
      animateSpring({
        spring: entering ? defaultEffects : fastEffects,
        from: alphaFrom,
        to: alphaTo,
        onUpdate: (v) => (box.style.opacity = String(v)),
        onComplete: finish,
      }),
    );
    return () => running.forEach((r) => r.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // A year pick jumps to its month (Compose scrollToItem); one-month steps slide.
  const jump = useRef(false);
  useEffect(() => {
    jump.current = false;
  });

  const yearLabel = fmt?.year ?? ((y: number) => String(y));
  const yearsRef = useRef<HTMLDivElement>(null);
  const shownYear = month.getFullYear();
  useLayoutEffect(() => {
    if (view !== 'year' || !yearsRef.current) return;
    const sel = yearsRef.current.querySelector<HTMLElement>(`[data-year="${shownYear}"]`);
    // Bring the displayed year into view (top-aligned rows, like the kit's list).
    if (sel) {
      const row = sel.closest('span')!;
      const top = row.offsetTop - 8;
      if (top + row.offsetHeight > yearsRef.current.clientHeight) yearsRef.current.scrollTop = top;
    }
  }, [view, shownYear]);

  // The year grid is a listbox with one tab stop (the displayed year, kept inside the range) that
  // arrows move: ±1 year, ±1 row of three; Home / End jump to the first / last year.
  const [firstYear, lastYear] = yearRange;
  const [focusYear, setFocusYear] = useState<number | null>(null);
  if (view !== 'year' && focusYear !== null) setFocusYear(null);
  const tabYear = Math.min(lastYear, Math.max(firstYear, focusYear ?? shownYear));
  const onYearKey = (e: KeyboardEvent) => {
    const steps: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3 };
    const next =
      e.key in steps ? tabYear + steps[e.key]! : e.key === 'Home' ? firstYear : e.key === 'End' ? lastYear : null;
    if (next === null) return;
    e.preventDefault();
    if (next < firstYear || next > lastYear) return;
    setFocusYear(next);
    yearsRef.current?.querySelector<HTMLElement>(`[data-year="${next}"]`)?.focus();
  };

  return (
    <div {...stylex.props(s.surface, sx)}>
      <div data-dp-header="" {...stylex.props(s.header)}>
        <div {...stylex.props(s.headerText)}>
          <p {...stylex.props(typescale.labelLarge, s.supporting)}>{supportingText}</p>
          <p {...stylex.props(typescale.headlineLarge, s.headline)} aria-live="polite">
            {value ? f.selectedDate(value) : placeholder}
          </p>
        </div>
        {onModeToggle && (
          <IconButton aria-label={labels.mode ?? 'Switch to text input'} onClick={onModeToggle}>
            <Glyph d={ICONS.edit} />
          </IconButton>
        )}
      </div>
      <div data-dp-body="">
        <div {...stylex.props(s.selection)}>
          <PickerMenuButton
            open={view === 'year'}
            onClick={() => setView(view === 'year' ? 'day' : 'year')}
            aria-label={`${f.monthYear(month)}, select year`}
          >
            {f.monthYear(month)}
          </PickerMenuButton>
          {view === 'day' && (
            <div {...stylex.props(s.controls)}>
              <IconButton
                aria-label={labels.previous ?? 'Previous month'}
                onClick={() => setMonth(addMonths(month, -1))}
              >
                <Glyph d={ICONS.prev} />
              </IconButton>
              <IconButton aria-label={labels.next ?? 'Next month'} onClick={() => setMonth(addMonths(month, 1))}>
                <Glyph d={ICONS.next} />
              </IconButton>
            </div>
          )}
        </div>
        <div ref={area} {...stylex.props(s.area)}>
          {phase !== 'year' && (
            <MonthPager month={month} onSwipe={setMonth} instant={jump.current} inert={view === 'year'}>
              {(m, copy) => (
                <CalendarMonth
                  month={m}
                  value={value}
                  today={today}
                  formatter={f}
                  firstDayOfWeek={firstDayOfWeek}
                  onPick={copy ? () => {} : onChange}
                  onNavigate={copy ? undefined : setMonth}
                  sx={s.grid}
                />
              )}
            </MonthPager>
          )}
          {phase !== 'day' && (
            <div
              ref={yearsBox}
              inert={view !== 'year' || undefined}
              {...stylex.props(phase !== 'year' && s.yearsOverlay)}
            >
              <div ref={yearsRef} {...stylex.props(s.years)}>
                <div role="listbox" aria-label="Year" onKeyDown={onYearKey} {...stylex.props(s.yearGrid)}>
                  {Array.from({ length: lastYear - firstYear + 1 }, (_, i) => firstYear + i).map((y) => (
                    <YearChip
                      key={y}
                      option
                      year={yearLabel(y)}
                      selected={y === shownYear}
                      data-year={y}
                      tabIndex={y === tabYear ? 0 : -1}
                      onClick={() => {
                        jump.current = true;
                        setMonth(makeDate(y, month.getMonth(), 1));
                        setView('day');
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <div data-dp-actions="" {...stylex.props(s.actions, view === 'year' && s.actionsRule)}>
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
    </div>
  );
}

export interface ModalDatePickerProps extends Omit<DatePickerProps, 'onCancel' | 'onConfirm' | 'value' | 'onChange'> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The confirmed date. */
  value: Date | null;
  /** Called with the picked date when OK is pressed (Cancel / Escape keep the old value). */
  onChange: (date: Date | null) => void;
}

/** A mode-switch slot: the leaving panel sits over the entering one until the motion ends. */
const modeStyles = stylex.create({
  wrap: { position: 'relative' },
  leaving: { position: 'absolute', top: 0, left: 0, pointerEvents: 'none' },
});

/** The parallax offset of DatePicker.kt's display-mode switch (−48dp). */
const PARALLAX = -48;

/**
 * Picker ⇄ input (Compose DatePicker AnimatedContent, DatePicker.kt): to input, the text field
 * slides up from its full height (default spatial) and fades in (default effects) while the
 * calendar fades out (fast effects) and slides to −48dp; back to the picker mirrors it (the
 * calendar from −48dp, the field down by its height); the size changes on default spatial with a
 * clip. Only the bodies move — the headers and actions switch at once (Compose keeps its header
 * outside the transition; the kit's two headers differ).
 */
function useModeTransition(
  wrap: RefObject<HTMLDivElement | null>,
  leaving: 'picker' | 'input' | null,
  onDone: () => void,
) {
  const spatial = useSpringToken('default-spatial');
  const defaultEffects = useSpringToken('default-effects');
  const fastEffects = useSpringToken('fast-effects');
  const done = useRef(onDone);
  done.current = onDone;
  useLayoutEffect(() => {
    const w = wrap.current;
    if (!leaving || !w || !defaultEffects || !fastEffects) return undefined;
    const outSlot = w.querySelector<HTMLElement>(`:scope > [data-mode-slot="${leaving}"]`);
    const inSlot = w.querySelector<HTMLElement>(`:scope > [data-mode-slot]:not([data-mode-slot="${leaving}"])`);
    const outPanel = outSlot?.firstElementChild as HTMLElement | null;
    const inPanel = inSlot?.firstElementChild as HTMLElement | null;
    if (!outSlot || !inSlot || !outPanel || !inPanel) return undefined;
    const q = (el: HTMLElement, part: string) => el.querySelector<HTMLElement>(`[data-dp-${part}]`);
    const outBody = q(outPanel, 'body');
    const inBody = q(inPanel, 'body');
    const toInput = leaving === 'picker';
    const [w0, h0, w1, h1] = [outSlot.offsetWidth, outSlot.offsetHeight, inSlot.offsetWidth, inSlot.offsetHeight];
    const bg = getComputedStyle(inPanel).backgroundColor;
    // One surface for both: the panels go transparent over the clipping wrapper.
    Object.assign(w.style, {
      overflow: 'hidden',
      borderRadius: getComputedStyle(inPanel).borderTopLeftRadius,
      backgroundColor: bg,
    });
    for (const p of [outPanel, inPanel]) p.style.backgroundColor = 'transparent';
    for (const part of ['header', 'actions']) {
      const el = q(outPanel, part);
      if (el) el.style.visibility = 'hidden';
    }
    for (const b of [outBody, inBody]) if (b) b.style.overflow = 'hidden';
    const slide = (body: HTMLElement | null, y: number) => {
      if (body) for (const c of body.children) (c as HTMLElement).style.transform = y ? `translateY(${y}px)` : '';
    };
    const inFrom = toInput ? (inBody?.offsetHeight ?? 0) : PARALLAX;
    const outTo = toInput ? PARALLAX : (outBody?.offsetHeight ?? 0);
    const running: { stop(): void }[] = [];
    let left = 0;
    const finish = () => {
      if (--left > 0) return;
      for (const k of ['overflow', 'borderRadius', 'backgroundColor', 'width', 'height'] as const) w.style[k] = '';
      inPanel.style.backgroundColor = '';
      if (inActions) inActions.style.transform = '';
      if (inBody) {
        inBody.style.overflow = '';
        inBody.style.opacity = '';
        slide(inBody, 0);
      }
      done.current();
    };
    const run = (
      spec: Parameters<typeof animateSpring>[0]['spring'] | null,
      from: number,
      to: number,
      onUpdate: (v: number) => void,
    ) => {
      if (!spec) {
        onUpdate(to);
        return;
      }
      left++;
      running.push(animateSpring({ spring: spec, from, to, precision: 0.001, onUpdate, onComplete: finish }));
    };
    // Size (SizeTransform, clip = true); the actions ride the bottom edge (Compose's dialog buttons
    // sit below the animating content).
    const inActions = q(inPanel, 'actions');
    run(spatial, 0, 1, (t) => {
      const h = h0 + (h1 - h0) * t;
      w.style.width = `${w0 + (w1 - w0) * t}px`;
      w.style.height = `${h}px`;
      if (inActions) inActions.style.transform = `translateY(${h - h1}px)`;
    });
    if (!spatial) {
      w.style.width = '';
      w.style.height = '';
    }
    // Bodies: slides (default spatial) and fades (in: default effects, out: fast effects).
    run(spatial, 0, 1, (t) => {
      slide(inBody, inFrom * (1 - t));
      slide(outBody, outTo * t);
    });
    if (inBody) inBody.style.opacity = '0';
    run(defaultEffects, 0, 1, (v) => inBody && (inBody.style.opacity = String(v)));
    run(fastEffects, 1, 0, (v) => outBody && (outBody.style.opacity = String(v)));
    if (left === 0) finish();
    return () => running.forEach((r) => r.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaving]);
}

/** The modal date picker: pick a day, confirm with OK (Compose DatePickerDialog). */
export function ModalDatePicker({ open, onOpenChange, value, onChange, onClear, ...picker }: ModalDatePickerProps) {
  const portal = usePortalContainer();
  const [draft, setDraft] = useState<Date | null>(value);
  // Calendar ⇄ text input (Compose DisplayMode.Picker / Input), from the header buttons.
  const [mode, setMode] = useState<'picker' | 'input'>('picker');
  const [leaving, setLeaving] = useState<'picker' | 'input' | null>(null);
  // The calendar's month and view live here so the leaving copy keeps them.
  const [innerMonth, setInnerMonth] = useState<Date | undefined>(undefined);
  const [innerView, setInnerView] = useState<DatePickerView>('day');
  // Each opening starts from the confirmed value on the calendar; a parent re-render while open
  // (a new `value` object) keeps the pick in progress.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setDraft(value);
      setMode('picker');
      setLeaving(null);
      setInnerMonth(undefined);
      setInnerView('day');
    }
  }
  const wrap = useRef<HTMLDivElement>(null);
  useModeTransition(wrap, leaving, () => setLeaving(null));
  const switchTo = (next: 'picker' | 'input') => {
    if (next === mode) return;
    setLeaving(mode);
    setMode(next);
  };
  const confirm = () => {
    onChange(draft);
    onOpenChange(false);
  };
  const shows = (m: 'picker' | 'input') => mode === m || leaving === m;
  const slot = (m: 'picker' | 'input', panel: ReactNode) =>
    shows(m) && (
      <div
        key={m}
        data-mode-slot={m}
        inert={leaving === m || undefined}
        {...stylex.props(leaving === m && modeStyles.leaving)}
      >
        {panel}
      </div>
    );
  return (
    <BaseDialog.Root open={open} onOpenChange={(next) => onOpenChange(next)}>
      <BaseDialog.Portal container={portal}>
        <BaseDialog.Backdrop {...stylex.props(scrim.backdrop)} />
        <BaseDialog.Popup
          aria-label={typeof picker.supportingText === 'string' ? picker.supportingText : 'Select date'}
          {...stylex.props(s.popup, dialogMotion.fadeScale)}
        >
          <div ref={wrap} {...stylex.props(modeStyles.wrap)}>
            {slot(
              'picker',
              <DatePicker
                month={innerMonth}
                onMonthChange={setInnerMonth}
                view={innerView}
                onViewChange={setInnerView}
                {...picker}
                value={draft}
                onChange={setDraft}
                onModeToggle={() => switchTo('input')}
                onClear={onClear ?? (() => setDraft(null))}
                onCancel={() => onOpenChange(false)}
                onConfirm={confirm}
              />,
            )}
            {slot(
              'input',
              <DateInputPanel
                value={draft}
                onChange={setDraft}
                locale={picker.locale}
                yearRange={picker.yearRange}
                formatter={picker.formatter}
                supportingText={picker.supportingText}
                autoFocus
                onModeToggle={() => switchTo('picker')}
                onCancel={() => onOpenChange(false)}
                onConfirm={confirm}
              />,
            )}
          </div>
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
