import { Button, IconButton, PlainTooltipSurface, RichTooltip, RichTooltipSurface, Tooltip } from '@m3x/react';
import manifest from '../../../../figma/tooltip/manifest.json';
import buttonAssets from '../../../../figma/button/assets.json';
import type { FixtureModule } from './types.ts';

const Stars = () => (
  <svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor" aria-hidden>
    <path d={buttonAssets.icon} />
  </svg>
);

/** Figma "Tooltips": plain (single line) and rich. */
const fixture: FixtureModule = {
  component: 'tooltip',
  variants: {
    'plain-single': {
      node: manifest.variants['plain-single'].node,
      render: () => <PlainTooltipSurface>Supporting text</PlainTooltipSurface>,
    },
    rich: {
      node: manifest.variants.rich.node,
      render: () => (
        <RichTooltipSurface
          subhead="Title"
          actions={
            <>
              <Button variant="text">Action</Button>
              <Button variant="text">Action</Button>
            </>
          }
        >
          Supporting line text lorem ipsum dolor sit amet, consectetur
        </RichTooltipSurface>
      ),
    },
    live: {
      render: () => (
        <div style={{ padding: 60, display: 'flex', gap: 24 }}>
          <Tooltip content="Supporting text" delay={0}>
            <IconButton aria-label="Favourite">
              <Stars />
            </IconButton>
          </Tooltip>
          <RichTooltip
            trigger={<Button variant="text">Details</Button>}
            subhead="Title"
            actions={<Button variant="text">Action</Button>}
          >
            Supporting line text lorem ipsum dolor sit amet, consectetur
          </RichTooltip>
          <RichTooltip
            persistent
            trigger={<Button variant="text">Pinned</Button>}
            subhead="Pinned"
            actions={<Button variant="text">Action</Button>}
          >
            Persistent rich tooltip
          </RichTooltip>
        </div>
      ),
    },
  },
};
export default fixture;
