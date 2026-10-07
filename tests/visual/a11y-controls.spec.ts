/**
 * Accessibility and robustness of the selection / navigation controls, driven live: group-level
 * disabled, accessible names, keyboard paths for pointer gestures, popup semantics, focus
 * management and cleanup after unmount.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { compareImages } from './compare.ts';

async function open(page: Page, path: string) {
  await page.goto(path);
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(0, 0);
  const node = page.locator('[data-fixture-node]');
  await expect(node).toBeVisible();
  return node;
}

/** Drift pixels between two element screenshots (same size), on white. */
async function drift(a: Locator, b: Locator) {
  const r = compareImages(await a.screenshot(), await b.screenshot(), { background: [255, 255, 255] });
  return r.diffPixels;
}

// ── 1. A disabled group draws its items disabled (not just behaves so) ─────────────────────────
for (const component of ['segmented-button', 'button-group', 'radio'] as const) {
  test(`${component}: a disabled group renders exactly like disabled items; no hover layer`, async ({ page }) => {
    const node = await open(page, `/fixture/${component}/live-group-disabled`);
    const group = node.locator('[data-row="group"]');
    const items = node.locator('[data-row="items"]');
    expect(await drift(group, items), 'group disabled = every item disabled').toBe(0);
    const before = await group.screenshot();
    const first = group.locator('button, [role="radio"]').first();
    const b = (await first.boundingBox())!;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.waitForTimeout(300);
    const after = compareImages(before, await group.screenshot(), { background: [255, 255, 255] });
    expect(after.diffPixels, 'hover changes nothing').toBe(0);
    await page.mouse.down();
    await page.waitForTimeout(150);
    const pressed = compareImages(before, await group.screenshot(), { background: [255, 255, 255] });
    await page.mouse.up();
    expect(pressed.diffPixels, 'press draws no layer or ripple').toBe(0);
  });
}

// ── 2. Navigation items keep their name when the label isn't shown ─────────────────────────────
test('navigation: a rail without labels still names every destination', async ({ page }) => {
  const node = await open(page, '/fixture/navigation/live-rail-nolabels');
  for (const name of ['Home', 'Activity', 'Saved']) {
    await expect(node.getByRole('button', { name, exact: true })).toBeVisible();
  }
  // The hidden label takes no space: items keep the kit's 56px pill height + 4px padding.
  const box = (await node.getByRole('button', { name: 'Home' }).boundingBox())!;
  expect(box.height).toBe(64);
});

// ── 3. Swipe actions have a keyboard path ──────────────────────────────────────────────────────
test('swipeable list item: arrows reveal and hide the actions, Escape returns to the item', async ({ page }) => {
  const node = await open(page, '/fixture/list/live-swipe');
  const state = page.locator('[data-state]');
  const row = node.locator('[data-swipe-item]');
  const edit = page.locator('button[aria-label="Edit"]');
  await page.keyboard.press('Tab');
  await expect(row).toBeFocused();
  await expect(edit).toHaveAttribute('tabindex', '-1');

  await page.keyboard.press('ArrowLeft');
  await expect(state).toHaveText('revealed');
  await expect(page.getByRole('button', { name: 'Favourite' })).toBeFocused();
  await expect(edit).toHaveAttribute('tabindex', '0');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('button', { name: 'Move' })).toBeFocused();
  await page.keyboard.press('End');
  await expect(edit).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(state).toHaveText('closed');
  await expect(row).toBeFocused();
  await expect(edit).toHaveAttribute('tabindex', '-1');

  // Revealed, the actions are tab stops (the row comes first); ArrowRight on the row hides them.
  await page.keyboard.press('ArrowLeft');
  await expect(state).toHaveText('revealed');
  await expect(page.getByRole('button', { name: 'Favourite' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(row).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(state).toHaveText('closed');
  // An action run from the keyboard closes the row and returns focus to it.
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('button', { name: 'Favourite' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(state).toHaveText('closed');
  await expect(row).toBeFocused();
});

// ── 4. Slider thumbs: per-thumb names, value text, reversed range, tick cap ────────────────────
test('slider: range thumbs are named apart, the value label is the value text, reversed values keep the track', async ({
  page,
}) => {
  const node = await open(page, '/fixture/slider/live-a11y');
  const thumbs = node.locator('[data-slider="range"] input[type="range"]');
  await expect(thumbs.nth(0)).toHaveAttribute('aria-label', 'Minimum price');
  await expect(thumbs.nth(1)).toHaveAttribute('aria-label', 'Maximum price');
  await expect(thumbs.nth(0)).toHaveAttribute('aria-valuetext', '$20 start range');
  await expect(thumbs.nth(1)).toHaveAttribute('aria-valuetext', '$80 end range');
  // The value was given reversed ([80, 20]): thumbs and track are normalised.
  await expect(thumbs.nth(0)).toHaveAttribute('aria-valuenow', '20');
  // Track spans of the range slider: inactive, active (from 20 to 80 → ~60% of 342px), inactive.
  const spans = await node
    .locator('[data-slider="range"] > div > span')
    .evaluateAll((els) => els.map((e) => e.getBoundingClientRect().width));
  expect(spans).toHaveLength(3);
  expect(spans[1]!, 'active track present').toBeGreaterThan(150);

  const single = node.locator('[data-slider="single"] input[type="range"]');
  await expect(single).toHaveAttribute('aria-valuetext', '40%');
  // 1000 steps: over the 200-tick cap, so only the two track spans are drawn (no tick marks).
  await expect(node.locator('[data-slider="dense"] > div > span')).toHaveCount(2);
});

// ── 5. Split button trailing: popup semantics follow the menu ──────────────────────────────────
test('split button: haspopup only with a menu; the trailing state follows the real menu', async ({ page }) => {
  const node = await open(page, '/fixture/split-button/live-menu');
  const plain = node.locator('[data-row="plain"] button').nth(1);
  await expect(plain).not.toHaveAttribute('aria-haspopup');
  const trigger = node.locator('[data-row="menu"] button').nth(1);
  await expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  const radius = () =>
    trigger
      .locator('> span')
      .last()
      .evaluate((e) => getComputedStyle(e).borderStartStartRadius);
  const rest = await radius();
  await trigger.click();
  await expect(page.getByRole('menu')).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect.poll(radius).toBe('20px');
  // Closed by the menu (Escape), not by the trailing button: the visual state follows.
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu')).toHaveCount(0);
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await page.mouse.move(0, 0);
  await expect.poll(radius).toBe(rest);
  // Choosing an item closes it too.
  await trigger.click();
  await page.getByRole('menuitem', { name: 'Duplicate' }).click();
  await expect(page.getByRole('menu')).toHaveCount(0);
  await page.mouse.move(0, 0);
  await expect.poll(radius).toBe(rest);
});

// ── 6. FAB menu focus: into the first item, one tab stop, controls, Escape back ────────────────
test('fab menu: focus moves to the first item, items rove with one tab stop, Escape restores the toggle', async ({
  page,
}) => {
  const node = await open(page, '/fixture/fab-menu/live');
  const fab = node.getByRole('button', { name: 'Actions' });
  await fab.focus();
  await page.keyboard.press('Enter');
  const toggle = node.getByRole('button', { name: 'Actions' });
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  const menu = node.getByRole('menu');
  await expect(toggle).toHaveAttribute('aria-controls', (await menu.getAttribute('id'))!);
  const first = node.getByRole('menuitem', { name: 'First' });
  await expect(first).toBeFocused();
  await expect(node.locator('[role="menuitem"][tabindex="0"]')).toHaveCount(1);
  await page.keyboard.press('ArrowDown');
  await expect(node.getByRole('menuitem', { name: 'Second' })).toBeFocused();
  await expect(node.getByRole('menuitem', { name: 'Second' })).toHaveAttribute('tabindex', '0');
  await expect(node.locator('[role="menuitem"][tabindex="0"]')).toHaveCount(1);
  await page.keyboard.press('End');
  await expect(node.getByRole('menuitem', { name: 'Third' })).toBeFocused();
  // Tab leaves the items for the toggle; Shift+Tab comes back to the last focused item.
  await page.keyboard.press('Tab');
  await expect(toggle).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(node.getByRole('menuitem', { name: 'Third' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(node.getByRole('menuitem')).toHaveCount(0);
  await expect(fab).toBeFocused();
  await expect(fab).not.toHaveAttribute('aria-controls');
});

// ── 7. Springs stop when their component unmounts ──────────────────────────────────────────────
/** Counts requestAnimationFrame calls from now on. */
async function countFrames(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { rafCount: number };
    w.rafCount = 0;
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => {
      w.rafCount++;
      return raf(cb);
    };
  });
  return () => page.evaluate(() => (window as unknown as { rafCount: number }).rafCount);
}

test('tabs: unmounting mid-spring (indicator + scroll) stops the frame loop', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const node = await open(page, '/fixture/tabs/live-unmount');
  await page.waitForTimeout(800); // first-layout centring has settled
  const frames = await countFrames(page);
  await node.locator('[data-animated]').evaluate((n) => n.querySelectorAll<HTMLElement>('[role=tab]')[8]!.click());
  await page.waitForTimeout(48);
  expect(await frames(), 'springs running').toBeGreaterThan(0);
  await node.locator('[data-unmount]').click();
  await page.waitForTimeout(50);
  const at = await frames();
  await page.waitForTimeout(300);
  expect((await frames()) - at, 'no frames requested after unmount').toBe(0);
});

test('button group: a press ending after unmount starts nothing; no window listeners leak', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const node = await open(page, '/fixture/button-group/live-unmount');
  const button = node.locator('[data-animated] button').first();
  const b = (await button.boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(32);
  await node.locator('[data-unmount]').evaluate((e: HTMLElement) => e.click());
  await page.waitForTimeout(50);
  const frames = await countFrames(page);
  await page.mouse.up();
  await page.waitForTimeout(300);
  expect(await frames(), 'no frames requested after unmount').toBe(0);
});

// ── 8. Names that don't flip and that say what they act on ─────────────────────────────────────
test('expandable list item: the toggle has one name (verb + item), state in aria-expanded', async ({ page }) => {
  const node = await open(page, '/fixture/list/live-accordion');
  const toggle = node.getByRole('button', { name: 'Expand Label text', exact: true });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(node.getByRole('button', { name: 'Expand Label text', exact: true })).toBeVisible();
});

test('input chip: the remove button names its chip', async ({ page }) => {
  const node = await open(page, '/fixture/chips/live');
  const remove = node.getByRole('button', { name: /^Remove / });
  await expect(remove).toHaveCount(1);
  const name = await remove.evaluate((e) => {
    const ids = (e.getAttribute('aria-labelledby') ?? '').split(' ');
    return ids
      .map((id) => (id === e.id ? e.getAttribute('aria-label') : document.getElementById(id)?.textContent))
      .join(' ');
  });
  expect(name).toMatch(/^Remove \S/);
});

// ── 9. Menus: groups inside wrapper components are not grouped again ───────────────────────────
test('menu: wrapped groups and fragments are detected (no group inside a group)', async ({ page }) => {
  const node = await open(page, '/fixture/menu/live-wrapped');
  for (const sel of ['[data-case="wrapped"]', '[data-case="fragment"]']) {
    const surface = node.locator(sel);
    await expect(surface.locator('[role="group"]')).toHaveCount(2);
    await expect(surface.locator('[role="group"] [role="group"]')).toHaveCount(0);
  }
  // Two groups: no single-group shadow spread (the solo style), as with direct children.
  const spread = (sel: string) =>
    node
      .locator(`${sel} [role="group"]`)
      .first()
      .evaluate((e) => getComputedStyle(e, '::before').boxShadow);
  expect(await spread('[data-case="wrapped"]')).toBe(await spread('[data-case="direct"]'));
  // Loose items still get their implicit group.
  await expect(node.locator('[data-case="loose"] [role="group"]')).toHaveCount(1);
});
