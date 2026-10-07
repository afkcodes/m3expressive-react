import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { argbFromHex, hexFromArgb, Hct, MaterialDynamicColors, SchemeTonalSpot } from '@material/material-color-utilities';
import { COLOR_ROLES, schemeFromSeed, seedColorsFromPixels } from './dynamicColor.ts';

const HEX6 = /^#[0-9A-F]{6}$/;

describe('schemeFromSeed', () => {
  it('covers exactly the colour roles of color.stylex.ts', () => {
    const src = readFileSync(new URL('../tokens/color.stylex.ts', import.meta.url), 'utf8');
    const roles = [...src.matchAll(/^ {2}([a-zA-Z]+):/gm)].map((m) => m[1]!);
    const byName = (a: string, b: string) => a.localeCompare(b);
    expect([...COLOR_ROLES].sort(byName)).toEqual(roles.sort(byName));
  });

  it('resolves every role to #RRGGBB in light and dark', () => {
    const scheme = schemeFromSeed('#006A6A');
    for (const role of COLOR_ROLES) {
      expect(scheme[role].light).toMatch(HEX6);
      expect(scheme[role].dark).toMatch(HEX6);
    }
    expect(scheme.primary.light).not.toBe(scheme.primary.dark);
  });

  it('is material-color-utilities output, unchanged (tonal spot, 2025 spec, standard contrast)', () => {
    const hct = Hct.fromInt(argbFromHex('#B33B15'));
    const mdc = new MaterialDynamicColors();
    const light = new SchemeTonalSpot(hct, false, 0, '2025');
    const dark = new SchemeTonalSpot(hct, true, 0, '2025');
    const scheme = schemeFromSeed('#B33B15');
    for (const role of ['primary', 'onSurface', 'surfaceContainerHigh', 'tertiaryFixedDim'] as const) {
      expect(scheme[role].light).toBe(hexFromArgb(mdc[role]().getArgb(light)).toUpperCase());
      expect(scheme[role].dark).toBe(hexFromArgb(mdc[role]().getArgb(dark)).toUpperCase());
    }
  });

  it('responds to variant, contrast and spec; accepts #RGB; rejects invalid seeds', () => {
    const base = schemeFromSeed('#6750A4');
    expect(schemeFromSeed('#6750A4', { variant: 'vibrant' }).primaryContainer).not.toEqual(base.primaryContainer);
    expect(schemeFromSeed('#6750A4', { contrast: 'high' }).primary).not.toEqual(base.primary);
    expect(schemeFromSeed('#6750A4', { contrast: 1 })).toEqual(schemeFromSeed('#6750A4', { contrast: 'high' }));
    expect(schemeFromSeed('#6750A4', { specVersion: '2021' }).surfaceContainer).not.toEqual(base.surfaceContainer);
    expect(schemeFromSeed('#f00')).toEqual(schemeFromSeed('#FF0000'));
    expect(() => schemeFromSeed('purple')).toThrow(TypeError);
    expect(() => schemeFromSeed('#12345')).toThrow(TypeError);
  });
});

describe('seedColorsFromPixels', () => {
  const image = (colors: Array<[number, number, number, number, number]>) => {
    const out: number[] = [];
    for (const [r, g, b, a, n] of colors) for (let i = 0; i < n; i++) out.push(r, g, b, a);
    return Uint8ClampedArray.from(out);
  };

  it('ranks the image colours best first', () => {
    const seeds = seedColorsFromPixels(image([[200, 40, 40, 255, 700], [30, 60, 200, 255, 300]]));
    expect(seeds.length).toBeGreaterThanOrEqual(1);
    const top = Hct.fromInt(argbFromHex(seeds[0]!));
    expect(top.hue < 40 || top.hue > 340).toBe(true); // the dominant red
  });

  it('ignores translucent pixels and falls back to Google Blue when nothing is usable', () => {
    expect(seedColorsFromPixels(image([[128, 128, 128, 255, 500], [255, 0, 0, 100, 500]]))).toEqual(['#4285F4']);
  });

  it('returns at most `count` candidates', () => {
    const seeds = seedColorsFromPixels(
      image([[200, 40, 40, 255, 300], [30, 60, 200, 255, 300], [40, 170, 60, 255, 300], [230, 180, 20, 255, 300]]),
      2,
    );
    expect(seeds.length).toBeLessThanOrEqual(2);
  });
});
