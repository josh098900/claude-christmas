// The street: a terrace of Victorian houses in snow, seen in elevation. The hero set.
import { C2D, F, W, H } from '../core/stage';
import { V2, v2, lerp, clamp, hash1, hash2, noise1, TAU, smoothstep, RNG } from '../core/math';
import { handRect, handPoly, blobEllipse, vgrad, softSpot, jit } from '../draw/brush';
import { lightString, glow, BULB_SEQ, dotLights, beam } from '../draw/light';

export interface Cam { x: number; y: number; z: number; } // world point at screen centre, zoom
export function camApply(c: C2D, cam: Cam, par = 1) {
  c.translate(W / 2, H / 2);
  c.scale(cam.z * lerp(1, 1, par), cam.z);
  c.translate(-cam.x * par, -cam.y * (par === 1 ? 1 : par));
}
export function toScreen(cam: Cam, p: V2): V2 { return v2((p.x - cam.x) * cam.z + W / 2, (p.y - cam.y) * cam.z + H / 2); }

export type Mood = 'dusk' | 'night' | 'blue' | 'eve';
export const SKY: Record<Mood, [number, string][]> = {
  dusk: [[0, '#0f1a3d'], [0.45, '#2c3e78'], [0.78, '#6a6f9e'], [0.92, '#b48a96'], [1, '#d9a98e']],
  night: [[0, '#070d24'], [0.55, '#13224a'], [0.9, '#25386a'], [1, '#33497a']],
  blue: [[0, '#14244f'], [0.5, '#2c4782'], [0.85, '#5a74a8'], [1, '#8195bd']],
  eve: [[0, '#060b20'], [0.6, '#101d44'], [0.92, '#1e3060'], [1, '#2a3d6c']],
};

export interface House {
  i: number; x: number; w: number; brick: string; door: string; bay: boolean; num: number; seed: number;
  grandad?: boolean;
}
const BRICKS = ['#7a4a40', '#6e4538', '#83503f', '#734c45', '#6a4a40', '#7f5444'];
const DOORS = ['#8e2a2e', '#2f5a4a', '#2c4778', '#b88a2e', '#2a2730', '#6a2f52', '#3f6a6f'];
export const HOUSE_W = 400;
export const GRANDAD_INDEX = 0; // house index 0 sits at world x = 0

export function makeTerrace(n0: number, n1: number, seedBase = 0): House[] {
  const out: House[] = [];
  for (let i = n0; i <= n1; i++) {
    const r = new RNG(1000 + i * 7 + seedBase);
    out.push({
      i, x: i * HOUSE_W - HOUSE_W / 2, w: HOUSE_W, brick: r.pick(BRICKS), door: i === 0 ? '#2f4a3a' : r.pick(DOORS),
      bay: i % 2 === 0, num: 40 + i * 2 + (seedBase ? 1 : 0), seed: 50 + i * 13 + seedBase, grandad: i === 0 && !seedBase,
    });
  }
  return out;
}

export interface StreetOpts {
  mood: Mood;
  cam: Cam;
  lit: (h: House) => number;          // string lights on 0..1
  windows: (h: House) => number;      // interior lights 0..1
  blaze?: number;                     // Grandad's house blaze 0..1 (extra-dense lights)
  blazeOn?: number;                   // bulbs switched on 0..1 (for the dead switch, 0)
  snow?: number;                      // falling snow density
  lampsOn?: number;
  showRoad?: boolean;
  houses?: House[];
  bellFrost?: number;
  grandadWindowFigure?: number;       // 0..1 opacity of Grandad silhouette in window
  extraFront?: (c: C2D) => void;      // world-space foreground (characters etc.) drawn before snow
  farLights?: number;
  smoke?: boolean;
}

// ----------------------------------------------------------------- house painter
const WALL_H = 520, ROOF_H = 175;
export const EAVE_Y = -WALL_H, DOOR_W = 92, DOOR_H = 210;
export function doorRect(h: House) { const dx = h.x + (h.bay ? h.w * 0.74 : h.w * 0.28) - DOOR_W / 2; return { x: dx, y: -DOOR_H - 18, w: DOOR_W, h: DOOR_H }; }

function nightCol(c: string, k = 0.55): string {
  // pull a design colour into the blue night
  const n = parseInt(c.slice(1), 16); const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const nr = r * (1 - k) + (r * 0.35 + 18) * k, ng = g * (1 - k) + (g * 0.42 + 26) * k, nb = b * (1 - k) + (b * 0.6 + 62) * k;
  return `rgb(${nr | 0},${ng | 0},${nb | 0})`;
}

function window_(f: F, c: C2D, x: number, y: number, w: number, h: number, lit: number, seed: number, mood: Mood, tree = false, dark = false) {
  // frame
  c.beginPath(); handRect(c, x - 7, y - 7, w + 14, h + 14, seed, 1); c.fillStyle = nightCol('#e8e0cc', 0.5); c.fill();
  // glass
  c.beginPath(); handRect(c, x, y, w, h, seed + 1, 0.8);
  const g = c.createLinearGradient(x, y, x + w * 0.4, y + h);
  if (lit > 0.01 && !dark) {
    g.addColorStop(0, '#ffd99a'); g.addColorStop(0.6, '#f0a85a'); g.addColorStop(1, '#b8663a');
  } else {
    g.addColorStop(0, mood === 'dusk' ? '#3a4a7a' : '#1d2a52'); g.addColorStop(0.5, '#121b38'); g.addColorStop(1, '#0d1430');
  }
  c.fillStyle = g; c.fill();
  if (lit > 0.01 && !dark) {
    // curtains
    c.fillStyle = 'rgba(120,40,40,0.75)';
    c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + w * 0.22, y + h * 0.5, x + w * 0.12, y + h); c.lineTo(x, y + h); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(x + w, y); c.quadraticCurveTo(x + w * 0.78, y + h * 0.5, x + w * 0.88, y + h); c.lineTo(x + w, y + h); c.closePath(); c.fill();
    if (tree) {
      c.fillStyle = '#2f4a2c';
      c.beginPath(); c.moveTo(x + w * 0.5, y + h * 0.12); c.lineTo(x + w * 0.78, y + h); c.lineTo(x + w * 0.22, y + h); c.closePath(); c.fill();
      for (let k = 0; k < 9; k++) {
        const tx = x + w * (0.35 + hash1(seed + k) * 0.3), ty = y + h * (0.3 + hash1(seed + k * 3) * 0.65);
        const col = BULB_SEQ[k % 5];
        c.fillStyle = col; c.beginPath(); c.arc(tx, ty, 2.5, 0, TAU); c.fill();
        glow(f.glow, tx, ty, 10, col, 0.3 * lit);
      }
    }
    glow(f.glow, x + w / 2, y + h / 2, Math.max(w, h) * 0.75, '#ffb060', 0.10 * lit);
  } else if (!dark) {
    // cold reflections
    c.fillStyle = 'rgba(160,190,255,0.10)';
    c.beginPath(); c.moveTo(x + w * 0.15, y + h); c.lineTo(x + w * 0.55, y); c.lineTo(x + w * 0.7, y); c.lineTo(x + w * 0.3, y + h); c.closePath(); c.fill();
  }
  // glazing bars
  c.strokeStyle = nightCol('#e8e0cc', 0.5); c.lineWidth = 5;
  c.beginPath(); c.moveTo(x, y + h * 0.5); c.lineTo(x + w, y + h * 0.5); c.moveTo(x + w / 2, y); c.lineTo(x + w / 2, y + h); c.stroke();
  // sill + snow
  c.fillStyle = nightCol('#d8d0bf', 0.5); c.fillRect(x - 12, y + h + 6, w + 24, 10);
  snowCap(c, x - 14, y + h + 6, w + 28, 9, seed + 3);
}

/** A soft wavy cap of snow sitting on a ledge at (x,y) of width w. */
export function snowCap(c: C2D, x: number, y: number, w: number, th: number, seed: number, col = '#a3b2da', shadow = '#6474a8') {
  const n = Math.max(3, Math.round(w / 26));
  c.beginPath();
  c.moveTo(x - 2, y + 2);
  for (let i = 0; i <= n; i++) {
    const px = x + (w * i) / n, py = y - th * (0.7 + 0.5 * hash1(seed + i * 1.7));
    c.lineTo(px, py);
  }
  c.lineTo(x + w + 2, y + 2);
  // drips over the edge
  for (let i = n; i >= 0; i--) {
    const px = x + (w * i) / n;
    const d = hash1(seed + i * 3.3) > 0.7 ? th * 0.9 : th * 0.25;
    c.lineTo(px, y + d);
  }
  c.closePath();
  c.fillStyle = col; c.fill();
  c.fillStyle = shadow; c.globalAlpha = 0.5;
  c.fillRect(x, y - 1, w, 3);
  c.globalAlpha = 1;
}

function drawHouse(f: F, c: C2D, h: House, o: StreetOpts) {
  const x0 = h.x, w = h.w;
  const lit = o.lit(h), win = o.windows(h), mood = o.mood;
  const isG = !!h.grandad;
  // ---- wall ----
  c.save();
  c.beginPath(); c.rect(x0, -WALL_H, w + 1, WALL_H + 2);
  c.fillStyle = nightCol(h.brick, mood === 'dusk' ? 0.5 : 0.6); c.fill();
  c.clip();
  // brick hints: little clusters of brick marks
  const r = new RNG(h.seed);
  c.fillStyle = nightCol(h.brick, 0.75);
  for (let k = 0; k < 9; k++) {
    const bx = x0 + r.range(10, w - 60), by = -r.range(40, WALL_H - 30);
    for (let row = 0; row < 3; row++) for (let col = 0; col < 3 - row % 2; col++) {
      if (r.chance(0.3)) continue;
      c.fillRect(bx + col * 22 + (row % 2) * 11, by + row * 10, 19, 7.5);
    }
  }
  // party wall shadow
  const pg = c.createLinearGradient(x0, 0, x0 + 40, 0);
  pg.addColorStop(0, 'rgba(10,14,40,0.35)'); pg.addColorStop(1, 'rgba(10,14,40,0)');
  c.fillStyle = pg; c.fillRect(x0, -WALL_H, 40, WALL_H);
  // upper wall darker (eaves shadow)
  const eg = c.createLinearGradient(0, -WALL_H, 0, -WALL_H + 90);
  eg.addColorStop(0, 'rgba(8,10,30,0.45)'); eg.addColorStop(1, 'rgba(8,10,30,0)');
  c.fillStyle = eg; c.fillRect(x0, -WALL_H, w, 90);
  c.restore();
  // string course
  c.fillStyle = nightCol('#d6cdb8', 0.55); c.fillRect(x0, -WALL_H * 0.5 - 6, w, 9);

  // ---- upstairs windows ----
  const uw = 92, uh = 140;
  const wu = [x0 + w * 0.28 - uw / 2, x0 + w * 0.72 - uw / 2];
  wu.forEach((wx, k) => window_(f, c, wx, -WALL_H + 70, uw, uh, win * (k === 0 ? 1 : (hash1(h.seed + 5) > 0.4 ? 1 : 0)), h.seed + 10 + k, mood, false, isG));
  // ---- ground floor: bay or flat window, door ----
  const dr = doorRect(h);
  const winX = h.bay ? x0 + w * 0.32 : x0 + w * 0.7;
  if (h.bay) {
    // bay projection
    const bw = 200, bh = 190, by = -230;
    c.beginPath(); handPoly(c, [v2(winX - bw / 2 - 14, by - 26), v2(winX + bw / 2 + 14, by - 26), v2(winX + bw / 2 + 14, 0), v2(winX - bw / 2 - 14, 0)], h.seed + 20, 1);
    c.fillStyle = nightCol('#d9d0bd', 0.58); c.fill();
    window_(f, c, winX - bw / 2 + 6, by - 8, 56, bh - 30, win, h.seed + 21, mood, false, isG);
    window_(f, c, winX - 34, by - 8, 68, bh - 30, win, h.seed + 22, mood, !isG && hash1(h.seed) > 0.3, isG);
    window_(f, c, winX + bw / 2 - 62, by - 8, 56, bh - 30, win, h.seed + 23, mood, false, isG);
    // bay roof
    c.beginPath(); handPoly(c, [v2(winX - bw / 2 - 22, by - 26), v2(winX - bw / 2, by - 58), v2(winX + bw / 2, by - 58), v2(winX + bw / 2 + 22, by - 26)], h.seed + 24, 1);
    c.fillStyle = nightCol('#3a4258', 0.4); c.fill();
    snowCap(c, winX - bw / 2 - 4, by - 58, bw + 8, 16, h.seed + 25);
  } else {
    window_(f, c, winX - 70, -220, 140, 160, win, h.seed + 26, mood, !isG && hash1(h.seed + 1) > 0.2, isG);
  }
  // door
  c.beginPath(); handRect(c, dr.x - 14, dr.y - 52, dr.w + 28, dr.h + 52, h.seed + 30, 1);
  c.fillStyle = nightCol('#d9d0bd', 0.58); c.fill();
  // fanlight
  c.beginPath(); c.rect(dr.x, dr.y - 42, dr.w, 34);
  c.fillStyle = (win > 0.01 && !isG) ? '#f7c27a' : '#16203d'; c.fill();
  if (win > 0.01 && !isG) glow(f.glow, dr.x + dr.w / 2, dr.y - 25, 50, '#ffb565', 0.12 * win);
  c.beginPath(); handRect(c, dr.x, dr.y, dr.w, dr.h, h.seed + 31, 0.8);
  c.fillStyle = nightCol(h.door, 0.42); c.fill();
  // panels
  c.fillStyle = 'rgba(0,0,0,0.18)';
  c.fillRect(dr.x + 14, dr.y + 16, dr.w / 2 - 20, 70); c.fillRect(dr.x + dr.w / 2 + 6, dr.y + 16, dr.w / 2 - 20, 70);
  c.fillRect(dr.x + 14, dr.y + 104, dr.w / 2 - 20, 90); c.fillRect(dr.x + dr.w / 2 + 6, dr.y + 104, dr.w / 2 - 20, 90);
  // letterbox + knob
  c.fillStyle = '#b9a26a'; c.fillRect(dr.x + dr.w / 2 - 16, dr.y + 92, 32, 7);
  c.beginPath(); c.arc(dr.x + dr.w - 16, dr.y + 112, 4.5, 0, TAU); c.fill();
  // step
  c.fillStyle = nightCol('#cfc6b4', 0.6); c.fillRect(dr.x - 18, -18, dr.w + 36, 18);
  snowCap(c, dr.x - 20, -18, dr.w + 40, 8, h.seed + 32);
  // wreath on neighbours' doors
  if (!isG) {
    const wx = dr.x + dr.w / 2, wy = dr.y + 50;
    c.strokeStyle = nightCol('#2f5a34', 0.35); c.lineWidth = 11;
    c.beginPath(); c.arc(wx, wy, 19, 0, TAU); c.stroke();
    c.fillStyle = '#b8302c'; c.beginPath(); c.arc(wx, wy + 20, 5, 0, TAU); c.fill();
  } else {
    // the little brass bell by the door, frosted
    const bx = dr.x + dr.w + 30, by = dr.y + 20;
    c.strokeStyle = '#3a3a44'; c.lineWidth = 2; c.beginPath(); c.moveTo(bx, by - 26); c.lineTo(bx, by - 10); c.stroke();
    c.fillStyle = nightCol('#b08a3a', 0.4);
    c.beginPath(); c.moveTo(bx - 11, by + 8); c.quadraticCurveTo(bx - 10, by - 12, bx, by - 12); c.quadraticCurveTo(bx + 10, by - 12, bx + 11, by + 8); c.closePath(); c.fill();
    const fr = o.bellFrost ?? 1;
    if (fr > 0) { c.fillStyle = `rgba(210,225,250,${0.75 * fr})`; c.beginPath(); c.moveTo(bx - 10, by - 6); c.quadraticCurveTo(bx, by - 16, bx + 10, by - 6); c.lineTo(bx + 6, by - 3); c.lineTo(bx - 6, by - 3); c.closePath(); c.fill(); }
    c.fillStyle = '#2a2a30'; c.beginPath(); c.arc(bx, by + 10, 3, 0, TAU); c.fill();
  }
  // house number on fanlight
  c.fillStyle = (win > 0.01 && !isG) ? '#6a3a1a' : '#5a6a90';
  c.font = '600 20px Inter'; c.textAlign = 'center'; c.fillText(String(h.num), dr.x + dr.w / 2, dr.y - 18); c.textAlign = 'left';

  // ---- gutter ----
  c.fillStyle = '#1b2033'; c.fillRect(x0 - 2, -WALL_H - 8, w + 4, 12);
  // downpipe on party wall
  c.fillStyle = '#1e2436'; c.fillRect(x0 + w - 8, -WALL_H, 9, WALL_H);
}

function drawRoofRow(f: F, c: C2D, houses: House[], o: StreetOpts) {
  if (!houses.length) return;
  const xa = houses[0].x, xb = houses[houses.length - 1].x + HOUSE_W;
  // roof slope band
  const top = -WALL_H - ROOF_H;
  c.beginPath(); c.rect(xa, top, xb - xa, ROOF_H);
  const g = c.createLinearGradient(0, top, 0, -WALL_H);
  g.addColorStop(0, '#a9b8de'); g.addColorStop(0.55, '#8899c9'); g.addColorStop(0.85, '#6a7bb0'); g.addColorStop(1, '#2e3554');
  c.fillStyle = g; c.fill();
  // slate peeking at eaves, irregular snow edge
  c.fillStyle = '#2e3550';
  c.beginPath(); c.moveTo(xa, -WALL_H);
  for (let x = xa; x <= xb; x += 18) c.lineTo(x, -WALL_H - 14 - hash1(x * 0.37) * 16 - (noise1(x * 0.01) + 1) * 8);
  c.lineTo(xb, -WALL_H); c.closePath(); c.fill();
  // icicles
  c.fillStyle = 'rgba(200,220,255,0.75)';
  for (let x = xa + 10; x < xb; x += 23) {
    if (hash1(x * 1.3) < 0.55) continue;
    const L = 8 + hash1(x * 2.1) * 26;
    c.beginPath(); c.moveTo(x - 3, -WALL_H + 4); c.lineTo(x + 3, -WALL_H + 4); c.lineTo(x + 0.5, -WALL_H + 4 + L); c.closePath(); c.fill();
  }
  // ridge
  c.fillStyle = '#b8c6e8'; c.fillRect(xa, top - 6, xb - xa, 10);
  // chimneys on party walls
  for (const h of houses) {
    const cx = h.x + (h.i % 2 === 0 ? 0 : 0);
    const cw = 78, ch = 110;
    const cy = top - ch + 30;
    c.beginPath(); handRect(c, cx - cw / 2, cy, cw, ch, h.seed + 70, 1.2);
    c.fillStyle = nightCol(h.brick, 0.62); c.fill();
    c.fillStyle = nightCol('#d6cdb8', 0.6); c.fillRect(cx - cw / 2 - 6, cy, cw + 12, 12);
    snowCap(c, cx - cw / 2 - 8, cy, cw + 16, 14, h.seed + 71);
    // pots
    for (let k = -1; k <= 1; k += 2) {
      c.fillStyle = nightCol('#a0603e', 0.55);
      c.beginPath(); handRect(c, cx + k * 18 - 9, cy - 34, 18, 34, h.seed + 72 + k, 0.8); c.fill();
    }
    // smoke
    if (o.smoke !== false && h.i !== 0) {
      for (let k = 0; k < 7; k++) {
        const u = ((f.tc * 0.18 + k / 7 + hash1(h.seed)) % 1);
        const sx = cx + 14 + u * 120 + noise1(u * 3 + h.seed, 2) * 30, sy = cy - 40 - u * 220;
        c.fillStyle = `rgba(150,165,205,${0.16 * (1 - u)})`;
        c.beginPath(); c.arc(sx, sy, 16 + u * 50, 0, TAU); c.fill();
      }
    }
  }
}

/** Light anchor points along a house (gutter swags + door + windows). */
function houseLights(f: F, h: House, on: number, density: number, o: StreetOpts) {
  const x0 = h.x, w = h.w;
  const seed = h.seed;
  const size = 7;
  // gutter swags
  const sw: V2[] = [];
  const nSw = 4;
  for (let k = 0; k <= nSw; k++) sw.push(v2(x0 + 6 + (w - 12) * (k / nSw), -WALL_H + 6));
  lightString(f, { anchors: sw, spacing: 26 / density, size, sag: 26, on, seed, twinkle: 0.15 });
  // around door
  const dr = doorRect(h);
  lightString(f, { anchors: [v2(dr.x - 18, -10), v2(dr.x - 18, dr.y - 60), v2(dr.x + dr.w + 18, dr.y - 60), v2(dr.x + dr.w + 18, -10)], spacing: 24 / density, size: 6, sag: 4, on, seed: seed + 3, twinkle: 0.1 });
  if (density > 1.2) {
    // blaze: windows, roof ridge, chimney, string course, everything
    const uw = 92, uh = 140;
    for (const wx of [x0 + w * 0.28 - uw / 2, x0 + w * 0.72 - uw / 2])
      lightString(f, { anchors: [v2(wx - 12, -WALL_H + 70 + uh + 16), v2(wx - 12, -WALL_H + 58), v2(wx + uw + 12, -WALL_H + 58), v2(wx + uw + 12, -WALL_H + 70 + uh + 16)], spacing: 20, size: 6, sag: 3, on, seed: seed + 5 });
    lightString(f, { anchors: [v2(x0, -WALL_H * 0.5 - 8), v2(x0 + w / 2, -WALL_H * 0.5 - 8), v2(x0 + w, -WALL_H * 0.5 - 8)], spacing: 20, size: 6, sag: 18, on, seed: seed + 6 });
    const top = -WALL_H - ROOF_H;
    lightString(f, { anchors: [v2(x0 - 30, top - 4), v2(x0 + w / 2, top - 4), v2(x0 + w + 30, top - 4)], spacing: 22, size: 7, sag: 6, on, seed: seed + 7 });
    for (let k = 0; k < 3; k++) {
      const yy = lerp(top + 30, -WALL_H - 20, k / 2);
      lightString(f, { anchors: [v2(x0 - 10, yy), v2(x0 + w / 2, yy + 8), v2(x0 + w + 10, yy)], spacing: 24, size: 6.5, sag: 14, on, seed: seed + 8 + k });
    }
    // ground floor window
    if (h.bay) lightString(f, { anchors: [v2(x0 + w * 0.32 - 115, -10), v2(x0 + w * 0.32 - 115, -262), v2(x0 + w * 0.32 + 115, -262), v2(x0 + w * 0.32 + 115, -10)], spacing: 20, size: 6, sag: 3, on, seed: seed + 11 });
    // vertical drops down the walls (icicle lights)
    for (let k = 0; k < 9; k++) {
      const xx = x0 + 20 + k * (w - 40) / 8;
      lightString(f, { anchors: [v2(xx, -WALL_H + 8), v2(xx + 2, -WALL_H + 70 + (k % 3) * 25)], spacing: 18, size: 5, sag: 0, on, seed: seed + 20 + k, colors: ['#fff1cf', '#ffae2b', '#fff1cf'] });
    }
  }
}

// ----------------------------------------------------------------- the whole street
export function drawStreet(f: F, o: StreetOpts) {
  const c = f.ctx;
  const cam = o.cam;
  // sky (screen space)
  vgrad(c, 0, 0, W, H, SKY[o.mood]);
  // stars
  if (o.mood !== 'dusk' && o.mood !== 'blue') {
    for (let i = 0; i < 90; i++) {
      const sx = (hash1(i * 3.7) * W * 1.4 - cam.x * 0.02 * cam.z) % W, sy = hash1(i * 9.1) * H * 0.5;
      const a = 0.25 + 0.5 * hash1(i * 1.3) * (0.7 + 0.3 * Math.sin(f.tc * 2 + i));
      glow(f.glow, (sx + W) % W, sy, 3 + hash1(i) * 3, '#cfd8ff', a * 0.5);
    }
  }
  // far town silhouette (parallax 0.35)
  c.save();
  c.translate(W / 2, H / 2); c.scale(cam.z, cam.z);
  const par = 0.35;
  c.translate(-cam.x * par, -cam.y);
  const farY = -WALL_H - ROOF_H - 40;
  c.fillStyle = o.mood === 'dusk' ? '#3b4778' : '#17224a';
  c.beginPath(); c.moveTo(-6000, 200);
  for (let x = -6000; x <= 6000; x += 60) {
    const hgt = 120 + noise1(x * 0.004, 7) * 70 + (hash1(Math.floor(x / 180)) > 0.85 ? 90 : 0);
    c.lineTo(x, farY - hgt + 140); c.lineTo(x + 60, farY - hgt + 140);
  }
  c.lineTo(6000, 200); c.closePath(); c.fill();
  // church spire
  const spX = 900;
  c.beginPath(); c.moveTo(spX - 40, farY + 60); c.lineTo(spX - 40, farY - 120); c.lineTo(spX, farY - 330); c.lineTo(spX + 40, farY - 120); c.lineTo(spX + 40, farY + 60); c.closePath(); c.fill();
  // far windows and far lights
  for (let i = 0; i < 160; i++) {
    const x = -6000 + hash1(i * 4.1) * 12000, y = farY + 40 - hash1(i * 7.7) * 140;
    if (hash1(i * 2.3) > 0.5) { c.fillStyle = '#e8a860'; c.fillRect(x, y, 7, 9); glow(f.glow, x * cam.z, y, 0, '#000', 0); }
  }
  c.restore();
  // far lights in glow (needs screen mapping)
  if ((o.farLights ?? 1) > 0) {
    for (let i = 0; i < 260; i++) {
      const wx = -6000 + hash1(i * 5.3 + 1) * 12000, wy = farY + 100 - hash1(i * 6.1) * 120 - 60;
      const sx = (wx - cam.x * par) * cam.z + W / 2, sy = (wy - cam.y) * cam.z + H / 2;
      if (sx < -50 || sx > W + 50) continue;
      const col = BULB_SEQ[i % 5];
      glow(f.glow, sx, sy, 5 * cam.z + 3, col, 0.4 * (o.farLights ?? 1) * (0.6 + 0.4 * Math.sin(f.tc * 1.5 + i)));
    }
  }

  // ----- the terrace (world space) -----
  c.save(); f.glow.save();
  for (const x of [c, f.glow]) { x.translate(W / 2, H / 2); x.scale(cam.z, cam.z); x.translate(-cam.x, -cam.y); }
  const houses = o.houses || makeTerrace(-6, 6);
  // cull
  const vx0 = cam.x - W / 2 / cam.z - HOUSE_W, vx1 = cam.x + W / 2 / cam.z + HOUSE_W;
  const vis = houses.filter((h) => h.x + h.w > vx0 && h.x < vx1);
  drawRoofRow(f, c, vis, o);
  for (const h of vis) drawHouse(f, c, h, o);
  // Grandad silhouette at upstairs? (downstairs bay window) -- drawn by shots when needed
  // lights
  for (const h of vis) {
    if (h.grandad) {
      const bl = o.blaze ?? 0;
      if (bl > 0) houseLights(f, h, o.blazeOn ?? 1, 1.6, o);
      continue;
    }
    const on = o.lit(h);
    houseLights(f, h, on, 1, o);
    if (on > 0.01) {
      // coloured light spill on the wall
      c.save(); c.globalCompositeOperation = 'lighter';
      const g = c.createLinearGradient(0, -WALL_H, 0, -WALL_H + 160);
      g.addColorStop(0, `rgba(255,170,90,${0.16 * on})`); g.addColorStop(1, 'rgba(255,170,90,0)');
      c.fillStyle = g; c.fillRect(h.x, -WALL_H, h.w, 160);
      c.restore();
    }
  }
  if ((o.blaze ?? 0) > 0) {
    const g = vis.find((h) => h.grandad);
    const on = o.blazeOn ?? 1;
    if (g && on > 0.01) {
      c.save(); c.globalCompositeOperation = 'lighter';
      const gr = c.createRadialGradient(g.x + g.w / 2, -WALL_H * 0.6, 50, g.x + g.w / 2, -WALL_H * 0.6, 700);
      gr.addColorStop(0, `rgba(255,190,120,${0.28 * on})`); gr.addColorStop(1, 'rgba(255,190,120,0)');
      c.fillStyle = gr; c.fillRect(g.x - 700, -WALL_H - 900, g.w + 1400, 1800);
      c.restore();
      glow(f.glow, g.x + g.w / 2, -WALL_H * 0.55, 900, '#ffb070', 0.12 * on);
    }
  }
  // ----- front gardens, walls, pavement -----
  // garden snow
  c.fillStyle = '#6b7cb0'; c.fillRect(vx0, 0, vx1 - vx0, 70);
  // low front walls with gates
  for (const h of vis) {
    const dr = doorRect(h);
    c.fillStyle = nightCol(h.brick, 0.62);
    c.fillRect(h.x, 70, dr.x - 20 - h.x, 46); c.fillRect(dr.x + dr.w + 20, 70, h.x + h.w - (dr.x + dr.w + 20), 46);
    snowCap(c, h.x - 2, 70, dr.x - 18 - h.x, 13, h.seed + 90);
    snowCap(c, dr.x + dr.w + 18, 70, h.x + h.w - (dr.x + dr.w + 18), 13, h.seed + 91);
    // gate posts
    c.fillStyle = nightCol('#3a3a40', 0.3); c.fillRect(dr.x - 24, 56, 10, 62); c.fillRect(dr.x + dr.w + 14, 56, 10, 62);
    // path
    c.fillStyle = '#5c6ca0'; c.fillRect(dr.x - 10, 0, dr.w + 20, 116);
  }
  // pavement
  const pg = c.createLinearGradient(0, 116, 0, 230);
  pg.addColorStop(0, '#7d8ec0'); pg.addColorStop(1, '#6a7aae');
  c.fillStyle = pg; c.fillRect(vx0, 116, vx1 - vx0, 114);
  // footprints
  c.fillStyle = 'rgba(70,88,140,0.35)';
  for (let i = 0; i < 80; i++) {
    const px = vx0 + hash1(i * 2.7) * (vx1 - vx0), py = 140 + hash1(i * 5.1) * 70;
    c.beginPath(); c.ellipse(px, py, 7, 3.2, 0.1, 0, TAU); c.fill();
  }
  // kerb + road
  c.fillStyle = '#4a5788'; c.fillRect(vx0, 228, vx1 - vx0, 10);
  if (o.showRoad !== false) {
    const rg = c.createLinearGradient(0, 238, 0, 700);
    rg.addColorStop(0, '#56669c'); rg.addColorStop(1, '#7586ba');
    c.fillStyle = rg; c.fillRect(vx0, 238, vx1 - vx0, 900);
    // tyre tracks
    c.fillStyle = 'rgba(60,72,120,0.30)';
    for (const ty of [320, 352, 470, 505]) { c.beginPath(); c.moveTo(vx0, ty); for (let x = vx0; x < vx1; x += 80) c.lineTo(x, ty + noise1(x * 0.003, ty) * 6); c.lineTo(vx1, ty + 12); c.lineTo(vx0, ty + 12); c.fill(); }
  }
  // street lamps every 3 houses
  const lampsOn = o.lampsOn ?? 1;
  for (let i = -12; i <= 12; i++) {
    const lx = i * HOUSE_W * 2 + HOUSE_W * 0.98;
    if (lx < vx0 - 200 || lx > vx1 + 200) continue;
    drawLamp(f, c, lx, 222, lampsOn);
  }
  if (o.extraFront) o.extraFront(c);
  c.restore(); f.glow.restore();
}

export function drawLamp(f: F, c: C2D, x: number, y: number, on: number) {
  const ph = 560;
  c.fillStyle = '#1c2a2c';
  c.fillRect(x - 7, y - ph, 14, ph);
  c.fillRect(x - 14, y - 40, 28, 40);
  // arm + lantern
  c.beginPath(); c.moveTo(x - 30, y - ph - 6); c.lineTo(x + 30, y - ph - 6); c.lineTo(x + 20, y - ph - 70); c.lineTo(x - 20, y - ph - 70); c.closePath();
  c.fillStyle = on > 0.01 ? '#ffe2a8' : '#2a3350'; c.fill();
  c.fillStyle = '#1c2a2c'; c.fillRect(x - 34, y - ph - 82, 68, 14); c.fillRect(x - 34, y - ph - 8, 68, 8);
  snowCap(c, x - 36, y - ph - 82, 72, 10, x | 0);
  if (on > 0.01) {
    glow(f.glow, x, y - ph - 38, 70, '#ffd28a', 0.45 * on);
    glow(f.glow, x, y - ph - 38, 220, '#ffb060', 0.10 * on);
    // pool on snow
    c.save(); c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(x, y - 8, 10, x, y - 8, 330);
    g.addColorStop(0, `rgba(255,190,120,${0.22 * on})`); g.addColorStop(1, 'rgba(255,190,120,0)');
    c.fillStyle = g; c.beginPath(); c.ellipse(x, y - 8, 330, 90, 0, 0, TAU); c.fill();
    c.restore();
    beam(f.glow, v2(x, y - ph - 30), Math.PI / 2, ph + 10, 0.42, 'rgba(255,205,140,0.5)', 0.07 * on, 18);
  }
}

/** Falling snow in screen space. depth layers; wind drifts sideways. */
export function snowfall(f: F, density = 1, wind = 0.3, seed = 0, lightCol = '#dfe8ff') {
  const c = f.ctx;
  const n = Math.round(220 * density);
  for (let i = 0; i < n; i++) {
    const d = hash1(i * 1.37 + seed);          // depth 0 far .. 1 near
    const sp = 40 + d * 160;
    const size = 1.2 + d * d * 6;
    const x0 = hash1(i * 7.13 + seed) * (W + 200) - 100;
    const y = ((hash1(i * 3.71 + seed) * (H + 100) + f.tc * sp) % (H + 100)) - 50;
    const x = ((x0 + f.tc * sp * wind + noise1(f.tc * 0.5 + i, seed) * 30 * d) % (W + 200) + W + 200) % (W + 200) - 100;
    const a = 0.35 + d * 0.5;
    if (d > 0.85) { glow(f.glow, x, y, size * 2.2, lightCol, a * 0.25); }
    c.fillStyle = `rgba(225,233,252,${a})`;
    c.beginPath(); c.arc(x, y, size, 0, TAU); c.fill();
  }
}
