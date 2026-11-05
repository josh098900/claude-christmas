// Final deliverable encode.
//   node render/master.mjs [--tag 1080|540] [--out final/seen_from_space.mp4] [--kbps 4000]
// Concats per-shot segments (render.mjs output), muxes audio/out/mix.wav, and encodes
// H.264 High / yuv420p / slow preset / AAC 320k with a two-pass bitrate so the file stays < 95 MB.
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { concat } from './concat.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const val = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const tag = val('--tag', '1080');
const out = path.resolve(ROOT, val('--out', 'final/seen_from_space.mp4'));
const kbps = parseInt(val('--kbps', tag === '1080' ? '4000' : '2200'));
const abps = tag === '1080' ? '320k' : '192k';
const filmed = await concat(tag);
if (!filmed) process.exit(1);
const silent = path.join(ROOT, 'build', `film_${tag}_silent.mp4`);
const audio = path.join(ROOT, 'audio/out/mix.wav');
fs.mkdirSync(path.dirname(out), { recursive: true });
const passlog = path.join(ROOT, 'build', 'x264pass');
const common = ['-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-preset', 'slow', '-b:v', `${kbps}k`, '-maxrate', `${Math.round(kbps * 1.8)}k`, '-bufsize', `${kbps * 4}k`, '-r', '24', '-passlogfile', passlog];
const run = (a) => { const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...a], { stdio: 'inherit' }); if (r.status) throw new Error('ffmpeg failed'); };
console.log('pass 1...');
run(['-i', silent, ...common, '-pass', '1', '-an', '-f', 'mp4', '/dev/null']);
console.log('pass 2...');
const aIn = fs.existsSync(audio) ? ['-i', audio] : [];
const aOut = fs.existsSync(audio) ? ['-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', abps, '-ar', '48000', '-shortest'] : [];
run(['-i', silent, ...aIn, ...common, '-pass', '2', ...aOut, '-movflags', '+faststart', out]);
const mb = fs.statSync(out).size / 1e6;
console.log(`${out}  ${mb.toFixed(1)} MB`);
if (mb > 95) console.log('WARNING: over 95 MB, re-run with a lower --kbps');
