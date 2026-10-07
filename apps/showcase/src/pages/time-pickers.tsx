import { useState, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Button, ModalTimePicker, TimeInput, TimePicker, typescale, type Time } from '@m3x/react';
import { color } from '@m3x/react/tokens/color.stylex';
import { Demo, Page, Section } from '../ui/Page.tsx';
import { Icon } from '../ui/Icon.tsx';

const s = stylex.create({
  stack: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
    maxWidth: '100%',
  },
  value: { margin: 0, color: color.onSurfaceVariant, textAlign: 'center' },
  strong: { color: color.onSurface },
  scroll: { maxWidth: '100%', overflowX: 'auto' },
});

const pad = (n: number) => String(n).padStart(2, '0');
const fmt = (t: Time, is24Hour: boolean) =>
  is24Hour ? `${pad(t.hour)}:${pad(t.minute)}` : `${t.hour % 12 || 12}:${pad(t.minute)} ${t.hour < 12 ? 'AM' : 'PM'}`;

/** The value a demo picked, under its picker. */
function Value({ label = 'Selected', children }: { label?: string; children: ReactNode }) {
  return (
    <p {...stylex.props(typescale.bodyMedium, s.value)} aria-live="polite">
      {label}: <span {...stylex.props(s.strong)}>{children}</span>
    </p>
  );
}

/** A button that opens the time picker dialog, and the confirmed time. */
function ModalDemo({
  label,
  icon,
  is24Hour = false,
  orientation = 'vertical',
  initial,
}: {
  label: string;
  icon: string;
  is24Hour?: boolean;
  orientation?: 'vertical' | 'horizontal';
  initial: Time;
}) {
  const [open, setOpen] = useState(false);
  const [time, setTime] = useState<Time>(initial);
  return (
    <div {...stylex.props(s.stack)}>
      <Button variant="tonal" icon={<Icon name={icon} size={20} />} onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Value>{fmt(time, is24Hour)}</Value>
      <ModalTimePicker
        open={open}
        onOpenChange={setOpen}
        value={time}
        onValueChange={setTime}
        is24Hour={is24Hour}
        orientation={orientation}
      />
    </div>
  );
}

export default function TimePickersPage() {
  const [dial12, setDial12] = useState<Time>({ hour: 9, minute: 30 });
  const [dial24, setDial24] = useState<Time>({ hour: 17, minute: 45 });
  const [wide, setWide] = useState<Time>({ hour: 14, minute: 5 });
  const [minutes, setMinutes] = useState<Time>({ hour: 8, minute: 15 });
  const [input12, setInput12] = useState<Time>({ hour: 7, minute: 0 });
  const [input24, setInput24] = useState<Time>({ hour: 21, minute: 30 });

  return (
    <Page
      title="Time pickers"
      summary="Time pickers help people select a specific time: on a dial, or typed on the keyboard. 12 or 24 hour, vertical or horizontal; the dialog switches between dial and keyboard."
    >
      <Section
        title="Dialog"
        description="OK commits the time; Cancel or Escape keep the previous one. The keyboard button at the bottom left switches to text entry."
      >
        <Demo
          title="12 hour"
          code={`
const [open, setOpen] = useState(false);
const [time, setTime] = useState<Time>({ hour: 9, minute: 30 });

<Button onClick={() => setOpen(true)}>Set alarm</Button>
<ModalTimePicker open={open} onOpenChange={setOpen} value={time} onValueChange={setTime} />`}
        >
          <ModalDemo label="Set alarm" icon="alarm" initial={{ hour: 9, minute: 30 }} />
        </Demo>
        <Demo
          title="24 hour"
          code={`
<ModalTimePicker open={open} onOpenChange={setOpen} value={time} onValueChange={setTime} is24Hour />`}
        >
          <ModalDemo label="Set departure" icon="schedule" is24Hour initial={{ hour: 18, minute: 20 }} />
        </Demo>
        <Demo
          title="Horizontal"
          code={`
<ModalTimePicker
  open={open}
  onOpenChange={setOpen}
  value={time}
  onValueChange={setTime}
  orientation="horizontal"
/>`}
        >
          <ModalDemo
            label="Set reminder"
            icon="notifications"
            orientation="horizontal"
            initial={{ hour: 16, minute: 0 }}
          />
        </Demo>
      </Section>

      <Section
        title="Dial"
        description="Drag or tap the dial. Picking an hour moves on to the minutes; tap the hour or minute box to switch back."
      >
        <Demo
          title="12 hour"
          code={`
const [time, setTime] = useState<Time>({ hour: 9, minute: 30 });

<TimePicker value={time} onValueChange={setTime} />`}
        >
          <div {...stylex.props(s.stack)}>
            <TimePicker value={dial12} onValueChange={setDial12} />
            <Value>{fmt(dial12, false)}</Value>
          </div>
        </Demo>
        <Demo
          title="24 hour"
          code={`
<TimePicker value={time} onValueChange={setTime} is24Hour />`}
        >
          <div {...stylex.props(s.stack)}>
            <TimePicker value={dial24} onValueChange={setDial24} is24Hour />
            <Value>{fmt(dial24, true)}</Value>
          </div>
        </Demo>
        <Demo
          wide
          title="Horizontal"
          code={`
<TimePicker value={time} onValueChange={setTime} orientation="horizontal" />`}
        >
          <div {...stylex.props(s.stack)}>
            <div {...stylex.props(s.scroll)}>
              <TimePicker value={wide} onValueChange={setWide} orientation="horizontal" />
            </div>
            <Value>{fmt(wide, false)}</Value>
          </div>
        </Demo>
        <Demo
          title="Minutes first, no auto-switch"
          code={`
<TimePicker
  value={time}
  onValueChange={setTime}
  defaultSelection="minute"
  autoSwitchToMinute={false}
  headline="Snooze until"
/>`}
        >
          <div {...stylex.props(s.stack)}>
            <TimePicker
              value={minutes}
              onValueChange={setMinutes}
              defaultSelection="minute"
              autoSwitchToMinute={false}
              headline="Snooze until"
            />
            <Value>{fmt(minutes, false)}</Value>
          </div>
        </Demo>
      </Section>

      <Section title="Keyboard" description="Type the hour and minute; each complete entry is reported.">
        <Demo
          title="12 hour"
          code={`
const [time, setTime] = useState<Time>({ hour: 7, minute: 0 });

<TimeInput value={time} onValueChange={setTime} />`}
        >
          <div {...stylex.props(s.stack)}>
            <TimeInput value={input12} onValueChange={setInput12} />
            <Value>{fmt(input12, false)}</Value>
          </div>
        </Demo>
        <Demo
          title="24 hour"
          code={`
<TimeInput value={time} onValueChange={setTime} is24Hour />`}
        >
          <div {...stylex.props(s.stack)}>
            <TimeInput value={input24} onValueChange={setInput24} is24Hour />
            <Value>{fmt(input24, true)}</Value>
          </div>
        </Demo>
      </Section>
    </Page>
  );
}
