import { Button, type ButtonShape, type ButtonSize, type ButtonVariant } from '@m3x/react';
import { ForceState, type ForcedState } from '@m3x/react/testing';
import manifest from '../../../../figma/button/manifest.json';
import assets from '../../../../figma/button/assets.json';
import type { FixtureModule } from './types';

/** Material Symbols "stars" (filled) — the kit's default button icon, 24-unit box. */
function StarsFilled() {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor" aria-hidden>
      <path d={assets.icon} />
    </svg>
  );
}

const fixture: FixtureModule = {
  component: 'button',
  variants: Object.fromEntries(
    Object.entries(manifest.variants).map(([name, v]) => {
      const [variant, shape, size, state] = name.split('-') as [ButtonVariant, ButtonShape, ButtonSize, string];
      const forced: ForcedState | undefined =
        state === 'hovered' || state === 'focused' || state === 'pressed' ? state : undefined;
      const ripplePath = assets.ripple[size][shape];
      return [
        name,
        {
          node: v.node,
          render: () => (
            <ForceState state={forced} ripplePath={ripplePath}>
              <Button variant={variant} size={size} shape={shape} icon={<StarsFilled />} disabled={state === 'disabled'}>
                Label
              </Button>
            </ForceState>
          ),
        },
      ];
    }),
  ),
};
export default fixture;
