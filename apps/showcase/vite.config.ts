import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import stylex from '@stylexjs/unplugin/vite';

const rootDir = fileURLToPath(new URL('../..', import.meta.url));

export default defineConfig({
  plugins: [
    stylex({
      useCSSLayers: true,
      unstable_moduleResolution: { type: 'commonJS', rootDir },
    }),
    react(),
  ],
  optimizeDeps: {
    include: ['react', 'react/jsx-dev-runtime', 'react-dom/client', '@base-ui/react'],
  },
  server: { port: Number(process.env.SHOWCASE_PORT ?? 5300) },
});
