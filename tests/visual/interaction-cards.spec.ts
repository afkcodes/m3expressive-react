/**
 * Runtime interaction parity for cards (outlined, elevated, filled): drive the REAL component with
 * a mouse / keyboard (no forced states) and compare against the Figma state variants. Complements
 * figma-parity.spec.ts, which renders states statically.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { compareImages } from './compare.ts';
import { captureRegion, hexToRgb } from './capture.ts';
import { REFS_DIR, type Manifest } from './manifest.ts';

const OUT = join(process.cwd(), 'tests/visual/__output__/interaction');
/** Effects transitions (state layer, shadow) are 150 ms; allow generous settling. */
const SETTLE = 500;
const cards = JSON.parse(readFileSync(join(REFS_DIR, 'card-states/manifest.json'), 'utf8')) as Manifest;

async function open(page: Page, variant: string) {
  await page.goto(`/fixture/card-states/${variant}-live`);
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(0, 0);
  const node = page.locator('[data-fixture-node]');
  await expect(node).toBeVisible();
  return node;
}

function check(name: string, refName: string, shot: Buffer) {
  const v = cards.variants[refName]!;
  const ref: Buffer = readFileSync(join(REFS_DIR, 'card-states', `${refName}.png`));
  const r = compareImages(ref, shot, { background: hexToRgb(v.background ?? '#FFFFFF') });
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, `${name}.actual.png`), shot);
  writeFileSync(join(OUT, `${name}.diff.png`), r.diffPng);
  test.info().annotations.push({
    type: 'parity',
    description: `${r.diffPixels} drift px (${r.flatDriftPixels} flat) · ${r.aaPixels} AA · ${r.rasterPixels} raster`,
  });
  return { r, allowed: v.allowedDiffPixels ?? 0 };
}

for (const style of ['outlined', 'elevated', 'filled'] as const) {
  test.describe(`card ${style} (live)`, () => {
    test('rest', async ({ page }) => {
      const node = await open(page, style);
      await page.waitForTimeout(SETTLE);
      const { r, allowed } = check(
        `${style}-rest`,
        `${style}-enabled`,
        await captureRegion(page, node, cards.variants[`${style}-enabled`]!.renderBounds!),
      );
      expect(r.diffPixels).toBeLessThanOrEqual(allowed);
    });

    test('mouse hover', async ({ page }) => {
      const node = await open(page, style);
      const b = (await node.boundingBox())!;
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
      await page.waitForTimeout(SETTLE);
      const { r, allowed } = check(
        `${style}-hover`,
        `${style}-hovered`,
        await captureRegion(page, node, cards.variants[`${style}-hovered`]!.renderBounds!),
      );
      expect(r.diffPixels).toBeLessThanOrEqual(allowed);
    });

    test('keyboard focus', async ({ page }) => {
      const node = await open(page, style);
      await page.keyboard.press('Tab');
      await page.waitForTimeout(SETTLE);
      const card = node.locator('> div');
      await expect(card).toBeFocused();
      // Focus indicator = the kit's hidden "Focus indicator" layer: 3px secondary ring, 2px out, radius 14.
      const ring = await card.evaluate((e) => {
        const cs = getComputedStyle(e);
        return {
          style: cs.outlineStyle,
          width: cs.outlineWidth,
          offset: cs.outlineOffset,
          color: cs.outlineColor,
          radius: cs.borderTopLeftRadius,
        };
      });
      expect(ring).toEqual({ style: 'solid', width: '3px', offset: '2px', color: 'rgb(98, 91, 113)', radius: '12px' });
      // The kit's Focused variant hides its indicator; with the ring's geometry verified above,
      // hide the live ring and compare everything else pixel for pixel.
      await page.addStyleTag({ content: '[data-fixture-node] > div { outline-style: none !important }' });
      await page.waitForTimeout(50);
      const { r, allowed } = check(
        `${style}-focus`,
        `${style}-focused`,
        await captureRegion(page, node, cards.variants[`${style}-focused`]!.renderBounds!),
      );
      expect(r.diffPixels).toBeLessThanOrEqual(allowed);
    });

    test('mouse press (held)', async ({ page }) => {
      const node = await open(page, style);
      const b = (await node.boundingBox())!;
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(SETTLE);
      const shot = await captureRegion(page, node, cards.variants[`${style}-pressed`]!.renderBounds!);
      await page.mouse.up();
      const { r, allowed } = check(`${style}-press`, `${style}-pressed`, shot);
      expect(r.diffPixels).toBeLessThanOrEqual(allowed);
    });
  });
}
