import { useEffect, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Button, CircularProgress, LinearProgress, LoadingIndicator, M3Provider, typescale, type ColorSchemeMode, type ProgressThickness, type ProgressType } from '@m3x/react';
import { color } from '@m3x/react/tokens/color.stylex';

const s = stylex.create({
  page: { minHeight: '100vh', backgroundColor: color.surface, color: color.onSurface, padding: 32, display: 'grid', gap: 24, alignContent: 'start' },
  panel: { display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'end', padding: 16, borderRadius: 16, backgroundColor: color.surfaceContainer },
  stage: { display: 'grid', gap: 24, padding: 32, borderRadius: 16, backgroundColor: color.surfaceContainerLow, maxWidth: 560 },
  row: { display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap' },
  muted: { color: color.onSurfaceVariant },
});

/** Linear / circular progress and the loading indicator, determinate and indeterminate. */
export function ProgressPlayground() {
  const [scheme, setScheme] = useState<ColorSchemeMode>('light');
  const [type, setType] = useState<ProgressType>('wave');
  const [thickness, setThickness] = useState<ProgressThickness>(4);
  const [value, setValue] = useState(50);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setValue((v) => (v >= 100 ? 0 : Math.min(100, v + 7))), 600);
    return () => clearInterval(id);
  }, [running]);
  const field = { font: 'inherit', fontSize: 14, padding: '6px 8px', borderRadius: 8 } as const;
  const label = (text: string, control: React.ReactNode) => (
    <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
      <span {...stylex.props(s.muted)}>{text}</span>
      {control}
    </label>
  );
  return (
    <M3Provider colorScheme={scheme}>
      <main {...stylex.props(s.page)}>
        <p style={{ margin: 0 }}><a href="/" style={{ color: 'inherit' }}>← all</a></p>
        <h1 {...stylex.props(typescale.headlineMedium)} style={{ margin: 0 }}>Progress playground</h1>
        <section {...stylex.props(s.panel)}>
          {label('colour scheme', (
            <select value={scheme} onChange={(e) => setScheme(e.target.value as ColorSchemeMode)} style={field}>
              <option>light</option><option>dark</option><option>system</option>
            </select>
          ))}
          {label('type', (
            <select value={type} onChange={(e) => setType(e.target.value as ProgressType)} style={field}>
              <option>flat</option><option>wave</option>
            </select>
          ))}
          {label('thickness', (
            <select value={thickness} onChange={(e) => setThickness(Number(e.target.value) as ProgressThickness)} style={field}>
              <option value={4}>4 dp</option><option value={8}>8 dp</option>
            </select>
          ))}
          {label(`value ${value}%`, (
            <input type="range" min={0} max={100} value={value} onChange={(e) => setValue(Number(e.target.value))} aria-label="Value" />
          ))}
          <Button variant="tonal" onClick={() => setRunning((r) => !r)}>{running ? 'Stop' : 'Simulate download'}</Button>
        </section>
        <h2 {...stylex.props(typescale.titleLarge)} style={{ margin: 0 }}>Determinate</h2>
        <section {...stylex.props(s.stage)}>
          <LinearProgress value={value} type={type} thickness={thickness} aria-label="Upload" />
          <div {...stylex.props(s.row)}>
            <CircularProgress value={value} type={type} thickness={thickness} aria-label="Upload" />
          </div>
        </section>
        <h2 {...stylex.props(typescale.titleLarge)} style={{ margin: 0 }}>Indeterminate</h2>
        <section {...stylex.props(s.stage)}>
          <LinearProgress type={type} thickness={thickness} aria-label="Loading" />
          <div {...stylex.props(s.row)}>
            <CircularProgress type={type} thickness={thickness} aria-label="Loading" />
            <LoadingIndicator aria-label="Loading" />
            <LoadingIndicator container aria-label="Loading" />
          </div>
        </section>
      </main>
    </M3Provider>
  );
}
