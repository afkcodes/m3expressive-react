import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Button, M3Provider, ModalTimePicker, TimePicker, typescale, type ColorSchemeMode, type Time } from '@m3x/react';
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
    gap: 16,
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: color.surfaceContainer,
  },
  muted: { color: color.onSurfaceVariant },
});

const fmt = (t: Time, h24: boolean) =>
  h24
    ? `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`
    : `${t.hour % 12 || 12}:${String(t.minute).padStart(2, '0')} ${t.hour < 12 ? 'AM' : 'PM'}`;

/** The dial (vertical / horizontal, 12 / 24 hour) and the dialog with its keyboard mode. */
export function TimePickerPlayground() {
  const [scheme, setScheme] = useState<ColorSchemeMode>('light');
  const [h24, setH24] = useState(false);
  const [horizontal, setHorizontal] = useState(false);
  const [time, setTime] = useState<Time>({ hour: 9, minute: 30 });
  const [inline, setInline] = useState<Time>({ hour: 14, minute: 5 });
  const [open, setOpen] = useState(false);
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
          Time picker playground
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
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 14 }}>
            <input type="checkbox" checked={h24} onChange={(e) => setH24(e.target.checked)} /> 24 hour
          </label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 14 }}>
            <input type="checkbox" checked={horizontal} onChange={(e) => setHorizontal(e.target.checked)} /> horizontal
          </label>
          <Button onClick={() => setOpen(true)}>Open time picker</Button>
          <span {...stylex.props(typescale.bodyMedium, s.muted)}>dialog: {fmt(time, h24)}</span>
        </section>
        <TimePicker value={inline} onChange={setInline} is24Hour={h24} orientation={horizontal ? 'horizontal' : 'vertical'} />
        <span {...stylex.props(typescale.bodyMedium, s.muted)}>inline: {fmt(inline, h24)}</span>
        <ModalTimePicker
          open={open}
          onOpenChange={setOpen}
          value={time}
          onChange={setTime}
          is24Hour={h24}
          orientation={horizontal ? 'horizontal' : 'vertical'}
        />
      </main>
    </M3Provider>
  );
}
