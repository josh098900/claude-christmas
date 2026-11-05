// The corner shop (F3): warm strip light, packed shelves, a window onto the street with
// Grandad's dark house across the road. World units = street units; counter top at y = -100.
import { F, W, H } from '../core/stage';
import { v2, hash1, TAU, RNG } from '../core/math';
import { handRect, blobEllipse, vgrad } from '../draw/brush';
import { glow, BULB_SEQ } from '../draw/light';
import { handText } from '../draw/letters';
import { DCam, dApply } from './doorstep';

export function drawShop(f: F, cam: DCam, front = false, ringT = 0.1) {
  const c = f.ctx, g = f.glow;
  if (!front) vgrad(c, 0, 0, W, H, [[0, '#3a2a2a'], [1, '#2a1f24']]);
  c.save(); g.save(); dApply(c, cam); dApply(g, cam);
  if (front) {
    // counter: wood front + top, a till, a jar of sweets
    c.fillStyle = '#7a4e34'; c.beginPath(); handRect(c, -330, -100, 520, 160, 9, 1); c.fill();
    c.fillStyle = '#5e3a26'; for (let k = 0; k < 6; k++) c.fillRect(-320 + k * 86, -86, 4, 140);
    c.fillStyle = '#a77650'; c.fillRect(-340, -108, 540, 12);
    c.fillStyle = 'rgba(255,230,190,0.25)'; c.fillRect(-340, -108, 540, 3);
    // till
    c.fillStyle = '#3a3a44'; c.beginPath(); handRect(c, 110, -150, 60, 44, 3, 0.6); c.fill();
    c.fillStyle = '#9fd0a0'; c.fillRect(118, -144, 30, 10); glow(g, 133, -139, 16, '#9fe0a0', 0.4);
    // sweet jar
    c.fillStyle = 'rgba(190,210,240,0.35)'; c.beginPath(); handRect(c, -300, -158, 40, 50, 4, 0.6); c.fill();
    for (let k = 0; k < 9; k++) { c.fillStyle = BULB_SEQ[k % 5]; c.beginPath(); c.arc(-292 + (k % 3) * 12, -118 - Math.floor(k / 3) * 12, 4.5, 0, TAU); c.fill(); }
    c.restore(); g.restore();
    return;
  }
  // back wall
  c.fillStyle = '#8a5a44'; c.fillRect(-700, -500, 1400, 520);
  // shelves packed with tins and packets
  const r = new RNG(5);
  for (let row = 0; row < 4; row++) {
    const y = -300 + row * 52;
    c.fillStyle = '#5e3a26'; c.fillRect(-420, y + 40, 560, 8);
    let x = -415;
    while (x < 130) {
      const w = r.range(14, 30), h = r.range(24, 40);
      c.fillStyle = r.pick(['#c94a3a', '#e3b24a', '#3f7a5a', '#4a6aa8', '#e8dcc0', '#b0558a', '#d88a3a']);
      c.beginPath(); handRect(c, x, y + 40 - h, w, h, (x * 7) | 0, 0.6); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(x + 2, y + 40 - h + 4, w - 4, 4);
      x += w + r.range(2, 6);
    }
  }
  // tinsel along the top shelf
  c.strokeStyle = '#e3c24a'; c.lineWidth = 5;
  c.beginPath(); for (let x = -420; x <= 140; x += 10) c.lineTo(x, -310 + Math.sin(x * 0.05) * 8); c.stroke();
  // hand-lettered sign
  c.fillStyle = '#efe6d0'; c.beginPath(); handRect(c, -260, -400, 260, 60, 8, 1); c.fill();
  handText(c, 'OPEN TILL LATE', -130, -386, 26, { color: '#b8302c', align: 'center', seed: 8, weight: 1.2 });
  // window onto the street (right)
  const wx = 175, wy = -330, ww = 230, wh = 300;
  c.fillStyle = '#d6cfc0'; c.fillRect(wx - 12, wy - 12, ww + 24, wh + 24);
  c.save(); c.beginPath(); c.rect(wx, wy, ww, wh); c.clip();
  vgrad(c, wx, wy, ww, wh, [[0, '#2a3f78'], [0.7, '#4f68a8'], [1, '#7a8cc0']]);
  // the terrace across the road: lit houses, one dark one in the middle
  const base = wy + wh * 0.82;
  for (let k = -2; k <= 2; k++) {
    const hx = wx + ww / 2 + k * 74 - 36;
    c.fillStyle = k === 0 ? '#3a2f48' : '#5a3a40';
    c.fillRect(hx, base - 120, 72, 120);
    c.fillStyle = '#a9b8de'; c.fillRect(hx - 2, base - 132, 76, 14);
    for (const [fx, fy] of [[0.15, 0.2], [0.6, 0.2], [0.15, 0.6]]) {
      c.fillStyle = k === 0 ? '#141c36' : '#f2b064';
      c.fillRect(hx + fx * 72, base - 120 + fy * 120, 18, 26);
      if (k !== 0) glow(g, hx + fx * 72 + 9, base - 120 + fy * 120 + 13, 20, '#ffb060', 0.25);
    }
    c.fillStyle = k === 0 ? '#1d2a3a' : '#2c4778'; c.fillRect(hx + 46, base - 50, 16, 50);
    if (k !== 0) for (let b = 0; b < 8; b++) {
      const bx = hx + 4 + b * 9, by = base - 116 + Math.sin(b * 0.9) * 3;
      const col = BULB_SEQ[(b + k * 2 + 10) % 5]; c.fillStyle = col; c.beginPath(); c.arc(bx, by, 2, 0, TAU); c.fill(); glow(g, bx, by, 9, col, 0.6);
    }
  }
  c.fillStyle = '#9fb0d8'; c.fillRect(wx, base, ww, wh);
  // falling snow outside
  for (let i = 0; i < 30; i++) {
    const sx = wx + ((hash1(i * 1.7) * ww + f.tc * 10) % ww), sy = wy + ((hash1(i * 3.1) * wh + f.tc * 40 * (0.6 + hash1(i))) % wh);
    c.fillStyle = 'rgba(230,236,255,0.8)'; c.beginPath(); c.arc(sx, sy, 1.6, 0, TAU); c.fill();
  }
  c.restore();
  c.fillStyle = '#d6cfc0'; c.fillRect(wx + ww / 2 - 4, wy, 8, wh);
  glow(g, wx + ww / 2, wy + wh / 2, 260, '#7f9cf0', 0.12);
  // shop bell on a spring over the door (right of the window)
  const bx = 430, by = -330;
  const rt = f.t - ringT;
  const swing = rt > 0 ? Math.sin(rt * 26) * Math.exp(-rt * 3.2) * 0.6 : 0;
  c.strokeStyle = '#3a3a3a'; c.lineWidth = 2; c.beginPath(); c.moveTo(bx, by - 40); c.quadraticCurveTo(bx - 10, by - 20, bx, by - 12); c.stroke();
  c.save(); c.translate(bx, by - 14); c.rotate(swing); c.translate(-bx, -(by - 14));
  c.fillStyle = '#c9a23a'; c.beginPath(); c.moveTo(bx - 12, by + 8); c.quadraticCurveTo(bx - 11, by - 14, bx, by - 14); c.quadraticCurveTo(bx + 11, by - 14, bx + 12, by + 8); c.closePath(); c.fill();
  c.restore();
  glow(g, bx - 4, by - 4, 14, '#ffe0a0', 0.3);
  // strip light
  c.fillStyle = '#fff6e0'; c.beginPath(); c.roundRect(-260, -470, 360, 12, 6); c.fill();
  glow(g, -80, -464, 260, '#fff0d0', 0.4);
  glow(g, -80, -300, 520, '#ffd9a0', 0.12);
  c.restore(); g.restore();
}
