// Build the 30 s cut-down and the 10 s teaser from the master (video + its own audio),
// cutting on musically sensible boundaries with short audio fades.
//   node render/cutdowns.mjs [final/seen_from_space.mp4]
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.resolve(ROOT, process.argv[2] || 'final/seen_from_space.mp4');

// [start, end] in film seconds
const CUTS = {
  'seen_from_space_30s.mp4': [
    [4.5, 10.5],    // the street, the one dark house; Grandad at the window
    [23.0, 25.0],   // Nell decides
    [68.0, 72.0],   // the Turn: "This bit needs more people. Who lives on his street?"
    [91.6, 94.0],   // the ladder comes out first; the nod
    [97.0, 98.6],   // the street springs into action
    [122.4, 124.6], // the switch: click, nothing
    [134.8, 140.3], // she twists; THE NOTE LANDS; the blaze
    [151.7, 154.0], // seen from space
    [164.0, 168.0], // end card
  ],
  'seen_from_space_10s.mp4': [
    [6.0, 8.5],     // one dark house
    [135.0, 140.0], // the twist, the blaze
    [164.5, 167.0], // end card
  ],
};
for (const [name, segs] of Object.entries(CUTS)) {
  const fade = 0.12;
  const parts = [], labels = [];
  segs.forEach(([a, b], i) => {
    const d = b - a;
    parts.push(`[0:v]trim=${a}:${b},setpts=PTS-STARTPTS[v${i}]`);
    parts.push(`[0:a]atrim=${a}:${b},asetpts=PTS-STARTPTS,afade=t=in:d=${fade},afade=t=out:st=${(d - fade).toFixed(3)}:d=${fade}[a${i}]`);
    labels.push(`[v${i}][a${i}]`);
  });
  const fc = parts.join(';') + ';' + labels.join('') + `concat=n=${segs.length}:v=1:a=1[v][a]`;
  const out = path.join(ROOT, 'final', name);
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-filter_complex', fc, '-map', '[v]', '-map', '[a]',
    '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-preset', 'slow', '-crf', '20', '-c:a', 'aac', '-b:a', '320k', '-movflags', '+faststart', out], { stdio: 'inherit' });
  const total = segs.reduce((s, [a, b]) => s + b - a, 0);
  console.log(name, r.status === 0 ? 'ok' : 'FAILED', total.toFixed(1) + 's');
}
