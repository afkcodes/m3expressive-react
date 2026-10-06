import { FabMenu, FabMenuItem, type FabMenuColor } from '@m3x/react';
import { ForceState, type ForcedState } from '@m3x/react/testing';
import manifest from '../../../../figma/fab-menu/manifest.json';
import assets from '../../../../figma/fab-menu/assets.json';
import buttonAssets from '../../../../figma/button/assets.json';
import type { FixtureModule, FixtureVariant } from './types';

function StarsFilled() {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor" aria-hidden>
      <path d={buttonAssets.icon} />
    </svg>
  );
}

/** Figma "FAB menu" building blocks (item-{colour}-{state}, close-{colour}-{state}) + menu-{colour}. */
const fixture: FixtureModule = {
  component: 'fab-menu',
  variants: Object.fromEntries([
    [
      'live',
      {
        render: () => (
          <FabMenu aria-label="Actions" icon={<StarsFilled />}>
            <FabMenuItem icon={<StarsFilled />}>First</FabMenuItem>
            <FabMenuItem icon={<StarsFilled />}>Second</FabMenuItem>
            <FabMenuItem icon={<StarsFilled />}>Third</FabMenuItem>
          </FabMenu>
        ),
      },
    ],
    ...Object.entries(manifest.variants).map(([name, v]): [string, FixtureVariant] => {
      const [part, c, state = 'enabled'] = name.split('-') as [string, FabMenuColor, string];
      const forced: ForcedState | undefined = state === 'hovered' || state === 'focused' || state === 'pressed' ? state : undefined;
      return [
        name,
        {
          node: v.node,
          render: () =>
            part === 'menu' ? (
              <FabMenu aria-label="Actions" color={c} open>
                <FabMenuItem icon={<StarsFilled />}>First</FabMenuItem>
                <FabMenuItem icon={<StarsFilled />}>Second</FabMenuItem>
                <FabMenuItem icon={<StarsFilled />}>Third</FabMenuItem>
              </FabMenu>
            ) : part === 'item' ? (
              <ForceState state={forced} ripplePath={assets.itemRipple}>
                <FabMenuItem color={c} icon={<StarsFilled />}>Label</FabMenuItem>
              </ForceState>
            ) : (
              <ForceState state={forced} ripplePath={assets.closeRipple}>
                <FabMenu aria-label="Actions" color={c} open />
              </ForceState>
            ),
        },
      ];
    }),
  ]),
};
export default fixture;
