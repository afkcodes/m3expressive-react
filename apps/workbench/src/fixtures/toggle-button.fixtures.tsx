import { ToggleButton, type ButtonShape, type ButtonSize, type ToggleButtonVariant } from '@m3x/react';
import { ForceState, ToolbarScope, type ForcedState } from '@m3x/react/testing';
import manifest from '../../../../figma/toggle-button/manifest.json';
import assets from '../../../../figma/toggle-button/assets.json';
import type { FixtureModule, FixtureVariant } from './types.ts';

/** The kit's toggle icon, as each Selected state draws it (24-unit box). */
function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor" aria-hidden>
      <path d={d} />
    </svg>
  );
}

const fixture: FixtureModule = {
  component: 'toggle-button',
  variants: Object.fromEntries([
    // Live (uncontrolled, no forced state) for interaction.spec.ts: medium, round when unselected.
    ...(['filled', 'elevated', 'outlined', 'tonal'] as const).map((variant): [string, FixtureVariant] => [
      `${variant}-live`,
      {
        render: () => (
          <ToggleButton
            variant={variant}
            size="medium"
            icon={<Icon d={assets.icon} />}
            selectedIcon={<Icon d={assets.selectedIcon} />}
          >
            Label
          </ToggleButton>
        ),
      },
    ]),
    // In a toolbar: hover lifts the toggle to level 1 (motion tests).
    [
      'toolbar-live',
      {
        render: () => (
          <ToolbarScope variant="standard">
            <ToggleButton size="medium" icon={<Icon d={assets.icon} />} selectedIcon={<Icon d={assets.selectedIcon} />}>
              Label
            </ToggleButton>
          </ToolbarScope>
        ),
      },
    ],
    ...Object.entries(manifest.variants).map(([name, v]): [string, FixtureVariant] => {
      const [variant, selection, shape, size, state] = name.split('-') as [
        ToggleButtonVariant,
        'selected' | 'unselected',
        ButtonShape,
        ButtonSize,
        string,
      ];
      const forced: ForcedState | undefined =
        state === 'hovered' || state === 'focused' || state === 'pressed' ? state : undefined;
      const ripplePath = assets.ripple[selection][size][shape];
      return [
        name,
        {
          node: v.node,
          render: () => (
            <ForceState state={forced} ripplePath={ripplePath}>
              <ToggleButton
                variant={variant}
                size={size}
                shape={shape}
                pressed={selection === 'selected'}
                icon={<Icon d={assets.icon} />}
                selectedIcon={<Icon d={assets.selectedIcon} />}
                disabled={state === 'disabled'}
              >
                Label
              </ToggleButton>
            </ForceState>
          ),
        },
      ];
    }),
  ]),
};
export default fixture;
