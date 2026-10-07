/**
 * Runtime interaction parity: drive the REAL component with a mouse / keyboard (no forced
 * states) and compare against the Figma state variants. Complements figma-parity.spec.ts,
 * which renders states statically.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { compareImages } from './compare.ts';
import { captureRegion, hexToRgb } from './capture.ts';
import { REFS_DIR, type Manifest } from './manifest.ts';

const OUT = join(process.cwd(), 'tests/visual/__output__/interaction');
const cards = JSON.parse(readFileSync(join(REFS_DIR, 'card-states/manifest.json'), 'utf8')) as Manifest;
/** Effects transitions (state layer, shadow) are 150 ms; allow generous settling. */
const SETTLE = 500;

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
  const close = node.getByRole('button', { name: 'Close menu' });
  await expect(close).toHaveAttribute('aria-expanded', 'true');
  await expect(close).toBeFocused();
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

// ── Progress: value changes spring to the kit's geometry; waves travel unless reduced motion ─
test.describe('progress (live)', () => {
  const prog = JSON.parse(readFileSync(join(REFS_DIR, 'progress/manifest.json'), 'utf8')) as Manifest;
  const check = async (page: Page, target: ReturnType<Page['locator']>, name: string) => {
    const v = prog.variants[name]!;
    const ref: Buffer = readFileSync(join(REFS_DIR, 'progress', `${name}.png`));
    const r = compareImages(ref, await captureRegion(page, target, v.renderBounds!), {
      background: hexToRgb(v.background ?? '#FFFFFF'),
    });
    test
      .info()
      .annotations.push({ type: 'parity', description: `${name}: ${r.diffPixels} drift px · ${r.aaPixels} AA` });
    expect.soft(r.diffPixels, name).toBeLessThanOrEqual(v.allowedDiffPixels ?? 0);
  };
  /** ProgressAnimationSpec (no bounce, stiffness 50) settles in ≈1.3 s. */
  const SPRING_SETTLE = 2000;
  // The suite defaults to reduced motion (playwright.config); these tests are about motion.
  test.beforeEach(async ({ page }) => page.emulateMedia({ reducedMotion: 'no-preference' }));

  for (const kind of ['linear', 'circular'] as const) {
    test(`${kind}: value change animates and lands on the kit frame`, async ({ page }) => {
      await page.goto(`/fixture/progress/live-${kind}`);
      const node = page.locator('[data-fixture-node]');
      const bar = node.getByRole('progressbar');
      const [from, to] = kind === 'linear' ? [50, 80] : [30, 80];
      await expect(bar).toHaveAttribute('aria-valuenow', String(from));
      // Frame-driven: under parallel load the first frame can still be settling — poll first.
      const start = prog.variants[`${kind}-flat-4-${from}`]!;
      const startRef: Buffer = readFileSync(join(REFS_DIR, 'progress', `${kind}-flat-4-${from}.png`));
      await expect
        .poll(
          async () =>
            compareImages(startRef, await captureRegion(page, node, start.renderBounds!), {
              background: hexToRgb(start.background ?? '#FFFFFF'),
            }).diffPixels,
          { timeout: 8000 },
        )
        .toBeLessThanOrEqual(start.allowedDiffPixels ?? 0);
      await check(page, node, `${kind}-flat-4-${from}`);
      await page.getByRole('button', { name: `${to}%` }).click();
      await expect(bar).toHaveAttribute('aria-valuenow', String(to));
      await page.waitForTimeout(250);
      const mid = await captureRegion(page, node, prog.variants[`${kind}-flat-4-${to}`]!.renderBounds!);
      const ref: Buffer = readFileSync(join(REFS_DIR, 'progress', `${kind}-flat-4-${to}.png`));
      expect
        .soft(
          compareImages(ref, mid, { background: [247, 242, 250] }).diffPixels,
          'mid-spring frame differs from the target',
        )
        .toBeGreaterThan(0);
      // The spring is frame-driven: under parallel load it can take longer than SPRING_SETTLE, so
      // poll until it lands, then run the regular parity check.
      const target = prog.variants[`${kind}-flat-4-${to}`]!;
      const settled = async () =>
        compareImages(ref, await captureRegion(page, node, target.renderBounds!), {
          background: hexToRgb(target.background ?? '#FFFFFF'),
        }).diffPixels;
      await page.waitForTimeout(SPRING_SETTLE);
      await expect.poll(settled, { timeout: 8000 }).toBeLessThanOrEqual(target.allowedDiffPixels ?? 0);
      await check(page, node, `${kind}-flat-4-${to}`);
    });
  }

  for (const kind of ['linear', 'circular'] as const) {
    test(`${kind} wave: travels; static (= kit) under reduced motion`, async ({ page }) => {
      const name = `${kind}-wave-4-50`;
      const rb = prog.variants[name]!.renderBounds!;
      await page.goto(`/fixture/progress/live-wave-${kind}`);
      const node = page.locator('[data-fixture-node]');
      const a = await captureRegion(page, node, rb);
      await page.waitForTimeout(300);
      const b = await captureRegion(page, node, rb);
      expect.soft(a.equals(b), 'wave moves').toBe(false);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.reload();
      await page.waitForTimeout(300);
      const c = await captureRegion(page, node, rb);
      await page.waitForTimeout(300);
      expect.soft(c.equals(await captureRegion(page, node, rb)), 'reduced motion: still').toBe(true);
      await check(page, node, name);
    });
  }

  test('indeterminate: no value, animates', async ({ page }) => {
    await page.goto('/fixture/progress/live-indeterminate');
    for (const label of ['Loading linear', 'Loading circular', 'Loading shape']) {
      const bar = page.getByRole('progressbar', { name: label });
      await expect(bar).toBeVisible();
      expect.soft(await bar.getAttribute('aria-valuenow'), `${label}: indeterminate`).toBeNull();
      const before = await bar.screenshot();
      await page.waitForTimeout(200);
      expect.soft(before.equals(await bar.screenshot()), `${label}: animates`).toBe(false);
    }
  });
});

// ── Slider: real pointer / keyboard against the kit's Medium 50% frames ──────────────────────
test('slider (live): rest, hover, press, drag, keyboard', async ({ page }) => {
  const sl = JSON.parse(readFileSync(join(REFS_DIR, 'slider/manifest.json'), 'utf8')) as Manifest;
  await page.goto('/fixture/slider/live');
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(0, 0);
  const node = page.locator('[data-fixture-node]');
  const check = async (name: string) => {
    const v = sl.variants[name]!;
    const ref: Buffer = readFileSync(join(REFS_DIR, 'slider', `${name}.png`));
    const r = compareImages(ref, await captureRegion(page, node, v.renderBounds!), {
      background: hexToRgb(v.background ?? '#FFFFFF'),
    });
    test
      .info()
      .annotations.push({ type: 'parity', description: `${name}: ${r.diffPixels} drift px · ${r.aaPixels} AA` });
    expect.soft(r.diffPixels, name).toBeLessThanOrEqual(v.allowedDiffPixels ?? 0);
  };
  const volume = page.getByRole('slider', { name: 'Volume' });
  const values = page.locator('[data-values]');
  await check('std-h-m-enabled-50');
  const box = (await node.boundingBox())!;
  const handleX = box.x + 177;
  await page.mouse.move(handleX, box.y + 26);
  await page.waitForTimeout(SETTLE);
  await check('std-h-m-hovered-50');
  await page.mouse.down();
  await page.waitForTimeout(SETTLE);
  await check('std-h-m-pressed-50');
  await page.mouse.move(handleX + 34.2, box.y + 26, { steps: 4 });
  await page.mouse.up();
  await expect(volume).toHaveAttribute('aria-valuenow', '60');
  // Reset the sequential-focus starting point to the document, then Tab in.
  await page.mouse.click(1, 1);
  // Keyboard: focus halves the handle (Compose) and shows the value indicator; arrows step.
  await page.keyboard.press('Tab');
  await expect(volume).toBeFocused();
  const handle = volume.locator('xpath=..');
  await expect.poll(async () => (await handle.boundingBox())!.width).toBe(2);
  await page.keyboard.press('ArrowRight');
  await expect(volume).toHaveAttribute('aria-valuenow', '61');
  await expect(values).toHaveText(/^61\|/);
  // Range: the closest thumb follows the pointer.
  const price = page.getByRole('slider', { name: 'Price' });
  await expect(price).toHaveCount(2);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('ArrowRight');
  await expect(values).toHaveText(/\|21,60$/);
});

// ── Text field: real hover, focus (label floats), typing, blur ───────────────────────────────
test('text field (live): hover, focus floats the label, typing, blur', async ({ page }) => {
  const tf = JSON.parse(readFileSync(join(REFS_DIR, 'text-field/manifest.json'), 'utf8')) as Manifest;
  await page.goto('/fixture/text-field/live');
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(0, 0);
  const node = page.locator('[data-fixture-node]');
  const check = async (name: string) => {
    const v = tf.variants[name]!;
    const ref: Buffer = readFileSync(join(REFS_DIR, 'text-field', `${name}.png`));
    const r = compareImages(ref, await captureRegion(page, node, v.renderBounds!), {
      background: hexToRgb(v.background ?? '#FFFFFF'),
    });
    test
      .info()
      .annotations.push({ type: 'parity', description: `${name}: ${r.diffPixels} drift px · ${r.aaPixels} AA` });
    expect.soft(r.diffPixels, name).toBeLessThanOrEqual(v.allowedDiffPixels ?? 0);
  };
  await check('filled-enabled-label-xx');
  const box = (await node.boundingBox())!;
  await page.mouse.move(box.x + 120, box.y + 28);
  await page.waitForTimeout(SETTLE);
  await check('filled-hovered-label-xx');
  const input = page.getByRole('textbox', { name: 'Label' });
  await page.mouse.click(box.x + 120, box.y + 28);
  await expect(input).toBeFocused();
  await page.keyboard.type('Input');
  await expect(page.locator('[data-value]')).toHaveText('Input');
  await page.mouse.move(0, 0);
  await input.blur();
  await page.waitForTimeout(SETTLE);
  await check('filled-enabled-input-xx');
  // Supporting text is the field's accessible description.
  await expect(input).toHaveAccessibleDescription('Supporting text');
});

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
    const collapse = page.getByRole('button', { name: 'Collapse' });
    await expect(collapse).toHaveAttribute('aria-expanded', 'true');
    await expect(nested).toBeVisible();
    await page.mouse.move(0, 0);
    await page.waitForTimeout(SETTLE);
    await check('accordion-expanded');
    await collapse.press('Enter');
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

test('search (live): the bar matches the kit, opens the docked view, filters, closes back to the bar', async ({
  page,
}) => {
  const sm = JSON.parse(readFileSync(join(REFS_DIR, 'search/manifest.json'), 'utf8')) as Manifest;
  await page.goto('/fixture/search/live');
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(0, 0);
  const node = page.locator('[data-fixture-node]');
  const v = sm.variants['bar-enabled-plain']!;
  const ref: Buffer = readFileSync(join(REFS_DIR, 'search', 'bar-enabled-plain.png'));
  const r = compareImages(ref, await captureRegion(page, node, v.renderBounds ?? [0, 0, v.size[0], v.size[1]]), {
    background: hexToRgb(v.background ?? '#FFFFFF'),
  });
  test.info().annotations.push({
    type: 'parity',
    description: `bar-enabled-plain (live): ${r.diffPixels} drift px · ${r.aaPixels} AA`,
  });
  expect.soft(r.diffPixels, 'bar-enabled-plain').toBeLessThanOrEqual(v.allowedDiffPixels ?? 0);

  // Keyboard: the menu button, then the bar's own trigger (a real button, not a wrapper around the icons).
  const trigger = page.getByRole('button', { name: 'Hinted search text' });
  // The bar sits in a wrapper that the expanded view overlays (it animates out over the bar).
  const layer = node.locator('> div > div > span').first();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Menu' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(trigger).toBeFocused();
  await expect.poll(() => layer.evaluate((el) => getComputedStyle(el).opacity)).toBe('0.1');

  // Enter expands to the docked view with the input focused; typing filters the results.
  await page.keyboard.press('Enter');
  const input = page.getByRole('searchbox', { name: 'Hinted search text' });
  await expect(input).toBeFocused();
  await expect(page.getByText('Statements')).toBeVisible();
  await page.keyboard.type('pay');
  await expect(page.getByText('Payments')).toBeVisible();
  await expect(page.getByText('Statements')).toHaveCount(0);
  await page.getByRole('button', { name: 'Clear' }).click();
  await expect(input).toHaveValue('');

  // Escape collapses back to the bar and returns focus to its trigger.
  await input.press('Escape');
  await expect(trigger).toBeFocused();

  // Pointer: a click anywhere on the bar's text area opens it; the menu button doesn't.
  await page.getByRole('button', { name: 'Menu' }).click();
  await expect(input).toHaveCount(0);
  await node.click({ position: { x: 200, y: 28 } });
  await expect(input).toBeFocused();
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(trigger).toBeFocused();
});

test('toolbar (live): matches the kit, arrow keys rove one tab stop, collapses into a growing FAB', async ({
  page,
}) => {
  const tm = JSON.parse(readFileSync(join(REFS_DIR, 'toolbar/manifest.json'), 'utf8')) as Manifest;
  await page.goto('/fixture/toolbar/live');
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(0, 0);
  const node = page.locator('[data-fixture-node]');
  const v = tm.variants['ex-fab-share']!;
  const ref: Buffer = readFileSync(join(REFS_DIR, 'toolbar', 'ex-fab-share.png'));
  const r = compareImages(ref, await captureRegion(page, node, v.renderBounds ?? [0, 0, v.size[0], v.size[1]]), {
    background: hexToRgb(v.background ?? '#FFFFFF'),
  });
  test.info().annotations.push({
    type: 'parity',
    description: `ex-fab-share (live): ${r.diffPixels} drift px · ${r.aaPixels} AA`,
  });
  expect.soft(r.diffPixels, 'ex-fab-share').toBeLessThanOrEqual(v.allowedDiffPixels ?? 0);

  // One tab stop; arrows move within the toolbar (wrapping), Home / End jump; Tab leaves to the FAB.
  const toolbar = page.getByRole('toolbar', { name: 'Actions' });
  const share = toolbar.getByRole('button', { name: 'Share' });
  const comment = toolbar.getByRole('button', { name: 'Comment' });
  const download = toolbar.getByRole('button', { name: 'Download' });
  await page.keyboard.press('Tab');
  await expect(share).toBeFocused();
  await expect(comment).toHaveAttribute('tabindex', '-1');
  await page.keyboard.press('ArrowRight');
  await expect(comment).toBeFocused();
  await page.keyboard.press('Space');
  await expect(comment).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('End');
  await expect(download).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(share).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(download).toBeFocused();
  await page.keyboard.press('Home');
  await expect(share).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Add' })).toBeFocused();
  // Re-entering returns to the last active item.
  await page.keyboard.press('Shift+Tab');
  await expect(share).toBeFocused();

  // Collapse (FastSpatial): the toolbar shrinks to nothing towards the FAB, which grows to 80px in
  // place; the layout keeps its width.
  const fab = page.getByRole('button', { name: 'Add' });
  const rect = (l: typeof fab) =>
    l.evaluate((el) => {
      const b = el.getBoundingClientRect();
      return [Math.round(b.width), Math.round(b.height), Math.round(b.right)];
    });
  const shell = toolbar.locator('xpath=..');
  const start = await rect(fab);
  expect(start.slice(0, 2)).toEqual([56, 56]);
  await page.getByLabel('collapse').check();
  await expect.poll(async () => (await rect(shell))[0]).toBe(0);
  await expect.poll(async () => (await rect(fab)).slice(0, 2)).toEqual([80, 80]);
  expect((await rect(fab))[2]).toBe(start[2]);
  await expect(share).not.toBeFocused();
  await page.getByLabel('collapse').uncheck();
  await expect.poll(async () => (await rect(shell))[0]).toBe(168);
  await expect.poll(async () => (await rect(fab)).slice(0, 2)).toEqual([56, 56]);
});

test('sheets (live): modal bottom sheet slides in, dismisses by Escape / handle / drag; side sheet traps focus', async ({
  page,
}) => {
  await page.goto('/fixture/sheets/live');
  await page.evaluate(() => document.fonts.ready);
  const openBottom = page.getByRole('button', { name: 'Open bottom sheet' });
  const sheet = page.getByRole('dialog', { name: 'Share' });
  const ty = () =>
    sheet.evaluate(
      (el) =>
        new DOMMatrix(getComputedStyle(el).transform === 'none' ? undefined : getComputedStyle(el).transform).m42 +
        parseFloat(getComputedStyle(el).translate.split(' ')[1] ?? '0'),
    );

  // Opens from below on the default spatial spring and settles at rest; the scrim is 32% Scrim.
  await openBottom.click();
  await expect(sheet).toBeVisible();
  await expect.poll(ty).toBe(0);
  const scrimBg = await page
    .locator('[data-m3-portal] [role="presentation"][data-open]')
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(scrimBg).toMatch(/rgba?\(0, 0, 0, 0\.32\)|color\(srgb 0 0 0 \/ 0\.32\)/);
  await page.keyboard.press('Escape');
  await expect(sheet).toHaveCount(0);
  await expect(openBottom).toBeFocused();

  // The handle is a button: activating it dismisses.
  await openBottom.click();
  await page.getByRole('button', { name: 'Close sheet' }).click();
  await expect(sheet).toHaveCount(0);

  // A short drag settles back; past 56px it dismisses.
  await openBottom.click();
  await expect.poll(ty).toBe(0);
  const handle = page.getByRole('button', { name: 'Close sheet' });
  const hb = (await handle.boundingBox())!;
  await page.mouse.move(hb.x + hb.width / 2, hb.y + 2);
  await page.mouse.down();
  await page.mouse.move(hb.x + hb.width / 2, hb.y + 30, { steps: 8 });
  await page.waitForTimeout(150);
  await page.mouse.up();
  await expect.poll(ty).toBe(0);
  await expect(sheet).toBeVisible();
  await page.mouse.move(hb.x + hb.width / 2, hb.y + 2);
  await page.mouse.down();
  await page.mouse.move(hb.x + hb.width / 2, hb.y + 120, { steps: 12 });
  await page.waitForTimeout(150);
  await page.mouse.up();
  await expect(sheet).toHaveCount(0);

  // Side sheet: labelled by its headline, focus moves inside, Escape restores it to the trigger.
  const openSide = page.getByRole('button', { name: 'Open side sheet' });
  await openSide.click();
  const side = page.getByRole('dialog', { name: 'Filters' });
  await expect(side).toBeVisible();
  await expect.poll(() => side.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(side).toHaveCount(0);
  await expect(openSide).toBeFocused();
});

test('dialog (live): opens with the M3 fade-scale, matches the kit, actions / Escape / scrim close it', async ({
  page,
}) => {
  const dm = JSON.parse(readFileSync(join(REFS_DIR, 'dialogs/manifest.json'), 'utf8')) as Manifest;
  await page.goto('/fixture/dialogs/live');
  await page.evaluate(() => document.fonts.ready);
  const open = page.getByRole('button', { name: 'Open dialog' });
  const dialog = page.getByRole('dialog', { name: 'Basic dialog title' });
  const result = page.locator('[data-result]');

  // Enters from 80% scale and fades in (MDC m3_motion_fade_enter), settling at 1.
  await open.click();
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAccessibleDescription(/critical information/);
  await expect
    .poll(() => dialog.evaluate((el) => [getComputedStyle(el).scale, getComputedStyle(el).opacity].join(' ')))
    .toBe('1 1');
  // Same surface as the kit's basic dialog with icon (pixels: the static parity suite).
  const surface = dialog.locator('> div');
  const v = dm.variants['basic-icon']!;
  const bb = (await surface.boundingBox())!;
  expect([bb.width, bb.height]).toEqual(v.size);
  expect(await surface.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(236, 230, 240)');

  // Focus is inside; the confirming action closes with its result.
  await expect.poll(() => dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  await dialog.getByRole('button', { name: 'Action 1' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(result).toHaveText('confirm');
  await expect(open).toBeFocused();

  // Escape dismisses; so does a click on the scrim.
  await open.click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(result).toHaveText('dismissed');
  await open.click();
  await expect(dialog).toBeVisible();
  await page.mouse.click(5, 5);
  await expect(dialog).toHaveCount(0);
});

test('carousel (live): items resize through the keylines as it scrolls; keys and scrolling settle on an item', async ({
  page,
}) => {
  await page.goto('/fixture/carousel/live');
  await page.evaluate(() => document.fonts.ready);
  const carousel = page.getByRole('region', { name: 'Photos' });
  const slides = carousel.locator('[aria-roledescription="slide"]');
  const geo = async () => {
    const base = (await carousel.boundingBox())!;
    return Promise.all(
      [0, 1, 2].map(async (i) => {
        const b = (await slides.nth(i).boundingBox())!;
        return [Math.round(b.x - base.x), Math.round(b.width)];
      }),
    );
  };
  // Rest: large / medium / small (Compose multi-browse for 380px, 188px preferred).
  expect(await geo()).toEqual([
    [16, 188],
    [212, 122],
    [342, 54],
  ]);

  // Part way: the medium item grows towards large while the large one shrinks, edges pinned
  // (read in the same frame as the scroll, before the settle spring moves it).
  const part = await carousel.evaluate((el) => {
    el.scrollLeft = 120;
    el.dispatchEvent(new Event('scroll'));
    return [...el.querySelectorAll<HTMLElement>('[aria-roledescription="slide"]')].slice(0, 2).map((s) => {
      const r = s.getBoundingClientRect();
      return [r.left - el.getBoundingClientRect().left, r.width] as const;
    });
  });
  const [[x0, w0], [x1, w1]] = part as [readonly [number, number], readonly [number, number]];
  expect(w1).toBeGreaterThan(122);
  expect(w1).toBeLessThan(188);
  expect(x0 + w0 + 8).toBeCloseTo(x1, 0);

  // A free scroll comes to rest on the nearest item (Compose snap spring).
  await expect.poll(() => carousel.evaluate((el) => el.scrollLeft)).toBe(196);
  expect((await geo())[1]).toEqual([16, 188]);

  // Arrow keys advance one item at a time.
  await carousel.focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => carousel.evaluate((el) => el.scrollLeft)).toBe(392);
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect.poll(() => carousel.evaluate((el) => el.scrollLeft)).toBe(0);
  expect(await geo()).toEqual([
    [16, 188],
    [212, 122],
    [342, 54],
  ]);
  await expect(slides.first()).toHaveAttribute('aria-label', '1 of 8');
});

test('date pickers (live): modal pick / keys / year / input, docked panel, full-screen range', async ({ page }) => {
  await page.goto('/fixture/date-picker/live');
  await page.evaluate(() => document.fonts.ready);
  // The fixture's <output>s (the closing dialog's days carry data-date while they fade out: the
  // M3 dialog fade stays under reduced motion).
  const out = (k: string) => page.locator(`output[data-${k}]`);

  // Modal: the selected day holds the tab stop; arrows move it; a click selects; OK commits.
  await page.getByRole('button', { name: 'Pick date' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const day17 = dialog.getByRole('button', { name: 'July 17, 2025' });
  await expect(day17).toHaveAttribute('tabindex', '0');
  await day17.focus();
  await page.keyboard.press('ArrowRight');
  await expect(dialog.getByRole('button', { name: 'July 18, 2025' })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(dialog.getByRole('button', { name: 'July 25, 2025' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(dialog.getByText('Fri, Jul 25')).toBeVisible();
  // Next month, then the year list: picking a year returns to the days.
  await dialog.getByRole('button', { name: 'Next month' }).click();
  await expect(dialog.getByRole('grid', { name: 'August 2025' })).toBeVisible();
  await dialog.getByRole('button', { name: /August 2025, select year/ }).click();
  await dialog.getByRole('button', { name: '2027' }).click();
  await expect(dialog.getByRole('grid', { name: 'August 2027' })).toBeVisible();
  await dialog.getByRole('button', { name: 'OK' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(out('date')).toHaveText('2025-7-25');

  // Escape discards; the input mode parses typed dates.
  await page.getByRole('button', { name: 'Pick date' }).click();
  await dialog.getByRole('button', { name: 'July 1, 2025' }).click();
  await page.keyboard.press('Escape');
  await expect(out('date')).toHaveText('2025-7-25');
  await page.getByRole('button', { name: 'Pick date' }).click();
  await dialog.getByRole('button', { name: 'Switch to text input' }).click();
  const field = dialog.getByRole('textbox', { name: 'Date' });
  await field.fill('12/24/2025');
  await dialog.getByRole('button', { name: 'OK' }).click();
  await expect(out('date')).toHaveText('2025-12-24');

  // Docked: the calendar button opens the panel under the field; a day + OK fills the field.
  await page.getByRole('button', { name: 'Open calendar' }).click();
  const panel = page.getByRole('dialog', { name: 'Choose date' });
  await expect(panel).toBeVisible();
  await panel.getByRole('button', { name: 'July 9, 2025' }).click();
  await panel.getByRole('button', { name: 'OK' }).click();
  await expect(out('docked')).toHaveText('2025-7-9');
  await expect(page.getByRole('textbox', { name: 'Date' })).toHaveValue('7/9/2025');

  // Range: start, then end; Save commits.
  await page.getByRole('button', { name: 'Pick range' }).click();
  const rp = page.getByRole('dialog');
  await rp.getByRole('button', { name: 'July 10, 2025' }).click();
  await rp.getByRole('button', { name: 'July 14, 2025' }).click();
  await expect(rp.getByRole('button', { name: 'July 12, 2025' })).toBeVisible();
  await rp.getByRole('button', { name: 'Save' }).click();
  await expect(out('range')).toHaveText('2025-7-10..2025-7-14');
});

test('time picker (live): dial tap picks the hour then minutes; keyboard mode; Escape discards', async ({ page }) => {
  await page.goto('/fixture/time-picker/live');
  await page.evaluate(() => document.fonts.ready);
  const out = page.locator('[data-time]');
  const open = page.getByRole('button', { name: 'Pick time' });

  await open.click();
  const dialog = page.getByRole('dialog', { name: 'Select time' });
  const dial = dialog.getByRole('slider', { name: 'Hour' });
  await expect(dial).toHaveAttribute('aria-valuenow', '7');
  // Tap 3 o'clock: the hour becomes 3 (PM kept), the dial moves on to minutes.
  const b = (await dial.boundingBox())!;
  await page.mouse.click(b.x + 128 + 101, b.y + 128);
  const minutes = dialog.getByRole('slider', { name: 'Minute' });
  await expect(minutes).toBeVisible();
  // Tap 6 o'clock: 30 minutes. Arrow keys step it.
  await page.mouse.click(b.x + 128, b.y + 128 + 101);
  await expect(minutes).toHaveAttribute('aria-valuenow', '30');
  await minutes.focus();
  await page.keyboard.press('ArrowUp');
  await expect(minutes).toHaveAttribute('aria-valuenow', '31');
  await dialog.getByRole('button', { name: 'OK' }).click();
  await expect(out).toHaveText('15:31');

  // Keyboard mode: type the hour (moves on to minutes), the minutes, pick AM.
  await open.click();
  await page.getByRole('button', { name: 'Switch to text input' }).click();
  const kb = page.getByRole('dialog', { name: 'Enter time' });
  await expect(kb.getByRole('textbox', { name: 'Hour' })).toBeFocused();
  await page.keyboard.type('09');
  await expect(kb.getByRole('textbox', { name: 'Minute' })).toBeFocused();
  await page.keyboard.type('45');
  await kb.getByRole('radio', { name: 'AM' }).click();
  await kb.getByRole('button', { name: 'OK' }).click();
  await expect(out).toHaveText('9:45');

  // Escape discards.
  await open.click();
  const d2 = page.getByRole('dialog', { name: 'Select time' });
  const b2 = (await d2.getByRole('slider', { name: 'Hour' }).boundingBox())!;
  await page.mouse.click(b2.x + 128, b2.y + 128 - 101);
  await page.keyboard.press('Escape');
  await expect(out).toHaveText('9:45');
});
