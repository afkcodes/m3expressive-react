import { Checkbox } from '@m3x/react';
import { ForceState, type ForcedState } from '@m3x/react/testing';
import manifest from '../../../../figma/checkbox/manifest.json';
import assets from '../../../../figma/checkbox/assets.json';
import type { FixtureModule, FixtureVariant } from './types';

/** Figma "Checkboxes": 6 types × 5 states. */
const fixture: FixtureModule = {
  component: 'checkbox',
  variants: Object.fromEntries([
    ...(['unselected', 'selected', 'indeterminate'] as const).map((t): [string, FixtureVariant] => [
      `${t}-live`,
      { render: () => <Checkbox aria-label={t} defaultChecked={t === 'selected'} indeterminate={t === 'indeterminate'} /> },
    ]),
    ...Object.entries(manifest.variants).map(([name, v]): [string, FixtureVariant] => {
      const parts = name.split('-');
      const state = parts.pop()!;
      const type = parts.join('-');
      const error = type.startsWith('error');
      const base = error ? type.slice('error-'.length) : type;
      const forced = state === 'hovered' || state === 'focused' || state === 'pressed' ? (state as ForcedState) : undefined;
      return [
        name,
        {
          node: v.node,
          layers: { container: '[data-part=box]' },
          render: () => (
            <ForceState state={forced} ripplePath={assets.ripple}>
              <Checkbox
                aria-label={name}
                checked={base === 'selected'}
                indeterminate={base === 'indeterminate'}
                error={error}
                disabled={state === 'disabled'}
              />
            </ForceState>
          ),
        },
      ];
    }),
  ]),
};
export default fixture;
