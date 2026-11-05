// Sequence D: THE OPERATION (the misdirect).
import { shot } from '../film';
import { F, W, H } from '../core/stage';
import { prog, track, blink } from '../core/anim';
import { ease, lerp, clamp, v2 } from '../core/math';
import { drawRoom, drawDesk, rcamApply, rToScreen, RCam, DESK_Y, planWall } from '../sets/bedroom';
import { drawTablet, typed, TabletState } from '../draw/tablet';
import { drawPerson, Pose } from '../chars/rig';
import * as C from '../chars/cast';
import { CharLight } from '../draw/shade';
import { glow } from '../draw/light';

export const Q1 = 'why does 1 bulb make them ALL go off';
export const Q2 = 'how to find the broken bulb in xmas lights';
export const Q3 = 'how many lights do you need to be seen from space';
export const R1 = 'Old strings are wired in a line, so when one bulb fails the circuit breaks and the whole string goes dark. Find the one and the rest come back.';
export const R2 = 'Start at the plug end and test each bulb in turn. A tester helps. Work slowly and keep the dud ones separate.';
export const R3 = 'Nobody can see one house from space with their eyes. But from a plane, or from a hill, a bright street really stands out.';

export function nellDeskLight(tabletScreen: { x: number; y: number }, amt = 1): CharLight {
  return {
    key: -0.3, shadow: '#283063', shadowAmt: 0.75, shadowOff: 16, shadowSoft: 5,
    rim: '#7f9cf0', rimAmt: 0.55, rimW: 4, rimDir: -2.5, ambient: '#5a64a8', ambientAmt: 0.62,
    spots: [{ x: tabletScreen.x - 60, y: tabletScreen.y - 120, r: 640, color: '#ffc98e', a: 0.75 * amt }],
  };
}

/** Nell at her desk, seen from the side, the tablet in front of her. */
export function deskScene(f: F, cam: RCam, pose: Partial<Pose>, tab: TabletState, o: { jar?: number; tangles?: number; glowAmt?: number } = {}) {
  drawRoom(f, cam, {});
  const tabW = { x: 120, y: DESK_Y - 30 };
  const tabS = rToScreen(cam, tabW);
  // Nell seated
  const feet = rToScreen(cam, v2(0, -10));
  drawPerson(f, C.NELL_HOME, {
    x: feet.x, y: feet.y, s: cam.z * 1.0, flip: 1, turn: 0.7, hipDrop: -72,
    legF: { a: 1.45, b: -1.45 }, legB: { a: 1.35, b: -1.4 },
    armF: { a: 1.1, b: 0.5 }, armB: { a: 1.0, b: 0.6 }, lean: 0.12,
    look: { x: 1, y: 0.3 }, ...pose,
  } as Pose, nellDeskLight(tabS, o.glowAmt ?? 1));
  // desk in front
  const c = f.ctx;
  c.save(); f.glow.save(); rcamApply(c, cam); rcamApply(f.glow, cam);
  drawDesk(f, c, { jar: o.jar ?? 0.3, tangles: o.tangles ?? 2 });
  // tablet on a little stand, screen facing Nell (we see its back edge at an angle)
  c.save(); c.translate(tabW.x, tabW.y); c.rotate(-0.25);
  c.fillStyle = '#2a2d36'; c.beginPath(); c.roundRect(-8, -92, 16, 100, 6); c.fill();
  c.fillStyle = '#ffe2b8'; c.globalAlpha = 0.9; c.fillRect(-10, -88, 3, 92); c.globalAlpha = 1;
  c.restore();
  glow(f.glow, tabW.x - 20, tabW.y - 50, 260, '#ffc98e', 0.32 * (o.glowAmt ?? 1));
  c.restore(); f.glow.restore();
  f.grade.vignette = 0.55; f.grade.bloom = 0.8;
}

/** The tablet filling the frame: a kid typing; replies arrive soft and out of focus. */
export function tabletCU(f: F, st: TabletState, o: { zoom?: number; drift?: number } = {}) {
  const c = f.ctx;
  // dark desk background, warm light falling from the screen
  c.fillStyle = '#141a33'; c.fillRect(0, 0, W, H);
  const g = c.createRadialGradient(W / 2, H * 0.9, 50, W / 2, H * 0.7, 1100);
  g.addColorStop(0, '#5a4a52'); g.addColorStop(1, '#141a33');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  const z = o.zoom ?? 1;
  const tw = 1180 * z, th = 860 * z;
  const tx = W / 2 - tw / 2 + (o.drift ?? 0), ty = H / 2 - th / 2 + 30;
  drawTablet(f, c, tx, ty, tw, th, { font: 46, ...st }, { glowAmt: 0.9 });
  f.grade.vignette = 0.6; f.grade.bloom = 0.5; f.grade.bloomThreshold = 0.92;
}

shot('D8', (f) => {
  const t = f.t;
  if (f.tc < 1.5) {
    const ty = typed(Q3, t, 0.0, 34);
    tabletCU(f, { msgs: [{ who: 'me', text: Q1 }, { who: 'reply', text: R1, blur: 7 }, { who: 'me', text: Q2 }, { who: 'reply', text: R2, blur: 7 }], typing: ty, caret: true }, { zoom: 1.05 });
  } else {
    const u = (f.tc - 1.5) / 1.5;
    const cam = { x: lerp(40, 55, u), y: -250, z: lerp(3.1, 3.25, u) };
    const up = track(t - 1.5, [[0, 0], [0.35, 1.0], [1.5, 1.1]]);
    deskScene(f, cam, { browUp: up, mouth: { open: 0.15 + up * 0.25, smile: 0.2 }, blink: blink(t, [2.6]), headTilt: -0.05, look: { x: 1, y: -0.1 } },
      { msgs: [] }, { jar: 0.55, tangles: 3 });
  }
});
