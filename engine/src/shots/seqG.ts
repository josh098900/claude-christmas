// Sequence G: Christmas Eve. Mum takes Grandad out; the street springs into action.
import { shot } from '../film';
import { F, W, H, C2D } from '../core/stage';
import { prog, track, blink, Key } from '../core/anim';
import { ease, lerp, clamp, v2, V2, hash1, TAU, noise1 } from '../core/math';
import { drawStreet, snowfall, makeTerrace, doorRect, toScreen, Cam, HOUSE_W, House } from '../sets/street';
import { drawPerson, Pose, walk, Spec } from '../chars/rig';
import * as C from '../chars/cast';
import { CharLight } from '../draw/shade';
import { glow, beam, lightString, BULB_SEQ, bulb } from '../draw/light';
import { blobEllipse, handRect, vgrad, tube } from '../draw/brush';
import { handText } from '../draw/letters';
import { STREET_S, L_NIGHT_STREET } from './common';
import { drawLadder, bulbBox, mitten } from '../sets/doorstep';
import { LADDER_MAN_HAT } from './seqF';
import { idle, breath } from './seqH';
import { Rigged } from '../chars/rig';

const TERRACE = makeTerrace(-7, 7);
const GH = TERRACE.find((h) => h.grandad)!;
const GDR = doorRect(GH);

/** Mum's teal scarf, drawn over the collar so it always reads (her bob would otherwise hide it). */
function mumScarf(f: F, R: Rigged, sc: number, dir: number) {
  const c = f.ctx, col = '#2f7a78', dk = '#235e5c';
  const n = R.neck;
  tube(c, [v2(n.x - 30 * sc, n.y + 2 * sc), v2(n.x, n.y + 10 * sc), v2(n.x + 30 * sc, n.y + 2 * sc)], 17 * sc, 17 * sc, col);
  tube(c, [v2(n.x + dir * 14 * sc, n.y + 8 * sc), v2(n.x + dir * 20 * sc, n.y + 40 * sc), v2(n.x + dir * 16 * sc, n.y + 66 * sc)], 15 * sc, 12 * sc, dk);
  c.strokeStyle = 'rgba(240,230,200,0.35)'; c.lineWidth = 2 * sc;
  for (const yy of [52, 60]) { c.beginPath(); c.moveTo(n.x + dir * 10 * sc, n.y + yy * sc); c.lineTo(n.x + dir * 23 * sc, n.y + yy * sc); c.stroke(); }
}

/** A church spire on the far skyline, lit warm (drawn in screen space above the roofline). */
function spire(f: F, x: number, baseY: number, h: number, glowAmt = 1) {
  const c = f.ctx;
  c.fillStyle = '#1a2552';
  c.beginPath(); c.moveTo(x - h * 0.12, baseY); c.lineTo(x - h * 0.12, baseY - h * 0.45); c.lineTo(x, baseY - h); c.lineTo(x + h * 0.12, baseY - h * 0.45); c.lineTo(x + h * 0.12, baseY); c.closePath(); c.fill();
  c.fillStyle = '#f5c27a';
  c.beginPath(); c.ellipse(x, baseY - h * 0.33, h * 0.035, h * 0.06, 0, 0, TAU); c.fill();
  c.fillRect(x - h * 0.03, baseY - h * 0.2, h * 0.06, h * 0.12);
  glow(f.glow, x, baseY - h * 0.3, h * 0.35, '#ffc07a', 0.35 * glowAmt);
}

/** Warm open doorway overlay on a terrace house + light spill on the path. World space ctx. */
function openDoor(f: F, c: C2D, h: House, amt: number) {
  if (amt <= 0.01) return;
  const dr = doorRect(h);
  const ow = dr.w * amt;
  const g = c.createLinearGradient(0, dr.y, 0, dr.y + dr.h);
  g.addColorStop(0, '#f7c784'); g.addColorStop(1, '#b8683a');
  c.fillStyle = g; c.fillRect(dr.x + dr.w - ow, dr.y, ow, dr.h);
  c.save(); c.globalCompositeOperation = 'lighter';
  const sp = c.createLinearGradient(0, 0, 0, 230);
  sp.addColorStop(0, `rgba(255,175,95,${0.35 * amt})`); sp.addColorStop(1, 'rgba(255,175,95,0)');
  c.fillStyle = sp;
  c.beginPath(); c.moveTo(dr.x, 0); c.lineTo(dr.x + dr.w, 0); c.lineTo(dr.x + dr.w + 90, 230); c.lineTo(dr.x - 90, 230); c.closePath(); c.fill();
  c.restore();
  glow(f.glow, dr.x + dr.w / 2, dr.y + dr.h * 0.5, 160, '#ffb060', 0.25 * amt);
}

function torchBeamScreen(f: F, from: V2, ang: number, len: number, a = 1) {
  glow(f.glow, from.x, from.y, 18, '#fff4d8', 0.8 * a);
  beam(f.glow, from, ang, len, 0.17, 'rgba(255,240,205,0.85)', 0.42 * a, 5);
}
function torchProp(x: C2D, h: V2, ang: number) {
  x.save(); x.translate(h.x, h.y); x.rotate(ang);
  x.fillStyle = '#c8402e'; x.beginPath(); x.roundRect(-4, -7, 30, 14, 4); x.fill();
  x.fillStyle = '#e9e2d0'; x.fillRect(24, -9, 7, 18);
  x.restore();
}
function boxProp(x: C2D, h: V2) { bulbBox(x, h.x, h.y + 26, 54, 40); }

const lightAt = (cam: Cam, extra: { x: number; y: number; r: number; color: string; a: number }[] = []): CharLight => ({
  ...L_NIGHT_STREET, key: -1.2, rimDir: -2.4, rim: '#ffd59a', rimAmt: 0.7, ambient: '#6f7ab5', ambientAmt: 0.6, spots: extra,
});

// ---------------------------------------------------------------- G1: Mum takes Grandad out
shot('G1', (f) => {
  const t = f.t, tc = f.tc;
  const walkX = (tt: number) => 60 + tt * 62;
  if (tc < 1.5) {
    const cam: Cam = { x: 260 + tc * 30, y: -300, z: 0.95 };
    drawStreet(f, { mood: 'eve', cam, houses: TERRACE, lit: (h) => (h.grandad ? 0 : 1), windows: (h) => (h.grandad ? 0 : 1), lampsOn: 1, bellFrost: 1 });
    const roof = toScreen(cam, v2(0, -805));
    spire(f, (900 - cam.x * 0.35) * cam.z + W / 2, roof.y + 40, 280);
    const gx = walkX(tc);
    const wg = walk(t * 0.9, 0.3, 0.1), wm = walk(t * 0.9 + 0.5, 0.36, 0.1);
    const L = lightAt(cam);
    const pg = toScreen(cam, v2(gx, 168)), pm = toScreen(cam, v2(gx + 70, 172));
    drawPerson(f, C.GRANDAD_OUT, { x: pg.x, y: pg.y, s: STREET_S * cam.z, flip: 1, turn: 0.75, ...wg, armF: { a: 0.6, b: 0.9 }, nod: 0.2, browIn: 0.2 } as Pose, L);
    const RM = drawPerson(f, C.MUM, { x: pm.x, y: pm.y, s: STREET_S * cam.z, flip: 1, turn: 0.75, ...wm, armB: { a: 0.5, b: 1.0 }, plait: Math.sin(t * 5) * 0.4 } as Pose, L);
    mumScarf(f, RM, STREET_S * cam.z, 1);
    snowfall(f, 0.6, 0.2, 71);
  } else {
    // Mum glances back over her shoulder at the street: a wink
    const u = tc - 1.5;
    const cam: Cam = { x: walkX(tc) + 60, y: 30, z: 3.1 };
    drawStreet(f, { mood: 'eve', cam, houses: TERRACE, lit: (h) => (h.grandad ? 0 : 1), windows: (h) => (h.grandad ? 0 : 1), lampsOn: 1 });
    const turnBack = track(u, [[0, 0], [0.25, 1, ease.outBack]]);
    const wink = track(u, [[0, 0], [0.55, 0], [0.62, 1], [1.05, 1], [1.12, 0]]);
    const wg = walk(t * 0.9, 0.3, 0.1), wm = walk(t * 0.9 + 0.5, 0.36, 0.1);
    const L = lightAt(cam, [{ x: 200, y: 200, r: 900, color: '#ffcf96', a: 0.2 }]);
    const gx = walkX(tc);
    const pg = toScreen(cam, v2(gx + 10, 168)), pm = toScreen(cam, v2(gx + 80, 172));
    drawPerson(f, C.GRANDAD_OUT, { x: pg.x, y: pg.y, s: STREET_S * cam.z, flip: 1, turn: 0.85, ...wg, armF: { a: 0.6, b: 0.9 }, nod: 0.25, browIn: 0.25 } as Pose, L);
    const RM = drawPerson(f, C.MUM, { x: pm.x, y: pm.y, s: STREET_S * cam.z, flip: turnBack > 0.5 ? -1 : 1, turn: lerp(0.75, 0.35, turnBack), headTilt: turnBack * 0.1, ...wm,
      armB: { a: 0.5, b: 1.0 }, wink, mouth: { smile: 0.4 + wink * 0.5 }, browL: wink * -0.5, browR: wink * 0.4, cheek: wink, look: { x: 1, y: 0 }, plait: Math.sin(t * 5) * 0.4 } as Pose, L);
    mumScarf(f, RM, STREET_S * cam.z, turnBack > 0.5 ? -1 : 1);
    breath(f, RM.head, turnBack > 0.5 ? -1 : 1, STREET_S * cam.z, 0.3, 0.5);
    snowfall(f, 0.6, 0.2, 72);
  }
  f.grade.vignette = 0.5; f.grade.bloom = 0.9;
});

// ---------------------------------------------------------------- G2: the street springs into action
interface Helper { sp: Spec; house: number; tOut: number; dx: number; y: number; speed: number; carry: 'ladder' | 'box' | 'torch' | 'reel' | 'none'; }
const HELPERS: Helper[] = [
  { sp: LADDER_MAN_HAT, house: 2, tOut: 0.25, dx: 120, y: 168, speed: 95, carry: 'ladder' },
  { sp: C.OLD_LADY, house: -1, tOut: 0.55, dx: -120, y: 182, speed: 60, carry: 'torch' },
  { sp: C.TEEN1, house: 3, tOut: 0.75, dx: 230, y: 190, speed: 120, carry: 'box' },
  { sp: C.TEEN2, house: 3, tOut: 0.95, dx: 300, y: 176, speed: 125, carry: 'torch' },
  { sp: C.SHOPKEEPER, house: -2, tOut: 0.7, dx: -230, y: 172, speed: 85, carry: 'box' },
  { sp: C.YOUNG_DAD, house: 1, tOut: 1.1, dx: 60, y: 186, speed: 100, carry: 'reel' },
  { sp: C.DAD, house: -3, tOut: 0.4, dx: -300, y: 190, speed: 110, carry: 'ladder' },
];

shot('G2', (f) => {
  const t = f.t, tc = f.tc;
  const cam: Cam = { x: 20, y: lerp(-190, -170, tc / f.dur), z: lerp(1.0, 1.05, tc / f.dur) };
  drawStreet(f, {
    mood: 'eve', cam, houses: TERRACE, lit: (h) => (h.grandad ? 0 : 1), windows: (h) => (h.grandad ? 0 : 1), lampsOn: 1,
    extraFront: (c) => { for (const hp of HELPERS) { const h = TERRACE.find((x) => x.i === hp.house)!; openDoor(f, c, h, clamp((tc - hp.tOut + 0.35) * 4)); } },
  });
  const L = lightAt(cam);
  // sort far-to-near by y so nearer people overlap
  const order = [...HELPERS].sort((a, b) => a.y - b.y);
  for (const hp of order) {
    const h = TERRACE.find((x) => x.i === hp.house)!;
    const dr = doorRect(h);
    const tt = tc - hp.tOut;
    if (tt < 0) continue;
    const startX = dr.x + dr.w / 2, endX = hp.dx;
    const dist = Math.abs(endX - startX), dir = Math.sign(endX - startX) || 1;
    const along = Math.min(dist, tt * hp.speed);
    // first walk down the path to the pavement, then along it
    const down = clamp(tt / 0.45);
    const wx = startX + dir * along * clamp((tt - 0.3) / 0.3 + 0.0);
    const wy = lerp(10, hp.y, down);
    const moving = along < dist;
    const w = walk(t * (hp.speed / 70), 0.42, 0.25);
    const p = toScreen(cam, v2(wx, wy));
    const s = STREET_S * cam.z;
    const R = drawPerson(f, hp.sp, {
      x: p.x, y: p.y, s, flip: dir, turn: 0.7, ...(moving ? w : idle(t, hp.dx * 0.013, hp.dx > 0 ? 1 : -1)),
      armF: hp.carry === 'ladder' ? { a: 2.6, b: 0.6 } : hp.carry === 'box' ? { a: 1.2, b: 1.0 } : hp.carry === 'torch' ? { a: 1.3 + Math.sin(tc * 1.3 + hp.dx) * 0.2, b: 0.2 } : (moving ? w.armF : undefined),
      armB: hp.carry === 'box' ? { a: 1.1, b: 1.1 } : (moving ? w.armB : undefined),
      browUp: 0.3, mouth: { smile: 0.4 }, holdF: hp.carry === 'torch' ? torchProp : hp.carry === 'box' ? (x, hh) => boxProp(x, hh) : undefined,
    } as Pose, L);
    breath(f, R.head, dir, s, (hp.dx * 0.0071) % 1, 0.55);
    if (hp.carry === 'ladder') {
      const a = R.shoulderF;
      drawLadder(f.ctx, a.x - dir * 150 * s, a.y - 6 * s, a.x + dir * 250 * s, a.y - 18 * s, 18 * s, '#a3acc0', 22 * s);
    }
    if (hp.carry === 'torch') {
      const ang = -Math.PI / 2 + dir * (0.5 + 0.35 * Math.sin(tc * 0.9 + hp.dx * 0.01));
      torchBeamScreen(f, R.handF, ang, 700 * cam.z * 1.4, 0.9);
    }
    if (hp.carry === 'reel') {
      f.ctx.fillStyle = '#d0782a'; f.ctx.beginPath(); f.ctx.arc(R.handF.x, R.handF.y + 10 * s, 24 * s, 0, TAU); f.ctx.fill();
      f.ctx.fillStyle = '#2a2a30'; f.ctx.beginPath(); f.ctx.arc(R.handF.x, R.handF.y + 10 * s, 9 * s, 0, TAU); f.ctx.fill();
    }
  }
  // extra criss-crossing torch beams from off-screen helpers
  for (let k = 0; k < 3; k++) {
    const from = v2(k === 0 ? -40 : k === 1 ? W + 40 : W * 0.3, H + 20);
    const ang = -Math.PI / 2 + (k === 0 ? 0.55 : k === 1 ? -0.6 : 0.15) + Math.sin(tc * 0.8 + k * 2) * 0.12;
    beam(f.glow, from, ang, 1400, 0.13, 'rgba(255,240,205,0.85)', 0.3, 10);
  }
  snowfall(f, 0.75, 0.2, 73, '#fff0d0');
  f.grade.vignette = 0.45; f.grade.bloom = 1.0;
});

// ---------------------------------------------------------------- G3: up the ladder
shot('G3', (f) => {
  const t = f.t, tc = f.tc;
  const cam: Cam = { x: lerp(-70, -60, tc / f.dur), y: lerp(-330, -345, tc / f.dur), z: 1.42 };
  const hangX = lerp(-150, 60, prog(tc, 0.3, 2.8, ease.inOutSine));
  drawStreet(f, { mood: 'eve', cam, houses: TERRACE, lit: (h) => (h.grandad ? 0 : 1), windows: (h) => (h.grandad ? 0 : 0.0), lampsOn: 1, blaze: 0, bellFrost: 1 });
  const c = f.ctx;
  const s = STREET_S * cam.z;
  // the string going up along the gutter so far (dead bulbs, unlit)
  c.save(); f.glow.save();
  for (const x of [c, f.glow]) { x.translate(W / 2, H / 2); x.scale(cam.z, cam.z); x.translate(-cam.x, -cam.y); }
  const anchors: V2[] = [];
  for (let x = -200; x <= hangX; x += 100) anchors.push(v2(x, -514));
  anchors.push(v2(hangX, -514));
  if (anchors.length >= 2) lightString(f, { anchors, spacing: 26, size: 7, sag: 26, on: 0, seed: GH.seed });
  // ladder 1 (ladder man) and ladder 2 (clacks against the wall at +0.4)
  drawLadder(c, -150, 40, -95, -530, 34, '#a3acc0', 30);
  const tilt = track(tc, [[0, 0.5], [0.2, 0.5], [0.4, 0, ease.inQuad], [0.48, 0.02], [0.55, 0]]);
  c.save(); c.translate(165, 60); c.rotate(-tilt); drawLadder(c, 0, 0, 30, -480, 34, '#9aa3b8', 30); c.restore();
  c.restore(); f.glow.restore();
  const L = lightAt(cam, [{ x: W * 0.5, y: H + 100, r: 1100, color: '#fff0d0', a: 0.18 }]);
  // ladder man on the rungs, back to us, reaching to the gutter
  const reach = Math.sin(t * 2.2) * 0.12;
  const lm = toScreen(cam, v2(-114, -318));
  drawPerson(f, LADDER_MAN_HAT, { x: lm.x, y: lm.y, s, flip: 1, turn: 0, back: true, legF: { a: 0.3, b: -0.6 }, legB: { a: -0.1, b: -0.2 }, armF: { a: 2.9 + reach, b: 0.2 }, armB: { a: 2.6, b: 0.6 }, lean: -0.05 } as Pose, L);
  // teens on the ground passing a string up; dad steadies ladder 2
  const tp1 = toScreen(cam, v2(-260, 160)), tp2 = toScreen(cam, v2(-20, 175)), dp = toScreen(cam, v2(260, 168));
  const lift = 0.5 + 0.5 * Math.sin(t * 2.4);
  const R1 = drawPerson(f, C.TEEN1, { x: tp1.x, y: tp1.y, s, flip: 1, turn: 0.55, armF: { a: 2.7 + lift * 0.2, b: 0.2 }, armB: { a: 2.4, b: 0.4 }, look: { x: 1, y: -1 }, headTilt: -0.25, mouth: { smile: 0.4 } } as Pose, L);
  const R2 = drawPerson(f, C.TEEN2, { x: tp2.x, y: tp2.y, s, flip: -1, turn: 0.55, armF: { a: 2.6, b: 0.3 }, armB: { a: 2.3, b: 0.5 }, look: { x: 1, y: -1 }, headTilt: -0.2, mouth: { smile: 0.5, open: 0.2 } } as Pose, L);
  const ladderTop = toScreen(cam, v2(-128, -360));
  lightString(f, { anchors: [R1.handF, v2((R1.handF.x + ladderTop.x) / 2, R1.handF.y - 60), ladderTop], spacing: 26 * s / 0.66, size: 7 * cam.z, sag: 20, on: 0, seed: 9 });
  lightString(f, { anchors: [R2.handF, v2((R2.handF.x + ladderTop.x) / 2 + 30, ladderTop.y + 40), ladderTop], spacing: 26 * s / 0.66, size: 7 * cam.z, sag: 30, on: 0, seed: 12 });
  drawPerson(f, C.DAD, { x: dp.x, y: dp.y, s, flip: -1, turn: 0.6, armF: { a: 1.6, b: 0.6 }, armB: { a: 1.8, b: 0.5 }, look: { x: 1, y: -1 }, headTilt: -0.2, mouth: { smile: 0.3 } } as Pose, L);
  // torch beams from below
  beam(f.glow, v2(W * 0.18, H + 30), -Math.PI / 2 + 0.25 + Math.sin(tc) * 0.06, 1200, 0.13, 'rgba(255,240,205,0.85)', 0.22, 8);
  beam(f.glow, v2(W * 0.8, H + 30), -Math.PI / 2 - 0.35 + Math.sin(tc * 1.3) * 0.08, 1200, 0.12, 'rgba(255,240,205,0.85)', 0.18, 8);
  snowfall(f, 0.65, 0.2, 74, '#fff0d0');
  f.grade.vignette = 0.5; f.grade.bloom = 1.0;
});

/** A hand gripping (palm + curled fingers + thumb). ang = direction the fingers point. */
function grip(c: C2D, x: number, y: number, r: number, ang: number, col: string, shadow: string, mittenHand = false) {
  c.save(); c.translate(x, y); c.rotate(ang);
  c.fillStyle = shadow; c.beginPath(); blobEllipse(c, -r * 0.1, r * 0.12, r * 1.0, r * 0.82, 21, 0.05, 10); c.fill();
  c.fillStyle = col; c.beginPath(); blobEllipse(c, -r * 0.18, 0, r * 0.95, r * 0.78, 22, 0.05, 10); c.fill();
  if (mittenHand) {
    c.beginPath(); blobEllipse(c, r * 0.55, -r * 0.05, r * 0.6, r * 0.62, 23, 0.06, 9); c.fill();
    c.strokeStyle = shadow; c.lineWidth = r * 0.08;
    for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(-r * 0.95, k * r * 0.18); c.lineTo(-r * 0.7, k * r * 0.18); c.stroke(); }
  } else {
    for (let k = 0; k < 4; k++) {
      const fy = -r * 0.48 + k * r * 0.32;
      c.fillStyle = shadow; c.beginPath(); blobEllipse(c, r * 0.72, fy + r * 0.05, r * 0.36, r * 0.17, 24 + k, 0.05, 8); c.fill();
      c.fillStyle = col; c.beginPath(); blobEllipse(c, r * 0.68, fy, r * 0.34, r * 0.15, 30 + k, 0.05, 8); c.fill();
    }
  }
  // thumb wrapped over the top
  c.fillStyle = col; c.beginPath(); blobEllipse(c, r * 0.25, -r * 0.62, r * 0.42, r * 0.2, 40, 0.05, 8, -0.3); c.fill();
  c.restore();
}
function sleeve(c: C2D, pts: V2[], w0: number, w1: number, col: string, dark: string) {
  tube(c, pts.map((q) => v2(q.x + 6, q.y + 8)), w0, w1, dark);
  tube(c, pts.map((q) => v2(q.x - 3, q.y - 3)), w0 * 0.86, w1 * 0.86, col);
}

// ---------------------------------------------------------------- G4: hands passing the string
shot('G4', (f) => {
  const t = f.t, tc = f.tc;
  const c = f.ctx;
  vgrad(c, 0, 0, W, H, [[0, '#0d1638'], [1, '#1f2f62']]);
  // out-of-focus street lights behind (bokeh)
  for (let i = 0; i < 26; i++) {
    const col = BULB_SEQ[i % 5];
    const x = hash1(i * 3.3) * W, y = hash1(i * 5.1) * H * 0.75;
    glow(f.glow, x + Math.sin(tc * 0.3 + i) * 6, y, 40 + hash1(i) * 50, col, 0.18);
  }
  // the wall of the house (top right) with the ladder rising
  c.fillStyle = '#3a2a3e'; c.beginPath(); c.moveTo(W * 0.62, 0); c.lineTo(W, 0); c.lineTo(W, H * 0.7); c.lineTo(W * 0.78, H * 0.75); c.closePath(); c.fill();
  drawLadder(c, W * 0.66, H + 60, W * 0.9, -60, 120, '#6f7890', 110);
  // the chain: kid's mitten (bottom left) -> big hand (middle) -> gloved hand on the ladder (top right)
  const pass = prog(tc, 0.0, 2.5, ease.inOutSine);
  const p0 = v2(W * 0.16 + Math.sin(t * 3) * 6, H * 0.86 - pass * 40);
  const p1 = v2(W * 0.48, H * 0.52 + Math.sin(t * 2.2) * 8);
  const p2 = v2(W * 0.79, H * 0.2 - pass * 20);
  // arms (sleeves) coming in from off-screen
  sleeve(c, [v2(-60, H + 80), v2(W * 0.05, H * 0.97), p0], 96, 78, '#a8342e', '#6a2026');
  sleeve(c, [v2(W * 0.3, H + 100), v2(W * 0.39, H * 0.76), p1], 110, 92, '#4f7c4a', '#2c4a30');
  sleeve(c, [v2(W + 80, H * 0.38), v2(W * 0.9, H * 0.27), p2], 110, 92, '#8a3a32', '#542226');
  // warm torch pool on the chain
  c.save(); c.globalCompositeOperation = 'lighter';
  const tp = c.createRadialGradient(W * 0.45, H * 0.5, 40, W * 0.45, H * 0.5, 900);
  tp.addColorStop(0, 'rgba(255,214,160,0.22)'); tp.addColorStop(1, 'rgba(255,214,160,0)');
  c.fillStyle = tp; c.fillRect(0, 0, W, H); c.restore();
  // cuffs
  c.fillStyle = '#8f2a28'; c.beginPath(); blobEllipse(c, p0.x - 30, p0.y + 26, 34, 28, 11, 0.06, 9, -0.6); c.fill();
  c.fillStyle = '#3d6038'; c.beginPath(); blobEllipse(c, p1.x - 20, p1.y + 46, 42, 32, 12, 0.06, 9, -0.9); c.fill();
  c.fillStyle = '#46542c'; c.beginPath(); blobEllipse(c, p2.x + 40, p2.y + 6, 42, 36, 13, 0.06, 9, 0.2); c.fill();
  // the string slides through the hands toward the ladder
  const pts: V2[] = [];
  const N = 40;
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const a = u < 0.5 ? u * 2 : (u - 0.5) * 2;
    const q = u < 0.5 ? v2(lerp(p0.x, p1.x, a), lerp(p0.y, p1.y, a) + Math.sin(a * Math.PI) * 70) : v2(lerp(p1.x, p2.x, a), lerp(p1.y, p2.y, a) + Math.sin(a * Math.PI) * 60);
    pts.push(q);
  }
  c.strokeStyle = '#1c2b25'; c.lineWidth = 5; c.beginPath(); pts.forEach((q, i) => (i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y))); c.stroke();
  const off = (tc * 0.45) % 1;
  for (let k = 0; k < 18; k++) {
    const u = (k / 18 + off / 18 * 6) % 1;
    const idx = u * N, i0 = Math.floor(idx), fr = idx - i0;
    const q = v2(lerp(pts[i0].x, pts[Math.min(N, i0 + 1)].x, fr), lerp(pts[i0].y, pts[Math.min(N, i0 + 1)].y, fr));
    bulb(f, q.x, q.y + 8, { size: 28, on: 0, color: BULB_SEQ[k % 5], angle: Math.sin(k * 1.7) * 0.4 });
  }
  // hands over the string
  grip(c, p0.x, p0.y, 50, -0.65, '#e3a53a', '#b07a26', true);
  grip(c, p1.x, p1.y, 58, -0.35, '#d9a27e', '#a8705a');
  grip(c, p2.x, p2.y, 58, -0.25, '#3a3a42', '#24242a');
  // torch light washing across
  beam(f.glow, v2(-60, H * 0.5), -0.35 + Math.sin(tc * 0.9) * 0.05, 2300, 0.18, 'rgba(255,240,205,0.85)', 0.2, 10);
  for (let k = 0; k < 40; k++) {
    const x = (hash1(k * 2.1) * W + tc * 30) % W, y = (hash1(k * 4.7) * H + tc * 90 * (0.5 + hash1(k))) % H;
    c.fillStyle = 'rgba(230,236,255,0.75)'; c.beginPath(); c.arc(x, y, 2 + hash1(k) * 4, 0, TAU); c.fill();
  }
  f.grade.vignette = 0.6; f.grade.bloom = 0.9;
});

// ---------------------------------------------------------------- G5: Nell runs the operation
shot('G5', (f) => {
  const t = f.t, tc = f.tc;
  const cam: Cam = { x: lerp(100, 115, tc / f.dur), y: -20, z: 2.3 };
  drawStreet(f, { mood: 'eve', cam, houses: TERRACE, lit: (h) => (h.grandad ? 0 : 1), windows: () => 0, lampsOn: 1, blaze: 1, blazeOn: 0, bellFrost: 1 });
  const c = f.ctx;
  const s = STREET_S * cam.z;
  // outdoor socket on the wall right of the door
  const sock = toScreen(cam, v2(GDR.x + GDR.w + 34, -112));
  c.fillStyle = '#d8d2c6'; c.beginPath(); handRect(c, sock.x - 16 * s / 0.43 * 0.43 * 1.6, sock.y - 22, 52, 44, 3, 0.8); c.fill();
  c.fillStyle = '#2a2a30'; c.fillRect(sock.x - 8, sock.y - 8, 6, 12); c.fillRect(sock.x + 6, sock.y - 8, 6, 12);
  const plugged = tc > 1.6;
  const torchSpot = { x: sock.x, y: sock.y, r: 260, color: '#fff0d0', a: 0.45 };
  const L = lightAt(cam, [torchSpot]);
  // young dad crouched at the socket, plugging the extension in
  const plugIn = track(tc, [[0, 0], [1.2, 0], [1.6, 1, ease.inBack]]);
  const yd = toScreen(cam, v2(GDR.x + GDR.w - 52, 30));
  const RD = drawPerson(f, C.YOUNG_DAD, { x: yd.x, y: yd.y, s, flip: 1, turn: 0.75, legF: { a: 0.15, b: -0.25 }, legB: { a: -0.15, b: -0.1 }, lean: 0.42,
    armF: { a: lerp(1.3, 1.65, plugIn), b: 0.5 }, armB: { a: 1.0, b: 0.6 }, look: { x: 1, y: 0.2 }, browIn: -0.3, mouth: { smile: 0.2 } } as Pose, L);
  // the plug + extension cable to the off-screen reel
  c.strokeStyle = '#c8702a'; c.lineWidth = 8; c.lineCap = 'round'; c.beginPath(); c.moveTo(RD.handF.x, RD.handF.y); c.bezierCurveTo(RD.handF.x - 40, yd.y - 10, yd.x - 120, yd.y + 20, yd.x - 260, H + 30); c.stroke();
  c.fillStyle = '#2a2a30'; c.beginPath(); c.roundRect(RD.handF.x - 4, RD.handF.y - 10, 22, 20, 4); c.fill();
  if (plugged) glow(f.glow, sock.x, sock.y, 30, '#fff0d0', 0.2);
  // old lady holding a torch on the socket
  const ol = toScreen(cam, v2(GDR.x + GDR.w + 190, 150));
  const RO = drawPerson(f, C.OLD_LADY, { x: ol.x, y: ol.y, s: s * 1.05, flip: -1, turn: 0.65, armF: { a: 1.35, b: 0.3 }, armB: { a: 0.6, b: 1.2 }, look: { x: 1, y: 0.5 }, mouth: { smile: 0.5 }, holdF: torchProp } as Pose, L);
  const tang = Math.atan2(sock.y - RO.handF.y, sock.x - RO.handF.x);
  torchBeamScreen(f, RO.handF, tang, Math.hypot(sock.x - RO.handF.x, sock.y - RO.handF.y) + 140, 1.0);
  // Nell with her clipboard, pointing up at the roof, giving orders
  const point = track(t, [[0, 0.2], [0.4, 1, ease.outBack], [1.6, 1], [1.9, 0.6], [2.2, 1, ease.outBack]]);
  const np = toScreen(cam, v2(GDR.x - 130, 150));
  const RN = drawPerson(f, C.NELL, { x: np.x, y: np.y, s: s * 1.15, flip: 1, turn: 0.6, armF: { a: lerp(1.5, 2.3, point), b: 0.1 }, armB: { a: 0.7, b: 1.1 },
    look: { x: 1, y: -1 }, headTilt: -0.15, browIn: -0.7, browUp: 0.2, mouth: { open: 0.35 + Math.sin(t * 9) * 0.1, smile: 0.3 }, lean: 0.05,
    holdB: (x, h) => {
      x.save(); x.translate(h.x + 8 * s, h.y - 8 * s); x.rotate(-0.25);
      x.fillStyle = '#7a5a3a'; x.beginPath(); x.roundRect(-30 * s, -40 * s, 60 * s, 80 * s, 4 * s); x.fill();
      x.fillStyle = '#efe8d6'; x.fillRect(-25 * s, -32 * s, 50 * s, 68 * s);
      x.fillStyle = '#9a9aa2'; x.fillRect(-12 * s, -44 * s, 24 * s, 10 * s);
      handText(x, 'PLAN', -18 * s, -24 * s, 14 * s, { color: '#c4302c', seed: 3, weight: 1.3 });
      x.strokeStyle = '#2b2b4a'; x.lineWidth = 1.5 * s;
      for (let k = 0; k < 4; k++) { x.beginPath(); x.moveTo(-18 * s, (-2 + k * 9) * s); x.lineTo(16 * s, (-2 + k * 9) * s); x.stroke(); }
      x.restore();
    } } as Pose, lightAt(cam, [{ x: np.x + 200, y: np.y - 300, r: 600, color: '#fff0d0', a: 0.2 }]));
  // ladder man's legs on a ladder at the top edge (someone working above)
  c.save(); c.translate(0, 0);
  drawLadder(c, toScreen(cam, v2(GDR.x - 60, 40)).x, toScreen(cam, v2(0, 40)).y, toScreen(cam, v2(GDR.x - 20, -560)).x, toScreen(cam, v2(0, -560)).y, 34 * cam.z, '#a3acc0', 30 * cam.z);
  c.restore();
  beam(f.glow, v2(W * 0.05, H + 20), -Math.PI / 2 + 0.3 + Math.sin(tc * 0.7) * 0.06, 1400, 0.12, 'rgba(255,240,205,0.85)', 0.2, 8);
  beam(f.glow, v2(W * 0.95, H + 20), -Math.PI / 2 - 0.4 + Math.sin(tc * 0.9) * 0.06, 1400, 0.12, 'rgba(255,240,205,0.85)', 0.16, 8);
  snowfall(f, 0.6, 0.2, 75, '#fff0d0');
  f.grade.vignette = 0.5; f.grade.bloom = 1.0;
  void RN;
});
