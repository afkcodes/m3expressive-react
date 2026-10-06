import { useRef, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import {
  Fab,
  IconButton,
  M3Provider,
  ToggleButton,
  ToggleIconButton,
  Toolbar,
  typescale,
  type ColorSchemeMode,
  type ToolbarColor,
} from '@m3x/react';
import { color } from '@m3x/react/tokens/color.stylex';
import assets from '../../../../figma/toolbar/assets.json';

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
  phone: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    width: 412,
    height: 560,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: color.surface,
    outlineWidth: 1,
    outlineStyle: 'solid',
    outlineColor: color.outlineVariant,
  },
  scroll: { flexGrow: 1, overflowY: 'auto' },
  row: { paddingBlock: 12, paddingInline: 16, color: color.onSurfaceVariant },
  floatH: { position: 'absolute', bottom: 16, left: 0, right: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none' },
  floatV: { position: 'absolute', top: 0, bottom: 0, right: 16, display: 'flex', alignItems: 'center', pointerEvents: 'none' },
  hit: { pointerEvents: 'auto' },
  muted: { color: color.onSurfaceVariant },
});

type IconName = keyof typeof assets.icons;
const Icon = ({ name, size = 24 }: { name: string; size?: 20 | 24 }) => (
  <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="currentColor" aria-hidden style={{ display: 'block' }}>
    <path d={assets.icons[`${name}-${size}` as IconName]} />
  </svg>
);

/** Floating (scroll collapses it, FastSpatial) and docked toolbars with toggles and a FAB. */
export function ToolbarPlayground() {
  const [scheme, setScheme] = useState<ColorSchemeMode>('light');
  const [tone, setTone] = useState<ToolbarColor>('standard');
  const [type, setType] = useState<'floating-h' | 'floating-v' | 'docked'>('floating-h');
  const [withFab, setWithFab] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [view, setView] = useState('photos');
  const last = useRef(0);
  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const y = e.currentTarget.scrollTop;
    // Exit-always: collapse while scrolling down, expand on the way back up.
    if (Math.abs(y - last.current) > 4) setExpanded(y < last.current || y < 8);
    last.current = y;
  };
  const field = { font: 'inherit', fontSize: 14, padding: '6px 8px', borderRadius: 8 } as const;
  const floating = type !== 'docked';
  const fab = (
    <Fab aria-label="Add" color={tone === 'vibrant' ? 'primary-container' : 'tertiary-container'}>
      <Icon name="add" />
    </Fab>
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
          Toolbar playground
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
            <span {...stylex.props(s.muted)}>toolbar</span>
            <select value={type} onChange={(e) => setType(e.target.value as typeof type)} style={field}>
              <option value="floating-h">floating, horizontal</option>
              <option value="floating-v">floating, vertical</option>
              <option value="docked">docked</option>
            </select>
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
            <span {...stylex.props(s.muted)}>colour</span>
            <select value={tone} onChange={(e) => setTone(e.target.value as ToolbarColor)} style={field}>
              <option value="standard">standard</option>
              <option value="vibrant">vibrant</option>
            </select>
          </label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 14 }}>
            <input type="checkbox" checked={withFab} onChange={(e) => setWithFab(e.target.checked)} /> FAB
          </label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 14 }}>
            <input type="checkbox" checked={!expanded} onChange={(e) => setExpanded(!e.target.checked)} /> collapsed
          </label>
        </section>
        <div {...stylex.props(s.phone)}>
          <div {...stylex.props(s.scroll)} onScroll={floating ? onScroll : undefined}>
            {Array.from({ length: 30 }, (_, i) => (
              <div key={i} {...stylex.props(typescale.bodyLarge, s.row)}>
                Row {i + 1} — scroll down to collapse the floating toolbar, up to bring it back.
              </div>
            ))}
          </div>
          {floating ? (
            <div {...stylex.props(type === 'floating-v' ? s.floatV : s.floatH)}>
              <div {...stylex.props(s.hit)}>
                <Toolbar
                  key={type}
                  color={tone}
                  orientation={type === 'floating-v' ? 'vertical' : 'horizontal'}
                  expanded={expanded}
                  fab={withFab ? fab : undefined}
                  aria-label="Text formatting"
                  trailing={
                    withFab ? undefined : (
                      <IconButton aria-label="More">
                        <Icon name="more_vert" />
                      </IconButton>
                    )
                  }
                >
                  <ToggleIconButton aria-label="Bold">
                    <Icon name="format_bold" />
                  </ToggleIconButton>
                  <ToggleIconButton aria-label="Italic">
                    <Icon name="format_italic" />
                  </ToggleIconButton>
                  <ToggleIconButton aria-label="Underline">
                    <Icon name="format_underlined" />
                  </ToggleIconButton>
                </Toolbar>
              </div>
            </div>
          ) : (
            <Toolbar type="docked" color={tone} aria-label="Views">
              {(['photos', 'memories', 'library'] as const).map((v) => (
                <ToggleButton
                  key={v}
                  pressed={view === v}
                  onPressedChange={() => setView(v)}
                  icon={v === 'photos' ? <Icon name="stars" size={20} /> : undefined}
                  selectedIcon={v === 'photos' ? <Icon name="stars_filled" size={20} /> : undefined}
                >
                  {v[0]!.toUpperCase() + v.slice(1)}
                </ToggleButton>
              ))}
            </Toolbar>
          )}
        </div>
      </main>
    </M3Provider>
  );
}
