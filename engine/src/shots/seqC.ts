// Sequence C: the shed. Nell finds Grandma's boxes and smuggles them home.
import { shot } from '../film';
import { F, W, H, C2D } from '../core/stage';
import { prog, track, blink, settle } from '../core/anim';
import { ease, lerp, clamp, v2, V2, hash1, noise1, TAU } from '../core/math';
import { drawPerson, Pose } from '../chars/rig';
import * as C from '../chars/cast';
import { CharLight } from '../draw/shade';
import { glow, beam, motes } from '../draw/light';
import { blobEllipse, tube, handRect } from '../draw/brush';
import { shedInterior, boxStack, backGarden } from '../sets/shed';
import { labelledBox, dustOver, sledge, breath, GRANDMA_HAND, softShadow } from '../sets/props';
import { drawStreet, snowfall, makeTerrace, toScreen } from '../sets/street';
import { STREET_S } from './common';

function torchInHand(x: C2D, hp: V2, ang: number, s: number) {
  x.save(); x.translate(hp.x, hp.y); x.rotate(ang);
  x.fillStyle = '#2f5a8a'; x.beginPath(); x.roundRect(-6 * s, -9 * s, 40 * s, 18 * s, 5 * s); x.fill();
  x.fillStyle = '#d8d2c2'; x.fillRect(32 * s, -11 * s, 9 * s, 22 * s);
  x.restore();
}

// ---------------------------------------------------------------- C1: the shed door opens
shot('C1', (f) => {
  const t = f.t, tc = f.tc, c = f.ctx;
  const open = prog(t, 0.15, 0.85, ease.outCubic); // cue: creak at C1+0.15
  const push = prog(tc, 0, f.dur, ease.inOutSine);
  for (const x of [c, f.glow]) { x.save(); x.translate(W / 2, H / 2); x.scale(1 + push * 0.05, 1 + push * 0.05); x.translate(-W / 2, -H / 2); }
  const d = shedInterior(f, c, { open, t: tc });
  // Nell in the doorway, silhouetted by the snow, torch in hand
  const torchOn = prog(t, 0.4, 0.5, ease.linear);
  const sweep = prog(t, 0.45, 1.2, ease.inOutCubic);
  const reach = prog(t, 1.65, 1.9, ease.outCubic) * (1 - prog(t, 2.45, 2.8, ease.inOutCubic)); // cue: box scrape at C1+1.75
  const slide = prog(t, 1.75, 2.35, ease.inOutCubic) * 70;
  const L: CharLight = {
    key: -0.2, shadow: '#141830', shadowAmt: 0.85, shadowOff: 24, shadowSoft: 6,
    rim: '#9ab8ff', rimAmt: 1.0, rimW: 7, rimDir: -1.9, ambient: '#2c3360', ambientAmt: 0.86,
    spots: [{ x: 760, y: 640, r: 380, color: '#ffcf96', a: 0.3 * torchOn }],
  };
  const stepIn = prog(t, 0.5, 0.95, ease.outCubic);
  const nx = d.dx + d.dw * lerp(0.62, 0.46, stepIn), ny = d.dy + d.dh + 6 + stepIn * 8;
  const r = drawPerson(f, C.NELL, {
    x: nx, y: ny, s: 1.82, flip: 1, turn: 0.55, lean: 0.06 + reach * 0.1,
    armF: { a: lerp(lerp(0.9, 1.35, sweep), 1.75, reach), b: lerp(0.2, -0.1, reach) }, armB: { a: 0.1, b: 0.4 },
    look: { x: 1, y: 0.2 }, browUp: 0.5 * open, mouth: { open: 0.3 * sweep, smile: 0.1 }, blink: blink(t, [2.6]),
    holdF: reach > 0.5 ? undefined : (x, hp, ang) => torchInHand(x, hp, ang - 0.15 + 0.25 * (1 - sweep), 1.82),
  }, L, { alpha: prog(t, 0.42, 0.62, ease.linear) });
  // the boxes, dusty; the top one slides toward her
  boxStack(f, c, 880, 980, 0.86, { dust: 0.6, topShift: slide, lit: torchOn * (0.4 + 0.6 * sweep) });
  // torch beam cutting through the dust onto the boxes
  if (torchOn > 0) {
    const from = r.handF;
    const tgt = v2(lerp(820, 1060, sweep), lerp(960, 720, sweep));
    const dir = Math.atan2(tgt.y - from.y, tgt.x - from.x);
    const bOn = torchOn * (1 - reach * 0.6);
    beam(f.glow, from, dir, 900, 0.17, 'rgba(255,232,180,0.8)', 0.45 * bOn, 6);
    glow(f.glow, from.x, from.y, 30, '#fff4d8', 0.8 * bOn);
    c.save(); c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(tgt.x, tgt.y, 10, tgt.x, tgt.y, 300);
    g.addColorStop(0, `rgba(255,214,150,${0.3 * bOn})`); g.addColorStop(1, 'rgba(255,214,150,0)');
    c.fillStyle = g; c.fillRect(tgt.x - 300, tgt.y - 300, 600, 600);
    c.restore();
    motes(f, lerp(from.x, tgt.x, 0.55), lerp(from.y, tgt.y, 0.55), 220, 90, 40, '#ffe8c4', 0.55 * bOn, 3);
  }
  for (const x of [c, f.glow]) x.restore();
  f.grade.vignette = 0.62; f.grade.bloom = 0.85;
});

// ---------------------------------------------------------------- C2: Grandma's handwriting
shot('C2', (f) => {
  const t = f.t, tc = f.tc, c = f.ctx;
  const wipe = prog(t, 0.2, 1.0, ease.inOutSine); // cue: mitten wipes dust at C2+0.20
  const push = prog(tc, 0.9, f.dur, ease.inOutSine);
  for (const x of [c, f.glow]) { x.save(); x.translate(W / 2, H / 2); x.scale(1 + push * 0.06, 1 + push * 0.06); x.translate(-W / 2 + push * 30, -H / 2 + push * 20); }
  c.fillStyle = '#0e1020'; c.fillRect(-100, -100, W + 200, H + 200);
  // the box face, huge
  const bx = 140, by = 150, bw = 1640, bh = 820;
  labelledBox(f, c, bx, by, bw, bh, ['LIGHTS — ROOF', '  careful!'], { seed: 23, dust: 0, size: 122, col: '#b48a5c', underline: 0 });
  // hand-drawn parentheses and underline around "careful!"
  c.save(); c.strokeStyle = '#26222e'; c.lineWidth = 10; c.lineCap = 'round';
  const px0 = bx + bw * 0.08 + 20, py0 = by + bh * 0.26 + 122 * 1.45 + 6, pw = 640, ph = 120;
  c.beginPath(); c.moveTo(px0 + 30, py0 - 14); c.quadraticCurveTo(px0 - 4, py0 + ph * 0.5, px0 + 30, py0 + ph + 10); c.stroke();
  c.beginPath(); c.moveTo(px0 + pw, py0 - 14); c.quadraticCurveTo(px0 + pw + 34, py0 + ph * 0.5, px0 + pw, py0 + ph + 10); c.stroke();
  c.lineWidth = 8; c.beginPath(); c.moveTo(px0 + 70, py0 + ph + 18); c.quadraticCurveTo(px0 + 300, py0 + ph + 30, px0 + 560, py0 + ph + 12); c.stroke();
  c.restore();
  // a little heart after "careful!" in Grandma's hand
  c.save(); c.strokeStyle = '#26222e'; c.lineWidth = 9; c.lineCap = 'round'; c.lineJoin = 'round';
  const hx = 1080, hy = 610;
  c.beginPath(); c.moveTo(hx, hy + 50); c.bezierCurveTo(hx - 60, hy + 10, hx - 40, hy - 40, hx, hy - 8); c.bezierCurveTo(hx + 40, hy - 40, hx + 60, hy + 10, hx, hy + 50); c.stroke();
  c.restore();
  // dust film, wiped away behind the mitten
  const sc = f.stage.scratch();
  sc.x.setTransform(f.S, 0, 0, f.S, 0, 0);
  for (const x of [sc.x]) { x.translate(W / 2, H / 2); x.scale(1 + push * 0.06, 1 + push * 0.06); x.translate(-W / 2 + push * 30, -H / 2 + push * 20); }
  dustOver(sc.x, bx, by, bw, bh, 1.0, 23);
  const wx = lerp(bx - 260, bx + bw + 200, wipe);
  sc.x.globalCompositeOperation = 'destination-out';
  sc.x.beginPath(); sc.x.moveTo(bx - 50, by - 30);
  for (let k = 0; k <= 12; k++) sc.x.lineTo(wx + noise1(k * 0.8, 4) * 40, by - 30 + k * ((bh + 60) / 12));
  sc.x.lineTo(bx - 50, by + bh + 30); sc.x.closePath();
  sc.x.fillStyle = 'rgba(0,0,0,0.92)'; sc.x.fill();
  sc.x.setTransform(1, 0, 0, 1, 0, 0);
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(sc.c, 0, 0); c.restore();
  f.stage.release(1);
  // warm torchlight on the label
  c.save(); c.globalCompositeOperation = 'lighter';
  const g = c.createRadialGradient(900, 520, 40, 900, 520, 900);
  g.addColorStop(0, 'rgba(255,214,150,0.22)'); g.addColorStop(1, 'rgba(255,214,150,0)');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.restore();
  glow(f.glow, 900, 520, 700, '#ffcf96', 0.12);
  // the mitten
  if (t > 0.1 && t < 1.15) {
    const my = 560 + Math.sin(t * 9) * 26;
    c.save(); c.translate(wx + 40, my); c.rotate(0.25);
    softShadow(c, 30, 40, 260, 200, 1.57, 0.35);
    tube(c, [v2(-40, 700), v2(-20, 380), v2(0, 220)], 300, 260, '#c23f36');
    c.fillStyle = '#a8342e'; c.beginPath(); blobEllipse(c, 0, 210, 160, 70, 3, 0.05, 9); c.fill();
    c.fillStyle = '#e3a53a'; c.beginPath(); blobEllipse(c, 0, 20, 170, 210, 4, 0.04, 11); c.fill();
    c.beginPath(); blobEllipse(c, -150, 60, 60, 100, 5, 0.06, 9, 0.5); c.fill();
    c.strokeStyle = 'rgba(150,90,20,0.35)'; c.lineWidth = 6;
    for (let k = -4; k <= 4; k++) { c.beginPath(); c.moveTo(-140, k * 40); c.lineTo(150, k * 40 + 6); c.stroke(); }
    c.restore();
    // dust puffs off the trailing edge
    for (let k = 0; k < 10; k++) glow(f.glow, wx - 40 - hash1(k) * 200, 300 + hash1(k * 3) * 500 - (t - 0.2) * 60, 30 + hash1(k * 7) * 40, '#c8bca8', 0.1);
  }
  motes(f, 900, 520, 700, 300, 46, '#ffe4bc', 0.4 * wipe, 9);
  for (const x of [c, f.glow]) x.restore();
  f.grade.vignette = 0.6; f.grade.bloom = 0.8;
});

// ---------------------------------------------------------------- C3: tiptoeing past Grandad's window
function tiptoe(t: number, t0: number, period: number) {
  const p = (t - t0) / (period * 2);
  const th = p * TAU;
  const swingF = Math.max(0, -Math.sin(th)), swingB = Math.max(0, Math.sin(th));
  return {
    legF: { a: 0.45 * Math.cos(th) + 0.75 * swingF, b: -1.5 * swingF },
    legB: { a: -0.45 * Math.cos(th) + 0.75 * swingB, b: -1.5 * swingB },
    bob: -Math.abs(Math.sin(th)) * 22 - 6,
    p,
  };
}

shot('C3', (f) => {
  const t = f.t, tc = f.tc, c = f.ctx;
  const STEP0 = 0.3, PER = 0.52; // cue: tiptoe crunches x6 from C3+0.30, 0.52 s apart
  const steps = Math.floor((t - STEP0) / PER) + 1;
  const along = clamp((t - STEP0 + PER) / (PER * 7.4), 0, 1.2);
  const nx = lerp(-260, 290, along);
  const cam = { x: lerp(-70, 70, prog(tc, 0, f.dur, ease.inOutSine)), y: -125, z: 3.1 };
  for (const x of [c, f.glow]) { x.save(); x.translate(W / 2, H / 2); x.scale(cam.z, cam.z); x.translate(-cam.x, -cam.y); }
  backGarden(f, c, { t: tc, windowLit: 1 });
  // tracks: sledge runners from the shed, and her footprints
  c.strokeStyle = 'rgba(40,50,95,0.45)'; c.lineWidth = 3;
  const sx = nx - 120;
  for (const dy of [14, 24]) { c.beginPath(); c.moveTo(-520, 10 + dy); c.quadraticCurveTo(-300, 26 + dy, sx - 40, 10 + dy); c.stroke(); }
  c.fillStyle = 'rgba(40,50,95,0.45)';
  for (let k = -4; k < steps; k++) {
    const px = lerp(-260, 290, clamp((k * PER + PER) / (PER * 7.4))) - 40;
    if (px > nx - 10) continue;
    c.beginPath(); c.ellipse(px + (k % 2) * 10, 22 + (k % 2) * 6, 9, 3.5, 0, 0, TAU); c.fill();
  }
  // the sledge piled with Grandma's boxes
  sledge(c, sx, 26, 0.5, { boxes: 3, tint: (h) => h, tilt: Math.sin(t * 6) * 0.01 });
  for (const x of [c, f.glow]) x.restore();
  // Nell, tiptoeing, rope over her shoulder, looking back at the window
  const w = tiptoe(t, STEP0, PER);
  const inPool = clamp(1 - Math.abs(nx - 15) / 160);
  const p = toScreen(cam, v2(nx, 26));
  const L: CharLight = {
    key: -2.3, shadow: '#2a3060', shadowAmt: 0.75, shadowOff: 14, shadowSoft: 4,
    rim: '#9fc0ff', rimAmt: 0.75, rimW: 5, rimDir: -2.4, ambient: '#6670ac', ambientAmt: 0.66,
    spots: [{ x: p.x, y: p.y - 220, r: 360, color: '#ffb870', a: 0.5 * inPool }],
  };
  const rr = drawPerson(f, C.NELL, {
    x: p.x, y: p.y, s: STREET_S * cam.z * 1.0, flip: 1, turn: 0.92, lean: 0.2, bob: w.bob,
    legF: w.legF, legB: w.legB,
    armF: { a: -0.5, b: -0.4 }, armB: { a: 1.75, b: 1.9 },
    look: { x: -1, y: -0.5 }, headTurn: -0.35, browUp: 0.65, browIn: 0.35, mouth: { open: 0.12, smile: -0.1, w: 0.45 }, cheek: 0.5,
    plait: Math.sin(w.p * TAU * 2) * 0.6,
  }, L);
  // rope from her hand back to the sledge
  const sp = toScreen(cam, v2(sx + 48, 26 - 14));
  c.strokeStyle = '#c9b48a'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(rr.handF.x, rr.handF.y); c.quadraticCurveTo((rr.handF.x + sp.x) / 2, Math.max(rr.handF.y, sp.y) + 30, sp.x, sp.y); c.stroke();
  snowfall(f, 0.5, 0.15, 3);
  f.grade.vignette = 0.55; f.grade.bloom = 0.85;
});

// ---------------------------------------------------------------- C4: the long haul home
const TERR_C4 = makeTerrace(-3, 9, 77);
shot('C4', (f) => {
  const t = f.t, tc = f.tc;
  const u = prog(tc, 0, f.dur, ease.linear);
  const nx = lerp(1060, 1330, u);
  const cam = { x: lerp(1020, 1180, prog(tc, 0, f.dur, ease.inOutSine)), y: -250, z: 0.52 };
  drawStreet(f, { mood: 'night', cam, houses: TERR_C4, lit: () => 1, windows: (h) => (hash1(h.seed) > 0.25 ? 1 : 0.0), lampsOn: 1, farLights: 1 });
  // the sledge (left/behind) and Nell hauling, leaning into it
  const ph = (t - 0.2) / 0.5;
  const th = ph * Math.PI;
  const sx = nx - 120;
  const c = f.ctx;
  for (const x of [c, f.glow]) { x.save(); x.translate(W / 2, H / 2); x.scale(cam.z, cam.z); x.translate(-cam.x, -cam.y); }
  c.strokeStyle = 'rgba(40,50,95,0.4)'; c.lineWidth = 3;
  for (const dy of [0, 10]) { c.beginPath(); c.moveTo(cam.x - 1100, 178 + dy); c.lineTo(sx - 40, 178 + dy); c.stroke(); }
  sledge(c, sx, 186, 0.48, { boxes: 3 });
  for (const x of [c, f.glow]) x.restore();
  const p = toScreen(cam, v2(nx, 186));
  const L: CharLight = { key: -1.6, shadow: '#2a3060', shadowAmt: 0.7, shadowOff: 14, shadowSoft: 4, rim: '#ffcf8a', rimAmt: 0.7, rimW: 4, rimDir: -1.4, ambient: '#7c87bd', ambientAmt: 0.6 };
  const rr = drawPerson(f, C.NELL, {
    x: p.x, y: p.y, s: STREET_S * cam.z, flip: 1, turn: 0.8, lean: 0.38,
    legF: { a: 0.45 * Math.sin(th), b: -0.7 * Math.max(0, Math.cos(th)) }, legB: { a: -0.45 * Math.sin(th), b: -0.7 * Math.max(0, -Math.cos(th)) },
    bob: -Math.abs(Math.sin(th)) * 4, armF: { a: 0.6, b: 2.0 }, armB: { a: -0.3, b: 0.6 }, browIn: -0.6, mouth: { open: 0.2, smile: -0.2 },
  }, L);
  const sp = toScreen(cam, v2(sx + 46, 186 - 14));
  c.strokeStyle = '#c9b48a'; c.lineWidth = 1.6;
  c.beginPath(); c.moveTo(rr.handF.x, rr.handF.y); c.quadraticCurveTo((rr.handF.x + sp.x) / 2, Math.max(rr.handF.y, sp.y) + 8, sp.x, sp.y); c.stroke();
  // breath puffs in the cold
  for (const b0 of [0.3, 1.1, 1.9, 2.7]) breath(c, rr.head.x + 24, rr.head.y + 10, (tc - b0) / 0.9, 1, 1.3);
  snowfall(f, 0.9, 0.3, 4);
  f.grade.vignette = 0.5; f.grade.bloom = 0.9;
});
