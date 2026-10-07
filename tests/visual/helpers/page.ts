/**
 * Opening workbench pages for the live specs: fixtures (`/fixture/<component>/<variant>`) and
 * playgrounds (`/demo/<component>`).
 */
import { expect, type Locator, type Page } from '@playwright/test';

/** Motion on: the config emulates `prefers-reduced-motion: reduce` for the static suites. */
export async function enableMotion(page: Page) {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
}

/** Resolves once the page's web fonts have loaded (text metrics are final). */
export async function fontsReady(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}

/** Navigates to a workbench page and waits for its fonts. */
export async function load(page: Page, path: string) {
  await page.goto(path);
  await fontsReady(page);
}

/**
 * Opens a fixture page: fonts loaded, the pointer parked in the top-left corner (nothing hovered)
 * and the fixture node visible. Returns the node.
 */
export async function openFixture(page: Page, path: string): Promise<Locator> {
  await load(page, path);
  await page.mouse.move(0, 0);
  const node = page.locator('[data-fixture-node]');
  await expect(node).toBeVisible();
  return node;
}
