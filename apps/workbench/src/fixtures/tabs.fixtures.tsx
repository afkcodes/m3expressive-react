import { useState, type ReactNode } from 'react';
import { Tab, TabPanel, Tabs, TabScope, type TabsVariant } from '@m3x/react';
import { ForceState, type ForcedState } from '@m3x/react/testing';
import manifest from '../../../../figma/tabs/manifest.json';
import assets from '../../../../figma/tabs/assets.json';
import type { FixtureModule, FixtureVariant } from './types';

type IconName = keyof typeof assets.icons;
const Icon = ({ name }: { name: IconName }) => (
  <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor" aria-hidden style={{ display: 'block' }}>
    <path d={assets.icons[name]} />
  </svg>
);
const asForced = (s: string): ForcedState | undefined => (s === 'hovered' || s === 'focused' || s === 'pressed' ? s : undefined);

const ROW = [
  { label: 'Video', icon: 'videocam-24' },
  { label: 'Photos', icon: 'photo-24' },
  { label: 'Audio', icon: 'music_note-24' },
  { label: 'Tab', icon: 'stars-24' },
] as const;

function render(name: string): ReactNode {
  const p = name.split('-');
  if (p[0] === 'tab') {
    // tab-{p|s}-{il|i|l}-{state}-{sel|unsel}
    const variant: TabsVariant = p[1] === 's' ? 'secondary' : 'primary';
    const kind = p[2]!;
    const ripple = p[3] === 'pressed' ? assets.ripple[`${p[1]}-${kind}` as keyof typeof assets.ripple] : undefined;
    return (
      <TabScope variant={variant}>
        <ForceState state={asForced(p[3]!)} ripplePath={ripple}>
          <Tab value="t" label={kind === 'i' ? undefined : 'Tab'} icon={kind === 'l' ? undefined : <Icon name="stars-24" />} selected={p[4] === 'sel'} />
        </ForceState>
      </TabScope>
    );
  }
  // tabs-{fixed|scrollable}-{primary|secondary}-{label-only|label-icon|icon-only}
  const scrollable = p[1] === 'scrollable';
  const variant = p[2] as TabsVariant;
  const layout = p.slice(3).join('-');
  const items = scrollable ? ROW : ROW.slice(0, 3);
  return (
    <Tabs variant={variant} scrollable={scrollable} defaultValue={0} aria-label="Media">
      {items.map((t, i) => (
        <Tab key={i} value={i} label={layout === 'icon-only' ? undefined : t.label} icon={layout === 'label-only' ? undefined : <Icon name={t.icon} />} />
      ))}
    </Tabs>
  );
}

/** Live: a fixed primary row with panels; the indicator springs between tabs. */
function LiveTabs() {
  const [value, setValue] = useState<unknown>(0);
  return (
    <div style={{ width: 360 }}>
      <Tabs
        value={value}
        onValueChange={setValue}
        aria-label="Media"
        panels={ROW.slice(0, 3).map((t, i) => (
          <TabPanel key={i} value={i}>
            <p style={{ margin: 16 }}>{t.label} panel</p>
          </TabPanel>
        ))}
      >
        {ROW.slice(0, 3).map((t, i) => (
          <Tab key={i} value={i} label={t.label} />
        ))}
      </Tabs>
      <output data-value style={{ position: 'absolute', left: -9999 }}>
        {String(value)}
      </output>
    </div>
  );
}

/** Live (motion): a scrollable row of ten tabs that starts on the fifth (centred on first layout). */
function LiveScrollTabs() {
  return (
    <div style={{ width: 360 }}>
      <Tabs scrollable defaultValue={4} aria-label="Sections">
        {Array.from({ length: 10 }, (_, i) => (
          <Tab key={i} value={i} label={`Section ${i + 1}`} />
        ))}
      </Tabs>
    </div>
  );
}

const fixture: FixtureModule = {
  component: 'tabs',
  variants: Object.fromEntries([
    ['live', { width: 360, height: 48, render: () => <LiveTabs /> } satisfies FixtureVariant],
    ['live-scroll', { width: 360, height: 48, render: () => <LiveScrollTabs /> } satisfies FixtureVariant],
    ...Object.entries(manifest.variants).map(([name, v]): [string, FixtureVariant] => {
      const [w, h] = v.size as [number, number];
      return [name, { node: v.node, width: w, height: h, render: () => <div style={{ width: w, height: h, display: 'flex', flexDirection: 'column' }}>{render(name)}</div> }];
    }),
  ]),
};
export default fixture;
