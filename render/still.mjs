// Render individual frames to PNG.  node render/still.mjs --scale 1 --out stills/x.png FRAME|SHOT@sec ...
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { startServer, setHandler, stopServer, launchWorker, ROOT } from './harness.mjs';

const args = process.argv.slice(2);
let scale = 0.5, outDir = path.join(ROOT, 'build/stills'), prefix = '';
const targets = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--scale') scale = parseFloat(args[++i]);
  else if (args[i] === '--out') outDir = args[++i];
  else if (args[i] === '--prefix') prefix = args[++i];
  else targets.push(args[i]);
}
fs.mkdirSync(outDir, { recursive: true });
const port = await startServer();
const { browser, page, info } = await launchWorker(scale);
const resolve = (t) => {
  if (/^\d+$/.test(t)) return { frame: +t, name: 'f' + t };
  const [id, sec] = t.split('@');
  const r = info.ranges.find((x) => x.id === id);
  if (!r) throw new Error('no shot ' + id);
  const fr = Math.min(r.end - 1, r.start + Math.round(parseFloat(sec || '0') * info.fps));
  return { frame: fr, name: `${id}_${(sec || '0')}` };
};
for (const t of targets) {
  const isLab = t.startsWith('lab:');
  const { frame, name } = isLab ? { frame: 0, name: t.slice(4).replace('@', '_') } : resolve(t);
  const out = path.join(outDir, `${prefix}${name}.png`);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${info.w}x${info.h}`, '-i', '-', '-vf', 'vflip', '-frames:v', '1', out]);
  setHandler(0, (buf) => new Promise((r) => { ff.stdin.write(buf, r); }));
  const url = `ws://127.0.0.1:${port}/?w=0`;
  const ms = isLab ? await page.evaluate(([id, tt, u]) => window.SFS.sendLab(id, tt, u), [t.slice(4).split('@')[0], parseFloat(t.split('@')[1] || '0'), url])
                   : await page.evaluate(([a, u]) => window.SFS.renderRange(a, a + 1, u), [frame, url]);
  ff.stdin.end(); await new Promise((r) => ff.on('close', r));
  console.log(`${out}  (${ms.toFixed(0)} ms)`);
}
await browser.close(); stopServer();
