/**
 * Runtime interaction parity for cards (outlined, elevated, filled): drive the REAL component with
 * a mouse / keyboard (no forced states) and compare against the Figma state variants. Complements
 * figma-parity.spec.ts, which renders states statically.
 */
import { expect, test, type Page } from '@playwright/test';
import { expectKit } from './helpers/kit.ts';
import { openFixture } from './helpers/page.ts';
import { moveToCentre } from './helpers/pointer.ts';
import { settle } from './helpers/settle.ts';
import { computedStyle, outlineOf } from './helpers/styles.ts';

for (const style of ['outlined', 'elevated', 'filled'] as const) {
  test.describe(`card ${style} (live)`, () => {
    const open = (page: Page) => openFixture(page, `/fixture/card-states/${style}-live`);

    test('rest', async ({ page }) => {
      const node = await open(page);
      await settle(page);
      await expectKit(node, 'card-states', `${style}-enabled`, { label: `${style}-rest` });
    });

    test('mouse hover', async ({ page }) => {
      const node = await open(page);
      await moveToCentre(node);
      await settle(page);
      await expectKit(node, 'card-states', `${style}-hovered`, { label: `${style}-hover` });
    });

    test('keyboard focus', async ({ page }) => {
      const node = await open(page);
      await page.keyboard.press('Tab');
      await settle(page);
      const card = node.locator('> div');
      await expect(card).toBeFocused();
      // Focus indicator = the kit's hidden "Focus indicator" layer: 3px secondary ring, 2px out, radius 14.
      expect({ ...(await outlineOf(card)), radius: await computedStyle(card, 'border-top-left-radius') }).toEqual({
        style: 'solid',
        width: '3px',
        offset: '2px',
        color: 'rgb(98, 91, 113)',
        radius: '12px',
      });
      // The kit's Focused variant hides its indicator; with the ring's geometry verified above,
      // hide the live ring and compare everything else pixel for pixel.
      await page.addStyleTag({ content: '[data-fixture-node] > div { outline-style: none !important }' });
      await settle(page);
      await expectKit(node, 'card-states', `${style}-focused`, { label: `${style}-focus` });
    });

    test('mouse press (held)', async ({ page }) => {
      const node = await open(page);
      await moveToCentre(node);
      await page.mouse.down();
      await settle(page);
      await expectKit(node, 'card-states', `${style}-pressed`, { label: `${style}-press` });
      await page.mouse.up();
    });
  });
}
