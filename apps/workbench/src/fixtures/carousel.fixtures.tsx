import type { ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Carousel, CarouselItem, type CarouselProps } from '@m3x/react';
import manifest from '../../../../figma/carousel/manifest.json';
import placeholder700 from '../../../../figma/list/assets/placeholder-700.png';
import type { FixtureModule, FixtureVariant } from './types.ts';

const fx = stylex.create({
  // The kit's item art: FIT, luminosity over the item's Surface Container High.
  art: { display: 'block', width: '100%', height: '100%', objectFit: 'contain', mixBlendMode: 'luminosity' },
});

const items = (n: number) =>
  Array.from({ length: n }, (_, i) => (
    <CarouselItem key={i}>
      <img src={placeholder700} alt="" {...stylex.props(fx.art)} />
    </CarouselItem>
  ));

// Kit layout → Compose parameters that produce it (tablet hero variants are the multi-browse
// layout copied in the kit; they render as hero carousels — see the spec's exceptions).
const config: Record<string, Omit<CarouselProps, 'aria-label' | 'children'>> = {
  'carousel-mobile-multi': { layout: 'multi-browse', preferredItemWidth: 188 },
  'carousel-tablet-multi': { layout: 'multi-browse', preferredItemWidth: 184 },
  'carousel-mobile-hero': { layout: 'hero', preferredItemWidth: 316 },
  'carousel-tablet-hero': { layout: 'hero' },
  'carousel-mobile-center-hero': { layout: 'center-hero', preferredItemWidth: 252, initialItem: 1 },
  'carousel-tablet-center-hero': { layout: 'center-hero', initialItem: 1 },
  'carousel-mobile-uncontained': { layout: 'uncontained', itemWidth: 154 },
  'carousel-tablet-uncontained': { layout: 'uncontained', itemWidth: 512 / 3 - 8 },
  'carousel-mobile-aspect': { layout: 'multi-aspect', aspectRatios: [362.22 / 204, 270.67 / 204, 1, 153.25 / 204, 116 / 204] },
  'carousel-tablet-aspect': { layout: 'multi-aspect', aspectRatios: [362.22 / 204, 270.67 / 204, 1, 153.25 / 204, 116 / 204] },
  'carousel-full': { layout: 'full-screen' },
};

function render(name: string): ReactNode {
  const c = config[name]!;
  return (
    <Carousel aria-label="Photos" {...c}>
      {items(c.layout === 'multi-aspect' ? 5 : 8)}
    </Carousel>
  );
}

const fixture: FixtureModule = {
  component: 'carousel',
  variants: Object.fromEntries([
    ['live', { width: 412, height: 221, render: () => render('carousel-mobile-multi') } satisfies FixtureVariant],
    ['live-uncontained', { width: 412, height: 221, render: () => render('carousel-mobile-uncontained') } satisfies FixtureVariant],
    ...Object.entries(manifest.variants).map(([name, v]): [string, FixtureVariant] => {
      const [w, h] = v.size as [number, number];
      return [
        name,
        { node: v.node, width: w, height: h, render: () => <div style={{ width: w, height: h, display: 'flex' }}>{render(name)}</div> },
      ];
    }),
  ]),
};
export default fixture;
