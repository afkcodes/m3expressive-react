import * as stylex from '@stylexjs/stylex';
import { Ripple, StateLayer, focusRing, stateLayerHost, typescale } from '@m3x/react';
import { color } from '@m3x/react/tokens/color.stylex';
import { shape } from '@m3x/react/tokens/shape.stylex';
import type { FixtureModule } from './types.ts';

/**
 * Harness self-test — exercises tokens + primitives on a token-built pill.
 * Not an M3 component; real components get their own *.fixtures.tsx.
 */
const s = stylex.create({
  pill: {
    display: 'inline-flex',
    alignItems: 'center',
    height: 40,
    paddingInline: 16,
    borderRadius: shape.cornerFull,
    borderWidth: 0,
    backgroundColor: color.primary,
    color: color.onPrimary,
    cursor: 'pointer',
  },
  nudged: { paddingInline: 17 },
});

function Pill({ nudged = false }: { nudged?: boolean }) {
  return (
    <button
      type="button"
      data-part="root"
      {...stylex.props(s.pill, stateLayerHost.host, focusRing.host, typescale.labelLarge, nudged && s.nudged)}
    >
      <StateLayer />
      <Ripple />
      <span data-part="label">Label</span>
    </button>
  );
}

const fixture: FixtureModule = {
  component: '_harness',
  variants: {
    pill: { render: () => <Pill />, layers: { Label: '[data-part=label]' } },
    'pill-nudged': { render: () => <Pill nudged /> },
  },
};
export default fixture;
