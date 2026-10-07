import * as stylex from '@stylexjs/stylex';
import { Card, type CardVariant } from '@m3x/react';
import { ForceState, type ForcedState } from '@m3x/react/testing';
import manifest from '../../../../figma/card-states/manifest.json';
import type { FixtureModule, FixtureVariant } from './types.ts';

const s = stylex.create({ size: { width: 360, height: 360 } });

/** ".Building Blocks/Card states/*": the bare card container in each interaction state (360×360). */
const live = (variant: CardVariant): [string, FixtureVariant] => [
  `${variant}-live`,
  { render: () => <Card variant={variant} interactive aria-label={`${variant} card`} sx={s.size} /> },
];

const fixture: FixtureModule = {
  component: 'card-states',
  variants: Object.fromEntries([
    // Real, interactive cards: driven by pointer/keyboard in tests/visual/interaction.spec.ts.
    live('outlined'),
    live('elevated'),
    live('filled'),
    ...Object.entries(manifest.variants).map(([name, v]) => {
      const [variant, state] = name.split('-') as [CardVariant, string];
      const forced = state === 'enabled' ? undefined : (state as ForcedState);
      return [
        name,
        {
          node: v.node,
          render: () => (
            <ForceState state={forced}>
              <Card variant={variant} sx={s.size} />
            </ForceState>
          ),
        },
      ];
    }),
  ]),
};
export default fixture;
