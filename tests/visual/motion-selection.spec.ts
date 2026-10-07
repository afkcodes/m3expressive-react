/**
 * Live motion parity with Jetpack Compose Material 3 for the selection / feedback components:
 * checkbox, radio, switch, chips, tooltips, snackbar. Each test names the Compose source it
 * checks. Transitions are inspected through the Web Animations API (paused at fixed times and
 * compared with the spring maths) rather than by sampling wall-clock frames.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { REFS_DIR, type Manifest } from './manifest';
import { stepSpring, type SpringParams } from '../../packages/m3/src/motion/spring.ts';
import { motionSchemes } from '../../packages/m3/src/motion/tokens.ts';

const spring = motionSchemes.expressive;
/** Value of a 0 → 1 spring after `ms`. */
const progress = (p: SpringParams, ms: number) => stepSpring(p, { value: 0, velocity: 0 }, 1, ms).value;

async function open(page: Page, component: string, variant: string) {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(`/fixture/${component}/${variant}`);
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(0, 0);
  const node = page.locator('[data-fixture-node]');
  await expect(node).toBeVisible();
  return node;
}

/**
 * Pause the running CSS transition of `property` on the element matched by `selector`, seek it to
 * each time in `times` (ms from its start, delay excluded) and read `read(el)` there.
 */
async function seek(page: Page, selector: string, property: string, times: number[], read: string) {
  return page.evaluate(
    ({ selector, property, times, read }) => {
      const el = document.querySelector(selector)!;
      const anim = el.getAnimations().find((a) => (a as CSSTransition).transitionProperty === property) as CSSTransition | undefined;
      if (!anim) return null;
      anim.pause();
      const timing = anim.effect!.getComputedTiming();
      const out = times.map((t) => {
        anim.currentTime = t + Number(timing.delay ?? 0);
        // eslint-disable-next-line no-new-func
        return new Function('el', `return ${read}`)(el) as string;
      });
      return { duration: timing.duration, delay: timing.delay, out };
    },
    { selector, property, times, read },
  );
}

const transitionOf = (page: Page, selector: string) =>
  page.evaluate((selector) => {
    const cs = getComputedStyle(document.querySelector(selector)!);
    return { property: cs.transitionProperty, duration: cs.transitionDuration, delay: cs.transitionDelay, easing: cs.transitionTimingFunction };
  }, selector);

const transitions = (page: Page, selector: string) =>
  page.evaluate((selector) => document.querySelector(selector)!.getAnimations().map((a) => (a as CSSTransition).transitionProperty).filter(Boolean), selector);

// ── Checkbox: Checkbox.kt CheckboxImpl + colorAnimationSpecForState ─────────────────────────
test.describe('checkbox motion', () => {
  const BOX = '[role=checkbox] [data-part=box]';
  const GLYPH = '[role=checkbox] svg';
  const PATH = '[role=checkbox] svg path';
  /** Clip inset right edge → drawn fraction of the glyph's 6 → 18 extent. */
  const drawn = (clip: string) => {
    const m = /inset\(([\d.]+)px(?: ([\d.]+)px)?(?: ([\d.]+)px)?(?: ([\d.]+)px)?\)/.exec(clip)!;
    const v = m.slice(1).filter(Boolean).map(Number);
    const right = v.length === 1 ? v[0]! : v[1]!;
    return (18 - right) / 12;
  };

  test('check draws on DefaultSpatial; box colour on DefaultEffects in, FastEffects out', async ({ page }) => {
    await open(page, 'checkbox', 'unselected-live');
    expect((await transitionOf(page, BOX)).duration, 'unchecked box: FastEffects').toBe('0.15s');
    await page.locator('[role=checkbox]').click();
    const t = await transitionOf(page, BOX);
    expect(t.duration, 'into checked: DefaultEffects').toBe('0.231s');
    expect(t.easing).toContain('linear(');
    const times = [30, 60, 100, 150, 250];
    const r = (await seek(page, GLYPH, 'clip-path', times, 'getComputedStyle(el).clipPath'))!;
    expect(r.duration, 'checkDrawFraction: DefaultSpatial').toBe(435);
    times.forEach((ms, i) => {
      expect.soft(Math.min(drawn(r.out[i]!), 1.2), `drawn at ${ms}ms`).toBeCloseTo(Math.min(progress(spring['default-spatial'], ms), 1.2), 2);
    });
  });

  test('uncheck: colour fades on FastEffects, the check snaps away after 100ms', async ({ page }) => {
    await open(page, 'checkbox', 'selected-live');
    await page.waitForTimeout(300);
    await page.locator('[role=checkbox]').click();
    expect((await transitionOf(page, BOX)).duration).toBe('0.15s');
    const clip = (await seek(page, GLYPH, 'clip-path', [-50, 0], 'getComputedStyle(el).clipPath'))!;
    expect([clip.duration, clip.delay], 'snap(delayMillis = 100)').toEqual([0, 100]);
    expect(drawn(clip.out[0]!), 'still drawn during the delay').toBeCloseTo(1, 5);
    expect(drawn(clip.out[1]!), 'gone after it').toBeCloseTo(0, 5);
    const fill = (await seek(page, GLYPH, 'fill', [0, 75, 150], 'getComputedStyle(el).fill'))!;
    expect(fill.duration, 'checkmark colour → transparent on FastEffects').toBe(150);
    expect(fill.out[2]).toBe('rgba(0, 0, 0, 0)');
  });

  test('check ⇄ indeterminate morphs on DefaultSpatial; from unchecked it snaps', async ({ page }) => {
    await open(page, 'checkbox', 'tristate-live');
    const d = () => page.evaluate((sel) => getComputedStyle(document.querySelector(sel)!).d, PATH);
    await page.click('[data-set=indeterminate]');
    expect(await transitions(page, PATH), 'off → indeterminate: no morph').toEqual([]);
    expect(await d()).toBe('path("M 12 13 L 6 13 L 6 11 L 12 11 L 18 11 L 18 13 L 12 13 Z")');
    await page.waitForTimeout(500);
    await page.click('[data-set=on]');
    const mid = (await seek(page, PATH, 'd', [60], 'getComputedStyle(el).d'))!;
    expect(mid.duration, 'checkCenterGravitationShiftFraction: DefaultSpatial').toBe(435);
    // 60ms in: the check's elbow (10, 16.4) is on its way from the dash centre (12, 13).
    const p = progress(spring['default-spatial'], 60);
    const [x, y] = /M ([\d.]+) ([\d.]+)/.exec(mid.out[0]!)!.slice(1).map(Number) as [number, number];
    expect.soft(x).toBeCloseTo(12 + (10 - 12) * p, 1);
    expect.soft(y).toBeCloseTo(13 + (16.4 - 13) * p, 1);
    await page.evaluate(() => document.getAnimations().forEach((a) => a.finish()));
    await page.click('[data-set=indeterminate]');
    expect(await transitions(page, PATH), 'on → indeterminate: morph').toEqual(['d']);
    await page.evaluate(() => document.getAnimations().forEach((a) => a.finish()));
    await page.click('[data-set=off]');
    const off = (await seek(page, PATH, 'd', [-1, 0], 'getComputedStyle(el).d'))!;
    expect([off.duration, off.delay], 'to unchecked: snap after 100ms').toEqual([0, 100]);
    expect(off.out[0], 'the dash stays through the delay').toContain('M 12 13');
    expect(off.out[1]).toContain('M 10 16.4');
  });

  test('disabled snaps the box colour', async ({ page }) => {
    await open(page, 'checkbox', 'selected-disabled');
    expect((await transitionOf(page, BOX)).duration).toBe('0s');
  });
});

// ── Radio: RadioButton.kt RadioButtonImpl ───────────────────────────────────────────────────
test.describe('radio motion', () => {
  test('dot radius springs on FastSpatial, drawn at r − 1dp and never below 0; colour on DefaultEffects', async ({ page }) => {
    await open(page, 'radio', 'live');
    const glyph = await transitionOf(page, '[role=radio] svg');
    expect([glyph.property, glyph.duration], 'radio colour: DefaultEffects').toEqual(['color', '0.231s']);
    expect(glyph.easing).toContain('linear(');
    await page.evaluate(() => document.querySelectorAll('[role=radio]').forEach((r, i) => r.setAttribute('data-i', String(i))));
    await page.getByRole('radio').nth(1).click();
    const leaving = '[role=radio][data-i="0"] svg path:nth-of-type(2)';
    const entering = '[role=radio][data-i="1"] svg path:nth-of-type(2)';
    const fast = spring['fast-spatial'];
    const times = [20, 60, 100, 120, 160, 250];
    const read = `[getComputedStyle(el).getPropertyValue('--m3x-radio-dot'), getComputedStyle(el).scale].join(' ')`;
    const out = (await seek(page, leaving, '--m3x-radio-dot', times, read))!;
    const inn = (await seek(page, entering, '--m3x-radio-dot', times, read))!;
    expect(out.duration, 'FastSpatial').toBe(369);
    let sawOvershoot = false;
    times.forEach((ms, i) => {
      const pOut = 1 - progress(fast, ms);
      const pIn = progress(fast, ms);
      const [vOut, sOut] = out.out[i]!.split(' ').map(Number) as [number, number];
      const [vIn, sIn] = inn.out[i]!.split(' ').map(Number) as [number, number];
      expect.soft(vOut, `leaving p at ${ms}ms`).toBeCloseTo(pOut, 2);
      expect.soft(vIn, `entering p at ${ms}ms`).toBeCloseTo(pIn, 2);
      expect.soft(sOut, `leaving scale at ${ms}ms = max(0, (6p − 1)/5)`).toBeCloseTo(Math.max(0, (6 * pOut - 1) / 5), 2);
      expect.soft(sIn, `entering scale at ${ms}ms`).toBeCloseTo(Math.max(0, (6 * pIn - 1) / 5), 2);
      if (vOut < 0) {
        sawOvershoot = true;
        expect(sOut, 'no dot while r ≤ 0').toBe(0);
      }
    });
    expect(sawOvershoot, 'the spring overshoots past 0 on deselect').toBe(true);
  });

  test('disabled snaps the colour', async ({ page }) => {
    await open(page, 'radio', 'selected-disabled');
    expect((await transitionOf(page, '[role=radio] svg')).duration).toBe('0s');
  });
});

// ── Switch: Switch.kt ThumbNode (SnapSpec while pressed) + SwitchImpl (no colour animation) ──
test('switch motion: press snaps into the 28px handle, release springs on FastSpatial; colours snap', async ({ page }) => {
  const node = await open(page, 'switch', 'live');
  const sw = node.getByRole('switch');
  const handle = '[role=switch] > span > span:last-child';
  const root = await transitionOf(page, '[role=switch]');
  expect(root.duration, 'track colour: not animated').toBe('0s');
  const b = (await sw.boundingBox())!;
  await page.mouse.move(b.x + 16, b.y + 16);
  await page.mouse.down();
  const pressed = await page.evaluate((sel) => ({ w: getComputedStyle(document.querySelector(sel)!).width, anims: document.querySelector(sel)!.getAnimations().length }), handle);
  expect(pressed, 'SnapSpec: 28px at once, nothing animating').toEqual({ w: '28px', anims: 0 });
  await page.mouse.up();
  await expect(sw).toHaveAttribute('aria-checked', 'true');
  const props = await transitions(page, handle);
  expect(props.sort(), 'release: size springs').toEqual(['height', 'width']);
  const w = (await seek(page, handle, 'width', [0, 369], 'getComputedStyle(el).width'))!;
  expect(w.duration, 'FastSpatial').toBe(369);
  expect(w.out).toEqual(['28px', '24px']);
  expect(await transitions(page, '[role=switch] > span'), 'thumb slides').toEqual(['translate']);
  expect(await transitions(page, '[role=switch]'), 'track colour snaps').toEqual([]);
});

// ── Chips: Chip.kt (animateElevation, AnimatingChipContent of the expressive SelectableChip) ──
test.describe('chips motion', () => {
  const chips = JSON.parse(readFileSync(join(REFS_DIR, 'chips/manifest.json'), 'utf8')) as Manifest;

  test('elevation uses the Compose elevation tweens; container colour is not animated', async ({ page }) => {
    const node = await open(page, 'chips', 'filter-live');
    const elevated = node.locator('button').nth(1);
    await elevated.evaluate((e) => e.setAttribute('data-probe', ''));
    let t = await transitionOf(page, '[data-probe]');
    expect([t.property, t.duration, t.easing], 'rest: outgoing 120ms cubic(0.4, 0, 0.6, 1)').toEqual(['box-shadow', '0.12s', 'cubic-bezier(0.4, 0, 0.6, 1)']);
    await elevated.hover();
    t = await transitionOf(page, '[data-probe]');
    expect([t.duration, t.easing], 'hover: incoming 120ms FastOutSlowIn').toEqual(['0.12s', 'cubic-bezier(0.4, 0, 0.2, 1)']);
    await open(page, 'chips', 'filter-el-label-disabled-f-f');
    expect((await transitionOf(page, '[data-fixture-node] button')).duration, 'disabled snaps').toBe('0s');
  });

  test('icon-less filter chip: the check expands from the start (FastSpatial) and fades (DefaultEffects); widths stay the kit\'s', async ({ page }) => {
    const node = await open(page, 'chips', 'filter-live');
    const chip = node.locator('button').nth(0);
    await chip.evaluate((e) => e.setAttribute('data-probe', ''));
    const kitOff = chips.variants['filter-out-label-enabled-f-f']!.size[0];
    const kitOn = chips.variants['filter-out-label-enabled-t-f']!.size[0];
    expect((await chip.boundingBox())!.width, 'unselected = kit').toBe(kitOff);
    await chip.click();
    const slot = '[data-probe] [data-part=check-slot]';
    const times = [40, 80, 120, 200];
    const w = (await seek(page, slot, 'width', times, 'parseFloat(getComputedStyle(el).width)'))!;
    expect(w.duration, 'expandHorizontally: FastSpatial').toBe(369);
    times.forEach((ms, i) => expect.soft(Number(w.out[i]), `slot width at ${ms}ms`).toBeCloseTo(18 * progress(spring['fast-spatial'], ms), 1));
    expect(Math.max(...w.out.map(Number)), 'the IntSize spring overshoots').toBeGreaterThan(18);
    const o = (await seek(page, slot, 'opacity', [0], 'getComputedStyle(el).opacity'))!;
    expect(o.duration, 'fadeIn: DefaultEffects').toBe(231);
    await page.evaluate(() => document.getAnimations().forEach((a) => a.finish()));
    await page.mouse.move(0, 0);
    expect((await chip.boundingBox())!.width, 'selected = kit').toBe(kitOn);
    await chip.click();
    const exit = (await seek(page, slot, 'width', [0, 369], 'parseFloat(getComputedStyle(el).width)'))!;
    expect(exit.duration, 'shrinkHorizontally: FastSpatial, the check stays mounted').toBe(369);
    expect(exit.out.map(Number)).toEqual([18, 0]);
    await page.evaluate(() => document.getAnimations().forEach((a) => a.finish()));
    expect((await chip.boundingBox())!.width).toBe(kitOff);
    expect(await transitions(page, '[data-probe]'), 'no container colour transition').toEqual([]);
  });
});

// ── Tooltips: Tooltip.kt TooltipBox / TooltipStateImpl, internal/BasicTooltip.kt ───────────
test.describe('tooltip motion and behaviour', () => {
  const plainText = 'Supporting text';
  const richText = 'Supporting line text lorem ipsum dolor sit amet, consectetur';

  test('mouse: shows on enter with no delay, scales about its centre; rich dismisses on exit unless persistent; one at a time', async ({ page }) => {
    await open(page, 'tooltip', 'live');
    await page.getByRole('button', { name: 'Favourite' }).hover();
    // Compose: PointerEventType.Enter → show(). Mounted on the next frame, no 500ms delay.
    await expect(page.getByText(plainText, { exact: true })).toBeVisible({ timeout: 100 });
    const popup = await page.evaluate(() => {
      const el = [...document.querySelectorAll<HTMLElement>('[data-side]')].find((e) => e.textContent === 'Supporting text' && getComputedStyle(e).transitionProperty.includes('scale'))!;
      return { origin: getComputedStyle(el).transformOrigin, w: el.offsetWidth, h: el.offsetHeight };
    });
    expect(popup.origin, 'graphicsLayer default origin: centre').toBe(`${popup.w / 2}px ${popup.h / 2}px`);
    await page.getByRole('button', { name: 'Details' }).hover();
    await expect(page.getByText(richText)).toBeVisible({ timeout: 200 });
    await expect(page.getByText(plainText, { exact: true }), 'GlobalMutatorMutex: one tooltip').toBeHidden();
    // Compose's default rememberTooltipState(isPersistent = false): pointer exit dismisses it.
    await page.mouse.move(2, 2);
    await expect(page.getByText(richText), 'not persistent: dismisses on pointer exit').toBeHidden({ timeout: 500 });
    // `persistent`: stays on exit until Escape / an outside press.
    await page.getByRole('button', { name: 'Pinned' }).hover();
    await expect(page.getByText('Persistent rich tooltip')).toBeVisible({ timeout: 200 });
    await page.mouse.move(2, 2);
    await page.waitForTimeout(500);
    await expect(page.getByText('Persistent rich tooltip'), 'persistent: stays on pointer exit').toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByText('Persistent rich tooltip')).toBeHidden();
  });

  test.describe('touch', () => {
    test.use({ hasTouch: true });

    test('long press (400ms) shows; the press click is consumed; dismisses 1500ms after showing', async ({ page, context }) => {
      await open(page, 'tooltip', 'live');
      const fav = page.getByRole('button', { name: 'Favourite' });
      const b = (await fav.boundingBox())!;
      const pt = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
      await page.evaluate(() => {
        const w = window as unknown as { __log: string[]; __open?: boolean };
        w.__log = [];
        const t0 = performance.now();
        document.querySelector('[aria-label=Favourite]')!.addEventListener('click', () => w.__log.push(`click ${Math.round(performance.now() - t0)}`));
        new MutationObserver(() => {
          const open = [...document.querySelectorAll('[data-side]')].some((e) => e.textContent === 'Supporting text');
          if (open !== !!w.__open) {
            w.__open = open;
            w.__log.push(`${open ? 'shown' : 'hidden'} ${Math.round(performance.now() - t0)}`);
          }
        }).observe(document.body, { subtree: true, childList: true });
      });
      const cdp = await context.newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pt] });
      await page.waitForTimeout(250);
      await expect(page.getByText(plainText, { exact: true }), 'not before the long-press timeout').toBeHidden();
      await page.waitForTimeout(350);
      await expect(page.getByText(plainText, { exact: true })).toBeVisible();
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await page.waitForTimeout(2300);
      const log = await page.evaluate(() => (window as unknown as { __log: string[] }).__log);
      expect(log.some((l) => l.startsWith('click')), `long press consumes the click (${log.join(', ')})`).toBe(false);
      const shown = Number(log.find((l) => l.startsWith('shown'))!.split(' ')[1]);
      const hidden = Number(log.find((l) => l.startsWith('hidden'))!.split(' ')[1]);
      // Removed after TooltipDuration + the exit (FastSpatial 369ms).
      expect.soft(hidden - shown, `shown ${shown}ms, removed ${hidden}ms`).toBeGreaterThan(1500 + 300);
      expect.soft(hidden - shown).toBeLessThan(1500 + 369 + 250);
    });
  });
});

// ── Snackbar: SnackbarHost.kt (FadeInFadeOutWithScale, SnackbarHostState, toMillis) ─────────
test.describe('snackbar motion and queue', () => {
  const root = (text: string) => `xpath=//*[text()="${text}"]/ancestor::*[@data-base-ui-toast or parent::*[@role="region"]][1]`;

  test('enter: scale 0.8 → 1 on FastSpatial + fade on FastEffects; FIFO; short = 4s; replacement crossfades above', async ({ page }) => {
    test.setTimeout(30_000);
    await open(page, 'snackbar', 'queue-live');
    await page.click('[data-show=first]');
    await page.click('[data-show=second]');
    const first = page.locator(root('First message'));
    await expect(first).toBeVisible();
    await expect(page.getByText('Second message'), 'FIFO: the second waits').toHaveCount(0);
    const enter = await first.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        origin: cs.transformOrigin,
        size: [el.getBoundingClientRect().width, el.getBoundingClientRect().height],
        timing: Object.fromEntries(el.getAnimations().map((a) => [(a as CSSTransition).transitionProperty, a.effect!.getComputedTiming().duration])),
      };
    });
    expect(enter.timing, 'alpha FastEffects, scale FastSpatial').toEqual({ opacity: 150, scale: 369 });
    const shownAt = Date.now();
    await expect(page.getByText('Second message')).toBeVisible({ timeout: 6000 });
    const elapsed = Date.now() - shownAt;
    expect.soft(elapsed, 'SnackbarDuration.Short = 4000ms').toBeGreaterThan(3700);
    expect.soft(elapsed).toBeLessThan(4700);
    const both = await page.evaluate(() =>
      [...document.querySelectorAll('[role=region] > *')].map((e) => ({ text: e.textContent, ending: e.hasAttribute('data-ending-style'), z: getComputedStyle(e).zIndex, area: getComputedStyle(e).gridArea })),
    );
    const leaving = both.find((x) => x.text?.startsWith('First'));
    const current = both.find((x) => x.text?.startsWith('Second'))!;
    if (leaving) {
      expect(leaving.ending).toBe(true);
      expect(Number(current.z), 'the replacement draws above the leaving one').toBeGreaterThan(Number(leaving.z));
      expect(leaving.area, 'same cell').toBe(current.area);
    }
  });

  test('with an action: indefinite by default; the action and the close affordance dismiss', async ({ page }) => {
    test.setTimeout(30_000);
    await open(page, 'snackbar', 'queue-live');
    await page.click('[data-show=action]');
    await expect(page.getByText('Connection lost')).toBeVisible();
    await page.waitForTimeout(4600);
    await expect(page.getByText('Connection lost'), 'not Short: Indefinite with an action').toBeVisible();
    const exit = page.locator(root('Connection lost'));
    await page.getByRole('button', { name: 'Retry' }).click();
    const timing = await exit.evaluate((el) => ({ ending: el.hasAttribute('data-ending-style'), t: Object.fromEntries(el.getAnimations().map((a) => [(a as CSSTransition).transitionProperty, a.effect!.getComputedTiming().duration])) }));
    expect(timing, 'performAction dismisses: alpha FastEffects + scale FastSpatial').toEqual({ ending: true, t: { opacity: 150, scale: 369 } });
    await expect(page.getByText('Connection lost')).toHaveCount(0);
    await page.click('[data-show=close]');
    await expect(page.getByText('Closable message')).toBeVisible();
    await page.locator('[aria-label=Dismiss]').click();
    await expect(page.getByText('Closable message'), 'the close affordance dismisses').toHaveCount(0);
  });
});
