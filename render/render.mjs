// Render shots to per-shot video segments, in parallel, then concat into the film.
//   node render/render.mjs [--preview|--final] [--shots A1,A2|--seq A,B] [--workers 3] [--no-concat]
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { startServer, setHandler, stopServer, launchWorker, ROOT } from './harness.mjs';

const args = process.argv.slice(2);
const has = (k) => args.includes(k);
const val = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const final = has('--final');
const scale = final ? 1 : parseFloat(val('--scale', '0.5'));
const tag = final ? '1080' : String(Math.round(1080 * scale));
const segDir = path.join(ROOT, 'build', 'seg_' + tag);
fs.mkdirSync(segDir, { recursive: true });
const nWorkers = parseInt(val('--workers', '3'));
const edl = JSON.parse(fs.readFileSync(path.join(ROOT, 'film/edl.json')));
let ids = edl.shots.map((s) => s.id);
if (val('--shots')) ids = val('--shots').split(',');
if (val('--seq')) { const seqs = val('--seq').split(','); ids = edl.shots.filter((s) => seqs.includes(s.seq)).map((s) => s.id); }
if (has('--missing')) ids = ids.filter((id) => !fs.existsSync(path.join(segDir, id + '.mp4')));

const port = await startServer();
const queue = [...ids];
const T0 = Date.now();
async function worker(wi) {
  const { browser, page, info } = await launchWorker(scale);
  while (queue.length) {
    const id = queue.shift();
    const r = info.ranges.find((x) => x.id === id);
    const tmp = path.join(segDir, id + '.tmp.mp4'), out = path.join(segDir, id + '.mp4');
    const enc = final ? ['-c:v', 'libx264', '-preset', 'medium', '-crf', '12', '-pix_fmt', 'yuv420p']
                      : ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p'];
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${info.w}x${info.h}`, '-r', '24', '-i', '-', '-vf', 'vflip', ...enc, '-r', '24', tmp]);
    setHandler(wi, (buf) => new Promise((res) => { if (!ff.stdin.write(buf)) ff.stdin.once('drain', res); else res(); }));
    const t = Date.now();
    const ms = await page.evaluate(([a, b, url]) => window.SFS.renderRange(a, b, url), [r.start, r.end, `ws://127.0.0.1:${port}/?w=${wi}`]);
    ff.stdin.end(); await new Promise((res) => ff.on('close', res));
    fs.renameSync(tmp, out);
    console.log(`[w${wi}] ${id} ${r.end - r.start}f  ${ms.toFixed(0)} ms/f  ${((Date.now() - t) / 1000).toFixed(1)}s   (${queue.length} left)`);
  }
  await browser.close();
}
await Promise.all(Array.from({ length: Math.min(nWorkers, ids.length) }, (_, i) => worker(i)));
stopServer();
console.log(`rendered ${ids.length} shots in ${((Date.now() - T0) / 1000).toFixed(0)}s`);
if (!has('--no-concat')) {
  const { concat } = await import('./concat.mjs');
  await concat(tag);
}
