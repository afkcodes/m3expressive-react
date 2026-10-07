import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import stylex from '@stylexjs/unplugin';

const rootDir = fileURLToPath(new URL('../..', import.meta.url));

export default defineConfig({
  plugins: [
    stylex.vite({
      useCSSLayers: true,
      unstable_moduleResolution: { type: 'commonJS', rootDir },
    }),
    react(),
  ],
  // Pre-bundle up front so the first page load never waits on a re-optimise.
  optimizeDeps: {
    include: ['react', 'react/jsx-dev-runtime', 'react-dom/client', '@base-ui/react'],
  },
  server: { port: Number(process.env.M3X_PORT ?? 5199), strictPort: true },
});
