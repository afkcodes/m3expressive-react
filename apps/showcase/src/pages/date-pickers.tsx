import { useState, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import {
  Button,
  DatePicker,
  DateRangePicker,
  DockedDatePicker,
  ModalDatePicker,
  ModalDateRangePicker,
  typescale,
  type DatePickerView,
  type DateRange,
} from '@m3x/react';
import { color } from '@m3x/react/tokens/color.stylex';
import { shape } from '@m3x/react/tokens/shape.stylex';
import { Demo, Page, Section } from '../ui/Page.tsx';
import { Icon } from '../ui/Icon.tsx';

const s = stylex.create({
  // The pickers' day / dial labels carry z-index 1 with no stacking context of their own: isolate
  // them, or they paint over every popup on the page.
  stack: {
    isolation: 'isolate',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
  },
  value: { margin: 0, color: color.onSurfaceVariant, textAlign: 'center' },
  strong: { color: color.onSurface },
  frame: {
    width: 360,
    height: 560,
    maxWidth: '100%',
    borderRadius: shape.cornerLarge,
    overflow: 'hidden',
    outlineWidth: 1,
    outlineStyle: 'solid',
    outlineColor: color.outlineVariant,
  },
});

const dayFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const fmt = (d: Date | null) => (d ? dayFormat.format(d) : 'none');
const fmtRange = (r: DateRange) => (r.start || r.end ? `${fmt(r.start)} – ${fmt(r.end)}` : 'none');

/** The value a demo picked, under its picker. */
function Value({ label = 'Selected', children }: { label?: string; children: ReactNode }) {
  return (
    <p {...stylex.props(typescale.bodyMedium, s.value)} aria-live="polite">
      {label}: <span {...stylex.props(s.strong)}>{children}</span>
    </p>
  );
}

/** A button that opens a modal date picker, and the confirmed date. */
function ModalDemo({ view, label, icon }: { view: DatePickerView; label: string; icon: string }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | null>(null);
  return (
    <div {...stylex.props(s.stack)}>
      <Button variant="tonal" icon={<Icon name={icon} size={20} />} onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Value>{fmt(date)}</Value>
      <ModalDatePicker
        open={open}
        onOpenChange={setOpen}
        value={date}
        onValueChange={setDate}
        defaultView={view}
        yearRange={[1940, 2060]}
      />
    </div>
  );
}

export default function DatePickersPage() {
  const [inline, setInline] = useState<Date | null>(() => new Date());
  const [monday, setMonday] = useState<Date | null>(null);
  const [docked, setDocked] = useState<Date | null>(null);
  const [dockedGb, setDockedGb] = useState<Date | null>(null);
  const [rangeOpen, setRangeOpen] = useState(false);
  const [range, setRange] = useState<DateRange>({ start: null, end: null });
  const [inlineRange, setInlineRange] = useState<DateRange>({ start: null, end: null });

  return (
    <Page
      title="Date pickers"
      summary="Date pickers let people select a date or a range of dates. Modal pickers confirm with OK, the docked picker types or picks in place, and the full-screen picker selects a range."
    >
      <Section
        title="Modal"
        description="A dialog: pick a day and confirm with OK; Cancel or Escape keep the previous date. Tap the month and year to jump to the year grid."
      >
        <Demo
          title="Calendar"
          code={`
const [open, setOpen] = useState(false);
const [date, setDate] = useState<Date | null>(null);

<Button onClick={() => setOpen(true)}>Pick a date</Button>
<ModalDatePicker open={open} onOpenChange={setOpen} value={date} onValueChange={setDate} />`}
        >
          <ModalDemo view="day" label="Pick a date" icon="calendar_month" />
        </Demo>
        <Demo
          title="Opening on the year grid"
          code={`
<ModalDatePicker
  open={open}
  onOpenChange={setOpen}
  value={date}
  onValueChange={setDate}
  defaultView="year"
  yearRange={[1940, 2060]}
/>`}
        >
          <ModalDemo view="year" label="Pick a birth year" icon="cake" />
        </Demo>
        <Demo
          title="Text input"
          code={`
// The pencil in the header switches to text input
// (and the calendar icon switches back).
<ModalDatePicker open={open} onOpenChange={setOpen} value={date} onValueChange={setDate} />`}
        >
          <div {...stylex.props(s.stack)}>
            <p {...stylex.props(typescale.bodyMedium, s.value)}>
              Open the picker, then press the pencil in its header to type a date.
            </p>
            <ModalDemo view="day" label="Enter a date" icon="edit_calendar" />
          </div>
        </Demo>
      </Section>

      <Section title="Inline" description="The same calendar without the dialog, for a page or a side panel.">
        <Demo
          title="Calendar"
          code={`
const [date, setDate] = useState<Date | null>(() => new Date());

<DatePicker value={date} onValueChange={setDate} />`}
        >
          <div {...stylex.props(s.stack)}>
            <DatePicker value={inline} onValueChange={setInline} />
            <Value>{fmt(inline)}</Value>
          </div>
        </Demo>
        <Demo
          title="Week starting Monday, with actions"
          code={`
<DatePicker
  value={date}
  onValueChange={setDate}
  firstDayOfWeek={1}
  locale="en-GB"
  supportingText="Delivery date"
  onClear={() => setDate(null)}
/>`}
        >
          <div {...stylex.props(s.stack)}>
            <DatePicker
              value={monday}
              onValueChange={setMonday}
              firstDayOfWeek={1}
              locale="en-GB"
              supportingText="Delivery date"
              onClear={() => setMonday(null)}
            />
            <Value>{fmt(monday)}</Value>
          </div>
        </Demo>
      </Section>

      <Section
        title="Docked"
        description="A text field with a calendar that drops down from it: type a date, or open the calendar and use its month and year menus."
      >
        <Demo
          title="Default"
          code={`
const [date, setDate] = useState<Date | null>(null);

<DockedDatePicker value={date} onValueChange={setDate} />`}
        >
          <div {...stylex.props(s.stack)}>
            <DockedDatePicker value={docked} onValueChange={setDocked} />
            <Value>{fmt(docked)}</Value>
          </div>
        </Demo>
        <Demo
          title="Localised format"
          code={`
<DockedDatePicker
  label="Start date"
  locale="en-GB"
  firstDayOfWeek={1}
  value={date}
  onValueChange={setDate}
/>`}
        >
          <div {...stylex.props(s.stack)}>
            <DockedDatePicker
              label="Start date"
              locale="en-GB"
              firstDayOfWeek={1}
              value={dockedGb}
              onValueChange={setDockedGb}
            />
            <Value>{fmt(dockedGb)}</Value>
          </div>
        </Demo>
      </Section>

      <Section
        title="Date range"
        description="Months scroll vertically; the first tap sets the start, the second the end. Save or OK commits the range."
      >
        <Demo
          title="Full-screen"
          code={`
const [open, setOpen] = useState(false);
const [range, setRange] = useState<DateRange>({ start: null, end: null });

<Button onClick={() => setOpen(true)}>Plan a trip</Button>
<ModalDateRangePicker
  open={open}
  onOpenChange={setOpen}
  value={range}
  onValueChange={setRange}
  supportingText="Depart – Return dates"
/>`}
        >
          <div {...stylex.props(s.stack)}>
            <Button icon={<Icon name="date_range" size={20} />} onClick={() => setRangeOpen(true)}>
              Plan a trip
            </Button>
            <Value label="Trip">{fmtRange(range)}</Value>
            <ModalDateRangePicker
              open={rangeOpen}
              onOpenChange={setRangeOpen}
              value={range}
              onValueChange={setRange}
              supportingText="Depart – Return dates"
            />
          </div>
        </Demo>
        <Demo
          title="In a container"
          code={`
<div style={{ width: 360, height: 560 }}>
  <DateRangePicker
    value={range}
    onValueChange={setRange}
    monthCount={6}
    onClear={() => setRange({ start: null, end: null })}
  />
</div>`}
        >
          <div {...stylex.props(s.stack)}>
            <div {...stylex.props(s.frame)}>
              <DateRangePicker
                value={inlineRange}
                onValueChange={setInlineRange}
                monthCount={6}
                onClear={() => setInlineRange({ start: null, end: null })}
              />
            </div>
            <Value label="Range">{fmtRange(inlineRange)}</Value>
          </div>
        </Demo>
      </Section>
    </Page>
  );
}
