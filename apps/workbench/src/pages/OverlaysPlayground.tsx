import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Button, IconButton, M3Provider, RichTooltip, SnackbarProvider, Tooltip, typescale, useSnackbar, type ColorSchemeMode } from '@m3x/react';
import { color } from '@m3x/react/tokens/color.stylex';
import buttonAssets from '../../../../figma/button/assets.json';

const s = stylex.create({
  page: { minHeight: '100vh', backgroundColor: color.surface, color: color.onSurface, padding: 32, display: 'grid', gap: 24, alignContent: 'start' },
  panel: { display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'end', padding: 16, borderRadius: 16, backgroundColor: color.surfaceContainer },
  stage: { display: 'flex', gap: 24, alignItems: 'center', padding: 48, borderRadius: 16, backgroundColor: color.surfaceContainerLow },
  muted: { color: color.onSurfaceVariant },
});

const Stars = () => (
  <svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor" aria-hidden>
    <path d={buttonAssets.icon} />
  </svg>
);

function SnackbarButtons() {
  const snackbar = useSnackbar();
  return (
    <>
      <Button variant="tonal" onClick={() => snackbar.show('Payment scheduled')}>Simple</Button>
      <Button variant="tonal" onClick={() => snackbar.show('Message archived', { action: { label: 'Undo' } })}>With action</Button>
      <Button variant="tonal" onClick={() => snackbar.show('Connection lost', { withClose: true, action: { label: 'Retry' } })}>Action + close</Button>
      <Button variant="tonal" onClick={() => snackbar.show('Your statement for September is ready to download', { stacked: true, action: { label: 'Open statement' } })}>Longer action</Button>
      <Button
        variant="tonal"
        onClick={() => ['First of three', 'Second of three', 'Third of three'].forEach((m) => snackbar.show(m, { withClose: true }))}
      >
        Queue three
      </Button>
    </>
  );
}

/** Tooltips, snackbars (and later menus, dialogs, sheets) — everything that floats. */
export function OverlaysPlayground() {
  const [scheme, setScheme] = useState<ColorSchemeMode>('light');
  const field = { font: 'inherit', fontSize: 14, padding: '6px 8px', borderRadius: 8 } as const;
  return (
    <M3Provider colorScheme={scheme}>
      <SnackbarProvider>
      <main {...stylex.props(s.page)}>
        <p style={{ margin: 0 }}><a href="/" style={{ color: 'inherit' }}>← all</a></p>
        <h1 {...stylex.props(typescale.headlineMedium)} style={{ margin: 0 }}>Overlays playground</h1>
        <section {...stylex.props(s.panel)}>
          <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
            <span {...stylex.props(s.muted)}>colour scheme</span>
            <select value={scheme} onChange={(e) => setScheme(e.target.value as ColorSchemeMode)} style={field}>
              <option>light</option><option>dark</option><option>system</option>
            </select>
          </label>
        </section>
        <h2 {...stylex.props(typescale.titleLarge)} style={{ margin: 0 }}>Tooltips — hover, keyboard focus or touch long-press</h2>
        <section {...stylex.props(s.stage)}>
          <Tooltip content="Add to favourites">
            <IconButton aria-label="Favourite"><Stars /></IconButton>
          </Tooltip>
          <RichTooltip
            trigger={<Button variant="tonal">Rich tooltip</Button>}
            subhead="Grant value"
            actions={<><Button variant="text">Learn more</Button><Button variant="text">Dismiss</Button></>}
          >
            Funds are released in stages once each milestone is approved.
          </RichTooltip>
        </section>
        <h2 {...stylex.props(typescale.titleLarge)} style={{ margin: 0 }}>Snackbars — one at a time, first in first out (4s; with an action: until dismissed)</h2>
        <section {...stylex.props(s.stage)}>
          <SnackbarButtons />
        </section>
      </main>
      </SnackbarProvider>
    </M3Provider>
  );
}
