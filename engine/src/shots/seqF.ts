// Sequence F: knocking on doors.
import { shot } from '../film';
import { F, W, H } from '../core/stage';
import { prog, track, blink, settle, Key } from '../core/anim';
import { ease, lerp, clamp, v2, V2, hash1, TAU, noise1 } from '../core/math';
import { drawStreet, snowfall, makeTerrace, doorRect, toScreen, Cam, HOUSE_W, snowCap } from '../sets/street';
import { drawPerson, Pose, walk, Spec, Rigged } from '../chars/rig';
import * as C from '../chars/cast';
import { CharLight } from '../draw/shade';
import { glow, beam, BULB_SEQ } from '../draw/light';
import { handRect, blobEllipse, vgrad, tube } from '../draw/brush';
import { personInStreet, STREET_S, L_NIGHT_STREET } from './common';
import { drawDoorstep, DCam, dScreen, dApply, lNeighbour, lNellAtDoor, heldDrawing, mitten, drawDog, drawLadder, bulbBox, DW, DH } from '../sets/doorstep';
import { drawShop } from '../sets/shop';

const TERRACE = makeTerrace(-7, 7);
const GH = TERRACE.find((h) => h.grandad)!;

export const LADDER_MAN_HAT: Spec = { ...C.LADDER_MAN, hat: { style: 'woolly', color: '#3d5a6a', color2: '#2e4654' } };

/** Grandad, dim, standing in his dark bay window (seen through the glass). */
export function grandadInWindow(f: F, cam: Cam, alpha = 0.5, L?: CharLight) {
  const wx = GH.x + GH.w * 0.32; // bay centre
  const p0 = toScreen(cam, v2(wx - 100, -255)), p1 = toScreen(cam, v2(wx + 100, -55));
  f.ctx.save();
  f.ctx.beginPath(); f.ctx.rect(p0.x, p0.y, p1.x - p0.x, p1.y - p0.y); f.ctx.clip();
  const feet = toScreen(cam, v2(wx + 10, 40));
  drawPerson(f, C.GRANDAD, { x: feet.x, y: feet.y, s: STREET_S * cam.z * 0.95, flip: -1, turn: 0.15, nod: 0.3, browIn: 0.3, mouth: { smile: -0.2 }, armF: { a: 0.5, b: 1.6 }, armB: { a: 0.4, b: 1.7 } },
    L || { key: -1.6, shadow: '#1d2244', shadowAmt: 0.8, shadowOff: 10, shadowSoft: 4, rim: '#9fb6ff', rimAmt: 0.5, rimW: 3, rimDir: -2.6, ambient: '#3c4478', ambientAmt: 0.88 }, { alpha });
  f.ctx.restore();
}

/** Rolled-up drawing tucked under the arm. */
function roll(x: CanvasRenderingContext2D, h: V2, ang: number) {
  x.save(); x.translate(h.x, h.y - 4); x.rotate(-0.25);
  x.fillStyle = '#e6dcc4'; x.beginPath(); x.roundRect(-46, -9, 92, 18, 9); x.fill();
  x.fillStyle = '#c9bc9e'; x.beginPath(); x.ellipse(46, 0, 5, 9, 0, 0, TAU); x.fill();
  x.strokeStyle = '#c4302c'; x.lineWidth = 2; x.beginPath(); x.moveTo(8, -9); x.lineTo(8, 9); x.stroke();
  x.restore();
  void ang;
}

// ---------------------------------------------------------------- F1: the march
shot('F1', (f) => {
  const t = f.t, tc = f.tc;
  const nx = lerp(-330, 60, tc / f.dur);
  const cam: Cam = { x: lerp(-250, 40, ease.inOutSine(tc / f.dur)), y: -210, z: 1.32 };
  drawStreet(f, { mood: 'blue', cam, houses: TERRACE, lit: (h) => (h.grandad ? 0 : 0.85), windows: (h) => (h.grandad ? 0 : 1), lampsOn: 1 });
  grandadInWindow(f, cam, 0.55);
  const w = walk(t * 1.25, 0.5, 0.0);
  const p = toScreen(cam, v2(nx, 172));
  drawPerson(f, C.NELL, {
    x: p.x, y: p.y, s: STREET_S * cam.z * 1.05, flip: 1, turn: 0.7, ...w,
    armF: { a: 0.35, b: 1.25 }, armB: { a: w.armB.a * 1.6, b: 0.3 },
    browIn: -0.8, mouth: { smile: -0.1, w: 0.7 }, look: { x: 1, y: 0 }, lean: 0.12,
    plait: Math.sin(t * 1.25 * TAU * 2) * 0.8, holdF: roll,
  }, { ...L_NIGHT_STREET, key: -1.3, rimDir: -2.8, spots: [{ x: toScreen(cam, v2(HOUSE_W * 0.98 - 800, -340)).x, y: toScreen(cam, v2(0, -340)).y, r: 500, color: '#ffcf96', a: 0.2 }] });
  snowfall(f, 0.6, 0.25, 11);
  f.grade.vignette = 0.45; f.grade.bloom = 0.9;
});

// ---------------------------------------------------------------- doorstep staging
interface DoorBeat {
  look: Key[];       // 0 = at drawing, 1 = across the street
  nod: Key[];        // nod amount
  soften: Key[];     // 0 neutral, 1 tender
}
function neighbourPose(t: number, b: DoorBeat, extra: Partial<Pose> = {}): Partial<Pose> {
  const lk = track(t, b.look), nd = track(t, b.nod), sf = track(t, b.soften);
  return {
    flip: -1, turn: lerp(0.55, 0.15, lk), headTurn: 0,
    look: { x: lerp(1, -0.4, lk), y: lerp(0.9, -0.2, lk) },
    nod: lerp(0.35, -0.05, lk) + nd * 0.55, headTilt: nd * 0.06,
    browIn: lerp(0, 0.45, sf) , browUp: sf * 0.25,
    mouth: { smile: lerp(0, 0.65, clamp(sf * 1.4 - 0.4)) },
    cheek: sf,
    ...extra,
  };
}
const NS = 1.2;   // Nell is nearer the camera than the doorway
const LAST_PAPER = { x: 0, y: 0 };
let PAPER_DY = 0;
const AS = 1.1;   // adults in the doorway
function nellAtDoor(f: F, cam: DCam, hall: number, extra: Partial<Pose> = {}, showDrawing = true, drawingAng = -0.12, tug = 0, nx = -112): Rigged {
  const p = dScreen(cam, v2(nx, 88));
  const s = 0.43 * cam.z * NS;
  const R = drawPerson(f, C.NELL, {
    x: p.x, y: p.y, s, flip: 1, turn: 0.72,
    armF: { a: 1.85, b: 0.35 }, armB: { a: 1.7, b: 0.5 }, lean: 0.05,
    look: { x: 1, y: -0.6 }, headTilt: -0.12, browUp: 0.3, mouth: { smile: 0.3 },
    plait: Math.sin(f.t * 3) * 0.2, ...extra,
  } as Pose, lNellAtDoor(cam, hall));
  if (showDrawing) {
    const hx = (R.handF.x + R.handB.x) / 2, hy = (R.handF.y + R.handB.y) / 2;
    LAST_PAPER.x = hx + 46 * s + tug * 20 * s + 26 * s; LAST_PAPER.y = hy - 18 * s - 47 * s + PAPER_DY * s;
    heldDrawing(f, f.ctx, hx + 46 * s + tug * 20 * s, hy - 18 * s + PAPER_DY * s, 132 * s, 100 * s, drawingAng + tug * 0.25, hall, true);
    mitten(f.ctx, R.handF.x + 6 * s, R.handF.y, 11.5 * s, 0, '#b98a48');
    mitten(f.ctx, R.handB.x + 6 * s, R.handB.y, 11.5 * s, 0, '#a37a3c');
  }
  return R;
}

// ---------------------------------------------------------------- F2: old lady + dog
shot('F2', (f) => {
  const t = f.t;
  const cam: DCam = { x: lerp(-30, -22, f.tc / f.dur), y: -78, z: lerp(3.2, 3.3, f.tc / f.dur) };
  const open2 = track(t, [[0, 0], [0.2, 0], [0.5, 1, ease.outCubic]]);
  drawDoorstep(f, { cam, door: '#6a2f52', brick: '#7a4a40', open: open2, num: '38', hall: 1, seed: 31 });
  const beat: DoorBeat = {
    look: [[0, 0], [0.55, 0], [0.85, 1], [1.5, 1], [1.75, 0.15]],
    nod: [[0, 0], [1.55, 0], [1.75, 1], [1.95, 0.1], [2.1, 0.7], [2.3, 0]],
    soften: [[0, 0], [0.9, 0], [1.4, 1]],
  };
  const fp = dScreen(cam, v2(4, 0));
  if (open2 > 0.3) drawPerson(f, C.OLD_LADY, { x: fp.x, y: fp.y, s: 0.43 * cam.z * AS * 1.08, ...neighbourPose(t, beat), blink: blink(t, [0.4]), armF: { a: 0.5, b: 1.4 }, armB: { a: 0.2, b: 0.5 } } as Pose, lNeighbour(cam, 1));
  // dog at her feet, tail starts going at the nod
  const dp = dScreen(cam, v2(30, 4));
  const wag = clamp((f.tc - 1.6) * 4);
  if (open2 > 0.3) drawDog(f.ctx, dp.x, dp.y, 0.43 * cam.z * 1.15, -1, f.t, 0.25 + wag, 0.85);
  nellAtDoor(f, cam, open2, { browUp: lerp(0.3, 0.7, prog(t, 1.6, 2.0)), mouth: { smile: lerp(0.2, 0.7, prog(t, 1.6, 2.0)) } });
  snowfall(f, 0.45, 0.2, 21);
  f.grade.vignette = 0.5; f.grade.bloom = 0.85;
});

// ---------------------------------------------------------------- F3: corner shop
shot('F3', (f) => {
  const t = f.t;
  const cam: DCam = { x: -70, y: -150, z: 3.7 };
  drawShop(f, cam);
  const c = f.ctx;
  // shopkeeper behind the counter
  const beat: DoorBeat = {
    look: [[0, 0], [0.35, 0], [0.6, 1], [1.05, 1], [1.2, 0.1]],
    nod: [[0, 0], [0.95, 0], [1.1, 0.9], [1.3, 0]],
    soften: [[0, 0], [0.6, 0], [1.0, 1]],
  };
  const lift = track(t, [[0, 0], [1.2, 0], [1.42, 1, ease.outQuad], [1.5, 0.92, ease.inQuad]]);
  const sp = dScreen(cam, v2(30, 0));
  const pose = neighbourPose(t, beat, { flip: -1 });
  // looking across: out of the shop window (to the right): flip the look direction
  const lk = track(t, beat.look);
  drawPerson(f, C.SHOPKEEPER, {
    x: sp.x, y: sp.y, s: 0.43 * cam.z * 1.15, ...pose, turn: lerp(0.5, 0.35, lk), flip: lk > 0.5 ? 1 : -1,
    look: { x: lerp(1, 1, lk), y: lerp(0.9, -0.1, lk) },
    armF: { a: lerp(0.6, 1.4, lift), b: lerp(1.0, 0.6, lift) }, armB: { a: lerp(0.5, 1.3, lift), b: 0.7 },
  } as Pose, {
    key: -1.57, shadow: '#6a5470', shadowAmt: 0.5, shadowOff: 12, shadowSoft: 5, rim: '#9fb6ff', rimAmt: 0.6, rimW: 4, rimDir: 0, ambient: '#ffe6c4', ambientAmt: 0.3,
    spots: [{ x: W / 2, y: 120, r: 700, color: '#fff0d0', a: 0.18 }],
  });
  // counter in front (hides her legs) — drawn by shop front layer
  drawShop(f, cam, true);
  // the box of bulbs: lifted from under the counter and THUMPED down
  const land = 1.5;
  const bx = dScreen(cam, v2(-62, -100));
  const sq = f.tc >= land ? Math.max(0, 1 - (f.tc - land) * 6) * (f.tc < land + 0.08 ? 1 : 0.4) : 0;
  if (lift > 0.02) {
    const yOff = f.tc < land ? (1 - lift) * 60 * cam.z : 0;
    bulbBox(c, bx.x, bx.y + yOff, 58 * cam.z, 40 * cam.z, sq);
    if (f.tc >= land && f.tc < land + 0.2) {
      // little puff of dust
      for (let k = 0; k < 6; k++) { c.fillStyle = 'rgba(240,220,190,0.35)'; c.beginPath(); c.arc(bx.x + (k - 2.5) * 22 * (1 + (f.tc - land) * 6), bx.y - 6, 7, 0, TAU); c.fill(); }
    }
  }
  // Nell on tiptoe at the counter, drawing laid up on it
  const np = dScreen(cam, v2(-215, 52));
  const s = 0.43 * cam.z * 1.32;
  const jump = f.tc >= land && f.tc < land + 0.25 ? Math.sin((f.tc - land) / 0.25 * Math.PI) * 10 : 0;
  const R = drawPerson(f, C.NELL, {
    x: np.x, y: np.y - 8 * s - jump, s, flip: 1, turn: 0.75, armF: { a: 2.0, b: 0.2 }, armB: { a: 1.9, b: 0.3 },
    look: { x: 1, y: -0.4 }, headTilt: -0.1, browUp: f.tc > land ? 1 : 0.3, mouth: { open: f.tc > land ? 0.4 : 0, smile: f.tc > land ? 0.9 : 0.3 },
  } as Pose, { key: -1.57, shadow: '#4b4f88', shadowAmt: 0.55, shadowOff: 12, shadowSoft: 5, rim: '#ffe0b0', rimAmt: 0.5, rimW: 4, rimDir: -1.2, ambient: '#e9d6c0', ambientAmt: 0.3 });
  heldDrawing(f, c, R.handF.x + 50 * s, R.handF.y - 10 * s, 132 * s, 100 * s, -0.08, 0.3, true);
  mitten(c, R.handF.x + 6 * s, R.handF.y, 11.5 * s, 0, '#d8a24a');
  f.grade.vignette = 0.45; f.grade.bloom = 0.7;
});

// ---------------------------------------------------------------- F4: teenagers on a wall
shot('F4', (f) => {
  const t = f.t;
  const lampX = HOUSE_W * 0.98 + 800; // a street lamp (one every two houses)
  const cam: Cam = { x: lampX - 190 + f.tc * 6, y: -12, z: 2.8 };
  drawStreet(f, { mood: 'blue', cam, houses: TERRACE, lit: () => 0.9, windows: () => 1, lampsOn: 1 });
  const c = f.ctx;
  const lookD = track(t, [[0, 0], [0.25, 0], [0.38, 1], [0.7, 1], [0.8, 0]]); // they look at each other
  const nod = track(t, [[0, 0], [0.72, 0], [0.82, 1], [0.95, 0]]);
  const bump = track(t, [[0, 0], [0.92, 0], [1.15, 1, ease.outBack], [1.6, 1], [1.85, 0.75]]);
  const lampS = toScreen(cam, v2(lampX, -600));
  const lt = (px: number, py: number): CharLight => ({ ...L_NIGHT_STREET, key: -1.3, rimDir: -0.9, rim: '#ffd59a', rimAmt: 0.75,
    spots: [{ x: px, y: py, r: 240, color: '#cfe0ff', a: 0.4 }, { x: lampS.x, y: lampS.y, r: 1100, color: '#ffcf8a', a: 0.3 }] });
  const sit = { hipDrop: 44, legF: { a: 1.25, b: -1.3 }, legB: { a: 1.1, b: -1.25 } };
  const phone = (h: V2, a = 1) => { c.fillStyle = '#20232c'; c.fillRect(h.x - 9, h.y - 18, 18, 28); c.fillStyle = '#cfe0ff'; c.fillRect(h.x - 7, h.y - 16, 14, 23); glow(f.glow, h.x, h.y - 5, 46, '#bcd4ff', 0.35 * a); };
  // teen 1 (hood), on the wall nearer the lamp
  const t1 = toScreen(cam, v2(lampX - 70, 116));
  const R1 = drawPerson(f, C.TEEN1, { x: t1.x, y: t1.y, s: STREET_S * cam.z, flip: -1, turn: 0.55, ...sit, armF: { a: 1.1, b: 1.35 }, armB: { a: 0.9, b: 1.45 },
    look: { x: 1, y: lerp(0.5, 0.1, lookD) }, nod: nod * 0.5, browUp: lookD * 0.5 + nod * 0.2, browIn: lookD * -0.3, mouth: { smile: lerp(0, 0.55, Math.max(nod, bump)) }, lean: 0.14 } as Pose, lt(t1.x - 40, t1.y - 240));
  phone(R1.handF);
  // teen 2 (braids) — turns to teen 1, then fist-bumps Nell
  const t2 = toScreen(cam, v2(lampX - 175, 116));
  const R2 = drawPerson(f, C.TEEN2, { x: t2.x, y: t2.y, s: STREET_S * cam.z, flip: lookD > 0.5 ? 1 : -1, turn: 0.55, ...sit,
    armF: { a: lerp(1.1, 1.65, bump), b: lerp(1.35, 0.1, bump) }, armB: { a: 0.9, b: 1.4 }, lean: 0.1 + bump * 0.15,
    look: { x: 1, y: lerp(0.4, 0.05, lookD) }, nod: nod * 0.5, browUp: 0.3 + bump * 0.4 + lookD * 0.3, mouth: { smile: lerp(0.1, 0.85, Math.max(nod, bump)), open: bump * 0.3 } } as Pose, lt(t2.x, t2.y - 230));
  if (bump < 0.25) phone(R2.handF);
  // Nell, drawing in one hand, fist up for the bump
  const np = toScreen(cam, v2(lampX - 285, 172));
  const s = STREET_S * cam.z * 1.15;
  const R = drawPerson(f, C.NELL, { x: np.x, y: np.y, s, flip: 1, turn: 0.62, armF: { a: lerp(0.9, 1.7, bump), b: lerp(0.9, 0.1, bump) }, armB: { a: 1.75, b: 0.45 },
    look: { x: 1, y: -0.2 }, browUp: 0.4 + bump * 0.5, browIn: -0.2 * (1 - bump), mouth: { smile: 0.3 + bump * 0.6, open: bump * 0.3 }, headTilt: -0.06, lean: bump * 0.1 } as Pose,
    { ...L_NIGHT_STREET, key: -0.9, rimDir: -2.8, rim: '#9fb6ff', rimAmt: 0.6, spots: [{ x: lampS.x, y: lampS.y, r: 1200, color: '#ffcf8a', a: 0.3 }] });
  heldDrawing(f, c, R.handB.x + 34 * s, R.handB.y - 26 * s, 120 * s, 92 * s, -0.12, 0.2, true);
  mitten(c, R.handB.x + 4 * s, R.handB.y, 11.5 * s, 0, '#b98a48');
  if (bump > 0.9 && f.tc < 1.45) {
    const m = v2((R.handF.x + R2.handF.x) / 2, (R.handF.y + R2.handF.y) / 2);
    glow(f.glow, m.x, m.y, 36, '#fff0d0', 0.3);
  }
  snowfall(f, 0.5, 0.2, 41);
  f.grade.vignette = 0.5; f.grade.bloom = 0.9;
});

// ---------------------------------------------------------------- F5: young dad + baby
shot('F5', (f) => {
  const t = f.t;
  const cam: DCam = { x: -24, y: -80, z: 3.25 };
  const open5 = track(t, [[0, 0], [0.12, 0], [0.38, 1, ease.outCubic]]);
  drawDoorstep(f, { cam, door: '#2c4778', brick: '#83503f', open: open5, num: '47', hall: 1, seed: 57 });
  const beat: DoorBeat = {
    look: [[0, 0], [0.75, 0], [0.95, 1], [1.3, 1], [1.45, 0.1]],
    nod: [[0, 0], [1.4, 0], [1.55, 1], [1.75, 0]],
    soften: [[0, 0.4], [1.2, 1]],
  };
  const grab = track(t, [[0, 0], [0.45, 0], [0.75, 1, ease.outBack], [2.0, 1]]);
  const dLean = track(t, [[0, 0], [0.3, 0], [0.6, 1], [2.0, 1]]);
  const fp = dScreen(cam, v2(6, 0));
  const s = 0.43 * cam.z * AS;
  const R = drawPerson(f, C.YOUNG_DAD, { x: fp.x, y: fp.y, s, ...neighbourPose(t, beat), lean: dLean * 0.3, armF: { a: 0.7, b: 1.7 }, armB: { a: 0.4, b: 1.5 }, blink: blink(t, [0.3]) } as Pose, lNeighbour(cam, open5));
  // the sling and the baby on dad's chest
  const c = f.ctx;
  const chest = v2(lerp(R.neck.x, R.hips.x, 0.5) - 8 * s, lerp(R.neck.y, R.hips.y, 0.58));
  c.fillStyle = '#b8603e';
  c.beginPath(); blobEllipse(c, chest.x, chest.y + 10 * s, 34 * s, 40 * s, 71, 0.06, 10); c.fill();
  c.strokeStyle = '#a0502e'; c.lineWidth = 9 * s; c.beginPath(); c.moveTo(chest.x - 30 * s, chest.y - 20 * s); c.lineTo(R.shoulderF.x, R.shoulderF.y + 4 * s); c.stroke();
  // baby head with tiny bobble hat
  const bh = v2(chest.x - 4 * s, chest.y - 28 * s);
  c.fillStyle = '#7a4a34'; c.beginPath(); blobEllipse(c, bh.x, bh.y, 21 * s, 20 * s, 72, 0.04, 10); c.fill();
  c.fillStyle = '#e9c45a'; c.beginPath(); c.moveTo(bh.x - 22 * s, bh.y - 4 * s); c.bezierCurveTo(bh.x - 24 * s, bh.y - 34 * s, bh.x + 24 * s, bh.y - 34 * s, bh.x + 22 * s, bh.y - 4 * s); c.closePath(); c.fill();
  c.fillStyle = '#f2ead8'; c.beginPath(); c.arc(bh.x, bh.y - 28 * s, 7 * s, 0, TAU); c.fill();
  c.fillStyle = '#1a1414'; c.beginPath(); c.arc(bh.x - 9 * s, bh.y + 4 * s, 2.2 * s, 0, TAU); c.arc(bh.x - 1 * s, bh.y + 4 * s, 2.2 * s, 0, TAU); c.fill();
  c.strokeStyle = '#3a1a18'; c.lineWidth = 1.6 * s; c.beginPath(); c.arc(bh.x - 5 * s, bh.y + 10 * s, 3.5 * s, 0.2, Math.PI - 0.2); c.stroke();
  // Nell with the drawing; the baby grabs the corner
  PAPER_DY = -40;
  nellAtDoor(f, cam, open5, { browUp: 0.4 + grab * 0.3, mouth: { smile: 0.3 + grab * 0.3, open: grab * 0.2 }, armF: { a: 2.45, b: 0.15 }, armB: { a: 2.35, b: 0.25 }, look: { x: 1, y: -1 } }, true, -0.08, grab * 0.5 + track(t, [[0, 0], [0.8, 0], [1.0, 0.5], [1.2, 0.2], [1.4, 0.5], [2.0, 0.4]]), -60);
  PAPER_DY = 0;
  // baby arm: a chubby onesie sleeve stretching out to grab the paper's top edge
  const root = v2(bh.x - 14 * s, bh.y + 26 * s);
  const pc0 = v2(LAST_PAPER.x, LAST_PAPER.y);
  const dd = Math.hypot(pc0.x - root.x, pc0.y - root.y), maxL = 110 * s;
  const tgt = dd > maxL ? v2(root.x + (pc0.x - root.x) / dd * maxL, root.y + (pc0.y - root.y) / dd * maxL) : pc0;
  const rest = v2(root.x + 6 * s, root.y + 14 * s);
  const armEnd = v2(lerp(rest.x, tgt.x, grab), lerp(rest.y, tgt.y, grab));
  const elbow = v2((root.x + armEnd.x) / 2 - 6 * s, (root.y + armEnd.y) / 2 - 8 * s * grab);
  c.fillStyle = '#9fbbe0'; c.beginPath(); blobEllipse(c, root.x, root.y, 15 * s, 12 * s, 73, 0.06, 8); c.fill();
  tube(c, [root, elbow, armEnd], 15 * s, 12 * s, '#7f9ccc');
  tube(c, [v2(root.x - 1.5 * s, root.y - 2 * s), v2(elbow.x - 1.5 * s, elbow.y - 2 * s), v2(armEnd.x - 1, armEnd.y - 2)], 11 * s, 8 * s, '#a9c4e8');
  // tiny fist gripping the paper edge
  c.fillStyle = '#7a4a34'; c.beginPath(); blobEllipse(c, armEnd.x, armEnd.y, 8.5 * s, 7.5 * s, 74, 0.08, 8); c.fill();
  c.fillStyle = '#8e5a42'; for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(armEnd.x - 4 * s + k * 4 * s, armEnd.y + 5 * s, 2.6 * s, 0, TAU); c.fill(); }
  if (grab > 0.9) glow(f.glow, armEnd.x, armEnd.y, 30 * s, '#fff0d0', 0.12);
  snowfall(f, 0.45, 0.2, 51);
  f.grade.vignette = 0.5; f.grade.bloom = 0.85;
});

// ---------------------------------------------------------------- F6: the ladder man
shot('F6', (f) => {
  const t = f.t, tc = f.tc;
  const cam: DCam = { x: lerp(-26, -20, tc / f.dur), y: -84, z: lerp(3.15, 3.3, tc / f.dur) };
  // door timeline: opens 0.0-0.35, shuts 2.75-3.05, reopens 4.55-4.75
  const open = track(t, [[0, 0], [0.6, 0], [0.92, 1, ease.outCubic], [2.72, 1], [3.0, 0, ease.inQuad], [4.4, 0], [4.55, 1, ease.outBack], [7, 1]]);
  drawDoorstep(f, { cam, door: '#2f5a4a', brick: '#6e4538', open, num: '51', hall: 1, seed: 77 });
  const c = f.ctx;
  const s = 0.43 * cam.z * AS;
  // phase A: the scowl (0-3.0)
  if (tc < 3.0 && open > 0.25) {
    const lookAcross = track(t, [[0, 0], [1.5, 0], [1.75, 1], [2.4, 1], [2.55, 0]]);
    const passes = track(t, [[0, 0], [1.85, 0], [2.15, 1], [2.45, 1], [2.6, 0.2]]);
    const back = track(t, [[0, 0], [2.6, 0], [2.95, 1]]);
    const fp = dScreen(cam, v2(4 - back * 30, -back * 6));
    drawPerson(f, C.LADDER_MAN, {
      x: fp.x, y: fp.y, s: s * (1 - back * 0.08), flip: -1, turn: lerp(0.5, 0.12, lookAcross),
      look: { x: lerp(1, -0.3, lookAcross), y: lerp(0.9, -0.2, lookAcross) }, nod: lerp(0.3, -0.05, lookAcross),
      browIn: lerp(-1, 0.6, passes), browUp: passes * 0.2, mouth: { smile: lerp(-0.55, -0.1, passes), w: 0.8 },
      armF: { a: 0.35, b: 0.3 }, armB: { a: 0.2, b: 0.3 }, blink: blink(t, [1.0, 2.2]),
    } as Pose, lNeighbour(cam, 1));
  }
  // phase C: the ladder comes out first (4.72-5.35), then him (5.35-7)
  if (tc > 4.42) {
    const out = track(t, [[4.42, 0], [4.6, 0.55, ease.outCubic], [5.3, 0.55], [5.75, 0.8, ease.inOutCubic]]);
    if (tc > 4.62) {
      const step = prog(tc, 4.62, 4.8, ease.outCubic);
      const nod = track(t, [[0, 0], [4.8, 0], [4.96, 1, ease.outQuad], [5.25, 0, ease.inOutQuad]]);
      const fp = dScreen(cam, v2(10 + (1 - step) * 30, 0));
      drawPerson(f, LADDER_MAN_HAT, {
        x: fp.x, y: fp.y, s, flip: -1, turn: 0.45, look: { x: 1, y: 0.5 }, nod: 0.15 + nod * 0.7, headTilt: nod * 0.05,
        browIn: -0.35, mouth: { smile: 0.05 + nod * 0.2, w: 0.8 }, armF: { a: 1.3, b: 0.35 }, armB: { a: 1.2, b: 0.45 },
      } as Pose, lNeighbour(cam, 1));
    }
    // ladder held at chest height, sliding out of the doorway toward Nell (and well past her)
    const tipW = v2(lerp(20, -330, out), -128);
    const tailW = v2(tipW.x + 520, -131);
    c.save(); dApply(c, cam);
    c.beginPath(); c.rect(-2000, -400, 2000 + DW / 2 + 1, 800); c.clip();
    drawLadder(c, tailW.x, tailW.y, tipW.x, tipW.y, 26, '#a3acc0', 24);
    c.restore();
  }
  // Nell: hopeful -> deflated -> startled -> beaming
  const sink = track(t, [[0, 0], [3.05, 0], [3.6, 1, ease.inOutSine], [4.4, 1]]);
  const startle = track(t, [[0, 0], [4.45, 0], [4.62, 1, ease.outBack], [5.0, 1], [5.5, 0.6]]);
  const beam2 = track(t, [[0, 0], [4.98, 0], [5.4, 1]]);
  const passesN = track(t, [[0, 0], [1.8, 0], [2.15, 1], [2.6, 1], [3.0, 0.5]]);
  const lean = -startle * 0.18 * (tc < 5.0 ? 1 : 0.4);
  const showDrawing = tc < 3.3;
  const R = nellAtDoor(f, cam, open, {
    browUp: lerp(0.3, -0.2, sink) + startle * 1.0 - beam2 * 0.3, browIn: sink * 0.95 - startle * 0.9 + passesN * 0.3,
    mouth: { smile: lerp(0.3, -0.6, sink) + startle * 0.2 + beam2 * 1.2, open: startle * 0.5 * (1 - beam2) + beam2 * 0.35 },
    nod: sink * 0.45 - startle * 0.3, lean, look: { x: 1, y: lerp(-0.6, 0.2, sink) - startle * 0.4 },
    armF: showDrawing ? { a: 1.85, b: 0.35 } : { a: lerp(0.3, 0.1, sink), b: 0.4 }, armB: showDrawing ? { a: 1.7, b: 0.5 } : { a: 0.25, b: 0.4 },
    cheek: beam2,
  }, showDrawing, -0.12);
  if (!showDrawing) {
    // drawing hangs from her hand, rolled loosely
    const h = R.handF; roll(c, v2(h.x + 4 * s, h.y + 4 * s), 0);
    mitten(c, h.x + 4 * s, h.y, 11.5 * s, 0, '#a37a3c');
  }
  // snow settling on her hat during the silence
  const settleAmt = clamp((tc - 3.1) / 1.3);
  if (settleAmt > 0) {
    const top = R.top;
    c.fillStyle = '#c6d2ee';
    for (let k = 0; k < Math.floor(settleAmt * 7); k++) {
      c.beginPath(); c.arc(top.x + (hash1(k * 3.1) - 0.5) * 42 * s, top.y + 30 * s + hash1(k * 1.7) * 8 * s, (2 + hash1(k) * 2) * s, 0, TAU); c.fill();
    }
  }
  snowfall(f, tc > 3.0 && tc < 4.4 ? 0.75 : 0.45, 0.15, 61);
  f.grade.vignette = 0.5 + sink * 0.08 * (1 - startle); f.grade.bloom = 0.85;
});
