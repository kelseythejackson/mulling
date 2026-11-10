import { defineConfig } from 'vite';

// Serves the page the Playwright browser tests run against.
export default defineConfig({
  root: 'test/browser/fixture',
  server: { port: 5180, strictPort: true },
});
