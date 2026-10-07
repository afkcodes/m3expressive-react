import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import {
  BottomSheet,
  Button,
  IconButton,
  ListItem,
  M3Provider,
  ModalBottomSheet,
  ModalSideSheet,
  SideSheet,
  typescale,
  type ColorSchemeMode,
} from '@m3x/react';
import { color } from '@m3x/react/tokens/color.stylex';
import assets from '../../../../figma/sheets/assets.json';

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
  stage: { display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' },
  frame: {
    display: 'flex',
    width: 720,
    maxWidth: '100%',
    height: 480,
    borderRadius: 16,
    overflow: 'hidden',
    outlineWidth: 1,
    outlineStyle: 'solid',
    outlineColor: color.outlineVariant,
    backgroundColor: color.surface,
  },
  main: { flexGrow: 1, padding: 24, color: color.onSurfaceVariant },
  phone: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    width: 412,
    height: 480,
    borderRadius: 16,
    overflow: 'hidden',
    outlineWidth: 1,
    outlineStyle: 'solid',
    outlineColor: color.outlineVariant,
    backgroundColor: color.surface,
  },
  peek: { height: 220 },
  muted: { color: color.onSurfaceVariant },
});

type IconName = keyof typeof assets.icons;
const Icon = ({ name }: { name: IconName }) => (
  <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor" aria-hidden style={{ display: 'block' }}>
    <path d={assets.icons[name]} />
  </svg>
);

/** Standard side / bottom sheets in a layout, and the modal versions (scrim, Escape, drag to dismiss). */
export function SheetsPlayground() {
  const [scheme, setScheme] = useState<ColorSchemeMode>('light');
  const [standardSide, setStandardSide] = useState(true);
  const [modalBottom, setModalBottom] = useState(false);
  const [modalSide, setModalSide] = useState(false);
  const field = { font: 'inherit', fontSize: 14, padding: '6px 8px', borderRadius: 8 } as const;
  const close = (onClick: () => void) => (
    <IconButton aria-label="Close" onClick={onClick}>
      <Icon name="close-24" />
    </IconButton>
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
          Sheets playground
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
          <Button variant="tonal" onClick={() => setStandardSide((v) => !v)}>
            {standardSide ? 'Hide' : 'Show'} standard side sheet
          </Button>
          <Button onClick={() => setModalSide(true)}>Modal side sheet</Button>
          <Button onClick={() => setModalBottom(true)}>Modal bottom sheet</Button>
        </section>
        <div {...stylex.props(s.stage)}>
          <div {...stylex.props(s.frame)}>
            <div {...stylex.props(typescale.bodyLarge, s.main)}>
              Page content. The standard side sheet sits beside it.
            </div>
            {standardSide && (
              <SideSheet
                headline="Details"
                close={close(() => setStandardSide(false))}
                actions={<Button onClick={() => setStandardSide(false)}>Done</Button>}
              >
                <ListItem supportingText="Business current account">Account</ListItem>
                <ListItem supportingText="Today">Last updated</ListItem>
              </SideSheet>
            )}
          </div>
          <div {...stylex.props(s.phone)}>
            <BottomSheet sx={s.peek}>
              <ListItem>Standard bottom sheet</ListItem>
              <ListItem>Stays in the layout</ListItem>
            </BottomSheet>
          </div>
        </div>
        <ModalSideSheet
          open={modalSide}
          onOpenChange={setModalSide}
          headline="Filters"
          navigation={
            <IconButton aria-label="Back" width="narrow" onClick={() => setModalSide(false)}>
              <Icon name="arrow_back-24" />
            </IconButton>
          }
          close={close(() => setModalSide(false))}
          actions={
            <>
              <Button onClick={() => setModalSide(false)}>Apply</Button>
              <Button variant="outlined" onClick={() => setModalSide(false)}>
                Cancel
              </Button>
            </>
          }
        >
          <ListItem>Date range</ListItem>
          <ListItem>Amount</ListItem>
        </ModalSideSheet>
        <ModalBottomSheet open={modalBottom} onOpenChange={setModalBottom} aria-label="Share">
          {['Copy link', 'Email', 'Message', 'More options'].map((t) => (
            <ListItem key={t} onClick={() => setModalBottom(false)}>
              {t}
            </ListItem>
          ))}
        </ModalBottomSheet>
      </main>
    </M3Provider>
  );
}
