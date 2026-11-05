// Sequence K: coda. The armchair is no longer empty.
import { shot } from '../film';
import { F, W, H } from '../core/stage';
import { prog, track, blink } from '../core/anim';
import { ease, lerp, v2 } from '../core/math';
import { drawLivingRoom, drawArmchair, drawCardigan, LR } from '../sets/livingroom';
import { rToScreen, rcamApply } from '../sets/bedroom';
import { drawPerson } from '../chars/rig';
import * as C from '../chars/cast';
import { CharLight } from '../draw/shade';
import { drawTablet } from '../draw/tablet';
import { mug } from './seqA';

const L_CODA: CharLight = {
  key: 0.5, shadow: '#5a3a5a', shadowAmt: 0.5, shadowOff: 14, shadowSoft: 6,
  rim: '#ffb0d0', rimAmt: 0.6, rimW: 5, rimDir: -0.3, ambient: '#e9c9a8', ambientAmt: 0.35,
};
/** K1: this time he drinks (it's warm now). */
function drink(t: number) { return track(t, [[0, 0], [3.2, 0], [3.8, 1, ease.inOutSine], [4.6, 1], [5.2, 0.2, ease.inOutSine]]); }
export const CODA_MSG = 'it worked. the whole street came.';

export const CODA_REPLY = 'You knocked on the doors. Happy Christmas, Nell.';
export const CODA_WITH_REPLY = false; // decided in DECISIONS.md after testing both

shot('K1', (f) => {
  const t = f.t;
  // start on the tablet (readable), pull back to the whole picture
  const u = prog(f.tc, 0.6, f.dur - 0.3, ease.inOutCubic);
  const cx = LR.chair.x;
  const tabW = { x: cx + 30, y: -175 };
  const cam = { x: lerp(tabW.x, cx + 120, u), y: lerp(tabW.y, -270, u), z: lerp(11, 1.75, Math.pow(u, 0.8)) };
  drawLivingRoom(f, { ...cam }, { outsideOn: 1, blaze: 1, lamp: 1 });
  drawArmchair(f, cam, cx, {});
  const np = rToScreen(cam, v2(cx - 20, -112));
  drawPerson(f, C.NELL_HOME, {
    x: np.x, y: np.y, s: cam.z * 0.95, flip: 1, turn: 0.3, hipDrop: 30, legF: { a: 1.5, b: -2.3 }, legB: { a: 1.4, b: -2.4 },
    lean: -0.25, headTilt: 0.45, eyesClosed: true, mouth: { smile: 0.35 }, armF: { a: 0.9, b: 1.4 }, armB: { a: 0.7, b: 1.3 }, cheek: 0.6,
  }, L_CODA);
  const c = f.ctx;
  c.save(); rcamApply(c, cam);
  drawCardigan(c, cx - 40, -200, 1.5);
  c.save(); c.translate(tabW.x, tabW.y); c.rotate(-0.12);
  const msgs: any[] = [{ who: 'me', text: CODA_MSG }];
  if (CODA_WITH_REPLY) msgs.push({ who: 'reply', text: CODA_REPLY, reveal: prog(t, 1.2, 2.4, ease.linear) });
  drawTablet(f, c, -70, -50, 140, 100, { msgs, font: 64 }, { glowAmt: 0.6 });
  c.restore();
  c.restore();
  const gp = rToScreen(cam, v2(cx + 330, 0));
  drawPerson(f, C.GRANDAD, {
    x: gp.x, y: gp.y, s: cam.z, flip: -1, turn: 0.6, hipDrop: 80, legF: { a: 1.4, b: -1.6 }, legB: { a: 1.2, b: -1.5 },
    lean: 0.15, armF: { a: 0.35 + 0.6 * drink(t), b: 2.0 + 0.5 * drink(t) }, holdF: mug, look: { x: 1, y: 0.4 - 0.5 * drink(t) }, mouth: { smile: 0.8 }, browUp: 0.2, blink: blink(t, [3.4]), nod: 0.2 - 0.3 * drink(t),
  }, L_CODA);
  f.grade.vignette = 0.5; f.grade.saturation = 1.05; f.grade.gain = [1.04, 1.0, 0.94];
});
