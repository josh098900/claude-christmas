// Sequence H: THE DEAD SWITCH.
import { shot } from '../film';
import { F, W, H, C2D } from '../core/stage';
import { prog, track, blink } from '../core/anim';
import { ease, lerp, clamp, v2, V2, hash1, TAU, noise1 } from '../core/math';
import { drawStreet, snowfall, makeTerrace, doorRect, toScreen, Cam, House } from '../sets/street';
import { drawPerson, Pose, walk, Spec, Rigged } from '../chars/rig';
import * as C from '../chars/cast';
import { CharLight } from '../draw/shade';
import { glow, bulb, BULB_SEQ, lightString } from '../draw/light';
import { blobEllipse, handRect, vgrad, tube } from '../draw/brush';
import { handText, measure } from '../draw/letters';
import { STREET_S, L_DARK_STREET } from './common';
import { mitten } from '../sets/doorstep';
import { LADDER_MAN_HAT } from './seqF';

const TERRACE = makeTerrace(-7, 7);
const GH = TERRACE.find((h) => h.grandad)!;
const GDR = doorRect(GH);
const OPPOSITE = makeTerrace(-7, 7, 500);

const DARK = { lit: () => 0, windows: () => 0, blaze: 1, blazeOn: 0, lampsOn: 1, farLights: 0.35, bellFrost: 1 } as const;

/** Depth of field: blur everything drawn so far (base + glow). */
export function blurSoFar(f: F, px: number) {
  const st = f.stage;
  const A = st.scratch();
  A.x.filter = `blur(${px * f.S}px)`; A.x.drawImage(st.base, 0, 0); A.x.filter = 'none';
  f.ctx.save(); f.ctx.setTransform(1, 0, 0, 1, 0, 0); f.ctx.globalCompositeOperation = 'copy'; f.ctx.drawImage(A.c, 0, 0); f.ctx.restore();
  A.x.clearRect(0, 0, A.c.width, A.c.height);
  A.x.filter = `blur(${px * f.S}px)`; A.x.drawImage(st.glowC, 0, 0); A.x.filter = 'none';
  f.glow.save(); f.glow.setTransform(1, 0, 0, 1, 0, 0); f.glow.globalCompositeOperation = 'copy'; f.glow.drawImage(A.c, 0, 0); f.glow.restore();
  st.release(1);
}

const L_COLD = (spots: { x: number; y: number; r: number; color: string; a: number }[] = []): CharLight => ({ ...L_DARK_STREET, spots });

// the waiting crowd in front of Grandad's house (world x, y, spec, flip)
const CROWD: [Spec, number, number, number][] = [
  [LADDER_MAN_HAT, -250, 150, 1], [C.OLD_LADY, -150, 175, 1], [C.SHOPKEEPER, -60, 160, 1], [C.TEEN1, 210, 150, -1],
  [C.TEEN2, 140, 168, -1], [C.YOUNG_DAD, -330, 168, 1], [C.DAD, 290, 172, -1],
];

function crowd(f: F, cam: Cam, L: CharLight, t: number, faceRight = true, skip?: string) {
  const order = [...CROWD].sort((a, b) => a[2] - b[2]);
  for (const [sp, x, y, fl] of order) {
    if (skip === sp.name) continue;
    const p = toScreen(cam, v2(x, y));
    drawPerson(f, sp, { x: p.x, y: p.y + Math.sin(t * 1.1 + x) * 1.5, s: STREET_S * cam.z, flip: faceRight ? 1 : fl, turn: 0.45, armF: { a: 0.15, b: 0.6 }, armB: { a: 0.1, b: 0.5 }, browUp: 0.2, browIn: 0.3, mouth: { smile: 0.1 }, look: { x: 1, y: 0 }, blink: blink(t, [0.7 + hash1(x) * 2]) } as Pose, L);
  }
}

// ---------------------------------------------------------------- H1: the walk home, every house dark
shot('H1', (f) => {
  const t = f.t, tc = f.tc;
  const speed = (u: number) => lerp(62, 18, prog(u, 1.2, 3.2, ease.inOutSine));
  // integrate position
  let x = 720; for (let u = 0; u < tc; u += 1 / 24) x -= speed(u) / 24;
  const cam: Cam = { x: x - 120, y: -150, z: 1.6 };
  drawStreet(f, { mood: 'eve', cam, houses: TERRACE, ...DARK });
  const L = L_COLD();
  crowd(f, cam, { ...L, ambientAmt: 0.92 }, t);
  const slow = prog(tc, 1.2, 3.2);
  const phase = t * lerp(0.9, 0.35, slow);
  const wg = walk(phase, lerp(0.3, 0.12, slow), 0.08), wm = walk(phase + 0.5, lerp(0.36, 0.16, slow), 0.1);
  const pg = toScreen(cam, v2(x, 172)), pm = toScreen(cam, v2(x + 66, 176));
  const puzzle = prog(tc, 1.0, 2.2);
  drawPerson(f, C.MUM, { x: pm.x, y: pm.y, s: STREET_S * cam.z, flip: -1, turn: 0.7, ...wm, armB: { a: 0.5, b: 1.0 }, look: { x: 1, y: -0.2 }, mouth: { smile: 0.15 }, browUp: 0.2 } as Pose, L);
  drawPerson(f, C.GRANDAD_OUT, { x: pg.x, y: pg.y, s: STREET_S * cam.z, flip: -1, turn: 0.6, ...wg, armF: { a: 0.4, b: 0.8 },
    browUp: puzzle * 0.7, browIn: puzzle * 0.5, nod: lerp(0.25, -0.15, puzzle), look: { x: lerp(0.3, 1, puzzle), y: lerp(0.2, -0.6, puzzle) }, headTilt: puzzle * 0.08, mouth: { smile: -0.1 } } as Pose, L);
  snowfall(f, 0.5, 0.15, 81);
  f.grade.vignette = 0.6; f.grade.bloom = 0.8; f.grade.exposure = 0.95;
});

// ---------------------------------------------------------------- H2: the crowd waits; Nell steps forward
shot('H2', (f) => {
  const t = f.t, tc = f.tc;
  const cam: Cam = { x: lerp(40, 60, tc / f.dur), y: -255, z: lerp(1.1, 1.16, tc / f.dur) };
  drawStreet(f, { mood: 'eve', cam, houses: TERRACE, ...DARK });
  const L = L_COLD();
  crowd(f, cam, { ...L, ambientAmt: 0.85 }, t);
  // Nell steps forward at +1.2 with her stack of cards
  const step = prog(tc, 1.0, 1.7, ease.inOutCubic);
  const nx = lerp(30, 120, step), ny = lerp(190, 250, step);
  const w = walk(t * 1.2, 0.35 * (step > 0 && step < 1 ? 1 : 0), 0);
  const np = toScreen(cam, v2(nx, ny));
  const R = drawPerson(f, C.NELL, { x: np.x, y: np.y, s: STREET_S * cam.z * lerp(1.05, 1.25, step), flip: 1, turn: 0.55, ...(step > 0 && step < 1 ? w : {}), armF: { a: 1.2, b: 1.0 }, armB: { a: 1.1, b: 1.1 }, browUp: 0.3, browIn: 0.4, look: { x: 1, y: -0.3 }, mouth: { smile: 0.1 } } as Pose, L);
  // the card stack
  f.ctx.fillStyle = '#e8e0cc'; f.ctx.beginPath(); handRect(f.ctx, R.handF.x - 4, R.handF.y - 18, 34 * cam.z * 0.6, 26 * cam.z * 0.6, 7, 0.5); f.ctx.fill();
  // Grandad and Mum arriving, backs to us, at the right edge
  const gp = v2(W * 0.86, H + 260), mp = v2(W * 1.0, H + 280);
  drawPerson(f, C.MUM, { x: mp.x, y: mp.y, s: 1.35, flip: -1, turn: 0.2, back: true, armF: { a: 0.2, b: 0.4 } } as Pose, { ...L, ambientAmt: 0.95, rimAmt: 0.6 });
  drawPerson(f, C.GRANDAD_OUT, { x: gp.x, y: gp.y, s: 1.3, flip: -1, turn: 0.2, back: true, armF: { a: 0.2, b: 0.4 } } as Pose, { ...L, ambientAmt: 0.95, rimAmt: 0.6 });
  snowfall(f, 0.45, 0.15, 82);
  f.grade.vignette = 0.6; f.grade.bloom = 0.8; f.grade.exposure = 0.95;
});

// ---------------------------------------------------------------- H3: the cue cards
const CARDS: string[][] = [['GRANDMA', 'ALWAYS SAID'], ['IT SHOULD BE', 'SEEN FROM', 'SPACE'], ['SO…']];

function drawCard(f: F, c: C2D, cx: number, cy: number, w: number, h: number, idx: number, rot = 0) {
  c.save(); c.translate(cx, cy); c.rotate(rot);
  c.fillStyle = '#f1ead8'; c.beginPath(); handRect(c, -w / 2, -h / 2, w, h, 90 + idx, 1.5); c.fill();
  c.fillStyle = 'rgba(70,60,90,0.12)'; c.fillRect(-w / 2, h / 2 - 8, w, 8);
  const lines = CARDS[idx];
  const longest = Math.max(...lines.map((l) => measure(l, 1, { tracking: 0 })));
  const sz = Math.min(idx === 2 ? h * 0.42 : idx === 1 ? h * 0.2 : h * 0.24, (w * 0.84) / longest);
  const lh = sz * 1.32;
  const y0 = -((lines.length - 1) * lh + sz) / 2;
  lines.forEach((ln, i) => {
    handText(c, ln, 0, y0 + i * lh, sz, { align: 'center', color: '#23264a', seed: 300 + idx * 10 + i, slant: 0.02, wobble: 1.4, weight: 1.45, baseline: 1.6, boil: 0 });
  });
  // little drawn bulbs in the corners
  for (let k = 0; k < 4; k++) {
    const qx = (k % 2 ? 1 : -1) * (w / 2 - w * 0.07), qy = (k < 2 ? -1 : 1) * (h / 2 - h * 0.1);
    c.fillStyle = BULB_SEQ[(k + idx) % 5]; c.beginPath(); c.ellipse(qx, qy, w * 0.018, w * 0.026, 0, 0, TAU); c.fill();
  }
  if (idx === 1) { // a tiny Earth with a dot
    c.strokeStyle = '#3f6db0'; c.lineWidth = 2.5; c.beginPath(); c.arc(w * 0.36, h * 0.28, h * 0.08, 0, TAU); c.stroke();
    c.fillStyle = '#ffae2b'; c.beginPath(); c.arc(w * 0.38, h * 0.26, 3, 0, TAU); c.fill();
  }
  c.restore();
}

/** Nell holding the cards up to Grandad (his POV). `flipAt`: time the top card drops away; `from` card index. */
function cueCardShot(f: F, from: number, to: number, flipAt: number, lift = 0) {
  const t = f.t, tc = f.tc;
  const cam: Cam = { x: GDR.x + GDR.w / 2 - 20, y: -70, z: 2.6 };
  drawStreet(f, { mood: 'eve', cam, houses: TERRACE, ...DARK });
  // the waiting neighbours behind her, soft
  crowd(f, cam, { ...L_COLD(), ambientAmt: 0.9 }, t, false);
  blurSoFar(f, 5);
  // Nell, close, facing Grandad (camera)
  const lampSpot = { x: W * 0.9, y: -200, r: 1400, color: '#ffcf8a', a: 0.22 };
  const s = 2.35;
  const ny = 880 - lift * 10;
  const tender = track(t, [[0, 0.2], [1.2, 1]]);
  const R = drawPerson(f, C.NELL, { x: W * 0.47, y: ny, s, flip: 1, turn: 0.12, armF: { a: 0.25, b: 0.4 }, armB: { a: 0.2, b: 0.4 },
    browUp: 0.35 + (to === 2 ? 0.4 : 0), browIn: 0.35 * tender, look: { x: 0.2, y: -0.55 }, nod: -0.05, headTilt: -0.05,
    mouth: { smile: to === 2 ? 0.55 : 0.25 + tender * 0.15 }, blink: blink(t, [1.1]), plait: Math.sin(t * 2) * 0.15 } as Pose,
    { ...L_COLD([lampSpot]), rimAmt: 0.6, ambientAmt: 0.6, key: -0.9 });
  // the card held in front of her chest
  const cw = 420, ch = 290;
  const cx = R.head.x, cy = R.head.y + 335 - lift * 30;
  const c = f.ctx;
  const fl = clamp((tc - (flipAt - 0.25)) / 0.25);
  // sleeves reaching to the card edges (behind it)
  tube(c, [v2(cx - 110, cy - 40), v2(cx - cw / 2 + 10, cy + 30)], 70, 60, '#9a3530');
  tube(c, [v2(cx + 110, cy - 40), v2(cx + cw / 2 - 10, cy + 30)], 70, 60, '#8a2f2c');
  // next card underneath
  if (fl > 0) drawCard(f, c, cx, cy, cw, ch, to, -0.02);
  // top card drops away
  if (fl < 1) {
    const drop = ease.inQuad(fl);
    drawCard(f, c, cx + drop * 40, cy + drop * 520, cw, ch, from, -0.03 + drop * 0.5);
  }
  mitten(c, cx - cw / 2 + 14, cy + 30, 30, Math.PI, '#d9a345');
  mitten(c, cx + cw / 2 - 14, cy + 30, 30, 0, '#c8923a');
  snowfall(f, 0.4, 0.15, 83);
  f.grade.vignette = 0.6; f.grade.bloom = 0.75; f.grade.exposure = 0.98;
}
shot('H3a', (f) => cueCardShot(f, 0, 0, 99, track(f.tc, [[0, 1], [0.3, 0, ease.outBack]])));
shot('H3c', (f) => cueCardShot(f, 0, 1, 0.4));
shot('H3d', (f) => cueCardShot(f, 1, 2, 0.2));

// ---------------------------------------------------------------- H3b: Grandad, struck
shot('H3b', (f) => {
  const t = f.t, tc = f.tc;
  const cam: Cam = { x: 420, y: -150, z: 1.8 };
  drawStreet(f, { mood: 'eve', cam, houses: OPPOSITE, ...DARK });
  blurSoFar(f, 7);
  const struck = track(t, [[0, 0], [0.45, 0], [0.7, 1, ease.outBack], [1.5, 1]]);
  const lampSpot = { x: W * 0.95, y: -100, r: 1300, color: '#ffcf8a', a: 0.25 };
  drawPerson(f, C.GRANDAD_OUT, { x: W * 0.52, y: H + 610 + lerp(0, -6, struck), s: 3.2, flip: -1, turn: 0.3, headTurn: -0.1,
    browUp: struck * 0.85, browIn: 0.15 + struck * 0.6, nod: lerp(0.15, -0.05, struck), look: { x: 0.6, y: 0.5 }, headTilt: struck * -0.04,
    mouth: { smile: lerp(-0.1, -0.3, struck), open: struck * 0.12 }, blink: blink(t, [1.25]), armF: { a: 0.1, b: 0.3 } } as Pose,
    { ...L_COLD([lampSpot]), key: -0.7, rimAmt: 0.55, ambientAmt: 0.62 });
  // glint on his glasses as the brows lift
  if (struck > 0.5) glow(f.glow, W * 0.52 - 80, H * 0.4, 30, '#dfe8ff', 0.4 * (struck - 0.5) * 2 * (1 - clamp((tc - 1.0) * 2)));
  snowfall(f, 0.35, 0.15, 84);
  f.grade.vignette = 0.65; f.grade.bloom = 0.75; f.grade.exposure = 0.98;
});

// ---------------------------------------------------------------- H4: the switch (CLICK at +0.25)
shot('H4', (f) => {
  const t = f.t, tc = f.tc;
  const c = f.ctx;
  const clicked = tc >= 0.25 - 1e-6;
  // snowy step, dark
  vgrad(c, 0, 0, W, H, [[0, '#141c3e'], [0.55, '#2a3766'], [1, '#56679e']]);
  // brick wall top half
  c.fillStyle = '#3a2c40'; c.fillRect(0, 0, W, H * 0.42);
  c.fillStyle = '#463448';
  for (let k = 0; k < 60; k++) { const bx = hash1(k * 2.3) * W, by = hash1(k * 5.7) * H * 0.38; c.fillRect(bx, by, 64, 22); }
  c.fillStyle = '#a3b2da'; c.fillRect(0, H * 0.42, W, 16);
  // camera drifts along the dead string after the click
  const pan = clicked ? ease.inOutSine(clamp((tc - 0.6) / 1.4)) * 260 : 0;
  c.save(); f.glow.save(); c.translate(-pan, 0); f.glow.translate(-pan, 0);
  // the string of dead bulbs trailing from the box across the snow and up the wall
  const anchors: V2[] = [v2(W * 0.56, H * 0.66), v2(W * 0.8, H * 0.74), v2(W * 1.05, H * 0.6), v2(W * 1.25, H * 0.2), v2(W * 1.4, -40)];
  lightString(f, { anchors, spacing: 64, size: 22, sag: 30, on: 0, seed: 7 });
  // cables into the box
  c.strokeStyle = '#c8702a'; c.lineWidth = 12; c.lineCap = 'round';
  c.beginPath(); c.moveTo(W * 0.3, H * 0.66); c.bezierCurveTo(W * 0.15, H * 0.75, W * 0.05, H * 0.95, -60, H * 0.98); c.stroke();
  // the outdoor extension box
  const bx = W * 0.3, by = H * 0.5, bw = 520, bh = 300;
  c.fillStyle = '#20232a'; c.beginPath(); handRect(c, bx - 6, by + bh - 10, bw + 12, 26, 3, 1); c.fill();
  c.fillStyle = '#4d5560'; c.beginPath(); handRect(c, bx, by, bw, bh, 5, 1.5); c.fill();
  c.fillStyle = '#5e6774'; c.fillRect(bx + 12, by + 10, bw - 24, 26);
  c.fillStyle = '#e09a2a'; c.fillRect(bx, by + bh - 58, bw, 22);
  // sockets
  for (let k = 0; k < 2; k++) {
    c.fillStyle = '#3a4048'; c.beginPath(); c.roundRect(bx + 40 + k * 130, by + 70, 100, 120, 14); c.fill();
    c.fillStyle = '#1a1c22'; c.fillRect(bx + 72 + k * 130, by + 100, 12, 30); c.fillRect(bx + 102 + k * 130, by + 100, 12, 30); c.fillRect(bx + 86 + k * 130, by + 145, 14, 24);
  }
  // plug in one socket
  c.fillStyle = '#e8e2d4'; c.beginPath(); c.roundRect(bx + 52, by + 84, 76, 96, 10); c.fill();
  // the big rocker switch
  const sx = bx + 390, sy = by + 130;
  c.fillStyle = '#2a2e36'; c.beginPath(); c.roundRect(sx - 60, sy - 90, 120, 180, 16); c.fill();
  c.fillStyle = clicked ? '#b8302c' : '#8a2a28';
  c.save(); c.translate(sx, sy); c.rotate(clicked ? 0.22 : -0.22);
  c.beginPath(); c.roundRect(-44, -70, 88, 140, 12); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(-36, clicked ? 4 : -62, 72, 56);
  c.restore();
  handText(c, 'ON', sx - 150, sy - 60, 34, { color: '#e8e2d4', seed: 5, weight: 1.1, slant: 0.0 });
  // neon indicator: power is ON
  c.fillStyle = clicked ? '#ff6a4a' : '#5a2a28'; c.beginPath(); c.arc(bx + bw - 60, by + 34, 11, 0, TAU); c.fill();
  if (clicked) { glow(f.glow, bx + bw - 60, by + 34, 50, '#ff6a4a', 0.55); glow(f.glow, bx + bw - 60, by + 34, 16, '#fff0d0', 0.6); }
  // snow on top of the box
  c.fillStyle = '#a3b2da'; c.beginPath(); c.moveTo(bx - 6, by + 4); for (let k = 0; k <= 12; k++) c.lineTo(bx + k * bw / 12, by - 10 - hash1(k * 3.3) * 14); c.lineTo(bx + bw + 6, by + 4); c.closePath(); c.fill();
  // the mitten: hovers, presses on frame 6 (+0.25 s), lifts away
  const press = track(tc, [[0, 0.0], [0.17, 0.3, ease.inOutQuad], [0.25, 1, ease.inQuad], [0.6, 1], [1.1, -0.4, ease.inOutCubic]]);
  const mx = sx + 10 + (1 - clamp(press, 0, 1)) * 30, my = sy - 120 + press * 110 - (press < 0 ? press * -500 : 0);
  // sleeve
  tube(c, [v2(mx + 268, my - 410), v2(mx + 130, my - 150), v2(mx + 18, my - 22)], 124, 104, '#6a2026');
  tube(c, [v2(mx + 254, my - 424), v2(mx + 116, my - 164), v2(mx + 6, my - 34)], 108, 90, '#a8342e');
  c.fillStyle = '#8f2a28'; c.beginPath(); blobEllipse(c, mx + 22, my - 34, 52, 40, 9, 0.06, 9, -1.0); c.fill();
  mitten(c, mx, my, 70, Math.PI * 0.62, '#e3a53a');
  c.restore(); f.glow.restore();
  // cold moonlight from above
  c.save(); c.globalCompositeOperation = 'lighter';
  const mg = c.createRadialGradient(W * 0.6, -200, 100, W * 0.6, -200, 1400);
  mg.addColorStop(0, 'rgba(120,150,230,0.18)'); mg.addColorStop(1, 'rgba(120,150,230,0)');
  c.fillStyle = mg; c.fillRect(0, 0, W, H); c.restore();
  snowfall(f, 0.35, 0.12, 85);
  f.grade.vignette = 0.6; f.grade.bloom = 0.8; f.grade.saturation = 0.9;
});

// ---------------------------------------------------------------- H5: the worst moment
shot('H5', (f) => {
  const t = f.t, tc = f.tc;
  const cam: Cam = { x: GDR.x + GDR.w / 2 - 40, y: -60, z: 2.8 };
  drawStreet(f, { mood: 'eve', cam, houses: TERRACE, ...DARK });
  crowd(f, cam, { ...L_COLD(), ambientAmt: 0.92 }, t, false);
  blurSoFar(f, 8);
  const fall = track(t, [[0, 0], [0.4, 0], [2.6, 1, ease.inOutSine]]);
  const push = lerp(1.0, 1.06, ease.inOutSine(tc / f.dur));
  const s = 3.3 * push;
  const R = drawPerson(f, C.NELL, {
    x: W * 0.5, y: H + 120 + fall * 30, s, flip: 1, turn: 0.1,
    browUp: lerp(0.55, -0.1, fall), browIn: lerp(0.0, 1.0, fall), nod: lerp(-0.15, 0.55, fall), headTilt: fall * 0.06,
    look: { x: lerp(0.1, -0.2, fall), y: lerp(-0.6, 0.9, fall) }, mouth: { smile: lerp(0.55, -0.75, fall), w: lerp(1, 0.8, fall) },
    blink: blink(t, [1.6]) + (tc > 2.9 ? clamp((tc - 2.9) * 2) * 0.35 : 0), armF: { a: lerp(0.5, 0.05, fall), b: 0.4 }, armB: { a: lerp(0.45, 0.05, fall), b: 0.4 },
    lean: fall * 0.05, plait: -fall * 0.3,
  } as Pose, { ...L_COLD([{ x: W * 0.92, y: -150, r: 1500, color: '#ffcf8a', a: 0.18 * (1 - fall * 0.5) }]), key: -0.9, rimAmt: 0.5, ambientAmt: 0.66 });
  // a small sigh of breath in the cold
  const sigh = clamp((tc - 2.2) / 1.2);
  if (sigh > 0 && sigh < 1) {
    const m = v2(R.head.x + 14, R.head.y + 120);
    for (let k = 0; k < 4; k++) {
      const u = clamp(sigh * 1.3 - k * 0.1);
      f.ctx.fillStyle = `rgba(210,222,250,${0.18 * (1 - u)})`;
      f.ctx.beginPath(); f.ctx.arc(m.x + u * 60 + k * 10, m.y - u * 80, 14 + u * 40, 0, TAU); f.ctx.fill();
    }
  }
  snowfall(f, 0.35, 0.1, 86);
  f.grade.vignette = 0.65 + fall * 0.1; f.grade.bloom = 0.7; f.grade.exposure = 0.95 - fall * 0.05; f.grade.saturation = 0.95 - fall * 0.1;
});
