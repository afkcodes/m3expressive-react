import { useEffect, useRef, useState } from 'react';
import { Button, M3Provider, type ColorSchemeMode } from '@m3x/react';
import { schemeFromSeed, useDynamicScheme, useSeedColorsFromImage } from '@m3x/react/dynamic-color';
import type { FixtureModule } from './types.ts';

/**
 * Dynamic colour (no Figma frames — behaviour only): a seeded scheme reaches components through
 * <M3Provider colors>; seeds are extracted from an image in the browser.
 */
const SEED = '#006A6A';

function Seeded({ mode }: { mode: ColorSchemeMode }) {
  const colors = schemeFromSeed(SEED, { variant: 'tonal-spot' });
  return (
    <M3Provider colorScheme={mode} colors={colors}>
      <div
        data-expected-primary={mode === 'dark' ? colors.primary.dark : colors.primary.light}
        data-expected-surface={mode === 'dark' ? colors.surface.dark : colors.surface.light}
      >
        <Button>Seeded</Button>
      </div>
    </M3Provider>
  );
}

/** A 2:1 red / blue canvas: the image pipeline must pick the dominant red first. */
function FromImage() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [source, setSource] = useState<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext('2d');
    if (!el || !ctx) return;
    ctx.fillStyle = '#C83232';
    ctx.fillRect(0, 0, 80, 60);
    ctx.fillStyle = '#1E3CC8';
    ctx.fillRect(80, 0, 40, 60);
    setSource(el);
  }, []);
  const seeds = useSeedColorsFromImage(source);
  const colors = useDynamicScheme(seeds.colors[0]);
  return (
    <M3Provider colorScheme="light" colors={colors}>
      <canvas ref={canvas} width={120} height={60} />
      <output
        data-status={seeds.status}
        data-seeds={seeds.colors.join(',')}
        data-expected-primary={colors?.primary.light ?? ''}
      >
        <Button>From image</Button>
      </output>
    </M3Provider>
  );
}

const fixture: FixtureModule = {
  component: 'dynamic-color',
  variants: {
    'seeded-light': { render: () => <Seeded mode="light" /> },
    'seeded-dark': { render: () => <Seeded mode="dark" /> },
    image: { render: () => <FromImage /> },
  },
};
export default fixture;
