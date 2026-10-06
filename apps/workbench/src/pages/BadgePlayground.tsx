import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Badge, M3Provider, typescale, type ColorSchemeMode } from '@m3x/react';
import { color } from '@m3x/react/tokens/color.stylex';

const s = stylex.create({
  page: { minHeight: '100vh', backgroundColor: color.surface, color: color.onSurface, padding: 32, display: 'grid', gap: 24, alignContent: 'start' },
  panel: { display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'end', padding: 16, borderRadius: 16, backgroundColor: color.surfaceContainer },
  stage: { display: 'flex', gap: 40, alignItems: 'center', justifyContent: 'center', minHeight: 180, borderRadius: 24, backgroundColor: color.surfaceContainerLow },
  muted: { color: color.onSurfaceVariant },
  cell: { display: 'grid', justifyItems: 'center', gap: 8 },
});

export function BadgePlayground() {
  const [count, setCount] = useState(3);
  const [max, setMax] = useState(999);
  const [text, setText] = useState('New');
  const [scheme, setScheme] = useState<ColorSchemeMode>('light');
  const field = { font: 'inherit', fontSize: 14, padding: '6px 8px', borderRadius: 8, width: 100 } as const;

  return (
    <M3Provider colorScheme={scheme}>
      <main {...stylex.props(s.page)}>
        <p style={{ margin: 0 }}><a href="/" style={{ color: 'inherit' }}>← all</a></p>
        <h1 {...stylex.props(typescale.headlineMedium)} style={{ margin: 0 }}>Badge playground</h1>
        <section {...stylex.props(s.panel)}>
          <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
            <span {...stylex.props(s.muted)}>count</span>
            <input type="number" value={count} onChange={(e) => setCount(Number(e.target.value))} style={field} />
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
            <span {...stylex.props(s.muted)}>max</span>
            <input type="number" value={max} onChange={(e) => setMax(Number(e.target.value))} style={field} />
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
            <span {...stylex.props(s.muted)}>text</span>
            <input value={text} onChange={(e) => setText(e.target.value)} style={field} />
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
            <span {...stylex.props(s.muted)}>colour scheme</span>
            <select value={scheme} onChange={(e) => setScheme(e.target.value as ColorSchemeMode)} style={{ ...field, width: 110 }}>
              <option>light</option><option>dark</option><option>system</option>
            </select>
          </label>
        </section>
        <section {...stylex.props(s.stage)}>
          <div {...stylex.props(s.cell)}><Badge /><span {...stylex.props(typescale.labelMedium, s.muted)}>{'<Badge />'}</span></div>
          <div {...stylex.props(s.cell)}><Badge count={count} max={max} /><span {...stylex.props(typescale.labelMedium, s.muted)}>{`<Badge count={${count}} max={${max}} />`}</span></div>
          <div {...stylex.props(s.cell)}><Badge>{text}</Badge><span {...stylex.props(typescale.labelMedium, s.muted)}>{`<Badge>${text}</Badge>`}</span></div>
        </section>
        <p {...stylex.props(typescale.bodyMedium, s.muted)} style={{ margin: 0 }}>
          Large badges hug their label (min 16px, max 34px — M3 allows up to 4 characters, e.g. 999+).
          Anchoring a badge to an icon comes with the navigation components that use it.
        </p>
      </main>
    </M3Provider>
  );
}
