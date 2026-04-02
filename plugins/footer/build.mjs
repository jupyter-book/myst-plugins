// Bundles the footer plugin into dist/ for release.
// Produces: dist/index.mjs (bundled), dist/widget.mjs (copied), dist/footer.css (copied)
// Run: node build.mjs

import { copyFileSync, mkdirSync } from 'fs';
import * as esbuild from 'esbuild';

const RELEASE_BASE =
  'https://github.com/jupyter-book/myst-plugins/releases/download/footer-latest';

mkdirSync('dist', { recursive: true });

// Bundle the server-side plugin (index.mjs + js-yaml + shared utils)
await esbuild.build({
  entryPoints: ['src/index.mjs'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: 'dist/index.mjs',
  external: ['crypto', 'fs', 'path'],
  define: {
    __WIDGET_URL__: JSON.stringify(`${RELEASE_BASE}/widget.mjs`),
    __CSS_URL__: JSON.stringify(`${RELEASE_BASE}/footer.css`),
  },
});

// Copy client-side assets as-is
copyFileSync('src/widget.mjs', 'dist/widget.mjs');
copyFileSync('src/footer.css', 'dist/footer.css');

console.log('Built dist/index.mjs, dist/widget.mjs, dist/footer.css');
