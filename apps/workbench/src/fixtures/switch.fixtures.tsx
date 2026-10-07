import { Switch } from '@m3x/react';
import { ForceState, type ForcedState } from '@m3x/react/testing';
import manifest from '../../../../figma/switch/manifest.json';
import type { FixtureModule, FixtureVariant } from './types.ts';

/** Figma "Switch": {on|off}-{plain|icon}-{state}. */
const fixture: FixtureModule = {
  component: 'switch',
  variants: Object.fromEntries([
    ['live', { render: () => <Switch aria-label="Wi-Fi" /> }],
    ...Object.entries(manifest.variants).map(([name, v]): [string, FixtureVariant] => {
      const [on, kind, state] = name.split('-') as ['on' | 'off', 'plain' | 'icon', string];
      const forced =
        state === 'hovered' || state === 'focused' || state === 'pressed' ? (state as ForcedState) : undefined;
      return [
        name,
        {
          node: v.node,
          render: () => (
            <ForceState state={forced}>
              <Switch aria-label={name} checked={on === 'on'} icons={kind === 'icon'} disabled={state === 'disabled'} />
            </ForceState>
          ),
        },
      ];
    }),
  ]),
};
export default fixture;
