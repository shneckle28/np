import { defineConfig } from 'vite';

export default defineConfig({
  base: '/np/',
  build: {
    rollupOptions: {
      external: ['three'],
      output: {
        globals: {
          three: 'THREE'
        }
      }
    }
  }
});