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
