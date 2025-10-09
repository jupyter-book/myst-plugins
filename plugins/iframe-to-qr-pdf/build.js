// esbuild '
const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['src/iframe-to-qr-pdf.mjs'],
  bundle: true,          
  outfile: 'dist/iframe-to-qr-pdf.mjs',
  platform: 'node',
  format: 'esm',          // pure ESM output
  external: ['fs', 'fs/promises', 'os'] // <— do NOT bundle these

}).catch(() => process.exit(1));