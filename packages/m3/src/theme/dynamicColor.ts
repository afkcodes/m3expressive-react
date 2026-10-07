import {
  argbFromHex,
  argbFromRgb,
  hexFromArgb,
  Hct,
  MaterialDynamicColors,
  QuantizerCelebi,
  SchemeContent,
  SchemeExpressive,
  SchemeFidelity,
  SchemeFruitSalad,
  SchemeMonochrome,
  SchemeNeutral,
  SchemeRainbow,
  SchemeTonalSpot,
  SchemeVibrant,
  Score,
  type DynamicScheme,
} from '@material/material-color-utilities';
import { COLOR_ROLES, type ColorRole, type DynamicColorScheme } from './colorRoles.ts';

export { COLOR_ROLES } from './colorRoles.ts';
export type { ColorRole, DynamicColorScheme, RoleColors } from './colorRoles.ts';

/*
 * Dynamic colour — M3's "colour from a seed", the system behind Android's wallpaper colours.
 * Everything below is Google's material-color-utilities (the library Android and Material Theme
 * Builder use); this module only maps its output onto our 49 colour roles.
 *
 *   seed (hex or image) ─► DynamicScheme(variant, contrast, spec) ─► 49 roles × light / dark
 *
 * Pure: no DOM except `seedColorsFromImage`, no StyleX — `<M3Provider colors>` applies the result.
 * Shipped as the `@m3x/react/dynamic-color` entry so apps without seeds don't load the library.
 */

/**
 * M3 scheme variants ("styles" in Android's wallpaper & style picker). `tonal-spot` is the
 * platform default; `neutral`, `tonal-spot`, `vibrant` and `expressive` follow the 2025
 * (M3 Expressive) colour spec, the others the 2021 one.
 */
export type SchemeVariant =
  | 'tonal-spot'
  | 'neutral'
  | 'vibrant'
  | 'expressive'
  | 'fidelity'
  | 'content'
  | 'rainbow'
  | 'fruit-salad'
  | 'monochrome';

/** Contrast: the provider's levels, or MCU's continuous −1 … 1 (0 standard, 0.5 medium, 1 high). */
export type SchemeContrast = 'standard' | 'medium' | 'high' | number;

export interface DynamicSchemeOptions {
  variant?: SchemeVariant;
  contrast?: SchemeContrast;
  /** Colour spec. Default '2025' (M3 Expressive); '2021' reproduces the original M3 schemes. */
  specVersion?: '2021' | '2025';
}

const SCHEMES = {
  'tonal-spot': SchemeTonalSpot,
  neutral: SchemeNeutral,
  vibrant: SchemeVibrant,
  expressive: SchemeExpressive,
  fidelity: SchemeFidelity,
  content: SchemeContent,
  rainbow: SchemeRainbow,
  'fruit-salad': SchemeFruitSalad,
  monochrome: SchemeMonochrome,
} as const satisfies Record<SchemeVariant, unknown>;

const CONTRAST_LEVELS = { standard: 0, medium: 0.5, high: 1 } as const;

const contrastLevel = (contrast: SchemeContrast) =>
  typeof contrast === 'number' ? Math.min(1, Math.max(-1, contrast)) : CONTRAST_LEVELS[contrast];

const HEX = /^#?(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** ARGB of a `#RGB` / `#RRGGBB` seed; throws on anything else (a typo shouldn't theme silently). */
function seedArgb(seed: string): number {
  if (!HEX.test(seed.trim())) throw new TypeError(`Invalid seed colour "${seed}" — expected #RGB or #RRGGBB.`);
  return argbFromHex(seed.trim());
}

const dynamicColors = new MaterialDynamicColors();

function resolveRoles(scheme: DynamicScheme): Record<ColorRole, string> {
  const out = {} as Record<ColorRole, string>;
  for (const role of COLOR_ROLES) out[role] = hexFromArgb(dynamicColors[role]().getArgb(scheme)).toUpperCase();
  return out;
}

/**
 * The full colour scheme for a seed colour: every role in light and dark.
 *
 * @example schemeFromSeed('#006A6A', { variant: 'expressive', contrast: 'medium' }).primary
 */
export function schemeFromSeed(seed: string, options: DynamicSchemeOptions = {}): DynamicColorScheme {
  const { variant = 'tonal-spot', contrast = 'standard', specVersion = '2025' } = options;
  const Scheme = SCHEMES[variant];
  const hct = Hct.fromInt(seedArgb(seed));
  const level = contrastLevel(contrast);
  const light = resolveRoles(new Scheme(hct, false, level, specVersion));
  const dark = resolveRoles(new Scheme(hct, true, level, specVersion));
  const out = {} as DynamicColorScheme;
  for (const role of COLOR_ROLES) out[role] = { light: light[role], dark: dark[role] };
  return out;
}

/* ── Seed colours from an image ─────────────────────────────────────────────────────────── */

/**
 * Seed candidates from raw RGBA pixels, best first — MCU's wallpaper pipeline: drop translucent
 * pixels, QuantizerCelebi to 128 colours, then Score (ranks by chroma and population, filters
 * unusable colours). Returns at most `count` colours; Score falls back to Google Blue (#4285F4)
 * when nothing in the image is suitable.
 */
export function seedColorsFromPixels(rgba: ArrayLike<number>, count = 4): string[] {
  const pixels: number[] = [];
  for (let i = 0; i + 3 < rgba.length; i += 4) {
    if (rgba[i + 3]! < 255) continue;
    pixels.push(argbFromRgb(rgba[i]!, rgba[i + 1]!, rgba[i + 2]!));
  }
  const quantized = QuantizerCelebi.quantize(pixels, 128);
  return Score.score(quantized, { desired: count }).map((argb) => hexFromArgb(argb).toUpperCase());
}

export type ImageSeedSource = HTMLImageElement | ImageBitmap | HTMLCanvasElement | Blob | string;

export interface ImageSeedOptions {
  /** Seed candidates to return (Android's picker offers four). Default 4. */
  count?: number;
  /**
   * Pixel area the image is scaled down to before quantising (aspect kept). Android's
   * WallpaperColors samples at most 112 × 112; quantising full-size photos is slow and
   * doesn't change the result meaningfully. Default 112 × 112.
   */
  maxArea?: number;
}

async function loadImage(source: string): Promise<HTMLImageElement> {
  const img = new Image();
  // Pixels of a cross-origin image can only be read if it is served with CORS headers.
  img.crossOrigin = 'anonymous';
  img.decoding = 'async';
  img.src = source;
  await img.decode();
  return img;
}

async function toDrawable(source: ImageSeedSource): Promise<{ image: CanvasImageSource; width: number; height: number; close?: () => void }> {
  if (typeof source === 'string') {
    const img = await loadImage(source);
    return { image: img, width: img.naturalWidth, height: img.naturalHeight };
  }
  if (source instanceof Blob) {
    const bitmap = await createImageBitmap(source);
    return { image: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
  }
  if (typeof HTMLImageElement !== 'undefined' && source instanceof HTMLImageElement) {
    if (!source.complete || source.naturalWidth === 0) await source.decode();
    return { image: source, width: source.naturalWidth, height: source.naturalHeight };
  }
  return { image: source, width: source.width, height: source.height };
}

/**
 * Seed colour candidates extracted from an image (best first) — like Android building the
 * system colours from your wallpaper. Accepts an <img>, ImageBitmap, canvas, Blob / File (e.g.
 * from an `<input type="file">`) or a URL (cross-origin URLs need CORS). Browser only.
 *
 * @example const [seed] = await seedColorsFromImage(file); <M3Provider seedColor={seed}>
 */
export async function seedColorsFromImage(source: ImageSeedSource, options: ImageSeedOptions = {}): Promise<string[]> {
  const { count = 4, maxArea = 112 * 112 } = options;
  const { image, width, height, close } = await toDrawable(source);
  try {
    if (width === 0 || height === 0) throw new Error('The image has no pixels.');
    const scale = Math.min(1, Math.sqrt(maxArea / (width * height)));
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    const canvas =
      typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
    const context = canvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
    if (!context) throw new Error('Canvas 2D is not available.');
    context.drawImage(image, 0, 0, w, h);
    return seedColorsFromPixels(context.getImageData(0, 0, w, h).data, count);
  } finally {
    close?.();
  }
}
