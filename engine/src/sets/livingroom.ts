// Grandad's front room at night. Room world units: 1 m ≈ 230, floor y = 0.
// Cold blue window light; the neighbours' coloured lights glow on the glass but don't reach him.
import { C2D, F, W, H } from '../core/stage';
import { V2, v2, lerp, clamp, hash1, noise1, TAU, RNG } from '../core/math';
import { handRect, handPoly, blobEllipse, smoothClosed, vgrad, tube, softSpot } from '../draw/brush';
import { glow, BULB_SEQ, shaft, motes } from '../draw/light';
import { handText } from '../draw/letters';
import { RCam, rcamApply, rToScreen } from './bedroom';

export const LR = {
  win: { x: 160, y: -510, w: 640, h: 340 },   // bay window to the street
  mantel: { x: -720, y: -265, w: 420 },        // mantel shelf (left edge x, top y)
  fire: { x: -670, w: 320 },
  chair: { x: 440 },                           // the empty armchair (Grandma's), in the bay
  gchair: { x: 980 },
  photo: { x: -610, y: -265 },
  clock: { x: -450, y: -265 },
};

export interface LROpts {
  outside?: 'street' | 'blaze';   // what's outside the window
  outsideOn?: number;             // neighbours lights 0..1
  blaze?: number;                 // coda: the window ablaze
  lamp?: number;                  // standard lamp on 0..1 (coda warmth)
  cardigan?: 'chair' | 'none';
  shaftAmt?: number;
}

/** Draw the room shell and furniture (everything behind characters). */
export function drawLivingRoom(f: F, cam: RCam, o: LROpts = {}) {
  const c = f.ctx, g = f.glow;
  c.fillStyle = '#0e1430'; c.fillRect(0, 0, W, H);
  c.save(); g.save(); rcamApply(c, cam); rcamApply(g, cam);
  const blaze = o.blaze ?? 0, lamp = o.lamp ?? 0;
  // ---- wallpaper: faded stripes + small sprigs ----
  const wg = c.createLinearGradient(0, -620, 0, 0);
  wg.addColorStop(0, '#1d2747'); wg.addColorStop(1, '#2a3558');
  c.fillStyle = wg; c.fillRect(-1700, -620, 3400, 640);
  for (let x = -1700; x < 1700; x += 46) {
    c.fillStyle = 'rgba(150,170,210,0.05)'; c.fillRect(x, -620, 18, 620);
  }
  c.fillStyle = 'rgba(190,170,200,0.08)';
  for (let i = 0; i < 220; i++) {
    const px = -1700 + (i % 37) * 92 + ((Math.floor(i / 37) % 2) * 46), py = -590 + Math.floor(i / 37) * 100;
    c.beginPath(); blobEllipse(c, px, py, 6, 9, i, 0.2, 6); c.fill();
  }
  // picture rail + skirting
  c.fillStyle = '#3a3048'; c.fillRect(-1700, -470, 3400, 8);
  c.fillStyle = '#2c2a40'; c.fillRect(-1700, -18, 3400, 18);
  // floor + rug
  const fg = c.createLinearGradient(0, 0, 0, 260);
  fg.addColorStop(0, '#2b2236'); fg.addColorStop(1, '#17142a');
  c.fillStyle = fg; c.fillRect(-1700, 0, 3400, 400);
  c.fillStyle = '#4a2a3a'; c.beginPath(); c.ellipse(-300, 70, 560, 70, 0, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(200,160,120,0.18)'; c.lineWidth = 6; c.beginPath(); c.ellipse(-300, 70, 510, 56, 0, 0, TAU); c.stroke();

  // ---- the bay window ----
  const wn = LR.win;
  c.fillStyle = '#cfc8ba'; c.beginPath(); handRect(c, wn.x - 22, wn.y - 22, wn.w + 44, wn.h + 50, 3, 1); c.fill();
  c.save(); c.beginPath(); c.rect(wn.x, wn.y, wn.w, wn.h); c.clip();
  const sg = c.createLinearGradient(0, wn.y, 0, wn.y + wn.h);
  sg.addColorStop(0, blaze > 0 ? '#1a1638' : '#0b1433'); sg.addColorStop(1, blaze > 0 ? '#3a2a4a' : '#24386c');
  c.fillStyle = sg; c.fillRect(wn.x, wn.y, wn.w, wn.h);
  // houses across the street, out of focus, with coloured lights
  c.fillStyle = '#121a3e'; c.fillRect(wn.x, wn.y + wn.h * 0.35, wn.w, wn.h);
  c.fillStyle = '#a8b5da'; c.fillRect(wn.x, wn.y + wn.h * 0.33, wn.w, 8);
  for (let k = 0; k < 6; k++) { c.fillStyle = '#e9a85a'; c.globalAlpha = 0.7; c.beginPath(); c.roundRect(wn.x + 30 + k * 105 + (k % 2) * 12, wn.y + wn.h * 0.5 + (k % 3) * 6, 30, 40, 6); c.fill(); c.globalAlpha = 1; glow(g, wn.x + 45 + k * 105, wn.y + wn.h * 0.56, 40, '#ffb060', 0.25 * (o.outsideOn ?? 1)); }
  const on = o.outsideOn ?? 1;
  for (let i = 0; i < 64; i++) {
    const lx = wn.x + (i / 64) * wn.w + Math.sin(i) * 6, ly = wn.y + wn.h * 0.36 + Math.sin(i * 0.5) * 10 + (i % 2) * 4;
    const col = BULB_SEQ[i % 5];
    const tw = 0.7 + 0.3 * Math.sin(f.tc * 2 + i * 1.7);
    c.fillStyle = col; c.globalAlpha = on; c.beginPath(); c.arc(lx, ly, 3.2, 0, TAU); c.fill(); c.globalAlpha = 1;
    // bokeh on the glass (out of focus, soft)
    glow(g, lx, ly, 26, col, 0.32 * on * tw);
  }
  for (let i = 0; i < 26; i++) {
    const lx = wn.x + hash1(i * 3.1) * wn.w, ly = wn.y + wn.h * (0.55 + hash1(i * 7.3) * 0.4);
    glow(g, lx, ly, 18, BULB_SEQ[(i + 2) % 5], 0.25 * on);
  }
  // falling snow outside
  for (let i = 0; i < 50; i++) {
    const sx = wn.x + ((hash1(i * 1.7) * wn.w + f.tc * 10 * (0.5 + hash1(i))) % wn.w);
    const sy = wn.y + ((hash1(i * 3.1) * wn.h + f.tc * 34 * (0.5 + hash1(i * 2))) % wn.h);
    c.fillStyle = 'rgba(215,226,255,0.65)'; c.beginPath(); c.arc(sx, sy, 1.3 + hash1(i) * 1.4, 0, TAU); c.fill();
  }
  if (blaze > 0) {
    // coda: OUR house's lights frame the window from outside
    for (let i = 0; i < 40; i++) {
      const u = i / 39;
      const pts: V2[] = [v2(wn.x + u * wn.w, wn.y + 10 + Math.sin(u * Math.PI) * 26), v2(wn.x + 8 + Math.sin(u * 9) * 3, wn.y + u * wn.h), v2(wn.x + wn.w - 8, wn.y + u * wn.h)];
      for (const [k, p] of pts.entries()) {
        const col = BULB_SEQ[(i + k) % 5];
        c.fillStyle = col; c.beginPath(); c.arc(p.x, p.y, 5, 0, TAU); c.fill();
        glow(g, p.x, p.y, 30, col, 0.55 * blaze);
      }
    }
  }
  c.restore();
  // glazing bars, sill
  c.fillStyle = '#cfc8ba';
  c.fillRect(wn.x + wn.w / 3 - 5, wn.y, 10, wn.h); c.fillRect(wn.x + (2 * wn.w) / 3 - 5, wn.y, 10, wn.h);
  c.fillRect(wn.x, wn.y + wn.h * 0.42, wn.w, 8);
  c.fillStyle = '#d8d1c2'; c.fillRect(wn.x - 34, wn.y + wn.h + 6, wn.w + 68, 18);
  // net curtain half drawn + heavy curtains
  c.fillStyle = 'rgba(220,226,240,0.10)'; c.fillRect(wn.x, wn.y + wn.h * 0.5, wn.w, wn.h * 0.5);
  c.fillStyle = '#4a3050';
  c.beginPath(); c.moveTo(wn.x - 90, wn.y - 50); c.quadraticCurveTo(wn.x - 30, wn.y + wn.h * 0.5, wn.x - 70, wn.y + wn.h + 160); c.lineTo(wn.x - 140, wn.y + wn.h + 160); c.lineTo(wn.x - 140, wn.y - 50); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(wn.x + wn.w + 90, wn.y - 50); c.quadraticCurveTo(wn.x + wn.w + 30, wn.y + wn.h * 0.5, wn.x + wn.w + 70, wn.y + wn.h + 160); c.lineTo(wn.x + wn.w + 140, wn.y + wn.h + 160); c.lineTo(wn.x + wn.w + 140, wn.y - 50); c.closePath(); c.fill();
  c.fillStyle = '#2a2030'; c.fillRect(wn.x - 150, wn.y - 58, wn.w + 300, 10);
  // window light: cold glow + a long shaft across the floor
  glow(g, wn.x + wn.w / 2, wn.y + wn.h / 2, 420, blaze > 0 ? '#ffb070' : '#5f7fd8', blaze > 0 ? 0.25 * blaze : 0.16);
  const sa = o.shaftAmt ?? 1;
  if (sa > 0) {
    const col = blaze > 0 ? 'rgba(255,190,130,0.55)' : 'rgba(120,150,230,0.45)';
    shaft(g, [v2(wn.x, wn.y + wn.h), v2(wn.x + wn.w, wn.y + wn.h), v2(wn.x + wn.w - 520, 120), v2(wn.x - 620, 120)], col, 0.38 * sa, 26);
    motes(f, wn.x - 50, wn.y + wn.h + 120, 260, 150, 40, blaze > 0 ? '#ffd8a0' : '#b8c8ff', 0.5 * sa, 3);
  }
  // coloured flecks from the neighbours' lights on the wall near the window (not on him)
  for (let i = 0; i < 8; i++) glow(g, wn.x - 120 - i * 40, wn.y + 60 + (i % 3) * 70, 40, BULB_SEQ[i % 5], 0.06 * on);

  // ---- fireplace + mantel ----
  const fx = LR.fire.x, fw = LR.fire.w;
  c.fillStyle = '#3a3448'; c.beginPath(); handRect(c, fx - 20, -250, fw + 40, 250, 21, 1); c.fill(); // surround
  c.fillStyle = '#0c0a14'; c.beginPath(); c.moveTo(fx + 50, 0); c.lineTo(fx + 50, -150); c.quadraticCurveTo(fx + fw / 2, -200, fx + fw - 50, -150); c.lineTo(fx + fw - 50, 0); c.closePath(); c.fill();
  // cold grate (unlit) — or a warm glow in the coda
  c.fillStyle = '#2a2430'; c.fillRect(fx + 80, -46, fw - 160, 40);
  if (lamp > 0) { glow(g, fx + fw / 2, -50, 160, '#ff8a40', 0.4 * lamp); c.fillStyle = '#c85a2a'; c.fillRect(fx + 100, -40, fw - 200, 20); }
  // mantel shelf
  const m = LR.mantel;
  c.fillStyle = '#5a4a5a'; c.fillRect(m.x, m.y, m.w, 16);
  c.fillStyle = '#4a3c4c'; c.fillRect(m.x + 10, m.y + 16, m.w - 20, 10);
  // a few Christmas cards (sparse), a candle stick
  c.fillStyle = '#d8d0c0'; c.save(); c.translate(m.x + 330, m.y); c.rotate(-0.08); c.fillRect(-18, -46, 36, 46); c.fillStyle = '#9a3a3a'; c.fillRect(-10, -36, 20, 18); c.restore();
  c.fillStyle = '#e0d8c8'; c.save(); c.translate(m.x + 380, m.y); c.rotate(0.06); c.fillRect(-16, -40, 32, 40); c.fillStyle = '#3a5a4a'; c.beginPath(); c.moveTo(0, -34); c.lineTo(9, -12); c.lineTo(-9, -12); c.fill(); c.restore();
  // the clock
  drawClock(c, LR.clock.x, LR.clock.y, f.t);
  // the photo (frame only here; content drawn by drawPhoto when in close-up)
  drawPhotoFrame(f, c, LR.photo.x, LR.photo.y, 0.32);

  // ---- standard lamp (off unless coda) ----
  const lx = 1000;
  c.fillStyle = '#2a2430'; c.fillRect(lx - 4, -420, 8, 420); c.fillRect(lx - 40, -8, 80, 8);
  c.fillStyle = lamp > 0 ? '#f2c890' : '#5a4a4a';
  c.beginPath(); c.moveTo(lx - 60, -430); c.lineTo(lx + 60, -430); c.lineTo(lx + 40, -510); c.lineTo(lx - 40, -510); c.closePath(); c.fill();
  if (lamp > 0) { glow(g, lx, -450, 300, '#ffc070', 0.35 * lamp); glow(g, lx, -450, 80, '#fff0d0', 0.5 * lamp); }

  // ---- side table with Grandad's mug ----
  c.fillStyle = '#3a2c34'; c.fillRect(-160, -170, 110, 14); c.fillRect(-114, -156, 18, 156);
  c.restore(); g.restore();
}

/** Grandma's armchair (drawn after characters that sit behind it, or before those in front). */
export function drawArmchair(f: F, cam: RCam, x: number, o: { cardigan?: boolean; front?: boolean } = {}) {
  const c = f.ctx;
  c.save(); rcamApply(c, cam);
  const col = '#5a6a5a', dk = '#465446';
  // back
  c.fillStyle = dk; c.beginPath(); blobEllipse(c, x, -250, 150, 150, 61, 0.03, 12); c.fill();
  c.fillRect(x - 150, -260, 300, 120);
  // seat
  c.fillStyle = col; c.beginPath(); handRect(c, x - 160, -150, 320, 70, 62, 2); c.fill();
  // arms
  c.fillStyle = col;
  c.beginPath(); blobEllipse(c, x - 165, -150, 48, 60, 63, 0.05, 10); c.fill(); c.fillRect(x - 213, -150, 96, 110);
  c.beginPath(); blobEllipse(c, x + 165, -150, 48, 60, 64, 0.05, 10); c.fill(); c.fillRect(x + 117, -150, 96, 110);
  // skirt + legs
  c.fillStyle = dk; c.fillRect(x - 200, -60, 400, 46);
  c.fillStyle = '#2a2020'; c.fillRect(x - 190, -14, 18, 14); c.fillRect(x + 172, -14, 18, 14);
  // antimacassar (lace) on the back
  c.fillStyle = 'rgba(230,224,210,0.55)'; c.beginPath(); handRect(c, x - 70, -360, 140, 70, 65, 2); c.fill();
  if (o.cardigan) drawCardigan(c, x + 150, -170);
  c.restore();
}

/** Grandma's dusty-rose cardigan draped over the chair arm: folded body + a dangling sleeve. */
export function drawCardigan(c: C2D, x: number, y: number, scale = 1) {
  c.save(); c.translate(x, y); c.scale(scale, scale);
  // dangling sleeve
  c.fillStyle = '#a9626e';
  c.beginPath(); smoothClosed(c, [v2(18, 10), v2(44, 6), v2(52, 60), v2(50, 120), v2(40, 150), v2(22, 150), v2(20, 110), v2(16, 50)]); c.fill();
  c.fillStyle = '#c97c86'; c.fillRect(20, 136, 30, 16);
  c.strokeStyle = 'rgba(110,40,55,0.45)'; c.lineWidth = 2;
  for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(22 + i * 8, 138); c.lineTo(22 + i * 8, 152); c.stroke(); }
  // folded body over the arm
  c.fillStyle = '#c97c86';
  c.beginPath(); smoothClosed(c, [v2(-70, -10), v2(-20, -30), v2(40, -28), v2(70, -8), v2(66, 36), v2(10, 46), v2(-60, 38)]); c.fill();
  // front edge band with buttons
  c.fillStyle = '#b8707c'; c.beginPath(); smoothClosed(c, [v2(-66, 10), v2(60, 4), v2(62, 18), v2(-64, 26)]); c.fill();
  c.fillStyle = '#f2e3c8'; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(-40 + i * 30, 15 - i * 1.5, 4, 0, TAU); c.fill(); }
  // knit texture
  c.strokeStyle = 'rgba(110,40,55,0.22)'; c.lineWidth = 1.6;
  for (let i = 0; i < 12; i++) { c.beginPath(); c.moveTo(-60 + i * 11, -20); c.quadraticCurveTo(-58 + i * 11, 10, -60 + i * 11, 36); c.stroke(); }
  c.restore();
}

export function drawClock(c: C2D, x: number, y: number, t: number) {
  c.save(); c.translate(x, y);
  c.fillStyle = '#6a4a2a'; c.beginPath(); c.moveTo(-34, 0); c.lineTo(-30, -70); c.quadraticCurveTo(0, -100, 30, -70); c.lineTo(34, 0); c.closePath(); c.fill();
  c.fillStyle = '#efe6cf'; c.beginPath(); c.arc(0, -52, 20, 0, TAU); c.fill();
  c.strokeStyle = '#2a2020'; c.lineWidth = 2;
  const sec = Math.floor(t); // ticks once per second
  const a1 = (sec / 60) * TAU, a2 = 1.9;
  c.beginPath(); c.moveTo(0, -52); c.lineTo(Math.sin(a1) * 16, -52 - Math.cos(a1) * 16); c.stroke();
  c.lineWidth = 3; c.beginPath(); c.moveTo(0, -52); c.lineTo(Math.sin(a2) * 11, -52 - Math.cos(a2) * 11); c.stroke();
  c.restore();
}

/** Frame on the mantel; at small scale shows a warm glimpse of the blazing house. */
export function drawPhotoFrame(f: F, c: C2D, x: number, y: number, s: number) {
  c.save(); c.translate(x, y);
  c.fillStyle = '#8a6a3a'; c.beginPath(); handRect(c, -60 * s * 2, -170 * s * 2, 120 * s * 2, 140 * s * 2, 71, 0.6); c.fill();
  c.fillStyle = '#3a2a3a'; c.fillRect(-48 * s * 2, -158 * s * 2, 96 * s * 2, 116 * s * 2);
  for (let i = 0; i < 16; i++) {
    const px = (-40 + (i % 8) * 11) * s * 2, py = (-140 + Math.floor(i / 8) * 40 + (i % 2) * 6) * s * 2;
    c.fillStyle = BULB_SEQ[i % 5]; c.beginPath(); c.arc(px, py, 2.2 * s * 2, 0, TAU); c.fill();
  }
  c.fillStyle = '#d9b080'; c.fillRect(-20 * s * 2, -100 * s * 2, 40 * s * 2, 50 * s * 2);
  // a little stand
  c.fillStyle = '#6a4a2a'; c.fillRect(-8, -6, 16, 6);
  c.restore();
}
