/**
 * Automated accessibility audit: axe-core (WCAG 2.0 / 2.1 A and AA, plus best practices) on every
 * `/demo/<c>` playground in light and dark, and on one open state per overlay (dialogs, menus,
 * sheets, pickers, tooltips, snackbars, the search view, the FAB menu).
 *
 * Nothing is disabled wholesale. A violation node passes only when it matches, by rule and
 * selector, either
 * - an EXCLUSION: not a failure for a stated reason (e.g. a WCAG exemption), or
 * - a KNOWN violation: a real failure, not fixed here, listed below with its fix and kept as a
 *   `test.fixme` that asserts it is gone — remove the entry once the component / page is fixed.
 * Selectors are matched with `closest()` from the node axe reports. Some use the workbench's
 * StyleX debug class names (`<File>__s.<key>`), which every visual spec's dev server emits.
 */
import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'];

/** Every playground route (apps/workbench/src/main.tsx). `shapes` has no colour-scheme control. */
const PLAYGROUNDS = [
  'button',
  'badge',
  'card',
  'chips',
  'overlays',
  'progress',
  'slider',
  'textfield',
  'list',
  'menu',
  'tabs',
  'navigation',
  'app-bar',
  'search',
  'toolbar',
  'sheets',
  'dialogs',
  'carousel',
  'theme',
  'date-picker',
  'time-picker',
  'checkbox',
  'shapes',
] as const;
type Route = (typeof PLAYGROUNDS)[number];
type Scheme = 'light' | 'dark';

interface Exclusion {
  rule: string;
  selector: string;
  reason: string;
}

const EXCLUSIONS: Exclusion[] = [
  {
    rule: 'color-contrast',
    selector: '[class~="MenuItem__s.itemDisabled"]',
    reason:
      'WCAG 1.4.3 exempts text of inactive UI components. These are the disabled items of the static ' +
      'MenuSurface specimens, which are presentational (no aria-disabled for axe to read); the live ' +
      "menus' disabled items carry aria-disabled and axe already skips them.",
  },
  {
    rule: 'color-contrast',
    selector: '[class~="cells__s.outside"]',
    reason:
      "Kit token colour (owner decision): the docked date picker draws the adjacent months' days in On " +
      'Surface Variant at 38% (1.87:1 on Surface Container High, light). They are enabled day buttons, so ' +
      'WCAG 1.4.3 does apply: listed for the owner as a kit deviation candidate, not a component bug.',
  },
  {
    rule: 'region',
    selector: '[data-base-ui-portal]',
    reason:
      'Menus and tooltips portal into the M3Provider root by design (CLAUDE.md §7, so they keep the ' +
      "provider's theme) and are tied to their trigger (aria-controls / aria-describedby): transient " +
      'popups, not page content that belongs in a landmark. Modal dialogs and sheets are exempt in axe itself.',
  },
];

/** An overlay opened from its playground; `open` resolves once it shows. */
interface OpenState {
  name: string;
  route: Route;
  open: (page: Page) => Promise<void>;
}

const OPEN_STATES: OpenState[] = [
  {
    name: 'basic dialog',
    route: 'dialogs',
    open: async (page) => {
      await page.getByRole('button', { name: 'Basic', exact: true }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
    },
  },
  {
    name: 'scrollable list dialog',
    route: 'dialogs',
    open: async (page) => {
      await page.getByRole('button', { name: 'Scrollable list' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
    },
  },
  {
    name: 'menu with groups',
    route: 'menu',
    open: async (page) => {
      await page.getByRole('button', { name: 'Edit', exact: true }).click();
      await expect(page.getByRole('menu')).toBeVisible();
    },
  },
  {
    name: 'menu with radio and checkbox items',
    route: 'menu',
    open: async (page) => {
      await page.getByRole('button', { name: 'Sort & filter' }).click();
      await expect(page.getByRole('menu')).toBeVisible();
    },
  },
  {
    name: 'submenu',
    route: 'menu',
    open: async (page) => {
      await page.getByRole('button', { name: 'More', exact: true }).click();
      await page.getByRole('menuitem', { name: 'Share' }).press('ArrowRight');
      await expect(page.getByRole('menuitem', { name: 'Email' })).toBeVisible();
    },
  },
  {
    name: 'split button menu',
    route: 'button',
    open: async (page) => {
      await page.getByRole('button', { name: 'More options' }).first().click();
      await expect(page.getByRole('menu')).toBeVisible();
    },
  },
  {
    name: 'FAB menu',
    route: 'button',
    open: async (page) => {
      await page.getByRole('button', { name: 'primary actions' }).click();
      await expect(page.getByRole('menu', { name: 'primary actions' })).toBeVisible();
    },
  },
  {
    name: 'modal side sheet',
    route: 'sheets',
    open: async (page) => {
      await page.getByRole('button', { name: 'Modal side sheet' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
    },
  },
  {
    name: 'modal bottom sheet',
    route: 'sheets',
    open: async (page) => {
      await page.getByRole('button', { name: 'Modal bottom sheet' }).click();
      await expect(page.getByRole('dialog', { name: 'Share' })).toBeVisible();
    },
  },
  {
    name: 'modal date picker',
    route: 'date-picker',
    open: async (page) => {
      await page.getByRole('button', { name: 'Modal date picker' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
    },
  },
  {
    name: 'docked date picker',
    route: 'date-picker',
    open: async (page) => {
      await page.getByRole('button', { name: 'Open calendar' }).click();
      await expect(page.getByRole('dialog', { name: 'Choose date' })).toBeVisible();
    },
  },
  {
    name: 'full-screen range picker',
    route: 'date-picker',
    open: async (page) => {
      await page.getByRole('button', { name: 'Full-screen range picker' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
    },
  },
  {
    name: 'time picker',
    route: 'time-picker',
    open: async (page) => {
      await page.getByRole('button', { name: 'Open time picker' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
    },
  },
  {
    name: 'plain tooltip',
    route: 'overlays',
    open: async (page) => {
      await page.getByRole('button', { name: 'Favourite' }).hover();
      await expect(page.getByText('Add to favourites', { exact: true })).toBeVisible();
    },
  },
  {
    name: 'rich tooltip',
    route: 'overlays',
    open: async (page) => {
      await page.getByRole('button', { name: 'Rich tooltip' }).click();
      await expect(page.getByText('Grant value')).toBeVisible();
    },
  },
  {
    name: 'snackbar with action',
    route: 'overlays',
    open: async (page) => {
      await page.getByRole('button', { name: 'Action + close' }).click();
      await expect(page.getByText('Connection lost')).toBeVisible();
    },
  },
  {
    name: 'full-screen search view',
    route: 'search',
    open: async (page) => {
      await page.getByRole('button', { name: 'Search accounts and payments' }).click();
      await expect(page.getByRole('button', { name: 'Back', exact: true })).toBeVisible();
    },
  },
  {
    name: 'expanded navigation rail',
    route: 'navigation',
    open: async (page) => {
      await page.getByRole('button', { name: 'Expand', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Collapse', exact: true })).toBeVisible();
    },
  },
];

/** A real violation not fixed yet: left out of the audits below and kept as a test.fixme. */
interface Known {
  route: Route;
  /** The OPEN_STATES entry where it shows (default: the playground as loaded). */
  state?: string;
  rule: string;
  selector: string;
  /** Where (component or playground) and what. */
  summary: string;
  fix: string;
}

const KNOWN: Known[] = [];

interface Finding {
  rule: string;
  impact: string;
  target: string;
  summary: string;
}

/** Open a playground, in the dark scheme through its own colour-scheme control. */
async function openPlayground(page: Page, route: Route, scheme: Scheme) {
  await page.goto(`/demo/${route}`);
  await page.evaluate(() => document.fonts.ready);
  if (scheme === 'dark')
    await page
      .locator('select')
      .filter({ has: page.locator('option', { hasText: /^dark$/ }) })
      .first()
      .selectOption('dark');
}

/** Wait for finite CSS / WAAPI animations (fades, scales) and a beat for rAF-driven springs. */
async function settle(page: Page) {
  await page.evaluate(() =>
    Promise.race([
      Promise.all(
        document
          .getAnimations()
          .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
          .map((a) => a.finished.catch(() => undefined)),
      ),
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ]),
  );
  await page.waitForTimeout(250);
}

/**
 * Run axe and return the violation nodes that no EXCLUSION (and, unless `known` is given, no KNOWN
 * entry of this route) accounts for. With `known`, return only the nodes that entry matches.
 */
async function audit(page: Page, route: Route, known?: Known): Promise<Finding[]> {
  await settle(page);
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const nodes = results.violations.flatMap((v) =>
    v.nodes.map((n) => ({
      rule: v.id,
      impact: n.impact ?? v.impact ?? 'unknown',
      target: n.target.map((t) => (typeof t === 'string' ? t : t.join(' >>> '))).join(' | '),
      selector: n.target.length === 1 && typeof n.target[0] === 'string' ? n.target[0] : null,
      summary: (n.failureSummary ?? '')
        .split('\n')
        .slice(1)
        .map((line) => line.trim())
        .join('; ')
        .slice(0, 240),
    })),
  );
  const allow = (known ? [known] : [...EXCLUSIONS, ...KNOWN.filter((k) => k.route === route)]).map(
    ({ rule, selector }) => ({ rule, selector }),
  );
  const matched = await page.evaluate(
    ({ nodes, allow }) =>
      nodes.map(({ rule, selector }) => {
        const el = selector ? document.querySelector(selector) : null;
        return allow.some((a) => a.rule === rule && el?.closest(a.selector) != null);
      }),
    { nodes: nodes.map(({ rule, selector }) => ({ rule, selector })), allow },
  );
  return nodes
    .filter((_, i) => (known ? matched[i] : !matched[i]))
    .map(({ rule, impact, target, summary }) => ({ rule, impact, target, summary }));
}

test.describe('axe: playgrounds', () => {
  for (const scheme of ['light', 'dark'] as const) {
    for (const route of PLAYGROUNDS) {
      if (scheme === 'dark' && route === 'shapes') continue;
      test(`/demo/${route} (${scheme})`, async ({ page }) => {
        await openPlayground(page, route, scheme);
        expect(await audit(page, route)).toEqual([]);
      });
    }
  }
});

test.describe('axe: open overlays', () => {
  for (const scheme of ['light', 'dark'] as const) {
    for (const state of OPEN_STATES) {
      test(`${state.name}, /demo/${state.route} (${scheme})`, async ({ page }) => {
        await openPlayground(page, state.route, scheme);
        await state.open(page);
        expect(await audit(page, state.route)).toEqual([]);
      });
    }
  }
});

test.describe('axe: known violations', () => {
  for (const known of KNOWN) {
    test.fixme(`${known.rule}: ${known.summary}. Fix: ${known.fix}`, async ({ page }) => {
      await openPlayground(page, known.route, 'light');
      await OPEN_STATES.find((s) => s.name === known.state)?.open(page);
      expect(await audit(page, known.route, known)).toEqual([]);
    });
  }
});

test('every exclusion and known violation states its reason / fix and names a live overlay state', () => {
  for (const e of EXCLUSIONS) expect(e.reason.length).toBeGreaterThan(40);
  for (const k of KNOWN) {
    expect(k.fix.length).toBeGreaterThan(20);
    if (k.state) expect(OPEN_STATES.map((s) => s.name)).toContain(k.state);
  }
});
