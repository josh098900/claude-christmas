// Sequence D: THE OPERATION (the misdirect).
import { shot } from '../film';
import { F, W, H, C2D } from '../core/stage';
import { prog, track, blink, settle } from '../core/anim';
import { ease, lerp, clamp, v2, V2, hash1, noise1, TAU, RNG } from '../core/math';
import { drawRoom, drawDesk, rcamApply, rToScreen, RCam, DESK_Y, WIN, planWall, tangle } from '../sets/bedroom';
import { drawTablet, typed, typeDur, TabletState, Msg } from '../draw/tablet';
import { drawPerson, Pose, Spec } from '../chars/rig';
import * as C from '../chars/cast';
import { CharLight } from '../draw/shade';
import { glow, bulb, BULB_SEQ, beam, shaft, motes } from '../draw/light';
import { handText } from '../draw/letters';
import { handRect, blobEllipse, smoothOpen, tube, vgrad } from '../draw/brush';
import { topHand, topHandTip, NELL_HAND, coil, advent, softShadow, santaPapers } from '../sets/props';
import { landing, hallway } from '../sets/hallway';

export const Q1 = 'why does 1 bulb make them ALL go off';
export const Q2 = 'how to find the broken bulb in xmas lights';
export const Q3 = 'how many lights do you need to be seen from space';
export const R1 = 'Old strings are wired in a line, so when one bulb fails the circuit breaks and the whole string goes dark. Find the one and the rest come back.';
export const R2 = 'Start at the plug end and test each bulb in turn. A tester helps. Work slowly and keep the dud ones separate.';
export const R3 = 'Nobody can see one house from space with their eyes. But from a plane, or from a hill, a bright street really stands out.';

export function nellDeskLight(tabletScreen: { x: number; y: number }, amt = 1): CharLight {
  return {
    key: -0.2, shadow: '#283063', shadowAmt: 0.78, shadowOff: 18, shadowSoft: 5,
    rim: '#86a4f4', rimAmt: 0.75, rimW: 5, rimDir: -2.6, ambient: '#4f5aa0', ambientAmt: 0.66,
    spots: [{ x: tabletScreen.x - 40, y: tabletScreen.y - 90, r: 520, color: '#ffc98e', a: 0.85 * amt }],
  };
}

/** The tablet on its stand from the side; returns the screen-facing point in screen space. */
function sideTablet(f: F, c: C2D, x: number, y: number, amt: number) {
  c.save(); c.translate(x, y); c.rotate(-0.22);
  // stand
  c.fillStyle = '#3a3a44'; c.beginPath(); c.moveTo(-6, 6); c.lineTo(26, 6); c.lineTo(8, -40); c.closePath(); c.fill();
  // device edge
  c.fillStyle = '#2a2d36'; c.beginPath(); c.roundRect(-9, -98, 14, 106, 6); c.fill();
  // screen light on the facing edge
  c.fillStyle = '#ffe8c4'; c.globalAlpha = 0.95 * amt; c.fillRect(-11, -94, 3.5, 98); c.globalAlpha = 1;
  c.restore();
  glow(f.glow, x - 22, y - 48, 70, '#fff0d8', 0.55 * amt);
  glow(f.glow, x - 40, y - 50, 320, '#ffc98e', 0.32 * amt);
}

/** Nell at her desk, seen from the side, the tablet in front of her. */
export function deskScene(f: F, cam: RCam, pose: Partial<Pose>, tab: TabletState, o: { jar?: number; tangles?: number; glowAmt?: number; moon?: V2; spec?: Spec; nellX?: number; coils?: number; shaftAmt?: number; noNell?: boolean; beforeNell?: (tabS: V2) => void; afterNell?: (tabS: V2) => void; mug?: boolean } = {}) {
  void tab;
  const amt = o.glowAmt ?? 1;
  drawRoom(f, cam, { moon: o.moon });
  const c = f.ctx;
  // cold shaft from the window across the wall and desk
  c.save(); f.glow.save(); rcamApply(c, cam); rcamApply(f.glow, cam);
  shaft(f.glow, [v2(WIN.x, WIN.y), v2(WIN.x + WIN.w, WIN.y), v2(WIN.x + WIN.w + 260, DESK_Y), v2(WIN.x + 200, DESK_Y)], 'rgba(120,150,240,0.9)', 0.12 * (o.shaftAmt ?? 1), 16);
  c.restore(); f.glow.restore();
  const tabW = { x: 128, y: DESK_Y - 24 };
  const tabS = rToScreen(cam, tabW);
  const nx = o.nellX ?? 10;
  const feet = rToScreen(cam, v2(nx, -10));
  // her chair (she kneels up on it to reach)
  c.save(); rcamApply(c, cam);
  c.fillStyle = '#4a3226';
  c.fillRect(nx - 92, -262, 14, 262); c.fillRect(nx + 40, -110, 12, 110); c.fillRect(nx - 90, -112, 150, 14);
  c.beginPath(); c.arc(nx - 85, -262, 11, 0, TAU); c.fill(); c.fillRect(nx - 96, -214, 24, 10);
  c.restore();
  if (o.beforeNell) o.beforeNell(tabS);
  if (!o.noNell) {
    drawPerson(f, o.spec || C.NELL_HOME, {
      x: feet.x, y: feet.y, s: cam.z * 1.0, flip: 1, turn: 0.95, hipDrop: -112,
      legF: { a: 1.45, b: -1.45 }, legB: { a: 1.35, b: -1.4 },
      armF: { a: 1.25, b: 0.25 }, armB: { a: 1.05, b: 0.55 }, lean: 0.14,
      look: { x: 1, y: 0.25 }, ...pose,
    } as Pose, nellDeskLight(tabS, amt));
  }
  if (o.afterNell) o.afterNell(tabS);
  // desk in front
  c.save(); f.glow.save(); rcamApply(c, cam); rcamApply(f.glow, cam);
  drawDesk(f, c, { jar: o.jar ?? 0.3, tangles: o.tangles ?? 2 });
  if (o.mug) {
    // a mug of cocoa, steaming
    c.fillStyle = '#d8d0c4'; c.beginPath(); handRect(c, -72, DESK_Y - 58, 30, 34, 3, 0.5); c.fill();
    c.strokeStyle = '#d8d0c4'; c.lineWidth = 5; c.beginPath(); c.arc(-40, DESK_Y - 42, 8, -1.2, 1.2); c.stroke();
    c.fillStyle = '#5a3424'; c.fillRect(-70, DESK_Y - 58, 26, 5);
    for (let k = 0; k < 3; k++) { const u = (f.tc * 0.6 + k / 3) % 1; c.fillStyle = `rgba(230,225,240,${0.35 * (1 - u)})`; c.beginPath(); c.arc(-58 + Math.sin(u * 6 + k) * 5, DESK_Y - 66 - u * 50, 4 + u * 6, 0, TAU); c.fill(); }
  }
  // warm pool on the desk top from the screen
  c.save(); c.globalCompositeOperation = 'lighter';
  const pg = c.createRadialGradient(tabW.x - 40, DESK_Y - 20, 5, tabW.x - 40, DESK_Y - 20, 200);
  pg.addColorStop(0, `rgba(255,190,120,${0.22 * amt})`); pg.addColorStop(1, 'rgba(255,190,120,0)');
  c.fillStyle = pg; c.fillRect(tabW.x - 260, DESK_Y - 80, 440, 120);
  c.restore();
  for (let i = 0; i < (o.coils ?? 0); i++) coil(f, c, -150 + (i % 3) * 58, DESK_Y - 10 - Math.floor(i / 3) * 14, 26, i * 3 + 1);
  sideTablet(f, c, tabW.x, tabW.y, amt);
  c.restore(); f.glow.restore();
  f.grade.vignette = 0.58; f.grade.bloom = 0.85;
  return { tabS };
}

/** The tablet filling the frame: a kid typing; replies arrive soft and out of focus. */
export function tabletCU(f: F, st: TabletState, o: { zoom?: number; drift?: number; ox?: number; oy?: number } = {}) {
  const c = f.ctx;
  c.fillStyle = '#141a33'; c.fillRect(0, 0, W, H);
  const g = c.createRadialGradient(W / 2, H * 0.9, 50, W / 2, H * 0.7, 1100);
  g.addColorStop(0, '#5a4a52'); g.addColorStop(1, '#141a33');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  // desk edge and a blurred tangle of wire behind the tablet
  c.save(); c.globalAlpha = 0.35;
  c.strokeStyle = '#1e3a2a'; c.lineWidth = 5;
  const r = new RNG(9);
  c.beginPath(); c.moveTo(80, 980);
  for (let i = 0; i < 30; i++) c.lineTo(r.range(0, 420), r.range(700, 1080));
  c.stroke();
  for (let i = 0; i < 16; i++) { c.fillStyle = BULB_SEQ[i % 5]; c.globalAlpha = 0.25; c.beginPath(); c.arc(r.range(0, 400), r.range(720, 1060), 7, 0, TAU); c.fill(); }
  c.restore();
  const z = o.zoom ?? 1;
  const tw = 1180 * z, th = 860 * z;
  const tx = W / 2 - tw / 2 + (o.drift ?? 0) + (o.ox ?? 0), ty = H / 2 - th / 2 + 30 + (o.oy ?? 0);
  drawTablet(f, c, tx, ty, tw, th, { font: 46, ...st }, { glowAmt: 0.9 });
  f.grade.vignette = 0.6; f.grade.bloom = 0.5; f.grade.bloomThreshold = 0.92;
  return { tx, ty, tw, th };
}

/** A kid's hand coming in from the bottom edge, index finger tapping. */
function tapHand(c: C2D, x: number, y: number, tap: number, s = 1) {
  const sk = '#e2ae8e';
  c.save(); c.translate(x, y + tap * 8 * s); c.scale(s, s);
  softShadow(c, 30, 40, 110, 70, -0.4, 0.35);
  tube(c, [v2(140, 260), v2(80, 140), v2(40, 60)], 92, 78, '#d8a24a'); // jumper sleeve
  c.fillStyle = '#c08b34'; c.beginPath(); blobEllipse(c, 40, 60, 46, 26, 3, 0.05, 8, -0.9); c.fill();
  c.fillStyle = sk; c.beginPath(); blobEllipse(c, 10, 10, 48, 40, 4, 0.05, 9, -0.6); c.fill();
  // curled fingers
  for (let i = 0; i < 3; i++) { c.beginPath(); blobEllipse(c, -6 + i * 18, 36 + i * 6, 15, 12, 5 + i, 0.06, 7); c.fill(); }
  // pointing index finger
  tube(c, [v2(-10, -10), v2(-34, -48), v2(-50, -78)], 22, 18, sk);
  c.fillStyle = '#efc4aa'; c.beginPath(); c.arc(-50, -78, 6, 0, TAU); c.fill();
  c.restore();
}

/** One chat beat: type `q` (from `pre` chars already typed), send, think, reply. */
function chatBeat(f: F, prior: Msg[], q: string, reply: string, tm: { t0: number; tSend: number; tReply: number; tDone: number; pre?: number; blur?: number }) {
  const t = f.t;
  const pre = tm.pre ?? 0;
  const rest = q.slice(pre);
  const cps = typeDur(rest, 1, 3) / Math.max(0.2, tm.tSend - tm.t0 - 0.05);
  const ty = t < tm.tSend ? q.slice(0, pre) + typed(rest, t, tm.t0, cps, 3) : '';
  const msgs: Msg[] = [...prior];
  if (t >= tm.tSend) msgs.push({ who: 'me', text: q, reveal: prog(t, tm.tSend, tm.tSend + 0.12, ease.outCubic) });
  if (t >= tm.tReply) msgs.push({ who: 'reply', text: reply, reveal: prog(t, tm.tReply, tm.tDone, ease.linear), blur: tm.blur ?? 7 });
  const thinking = t >= tm.tSend + 0.1 && t < tm.tReply ? 1 : 0;
  return { msgs, typing: ty, caret: t < tm.tSend, thinking, nTyped: ty.length };
}

// ---------------------------------------------------------------- D1: the door sign
shot('D1', (f) => {
  const t = f.t, tc = f.tc;
  const SHUT = 0.9; // cue sheet: bedroom door shuts at D1+0.90
  const shut = prog(t, 0.42, SHUT, ease.inQuad);
  const gap = 0.5 * (1 - shut);
  const slam = t > SHUT ? (1 - settle(t, SHUT, 5, 7)) : 0;
  const c = f.ctx;
  const push = prog(tc, 1.35, 2.5, ease.inOutSine);
  c.save();
  c.translate(W / 2, H * 0.42); c.scale(1 + push * 0.14, 1 + push * 0.14); c.translate(-W / 2, -H * 0.42);
  const d = landing(f, c, { gap, underGlow: prog(t, 1.05, 1.5, ease.outCubic), shake: slam * 6 });
  // Nell's fingers wrapped round the edge of the door, pulling it shut from inside
  if (t < SHUT + 0.02) {
    const ex = d.dx + d.leafW;
    c.fillStyle = '#e2ae8e';
    for (let i = 0; i < 4; i++) { c.beginPath(); blobEllipse(c, ex - 10, d.dy + 470 + i * 26, 16, 12, 4 + i, 0.06, 7); c.fill(); }
    c.fillStyle = 'rgba(120,70,50,0.35)';
    for (let i = 0; i < 4; i++) c.fillRect(ex - 22, d.dy + 476 + i * 26, 10, 3);
  }
  // the sign, taped on, swinging after the slam
  const sx = d.dx + d.leafW * 0.5 + slam * 6, sy = d.dy + 200;
  const swing = Math.sin((t - SHUT) * 18) * 0.05 * Math.exp(-Math.max(0, t - SHUT) * 3) * (t > SHUT ? 1 : 0);
  c.save(); c.translate(sx, sy - 120); c.rotate(-0.03 + swing); c.translate(0, 120);
  c.fillStyle = 'rgba(10,12,30,0.35)'; c.beginPath(); handRect(c, -196, -112, 400, 300, 21, 1.5); c.fill();
  c.fillStyle = '#e9e4d6'; c.beginPath(); handRect(c, -200, -120, 400, 300, 22, 1.5); c.fill();
  c.fillStyle = 'rgba(220,210,180,0.55)'; c.fillRect(-150, -132, 90, 26); c.fillRect(60, -130, 90, 26); // tape
  handText(c, 'KEEP OUT.', 0, -84, 64, { ...NELL_HAND, color: '#c4302c', align: 'center', seed: 4, weight: 1.6 });
  handText(c, 'ESPECIALLY', -12, 4, 40, { ...NELL_HAND, align: 'center', seed: 9 });
  handText(c, 'SANTA.', -12, 58, 40, { ...NELL_HAND, align: 'center', seed: 12 });
  // a little Santa hat with a big X through it
  c.save(); c.translate(150, 74); c.rotate(0.15);
  c.fillStyle = '#c4302c'; c.beginPath(); c.moveTo(-30, 20); c.quadraticCurveTo(-10, -30, 22, -26); c.lineTo(30, 20); c.closePath(); c.fill();
  c.fillStyle = '#f4efe2'; c.fillRect(-34, 16, 68, 12); c.beginPath(); c.arc(24, -26, 8, 0, TAU); c.fill();
  c.strokeStyle = '#22233a'; c.lineWidth = 5; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-40, -36); c.lineTo(40, 34); c.moveTo(40, -36); c.lineTo(-40, 34); c.stroke();
  c.restore();
  c.restore();
  c.restore();
  f.grade.vignette = 0.55; f.grade.bloom = 0.8;
});

// ---------------------------------------------------------------- D2: top-down desk, the knot
function tangleTop(f: F, c: C2D, cx: number, cy: number, R: number, seed: number, n = 260): V2[] {
  const r = new RNG(seed);
  const pts: V2[] = [];
  let p = v2(cx + r.range(-R, R) * 0.5, cy + r.range(-R, R) * 0.4), a = r.range(0, TAU);
  for (let i = 0; i < n; i++) {
    a += noise1(i * 0.13, seed) * 0.55 + r.range(-0.2, 0.2);
    const dx = p.x - cx, dy = (p.y - cy) * 1.3;
    if (Math.hypot(dx, dy) > R) a = Math.atan2(cy - p.y, cx - p.x) + r.range(-0.6, 0.6);
    p = v2(p.x + Math.cos(a) * 17, p.y + Math.sin(a) * 17);
    pts.push(p);
  }
  return pts;
}

shot('D2', (f) => {
  const c = f.ctx, t = f.t, tc = f.tc;
  const rot = lerp(-0.04, 0.03, tc / f.dur), z = lerp(1.0, 1.07, tc / f.dur);
  for (const x of [c, f.glow]) { x.save(); x.translate(W / 2, H / 2); x.rotate(rot); x.scale(z, z); x.translate(-W / 2, -H / 2); }
  // desk surface (wood grain)
  vgrad(c, -200, -200, W + 400, H + 400, [[0, '#3a2a2c'], [1, '#2c2026']]);
  c.strokeStyle = 'rgba(120,80,60,0.18)'; c.lineWidth = 3;
  for (let i = 0; i < 26; i++) { c.beginPath(); const y0 = -100 + i * 52; c.moveTo(-200, y0); for (let x = -200; x < W + 200; x += 80) c.lineTo(x, y0 + noise1(x * 0.004 + i, 5) * 18); c.stroke(); }
  // tablet (screen up), lower right, warm
  c.save(); c.translate(1650, 860); c.rotate(-0.35);
  drawTablet(f, c, -230, -165, 460, 330, { msgs: [{ who: 'me', text: Q1 }], typing: '', font: 40 }, { glowAmt: 0 }); // no blur filter on a rotated tablet (Skia layer bug)
  c.restore();
  glow(f.glow, 1600, 840, 520, '#ffc98e', 0.28);
  // jar (top view) and tester
  c.fillStyle = 'rgba(150,170,220,0.25)'; c.beginPath(); c.arc(1540, 250, 110, 0, TAU); c.fill();
  c.save(); c.beginPath(); c.arc(1540, 250, 98, 0, TAU); c.clip();
  for (let i = 0; i < 26; i++) bulb(f, 1460 + hash1(i * 2.1) * 160, 170 + hash1(i * 5.3) * 160, { size: 13, on: 0, color: BULB_SEQ[i % 5], angle: hash1(i) * 6 });
  c.restore();
  c.strokeStyle = 'rgba(200,215,255,0.35)'; c.lineWidth = 6; c.beginPath(); c.arc(1540, 250, 104, 0, TAU); c.stroke();
  c.fillStyle = '#c9a23a'; c.beginPath(); handRect(c, 1180, 120, 170, 110, 5, 1.2); c.fill();
  c.fillStyle = '#f0e8d0'; c.beginPath(); c.arc(1265, 175, 34, 0, TAU); c.fill();
  // torch (top-left) and its beam across the knot
  c.save(); c.translate(260, 210); c.rotate(0.55);
  c.fillStyle = '#2f5a8a'; c.beginPath(); handRect(c, -160, -32, 200, 64, 9, 1); c.fill();
  c.fillStyle = '#c9c4b8'; c.fillRect(36, -40, 40, 80);
  c.restore();
  beam(f.glow, v2(320, 260), 0.55, 1250, 0.32, 'rgba(255,236,190,0.65)', 0.5, 30);
  c.save(); c.globalCompositeOperation = 'lighter';
  const lg = c.createRadialGradient(820, 560, 40, 820, 560, 560);
  lg.addColorStop(0, 'rgba(255,220,170,0.2)'); lg.addColorStop(1, 'rgba(255,220,170,0)');
  c.fillStyle = lg; c.fillRect(200, 0, 1300, 1100);
  c.restore();
  // the knot
  const pts = tangleTop(f, c, 880, 500, 400, 77, 440);
  // hands: left holds the knot, right pulls a loop free
  const pull = track(t, [[0, 0], [0.5, 0.25, ease.outBack], [0.9, 0.12], [1.6, 0.75, ease.inOutCubic], [2.1, 0.55], [2.9, 1.25, ease.outCubic]]);
  const rWrist = v2(990 + pull * 210, 560 + pull * 120), rFrom = v2(1220 + pull * 150, 1180);
  const HS = 125;
  const tip = topHandTip(rFrom, rWrist, HS);
  // pulled loop: from the nearest points in the knot to the fingertip and back
  let bi = 0, bd = 1e9; pts.forEach((p, i) => { const d = Math.hypot(p.x - 1000, p.y - 600); if (d < bd) { bd = d; bi = i; } });
  const anchor = pts[Math.max(0, bi - 2)], anchor2 = pts[Math.min(pts.length - 1, bi + 2)];
  const loop = [anchor, v2(lerp(anchor.x, tip.x, 0.5) + 24, lerp(anchor.y, tip.y, 0.5) - 26), tip, v2(lerp(anchor2.x, tip.x, 0.5) - 14, lerp(anchor2.y, tip.y, 0.5) + 22), anchor2];
  // wire shadow then wire
  c.save(); c.translate(6, 8); c.strokeStyle = 'rgba(5,6,18,0.3)'; c.lineWidth = 10;
  c.beginPath(); smoothOpen(c, pts, 1); c.stroke(); c.restore();
  c.strokeStyle = '#1b3527'; c.lineWidth = 6; c.lineJoin = 'round';
  c.beginPath(); smoothOpen(c, pts, 1); c.stroke();
  c.beginPath(); smoothOpen(c, loop, 1); c.stroke();
  c.save(); c.strokeStyle = 'rgba(160,210,170,0.55)'; c.lineWidth = 2.5; c.beginPath(); smoothOpen(c, loop.map((p) => v2(p.x - 2, p.y - 2)), 1); c.stroke(); c.restore();
  c.strokeStyle = 'rgba(120,170,140,0.35)'; c.lineWidth = 2;
  c.beginPath(); smoothOpen(c, pts.map((p) => v2(p.x - 1.5, p.y - 1.5)), 1); c.stroke();
  for (let i = 3; i < pts.length; i += 5) {
    const a = Math.atan2(pts[i].y - pts[i - 1].y, pts[i].x - pts[i - 1].x) + Math.PI / 2 * (i % 2 ? 1 : -1);
    bulb(f, pts[i].x, pts[i].y, { size: 17, on: 0, color: BULB_SEQ[(i / 7 | 0) % 5], angle: a });
  }
  bulb(f, loop[1].x, loop[1].y, { size: 15, on: 0, color: BULB_SEQ[1], angle: 2.2 });
  bulb(f, loop[3].x, loop[3].y, { size: 15, on: 0, color: BULB_SEQ[3], angle: -0.7 });
  const lWrist = v2(660 - pull * 10, 600), lFrom = v2(420, 1180);
  topHand(c, lFrom, lWrist, HS, { pinch: 0.8, flip: -1 });
  topHand(c, rFrom, rWrist, HS, { pinch: 0.9 + noise1(t * 3, 2) * 0.1 });
  for (const x of [c, f.glow]) x.restore();
  motes(f, 820, 500, 380, 200, 26, '#ffe6c0', 0.35, 4);
  f.grade.vignette = 0.62; f.grade.bloom = 0.8;
});

// ---------------------------------------------------------------- D3 / D5: questions
shot('D3', (f) => {
  const b = chatBeat(f, [], Q1, R1, { t0: 0.35, tSend: 2.2, tReply: 2.45, tDone: 2.98, pre: 4 }); // taps 0.35–2.2
  tabletCU(f, b, { zoom: lerp(1.0, 1.04, f.tc / f.dur) });
  const tapping = f.t < 2.2 ? (b.nTyped % 2) : 0;
  if (f.t < 2.35) tapHand(f.ctx, 1500, 1010, tapping, 1.1);
});
shot('D5', (f) => {
  const b = chatBeat(f, [{ who: 'me', text: Q1 }, { who: 'reply', text: R1, blur: 7 }], Q2, R2, { t0: 0.25, tSend: 1.9, tReply: 2.05, tDone: 2.48, pre: 6 }); // taps 0.25–1.9
  tabletCU(f, b, { zoom: lerp(1.03, 1.07, f.tc / f.dur), drift: lerp(10, -10, f.tc / f.dur) });
  if (f.t < 2.0) tapHand(f.ctx, 1520, 1020, f.t < 1.9 ? b.nTyped % 2 : 0, 1.1);
});

// ---------------------------------------------------------------- D4: testing bulbs, plink
function handFromAbove(f: F, c: C2D, x: number, y: number, col: string, hold: boolean) {
  // forearm hanging down from the top edge, wrist at (x, y); bulb pinched below the fingers
  softShadow(c, x + 40, y + 60, 120, 80, 1.6, 0.28);
  tube(c, [v2(x + 70, -80), v2(x + 30, y - 160), v2(x, y - 20)], 104, 92, '#d8a24a');
  c.fillStyle = '#c08b34'; c.beginPath(); blobEllipse(c, x, y - 22, 54, 26, 2, 0.05, 8); c.fill();
  const sk = '#e2ae8e';
  if (hold) bulb(f, x + 4, y + 70, { size: 34, on: 0, color: col, angle: 0.05 });
  c.fillStyle = sk; c.beginPath(); blobEllipse(c, x, y + 16, 50, 44, 3, 0.05, 9); c.fill();
  // finger and thumb pinching the bulb's cap
  c.beginPath(); blobEllipse(c, x - 24, y + 52, 16, 22, 4, 0.06, 7, 0.3); c.fill();
  c.beginPath(); blobEllipse(c, x + 26, y + 50, 15, 21, 5, 0.06, 7, -0.3); c.fill();
  c.fillStyle = '#efc4aa'; c.beginPath(); c.arc(x - 26, y + 62, 6, 0, TAU); c.fill(); c.beginPath(); c.arc(x + 28, y + 60, 6, 0, TAU); c.fill();
}

shot('D4', (f) => {
  const c = f.ctx, t = f.t;
  // background: dark wall with the window glow far behind (soft)
  vgrad(c, 0, 0, W, H, [[0, '#1b2550'], [1, '#27346a']]);
  glow(f.glow, 320, 160, 520, '#6f8fe0', 0.2);
  c.save(); c.globalAlpha = 0.6;
  c.fillStyle = '#d6d2c8'; c.fillRect(120, -40, 18, 420); c.fillRect(120, 360, 520, 16);
  for (let i = 0; i < 4; i++) { c.fillStyle = '#dfe5f3'; c.beginPath(); c.arc(220 + i * 110, 120 + (i % 2) * 120, 40, 0, TAU); c.fill(); }
  c.restore();
  // desk
  vgrad(c, 0, 760, W, 320, [[0, '#5e4234'], [1, '#3a2a24']]);
  c.fillStyle = '#6a4a3a'; c.fillRect(0, 752, W, 14);
  // torch light pool on desk + tablet warmth from the right
  c.save(); c.globalCompositeOperation = 'lighter';
  const lp = c.createRadialGradient(900, 820, 20, 900, 820, 700);
  lp.addColorStop(0, 'rgba(255,215,160,0.26)'); lp.addColorStop(1, 'rgba(255,215,160,0)');
  c.fillStyle = lp; c.fillRect(0, 300, W, 800);
  c.restore();
  glow(f.glow, 1900, 600, 700, '#ffc98e', 0.18);
  // the tester
  const tx = 700, ty = 620;
  c.fillStyle = 'rgba(8,8,20,0.4)'; c.beginPath(); c.ellipse(tx + 20, 780, 230, 28, 0, 0, TAU); c.fill();
  c.fillStyle = '#c9a23a'; c.beginPath(); handRect(c, tx - 200, ty - 20, 400, 170, 5, 2); c.fill();
  c.fillStyle = '#a8841e'; c.fillRect(tx - 200, ty + 120, 400, 30);
  c.fillStyle = '#f0e8d0'; c.beginPath(); c.arc(tx - 40, ty + 70, 66, Math.PI, 0); c.fill();
  c.strokeStyle = '#2a2a2a'; c.lineWidth = 2;
  for (let k = 0; k <= 6; k++) { const a = Math.PI + (k / 6) * Math.PI; c.beginPath(); c.moveTo(tx - 40 + Math.cos(a) * 54, ty + 70 + Math.sin(a) * 54); c.lineTo(tx - 40 + Math.cos(a) * 64, ty + 70 + Math.sin(a) * 64); c.stroke(); }
  // needle: twitches but never moves (dead bulbs)
  const testing = false;
  const na = Math.PI * 1.08 + (testing ? 0.03 * Math.sin(t * 40) : 0);
  c.strokeStyle = '#b8302c'; c.lineWidth = 4; c.beginPath(); c.moveTo(tx - 40, ty + 70); c.lineTo(tx - 40 + Math.cos(na) * 58, ty + 70 + Math.sin(na) * 58); c.stroke();
  // indicator lamp (stays dark) and the socket
  c.fillStyle = '#4a2a28'; c.beginPath(); c.arc(tx + 110, ty + 40, 18, 0, TAU); c.fill();
  handText(c, 'OK', tx + 92, ty + 70, 22, { color: '#4a3a1a', seed: 2 });
  c.fillStyle = '#2a2a30'; c.beginPath(); handRect(c, tx + 140, ty - 52, 60, 34, 6, 0.6); c.fill(); c.fillStyle = '#7a7a84'; c.fillRect(tx + 158, ty - 56, 24, 6);
  bulb(f, tx + 170, ty - 92, { size: 30, on: 0, color: BULB_SEQ[2], angle: Math.PI }); // a dud, just tested
  // the DUDS jar (right), level rising with each plink (cue sheet: 0.5, 1.0, 1.5, 2.0)
  const drops = [0.5, 1.0, 1.5, 2.0];
  const FALL = 0.2;
  const nIn = drops.filter((d) => t >= d).length;
  const jx = 1380, jy = 780, jw = 330, jh = 460;
  const lastD = drops.filter((d) => t >= d).pop();
  const level = 0.4 + nIn * 0.035 + (lastD !== undefined ? 0.012 * (1 - settle(t, lastD, 4, 8)) : 0);
  c.fillStyle = 'rgba(8,8,20,0.4)'; c.beginPath(); c.ellipse(jx + 10, jy + 4, jw * 0.6, 30, 0, 0, TAU); c.fill();
  c.save(); c.beginPath(); handRect(c, jx - jw / 2, jy - jh * level, jw, jh * level, 2, 0.8); c.clip();
  for (let i = 0; i < 70; i++) {
    const bx = jx - jw / 2 + 20 + hash1(i * 3.1) * (jw - 40), by = jy - 16 - hash1(i * 5.7) * (jh - 20);
    bulb(f, bx, by, { size: 26, on: 0, color: BULB_SEQ[i % 5], angle: hash1(i) * 6 });
  }
  c.restore();
  // falling duds
  const hand = v2(jx - 10 + Math.sin(t * 5) * 12, jy - jh - 150 + Math.sin(t * 10) * 4);
  drops.forEach((d, i) => {
    const u = t - (d - FALL);
    if (u < 0 || u > FALL) return;
    const y0 = hand.y + 70, y1 = jy - jh * level;
    bulb(f, hand.x + 4 + i * 3, lerp(y0, y1, (u / FALL) * (u / FALL)), { size: 34, on: 0, color: BULB_SEQ[i], angle: u * 14 });
  });
  // glass
  c.fillStyle = 'rgba(160,185,240,0.14)'; c.beginPath(); handRect(c, jx - jw / 2, jy - jh, jw, jh, 3, 1); c.fill();
  c.fillStyle = 'rgba(230,240,255,0.22)'; c.fillRect(jx - jw / 2 + 24, jy - jh + 30, 18, jh - 70);
  c.fillStyle = 'rgba(200,215,255,0.35)'; c.fillRect(jx - jw / 2 - 6, jy - jh - 10, jw + 12, 22);
  // label
  c.fillStyle = '#ece4d0'; c.beginPath(); handRect(c, jx - 110, jy - 250, 220, 90, 8, 1.5); c.fill();
  handText(c, 'DUDS', jx, jy - 236, 58, { ...NELL_HAND, align: 'center', seed: 4 });
  // the hand hovers over the jar, letting the duds go one by one on the beat
  const next = drops.find((d) => t < d - FALL + 0.02);
  const holding = next !== undefined && t > next - FALL - 0.4;
  const pinchCol = next !== undefined ? BULB_SEQ[drops.indexOf(next)] : BULB_SEQ[0];
  handFromAbove(f, c, hand.x, hand.y, pinchCol, holding || t < 0.3);
  // plink: a glint at the jar mouth
  for (const d of drops) { const u = t - d; if (u >= 0 && u < 0.25) glow(f.glow, jx, jy - jh * 0.6, 120, '#fff4dc', 0.5 * (1 - u / 0.25)); }
  f.grade.vignette = 0.55; f.grade.bloom = 0.8;
});

// ---------------------------------------------------------------- D6: the wall of plans
shot('D6', (f) => {
  const c = f.ctx, tc = f.tc, t = f.t;
  const u = prog(tc, 0, f.dur, ease.inOutSine);
  const cx = lerp(-420, 380, u), cy = lerp(-150, -200, u), z = lerp(1.32, 1.24, u);
  const tally = t < 0.8 ? '' : t < 1.9 ? '12' : t < 2.9 ? '340' : '1,206'; // glock hits at D6+0.8/1.9/2.9
  for (const x of [c, f.glow]) { x.save(); x.translate(W / 2, H / 2); x.scale(z, z); x.translate(-cx, -cy); }
  c.fillStyle = '#26346a'; c.fillRect(-2000, -1400, 4000, 2800);
  planWall(f, c, { reveal: 0, tally });
  santaPapers(f, c);
  // night ambience over the wall
  c.save(); c.globalCompositeOperation = 'multiply'; c.fillStyle = '#6a74b8'; c.fillRect(-1300, -700, 2600, 1400); c.restore();
  // Nell's torch sweeping the plans (a moving warm pool), Home-Alone-at-midnight energy
  const sx = lerp(-560, 560, prog(tc, 0.1, f.dur - 0.2, ease.inOutSine)) + Math.sin(tc * 2.3) * 60;
  const sy = -120 + Math.sin(tc * 1.7) * 90;
  c.save(); c.globalCompositeOperation = 'lighter';
  const g = c.createRadialGradient(sx, sy, 10, sx, sy, 300);
  g.addColorStop(0, 'rgba(255,228,170,0.42)'); g.addColorStop(0.6, 'rgba(255,210,150,0.15)'); g.addColorStop(1, 'rgba(255,210,150,0)');
  c.fillStyle = g; c.beginPath(); c.ellipse(sx, sy, 300, 260, 0, 0, TAU); c.fill();
  c.restore();
  glow(f.glow, sx, sy, 260, '#ffdca0', 0.18);
  // a marker writing the new tally: a flick of light on change
  for (const tt of [0.8, 1.9, 2.9]) { const k = t - tt; if (k >= 0 && k < 0.3) glow(f.glow, -80, -470, 220, '#ffffff', 0.25 * (1 - k / 0.3)); }
  for (const x of [c, f.glow]) x.restore();
  f.grade.vignette = 0.6; f.grade.bloom = 0.7;
});

// ---------------------------------------------------------------- D7: Mum and Dad, worried
/** Mum indoors: the same bob and teal scarf as outdoors (recognisable from D7 to G1), a cream jumper. */
export const MUM_HOME: Spec = { ...C.MUM, coat: { color: '#d8c6a4', style: 'jumper' }, arm: { ...C.MUM.arm, color: '#d8c6a4' }, hemY: 128, hemW: 92, boot: { color: '#7a4a5a', h: 12, len: 18 } };
function mugInHand(x: C2D, hp: V2) {
  x.fillStyle = '#d8d0c4'; x.beginPath(); handRect(x, hp.x - 13, hp.y - 30, 28, 30, 3, 0.5); x.fill();
  x.fillStyle = '#5a3424'; x.fillRect(hp.x - 11, hp.y - 30, 24, 5);
}
function mug(x: C2D, hp: V2, slosh: boolean) {
  x.fillStyle = '#c8d2e0'; x.beginPath(); handRect(x, hp.x - 14, hp.y - 34, 30, 34, 3, 0.5); x.fill();
  x.strokeStyle = '#c8d2e0'; x.lineWidth = 5; x.beginPath(); x.arc(hp.x + 18, hp.y - 18, 8, -1.2, 1.2); x.stroke();
  x.fillStyle = '#5a3a2a'; x.fillRect(hp.x - 12, hp.y - 34, 26, 5);
  if (slosh) { x.fillStyle = '#7a4a2a'; x.beginPath(); x.arc(hp.x - 4, hp.y - 46, 4, 0, TAU); x.arc(hp.x + 8, hp.y - 52, 3, 0, TAU); x.fill(); }
}
shot('D7', (f) => {
  const t = f.t;
  const thump = 0.45; // cue sheet: THUMP at D7+0.45
  const sw = t > thump ? Math.sin((t - thump) * 7) * 0.32 * Math.exp(-(t - thump) * 1.4) : 0;
  hallway(f, f.ctx, { x: 110, y: -300, z: 1.75 }, { swing: sw, dust: t > thump ? 1 : 0, t: Math.max(0, t - thump) });
  // camera jolt on the thump
  const L: CharLight = {
    key: -2.4, shadow: '#5a4a6a', shadowAmt: 0.55, shadowOff: 12, shadowSoft: 4,
    rim: '#ffcf96', rimAmt: 0.6, rimW: 4, rimDir: -1.4, ambient: '#d8c0a4', ambientAmt: 0.4,
    spots: [{ x: 870, y: 300, r: 760, color: '#ffc98a', a: 0.28 }],
  };
  const lookUp = track(t, [[0, 0], [thump + 0.05, 0], [thump + 0.25, 1, ease.outBack], [1.3, 1], [1.5, 0.15]]);
  const toEach = track(t, [[0, 0], [1.35, 0], [1.6, 1, ease.outCubic]]);
  const worry = track(t, [[0, 0], [thump + 0.15, 0.6], [1.6, 1]]);
  const s = 1.75 * 0.9;
  const startle = t > thump && t < thump + 0.25 ? -6 : 0;
  // Mum (left, facing right toward Dad) and Dad (right, facing left)
  drawPerson(f, MUM_HOME, { x: 640, y: 1010 + startle, s, flip: 1, turn: lerp(0.25, 0.75, toEach), headTilt: -0.25 * lookUp, nod: -1.0 * lookUp, look: { x: toEach * 1.2, y: -lookUp }, browUp: lookUp * 0.7, browIn: worry * 0.9, mouth: { smile: -0.4 * worry, open: lookUp * 0.15 }, armF: { a: lerp(0.15, 0.55, toEach), b: lerp(0.3, 2.45, toEach) }, armB: { a: -0.05, b: 0.25 }, blink: blink(t, [2.45]) }, L);
  drawPerson(f, C.DAD, { x: 1150, y: 1010 + startle, s, flip: -1, turn: lerp(0.25, 0.75, toEach), headTilt: -0.25 * lookUp, nod: -1.0 * lookUp, look: { x: toEach * 1.2, y: -lookUp }, browUp: lookUp * 0.8, browIn: worry, mouth: { smile: -0.5 * worry, open: 0.1 + lookUp * 0.1 }, armF: { a: 0.35, b: 1.45 }, armB: { a: 0.05, b: 0.2 }, blink: blink(t, [1.0]), holdF: (x, hp) => mug(x, hp, startle !== 0) }, L);
  f.grade.vignette = 0.5; f.grade.bloom = 0.8; f.grade.gain = [1.02, 0.98, 0.94];
  if (t > thump && t < thump + 0.15) f.grade.exposure = 1.04;
});

// ---------------------------------------------------------------- D8: "seen from space", eyebrows up
shot('D8', (f) => {
  const t = f.t;
  if (f.tc < 1.85) {
    const ty = typed(Q3, t, 0.2, typeDur(Q3, 1, 1) / 1.6); // taps 0.2–1.8
    tabletCU(f, { msgs: [{ who: 'me', text: Q1 }, { who: 'reply', text: R1, blur: 7 }, { who: 'me', text: Q2 }, { who: 'reply', text: R2, blur: 7 }], typing: ty, caret: true }, { zoom: 1.05 });
    tapHand(f.ctx, 1520, 1020, ty.length % 2, 1.1);
  } else {
    const u = (f.tc - 1.85) / 1.15;
    const cam = { x: lerp(34, 46, u), y: -318, z: lerp(2.75, 2.88, u) };
    const up = track(t - 1.85, [[0, 0.1], [0.25, 1.0, ease.outBack], [1.15, 1.1]]);
    deskScene(f, cam, {
      browUp: up, mouth: { open: 0.1 + up * 0.35, smile: 0.25 }, blink: blink(t, [2.75]), headTilt: -0.08 * up,
      look: { x: 0.9, y: -0.6 * up }, nod: -0.3 * up, armF: { a: 1.15, b: 0.55 }, armB: { a: 0.95, b: 0.8 }, cheek: 0.6,
    }, { msgs: [] }, { jar: 0.55, tangles: 3, coils: 2 });
  }
});

// ---------------------------------------------------------------- D9: nights pass
const NIGHT_POSES: Partial<Pose>[] = [
  { armF: { a: 1.25, b: 0.25 }, look: { x: 1, y: 0.3 }, browIn: -0.6 },
  { armF: { a: 2.5, b: 0.2 }, armB: { a: 2.4, b: 0.3 }, lean: -0.05, mouth: { open: 0.5, smile: 0 }, eyesClosed: true }, // yawn-stretch
  { armF: { a: 1.6, b: -0.2 }, look: { x: 1, y: -0.5 }, browUp: 0.6, mouth: { smile: 0.6 } }, // holds a string up
  { armF: { a: 1.0, b: 0.8 }, look: { x: 1, y: 0.5 }, browIn: -0.8 },
  { lean: 0.45, nod: 0.7, eyesClosed: true, armF: { a: 1.4, b: 0.6 }, armB: { a: 1.3, b: 0.7 } }, // dozing
  { armF: { a: 1.25, b: 0.25 }, look: { x: 1, y: 0.2 }, browIn: -0.4, mouth: { smile: 0.4 } },
  { armF: { a: 2.0, b: 0.1 }, look: { x: 0.6, y: -0.8 }, browUp: 0.8, mouth: { open: 0.4, smile: 0.7 }, cheek: 1 },
  { lean: 0.5, nod: 0.8, eyesClosed: true, armF: { a: 1.35, b: 0.6 } },
  { armF: { a: 1.25, b: 0.25 }, look: { x: 1, y: 0.3 }, browIn: -1 },
];
shot('D9', (f) => {
  const t = f.t;
  const nights = NIGHT_POSES.length;
  const NT = 2.0; // caper climax stab at D9+2.0, then silence: hold the last night
  const k = Math.min(nights - 1, Math.floor((t / NT) * nights));
  const within = t >= NT ? 0.5 : (t / NT) * nights - k;
  const cam = { x: -60, y: -300, z: 2.05 };
  // moon arcs across the window each night
  const moon = v2(WIN.x + 30 + within * (WIN.w - 60), WIN.y + 60 - Math.sin(within * Math.PI) * 30);
  const flick = 0.75 + 0.25 * hash1(k * 7.7);
  const mumNight = k === nights - 1;
  const mumIn = mumNight ? prog(t, (NT * (nights - 1)) / nights, NT + 0.15, ease.outCubic) : 0;
  const pose = mumNight ? { ...NIGHT_POSES[k], look: { x: 0.9, y: -0.8 * mumIn }, browUp: 0.4 * mumIn, browIn: -0.3, mouth: { smile: 0.5 * mumIn } } : NIGHT_POSES[k];
  deskScene(f, cam, pose, { msgs: [] }, {
    jar: 0.3 + 0.6 * (k / (nights - 1)), tangles: Math.max(0, 3 - Math.floor(k / 3)), coils: Math.min(6, Math.floor(k * 0.8)), glowAmt: flick, moon, shaftAmt: 0.7, mug: mumNight && t > NT,
    afterNell: mumNight ? (tabS) => {
      const p = rToScreen(cam, v2(lerp(430, 330, mumIn), 0));
      drawPerson(f, MUM_HOME, {
        x: p.x, y: p.y, s: cam.z * 0.92, flip: -1, turn: 0.75, lean: 0.22 * mumIn, look: { x: 1, y: 0.6 }, nod: 0.3,
        browUp: 0.3, browIn: 0.2, mouth: { smile: 0.45 }, armF: { a: 0.9 * mumIn + 0.2, b: 0.6 }, armB: { a: 0.1, b: 0.3 }, blink: blink(t, [2.6]),
        holdF: t <= NT ? (x, hp) => mugInHand(x, hp) : undefined,
      } as Pose, nellDeskLight(tabS, 0.7));
    } : undefined,
  });
  // advent calendar on the wall: one more door each night
  const c = f.ctx;
  c.save(); f.glow.save(); rcamApply(c, cam); rcamApply(f.glow, cam);
  advent(c, 40, -520, 170, 130, 4 + k * 2);
  // coiled pile on the floor grows
  for (let i = 0; i < Math.floor(k * 1.2); i++) coil(f, c, -420 + (i % 4) * 46, -12 - Math.floor(i / 4) * 12, 24, i * 5 + 2);
  c.restore(); f.glow.restore();
  f.grade.exposure = 0.92 + 0.12 * flick;
});
