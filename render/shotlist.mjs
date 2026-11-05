// Generates writers_room/shot_list.md from film/edl.json (the single source of truth for timing).
import fs from 'fs';
const edl = JSON.parse(fs.readFileSync(new URL('../film/edl.json', import.meta.url)));
const fps = edl.fps;
const tc = (s) => { const f = Math.round(s * fps); const m = Math.floor(f / (60 * fps)); const sec = Math.floor(f / fps) % 60; const fr = f % fps; return `${m}:${String(sec).padStart(2, '0')}:${String(fr).padStart(2, '0')}`; };
const seqNames = { A: 'The only dark house', B: 'Nell decides', C: 'The shed', D: 'The Operation ★ (misdirect)', E: 'The Turn ★', F: 'Knocking on doors', G: 'Christmas Eve', H: 'The Dead Switch ★', I: 'Grandad finishes it ★', J: 'Seen from space ★', K: 'Coda', L: 'End card' };
let t = 0, out = `# Shot list\n\n*Generated from \`film/edl.json\` by \`node render/shotlist.mjs\`. Timecodes are m:ss:ff at ${fps} fps.*\n\n`;
let total = edl.shots.reduce((a, s) => a + s.dur, 0);
out += `**${edl.shots.length} shots · ${tc(total)} total**\n\n`;
let cur = null;
for (const s of edl.shots) {
  if (s.seq !== cur) { cur = s.seq; out += `\n### ${cur}. ${seqNames[cur]}\n\n| Shot | In | Dur | Camera | Action | Emotion | Sound / music |\n|---|---|---|---|---|---|---|\n`; }
  out += `| ${s.id} | ${tc(t)} | ${s.dur.toFixed(1)}s | ${s.cam} | ${s.action} | ${s.emotion} | ${s.sound} |\n`;
  t += s.dur;
}
fs.writeFileSync(new URL('../writers_room/shot_list.md', import.meta.url), out);
console.log('wrote shot_list.md', tc(total));
