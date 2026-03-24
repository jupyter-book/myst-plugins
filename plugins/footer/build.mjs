// Bundles the footer plugin into a single self-contained dist/index.mjs
// and copies the widget (with CSS inlined) to dist/widget.mjs.
// Run: node build.mjs

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import * as esbuild from 'esbuild';

const WIDGET_URL =
  'https://github.com/jupyter-book/myst-plugins/releases/download/footer-latest/widget.mjs';

const footerCss = readFileSync('src/footer.css', 'utf8');
const widgetSrc = readFileSync('src/widget.mjs', 'utf8');

// Inline the CSS into the widget so it's a single browser-side file
const widgetWithCss = widgetSrc.replaceAll('__FOOTER_CSS__', JSON.stringify(footerCss));
mkdirSync('dist', { recursive: true });
writeFileSync('dist/widget.mjs', widgetWithCss);

// Bundle the server-side plugin (index.mjs + js-yaml + shared utils)
await esbuild.build({
  entryPoints: ['src/index.mjs'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: 'dist/index.mjs',
  external: ['crypto', 'fs', 'path'],
  define: {
    __WIDGET_URL__: JSON.stringify(WIDGET_URL),
  },
});

console.log('Built dist/index.mjs and dist/widget.mjs');
