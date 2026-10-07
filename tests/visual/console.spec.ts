import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { demos } from '../../apps/workbench/src/demos.ts';
import { loadManifests } from './manifest.ts';

/*
 * Console hygiene: every fixture variant and every playground renders (in development, under
 * StrictMode) without a console error / warning or an uncaught exception. Fixtures are batched:
 * /fixture/<component> renders all of a component's variants on one page.
 */

const SUFFIX = '.fixtures.tsx';
const fixtureModules = readdirSync(join(process.cwd(), 'apps/workbench/src/fixtures'))
  .filter((f) => f.endsWith(SUFFIX))
  .map((f) => f.slice(0, -SUFFIX.length));
const manifests = new Map(loadManifests().map((m) => [m.component, m]));
// A manifest without a fixture module fails below (its variants are missing).
const components = [...new Set([...fixtureModules, ...manifests.keys()])].sort();

/** Async work after the first render (springs, observers, timers) gets this long to complain. */
const SETTLE = 500;

function collect(page: Page) {
  const problems: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() !== 'error' && msg.type() !== 'warning') return;
    const { url, lineNumber } = msg.location();
    problems.push(`console.${msg.type()}: ${msg.text()}${url ? ` (${url}:${lineNumber})` : ''}`);
  });
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.stack ?? error.message}`));
  return problems;
}

test('every playground has a /demo route', () => {
  const pages = readdirSync(join(process.cwd(), 'apps/workbench/src/pages'))
    .filter((f) => f.endsWith('Playground.tsx') || f === 'ShapesDemo.tsx')
    .map((f) => f.slice(0, -'.tsx'.length));
  expect(pages.filter((p) => !demos.some((d) => d.page === p))).toEqual([]);
});

for (const motion of ['reduce', 'no-preference'] as const) {
  test.describe(`reduced motion: ${motion}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ reducedMotion: motion });
    });

    for (const component of components) {
      test(`fixture ${component}`, async ({ page }) => {
        test.setTimeout(120_000);
        const problems = collect(page);
        await page.goto(`/fixture/${component}`);
        const all = page.locator(`[data-fixture-all="${component}"]`);
        await expect(all, `/fixture/${component} renders its variants`).toBeAttached();
        const variants = await all
          .locator('[data-fixture-variant]')
          .evaluateAll((els) => els.map((el) => el.getAttribute('data-fixture-variant')!));
        // Every variant is ready (or shows the error it threw).
        await expect(page.locator('[data-fixture-node], [data-fixture-error]')).toHaveCount(variants.length, {
          timeout: 60_000,
        });
        await page.waitForTimeout(SETTLE);
        const missing = Object.keys(manifests.get(component)?.variants ?? {}).filter((v) => !variants.includes(v));
        expect(missing, 'manifest variants without a fixture').toEqual([]);
        expect(problems).toEqual([]);
      });
    }

    for (const demo of demos) {
      test(`demo ${demo.path}`, async ({ page }) => {
        const problems = collect(page);
        await page.goto(`/demo/${demo.path}`);
        await expect(page.locator('#root > *').first()).toBeAttached();
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(SETTLE);
        expect(problems).toEqual([]);
      });
    }

    test('gallery', async ({ page }) => {
      const problems = collect(page);
      await page.goto('/');
      await expect(page.locator('a[href^="/compare/"]')).toHaveCount(fixtureModules.length);
      await expect(page.locator('a[href^="/demo/"]')).toHaveCount(demos.length);
      await page.waitForTimeout(SETTLE);
      expect(problems).toEqual([]);
    });
  });
}
