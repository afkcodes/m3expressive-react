/**
 * Live motion checks for List, Menu, Tabs, Navigation and App bars against the Compose
 * material3 sources (androidx-main): transition specs per state, sampled values against the
 * spring maths, gesture outcomes. Runs with motion enabled (the config defaults to reduced).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { stepSpring } from '../../packages/m3/src/motion/spring.ts';
import { motionSchemes } from '../../packages/m3/src/motion/tokens.ts';
import { railItemGeometry } from '../../packages/m3/src/components/Navigation/railMorph.ts';
import { compareImages } from './compare.ts';
import { captureRegion, hexToRgb } from './capture.ts';
import { REFS_DIR, type Manifest } from './manifest.ts';

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

  test('dragged: one state layer at 16%, the ripple stays mounted, z-index held while the shadow leaves', async ({
    page,
  }) => {
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
    expect(
      await item.evaluate(
        (el) => (window as unknown as { __layer: Element }).__layer === el.querySelector(':scope > span[aria-hidden]'),
      ),
    ).toBe(true);
    await page.waitForTimeout(SETTLE);
    expect(await layers.first().evaluate((el) => getComputedStyle(el).opacity)).toBe('0.16');
    // Un-drag: the shadow animates out on fast spatial and the item stays lifted until it has.
    await toggle.evaluate((b) => (b as HTMLButtonElement).click());
    const t0 = Date.now();
    const samples: { t: number; z: string; layer: string }[] = [];
    while (Date.now() - t0 < 700) {
      const [z, layer] = await item.evaluate((el) => [
        getComputedStyle(el).zIndex,
        getComputedStyle(el.querySelector(':scope > span[aria-hidden]')!).opacity,
      ]);
      samples.push({ t: Date.now() - t0, z: z, layer: layer });
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

  test('expandable: the panel springs on fast spatial and its items slide down anchored to its bottom', async ({
    page,
  }) => {
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
    for (const s of mid)
      expect(Math.abs(s.gap), `list bottom on the panel bottom (h ${s.panelH})`).toBeLessThanOrEqual(1);
  });

  test('swipe: release follows velocity (125px/s) and the 56px positional threshold, settles on a 300ms tween', async ({
    page,
  }) => {
    const node = await open(page, '/fixture/list/live-swipe');
    const state = page.locator('[data-state]');
    const item = node.locator('div[style*="translateX"]');
    const offset = () =>
      item.evaluate((el) => {
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
            el.dispatchEvent(
              new PointerEvent(type, {
                bubbles: true,
                pointerId: 7,
                pointerType: 'touch',
                isPrimary: true,
                button: 0,
                clientX: r.left + x,
                clientY: y,
              }),
            );
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

/**
 * Sample `read(el)` every animation frame for `ms`, in-page (values with their time in ms). The
 * optional `act(el)` runs right after the first sample (e.g. a click), so the motion starts in view.
 */
async function sampleFrames<T>(el: Locator, read: string, ms: number, act?: string): Promise<{ t: number; v: T }[]> {
  const frames = await el.evaluate(
    (node, o) =>
      new Promise<{ t: number; v: unknown }[]>((resolve) => {
        const fn = new Function('el', `return (${o.read})(el)`) as (e: Element) => unknown;
        const action = o.act ? (new Function('el', `return (${o.act})(el)`) as (e: Element) => unknown) : null;
        const out: { t: number; v: unknown }[] = [];
        const t0 = performance.now();
        const tick = (now: number) => {
          out.push({ t: now - t0, v: fn(node) });
          if (out.length === 1) action?.(node);
          if (now - t0 < o.ms) requestAnimationFrame(tick);
          else resolve(out);
        };
        requestAnimationFrame(tick);
      }),
    { read, ms, act },
  );
  return frames as { t: number; v: T }[];
}

/**
 * Frames sampled from a value springing `from` → `to` (starting at rest) follow `stepSpring`: the
 * start time is fitted (it falls between two frames), then every moving frame must sit within 2%
 * of the travel (+1px rounding) of the spring.
 */
function expectSpring(
  frames: { t: number; v: number }[],
  from: number,
  to: number,
  spring: { dampingRatio: number; stiffness: number },
) {
  const start = frames.findIndex((f) => Math.abs(f.v - from) > 0.5);
  expect(start, 'the value moves').toBeGreaterThan(0);
  const moving = frames.slice(start, start + 20);
  const lo = frames[start - 1]!.t;
  const hi = frames[start]!.t;
  let best = { err: Infinity, t0: lo };
  for (let t0 = lo - 20; t0 <= hi; t0 += 0.25) {
    const err = Math.max(
      ...moving.map((f) => Math.abs(f.v - stepSpring(spring, { value: from, velocity: 0 }, to, f.t - t0).value)),
    );
    if (err < best.err) best = { err, t0 };
  }
  expect(best.err, `max deviation from the spring (start fitted at ${best.t0.toFixed(1)}ms)`).toBeLessThan(
    Math.abs(to - from) * 0.02 + 1,
  );
}

// ── Menu ──────────────────────────────────────────────────────────────────────────────────────
test.describe('menu motion', () => {
  /** Compose calculateTransformOrigin from live rects (px from the menu's top-left). */
  const composeOrigin = (anchor: Locator, menu: Locator) =>
    Promise.all([
      anchor.boundingBox(),
      menu.evaluate((el) => {
        const r = el.parentElement!.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      }),
    ]).then(([a, m]) => {
      const axis = (a0: number, a1: number, m0: number, m1: number) =>
        m0 >= a1 ? 0 : m1 <= a0 ? m1 - m0 : (Math.max(a0, m0) + Math.min(a1, m1)) / 2 - m0;
      return [axis(a!.x, a!.x + a!.width, m.x, m.x + m.width), axis(a!.y, a!.y + a!.height, m.y, m.y + m.height)];
    });
  const originOf = (menu: Locator) =>
    menu.evaluate((el) => getComputedStyle(el).transformOrigin.split(' ').map(parseFloat));

  test('popup scales from the centre of its overlap with the anchor (Menu.kt calculateTransformOrigin)', async ({
    page,
  }) => {
    await open(page, '/fixture/menu/live');
    const trigger = page.getByRole('button', { name: 'Options' });
    await trigger.click();
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    // Already right while the open transition runs.
    const early = await originOf(menu);
    const expected = await composeOrigin(trigger, menu);
    expect(expected[1]).toBe(0);
    expect(early[0]).toBeCloseTo(expected[0]!, 1);
    expect(early[1]).toBeCloseTo(0, 1);
    expect(await transitionOf(menu, 'scale')).toMatchObject({ duration: FAST_SPATIAL });
    expect(await transitionOf(menu, 'opacity')).toMatchObject({ duration: FAST_EFFECTS });
    // Base UI's own origin is the aligned edge offset by the side gap — not what Compose uses.
    const baseUi = await menu.evaluate((el) =>
      getComputedStyle(el.parentElement!).getPropertyValue('--transform-origin').trim(),
    );
    expect(baseUi).not.toBe(`${expected[0]}px 0px`);
  });

  test('submenu scales from (0, the middle of its overlap with the trigger item)', async ({ page }) => {
    await open(page, '/fixture/menu/live-motion');
    await page.getByRole('button', { name: 'More' }).click();
    const share = page.getByRole('menuitem', { name: 'Share' });
    await share.hover();
    const sub = page.getByRole('menu').filter({ has: page.getByRole('menuitem', { name: 'Email' }) });
    await expect(sub).toBeVisible();
    await page.waitForTimeout(SETTLE);
    const expected = await composeOrigin(share, sub);
    expect(expected[0]).toBe(0);
    const got = await originOf(sub);
    expect(got[0]).toBeCloseTo(0, 1);
    expect(got[1]).toBeCloseTo(expected[1]!, 1);
    expect(got[1]).toBeGreaterThan(0);
  });

  test('selectedLeading expands in on fast spatial and fades on fast effects (Menu.kt AnimatedVisibility)', async ({
    page,
  }) => {
    await open(page, '/fixture/menu/live-motion');
    await page.getByRole('button', { name: 'More' }).click();
    const item = page.getByRole('menuitemcheckbox', { name: 'Word wrap' });
    await expect(item).toBeVisible();
    await page.waitForTimeout(SETTLE);
    // check svg → its 20px icon box → the animated slot
    const slot = item.locator('svg').first().locator('xpath=../..');
    const box = () =>
      slot.evaluate((el) => ({ w: el.getBoundingClientRect().width, o: Number(getComputedStyle(el).opacity) }));
    expect(await box()).toEqual({ w: 0, o: 0 });
    expect(await transitionOf(slot, 'width')).toMatchObject({ duration: FAST_SPATIAL });
    expect(await transitionOf(slot, 'opacity')).toMatchObject({ duration: FAST_EFFECTS });
    const label = item.getByText('Word wrap');
    const labelX = async () => (await label.boundingBox())!.x - (await item.boundingBox())!.x;
    const x0 = await labelX();
    await item.click();
    await expect(item).toHaveAttribute('aria-checked', 'true');
    const frames = await sampleFrames<number>(slot, '(el) => el.getBoundingClientRect().width', 500);
    const widths = frames.map((f) => f.v);
    expect(Math.max(...widths), 'fast spatial overshoots (Compose spring)').toBeGreaterThan(20.5);
    expect(widths.at(-1)).toBeCloseTo(20, 1);
    expect((await box()).o).toBe(1);
    // The label moves over by the icon (the 8px gap was already there).
    expect((await labelX()) - x0).toBeCloseTo(20, 0);
    await item.click();
    await expect(item).toHaveAttribute('aria-checked', 'false');
    await page.waitForTimeout(SETTLE);
    expect(await box()).toEqual({ w: 0, o: 0 });
  });
});

// ── Tabs ──────────────────────────────────────────────────────────────────────────────────────
test.describe('tabs motion', () => {
  /** ScrollableTabData.calculateTabOffset for the selected tab. */
  const centredOffset = (list: Locator) =>
    list.evaluate((el) => {
      const tab = el.querySelector<HTMLElement>('[data-active]')!;
      const visible = el.clientWidth;
      const centred = tab.offsetLeft - (Math.trunc(visible / 2) - Math.trunc(tab.offsetWidth / 2));
      return Math.min(Math.max(0, el.scrollWidth - visible), Math.max(0, centred));
    });

  test('the indicator springs to the new tab on default spatial (not snapped by the resize observer)', async ({
    page,
  }) => {
    await open(page, '/fixture/tabs/live');
    const list = page.getByRole('tablist');
    const indicatorX = `(el) => [...el.querySelectorAll(':scope > span[aria-hidden]')].at(-1).getBoundingClientRect().x - el.getBoundingClientRect().x`;
    const from = (await sampleFrames<number>(list, indicatorX, 10))[0]!.v;
    const frames = await sampleFrames<number>(
      list,
      indicatorX,
      700,
      `(el) => el.querySelectorAll('[role=tab]')[2].click()`,
    );
    const to = frames.at(-1)!.v;
    expect(to).toBeGreaterThan(from + 100);
    expectSpring(frames, from, to, motionSchemes.expressive['default-spatial']);
  });

  test('scrollable row centres the selected tab on the default spatial spring, also on first layout', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/fixture/tabs/live-scroll');
    const list = page.getByRole('tablist');
    // First layout: Compose animates to the selected tab (not a jump, not left at 0).
    const first = await sampleFrames<number>(list, '(el) => el.scrollLeft', 700);
    const target0 = await centredOffset(list);
    expect(target0).toBeGreaterThan(0);
    expect(
      first.some((f) => f.v > 0 && f.v < target0 - 1),
      'animated',
    ).toBe(true);
    expect(first.at(-1)!.v).toBeCloseTo(target0, 0);
    // Both edge paddings are scrollable (layoutWidth = 2 × 52 + tabs).
    const ends = await list.evaluate((el) => {
      const last = el.querySelector<HTMLElement>('[role=tab]:last-of-type')!;
      return el.scrollWidth - (last.offsetLeft + last.offsetWidth);
    });
    expect(ends).toBe(52);
    // A new selection: sampled scroll follows a default-spatial spring from rest.
    const from = target0;
    const frames = await sampleFrames<number>(
      list,
      '(el) => el.scrollLeft',
      700,
      `(el) => [...el.querySelectorAll('[role=tab]')][6].click()`,
    );
    await expect(page.getByRole('tab', { name: 'Section 7' })).toHaveAttribute('aria-selected', 'true');
    const to = await centredOffset(list);
    expect(to).not.toBe(from);
    expectSpring(frames, from, to, motionSchemes.expressive['default-spatial']);
    expect(frames.at(-1)!.v).toBeCloseTo(to, 0);
    // The last tab: clamped to the end.
    await page.getByRole('tab', { name: 'Section 10' }).click();
    await page.waitForTimeout(SETTLE);
    expect(await list.evaluate((el) => el.scrollWidth - el.clientWidth - el.scrollLeft)).toBeLessThanOrEqual(1);
  });
});

/** Parity of `el` against a kit variant (the variant's render bounds around `el`). */
async function expectKit(page: Page, el: Locator, component: string, variant: string) {
  const m = JSON.parse(readFileSync(join(REFS_DIR, `${component}/manifest.json`), 'utf8')) as Manifest;
  const v = m.variants[variant]!;
  const ref: Buffer = readFileSync(join(REFS_DIR, component, `${variant}.png`));
  const r = compareImages(ref, await captureRegion(page, el, v.renderBounds ?? [0, 0, v.size[0], v.size[1]]), {
    background: hexToRgb(v.background ?? '#FFFFFF'),
  });
  test.info().annotations.push({
    type: 'parity',
    description: `${variant} (live): ${r.diffPixels} drift px · ${r.aaPixels} AA`,
  });
  expect.soft(r.diffPixels, variant).toBeLessThanOrEqual(v.allowedDiffPixels ?? 0);
}

// ── Navigation ────────────────────────────────────────────────────────────────────────────────
test.describe('navigation motion', () => {
  test('rail collapse ⇄ expand: one default-spatial progress morphs width, items and labels; rest frames are the kit', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 1000 });
    await open(page, '/fixture/navigation/live-rail');
    const nav = page.getByRole('navigation');
    await expectKit(page, nav, 'navigation', 'nrail-top-4');
    const read = `(nav) => {
      const n = nav.getBoundingClientRect();
      const item = nav.querySelectorAll('button[aria-current], button[aria-current] ~ button')[1];
      const r = item.getBoundingClientRect();
      const label = [...item.querySelectorAll('span')].find((e) => e.textContent === 'Label' && !e.style.visibility && getComputedStyle(e).visibility !== 'hidden');
      const l = label.getBoundingClientRect();
      return { w: n.width, x: r.x - n.x, iw: r.width, ih: r.height, lx: l.x - r.x, lo: Number(getComputedStyle(label).opacity), fs: parseFloat(getComputedStyle(label).fontSize) };
    }`;
    type F = { w: number; x: number; iw: number; ih: number; lx: number; lo: number; fs: number };
    const menu = `(nav) => nav.querySelector('button[aria-label="Menu"]').click()`;
    const expand = await sampleFrames<F>(nav, read, 700, menu);
    await page.mouse.move(600, 900);
    await page.waitForTimeout(SETTLE);
    await expectKit(page, nav, 'navigation', 'nrailx-docked-top-4');
    // The expanded label width (hug box): item = 16 + 24 + 8 + label + 16.
    const restItem = await nav.getByRole('button', { name: 'Label' }).nth(1).boundingBox();
    const labelStart = restItem!.width - 64;
    // The collapsed label width only matters under halfway while collapsing (not sampled below).
    const metrics = { topWidth: 30, topHeight: 16, startWidth: labelStart, startHeight: 20 };
    const spring = motionSchemes.expressive['default-spatial'];
    expectSpring(
      expand.map((f) => ({ t: f.t, v: f.v.w })),
      96,
      220,
      spring,
    );
    expect(Math.max(...expand.map((f) => f.v.w)), 'the rail overshoots 220 (spatial spring)').toBeGreaterThan(220.5);
    const mid = expand.filter((f) => f.v.w > 97 && f.v.w < 219);
    expect(mid.length).toBeGreaterThan(5);
    for (const { v } of mid) {
      const p = (v.w - 96) / 124;
      expect(v.x, 'items start at the rail edge mid-morph').toBeCloseTo(0, 1);
      expect(v.fs, 'expanding uses the expanded text style throughout').toBe(14);
      const g = railItemGeometry(p, true, metrics);
      expect(Math.abs(v.iw - g.width), `item width at p ${p.toFixed(2)}`).toBeLessThanOrEqual(1);
      expect(Math.abs(v.ih - g.height), `item height at p ${p.toFixed(2)}`).toBeLessThanOrEqual(1);
      expect(v.lo).toBeCloseTo(Math.min(1, 4 * (p - 0.5) ** 2), 2);
      if (p >= 0.5)
        expect(Math.abs(v.lx - (68 - 20 * (1 - p)) * p), `label x at p ${p.toFixed(2)}`).toBeLessThanOrEqual(0.6);
    }
    // Collapse: the label keeps the expanded style until halfway, then jumps under the icon.
    const collapse = await sampleFrames<F>(nav, read, 700, menu);
    await page.mouse.move(600, 900);
    await page.waitForTimeout(SETTLE);
    await expectKit(page, nav, 'navigation', 'nrail-top-4');
    expectSpring(
      collapse.map((f) => ({ t: f.t, v: f.v.w })),
      220,
      96,
      spring,
    );
    for (const { v } of collapse.filter((f) => f.v.w > 97 && f.v.w < 219)) {
      const p = (v.w - 96) / 124;
      expect(v.fs).toBe(p < 0.5 ? 12 : 14);
      expect(
        Math.abs(v.ih - railItemGeometry(p, false, metrics).height),
        `item height at p ${p.toFixed(2)}`,
      ).toBeLessThanOrEqual(1);
      if (p >= 0.5) expect(Math.abs(v.lx - 68 * p), `label x at p ${p.toFixed(2)}`).toBeLessThanOrEqual(0.6);
    }
  });

  test('indicator alpha and width share one progress: rail from its start edge, bar from its centre', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 1000 });
    await open(page, '/fixture/navigation/live-rail');
    const items = page.getByRole('navigation').getByRole('button', { name: 'Label' });
    const fill = items.nth(2).locator('span[aria-hidden]').first();
    expect(await transitionOf(fill, 'width')).toMatchObject({ duration: DEFAULT_SPATIAL });
    expect(await transitionOf(fill, 'opacity')).toMatchObject({ duration: DEFAULT_SPATIAL });
    const pillLeft = await items
      .nth(2)
      .evaluate((el) => (el.querySelector('span') as HTMLElement).getBoundingClientRect().x);
    const frames = await sampleFrames<{ x: number; w: number; o: number }>(
      fill,
      '(el) => { const r = el.getBoundingClientRect(); return { x: r.x, w: r.width, o: Number(getComputedStyle(el).opacity) }; }',
      600,
      '(el) => el.closest("button").click()',
    );
    const growing = frames.filter((f) => f.v.w > 0.5 && f.v.w < 55.5);
    expect(growing.length).toBeGreaterThan(3);
    for (const f of growing) {
      expect(f.v.x, 'grows from the start edge').toBeCloseTo(pillLeft, 1);
      expect(f.v.o, 'alpha = progress = width / 56 (clamped at 1)').toBeCloseTo(Math.min(1, f.v.w / 56), 1);
    }
    expect(frames.at(-1)!.v).toMatchObject({ w: 56, o: 1 });

    await open(page, '/fixture/navigation/live');
    const bar = page.getByRole('navigation').getByRole('button');
    const barFill = bar.nth(2).locator('span[aria-hidden]').first();
    const centre = await bar.nth(2).evaluate((el) => {
      const r = (el.querySelector('span') as HTMLElement).getBoundingClientRect();
      return r.x + r.width / 2;
    });
    const barFrames = await sampleFrames<{ c: number; w: number; o: number }>(
      barFill,
      '(el) => { const r = el.getBoundingClientRect(); return { c: r.x + r.width / 2, w: r.width, o: Number(getComputedStyle(el).opacity) }; }',
      600,
      '(el) => el.closest("button").click()',
    );
    for (const f of barFrames.filter((f) => f.v.w > 0.5 && f.v.w < 55.5)) {
      expect(f.v.c, 'grows from the centre').toBeCloseTo(centre, 1);
      expect(f.v.o).toBeCloseTo(Math.min(1, f.v.w / 56), 1);
    }
  });

  test('bar icon / label colours switch instantly; rail labels fade on default effects (NavigationItem.kt)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 1000 });
    await open(page, '/fixture/navigation/live');
    const barItem = page.getByRole('navigation').getByRole('button').nth(1);
    expect(await transitionOf(barItem, 'color')).toBeNull();
    expect(await transitionOf(barItem.getByText('Label'), 'color')).toBeNull();
    expect(await transitionOf(barItem.locator('svg').locator('xpath=..'), 'color')).toBeNull();
    await open(page, '/fixture/navigation/live-rail');
    const railItem = page.getByRole('navigation').getByRole('button', { name: 'Label' }).nth(1);
    // The label inherits the item's colour, which fades (and keeps fading across the rail morph).
    expect(await transitionOf(railItem, 'color')).toMatchObject({ duration: DEFAULT_EFFECTS });
    expect(await railItem.getByText('Label').evaluate((el) => getComputedStyle(el).color)).toBe(
      await railItem.evaluate((el) => getComputedStyle(el).color),
    );
    expect(await transitionOf(railItem.locator('svg').locator('xpath=..'), 'color')).toBeNull();
    // The icon has its own colour in both states (deselecting doesn't inherit a fading one).
    const icon = page
      .getByRole('navigation')
      .getByRole('button', { name: 'Label' })
      .nth(0)
      .locator('svg')
      .locator('xpath=..');
    const selectedColor = await icon.evaluate((el) => getComputedStyle(el).color);
    await railItem.click();
    expect(await icon.evaluate((el) => getComputedStyle(el).color)).not.toBe(selectedColor);
  });
});

// ── App bars ──────────────────────────────────────────────────────────────────────────────────
test.describe('app bar motion', () => {
  /** FastOutLinearInEasing = cubic-bezier(0.4, 0, 1, 1). */
  const foli = (f: number) => {
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 40; i++) {
      const t = (lo + hi) / 2;
      if (3 * 0.4 * t * (1 - t) ** 2 + 3 * t * t * (1 - t) + t ** 3 < f) lo = t;
      else hi = t;
    }
    const t = (lo + hi) / 2;
    return 3 * t * t * (1 - t) + t ** 3;
  };
  type Bar = { h: number; gap: number; titleGap: number; clip: string; bg: string; top: number };
  const READ = `(scroll) => {
    const header = document.querySelector('header');
    const hr = header.getBoundingClientRect();
    const content = scroll.firstElementChild.getBoundingClientRect();
    const big = header.lastElementChild;
    return {
      h: hr.height,
      gap: content.top - hr.bottom,
      titleGap: hr.bottom - big.getBoundingClientRect().bottom,
      clip: getComputedStyle(big).clipPath,
      bg: getComputedStyle(header).backgroundColor,
      top: scroll.scrollTop,
    };
  }`;

  test('medium bar: the scroll collapses the bar first — content and title ride its edge (exitUntilCollapsed)', async ({
    page,
  }) => {
    await open(page, '/fixture/app-bar/live');
    const scroll = page.locator('[data-scroll]');
    const header = page.locator('header');
    expect(await header.evaluate((el) => getComputedStyle(el).transitionProperty)).toBe('none');
    const rest = (await sampleFrames<Bar>(scroll, READ, 20))[0]!.v;
    expect(rest).toMatchObject({ h: 112, top: 0, clip: 'none', bg: 'rgba(0, 0, 0, 0)' });
    // A wheel scroll of 30px (f 0.625): the content keeps its gap to the bar's edge throughout,
    // then the bar snaps shut (f ≥ 0.5) on default effects.
    await scroll.hover();
    const sampling = sampleFrames<Bar>(scroll, READ, 1200);
    await page.mouse.wheel(0, 30);
    const frames = (await sampling).map((f) => f.v);
    const moving = frames.filter((f) => f.h < 111.5 && f.h > 64.5);
    expect(moving.length, 'caught the collapse mid-way').toBeGreaterThan(3);
    for (const f of moving) {
      expect(f.gap, 'content stays on the bar edge (1:1)').toBeCloseTo(rest.gap, 0);
      // The big title is bottom-anchored: it rides up with the edge, clipped under the top row.
      expect(f.titleGap).toBeCloseTo(0, 0);
      const c = 112 - f.h;
      expect(f.clip).toBe(`inset(${Math.round((8 + c) * 1000) / 1000}px 0px 0px)`.replace('.0px', 'px'));
      // Colour: lerp(flat, Surface Container, FastOutLinearIn(f)) — the mix's alpha.
      const alpha = Number(/\/ ([\d.]+)\)$/.exec(f.bg)?.[1] ?? (f.bg.startsWith('rgba(0, 0, 0, 0)') ? 0 : 1));
      expect(alpha).toBeCloseTo(foli(c / 48), 1);
    }
    const last = frames.at(-1)!;
    expect(last).toMatchObject({ h: 64, top: 48, bg: 'rgb(243, 237, 247)' });
    expect(last.gap).toBeCloseTo(rest.gap, 0);
  });

  test('medium bar: stopping under halfway snaps open on the default effects spring (settleAppBar)', async ({
    page,
  }) => {
    await open(page, '/fixture/app-bar/live');
    const scroll = page.locator('[data-scroll]');
    const frames = await sampleFrames<Bar>(scroll, READ, 900, '(el) => el.scrollTo({ top: 18, behavior: "instant" })');
    const tops = frames.map((f) => f.v.top);
    expect(Math.max(...tops)).toBe(18);
    expect(tops.at(-1)).toBe(0);
    expect(frames.at(-1)!.v.h).toBe(112);
    // Critically damped: back to 0 without overshoot.
    expect(Math.min(...tops)).toBe(0);
    const at18 = tops.indexOf(18);
    const settle = frames.slice(at18).map((f) => ({ t: f.t, v: f.v.top }));
    expectSpring(settle, 18, 0, motionSchemes.expressive['default-effects']);
  });

  test('bottom bar hides with the scroll, returns on any scroll back, snaps on fast spatial (exitAlways)', async ({
    page,
  }) => {
    await open(page, '/fixture/app-bar/live-bottom');
    const scroll = page.locator('[data-scroll]');
    const bar = page.getByRole('toolbar').locator('xpath=..');
    const height = () => bar.evaluate((el) => el.getBoundingClientRect().height);
    expect(await height()).toBe(80);
    await scroll.hover();
    await page.mouse.wheel(0, 30);
    // The offset follows the scroll (80 − 30), then snaps back (f 0.375 < 0.5).
    const frames = await sampleFrames<number>(bar, '(el) => el.getBoundingClientRect().height', 1200);
    const hs = frames.map((f) => f.v);
    expect(Math.min(...hs)).toBeLessThan(60);
    expect(hs.at(-1)).toBe(80);
    expect(Math.max(...hs), 'clamped at the full height (BottomAppBarState)').toBe(80);
    // Further down: past halfway, it hides completely; its content stays top-placed (clipped).
    await page.mouse.wheel(0, 50);
    await expect.poll(height, { timeout: 3000 }).toBe(0);
    // Any scroll back shows it again by the same amount.
    await page.mouse.wheel(0, -20);
    await expect.poll(height, { timeout: 3000 }).toBe(0);
    const tops = await page
      .getByRole('toolbar')
      .evaluate((el) => el.getBoundingClientRect().top - el.parentElement!.getBoundingClientRect().top);
    expect(tops).toBe(0);
  });
});

void stepSpring;
void motionSchemes;
void DEFAULT_SPATIAL;
void FAST_EFFECTS;
