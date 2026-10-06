import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Badge, M3Provider, Tab, TabPanel, Tabs, typescale, type ColorSchemeMode, type TabsVariant } from '@m3x/react';
import { color } from '@m3x/react/tokens/color.stylex';
import assets from '../../../../figma/tabs/assets.json';

const s = stylex.create({
  page: { minHeight: '100vh', backgroundColor: color.surface, color: color.onSurface, padding: 32, display: 'grid', gap: 24, alignContent: 'start' },
  panel: { display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'end', padding: 16, borderRadius: 16, backgroundColor: color.surfaceContainer },
  demo: { display: 'grid', gap: 8, maxWidth: 480 },
  content: { padding: 16, color: color.onSurfaceVariant },
  muted: { color: color.onSurfaceVariant },
});

type IconName = keyof typeof assets.icons;
const Icon = ({ name }: { name: IconName }) => (
  <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor" aria-hidden style={{ display: 'block' }}>
    <path d={assets.icons[name]} />
  </svg>
);

const MEDIA = [
  { label: 'Video', icon: 'videocam-24' },
  { label: 'Photos', icon: 'photo-24' },
  { label: 'Audio', icon: 'music_note-24' },
] as const;
const MANY = ['Overview', 'Statements', 'Payments', 'Cards', 'Savings', 'Insights', 'Settings'];

/** Primary / secondary tabs, fixed and scrollable; the indicator springs between tabs. */
export function TabsPlayground() {
  const [scheme, setScheme] = useState<ColorSchemeMode>('light');
  const [variant, setVariant] = useState<TabsVariant>('primary');
  const [layout, setLayout] = useState<'label' | 'icon' | 'both'>('both');
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
          Tabs playground
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
          <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
            <span {...stylex.props(s.muted)}>style</span>
            <select value={variant} onChange={(e) => setVariant(e.target.value as TabsVariant)} style={field}>
              <option>primary</option>
              <option>secondary</option>
            </select>
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
            <span {...stylex.props(s.muted)}>content</span>
            <select value={layout} onChange={(e) => setLayout(e.target.value as typeof layout)} style={field}>
              <option value="both">label &amp; icon</option>
              <option value="label">label</option>
              <option value="icon">icon</option>
            </select>
          </label>
        </section>
        <section {...stylex.props(s.demo)}>
          <h2 {...stylex.props(typescale.titleMedium)} style={{ margin: 0 }}>
            Fixed
          </h2>
          <Tabs
            variant={variant}
            defaultValue={0}
            aria-label="Media"
            panels={MEDIA.map((m, i) => (
              <TabPanel key={i} value={i} sx={s.content}>
                {m.label} — the indicator springs (default spatial) to the selected tab; colour fades in on default effects.
              </TabPanel>
            ))}
          >
            {MEDIA.map((m, i) => (
              <Tab
                key={i}
                value={i}
                label={layout === 'icon' ? undefined : m.label}
                icon={layout === 'label' ? undefined : <Icon name={m.icon} />}
                badge={i === 2 ? <Badge>3</Badge> : undefined}
              />
            ))}
          </Tabs>
        </section>
        <section {...stylex.props(s.demo)}>
          <h2 {...stylex.props(typescale.titleMedium)} style={{ margin: 0 }}>
            Scrollable
          </h2>
          <Tabs variant={variant} scrollable defaultValue={0} aria-label="Sections">
            {MANY.map((t, i) => (
              <Tab key={t} value={i} label={t} />
            ))}
          </Tabs>
        </section>
      </main>
    </M3Provider>
  );
}
