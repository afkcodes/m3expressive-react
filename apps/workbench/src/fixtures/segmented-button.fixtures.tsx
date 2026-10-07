import * as stylex from '@stylexjs/stylex';
import { SegmentedButton, SegmentedButtonItem, type SegmentedButtonDensity } from '@m3x/react';
import { ForceState, type ForcedState } from '@m3x/react/testing';
import manifest from '../../../../figma/segmented-button/manifest.json';
import assets from '../../../../figma/segmented-button/assets.json';
import type { FixtureModule, FixtureVariant } from './types.ts';

const Stars = () => (
  <svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor" aria-hidden>
    <path d={assets.stars} />
  </svg>
);
const w = stylex.create({ px: (px: number) => ({ width: px }) });
const asForced = (s: string): ForcedState | undefined => (s === 'hovered' || s === 'focused' || s === 'pressed' ? s : undefined);

/** Figma "Segmented button": set-{segments}-d{density} and {start|middle|end}-{config}-{selected}-{state}. */
const fixture: FixtureModule = {
  component: 'segmented-button',
  variants: Object.fromEntries([
    [
      'live',
      {
        render: () => (
          <SegmentedButton defaultValue={['1']} aria-label="View" sx={w.px(310)}>
            {['1', '2', '3'].map((v) => (
              <SegmentedButtonItem key={v} value={v}>Label</SegmentedButtonItem>
            ))}
          </SegmentedButton>
        ),
      },
    ],
    [
      'live-icons',
      {
        render: () => (
          <SegmentedButton defaultValue={['1']} aria-label="View" sx={w.px(360)}>
            {['1', '2', '3'].map((v) => (
              <SegmentedButtonItem key={v} value={v} icon={<Stars />}>
                Label
              </SegmentedButtonItem>
            ))}
          </SegmentedButton>
        ),
      },
    ],
    [
      'live-auto',
      {
        // No width: every segment takes the widest one's width (Compose IntrinsicSize.Min + weight).
        render: () => (
          <SegmentedButton defaultValue={['week']} aria-label="Range">
            {['Day', 'Week', 'Month', 'Year'].map((v) => (
              <SegmentedButtonItem key={v} value={v.toLowerCase()} icon={<Stars />}>
                {v}
              </SegmentedButtonItem>
            ))}
          </SegmentedButton>
        ),
      },
    ],
    ...Object.entries(manifest.variants).map(([name, v]): [string, FixtureVariant] => {
      const parts = name.split('-');
      if (parts[0] === 'set') {
        const n = Number(parts[1]);
        const density = -Number(parts[2]!.slice(1)) as SegmentedButtonDensity;
        return [
          name,
          {
            node: v.node,
            render: () => (
              <SegmentedButton density={density} value={['0']} sx={w.px(n * 104 - (n - 1))}>
                {Array.from({ length: n }, (_, i) => (
                  <SegmentedButtonItem key={i} value={String(i)}>Label</SegmentedButtonItem>
                ))}
              </SegmentedButton>
            ),
          },
        ];
      }
      const [position, cfg, sel, state] = parts as ['start' | 'middle' | 'end', 'icon' | 'label' | 'labelicon', string, string];
      return [
        name,
        {
          node: v.node,
          render: () => (
            <ForceState state={asForced(state)}>
              <SegmentedButtonItem
                value="a"
                position={position}
                selected={sel === 'selected'}
                disabled={state === 'disabled'}
                icon={cfg !== 'label' ? <Stars /> : undefined}
                sx={w.px(108)}
              >
                {cfg !== 'icon' ? 'Label' : undefined}
              </SegmentedButtonItem>
            </ForceState>
          ),
        },
      ];
    }),
  ]),
};
export default fixture;
