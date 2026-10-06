import { useState, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { color } from '@m3x/react/tokens/color.stylex';
import { BottomSheet, Button, IconButton, ListItem, ModalBottomSheet, ModalSideSheet, SideSheet } from '@m3x/react';
import manifest from '../../../../figma/sheets/manifest.json';
import assets from '../../../../figma/sheets/assets.json';
import type { FixtureModule, FixtureVariant } from './types';

const fx = stylex.create({
  // The kit's modal bottom sheet carries its scrim (32% Scrim) behind it, past its own bounds.
  scrimHost: { position: 'relative', display: 'flex', width: '100%', height: '100%' },
  // Kit geometry: 492×794 from (−40, −314), clipped by its component set.
  scrim: {
    position: 'absolute',
    left: -40,
    top: -314,
    width: 492,
    height: 794,
    backgroundColor: `color-mix(in srgb, ${color.scrim} 32%, transparent)`,
  },
});

type IconName = keyof typeof assets.icons;
const Icon = ({ name }: { name: IconName }) => (
  <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor" aria-hidden style={{ display: 'block' }}>
    <path d={assets.icons[name]} />
  </svg>
);
const back = (
  <IconButton aria-label="Back" width="narrow">
    <Icon name="arrow_back-24" />
  </IconButton>
);
const close = (
  <IconButton aria-label="Close">
    <Icon name="close-24" />
  </IconButton>
);
const actions = (
  <>
    <Button>Save</Button>
    <Button variant="outlined">Cancel</Button>
  </>
);

function render(name: string): ReactNode {
  const p = name.split('-');
  if (p[0] === 'side') {
    // side-{modal|standard}-{back|noback}
    return (
      <SideSheet
        modal={p[1] === 'modal'}
        headline="Title"
        navigation={p[2] === 'back' ? back : undefined}
        close={close}
        actions={actions}
      />
    );
  }
  if (name === 'bottom-modal') {
    return (
      <div {...stylex.props(fx.scrimHost)}>
        <span {...stylex.props(fx.scrim)} />
        <BottomSheet modal />
      </div>
    );
  }
  return <BottomSheet />;
}

/** Live: buttons open the modal bottom sheet and the modal side sheet. */
function LiveSheets() {
  const [bottom, setBottom] = useState(false);
  const [side, setSide] = useState(false);
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <Button onClick={() => setBottom(true)}>Open bottom sheet</Button>
      <Button variant="tonal" onClick={() => setSide(true)}>
        Open side sheet
      </Button>
      <ModalBottomSheet open={bottom} onOpenChange={setBottom} aria-label="Share">
        {['Copy link', 'Email', 'Message'].map((t) => (
          <ListItem key={t} onClick={() => setBottom(false)}>
            {t}
          </ListItem>
        ))}
      </ModalBottomSheet>
      <ModalSideSheet
        open={side}
        onOpenChange={setSide}
        headline="Filters"
        close={
          <IconButton aria-label="Close" onClick={() => setSide(false)}>
            <Icon name="close-24" />
          </IconButton>
        }
        actions={
          <>
            <Button onClick={() => setSide(false)}>Apply</Button>
            <Button variant="outlined" onClick={() => setSide(false)}>
              Cancel
            </Button>
          </>
        }
      >
        <ListItem>Date range</ListItem>
      </ModalSideSheet>
    </div>
  );
}

const fixture: FixtureModule = {
  component: 'sheets',
  variants: Object.fromEntries([
    ['live', { width: 412, height: 56, render: () => <LiveSheets /> } satisfies FixtureVariant],
    ...Object.entries(manifest.variants).map(([name, v]): [string, FixtureVariant] => {
      const [w, h] = v.size as [number, number];
      return [
        name,
        {
          node: v.node,
          width: w,
          height: h,
          ...(name === 'bottom-modal' ? { padding: 330 } : {}),
          render: () => <div style={{ width: w, height: h, display: 'flex' }}>{render(name)}</div>,
        },
      ];
    }),
  ]),
};
export default fixture;
