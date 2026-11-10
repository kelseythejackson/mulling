import { defineConfig } from 'vite';

// The complete library as one UMD file for <script> tags and CDNs. Exposes window.Mulling.
// It must end in .js: CDNs serve files by extension, and browsers refuse to run a .cjs file as a script.
export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'Mulling',
      formats: ['umd'],
      fileName: () => 'mulling.umd.js',
    },
    sourcemap: true,
    emptyOutDir: false,
  },
});
