import { expect, test, type Page } from '@playwright/test';
import { hexToRgb } from './capture.ts';
import { openFixture } from './helpers/page.ts';

/** Dynamic colour: <M3Provider colors> re-points every colour var; image seeds are extracted in-browser. */

const rgb = (hex: string) => `rgb(${hexToRgb(hex).join(', ')})`;
const open = (page: Page, variant: string) => openFixture(page, `/fixture/dynamic-color/${variant}`);

/** The filled button's container colour (its first painted layer carries color.primary). */
const buttonFill = (page: Page, name: string) =>
  page.getByRole('button', { name }).evaluate((el) => {
    for (const node of [el, ...el.querySelectorAll<HTMLElement>('*')]) {
      const bg = getComputedStyle(node).backgroundColor;
      if (bg !== 'rgba(0, 0, 0, 0)') return bg;
    }
    return '';
  });

for (const mode of ['light', 'dark'] as const) {
  test(`seeded scheme reaches components (${mode})`, async ({ page }) => {
    const node = await open(page, `seeded-${mode}`);
    const expected = (await node.locator('[data-expected-primary]').getAttribute('data-expected-primary'))!;
    expect(expected).toMatch(/^#[0-9A-F]{6}$/);
    expect(expected, 'not the baseline primary').not.toBe(mode === 'dark' ? '#D0BCFF' : '#6750A4');
    expect(await buttonFill(page, 'Seeded')).toBe(rgb(expected));
  });
}

test('seed colours from an image: dominant colour first, applied to the scheme', async ({ page }) => {
  const node = await open(page, 'image');
  const out = node.locator('output');
  await expect(out).toHaveAttribute('data-status', 'ready');
  const seeds = (await out.getAttribute('data-seeds'))!.split(',');
  expect(seeds.length).toBeGreaterThanOrEqual(1);
  const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(seeds[0]!.slice(i, i + 2), 16));
  expect(r!, `top seed ${seeds[0]} is the dominant red`).toBeGreaterThan(Math.max(g!, b!));
  const expected = (await out.getAttribute('data-expected-primary'))!;
  expect(await buttonFill(page, 'From image')).toBe(rgb(expected));
});
