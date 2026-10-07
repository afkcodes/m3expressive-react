import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import {
  Button,
  Checkbox,
  Dialog,
  List,
  ListItem,
  ListItemMonogram,
  M3Provider,
  typescale,
  type ColorSchemeMode,
} from '@m3x/react';
import { color } from '@m3x/react/tokens/color.stylex';
import assets from '../../../../figma/dialogs/assets.json';

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
    gap: 12,
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: color.surfaceContainer,
  },
  muted: { color: color.onSurfaceVariant },
  scrollable: { height: 420 },
});

const Icon = () => (
  <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor" aria-hidden style={{ display: 'block' }}>
    <path d={assets.icons['mobile_check-24']} />
  </svg>
);
const PEOPLE = ['Ava', 'Ben', 'Chloe', 'Dan', 'Ella', 'Finn', 'Grace', 'Harry', 'Isla', 'Jack', 'Kate', 'Leo'];

type Which = 'basic' | 'icon' | 'list' | 'scroll' | 'alert' | null;

/** Basic, icon, list (selectable), scrollable and alert dialogs with the M3 fade-scale motion. */
export function DialogsPlayground() {
  const [scheme, setScheme] = useState<ColorSchemeMode>('light');
  const [open, setOpen] = useState<Which>(null);
  // Which variant was last opened: kept through the exit fade, so a dialog doesn't lose its icon
  // or rows while it animates out (one Dialog serves basic / icon and list / scroll).
  const [shown, setShown] = useState<Which>(null);
  const show = (w: Exclude<Which, null>) => {
    setShown(w);
    setOpen(w);
  };
  const [picked, setPicked] = useState<string[]>(['Ava']);
  const [last, setLast] = useState('—');
  const field = { font: 'inherit', fontSize: 14, padding: '6px 8px', borderRadius: 8 } as const;
  const close = (r: string) => {
    setLast(r);
    setOpen(null);
  };
  const actions = (confirm = 'OK') => (
    <>
      <Button variant="text" onClick={() => close('cancelled')}>
        Cancel
      </Button>
      <Button variant="text" onClick={() => close(confirm.toLowerCase())}>
        {confirm}
      </Button>
    </>
  );
  const people = (names: string[]) => (
    <List variant="baseline" aria-label="People">
      {names.map((n, i) => (
        <ListItem
          key={n}
          variant="baseline"
          leading={<ListItemMonogram>{n[0]}</ListItemMonogram>}
          trailing={
            <Checkbox
              checked={picked.includes(n)}
              onCheckedChange={(c) => setPicked((p) => (c ? [...p, n] : p.filter((x) => x !== n)))}
              aria-label={`Share with ${n}`}
            />
          }
          divider={i < names.length - 1}
        >
          {n}
        </ListItem>
      ))}
    </List>
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
          Dialogs playground
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
          <Button onClick={() => show('basic')}>Basic</Button>
          <Button onClick={() => show('icon')}>With icon</Button>
          <Button onClick={() => show('list')}>List</Button>
          <Button onClick={() => show('scroll')}>Scrollable list</Button>
          <Button variant="tonal" onClick={() => show('alert')}>
            Alert
          </Button>
          <span {...stylex.props(typescale.bodyMedium, s.muted)}>
            last result: {last} · shared with: {picked.join(', ') || 'nobody'}
          </span>
        </section>
        <Dialog
          open={open === 'basic' || open === 'icon'}
          onOpenChange={(o) => !o && close('dismissed')}
          icon={shown === 'icon' ? <Icon /> : undefined}
          headline="Reset settings?"
          supportingText="This will reset your app preferences back to their default settings. Your saved accounts are not affected."
          actions={actions('Reset')}
        />
        <Dialog
          open={open === 'list' || open === 'scroll'}
          onOpenChange={(o) => !o && close('dismissed')}
          headline="Share with"
          supportingText="Choose who can see this statement."
          actions={actions('Share')}
          divider={shown === 'scroll'}
          sx={shown === 'scroll' ? s.scrollable : undefined}
        >
          {people(shown === 'scroll' ? PEOPLE : PEOPLE.slice(0, 3))}
        </Dialog>
        <Dialog
          role="alertdialog"
          open={open === 'alert'}
          onOpenChange={(o) => !o && close('dismissed')}
          headline="Discard draft?"
          supportingText="Your changes will be lost. A click outside does not dismiss this dialog."
          actions={actions('Discard')}
        />
      </main>
    </M3Provider>
  );
}
