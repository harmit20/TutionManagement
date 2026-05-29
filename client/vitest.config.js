import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.js'],
    // Silence React act() warnings in tests
    environmentOptions: { jsdom: { pretendToBeVisual: true } },
  },
});
