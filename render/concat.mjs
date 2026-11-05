// Concatenate per-shot segments in EDL order and mux the soundtrack (if present).
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export async function concat(tag = '540', outName) {
  const edl = JSON.parse(fs.readFileSync(path.join(ROOT, 'film/edl.json')));
  const segDir = path.join(ROOT, 'build', 'seg_' + tag);
  const missing = edl.shots.filter((s) => !fs.existsSync(path.join(segDir, s.id + '.mp4')));
  if (missing.length) { console.log('missing segments:', missing.map((s) => s.id).join(',')); return null; }
  const list = edl.shots.map((s) => `file '${path.join(segDir, s.id + '.mp4')}'`).join('\n');
  const listFile = path.join(segDir, 'list.txt');
  fs.writeFileSync(listFile, list);
  const silent = path.join(ROOT, 'build', `film_${tag}_silent.mp4`);
  spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', silent], { stdio: 'inherit' });
  const audio = path.join(ROOT, 'audio/out/mix.wav');
  const out = outName || path.join(ROOT, 'build', `film_${tag}.mp4`);
  if (fs.existsSync(audio)) {
    spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', silent, '-i', audio, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-shortest', out], { stdio: 'inherit' });
  } else fs.copyFileSync(silent, out);
  console.log('film ->', out);
  return out;
}
if (process.argv[1] && process.argv[1].endsWith('concat.mjs')) await concat(process.argv[2] || '540');
