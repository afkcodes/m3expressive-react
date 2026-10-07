import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/*/src/**/*.test.ts'],
    // material-color-utilities 0.4.0 ships ten extensionless relative imports (e.g. '../dynamiccolor/dynamic_scheme'),
    // which Node's ESM loader rejects; let Vite resolve them as a bundler would.
    server: { deps: { inline: ['@material/material-color-utilities'] } },
  },
});
