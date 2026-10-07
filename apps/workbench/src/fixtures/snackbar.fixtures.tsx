import { Fragment, type ReactNode } from 'react';
import { Button, Snackbar, SnackbarAction, SnackbarClose, SnackbarProvider, useSnackbar } from '@m3x/react';
import { ForceState, type ForcedState } from '@m3x/react/testing';
import manifest from '../../../../figma/snackbar/manifest.json';
import type { FixtureModule, FixtureVariant } from './types';

/** The kit examples' text overrides (with their hard line breaks). */
const TEXT: Record<string, string> = {
  'long-2-close': 'Two-line snackbar with longer \naction and close affordance',
  'long-2-noclose': 'Two-line snackbar with \nlonger action',
  'action-2-close': 'Two-line snackbar with \naction and close affordance',
  'action-2-noclose': 'Two-line snackbar \nwith action',
  'text-2-close': 'Two-line snackbar with \nclose affordance',
  'text-2-noclose': 'Two-line snackbar \nwithout action',
  'action-1-close': 'Single-line snackbar with action',
  'action-1-noclose': 'Single-line snackbar with action',
  'text-1-close': 'Single-line snackbar with close affordance',
  'text-1-noclose': 'Single-line snackbar',
};
const lines = (t: string): ReactNode => t.split('\n').map((l, i, a) => <Fragment key={i}>{l}{i < a.length - 1 && <br />}</Fragment>);
const asForced = (s: string): ForcedState | undefined => (s === 'hovered' || s === 'focused' || s === 'pressed' ? s : undefined);

function LiveDemo() {
  const snackbar = useSnackbar();
  return (
    <Button onClick={() => snackbar.show('Message archived', { action: { label: 'Undo', onClick: () => document.body.setAttribute('data-undo', '1') } })}>
      Archive
    </Button>
  );
}

/** Motion / queue probe: Compose default durations (no provider timeout). */
function QueueDemo() {
  const snackbar = useSnackbar();
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button type="button" data-show="first" onClick={() => snackbar.show('First message')}>first</button>
      <button type="button" data-show="second" onClick={() => snackbar.show('Second message')}>second</button>
      <button type="button" data-show="action" onClick={() => snackbar.show('Connection lost', { action: { label: 'Retry' } })}>action</button>
      <button type="button" data-show="close" onClick={() => snackbar.show('Closable message', { withClose: true, duration: 'long' })}>close</button>
    </div>
  );
}

const fixture: FixtureModule = {
  component: 'snackbar',
  variants: Object.fromEntries([
    ['live', { render: () => <SnackbarProvider timeout={60000}><LiveDemo /></SnackbarProvider> }],
    ['queue-live', { render: () => <SnackbarProvider><QueueDemo /></SnackbarProvider> }],
    ...Object.entries(manifest.variants).map(([name, v]): [string, FixtureVariant] => {
      const p = name.split('-');
      let render: () => ReactNode;
      if (p[0] === 'snackbar') {
        const key = p.slice(1).join('-');
        const [kind, n, close] = p.slice(1) as [string, string, string];
        render = () => (
          <Snackbar
            stacked={kind === 'long'}
            twoLine={n === '2'}
            onClose={close === 'close' ? () => {} : undefined}
            action={kind === 'text' ? undefined : <SnackbarAction>{kind === 'long' ? 'Longer Action' : 'Action'}</SnackbarAction>}
          >
            {lines(TEXT[key]!)}
          </Snackbar>
        );
      } else if (p[0] === 'action') {
        render = () => (
          <ForceState state={asForced(p[1]!)}>
            <SnackbarAction>Label</SnackbarAction>
          </ForceState>
        );
      } else {
        render = () => (
          <ForceState state={asForced(p[1]!)}>
            <SnackbarClose />
          </ForceState>
        );
      }
      return [name, { node: v.node, render }];
    }),
  ]),
};
export default fixture;
