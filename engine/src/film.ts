// The film: edit decision list -> shot functions.
import edl from '../../film/edl.json';
import { F, Stage, W, H } from './core/stage';
import { onTwos } from './core/anim';
import { handText } from './draw/letters';

export type ShotFn = (f: F) => void;
const REG: Record<string, ShotFn> = {};
export function shot(id: string, fn: ShotFn) { REG[id] = fn; }
const LAB: Record<string, { fn: ShotFn; dur: number }> = {};
/** Development frames (turnarounds, tests) that are not part of the film. */
export function lab(id: string, fn: ShotFn, dur = 4) { LAB[id] = { fn, dur }; }
export function drawLab(stage: Stage, id: string, t: number): F['grade'] {
  const L = LAB[id]; if (!L) throw new Error('no lab ' + id);
  stage.begin();
  const frame = Math.round(t * FPS);
  const f: F = { t: onTwos(t), tc: t, dur: L.dur, frame, boil: Math.floor(frame / 2), S: stage.S, ctx: stage.ctx, glow: stage.glow, grade: stage.newGrade(), stage, shotId: id };
  L.fn(f);
  return f.grade;
}

export interface ShotRange { id: string; seq: string; start: number; end: number; dur: number; action: string; cam: string; }
export const FPS = edl.fps;
export const RANGES: ShotRange[] = [];
{
  let fr = 0;
  for (const s of edl.shots) {
    const n = Math.round(s.dur * FPS);
    RANGES.push({ id: s.id, seq: s.seq, start: fr, end: fr + n, dur: s.dur, action: s.action, cam: s.cam });
    fr += n;
  }
}
export const TOTAL_FRAMES = RANGES[RANGES.length - 1].end;
export function shotAt(frame: number): ShotRange {
  for (const r of RANGES) if (frame < r.end) return r;
  return RANGES[RANGES.length - 1];
}
export function shotStart(id: string): number { return RANGES.find((r) => r.id === id)!.start; }

/** Placeholder slate for shots not yet built: keeps the film complete at full length. */
function slate(f: F, r: ShotRange) {
  const c = f.ctx;
  c.fillStyle = '#1b2440'; c.fillRect(0, 0, W, H);
  c.fillStyle = '#e9dcc0';
  handText(c, r.id, 120, 200, 90, { seed: 3, color: '#e9dcc0', weight: 1.2 });
  c.font = '36px Inter'; c.fillStyle = '#c9c0ad';
  const words = r.action.split(' '); let line = '', y = 380;
  for (const w of words) { if ((line + w).length > 60) { c.fillText(line, 120, y); y += 50; line = ''; } line += w + ' '; }
  c.fillText(line, 120, y);
  c.font = '28px Inter'; c.fillStyle = '#8e8a9e'; c.fillText(r.cam, 120, y + 80);
}

export function drawFrame(stage: Stage, frame: number): F['grade'] {
  const r = shotAt(frame);
  const local = (frame - r.start) / FPS;
  stage.begin();
  const f: F = {
    t: onTwos(local), tc: local, dur: r.dur, frame, boil: Math.floor(frame / 2),
    S: stage.S, ctx: stage.ctx, glow: stage.glow, grade: stage.newGrade(), stage, shotId: r.id,
  };
  const fn = REG[r.id];
  if (fn) fn(f); else slate(f, r);
  return f.grade;
}
