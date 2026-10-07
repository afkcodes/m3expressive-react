import * as stylex from '@stylexjs/stylex';
import { typescale, type TypescaleRole } from '@m3x/react';
import { textBox } from '@m3x/react/primitives';
import { color } from '@m3x/react/tokens/color.stylex';
import manifest from '../../../../figma/typescale/manifest.json';
import type { FixtureModule } from './types.ts';

/** Foundations calibration: each M3 text style rendered like the Figma "Styles" page specimen. */
const s = stylex.create({
  text: { color: color.onSurface, whiteSpace: 'nowrap', margin: 0 },
});

const roleOf = (style: string) =>
  style
    .replace('M3/', '')
    .split(/[/-]/)
    .map((w, i) => (i === 0 ? w : w[0]!.toUpperCase() + w.slice(1)))
    .join('') as TypescaleRole;

const fixture: FixtureModule = {
  component: 'typescale',
  variants: Object.fromEntries(
    Object.entries(manifest.variants).map(([name, v]) => [
      name,
      {
        node: v.node,
        render: () => <p {...stylex.props(typescale[roleOf(v.style)], textBox.hug, s.text)}>{v.text}</p>,
      },
    ]),
  ),
};
export default fixture;
