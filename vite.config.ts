import { defineConfig } from 'vitest/config';

// Two library builds from the same entry points:
// - `vite build` (default): ES modules, for bundlers and `import`.
// - `vite build --mode cjs`: CommonJS (.cjs), for `require()`, Jest and older tooling.
// Shared code lands in common chunks, so importing core and one loader doesn't duplicate anything.
// The UMD build for <script> tags and CDNs is separate: see vite.umd.config.ts.
export default defineConfig(({ mode }) => {
  const cjs = mode === 'cjs';
  return {
    build: {
      lib: {
        entry: {
          mulling: 'src/index.ts',
          core: 'src/core.ts',
          loaders: 'src/loaders/index.ts',
          react: 'src/react/index.ts',
          'react-core': 'src/react/core.ts',
          vue: 'src/vue/index.ts',
          'vue-core': 'src/vue/core.ts',
        },
        formats: [cjs ? 'cjs' : 'es'],
        fileName: (_format, name) => `${name}.${cjs ? 'cjs' : 'js'}`,
      },
      rollupOptions: {
        // React and Vue come from the app, never bundled in.
        external: ['react', 'react/jsx-runtime', 'vue'],
        output: { chunkFileNames: `chunks/[name]-[hash].${cjs ? 'cjs' : 'js'}`, ...(cjs ? { exports: 'named' as const } : {}) },
      },
      sourcemap: true,
      emptyOutDir: !cjs,
    },
    test: {
      environment: 'happy-dom',
      include: ['test/*.test.ts'], // browser tests run in Playwright
    },
  };
});
