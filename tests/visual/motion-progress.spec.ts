/**
 * Live motion of Progress (linear / circular, flat / wavy, loading indicator), Slider and
 * TextField against the Jetpack Compose material3 sources (androidx-main): the components run
 * for real on rAF and the page samples their geometry every frame.
 */
import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => page.emulateMedia({ reducedMotion: 'no-preference' }));

type Sample = { t: number; v: number };

/**
 * Samples `read(el)` every animation frame for `ms` after clicking the button labelled `click`
 * (inside the page, so t = 0 is the click). `el` is the element matching `selector`.
 */
async function sampleAfterClick(page: Page, selector: string, click: string | null, ms: number, read: string): Promise<Sample[]> {
  return page.evaluate(
    ([selector, click, ms, read]) =>
      new Promise<Sample[]>((resolve) => {
        const fn = new Function('el', `return (${read})(el)`) as (el: Element) => number;
        const out: Sample[] = [];
        const t0 = performance.now();
        if (click) [...document.querySelectorAll('button')].find((b) => b.textContent === click)!.click();
        const tick = (now: number) => {
          out.push({ t: now - t0, v: fn(document.querySelector(selector as string)!) });
          if (now - t0 < (ms as number)) requestAnimationFrame(tick);
          else resolve(out);
        };
        requestAnimationFrame(tick);
      }),
    [selector, click, ms, read] as const,
  );
}

const at = (s: Sample[], t: number) => s.reduce((a, b) => (Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a)).v;

// ── Progress ────────────────────────────────────────────────────────────────────────────────
test.describe('progress motion', () => {
  const wave = '[aria-label="Linear wave"] path';
  const headX = '(el) => { const b = el.getBBox(); return b.x + b.width; }';
  const height = '(el) => el.getBBox().height';

  test('wavy value change: tween(500ms, linear) — WavyProgressIndicatorDefaults.ProgressAnimationSpec', async ({ page }) => {
    await page.goto('/fixture/progress/live-motion?v=30');
    await page.waitForTimeout(600);
    const s = await sampleAfterClick(page, wave, '80%', 800, headX);
    const from = s[0]!.v;
    const to = s.at(-1)!.v;
    expect(to - from).toBeGreaterThan(150);
    const moving = s.filter((x) => Math.abs(x.v - from) > 0.5);
    const start = moving[0]!.t;
    const end = s.find((x) => Math.abs(x.v - to) < 0.01)!.t;
    // One frame to start, then 500ms (± a frame each side).
    expect(end - start).toBeGreaterThan(450);
    expect(end - start).toBeLessThan(540);
    // Linear: the midpoint is half way (a spring would be ~85% there).
    const mid = (at(s, (start + end) / 2) - from) / (to - from);
    expect(mid).toBeGreaterThan(0.4);
    expect(mid).toBeLessThan(0.6);
  });

  test('linear wave amplitude: ramps down (EmphasizedAccelerate, 500ms) once the drawn value passes 95%, up (Standard) below it', async ({ page }) => {
    await page.goto('/fixture/progress/live-motion?v=50');
    await page.waitForTimeout(600);
    const full = await page.locator(wave).evaluate((el) => (el as SVGPathElement).getBBox().height);
    expect(full).toBeGreaterThan(5);
    const down = await sampleAfterClick(page, wave, '100%', 1200, height);
    // The tween passes 95% at 450ms; EmphasizedAccelerate starts slowly (≈92% left at +250ms) …
    expect(at(down, 400) / full).toBeGreaterThan(0.97);
    expect(at(down, 700) / full).toBeGreaterThan(0.8);
    // … and reaches 0 at 950ms (+ frames).
    const half = down.find((x) => x.v < full / 2)!.t;
    expect(half).toBeGreaterThan(780);
    expect(half).toBeLessThan(940);
    expect(at(down, 1150)).toBeLessThan(0.01);
    // Back to 50%: the tween leaves 95% after 50ms; Standard ramps up fast (≈84% at +250ms).
    const up = await sampleAfterClick(page, wave, '50%', 700, height);
    expect(at(up, 30)).toBeLessThan(0.01);
    expect(at(up, 330) / full).toBeGreaterThan(0.7);
    expect(at(up, 650) / full).toBeGreaterThan(0.99);
  });

  test('circular wave: flat below 10% and still; ramps into the wave after 10%, flattens and stops again', async ({ page }) => {
    const ring = '[aria-label="Circular wave"] path:last-of-type';
    await page.goto('/fixture/progress/live-motion?v=5');
    await page.waitForTimeout(600);
    const d = () => page.locator(ring).getAttribute('d');
    const flat = await d();
    expect(flat).not.toMatch(/L/); // a plain arc on the crest circle
    await page.waitForTimeout(300);
    expect(await d(), 'no amplitude → the wave does not travel').toBe(flat);
    const kinds = await sampleAfterClick(page, ring, '30%', 1200, "(el) => { const d = el.getAttribute('d'); return d.includes('A4.793') ? 2 : d.includes('L') ? 1 : 0; }");
    // 5% → 30% passes 10% at 100ms: arc, then partial-amplitude blends, then the kit's star.
    expect(kinds.some((x) => x.v === 1)).toBe(true);
    expect(at(kinds, 50)).toBe(0);
    expect(at(kinds, 350)).toBe(1);
    expect(kinds.at(-1)!.v).toBe(2);
    await page.getByRole('button', { name: '5%', exact: true }).click();
    await page.waitForTimeout(1300); // passes 10% at 400ms, then 500ms of ramp
    const settled = await d();
    expect(settled).not.toMatch(/L/);
    await page.waitForTimeout(300);
    expect(await d(), 'flat again → travel stopped').toBe(settled);
  });

  test('gaps grow from 0: active ↔ track space at 1% (flat linear p + min(p, gap + stroke))', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/fixture/progress/live-motion?v=1');
    // Flat 4dp, 404px: head 2 + 1% × 396 = 5.96 → track at head + min(head, 8) − 2 = 9.92 (4px space at ≥ 8).
    const x = await page.locator('[aria-label="Linear flat"] rect').first().getAttribute('x');
    expect(Number(x)).toBeCloseTo(9.92, 2);
    // Wavy 4dp: min(head − cap, 4) = 3.96 → 5.96 + 2 + 3.96.
    const xw = await page.locator('[aria-label="Linear wave"] rect').first().getAttribute('x');
    expect(Number(xw)).toBeCloseTo(11.92, 2);
  });

  test('loading indicator: a morph every 650ms, overshooting to ≈1.09 (98.5° turn) near 278ms', async ({ page }) => {
    await page.goto('/fixture/progress/live-indeterminate');
    await page.waitForTimeout(300);
    const g = '[aria-label="Loading shape"] g';
    const raw = await sampleAfterClick(page, g, null, 2400, "(el) => Number(/rotate\\(([-\\d.]+)/.exec(el.getAttribute('transform'))[1])");
    // Unwrap the 360° target wrap and remove the global spin (360° / 4666ms): what's left is
    // progress·90 + target, flat between morphs.
    let k = 0;
    const r = raw.map((x, i) => {
      if (i && x.v - raw[i - 1]!.v < -180) k += 360;
      return { t: x.t, v: x.v + k - (x.t / 4666) * 360 };
    });
    const starts: number[] = [];
    const peaks: { rise: number; dt: number }[] = [];
    for (let i = 1; i < r.length; i++) {
      const plateau = r[i - 1]!.v;
      if (r[i]!.v - plateau > 0.3 && Math.abs(plateau - r[Math.max(0, i - 2)]!.v) < 0.05) {
        const start = r[i - 1]!.t;
        const window = r.filter((x) => x.t > start && x.t < start + 400);
        const top = window.reduce((a, b) => (b.v > a.v ? b : a));
        starts.push(start);
        if (window.at(-1)!.t > start + 350) peaks.push({ rise: top.v - plateau, dt: top.t - start });
      }
    }
    expect(starts.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < starts.length; i++) {
      expect(starts[i]! - starts[i - 1]!).toBeGreaterThan(625);
      expect(starts[i]! - starts[i - 1]!).toBeLessThan(680);
    }
    expect(peaks.length).toBeGreaterThanOrEqual(2);
    for (const p of peaks) {
      expect(p.rise).toBeGreaterThan(97.5); // 1.0948 × 90 = 98.5
      expect(p.rise).toBeLessThan(99.5);
      expect(p.dt).toBeGreaterThan(250);
      expect(p.dt).toBeLessThan(305);
    }
  });
});

// ── Slider ──────────────────────────────────────────────────────────────────────────────────
test('slider value indicator: appears / disappears with no transition (Compose Label); press and keyboard focus, not hover', async ({ page }) => {
  await page.goto('/fixture/slider/live');
  await page.mouse.move(0, 0);
  const volume = page.getByRole('slider', { name: 'Volume' });
  const indicator = volume.locator('xpath=..').locator('> span[aria-hidden]', { hasText: /^\d+$/ });
  const state = () =>
    indicator.evaluate((el) => ({ opacity: getComputedStyle(el).opacity, animations: el.getAnimations().length }));
  expect(await state()).toEqual({ opacity: '0', animations: 0 });
  const box = (await page.locator('[data-fixture-node]').boundingBox())!;
  await page.mouse.move(box.x + 177, box.y + 26);
  await page.waitForTimeout(100);
  expect(await state(), 'hover: the kit’s Hovered variants draw no indicator').toEqual({ opacity: '0', animations: 0 });
  await page.mouse.down();
  expect(await state(), 'pressed: shown at once').toEqual({ opacity: '1', animations: 0 });
  await page.mouse.up();
  expect(await state(), 'released: hidden at once').toEqual({ opacity: '0', animations: 0 });
  await page.mouse.move(0, 0);
  await page.mouse.click(1, 1);
  await page.keyboard.press('Tab');
  await expect(volume).toBeFocused();
  expect(await state(), 'keyboard focus: shown at once').toEqual({ opacity: '1', animations: 0 });
});

// ── Text field ──────────────────────────────────────────────────────────────────────────────
test.describe('text field motion', () => {
  /** Computed transition of the first element under the fixture node matching `pick`. */
  const transitionOf = (page: Page, pick: string) =>
    page.locator('[data-fixture-node]').evaluate((root, pick) => {
      const el = [...root.querySelectorAll<HTMLElement>('*')].find((e) => e.matches(pick))!;
      const cs = getComputedStyle(el);
      return { property: cs.transitionProperty, duration: cs.transitionDuration };
    }, pick);

  test('indicator / outline: colour on FastEffects, thickness on FastSpatial, snap when disabled; container FastEffects; supporting text not animated', async ({ page }) => {
    await page.goto('/fixture/text-field/filled-enabled-label-xx');
    // Filled indicator line (Compose IndicatorLineNode).
    expect(await transitionOf(page, 'span[aria-hidden]:last-child')).toEqual({ property: 'top, height, background-color', duration: '0.369s, 0.369s, 0.15s' });
    // Container colour (TextFieldDefaults.Container) and supporting text (not animated).
    expect(await transitionOf(page, '[data-fixture-node] > div > div')).toEqual({ property: 'background-color', duration: '0.15s' });
    const supporting = page.getByText('Supporting text');
    expect(await supporting.evaluate((el) => getComputedStyle(el).transitionProperty + ' ' + getComputedStyle(el).transitionDuration)).toBe('all 0s');
    await page.goto('/fixture/text-field/filled-disabled-label-xx');
    expect((await transitionOf(page, 'span[aria-hidden]:last-child')).duration).toBe('0s');
    // Outlined stroke (animateBorderStrokeAsState).
    await page.goto('/fixture/text-field/outlined-enabled-label-xx');
    expect(await transitionOf(page, 'fieldset')).toEqual({ property: 'border-width, padding-inline-start, border-color', duration: '0.369s, 0.369s, 0.15s' });
    await page.goto('/fixture/text-field/outlined-disabled-label-xx');
    expect((await transitionOf(page, 'fieldset')).duration).toBe('0s');
  });

  test('placeholder: fades in on SlowEffects when focused, out on FastEffects when blurred', async ({ page }) => {
    await page.goto('/fixture/text-field/live');
    const name = page.getByRole('textbox', { name: 'Name' });
    const ph = () => name.evaluate((el) => {
      const cs = getComputedStyle(el, '::placeholder');
      return { opacity: Number(cs.opacity), duration: cs.transitionDuration };
    });
    expect(await ph()).toEqual({ opacity: 0, duration: '0.15s' });
    await name.focus();
    const fading = await ph();
    expect(fading.duration).toBe('0.327s');
    expect(fading.opacity).toBeLessThan(1);
    await expect.poll(async () => (await ph()).opacity).toBe(1);
    await name.blur();
    const out = await ph();
    expect(out.duration).toBe('0.15s');
    expect(out.opacity).toBeGreaterThan(0);
    await expect.poll(async () => (await ph()).opacity).toBe(0);
  });

  test('outlined notch opens with the label: label width × progress + 4px each side (Compose outlineCutout)', async ({ page }) => {
    await page.goto('/fixture/text-field/live');
    await page.evaluate(() => document.fonts.ready); // the label is measured when the float starts
    const frames = await page.evaluate(
      () =>
        new Promise<{ t: number; scale: number; legend: number }[]>((resolve) => {
          const input = [...document.querySelectorAll('input')].find((i) => i.placeholder === 'Jane Doe')!;
          const label = input.parentElement!.querySelector('label')!;
          const legend = input.closest('div')!.parentElement!.querySelector('legend')!;
          const out: { t: number; scale: number; legend: number }[] = [];
          const t0 = performance.now();
          input.focus();
          const tick = (now: number) => {
            const m = /scale\(([\d.]+)\)/.exec(label.style.transform);
            out.push({ t: now - t0, scale: m ? Number(m[1]) : 1, legend: legend.getBoundingClientRect().width });
            if (now - t0 < 500) requestAnimationFrame(tick);
            else resolve(out);
          };
          requestAnimationFrame(tick);
        }),
    );
    const final = frames.at(-1)!.legend; // label text width + 8
    const text = final - 8;
    let checked = 0;
    for (const f of frames) {
      if (f.scale === 1) continue; // settled
      const p = 1 - 3 * (f.scale - 1); // floated layout: scale = 1 + (16/12 − 1)(1 − p)
      if (p <= 0.02) continue;
      expect(Math.abs(f.legend - (text * f.scale * p + 8))).toBeLessThan(0.5);
      checked++;
    }
    expect(checked).toBeGreaterThan(5);
    // Half way through the float the notch is about half open (the old max-width transition ran ahead).
    const mid = frames.find((f) => f.scale < 1 + (1 / 3) * 0.5)!;
    expect(mid.legend).toBeLessThan(final * 0.8);
  });

  test('label float interrupted mid-flight continues from its position and velocity (Compose Transition)', async ({ page }) => {
    await page.goto('/fixture/text-field/live');
    await page.evaluate(() => document.fonts.ready);
    const ys = await page.evaluate(
      () =>
        new Promise<{ t: number; y: number; blurred: boolean }[]>((resolve) => {
          const input = document.querySelector<HTMLInputElement>('input')!; // filled "Label"
          const label = input.parentElement!.querySelector('label')!;
          const out: { t: number; y: number; blurred: boolean }[] = [];
          const t0 = performance.now();
          let blurred = false;
          input.focus();
          const tick = (now: number) => {
            const r = label.getBoundingClientRect();
            out.push({ t: now - t0, y: r.top + r.height / 2, blurred });
            if (!blurred && now - t0 > 60) {
              input.blur();
              blurred = true;
            }
            if (now - t0 < 700) requestAnimationFrame(tick);
            else resolve(out);
          };
          requestAnimationFrame(tick);
        }),
    );
    const rest = ys[0]!.y;
    for (let i = 1; i < ys.length; i++) expect(Math.abs(ys[i]!.y - ys[i - 1]!.y), `jump at ${ys[i]!.t.toFixed(0)}ms`).toBeLessThan(7);
    const i = ys.findIndex((s) => s.blurred);
    const before = ys[i - 1]!.y - ys[i - 2]!.y; // moving up (negative)
    expect(before).toBeLessThan(-1);
    // Velocity carries over: it keeps rising for a moment after the blur instead of restarting
    // downwards — but never reaches the floated position (a restarted FLIP would jump there first).
    const after = ys.slice(i).map((s) => s.y);
    expect(ys[i + 1]!.y).toBeLessThan(ys[i - 1]!.y);
    expect(Math.min(...after)).toBeGreaterThan(rest - 12 + 1.5); // filled: floats 12px up (centre 28 → 16)
    expect(Math.abs(ys.at(-1)!.y - rest)).toBeLessThan(0.05);
  });
});
