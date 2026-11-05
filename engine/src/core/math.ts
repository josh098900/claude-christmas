// Core math, deterministic randomness, noise and easing.
// Everything in the film is a pure function of frame number, so all randomness is seeded.

export const TAU = Math.PI * 2;
export const clamp = (x: number, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const invLerp = (a: number, b: number, x: number) => clamp((x - a) / (b - a));
export const remap = (x: number, a: number, b: number, c: number, d: number) => lerp(c, d, invLerp(a, b, x));
export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const smootherstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * t * (t * (t * 6 - 15) + 10);
};
export const fract = (x: number) => x - Math.floor(x);
export const mix = lerp;

// ---------- easing ----------
export const ease = {
  linear: (t: number) => t,
  inQuad: (t: number) => t * t,
  outQuad: (t: number) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  inCubic: (t: number) => t * t * t,
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  inOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
  outSine: (t: number) => Math.sin((t * Math.PI) / 2),
  inSine: (t: number) => 1 - Math.cos((t * Math.PI) / 2),
  outBack: (t: number) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  inBack: (t: number) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  },
  outElastic: (t: number) => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
  inOutExpo: (t: number) =>
    t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
};
export type EaseFn = (t: number) => number;

// ---------- seeded RNG ----------
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hash1(n: number): number {
  let x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}
export function hash2(x: number, y: number): number {
  let h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return h - Math.floor(h);
}
export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
export class RNG {
  private r: () => number;
  constructor(seed: number | string) {
    this.r = mulberry32(typeof seed === 'string' ? hashStr(seed) : seed);
  }
  next() { return this.r(); }
  range(a: number, b: number) { return a + (b - a) * this.r(); }
  int(a: number, b: number) { return Math.floor(this.range(a, b + 1)); }
  pick<T>(arr: T[]): T { return arr[Math.floor(this.r() * arr.length) % arr.length]; }
  gauss() { return (this.r() + this.r() + this.r() - 1.5) / 1.5; }
  chance(p: number) { return this.r() < p; }
}

// ---------- value noise ----------
function smooth(t: number) { return t * t * (3 - 2 * t); }
export function noise1(x: number, seed = 0): number {
  const i = Math.floor(x), f = x - i;
  return lerp(hash1(i + seed * 57.3), hash1(i + 1 + seed * 57.3), smooth(f)) * 2 - 1;
}
export function noise2(x: number, y: number, seed = 0): number {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const s = seed * 19.19;
  const a = hash2(ix + s, iy), b = hash2(ix + 1 + s, iy), c = hash2(ix + s, iy + 1), d = hash2(ix + 1 + s, iy + 1);
  const ux = smooth(fx), uy = smooth(fy);
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy) * 2 - 1;
}
export function fbm1(x: number, oct = 3, seed = 0): number {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { s += noise1(x * f, seed + i * 13) * a; n += a; a *= 0.5; f *= 2.03; }
  return s / n;
}
export function fbm2(x: number, y: number, oct = 3, seed = 0): number {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { s += noise2(x * f, y * f, seed + i * 7) * a; n += a; a *= 0.5; f *= 2.01; }
  return s / n;
}

// ---------- vectors ----------
export type V2 = { x: number; y: number };
export const v2 = (x: number, y: number): V2 => ({ x, y });
export const vadd = (a: V2, b: V2) => v2(a.x + b.x, a.y + b.y);
export const vsub = (a: V2, b: V2) => v2(a.x - b.x, a.y - b.y);
export const vscale = (a: V2, s: number) => v2(a.x * s, a.y * s);
export const vlen = (a: V2) => Math.hypot(a.x, a.y);
export const vnorm = (a: V2) => { const l = vlen(a) || 1; return v2(a.x / l, a.y / l); };
export const vlerp = (a: V2, b: V2, t: number) => v2(lerp(a.x, b.x, t), lerp(a.y, b.y, t));
export const vrot = (a: V2, ang: number) => { const c = Math.cos(ang), s = Math.sin(ang); return v2(a.x * c - a.y * s, a.x * s + a.y * c); };
export const polar = (ang: number, r: number) => v2(Math.cos(ang) * r, Math.sin(ang) * r);

// ---------- colour ----------
export type RGB = [number, number, number];
export function hex(h: string): RGB {
  const s = h.replace('#', '');
  const n = parseInt(s.length === 3 ? s.split('').map((c) => c + c).join('') : s, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function rgbStr(c: RGB, a = 1): string {
  return a >= 1 ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a.toFixed(4)})`;
}
export function mixHex(a: string, b: string, t: number, alpha = 1): string {
  const A = hex(a), B = hex(b);
  return rgbStr([lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t)], alpha);
}
export function shade(h: string, k: number, alpha = 1): string {
  // k<0 darken toward a cool shadow, k>0 lighten toward warm
  const c = hex(h);
  if (k < 0) {
    const s: RGB = [30, 32, 60];
    return rgbStr([lerp(c[0], s[0], -k), lerp(c[1], s[1], -k), lerp(c[2], s[2], -k)], alpha);
  }
  const w: RGB = [255, 246, 228];
  return rgbStr([lerp(c[0], w[0], k), lerp(c[1], w[1], k), lerp(c[2], w[2], k)], alpha);
}
export function withAlpha(h: string, a: number): string { return rgbStr(hex(h), a); }
