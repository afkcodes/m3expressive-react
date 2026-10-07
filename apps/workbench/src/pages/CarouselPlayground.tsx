import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Carousel, CarouselItem, M3Provider, typescale, type CarouselLayout, type ColorSchemeMode } from '@m3x/react';
import { color } from '@m3x/react/tokens/color.stylex';
import placeholder700 from '../../../../figma/list/assets/placeholder-700.png';

const s = stylex.create({
  page: {
    minHeight: '100vh',
    backgroundColor: color.surface,
    color: color.onSurface,
    padding: 32,
    display: 'grid',
    gap: 24,
    alignContent: 'start',
  },
  panel: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 20,
    alignItems: 'end',
    padding: 16,
    borderRadius: 16,
    backgroundColor: color.surfaceContainer,
  },
  stage: {
    borderRadius: 16,
    outlineWidth: 1,
    outlineStyle: 'solid',
    outlineColor: color.outlineVariant,
    overflow: 'hidden',
    backgroundColor: color.surface,
  },
  art: { display: 'block', width: '100%', height: '100%', objectFit: 'cover', mixBlendMode: 'luminosity' },
  label: { position: 'absolute', left: 16, bottom: 12, color: color.onSurface },
  tint: (hue: number) => ({ backgroundColor: `oklch(0.86 0.07 ${hue})` }),
  muted: { color: color.onSurfaceVariant },
});

const LAYOUTS: CarouselLayout[] = ['multi-browse', 'hero', 'center-hero', 'uncontained', 'multi-aspect', 'full-screen'];
const RATIOS = [16 / 9, 4 / 3, 1, 3 / 4, 9 / 16, 16 / 9, 1, 4 / 3];

/** All carousel layouts; drag / scroll / arrow keys to watch items move through the keylines. */
export function CarouselPlayground() {
  const [scheme, setScheme] = useState<ColorSchemeMode>('light');
  const [layout, setLayout] = useState<CarouselLayout>('multi-browse');
  const [tablet, setTablet] = useState(false);
  const [art, setArt] = useState(true);
  const [rtl, setRtl] = useState(false);
  const field = { font: 'inherit', fontSize: 14, padding: '6px 8px', borderRadius: 8 } as const;
  const width = tablet ? 600 : 412;
  const full = layout === 'full-screen';
  return (
    <M3Provider colorScheme={scheme}>
      <main {...stylex.props(s.page)}>
        <p style={{ margin: 0 }}>
          <a href="/" style={{ color: 'inherit' }}>
            ← all
          </a>
        </p>
        <h1 {...stylex.props(typescale.headlineMedium)} style={{ margin: 0 }}>
          Carousel playground
        </h1>
        <section {...stylex.props(s.panel)}>
          <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
            <span {...stylex.props(s.muted)}>colour scheme</span>
            <select value={scheme} onChange={(e) => setScheme(e.target.value as ColorSchemeMode)} style={field}>
              <option>light</option>
              <option>dark</option>
              <option>system</option>
            </select>
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
            <span {...stylex.props(s.muted)}>layout</span>
            <select value={layout} onChange={(e) => setLayout(e.target.value as CarouselLayout)} style={field}>
              {LAYOUTS.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 14 }}>
            <input type="checkbox" checked={tablet} onChange={(e) => setTablet(e.target.checked)} /> tablet width
          </label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 14 }}>
            <input type="checkbox" checked={art} onChange={(e) => setArt(e.target.checked)} /> kit art
          </label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 14 }}>
            <input type="checkbox" checked={rtl} onChange={(e) => setRtl(e.target.checked)} /> right to left
          </label>
        </section>
        <div {...stylex.props(s.stage)} dir={rtl ? 'rtl' : 'ltr'} style={{ width, height: full ? 640 : 221 }}>
          <Carousel
            key={`${layout}-${width}-${rtl}`}
            aria-label="Gallery"
            layout={layout}
            preferredItemWidth={
              layout === 'multi-browse'
                ? tablet
                  ? 184
                  : 188
                : layout === 'hero'
                  ? tablet
                    ? undefined
                    : 316
                  : layout === 'center-hero'
                    ? tablet
                      ? undefined
                      : 252
                    : undefined
            }
            itemWidth={tablet ? 512 / 3 - 8 : 154}
            aspectRatios={RATIOS}
            initialItem={layout === 'center-hero' ? 1 : 0}
          >
            {RATIOS.map((_, i) => (
              <CarouselItem key={i} sx={art ? undefined : s.tint(30 + i * 40)}>
                {art && <img src={placeholder700} alt="" {...stylex.props(s.art)} />}
                <span {...stylex.props(typescale.titleMedium, s.label)}>{i + 1}</span>
              </CarouselItem>
            ))}
          </Carousel>
        </div>
      </main>
    </M3Provider>
  );
}
