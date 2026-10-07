import { useState, type ReactNode } from 'react';
import {
  Badge,
  ExtendedFab,
  Fab,
  IconButton,
  NavigationBar,
  NavigationItem,
  NavigationRail,
  NavigationRailSection,
} from '@m3x/react';
import { ForceState, NavigationScope, type ForcedState, type NavigationScopeProps } from '@m3x/react/testing';
import manifest from '../../../../figma/navigation/manifest.json';
import assets from '../../../../figma/navigation/assets.json';
import type { FixtureModule, FixtureVariant } from './types.ts';

type IconName = keyof typeof assets.icons;
const Icon = ({ name }: { name: IconName }) => (
  <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor" aria-hidden style={{ display: 'block' }}>
    <path d={assets.icons[name]} />
  </svg>
);
const asForced = (s: string): ForcedState | undefined =>
  s === 'hovered' || s === 'focused' || s === 'pressed' ? s : undefined;
const badgeFor = (b: string) => (b === 'small' ? <Badge /> : b === 'large' ? <Badge>3</Badge> : undefined);

const item = (
  i: number,
  extra: Partial<Omit<React.ComponentProps<typeof NavigationItem>, 'label' | 'aria-label'>> = {},
) => (
  <NavigationItem
    key={i}
    value={i}
    icon={<Icon name="stars-24" />}
    selectedIcon={<Icon name="stars_filled-24" />}
    label="Label"
    {...extra}
  />
);

function render(name: string): ReactNode {
  const p = name.split('-');
  if (p[0] === 'bar' || p[0] === 'rail') {
    // {bar|rail}-{v|h}-{state}-{badge}-{sel|unsel}[-{label|nolabel}]
    const layout: NavigationScopeProps['layout'] =
      p[1] === 'v' ? 'vertical' : p[0] === 'bar' ? 'horizontal' : 'railHorizontal';
    const [state, badge, sel, label] = [p[2]!, p[3]!, p[4] === 'sel', p[5]];
    return (
      <NavigationScope layout={layout} showLabels={label !== 'nolabel'}>
        <ForceState state={asForced(state)} selected={sel}>
          {item(0, { badge: badgeFor(badge), badgeSize: badge === 'small' ? 'small' : 'large' })}
        </ForceState>
      </NavigationScope>
    );
  }
  const n = Number(p[p.length - 1]);
  if (p[0] === 'nbar') {
    return (
      <NavigationBar layout={p[1] === 'h' ? 'horizontal' : 'vertical'} value={0} aria-label="Primary">
        {Array.from({ length: n }, (_, i) => item(i))}
      </NavigationBar>
    );
  }
  const expanded = p[0] === 'nrailx';
  const header = (
    <>
      <IconButton size="medium" shape="square" aria-label="Menu">
        <Icon name={expanded ? 'menu_open-24' : 'menu-24'} />
      </IconButton>
      {expanded ? (
        <ExtendedFab size="small" elevated={false} icon={<Icon name="edit-24" />}>
          Label
        </ExtendedFab>
      ) : (
        <Fab aria-label="Edit" elevated={false}>
          <Icon name="edit-24" />
        </Fab>
      )}
    </>
  );
  return (
    <NavigationRail
      expanded={expanded}
      layout={expanded && p[1] === 'floating' ? 'floating' : 'docked'}
      alignment={(expanded ? p[2] : p[1]) === 'middle' ? 'middle' : 'top'}
      value={0}
      header={header}
      aria-label="Primary"
    >
      {expanded && n === 6 ? (
        // The kit's 6-item expanded rail demonstrates sections (clipped at the rail's 800px).
        [
          <NavigationRailSection key="s1">{[0, 1, 2, 3, 4].map((i) => item(i))}</NavigationRailSection>,
          <NavigationRailSection key="s2" label="Section Header">
            {[5, 6, 7, 8].map((i) => item(i))}
          </NavigationRailSection>,
          <NavigationRailSection key="s3" label="Section Header">
            {[9, 10, 11, 12].map((i) => item(i))}
          </NavigationRailSection>,
        ]
      ) : expanded ? (
        <NavigationRailSection>{Array.from({ length: n }, (_, i) => item(i))}</NavigationRailSection>
      ) : (
        Array.from({ length: n }, (_, i) => item(i))
      )}
    </NavigationRail>
  );
}

/** Live: the kit's 4-item bar (nbar-v-4); selecting grows the new item's pill. */
function LiveBar() {
  const [value, setValue] = useState<unknown>(0);
  return (
    <div style={{ width: 412 }}>
      <NavigationBar value={value} onValueChange={setValue} aria-label="Primary">
        {[0, 1, 2, 3].map((i) => item(i))}
      </NavigationBar>
      <output data-value style={{ position: 'absolute', left: -9999 }}>
        {String(value)}
      </output>
    </div>
  );
}

/** Live (motion): the kit's 4-item top rail (nrail-top-4 / nrailx-docked-top-4); the menu button toggles it. */
function LiveRail() {
  const [value, setValue] = useState<unknown>(0);
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ width: 280, height: 800, display: 'flex' }}>
      <NavigationRail
        expanded={expanded}
        value={value}
        onValueChange={setValue}
        aria-label="Primary"
        header={
          <>
            <IconButton size="medium" shape="square" aria-label="Menu" onClick={() => setExpanded((v) => !v)}>
              <Icon name={expanded ? 'menu_open-24' : 'menu-24'} />
            </IconButton>
            {expanded ? (
              <ExtendedFab size="small" elevated={false} icon={<Icon name="edit-24" />}>
                Label
              </ExtendedFab>
            ) : (
              <Fab aria-label="Edit" elevated={false}>
                <Icon name="edit-24" />
              </Fab>
            )}
          </>
        }
      >
        {[0, 1, 2, 3].map((i) => item(i))}
      </NavigationRail>
      <output data-value style={{ position: 'absolute', left: -9999 }}>
        {String(value)}
      </output>
    </div>
  );
}

/** Live (a11y): a collapsed rail without labels; the last destination is icon-only (aria-label). */
function LiveRailNoLabels() {
  const [value, setValue] = useState<unknown>(0);
  return (
    <div style={{ width: 96, height: 400, display: 'flex' }}>
      <NavigationRail value={value} onValueChange={setValue} showLabels={false} aria-label="Primary">
        {['Home', 'Activity'].map((t, i) => (
          <NavigationItem key={t} value={i} icon={<Icon name="stars-24" />} label={t} />
        ))}
        <NavigationItem value={2} icon={<Icon name="stars-24" />} aria-label="Saved" />
      </NavigationRail>
    </div>
  );
}

const fixture: FixtureModule = {
  component: 'navigation',
  variants: Object.fromEntries([
    ['live', { width: 412, height: 64, render: () => <LiveBar /> } satisfies FixtureVariant],
    ['live-rail-nolabels', { width: 96, height: 400, render: () => <LiveRailNoLabels /> } satisfies FixtureVariant],
    ['live-rail', { width: 280, height: 800, render: () => <LiveRail /> } satisfies FixtureVariant],
    ...Object.entries(manifest.variants).map(([name, v]): [string, FixtureVariant] => {
      const [w, h] = v.size as [number, number];
      return [
        name,
        {
          node: v.node,
          width: w,
          height: h,
          render: () => <div style={{ width: w, height: h, display: 'flex' }}>{render(name)}</div>,
        },
      ];
    }),
  ]),
};
export default fixture;
