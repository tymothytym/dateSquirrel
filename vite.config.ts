import { defineConfig } from 'vite';

export default defineConfig({
  // `npm run dev` serves demo/index.html, which imports src/ directly.
  server: { open: '/demo/' },

  // The logo and badges the demo and readme reference.
  publicDir: 'static',

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // `lib` mode does NOT exempt publicDir, contrary to what you'd hope: without
    // this, static/ lands in dist/ and ~1MB of readme GIFs ships to npm inside
    // the package. The demo build wants them, the library build never does.
    copyPublicDir: false,
    sourcemap: true,
    target: 'es2022',
    cssCodeSplit: false,
    lib: {
      entry: {
        index: 'src/index.ts',
        element: 'src/element.ts',
      },
      formats: ['es', 'cjs'],
      fileName: (format, name) => (format === 'es' ? `${name}.js` : `${name}.cjs`),
      cssFileName: 'date-squirrel',
    },
    // The two entries share nearly all their code, so Rollup emits a common
    // chunk. Its name is left to Vite deliberately: Vite picks the correct
    // extension per format (.js for ESM, .cjs for CJS), and with "type":
    // "module" in package.json a CJS chunk named .js would be loaded as ESM
    // and fail. Only the entry filenames need to be stable, and they are.
  },
});
