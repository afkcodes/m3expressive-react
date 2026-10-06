import { Badge } from '@m3x/react';
import type { FixtureModule } from './types';

/** Figma Badges set: Size=Large (label "3") and Size=Small. */
const fixture: FixtureModule = {
  component: 'badge',
  variants: {
    large: { node: '51592:4770', layers: { 'Badge label': 'span > span' }, render: () => <Badge>3</Badge> },
    small: { node: '51592:4769', render: () => <Badge /> },
  },
};
export default fixture;
