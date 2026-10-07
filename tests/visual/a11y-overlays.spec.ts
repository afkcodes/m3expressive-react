/**
 * Live accessibility and robustness checks for the overlay components (sheets, carousel, toolbar,
 * app bars, search): pointer input that belongs to a sheet's content, unmounting mid-gesture,
 * keyboard roving in toolbars (text fields, RTL), focus management of the search view, RTL and
 * reordering in the carousel.
 */
import { expect, test, type Page } from '@playwright/test';
import { enableMotion, load } from './helpers/page.ts';
import { centre, pointerDrag, touchDrag, type Point } from './helpers/pointer.ts';
import { countFrames } from './helpers/settle.ts';
import { translateOf } from './helpers/styles.ts';

/** Press at `from`, move by (dx, dy) in steps, read `read`, rest 120ms (no fling) and release. */
async function dragAndRead<T>(page: Page, from: Point, dx: number, dy: number, read: () => Promise<T>) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + dx, from.y + dy, { steps: 10 });
  const value = await read();
  await page.waitForTimeout(120); // rest before the release: no fling
  await page.mouse.up();
  return value;
}

/** Window `pointermove` listeners (one per gesture being tracked: the sheets' and carousel's drags), counted. */
async function instrument(page: Page) {
  await page.addInitScript(() => {
    const live = new Set<unknown>();
    const add = window.addEventListener.bind(window);
    const remove = window.removeEventListener.bind(window);
    window.addEventListener = ((type: string, fn: EventListenerOrEventListenerObject, opts?: unknown) => {
      if (type === 'pointermove') live.add(fn);
      add(type, fn, opts as AddEventListenerOptions);
    }) as typeof window.addEventListener;
    window.removeEventListener = ((type: string, fn: EventListenerOrEventListenerObject, opts?: unknown) => {
      if (type === 'pointermove') live.delete(fn);
      remove(type, fn, opts as EventListenerOptions);
    }) as typeof window.removeEventListener;
    (window as unknown as { __pointerListeners: () => number }).__pointerListeners = () => live.size;
  });
}
const pointerListeners = (page: Page) =>
  page.evaluate(() => (window as unknown as { __pointerListeners: () => number }).__pointerListeners());
const unmountFixture = (page: Page) => page.evaluate(() => window.dispatchEvent(new Event('m3-fixture-unmount')));

test.describe('sheets: content with its own pointer handling', () => {
  test('side sheet: slider, text field, carousel and data-m3-no-drag keep their drags; plain content still drags', async ({
    page,
  }) => {
    await load(page, '/fixture/sheets/live-guards');
    await page.getByRole('button', { name: 'Open side sheet' }).click();
    const side = page.getByRole('dialog', { name: 'Filters' });
    await expect.poll(async () => (await translateOf(side))[0]).toBe(0);
    const x = async () => (await translateOf(side))[0];

    // Slider: the thumb moves, the sheet doesn't (Base UI captures the pointer on its control).
    const slider = side.getByRole('slider', { name: 'Amount' });
    expect(await dragAndRead(page, await centre(slider), 60, 0, x)).toBe(0);
    expect(Number(await slider.getAttribute('aria-valuenow'))).toBeGreaterThan(40);

    // Text field: a drag selects text.
    const note = side.getByRole('textbox', { name: 'Note' });
    const nb = (await note.boundingBox())!;
    expect(await dragAndRead(page, { x: nb.x + 6, y: nb.y + nb.height / 2 }, 90, 0, x)).toBe(0);
    expect(await note.evaluate((el: HTMLInputElement) => el.selectionEnd! - el.selectionStart!)).toBeGreaterThan(0);

    // Carousel: scrolls itself (its viewport carries data-m3-no-drag).
    const carousel = side.getByRole('region', { name: 'Photos' });
    const during = await dragAndRead(page, await centre(carousel), -100, 0, async () => ({
      sheet: await x(),
      scroll: await carousel.evaluate((el) => el.scrollLeft),
    }));
    expect(during.sheet).toBe(0);
    expect(during.scroll).toBeGreaterThan(50);

    // The escape hatch.
    expect(await dragAndRead(page, await centre(side.getByTestId('pad')), 100, 0, x)).toBe(0);

    // Plain content still drags the sheet (and settles back from a short drag at rest).
    const row = side.getByText('Copy link');
    const moved = await dragAndRead(page, await centre(row), 120, 0, async () => {
      await page.waitForTimeout(120); // held still mid-drag, then read
      return x();
    });
    expect(moved).toBeGreaterThan(100);
    await expect.poll(x).toBe(0);
  });

  test('bottom sheet: the same with a mouse; a 48×36 target around the handle', async ({ page }) => {
    await load(page, '/fixture/sheets/live-guards');
    await page.getByRole('button', { name: 'Open bottom sheet' }).click();
    const sheet = page.getByRole('dialog', { name: 'Controls' });
    await expect.poll(async () => (await translateOf(sheet))[1]).toBe(0);
    const y = async () => (await translateOf(sheet))[1];

    const slider = sheet.getByRole('slider', { name: 'Amount' });
    expect(await dragAndRead(page, await centre(slider), 60, 30, y)).toBe(0);
    expect(Number(await slider.getAttribute('aria-valuenow'))).toBeGreaterThan(40);
    const note = sheet.getByRole('textbox', { name: 'Note' });
    const nb = (await note.boundingBox())!;
    expect(await dragAndRead(page, { x: nb.x + 6, y: nb.y + nb.height / 2 }, 90, 30, y)).toBe(0);
    expect(await note.evaluate((el: HTMLInputElement) => el.selectionEnd! - el.selectionStart!)).toBeGreaterThan(0);
    expect(await dragAndRead(page, await centre(sheet.getByTestId('pad')), 0, 60, y)).toBe(0);
    expect(await dragAndRead(page, await centre(sheet.getByText('Email')), 0, 60, y)).toBeGreaterThan(40);
    await expect.poll(y).toBe(0);

    // The drawn handle stays 32×4; its hit target is a 48×36 area centred on it (Compose's 48dp
    // minimum interactive size, the kit's 36px header) — not the whole header width.
    const handle = sheet.getByRole('button', { name: 'Close sheet' });
    const hb = (await handle.boundingBox())!;
    expect([hb.width, hb.height]).toEqual([32, 4]);
    const labelAt = (p: { x: number; y: number }) =>
      page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.getAttribute('aria-label') ?? null, p);
    expect(await labelAt({ x: hb.x - 100, y: hb.y + 2 }), '100px beside the handle').not.toBe('Close sheet');
    const hit = { x: hb.x - 6, y: hb.y - 12 }; // inside the 48×36 target, outside the drawn handle
    expect(await labelAt(hit)).toBe('Close sheet');
    await page.mouse.click(hit.x, hit.y);
    await expect(sheet).toHaveCount(0);
  });

  test.describe('touch', () => {
    test.use({ hasTouch: true });

    test('bottom sheet: touch on a slider or data-m3-no-drag stays with them; the latest onOpenChange is called', async ({
      page,
    }) => {
      await load(page, '/fixture/sheets/live-guards');
      await page.getByRole('button', { name: 'Open bottom sheet' }).click();
      const sheet = page.getByRole('dialog', { name: 'Controls' });
      await expect.poll(async () => (await translateOf(sheet))[1]).toBe(0);
      for (const part of [sheet.getByRole('slider', { name: 'Amount' }), sheet.getByTestId('pad')]) {
        const release = await touchDrag(page, await centre(part), 0, 100);
        expect((await translateOf(sheet))[1]).toBe(0);
        await release();
      }
      // A new handler after a re-render (version 1) is the one a touch dismissal calls.
      await sheet.getByRole('button', { name: 'Bump version' }).click();
      const release = await touchDrag(page, await centre(sheet.getByText('Copy link')), 0, 320, 16);
      expect((await translateOf(sheet))[1]).toBeGreaterThan(280);
      await page.waitForTimeout(120); // rest before the release: no fling
      await release(); // at rest past half way: Hidden
      await expect(sheet).toHaveCount(0);
      await expect(page.locator('[data-log]')).toHaveText('bottom:false:v1');
    });

    test('bottom sheet open on mount (portal mounted later): touch on the content drags it', async ({ page }) => {
      await load(page, '/fixture/sheets/live-initial-open');
      const sheet = page.getByRole('dialog', { name: 'Controls' });
      await expect.poll(async () => (await translateOf(sheet))[1]).toBe(0);
      const release = await touchDrag(page, await centre(sheet.getByText('Email')), 0, 100);
      expect((await translateOf(sheet))[1]).toBeGreaterThan(60);
      await release();
    });
  });
});

test.describe('sheets / carousel: unmounting mid-gesture', () => {
  test.beforeEach(async ({ page }) => {
    await instrument(page);
  });

  test('side sheet closed under a held pointer: no error, no listeners left', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await load(page, '/fixture/sheets/live-guards');
    await page.getByRole('button', { name: 'Open side sheet' }).click();
    const side = page.getByRole('dialog', { name: 'Filters' });
    await expect.poll(async () => (await translateOf(side))[0]).toBe(0);
    const at = await centre(side.getByText('Copy link'));
    await page.mouse.move(at.x, at.y);
    await page.mouse.down();
    expect(await pointerListeners(page)).toBe(1);
    await page.keyboard.press('Escape');
    await expect(side).toHaveCount(0);
    expect(await pointerListeners(page)).toBe(0);
    await page.mouse.move(at.x + 120, at.y, { steps: 6 });
    await page.mouse.up();
    expect(errors).toEqual([]);
  });

  test('sheets unmounted mid-drag and mid-settle: listeners removed, no late onOpenChange', async ({ page }) => {
    await enableMotion(page);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await load(page, '/fixture/sheets/live-guards');
    await page.getByRole('button', { name: 'Open bottom sheet' }).click();
    const sheet = page.getByRole('dialog', { name: 'Controls' });
    await expect.poll(async () => (await translateOf(sheet))[1], { timeout: 3000 }).toBe(0);
    // A fast flick down settles towards Hidden (dismissing when the spring ends); unmount first,
    // about 30ms into the settle.
    await pointerDrag(
      page,
      await centre(sheet.getByText('Email')),
      [1, 2, 3, 4].map((i) => [0, i * 10, 8] as const),
      { pointerId: 9 },
    );
    await page.evaluate(() => {
      setTimeout(() => window.dispatchEvent(new Event('m3-fixture-unmount')), 30);
    });
    await expect(sheet).toHaveCount(0);
    // An observation window (fixed on purpose): a spring left running would call onOpenChange in it.
    await page.waitForTimeout(800);
    await expect(page.locator('[data-log]')).toHaveText('');

    // Mid-drag (pointer still down): the window listeners go with the sheet.
    await page.reload();
    await page.getByRole('button', { name: 'Open side sheet' }).click();
    const side = page.getByRole('dialog', { name: 'Filters' });
    await expect.poll(async () => (await translateOf(side))[0], { timeout: 3000 }).toBe(0);
    const row = await centre(side.getByText('Copy link'));
    await page.mouse.move(row.x, row.y);
    await page.mouse.down();
    await page.mouse.move(row.x + 60, row.y, { steps: 6 });
    expect(await pointerListeners(page)).toBe(1);
    await unmountFixture(page);
    await expect(side).toHaveCount(0);
    expect(await pointerListeners(page)).toBe(0);
    await page.mouse.move(row.x + 120, row.y, { steps: 4 });
    await page.mouse.up();
    expect(errors).toEqual([]);
  });

  test('carousel unmounted mid-fling and mid-drag: the fling stops, listeners are removed', async ({ page }) => {
    await enableMotion(page);
    await load(page, '/fixture/carousel/live-uncontained');
    const carousel = page.getByRole('region', { name: 'Photos' });
    const b = (await carousel.boundingBox())!;
    const [x, y] = [b.x + 300, b.y + b.height / 2];
    await pointerDrag(
      page,
      { x, y },
      [1, 2, 3, 4, 5, 6].map((i) => [-i * 25, 0, 8] as const),
      { pointerId: 9 },
    );
    // The fling is running …
    await expect.poll(() => carousel.evaluate((el) => el.scrollLeft)).toBeGreaterThan(150);
    await unmountFixture(page);
    await expect(carousel).toHaveCount(0);
    // … and stops with the carousel: no more frames are requested (fixed windows on purpose: the
    // unmount lands, then frames are counted over 300ms).
    await page.waitForTimeout(50);
    const frames = await countFrames(page);
    await page.waitForTimeout(300);
    expect(await frames()).toBe(0);

    await page.reload();
    const again = page.getByRole('region', { name: 'Photos' });
    await expect(again).toBeVisible();
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x - 60, y, { steps: 6 });
    expect(await pointerListeners(page)).toBe(1);
    await unmountFixture(page);
    await expect(again).toHaveCount(0);
    expect(await pointerListeners(page)).toBe(0);
    await page.mouse.up();
  });
});

test.describe('toolbar keyboard', () => {
  test('a text field keeps the arrows while its caret can move; RTL mirrors the arrows', async ({ page }) => {
    await load(page, '/fixture/toolbar/live-input');
    const bar = page.getByRole('toolbar', { name: 'Find tools' });
    const share = bar.getByRole('button', { name: 'Share' });
    const find = bar.getByRole('textbox', { name: 'Find' });
    const comment = bar.getByRole('button', { name: 'Comment' });
    const caret = () => find.evaluate((el: HTMLInputElement) => el.selectionStart);
    await page.keyboard.press('Tab');
    await expect(share).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(find).toBeFocused();
    await page.keyboard.type('abc');
    await page.keyboard.press('ArrowLeft');
    await expect(find).toBeFocused();
    expect(await caret()).toBe(2);
    await page.keyboard.press('Home');
    await expect(find).toBeFocused();
    expect(await caret()).toBe(0);
    // At the start of the text the left arrow leaves the field …
    await page.keyboard.press('ArrowLeft');
    await expect(share).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(find).toBeFocused();
    await page.keyboard.press('End');
    await expect(find).toBeFocused();
    expect(await caret()).toBe(3);
    // … and at its end the right arrow does.
    await page.keyboard.press('ArrowRight');
    await expect(comment).toBeFocused();
    // Home / End on a button still jump.
    await page.keyboard.press('Home');
    await expect(share).toBeFocused();

    // RTL: the left arrow goes to the next item, the right arrow to the previous one (wrapping).
    const rtl = page.getByRole('toolbar', { name: 'RTL tools' });
    await rtl.getByRole('button', { name: 'Share' }).focus();
    await page.keyboard.press('ArrowLeft');
    await expect(rtl.getByRole('textbox', { name: 'Find' })).toBeFocused();
    await page.keyboard.press('ArrowRight'); // caret at the start of the empty field
    await expect(rtl.getByRole('button', { name: 'Share' })).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(rtl.getByRole('button', { name: 'Download' })).toBeFocused();
  });

  test('re-renders leave unchanged tabindex values alone', async ({ page }) => {
    await load(page, '/fixture/toolbar/live-input');
    const node = page.locator('[data-fixture-node]');
    await node.evaluate((el) => {
      const w = window as unknown as { __tabindexWrites: number };
      w.__tabindexWrites = 0;
      new MutationObserver((records) => (w.__tabindexWrites += records.length)).observe(el, {
        subtree: true,
        attributeFilter: ['tabindex'],
      });
    });
    const rerender = page.getByRole('button', { name: 'Re-render' });
    for (let i = 1; i <= 3; i++) {
      await rerender.click();
      await expect(rerender).toHaveAttribute('data-renders', String(i));
    }
    expect(await page.evaluate(() => (window as unknown as { __tabindexWrites: number }).__tabindexWrites)).toBe(0);
    // Still exactly one tab stop per toolbar.
    for (const name of ['Find tools', 'RTL tools']) {
      const stops = await page
        .getByRole('toolbar', { name })
        .evaluate(
          (el) => [...el.querySelectorAll('button, input')].filter((b) => (b as HTMLElement).tabIndex === 0).length,
        );
      expect(stops).toBe(1);
    }
  });

  test('exit-always settles without scrollend (150ms pause fallback)', async ({ page }) => {
    // A browser without scrollend: no handler property, and the events never arrive.
    await page.addInitScript(() => {
      delete (window as { onscrollend?: unknown }).onscrollend;
      window.addEventListener('scrollend', (e) => e.stopImmediatePropagation(), true);
    });
    await load(page, '/demo/toolbar');
    expect(await page.evaluate(() => 'onscrollend' in window)).toBe(false);
    await page.getByLabel('on scroll').selectOption('exit');
    const scroller = page.getByText('Row 1 —').locator('xpath=..');
    const bar = page.getByRole('toolbar', { name: 'Text formatting' });
    const top = () => bar.evaluate((el) => el.getBoundingClientRect().top);
    const rest = await top();
    await scroller.evaluate((el) => (el.scrollTop = 30));
    await expect.poll(async () => Math.round((await top()) - rest)).toBe(30);
    // Under half way when the scroll pauses: back in.
    await expect.poll(async () => Math.round((await top()) - rest), { timeout: 2000 }).toBe(0);
  });
});

test.describe('bottom app bar', () => {
  test('a toolbar with one tab stop and arrow keys; inert while scrolled away', async ({ page }) => {
    await load(page, '/fixture/app-bar/live-bottom');
    const bar = page.getByRole('toolbar');
    const search = bar.getByRole('button', { name: 'search' });
    const del = bar.getByRole('button', { name: 'delete' });
    const fab = bar.getByRole('button', { name: 'Add' });
    await expect(search).toHaveAttribute('tabindex', '0');
    await expect(del).toHaveAttribute('tabindex', '-1');
    await expect(fab).toHaveAttribute('tabindex', '-1');
    await search.focus();
    await page.keyboard.press('ArrowRight');
    await expect(del).toBeFocused();
    await page.keyboard.press('End');
    await expect(fab).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(search).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(fab).toBeFocused();
    await expect(fab).toHaveAttribute('tabindex', '0');

    // Scrolled away (height 0): out of the tab order and the accessibility tree.
    const clip = bar.locator('xpath=..');
    const scroll = page.locator('[data-scroll]');
    await scroll.evaluate((el) => (el.scrollTop = 200));
    await expect.poll(() => clip.evaluate((el) => el.getBoundingClientRect().height)).toBe(0);
    await expect(clip).toHaveAttribute('inert', '');
    await expect(fab).not.toBeFocused();
    await search.evaluate((el: HTMLElement) => el.focus());
    await expect(search).not.toBeFocused();
    // Any scroll back shows it again, interactive.
    await scroll.evaluate((el) => (el.scrollTop = 100));
    await expect.poll(() => clip.evaluate((el) => el.getBoundingClientRect().height)).toBe(80);
    await expect(clip).not.toHaveAttribute('inert');
    await search.evaluate((el: HTMLElement) => el.focus());
    await expect(search).toBeFocused();
  });
});

test.describe('search view focus', () => {
  test('full screen: focus moves to the input, Tab stays in the view, Escape returns it to the bar', async ({
    page,
  }) => {
    await load(page, '/fixture/search/live-full');
    const node = page.locator('[data-fixture-node]');
    const trigger = node.getByRole('button', { name: 'Hinted search text' });
    await trigger.click();
    const input = node.getByRole('searchbox', { name: 'Hinted search text' });
    await expect(input).toBeFocused();
    const inView = () =>
      page.evaluate(() => {
        const box = document.querySelector('[data-fixture-node] [role="search"]')!.parentElement!.parentElement!;
        return box.contains(document.activeElement) ? document.activeElement!.getAttribute('aria-label') : null;
      });
    const forward: (string | null)[] = [];
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Tab');
      forward.push(await inView());
    }
    // Back → input → Voice search, then round again.
    expect(forward).toEqual(['Voice search', 'Back', 'Hinted search text', 'Voice search']);
    await page.keyboard.press('Shift+Tab');
    expect(await inView()).toBe('Hinted search text');
    await page.keyboard.press('Shift+Tab');
    expect(await inView()).toBe('Back');
    await page.keyboard.press('Shift+Tab');
    expect(await inView()).toBe('Voice search');

    // Escape collapses through onOpenChange; focus goes back to the bar's trigger.
    await page.keyboard.press('Escape');
    await expect(node.locator('[role="search"]')).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });
});

test.describe('carousel', () => {
  test('RTL: items start at the right edge; the left arrow and a drag to the right go forward', async ({ page }) => {
    await load(page, '/fixture/carousel/live-rtl');
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
    const scroll = () => carousel.evaluate((el) => Math.round(el.scrollLeft));
    // The LTR rest layout (16 / 188, 212 / 122, 342 / 54) mirrored in the 412px viewport.
    expect(await geo()).toEqual([
      [208, 188],
      [78, 122],
      [16, 54],
    ]);
    await carousel.focus();
    await page.keyboard.press('ArrowLeft');
    await expect.poll(scroll).toBe(-196);
    expect((await geo())[1]).toEqual([208, 188]);
    await page.keyboard.press('ArrowRight');
    await expect.poll(scroll).toBe(0);
    // Past half an item towards the end edge (to the right in RTL), at rest: the next item.
    const b = (await carousel.boundingBox())!;
    await page.mouse.move(b.x + 100, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + 210, b.y + b.height / 2, { steps: 10 });
    await page.waitForTimeout(120); // rest before the release: no fling
    await page.mouse.up();
    await expect.poll(scroll).toBe(-196);
  });

  test('reordering keeps each slide element (and its state) and re-places it', async ({ page }) => {
    await load(page, '/fixture/carousel/live-reorder');
    const carousel = page.getByRole('region', { name: 'Photos' });
    const mark = (k: string) =>
      page.evaluate((k) => {
        (document.querySelector(`[data-slide="${k}"]`) as HTMLElement & { m3Mark?: string }).m3Mark = k;
      }, k);
    const marked = (k: string) =>
      page.evaluate(
        (k) => (document.querySelector(`[data-slide="${k}"]`) as HTMLElement & { m3Mark?: string }).m3Mark ?? null,
        k,
      );
    await mark('a');
    await mark('f');
    await page.getByRole('button', { name: 'Reverse' }).click();
    expect(await marked('a')).toBe('a');
    expect(await marked('f')).toBe('f');
    const slideOf = (k: string) =>
      carousel.locator('[aria-roledescription="slide"]', { has: page.locator(`[data-slide="${k}"]`) });
    await expect(slideOf('f')).toHaveAttribute('aria-label', '1 of 6');
    await expect(slideOf('a')).toHaveAttribute('aria-label', '6 of 6');
    // The moved slide takes the first item's place: the large item at the start.
    const base = (await carousel.boundingBox())!;
    const fb = (await slideOf('f').boundingBox())!;
    expect([Math.round(fb.x - base.x), Math.round(fb.width)]).toEqual([16, 188]);
  });
});
