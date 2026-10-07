/**
 * Runtime interaction parity for the selection / feedback controls (checkbox, radio, switch, chips,
 * tooltips, snackbar): drive the REAL component with a mouse / keyboard (no forced states) and
 * compare against the Figma state variants. Complements figma-parity.spec.ts, which renders states
 * statically.
 */
import { expect, test, type Page } from '@playwright/test';
import { expectKit, kitVariant } from './helpers/kit.ts';
import { load, openFixture } from './helpers/page.ts';
import { moveToCentre } from './helpers/pointer.ts';
import { settle } from './helpers/settle.ts';
import { outlineOf } from './helpers/styles.ts';

// ── Checkbox: real pointer / keyboard on the live component ────────────────────────────────
test.describe('checkbox (live)', () => {
  const bounds = [-1, -1, 50, 50] as const;
  const openCheckbox = (page: Page, kind: 'unselected' | 'selected' | 'indeterminate') =>
    openFixture(page, `/fixture/checkbox/${kind}-live`);

  for (const kind of ['unselected', 'selected', 'indeterminate'] as const) {
    test(`${kind}: rest, hover, keyboard focus`, async ({ page }) => {
      const node = await openCheckbox(page, kind);
      await settle(page);
      await expectKit(node, 'checkbox', `${kind}-enabled`, { bounds, label: `${kind}-rest`, message: 'rest' });

      const b = (await node.boundingBox())!;
      await page.mouse.move(b.x + 24, b.y + 24);
      await settle(page);
      await expectKit(node, 'checkbox', `${kind}-hovered`, { bounds, label: `${kind}-hover`, message: 'hover' });

      await page.mouse.move(0, 0);
      await page.keyboard.press('Tab');
      await settle(page);
      expect
        .soft(
          await outlineOf(node.locator('[role=checkbox] > span').first()),
          'focus ring = kit Focus indicator (44px circle, 3px secondary)',
        )
        .toEqual({ style: 'solid', width: '3px', offset: '2px', color: 'rgb(98, 91, 113)' });
      await page.addStyleTag({ content: '[role=checkbox] > span { outline-style: none !important }' });
      await settle(page);
      await expectKit(node, 'checkbox', `${kind}-focused`, { bounds, label: `${kind}-focus`, message: 'focus' });
    });
  }

  test('click toggles and renders the new state', async ({ page }) => {
    const node = await openCheckbox(page, 'unselected');
    const box = node.locator('[role=checkbox]');
    await expect(box).toHaveAttribute('aria-checked', 'false');
    await box.click();
    await expect(box).toHaveAttribute('aria-checked', 'true');
    await settle(page);
    // Pointer still over it → kit "Selected / Hovered".
    await expectKit(node, 'checkbox', 'selected-hovered', { bounds, label: 'toggled-hover' });
  });
});

// ── Radio: hover = kit, click selects (dot), arrow keys move the selection ──────────────────
test('radio (live): hover, select, arrows', async ({ page }) => {
  const node = await openFixture(page, '/fixture/radio/live');
  const items = node.getByRole('radio');
  await expect(items).toHaveCount(2);
  const b = (await items.nth(1).boundingBox())!;
  await page.mouse.move(b.x + 24, b.y + 24);
  await settle(page);
  await expectKit(items.nth(1), 'radio', 'unselected-hovered', { message: 'hover = kit' });
  await items.nth(1).click();
  await expect(items.nth(1)).toHaveAttribute('aria-checked', 'true');
  await expect(items.nth(0)).toHaveAttribute('aria-checked', 'false');
  await page.keyboard.press('ArrowUp');
  await expect(items.nth(0)).toHaveAttribute('aria-checked', 'true');
  await expect(items.nth(0)).toBeFocused();
});

// ── Switch: rest/hover = kit, click toggles (handle slides to the on position) ──────────────
test('switch (live): hover, toggle, keyboard', async ({ page }) => {
  const node = await openFixture(page, '/fixture/switch/live');
  const root = node.getByRole('switch');
  await settle(page);
  await expectKit(node, 'switch', 'off-plain-enabled');
  const b = (await root.boundingBox())!;
  await page.mouse.move(b.x + 16, b.y + 16);
  await settle(page);
  await expectKit(node, 'switch', 'off-plain-hovered');
  await root.click();
  await expect(root).toHaveAttribute('aria-checked', 'true');
  await page.mouse.move(0, 0);
  await root.evaluate((e) => e.blur());
  await settle(page);
  await expectKit(node, 'switch', 'on-plain-enabled');
  await root.focus();
  await page.keyboard.press('Space');
  await expect(root).toHaveAttribute('aria-checked', 'false');
});

// ── Chips: hover (outlined gains the surface fill), filter selects with a check, input remove ─
test('chips (live): hover, select, remove', async ({ page }) => {
  const node = await openFixture(page, '/fixture/chips/live');
  const filter = node.locator('button').nth(0);
  await moveToCentre(filter);
  await settle(page);
  await expectKit(filter, 'chips', 'filter-out-icon-hovered-f-f', { message: 'hover = kit' });
  await filter.click();
  await expect(filter).toHaveAttribute('aria-pressed', 'true');
  await page.mouse.move(0, 0);
  await filter.evaluate((e) => e.blur());
  await settle(page);
  await expectKit(filter, 'chips', 'filter-out-icon-enabled-t-f', { message: 'selected = kit (check replaces icon)' });
  await node.getByRole('button', { name: 'Remove' }).click();
  await expect(page.locator('body')).toHaveAttribute('data-removed', '1');
});

// ── Tooltips: hover shows the plain tooltip (= kit), rich tooltip opens on hover ────────────
test('tooltip (live): plain on hover, rich on hover', async ({ page }) => {
  await load(page, '/fixture/tooltip/live');
  const trigger = page.getByRole('button', { name: 'Favourite' });
  await trigger.hover();
  const plain = page.getByText('Supporting text', { exact: true });
  await expect(plain).toBeVisible();
  await settle(page);
  // The positioner centres the tooltip on the trigger at sub-pixel offsets, so glyph raster can't
  // be compared here (static parity covers pixels); check the surface's geometry and colours.
  const surface = plain.locator('xpath=..');
  const box = (await surface.boundingBox())!;
  const kit = kitVariant('tooltip', 'plain-single');
  expect.soft([box.width, box.height], 'kit size 104×24').toEqual([kit.size[0], kit.size[1]]);
  const look = await surface.evaluate((e) => {
    const cs = getComputedStyle(e);
    return [cs.backgroundColor, cs.color, cs.borderTopLeftRadius];
  });
  expect
    .soft(look, 'inverse surface / inverse on surface / 4px')
    .toEqual(['rgb(50, 47, 53)', 'rgb(245, 239, 247)', '4px']);
  await page.mouse.move(0, 0);
  await page.getByRole('button', { name: 'Details' }).hover();
  await expect(page.getByText('Supporting line text lorem ipsum dolor sit amet, consectetur')).toBeVisible();
});

// ── Snackbar host: show, action, dismiss ────────────────────────────────────────────────────
test('snackbar (live): show via host, action runs', async ({ page }) => {
  await load(page, '/fixture/snackbar/live');
  await page.getByRole('button', { name: 'Archive' }).click();
  await expect(page.getByText('Message archived')).toBeVisible();
  const box = (await page.getByText('Message archived').locator('xpath=ancestor::div[1]').boundingBox())!;
  expect.soft(box.height, 'single line = 48px').toBe(48);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.locator('body')).toHaveAttribute('data-undo', '1');
});
