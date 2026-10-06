import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { M3Provider, RangeSlider, Slider, typescale, type ColorSchemeMode, type SliderSize } from '@m3x/react';
import { color } from '@m3x/react/tokens/color.stylex';

const s = stylex.create({
  page: { minHeight: '100vh', backgroundColor: color.surface, color: color.onSurface, padding: 32, display: 'grid', gap: 24, alignContent: 'start' },
  panel: { display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'end', padding: 16, borderRadius: 16, backgroundColor: color.surfaceContainer },
  stage: { display: 'grid', gap: 40, padding: '64px 32px 32px', borderRadius: 16, backgroundColor: color.surfaceContainerLow, maxWidth: 480 },
  vertical: { display: 'flex', gap: 48, height: 280, padding: '32px 32px 32px 96px', borderRadius: 16, backgroundColor: color.surfaceContainerLow },
  muted: { color: color.onSurfaceVariant },
});

/** Standard, centered and range sliders: sizes, orientation, discrete stops, disabled. */
export function SliderPlayground() {
  const [scheme, setScheme] = useState<ColorSchemeMode>('light');
  const [size, setSize] = useState<SliderSize>('medium');
  const [disabled, setDisabled] = useState(false);
  const [ticks, setTicks] = useState(false);
  const [v, setV] = useState(40);
  const [c, setC] = useState(10);
  const [r, setR] = useState<[number, number]>([20, 70]);
  const field = { font: 'inherit', fontSize: 14, padding: '6px 8px', borderRadius: 8 } as const;
  const step = ticks ? 10 : 1;
  return (
    <M3Provider colorScheme={scheme}>
      <main {...stylex.props(s.page)}>
        <p style={{ margin: 0 }}><a href="/" style={{ color: 'inherit' }}>← all</a></p>
        <h1 {...stylex.props(typescale.headlineMedium)} style={{ margin: 0 }}>Slider playground</h1>
        <section {...stylex.props(s.panel)}>
          <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
            <span {...stylex.props(s.muted)}>colour scheme</span>
            <select value={scheme} onChange={(e) => setScheme(e.target.value as ColorSchemeMode)} style={field}>
              <option>light</option><option>dark</option><option>system</option>
            </select>
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
            <span {...stylex.props(s.muted)}>size</span>
            <select value={size} onChange={(e) => setSize(e.target.value as SliderSize)} style={field}>
              {['xsmall', 'small', 'medium', 'large', 'xlarge'].map((o) => <option key={o}>{o}</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 14 }}>
            <input type="checkbox" checked={ticks} onChange={(e) => setTicks(e.target.checked)} /> discrete (step 10, stops)
          </label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 14 }}>
            <input type="checkbox" checked={disabled} onChange={(e) => setDisabled(e.target.checked)} /> disabled
          </label>
          <span {...stylex.props(s.muted)} style={{ fontSize: 13 }}>{`value ${v} · centered ${c} · range ${r.join('–')}`}</span>
        </section>
        <section {...stylex.props(s.stage)}>
          <Slider size={size} value={v} onValueChange={setV} step={step} ticks={ticks} disabled={disabled} aria-label="Volume" />
          <Slider size={size} centered min={-50} max={50} value={c} onValueChange={setC} step={step} ticks={ticks} disabled={disabled} aria-label="Balance" />
          <RangeSlider size={size} value={r} onValueChange={setR} step={step} ticks={ticks} disabled={disabled} aria-label="Price" />
        </section>
        <section {...stylex.props(s.vertical)}>
          <Slider orientation="vertical" size={size} value={v} onValueChange={setV} step={step} ticks={ticks} disabled={disabled} aria-label="Volume (vertical)" />
          <Slider orientation="vertical" size={size} centered min={-50} max={50} value={c} onValueChange={setC} step={step} ticks={ticks} disabled={disabled} aria-label="Balance (vertical)" />
        </section>
      </main>
    </M3Provider>
  );
}
