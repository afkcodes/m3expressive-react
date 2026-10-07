import * as stylex from '@stylexjs/stylex';
import { color } from '@m3x/react/tokens/color.stylex';
import { elevation } from '@m3x/react/tokens/elevation.stylex';
import { shape } from '@m3x/react/tokens/shape.stylex';
import type { FixtureModule, FixtureVariant } from './types.ts';

/** Foundations calibration: the Figma "Elevation" specimen cards (216², corner large). */
const s = stylex.create({
  card: { width: 216, height: 216, borderRadius: shape.cornerLarge },
  level1: { backgroundColor: color.surfaceContainerLow, boxShadow: elevation.level1 },
  level2: { backgroundColor: color.surfaceContainer, boxShadow: elevation.level2 },
  level3: { backgroundColor: color.surfaceContainerHigh, boxShadow: elevation.level3 },
  level4: { backgroundColor: color.surfaceContainerHigh, boxShadow: elevation.level4 },
  level5: { backgroundColor: color.surfaceContainerHighest, boxShadow: elevation.level5 },
});

const levels = [1, 2, 3, 4, 5] as const;
const variants: Record<string, FixtureVariant> = {};
for (const scheme of ['light', 'dark'] as const) {
  for (const l of levels) {
    variants[`${scheme}-${l}`] = {
      colorScheme: scheme,
      render: () => <div {...stylex.props(s.card, s[`level${l}`])} />,
    };
  }
}

const fixture: FixtureModule = { component: 'elevation', variants };
export default fixture;
