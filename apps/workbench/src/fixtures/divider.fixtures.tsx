import * as stylex from '@stylexjs/stylex';
import { Divider, type DividerInset } from '@m3x/react';
import manifest from '../../../../figma/divider/manifest.json';
import type { FixtureModule, FixtureVariant } from './types';

const box = stylex.create({ h: { width: 320 }, v: { height: 120, display: 'flex' } });
const INSET: Record<string, DividerInset> = { full: 'none', inset: 'start', middle: 'middle' };

/** Figma "Dividers": {horizontal|vertical}-{full|inset|middle}, horizontal-subhead. */
const fixture: FixtureModule = {
  component: 'divider',
  variants: Object.fromEntries(
    Object.entries(manifest.variants).map(([name, v]): [string, FixtureVariant] => {
      const [orientation, kind] = name.split('-') as ['horizontal' | 'vertical', string];
      return [
        name,
        {
          node: v.node,
          render: () =>
            orientation === 'horizontal' ? (
              <div {...stylex.props(box.h)}>
                {kind === 'subhead' ? <Divider subheader="Subheader" /> : <Divider inset={INSET[kind]} />}
              </div>
            ) : (
              <div {...stylex.props(box.v)}>
                <Divider orientation="vertical" inset={INSET[kind]} />
              </div>
            ),
        },
      ];
    }),
  ),
};
export default fixture;
