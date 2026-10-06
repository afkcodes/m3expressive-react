import { ToggleIconButton, type ButtonShape, type ButtonSize, type IconButtonVariant, type IconButtonWidth } from '@m3x/react';
import { ForceState, type ForcedState } from '@m3x/react/testing';
import manifest from '../../../../figma/toggle-icon-button/manifest.json';
import assets from '../../../../figma/toggle-icon-button/assets.json';
import type { FixtureModule, FixtureVariant } from './types';

/** The kit's toggle icon, as each Selected state draws it (24-unit box). */
function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor" aria-hidden>
      <path d={d} />
    </svg>
  );
}

type Ripples = Record<'selected' | 'unselected', Record<ButtonSize, Record<IconButtonWidth, Record<ButtonShape, string | null>>>>;

const fixture: FixtureModule = {
  component: 'toggle-icon-button',
  variants: Object.fromEntries([
    // Live (uncontrolled, no forced state) for interaction.spec.ts: medium default, round when unselected.
    ...(['filled', 'tonal', 'outlined', 'standard'] as const).map((variant): [string, FixtureVariant] => [
      `${variant}-live`,
      {
        render: () => (
          <ToggleIconButton aria-label={variant} variant={variant} size="medium" selectedIcon={<Icon d={assets.selectedIcon} />}>
            <Icon d={assets.icon} />
          </ToggleIconButton>
        ),
      },
    ]),
    ...Object.entries(manifest.variants).map(([name, v]): [string, FixtureVariant] => {
      const [variant, selection, shape, size, width, state] = name.split('-') as [IconButtonVariant, 'selected' | 'unselected', ButtonShape, ButtonSize, IconButtonWidth, string];
      const forced: ForcedState | undefined =
        state === 'hovered' || state === 'focused' || state === 'pressed' ? state : undefined;
      const ripplePath = (assets.ripple as Ripples)[selection][size][width][shape] ?? undefined;
      return [
        name,
        {
          node: v.node,
          render: () => (
            <ForceState state={forced} ripplePath={ripplePath}>
              <ToggleIconButton
                aria-label={name}
                variant={variant}
                size={size}
                width={width}
                shape={shape}
                pressed={selection === 'selected'}
                selectedIcon={<Icon d={assets.selectedIcon} />}
                disabled={state === 'disabled'}
              >
                <Icon d={assets.icon} />
              </ToggleIconButton>
            </ForceState>
          ),
        },
      ];
    }),
  ]),
};
export default fixture;
