import { defineConfig, devices } from '@playwright/test';

/** Workbench port; override with M3X_PORT to run a second checkout (git worktree) side by side. */
const port = Number(process.env.M3X_PORT ?? 5199);

/**
 * Figma parity suite. Chromium at 2x, matching the 2x Figma exports in /figma.
 */
export default defineConfig({
  testDir: 'tests/visual',
  outputDir: 'test-results',
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: `http://localhost:${port}`,
    deviceScaleFactor: 2,
    colorScheme: 'light',
    reducedMotion: 'reduce',
  },
  webServer: {
    command: 'pnpm --filter workbench dev',
    url: `http://localhost:${port}`,
    reuseExistingServer: true,
  },
});
