import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    // Server-only entry: kept separate so mobile/admin bundles never pull in env validation.
    'env/index': 'src/env/index.ts',
    // States and districts of India: its own entry so only screens that need the list download it.
    'geo/index': 'src/geo/india.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'es2020',
  splitting: false,
});
