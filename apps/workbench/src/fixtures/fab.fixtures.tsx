import { useState } from 'react';
import { ExtendedFab, Fab, type ExtendedFabSize, type FabColor, type FabSize } from '@m3x/react';
import { ForceState, type ForcedState } from '@m3x/react/testing';
import manifest from '../../../../figma/fab/manifest.json';
import assets from '../../../../figma/fab/assets.json';
import buttonAssets from '../../../../figma/button/assets.json';
import type { FixtureModule, FixtureVariant } from './types.ts';

function StarsFilled() {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor" aria-hidden>
      <path d={buttonAssets.icon} />
    </svg>
  );
}

/** Live: clicking the FAB collapses / expands it. */
function ExtendedToggle() {
  const [expanded, setExpanded] = useState(true);
  return (
    <ExtendedFab icon={<StarsFilled />} expanded={expanded} onClick={() => setExpanded((e) => !e)}>
      Extended
    </ExtendedFab>
  );
}

const toColor = (c: string) => c.replace(/([A-Z])/g, (m) => '-' + m.toLowerCase()) as FabColor;

/** Figma "FAB" / "Extended FAB": {fab|extended}-{colour}-{size}-{state}. */
const fixture: FixtureModule = {
  component: 'fab',
  variants: Object.fromEntries([
    [
      'fab-live',
      {
        render: () => (
          <Fab aria-label="Edit" size="medium">
            <StarsFilled />
          </Fab>
        ),
      },
    ],
    [
      'extended-live',
      {
        render: () => (
          <ExtendedFab size="medium" icon={<StarsFilled />}>
            Label
          </ExtendedFab>
        ),
      },
    ],
    ['extended-toggle', { render: () => <ExtendedToggle /> }],
    ...Object.entries(manifest.variants).map(([name, v]): [string, FixtureVariant] => {
      const [kind, c, size, state] = name.split('-') as [string, string, string, string];
      const forced: ForcedState | undefined =
        state === 'hovered' || state === 'focused' || state === 'pressed' ? state : undefined;
      const color = toColor(c);
      return [
        name,
        {
          node: v.node,
          render: () =>
            kind === 'fab' ? (
              <ForceState
                state={forced}
                ripplePath={assets.fab[size as FabSize][c as keyof (typeof assets.fab)['default']]}
              >
                <Fab aria-label={name} size={size as FabSize} color={color}>
                  <StarsFilled />
                </Fab>
              </ForceState>
            ) : (
              <ForceState
                state={forced}
                ripplePath={assets.efab[size as ExtendedFabSize][c as keyof (typeof assets.efab)['small']]}
              >
                <ExtendedFab size={size as ExtendedFabSize} color={color} icon={<StarsFilled />}>
                  Label
                </ExtendedFab>
              </ForceState>
            ),
        },
      ];
    }),
  ]),
};
export default fixture;
