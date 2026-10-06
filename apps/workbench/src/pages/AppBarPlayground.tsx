import { useRef, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Avatar, BottomAppBar, Fab, IconButton, M3Provider, TopAppBar, typescale, type ColorSchemeMode, type TopAppBarSize } from '@m3x/react';
import { color } from '@m3x/react/tokens/color.stylex';
import assets from '../../../../figma/app-bar/assets.json';

const s = stylex.create({
  page: { minHeight: '100vh', backgroundColor: color.surface, color: color.onSurface, padding: 32, display: 'grid', gap: 24, alignContent: 'start' },
  panel: { display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'end', padding: 16, borderRadius: 16, backgroundColor: color.surfaceContainer },
  phone: { display: 'flex', flexDirection: 'column', width: 412, height: 560, borderRadius: 16, overflow: 'hidden', backgroundColor: color.surface, outlineWidth: 1, outlineStyle: 'solid', outlineColor: color.outlineVariant },
  scroll: { flexGrow: 1, overflowY: 'auto' },
  row: { paddingBlock: 12, paddingInline: 16, color: color.onSurfaceVariant },
  muted: { color: color.onSurfaceVariant },
});

type IconName = keyof typeof assets.icons;
const Icon = ({ name }: { name: IconName }) => (
  <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor" aria-hidden style={{ display: 'block' }}>
    <path d={assets.icons[name]} />
  </svg>
);
const Btn = ({ icon, label }: { icon: IconName; label: string }) => (
  <IconButton aria-label={label}>
    <Icon name={icon} />
  </IconButton>
);

/** Top app bars over a scroll container (on-scroll colour, two-row collapse) and the bottom app bar. */
export function AppBarPlayground() {
  const [scheme, setScheme] = useState<ColorSchemeMode>('light');
  const [size, setSize] = useState<TopAppBarSize | 'centered'>('medium');
  const [subtitle, setSubtitle] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
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
          App bar playground
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
            <span {...stylex.props(s.muted)}>top app bar</span>
            <select value={size} onChange={(e) => setSize(e.target.value as typeof size)} style={field}>
              <option value="small">small</option>
              <option value="centered">small, centred</option>
              <option value="medium">medium (collapses)</option>
              <option value="large">large (collapses)</option>
            </select>
          </label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 14 }}>
            <input type="checkbox" checked={subtitle} onChange={(e) => setSubtitle(e.target.checked)} /> subtitle
          </label>
        </section>
        <div {...stylex.props(s.phone)}>
          <TopAppBar
            key={size}
            size={size === 'centered' ? 'small' : size}
            centered={size === 'centered'}
            title="Inbox"
            subtitle={subtitle ? '24 unread' : undefined}
            navigationIcon={<Btn icon="menu-24" label="Menu" />}
            actions={
              size === 'centered' ? (
                <span style={{ display: 'flex', width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
                  <Avatar size={32}>A</Avatar>
                </span>
              ) : (
                <Btn icon="search-24" label="Search" />
              )
            }
            scrollTarget={ref}
          />
          <div ref={ref} {...stylex.props(s.scroll)}>
            {Array.from({ length: 30 }, (_, i) => (
              <div key={i} {...stylex.props(typescale.bodyLarge, s.row)}>
                Message {i + 1} — scroll to see the bar take Surface Container (small) or collapse (medium / large).
              </div>
            ))}
          </div>
          <BottomAppBar
            actions={
              <>
                <Btn icon="search-24" label="Search" />
                <Btn icon="delete-24" label="Delete" />
                <Btn icon="archive-24" label="Archive" />
              </>
            }
            fab={
              <Fab aria-label="New" color="secondary-container" elevated={false}>
                <Icon name="add-24" />
              </Fab>
            }
          />
        </div>
      </main>
    </M3Provider>
  );
}
