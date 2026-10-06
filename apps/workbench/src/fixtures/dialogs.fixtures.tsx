import { useState, type ReactNode } from 'react';
import { Button, Checkbox, Dialog, DialogSurface, List, ListItem, ListItemMonogram } from '@m3x/react';
import manifest from '../../../../figma/dialogs/manifest.json';
import assets from '../../../../figma/dialogs/assets.json';
import type { FixtureModule, FixtureVariant } from './types';

const Icon = () => (
  <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor" aria-hidden style={{ display: 'block' }}>
    <path d={assets.icons['mobile_check-24']} />
  </svg>
);
const SUPPORTING =
  'A dialog is a type of modal window that appears in front of app content to provide critical information, or prompt for a decision to be made.';
// The scrollable variant's copy ends differently ("or ask for a decision.").
const SUPPORTING_SCROLL =
  'A dialog is a type of modal window that appears in front of app content to provide critical information, or ask for a decision.';
const actions = (
  <>
    <Button variant="text">Action 2</Button>
    <Button variant="text">Action 1</Button>
  </>
);

const items = (n: number) => (
  <List variant="baseline" aria-label="Options">
    {Array.from({ length: n }, (_, i) => (
      <ListItem
        key={i}
        variant="baseline"
        leading={<ListItemMonogram>A</ListItemMonogram>}
        trailingText={i < 3 ? '100+' : undefined}
        trailing={<Checkbox checked aria-label={`Select item ${i + 1}`} />}
        divider={i < n - 1}
      >
        List item
      </ListItem>
    ))}
  </List>
);

function render(name: string): ReactNode {
  const [kind, icon] = name.split('-') as [string, string];
  const withIcon = icon === 'icon' ? <Icon /> : undefined;
  if (kind === 'basic')
    return <DialogSurface icon={withIcon} headline="Basic dialog title" supportingText={SUPPORTING} actions={actions} />;
  return (
    <DialogSurface
      icon={withIcon}
      headline="Dialog title"
      supportingText={kind === 'scroll' ? SUPPORTING_SCROLL : SUPPORTING}
      actions={actions}
    >
      {items(kind === 'scroll' ? 12 : 3)}
    </DialogSurface>
  );
}

/** Live: a button opens the basic dialog; actions and Escape close it. */
function LiveDialog() {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState('none');
  const close = (r: string) => {
    setResult(r);
    setOpen(false);
  };
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <Button onClick={() => setOpen(true)}>Open dialog</Button>
      <output data-result>{result}</output>
      <Dialog
        open={open}
        onOpenChange={(o) => (o ? setOpen(true) : close('dismissed'))}
        icon={<Icon />}
        headline="Basic dialog title"
        supportingText={SUPPORTING}
        actions={
          <>
            <Button variant="text" onClick={() => close('cancel')}>
              Action 2
            </Button>
            <Button variant="text" onClick={() => close('confirm')}>
              Action 1
            </Button>
          </>
        }
      />
    </div>
  );
}

const fixture: FixtureModule = {
  component: 'dialogs',
  variants: Object.fromEntries([
    ['live', { width: 360, height: 48, render: () => <LiveDialog /> } satisfies FixtureVariant],
    ...Object.entries(manifest.variants).map(([name, v]): [string, FixtureVariant] => {
      const [w, h] = v.size as [number, number];
      return [
        name,
        { node: v.node, width: w, height: h, render: () => <div style={{ width: w, height: h, display: 'flex' }}>{render(name)}</div> },
      ];
    }),
  ]),
};
export default fixture;
