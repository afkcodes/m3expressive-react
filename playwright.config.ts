import { defineConfig, devices } from '@playwright/test';

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
    baseURL: 'http://localhost:5199',
    deviceScaleFactor: 2,
    colorScheme: 'light',
    reducedMotion: 'reduce',
  },
  webServer: {
    command: 'pnpm --filter workbench dev',
    url: 'http://localhost:5199',
    reuseExistingServer: true,
  },
});
