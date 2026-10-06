import { Shape, type ShapeName } from '@m3x/react';
import manifest from '../../../../figma/shapes/manifest.json';
import type { FixtureModule } from './types';

/** The kit's Shape Set: each variant is the 380×380 component, vector inside. */
const camel = (s: string) => s.replace(/-(\w)/g, (_, c: string) => c.toUpperCase()) as ShapeName;

const fixture: FixtureModule = {
  component: 'shapes',
  variants: Object.fromEntries(
    Object.entries(manifest.variants).map(([key, v]) => [
      key,
      {
        node: v.node,
        // The kit's 4-leaf clover frame is 381px wide (1px designer slip); the vector is unaffected.
        width: v.size[0],
        height: v.size[1],
        layers: { shape: 'path' },
        render: () => <Shape shape={camel(key)} size={380} />,
      },
    ]),
  ),
};
export default fixture;
