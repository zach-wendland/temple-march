import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@core': path.resolve(__dirname, './src/core'),
      '@systems': path.resolve(__dirname, './src/systems'),
      '@config': path.resolve(__dirname, './src/config'),
      '@entities': path.resolve(__dirname, './src/entities'),
      '@scenes': path.resolve(__dirname, './src/scenes'),
      '@combat': path.resolve(__dirname, './src/combat'),
      '@effects': path.resolve(__dirname, './src/effects'),
      '@input': path.resolve(__dirname, './src/input'),
      '@ai': path.resolve(__dirname, './src/ai'),
      '@utils': path.resolve(__dirname, './src/utils'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
          p5: ['p5'],
        },
      },
    },
  },
});
