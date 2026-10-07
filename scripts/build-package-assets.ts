/**
 * Copies the non-TS assets of @m3x/react into dist/ after `tsc -p tsconfig.build.json`:
 *   - fonts.css with its Fontsource url()s rewritten to files shipped beside it (dist/fonts/),
 *     so the stylesheet works with any bundler, plain CSS or a CDN;
 *   - the nine Roboto woff2 subsets and Roboto's OFL licence;
 *   - declaration files: relative `.ts`/`.tsx` specifiers rewritten to `.js` (tsc rewrites them in
 *     the JS it emits, not in .d.ts; `.js` is what every TypeScript resolution maps to `.d.ts`).
 * The workspace keeps importing src/fonts.css (Fontsource URLs resolved by Vite).
 *
 *   node scripts/build-package-assets.ts   (run from anywhere)
 */
import { copyFileSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkg = fileURLToPath(new URL('../packages/m3/', import.meta.url));
const dist = join(pkg, 'dist');
const require = createRequire(join(pkg, 'package.json'));
const fontsource = dirname(require.resolve('@fontsource-variable/roboto/package.json'));

const css = readFileSync(join(pkg, 'src/fonts.css'), 'utf8');
const files = new Set<string>();
const rewritten = css.replace(/url\('@fontsource-variable\/roboto\/files\/([^']+)'\)/g, (_, file: string) => {
  files.add(file);
  return `url('./fonts/${file}')`;
});
if (files.size === 0) throw new Error('fonts.css: no Fontsource URLs found — did its format change?');

mkdirSync(join(dist, 'fonts'), { recursive: true });
writeFileSync(join(dist, 'fonts.css'), rewritten);
for (const file of files) copyFileSync(join(fontsource, 'files', file), join(dist, 'fonts', file));
copyFileSync(join(fontsource, 'LICENSE'), join(dist, 'fonts', 'OFL-LICENSE.txt'));
console.log(`dist/fonts.css + ${files.size} Roboto subsets`);

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
let rewrittenDts = 0;
for (const file of walk(dist).filter((f) => f.endsWith('.d.ts'))) {
  const src = readFileSync(file, 'utf8');
  const out = src.replace(/(from\s+|import\()(['"])(\.{1,2}\/[^'"]+?)\.tsx?\2/g, '$1$2$3.js$2');
  if (out !== src) {
    writeFileSync(file, out);
    rewrittenDts++;
  }
}
console.log(`${rewrittenDts} declaration files: .ts specifiers → .js`);
