import { useEffect, useState, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { color } from '@m3x/react/tokens/color.stylex';
import {
  BottomSheet,
  Button,
  Carousel,
  CarouselItem,
  IconButton,
  ListItem,
  ModalBottomSheet,
  ModalSideSheet,
  Slider,
} from '@m3x/react';
import { BottomSheetSurface, SideSheetSurface } from '@m3x/react/testing';
import manifest from '../../../../figma/sheets/manifest.json';
import assets from '../../../../figma/sheets/assets.json';
import type { FixtureModule, FixtureVariant } from './types.ts';

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
      <SideSheetSurface
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
        <BottomSheetSurface modal />
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

/**
 * Live (a11y / robustness): sheets holding content with its own pointer handling — a slider, a
 * text field, a carousel and a `data-m3-no-drag` area — plus plain rows that still drag the sheet.
 * A `m3-fixture-unmount` window event removes both sheets (unmount mid-gesture); `<output>` logs
 * every onOpenChange with the handler's render version ("Bump version" re-creates the handler).
 */
function LiveSheetGuards({ initialBottom = false }: { initialBottom?: boolean }) {
  const [bottom, setBottom] = useState(initialBottom);
  const [side, setSide] = useState(false);
  const [mounted, setMounted] = useState(true);
  const [version, setVersion] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  useEffect(() => {
    const unmount = () => setMounted(false);
    window.addEventListener('m3-fixture-unmount', unmount);
    return () => window.removeEventListener('m3-fixture-unmount', unmount);
  }, []);
  const change = (which: 'bottom' | 'side') => (open: boolean) => {
    setLog((l) => [...l, `${which}:${open}:v${version}`]);
    if (which === 'bottom') setBottom(open);
    else setSide(open);
  };
  const content = (
    <div
      style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 12, paddingInline: 16, paddingBottom: 16 }}
    >
      {['Copy link', 'Email'].map((t) => (
        <ListItem key={t}>{t}</ListItem>
      ))}
      <Button variant="text" onClick={() => setVersion((v) => v + 1)}>
        Bump version
      </Button>
      <Slider aria-label="Amount" defaultValue={40} />
      <input aria-label="Note" defaultValue="Selectable note text" style={{ font: 'inherit', padding: 8 }} />
      <div style={{ height: 140 }}>
        <Carousel aria-label="Photos" preferredItemWidth={120}>
          {Array.from({ length: 6 }, (_, i) => (
            <CarouselItem key={i} />
          ))}
        </Carousel>
      </div>
      <div data-m3-no-drag="" data-testid="pad" style={{ height: 48, background: 'rgba(0,0,0,0.08)' }}>
        Signature pad
      </div>
    </div>
  );
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <Button onClick={() => setBottom(true)}>Open bottom sheet</Button>
      <Button variant="tonal" onClick={() => setSide(true)}>
        Open side sheet
      </Button>
      <output data-log="">{log.join(' ')}</output>
      {mounted && (
        <ModalBottomSheet open={bottom} onOpenChange={change('bottom')} aria-label="Controls">
          {content}
        </ModalBottomSheet>
      )}
      {mounted && (
        <ModalSideSheet open={side} onOpenChange={change('side')} headline="Filters">
          {content}
        </ModalSideSheet>
      )}
    </div>
  );
}

const fixture: FixtureModule = {
  component: 'sheets',
  variants: Object.fromEntries([
    ['live', { width: 412, height: 56, render: () => <LiveSheets /> } satisfies FixtureVariant],
    ['live-guards', { width: 600, height: 56, render: () => <LiveSheetGuards /> } satisfies FixtureVariant],
    [
      'live-initial-open',
      { width: 600, height: 56, render: () => <LiveSheetGuards initialBottom /> } satisfies FixtureVariant,
    ],
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
