// Grandad's garden shed (interior) and back garden (exterior) at night.
// Garden world units match the street: door ≈ 210 ≈ 2 m; characters use STREET_S.
import { C2D, F, W, H } from '../core/stage';
import { V2, v2, lerp, clamp, hash1, noise1, TAU, RNG } from '../core/math';
import { handRect, handPoly, blobEllipse, vgrad, smoothOpen } from '../draw/brush';
import { glow, beam, motes, shaft } from '../draw/light';
import { snowCap } from './street';
import { labelledBox } from './props';

/** Shed interior, screen space. open = door 0..1. Returns the doorway rect. */
export function shedInterior(f: F, c: C2D, o: { open: number; t: number }) {
  // plank walls
  vgrad(c, 0, 0, W, H, [[0, '#121628'], [1, '#191d33']]);
  for (let i = 0; i < 26; i++) {
    const x = i * 78 + noise1(i, 3) * 6;
    c.fillStyle = i % 2 ? 'rgba(40,44,72,0.55)' : 'rgba(30,34,58,0.55)';
    c.fillRect(x, 0, 74, H);
    c.fillStyle = 'rgba(6,8,18,0.7)'; c.fillRect(x + 74, 0, 4, H);
    // knots
    if (hash1(i * 3.3) > 0.5) { c.fillStyle = 'rgba(10,12,24,0.6)'; c.beginPath(); c.ellipse(x + 30, 200 + hash1(i) * 600, 6, 9, 0, 0, TAU); c.fill(); }
  }
  // floor
  vgrad(c, 0, 960, W, 120, [[0, '#1c1a26'], [1, '#121018']]);
  // doorway in the back wall (left of centre)
  const dx = 380, dy = 150, dw = 400, dh = 820;
  const open = clamp(o.open);
  // outside: the snowy garden, moonlit, Grandad's house far off with one warm window
  c.save(); c.beginPath(); c.rect(dx, dy, dw, dh); c.clip();
  vgrad(c, dx, dy, dw, dh, [[0, '#1a2a5e'], [0.55, '#3a4f8a'], [0.62, '#8496c8'], [1, '#6d7fb4']]);
  c.fillStyle = '#2a2830'; c.fillRect(dx + 40, dy + 230, 300, 230); // house back
  c.fillStyle = '#ffcf8a'; c.fillRect(dx + 150, dy + 300, 70, 80);
  glow(f.glow, dx + 185, dy + 340, 120, '#ffb565', 0.35 * open);
  c.fillStyle = '#a3b2da'; c.fillRect(dx + 30, dy + 222, 320, 14);
  for (let i = 0; i < 30; i++) {
    const sx = dx + ((hash1(i * 1.7) * dw + o.t * 10) % dw), sy = dy + ((hash1(i * 3.1) * dh + o.t * 60 * (0.5 + hash1(i))) % dh);
    c.fillStyle = 'rgba(225,233,252,0.8)'; c.beginPath(); c.arc(sx, sy, 1.5 + hash1(i) * 2.5, 0, TAU); c.fill();
  }
  c.restore();
  // cold moonlight spilling in across the floor
  if (open > 0) {
    shaft(f.glow, [v2(dx, dy + dh), v2(dx + dw, dy + dh), v2(dx + dw + 420, H + 60), v2(dx - 180, H + 60)], 'rgba(120,150,235,0.9)', 0.28 * open, 18);
    glow(f.glow, dx + dw / 2, dy + dh * 0.6, 420, '#7c98e8', 0.12 * open);
  }
  // door leaf swings outward from a left hinge: foreshortened inner face
  const lw = dw * Math.cos(open * Math.PI * 0.46);
  c.fillStyle = '#262a42';
  c.beginPath(); c.moveTo(dx, dy); c.lineTo(dx + lw, dy + 18 * open); c.lineTo(dx + lw, dy + dh - 18 * open); c.lineTo(dx, dy + dh); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(8,10,20,0.8)'; c.lineWidth = 4;
  for (let k = 1; k < 5; k++) { const xx = dx + (lw * k) / 5; c.beginPath(); c.moveTo(xx, dy + 4 * open * k); c.lineTo(xx, dy + dh - 4 * open * k); c.stroke(); }
  c.fillStyle = '#2e3250'; c.beginPath(); c.moveTo(dx, dy + 90); c.lineTo(dx + lw, dy + 100); c.lineTo(dx + lw, dy + dh - 100); c.lineTo(dx, dy + dh - 90); c.closePath();
  c.globalAlpha = 0.25; c.fill(); c.globalAlpha = 1;
  // door frame
  c.fillStyle = '#0c0e1c'; c.fillRect(dx - 26, dy - 26, 26, dh + 26); c.fillRect(dx + dw, dy - 26, 26, dh + 26); c.fillRect(dx - 26, dy - 26, dw + 52, 26);
  // clutter: shelf with tins and pots, a rake and a spade, a cobweb
  c.fillStyle = '#2a2420'; c.fillRect(1240, 300, 560, 16);
  const tins: [number, number, string][] = [[1270, 70, '#3a5a6a'], [1340, 90, '#6a4a3a'], [1420, 60, '#4a4a5a'], [1600, 80, '#5a3a3a'], [1680, 50, '#3a4a3a']];
  for (const [x, h2, col] of tins) { c.fillStyle = col; c.beginPath(); handRect(c, x, 300 - h2, 60, h2, x, 1); c.fill(); c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(x, 300 - h2, 60, 8); }
  for (let k = 0; k < 3; k++) { c.fillStyle = '#7a4a34'; c.beginPath(); c.moveTo(1490 + k * 34, 300); c.lineTo(1484 + k * 34, 262); c.lineTo(1516 + k * 34, 262); c.lineTo(1510 + k * 34, 300); c.fill(); }
  c.strokeStyle = '#3a2a20'; c.lineWidth = 10; c.lineCap = 'round';
  c.beginPath(); c.moveTo(150, 980); c.lineTo(250, 200); c.stroke();
  c.beginPath(); c.moveTo(110, 990); c.lineTo(170, 380); c.stroke();
  c.fillStyle = '#4a4a56'; c.beginPath(); c.moveTo(210, 190); c.lineTo(300, 200); c.lineTo(296, 215); c.lineTo(206, 205); c.fill();
  for (let k = 0; k < 8; k++) { c.fillRect(214 + k * 11, 200, 3, 26); }
  c.fillStyle = '#5a5a66'; c.beginPath(); c.moveTo(150, 360); c.lineTo(190, 365); c.lineTo(178, 440); c.lineTo(150, 436); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(200,210,240,0.25)'; c.lineWidth = 1.2;
  for (let k = 0; k < 6; k++) { c.beginPath(); c.moveTo(W, 0); c.quadraticCurveTo(W - 60 - k * 18, 70, W - 130 - k * 26, 0); c.stroke(); }
  c.beginPath(); c.moveTo(W, 20); c.lineTo(W - 150, 90); c.stroke();
  return { dx, dy, dw, dh };
}

/** The stack of Grandma's labelled boxes, screen space. lit = torch amount. topShift = top box slide. */
export function boxStack(f: F, c: C2D, x: number, y: number, s: number, o: { dust?: number; topShift?: number; lit?: number } = {}) {
  const T = (h: string) => h;
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = 'rgba(4,5,12,0.5)'; c.beginPath(); c.ellipse(170, 4, 260, 26, 0, 0, TAU); c.fill();
  labelledBox(f, c, -40, -230, 420, 230, ['LIGHTS — FRONT'], { seed: 11, dust: o.dust ?? 0, size: 34, tint: T, col: '#a88052' });
  labelledBox(f, c, 0 - (o.topShift ?? 0), -440, 380, 210, ['LIGHTS — ROOF', '(careful!)'], { seed: 23, dust: o.dust ?? 0, size: 32, tint: T, col: '#b48a5c', underline: 120 });
  labelledBox(f, c, 300, -560, 160, 120, ['SPARES'], { seed: 37, dust: o.dust ?? 0, size: 24, tint: T, col: '#9a7650' });
  c.restore();
}

/** Back garden at night, world space (call inside a camera transform). */
export function backGarden(f: F, c: C2D, o: { t: number; windowLit: number }) {
  // sky band above the house roofline
  vgrad(c, -1200, -900, 2400, 600, [[0, '#0a1230'], [1, '#22356a']]);
  // the back of Grandad's house
  c.fillStyle = '#4a3540'; c.fillRect(-700, -560, 1400, 520);
  const r = new RNG(5);
  c.fillStyle = 'rgba(30,20,34,0.5)';
  for (let k = 0; k < 40; k++) c.fillRect(r.range(-700, 680), r.range(-540, -60), 19, 7.5);
  // gutter + snowy roof edge
  c.fillStyle = '#1b2033'; c.fillRect(-720, -572, 1440, 14);
  c.fillStyle = '#a3b2da'; c.fillRect(-720, -600, 1440, 30);
  // back door (dark), drainpipe
  c.fillStyle = '#2a2028'; c.beginPath(); handRect(c, -470, -260, 90, 220, 7, 1); c.fill();
  c.fillStyle = '#1e2436'; c.fillRect(340, -560, 9, 520);
  // the lit window: Grandad in his chair, his back to us
  const wx = -70, wy = -360, ww = 170, wh = 150;
  c.fillStyle = '#d9d0bd'; c.fillRect(wx - 10, wy - 10, ww + 20, wh + 20);
  const lit = o.windowLit;
  const g = c.createLinearGradient(wx, wy, wx, wy + wh);
  g.addColorStop(0, '#ffd89a'); g.addColorStop(1, '#d88a48');
  c.fillStyle = g; c.fillRect(wx, wy, ww, wh);
  // lamp inside
  glow(f.glow, wx + ww * 0.78, wy + wh * 0.35, 40, '#fff0c8', 0.6 * lit);
  // armchair back + Grandad's bald head and shoulders, silhouetted
  c.fillStyle = '#5a2f2c'; c.beginPath(); handRect(c, wx + 30, wy + 70, 110, 90, 3, 2); c.fill();
  c.fillStyle = '#3a2a2a'; c.beginPath(); blobEllipse(c, wx + 85, wy + 78, 44, 22, 4, 0.05, 9); c.fill(); // shoulders
  c.fillStyle = '#6a4a40'; c.beginPath(); blobEllipse(c, wx + 85, wy + 52, 21, 24, 5, 0.04, 9); c.fill(); // head
  c.fillStyle = '#d8d0c4'; c.beginPath(); blobEllipse(c, wx + 66, wy + 56, 6, 9, 6, 0.1, 7); c.fill(); c.beginPath(); blobEllipse(c, wx + 104, wy + 56, 6, 9, 7, 0.1, 7); c.fill();
  // glazing bars + sill
  c.fillStyle = '#d9d0bd'; c.fillRect(wx + ww / 2 - 3, wy, 6, wh); c.fillRect(wx, wy + wh * 0.42, ww, 5);
  c.fillRect(wx - 18, wy + wh + 8, ww + 36, 10);
  snowCap(c, wx - 20, wy + wh + 8, ww + 40, 9, 3);
  glow(f.glow, wx + ww / 2, wy + wh / 2, 260, '#ffb060', 0.22 * lit);
  // ground: snow, from the wall base forward
  vgrad(c, -1200, -40, 2400, 600, [[0, '#56669c'], [0.3, '#6b7cb0'], [1, '#7d8ec0']]);
  c.fillStyle = 'rgba(40,50,90,0.35)'; c.fillRect(-1200, -40, 2400, 10);
  // warm trapezoid of window light on the snow
  c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.28 * lit;
  const lg = c.createLinearGradient(0, -40, 0, 140);
  lg.addColorStop(0, 'rgba(255,190,110,1)'); lg.addColorStop(1, 'rgba(255,190,110,0)');
  c.fillStyle = lg; c.beginPath(); c.moveTo(wx - 10, -40); c.lineTo(wx + ww + 10, -40); c.lineTo(wx + ww + 110, 140); c.lineTo(wx - 110, 140); c.closePath(); c.fill();
  c.restore();
  // the shed (left) with its door open
  c.fillStyle = '#2a2a3c'; c.beginPath(); handPoly(c, [v2(-700, 30), v2(-700, -230), v2(-600, -280), v2(-450, -230), v2(-450, 30)], 9, 1.5); c.fill();
  c.fillStyle = '#a3b2da'; c.beginPath(); c.moveTo(-712, -226); c.lineTo(-600, -290); c.lineTo(-440, -228); c.lineTo(-450, -214); c.lineTo(-600, -272); c.lineTo(-704, -212); c.closePath(); c.fill();
  c.fillStyle = '#0a0b14'; c.fillRect(-560, -150, 80, 180);
  // fence + gate (right)
  c.fillStyle = '#3a3036';
  for (let x = 200; x < 1200; x += 34) { if (x > 250 && x < 380) continue; c.beginPath(); handRect(c, x, -120, 26, 150, x, 1); c.fill(); }
  c.fillRect(200, -90, 1000, 10); c.fillRect(200, -10, 1000, 10);
  for (let x = 200; x < 1200; x += 34) { if (x > 250 && x < 380) continue; snowCap(c, x - 2, -120, 30, 7, x); }
  // gate (open, swung toward us)
  c.fillStyle = '#4a3a34';
  c.beginPath(); c.moveTo(384, -110); c.lineTo(440, -90); c.lineTo(440, 50); c.lineTo(384, 30); c.closePath(); c.fill();
  c.fillStyle = '#2a2026'; c.fillRect(372, -130, 14, 166); c.fillRect(246, -130, 14, 166);
  // a bird table and a buried bench for shape
  c.fillStyle = '#3a2e30'; c.fillRect(-300, -180, 8, 180); c.fillRect(-340, -190, 90, 10);
  snowCap(c, -342, -190, 94, 10, 8);
}
