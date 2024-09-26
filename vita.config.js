import { defineConfig } from 'vite';

export default defineConfig({
  base: '/np/', 
  build: {
    rollupOptions: {
      output: {
        globals: {
          
        }
      }
    }
  }
});