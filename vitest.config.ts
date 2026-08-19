import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@main': resolve('src/main'),
      '@shared': resolve('src/shared'),
      '@preload': resolve('src/preload')
    }
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts']
  }
});
