/**
 * Runtime interaction parity for the button family (toggle, toggle icon, split, FAB, FAB menu,
 * connected group, segmented): drive the REAL component with a mouse / keyboard (no forced states)
 * and compare against the Figma state variants. Complements figma-parity.spec.ts, which renders
 * states statically.
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
// ── Toggle button: hover / focus / click-to-select / press morph on the live component ─────
const toggles = JSON.parse(readFileSync(join(REFS_DIR, 'toggle-button/manifest.json'), 'utf8')) as Manifest;

function checkToggle(name: string, refName: string, shot: Buffer) {
  const v = toggles.variants[refName]!;
  const ref: Buffer = readFileSync(join(REFS_DIR, 'toggle-button', `${refName}.png`));
  const r = compareImages(ref, shot, { background: hexToRgb(v.background ?? '#FFFFFF') });
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, `toggle-${name}.actual.png`), shot);
  writeFileSync(join(OUT, `toggle-${name}.diff.png`), r.diffPng);
  test.info().annotations.push({
    type: 'parity',
    description: `${r.diffPixels} drift px (${r.flatDriftPixels} flat) · ${r.aaPixels} AA · ${r.rasterPixels} raster`,
  });
  return { r, allowed: v.allowedDiffPixels ?? 0 };
}

for (const variant of ['filled', 'elevated', 'outlined', 'tonal'] as const) {
  test.describe(`toggle button ${variant} (live)`, () => {
    const ref = (sel: 'selected' | 'unselected', state: string) => `${variant}-${sel}-round-medium-${state}`;
    const rb = (name: string) => toggles.variants[name]!.renderBounds!;
    const openToggle = async (page: Page) => {
      await page.goto(`/fixture/toggle-button/${variant}-live`);
      await page.evaluate(() => document.fonts.ready);
      await page.mouse.move(0, 0);
      const node = page.locator('[data-fixture-node]');
      await expect(node).toBeVisible();
      return node;
    };

    test('rest, hover, click selects, keyboard focus', async ({ page }) => {
      const node = await openToggle(page);
      const btn = node.locator('button');
      await page.waitForTimeout(SETTLE);
      let res = checkToggle(
        `${variant}-rest`,
        ref('unselected', 'enabled'),
        await captureRegion(page, node, rb(ref('unselected', 'enabled'))),
      );
      expect.soft(res.r.diffPixels, 'rest').toBeLessThanOrEqual(res.allowed);

      const b = (await btn.boundingBox())!;
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
      await page.waitForTimeout(SETTLE);
      res = checkToggle(
        `${variant}-hover`,
        ref('unselected', 'hovered'),
        await captureRegion(page, node, rb(ref('unselected', 'hovered'))),
      );
      expect.soft(res.r.diffPixels, 'hover').toBeLessThanOrEqual(res.allowed);

      await expect(btn).toHaveAttribute('aria-pressed', 'false');
      await page.mouse.down();
      await page.waitForTimeout(SETTLE);
      // Held: corners morph to the pressed radius (medium 12).
      const container = btn.locator('> span').first();
      expect
        .soft(await container.evaluate((e) => getComputedStyle(e).borderTopLeftRadius), 'pressed radius')
        .toBe('12px');
      await page.mouse.up();
      await expect(btn).toHaveAttribute('aria-pressed', 'true');
      await page.waitForTimeout(SETTLE);
      // Pointer still over it → kit "Selected / Hovered" (shape swapped to square).
      res = checkToggle(
        `${variant}-selected-hover`,
        ref('selected', 'hovered'),
        await captureRegion(page, node, rb(ref('selected', 'hovered'))),
      );
      expect.soft(res.r.diffPixels, 'selected hover').toBeLessThanOrEqual(res.allowed);

      await page.mouse.move(0, 0);
      // The click focused it (no ring: pointer focus); re-enter by keyboard for :focus-visible.
      await btn.evaluate((e) => e.blur());
      await page.keyboard.press('Tab');
      await page.waitForTimeout(SETTLE);
      await expect(btn).toBeFocused();
      const ring = await container.evaluate((e) => {
        const cs = getComputedStyle(e);
        return { style: cs.outlineStyle, width: cs.outlineWidth, offset: cs.outlineOffset, color: cs.outlineColor };
      });
      expect
        .soft(ring, 'focus ring')
        .toEqual({ style: 'solid', width: '3px', offset: '2px', color: 'rgb(98, 91, 113)' });
      await page.addStyleTag({ content: '[data-fixture-node] button > span { outline-style: none !important }' });
      await page.waitForTimeout(50);
      res = checkToggle(
        `${variant}-selected-focus`,
        ref('selected', 'focused'),
        await captureRegion(page, node, rb(ref('selected', 'focused'))),
      );
      expect.soft(res.r.diffPixels, 'selected focus').toBeLessThanOrEqual(res.allowed);

      await page.keyboard.press('Space');
      await expect(btn).toHaveAttribute('aria-pressed', 'false');
    });
  });
}

// ── Toggle icon button: same flow on the live component ─────────────────────────────────────
const toggleIcons = JSON.parse(readFileSync(join(REFS_DIR, 'toggle-icon-button/manifest.json'), 'utf8')) as Manifest;

function checkToggleIcon(name: string, refName: string, shot: Buffer) {
  const v = toggleIcons.variants[refName]!;
  const ref: Buffer = readFileSync(join(REFS_DIR, 'toggle-icon-button', `${refName}.png`));
  const r = compareImages(ref, shot, { background: hexToRgb(v.background ?? '#FFFFFF') });
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, `toggle-icon-${name}.actual.png`), shot);
  writeFileSync(join(OUT, `toggle-icon-${name}.diff.png`), r.diffPng);
  test.info().annotations.push({
    type: 'parity',
    description: `${r.diffPixels} drift px (${r.flatDriftPixels} flat) · ${r.aaPixels} AA · ${r.rasterPixels} raster`,
  });
  return { r, allowed: v.allowedDiffPixels ?? 0 };
}

for (const variant of ['filled', 'tonal', 'outlined', 'standard'] as const) {
  test.describe(`toggle icon button ${variant} (live)`, () => {
    const ref = (sel: 'selected' | 'unselected', state: string) => `${variant}-${sel}-round-medium-default-${state}`;
    const rb = (name: string) => toggleIcons.variants[name]!.renderBounds!;

    test('rest, hover, click selects, keyboard focus', async ({ page }) => {
      await page.goto(`/fixture/toggle-icon-button/${variant}-live`);
      await page.mouse.move(0, 0);
      const node = page.locator('[data-fixture-node]');
      await expect(node).toBeVisible();
      const btn = node.locator('button');
      await page.waitForTimeout(SETTLE);
      let res = checkToggleIcon(
        `${variant}-rest`,
        ref('unselected', 'enabled'),
        await captureRegion(page, node, rb(ref('unselected', 'enabled'))),
      );
      expect.soft(res.r.diffPixels, 'rest').toBeLessThanOrEqual(res.allowed);

      const b = (await btn.boundingBox())!;
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
      await page.waitForTimeout(SETTLE);
      res = checkToggleIcon(
        `${variant}-hover`,
        ref('unselected', 'hovered'),
        await captureRegion(page, node, rb(ref('unselected', 'hovered'))),
      );
      expect.soft(res.r.diffPixels, 'hover').toBeLessThanOrEqual(res.allowed);

      await page.mouse.down();
      await page.waitForTimeout(SETTLE);
      const container = btn.locator('> span').first();
      expect
        .soft(await container.evaluate((e) => getComputedStyle(e).borderTopLeftRadius), 'pressed radius')
        .toBe('12px');
      await page.mouse.up();
      await expect(btn).toHaveAttribute('aria-pressed', 'true');
      await page.waitForTimeout(SETTLE);
      res = checkToggleIcon(
        `${variant}-selected-hover`,
        ref('selected', 'hovered'),
        await captureRegion(page, node, rb(ref('selected', 'hovered'))),
      );
      expect.soft(res.r.diffPixels, 'selected hover').toBeLessThanOrEqual(res.allowed);

      await page.mouse.move(0, 0);
      // The click focused it (no ring: pointer focus); re-enter by keyboard for :focus-visible.
      await btn.evaluate((e) => e.blur());
      await page.keyboard.press('Tab');
      await page.waitForTimeout(SETTLE);
      await expect(btn).toBeFocused();
      const ring = await container.evaluate((e) => {
        const cs = getComputedStyle(e);
        return { style: cs.outlineStyle, width: cs.outlineWidth, offset: cs.outlineOffset, color: cs.outlineColor };
      });
      expect
        .soft(ring, 'focus ring')
        .toEqual({ style: 'solid', width: '3px', offset: '2px', color: 'rgb(98, 91, 113)' });
      await page.addStyleTag({ content: '[data-fixture-node] button > span { outline-style: none !important }' });
      await page.waitForTimeout(50);
      res = checkToggleIcon(
        `${variant}-selected-focus`,
        ref('selected', 'focused'),
        await captureRegion(page, node, rb(ref('selected', 'focused'))),
      );
      expect.soft(res.r.diffPixels, 'selected focus').toBeLessThanOrEqual(res.allowed);
    });
  });
}

// ── Split button: leading hover, trailing click expands (kit "Selected"), keyboard focus ────
const splits = JSON.parse(readFileSync(join(REFS_DIR, 'split-button/manifest.json'), 'utf8')) as Manifest;

function checkSplit(name: string, refName: string, shot: Buffer) {
  const v = splits.variants[refName]!;
  const ref: Buffer = readFileSync(join(REFS_DIR, 'split-button', `${refName}.png`));
  const r = compareImages(ref, shot, { background: hexToRgb(v.background ?? '#FFFFFF') });
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, `split-${name}.actual.png`), shot);
  writeFileSync(join(OUT, `split-${name}.diff.png`), r.diffPng);
  test.info().annotations.push({
    type: 'parity',
    description: `${r.diffPixels} drift px (${r.flatDriftPixels} flat) · ${r.aaPixels} AA · ${r.rasterPixels} raster`,
  });
  return { r, allowed: v.allowedDiffPixels ?? 0 };
}

for (const variant of ['filled', 'tonal', 'outlined', 'elevated'] as const) {
  test.describe(`split button ${variant} (live)`, () => {
    const ref = (lead: string, trail: string) => `${variant}-medium-${lead}-${trail}`;
    const rb = (name: string) => splits.variants[name]!.renderBounds!;

    test('rest, hover, expand, keyboard focus', async ({ page }) => {
      await page.goto(`/fixture/split-button/${variant}-live`);
      await page.evaluate(() => document.fonts.ready);
      await page.mouse.move(0, 0);
      const node = page.locator('[data-fixture-node]');
      await expect(node).toBeVisible();
      const [lead, trail] = [node.locator('button').nth(0), node.locator('button').nth(1)];
      await page.waitForTimeout(SETTLE);
      let res = checkSplit(
        `${variant}-rest`,
        ref('enabled', 'enabled'),
        await captureRegion(page, node, rb(ref('enabled', 'enabled'))),
      );
      expect.soft(res.r.diffPixels, 'rest').toBeLessThanOrEqual(res.allowed);

      const lb = (await lead.boundingBox())!;
      await page.mouse.move(lb.x + lb.width / 2, lb.y + lb.height / 2);
      await page.waitForTimeout(SETTLE);
      res = checkSplit(
        `${variant}-lead-hover`,
        ref('hovered', 'enabled'),
        await captureRegion(page, node, rb(ref('hovered', 'enabled'))),
      );
      expect.soft(res.r.diffPixels, 'leading hover (inner corners grow)').toBeLessThanOrEqual(res.allowed);

      const tb = (await trail.boundingBox())!;
      await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2);
      await page.waitForTimeout(SETTLE);
      res = checkSplit(
        `${variant}-trail-hover`,
        ref('enabled', 'hovered'),
        await captureRegion(page, node, rb(ref('enabled', 'hovered'))),
      );
      expect.soft(res.r.diffPixels, 'trailing hover').toBeLessThanOrEqual(res.allowed);

      await expect(trail).toHaveAttribute('aria-expanded', 'false');
      await trail.click();
      await expect(trail).toHaveAttribute('aria-expanded', 'true');
      await page.mouse.move(0, 0);
      await trail.evaluate((e) => e.blur());
      await page.waitForTimeout(SETTLE);
      res = checkSplit(
        `${variant}-expanded`,
        ref('enabled', 'selected'),
        await captureRegion(page, node, rb(ref('enabled', 'selected'))),
      );
      expect
        .soft(res.r.diffPixels, 'expanded = kit Selected (round, centred up-chevron, 10% layer)')
        .toBeLessThanOrEqual(res.allowed);

      await trail.click();
      await expect(trail).toHaveAttribute('aria-expanded', 'false');
      await page.mouse.move(0, 0);
      await trail.evaluate((e) => e.blur());
      await page.keyboard.press('Tab');
      await page.waitForTimeout(SETTLE);
      await expect(lead).toBeFocused();
      await page.addStyleTag({
        content: '[data-fixture-node] button > span:last-child { outline-style: none !important }',
      });
      await page.waitForTimeout(50);
      res = checkSplit(
        `${variant}-lead-focus`,
        ref('focused', 'enabled'),
        await captureRegion(page, node, rb(ref('focused', 'enabled'))),
      );
      expect.soft(res.r.diffPixels, 'leading focus (ring only, no layer)').toBeLessThanOrEqual(res.allowed);
    });
  });
}

// ── FAB: hover raises to level 4, keyboard focus drops the shadow spread ────────────────────
const fabs = JSON.parse(readFileSync(join(REFS_DIR, 'fab/manifest.json'), 'utf8')) as Manifest;

function checkFab(name: string, refName: string, shot: Buffer) {
  const v = fabs.variants[refName]!;
  const ref: Buffer = readFileSync(join(REFS_DIR, 'fab', `${refName}.png`));
  const r = compareImages(ref, shot, { background: hexToRgb(v.background ?? '#FFFFFF') });
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, `fab-${name}.actual.png`), shot);
  writeFileSync(join(OUT, `fab-${name}.diff.png`), r.diffPng);
  test.info().annotations.push({
    type: 'parity',
    description: `${r.diffPixels} drift px (${r.flatDriftPixels} flat) · ${r.aaPixels} AA · ${r.rasterPixels} raster`,
  });
  return { r, allowed: v.allowedDiffPixels ?? 0 };
}

for (const kind of ['fab', 'extended'] as const) {
  test(`${kind} (live): rest, hover, keyboard focus`, async ({ page }) => {
    const ref = (state: string) => `${kind}-primaryContainer-medium-${state}`;
    const rb = (name: string) => fabs.variants[name]!.renderBounds!;
    await page.goto(`/fixture/fab/${kind}-live`);
    await page.evaluate(() => document.fonts.ready);
    await page.mouse.move(0, 0);
    const node = page.locator('[data-fixture-node]');
    await expect(node).toBeVisible();
    const btn = node.locator('button');
    await page.waitForTimeout(SETTLE);
    let res = checkFab(`${kind}-rest`, ref('enabled'), await captureRegion(page, node, rb(ref('enabled'))));
    expect.soft(res.r.diffPixels, 'rest').toBeLessThanOrEqual(res.allowed);

    const b = (await btn.boundingBox())!;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.waitForTimeout(SETTLE);
    res = checkFab(`${kind}-hover`, ref('hovered'), await captureRegion(page, node, rb(ref('hovered'))));
    expect.soft(res.r.diffPixels, 'hover (level 4)').toBeLessThanOrEqual(res.allowed);

    await page.mouse.move(0, 0);
    await page.keyboard.press('Tab');
    await page.waitForTimeout(SETTLE);
    await expect(btn).toBeFocused();
    const ring = await btn.evaluate((e) => {
      const cs = getComputedStyle(e);
      return { style: cs.outlineStyle, width: cs.outlineWidth, offset: cs.outlineOffset, color: cs.outlineColor };
    });
    expect.soft(ring, 'focus ring').toEqual({ style: 'solid', width: '3px', offset: '2px', color: 'rgb(98, 91, 113)' });
    await page.addStyleTag({ content: '[data-fixture-node] button { outline-style: none !important }' });
    await page.waitForTimeout(50);
    res = checkFab(`${kind}-focus`, ref('focused'), await captureRegion(page, node, rb(ref('focused'))));
    expect.soft(res.r.diffPixels, 'focus (no-spread shadow, 10% layer)').toBeLessThanOrEqual(res.allowed);
  });
}

// ── FAB menu: open from the FAB, render = kit "FAB menu", keyboard into items, Escape closes ─
test('fab menu (live): open, render, keyboard, escape', async ({ page }) => {
  const menus = JSON.parse(readFileSync(join(REFS_DIR, 'fab-menu/manifest.json'), 'utf8')) as Manifest;
  await page.goto('/fixture/fab-menu/live');
  await page.evaluate(() => document.fonts.ready);
  const node = page.locator('[data-fixture-node]');
  const fab = node.getByRole('button', { name: 'Actions' });
  await fab.click();
  const close = node.getByRole('button', { name: 'Actions' });
  await expect(close).toHaveAttribute('aria-expanded', 'true');
  // Focus moves into the menu: the first item, once it is drawn (the last of the stagger).
  await expect(node.getByRole('menuitem', { name: 'First' })).toBeFocused();
  await expect(node.getByRole('menuitem')).toHaveCount(3);
  await page.mouse.move(0, 0);
  await page.waitForTimeout(SETTLE);
  const v = menus.variants['menu-primary']!;
  const ref: Buffer = readFileSync(join(REFS_DIR, 'fab-menu', 'menu-primary.png'));
  const shot = await captureRegion(page, node, v.renderBounds!);
  const r = compareImages(ref, shot, { background: hexToRgb(v.background ?? '#FFFFFF') });
  test.info().annotations.push({
    type: 'parity',
    description: `${r.diffPixels} drift px (${r.flatDriftPixels} flat) · ${r.aaPixels} AA · ${r.rasterPixels} raster`,
  });
  expect.soft(r.diffPixels, 'open menu = kit FAB menu').toBeLessThanOrEqual(v.allowedDiffPixels ?? 0);

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
  const groups = JSON.parse(readFileSync(join(REFS_DIR, 'button-group/manifest.json'), 'utf8')) as Manifest;
  await page.goto('/fixture/button-group/connected-live');
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(0, 0);
  const node = page.locator('[data-fixture-node]');
  await expect(node).toBeVisible();
  await page.waitForTimeout(SETTLE);
  const v = groups.variants['connected-round-medium']!;
  const ref: Buffer = readFileSync(join(REFS_DIR, 'button-group', 'connected-round-medium.png'));
  const r = compareImages(ref, await captureRegion(page, node, v.renderBounds!), {
    background: hexToRgb(v.background ?? '#FFFFFF'),
  });
  test.info().annotations.push({
    type: 'parity',
    description: `${r.diffPixels} drift px (${r.flatDriftPixels} flat) · ${r.aaPixels} AA · ${r.rasterPixels} raster`,
  });
  expect.soft(r.diffPixels, 'rest = kit connected group').toBeLessThanOrEqual(v.allowedDiffPixels ?? 0);

  const items = node.locator('button');
  await items.nth(1).click();
  await expect(items.nth(1)).toHaveAttribute('aria-pressed', 'true');
  await expect(items.nth(0)).toHaveAttribute('aria-pressed', 'false');
  // Selected → pill; the previously selected first segment returns to round outer / 8px inner.
  await page.mouse.move(0, 0);
  await page.waitForTimeout(SETTLE);
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
  const b = (await items.nth(2).boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.waitForTimeout(SETTLE);
  expect.soft(await radii(2), 'hovered last: inner corner grows to 16').toBe('16px 28px');
});

// ── Segmented button: rest = kit set, click selects (check appears), keyboard roving ───────
test('segmented button (live): select, check, keyboard', async ({ page }) => {
  const segs = JSON.parse(readFileSync(join(REFS_DIR, 'segmented-button/manifest.json'), 'utf8')) as Manifest;
  await page.goto('/fixture/segmented-button/live');
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(0, 0);
  const node = page.locator('[data-fixture-node]');
  await expect(node).toBeVisible();
  await page.waitForTimeout(SETTLE);
  const v = segs.variants['set-3-d0']!;
  const ref: Buffer = readFileSync(join(REFS_DIR, 'segmented-button', 'set-3-d0.png'));
  const r = compareImages(ref, await captureRegion(page, node, v.renderBounds!), {
    background: hexToRgb(v.background ?? '#FFFFFF'),
  });
  test.info().annotations.push({
    type: 'parity',
    description: `${r.diffPixels} drift px (${r.flatDriftPixels} flat) · ${r.aaPixels} AA · ${r.rasterPixels} raster`,
  });
  expect.soft(r.diffPixels, 'rest = kit set').toBeLessThanOrEqual(v.allowedDiffPixels ?? 0);
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
  await page.goto('/fixture/segmented-button/live-auto');
  await page.evaluate(() => document.fonts.ready);
  const node = page.locator('[data-fixture-node]');
  await expect(node).toBeVisible();
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
