/**
 * Runtime interaction parity for the selection / feedback controls (checkbox, radio, switch, chips,
 * tooltips, snackbar): drive the REAL component with a mouse / keyboard (no forced states) and
 * compare against the Figma state variants. Complements figma-parity.spec.ts, which renders states
 * statically.
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
// ── Checkbox: real pointer / keyboard on the live component ────────────────────────────────
const checks = JSON.parse(readFileSync(join(REFS_DIR, 'checkbox/manifest.json'), 'utf8')) as Manifest;

function checkCheckbox(name: string, refName: string, shot: Buffer) {
  const v = checks.variants[refName]!;
  const ref: Buffer = readFileSync(join(REFS_DIR, 'checkbox', `${refName}.png`));
  const r = compareImages(ref, shot, { background: hexToRgb(v.background ?? '#FFFFFF') });
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, `checkbox-${name}.actual.png`), shot);
  writeFileSync(join(OUT, `checkbox-${name}.diff.png`), r.diffPng);
  test.info().annotations.push({
    type: 'parity',
    description: `${r.diffPixels} drift px (${r.flatDriftPixels} flat) · ${r.aaPixels} AA · ${r.rasterPixels} raster`,
  });
  return { r, allowed: v.allowedDiffPixels ?? 0 };
}

test.describe('checkbox (live)', () => {
  const rb = [-1, -1, 50, 50];
  const openCheckbox = async (page: Page, kind: 'unselected' | 'selected' | 'indeterminate') => {
    await page.goto(`/fixture/checkbox/${kind}-live`);
    await page.mouse.move(0, 0);
    const node = page.locator('[data-fixture-node]');
    await expect(node).toBeVisible();
    return node;
  };

  for (const kind of ['unselected', 'selected', 'indeterminate'] as const) {
    test(`${kind}: rest, hover, keyboard focus`, async ({ page }) => {
      const node = await openCheckbox(page, kind);
      await page.waitForTimeout(SETTLE);
      let res = checkCheckbox(`${kind}-rest`, `${kind}-enabled`, await captureRegion(page, node, rb));
      expect.soft(res.r.diffPixels, 'rest').toBeLessThanOrEqual(res.allowed);

      const b = (await node.boundingBox())!;
      await page.mouse.move(b.x + 24, b.y + 24);
      await page.waitForTimeout(SETTLE);
      res = checkCheckbox(`${kind}-hover`, `${kind}-hovered`, await captureRegion(page, node, rb));
      expect.soft(res.r.diffPixels, 'hover').toBeLessThanOrEqual(res.allowed);

      await page.mouse.move(0, 0);
      await page.keyboard.press('Tab');
      await page.waitForTimeout(SETTLE);
      const ring = await node
        .locator('[role=checkbox] > span')
        .first()
        .evaluate((e) => {
          const cs = getComputedStyle(e);
          return { style: cs.outlineStyle, width: cs.outlineWidth, offset: cs.outlineOffset, color: cs.outlineColor };
        });
      expect
        .soft(ring, 'focus ring = kit Focus indicator (44px circle, 3px secondary)')
        .toEqual({ style: 'solid', width: '3px', offset: '2px', color: 'rgb(98, 91, 113)' });
      await page.addStyleTag({ content: '[role=checkbox] > span { outline-style: none !important }' });
      await page.waitForTimeout(50);
      res = checkCheckbox(`${kind}-focus`, `${kind}-focused`, await captureRegion(page, node, rb));
      expect.soft(res.r.diffPixels, 'focus').toBeLessThanOrEqual(res.allowed);
    });
  }

  test('click toggles and renders the new state', async ({ page }) => {
    const node = await openCheckbox(page, 'unselected');
    const box = node.locator('[role=checkbox]');
    await expect(box).toHaveAttribute('aria-checked', 'false');
    await box.click();
    await expect(box).toHaveAttribute('aria-checked', 'true');
    await page.waitForTimeout(SETTLE);
    // Pointer still over it → kit "Selected / Hovered".
    const { r, allowed } = checkCheckbox('toggled-hover', 'selected-hovered', await captureRegion(page, node, rb));
    expect(r.diffPixels).toBeLessThanOrEqual(allowed);
  });
});

// ── Radio: hover = kit, click selects (dot), arrow keys move the selection ──────────────────
test('radio (live): hover, select, arrows', async ({ page }) => {
  const radios = JSON.parse(readFileSync(join(REFS_DIR, 'radio/manifest.json'), 'utf8')) as Manifest;
  await page.goto('/fixture/radio/live');
  await page.mouse.move(0, 0);
  const node = page.locator('[data-fixture-node]');
  const items = node.getByRole('radio');
  await expect(items).toHaveCount(2);
  const b = (await items.nth(1).boundingBox())!;
  await page.mouse.move(b.x + 24, b.y + 24);
  await page.waitForTimeout(SETTLE);
  const v = radios.variants['unselected-hovered']!;
  const ref: Buffer = readFileSync(join(REFS_DIR, 'radio', 'unselected-hovered.png'));
  const shot = await captureRegion(page, items.nth(1), v.renderBounds!);
  const r = compareImages(ref, shot, { background: hexToRgb(v.background ?? '#FFFFFF') });
  test.info().annotations.push({
    type: 'parity',
    description: `${r.diffPixels} drift px (${r.flatDriftPixels} flat) · ${r.aaPixels} AA · ${r.rasterPixels} raster`,
  });
  expect.soft(r.diffPixels, 'hover = kit').toBeLessThanOrEqual(v.allowedDiffPixels ?? 0);
  await items.nth(1).click();
  await expect(items.nth(1)).toHaveAttribute('aria-checked', 'true');
  await expect(items.nth(0)).toHaveAttribute('aria-checked', 'false');
  await page.keyboard.press('ArrowUp');
  await expect(items.nth(0)).toHaveAttribute('aria-checked', 'true');
  await expect(items.nth(0)).toBeFocused();
});

// ── Switch: rest/hover = kit, click toggles (handle slides to the on position) ──────────────
test('switch (live): hover, toggle, keyboard', async ({ page }) => {
  const sw = JSON.parse(readFileSync(join(REFS_DIR, 'switch/manifest.json'), 'utf8')) as Manifest;
  await page.goto('/fixture/switch/live');
  await page.mouse.move(0, 0);
  const node = page.locator('[data-fixture-node]');
  const root = node.getByRole('switch');
  const check = async (name: string) => {
    const v = sw.variants[name]!;
    const ref: Buffer = readFileSync(join(REFS_DIR, 'switch', `${name}.png`));
    const r = compareImages(ref, await captureRegion(page, node, v.renderBounds!), {
      background: hexToRgb(v.background ?? '#FFFFFF'),
    });
    test
      .info()
      .annotations.push({ type: 'parity', description: `${name}: ${r.diffPixels} drift px · ${r.aaPixels} AA` });
    expect.soft(r.diffPixels, name).toBeLessThanOrEqual(v.allowedDiffPixels ?? 0);
  };
  await page.waitForTimeout(SETTLE);
  await check('off-plain-enabled');
  const b = (await root.boundingBox())!;
  await page.mouse.move(b.x + 16, b.y + 16);
  await page.waitForTimeout(SETTLE);
  await check('off-plain-hovered');
  await root.click();
  await expect(root).toHaveAttribute('aria-checked', 'true');
  await page.mouse.move(0, 0);
  await root.evaluate((e) => e.blur());
  await page.waitForTimeout(SETTLE);
  await check('on-plain-enabled');
  await root.focus();
  await page.keyboard.press('Space');
  await expect(root).toHaveAttribute('aria-checked', 'false');
});

// ── Chips: hover (outlined gains the surface fill), filter selects with a check, input remove ─
test('chips (live): hover, select, remove', async ({ page }) => {
  const chips = JSON.parse(readFileSync(join(REFS_DIR, 'chips/manifest.json'), 'utf8')) as Manifest;
  await page.goto('/fixture/chips/live');
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(0, 0);
  const node = page.locator('[data-fixture-node]');
  const filter = node.locator('button').nth(0);
  const b = (await filter.boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.waitForTimeout(SETTLE);
  const v = chips.variants['filter-out-icon-hovered-f-f']!;
  const ref: Buffer = readFileSync(join(REFS_DIR, 'chips', 'filter-out-icon-hovered-f-f.png'));
  const r = compareImages(ref, await captureRegion(page, filter, v.renderBounds!), {
    background: hexToRgb(v.background ?? '#FFFFFF'),
  });
  test.info().annotations.push({
    type: 'parity',
    description: `${r.diffPixels} drift px (${r.flatDriftPixels} flat) · ${r.aaPixels} AA · ${r.rasterPixels} raster`,
  });
  expect.soft(r.diffPixels, 'hover = kit').toBeLessThanOrEqual(v.allowedDiffPixels ?? 0);
  await filter.click();
  await expect(filter).toHaveAttribute('aria-pressed', 'true');
  await page.mouse.move(0, 0);
  await filter.evaluate((e) => e.blur());
  await page.waitForTimeout(SETTLE);
  const sel = chips.variants['filter-out-icon-enabled-t-f']!;
  const ref2: Buffer = readFileSync(join(REFS_DIR, 'chips', 'filter-out-icon-enabled-t-f.png'));
  const r2 = compareImages(ref2, await captureRegion(page, filter, sel.renderBounds!), {
    background: hexToRgb(sel.background ?? '#FFFFFF'),
  });
  expect.soft(r2.diffPixels, 'selected = kit (check replaces icon)').toBeLessThanOrEqual(sel.allowedDiffPixels ?? 0);
  await node.getByRole('button', { name: 'Remove' }).click();
  await expect(page.locator('body')).toHaveAttribute('data-removed', '1');
});

// ── Tooltips: hover shows the plain tooltip (= kit), rich tooltip opens on hover ────────────
test('tooltip (live): plain on hover, rich on hover', async ({ page }) => {
  const tips = JSON.parse(readFileSync(join(REFS_DIR, 'tooltip/manifest.json'), 'utf8')) as Manifest;
  await page.goto('/fixture/tooltip/live');
  await page.evaluate(() => document.fonts.ready);
  const trigger = page.getByRole('button', { name: 'Favourite' });
  await trigger.hover();
  const plain = page.getByText('Supporting text', { exact: true });
  await expect(plain).toBeVisible();
  await page.waitForTimeout(SETTLE);
  // The positioner centres the tooltip on the trigger at sub-pixel offsets, so glyph raster can't
  // be compared here (static parity covers pixels); check the surface's geometry and colours.
  const surface = plain.locator('xpath=..');
  const box = (await surface.boundingBox())!;
  expect
    .soft([box.width, box.height], 'kit size 104×24')
    .toEqual([tips.variants['plain-single']!.size[0], tips.variants['plain-single']!.size[1]]);
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
  await page.goto('/fixture/snackbar/live');
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole('button', { name: 'Archive' }).click();
  await expect(page.getByText('Message archived')).toBeVisible();
  const box = (await page.getByText('Message archived').locator('xpath=ancestor::div[1]').boundingBox())!;
  expect.soft(box.height, 'single line = 48px').toBe(48);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.locator('body')).toHaveAttribute('data-undo', '1');
});
