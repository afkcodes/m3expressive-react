/**
 * Runtime interaction parity for list, menu, tabs, navigation and app bars: drive the REAL
 * component with a mouse / keyboard (no forced states) and compare against the Figma state
 * variants. Complements figma-parity.spec.ts, which renders states statically.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { compareImages } from './compare.ts';
import { captureRegion, hexToRgb } from './capture.ts';
import { REFS_DIR, type Manifest } from './manifest.ts';

/** Effects transitions (state layer, shadow) are 150 ms; allow generous settling. */
const SETTLE = 500;
// ── List: real hover / select / keyboard focus, accordion toggle, swipe to reveal ────────────
test.describe('list (live)', () => {
  const ls = JSON.parse(readFileSync(join(REFS_DIR, 'list/manifest.json'), 'utf8')) as Manifest;
  const setup = async (page: Page, variant: string) => {
    await page.goto(`/fixture/list/${variant}`);
    await page.evaluate(() => document.fonts.ready);
    await page.mouse.move(0, 0);
    const node = page.locator('[data-fixture-node]');
    const check = async (name: string) => {
      const v = ls.variants[name]!;
      const ref: Buffer = readFileSync(join(REFS_DIR, 'list', `${name}.png`));
      const r = compareImages(ref, await captureRegion(page, node, v.renderBounds!), {
        background: hexToRgb(v.background ?? '#FFFFFF'),
      });
      test
        .info()
        .annotations.push({ type: 'parity', description: `${name}: ${r.diffPixels} drift px · ${r.aaPixels} AA` });
      expect.soft(r.diffPixels, name).toBeLessThanOrEqual(v.allowedDiffPixels ?? 0);
    };
    return { node, check, box: (await node.boundingBox())! };
  };

  test('item: hover, click selects, keyboard focus and toggle', async ({ page }) => {
    const { check, box } = await setup(page, 'live');
    const item = page.getByRole('button', { name: /Label text/ });
    await check('item-mid-enabled-unsel');
    await page.mouse.move(box.x + 140, box.y + 40);
    await page.waitForTimeout(SETTLE);
    await check('item-mid-hovered-unsel');
    await page.mouse.click(box.x + 140, box.y + 40);
    await expect(item).toHaveAttribute('aria-pressed', 'true');
    await page.waitForTimeout(SETTLE);
    await check('item-mid-hovered-sel');
    await page.mouse.move(0, 0);
    await page.waitForTimeout(SETTLE);
    await check('item-mid-enabled-sel');
    // Keyboard: Tab in from the document shows the focus layer; Space toggles.
    await page.mouse.click(1, 1);
    await page.keyboard.press('Tab');
    await expect(item).toBeFocused();
    await page.waitForTimeout(SETTLE);
    await check('item-mid-focused-sel');
    await page.keyboard.press('Space');
    await expect(item).not.toHaveAttribute('aria-pressed');
    await page.waitForTimeout(SETTLE);
    await check('item-mid-focused-unsel');
  });

  test('accordion: click and keyboard toggle the nested items', async ({ page }) => {
    const { check, box } = await setup(page, 'live-accordion');
    const toggle = page.getByRole('button', { name: 'Expand' });
    const nested = page.getByText('Nested item 1');
    await check('accordion-collapsed');
    await expect(nested).toBeHidden();
    await page.mouse.click(box.x + 260, box.y + 26);
    // One name in both states (verb + item label); the state is aria-expanded.
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(nested).toBeVisible();
    await page.mouse.move(0, 0);
    await page.waitForTimeout(SETTLE);
    await check('accordion-expanded');
    await toggle.press('Enter');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(nested).toBeHidden();
  });

  test('swipe: drag reveals the actions, an action closes the item', async ({ page }) => {
    const { check, box } = await setup(page, 'live-swipe');
    const state = page.locator('[data-state]');
    await check('swipe-default');
    // Closed: the actions are out of the tab order and the accessibility tree.
    await expect(page.getByRole('button', { name: 'Edit' })).toHaveCount(0);
    await expect(page.locator('button[aria-label="Edit"]')).toHaveAttribute('tabindex', '-1');
    // Past half of the revealed width (150px for three actions): settles revealed on release.
    await page.mouse.move(box.x + 220, box.y + 26);
    await page.mouse.down();
    await page.mouse.move(box.x + 110, box.y + 26, { steps: 8 });
    await page.mouse.up();
    await expect(state).toHaveText('revealed');
    await page.waitForTimeout(1500);
    await check('swipe-revealed');
    const edit = page.getByRole('button', { name: 'Edit' });
    await expect(edit).toHaveAttribute('tabindex', '0');
    await edit.click();
    await expect(state).toHaveText('closed');
    await page.mouse.move(0, 0);
    await page.waitForTimeout(1500);
    await check('swipe-default');
  });
});

// ── Menu: the real popup against the kit, keyboard, selection, group shape after hover ───────
test.describe('menu (live)', () => {
  const mn = JSON.parse(readFileSync(join(REFS_DIR, 'menu/manifest.json'), 'utf8')) as Manifest;

  test('popup matches the kit menu; keyboard and click run an item and close', async ({ page }) => {
    await page.goto('/fixture/menu/live');
    await page.evaluate(() => document.fonts.ready);
    await page.mouse.move(0, 0);
    const trigger = page.getByRole('button', { name: 'Options' });
    await trigger.press('Enter');
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    await expect(page.getByRole('menuitem')).toHaveCount(8);
    // Let the open motion (fast spatial scale + fast effects fade) settle, then compare.
    await page.waitForTimeout(SETTLE);
    const v = mn.variants['menu-std-2']!;
    const ref: Buffer = readFileSync(join(REFS_DIR, 'menu', 'menu-std-2.png'));
    // Keyboard-opened menus highlight the first item: compare with the pointer-opened menu.
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await trigger.click();
    await expect(menu).toBeVisible();
    await page.mouse.move(0, 0);
    await page.waitForTimeout(SETTLE);
    const r = compareImages(ref, await captureRegion(page, menu, v.renderBounds!), {
      background: hexToRgb(v.background ?? '#FFFFFF'),
    });
    test.info().annotations.push({
      type: 'parity',
      description: `menu-std-2 (live popup): ${r.diffPixels} drift px · ${r.aaPixels} AA`,
    });
    expect.soft(r.diffPixels, 'menu-std-2').toBeLessThanOrEqual(v.allowedDiffPixels ?? 0);
    // Arrow keys move through the items; Enter runs the highlighted one and closes the menu.
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitem').nth(1)).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-log]')).toHaveText('2');
    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();
    // Pointer: a click runs the item.
    await trigger.click();
    await page.getByRole('menuitem').nth(5).click();
    await expect(page.locator('[data-log]')).toHaveText('6');
    await expect(menu).toBeHidden();
  });

  test('a group left after hover settles on the 8px inactive shape (Compose)', async ({ page }) => {
    await page.goto('/fixture/menu/live');
    await page.getByRole('button', { name: 'Options' }).click();
    const groups = page.getByRole('menu').getByRole('group');
    await expect(groups).toHaveCount(2);
    const radius = (i: number) => groups.nth(i).evaluate((el) => getComputedStyle(el).borderTopLeftRadius);
    expect(await radius(0)).toBe('16px');
    await page.getByRole('menuitem').nth(1).hover();
    await page.getByRole('menuitem').nth(6).hover();
    await expect.poll(() => radius(0)).toBe('8px');
  });

  test('radio and checkbox items keep the menu open; Escape restores focus', async ({ page }) => {
    await page.goto('/fixture/menu/live-select');
    const trigger = page.getByRole('button', { name: 'View' });
    await trigger.click();
    const grid = page.getByRole('menuitemradio', { name: 'Grid' });
    await grid.click();
    await expect(grid).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByRole('menuitemradio', { name: 'List' })).toHaveAttribute('aria-checked', 'false');
    await page.getByRole('menuitemcheckbox', { name: 'Wrap text' }).click();
    await expect(page.locator('[data-state]')).toHaveText('grid|true');
    await expect(page.getByRole('menu')).toBeVisible();
    await expect(page.getByText('Layout')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toBeHidden();
    await expect(trigger).toBeFocused();
  });
});

// ── Tabs: the live row against the kit, click / keyboard selection, the sprung indicator ─────
test.describe('tabs (live)', () => {
  const tb = JSON.parse(readFileSync(join(REFS_DIR, 'tabs/manifest.json'), 'utf8')) as Manifest;

  test('row matches the kit; click and keyboard select; the indicator follows the label', async ({ page }) => {
    await page.goto('/fixture/tabs/live');
    await page.evaluate(() => document.fonts.ready);
    await page.mouse.move(0, 0);
    const node = page.locator('[data-fixture-node]');
    const v = tb.variants['tabs-fixed-primary-label-only']!;
    const ref: Buffer = readFileSync(join(REFS_DIR, 'tabs', 'tabs-fixed-primary-label-only.png'));
    const r = compareImages(ref, await captureRegion(page, node, v.renderBounds ?? [0, 0, v.size[0], v.size[1]]), {
      background: hexToRgb(v.background ?? '#FFFFFF'),
    });
    test.info().annotations.push({
      type: 'parity',
      description: `tabs-fixed-primary-label-only (live): ${r.diffPixels} drift px · ${r.aaPixels} AA`,
    });
    expect.soft(r.diffPixels, 'tabs-fixed-primary-label-only').toBeLessThanOrEqual(v.allowedDiffPixels ?? 0);

    const photos = page.getByRole('tab', { name: 'Photos' });
    await photos.click();
    await expect(photos).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('[data-value]')).toHaveText('1');
    await expect(page.getByText('Photos panel')).toBeVisible();
    // Primary indicator: the label's width less 2px each side, on the row's bottom edge.
    const indicatorBox = async () =>
      page.evaluate(() => {
        const ind = [...document.querySelectorAll('[role=tablist] > span[aria-hidden]')].at(-1) as HTMLElement;
        const label = document.querySelector('[role=tab][aria-selected=true] [data-tab-content]') as HTMLElement;
        const a = ind.getBoundingClientRect(),
          b = label.getBoundingClientRect();
        // Inset 2px each side of the label box (whole-pixel geometry: ±0.5px).
        return { inset: Math.abs(a.x - b.x - 2) <= 0.5 && Math.abs(b.width - a.width - 4) <= 1, h: a.height };
      });
    await expect.poll(indicatorBox, { timeout: 3000 }).toEqual({ inset: true, h: 3 });

    // Keyboard: arrows move focus, Enter activates (Base UI activateOnFocus=false).
    await photos.focus();
    await page.keyboard.press('ArrowRight');
    const audio = page.getByRole('tab', { name: 'Audio' });
    await expect(audio).toBeFocused();
    await expect(audio).toHaveAttribute('aria-selected', 'false');
    await page.keyboard.press('Enter');
    await expect(audio).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText('Audio panel')).toBeVisible();
    await expect.poll(indicatorBox, { timeout: 3000 }).toEqual({ inset: true, h: 3 });
  });
});

// ── Navigation bar: the live bar against the kit, selection grows the pill, keyboard ─────────
test.describe('navigation (live)', () => {
  const nv = JSON.parse(readFileSync(join(REFS_DIR, 'navigation/manifest.json'), 'utf8')) as Manifest;

  test('bar matches the kit; click and keyboard move the selection; the pill grows in', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/fixture/navigation/live');
    await page.evaluate(() => document.fonts.ready);
    await page.mouse.move(0, 0);
    const node = page.locator('[data-fixture-node]');
    const v = nv.variants['nbar-v-4']!;
    const ref: Buffer = readFileSync(join(REFS_DIR, 'navigation', 'nbar-v-4.png'));
    const r = compareImages(ref, await captureRegion(page, node, v.renderBounds ?? [0, 0, v.size[0], v.size[1]]), {
      background: hexToRgb(v.background ?? '#FFFFFF'),
    });
    test.info().annotations.push({
      type: 'parity',
      description: `nbar-v-4 (live): ${r.diffPixels} drift px · ${r.aaPixels} AA`,
    });
    expect.soft(r.diffPixels, 'nbar-v-4').toBeLessThanOrEqual(v.allowedDiffPixels ?? 0);

    const items = page.getByRole('navigation').getByRole('button');
    await expect(items).toHaveCount(4);
    await expect(items.nth(0)).toHaveAttribute('aria-current', 'page');
    // The selected fill is a separate layer growing from the pill's centre (Compose NavigationItem).
    const fillWidth = (i: number) =>
      items
        .nth(i)
        .evaluate((el) => (el.querySelector('span > span[aria-hidden]') as HTMLElement).getBoundingClientRect().width);
    await items.nth(2).click();
    await expect(page.locator('[data-value]')).toHaveText('2');
    await expect(items.nth(2)).toHaveAttribute('aria-current', 'page');
    await expect(items.nth(0)).not.toHaveAttribute('aria-current');
    const early = await fillWidth(2);
    expect(early, 'the new pill starts narrow').toBeLessThan(56);
    await expect.poll(() => fillWidth(2), { timeout: 3000 }).toBeCloseTo(56, 0);
    await expect.poll(() => fillWidth(0), { timeout: 3000 }).toBeCloseTo(0, 0);

    // Keyboard: items are buttons in tab order; Enter selects.
    await items.nth(2).focus();
    await page.keyboard.press('Tab');
    await expect(items.nth(3)).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-value]')).toHaveText('3');
  });
});

// ── Top app bar: the medium bar against the kit, collapsing with the scroll (Compose) ────────
test('app bar (live): medium bar matches the kit, collapses to 64px with the scroll', async ({ page }) => {
  const ab = JSON.parse(readFileSync(join(REFS_DIR, 'app-bar/manifest.json'), 'utf8')) as Manifest;
  await page.goto('/fixture/app-bar/live');
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(0, 0);
  const header = page.locator('header');
  const v = ab.variants['appbar-medium-flat']!;
  const ref: Buffer = readFileSync(join(REFS_DIR, 'app-bar', 'appbar-medium-flat.png'));
  const r = compareImages(ref, await captureRegion(page, header, v.renderBounds ?? [0, 0, v.size[0], v.size[1]]), {
    background: hexToRgb(v.background ?? '#FFFFFF'),
  });
  test.info().annotations.push({
    type: 'parity',
    description: `appbar-medium-flat (live): ${r.diffPixels} drift px · ${r.aaPixels} AA`,
  });
  expect.soft(r.diffPixels, 'appbar-medium-flat').toBeLessThanOrEqual(v.allowedDiffPixels ?? 0);

  const height = () => header.evaluate((el) => el.getBoundingClientRect().height);
  const bg = () => header.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(await height()).toBe(112);
  // A scroll that stops part-way snaps to the nearer end (Compose settleAppBar): under halfway it
  // opens again, from halfway on it collapses. (The interpolation itself: motion-nav.spec.ts.)
  const scrollTop = () => page.locator('[data-scroll]').evaluate((el) => el.scrollTop);
  await page.locator('[data-scroll]').evaluate((el) => (el.scrollTop = 12));
  await expect.poll(scrollTop).toBe(0);
  await expect.poll(height).toBe(112);
  await page.locator('[data-scroll]').evaluate((el) => (el.scrollTop = 24));
  await expect.poll(scrollTop).toBe(48);
  await expect.poll(height).toBe(64);
  // Collapsed: 64px, Surface Container, the row title visible.
  await page.locator('[data-scroll]').evaluate((el) => (el.scrollTop = 200));
  await expect.poll(height).toBe(64);
  await expect.poll(bg).toBe('rgb(243, 237, 247)');
  await expect(header.getByRole('heading', { name: 'Label' }).first()).toBeVisible();
  // Back to the top: expanded and flat again.
  await page.locator('[data-scroll]').evaluate((el) => (el.scrollTop = 0));
  await expect.poll(height).toBe(112);
});
