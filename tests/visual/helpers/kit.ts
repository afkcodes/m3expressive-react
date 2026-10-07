/**
 * Live parity: a capture of the real, driven component against a Figma kit variant (the same
 * references, render bounds and comparison as figma-parity.spec.ts).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Locator } from '@playwright/test';
import { captureRegion, hexToRgb } from '../capture.ts';
import { compareImages } from '../compare.ts';
import { REFS_DIR, type Manifest, type ManifestVariant } from '../manifest.ts';

const OUT = join(process.cwd(), 'tests/visual/__output__/interaction');
const manifests = new Map<string, Manifest>();

/** A kit variant's manifest entry (figma/<component>/manifest.json, read once per worker). */
export function kitVariant(component: string, variant: string): ManifestVariant {
  let manifest = manifests.get(component);
  if (!manifest) {
    manifest = JSON.parse(readFileSync(join(REFS_DIR, component, 'manifest.json'), 'utf8')) as Manifest;
    manifests.set(component, manifest);
  }
  const v = manifest.variants[variant];
  if (!v) throw new Error(`no kit variant ${component}/${variant}`);
  return v;
}

export interface KitOptions {
  /** Capture bounds around `target` (CSS px from its top-left); default the variant's render bounds. */
  bounds?: readonly [x: number, y: number, w: number, h: number];
}

/** Captures the variant's render bounds around `target` and compares them with the kit reference. */
export async function diffKit(target: Locator, component: string, variant: string, { bounds }: KitOptions = {}) {
  const v = kitVariant(component, variant);
  const ref = readFileSync(join(REFS_DIR, component, `${variant}.png`));
  const shot = await captureRegion(target.page(), target, bounds ?? v.renderBounds ?? [0, 0, v.size[0], v.size[1]]);
  const result = compareImages(ref, shot, { background: hexToRgb(v.background ?? '#FFFFFF') });
  return { result, shot, allowed: v.allowedDiffPixels ?? 0 };
}

export interface ExpectKitOptions extends KitOptions {
  /** Names the capture (annotation, files under __output__/interaction); default the variant. */
  label?: string;
  /** Assertion message; default the label. */
  message?: string;
}

/**
 * Soft parity check of `target` against a kit variant: drift within the variant's allowance. Saves
 * the actual / diff images and annotates the test with the pixel counts.
 */
export async function expectKit(target: Locator, component: string, variant: string, options: ExpectKitOptions = {}) {
  const { label = variant, message = label } = options;
  const { result: r, shot, allowed } = await diffKit(target, component, variant, options);
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, `${component}-${label}.actual.png`), shot);
  writeFileSync(join(OUT, `${component}-${label}.diff.png`), r.diffPng);
  test.info().annotations.push({
    type: 'parity',
    description: `${label}: ${r.diffPixels} drift px (${r.flatDriftPixels} flat) · ${r.aaPixels} AA · ${r.rasterPixels} raster`,
  });
  expect.soft(r.diffPixels, message).toBeLessThanOrEqual(allowed);
}
