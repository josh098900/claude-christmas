// Aerial views: the rooftop glide (A1) and the rise to space (J1).
import { C2D, F, W, H } from '../core/stage';
import { V2, v2, lerp, clamp, hash1, hash2, noise1, noise2, fbm2, TAU, smoothstep, RNG } from '../core/math';
import { glow, BULB_SEQ } from '../draw/light';
import { blobEllipse } from '../draw/brush';

// ---------------------------------------------------------------- A1: rooftop glide (oblique rows)
/**
 * Rows of terraced roofs receding to the horizon. camZ moves forward, camH is camera height.
 * Row i sits at depth i*ROW_D. Perspective: screen y = horizon + camH*F/(d-camZ).
 */
export function roofGlide(f: F, camZ: number, camH: number, o: { darkRow?: number; dusk?: number; horizonY?: number } = {}) {
  const c = f.ctx, g = f.glow;
  const horizon = o.horizonY ?? 300;
  // sky
  const sg = c.createLinearGradient(0, 0, 0, horizon + 60);
  sg.addColorStop(0, '#0d1838'); sg.addColorStop(0.55, '#2c3e78'); sg.addColorStop(0.85, '#7a7aa6'); sg.addColorStop(1, '#d6a28c');
  c.fillStyle = sg; c.fillRect(0, 0, W, horizon + 60);
  c.fillStyle = '#1a2450'; c.fillRect(0, horizon + 50, W, H);
  // a few stars
  for (let i = 0; i < 50; i++) glow(g, hash1(i * 3.3) * W, hash1(i * 7.7) * horizon * 0.7, 3, '#dfe6ff', 0.25 + 0.2 * Math.sin(f.tc * 2 + i));
  const FOC = 900, ROW_D = 60;
  const first = Math.max(1, Math.floor(camZ / ROW_D) + 1);
  // draw far to near
  for (let i = first + 30; i >= first; i--) {
    const d = i * ROW_D - camZ;
    if (d < 6) continue;
    const k = FOC / d;                         // px per world unit at this depth
    const baseY = horizon + camH * k;          // ground line of this row (bottom of walls)
    const wallH = 7 * k, roofH = 6 * k;        // metres
    const houseW = 6 * k;
    const xoff = (hash1(i * 1.37) - 0.5) * houseW;
    const fade = clamp(1 - d / (ROW_D * 42));
    const haze = 1 - fade;
    const n0 = Math.floor((-W / 2) / houseW) - 2, n1 = Math.ceil((W / 2) / houseW) + 2;
    // walls band
    const wy = baseY - wallH, ry = wy - roofH;
    c.fillStyle = mixc('#3a2a3a', '#2a3466', haze * 0.85);
    c.fillRect(0, wy, W, wallH + 2);
    // roofs: snowy band
    const rg = c.createLinearGradient(0, ry, 0, wy);
    rg.addColorStop(0, mixc('#c3cfee', '#56689c', haze)); rg.addColorStop(1, mixc('#7f90c4', '#3e4e84', haze));
    c.fillStyle = rg; c.fillRect(0, ry, W, roofH + 1);
    const far = houseW < 26;
    if (far) {
      // far rows: a band of window glow + a dotted line of lights (cheap)
      c.fillStyle = mixc('#c98a50', '#5a5470', haze); c.globalAlpha = 0.5 * fade;
      c.fillRect(0, wy + wallH * 0.25, W, Math.max(1, wallH * 0.25)); c.globalAlpha = 1;
      const step = Math.max(5, houseW / 4);
      let b = 0;
      for (let x = (xoff % step + step) % step; x < W; x += step, b++) {
        const col = BULB_SEQ[(((b + i * 3) % 5) + 5) % 5];
        const by = wy + 0.2 * k + Math.sin((x / houseW) * Math.PI * 2) * 0.25 * k;
        c.fillStyle = col; c.globalAlpha = 0.85 * fade; c.fillRect(x - 0.9, by - 0.9, 1.8, 1.8); c.globalAlpha = 1;
        if (b % 2 === 0) glow(g, x, by, 5, col, 0.3 * fade);
      }
    } else for (let n = n0; n <= n1; n++) {
      const x = W / 2 + xoff + n * houseW;
      const dark = o.darkRow === i && n === 0;
      // chimney + smoke on party walls
      if ((n + i) % 2 === 0) {
        c.fillStyle = mixc('#5a3a40', '#2c3668', haze);
        c.fillRect(x - 0.5 * k, ry - 1.8 * k, 1.0 * k, 1.9 * k);
        c.fillStyle = mixc('#c3cfee', '#56689c', haze); c.fillRect(x - 0.6 * k, ry - 1.9 * k, 1.2 * k, 0.3 * k);
        if (k > 0.8 && !dark) {
          for (let s = 0; s < 4; s++) {
            const u = (f.tc * 0.2 + s / 4 + hash1(n * 3 + i)) % 1;
            c.fillStyle = `rgba(160,170,210,${0.12 * (1 - u) * fade})`;
            c.beginPath(); c.arc(x + u * 3 * k, ry - 2 * k - u * 6 * k, (0.6 + u * 1.8) * k, 0, TAU); c.fill();
          }
        }
      }
      // windows (top floor) warm unless dark house
      const wl = !dark && hash2(n, i) > 0.25;
      c.fillStyle = wl ? mixc('#f2b062', '#a06a50', haze * 0.6) : '#141c3c';
      c.fillRect(x + 1.2 * k, wy + 1.4 * k, 1.2 * k, 1.6 * k); c.fillRect(x + 3.6 * k, wy + 1.4 * k, 1.2 * k, 1.6 * k);
      if (wl && k > 0.25) glow(g, x + 3 * k, wy + 2.2 * k, 3.5 * k, '#ffb060', 0.12 * fade);
      // gutter lights
      if (!dark) {
        const nb = Math.max(2, Math.min(12, Math.round(houseW / 7)));
        for (let b = 0; b < nb; b++) {
          const bx = x + ((b + 0.5) / nb) * houseW, by = wy + Math.sin(((b + 0.5) / nb) * Math.PI) * 0.35 * k + 0.2 * k;
          const col = BULB_SEQ[(((b + n + i * 3) % 5) + 5) % 5];
          const tw = 0.75 + 0.25 * Math.sin(f.tc * 2.5 + b * 1.7 + n);
          const r = Math.max(0.8, 0.18 * k);
          c.fillStyle = col; c.globalAlpha = fade; c.beginPath(); c.arc(bx, by, r, 0, TAU); c.fill(); c.globalAlpha = 1;
          glow(g, bx, by, Math.max(3, r * 4), col, 0.45 * tw * fade);
        }
      }
    }
    // street gap with lamps in front of the row
    if (k > 0.4) for (let n = n0; n <= n1; n += 3) {
      const lx = W / 2 + xoff + n * houseW + houseW * 0.5;
      glow(g, lx, baseY + 0.5 * k, 3 * k, '#ffcf8a', 0.25 * fade);
    }
  }
  // haze near horizon
  const hz = c.createLinearGradient(0, horizon - 40, 0, horizon + 120);
  hz.addColorStop(0, 'rgba(120,120,170,0)'); hz.addColorStop(0.5, 'rgba(120,120,170,0.25)'); hz.addColorStop(1, 'rgba(120,120,170,0)');
  c.fillStyle = hz; c.fillRect(0, horizon - 40, W, 160);
}
function mixc(a: string, b: string, t: number): string {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
  const r = lerp((A >> 16) & 255, (B >> 16) & 255, t), g = lerp((A >> 8) & 255, (B >> 8) & 255, t), bl = lerp(A & 255, B & 255, t);
  return `rgb(${r | 0},${g | 0},${bl | 0})`;
}

// ---------------------------------------------------------------- J1: the rise to space (top-down)
interface TownDot { x: number; y: number; c: string; b: number }
let TOWN: TownDot[] | null = null;
/** Procedural town: streets of houses (metres), centred on Grandad's house at (0,0). */
function town(): TownDot[] {
  if (TOWN) return TOWN;
  const r = new RNG(77);
  const out: TownDot[] = [];
  // a gently curving grid of terraced streets within ~3 km, sparser further out
  for (let row = -120; row <= 120; row++) {
    const y0 = row * 32;
    for (let x = -3600; x <= 3600; x += 6.5) {
      const bend = noise1(x * 0.0007 + row * 0.13, 5) * 60;
      const y = y0 + bend;
      const dist = Math.hypot(x, y);
      const dens = smoothstep(4200, 600, dist) * (0.55 + 0.45 * smoothstep(-0.2, 0.4, fbm2(x * 0.0006, y * 0.0006, 3, 9)));
      if (r.next() > dens) continue;
      if (Math.abs(noise2(x * 0.0012, y * 0.0012, 3)) < 0.06) continue; // parks / river gaps
      const lit = r.next();
      out.push({ x, y, c: lit < 0.55 ? '#ffb868' : BULB_SEQ[Math.floor(r.next() * 5)], b: 0.35 + r.next() * 0.65 });
    }
  }
  TOWN = out;
  return out;
}
let REGION: { x: number; y: number; s: number; b: number }[] | null = null;
function region() {
  if (REGION) return REGION;
  const r = new RNG(91);
  const out: { x: number; y: number; s: number; b: number }[] = [];
  // other towns and cities (km scale), clustered along "land"
  for (let i = 0; i < 900; i++) {
    const x = r.range(-900, 900), y = r.range(-900, 900);
    const land = fbm2(x * 0.003 + 3, y * 0.003, 4, 2);
    if (land < -0.05) continue;
    if (Math.hypot(x, y) < 6) continue;
    out.push({ x: x * 1000, y: y * 1000, s: r.next() < 0.06 ? r.range(3, 9) : r.range(0.5, 2.5), b: r.range(0.2, 0.8) });
  }
  REGION = out;
  return out;
}

/**
 * Top-down rise. alt = camera altitude in metres. ppm = pixels per metre at the ground.
 * The house blaze at (0,0) is always the brightest point.
 */
export function riseView(f: F, alt: number, o: { blaze?: number } = {}) {
  const c = f.ctx, g = f.glow;
  const ppm = 900 / alt; // px per metre
  const cx = W / 2, cy = H / 2;
  const P = (x: number, y: number): V2 => v2(cx + x * ppm, cy + y * ppm);
  // ground / night
  c.fillStyle = alt < 3000 ? '#1a2246' : '#0c1230'; c.fillRect(0, 0, W, H);
  const earthT = smoothstep(60000, 900000, alt);   // 0 = flat ground, 1 = full Earth view
  // ---- near: street level top-down (houses as roofs) ----
  if (alt < 0) {
    const a = 1 - smoothstep(600, 1500, alt);
    for (let row = -8; row <= 8; row++) {
      const y0 = row * 32;
      for (let n = -50; n <= 50; n++) {
        const x = n * 6.5 - 3.25, p = P(x, y0 - 5), w = 6.5 * ppm, h = 10 * ppm;
        if (p.x + w < 0 || p.x > W || p.y + h < 0 || p.y > H) continue;
        const isG = row === 0 && n === 0;
        // roof: snow with a ridge line
        c.globalAlpha = a;
        c.fillStyle = '#b5c3e6'; c.fillRect(p.x, p.y, w - 0.6 * ppm, h);
        c.fillStyle = '#8b9bcd'; c.fillRect(p.x, p.y + h * 0.5, w - 0.6 * ppm, h * 0.5);
        c.fillStyle = '#6a3a3a'; if ((n & 1) === 0) c.fillRect(p.x - 0.5 * ppm, p.y + h * 0.4, 1 * ppm, 2 * ppm);
        c.globalAlpha = 1;
        // lights along the gutter (front edge) for everyone, all edges for Grandad's
        const nb = Math.max(2, Math.round(w / 6));
        const edges: [V2, V2][] = isG ? [[v2(p.x, p.y), v2(p.x + w, p.y)], [v2(p.x + w, p.y), v2(p.x + w, p.y + h)], [v2(p.x + w, p.y + h), v2(p.x, p.y + h)], [v2(p.x, p.y + h), v2(p.x, p.y)], [v2(p.x, p.y + h / 2), v2(p.x + w, p.y + h / 2)]] : [[v2(p.x, p.y + h), v2(p.x + w, p.y + h)]];
        for (const [e0, e1] of edges) {
          const m = isG ? nb * 2 : nb;
          for (let b = 0; b < m; b++) {
            const u = (b + 0.5) / m;
            const bx = lerp(e0.x, e1.x, u), by = lerp(e0.y, e1.y, u);
            const col = BULB_SEQ[(((b + n + row) % 5) + 5) % 5];
            const rr = Math.max(0.7, 0.14 * ppm);
            c.fillStyle = col; c.beginPath(); c.arc(bx, by, rr, 0, TAU); c.fill();
            glow(g, bx, by, Math.max(2.5, rr * (isG ? 5 : 4)), col, (isG ? 0.6 : 0.4) * a);
          }
        }
      }
      // street with lamps
      const sy = P(0, y0 + 9).y;
      c.fillStyle = `rgba(40,52,100,${a})`; c.fillRect(0, sy, W, 12 * ppm);
    }
  }
  // ---- mid: the town as a map of warm dots ----
  if (alt > 250 && alt < 120000) {
    const a = (1 - smoothstep(40000, 120000, alt));
    const pts = town();
    for (const d of pts) {
      const p = P(d.x, d.y);
      if (p.x < -10 || p.x > W + 10 || p.y < -10 || p.y > H + 10) continue;
      const rr = Math.max(1.1, 2.2 * ppm);
      c.fillStyle = d.c; c.globalAlpha = a * d.b * Math.min(1, 0.35 + ppm); c.fillRect(p.x - rr / 2, p.y - rr / 2, rr, rr); c.globalAlpha = 1;
      if (ppm > 0.12) glow(g, p.x, p.y, Math.max(2, 6 * ppm), d.c, 0.25 * a * d.b * Math.min(1, ppm));
    }
  }
  // ---- far: region and the Earth ----
  if (alt > 20000) {
    const a = smoothstep(20000, 80000, alt);
    // Earth disc: radius 6371 km; camera looks at the dot; as alt grows the limb comes into view below
    const R = 6371000 * ppm;
    const ecx = cx, ecy = cy + R * lerp(1.0, 0.985, earthT) + lerp(0, H * 0.18, earthT);
    if (earthT > 0) {
      // atmosphere
      const ag = c.createRadialGradient(ecx, ecy, R * 0.98, ecx, ecy, R * 1.04);
      ag.addColorStop(0, 'rgba(60,110,220,0.0)'); ag.addColorStop(0.5, `rgba(90,150,255,${0.5 * earthT})`); ag.addColorStop(1, 'rgba(40,80,200,0)');
      c.fillStyle = ag; c.beginPath(); c.arc(ecx, ecy, R * 1.04, 0, TAU); c.fill();
      c.fillStyle = '#0b1638'; c.beginPath(); c.arc(ecx, ecy, R, 0, TAU); c.fill();
      // space above the limb
      c.save(); c.beginPath(); c.rect(0, 0, W, H); c.arc(ecx, ecy, R * 1.035, 0, TAU, true); c.clip('evenodd');
      c.fillStyle = `rgba(3,5,16,${earthT})`; c.fillRect(0, 0, W, H);
      for (let i = 0; i < 160; i++) glow(g, hash1(i * 5.1) * W, hash1(i * 2.9) * H, 2 + hash1(i) * 2.5, '#e6ecff', 0.4 * earthT * (0.5 + 0.5 * hash1(i * 9)));
      c.restore();
      glow(g, ecx, ecy - R, R * 0.06 + 40, '#5f8cff', 0.18 * earthT);
    }
    // land masses (subtle) and other cities
    const reg = region();
    for (const d of reg) {
      const p = P(d.x, d.y);
      if (p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20) continue;
      // foreshorten toward the limb
      const rr = Math.max(0.5, d.s * 1000 * ppm * 0.6);
      glow(g, p.x, p.y, Math.max(1.5, rr * 2), '#ffb060', 0.35 * a * d.b);
      c.fillStyle = `rgba(255,190,110,${0.5 * a * d.b})`; c.fillRect(p.x - rr / 4, p.y - rr / 4, Math.max(0.6, rr / 2), Math.max(0.6, rr / 2));
    }
  }
  // ---- clouds passing (3–9 km): soft puffs, lit from below ----
  const cloudA = smoothstep(2500, 4500, alt) * (1 - smoothstep(9000, 16000, alt));
  if (cloudA > 0.01) softClouds(c, g, P, cloudA, ppm);
  // ---- THE dot: Grandad's house, always the brightest thing ----
  const b = o.blaze ?? 1;
  const pulse = 0.85 + 0.15 * Math.sin(f.tc * 3);
  const dp = P(0, 0);
  if (alt > 300) {
    glow(g, dp.x, dp.y, 26 + 10 * pulse, '#ffd08a', 0.9 * b);
    glow(g, dp.x, dp.y, 7, '#fff6e6', 1.0 * b);
    glow(g, dp.x, dp.y, 90, '#ff9a50', 0.25 * b * pulse);
  }
}

/** Soft cloud puffs (radial gradients on the base layer), world positions in metres. */
export function softClouds(c: C2D, g: C2D, P: (x: number, y: number) => V2, a: number, ppm: number) {
  for (let i = 0; i < 46; i++) {
    const wx = (hash1(i * 3.7) - 0.5) * 30000, wy = (hash1(i * 6.1) - 0.5) * 18000;
    const p = P(wx, wy);
    const rr = (900 + hash1(i * 2.2) * 2200) * ppm;
    if (p.x + rr < 0 || p.x - rr > W || p.y + rr < 0 || p.y - rr > H) continue;
    const gr = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr);
    gr.addColorStop(0, `rgba(120,132,180,${0.32 * a})`); gr.addColorStop(0.55, `rgba(100,112,165,${0.16 * a})`); gr.addColorStop(1, 'rgba(90,100,150,0)');
    c.fillStyle = gr; c.fillRect(p.x - rr, p.y - rr, rr * 2, rr * 2);
    glow(g, p.x, p.y + rr * 0.3, rr * 0.7, '#ff9a60', 0.04 * a);
  }
}

/** The Earth at night, oblique: the limb arcs across the top, city lights below, our dot the brightest. earthT 0..1 */
export function earthView(f: F, earthT: number, zoom: number) {
  const c = f.ctx, g = f.glow;
  c.fillStyle = '#03050f'; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 180; i++) glow(g, hash1(i * 5.1) * W, hash1(i * 2.9) * H * 0.6, 1.6 + hash1(i) * 2.2, '#e6ecff', 0.35 * (0.4 + 0.6 * hash1(i * 9)));
  const R = W * lerp(3.2, 0.95, zoom);
  const limbY = lerp(H * 0.12, H * 0.34, zoom);
  const ecx = W / 2, ecy = limbY + R;
  // atmosphere
  const ag = c.createRadialGradient(ecx, ecy, R * 0.995, ecx, ecy, R * 1.035);
  ag.addColorStop(0, 'rgba(80,140,255,0.0)'); ag.addColorStop(0.35, 'rgba(110,170,255,0.55)'); ag.addColorStop(1, 'rgba(40,80,200,0)');
  c.fillStyle = ag; c.beginPath(); c.arc(ecx, ecy, R * 1.035, 0, TAU); c.fill();
  // night side
  const eg = c.createRadialGradient(ecx, limbY, 10, ecx, limbY + H, H * 1.2);
  eg.addColorStop(0, '#16285a'); eg.addColorStop(1, '#070d24');
  c.fillStyle = eg; c.beginPath(); c.arc(ecx, ecy, R, 0, TAU); c.fill();
  glow(g, ecx, limbY, W * 0.6, '#4f7cff', 0.10);
  // land masses: faint darker/lighter mottling
  c.save(); c.beginPath(); c.arc(ecx, ecy, R, 0, TAU); c.clip();
  for (let i = 0; i < 40; i++) {
    const x = hash1(i * 1.9) * W, yy = limbY + Math.pow(hash1(i * 4.3), 1.6) * (H - limbY);
    const fs = (yy - limbY) / (H - limbY);
    c.fillStyle = 'rgba(30,48,90,0.35)'; c.beginPath(); c.ellipse(x, yy, 160 * (0.3 + fs), 50 * (0.2 + fs), 0, 0, TAU); c.fill();
  }
  // city lights: clusters, foreshortened toward the limb
  const reg = region();
  for (const d of reg) {
    const u = (d.x / 1000 + 900) / 1800, v = (d.y / 1000 + 900) / 1800;
    const x = u * W * 1.3 - W * 0.15;
    const fs = Math.pow(v, 1.5);
    const yy = limbY + 8 + fs * (H - limbY) * 1.05;
    const s2 = d.s * lerp(0.35, 1.2, fs);
    glow(g, x, yy, Math.max(2, s2 * 2.6), '#ffb060', 0.75 * d.b);
    c.fillStyle = `rgba(255,205,130,${0.85 * d.b})`; c.fillRect(x - s2 * 0.3, yy - s2 * 0.15, Math.max(0.8, s2 * 0.6), Math.max(0.6, s2 * 0.3));
  }
  c.restore();
  // OUR dot
  const dx = W / 2, dy = lerp(H * 0.55, H * 0.6, zoom);
  const pulse = 0.85 + 0.15 * Math.sin(f.tc * 3);
  glow(g, dx, dy, 24 + 8 * pulse, '#ffd08a', 0.95);
  glow(g, dx, dy, 6, '#fff6e6', 1.0);
  glow(g, dx, dy, 80, '#ff9a50', 0.28 * pulse);
  void earthT;
}
