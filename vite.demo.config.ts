import { defineConfig } from 'vite';

/**
 * The demo page built as a standalone static site, for hosting.
 *
 * The default config is a `lib` build: it emits the importable library and no
 * HTML at all, so it can't be served. Rooting at demo/ makes index.html the
 * entry and puts it at the root of the output, and non-lib mode copies
 * publicDir, so the logos the page references at `/logo_dsq.svg` resolve.
 */
export default defineConfig({
  root: 'demo',
  publicDir: '../static',
  build: {
    outDir: '../dist-demo',
    emptyOutDir: true,
    target: 'es2022',
    sourcemap: true,
  },
});
