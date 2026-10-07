/**
 * Runtime interaction parity for the button family (toggle, toggle icon, split, FAB, FAB menu,
 * connected group, segmented): drive the REAL component with a mouse / keyboard (no forced states)
 * and compare against the Figma state variants. Complements figma-parity.spec.ts, which renders
 * states statically.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { expectKit } from './helpers/kit.ts';
import { openFixture } from './helpers/page.ts';
import { moveToCentre } from './helpers/pointer.ts';
import { settle } from './helpers/settle.ts';
import { computedStyle, outlineOf } from './helpers/styles.ts';

/** The live focus ring: the kit's (hidden) Focus indicator layer, 3px secondary, 2px out. */
const RING = { style: 'solid', width: '3px', offset: '2px', color: 'rgb(98, 91, 113)' };

/**
 * The kit's Focused variants hide their indicator: with the ring's geometry asserted, hide the live
 * ring (`selector`) and let the change land before comparing the rest pixel for pixel.
 */
async function hideRing(page: Page, selector: string) {
  await page.addStyleTag({ content: `${selector} { outline-style: none !important }` });
  await settle(page);
}

// ── Toggle button: hover / focus / click-to-select / press morph on the live component ─────
for (const variant of ['filled', 'elevated', 'outlined', 'tonal'] as const) {
  test.describe(`toggle button ${variant} (live)`, () => {
    const ref = (sel: 'selected' | 'unselected', state: string) => `${variant}-${sel}-round-medium-${state}`;
    const kit = (node: Locator, name: string, sel: 'selected' | 'unselected', state: string, message: string) =>
      expectKit(node, 'toggle-button', ref(sel, state), { label: `${variant}-${name}`, message });

    test('rest, hover, click selects, keyboard focus', async ({ page }) => {
      const node = await openFixture(page, `/fixture/toggle-button/${variant}-live`);
      const btn = node.locator('button');
      await settle(page);
      await kit(node, 'rest', 'unselected', 'enabled', 'rest');

      await moveToCentre(btn);
      await settle(page);
      await kit(node, 'hover', 'unselected', 'hovered', 'hover');

      await expect(btn).toHaveAttribute('aria-pressed', 'false');
      await page.mouse.down();
      await settle(page);
      // Held: corners morph to the pressed radius (medium 12).
      const container = btn.locator('> span').first();
      expect.soft(await computedStyle(container, 'border-top-left-radius'), 'pressed radius').toBe('12px');
      await page.mouse.up();
      await expect(btn).toHaveAttribute('aria-pressed', 'true');
      await settle(page);
      // Pointer still over it → kit "Selected / Hovered" (shape swapped to square).
      await kit(node, 'selected-hover', 'selected', 'hovered', 'selected hover');

      await page.mouse.move(0, 0);
      // The click focused it (no ring: pointer focus); re-enter by keyboard for :focus-visible.
      await btn.evaluate((e) => e.blur());
      await page.keyboard.press('Tab');
      await settle(page);
      await expect(btn).toBeFocused();
      expect.soft(await outlineOf(container), 'focus ring').toEqual(RING);
      await hideRing(page, '[data-fixture-node] button > span');
      await kit(node, 'selected-focus', 'selected', 'focused', 'selected focus');

      await page.keyboard.press('Space');
      await expect(btn).toHaveAttribute('aria-pressed', 'false');
    });
  });
}

// ── Toggle icon button: same flow on the live component ─────────────────────────────────────
for (const variant of ['filled', 'tonal', 'outlined', 'standard'] as const) {
  test.describe(`toggle icon button ${variant} (live)`, () => {
    const ref = (sel: 'selected' | 'unselected', state: string) => `${variant}-${sel}-round-medium-default-${state}`;
    const kit = (node: Locator, name: string, sel: 'selected' | 'unselected', state: string, message: string) =>
      expectKit(node, 'toggle-icon-button', ref(sel, state), { label: `${variant}-${name}`, message });

    test('rest, hover, click selects, keyboard focus', async ({ page }) => {
      const node = await openFixture(page, `/fixture/toggle-icon-button/${variant}-live`);
      const btn = node.locator('button');
      await settle(page);
      await kit(node, 'rest', 'unselected', 'enabled', 'rest');

      await moveToCentre(btn);
      await settle(page);
      await kit(node, 'hover', 'unselected', 'hovered', 'hover');

      await page.mouse.down();
      await settle(page);
      const container = btn.locator('> span').first();
      expect.soft(await computedStyle(container, 'border-top-left-radius'), 'pressed radius').toBe('12px');
      await page.mouse.up();
      await expect(btn).toHaveAttribute('aria-pressed', 'true');
      await settle(page);
      await kit(node, 'selected-hover', 'selected', 'hovered', 'selected hover');

      await page.mouse.move(0, 0);
      // The click focused it (no ring: pointer focus); re-enter by keyboard for :focus-visible.
      await btn.evaluate((e) => e.blur());
      await page.keyboard.press('Tab');
      await settle(page);
      await expect(btn).toBeFocused();
      expect.soft(await outlineOf(container), 'focus ring').toEqual(RING);
      await hideRing(page, '[data-fixture-node] button > span');
      await kit(node, 'selected-focus', 'selected', 'focused', 'selected focus');
    });
  });
}

// ── Split button: leading hover, trailing click expands (kit "Selected"), keyboard focus ────
for (const variant of ['filled', 'tonal', 'outlined', 'elevated'] as const) {
  test.describe(`split button ${variant} (live)`, () => {
    const kit = (node: Locator, name: string, lead: string, trail: string, message: string) =>
      expectKit(node, 'split-button', `${variant}-medium-${lead}-${trail}`, { label: `${variant}-${name}`, message });

    test('rest, hover, expand, keyboard focus', async ({ page }) => {
      const node = await openFixture(page, `/fixture/split-button/${variant}-live`);
      const [lead, trail] = [node.locator('button').nth(0), node.locator('button').nth(1)];
      await settle(page);
      await kit(node, 'rest', 'enabled', 'enabled', 'rest');

      await moveToCentre(lead);
      await settle(page);
      await kit(node, 'lead-hover', 'hovered', 'enabled', 'leading hover (inner corners grow)');

      await moveToCentre(trail);
      await settle(page);
      await kit(node, 'trail-hover', 'enabled', 'hovered', 'trailing hover');

      await expect(trail).toHaveAttribute('aria-expanded', 'false');
      await trail.click();
      await expect(trail).toHaveAttribute('aria-expanded', 'true');
      await page.mouse.move(0, 0);
      await trail.evaluate((e) => e.blur());
      await settle(page);
      await kit(
        node,
        'expanded',
        'enabled',
        'selected',
        'expanded = kit Selected (round, centred up-chevron, 10% layer)',
      );

      await trail.click();
      await expect(trail).toHaveAttribute('aria-expanded', 'false');
      await page.mouse.move(0, 0);
      await trail.evaluate((e) => e.blur());
      await page.keyboard.press('Tab');
      await settle(page);
      await expect(lead).toBeFocused();
      await hideRing(page, '[data-fixture-node] button > span:last-child');
      await kit(node, 'lead-focus', 'focused', 'enabled', 'leading focus (ring only, no layer)');
    });
  });
}

// ── FAB: hover raises to level 4, keyboard focus drops the shadow spread ────────────────────
for (const kind of ['fab', 'extended'] as const) {
  test(`${kind} (live): rest, hover, keyboard focus`, async ({ page }) => {
    const node = await openFixture(page, `/fixture/fab/${kind}-live`);
    const kit = (name: string, state: string, message: string) =>
      expectKit(node, 'fab', `${kind}-primaryContainer-medium-${state}`, { label: `${kind}-${name}`, message });
    const btn = node.locator('button');
    await settle(page);
    await kit('rest', 'enabled', 'rest');

    await moveToCentre(btn);
    await settle(page);
    await kit('hover', 'hovered', 'hover (level 4)');

    await page.mouse.move(0, 0);
    await page.keyboard.press('Tab');
    await settle(page);
    await expect(btn).toBeFocused();
    expect.soft(await outlineOf(btn), 'focus ring').toEqual(RING);
    await hideRing(page, '[data-fixture-node] button');
    await kit('focus', 'focused', 'focus (no-spread shadow, 10% layer)');
  });
}

// ── FAB menu: open from the FAB, render = kit "FAB menu", keyboard into items, Escape closes ─
test('fab menu (live): open, render, keyboard, escape', async ({ page }) => {
  const node = await openFixture(page, '/fixture/fab-menu/live');
  const fab = node.getByRole('button', { name: 'Actions' });
  await fab.click();
  const close = node.getByRole('button', { name: 'Actions' });
  await expect(close).toHaveAttribute('aria-expanded', 'true');
  // Focus moves into the menu: the first item, once it is drawn (the last of the stagger).
  await expect(node.getByRole('menuitem', { name: 'First' })).toBeFocused();
  await expect(node.getByRole('menuitem')).toHaveCount(3);
  await page.mouse.move(0, 0);
  await settle(page);
  await expectKit(node, 'fab-menu', 'menu-primary', { message: 'open menu = kit FAB menu' });

  await page.keyboard.press('ArrowUp');
  await expect(node.getByRole('menuitem', { name: 'Third' })).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(node.getByRole('menuitem', { name: 'Second' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(node.getByRole('menuitem')).toHaveCount(0);
  await expect(node.getByRole('button', { name: 'Actions' })).toBeFocused();
});

// ── Connected button group: rest = kit, single selection, roving focus, hover morph ─────────
test('connected button group (live): select, keyboard, hover morph', async ({ page }) => {
  const node = await openFixture(page, '/fixture/button-group/connected-live');
  await settle(page);
  await expectKit(node, 'button-group', 'connected-round-medium', { message: 'rest = kit connected group' });

  const items = node.locator('button');
  await items.nth(1).click();
  await expect(items.nth(1)).toHaveAttribute('aria-pressed', 'true');
  await expect(items.nth(0)).toHaveAttribute('aria-pressed', 'false');
  // Selected → pill; the previously selected first segment returns to round outer / 8px inner.
  await page.mouse.move(0, 0);
  await settle(page);
  const radii = (i: number) =>
    items
      .nth(i)
      .locator('> span')
      .first()
      .evaluate((e) => {
        const cs = getComputedStyle(e);
        return [cs.borderStartStartRadius, cs.borderStartEndRadius].join(' ');
      });
  expect.soft(await radii(1), 'selected = pill').toBe('28px 28px');
  expect.soft(await radii(0), 'first, unselected').toBe('28px 8px');

  await items.nth(1).focus();
  await page.keyboard.press('ArrowRight');
  await expect(items.nth(2)).toBeFocused();
  await moveToCentre(items.nth(2));
  await settle(page);
  expect.soft(await radii(2), 'hovered last: inner corner grows to 16').toBe('16px 28px');
});

// ── Segmented button: rest = kit set, click selects (check appears), keyboard roving ───────
test('segmented button (live): select, check, keyboard', async ({ page }) => {
  const node = await openFixture(page, '/fixture/segmented-button/live');
  await settle(page);
  await expectKit(node, 'segmented-button', 'set-3-d0', { message: 'rest = kit set' });
  const items = node.locator('button');
  await items.nth(2).click();
  await expect(items.nth(2)).toHaveAttribute('aria-pressed', 'true');
  await expect(items.nth(0)).toHaveAttribute('aria-pressed', 'false');
  await expect(items.nth(2).locator('svg')).toHaveCount(1);
  await expect(items.nth(0).locator('svg')).toHaveCount(0);
  await page.keyboard.press('ArrowLeft');
  await expect(items.nth(1)).toBeFocused();
});

// Auto width (unequal labels): equal segments as wide as the widest, sharing 1px borders — a
// long label must never push its container past its track (that drew doubled dividers).
test('segmented button (live, auto width): equal segments sized to the widest label', async ({ page }) => {
  const node = await openFixture(page, '/fixture/segmented-button/live-auto');
  const segs = await node.locator('button').evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      const c = el.firstElementChild!.getBoundingClientRect();
      const content = el.firstElementChild!.lastElementChild!.getBoundingClientRect();
      return { left: r.left, width: r.width, container: c.width, content: content.width };
    }),
  );
  expect(segs).toHaveLength(4);
  const widest = Math.max(...segs.map((x) => x.content)) + 24; // 12px padding each side
  for (const [i, x] of segs.entries()) {
    expect.soft(x.width, `segment ${i} width`).toBeCloseTo(widest, 1);
    expect.soft(x.container, `segment ${i} container fits its track`).toBeCloseTo(x.width, 1);
    if (i > 0) expect.soft(x.left - segs[i - 1]!.left, `segment ${i} overlaps by 1px`).toBeCloseTo(widest - 1, 1);
  }
});
