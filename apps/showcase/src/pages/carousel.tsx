import * as stylex from '@stylexjs/stylex';
import { Carousel, CarouselItem, typescale } from '@m3x/react';
import { color } from '@m3x/react/tokens/color.stylex';
import { shape } from '@m3x/react/tokens/shape.stylex';
import { Demo, Page, Section } from '../ui/Page.tsx';

const s = stylex.create({
  frame: (height: number) => ({
    width: '100%',
    height,
    borderRadius: shape.cornerLarge,
    backgroundColor: color.surface,
    overflow: 'hidden',
  }),
  phone: {
    width: 'min(100%, 360px)',
    height: 560,
    padding: 8,
    boxSizing: 'border-box',
    borderRadius: shape.cornerExtraLarge,
    backgroundColor: color.surface,
    outlineWidth: 1,
    outlineStyle: 'solid',
    outlineColor: color.outlineVariant,
    overflow: 'hidden',
  },
  // The item's width drives the caption: it fades out while the item is too narrow to hold it.
  item: { containerType: 'inline-size' },
  caption: {
    position: 'absolute',
    insetInlineStart: 12,
    bottom: 12,
    display: 'flex',
    flexDirection: 'column',
    paddingBlock: 6,
    paddingInline: 12,
    borderRadius: shape.cornerMedium,
    backgroundColor: color.surfaceContainerLowest,
    color: color.onSurface,
    whiteSpace: 'nowrap',
    opacity: { default: 1, '@container (max-width: 150px)': 0 },
    transitionProperty: 'opacity',
    transitionDuration: '150ms',
  },
  captionLarge: { insetInlineStart: 20, bottom: 20, paddingBlock: 10, paddingInline: 16 },
  muted: { color: color.onSurfaceVariant },
});

/** Picture-like tiles drawn from the colour tokens (a sky, a sun and two hills): they follow the theme. */
const scene = stylex.create({
  dawn: {
    backgroundImage: `radial-gradient(ellipse 80% 42% at 85% 100%, ${color.primary} 0 98%, transparent 100%), radial-gradient(ellipse 75% 55% at 15% 100%, ${color.onPrimaryContainer} 0 98%, transparent 100%), radial-gradient(circle at 72% 30%, ${color.tertiaryFixedDim} 0 22px, transparent 23px), linear-gradient(180deg, ${color.tertiaryContainer}, ${color.primaryContainer})`,
  },
  lagoon: {
    backgroundImage: `radial-gradient(ellipse 70% 40% at 20% 100%, ${color.secondary} 0 98%, transparent 100%), radial-gradient(ellipse 90% 52% at 90% 100%, ${color.onSecondaryContainer} 0 98%, transparent 100%), radial-gradient(circle at 30% 28%, ${color.primaryFixed} 0 18px, transparent 19px), linear-gradient(180deg, ${color.secondaryContainer}, ${color.surfaceContainerHigh})`,
  },
  desert: {
    backgroundImage: `radial-gradient(ellipse 85% 38% at 80% 100%, ${color.tertiary} 0 98%, transparent 100%), radial-gradient(ellipse 70% 58% at 10% 100%, ${color.onTertiaryContainer} 0 98%, transparent 100%), radial-gradient(circle at 60% 26%, ${color.primaryFixedDim} 0 20px, transparent 21px), linear-gradient(180deg, ${color.tertiaryFixed}, ${color.tertiaryContainer})`,
  },
  forest: {
    backgroundImage: `radial-gradient(ellipse 60% 46% at 75% 100%, ${color.onSecondaryContainer} 0 98%, transparent 100%), radial-gradient(ellipse 85% 34% at 20% 100%, ${color.secondary} 0 98%, transparent 100%), radial-gradient(circle at 25% 34%, ${color.tertiaryFixedDim} 0 16px, transparent 17px), linear-gradient(180deg, ${color.secondaryContainer}, ${color.primaryContainer})`,
  },
  dusk: {
    backgroundImage: `radial-gradient(ellipse 90% 40% at 50% 100%, ${color.onTertiaryContainer} 0 98%, transparent 100%), radial-gradient(ellipse 60% 60% at 90% 100%, ${color.tertiary} 0 98%, transparent 100%), radial-gradient(circle at 40% 40%, ${color.primaryFixed} 0 24px, transparent 25px), linear-gradient(180deg, ${color.inversePrimary}, ${color.tertiaryContainer})`,
  },
  glacier: {
    backgroundImage: `radial-gradient(ellipse 70% 50% at 30% 100%, ${color.onSurfaceVariant} 0 98%, transparent 100%), radial-gradient(ellipse 80% 36% at 85% 100%, ${color.outline} 0 98%, transparent 100%), radial-gradient(circle at 78% 24%, ${color.primaryFixedDim} 0 18px, transparent 19px), linear-gradient(180deg, ${color.surfaceContainerHighest}, ${color.secondaryFixedDim})`,
  },
});

const SCENES = [scene.dawn, scene.lagoon, scene.desert, scene.forest, scene.dusk, scene.glacier];

const PLACES = [
  ['Fjords', 'Norway'],
  ['Lagoon', 'Iceland'],
  ['Dunes', 'Namibia'],
  ['Highlands', 'Scotland'],
  ['Canyon', 'Arizona'],
  ['Glacier', 'Patagonia'],
  ['Coast', 'Portugal'],
  ['Meadow', 'Austria'],
] as const;

const RATIOS = [16 / 9, 3 / 4, 1, 4 / 3, 9 / 16, 16 / 9, 1, 3 / 4];

/**
 * One picture per place; `large` gives the full-screen layout a bigger caption. A function, not a
 * component: the carousel counts its direct children, so the items must be passed as an array.
 */
function pictures(large = false) {
  return PLACES.map(([place, country], i) => (
    <CarouselItem key={place} sx={[s.item, SCENES[i % SCENES.length]]}>
      <span {...stylex.props(s.caption, large && s.captionLarge)}>
        <span {...stylex.props(large ? typescale.titleLarge : typescale.titleSmall)}>{place}</span>
        <span {...stylex.props(typescale.bodySmall, s.muted)}>{country}</span>
      </span>
    </CarouselItem>
  ));
}

const ITEMS_CODE = `  {photos.map((p) => (
    <CarouselItem key={p.id}>
      <img src={p.src} alt={p.alt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </CarouselItem>
  ))}`;

export default function CarouselPage() {
  return (
    <Page
      title="Carousel"
      summary="Carousels show a collection of items that scroll on and off screen. Items resize along keylines as they move — drag, scroll, or focus the carousel and use the arrow keys."
    >
      <Section
        title="Multi-browse"
        description="Large, medium and small items at once: good for browsing many visual items. Snaps one item at a time."
      >
        <Demo
          wide
          title="Multi-browse"
          code={`
<div style={{ height: 240 }}>
  <Carousel aria-label="Destinations" layout="multiBrowse" preferredItemWidth={260}>
${ITEMS_CODE}
  </Carousel>
</div>`}
        >
          <div {...stylex.props(s.frame(240))}>
            <Carousel aria-label="Destinations" layout="multiBrowse" preferredItemWidth={260}>
              {pictures()}
            </Carousel>
          </div>
        </Demo>
      </Section>

      <Section
        title="Hero"
        description="One large item with a small peek of the next: for spotlighting featured content. Centred hero keeps the large item in the middle."
      >
        <Demo
          title="Hero"
          code={`
<div style={{ height: 240 }}>
  <Carousel aria-label="Featured" layout="hero">
${ITEMS_CODE}
  </Carousel>
</div>`}
        >
          <div {...stylex.props(s.frame(240))}>
            <Carousel aria-label="Featured" layout="hero">
              {pictures()}
            </Carousel>
          </div>
        </Demo>
        <Demo
          title="Centred hero"
          code={`
<div style={{ height: 240 }}>
  <Carousel aria-label="Featured" layout="centeredHero" defaultItem={1}>
${ITEMS_CODE}
  </Carousel>
</div>`}
        >
          <div {...stylex.props(s.frame(240))}>
            <Carousel aria-label="Featured, centred" layout="centeredHero" defaultItem={1}>
              {pictures()}
            </Carousel>
          </div>
        </Demo>
      </Section>

      <Section
        title="Uncontained and multi-aspect"
        description="Free-scrolling rows without snapping: items of one width that run off the edge, or pictures that keep their own aspect ratio."
      >
        <Demo
          wide
          title="Uncontained"
          code={`
<div style={{ height: 200 }}>
  <Carousel aria-label="Recent" layout="uncontained" itemWidth={220}>
${ITEMS_CODE}
  </Carousel>
</div>`}
        >
          <div {...stylex.props(s.frame(200))}>
            <Carousel aria-label="Recent" layout="uncontained" itemWidth={220}>
              {pictures()}
            </Carousel>
          </div>
        </Demo>
        <Demo
          wide
          title="Multi-aspect"
          code={`
<div style={{ height: 220 }}>
  <Carousel aria-label="Album" layout="multiAspect" aspectRatios={[16 / 9, 3 / 4, 1, 4 / 3]}>
${ITEMS_CODE}
  </Carousel>
</div>`}
        >
          <div {...stylex.props(s.frame(220))}>
            <Carousel aria-label="Album" layout="multiAspect" aspectRatios={RATIOS}>
              {pictures()}
            </Carousel>
          </div>
        </Demo>
      </Section>

      <Section
        title="Full screen"
        description="One item fills the screen and pages vertically, like a story viewer. Scroll inside the frame."
      >
        <Demo
          title="Stories"
          code={`
<div style={{ height: '100dvh' }}>
  <Carousel aria-label="Stories" layout="fullScreen">
${ITEMS_CODE}
  </Carousel>
</div>`}
        >
          <div {...stylex.props(s.phone)}>
            <Carousel aria-label="Stories" layout="fullScreen">
              {pictures(true)}
            </Carousel>
          </div>
        </Demo>
      </Section>
    </Page>
  );
}
