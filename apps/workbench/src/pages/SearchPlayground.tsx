import { useEffect, useRef, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Avatar, IconButton, ListItem, M3Provider, SearchBar, SearchView, typescale, type ColorSchemeMode } from '@m3x/react';
import { color } from '@m3x/react/tokens/color.stylex';
import assets from '../../../../figma/search/assets.json';

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
    width: 412,
    height: 560,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: color.surface,
    outlineWidth: 1,
    outlineStyle: 'solid',
    outlineColor: color.outlineVariant,
  },
  barSlot: { paddingBlock: 8, paddingInline: 16 },
  docked: { position: 'absolute', top: 8, left: 16, right: 16 },
  full: { position: 'absolute', inset: 0, paddingTop: 8, backgroundColor: color.surface },
  body: { paddingBlock: 12, paddingInline: 16, color: color.onSurfaceVariant },
  monogram: { backgroundColor: color.primary, color: color.onPrimary },
  muted: { color: color.onSurfaceVariant },
});

type IconName = keyof typeof assets.icons;
const Icon = ({ name }: { name: IconName }) => (
  <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor" aria-hidden style={{ display: 'block' }}>
    <path d={assets.icons[name]} />
  </svg>
);

const ITEMS = [
  ['Savings account', 'Instant access, interest paid monthly'],
  ['Business card', 'Spending, limits and statements'],
  ['Payments', 'Send money, standing orders, direct debits'],
  ['Statements', 'Download monthly statements'],
  ['Team access', 'Invite colleagues, set permissions'],
] as const;

/** A search bar that expands into the docked or full-screen view (slow spatial in, Escape / back out). */
export function SearchPlayground() {
  const [scheme, setScheme] = useState<ColorSchemeMode>('light');
  const [mode, setMode] = useState<'docked' | 'full-screen'>('docked');
  const [avatar, setAvatar] = useState(true);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const bar = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !open) bar.current?.querySelector<HTMLElement>('[data-search-trigger]')?.focus();
    wasOpen.current = open;
  }, [open]);
  const close = () => {
    setOpen(false);
    setQ('');
  };
  const results = ITEMS.filter(([t, d]) => `${t} ${d}`.toLowerCase().includes(q.toLowerCase()));
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
          Search playground
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
            <span {...stylex.props(s.muted)}>expanded view</span>
            <select value={mode} onChange={(e) => setMode(e.target.value as typeof mode)} style={field}>
              <option value="docked">docked</option>
              <option value="full-screen">full screen</option>
            </select>
          </label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 14 }}>
            <input type="checkbox" checked={avatar} onChange={(e) => setAvatar(e.target.checked)} /> avatar
          </label>
        </section>
        <div {...stylex.props(s.phone)}>
          <div {...stylex.props(s.barSlot)}>
            <SearchBar
              ref={bar}
              placeholder="Search accounts and payments"
              leading={
                <IconButton aria-label="Menu">
                  <Icon name="menu-24" />
                </IconButton>
              }
              trailing={
                <IconButton aria-label="Voice search">
                  <Icon name="mic-24" />
                </IconButton>
              }
              avatar={
                avatar ? (
                  <Avatar size={30} sx={s.monogram}>
                    A
                  </Avatar>
                ) : undefined
              }
              onActivate={() => setOpen(true)}
            />
          </div>
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} {...stylex.props(typescale.bodyLarge, s.body)}>
              Content row {i + 1}
            </div>
          ))}
          {open && (
            <SearchView
              mode={mode}
              value={q}
              onValueChange={setQ}
              onDismiss={close}
              placeholder="Search accounts and payments"
              autoFocus
              sx={mode === 'docked' ? s.docked : s.full}
              leading={
                <IconButton aria-label="Back" onClick={close}>
                  <Icon name="arrow_back-24" />
                </IconButton>
              }
              trailing={
                q ? (
                  <IconButton aria-label="Clear" onClick={() => setQ('')}>
                    <Icon name="close-24" />
                  </IconButton>
                ) : (
                  <IconButton aria-label="Voice search">
                    <Icon name="mic-24" />
                  </IconButton>
                )
              }
            >
              {results.map(([t, d]) => (
                <ListItem key={t} supportingText={d} supportingMaxLines={1} onClick={close}>
                  {t}
                </ListItem>
              ))}
            </SearchView>
          )}
        </div>
      </main>
    </M3Provider>
  );
}
