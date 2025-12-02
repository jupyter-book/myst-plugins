// Build script for bundling the GitHub Issue Table plugin
import * as esbuild from 'esbuild';
import { mkdirSync } from 'fs';

// Ensure dist directory exists
mkdirSync('dist', { recursive: true });

// Bundle the plugin
await esbuild.build({
  entryPoints: ['src/index.mjs'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: 'dist/index.mjs',
  // Keep readable for debugging (can change to minify for production)
  minify: false,
  // External dependencies that should not be bundled (Node.js built-ins)
  external: ['crypto', 'fs', 'path'],
  // Add banner with metadata
  banner: {
    js: `// GitHub Issue Table Plugin for MyST
// Bundled version - see https://github.com/jupyter-book/myst-plugins
// Generated: ${new Date().toISOString()}
`
  }
});

console.log('✅ Plugin bundled successfully to dist/index.mjs');
