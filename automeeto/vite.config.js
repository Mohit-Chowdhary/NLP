import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
    plugins: [react()],
    build: {
        rollupOptions: {
            input: {
                popup: resolve(__dirname, 'index.html'),
                background: resolve(__dirname, 'src/background/index.js'),
                content: resolve(__dirname, 'src/content/index.js'),
                offscreen: resolve(__dirname, 'src/offscreen/index.html'),
            },
            output: {
                entryFileNames: 'assets/[name].js',
            },
        },
    },
});
