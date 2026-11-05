// Character lineup / turnaround lab frame (for the style bible).
import { lab } from '../film';
import { W, H } from '../core/stage';
import { drawPerson } from '../chars/rig';
import * as C from '../chars/cast';
import { NIGHT, CharLight } from '../draw/shade';
import { vgrad } from '../draw/brush';
import { handText } from '../draw/letters';

const WARM: CharLight = { key: -0.6, shadow: '#7f6a8f', shadowAmt: 0.55, shadowOff: 14, shadowSoft: 4, rim: '#ffd9a0', rimAmt: 0.5, rimW: 4, rimDir: -2.6, ambient: '#f4e6d0', ambientAmt: 0.25 };

lab('lineup', (f) => {
  const c = f.ctx;
  vgrad(c, 0, 0, W, H, [[0, '#e9dfcc'], [1, '#d8cbb3']]);
  f.grade.vignette = 0.2; f.grade.bloom = 0.3;
  const people = [C.GRANDAD, C.GRANDAD_OUT, C.NELL, C.NELL_HOME, C.MUM, C.DAD, C.LADDER_MAN, C.OLD_LADY, C.SHOPKEEPER, C.TEEN1, C.TEEN2, C.YOUNG_DAD, C.GRANDMA_PHOTO];
  const gy = 900;
  let x = 90;
  for (const sp of people) {
    const s = 0.85;
    drawPerson(f, sp, { x, y: gy, s, turn: 0.45, flip: 1, look: { x: 0.5, y: 0 }, mouth: { smile: 0.3 } }, WARM);
    handText(c, sp.name.toUpperCase(), x, gy + 40, 18, { color: '#5a4a3a', align: 'center', seed: x });
    x += sp.shoulderW * s + 70;
  }
});

lab('nell_turn', (f) => {
  const c = f.ctx;
  vgrad(c, 0, 0, W, H, [[0, '#e9dfcc'], [1, '#d8cbb3']]);
  f.grade.vignette = 0.2; f.grade.bloom = 0.3;
  const turns = [-1, -0.5, 0, 0.5, 1];
  turns.forEach((tu, i) => {
    const x = 240 + i * 360;
    drawPerson(f, C.NELL, { x, y: 560, s: 1.55, turn: Math.abs(tu), flip: tu < 0 ? -1 : 1, mouth: { smile: 0.3 } }, WARM);
  });
  const ex: [string, any][] = [
    ['NEUTRAL', {}], ['SAD', { browIn: 1, mouth: { smile: -0.6 }, nod: 0.3 }], ['DETERMINED', { browIn: -1, mouth: { smile: -0.2, w: 0.7 } }],
    ['SURPRISE', { browUp: 1, mouth: { open: 0.6, smile: 0 } }], ['JOY', { browUp: 0.5, mouth: { open: 0.5, smile: 1 }, cheek: 1 }], ['WORRIED', { browIn: 0.7, browUp: 0.4, look: { x: -1, y: 0 } }],
  ];
  ex.forEach(([n, e], i) => {
    const x = 170 + i * 300;
    drawPerson(f, C.NELL, { x, y: 1150, s: 1.6, turn: 0.15, ...e }, WARM);
    handText(c, n, x, 1010, 22, { color: '#5a4a3a', align: 'center', seed: i });
  });
});

lab('grandad_turn', (f) => {
  const c = f.ctx;
  vgrad(c, 0, 0, W, H, [[0, '#e9dfcc'], [1, '#d8cbb3']]);
  f.grade.vignette = 0.2; f.grade.bloom = 0.3;
  [-1, -0.5, 0, 0.5, 1].forEach((tu, i) => {
    drawPerson(f, C.GRANDAD, { x: 200 + i * 300, y: 980, s: 0.95, turn: Math.abs(tu), flip: tu < 0 ? -1 : 1 }, WARM);
  });
  const ex: [string, any][] = [['CLOSED', { browIn: 0.3, nod: 0.4, mouth: { smile: -0.2 } }], ['STRUCK', { browUp: 0.8, browIn: 0.6 }], ['LAUGH', { browUp: 0.6, mouth: { open: 0.8, smile: 1 }, eyesClosed: true }]];
  ex.forEach(([n, e], i) => {
    drawPerson(f, C.GRANDAD, { x: 1640, y: 560 + i * 330, s: 0.0001 + 0 }, null);
  });
  void ex;
});
