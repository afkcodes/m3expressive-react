/**
 * Runtime interaction parity for progress, slider and text field: drive the REAL component with a
 * mouse / keyboard (no forced states) and compare against the Figma state variants. Complements
 * figma-parity.spec.ts, which renders states statically.
 */
import { expect, test } from '@playwright/test';
import { captureRegion } from './capture.ts';
import { diffKit, expectKit, kitVariant } from './helpers/kit.ts';
import { enableMotion, fontsReady, openFixture } from './helpers/page.ts';
import { settle } from './helpers/settle.ts';

// ── Progress: value changes spring to the kit's geometry; waves travel unless reduced motion ─
test.describe('progress (live)', () => {
  // The suite defaults to reduced motion (playwright.config); these tests are about motion.
  test.beforeEach(async ({ page }) => enableMotion(page));

  for (const kind of ['linear', 'circular'] as const) {
    test(`${kind}: value change animates and lands on the kit frame`, async ({ page }) => {
      await page.goto(`/fixture/progress/live-${kind}`);
      const node = page.locator('[data-fixture-node]');
      const bar = node.getByRole('progressbar');
      const [from, to] = kind === 'linear' ? [50, 80] : [30, 80];
      await expect(bar).toHaveAttribute('aria-valuenow', String(from));
      const start = `${kind}-flat-4-${from}`;
      const target = `${kind}-flat-4-${to}`;
      // Frame-driven: under parallel load the first frame can still be settling — poll first.
      await expect
        .poll(async () => (await diffKit(node, 'progress', start)).result.diffPixels, { timeout: 8000 })
        .toBeLessThanOrEqual(kitVariant('progress', start).allowedDiffPixels ?? 0);
      await expectKit(node, 'progress', start);
      await page.getByRole('button', { name: `${to}%` }).click();
      await expect(bar).toHaveAttribute('aria-valuenow', String(to));
      // Mid-flight on purpose: ProgressAnimationSpec (no bounce, stiffness 50) takes ≈1.3 s.
      await page.waitForTimeout(250);
      expect
        .soft((await diffKit(node, 'progress', target)).result.diffPixels, 'mid-spring frame differs from the target')
        .toBeGreaterThan(0);
      // The spring is frame-driven: poll until it lands, then run the regular parity check.
      await expect
        .poll(async () => (await diffKit(node, 'progress', target)).result.diffPixels, { timeout: 8000 })
        .toBeLessThanOrEqual(kitVariant('progress', target).allowedDiffPixels ?? 0);
      await expectKit(node, 'progress', target);
    });
  }

  for (const kind of ['linear', 'circular'] as const) {
    test(`${kind} wave: travels; static (= kit) under reduced motion`, async ({ page }) => {
      const name = `${kind}-wave-4-50`;
      const rb = kitVariant('progress', name).renderBounds!;
      await page.goto(`/fixture/progress/live-wave-${kind}`);
      const node = page.locator('[data-fixture-node]');
      const a = await captureRegion(page, node, rb);
      // Two captures 300ms apart: the travel shows between them (or, reduced, doesn't).
      await page.waitForTimeout(300);
      const b = await captureRegion(page, node, rb);
      expect.soft(a.equals(b), 'wave moves').toBe(false);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.reload();
      await fontsReady(page);
      await settle(page);
      const c = await captureRegion(page, node, rb);
      await page.waitForTimeout(300);
      expect.soft(c.equals(await captureRegion(page, node, rb)), 'reduced motion: still').toBe(true);
      await expectKit(node, 'progress', name);
    });
  }

  test('indeterminate: no value, animates', async ({ page }) => {
    await page.goto('/fixture/progress/live-indeterminate');
    for (const label of ['Loading linear', 'Loading circular', 'Loading shape']) {
      const bar = page.getByRole('progressbar', { name: label });
      await expect(bar).toBeVisible();
      expect.soft(await bar.getAttribute('aria-valuenow'), `${label}: indeterminate`).toBeNull();
      const before = await bar.screenshot();
      // Two screenshots 200ms apart: an indeterminate indicator never stands still.
      await page.waitForTimeout(200);
      expect.soft(before.equals(await bar.screenshot()), `${label}: animates`).toBe(false);
    }
  });
});

// ── Slider: real pointer / keyboard against the kit's Medium 50% frames ──────────────────────
test('slider (live): rest, hover, press, drag, keyboard', async ({ page }) => {
  const node = await openFixture(page, '/fixture/slider/live');
  const volume = page.getByRole('slider', { name: 'Volume' });
  const values = page.locator('[data-values]');
  await expectKit(node, 'slider', 'std-h-m-enabled-50');
  const box = (await node.boundingBox())!;
  const handleX = box.x + 177;
  await page.mouse.move(handleX, box.y + 26);
  await settle(page);
  await expectKit(node, 'slider', 'std-h-m-hovered-50');
  await page.mouse.down();
  await settle(page);
  await expectKit(node, 'slider', 'std-h-m-pressed-50');
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
  const node = await openFixture(page, '/fixture/text-field/live');
  await expectKit(node, 'text-field', 'filled-enabled-label-xx');
  const box = (await node.boundingBox())!;
  await page.mouse.move(box.x + 120, box.y + 28);
  await settle(page);
  await expectKit(node, 'text-field', 'filled-hovered-label-xx');
  const input = page.getByRole('textbox', { name: 'Label' });
  await page.mouse.click(box.x + 120, box.y + 28);
  await expect(input).toBeFocused();
  await page.keyboard.type('Input');
  await expect(page.locator('[data-value]')).toHaveText('Input');
  await page.mouse.move(0, 0);
  await input.blur();
  await settle(page);
  await expectKit(node, 'text-field', 'filled-enabled-input-xx');
  // Supporting text is the field's accessible description.
  await expect(input).toHaveAccessibleDescription('Supporting text');
});
