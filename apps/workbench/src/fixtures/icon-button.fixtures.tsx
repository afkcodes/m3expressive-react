import { IconButton, type ButtonShape, type ButtonSize, type IconButtonVariant, type IconButtonWidth } from '@m3x/react';
import { ForceState, type ForcedState } from '@m3x/react/testing';
import manifest from '../../../../figma/icon-button/manifest.json';
import assets from '../../../../figma/icon-button/assets.json';
import type { FixtureModule } from './types.ts';

function StarsFilled() {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor" aria-hidden>
      <path d={assets.icon} />
    </svg>
  );
}

const fixture: FixtureModule = {
  component: 'icon-button',
  variants: Object.fromEntries([
    [
      'live',
      {
        render: () => (
          <IconButton aria-label="Favourite" variant="filled" size="medium">
            <StarsFilled />
          </IconButton>
        ),
      },
    ],
    ...Object.entries(manifest.variants).map(([name, v]) => {
      const [variant, shape, size, width, state] = name.split('-') as [IconButtonVariant, ButtonShape, ButtonSize, IconButtonWidth, string];
      const forced: ForcedState | undefined = state === 'hovered' || state === 'focused' || state === 'pressed' ? state : undefined;
      const ripples = assets.ripple as Record<string, Record<string, Record<string, string>>>;
      return [
        name,
        {
          node: v.node,
          render: () => (
            <ForceState state={forced} ripplePath={ripples[size]![width]![shape]}>
              <IconButton aria-label="Favourite" variant={variant} size={size} width={width} shape={shape} disabled={state === 'disabled'}>
                <StarsFilled />
              </IconButton>
            </ForceState>
          ),
        },
      ];
    }),
  ]),
};
export default fixture;
