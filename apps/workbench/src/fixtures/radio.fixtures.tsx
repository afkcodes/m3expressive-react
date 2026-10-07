import { Radio, RadioGroup } from '@m3x/react';
import { ForceState, type ForcedState } from '@m3x/react/testing';
import manifest from '../../../../figma/radio/manifest.json';
import type { FixtureModule, FixtureVariant } from './types.ts';

/** Figma "Radio buttons": {selected|unselected}-{state}. */
const fixture: FixtureModule = {
  component: 'radio',
  variants: Object.fromEntries([
    [
      'live',
      {
        render: () => (
          <RadioGroup defaultValue="a" aria-label="Choice">
            <Radio value="a" aria-label="A" />
            <Radio value="b" aria-label="B" />
          </RadioGroup>
        ),
      },
    ],
    [
      'live-group-disabled',
      {
        // A disabled group vs. the same group with every radio disabled: they must draw identically.
        render: () => (
          <div style={{ display: 'grid', rowGap: 16 }}>
            {(['group', 'items'] as const).map((row) => (
              <div key={row} data-row={row}>
                <RadioGroup defaultValue="a" aria-label={row} disabled={row === 'group'}>
                  <Radio value="a" aria-label="A" disabled={row === 'items'} />
                  <Radio value="b" aria-label="B" disabled={row === 'items'} />
                </RadioGroup>
              </div>
            ))}
          </div>
        ),
      },
    ],
    ...Object.entries(manifest.variants).map(([name, v]): [string, FixtureVariant] => {
      const [sel, state] = name.split('-') as ['selected' | 'unselected', string];
      const forced =
        state === 'hovered' || state === 'focused' || state === 'pressed' ? (state as ForcedState) : undefined;
      return [
        name,
        {
          node: v.node,
          render: () => (
            <ForceState state={forced}>
              <Radio value="a" aria-label={name} checked={sel === 'selected'} disabled={state === 'disabled'} />
            </ForceState>
          ),
        },
      ];
    }),
  ]),
};
export default fixture;
