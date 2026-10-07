import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import {
  Button,
  ButtonGroup,
  ConnectedButtonGroup,
  ConnectedButtonGroupItem,
  ToggleButton,
  ToggleIconButton,
  type ButtonShape,
  type ButtonSize,
} from '@m3x/react';
import { ForceState, type ForcedState } from '@m3x/react/testing';
import manifest from '../../../../figma/button-group/manifest.json';
import assets from '../../../../figma/button-group/assets.json';
import toggleAssets from '../../../../figma/toggle-button/assets.json';
import iconToggleAssets from '../../../../figma/toggle-icon-button/assets.json';
import type { FixtureModule, FixtureVariant } from './types.ts';

const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor" aria-hidden>
    <path d={d} />
  </svg>
);
const stars = <Icon d={iconToggleAssets.icon} />;
const starsFilled = <Icon d={iconToggleAssets.selectedIcon} />;

const w = stylex.create({ px: (px: number) => ({ width: px }) });
/** The kit's group / disabled-segment instances are wider than their content (designer-set widths). */
const GROUP_W: Record<ButtonSize, number> = { xsmall: 259, small: 295, medium: 370, large: 598, xlarge: 790 };
const DISABLED_W: Partial<Record<ButtonSize, number>> = { xsmall: 85, small: 97, medium: 122, large: 198 };

const asForced = (s: string): ForcedState | undefined =>
  s === 'hovered' || s === 'focused' || s === 'pressed' ? s : undefined;

/** Live (cleanup): a standard group that the button unmounts, e.g. mid-press. */
function LiveUnmount() {
  const [mounted, setMounted] = useState(true);
  return (
    <div style={{ display: 'grid', rowGap: 16 }}>
      {mounted && (
        <div data-animated>
          <ButtonGroup size="small" aria-label="Actions">
            <Button variant="tonal">Archive</Button>
            <Button variant="tonal">Move</Button>
            <Button variant="tonal">Delete</Button>
          </ButtonGroup>
        </div>
      )}
      <button type="button" data-unmount onClick={() => setMounted(false)}>
        Unmount
      </button>
    </div>
  );
}

const fixture: FixtureModule = {
  component: 'button-group',
  variants: Object.fromEntries([
    ['live-unmount', { render: () => <LiveUnmount /> } satisfies FixtureVariant],
    [
      'standard-live',
      {
        render: () => (
          <ButtonGroup size="small" aria-label="Actions">
            <Button variant="tonal">Archive</Button>
            <Button variant="tonal">Move to folder</Button>
            <Button variant="tonal">Delete</Button>
          </ButtonGroup>
        ),
      },
    ],
    [
      'live-group-disabled',
      {
        // A disabled group vs. the same group with every segment disabled: they must draw identically.
        render: () => (
          <div style={{ display: 'grid', rowGap: 16 }}>
            {(['group', 'items'] as const).map((row) => (
              <div key={row} data-row={row}>
                <ConnectedButtonGroup
                  size="medium"
                  defaultValue={['1']}
                  aria-label={row}
                  disabled={row === 'group'}
                  sx={w.px(GROUP_W.medium)}
                >
                  {['1', '2', '3'].map((v) => (
                    <ConnectedButtonGroupItem
                      key={v}
                      value={v}
                      icon={stars}
                      selectedIcon={starsFilled}
                      disabled={row === 'items'}
                    >
                      Label
                    </ConnectedButtonGroupItem>
                  ))}
                </ConnectedButtonGroup>
              </div>
            ))}
          </div>
        ),
      },
    ],
    [
      'connected-live',
      {
        render: () => (
          <ConnectedButtonGroup size="medium" defaultValue={['1']} aria-label="Options" sx={w.px(GROUP_W.medium)}>
            {['1', '2', '3'].map((v) => (
              <ConnectedButtonGroupItem key={v} value={v} icon={stars} selectedIcon={starsFilled}>
                Label
              </ConnectedButtonGroupItem>
            ))}
          </ConnectedButtonGroup>
        ),
      },
    ],
    ...Object.entries(manifest.variants).map(([name, v]): [string, FixtureVariant] => {
      const parts = name.split('-');
      const kind = parts[0];
      let render: () => React.ReactNode;
      if (kind === 'standard') {
        const [, shape, size, color, type] = parts as [
          string,
          ButtonShape,
          ButtonSize,
          'tonal' | 'outlined' | 'filled',
          'icon' | 'label',
        ];
        render = () => (
          <ButtonGroup size={size}>
            {[0, 1, 2, 3].map((i) =>
              type === 'icon' ? (
                <ToggleIconButton key={i} aria-label={`b${i}`} variant={color} size={size} width="wide" shape={shape}>
                  {stars}
                </ToggleIconButton>
              ) : (
                <ToggleButton key={i} variant={color} size={size} shape={shape} icon={<Icon d={toggleAssets.icon} />}>
                  Label
                </ToggleButton>
              ),
            )}
          </ButtonGroup>
        );
      } else if (kind === 'connected') {
        const [, shape, size] = parts as [string, ButtonShape, ButtonSize];
        render = () => (
          <ConnectedButtonGroup size={size} shape={shape} value={['1']} sx={w.px(GROUP_W[size])}>
            {['1', '2', '3'].map((val) => (
              <ConnectedButtonGroupItem key={val} value={val} icon={stars} selectedIcon={starsFilled}>
                Label
              </ConnectedButtonGroupItem>
            ))}
          </ConnectedButtonGroup>
        );
      } else {
        const [, size, sel, state] = parts as [string, ButtonSize, 'selected' | 'unselected', string];
        const ripple =
          assets.segRipple[{ xsmall: 'xs', small: 's', medium: 'm', large: 'l', xlarge: 'xl' }[size] as 'xs'][sel];
        const width = state === 'disabled' && sel === 'unselected' ? DISABLED_W[size] : undefined;
        render = () => (
          <ForceState state={asForced(state)} ripplePath={ripple}>
            <ConnectedButtonGroupItem
              value="a"
              size={size}
              selected={sel === 'selected'}
              icon={stars}
              selectedIcon={starsFilled}
              disabled={state === 'disabled'}
              sx={width ? w.px(width) : undefined}
            >
              Label
            </ConnectedButtonGroupItem>
          </ForceState>
        );
      }
      return [name, { node: v.node, render }];
    }),
  ]),
};
export default fixture;
