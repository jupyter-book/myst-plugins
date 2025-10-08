// esbuild build script to build the plugin

const esbuild = require('esbuild');

esbuild.build({
    entryPoints: ['src/update-date-frontmatter.mjs'],
    bundle: true,
    outfile: 'dist/update-date-frontmatter.mjs',
    platform: 'node',
    format: 'esm',
    minify: true,
    external: ['fs', 'fs/promises', 'os'] // <— do NOT bundle these

}).catch(() => process.exit(1));