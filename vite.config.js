import { defineConfig } from 'vite';

// The Android background overlay now loads the exact same index.html
// (with ?mode=overlay) instead of a separate pet-overlay.html bundle,
// so there is only a single build entry point to keep app + overlay
// appearance, accessories, and movement code from ever drifting apart.
export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  }
});
