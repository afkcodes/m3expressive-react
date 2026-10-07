import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Checkbox, M3Provider, Radio, RadioGroup, Switch, typescale, type ColorSchemeMode } from '@m3x/react';
import { color } from '@m3x/react/tokens/color.stylex';

const s = stylex.create({
  page: { minHeight: '100vh', backgroundColor: color.surface, color: color.onSurface, padding: 32, display: 'grid', gap: 24, alignContent: 'start' },
  panel: { display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'end', padding: 16, borderRadius: 16, backgroundColor: color.surfaceContainer },
  grid: { display: 'grid', gridTemplateColumns: 'max-content repeat(3, 72px)', gap: 8, alignItems: 'center', justifyItems: 'center', padding: 16, borderRadius: 16, backgroundColor: color.surfaceContainerLow, justifySelf: 'start' },
  muted: { color: color.onSurfaceVariant },
  row: { display: 'flex', alignItems: 'center', gap: 4 },
  list: { display: 'grid', gap: 0, padding: 8, borderRadius: 16, backgroundColor: color.surfaceContainerLow, justifySelf: 'start' },
});

export function CheckboxPlayground() {
  const [scheme, setScheme] = useState<ColorSchemeMode>('light');
  const [items, setItems] = useState([true, false, false]);
  const all = items.every(Boolean);
  const some = items.some(Boolean) && !all;
  const field = { font: 'inherit', fontSize: 14, padding: '6px 8px', borderRadius: 8 } as const;

  return (
    <M3Provider colorScheme={scheme}>
      <main {...stylex.props(s.page)}>
        <p style={{ margin: 0 }}><a href="/" style={{ color: 'inherit' }}>← all</a></p>
        <h1 {...stylex.props(typescale.headlineMedium)} style={{ margin: 0 }}>Selection controls playground</h1>
        <section {...stylex.props(s.panel)}>
          <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
            <span {...stylex.props(s.muted)}>colour scheme</span>
            <select value={scheme} onChange={(e) => setScheme(e.target.value as ColorSchemeMode)} style={field}>
              <option>light</option><option>dark</option><option>system</option>
            </select>
          </label>
        </section>

        <h2 {...stylex.props(typescale.titleLarge)} style={{ margin: 0 }}>Try it — parent shows indeterminate</h2>
        <div {...stylex.props(s.list)}>
          <label {...stylex.props(s.row, typescale.bodyLarge)}>
            <Checkbox checked={all} indeterminate={some} onCheckedChange={(c) => setItems(items.map(() => c))} aria-label="All" />
            All items
          </label>
          {items.map((v, i) => (
            <label key={i} {...stylex.props(s.row, typescale.bodyLarge)} style={{ paddingInlineStart: 32 }}>
              <Checkbox checked={v} onCheckedChange={(c) => setItems(items.map((x, j) => (j === i ? c : x)))} aria-label={`Item ${i + 1}`} />
              Item {i + 1}
            </label>
          ))}
        </div>

        <h2 {...stylex.props(typescale.titleLarge)} style={{ margin: 0 }}>Radio group — arrow keys move the selection</h2>
        <RadioGroup defaultValue="b" aria-label="Plan" sx={s.list}>
          {[['a', 'Basic'], ['b', 'Standard'], ['c', 'Premium'], ['d', 'Unavailable']].map(([v, label]) => (
            <label key={v} {...stylex.props(s.row, typescale.bodyLarge)}>
              <Radio value={v} aria-label={label} disabled={v === 'd'} />
              {label}
            </label>
          ))}
        </RadioGroup>

        <h2 {...stylex.props(typescale.titleLarge)} style={{ margin: 0 }}>Switches — press and hold to see the handle grow</h2>
        <div {...stylex.props(s.list)} style={{ gap: 16, padding: 16 }}>
          {[['Wi-Fi', false, false], ['Bluetooth (icons)', true, true], ['Airplane mode', false, true], ['Locked', true, false, true]].map(([label, on, icons, dis]) => (
            <label key={String(label)} {...stylex.props(s.row, typescale.bodyLarge)} style={{ gap: 16, justifyContent: 'space-between', minWidth: 280 }}>
              {label}
              <Switch aria-label={String(label)} defaultChecked={!!on} icons={!!icons} disabled={!!dis} />
            </label>
          ))}
        </div>

        <h2 {...stylex.props(typescale.titleLarge)} style={{ margin: 0 }}>Every checkbox type (hover, press, Tab)</h2>
        <section {...stylex.props(s.grid)}>
          <span />
          {['enabled', 'error', 'disabled'].map((h) => (
            <span key={h} {...stylex.props(typescale.labelMedium, s.muted)}>{h}</span>
          ))}
          {(['unselected', 'selected', 'indeterminate'] as const).map((t) => (
            <Row key={t} label={t}>
              <Checkbox aria-label={t} defaultChecked={t === 'selected'} indeterminate={t === 'indeterminate'} />
              <Checkbox aria-label={`${t} error`} defaultChecked={t === 'selected'} indeterminate={t === 'indeterminate'} error />
              <Checkbox aria-label={`${t} disabled`} defaultChecked={t === 'selected'} indeterminate={t === 'indeterminate'} disabled />
            </Row>
          ))}
        </section>
      </main>
    </M3Provider>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <span {...stylex.props(typescale.labelLarge)} style={{ justifySelf: 'start' }}>{label}</span>
      {children}
    </>
  );
}
