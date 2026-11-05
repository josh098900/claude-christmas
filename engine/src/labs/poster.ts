// Key art: the blaze, framed for a 2:3 portrait crop of the central band (x 600..1320).
import { lab } from '../film';
import { W, H } from '../core/stage';
import { drawStreet, snowfall, doorRect } from '../sets/street';
import { TERRACE } from '../shots/seqA';
import { personInStreet, L_BLAZE_FRONT, L_BLAZE_BACK } from '../shots/common';
import { drawPerson } from '../chars/rig';
import * as C from '../chars/cast';
import { handText } from '../draw/letters';
import { glow } from '../draw/light';

const GH = TERRACE.find((h) => h.grandad)!;
const DR = doorRect(GH);

lab('poster', (f) => {
  const cam = { x: 0, y: -470, z: 1.0 };
  drawStreet(f, { mood: 'eve', cam, houses: TERRACE, lit: (h) => (Math.abs(h.i) > 2 ? 1 : 0), windows: (h) => (h.grandad ? 0.6 : Math.abs(h.i) > 2 ? 1 : 0), blaze: 1, blazeOn: 1, lampsOn: 1, bellFrost: 0 });
  const doorX = DR.x + DR.w / 2;
  personInStreet(f, cam, C.GRANDAD_OUT, DR.x - 120, 40, { flip: 1, turn: 0.6, hipDrop: 92, legF: { a: 1.5, b: -1.55 }, legB: { a: -0.25, b: -1.35 }, lean: 0.0, headTilt: -0.3, look: { x: 0.4, y: -1 }, mouth: { open: 0.6, smile: 1 }, eyesClosed: true, browUp: 0.8, armF: { a: 1.6, b: 0.6 } }, L_BLAZE_FRONT);
  personInStreet(f, cam, C.NELL, DR.x - 30, 50, { flip: -1, turn: 0.4, armF: { a: 2.6, b: -0.08 }, armFLen: 1.6, look: { x: -0.2, y: -1 }, headTilt: -0.25, browUp: 1, mouth: { open: 0.6, smile: 1 }, cheek: 1 }, L_BLAZE_FRONT);
  for (const [sp, x, y, s] of [[C.LADDER_MAN, 640, 1420, 1.0], [C.OLD_LADY, 790, 1330, 1.05], [C.TEEN1, 1290, 1420, 0.95], [C.YOUNG_DAD, 1160, 1390, 1.0]] as const) {
    drawPerson(f, sp, { x, y, s, back: true, turn: 0, flip: 1, headTilt: -0.15, armF: { a: 0.1, b: 0.2 } }, L_BLAZE_BACK);
  }
  snowfall(f, 0.6, 0.2, 13, '#ffd6a0');
  // the dot in the sky she's pointing at
  glow(f.glow, 1150, 60, 14, '#ffe2b0', 0.8); glow(f.glow, 1150, 60, 4, '#ffffff', 1);
  const c = f.ctx;
  handText(c, 'SEEN', W / 2, 120, 92, { color: '#f6ead2', align: 'center', seed: 31, weight: 1.25, slant: 0.04, wobble: 1.1 });
  handText(c, 'FROM SPACE', W / 2, 230, 72, { color: '#f6ead2', align: 'center', seed: 37, weight: 1.2, slant: 0.04, wobble: 1.1 });
  c.textAlign = 'center'; c.fillStyle = 'rgba(246,234,210,0.92)'; c.font = '600 34px Inter'; c.fillText('Claude', W / 2, 1012);
  c.fillStyle = 'rgba(200,196,214,0.7)'; c.font = '400 13px Inter'; c.fillText('Fan-made. Not affiliated with or endorsed by Anthropic.', W / 2, 1050); c.textAlign = 'left';
  f.grade.saturation = 1.15; f.grade.bloom = 1.2; f.grade.vignette = 0.5;
});

// Coda test: the tablet with and without a reply (decision logged in DECISIONS.md).
import { drawTablet } from '../draw/tablet';
import { vgrad } from '../draw/brush';
for (const withReply of [false, true]) {
  lab(withReply ? 'coda_reply' : 'coda_noreply', (f) => {
    const c = f.ctx;
    vgrad(c, 0, 0, W, H, [[0, '#3a2a3a'], [1, '#5a3a3a']]);
    glow(f.glow, W / 2, H / 2, 900, '#ffb070', 0.2);
    const msgs: any[] = [{ who: 'me', text: 'it worked. the whole street came.' }];
    if (withReply) msgs.push({ who: 'reply', text: 'You knocked on the doors. Happy Christmas, Nell.' });
    c.save(); c.translate(W / 2, H / 2); c.rotate(-0.08);
    drawTablet(f, c, -560, -400, 1120, 800, { msgs, font: 52 }, { glowAmt: 0.8 });
    c.restore();
  });
}
