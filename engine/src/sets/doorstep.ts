// Doorstep close-ups for the door-knocking montage (F2, F5, F6) and props shared by F/G/H.
// World units = street units (a door is 92 x 210). Threshold centre at (0,0); y down.
import { C2D, F, W, H } from '../core/stage';
import { V2, v2, lerp, clamp, hash1, TAU, RNG } from '../core/math';
import { handRect, handPoly, blobEllipse, tube, vgrad } from '../draw/brush';
import { glow, beam, BULB_SEQ, bulb } from '../draw/light';
import { CharLight } from '../draw/shade';
import { snowCap } from './street';
import { drawSketch } from './bedroom';

export interface DCam { x: number; y: number; z: number; }
export function dApply(c: C2D, cam: DCam) { c.translate(W / 2, H / 2); c.scale(cam.z, cam.z); c.translate(-cam.x, -cam.y); }
export function dScreen(cam: DCam, p: V2): V2 { return v2((p.x - cam.x) * cam.z + W / 2, (p.y - cam.y) * cam.z + H / 2); }

export const DW = 92, DH = 210;

function nc(c: string, k = 0.55): string {
  const n = parseInt(c.slice(1), 16); const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgb(${(r * (1 - k) + (r * 0.35 + 18) * k) | 0},${(g * (1 - k) + (g * 0.42 + 26) * k) | 0},${(b * (1 - k) + (b * 0.6 + 62) * k) | 0})`;
}

export interface DoorstepOpts {
  cam: DCam;
  door: string;          // door colour
  brick: string;
  open: number;          // 0 closed .. 1 fully open (swings inward, hinge on the right)
  num: string;
  hall?: number;         // hallway light 0..1
  wreath?: boolean;
  porch?: number;        // porch lantern 0..1
  bayLit?: number;       // the bay window to the left
  seed?: number;
  lights?: number;       // this house's own string lights (on 0..1), -1 = none
  skyTop?: string;
}

/** Background: wall, bay window, hall interior, door leaf, porch lantern, step, path, snow. */
export function drawDoorstep(f: F, o: DoorstepOpts) {
  const c = f.ctx, g = f.glow;
  const cam = o.cam;
  const seed = o.seed ?? 3;
  const hall = (o.hall ?? 1) * clamp(o.open * 3);
  // night fill behind everything (gaps show sky)
  vgrad(c, 0, 0, W, H, [[0, o.skyTop || '#16244e'], [1, '#2c3f78']]);
  c.save(); g.save();
  dApply(c, cam); dApply(g, cam);
  // ---- brick wall ----
  c.fillStyle = nc(o.brick, 0.6); c.fillRect(-900, -900, 1800, 920);
  const r = new RNG(seed);
  c.fillStyle = nc(o.brick, 0.66);
  for (let k = 0; k < 40; k++) {
    const bx = r.range(-880, 860), by = r.range(-880, -10);
    for (let row = 0; row < 3; row++) for (let col = 0; col < 3 - (row % 2); col++) {
      if (r.chance(0.35)) continue;
      c.fillRect(bx + col * 22 + (row % 2) * 11, by + row * 10, 19, 7.5);
    }
  }
  // ---- bay window to the left (warm, a tree inside) ----
  const bl = o.bayLit ?? 1;
  const bx0 = -470, bw = 300, by0 = -250, bh = 190;
  c.fillStyle = nc('#d9d0bd', 0.58); c.beginPath(); handRect(c, bx0 - 16, by0 - 16, bw + 32, bh + 40, seed + 1, 1); c.fill();
  const wg = c.createLinearGradient(bx0, by0, bx0 + bw * 0.4, by0 + bh);
  if (bl > 0.01) { wg.addColorStop(0, '#ffd99a'); wg.addColorStop(0.6, '#f0a85a'); wg.addColorStop(1, '#b8663a'); }
  else { wg.addColorStop(0, '#1d2a52'); wg.addColorStop(1, '#0d1430'); }
  c.fillStyle = wg; c.fillRect(bx0, by0, bw, bh);
  if (bl > 0.01) {
    c.fillStyle = 'rgba(120,40,40,0.7)';
    c.beginPath(); c.moveTo(bx0, by0); c.quadraticCurveTo(bx0 + 50, by0 + bh * 0.5, bx0 + 28, by0 + bh); c.lineTo(bx0, by0 + bh); c.fill();
    c.beginPath(); c.moveTo(bx0 + bw, by0); c.quadraticCurveTo(bx0 + bw - 50, by0 + bh * 0.5, bx0 + bw - 28, by0 + bh); c.lineTo(bx0 + bw, by0 + bh); c.fill();
    c.fillStyle = '#2f4a2c';
    c.beginPath(); c.moveTo(bx0 + bw * 0.5, by0 + 20); c.lineTo(bx0 + bw * 0.68, by0 + bh); c.lineTo(bx0 + bw * 0.32, by0 + bh); c.closePath(); c.fill();
    for (let k = 0; k < 14; k++) {
      const tx = bx0 + bw * (0.4 + hash1(seed + k) * 0.2), ty = by0 + 40 + hash1(seed + k * 3) * (bh - 50);
      const col = BULB_SEQ[k % 5]; c.fillStyle = col; c.beginPath(); c.arc(tx, ty, 2.6, 0, TAU); c.fill(); glow(g, tx, ty, 10, col, 0.4 * bl);
    }
    glow(g, bx0 + bw / 2, by0 + bh / 2, 260, '#ffb060', 0.18 * bl);
  }
  c.strokeStyle = nc('#e8e0cc', 0.5); c.lineWidth = 6;
  c.beginPath(); for (const fx of [0.33, 0.66]) { c.moveTo(bx0 + bw * fx, by0); c.lineTo(bx0 + bw * fx, by0 + bh); } c.moveTo(bx0, by0 + bh * 0.42); c.lineTo(bx0 + bw, by0 + bh * 0.42); c.stroke();
  c.fillStyle = nc('#d8d0bf', 0.5); c.fillRect(bx0 - 24, by0 + bh + 8, bw + 48, 12);
  snowCap(c, bx0 - 26, by0 + bh + 8, bw + 52, 11, seed + 2);
  // ---- door surround + fanlight ----
  c.fillStyle = nc('#d9d0bd', 0.56); c.beginPath(); handRect(c, -DW / 2 - 18, -DH - 58, DW + 36, DH + 58, seed + 4, 1); c.fill();
  c.fillStyle = hall > 0.05 ? '#f7c27a' : (bl > 0.01 ? '#c98a4a' : '#16203d');
  c.fillRect(-DW / 2, -DH - 46, DW, 36);
  c.fillStyle = hall > 0.05 ? '#7a4a22' : '#5a6a90';
  c.font = '600 20px Inter'; c.textAlign = 'center'; c.fillText(o.num, 0, -DH - 20); c.textAlign = 'left';
  if (hall > 0.05 || bl > 0.01) glow(g, 0, -DH - 28, 70, '#ffb565', 0.2 * Math.max(hall, bl * 0.5));
  // ---- the doorway: hall interior ----
  const open = clamp(o.open);
  if (open > 0.001) {
    c.save(); c.beginPath(); c.rect(-DW / 2, -DH, DW, DH); c.clip();
    const hg = c.createLinearGradient(0, -DH, 0, 0);
    hg.addColorStop(0, '#f6c784'); hg.addColorStop(0.55, '#e19a58'); hg.addColorStop(1, '#a8623a');
    c.fillStyle = hg; c.fillRect(-DW / 2, -DH, DW, DH);
    // receding hall: stairs on the left, runner carpet, a lamp glow
    c.fillStyle = 'rgba(120,60,40,0.55)';
    c.beginPath(); c.moveTo(-DW / 2, -10); c.lineTo(-12, -70); c.lineTo(12, -70); c.lineTo(DW / 2, -10); c.lineTo(DW / 2, 0); c.lineTo(-DW / 2, 0); c.fill();
    c.fillStyle = 'rgba(150,70,60,0.6)';
    c.beginPath(); c.moveTo(-18, 0); c.lineTo(-6, -70); c.lineTo(6, -70); c.lineTo(18, 0); c.fill();
    c.strokeStyle = 'rgba(110,60,40,0.5)'; c.lineWidth = 4;
    for (let k = 0; k < 6; k++) { c.beginPath(); c.moveTo(-DW / 2, -80 - k * 18); c.lineTo(-DW / 2 + 26 - k * 2, -86 - k * 18); c.stroke(); }
    // coats on hooks
    c.fillStyle = 'rgba(80,60,90,0.55)'; c.beginPath(); blobEllipse(c, 30, -130, 12, 34, seed + 7, 0.1, 8); c.fill();
    c.fillStyle = 'rgba(60,90,80,0.55)'; c.beginPath(); blobEllipse(c, 40, -125, 10, 30, seed + 8, 0.1, 8); c.fill();
    c.restore();
    glow(g, 0, -DH * 0.6, 150, '#ffb060', 0.35 * hall);
    glow(g, 0, -DH * 0.55, 60, '#ffe0a8', 0.3 * hall);
    // light spill out of the door onto the step and the snow (toward camera)
    c.save(); c.globalCompositeOperation = 'lighter';
    const sp = c.createLinearGradient(0, 0, 0, 260);
    sp.addColorStop(0, `rgba(255,175,95,${0.42 * hall})`); sp.addColorStop(1, 'rgba(255,175,95,0)');
    c.fillStyle = sp;
    c.beginPath(); c.moveTo(-DW / 2, 0); c.lineTo(DW / 2, 0); c.lineTo(DW / 2 + 160, 260); c.lineTo(-DW / 2 - 160, 260); c.closePath(); c.fill();
    c.restore();
  }
  // door leaf (swings inward, hinge at right edge)
  {
    const ang = open * 1.35;
    const lw = DW * Math.cos(ang);
    c.save();
    c.beginPath(); handRect(c, DW / 2 - lw, -DH, lw, DH, seed + 9, 0.6);
    c.fillStyle = nc(o.door, 0.4 + open * 0.05); c.fill();
    if (open < 0.6) {
      const k = lw / DW;
      c.fillStyle = 'rgba(0,0,0,0.18)';
      c.fillRect(DW / 2 - lw + 14 * k, -DH + 16, (DW / 2 - 20) * k, 70); c.fillRect(DW / 2 - lw + (DW / 2 + 6) * k, -DH + 16, (DW / 2 - 20) * k, 70);
      c.fillRect(DW / 2 - lw + 14 * k, -DH + 104, (DW / 2 - 20) * k, 90); c.fillRect(DW / 2 - lw + (DW / 2 + 6) * k, -DH + 104, (DW / 2 - 20) * k, 90);
      c.fillStyle = '#b9a26a'; c.fillRect(DW / 2 - lw + (DW / 2 - 16) * k, -DH + 92, 32 * k, 7);
      c.beginPath(); c.arc(DW / 2 - lw + 14 * k, -DH + 112, 4.5, 0, TAU); c.fill();
      if (o.wreath !== false) {
        const wx = DW / 2 - lw / 2, wy = -DH + 50;
        c.strokeStyle = nc('#2f5a34', 0.35); c.lineWidth = 11;
        c.beginPath(); c.ellipse(wx, wy, 19 * k + 0.5, 19, 0, 0, TAU); c.stroke();
        c.fillStyle = '#b8302c'; c.beginPath(); c.arc(wx, wy + 20, 5, 0, TAU); c.fill();
      }
    }
    c.restore();
  }
  // ---- porch lantern ----
  const pl = o.porch ?? 1;
  const lx = DW / 2 + 52, ly = -DH - 10;
  c.fillStyle = '#1c2224'; c.fillRect(lx - 3, ly - 36, 6, 14);
  c.beginPath(); c.moveTo(lx - 16, ly - 22); c.lineTo(lx + 16, ly - 22); c.lineTo(lx + 12, ly + 20); c.lineTo(lx - 12, ly + 20); c.closePath();
  c.fillStyle = pl > 0.01 ? '#ffe2a8' : '#2a3350'; c.fill();
  c.fillStyle = '#1c2224'; c.fillRect(lx - 19, ly - 26, 38, 6); c.fillRect(lx - 14, ly + 18, 28, 5);
  snowCap(c, lx - 20, ly - 26, 40, 7, seed + 11);
  if (pl > 0.01) { glow(g, lx, ly, 46, '#ffd28a', 0.6 * pl); glow(g, lx, ly, 180, '#ffb060', 0.14 * pl); }
  // house string lights along the top of the frame (the gutter is out of shot): a swag over the door
  if ((o.lights ?? -1) >= 0) {
    // drawn by caller with lightString if wanted
  }
  // ---- step and ground ----
  c.fillStyle = nc('#cfc6b4', 0.6); c.fillRect(-DW / 2 - 26, 0, DW + 52, 20);
  snowCap(c, -DW / 2 - 28, 0, DW + 56, 7, seed + 12);
  const gg = c.createLinearGradient(0, 20, 0, 400);
  gg.addColorStop(0, '#6f80b4'); gg.addColorStop(1, '#8999c8');
  c.fillStyle = gg; c.fillRect(-900, 20, 1800, 600);
  // path flagstones under the snow
  c.fillStyle = 'rgba(70,86,140,0.35)';
  c.beginPath(); c.moveTo(-DW / 2 - 10, 20); c.lineTo(DW / 2 + 10, 20); c.lineTo(DW / 2 + 70, 420); c.lineTo(-DW / 2 - 70, 420); c.closePath(); c.fill();
  // footprints leading to the door (Nell's)
  c.fillStyle = 'rgba(50,62,110,0.4)';
  for (let k = 0; k < 7; k++) { c.beginPath(); c.ellipse(-30 + (k % 2) * 34 - k * 4, 60 + k * 44, 9, 4.5, 0.1, 0, TAU); c.fill(); }
  c.restore(); g.restore();
}

/** Lights for doorstep characters. Key from the porch lantern, warm rim from the hall behind. */
export function lNeighbour(cam: DCam, hall: number, extraSpots: { x: number; y: number; r: number; color: string; a: number }[] = []): CharLight {
  const lp = dScreen(cam, v2(DW / 2 + 52, -DH - 10));
  return {
    key: -0.8, shadow: '#4b4f88', shadowAmt: 0.62, shadowOff: 14, shadowSoft: 5,
    rim: '#ffc27a', rimAmt: 0.55 + 0.45 * hall, rimW: 6, rimDir: -2.2, ambient: '#a99ab8', ambientAmt: 0.42,
    spots: [{ x: lp.x, y: lp.y, r: 520, color: '#ffcf96', a: 0.3 }, ...extraSpots],
  };
}
export function lNellAtDoor(cam: DCam, hall: number): CharLight {
  const hp = dScreen(cam, v2(0, -DH * 0.5));
  return {
    key: 0.0, shadow: '#3a4280', shadowAmt: 0.7, shadowOff: 13, shadowSoft: 5,
    rim: '#8fb0ff', rimAmt: 0.55, rimW: 4.5, rimDir: Math.PI + 0.5, ambient: '#7c87bd', ambientAmt: 0.55,
    spots: [{ x: hp.x, y: hp.y, r: 760, color: '#ffbf80', a: 0.5 * hall }],
  };
}

/** Nell's drawing held up: the back of the paper, backlit so the drawing shows through mirrored. */
export function heldDrawing(f: F, c: C2D, cx: number, cy: number, w: number, h: number, ang: number, backlight: number, front = false) {
  c.save(); c.translate(cx, cy); c.rotate(ang);
  c.fillStyle = front ? '#efe8d6' : '#d8cdb6';
  c.beginPath(); handRect(c, -w / 2, -h / 2, w, h, 41, 1.2); c.fill();
  // slight curl shadow
  c.fillStyle = 'rgba(60,50,80,0.18)'; c.fillRect(-w / 2, h / 2 - h * 0.12, w, h * 0.12);
  c.save();
  if (!front) { c.scale(-1, 1); c.globalAlpha = 0.35 + 0.35 * backlight; }
  drawSketch(c, 'grandad', w, h, f);
  c.restore();
  if (backlight > 0.01 && !front) {
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = `rgba(255,190,120,${0.25 * backlight})`;
    c.beginPath(); handRect(c, -w / 2, -h / 2, w, h, 41, 1.2); c.fill();
    c.globalCompositeOperation = 'source-over';
  }
  c.restore();
}

/** Draw a mustard mitten blob (to sit over a held prop). */
export function mitten(c: C2D, x: number, y: number, r: number, ang = 0, col = '#c99a50') {
  c.fillStyle = col;
  c.beginPath(); blobEllipse(c, x, y, r * 1.05, r * 0.9, 5, 0.05, 8, ang); c.fill();
  c.beginPath(); blobEllipse(c, x + Math.cos(ang - 1.1) * r * 0.75, y + Math.sin(ang - 1.1) * r * 0.75, r * 0.42, r * 0.32, 6, 0.05, 6, ang - 1.1); c.fill();
}

/** A small scruffy terrier in a red jumper. (x,y) = feet centre, faces right if flip=1. */
export function drawDog(c: C2D, x: number, y: number, s: number, flip: number, t: number, wag: number, light = 1) {
  c.save(); c.translate(x, y); c.scale(s * flip, s);
  const fur = `rgb(${(176 * light) | 0},${(160 * light) | 0},${(150 * light) | 0})`;
  const furD = `rgb(${(130 * light) | 0},${(116 * light) | 0},${(112 * light) | 0})`;
  // tail
  const ta = -1.0 + Math.sin(t * 22) * 0.5 * wag;
  c.strokeStyle = furD; c.lineWidth = 7; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-34, -40); c.lineTo(-34 + Math.cos(ta - 1.2) * 26, -40 + Math.sin(ta - 1.2) * 26); c.stroke();
  // legs
  c.fillStyle = furD;
  for (const lx of [-26, -14, 14, 24]) c.fillRect(lx - 4, -22, 8, 22);
  // body
  c.fillStyle = fur; c.beginPath(); blobEllipse(c, 0, -34, 40, 20, 3, 0.08, 10); c.fill();
  // jumper
  c.fillStyle = `rgb(${(178 * light) | 0},${(52 * light) | 0},${(48 * light) | 0})`;
  c.beginPath(); c.moveTo(-26, -50); c.quadraticCurveTo(0, -60, 26, -50); c.lineTo(30, -24); c.quadraticCurveTo(0, -18, -24, -24); c.closePath(); c.fill();
  c.strokeStyle = `rgba(240,230,210,${0.6 * light})`; c.lineWidth = 2;
  for (const jx of [-14, -2, 10, 22]) { c.beginPath(); c.moveTo(jx, -54); c.lineTo(jx + 2, -22); c.stroke(); }
  // head
  c.fillStyle = fur; c.beginPath(); blobEllipse(c, 40, -58, 20, 18, 4, 0.12, 10); c.fill();
  c.beginPath(); blobEllipse(c, 56, -52, 12, 9, 5, 0.1, 8); c.fill();
  c.fillStyle = furD; c.beginPath(); blobEllipse(c, 30, -70, 7, 13, 6, 0.1, 7, -0.5); c.fill();
  c.beginPath(); blobEllipse(c, 46, -74, 7, 12, 7, 0.1, 7, 0.4); c.fill();
  c.fillStyle = '#1a1820'; c.beginPath(); c.arc(66, -54, 3.6, 0, TAU); c.fill();
  c.beginPath(); c.arc(46, -61, 2.6, 0, TAU); c.fill();
  c.restore();
}

/** A long aluminium ladder seen side-on. From (x0,y0) to (x1,y1) in current space. */
export function drawLadder(c: C2D, x0: number, y0: number, x1: number, y1: number, width = 30, col = '#9aa3b8', rungEvery = 28) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy);
  const nx = -dy / L, ny = dx / L;
  c.save();
  c.strokeStyle = col; c.lineCap = 'round';
  c.lineWidth = 3.2;
  const n = Math.floor(L / rungEvery);
  for (let k = 1; k <= n; k++) {
    const u = k / (n + 0.5);
    const px = x0 + dx * u, py = y0 + dy * u;
    c.beginPath(); c.moveTo(px + nx * width / 2, py + ny * width / 2); c.lineTo(px - nx * width / 2, py - ny * width / 2); c.stroke();
  }
  c.lineWidth = 5.5;
  for (const sgn of [1, -1]) {
    c.beginPath(); c.moveTo(x0 + nx * width / 2 * sgn, y0 + ny * width / 2 * sgn); c.lineTo(x1 + nx * width / 2 * sgn, y1 + ny * width / 2 * sgn); c.stroke();
  }
  // end caps
  c.fillStyle = '#2a2a30';
  for (const sgn of [1, -1]) { c.beginPath(); c.arc(x1 + nx * width / 2 * sgn, y1 + ny * width / 2 * sgn, 4, 0, TAU); c.fill(); }
  c.restore();
}

/** A box of bulbs (cardboard), hand lettered. */
export function bulbBox(c: C2D, x: number, y: number, w: number, h: number, squash = 0) {
  c.save(); c.translate(x, y); c.scale(1 + squash * 0.12, 1 - squash * 0.12);
  c.fillStyle = '#b88a52'; c.beginPath(); handRect(c, -w / 2, -h, w, h, 21, 1); c.fill();
  c.fillStyle = '#9c7040'; c.fillRect(-w / 2, -h, w, h * 0.14);
  c.fillStyle = '#e9dcc0'; c.fillRect(-w * 0.32, -h * 0.68, w * 0.64, h * 0.42);
  for (let k = 0; k < 5; k++) { c.fillStyle = BULB_SEQ[k]; c.beginPath(); c.arc(-w * 0.24 + k * w * 0.12, -h * 0.47, w * 0.035, 0, TAU); c.fill(); }
  c.restore();
}
