// Bundle the engine for the browser.
import * as esbuild from 'esbuild';
await esbuild.build({
  entryPoints: ['engine/src/main.ts'],
  bundle: true, format: 'iife', target: 'es2022',
  outfile: 'build/engine.js', sourcemap: 'inline', logLevel: 'warning',
});
console.log('built build/engine.js');
