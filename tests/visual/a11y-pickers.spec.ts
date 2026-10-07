/**
 * Date / time picker robustness and keyboard access (live): typed dates are never rewritten or
 * guessed, picks survive parent re-renders, every calendar / year list / period selector has one
 * tab stop and full arrow-key navigation, and out-of-range input is clamped.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';

async function open(page: Page, path: string) {
  await page.goto(path);
  await page.evaluate(() => document.fonts.ready);
}

/** Re-render the churn fixture's parent (fresh Date / Time objects with the same values). */
async function churn(page: Page, times = 3) {
  for (let i = 0; i < times; i++) {
    const before = Number(await page.locator('output[data-tick]').textContent());
    await page.evaluate(() => (window as unknown as { __m3xChurn: () => void }).__m3xChurn());
    await expect(page.locator('output[data-tick]')).toHaveText(String(before + 1));
  }
}

/** Type one character at a time, checking the field never rewrites what was typed. */
async function typeChecked(field: Locator, text: string, between?: () => Promise<void>) {
  let typed = await field.inputValue();
  for (const ch of text) {
    await field.pressSequentially(ch);
    typed += ch;
    await expect(field).toHaveValue(typed);
    if (between) {
      await between();
      await expect(field).toHaveValue(typed);
    }
  }
}

const out = (page: Page, k: string) => page.locator(`output[data-${k}]`);

test.describe('date input (en-US)', () => {
  test.use({ locale: 'en-US' });

  test('docked field: typing is kept character by character; only a full four-digit year parses', async ({ page }) => {
    await open(page, '/fixture/date-picker/live-churn');
    const field = page.getByRole('textbox', { name: 'Date' });
    await expect(page.getByText('MM/DD/YYYY', { exact: true })).toBeVisible();
    await expect(field).toHaveValue('7/17/2025');
    await field.clear();
    await expect(out(page, 'docked')).toHaveText('none');
    // "01/05/2" used to parse as 1902 and rewrite the field to "1/5/1902".
    await typeChecked(field, '01/05/202', () => churn(page, 1));
    await expect(out(page, 'docked')).toHaveText('none');
    await typeChecked(field, '5', () => churn(page, 1));
    await expect(out(page, 'docked')).toHaveText('2025-1-5');
    // The committed value echoes the typing: the field keeps "01/05/2025" (not "1/5/2025").
    await churn(page);
    await expect(field).toHaveValue('01/05/2025');
    // Editing on: deleting the last digit leaves a partial year (no value change, no rewrite).
    await field.press('Backspace');
    await expect(field).toHaveValue('01/05/202');
    await churn(page);
    await expect(field).toHaveValue('01/05/202');
    await expect(out(page, 'docked')).toHaveText('2025-1-5');
    // A pick from the panel replaces the text.
    await page.getByRole('button', { name: 'Open calendar' }).click();
    const panel = page.getByRole('dialog', { name: 'Choose date' });
    await panel.getByRole('button', { name: 'January 9, 2025', exact: true }).click();
    await panel.getByRole('button', { name: 'OK' }).click();
    await expect(field).toHaveValue('1/9/2025');
    await expect(out(page, 'docked')).toHaveText('2025-1-9');
  });

  test('modal input mode: locale placeholder, character-by-character typing, partial years rejected', async ({
    page,
  }) => {
    await open(page, '/fixture/date-picker/live');
    await page.getByRole('button', { name: 'Pick date' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Switch to text input' }).click();
    const field = dialog.getByRole('textbox', { name: 'Date' });
    await expect(field).toHaveAttribute('placeholder', 'mm/dd/yyyy');
    await expect(field).toBeFocused();
    await expect(field).toHaveValue('7/17/2025');
    await field.clear();
    await typeChecked(field, '1/5/25');
    // Two-digit year: not a date (it used to commit 1925).
    await dialog.getByRole('button', { name: 'OK' }).click();
    await expect(out(page, 'date')).toHaveText('none');
    await page.getByRole('button', { name: 'Pick date' }).click();
    await dialog.getByRole('button', { name: 'Switch to text input' }).click();
    await typeChecked(field, '12/24/2025');
    await dialog.getByRole('button', { name: 'OK' }).click();
    await expect(out(page, 'date')).toHaveText('2025-12-24');
  });
});

test.describe('date input (en-GB)', () => {
  test.use({ locale: 'en-GB' });

  test('day / month order in the hint, parsing and the formatted field', async ({ page }) => {
    await open(page, '/fixture/date-picker/live');
    await expect(page.getByText('DD/MM/YYYY', { exact: true })).toBeVisible();
    const field = page.getByRole('textbox', { name: 'Date' });
    await field.click();
    await typeChecked(field, '05/01/2025');
    await expect(out(page, 'docked')).toHaveText('2025-1-5');
    await page.getByRole('button', { name: 'Open calendar' }).click();
    const panel = page.getByRole('dialog', { name: 'Choose date' });
    await panel.getByRole('button', { name: '9 January 2025', exact: true }).click();
    await panel.getByRole('button', { name: 'OK' }).click();
    await expect(field).toHaveValue('09/01/2025');

    await page.getByRole('button', { name: 'Pick date' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Switch to text input' }).click();
    const input = dialog.getByRole('textbox', { name: 'Date' });
    await expect(input).toHaveAttribute('placeholder', 'dd/mm/yyyy');
    await expect(input).toHaveValue('17/07/2025');
    await input.clear();
    await typeChecked(input, '24/12/2025');
    await dialog.getByRole('button', { name: 'OK' }).click();
    await expect(out(page, 'date')).toHaveText('2025-12-24');
  });
});

test.describe('picks survive parent re-renders', () => {
  test('modal date picker: the draft is kept until OK', async ({ page }) => {
    await open(page, '/fixture/date-picker/live-churn');
    await page.getByRole('button', { name: 'Pick date' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'July 3, 2025' }).click();
    await expect(dialog.getByText('Thu, Jul 3')).toBeVisible();
    await churn(page);
    await expect(dialog.getByText('Thu, Jul 3')).toBeVisible();
    // The input mode's draft too.
    await dialog.getByRole('button', { name: 'Switch to text input' }).click();
    await churn(page);
    await expect(dialog.getByRole('textbox', { name: 'Date' })).toHaveValue('7/3/2025');
    await dialog.getByRole('button', { name: 'OK' }).click();
    await expect(out(page, 'date')).toHaveText('2025-7-3');
    // Reopening starts from the committed value (and the calendar).
    await page.getByRole('button', { name: 'Pick date' }).click();
    await expect(dialog.getByRole('grid', { name: 'July 2025' })).toBeVisible();
    await expect(dialog.getByRole('gridcell', { name: 'July 3, 2025' })).toHaveAttribute('aria-selected', 'true');
    await expect(dialog.getByText('Thu, Jul 3')).toBeVisible();
  });

  test('range picker: start / end picks are kept until Save', async ({ page }) => {
    await open(page, '/fixture/date-picker/live-churn');
    await page.getByRole('button', { name: 'Pick range' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'July 20, 2025' }).click();
    await churn(page);
    await dialog.getByRole('button', { name: 'July 24, 2025' }).click();
    await churn(page);
    await expect(dialog.getByText('Jul 20 – Jul 24')).toBeVisible();
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(out(page, 'range')).toHaveText('2025-7-20..2025-7-24');
  });

  test('docked panel: the day picked in the panel is kept until OK', async ({ page }) => {
    await open(page, '/fixture/date-picker/live-churn');
    await expect(out(page, 'docked')).toHaveText('2025-7-17');
    await page.getByRole('button', { name: 'Open calendar' }).click();
    const panel = page.getByRole('dialog', { name: 'Choose date' });
    await panel.getByRole('button', { name: 'July 9, 2025' }).click();
    await churn(page);
    await panel.getByRole('button', { name: 'OK' }).click();
    await expect(out(page, 'docked')).toHaveText('2025-7-9');
  });

  test('time picker: the dial pick is kept until OK', async ({ page }) => {
    await open(page, '/fixture/time-picker/live-churn');
    await page.getByRole('button', { name: 'Pick time' }).click();
    const dialog = page.getByRole('dialog', { name: 'Select time' });
    const dial = dialog.getByRole('slider', { name: 'Hour' });
    const b = (await dial.boundingBox())!;
    await page.mouse.click(b.x + 128 + 101, b.y + 128);
    await expect(dialog.getByRole('slider', { name: 'Minute' })).toBeVisible();
    await churn(page);
    await expect(dialog.getByRole('button', { name: 'Hour 3' })).toBeVisible();
    await dialog.getByRole('button', { name: 'OK' }).click();
    await expect(out(page, 'time')).toHaveText('15:00');
  });
});

test.describe('calendar keyboard', () => {
  test.use({ timezoneId: 'Europe/London' });

  test('Home / End land on the week edges across DST changes', async ({ page }) => {
    await open(page, '/fixture/date-picker/live');
    await page.getByRole('button', { name: 'Pick date' }).click();
    const dialog = page.getByRole('dialog');
    const focused = (name: string) => expect(dialog.getByRole('button', { name, exact: true })).toBeFocused();
    await dialog.getByRole('button', { name: 'July 17, 2025' }).focus();
    for (let i = 0; i < 3; i++) await page.keyboard.press('PageUp');
    await focused('April 17, 2025');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    await focused('April 3, 2025');
    // Thu 3 April (BST) → Sun 30 March, the 23-hour day (± n × 24h landed on Sat 29 March).
    await page.keyboard.press('Home');
    await focused('March 30, 2025');
    await expect(dialog.getByRole('grid', { name: 'March 2025' })).toBeVisible();
    for (let i = 0; i < 7; i++) await page.keyboard.press('PageDown');
    await focused('October 30, 2025');
    await page.keyboard.press('Home');
    await focused('October 26, 2025');
    // Sun 26 October (25 hours) → Sat 1 November (± n × 24h landed on Fri 31 October).
    await page.keyboard.press('End');
    await focused('November 1, 2025');
    await expect(dialog.getByRole('grid', { name: 'November 2025' })).toBeVisible();
    // One tab stop in the grid, on the focused day.
    await expect(dialog.locator('[role="grid"] button[tabindex="0"]')).toHaveCount(1);
  });

  test('after a month change, keys move from the focused day (not the last one focused)', async ({ page }) => {
    await open(page, '/fixture/date-picker/live');
    await page.getByRole('button', { name: 'Pick date' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'July 17, 2025' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(dialog.getByRole('button', { name: 'July 18, 2025' })).toBeFocused();
    await dialog.getByRole('button', { name: 'Next month' }).click();
    await expect(dialog.getByRole('grid', { name: 'August 2025' })).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(dialog.getByRole('button', { name: 'August 1, 2025' })).toBeFocused();
    // It used to step from 18 July and jump back to July.
    await page.keyboard.press('ArrowRight');
    await expect(dialog.getByRole('button', { name: 'August 2, 2025' })).toBeFocused();
    await expect(dialog.getByRole('grid', { name: 'August 2025' })).toBeVisible();
  });

  test('disabled days never hold the tab stop or take focus', async ({ page }) => {
    await open(page, '/fixture/date-picker/live-disabled');
    const grid = page.getByRole('grid', { name: 'July 2025' });
    // The value and today (Sat 5 July) are disabled: the tab stop is the first enabled day.
    const stops = grid.locator('button[tabindex="0"]');
    await expect(stops).toHaveCount(1);
    await expect(stops).toHaveAccessibleName('July 11, 2025');
    await page.keyboard.press('Tab');
    await expect(grid.getByRole('button', { name: 'July 11, 2025' })).toBeFocused();
    // Arrows skip the weekend; Home / End stop at the week's first / last enabled day.
    await page.keyboard.press('ArrowRight');
    await expect(grid.getByRole('button', { name: 'July 14, 2025' })).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(grid.getByRole('button', { name: 'July 11, 2025' })).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Home');
    await expect(grid.getByRole('button', { name: 'July 14, 2025' })).toBeFocused();
    await page.keyboard.press('End');
    await expect(grid.getByRole('button', { name: 'July 18, 2025' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(out(page, 'picked')).toHaveText('2025-7-18');
  });

  test('year grid: a listbox of options with one tab stop and arrow / Home / End keys', async ({ page }) => {
    await open(page, '/fixture/date-picker/live');
    await page.getByRole('button', { name: 'Pick date' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: /select year/ }).click();
    const list = dialog.getByRole('listbox', { name: 'Year' });
    await expect(list).toBeVisible();
    const option = (y: number) => list.getByRole('option', { name: String(y), exact: true });
    await expect(list.getByRole('option', { selected: true })).toHaveAccessibleName('2025');
    await expect(list.locator('[tabindex="0"]')).toHaveCount(1);
    // Tab from the menu button lands on the displayed year.
    await page.keyboard.press('Tab');
    await expect(option(2025)).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(option(2026)).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(option(2029)).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowLeft');
    await expect(option(2025)).toBeFocused();
    await page.keyboard.press('End');
    await expect(option(2100)).toBeFocused();
    await expect(option(2100)).toBeInViewport();
    // Past the last row: no move.
    await page.keyboard.press('ArrowDown');
    await expect(option(2100)).toBeFocused();
    await page.keyboard.press('Home');
    await expect(option(1900)).toBeFocused();
    await expect(option(1900)).toBeInViewport();
    await expect(list.locator('[tabindex="0"]')).toHaveCount(1);
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await expect(dialog.getByRole('grid', { name: 'July 1901' })).toBeVisible();
  });

  test('docked month / year lists: one tab stop, arrows, Home / End, PageUp / PageDown', async ({ page }) => {
    await open(page, '/fixture/date-picker/live');
    await page.getByRole('button', { name: 'Open calendar' }).click();
    const panel = page.getByRole('dialog', { name: 'Choose date' });
    await panel.getByRole('button', { name: /select year/ }).click();
    const list = panel.getByRole('listbox');
    const option = (y: number) => list.getByRole('option', { name: String(y), exact: true });
    await expect(list.locator('[tabindex="0"]')).toHaveCount(1);
    await page.keyboard.press('Tab');
    await expect(option(2025)).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(option(2026)).toBeFocused();
    await page.keyboard.press('PageDown');
    await expect(option(2033)).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await expect(option(2032)).toBeFocused();
    await page.keyboard.press('End');
    await expect(option(2100)).toBeFocused();
    await expect(option(2100)).toBeInViewport();
    await page.keyboard.press('Home');
    await expect(option(1900)).toBeFocused();
    await page.keyboard.press('PageUp');
    await expect(option(1900)).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(panel.getByRole('grid', { name: 'July 1900' })).toBeVisible();
    // Month list.
    await panel.getByRole('button', { name: /select month/ }).click();
    await page.keyboard.press('Tab');
    await expect(panel.getByRole('option', { name: 'July' })).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(panel.getByRole('grid', { name: 'August 1900' })).toBeVisible();
  });

  test('range picker: one tab stop for all months; arrows cross month boundaries', async ({ page }) => {
    await open(page, '/fixture/date-picker/live');
    await page.getByRole('button', { name: 'Pick range' }).click();
    const dialog = page.getByRole('dialog');
    const stops = dialog.locator('[role="grid"] button[tabindex="0"]');
    await expect(stops).toHaveCount(1);
    // Nothing picked: today (5 July) holds it.
    await expect(stops).toHaveAccessibleName('July 5, 2025');
    const day = (name: string) => dialog.getByRole('button', { name, exact: true });
    await day('July 5, 2025').focus();
    for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowDown');
    await expect(day('August 2, 2025')).toBeFocused();
    await expect(stops).toHaveCount(1);
    await expect(stops).toHaveAccessibleName('August 2, 2025');
    await page.keyboard.press('PageDown');
    await expect(day('September 2, 2025')).toBeFocused();
    await expect(day('September 2, 2025')).toBeInViewport();
    await page.keyboard.press('Enter');
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await expect(dialog.getByText('Sep 2 – Sep 5')).toBeVisible();
    // Back across the boundary.
    await page.keyboard.press('PageUp');
    await page.keyboard.press('PageUp');
    await expect(day('July 5, 2025')).toBeFocused();
    await expect(day('July 5, 2025')).toBeInViewport();
    await expect(stops).toHaveCount(1);
    // Tab leaves the months (no second stop in another month).
    await page.keyboard.press('Tab');
    await expect(dialog.locator('[role="grid"] button:focus')).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(out(page, 'range')).toHaveText('2025-9-2..2025-9-5');
  });
});

test.describe('time picker keyboard and input', () => {
  test('period selector: a radio group with arrow keys; the dial reads its value', async ({ page }) => {
    await open(page, '/fixture/time-picker/live');
    await page.getByRole('button', { name: 'Pick time' }).click();
    const dialog = page.getByRole('dialog', { name: 'Select time' });
    const pm = dialog.getByRole('radio', { name: 'PM' });
    const am = dialog.getByRole('radio', { name: 'AM' });
    await expect(pm).toHaveAttribute('tabindex', '0');
    await expect(am).toHaveAttribute('tabindex', '-1');
    await expect(dialog.getByRole('slider', { name: 'Hour' })).toHaveAttribute('aria-valuetext', "7 o'clock");
    await pm.focus();
    await page.keyboard.press('ArrowUp');
    await expect(am).toBeFocused();
    await expect(am).toHaveAttribute('aria-checked', 'true');
    await expect(am).toHaveAttribute('tabindex', '0');
    await page.keyboard.press('ArrowRight');
    await expect(pm).toBeFocused();
    await expect(pm).toHaveAttribute('aria-checked', 'true');
    await page.keyboard.press('ArrowLeft');
    await expect(am).toHaveAttribute('aria-checked', 'true');
    await dialog.getByRole('button', { name: /^Minute/ }).click();
    await expect(dialog.getByRole('slider', { name: 'Minute' })).toHaveAttribute('aria-valuetext', '0 minutes');
    await dialog.getByRole('button', { name: 'OK' }).click();
    await expect(page.locator('[data-time]')).toHaveText('7:00');
  });

  test('out-of-range times are clamped instead of crashing', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await open(page, '/fixture/time-picker/live-invalid');
    await expect(page.getByRole('slider', { name: 'Minute 60' })).toHaveAttribute('aria-valuenow', '59');
    await expect(page.getByRole('slider', { name: 'Hour -1' })).toHaveAttribute('aria-valuenow', '12');
    await expect(page.getByRole('slider', { name: 'Hour NaN' })).toHaveAttribute('aria-valuenow', '0');
    // 25:75 → 23:59 (11 PM on the 12-hour dial).
    await expect(page.getByRole('slider', { name: 'Hour', exact: true })).toHaveAttribute('aria-valuenow', '11');
    await expect(page.getByRole('button', { name: 'Minute 59' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'PM' }).first()).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByRole('textbox', { name: 'Hour' })).toHaveValue('12');
    await expect(page.getByRole('textbox', { name: 'Minute' })).toHaveValue('59');
    expect(errors).toEqual([]);
  });

  test('the dial spring stops when the picker unmounts', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await open(page, '/fixture/time-picker/live');
    await page.getByRole('button', { name: 'Pick time' }).click();
    const dialog = page.getByRole('dialog', { name: 'Select time' });
    await expect.poll(() => dialog.evaluate((el) => getComputedStyle(el).scale)).toBe('1');
    // Count animation frames requested from now on.
    await page.evaluate(() => {
      const w = window as unknown as { __raf: number };
      w.__raf = 0;
      const raf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (cb) => {
        w.__raf++;
        return raf(cb);
      };
    });
    // Swing the hand half way round (a long spring), then close at once.
    await dialog.getByRole('slider', { name: 'Hour' }).focus();
    for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const before = await page.evaluate(() => (window as unknown as { __raf: number }).__raf);
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => (window as unknown as { __raf: number }).__raf);
    expect(after - before).toBeLessThanOrEqual(1);
  });
});

// A click whose pointer wobbles a pixel or two (normal for a mouse or trackpad, reported sub-pixel by
// browsers) must stay a click: it selects the day, keeps the month and never shows the neighbouring
// month's grid on top (Compose's ~0.06px mouse slop turned such clicks into swipes / flings).
test('date picker: a slightly wobbly click selects the day; no swipe, no overlapping month', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await open(page, '/fixture/date-picker/live');
  await page.getByRole('button', { name: 'Pick date' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const monthLabel = () => dialog.getByRole('button', { name: /2025/ }).first().textContent();
  const before = await monthLabel();
  for (const [day, dx] of [
    [10, 2],
    [12, -3],
    [20, 1.5],
  ] as const) {
    const cell = dialog
      .getByRole('gridcell')
      .filter({ hasText: new RegExp(`^${day}$`) })
      .first();
    const box = (await cell.boundingBox())!;
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + dx, y);
    expect(await page.locator('[data-month-copy]').count(), `no neighbouring month while clicking ${day}`).toBe(0);
    await page.mouse.up();
    await expect.poll(monthLabel, `still ${before}`).toBe(before);
    // The headline shows the picked day.
    await expect(dialog.locator('p[aria-live]')).toContainText(new RegExp(`\\b${day}\\b`));
  }
});
