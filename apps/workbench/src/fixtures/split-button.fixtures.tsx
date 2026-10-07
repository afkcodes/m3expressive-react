import {
  SplitButton,
  SplitButtonLeading,
  SplitButtonTrailing,
  type ButtonSize,
  type SplitButtonVariant,
} from '@m3x/react';
import { ForceState, type ForcedState } from '@m3x/react/testing';
import manifest from '../../../../figma/split-button/manifest.json';
import assets from '../../../../figma/split-button/assets.json';
import buttonAssets from '../../../../figma/button/assets.json';
import type { FixtureModule, FixtureVariant } from './types.ts';

function StarsFilled() {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor" aria-hidden>
      <path d={buttonAssets.icon} />
    </svg>
  );
}

const asForced = (s: string): ForcedState | undefined =>
  s === 'hovered' || s === 'focused' || s === 'pressed' ? s : undefined;

/** Figma "Split button": {colour}-{size}-{leading state}-{trailing state}. */
const fixture: FixtureModule = {
  component: 'split-button',
  variants: Object.fromEntries([
    ...(['filled', 'tonal', 'outlined', 'elevated'] as const).map((variant): [string, FixtureVariant] => [
      `${variant}-live`,
      {
        render: () => (
          <SplitButton variant={variant} size="medium">
            <SplitButtonLeading icon={<StarsFilled />}>Label</SplitButtonLeading>
            <SplitButtonTrailing aria-label="More options" />
          </SplitButton>
        ),
      },
    ]),
    ...Object.entries(manifest.variants).map(([name, v]): [string, FixtureVariant] => {
      const [variant, size, lead, trail] = name.split('-') as [SplitButtonVariant, ButtonSize, string, string];
      return [
        name,
        {
          node: v.node,
          render: () => (
            <SplitButton variant={variant} size={size} disabled={lead === 'disabled'}>
              <ForceState state={asForced(lead)} ripplePath={assets.ripple.leading[size]}>
                <SplitButtonLeading icon={<StarsFilled />}>Label</SplitButtonLeading>
              </ForceState>
              <ForceState state={asForced(trail)} ripplePath={assets.ripple.trailing[size]}>
                <SplitButtonTrailing aria-label="More options" expanded={trail === 'selected'} />
              </ForceState>
            </SplitButton>
          ),
        },
      ];
    }),
  ]),
};
export default fixture;
