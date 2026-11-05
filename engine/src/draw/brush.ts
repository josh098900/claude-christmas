// Hand-made shape primitives: everything is slightly irregular, nothing is a perfect vector shape.
import { C2D } from '../core/stage';
import { V2, v2, hash2, noise1, TAU, lerp } from '../core/math';

/** Deterministic jitter in [-1,1] for (seed, index), optionally boiling with the drawing index. */
export function jit(seed: number, i: number, boil = 0): number {
  return hash2(seed * 0.731 + i * 1.913, boil * 3.17 + seed * 0.11) * 2 - 1;
}

/** Smooth closed path through points (Catmull-Rom converted to Béziers). */
export function smoothClosed(ctx: C2D, p: V2[], tension = 1) {
  const n = p.length;
  if (n < 3) return;
  ctx.moveTo(p[0].x, p[0].y);
  for (let i = 0; i < n; i++) {
    const p0 = p[(i - 1 + n) % n], p1 = p[i], p2 = p[(i + 1) % n], p3 = p[(i + 2) % n];
    const k = tension / 6;
    ctx.bezierCurveTo(p1.x + (p2.x - p0.x) * k, p1.y + (p2.y - p0.y) * k, p2.x - (p3.x - p1.x) * k, p2.y - (p3.y - p1.y) * k, p2.x, p2.y);
  }
  ctx.closePath();
}
/** Smooth open path through points. */
export function smoothOpen(ctx: C2D, p: V2[], tension = 1, move = true) {
  const n = p.length;
  if (n < 2) return;
  if (move) ctx.moveTo(p[0].x, p[0].y); else ctx.lineTo(p[0].x, p[0].y);
  for (let i = 0; i < n - 1; i++) {
    const p0 = p[Math.max(0, i - 1)], p1 = p[i], p2 = p[i + 1], p3 = p[Math.min(n - 1, i + 2)];
    const k = tension / 6;
    ctx.bezierCurveTo(p1.x + (p2.x - p0.x) * k, p1.y + (p2.y - p0.y) * k, p2.x - (p3.x - p1.x) * k, p2.y - (p3.y - p1.y) * k, p2.x, p2.y);
  }
}

/** Jitter a polygon's points (handmade irregularity + optional boil). */
export function rough(p: V2[], amp: number, seed: number, boil = 0, boilAmp = 0): V2[] {
  return p.map((q, i) => v2(q.x + jit(seed, i * 2) * amp + jit(seed + 9, i * 2, boil) * boilAmp, q.y + jit(seed, i * 2 + 1) * amp + jit(seed + 9, i * 2 + 1, boil) * boilAmp));
}

/** Subdivide a polygon so straight edges can wobble. */
export function subdivide(p: V2[], step: number, closed = true): V2[] {
  const out: V2[] = [];
  const n = p.length;
  const m = closed ? n : n - 1;
  for (let i = 0; i < m; i++) {
    const a = p[i], b = p[(i + 1) % n];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const k = Math.max(1, Math.round(len / step));
    for (let j = 0; j < k; j++) out.push(v2(lerp(a.x, b.x, j / k), lerp(a.y, b.y, j / k)));
  }
  if (!closed) out.push(p[n - 1]);
  return out;
}

/** A hand-drawn polygon: straight-ish edges with gentle wobble and slightly softened corners. */
export function handPoly(ctx: C2D, pts: V2[], seed: number, wobble = 1.2, step = 40) {
  const sub = subdivide(pts, step, true);
  const r = sub.map((q, i) => v2(q.x + noise1(i * 0.7, seed) * wobble, q.y + noise1(i * 0.7 + 50, seed) * wobble));
  ctx.moveTo(r[0].x, r[0].y);
  for (let i = 1; i < r.length; i++) ctx.lineTo(r[i].x, r[i].y);
  ctx.closePath();
}

export function handRect(ctx: C2D, x: number, y: number, w: number, h: number, seed: number, wobble = 1.2) {
  handPoly(ctx, [v2(x, y), v2(x + w, y), v2(x + w, y + h), v2(x, y + h)], seed, wobble, Math.max(12, Math.min(w, h) / 2));
}

/** Wobbly ellipse. */
export function blobEllipse(ctx: C2D, cx: number, cy: number, rx: number, ry: number, seed = 0, amp = 0.04, n = 10, rot = 0, boil = 0, boilAmp = 0) {
  const pts: V2[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const k = 1 + jit(seed, i) * amp + jit(seed + 3, i, boil) * boilAmp;
    const x = Math.cos(a) * rx * k, y = Math.sin(a) * ry * k;
    pts.push(v2(cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)));
  }
  smoothClosed(ctx, pts);
}

/** Fill helpers */
export function fillWith(ctx: C2D, style: string | CanvasGradient, build: () => void) {
  ctx.beginPath(); build(); ctx.fillStyle = style; ctx.fill();
}

/** Thick tapered stroke along points: a limb, a plait, a scarf. */
export function tube(ctx: C2D, pts: V2[], w0: number, w1: number, color: string | CanvasGradient) {
  // build an outline polygon from offset curves
  const n = pts.length;
  if (n < 2) return;
  const L: V2[] = [], R: V2[] = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let dx = b.x - a.x, dy = b.y - a.y; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const w = lerp(w0, w1, i / (n - 1)) / 2;
    L.push(v2(pts[i].x - dy * w, pts[i].y + dx * w));
    R.push(v2(pts[i].x + dy * w, pts[i].y - dx * w));
  }
  ctx.beginPath();
  smoothOpen(ctx, L, 1, true);
  // round end cap
  const e = pts[n - 1], ew = w1 / 2;
  const ea = Math.atan2(L[n - 1].y - e.y, L[n - 1].x - e.x);
  ctx.arc(e.x, e.y, ew, ea, ea - Math.PI, true);
  smoothOpen(ctx, R.reverse(), 1, false);
  const s = pts[0], sw = w0 / 2;
  const sa = Math.atan2(R[R.length - 1].y - s.y, R[R.length - 1].x - s.x);
  ctx.arc(s.x, s.y, sw, sa, sa - Math.PI, true);
  ctx.closePath();
  ctx.fillStyle = color; ctx.fill();
}

/** A pencil line: a slightly irregular stroke made from a few overlapping passes. */
export function pencilLine(ctx: C2D, pts: V2[], width: number, color: string, seed = 0, passes = 2, alpha = 0.85, tension = 1) {
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let p = 0; p < passes; p++) {
    const off = pts.map((q, i) => v2(q.x + jit(seed + p * 31, i * 2) * width * 0.35, q.y + jit(seed + p * 31, i * 2 + 1) * width * 0.35));
    ctx.beginPath(); smoothOpen(ctx, off, tension);
    ctx.strokeStyle = color; ctx.globalAlpha = alpha * (p === 0 ? 1 : 0.55); ctx.lineWidth = width * (p === 0 ? 1 : 0.7);
    ctx.stroke();
  }
  ctx.restore();
}

/** Radial soft spot (for glows, blush, light pools). */
export function softSpot(ctx: C2D, x: number, y: number, r: number, color: string, alpha = 1, inner = 0) {
  const g = ctx.createRadialGradient(x, y, r * inner, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.restore();
}

/** Linear vertical gradient fill of a rect. */
export function vgrad(ctx: C2D, x: number, y: number, w: number, h: number, stops: [number, string][]) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  for (const [o, c] of stops) g.addColorStop(o, c);
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
}
