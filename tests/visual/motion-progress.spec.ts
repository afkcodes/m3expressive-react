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
