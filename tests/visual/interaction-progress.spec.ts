/**
 * Runtime interaction parity for progress, slider and text field: drive the REAL component with a
 * mouse / keyboard (no forced states) and compare against the Figma state variants. Complements
 * figma-parity.spec.ts, which renders states statically.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { compareImages } from './compare.ts';
import { captureRegion, hexToRgb } from './capture.ts';
import { REFS_DIR, type Manifest } from './manifest.ts';

/** Effects transitions (state layer, shadow) are 150 ms; allow generous settling. */
const SETTLE = 500;
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
