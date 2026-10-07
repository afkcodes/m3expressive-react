/**
 * Live motion of the overlay components (search, toolbar, sheets, dialogs, carousel, date and
 * time pickers) against the Compose / Material Components sources they port. Motion is on
 * (the config emulates reduced motion for the static suites).
 */
import { expect, test, type Locator, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
});

async function openFixture(page: Page, path: string) {
  await page.goto(path);
  await page.evaluate(() => document.fonts.ready);
}

/** Wait for a dialog's enter animation (scale 0.8 → 1) so boxes are final. */
const settled = (popup: Locator) => expect.poll(() => popup.evaluate((el) => getComputedStyle(el).scale)).toBe('1');

/** Degrees clockwise from 12 o'clock of the dial hand (the line from the centre). */
const handAngle = (dial: Locator) =>
  dial.evaluate((el) => {
    const line = el.querySelector('line')!;
    const dx = Number(line.getAttribute('x2')) - 128;
    const dy = Number(line.getAttribute('y2')) - 128;
    return ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
  });

test.describe('time picker', () => {
  test('a drag moves the hand with the pointer and springs to the value on release; taps pick 5-minute steps', async ({ page }) => {
    await openFixture(page, '/fixture/time-picker/live');
    await page.getByRole('button', { name: 'Pick time' }).click();
    const dialog = page.getByRole('dialog', { name: 'Select time' });
    await settled(dialog);
    await dialog.getByRole('button', { name: /^Minute/ }).click();
    const dial = dialog.getByRole('slider', { name: 'Minute' });
    await expect.poll(() => handAngle(dial)).toBeCloseTo(0, 1);
    const b = (await dial.boundingBox())!;
    const at = (deg: number, r = 90) => [b.x + 128 + r * Math.sin((deg * Math.PI) / 180), b.y + 128 - r * Math.cos((deg * Math.PI) / 180)] as const;

    // Drag: no spring between the pointer and the hand (Compose rotateTo → anim.snapTo).
    await page.mouse.move(...at(10));
    await page.mouse.down();
    for (const deg of [20, 30, 40, 50]) {
      await page.mouse.move(...at(deg), { steps: 2 });
      await page.waitForTimeout(32);
      expect(await handAngle(dial)).toBeCloseTo(deg, 0);
    }
    await expect(dial).toHaveAttribute('aria-valuenow', '8');
    // Release: the hand springs from the pointer angle (50°) to 8 minutes (48°).
    await page.mouse.up();
    await expect.poll(() => handAngle(dial), { timeout: 2000 }).toBeCloseTo(48, 1);

    // A tap rounds to 5 minutes (Compose onTap): 50° → 10 minutes, and the hand springs there.
    await page.mouse.click(...at(50));
    await expect(dial).toHaveAttribute('aria-valuenow', '10');
    // At rest the hand ends on the kit's 10-minute cell (60.4°: the kit places cells by hand).
    await expect.poll(() => handAngle(dial), { timeout: 2000 }).toBeCloseTo(60.4, 0);
  });

  test('an hour tap moves on to minutes after 100ms, a drag at once; numbers cross-fade', async ({ page }) => {
    await openFixture(page, '/fixture/time-picker/live');
    await page.getByRole('button', { name: 'Pick time' }).click();
    const dialog = page.getByRole('dialog', { name: 'Select time' });
    await settled(dialog);
    const dial = dialog.locator('[role="slider"]');
    const b = (await dial.boundingBox())!;
    // Time from pointer up to the switch to minutes.
    const arm = () =>
      dial.evaluate((el) => {
        const w = window as unknown as { __t: { up?: number; sw?: number } };
        w.__t = {};
        const mo = new MutationObserver(() => {
          if (el.getAttribute('aria-label') === 'Minute' && w.__t.sw == null) {
            w.__t.sw = performance.now();
            mo.disconnect();
          }
        });
        mo.observe(el, { attributes: true });
        el.addEventListener('pointerup', () => (w.__t.up = performance.now()), { once: true, capture: true });
      });
    const switchDelay = async () => {
      await expect.poll(() => page.evaluate(() => (window as unknown as { __t: { sw?: number } }).__t.sw ?? null)).not.toBeNull();
      const t = await page.evaluate(() => (window as unknown as { __t: { up: number; sw: number } }).__t);
      return t.sw - t.up;
    };
    // Tap 3 o'clock.
    await arm();
    await page.mouse.click(b.x + 128 + 90, b.y + 128);
    const tapDelay = await switchDelay();
    expect(tapDelay).toBeGreaterThanOrEqual(95);
    expect(tapDelay).toBeLessThan(250);

    // Back to hours; a drag ending on 6 o'clock switches as soon as the pointer is released.
    await dialog.getByRole('button', { name: /^Hour/ }).click();
    await expect(dial).toHaveAttribute('aria-label', 'Hour');
    await arm();
    await page.mouse.move(b.x + 128 + 90, b.y + 128);
    await page.mouse.down();
    await page.mouse.move(b.x + 128 + 60, b.y + 128 + 60, { steps: 4 });
    await page.mouse.move(b.x + 128, b.y + 128 + 90, { steps: 4 });
    await page.mouse.up();
    expect(await switchDelay()).toBeLessThan(50);

    // Hour and minute numbers are both mounted and cross-fade on default effects (231ms).
    const rings = () =>
      dial.evaluate((el) =>
        [...el.children]
          .filter((c) => c.tagName === 'SPAN' && c.children.length > 0)
          .map((c) => ({ opacity: getComputedStyle(c).opacity, duration: getComputedStyle(c).transitionDuration })),
      );
    expect(await rings()).toHaveLength(2);
    await expect.poll(async () => (await rings()).map((r) => r.opacity)).toEqual(['0', '1']);
    expect((await rings())[0]!.duration).toBe('0.231s');
    // The selector boxes don't animate their colours (Compose: no animation).
    expect(await dialog.getByRole('button', { name: /^Hour/ }).evaluate((e) => getComputedStyle(e).transitionDuration)).toBe('0s');
  });
});

test.describe('dialog', () => {
  test('MDC fade-scale: 400ms emphasized decelerate in (scale 0.8 → 1), 150ms emphasized accelerate out', async ({ page }) => {
    await openFixture(page, '/fixture/dialogs/live');
    await page.getByRole('button', { name: 'Open dialog' }).click();
    const popup = page.getByRole('dialog', { name: 'Basic dialog title' });
    await expect(popup).toBeVisible();
    const style = () =>
      popup.evaluate((el) => {
        const cs = getComputedStyle(el);
        return { scale: cs.scale, opacity: Number(cs.opacity), easing: cs.transitionTimingFunction, duration: cs.transitionDuration };
      });
    const mid = await style();
    expect(mid.easing).toBe('cubic-bezier(0.1, 0.7, 0.1, 1)');
    expect(mid.duration).toBe('0.4s');
    const s = Number(mid.scale);
    expect(s).toBeGreaterThanOrEqual(0.8);
    expect(s).toBeLessThan(1);
    await expect.poll(async () => (await style()).scale).toBe('1');
    // Exit: opacity only, short3 / emphasized accelerate.
    await page.keyboard.press('Escape');
    const exit = await style();
    expect(exit.easing).toBe('cubic-bezier(0.3, 0, 0.8, 0.2)');
    expect(exit.duration).toBe('0.15s');
    expect(exit.scale).toBe('1');
    await expect(popup).toHaveCount(0);
  });

  test('reduced motion drops the scale and keeps the fade', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openFixture(page, '/fixture/dialogs/live');
    await page.getByRole('button', { name: 'Open dialog' }).click();
    const popup = page.getByRole('dialog', { name: 'Basic dialog title' });
    const first = await popup.evaluate((el) => ({ scale: getComputedStyle(el).scale, opacity: Number(getComputedStyle(el).opacity) }));
    expect(first.scale).toBe('1');
    expect(first.opacity).toBeLessThan(1);
    await expect.poll(() => popup.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
  });
});
