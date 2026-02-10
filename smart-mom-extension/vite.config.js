import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
  ],
  build: {
    rollupOptions: {
      input: {
        offscreen: 'src/background/offscreen.html',
      },
    },
  },
  server: {
    port: 5173,
    hmr: {
      port: 5173,
    },
  },
});
