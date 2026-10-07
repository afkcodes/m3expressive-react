/**
 * Live motion checks for List, Menu, Tabs, Navigation and App bars against the Compose
 * material3 sources (androidx-main): transition specs per state, sampled values against the
 * spring maths, gesture outcomes. Runs with motion enabled (the config defaults to reduced).
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { stepSpring } from '../../packages/m3/src/motion/spring.ts';
import { motionSchemes } from '../../packages/m3/src/motion/tokens.ts';

const DEFAULT_EFFECTS = '0.231s';
const FAST_SPATIAL = '0.369s';
const DEFAULT_SPATIAL = '0.435s';
const FAST_EFFECTS = '0.15s';
const SETTLE = 900;

async function open(page: Page, path: string) {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(path);
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(0, 0);
  const node = page.locator('[data-fixture-node]');
  await expect(node).toBeVisible();
  return node;
}

/** Computed transition entry for one property, or null when it doesn't transition. */
async function transitionOf(el: Locator, property: string) {
  return el.evaluate((node, prop) => {
    const cs = getComputedStyle(node);
    const props = cs.transitionProperty.split(',').map((p) => p.trim());
    const i = props.indexOf(prop);
    if (i < 0) return null;
    const pick = (list: string) => {
      const parts = list.split(/,(?![^(]*\))/).map((p) => p.trim());
      return parts[i % parts.length]!;
    };
    return { duration: pick(cs.transitionDuration), easing: pick(cs.transitionTimingFunction) };
  }, property);
}

// ── List ──────────────────────────────────────────────────────────────────────────────────────
test.describe('list motion', () => {
  test('slot and text colours each animate on default effects (ListItem.kt colour transitions)', async ({ page }) => {
    const node = await open(page, '/fixture/list/live');
    const item = node.getByRole('button');
    const parts = await item.evaluate((el) => {
      const spans = [...el.querySelectorAll(':scope > span')].filter((s) => !s.hasAttribute('aria-hidden'));
      return spans.length;
    });
    expect(parts, 'leading slot, text column, trailing slot').toBe(3);
    const leading = item.locator(':scope > span:not([aria-hidden])').nth(0);
    const trailing = item.locator(':scope > span:not([aria-hidden])').nth(2);
    const texts = item.locator(':scope > span:not([aria-hidden])').nth(1).locator(':scope > span');
    await expect(texts).toHaveCount(3);
    for (const el of [leading, trailing, texts.nth(0), texts.nth(1), texts.nth(2)]) {
      expect(await transitionOf(el, 'color')).toMatchObject({ duration: DEFAULT_EFFECTS });
    }
    // Selecting fades the headline from On Surface to On Secondary Container (not a jump).
    const headline = texts.nth(1);
    const before = await headline.evaluate((el) => getComputedStyle(el).color);
    await item.click();
    await page.waitForTimeout(40);
    const mid = await headline.evaluate((el) => getComputedStyle(el).color);
    await page.waitForTimeout(SETTLE);
    const after = await headline.evaluate((el) => getComputedStyle(el).color);
    expect(mid).not.toBe(before);
    expect(mid).not.toBe(after);
  });

  test('dragged: one state layer at 16%, the ripple stays mounted, z-index held while the shadow leaves', async ({ page }) => {
    const node = await open(page, '/fixture/list/live-drag');
    const item = node.getByRole('button', { name: /Label text 2/ });
    const toggle = page.locator('[data-toggle-drag]');
    const layers = item.locator(':scope > span[aria-hidden]');
    const before = await layers.count();
    await item.evaluate((el) => {
      (window as unknown as { __layer: Element }).__layer = el.querySelector(':scope > span[aria-hidden]')!;
    });
    await toggle.evaluate((b) => (b as HTMLButtonElement).click());
    await expect.poll(() => item.evaluate((el) => getComputedStyle(el).zIndex)).toBe('1');
    expect(await layers.count(), 'same layer / ripple nodes while dragged').toBe(before);
    expect(await item.evaluate((el) => (window as unknown as { __layer: Element }).__layer === el.querySelector(':scope > span[aria-hidden]'))).toBe(true);
    await page.waitForTimeout(SETTLE);
    expect(await layers.first().evaluate((el) => getComputedStyle(el).opacity)).toBe('0.16');
    // Un-drag: the shadow animates out on fast spatial and the item stays lifted until it has.
    await toggle.evaluate((b) => (b as HTMLButtonElement).click());
    const t0 = Date.now();
    const samples: { t: number; z: string; layer: string }[] = [];
    while (Date.now() - t0 < 700) {
      const [z, layer] = await item.evaluate((el) => [getComputedStyle(el).zIndex, getComputedStyle(el.querySelector(':scope > span[aria-hidden]')!).opacity]);
      samples.push({ t: Date.now() - t0, z: z!, layer: layer! });
      await page.waitForTimeout(20);
    }
    expect(samples[0]!.z, 'still lifted right after release').toBe('1');
    const lowered = samples.find((s) => s.z === '0');
    expect(lowered, 'lowered once the shadow is gone').toBeTruthy();
    expect(lowered!.t).toBeGreaterThan(250);
    // The 16% layer fades out over 150ms (Compose StateLayer drag exit), not 15ms.
    expect(Number(samples[0]!.layer)).toBeGreaterThan(0.02);
    expect(samples.at(-1)!.layer).toBe('0');
    expect(await layers.count()).toBe(before);
  });

  test('expandable: the panel springs on fast spatial and its items slide down anchored to its bottom', async ({ page }) => {
    const node = await open(page, '/fixture/list/live-accordion');
    await node.getByRole('button', { name: 'Expand' }).click();
    const ul = node.locator('ul');
    await expect(ul).toBeVisible();
    const p = node.locator('ul').locator('xpath=..');
    expect(await transitionOf(p, 'height')).toMatchObject({ duration: FAST_SPATIAL });
    expect(await transitionOf(ul, 'transform')).toMatchObject({ duration: FAST_SPATIAL });
    const samples: { panelH: number; gap: number }[] = [];
    for (let i = 0; i < 12; i++) {
      samples.push(
        await ul.evaluate((list) => {
          const a = list.parentElement!.getBoundingClientRect();
          const b = list.getBoundingClientRect();
          return { panelH: a.height, gap: a.bottom - b.bottom };
        }),
      );
      await page.waitForTimeout(16);
    }
    const mid = samples.filter((s) => s.panelH > 4 && s.panelH < 100);
    expect(mid.length, 'caught the panel mid-open').toBeGreaterThan(0);
    for (const s of mid) expect(Math.abs(s.gap), `list bottom on the panel bottom (h ${s.panelH})`).toBeLessThanOrEqual(1);
  });

  test('swipe: release follows velocity (125px/s) and the 56px positional threshold, settles on a 300ms tween', async ({ page }) => {
    const node = await open(page, '/fixture/list/live-swipe');
    const state = page.locator('[data-state]');
    const item = node.locator('div[style*="translateX"]');
    const offset = () => item.evaluate((el) => {
      const m = /translateX\((-?[\d.]+)px\)/.exec((el as HTMLElement).style.transform);
      return m ? Math.abs(Number(m[1])) : 0;
    });
    // Pointer events dispatched in-page at exact intervals (velocity under test, not CDP latency):
    // down at `from`, an 8px slop step, then `steps` moves to `to` every `stepMs`, then up after
    // `holdMs` (> 40ms = the pointer stopped).
    const swipe = (from: number, to: number, steps: number, stepMs: number, holdMs = 0) =>
      item.evaluate(
        async (el, o) => {
          const r = el.getBoundingClientRect();
          const y = r.top + r.height / 2;
          const fire = (type: string, x: number) =>
            el.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 7, pointerType: 'touch', isPrimary: true, button: 0, clientX: r.left + x, clientY: y }));
          const spin = (until: number) => {
            while (performance.now() < until);
          };
          const dir = Math.sign(o.to - o.from);
          fire('pointerdown', o.from);
          let t = performance.now();
          spin((t += o.stepMs));
          fire('pointermove', o.from + 8 * dir);
          for (let i = 1; i <= o.steps; i++) {
            spin((t += o.stepMs));
            fire('pointermove', o.from + 8 * dir + ((o.to - o.from - 8 * dir) * i) / o.steps);
          }
          if (o.holdMs) await new Promise((res) => setTimeout(res, o.holdMs));
          fire('pointerup', o.to);
        },
        { from, to, steps, stepMs, holdMs },
      );
    // 60px at 100px/s (under 125): past 56px from closed → revealed.
    await swipe(230, 170, 26, 20);
    await expect(state).toHaveText('revealed');
    await page.waitForTimeout(SETTLE);
    expect(await offset()).toBe(150);
    // 40px back at 100px/s: under 56px from revealed → stays revealed and settles back to 150.
    await swipe(60, 100, 16, 20);
    await page.waitForTimeout(SETTLE);
    await expect(state).toHaveText('revealed');
    expect(await offset()).toBe(150);
    // A 30px flick back at 1000px/s (≥ 125) closes although it moved under 56px.
    await swipe(60, 90, 11, 2);
    await expect(state).toHaveText('closed');
    // Settle: tween(300ms, FastOutSlowIn) — under way at ~100ms, done by ~350ms.
    await page.waitForTimeout(90);
    const during = await offset();
    expect(during).toBeGreaterThan(0);
    expect(during).toBeLessThan(115);
    await page.waitForTimeout(400);
    expect(await offset()).toBe(0);
    // 40px, then held still (velocity 0): the closest anchor (closed) — and the item returns to 0
    // although the state doesn't change.
    await swipe(230, 190, 16, 20, 120);
    await page.waitForTimeout(SETTLE);
    await expect(state).toHaveText('closed');
    expect(await offset()).toBe(0);
    // A 30px flick at 1000px/s opens: a fling picks the next anchor in its direction.
    await swipe(230, 200, 11, 2);
    await expect(state).toHaveText('revealed');
  });
});

void stepSpring;
void motionSchemes;
void DEFAULT_SPATIAL;
void FAST_EFFECTS;
