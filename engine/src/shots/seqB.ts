// Sequence B: Nell decides.
import { shot } from '../film';
import { F, W, H, C2D } from '../core/stage';
import { prog, track, blink, settle } from '../core/anim';
import { ease, lerp, clamp, v2, TAU } from '../core/math';
import { drawLivingRoom, drawArmchair, LR } from '../sets/livingroom';
import { rToScreen, rcamApply } from '../sets/bedroom';
import { drawPerson } from '../chars/rig';
import * as C from '../chars/cast';
import { CharLight } from '../draw/shade';
import { handText } from '../draw/letters';
import { handRect, vgrad } from '../draw/brush';
import { glow } from '../draw/light';
import { L_GRANDAD_WINDOW, mug } from './seqA';

const L_NELL_ROOM: CharLight = {
  key: 0.1, shadow: '#262c5c', shadowAmt: 0.7, shadowOff: 14, shadowSoft: 5,
  rim: '#9db8ff', rimAmt: 0.7, rimW: 5, rimDir: -0.3, ambient: '#6670aa', ambientAmt: 0.6,
};
const SIT = { hipDrop: 46, legF: { a: 1.35, b: -2.4 }, legB: { a: 1.2, b: -2.45 } };

// B1: Nell on the rug looks up at the photo.
shot('B1', (f) => {
  const t = f.t;
  const u = prog(f.tc, 0, f.dur, ease.inOutSine);
  const cam = { x: lerp(-470, -480, u), y: -178, z: 2.75 };
  drawLivingRoom(f, cam, { outsideOn: 1 });
  const p = rToScreen(cam, v2(-360, 70));
  const look = track(t, [[0, 0], [0.6, 1, ease.outCubic], [3, 1]]);
  drawPerson(f, C.NELL_HOME, {
    x: p.x, y: p.y, s: cam.z, flip: -1, turn: 0.92, ...SIT, armF: { a: 0.6, b: 0.9 }, armB: { a: 0.4, b: 1.0 },
    look: { x: 1, y: -look }, headTilt: -0.38 * look, browUp: 0.35 * look, browIn: 0.5 * look, blink: blink(t, [2.1]), mouth: { smile: 0 }, lean: -0.08 * look,
  }, L_NELL_ROOM);
  f.grade.vignette = 0.58;
});

// B2: over her shoulder: the twinkling street, Grandad's still back.
shot('B2', (f) => {
  const t = f.t;
  const cam = { x: 520, y: -320, z: 1.75 };
  drawLivingRoom(f, cam, { outsideOn: 1 });
  drawArmchair(f, cam, LR.chair.x, { cardigan: true });
  const gp = rToScreen(cam, v2(760, 10));
  drawPerson(f, C.GRANDAD, { x: gp.x, y: gp.y, s: cam.z, flip: -1, turn: 0.95, armF: { a: 0.3, b: 1.95 }, holdF: mug, nod: 0.35, browIn: 0.5, mouth: { smile: -0.25 }, look: { x: 1, y: 0.2 }, blink: blink(t, [1.5]) }, L_GRANDAD_WINDOW);
  // Nell big in the foreground left, from behind
  const turnHead = track(t, [[0, 0], [1.0, 0], [1.4, 1]]);
  drawPerson(f, C.NELL_HOME, { x: 300, y: 1560, s: 3.0, flip: 1, turn: 0.2 + turnHead * 0.3, back: true, headTilt: -0.05 + turnHead * 0.06, armF: { a: 0.2, b: 0.3 } }, { ...L_NELL_ROOM, ambientAmt: 0.7, rimAmt: 1.0, rimW: 7, rimDir: -0.6 });
  f.grade.vignette = 0.6;
});

// B3: CU Nell. Sad, knit, set. Decision.
shot('B3', (f) => {
  const t = f.t;
  const c = f.ctx;
  vgrad(c, 0, 0, W, H, [[0, '#18203f'], [1, '#26305a']]);
  glow(f.glow, 1500, 300, 700, '#6f8fe0', 0.15);
  // a light crossing the night sky through the window behind her, blinking (a plane? a sleigh?): the idea arrives
  {
    const bx = 1080 + f.tc * 150, by = 120 - f.tc * 14;
    const on = Math.floor(f.tc * 2.4) % 2 === 0;
    glow(f.glow, bx, by, on ? 34 : 16, on ? "#ff5040" : "#fff4e0", on ? 1 : 0.7);
    glow(f.glow, bx, by, 4, '#ffffff', 0.9);
  }
  // out-of-focus window lights behind her
  for (let i = 0; i < 14; i++) glow(f.glow, 1350 + (i % 7) * 80, 200 + Math.floor(i / 7) * 60 + (i % 2) * 20, 60, ['#ff3b2e', '#2fd665', '#ffae2b', '#3f7dff', '#fff1cf'][i % 5], 0.22);
  const sad = track(t, [[0, 0.3], [0.5, 0.9], [1.1, 0.9]]);
  const set = track(t, [[0, 0], [1.1, 0], [1.5, 1, ease.outBack], [2.5, 1]]);
  const browIn = lerp(sad, -0.55, set);
  drawPerson(f, C.NELL_HOME, {
    x: 960, y: 1610, s: 5.2, flip: 1, turn: 0.25, look: { x: lerp(-0.6, 0.95, set), y: lerp(-0.5, -1.0, set) }, browIn, browUp: lerp(0.15, 0.25, set),
    mouth: { smile: lerp(-0.4, 0.3, set), w: lerp(1, 0.8, set) }, nod: lerp(0.15, -0.12, set), blink: blink(t, [0.9]), headTilt: lerp(0.06, -0.06, set),
  }, { ...L_NELL_ROOM, spots: [{ x: 1300, y: 300, r: 700, color: '#8fa8ff', a: 0.25 }] });
  f.grade.vignette = 0.6;
});

// B4: the shed key on its hook, tag in Grandma's hand.
shot('B4', (f) => {
  const t = f.t;
  const c = f.ctx;
  vgrad(c, 0, 0, W, H, [[0, '#2a2a46'], [1, '#1e2038']]);
  // door frame edge
  c.fillStyle = '#4a4058'; c.beginPath(); handRect(c, 1300, -20, 260, 1120, 4, 2); c.fill();
  c.fillStyle = '#3a3248'; c.fillRect(1330, -20, 18, 1120);
  // brass hook
  c.save(); c.translate(960, 540); c.scale(1.5, 1.5); c.translate(-880, -460);
  c.fillStyle = '#b08a3a'; c.beginPath(); c.arc(860, 300, 16, 0, TAU); c.fill();
  c.strokeStyle = '#b08a3a'; c.lineWidth = 12; c.lineCap = 'round';
  c.beginPath(); c.moveTo(860, 300); c.lineTo(860, 380); c.quadraticCurveTo(860, 420, 900, 410); c.stroke();
  // key swinging a touch
  const sw = Math.sin(t * 3.2) * 0.06 * Math.exp(-t * 0.8) + 0.03;
  c.save(); c.translate(880, 410); c.rotate(sw);
  c.strokeStyle = '#8a8a8a'; c.lineWidth = 7; c.beginPath(); c.arc(0, 30, 26, 0, TAU); c.stroke();
  c.fillStyle = '#9a9488'; c.beginPath(); c.arc(0, 90, 30, 0, TAU); c.fill();
  c.fillStyle = '#2a2a46'; c.beginPath(); c.arc(0, 90, 10, 0, TAU); c.fill();
  c.fillStyle = '#9a9488'; c.fillRect(-8, 116, 16, 160); c.fillRect(8, 230, 30, 14); c.fillRect(8, 256, 22, 14);
  // paper tag on string with Grandma's handwriting
  c.strokeStyle = '#d8d0c0'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(0, 56); c.quadraticCurveTo(-60, 120, -120, 150); c.stroke();
  c.save(); c.translate(-210, 140); c.rotate(-0.12);
  c.fillStyle = '#e9dcbc'; c.beginPath(); c.moveTo(0, 0); c.lineTo(170, 0); c.lineTo(200, 40); c.lineTo(170, 80); c.lineTo(0, 80); c.closePath(); c.fill();
  c.fillStyle = '#2a2a46'; c.beginPath(); c.arc(178, 40, 7, 0, TAU); c.fill();
  handText(c, 'SHED', 18, 18, 46, { color: '#2b2f5a', slant: 0.18, wobble: 0.6, weight: 0.9, seed: 81 });
  c.restore();
  c.restore();
  c.restore();
  // a sliver of kitchen light
  glow(f.glow, 1100, 200, 600, '#ffcf90', 0.12);
  f.grade.vignette = 0.55;
});
