// Nell's bedroom at night: blue room, paper snowflakes, the desk, the wall of plans.
// Room world units: 1 m ≈ 230. Floor y = 0. Desk top y = -172.
import { C2D, F, W, H } from '../core/stage';
import { V2, v2, lerp, clamp, hash1, hash2, noise1, TAU, RNG } from '../core/math';
import { handRect, handPoly, blobEllipse, smoothOpen, pencilLine, softSpot, vgrad, tube, jit } from '../draw/brush';
import { glow, bulb, BULB_SEQ, beam, motes } from '../draw/light';
import { handText, handLines } from '../draw/letters';

export interface RCam { x: number; y: number; z: number; }
export function rcamApply(c: C2D, cam: RCam) { c.translate(W / 2, H / 2); c.scale(cam.z, cam.z); c.translate(-cam.x, -cam.y); }
export function rToScreen(cam: RCam, p: V2): V2 { return v2((p.x - cam.x) * cam.z + W / 2, (p.y - cam.y) * cam.z + H / 2); }

export const DESK_Y = -172;
export const WIN = { x: -330, y: -470, w: 280, h: 220 };

/** A paper snowflake (6-fold) centred at (x,y). */
export function paperSnowflake(c: C2D, x: number, y: number, r: number, seed: number, col = '#e9edf7') {
  c.save(); c.translate(x, y); c.rotate(hash1(seed) * 0.5);
  c.fillStyle = col;
  c.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    const ca = Math.cos(a), sa = Math.sin(a);
    const pt = (u: number, w: number) => [ca * u * r - sa * w * r, sa * u * r + ca * w * r];
    const k = hash1(seed + 3);
    const P = [pt(0, 0.08), pt(0.5, 0.06 + k * 0.05), pt(0.62, 0.22), pt(0.7, 0.05), pt(1.0, 0.0), pt(0.7, -0.05), pt(0.62, -0.22), pt(0.5, -0.06 - k * 0.05), pt(0, -0.08)];
    if (i === 0) c.moveTo(P[0][0], P[0][1]);
    for (const q of P) c.lineTo(q[0], q[1]);
  }
  c.closePath(); c.fill();
  // cut-out holes
  c.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + TAU / 12;
    c.beginPath(); c.arc(Math.cos(a) * r * 0.32, Math.sin(a) * r * 0.32, r * 0.07, 0, TAU); c.fill();
  }
  c.beginPath(); c.arc(0, 0, r * 0.1, 0, TAU); c.fill();
  c.restore();
}

/** The room shell: back wall, window with night outside, snowflakes, bed edge, shelf. */
export function drawRoom(f: F, cam: RCam, o: { night?: number; moon?: V2; dayFrac?: number; snowflakes?: number; timeLapse?: number } = {}) {
  const c = f.ctx;
  c.fillStyle = '#121a36'; c.fillRect(0, 0, W, H);
  c.save(); f.glow.save();
  rcamApply(c, cam); rcamApply(f.glow, cam);
  // back wall: dusky blue with a faint star wallpaper
  const wg = c.createLinearGradient(0, -600, 0, 0);
  wg.addColorStop(0, '#1b2550'); wg.addColorStop(1, '#27346a');
  c.fillStyle = wg; c.fillRect(-1600, -620, 3200, 640);
  c.fillStyle = 'rgba(160,180,240,0.07)';
  for (let i = 0; i < 160; i++) {
    const px = -1600 + hash1(i * 3.3) * 3200, py = -600 + hash1(i * 7.1) * 580;
    c.save(); c.translate(px, py); c.rotate(hash1(i) * 3);
    c.beginPath(); for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU * 2; c.lineTo(Math.cos(a) * 6, Math.sin(a) * 6); } c.closePath(); c.fill();
    c.restore();
  }
  // skirting + floor
  c.fillStyle = '#20284f'; c.fillRect(-1600, -14, 3200, 14);
  const fg = c.createLinearGradient(0, 0, 0, 200);
  fg.addColorStop(0, '#2a2d4a'); fg.addColorStop(1, '#1a1c33');
  c.fillStyle = fg; c.fillRect(-1600, 0, 3200, 300);
  // window
  const wx = WIN.x, wy = WIN.y, ww = WIN.w, wh = WIN.h;
  c.fillStyle = '#d6d2c8'; c.beginPath(); handRect(c, wx - 14, wy - 14, ww + 28, wh + 34, 5, 0.8); c.fill();
  // night outside
  c.save(); c.beginPath(); c.rect(wx, wy, ww, wh); c.clip();
  const sg = c.createLinearGradient(0, wy, 0, wy + wh);
  sg.addColorStop(0, '#0a1230'); sg.addColorStop(1, '#22356a');
  c.fillStyle = sg; c.fillRect(wx, wy, ww, wh);
  // moon
  const moon = o.moon || v2(wx + ww * 0.75, wy + 50);
  c.fillStyle = '#f2ead2'; c.beginPath(); c.arc(moon.x, moon.y, 16, 0, TAU); c.fill();
  glow(f.glow, moon.x, moon.y, 70, '#cfe0ff', 0.35);
  // rooftops outside with distant coloured lights
  c.fillStyle = '#16204a';
  c.beginPath(); c.moveTo(wx, wy + wh);
  for (let x = wx; x <= wx + ww + 30; x += 30) c.lineTo(x, wy + wh * 0.62 - (hash1(Math.floor(x / 60)) * 30));
  c.lineTo(wx + ww + 30, wy + wh); c.closePath(); c.fill();
  c.fillStyle = '#a9b6dc';
  c.beginPath(); c.moveTo(wx, wy + wh * 0.62); for (let x = wx; x <= wx + ww + 30; x += 30) c.lineTo(x, wy + wh * 0.62 - (hash1(Math.floor(x / 60)) * 30) - 4); c.lineTo(wx + ww + 30, wy + wh * 0.62 + 4); c.closePath();
  for (let i = 0; i < 22; i++) {
    const lx = wx + hash1(i * 4.1) * ww, ly = wy + wh * (0.66 + hash1(i * 2.3) * 0.3);
    const col = BULB_SEQ[i % 5];
    c.fillStyle = col; c.beginPath(); c.arc(lx, ly, 1.6, 0, TAU); c.fill();
    glow(f.glow, lx, ly, 7, col, 0.5);
  }
  // falling snow outside
  for (let i = 0; i < 40; i++) {
    const sx = wx + ((hash1(i * 1.7) * ww + f.tc * 8 * (0.5 + hash1(i))) % ww);
    const sy = wy + ((hash1(i * 3.1) * wh + f.tc * 30 * (0.5 + hash1(i * 2))) % wh);
    c.fillStyle = 'rgba(220,230,255,0.7)'; c.beginPath(); c.arc(sx, sy, 1.2 + hash1(i) * 1.2, 0, TAU); c.fill();
  }
  c.restore();
  // glazing bars + sill
  c.fillStyle = '#d6d2c8';
  c.fillRect(wx + ww / 2 - 4, wy, 8, wh); c.fillRect(wx, wy + wh * 0.45, ww, 7);
  c.fillRect(wx - 24, wy + wh + 2, ww + 48, 14);
  // paper snowflakes stuck on the glass (Elf-ish excess)
  const nf = o.snowflakes ?? 9;
  for (let i = 0; i < nf; i++) {
    const px = wx + 20 + hash1(i * 5.7 + 2) * (ww - 40), py = wy + 18 + hash1(i * 8.3 + 1) * (wh - 40);
    paperSnowflake(c, px, py, 14 + hash1(i * 1.9) * 16, i * 11, '#dfe5f3');
  }
  // cold window light on the wall + shaft
  glow(f.glow, wx + ww / 2, wy + wh / 2, 260, '#6f8fe0', 0.16);
  // curtains
  c.fillStyle = '#5a3a6a';
  c.beginPath(); c.moveTo(wx - 60, wy - 30); c.quadraticCurveTo(wx - 20, wy + wh * 0.6, wx - 50, wy + wh + 60); c.lineTo(wx - 90, wy + wh + 60); c.lineTo(wx - 90, wy - 30); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(wx + ww + 60, wy - 30); c.quadraticCurveTo(wx + ww + 20, wy + wh * 0.6, wx + ww + 50, wy + wh + 60); c.lineTo(wx + ww + 90, wy + wh + 60); c.lineTo(wx + ww + 90, wy - 30); c.closePath(); c.fill();
  c.fillStyle = '#3b2b2b'; c.fillRect(wx - 100, wy - 38, ww + 200, 8);
  // bed on the left: patchwork duvet
  c.fillStyle = '#3c4a7a'; c.beginPath(); handRect(c, -1120, -150, 600, 160, 8, 2); c.fill();
  for (let i = 0; i < 12; i++) {
    c.fillStyle = ['#5a4a7a', '#7a5a5a', '#4a6a6a', '#6a6a8a'][i % 4];
    c.globalAlpha = 0.6; c.fillRect(-1110 + (i % 6) * 98, -140 + Math.floor(i / 6) * 70, 92, 64); c.globalAlpha = 1;
  }
  c.fillStyle = '#e6e2d8'; c.beginPath(); blobEllipse(c, -600, -170, 90, 40, 9, 0.06, 10); c.fill();
  // shelf above the bed with a few things
  c.fillStyle = '#4a3a3a'; c.fillRect(-1000, -420, 380, 12);
  c.fillStyle = '#7a5a4a'; c.fillRect(-960, -480, 22, 60); c.fillStyle = '#4a6a8a'; c.fillRect(-934, -470, 18, 50); c.fillStyle = '#8a4a4a'; c.fillRect(-912, -486, 24, 66);
  c.fillStyle = '#c9a64a'; c.beginPath(); c.arc(-760, -440, 22, 0, TAU); c.fill(); // a globe-ish ball
  c.restore(); f.glow.restore();
}

/** Tangled string of lights: a messy closed scribble with bulbs. */
export function tangle(f: F, c: C2D, cx: number, cy: number, r: number, seed: number, loose = 0, bulbSize = 5) {
  const rng = new RNG(seed);
  const pts: V2[] = [];
  const n = 26;
  for (let i = 0; i < n; i++) {
    const a = i * 2.3 + rng.range(-0.5, 0.5);
    const rr = r * (0.3 + rng.next() * 0.7) * (1 + loose * (i / n) * 2);
    pts.push(v2(cx + Math.cos(a) * rr * (1 + loose * 1.5), cy + Math.sin(a) * rr * 0.55));
  }
  c.strokeStyle = '#1e3a2a'; c.lineWidth = 2.2; c.lineJoin = 'round';
  c.beginPath(); smoothOpen(c, pts, 1); c.stroke();
  for (let i = 1; i < n - 1; i += 1) {
    const p = pts[i];
    bulb(f, p.x, p.y, { size: bulbSize, on: 0, color: BULB_SEQ[i % 5], angle: rng.range(-1.5, 1.5) });
  }
}

/** The desk front at eye level with clutter. Drawn in room world space (call inside rcamApply). */
export function drawDesk(f: F, c: C2D, o: { jar?: number; tangles?: number; torch?: boolean; tidy?: number } = {}) {
  // desk top (slight top view)
  c.fillStyle = '#6a4a3a'; c.beginPath(); handPoly(c, [v2(-420, DESK_Y - 46), v2(300, DESK_Y - 46), v2(320, DESK_Y), v2(-440, DESK_Y)], 3, 1); c.fill();
  c.fillStyle = '#4a3428'; c.fillRect(-440, DESK_Y, 760, 22);
  c.fillStyle = '#3a2a24'; c.fillRect(-430, DESK_Y + 22, 40, 150); c.fillRect(270, DESK_Y + 22, 40, 150);
  // drawer
  c.fillStyle = '#54392d'; c.fillRect(-100, DESK_Y + 22, 220, 50);
  c.fillStyle = '#c9a64a'; c.fillRect(0, DESK_Y + 44, 22, 6);
  // jar of dead bulbs
  const jx = 200, jy = DESK_Y - 20;
  const fill = clamp(o.jar ?? 0.3);
  c.save();
  c.fillStyle = 'rgba(170,190,230,0.22)'; c.beginPath(); handRect(c, jx - 26, jy - 70, 52, 70, 4, 0.6); c.fill();
  c.beginPath(); c.rect(jx - 26, jy - 70 * fill, 52, 70 * fill); c.clip();
  for (let i = 0; i < 40; i++) {
    const bx = jx - 20 + hash1(i * 3.1) * 40, by = jy - 6 - hash1(i * 5.7) * 64;
    bulb(f, bx, by, { size: 4.5, on: 0, color: BULB_SEQ[i % 5], angle: hash1(i) * 6 });
  }
  c.restore();
  c.fillStyle = '#b8b2a8'; c.fillRect(jx - 28, jy - 78, 56, 10); // lid
  // label on jar
  c.fillStyle = '#ece4d0'; c.fillRect(jx - 20, jy - 46, 40, 18);
  handText(c, 'DUDS', jx - 15, jy - 43, 11, { color: '#3a2a2a', seed: 4, weight: 1.1 });
  // tangles
  const nt = o.tangles ?? 2;
  for (let i = 0; i < nt; i++) tangle(f, c, -260 + i * 150, DESK_Y - 22 - (i % 2) * 6, 70, 30 + i, 0.2);
  // bulb tester: little box with a needle dial
  c.fillStyle = '#c9a23a'; c.beginPath(); handRect(c, 40, DESK_Y - 46, 56, 34, 6, 0.6); c.fill();
  c.fillStyle = '#f0e8d0'; c.beginPath(); c.arc(68, DESK_Y - 32, 11, Math.PI, 0); c.fill();
  c.strokeStyle = '#2a2a2a'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(68, DESK_Y - 32); c.lineTo(74, DESK_Y - 40); c.stroke();
  // torch lying on desk, pointing left
  if (o.torch !== false) {
    c.fillStyle = '#2f5a8a'; c.beginPath(); handRect(c, -380, DESK_Y - 36, 70, 22, 7, 0.6); c.fill();
    c.fillStyle = '#c9c4b8'; c.fillRect(-392, DESK_Y - 40, 14, 30);
    glow(f.glow, -392, DESK_Y - 25, 30, '#fff0c8', 0.7);
    beam(f.glow, v2(-392, DESK_Y - 25), Math.PI + 0.12, 360, 0.25, 'rgba(255,236,190,0.6)', 0.3, 8);
  }
}

/** The wall of plans (D6/E3). Drawn in its own world space: centre at (0,0), ~1400 x 700. */
export function planWall(f: F, c: C2D, o: { reveal?: number; tally?: string; seed?: number } = {}) {
  // wall
  c.fillStyle = '#26346a'; c.fillRect(-1200, -600, 2400, 1200);
  const papers: { x: number; y: number; w: number; h: number; r: number; kind: string }[] = [
    { x: -560, y: -230, w: 230, h: 170, r: -0.05, kind: 'roof' },
    { x: -260, y: -280, w: 190, h: 150, r: 0.04, kind: 'bulb' },
    { x: 260, y: -270, w: 220, h: 160, r: -0.03, kind: 'ladder' },
    { x: 560, y: -200, w: 200, h: 170, r: 0.05, kind: 'chimney' },
    { x: -600, y: 140, w: 210, h: 150, r: 0.03, kind: 'string' },
    { x: -300, y: 230, w: 180, h: 140, r: -0.06, kind: 'sky' },
    { x: 300, y: 220, w: 200, h: 150, r: 0.04, kind: 'socket' },
    { x: 600, y: 150, w: 190, h: 140, r: -0.04, kind: 'count' },
  ];
  const centre = { x: 0, y: -10, w: 330, h: 250 };
  // red string first (under pins)
  c.strokeStyle = '#c4302c'; c.lineWidth = 3;
  for (const p of papers) {
    c.beginPath(); c.moveTo(p.x, p.y);
    c.quadraticCurveTo((p.x + centre.x) / 2, (p.y + centre.y) / 2 + 30, centre.x + Math.sign(p.x) * 60, centre.y + Math.sign(p.y) * 40);
    c.stroke();
  }
  // papers
  for (const p of papers) {
    c.save(); c.translate(p.x, p.y); c.rotate(p.r);
    c.fillStyle = '#ece6d6'; c.beginPath(); handRect(c, -p.w / 2, -p.h / 2, p.w, p.h, p.x | 0, 1.2); c.fill();
    drawSketch(c, p.kind, p.w, p.h, f);
    c.fillStyle = '#d23a32'; c.beginPath(); c.arc(0, -p.h / 2 + 10, 6, 0, TAU); c.fill();
    c.restore();
  }
  // whiteboard tally
  c.save(); c.translate(-80, -470);
  c.fillStyle = '#e9ecef'; c.beginPath(); handRect(c, -140, -60, 280, 120, 9, 1); c.fill();
  c.fillStyle = '#9aa0a8'; c.fillRect(-146, -66, 292, 8);
  handText(c, o.tally ?? '12', 0, -36, 70, { color: '#1f3a8a', align: 'center', seed: 21, weight: 1.3, boil: f.boil });
  c.restore();
  // the centre drawing (Grandad's house ablaze, stick-Grandma pointing up)
  c.save(); c.translate(centre.x, centre.y); c.rotate(-0.02);
  c.fillStyle = '#f0ead8'; c.beginPath(); handRect(c, -centre.w / 2, -centre.h / 2, centre.w, centre.h, 77, 1.5); c.fill();
  drawSketch(c, 'grandad', centre.w, centre.h, f);
  c.fillStyle = '#d23a32'; c.beginPath(); c.arc(0, -centre.h / 2 + 12, 7, 0, TAU); c.fill();
  c.restore();
  // cover sheet over the centre during the misdirect
  const rev = clamp(o.reveal ?? 1);
  if (rev < 1) {
    c.save(); c.translate(centre.x + rev * 600, centre.y);
    c.fillStyle = '#ece6d6'; c.beginPath(); handRect(c, -190, -150, 380, 300, 88, 1.5); c.fill();
    handText(c, 'TOP', -70, -60, 46, { color: '#c4302c', seed: 5, weight: 1.4 });
    handText(c, 'SECRET', -100, 0, 46, { color: '#c4302c', seed: 6, weight: 1.4 });
    c.restore();
  }
}

/** Child-drawn sketches in felt tip. */
export function drawSketch(c: C2D, kind: string, w: number, h: number, f: F) {
  const ink = '#2b2b4a', red = '#c4302c', b = f.boil;
  const L = (pts: [number, number][], col = ink, wd = 3) => pencilLine(c, pts.map(([x, y]) => v2(x * w, y * h)), wd, col, (pts[0][0] * 100) | 0, 1, 0.9);
  const T = (s: string, x: number, y: number, sz: number, col = ink) => handText(c, s, x * w, y * h, sz, { color: col, seed: (x * 97) | 0, weight: 1.1, boil: 0 });
  const dots = (pts: [number, number][]) => { pts.forEach(([x, y], i) => { c.fillStyle = BULB_SEQ[i % 5]; c.beginPath(); c.arc(x * w, y * h, 4, 0, TAU); c.fill(); }); };
  switch (kind) {
    case 'roof':
      L([[-0.35, 0.2], [-0.35, -0.05], [0, -0.32], [0.35, -0.05], [0.35, 0.2], [-0.35, 0.2]]);
      L([[0.18, -0.2], [0.18, -0.38], [0.26, -0.38], [0.26, -0.12]]);
      L([[-0.05, -0.38], [0.08, -0.25]], red, 4); L([[0.08, -0.38], [-0.05, -0.25]], red, 4);
      T('ROOF', -0.4, 0.26, 18); break;
    case 'bulb':
      L([[0, -0.3], [-0.15, -0.1], [-0.1, 0.1], [0.1, 0.1], [0.15, -0.1], [0, -0.3]]);
      L([[-0.08, 0.12], [-0.08, 0.25], [0.08, 0.25], [0.08, 0.12]]);
      T('1 = ALL OFF', -0.42, 0.28, 16, red); break;
    case 'ladder':
      L([[-0.15, 0.35], [-0.05, -0.35]]); L([[0.1, 0.35], [0.2, -0.35]]);
      for (let k = 0; k < 5; k++) L([[-0.13 + k * 0.02, 0.25 - k * 0.14], [0.12 + k * 0.02, 0.25 - k * 0.14]]);
      L([[-0.35, -0.3], [0.38, 0.3]], red, 5); T('NOT ME', -0.42, 0.3, 18, red); break;
    case 'chimney':
      L([[-0.2, 0.3], [-0.2, -0.2], [0.2, -0.2], [0.2, 0.3]]);
      L([[-0.26, -0.2], [0.26, -0.2]]);
      T('?', 0.3, -0.35, 30, red); dots([[-0.15, -0.25], [0, -0.27], [0.15, -0.25]]); break;
    case 'string':
      L([[-0.4, 0], [-0.2, 0.12], [0, 0], [0.2, 0.12], [0.4, 0]]);
      dots([[-0.3, 0.08], [-0.1, 0.08], [0.1, 0.08], [0.3, 0.08]]);
      T('TEST EVERY 1', -0.42, 0.22, 15); break;
    case 'sky':
      L([[-0.3, 0.3], [0.3, -0.3]], ink, 2); T('SPACE', -0.2, -0.38, 18);
      dots([[-0.3, 0.3]]); c.strokeStyle = '#d8a030'; c.lineWidth = 2; c.beginPath(); c.arc(0.25 * w, -0.25 * h, 14, 0, TAU); c.stroke(); break;
    case 'socket':
      L([[-0.15, -0.2], [0.15, -0.2], [0.15, 0.15], [-0.15, 0.15], [-0.15, -0.2]]);
      L([[-0.05, -0.08], [-0.05, 0.0]]); L([[0.05, -0.08], [0.05, 0.0]]);
      T('GROWN-UPS', -0.42, 0.26, 15, red); break;
    case 'count':
      T('1206', -0.3, -0.25, 30); T('BULBS', -0.3, 0.1, 18); break;
    case 'grandad': {
      // house outline
      L([[-0.3, 0.32], [-0.3, -0.05], [0, -0.3], [0.3, -0.05], [0.3, 0.32], [-0.3, 0.32]], ink, 4);
      L([[-0.08, 0.32], [-0.08, 0.12], [0.06, 0.12], [0.06, 0.32]], ink, 3);
      L([[-0.22, 0.0], [-0.12, 0.0], [-0.12, 0.08], [-0.22, 0.08], [-0.22, 0.0]], ink, 3);
      L([[0.12, 0.0], [0.22, 0.0], [0.22, 0.08], [0.12, 0.08], [0.12, 0.0]], ink, 3);
      // lights everywhere
      const pts: [number, number][] = [];
      for (let k = 0; k <= 12; k++) { const u = k / 12; pts.push([lerp(-0.3, 0, u), lerp(-0.05, -0.3, u) - 0.02]); pts.push([lerp(0, 0.3, u), lerp(-0.3, -0.05, u) - 0.02]); }
      for (let k = 0; k <= 8; k++) { pts.push([-0.32, lerp(-0.05, 0.3, k / 8)]); pts.push([0.32, lerp(-0.05, 0.3, k / 8)]); }
      dots(pts);
      // rays
      for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k - 3) * 0.35; L([[Math.cos(a) * 0.36, -0.3 + Math.sin(a) * 0.12], [Math.cos(a) * 0.46, -0.3 + Math.sin(a) * 0.2]], '#d8a030', 3); }
      // stick grandma pointing up + stick grandad
      L([[0.38, 0.33], [0.4, 0.18], [0.42, 0.33]], ink, 3); L([[0.4, 0.18], [0.4, 0.06]], ink, 3);
      L([[0.4, 0.1], [0.46, -0.08]], ink, 3); L([[0.4, 0.1], [0.35, 0.16]], ink, 3);
      c.strokeStyle = ink; c.lineWidth = 3; c.beginPath(); c.arc(0.4 * w, 0.02 * h, 9, 0, TAU); c.stroke();
      c.fillStyle = '#c97c86'; c.fillRect(0.38 * w, 0.1 * h, 0.04 * w, 0.06 * h);
      L([[-0.44, 0.33], [-0.42, 0.14], [-0.4, 0.33]], ink, 3); L([[-0.42, 0.14], [-0.42, 0.0]], ink, 3);
      c.beginPath(); c.arc(-0.42 * w, -0.05 * h, 9, 0, TAU); c.stroke();
      T("GRANDAD'S", -0.44, -0.47, 20, red);
      break;
    }
  }
  void b;
}
