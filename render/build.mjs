// Bundle the engine for the browser.  node render/build.mjs [--out build/engine.js]
import * as esbuild from 'esbuild';
const i = process.argv.indexOf('--out');
const out = i > 0 ? process.argv[i + 1] : (process.env.SFS_BUNDLE ? 'build/' + process.env.SFS_BUNDLE : 'build/engine.js');
await esbuild.build({
  entryPoints: ['engine/src/main.ts'],
  bundle: true, format: 'iife', target: 'es2022',
  outfile: out, sourcemap: 'inline', logLevel: 'warning',
});
console.log('built ' + out);
