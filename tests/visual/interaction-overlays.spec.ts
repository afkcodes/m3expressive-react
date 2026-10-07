/**
 * Runtime interaction parity for search, toolbar, sheets, dialogs, carousel, date and time pickers:
 * drive the REAL component with a mouse / keyboard (no forced states) and compare against the Figma
 * state variants. Complements figma-parity.spec.ts, which renders states statically.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { compareImages } from './compare.ts';
import { captureRegion, hexToRgb } from './capture.ts';
import { REFS_DIR, type Manifest } from './manifest.ts';

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
  // Same surface as the kit's basic dialog with icon (pixels: the static parity suite); the popup is the surface.
  const surface = dialog;
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
  await dialog.getByRole('option', { name: '2027' }).click();
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
