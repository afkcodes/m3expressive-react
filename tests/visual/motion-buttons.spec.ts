/**
 * Live motion of the button family against the Compose Material 3 sources (androidx-main):
 * which spring / tween each property runs on, and the shape of the motion (bounce or not,
 * order, end state). Static frames are covered by figma-parity.spec.ts.
 */
import { expect, test, type Locator } from '@playwright/test';
import { settleTimeMs } from '../../packages/m3/src/motion/spring.ts';
import { motionSchemes, type SpringToken } from '../../packages/m3/src/motion/tokens.ts';
import { recordFrames } from './helpers/frames.ts';
import { enableMotion, openFixture } from './helpers/page.ts';
import { moveToCentre } from './helpers/pointer.ts';
import { settle } from './helpers/settle.ts';
import { computedStyle, transitionOf } from './helpers/styles.ts';

/** Computed CSS duration of a motion token, e.g. "0.231s". */
const dur = (token: SpringToken) => `${settleTimeMs(motionSchemes.expressive[token]) / 1000}s`;
const DE = dur('default-effects');
const FS = dur('fast-spatial');
/** Compose ElevationDefaults (internal/Elevation.kt). */
const ELEV_IN = 'cubic-bezier(0.4, 0, 0.2, 1)';
const ELEV_OUT = 'cubic-bezier(0.4, 0, 0.6, 1)';

test.beforeEach(async ({ page }) => enableMotion(page));

/** Highest value of a CSS linear() easing: > 1 means the spring overshoots. */
function linearPeak(easing: string) {
  const inner = /linear\((.*)\)/.exec(easing)?.[1] ?? '';
  return Math.max(...inner.split(',').map((stop) => parseFloat(stop.trim())));
}

/**
 * Record a number every frame for `ms` (a computed style property, or the element's border-box
 * width via `width`), starting before `action` runs.
 */
async function sample(loc: Locator, what: string, ms: number, action: () => Promise<void>) {
  const frames = await recordFrames(
    loc,
    ms,
    (prop) => (el) =>
      prop === 'width' ? el.getBoundingClientRect().width : parseFloat(getComputedStyle(el).getPropertyValue(prop)),
    { arg: what },
  );
  await action();
  return (await frames()).map((f) => f.v);
}

// ── 1. Shape morph springs ───────────────────────────────────────────────────────────────────
test('shape morph: DefaultEffects (no bounce) for buttons, icon buttons, split buttons; FastSpatial for toggle buttons and connected segments', async ({
  page,
}) => {
  const expectSpring = async (loc: Locator, duration: string, label: string) => {
    const t = await transitionOf(loc);
    expect.soft(t.property.split(', ')[0], `${label}: property`).toBe('border-radius');
    expect.soft(t.duration.split(', ')[0], `${label}: duration`).toBe(duration);
    const peak = linearPeak(t.easing.split(/,\s*(?=linear|cubic)/)[0]!);
    if (duration === DE) expect.soft(peak, `${label}: no bounce`).toBeLessThanOrEqual(1);
    else expect.soft(peak, `${label}: spatial overshoot`).toBeGreaterThan(1);
  };
  let node = await openFixture(page, '/fixture/button/live');
  await expectSpring(node.locator('button > span').first(), DE, 'button');
  node = await openFixture(page, '/fixture/icon-button/live');
  await expectSpring(node.locator('button > span').first(), DE, 'icon button');
  node = await openFixture(page, '/fixture/toggle-icon-button/filled-live');
  await expectSpring(node.locator('button > span').first(), DE, 'toggle icon button');
  node = await openFixture(page, '/fixture/toggle-button/filled-live');
  await expectSpring(node.locator('button > span').first(), FS, 'toggle button');
  node = await openFixture(page, '/fixture/button-group/connected-live');
  await expectSpring(node.locator('button > span').first(), FS, 'connected segment');

  node = await openFixture(page, '/fixture/split-button/filled-live');
  const [lead, trail] = [node.locator('button').nth(0), node.locator('button').nth(1)];
  await expectSpring(lead.locator('> span').last(), DE, 'split leading');
  await expectSpring(trail.locator('> span').last(), DE, 'split trailing');
  const chevron = trail.locator('svg');
  expect
    .soft(await transitionOf(chevron), 'chevron optical offset')
    .toMatchObject({ property: 'translate', duration: DE });
  expect
    .soft(await transitionOf(chevron.locator('path')), 'chevron rotation')
    .toMatchObject({ property: 'rotate', duration: DE });
});

test('press morph runs live: icon button and button on DefaultEffects (no undershoot), toggle button on FastSpatial (undershoots)', async ({
  page,
}) => {
  const press = async (path: string, rest: number, pressed: number, bouncy: boolean) => {
    const node = await openFixture(page, path);
    const btn = node.locator('button').first();
    const box = btn.locator('> span').first();
    await moveToCentre(btn);
    await settle(page);
    const seen = await sample(box, 'border-top-left-radius', 500, () => page.mouse.down());
    const label = path.replace('/fixture/', '');
    expect.soft(seen[0], `${label}: starts at rest`).toBeCloseTo(rest, 1);
    expect.soft(seen.at(-1), `${label}: ends pressed`).toBeCloseTo(pressed, 1);
    expect
      .soft(
        seen.some((r) => r > pressed + 0.5 && r < rest - 0.5),
        `${label}: animates`,
      )
      .toBe(true);
    const min = Math.min(...seen);
    if (bouncy) expect.soft(min, `${label}: FastSpatial undershoot`).toBeLessThan(pressed - 0.5);
    else expect.soft(min, `${label}: no undershoot`).toBeGreaterThanOrEqual(pressed - 0.01);
    await page.mouse.up();
  };
  await press('/fixture/icon-button/live', 28, 12, false);
  await press('/fixture/button/live', 28, 12, false);
  await press('/fixture/toggle-button/filled-live', 28, 12, true);
});

// ── 2. Elevation tweens ──────────────────────────────────────────────────────────────────────
test('elevation: Compose ElevationDefaults tweens on XL elevated button, FAB, FAB menu, toolbar toggle; disabled snaps', async ({
  page,
}) => {
  const second = (t: { property: string; duration: string; easing: string }) => {
    const props = t.property.split(', ');
    const i = props.indexOf('box-shadow');
    const easings = t.easing.split(/,\s*(?=linear|cubic|ease)/);
    return { duration: t.duration.split(', ')[i], easing: easings[i] };
  };
  const check = async (target: Locator, styled: Locator, label: string) => {
    expect
      .soft(second(await transitionOf(styled)), `${label}: rest → out tween`)
      .toEqual({ duration: '0.12s', easing: ELEV_OUT });
    await moveToCentre(target);
    await settle(page);
    expect
      .soft(second(await transitionOf(styled)), `${label}: hover → in tween`)
      .toEqual({ duration: '0.12s', easing: ELEV_IN });
    await page.mouse.move(0, 0);
  };
  let node = await openFixture(page, '/fixture/button/elevated-xlarge-live');
  await check(node.locator('button'), node.locator('button > span').first(), 'XL elevated button');
  node = await openFixture(page, '/fixture/button/elevated-xlarge-disabled-live');
  expect
    .soft((await transitionOf(node.locator('button > span').first())).property, 'disabled: no shadow transition')
    .toBe('border-radius');
  node = await openFixture(page, '/fixture/fab/fab-live');
  await check(node.locator('button'), node.locator('button'), 'FAB');
  node = await openFixture(page, '/fixture/fab/extended-live');
  await check(node.locator('button'), node.locator('button'), 'extended FAB');
  node = await openFixture(page, '/fixture/fab-menu/live');
  await check(node.locator('button'), node.locator('button'), 'FAB menu toggle');
  node = await openFixture(page, '/fixture/toggle-button/toolbar-live');
  await check(node.locator('button'), node.locator('button > span').first(), 'toolbar toggle (lift)');
  expect
    .soft((await transitionOf(node.locator('button > span').first())).duration.split(', ')[0], 'toolbar toggle radius')
    .toBe(FS);
});

// ── 3. Split button chevron ──────────────────────────────────────────────────────────────────
test('split button: expanding rotates the chevron 180° without overshoot', async ({ page }) => {
  const node = await openFixture(page, '/fixture/split-button/filled-live');
  const trail = node.locator('button').nth(1);
  const path = trail.locator('svg path');
  const seen = await sample(path, 'rotate', 500, () => trail.click());
  expect.soft(seen.at(-1), 'expanded').toBeCloseTo(180, 1);
  expect.soft(Math.max(...seen), 'no overshoot').toBeLessThanOrEqual(180.01);
  expect
    .soft(
      seen.some((r) => r > 5 && r < 175),
      'animates',
    )
    .toBe(true);
});

// ── 4. Standard button group: press to widen ─────────────────────────────────────────────────
test('standard button group: the pressed button widens (FastSpatial), neighbours give way, the group keeps its width', async ({
  page,
}) => {
  const node = await openFixture(page, '/fixture/button-group/standard-live');
  const group = node.locator('[role=group]');
  const buttons = group.locator('button');
  const boxes = buttons.locator('> span:first-child');
  const widths = () => boxes.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().width));
  const groupW = (await group.boundingBox())!.width;
  const base = await widths();
  // Small buttons: compression limit = 16px end padding.
  const growth = Math.round(Math.min((0.15 * base[1]!) / 2, 16, 16));
  const middle = buttons.nth(1);
  await moveToCentre(middle);
  const seen = await sample(boxes.nth(1), 'width', 500, () => page.mouse.down());
  const held = await widths();
  expect.soft(held[1], 'middle grows by both neighbours').toBeCloseTo(base[1]! + 2 * growth, 1);
  expect.soft(held[0], 'start neighbour').toBeCloseTo(base[0]! - growth, 1);
  expect.soft(held[2], 'end neighbour').toBeCloseTo(base[2]! - growth, 1);
  expect.soft((await group.boundingBox())!.width, 'group width constant').toBeCloseTo(groupW, 1);
  expect.soft(Math.max(...seen), 'FastSpatial overshoot').toBeGreaterThan(base[1]! + 2 * growth);
  await page.mouse.up();
  await settle(page);
  expect.soft(await widths(), 'back to rest').toEqual(base);
  expect
    .soft(await boxes.evaluateAll((els) => els.map((e) => (e as HTMLElement).style.width)), 'no inline widths at rest')
    .toEqual(['', '', '']);

  // End item: the one neighbour gives round(p · min(0.15 · w, limit)).
  const endGrowth = Math.round(Math.min(0.15 * base[2]!, 16));
  await buttons.nth(2).focus();
  await page.keyboard.down('Space');
  await settle(page);
  const kb = await widths();
  expect.soft(kb[2], 'keyboard press widens the last item').toBeCloseTo(base[2]! + endGrowth, 1);
  expect.soft(kb[1], 'its neighbour gives way').toBeCloseTo(base[1]! - endGrowth, 1);
  await page.keyboard.up('Space');
  await settle(page);
  expect.soft(await widths(), 'released').toEqual(base);
});

// ── 5. Segmented button ──────────────────────────────────────────────────────────────────────
test('segmented button: label slides by half the icon slot, check fades + scales in, container colour snaps', async ({
  page,
}) => {
  const node = await openFixture(page, '/fixture/segmented-button/live');
  const items = node.locator('button');
  const label = (i: number) => items.nth(i).locator('span span').last();
  expect.soft(await computedStyle(label(1), 'translate'), 'unselected: centred (−13px)').toBe('-13px');
  expect.soft(await computedStyle(label(0), 'translate'), 'selected: 0').toBe('none');
  expect
    .soft(
      await items
        .nth(0)
        .locator('svg')
        .evaluate((e) => e.getAnimations().length),
      'initially selected: no enter animation',
    )
    .toBe(0);
  const container = items.nth(1).locator('> span').first();
  expect.soft((await transitionOf(container)).duration, 'container colour snaps').toBe('0s');
  expect
    .soft(await transitionOf(label(1)), 'label offset spring')
    .toMatchObject({ property: 'translate', duration: FS });

  const seen = await sample(label(1), 'translate', 500, () => items.nth(1).click());
  expect.soft(seen[0], 'starts at −13').toBeCloseTo(-13, 1);
  expect.soft(seen.at(-1) || 0, 'ends at 0').toBeCloseTo(0, 1);
  expect.soft(Math.max(...seen.map((v) => v || 0)), 'FastSpatial overshoot').toBeGreaterThan(0.2);
  const anims = await items
    .nth(1)
    .locator('svg')
    .evaluate((e) =>
      e
        .getAnimations()
        .map((a) => ({ name: (a as CSSAnimation).animationName, duration: a.effect?.getTiming().duration })),
    );
  // Animations finish within the sample window; replay one selection to inspect them.
  expect.soft(anims.length, 'check enter finished').toBe(0);
  await items.nth(2).click();
  const running = await items
    .nth(2)
    .locator('svg')
    .evaluate((e) => e.getAnimations().map((a) => Math.round(Number(a.effect?.getComputedTiming().duration))));
  expect
    .soft(
      running.sort((a, b) => a - b),
      'fade (DefaultEffects) + scale (FastSpatial)',
    )
    .toEqual([Math.round(parseFloat(DE) * 1000), Math.round(parseFloat(FS) * 1000)].sort((a, b) => a - b));

  const icons = await openFixture(page, '/fixture/segmented-button/live-icons');
  const seg = icons.locator('button').nth(1);
  // Slot: [icon span > svg, check svg].
  const [icon, check] = [seg.locator('svg').first().locator('..'), seg.locator('svg').last()];
  expect
    .soft(await computedStyle(seg.locator('span span').last(), 'translate'), 'icon + label: no offset')
    .toBe('none');
  expect.soft(await transitionOf(icon), 'icon crossfade').toMatchObject({ property: 'opacity', duration: DE });
  expect.soft(await transitionOf(check), 'check crossfade').toMatchObject({ property: 'opacity', duration: DE });
  await seg.click();
  await settle(page);
  expect.soft(await computedStyle(icon, 'opacity'), 'icon out').toBe('0');
  expect.soft(await computedStyle(check, 'opacity'), 'check in').toBe('1');
  expect.soft(await computedStyle(seg.locator('span span').last(), 'translate'), 'label stays').toBe('none');
});

// ── 6. Outlined toggle button stroke ─────────────────────────────────────────────────────────
test('outlined toggle button: selecting animates the stroke width to 0 (FastSpatial) and its colour to transparent (DefaultEffects)', async ({
  page,
}) => {
  const node = await openFixture(page, '/fixture/toggle-button/outlined-live');
  const btn = node.locator('button');
  const box = btn.locator('> span').first();
  expect
    .soft(await transitionOf(box, '::after'))
    .toMatchObject({ property: 'border-width, border-color', duration: `${FS}, ${DE}` });
  expect.soft(await computedStyle(box, 'border-top-width', '::after')).toBe('1px');
  await btn.click();
  const running = await box.evaluate((e) =>
    e
      .getAnimations({ subtree: true })
      .filter((a) => (a.effect as KeyframeEffect | null)?.pseudoElement === '::after')
      .map((a) => (a as CSSTransition).transitionProperty),
  );
  expect.soft(running, 'stroke transitions').toEqual(expect.arrayContaining(['border-top-width', 'border-top-color']));
  await settle(page);
  expect.soft(await computedStyle(box, 'border-top-width', '::after'), 'selected: no stroke').toBe('0px');
  await btn.click();
  await settle(page);
  expect.soft(await computedStyle(box, 'border-top-width', '::after'), 'unselected: stroke back').toBe('1px');
});

// ── 7. Extended FAB expand / collapse ────────────────────────────────────────────────────────
test('extended FAB: collapsing lerps the width to the FAB height on FastSpatial, fades and then removes the label', async ({
  page,
}) => {
  const node = await openFixture(page, '/fixture/fab/extended-toggle');
  const fab = node.locator('button');
  const full = (await fab.boundingBox())!.width;
  const seen = await sample(fab, 'width', 600, () => fab.click());
  expect.soft(seen[0], 'starts expanded').toBeCloseTo(full, 0);
  expect.soft(seen.at(-1), 'collapsed to the 56px square').toBeCloseTo(56, 1);
  expect.soft(Math.min(...seen), 'FastSpatial undershoot (Compose lerp is not clamped)').toBeLessThan(55.5);
  await expect(fab).toHaveAccessibleName('Extended');
  expect.soft(await computedStyle(fab, 'overflow'), 'clips while collapsed').toBe('hidden');
  const grow = await sample(fab, 'width', 600, () => fab.click());
  expect.soft(grow.at(-1), 'expanded again').toBeCloseTo(full, 1);
  expect.soft(Math.max(...grow), 'overshoot').toBeGreaterThan(full + 0.5);
  expect.soft(await fab.evaluate((e) => [e.style.width, e.style.overflow]), 'no overrides at rest').toEqual(['', '']);
  expect
    .soft(await computedStyle(fab.locator('span').filter({ hasText: 'Extended' }), 'opacity'), 'label opaque')
    .toBe('1');
});

// ── 8. FAB menu ──────────────────────────────────────────────────────────────────────────────
test('FAB menu: one toggle morphs on FastSpatial; items stagger in from the bottom and out from the top, each revealed from its end edge', async ({
  page,
}) => {
  const node = await openFixture(page, '/fixture/fab-menu/live');
  const toggle = node.getByRole('button', { name: 'Actions' });
  // Per-frame log: toggle radius + item visibility / clip.
  const opening = await recordFrames(node, 900, () => {
    let btn: Element | null = null;
    return (root) => {
      btn ??= root.querySelector('button[aria-haspopup]')!;
      const items = Array.from(root.querySelectorAll<HTMLElement>('[role=menuitem]'));
      return {
        r: parseFloat(getComputedStyle(btn).borderTopLeftRadius),
        vis: items.map(
          (i) => getComputedStyle(i).visibility !== 'hidden' && parseFloat(getComputedStyle(i).opacity) > 0,
        ),
        clip: items.some((i) => i.style.clipPath.startsWith('inset')),
      };
    };
  });
  await toggle.click();
  const log = (await opening()).map((f) => f.v);
  const close = node.getByRole('button', { name: 'Actions' });
  // Opening moves focus into the menu: the first item, once the stagger has drawn it.
  await expect(node.getByRole('menuitem', { name: 'First' })).toBeFocused();
  expect.soft(log[0]!.r, 'closed: 16px corners').toBeCloseTo(16, 1);
  expect.soft(Math.max(...log.map((l) => l.r)), 'FastSpatial overshoot past the 28px circle').toBeGreaterThan(28.3);
  expect
    .soft(await close.evaluate((e) => [e.style.borderRadius, e.style.backgroundColor]), 'rest: no inline overrides')
    .toEqual(['', '']);
  const firstShown = [0, 1, 2].map((i) => log.findIndex((l) => l.vis[i]));
  expect
    .soft(
      firstShown.every((f) => f >= 0),
      'all items shown',
    )
    .toBe(true);
  expect
    .soft(
      firstShown[2]! < firstShown[1]! && firstShown[1]! <= firstShown[0]!,
      `bottom first (frames ${firstShown.join(',')})`,
    )
    .toBe(true);
  expect
    .soft(
      log.some((l) => l.clip),
      'items reveal from the end edge (clipped width)',
    )
    .toBe(true);
  expect.soft(await close.locator('svg path').getAttribute('d'), 'close glyph').toMatch(/^M6\.4 19/);

  // Close: top item leaves first, the list unmounts after the last fade.
  const closing = await recordFrames(
    node,
    900,
    () => (root) =>
      Array.from(root.querySelectorAll<HTMLElement>('[role=menuitem]')).map(
        (i) => getComputedStyle(i).visibility !== 'hidden' && parseFloat(getComputedStyle(i).opacity) > 0,
      ),
  );
  await close.click();
  const hide = (await closing()).map((f) => f.v);
  // The list unmounts in the frame the last item reaches alpha 0: count that as hidden.
  const firstHidden = [0, 1, 2].map((i) => hide.findIndex((v) => v.length < 3 || !v[i]));
  expect
    .soft(
      firstHidden[0]! <= firstHidden[1]! && firstHidden[1]! < firstHidden[2]!,
      `top first (frames ${firstHidden.join(',')})`,
    )
    .toBe(true);
  await expect(node.locator('[role=menuitem]')).toHaveCount(0);
  await expect(node.getByRole('button', { name: 'Actions' })).toHaveAttribute('aria-expanded', 'false');
  expect.soft(await computedStyle(node.locator('button'), 'border-top-left-radius'), 'closed again').toBe('16px');
});

test('FAB menu: under reduced motion the toggle snaps, the stagger and fades remain', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const node = await openFixture(page, '/fixture/fab-menu/live');
  await node.getByRole('button', { name: 'Actions' }).click();
  expect
    .soft(await computedStyle(node.locator('button[aria-haspopup]'), 'border-top-left-radius'), 'snapped')
    .toBe('28px');
  await expect(node.locator('[role=menuitem]')).toHaveCount(3);
  await settle(page);
  expect
    .soft(
      await node.locator('[role=menuitem]').evaluateAll((els) => els.map((e) => getComputedStyle(e).opacity)),
      'all shown',
    )
    .toEqual(['1', '1', '1']);
});
