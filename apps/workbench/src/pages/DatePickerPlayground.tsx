import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import {
  Button,
  DockedDatePicker,
  M3Provider,
  ModalDatePicker,
  ModalDateRangePicker,
  typescale,
  type ColorSchemeMode,
  type DateRange,
} from '@m3x/react';
import { color } from '@m3x/react/tokens/color.stylex';

const s = stylex.create({
  page: {
    minHeight: '100vh',
    backgroundColor: color.surface,
    color: color.onSurface,
    padding: 32,
    display: 'grid',
    gap: 24,
    alignContent: 'start',
  },
  panel: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: color.surfaceContainer,
  },
  muted: { color: color.onSurfaceVariant },
  row: { display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' },
});

const fmt = (d: Date | null) =>
  d ? d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '—';

/** Modal (calendar ⇄ input), docked and full-screen range date pickers. */
export function DatePickerPlayground() {
  const [scheme, setScheme] = useState<ColorSchemeMode>('light');
  const [modal, setModal] = useState(false);
  const [date, setDate] = useState<Date | null>(() => new Date());
  const [docked, setDocked] = useState<Date | null>(null);
  const [rangeOpen, setRangeOpen] = useState(false);
  const [range, setRange] = useState<DateRange>({ start: null, end: null });
  const field = { font: 'inherit', fontSize: 14, padding: '6px 8px', borderRadius: 8 } as const;
  return (
    <M3Provider colorScheme={scheme}>
      <main {...stylex.props(s.page)}>
        <p style={{ margin: 0 }}>
          <a href="/" style={{ color: 'inherit' }}>
            ← all
          </a>
        </p>
        <h1 {...stylex.props(typescale.headlineMedium)} style={{ margin: 0 }}>
          Date picker playground
        </h1>
        <section {...stylex.props(s.panel)}>
          <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
            <span {...stylex.props(s.muted)}>colour scheme</span>
            <select value={scheme} onChange={(e) => setScheme(e.target.value as ColorSchemeMode)} style={field}>
              <option>light</option>
              <option>dark</option>
              <option>system</option>
            </select>
          </label>
          <Button onClick={() => setModal(true)}>Modal date picker</Button>
          <Button variant="tonal" onClick={() => setRangeOpen(true)}>
            Full-screen range picker
          </Button>
        </section>
        <div {...stylex.props(s.row)}>
          <DockedDatePicker value={docked} onValueChange={setDocked} />
          <div {...stylex.props(typescale.bodyMedium, s.muted)}>
            <div>modal: {fmt(date)}</div>
            <div>docked: {fmt(docked)}</div>
            <div>
              range: {fmt(range.start)} – {fmt(range.end)}
            </div>
          </div>
        </div>
        <ModalDatePicker open={modal} onOpenChange={setModal} value={date} onValueChange={setDate} />
        <ModalDateRangePicker
          open={rangeOpen}
          onOpenChange={setRangeOpen}
          value={range}
          onValueChange={setRange}
          supportingText="Depart – Return dates"
        />
      </main>
    </M3Provider>
  );
}
