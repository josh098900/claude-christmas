// Light: bulbs, strings of lights, glow sprites, shafts, torch beams.
import { C2D, F } from '../core/stage';
import { V2, v2, hash1, hash2, lerp, clamp, TAU, noise1 } from '../core/math';

export const BULB = {
  red: '#ff3b2e',
  green: '#2fd665',
  blue: '#3f7dff',
  amber: '#ffae2b',
  white: '#fff1cf',
};
export const BULB_SEQ = [BULB.red, BULB.green, BULB.amber, BULB.blue, BULB.white];
// off-state glass colours (dull, cold)
const OFF: Record<string, string> = {
  [BULB.red]: '#5a2a33', [BULB.green]: '#25443a', [BULB.blue]: '#26304f', [BULB.amber]: '#5a4630', [BULB.white]: '#5d6070',
};

// ---- glow sprite cache ----
const spriteCache = new Map<string, HTMLCanvasElement>();
export function glowSprite(color: string, falloff = 2.2): HTMLCanvasElement {
  const key = color + falloff;
  let c = spriteCache.get(key);
  if (c) return c;
  const N = 128;
  c = document.createElement('canvas'); c.width = N; c.height = N;
  const x = c.getContext('2d')!;
  const img = x.createImageData(N, N);
  const m = /#(..)(..)(..)/.exec(color)!;
  const r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const d = Math.hypot(i - N / 2 + 0.5, j - N / 2 + 0.5) / (N / 2);
    const a = d >= 1 ? 0 : Math.pow(1 - d, falloff) * (1 - d * 0.15);
    const k = (j * N + i) * 4;
    img.data[k] = r; img.data[k + 1] = g; img.data[k + 2] = b; img.data[k + 3] = Math.round(a * 255);
  }
  x.putImageData(img, 0, 0);
  spriteCache.set(key, c);
  return c;
}
/** Additive glow blob. Draw into f.glow. */
export function glow(ctx: C2D, x: number, y: number, r: number, color: string, a = 1, falloff = 2.2) {
  if (a <= 0.003 || r <= 0.2) return;
  const s = glowSprite(color, falloff);
  const ga = ctx.globalAlpha; ctx.globalAlpha = ga * clamp(a, 0, 1);
  ctx.drawImage(s, x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = ga;
}

export interface BulbOpts { size: number; on: number; color: string; angle?: number; glowR?: number; glowA?: number; flick?: number; }
/** One old-fashioned bulb: teardrop glass on a small dark cap. `on` 0..1. */
export function bulb(f: F, x: number, y: number, o: BulbOpts) {
  const { ctx, glow: g } = f;
  const s = o.size, on = clamp(o.on);
  ctx.save();
  ctx.translate(x, y); ctx.rotate(o.angle || 0);
  // cap
  ctx.fillStyle = '#1d2a24';
  ctx.fillRect(-s * 0.28, -s * 0.55, s * 0.56, s * 0.42);
  // glass (teardrop pointing down/out)
  ctx.beginPath();
  ctx.moveTo(-s * 0.36, -s * 0.2);
  ctx.bezierCurveTo(-s * 0.55, s * 0.35, -s * 0.18, s * 0.95, 0, s * 1.05);
  ctx.bezierCurveTo(s * 0.18, s * 0.95, s * 0.55, s * 0.35, s * 0.36, -s * 0.2);
  ctx.closePath();
  const off = OFF[o.color] || '#444';
  if (on <= 0.001) {
    ctx.fillStyle = off; ctx.fill();
    ctx.fillStyle = 'rgba(200,215,255,0.18)';
    ctx.beginPath(); ctx.ellipse(-s * 0.12, s * 0.2, s * 0.08, s * 0.2, 0.3, 0, TAU); ctx.fill();
  } else {
    const gr = ctx.createRadialGradient(0, s * 0.35, 0, 0, s * 0.35, s * 0.8);
    gr.addColorStop(0, '#fffbea');
    gr.addColorStop(0.35, o.color);
    gr.addColorStop(1, o.color);
    ctx.globalAlpha = 1;
    ctx.fillStyle = off; ctx.fill();
    ctx.globalAlpha = on; ctx.fillStyle = gr; ctx.fill();
  }
  ctx.restore();
  if (on > 0.001) {
    const fl = 1 + (o.flick || 0);
    const gr = (o.glowR ?? s * 4) * fl;
    const ga = (o.glowA ?? 0.32) * on;
    const cx = x + Math.sin(o.angle || 0) * -s * 0.4, cy = y + Math.cos(o.angle || 0) * s * 0.4;
    glow(g, cx, cy, gr, o.color, ga);
    glow(g, cx, cy, s * 1.2, '#fff6dc', 0.3 * on);
  }
}

/** Catenary-ish sag between two anchor points. */
export function sagPoint(a: V2, b: V2, t: number, sag: number): V2 {
  return v2(lerp(a.x, b.x, t), lerp(a.y, b.y, t) + Math.sin(t * Math.PI) * sag);
}

export interface StringOpts {
  anchors: V2[];          // swag points
  spacing: number;        // px between bulbs
  size: number;           // bulb size
  sag?: number;           // sag per swag (px) or fraction of span if < 1
  on?: number | ((i: number, p: V2) => number);
  seed?: number;
  wire?: string;
  wireW?: number;
  glowR?: number; glowA?: number;
  colors?: string[];
  twinkle?: number; // 0..1 amount of flicker
  hang?: number;    // bulb hang angle variation
}
/** Draws a string of lights; returns the bulb positions. */
export function lightString(f: F, o: StringOpts): { p: V2; c: string }[] {
  const { ctx } = f;
  const seed = o.seed ?? 1;
  const cols = o.colors || BULB_SEQ;
  const pts: V2[] = [];
  // sample along swags
  for (let s = 0; s < o.anchors.length - 1; s++) {
    const a = o.anchors[s], b = o.anchors[s + 1];
    const span = Math.hypot(b.x - a.x, b.y - a.y);
    const sag = o.sag === undefined ? span * 0.08 : o.sag < 1 ? span * o.sag : o.sag;
    const n = Math.max(2, Math.ceil(span / 3));
    for (let i = 0; i <= n; i++) { if (s > 0 && i === 0) continue; pts.push(sagPoint(a, b, i / n, sag)); }
  }
  // wire
  ctx.save();
  ctx.strokeStyle = o.wire || '#1c2b25'; ctx.lineWidth = o.wireW ?? Math.max(1, o.size * 0.16);
  ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (const p of pts) ctx.lineTo(p.x, p.y); ctx.stroke();
  ctx.restore();
  // bulbs at arc-length spacing
  const out: { p: V2; c: string }[] = [];
  let acc = o.spacing * 0.5, idx = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    acc += d;
    while (acc >= o.spacing) {
      acc -= o.spacing;
      const t = 1 - acc / d;
      const p = v2(lerp(a.x, b.x, t), lerp(a.y, b.y, t));
      const c = cols[(((idx + Math.floor(seed)) % cols.length) + cols.length) % cols.length];
      const on = typeof o.on === 'function' ? o.on(idx, p) : o.on ?? 1;
      const tw = o.twinkle ? (noise1(f.tc * 3 + idx * 1.7, seed) * 0.5) * o.twinkle : 0;
      const ang = (hash1(idx * 3.1 + seed) - 0.5) * (o.hang ?? 0.5);
      bulb(f, p.x, p.y, { size: o.size, on: clamp(on * (1 + tw)), color: c, angle: ang, glowR: o.glowR, glowA: o.glowA, flick: tw * 0.3 });
      out.push({ p, c });
      idx++;
    }
  }
  return out;
}

/** Cheap distant lights: just coloured dots + glow, no wire detail. */
export function dotLights(f: F, pts: V2[], size: number, on: number | ((i: number) => number), seed = 0, glowR = 6, glowA = 0.5, colors = BULB_SEQ) {
  const { ctx, glow: g } = f;
  for (let i = 0; i < pts.length; i++) {
    const c = colors[(((i + seed) % colors.length) + colors.length) % colors.length];
    const o = typeof on === 'function' ? on(i) : on;
    const p = pts[i];
    if (o <= 0.01) { ctx.fillStyle = OFF[c] || '#333'; ctx.beginPath(); ctx.arc(p.x, p.y, size, 0, TAU); ctx.fill(); continue; }
    ctx.fillStyle = c; ctx.globalAlpha = 0.6 + 0.4 * o;
    ctx.beginPath(); ctx.arc(p.x, p.y, size, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
    glow(g, p.x, p.y, glowR, c, glowA * o);
    glow(g, p.x, p.y, size * 1.6, '#fff6dc', 0.6 * o);
  }
}

/** A cone of light (torch beam / window shaft) drawn into the glow layer. */
export function beam(ctx: C2D, from: V2, dir: number, len: number, spread: number, color: string, a: number, w0 = 4) {
  if (a <= 0.002) return;
  const ex = from.x + Math.cos(dir) * len, ey = from.y + Math.sin(dir) * len;
  const nx = -Math.sin(dir), ny = Math.cos(dir);
  const w1 = Math.tan(spread) * len;
  const g = ctx.createLinearGradient(from.x, from.y, ex, ey);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.fillStyle = g;
  ctx.filter = `blur(${Math.max(2, w1 * 0.08)}px)`;
  ctx.beginPath();
  ctx.moveTo(from.x + nx * w0, from.y + ny * w0);
  ctx.lineTo(ex + nx * w1, ey + ny * w1);
  ctx.lineTo(ex - nx * w1, ey - ny * w1);
  ctx.lineTo(from.x - nx * w0, from.y - ny * w0);
  ctx.closePath(); ctx.fill();
  // brighter core
  ctx.globalAlpha *= 0.6;
  ctx.beginPath();
  ctx.moveTo(from.x + nx * w0 * 0.5, from.y + ny * w0 * 0.5);
  ctx.lineTo(ex + nx * w1 * 0.4, ey + ny * w1 * 0.4);
  ctx.lineTo(ex - nx * w1 * 0.4, ey - ny * w1 * 0.4);
  ctx.lineTo(from.x - nx * w0 * 0.5, from.y - ny * w0 * 0.5);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

/** Parallelogram light shaft (window light falling into a room). */
export function shaft(ctx: C2D, quad: V2[], color: string, a: number, blur = 18) {
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.filter = `blur(${blur}px)`;
  const g = ctx.createLinearGradient(quad[0].x, quad[0].y, quad[3].x, quad[3].y);
  g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(quad[0].x, quad[0].y); for (let i = 1; i < quad.length; i++) ctx.lineTo(quad[i].x, quad[i].y); ctx.closePath(); ctx.fill();
  ctx.restore();
}

/** Dust motes floating inside a region, lit (glow layer). */
export function motes(f: F, cx: number, cy: number, rx: number, ry: number, n: number, color: string, a: number, seed = 0) {
  for (let i = 0; i < n; i++) {
    const px = cx + (hash1(i * 7.3 + seed) - 0.5) * 2 * rx + noise1(f.t * 0.4 + i, seed) * 14;
    const py = cy + (hash1(i * 3.1 + seed + 9) - 0.5) * 2 * ry + noise1(f.t * 0.3 + i * 1.3, seed + 4) * 10 - f.t * 4 * hash1(i);
    const s = 1 + hash1(i * 11.1 + seed) * 2.2;
    glow(f.glow, px, py, s * 2.5, color, a * (0.4 + 0.6 * hash2(i, seed)));
  }
}
