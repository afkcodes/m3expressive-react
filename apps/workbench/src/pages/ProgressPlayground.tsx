import { useEffect, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import {
  Button,
  CircularProgress,
  LinearProgress,
  LoadingIndicator,
  M3Provider,
  typescale,
  type ColorSchemeMode,
  type ProgressThickness,
  type ProgressShape,
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
    gap: 20,
    alignItems: 'end',
    padding: 16,
    borderRadius: 16,
    backgroundColor: color.surfaceContainer,
  },
  stage: {
    display: 'grid',
    gap: 24,
    padding: 32,
    borderRadius: 16,
    backgroundColor: color.surfaceContainerLow,
    maxWidth: 560,
  },
  row: { display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap' },
  muted: { color: color.onSurfaceVariant },
});

/** Linear / circular progress and the loading indicator, determinate and indeterminate. */
export function ProgressPlayground() {
  const [scheme, setScheme] = useState<ColorSchemeMode>('light');
  const [shape, setShape] = useState<ProgressShape>('wavy');
  const [thickness, setThickness] = useState<ProgressThickness>(4);
  const [value, setValue] = useState(50);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return undefined;
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
        <p style={{ margin: 0 }}>
          <a href="/" style={{ color: 'inherit' }}>
            ← all
          </a>
        </p>
        <h1 {...stylex.props(typescale.headlineMedium)} style={{ margin: 0 }}>
          Progress playground
        </h1>
        <section {...stylex.props(s.panel)}>
          {label(
            'colour scheme',
            <select value={scheme} onChange={(e) => setScheme(e.target.value as ColorSchemeMode)} style={field}>
              <option>light</option>
              <option>dark</option>
              <option>system</option>
            </select>,
          )}
          {label(
            'shape',
            <select value={shape} onChange={(e) => setShape(e.target.value as ProgressShape)} style={field}>
              <option>flat</option>
              <option>wavy</option>
            </select>,
          )}
          {label(
            'thickness',
            <select
              value={thickness}
              onChange={(e) => setThickness(Number(e.target.value) as ProgressThickness)}
              style={field}
            >
              <option value={4}>4 dp</option>
              <option value={8}>8 dp</option>
            </select>,
          )}
          {label(
            `value ${value}%`,
            <input
              type="range"
              min={0}
              max={100}
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              aria-label="Value"
            />,
          )}
          <Button variant="tonal" onClick={() => setRunning((r) => !r)}>
            {running ? 'Stop' : 'Simulate download'}
          </Button>
        </section>
        <h2 {...stylex.props(typescale.titleLarge)} style={{ margin: 0 }}>
          Determinate
        </h2>
        <section {...stylex.props(s.stage)}>
          <LinearProgress value={value} shape={shape} thickness={thickness} aria-label="Upload" />
          <div {...stylex.props(s.row)}>
            <CircularProgress value={value} shape={shape} thickness={thickness} aria-label="Upload" />
          </div>
        </section>
        <h2 {...stylex.props(typescale.titleLarge)} style={{ margin: 0 }}>
          Indeterminate
        </h2>
        <section {...stylex.props(s.stage)}>
          <LinearProgress shape={shape} thickness={thickness} aria-label="Loading" />
          <div {...stylex.props(s.row)}>
            <CircularProgress shape={shape} thickness={thickness} aria-label="Loading" />
            <LoadingIndicator aria-label="Loading" />
            <LoadingIndicator contained aria-label="Loading" />
          </div>
        </section>
      </main>
    </M3Provider>
  );
}
