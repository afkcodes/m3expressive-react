import * as stylex from '@stylexjs/stylex';
import {
  Avatar,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  CardHeadline,
  CardMedia,
  CardText,
  IconButton,
  type CardVariant,
} from '@m3x/react';
import manifest from '../../../../figma/card/manifest.json';
import assets from '../../../../figma/card/assets.json';
import media from '../../../../figma/card/assets/media.png';
import type { FixtureModule, FixtureVariant } from './types.ts';

/** The kit's "Media & text" cards, composed from the real components. */
const s = stylex.create({
  width: { width: 360 },
  headerFill: { flexGrow: 1 },
  // The kit draws its placeholder art with a luminosity blend over the media surface.
  placeholderArt: { mixBlendMode: 'luminosity' },
});

function MoreVert() {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor" aria-hidden>
      <path d={assets.moreVert} />
    </svg>
  );
}

const SUPPORTING = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor';

function Stacked({ variant }: { variant: CardVariant }) {
  return (
    <Card variant={variant} sx={s.width}>
      <CardHeader
        avatar={<Avatar>A</Avatar>}
        headline="Header"
        subhead="Subhead"
        action={
          <IconButton aria-label="More options" variant="standard" size="small">
            <MoreVert />
          </IconButton>
        }
      />
      <CardMedia src={media} fit="contain" imageSx={s.placeholderArt} height={188} />
      <CardContent>
        <CardHeadline headline="Title" subhead="Subtitle" />
        <CardText>{SUPPORTING}</CardText>
        <CardActions>
          <Button variant="outlined">Secondary</Button>
          <Button variant="filled">Primary</Button>
        </CardActions>
      </CardContent>
    </Card>
  );
}

function Horizontal({ variant }: { variant: CardVariant }) {
  return (
    <Card variant={variant} orientation="horizontal" sx={s.width}>
      <CardHeader avatar={<Avatar>A</Avatar>} headline="Header" subhead="Subhead" sx={s.headerFill} />
      <CardMedia src={media} fit="contain" imageSx={s.placeholderArt} width={80} height={80} />
    </Card>
  );
}

const fixture: FixtureModule = {
  component: 'card',
  variants: Object.fromEntries(
    Object.entries(manifest.variants).map(([name, v]): [string, FixtureVariant] => {
      const [layout, variant] = name.split('-') as ['stacked' | 'horizontal', CardVariant];
      return [
        name,
        {
          node: v.node,
          render: () => (layout === 'stacked' ? <Stacked variant={variant} /> : <Horizontal variant={variant} />),
        },
      ];
    }),
  ),
};
export default fixture;
