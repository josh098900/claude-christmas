// Sequence I: Grandad finishes it. THE BLAZE.
import { shot } from '../film';
import { prog, settle } from '../core/anim';
import { ease, lerp, clamp, hash1, v2 } from '../core/math';
import { drawStreet, snowfall, makeTerrace, doorRect, toScreen, HOUSE_W } from '../sets/street';
import { drawPerson } from '../chars/rig';
import * as C from '../chars/cast';
import { personInStreet, STREET_S, L_BLAZE_BACK, L_BLAZE_FRONT } from './common';

const TERRACE = makeTerrace(-7, 7);
const GH = TERRACE.find((h) => h.grandad)!;
const DR = doorRect(GH);

// I4: the blaze. Wide, low, from behind the crowd.
shot('I4', (f) => {
  const t = f.tc;
  const flash = clamp(1 - t / 0.5);
  const u = prog(t, 0, f.dur, ease.outCubic);
  const cam = { x: lerp(20, 30, u), y: lerp(-300, -330, u), z: lerp(1.08, 1.16, u) };
  drawStreet(f, {
    mood: 'eve', cam, houses: TERRACE,
    lit: () => 0, windows: (h) => (h.grandad ? 0.6 : 0),
    blaze: 1, blazeOn: clamp(t * 12), lampsOn: 0, bellFrost: 0,
  });
  // Nell and Grandad at the door, small, lit full-on
  const doorX = DR.x + DR.w / 2;
  personInStreet(f, cam, C.GRANDAD_OUT, doorX - 70, 30, { flip: 1, turn: 0.2, hipDrop: 70, legF: { a: 1.4, b: -1.5 }, legB: { a: -0.3, b: -1.2 }, lean: -0.1, browUp: 0.7, mouth: { open: 0.3, smile: 0.6 }, armF: { a: 0.5, b: 0.4 } }, L_BLAZE_FRONT);
  personInStreet(f, cam, C.NELL, doorX + 40, 30, { flip: -1, turn: 0.3, browUp: 1, mouth: { open: 0.6, smile: 0.9 }, armF: { a: 0.6, b: 0.6 }, cheek: 1 }, L_BLAZE_FRONT);
  // the crowd, from behind, heads and shoulders against the blaze
  const crowd: [typeof C.NELL, number, number, number][] = [
    [C.MUM, 90, 1420, 1.45], [C.LADDER_MAN, 360, 1500, 1.4], [C.OLD_LADY, 640, 1320, 1.5], [C.SHOPKEEPER, 1290, 1420, 1.4],
    [C.TEEN2, 1530, 1440, 1.42], [C.TEEN1, 1760, 1520, 1.35], [C.YOUNG_DAD, 1960, 1440, 1.4],
  ];
  for (const [sp, x, y, s] of crowd) {
    drawPerson(f, sp, { x, y: y + Math.sin(t * 1.3 + x) * 3, s, back: true, turn: 0, flip: 1, headTilt: -0.12 + hash1(x) * 0.1, armF: { a: 0.1, b: 0.2 }, armB: { a: -0.1, b: 0.2 } }, L_BLAZE_BACK);
  }
  snowfall(f, 0.7, 0.2, 7, '#ffd6a0');
  const g = f.grade;
  g.saturation = 1.18; g.bloom = 1.25; g.bloomThreshold = 0.62; g.exposure = 1.0 + flash * 0.35; g.vignette = 0.4;
  g.gain = [1.04, 1.0, 0.95];
});
