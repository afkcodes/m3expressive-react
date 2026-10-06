import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadSnapshot } from '../../../../scripts/gen-tokens.ts';

/**
 * Figma vs Chrome baseline placement (calibrated against the kit's Styles page, 2026-10-06):
 *   Figma:  round((LH − (asc + desc)·size) / 2 + asc·size)   — exact font metrics
 *   Chrome: floor((LH − (round(asc'·size) + round(desc'·size))) / 2) + round(asc'·size)
 * fonts.css overrides asc'/desc' so both agree for every M3 type size.
 */
const ROBOTO_ASC = 1900 / 2048;
const ROBOTO_DESC = 500 / 2048;

const css = readFileSync(new URL('../fonts.css', import.meta.url), 'utf8');
const pct = (prop: string) => {
  const all = [...css.matchAll(new RegExp(`${prop}:\\s*([\\d.]+)%`, 'g'))].map((m) => Number(m[1]) / 100);
  expect(new Set(all).size, `${prop} identical in every @font-face`).toBe(1);
  return all[0]!;
};

describe('fonts.css baseline overrides', () => {
  const asc = pct('ascent-override');
  const desc = pct('descent-override');
  const roles = Object.entries(loadSnapshot().typescale);

  it.each(roles)('%s lands on the Figma baseline', (_, { size, lineHeight }) => {
    const figma = Math.round((lineHeight - (ROBOTO_ASC + ROBOTO_DESC) * size) / 2 + ROBOTO_ASC * size);
    const A = Math.round(asc * size);
    const D = Math.round(desc * size);
    const chrome = Math.floor((lineHeight - (A + D)) / 2) + A;
    expect(chrome).toBe(figma);
  });
});
