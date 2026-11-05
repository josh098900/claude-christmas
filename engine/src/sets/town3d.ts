// A tiny 3D town (painter's algorithm, perspective projection) for the rooftop glide (A1)
// and the rise (J1). World metres: X right, Y up, Z away from the viewer. Grandad's house at X∈[-3.25,3.25], row 0.
import { C2D, F, W, H } from '../core/stage';
import { V2, v2, lerp, clamp, hash1, hash2, noise1, TAU, smoothstep, RNG } from '../core/math';
import { glow, BULB_SEQ } from '../draw/light';

export interface Cam3 { x: number; y: number; z: number; pitch: number; f: number; }
interface P3 { sx: number; sy: number; d: number; }
function projRaw(c: Cam3, X: number, Y: number, Z: number): P3 {
  const dx = X - c.x, dy = Y - c.y, dz = Z - c.z;
  const sp = Math.sin(c.pitch), cp = Math.cos(c.pitch);
  const d = -dy * sp + dz * cp;
  const up = dy * cp + dz * sp;
  return { sx: W / 2 + (c.f * dx) / d, sy: H / 2 - (c.f * up) / d, d };
}

const HOUSE = 6.5, WALL = 6.2, RIDGE = 9.4, DEPTH = 9, ROW = 34;
interface Block { row: number; x0: number; n: number; brick: string; roofH: number; }
let BLOCKS: Block[] | null = null;
const BR = ['#7a4a40', '#6e4538', '#83503f', '#734c45', '#6a4a40', '#7f5444'];
function blocks(): Block[] {
  if (BLOCKS) return BLOCKS;
  const out: Block[] = [];
  for (let row = -40; row <= 70; row++) {
    const r = new RNG(row * 131 + 7);
    const span = 1300 - Math.abs(row) * 5 + r.range(-200, 200);
    let x = -span + r.range(0, 20);
    if (row === 0) {
      // Grandad's terrace is continuous around the centre
      out.push({ row, x0: -HOUSE * 7.5, n: 15, brick: BR[2], roofH: RIDGE });
      x = HOUSE * 7.5 + 12;
      let xl = -HOUSE * 7.5 - 12;
      while (xl > -span) { const n = r.int(4, 10); xl -= n * HOUSE; out.push({ row, x0: xl, n, brick: r.pick(BR), roofH: RIDGE + r.range(-0.6, 0.8) }); xl -= r.range(8, 30); }
    }
    while (x < span) {
      const n = r.int(4, 11);
      if (r.chance(0.12)) { x += r.range(30, 90); continue; } // a park / gap
      out.push({ row, x0: x, n, brick: r.pick(BR), roofH: RIDGE + r.range(-0.6, 0.8) });
      x += n * HOUSE + r.range(8, 28);
    }
  }
  BLOCKS = out;
  return out;
}

function nightCol(c: string, k: number, haze: number): string {
  const n = parseInt(c.slice(1), 16); const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  let nr = r * (1 - k) + (r * 0.35 + 18) * k, ng = g * (1 - k) + (g * 0.42 + 26) * k, nb = b * (1 - k) + (b * 0.6 + 62) * k;
  nr = lerp(nr, 40, haze); ng = lerp(ng, 52, haze); nb = lerp(nb, 100, haze);
  return `rgb(${nr | 0},${ng | 0},${nb | 0})`;
}
function quad(c: C2D, ps: P3[]) { for (const q of ps) if (q.d < 0.5) return; c.beginPath(); c.moveTo(ps[0].sx, ps[0].sy); for (let i = 1; i < ps.length; i++) c.lineTo(ps[i].sx, ps[i].sy); c.closePath(); c.fill(); }

export interface TownOpts {
  dusk?: number;              // 0 night, 1 dusk sky
  grandadDark?: boolean;      // A1: his house is the only dark one
  blaze?: number;             // J1: his house blazes
  fog?: number;               // distance haze (m)
}

export function drawTown(f: F, cam: Cam3, o: TownOpts = {}) {
  const c = f.ctx, g = f.glow;
  const fogD = o.fog ?? 900;
  // sky + ground
  const hz = projRaw(cam, cam.x, 0, cam.z + 20000).sy; // horizon line
  const sg = c.createLinearGradient(0, Math.min(hz, H) - 700, 0, Math.max(0, hz) + 20);
  const dusk = o.dusk ?? 0;
  sg.addColorStop(0, '#0b1636'); sg.addColorStop(0.6, dusk ? '#33447e' : '#16264f'); sg.addColorStop(0.9, dusk ? '#8a7aa2' : '#2b3c70'); sg.addColorStop(1, dusk ? '#d9a48c' : '#3a4a7a');
  c.fillStyle = sg; c.fillRect(0, 0, W, Math.max(0, Math.min(H, hz + 2)));
  if (hz > 0) for (let i = 0; i < 60; i++) glow(g, hash1(i * 3.3) * W, hash1(i * 7.7) * Math.min(hz, H) * 0.7, 3, '#dfe6ff', 0.22 + 0.15 * Math.sin(f.tc * 2 + i));
  const gg = c.createLinearGradient(0, Math.max(0, hz), 0, H);
  gg.addColorStop(0, '#222c58'); gg.addColorStop(1, '#3c4a82');
  c.fillStyle = gg; c.fillRect(0, Math.max(0, hz), W, H);
  // rows far to near
  const bl = blocks();
  const rows = new Map<number, Block[]>();
  for (const b of bl) { if (!rows.has(b.row)) rows.set(b.row, []); rows.get(b.row)!.push(b); }
  const order = [...rows.keys()].sort((a, b) => b - a);
  for (const row of order) {
    const Z = row * ROW;
    const skew = row === 0 ? 0 : (hash1(row * 7.7) - 0.5) * 0.09;
    const proj = (c3: Cam3, X: number, Y: number, Zz: number) => projRaw(c3, X, Y, Zz + X * skew + Math.sin(X * 0.004 + row) * 6 * (row === 0 ? 0 : 1));
    const dRow = proj(cam, cam.x, 0, Z).d;
    if (dRow < 2) continue;
    const haze = clamp((dRow - 60) / fogD) * 0.85;
    // street in front of the row: lamps
    for (let lx = -900; lx < 900; lx += 26) {
      const p = proj(cam, lx, 5, Z - 12);
      if (p.d < 2 || p.sx < -20 || p.sx > W + 20 || p.sy < -20 || p.sy > H + 20) continue;
      const k = cam.f / p.d;
      glow(g, p.sx, p.sy, Math.max(2, 8 * k), '#ffcf8a', 0.3 * (1 - haze));
      if (k > 2) glow(g, p.sx, proj(cam, lx, 0.1, Z - 12).sy, 14 * k, '#ffb070', 0.12 * (1 - haze));
    }
    // back-garden trees behind this row (drawn before it: they're further away)
    {
      const kk = cam.f / Math.max(1, dRow);
      if (kk > 0.35) for (let q = 0; q < 70; q++) {
        const tx = -1100 + q * 32 + (hash1(row * 13 + q) - 0.5) * 24;
        if (hash1(row * 7 + q * 3) < 0.45) continue;
        const tz = Z + DEPTH + 6 + hash1(q * 5 + row) * 14;
        const base = proj(cam, tx, 0, tz), top = proj(cam, tx, 6 + hash1(q + row) * 5, tz);
        if (base.d < 2 || top.sx < -60 || top.sx > W + 60 || top.sy > H + 40 || base.sy < -40) continue;
        const hgt = base.sy - top.sy, wdt = hgt * 0.55;
        if (hgt < 3) continue;
        const th = clamp((base.d - 60) / fogD) * 0.85;
        if (hash1(q * 9 + row) > 0.5) {
          // fir with snow on its tiers
          c.fillStyle = `rgba(${lerp(30, 40, th) | 0},${lerp(52, 52, th) | 0},${lerp(56, 100, th) | 0},1)`;
          c.beginPath(); c.moveTo(top.sx, top.sy); c.lineTo(top.sx + wdt / 2, base.sy); c.lineTo(top.sx - wdt / 2, base.sy); c.closePath(); c.fill();
          c.fillStyle = nightCol('#c8d4f0', 0, th);
          for (let tier = 1; tier <= 3; tier++) { const yy = top.sy + hgt * tier * 0.24, ww = wdt * tier * 0.24; c.fillRect(top.sx - ww / 2, yy, ww, Math.max(1, hgt * 0.04)); }
        } else {
          // bare winter tree: a soft dark crown
          c.fillStyle = `rgba(${lerp(46, 40, th) | 0},${lerp(40, 52, th) | 0},${lerp(64, 100, th) | 0},0.85)`;
          c.beginPath(); c.ellipse(top.sx, top.sy + hgt * 0.35, wdt * 0.55, hgt * 0.4, 0, 0, TAU); c.fill();
          c.fillRect(top.sx - Math.max(1, wdt * 0.05), top.sy + hgt * 0.5, Math.max(2, wdt * 0.1), hgt * 0.5);
        }
      }
    }
    for (const b of rows.get(row)!) {
      const x0 = b.x0, x1 = b.x0 + b.n * HOUSE;
      const pa = proj(cam, x0, 0, Z), pb = proj(cam, x1, 0, Z);
      if ((pa.sx > W + 40 && pb.sx > W + 40) || (pa.sx < -40 && pb.sx < -40)) continue;
      if (pa.sy < -60 && proj(cam, x0, 0, Z + DEPTH).sy < -60) continue;
      if (proj(cam, x0, b.roofH, Z + DEPTH / 2).sy > H + 60) continue;
      const k = cam.f / pa.d; // px per metre at this depth
      const hw = HOUSE * k;
      const tiny = hw < 2.5;
      // gable ends facing the camera
      if (!tiny) {
        c.fillStyle = nightCol(b.brick, 0.8, haze);
        if (cam.x < x0) quad(c, [proj(cam, x0, 0, Z), proj(cam, x0, WALL, Z), proj(cam, x0, b.roofH, Z + DEPTH / 2), proj(cam, x0, WALL, Z + DEPTH), proj(cam, x0, 0, Z + DEPTH)]);
        if (cam.x > x1) quad(c, [proj(cam, x1, 0, Z), proj(cam, x1, WALL, Z), proj(cam, x1, b.roofH, Z + DEPTH / 2), proj(cam, x1, WALL, Z + DEPTH), proj(cam, x1, 0, Z + DEPTH)]);
      }
      // front wall
      c.fillStyle = nightCol(b.brick, 0.62, haze);
      quad(c, [proj(cam, x0, 0, Z), proj(cam, x1, 0, Z), proj(cam, x1, WALL, Z), proj(cam, x0, WALL, Z)]);
      // roof front slope (snow) + back slope if camera is high
      if (tiny) c.fillStyle = nightCol('#a6b4dc', 0.0, haze);
      else {
        const rf = c.createLinearGradient(0, proj(cam, x0, b.roofH, Z + DEPTH / 2).sy, 0, proj(cam, x0, WALL, Z).sy);
        rf.addColorStop(0, nightCol('#c8d4f0', 0.0, haze)); rf.addColorStop(1, nightCol('#8292c6', 0.0, haze));
        c.fillStyle = rf;
      }
      quad(c, [proj(cam, x0 - 0.2, WALL, Z - 0.3), proj(cam, x1 + 0.2, WALL, Z - 0.3), proj(cam, x1 + 0.2, b.roofH, Z + DEPTH / 2), proj(cam, x0 - 0.2, b.roofH, Z + DEPTH / 2)]);
      if (cam.y > b.roofH + 2) {
        c.fillStyle = nightCol('#9aa8d4', 0.0, haze);
        quad(c, [proj(cam, x0 - 0.2, b.roofH, Z + DEPTH / 2), proj(cam, x1 + 0.2, b.roofH, Z + DEPTH / 2), proj(cam, x1 + 0.2, WALL, Z + DEPTH + 0.3), proj(cam, x0 - 0.2, WALL, Z + DEPTH + 0.3)]);
      }
      // per house details
      for (let i = 0; i < b.n; i++) {
        const hx = x0 + i * HOUSE;
        const isG = row === 0 && Math.abs(hx + HOUSE / 2) < 1;
        const dark = isG && o.grandadDark;
        const blaze = isG ? (o.blaze ?? 0) : 0;
        const lit = !dark && hash2(hx * 0.37, row) > 0.15;
        if (tiny) {
          const p = proj(cam, hx + HOUSE / 2, WALL * 0.6, Z);
          if (p.sx < 0 || p.sx > W || p.sy < 0 || p.sy > H) continue;
          if (blaze > 0) continue;
          if (lit) { c.fillStyle = hash2(hx, row * 3) > 0.5 ? BULB_SEQ[(((i + row) % 5) + 5) % 5] : '#ffb868'; c.globalAlpha = 0.85 * (1 - haze * 0.6); c.fillRect(p.sx - 0.8, p.sy - 0.8, 1.6, 1.6); c.globalAlpha = 1; }
          continue;
        }
        // chimney on every other party wall
        if (((i + row) & 1) === 0) {
          const cz = Z + DEPTH / 2 - 0.5;
          c.fillStyle = nightCol(b.brick, 0.58, haze);
          quad(c, [proj(cam, hx - 0.55, b.roofH - 1, cz), proj(cam, hx + 0.55, b.roofH - 1, cz), proj(cam, hx + 0.55, b.roofH + 1.6, cz), proj(cam, hx - 0.55, b.roofH + 1.6, cz)]);
          c.fillStyle = nightCol('#c8d4f0', 0, haze);
          quad(c, [proj(cam, hx - 0.65, b.roofH + 1.6, cz), proj(cam, hx + 0.65, b.roofH + 1.6, cz), proj(cam, hx + 0.65, b.roofH + 1.6, cz + 1.1), proj(cam, hx - 0.65, b.roofH + 1.6, cz + 1.1)]);
          if (hw > 14 && !dark) for (let s = 0; s < 4; s++) {
            const u = (f.tc * 0.2 + s / 4 + hash1(hx + row)) % 1;
            const sp = proj(cam, hx + u * 3, b.roofH + 2 + u * 7, cz);
            c.fillStyle = `rgba(160,172,215,${0.12 * (1 - u) * (1 - haze)})`;
            c.beginPath(); c.arc(sp.sx, sp.sy, (0.6 + u * 2) * k, 0, TAU); c.fill();
          }
        }
        // windows: 2 up, 1 down + door
        const win = (wx0: number, wy0: number, ww: number, wh: number, on: boolean) => {
          c.fillStyle = on ? (haze > 0.5 ? '#b07a58' : '#f0b064') : '#131b3a';
          quad(c, [proj(cam, wx0, wy0, Z - 0.05), proj(cam, wx0 + ww, wy0, Z - 0.05), proj(cam, wx0 + ww, wy0 + wh, Z - 0.05), proj(cam, wx0, wy0 + wh, Z - 0.05)]);
          if (on && hw > 10) { const p = proj(cam, wx0 + ww / 2, wy0 + wh / 2, Z); glow(g, p.sx, p.sy, 1.4 * k, '#ffb060', 0.14 * (1 - haze)); }
        };
        const on = lit || blaze > 0;
        win(hx + 1.0, 3.6, 1.3, 1.8, on && hash2(hx, 1) > 0.45); win(hx + 4.0, 3.6, 1.3, 1.8, on && hash2(hx, 2) > 0.3);
        win(hx + 0.8, 0.9, 2.2, 1.9, on && hash2(hx, 3) > 0.2);
        // eave lights
        if (!dark) {
          const nb = blaze > 0 ? 14 : Math.max(3, Math.min(9, Math.round(hw / 6)));
          const rows2 = blaze > 0 ? [[WALL, 0], [b.roofH, DEPTH / 2], [(WALL + b.roofH) / 2, DEPTH / 4], [3.0, 0]] : [[WALL, 0]];
          for (const [yy, zz] of rows2) for (let q = 0; q < nb; q++) {
            const u = (q + 0.5) / nb;
            const p = proj(cam, hx + u * HOUSE, yy - Math.sin(u * Math.PI) * 0.25, Z + zz - 0.2);
            if (p.sx < -10 || p.sx > W + 10 || p.sy < -10 || p.sy > H + 10) continue;
            const col = BULB_SEQ[(((q + i + row * 2) % 5) + 5) % 5];
            const rr = Math.max(0.7, 0.13 * k);
            c.fillStyle = col; c.globalAlpha = 1 - haze * 0.5; c.beginPath(); c.arc(p.sx, p.sy, rr, 0, TAU); c.fill(); c.globalAlpha = 1;
            glow(g, p.sx, p.sy, Math.max(2.5, rr * (blaze > 0 ? 6 : 4.5)), col, (blaze > 0 ? 0.65 : 0.42) * (1 - haze * 0.7));
          }
        }
        if (blaze > 0) {
          const p = proj(cam, hx + HOUSE / 2, WALL * 0.7, Z);
          glow(g, p.sx, p.sy, 14 * k + 20, '#ffb070', 0.35 * blaze);
        }
      }
    }
  }
}
