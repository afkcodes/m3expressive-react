import { useState, type ReactNode } from 'react';
import {
  Button,
  CalendarDay,
  DateInputPanel,
  DatePicker,
  DateRangePicker,
  DockedDatePicker,
  ModalDatePicker,
  ModalDateRangePicker,
  type DateRange,
  DockedCalendar,
  DATE_PICKER_ICONS,
  IconButton,
  PickerMenuButton,
  TextField,
  YearChip,
  type CalendarDayKind,
  type DockedView,
} from '@m3x/react';
import * as stylex from '@stylexjs/stylex';
import { color } from '@m3x/react/tokens/color.stylex';
import { textFieldVars } from '@m3x/react/components/TextField/textField.stylex';
import { ForceState, type ForcedState } from '@m3x/react/testing';
import manifest from '../../../../figma/date-picker/manifest.json';
import assets from '../../../../figma/date-picker/assets.json';
import type { FixtureModule, FixtureVariant } from './types.ts';

const asForced = (s: string): ForcedState | undefined => (s === 'hovered' || s === 'focused' || s === 'pressed' ? s : undefined);
const DAY_KIND: Record<string, CalendarDayKind> = {
  default: 'default',
  today: 'today',
  selected: 'selected',
  'selected-middle': 'range',
  outside: 'outside',
  null: 'empty',
};

// The kit's calendar is fictitious ("August 2025" starting on a Tuesday): lay out July 2025 (which
// does) and pass the kit's labels through the formatter.
const KIT_MONTH = new Date(2025, 6, 1);
const kitFormatter = { monthYear: () => 'August 2025', selectedDate: () => 'Mon, Aug 17' };
const noop = () => {};

const fx = stylex.create({
  docked: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    paddingTop: 8,
    rowGap: 7,
    [textFieldVars.notchColor]: color.surface,
  },
  field: { width: 312 },
});

function docked(view: DockedView): ReactNode {
  const kit = view === 'day';
  return (
    <div {...stylex.props(fx.docked)}>
      <ForceState state="focused" caret={false}>
        <TextField
          variant="outlined"
          label="Date"
          value="08/17/2025"
          onValueChange={noop}
          supportingText="MM/DD/YYYY"
          sx={fx.field}
          trailingIcon={
            <ForceState state="pressed" ripplePath={(assets.ripples as Record<string, string>)['docked-trailing']}>
              <IconButton aria-label="Open calendar">
                <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor" aria-hidden style={{ display: 'block' }}>
                  <path d={DATE_PICKER_ICONS.today} />
                </svg>
              </IconButton>
            </ForceState>
          }
        />
      </ForceState>
      <DockedCalendar
        value={kit ? new Date(2024, 5, 17) : new Date(2025, 7, 17)}
        onChange={noop}
        month={kit ? new Date(2024, 5, 1) : new Date(2025, 7, 1)}
        today={new Date(2000, 0, 1)}
        view={view}
        yearRange={[2022, 2040]}
        formatter={{ monthShort: () => 'Aug', year: (y) => (kit ? '2025' : String(y)) }}
        onCancel={noop}
        onConfirm={noop}
      />
    </div>
  );
}

// The kit's range months are July / August 2025 laid out, labelled one month on.
const nextMonthLabel = (d: Date) =>
  new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date(d.getFullYear(), d.getMonth() + 1, 1));

function render(name: string): ReactNode {
  if (name === 'modal-range') {
    return (
      <DateRangePicker
        value={{ start: new Date(2025, 6, 17), end: new Date(2025, 6, 23) }}
        onChange={noop}
        firstMonth={KIT_MONTH}
        monthCount={3}
        today={new Date(2025, 6, 5)}
        formatter={{ monthYear: nextMonthLabel, range: () => 'Aug 17 – Aug 23' }}
        supportingText="Depart - Return dates"
        onClose={noop}
        onSave={noop}
        onModeToggle={noop}
        onClear={noop}
        onCancel={noop}
        onConfirm={noop}
      />
    );
  }
  if (name.startsWith('input-')) {
    const range = name === 'input-range';
    return (
      <ForceState state="focused" caret={false}>
        <DateInputPanel range={range} onModeToggle={noop} onCancel={noop} onConfirm={noop} />
      </ForceState>
    );
  }
  if (name.startsWith('docked-')) return docked(name.slice(7) as DockedView);
  if (name === 'modal-day' || name === 'modal-year') {
    return (
      <DatePicker
        value={new Date(2025, 6, 17)}
        onChange={noop}
        month={KIT_MONTH}
        today={new Date(2025, 6, 5)}
        view={name === 'modal-year' ? 'year' : 'day'}
        yearRange={[2021, 2035]}
        formatter={kitFormatter}
        onModeToggle={noop}
        onClear={noop}
        onCancel={noop}
        onConfirm={noop}
      />
    );
  }
  const p = name.split('-');
  const st = p[p.length - 1]!;
  const ripple = (assets.ripples as Record<string, string>)[name];
  const wrap = (node: ReactNode) => (
    <ForceState state={asForced(st)} ripplePath={st === 'pressed' ? ripple : undefined}>
      {node}
    </ForceState>
  );
  if (p[0] === 'day')
    return wrap(
      <CalendarDay label={p[1] === 'null' ? undefined : '00'} kind={DAY_KIND[p.slice(1, -1).join('-')]} disabled={st === 'disabled'} />,
    );
  if (p[0] === 'year') return wrap(<YearChip year="2025" selected={p[1] === 'sel'} disabled={st === 'disabled'} />);
  if (p[0] === 'menu') return wrap(<PickerMenuButton disabled={st === 'disabled'}>Label</PickerMenuButton>);
  return null;
}

/** Live: the modal picker, the docked picker and the range picker, with their committed values. */
function LivePickers() {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | null>(new Date(2025, 6, 17));
  const [docked, setDocked] = useState<Date | null>(null);
  const [rangeOpen, setRangeOpen] = useState(false);
  const [range, setRange] = useState<DateRange>({ start: null, end: null });
  const iso = (d: Date | null) => (d ? `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}` : 'none');
  return (
    <div style={{ display: 'grid', gap: 12, justifyItems: 'start' }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <Button onClick={() => setOpen(true)}>Pick date</Button>
        <Button variant="tonal" onClick={() => setRangeOpen(true)}>
          Pick range
        </Button>
      </div>
      <output data-date>{iso(date)}</output>
      <output data-range>{`${iso(range.start)}..${iso(range.end)}`}</output>
      <output data-docked>{iso(docked)}</output>
      <DockedDatePicker value={docked} onChange={setDocked} today={new Date(2025, 6, 5)} />
      <ModalDatePicker open={open} onOpenChange={setOpen} value={date} onChange={setDate} today={new Date(2025, 6, 5)} />
      <ModalDateRangePicker
        open={rangeOpen}
        onOpenChange={setRangeOpen}
        value={range}
        onChange={setRange}
        firstMonth={new Date(2025, 6, 1)}
        today={new Date(2025, 6, 5)}
      />
    </div>
  );
}

const fixture: FixtureModule = {
  component: 'date-picker',
  variants: Object.fromEntries([
    ['live', { width: 400, height: 300, render: () => <LivePickers /> } satisfies FixtureVariant],
    ...Object.entries(manifest.variants).map(([name, v]): [string, FixtureVariant] => {
      const [w, h] = v.size as [number, number];
      return [
        name,
        { node: v.node, width: w, height: h, render: () => <div style={{ width: w, height: h, display: 'flex' }}>{render(name)}</div> },
      ];
    }),
  ]),
};
export default fixture;
