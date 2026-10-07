import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Carousel, CarouselItem, type CarouselLayout } from '../../packages/m3/src/index.ts';

/** Keyline carousels can't measure on the server: they render their slides in a plain row. */
describe('carousel on the server', () => {
  for (const layout of ['multiBrowse', 'hero', 'centeredHero', 'uncontained'] satisfies CarouselLayout[]) {
    it(layout, () => {
      const markup = renderToString(
        <Carousel aria-label="Photos" layout={layout}>
          {['a', 'b', 'c'].map((k) => (
            <CarouselItem key={k}>{`slide-${k}`}</CarouselItem>
          ))}
        </Carousel>,
      );
      expect(markup.match(/aria-roledescription="slide"/g)).toHaveLength(3);
      for (const k of ['a', 'b', 'c']) expect(markup).toContain(`slide-${k}`);
    });
  }
});
