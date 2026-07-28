/**
 * Strip bare CSS imports from the emitted .d.ts files.
 *
 * src/index.ts and src/element.ts do `import './styles/date-squirrel.css'` so
 * the bundler pulls the stylesheet into the graph. tsc copies that statement
 * into the declarations verbatim, but the published package has no
 * dist/styles/ — Vite extracts the CSS to dist/date-squirrel.css. The result is
 * a declaration file pointing at a file that isn't there, which fails any
 * consumer compiling with `skipLibCheck: false`:
 *
 *   error TS2882: Cannot find module or type declarations for side-effect
 *   import of './styles/date-squirrel.css'.
 *
 * The import has no type meaning, so dropping it from the .d.ts costs nothing.
 * Consumers load the stylesheet themselves, as the readme documents.
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const DIST = 'dist';
// A whole-line bare import of a .css file, single or double quoted.
const CSS_IMPORT = /^import\s+['"][^'"]+\.css['"];?\r?\n/gm;

const files = (await readdir(DIST)).filter((f) => f.endsWith('.d.ts'));
let stripped = 0;

for (const file of files) {
  const path = join(DIST, file);
  const before = await readFile(path, 'utf8');
  const after = before.replace(CSS_IMPORT, '');
  if (after !== before) {
    await writeFile(path, after);
    stripped++;
    console.log(`stripped css import from ${path}`);
  }
}

console.log(`strip-css-imports: ${stripped} of ${files.length} .d.ts files changed`);
