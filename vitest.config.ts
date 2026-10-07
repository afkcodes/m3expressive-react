import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import stylex from '@stylexjs/unplugin/vite';

const rootDir = fileURLToPath(new URL('.', import.meta.url));
// material-color-utilities 0.4.0 ships ten extensionless relative imports (e.g. '../dynamiccolor/dynamic_scheme'),
// which Node's ESM loader rejects; let Vite resolve them as a bundler would.
const deps = { inline: ['@material/material-color-utilities'] };
// Components need the StyleX compiler, as in a consumer app (same options as the workbench).
const compile = () => [
  stylex({ useCSSLayers: true, unstable_moduleResolution: { type: 'commonJS', rootDir } }),
  react(),
];

export default defineConfig({
  test: {
    projects: [
      { test: { name: 'unit', include: ['packages/*/src/**/*.test.ts', 'tests/unit/**/*.test.ts'], server: { deps } } },
      // Every playground rendered in jsdom (no matchMedia / ResizeObserver / Element.animate) and on the server.
      {
        plugins: compile(),
        test: { name: 'dom', environment: 'jsdom', include: ['tests/dom/**/*.dom.test.tsx'], server: { deps } },
      },
      {
        plugins: compile(),
        test: { name: 'ssr', environment: 'node', include: ['tests/dom/**/*.ssr.test.tsx'], server: { deps } },
      },
    ],
  },
});
