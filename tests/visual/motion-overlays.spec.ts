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

/** The `translate` of an element as [x, y] px. */
const translateOf = (el: Locator) =>
  el.evaluate((e) => {
    const t = getComputedStyle(e).translate;
    if (!t || t === 'none') return [0, 0];
    const [x = '0', y = '0'] = t.split(' ');
    return [parseFloat(x), parseFloat(y)];
  });

/** Pointer moves of `step` px every frame (a slow, steady drag: ~step × 60 px/s). */
async function slowDrag(page: Page, x: number, y: number, dx: number, dy: number, step = 1) {
  const n = Math.max(Math.abs(dx), Math.abs(dy)) / step;
  for (let i = 1; i <= n; i++) {
    await page.mouse.move(x + (dx * i) / n, y + (dy * i) / n);
    await page.waitForTimeout(16);
  }
}

test.describe('modal bottom sheet', () => {
  async function openSheet(page: Page) {
    await openFixture(page, '/fixture/sheets/live');
    await page.getByRole('button', { name: 'Open bottom sheet' }).click();
    const sheet = page.getByRole('dialog', { name: 'Share' });
    await expect(sheet).toBeVisible();
    await expect.poll(async () => (await translateOf(sheet))[1]).toBe(0);
    const handle = page.getByRole('button', { name: 'Close sheet' });
    const hb = (await handle.boundingBox())!;
    return { sheet, x: hb.x + hb.width / 2, y: hb.y + 2, height: (await sheet.boundingBox())!.height };
  }

  test('shows on the default spatial spring: the overshoot lifts it and the surface continues below', async ({ page }) => {
    await openFixture(page, '/fixture/sheets/live');
    await page.getByRole('button', { name: 'Open bottom sheet' }).click();
    const sheet = page.getByRole('dialog', { name: 'Share' });
    const ys = await sheet.evaluate(
      (el) =>
        new Promise<number[]>((resolve) => {
          const out: number[] = [];
          const t0 = performance.now();
          const tick = () => {
            out.push(el.getBoundingClientRect().top - (el as HTMLElement).offsetTop);
            if (performance.now() - t0 < 700) requestAnimationFrame(tick);
            else resolve(out);
          };
          tick();
        }),
    );
    expect(Math.min(...ys)).toBeLessThan(-1);
    const after = await sheet.evaluate((el) => {
      const cs = getComputedStyle(el, '::after');
      return { content: cs.content, top: cs.top, height: cs.height, bg: cs.backgroundColor, h: (el as HTMLElement).offsetHeight };
    });
    expect(after.content).toBe('""');
    expect(after.top).toBe(`${after.h}px`);
    expect(after.bg).toBe('rgb(247, 242, 250)'); // Surface Container Low, like the sheet
  });

  test('release target follows AnchoredDraggable.computeTarget (56dp / 125dp/s)', async ({ page }) => {
    // Slow downward drag released past 56px: hides (a slow fling past the positional threshold).
    let { sheet, x, y } = await openSheet(page);
    await page.mouse.move(x, y);
    await page.mouse.down();
    await slowDrag(page, x, y, 0, 70);
    await page.mouse.up();
    await expect(sheet).toHaveCount(0);

    // Slow downward drag released under 56px: back to Expanded.
    ({ sheet, x, y } = await openSheet(page));
    await page.mouse.move(x, y);
    await page.mouse.down();
    await slowDrag(page, x, y, 0, 50);
    await page.mouse.up();
    await expect.poll(async () => (await translateOf(sheet))[1]).toBe(0);

    // Resting before release (no velocity): the closest anchor, so 80px of a 204px sheet stays.
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y + 90, { steps: 10 });
    await page.waitForTimeout(120);
    await page.mouse.up();
    await expect.poll(async () => (await translateOf(sheet))[1]).toBe(0);
    await expect(sheet).toBeVisible();

    // Slow upward move near Hidden (within 56px of it): hides; further up: stays.
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y + 166, { steps: 10 });
    await page.waitForTimeout(60);
    await slowDrag(page, x, y + 166, 0, -12, 2);
    await page.mouse.up();
    await expect(sheet).toHaveCount(0);
  });

  test('no rubber band above Expanded; the scrim follows the closest anchor while dragging', async ({ page }) => {
    const { sheet, x, y, height } = await openSheet(page);
    const scrim = page.locator('[data-m3-portal] [role="presentation"][data-open]');
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y - 60, { steps: 6 });
    expect((await translateOf(sheet))[1]).toBe(0);
    await page.mouse.move(x, y + height * 0.6, { steps: 10 });
    await expect.poll(() => scrim.evaluate((e) => getComputedStyle(e).opacity)).toBe('0');
    await page.mouse.move(x, y + height * 0.3, { steps: 6 });
    await expect.poll(() => scrim.evaluate((e) => getComputedStyle(e).opacity)).toBe('1');
    await page.waitForTimeout(120);
    await page.mouse.up();
    await expect.poll(async () => (await translateOf(sheet))[1]).toBe(0);
  });

  test('drags from the content too; a tap on an item still activates it', async ({ page }) => {
    const { sheet } = await openSheet(page);
    const item = sheet.getByText('Email');
    const b = (await item.boundingBox())!;
    await page.mouse.move(b.x + 20, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + 20, b.y + b.height / 2 + 40, { steps: 6 });
    expect((await translateOf(sheet))[1]).toBeGreaterThan(30);
    await page.waitForTimeout(120);
    await page.mouse.up();
    await expect.poll(async () => (await translateOf(sheet))[1]).toBe(0);
    await expect(sheet).toBeVisible(); // the drag didn't click the item
    await item.click();
    await expect(sheet).toHaveCount(0);
  });

  test('settles from the release velocity with the default spatial spring', async ({ page }) => {
    const { sheet, x, y } = await openSheet(page);
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y + 40, { steps: 4 });
    // A quick flick back up: Expanded, overshooting above it on the way (velocity carried).
    await page.mouse.move(x, y + 10, { steps: 2 });
    const ys = sheet.evaluate(
      (el) =>
        new Promise<number[]>((resolve) => {
          const out: number[] = [];
          const t0 = performance.now();
          const tick = () => {
            out.push(el.getBoundingClientRect().top - (el as HTMLElement).offsetTop);
            if (performance.now() - t0 < 500) requestAnimationFrame(tick);
            else resolve(out);
          };
          tick();
        }),
    );
    await page.mouse.up();
    const samples = await ys;
    expect(Math.min(...samples)).toBeLessThan(-0.5);
    await expect.poll(async () => (await translateOf(sheet))[1]).toBe(0);
  });
});

test.describe('modal bottom sheet (touch)', () => {
  test.use({ hasTouch: true });
  test('a touch drag on the content moves the sheet while the content is at its top', async ({ page }) => {
    await openFixture(page, '/fixture/sheets/live');
    await page.getByRole('button', { name: 'Open bottom sheet' }).click();
    const sheet = page.getByRole('dialog', { name: 'Share' });
    await expect.poll(async () => (await translateOf(sheet))[1]).toBe(0);
    const b = (await sheet.getByText('Email').boundingBox())!;
    const cdp = await page.context().newCDPSession(page);
    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', y: number) =>
      cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: b.x + 20, y }] });
    await touch('touchStart', b.y + 10);
    for (let i = 1; i <= 12; i++) {
      await touch('touchMove', b.y + 10 + i * 10);
      await page.waitForTimeout(16);
    }
    expect((await translateOf(sheet))[1]).toBeGreaterThan(80);
    await page.waitForTimeout(120);
    await touch('touchEnd', 0);
    // Released at rest past the half way point of the 204px sheet: Hidden.
    await expect(sheet).toHaveCount(0);
  });
});

test.describe('modal side sheet', () => {
  test('enters from the end edge by the window width over 275ms on the emphasized path; RTL enters from the left', async ({ page }) => {
    await openFixture(page, '/fixture/sheets/live');
    await page.getByRole('button', { name: 'Open side sheet' }).click();
    const side = page.getByRole('dialog', { name: 'Filters' });
    const style = await side.evaluate((el) => ({ d: getComputedStyle(el).transitionDuration, e: getComputedStyle(el).transitionTimingFunction }));
    expect(style.d).toBe('0.275s');
    expect(style.e).toMatch(/^linear\(0( 0%)?, 0\.0005 0\.83%.*0\.9994 92\.97%, 1( 100%)?\)$/);
    const vw = await page.evaluate(() => innerWidth);
    const first = (await translateOf(side))[0];
    expect(first).toBeGreaterThan(vw * 0.5);
    await expect.poll(async () => (await translateOf(side))[0]).toBe(0);
    expect((await side.boundingBox())!.x + (await side.boundingBox())!.width).toBe(vw - 16);
    await page.keyboard.press('Escape');
    await expect(side).toHaveCount(0);

    await page.evaluate(() => (document.documentElement.dir = 'rtl'));
    await page.getByRole('button', { name: 'Open side sheet' }).click();
    const rtlFirst = (await translateOf(side))[0];
    expect(rtlFirst).toBeLessThan(-vw * 0.5);
    await expect.poll(async () => (await translateOf(side))[0]).toBe(0);
    expect((await side.boundingBox())!.x).toBe(16);
  });

  test('drags to dismiss (SideSheetBehavior: half way or a 500px/s swipe), otherwise settles back', async ({ page }) => {
    await openFixture(page, '/fixture/sheets/live');
    const open = async () => {
      await page.getByRole('button', { name: 'Open side sheet' }).click();
      const side = page.getByRole('dialog', { name: 'Filters' });
      await expect.poll(async () => (await translateOf(side))[0]).toBe(0);
      const b = (await side.boundingBox())!;
      return { side, x: b.x + b.width / 2, y: b.y + 300 };
    };
    // 120px then rest: under half of 336 → back.
    let { side, x, y } = await open();
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 120, y, { steps: 10 });
    expect((await translateOf(side))[0]).toBeGreaterThan(100);
    await page.waitForTimeout(120);
    await page.mouse.up();
    await expect.poll(async () => (await translateOf(side))[0]).toBe(0);
    // Can't drag outwards past Expanded.
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x - 80, y, { steps: 8 });
    expect((await translateOf(side))[0]).toBe(0);
    await page.mouse.up();
    // 200px then rest: past half way → hides.
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 200, y, { steps: 10 });
    await page.waitForTimeout(120);
    await page.mouse.up();
    await expect(side).toHaveCount(0);
    // A quick 60px swipe: hides.
    ({ side, x, y } = await open());
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 60, y, { steps: 3 });
    await page.mouse.up();
    await expect(side).toHaveCount(0);
  });
});

/** Sample `read` every frame for `ms` in the page. */
function sampleFrames<T>(page: Page, ms: number, read: string): Promise<{ t: number; v: T }[]> {
  return page.evaluate(
    ([ms, read]) =>
      new Promise<{ t: number; v: T }[]>((resolve) => {
        const fn = new Function(`return (${read})`) as () => T;
        const out: { t: number; v: T }[] = [];
        const t0 = performance.now();
        const tick = () => {
          out.push({ t: performance.now() - t0, v: fn() });
          if (performance.now() - t0 < ms) requestAnimationFrame(tick);
          else resolve(out);
        };
        tick();
      }),
    [ms, read] as const,
  );
}

test.describe('search', () => {
  test('full screen: the input grows from the collapsed bar, the surface fades in with progress, results after 50ms', async ({ page }) => {
    await openFixture(page, '/fixture/search/live-full');
    const node = page.locator('[data-fixture-node]');
    const collapsed = (await node.getByRole('button', { name: 'Hinted search text' }).locator('xpath=ancestor::div[1]').boundingBox())!;
    const read = `(() => {
      const view = document.querySelector('[data-fixture-node] [role="search"]');
      if (!view) return null;
      const r = view.getBoundingClientRect();
      const root = view.parentElement.parentElement;
      const results = root.lastElementChild;
      return { x: r.x, w: r.width, alpha: root.style.getPropertyValue('--m3-search-surface-alpha'), results: getComputedStyle(results).opacity };
    })()`;
    const sampling = sampleFrames<{ x: number; w: number; alpha: string; results: string } | null>(page, 700, read);
    await node.getByRole('button', { name: 'Hinted search text' }).click();
    const frames = (await sampling).filter((f) => f.v);
    const first = frames[0]!.v!;
    expect(first.w).toBeGreaterThan(collapsed.width - 3);
    expect(first.w).toBeLessThan(collapsed.width + 3);
    expect(Math.abs(first.x - collapsed.x)).toBeLessThan(2);
    expect(Number(first.alpha)).toBeLessThan(0.3);
    // contentProgress waits 50ms, then 100ms on standard accelerate.
    const t0 = frames[0]!.t;
    for (const f of frames.filter((f) => f.t - t0 < 40)) expect(Number(f.v!.results)).toBeLessThan(0.01);
    expect(Number(frames.at(-1)!.v!.results)).toBe(1);
    // At rest: 12px inset in the 412px view, inline motion styles cleared.
    const box = (await node.locator('[role="search"]').boundingBox())!;
    const nodeBox = (await node.boundingBox())!;
    expect([box.x - nodeBox.x, box.width]).toEqual([12, 388]);
    expect(await node.locator('[role="search"]').evaluate((e) => (e as HTMLElement).style.transform)).toBe('');

    // Collapse: results fade out first, the view stays mounted through the motion, then unmounts.
    await node.getByRole('button', { name: 'Back' }).click();
    await expect(node.locator('[role="search"]')).toHaveCount(1);
    await expect(node.locator('[role="search"]')).toHaveCount(0);
  });

  test('docked: the panel appears past 10% progress, its list sliding down from −height/2', async ({ page }) => {
    await openFixture(page, '/fixture/search/live');
    const node = page.locator('[data-fixture-node]');
    const read = `(() => {
      const view = document.querySelector('[data-fixture-node] [role="search"]');
      if (!view) return null;
      const results = view.parentElement.parentElement.lastElementChild;
      const list = results.firstElementChild;
      return { visible: getComputedStyle(results).visibility, ty: new DOMMatrix(getComputedStyle(list).transform).m42, h: results.offsetHeight };
    })()`;
    const sampling = sampleFrames<{ visible: string; ty: number; h: number } | null>(page, 700, read);
    await node.getByRole('button', { name: 'Hinted search text' }).click();
    const frames = (await sampling).filter((f) => f.v);
    expect(frames[0]!.v!.visible).toBe('hidden');
    const shown = frames.find((f) => f.v!.visible === 'visible')!;
    expect(shown.v!.ty).toBeLessThan(-shown.v!.h / 4);
    expect(frames.at(-1)!.v!.ty).toBe(0);
    // Escape collapses: still mounted for the motion, then gone with focus back on the bar.
    await page.keyboard.press('Escape');
    await expect(node.locator('[role="search"]')).toHaveCount(0);
    await expect(node.getByRole('button', { name: 'Hinted search text' })).toBeFocused();
  });
});
