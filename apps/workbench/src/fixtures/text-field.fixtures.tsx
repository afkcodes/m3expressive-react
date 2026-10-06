import { useState, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { TextField, type TextFieldVariant } from '@m3x/react';
import { textFieldVars } from '@m3x/react/components/TextField/textField.stylex';
import { ForceState, type ForcedState } from '@m3x/react/testing';
import { color } from '@m3x/react/tokens/color.stylex';
import manifest from '../../../../figma/text-field/manifest.json';
import assets from '../../../../figma/text-field/assets.json';
import type { FixtureModule, FixtureVariant } from './types';

const Icon = ({ name }: { name: 'search' | 'cancel' }) => (
  <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path transform={`translate(${assets[name].offset.join(' ')})`} d={assets[name].d} />
  </svg>
);
/** The kit paints the outlined notch with Surface (see figma/text-field/spec.json note). */
const kit = stylex.create({ notch: { [textFieldVars.notchColor]: color.surface } });

function Live() {
  const [v, setV] = useState('');
  return (
    <div style={{ position: 'relative' }}>
      <TextField label="Label" supportingText="Supporting text" value={v} onValueChange={setV} />
      <div style={{ position: 'absolute', top: 140, display: 'grid', gap: 24 }}>
        <TextField variant="outlined" label="Email" supportingText="We never share it" leadingIcon={<Icon name="search" />} />
        <output data-value>{v}</output>
      </div>
    </div>
  );
}

const fixture: FixtureModule = {
  component: 'text-field',
  variants: Object.fromEntries([
    ['live', { width: 210, height: 56, padding: 64, render: () => <Live /> } satisfies FixtureVariant],
    ...Object.entries(manifest.variants).map(([name, v]): [string, FixtureVariant] => {
      const [style, st, config, icons] = name.split('-') as [TextFieldVariant, string, 'label' | 'input' | 'placeholder', string];
      const error = st === 'error';
      // The kit draws Error + input text focused (3px, caret); Error + label / placeholder resting.
      const forced: ForcedState | undefined =
        st === 'hovered' ? 'hovered' : st === 'focused' || (error && config === 'input') ? 'focused' : undefined;
      const render = (): ReactNode => (
        <ForceState state={forced}>
          <TextField
            variant={style}
            label="Label"
            value={config === 'input' ? 'Input' : ''}
            placeholder={config === 'placeholder' ? 'Placeholder' : undefined}
            alwaysFloatLabel={config === 'placeholder'}
            supportingText="Supporting text"
            error={error}
            disabled={st === 'disabled'}
            leadingIcon={icons[0] === 'l' ? <Icon name="search" /> : undefined}
            trailingIcon={icons[1] === 't' ? <Icon name="cancel" /> : undefined}
            sx={style === 'outlined' ? kit.notch : undefined}
          />
        </ForceState>
      );
      return [name, { node: v.node, width: v.size[0], height: v.size[1], padding: 64, render }];
    }),
  ]),
};
export default fixture;
