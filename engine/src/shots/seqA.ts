// Sequence A: the only dark house.
import { shot } from '../film';
import { F, W, H, C2D } from '../core/stage';
import { prog, track, blink } from '../core/anim';
import { ease, lerp, clamp, v2, V2, TAU } from '../core/math';
import { drawStreet, snowfall, makeTerrace, toScreen, doorRect } from '../sets/street';
import { drawLivingRoom, drawArmchair, LR } from '../sets/livingroom';
import { rToScreen } from '../sets/bedroom';
import { drawPerson } from '../chars/rig';
import * as C from '../chars/cast';
import { CharLight } from '../draw/shade';
import { drawPhoto } from './photo';
import { glow } from '../draw/light';

export const TERRACE = makeTerrace(-7, 7);

/** Cold window light on Grandad: no warmth reaches him. */
export const L_GRANDAD_WINDOW: CharLight = {
  key: -0.2, shadow: '#1f2650', shadowAmt: 0.8, shadowOff: 18, shadowSoft: 5,
  rim: '#8fb0ff', rimAmt: 0.75, rimW: 5, rimDir: -0.4, ambient: '#7480b8', ambientAmt: 0.55,
};

/** A3: he lifts the mug, pauses, and lowers it without drinking: the tea has gone cold. */
function sip(t: number) { return track(t, [[0, 0], [1.2, 0], [1.8, 1, ease.inOutSine], [2.4, 1], [3.0, 0, ease.inOutSine]]); }

export function mug(x: C2D, h: V2, ang: number) {
  x.save(); x.translate(h.x, h.y - 4); x.rotate(0);
  x.fillStyle = '#d8d0c0'; x.beginPath(); x.roundRect(-13, -26, 26, 30, 4); x.fill();
  x.strokeStyle = '#d8d0c0'; x.lineWidth = 5; x.beginPath(); x.arc(14, -12, 8, -1.2, 1.2); x.stroke();
  x.fillStyle = '#7a4a3a'; x.fillRect(-11, -24, 22, 5);
  x.restore();
  void ang;
}

shot('A2', (f) => {
  const u = prog(f.tc, 0, f.dur, ease.inOutSine);
  const cam = { x: lerp(-40, 0, u), y: lerp(-320, -340, u), z: lerp(0.55, 0.82, u) };
  drawStreet(f, {
    mood: 'dusk', cam, houses: TERRACE,
    lit: (h) => (h.grandad ? 0 : 1), windows: (h) => (h.grandad ? 0 : 1),
    snow: 1, lampsOn: 1,
  });
  snowfall(f, 0.8, 0.25, 1);
  f.grade.vignette = 0.45; f.grade.bloom = 1.0;
});

// A3: Grandad at the dark window with a cold mug.
shot('A3', (f) => {
  const u = prog(f.tc, 0, f.dur, ease.inOutSine);
  const cam = { x: lerp(640, 660, u), y: -320, z: lerp(1.85, 1.95, u) };
  drawLivingRoom(f, cam, { outsideOn: 1 });
  drawArmchair(f, cam, LR.chair.x, { cardigan: true });
  const p = rToScreen(cam, v2(880, 10));
  drawPerson(f, C.GRANDAD, {
    x: p.x, y: p.y, s: cam.z * 1.0, flip: -1, turn: 0.9, armF: { a: 0.35 + 0.55 * sip(f.t), b: 2.0 + 0.45 * sip(f.t) }, armB: { a: 0.1, b: 0.25 }, bob: Math.sin(f.t * 1.6) * 1.2, headTilt: -0.05 * sip(f.t),
    holdF: mug, nod: 0.2, browIn: 0.35, mouth: { smile: -0.15 }, blink: blink(f.t, [1.6]), look: { x: 1, y: 0.1 },
  }, L_GRANDAD_WINDOW);
  f.grade.vignette = 0.6; f.grade.bloom = 0.8; f.grade.saturation = 0.9;
});

// A4: the empty armchair, Grandma's cardigan over its arm.
shot('A4', (f) => {
  const u = prog(f.tc, 0, f.dur, ease.inOutSine);
  const cam = { x: LR.chair.x + 20, y: -260, z: lerp(2.2, 2.3, u) };
  drawLivingRoom(f, cam, { outsideOn: 1 });
  drawArmchair(f, cam, LR.chair.x, { cardigan: true });
  f.grade.vignette = 0.62; f.grade.saturation = 0.88;
});

// A5: the photo on the mantel. Slow push-in.
shot('A5', (f) => {
  const u = prog(f.tc, 0, f.dur, ease.inOutSine);
  const cam = { x: LR.photo.x + 60, y: -330, z: lerp(5.0, 5.4, u) };
  drawLivingRoom(f, cam, { outsideOn: 1, shaftAmt: 0 });
  const z = lerp(1.0, 1.1, u);
  const w = 660 * z, h = 760 * z;
  drawPhoto(f, W / 2 - w / 2 - 120, H / 2 - h / 2 - 30, w, h);
  // the clock beside, ticking
  glow(f.glow, W / 2, H / 2, 600, '#ffcf90', 0.06);
  f.grade.vignette = 0.6;
});

// A1: the glide over the rooftops at dusk, descending toward the one dark house.
import { drawTown } from '../sets/town3d';
shot('A1', (f) => {
  const u = prog(f.tc, 0, f.dur, ease.inOutSine);
  const cam = { x: lerp(-60, 0, u), y: lerp(78, 14, u), z: lerp(-430, -24, u), pitch: lerp(0.38, 0.33, u), f: 1250 };
  drawTown(f, cam, { dusk: 1, grandadDark: true, fog: 700 });
  snowfall(f, 0.6, 0.3, 2);
  f.grade.vignette = 0.5; f.grade.bloom = 0.9;
  f.grade.fade = clamp(1 - f.tc / 0.8); // fade up from black
});
