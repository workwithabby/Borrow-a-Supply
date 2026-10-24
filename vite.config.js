import { defineConfig } from 'vite';

// base './' keeps asset paths relative so the build works inside the Capacitor APK.
export default defineConfig({
  base: './',
  build: { outDir: 'dist', chunkSizeWarningLimit: 900 },
  server: { host: true },
});
