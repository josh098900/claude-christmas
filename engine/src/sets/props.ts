// Props for sequences C, D, E: hands, the sledge, dusty labelled boxes, coils, advent calendar.
import { C2D, F } from '../core/stage';
import { V2, v2, lerp, clamp, hash1, noise1, TAU, RNG } from '../core/math';
import { handRect, blobEllipse, smoothOpen, tube } from '../draw/brush';
import { bulb, BULB_SEQ, glow } from '../draw/light';
import { handText, HandStyle } from '../draw/letters';

/** Grandma's handwriting: slanted, neat marker capitals. */
export const GRANDMA_HAND: HandStyle = { slant: 0.18, wobble: 0.6, weight: 0.9, color: '#26222e', baseline: 0.6 };
/** Nell's handwriting: chunky upright felt-tip. */
export const NELL_HAND: HandStyle = { slant: 0.02, wobble: 1.4, weight: 1.45, color: '#22233a', baseline: 1.6 };

/** A hand seen from above: sleeve from `from` to wrist, palm + fingers. pinch 0..1 closes fingers. */
export function topHand(c: C2D, from: V2, wrist: V2, size: number, o: { sleeve?: string; skin?: string; pinch?: number; flip?: number; mitten?: boolean; shadow?: boolean } = {}) {
  const sl = o.sleeve || '#d8a24a', sk = o.skin || '#e8b896';
  const ang = Math.atan2(wrist.y - from.y, wrist.x - from.x);
  const fl = o.flip ?? 1;
  if (o.shadow !== false) {
    c.save(); c.globalAlpha = 0.35; c.filter = `blur(${size * 0.25}px)`;
    tube(c, [v2(from.x + size * 0.3, from.y + size * 0.35), v2(wrist.x + size * 0.3, wrist.y + size * 0.35)], size * 0.95, size * 0.8, '#0a0c1e');
    c.beginPath(); c.arc(wrist.x + Math.cos(ang) * size * 0.6 + size * 0.3, wrist.y + Math.sin(ang) * size * 0.6 + size * 0.35, size * 0.6, 0, TAU); c.fillStyle = '#0a0c1e'; c.fill();
    c.restore();
  }
  tube(c, [from, v2(lerp(from.x, wrist.x, 0.5), lerp(from.y, wrist.y, 0.5) + size * 0.06), wrist], size * 0.95, size * 0.82, sl);
  // ribbed cuff
  c.save(); c.translate(wrist.x, wrist.y); c.rotate(ang);
  c.fillStyle = '#c08b34'; c.beginPath(); blobEllipse(c, -size * 0.1, 0, size * 0.22, size * 0.46, 3, 0.05, 8); c.fill();
  // palm
  c.fillStyle = o.mitten ? '#e3a53a' : sk;
  c.beginPath(); blobEllipse(c, size * 0.42, 0, size * 0.42, size * 0.36, 5, 0.04, 9); c.fill();
  if (!o.mitten) {
    const p = clamp(o.pinch ?? 0);
    for (let i = 0; i < 4; i++) {
      const off = (i - 1.5) * size * 0.17 * fl;
      const len = size * (0.42 - Math.abs(i - 1.3) * 0.05) * (1 - p * 0.45);
      const bend = p * 0.6 * fl;
      tube(c, [v2(size * 0.7, off), v2(size * 0.7 + len * 0.6, off + bend * len * 0.3), v2(size * 0.7 + len, off + bend * len * 0.8)], size * 0.15, size * 0.12, sk);
    }
    // thumb
    tube(c, [v2(size * 0.45, -size * 0.32 * fl), v2(size * 0.68, -size * (0.42 - p * 0.18) * fl), v2(size * (0.86 + p * 0.1), -size * (0.36 - p * 0.3) * fl)], size * 0.17, size * 0.13, sk);
  } else {
    c.beginPath(); blobEllipse(c, size * 0.52, -size * 0.36 * fl, size * 0.17, size * 0.13, 7, 0.05, 7, -0.6 * fl); c.fill();
    // knit texture
    c.strokeStyle = 'rgba(150,90,20,0.35)'; c.lineWidth = size * 0.035;
    for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(size * 0.1, i * size * 0.11); c.lineTo(size * 0.78, i * size * 0.11); c.stroke(); }
  }
  c.restore();
}

/** Fingertip position of a topHand (for attaching wire loops). */
export function topHandTip(from: V2, wrist: V2, size: number): V2 {
  const ang = Math.atan2(wrist.y - from.y, wrist.x - from.x);
  return v2(wrist.x + Math.cos(ang) * size * 1.08, wrist.y + Math.sin(ang) * size * 1.08);
}

/** Wooden sledge seen from the side (runners on the ground at y), with optional boxes piled on. */
export function sledge(c: C2D, x: number, y: number, s: number, o: { boxes?: number; tint?: (h: string) => string; tilt?: number } = {}) {
  const T = o.tint || ((h: string) => h);
  c.save(); c.translate(x, y); c.rotate(o.tilt ?? 0); c.scale(s, s);
  // runners
  c.strokeStyle = T('#8e2f2a'); c.lineWidth = 6; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-90, -2); c.lineTo(70, -2); c.quadraticCurveTo(102, -4, 100, -30); c.stroke();
  // struts
  c.lineWidth = 5; c.strokeStyle = T('#6e4a30');
  for (const sx of [-70, -10, 50]) { c.beginPath(); c.moveTo(sx, -4); c.lineTo(sx, -24); c.stroke(); }
  // slats
  c.fillStyle = T('#a8744a'); c.beginPath(); handRect(c, -96, -34, 190, 12, 4, 0.6); c.fill();
  c.fillStyle = T('#8a5c3a'); c.fillRect(-96, -24, 190, 3);
  // boxes
  const nb = o.boxes ?? 3;
  const boxes: [number, number, number, number, string][] = [[-88, -96, 92, 62, '#b48a5c'], [8, -86, 80, 52, '#a98058'], [-60, -142, 84, 46, '#bd9466']];
  for (let i = 0; i < Math.min(nb, boxes.length); i++) {
    const [bx, by, bw, bh, col] = boxes[i];
    c.fillStyle = T(col); c.beginPath(); handRect(c, bx, by, bw, bh, 30 + i, 1); c.fill();
    c.fillStyle = T('#8e6a44'); c.fillRect(bx, by + bh * 0.42, bw, 5); // tape
    c.fillStyle = T('#6a4a30'); c.globalAlpha = 0.5; c.fillRect(bx + bw * 0.15, by + 8, bw * 0.6, 4); c.fillRect(bx + bw * 0.15, by + 16, bw * 0.4, 4); c.globalAlpha = 1;
  }
  c.restore();
}

/** A cardboard box face with a label in Grandma's hand and an optional dust layer. */
export function labelledBox(f: F, c: C2D, x: number, y: number, w: number, h: number, lines: string[], o: { seed?: number; dust?: number; size?: number; tint?: (h: string) => string; col?: string; underline?: number } = {}) {
  const T = o.tint || ((h: string) => h);
  const seed = o.seed ?? 1;
  c.fillStyle = T(o.col || '#b08658'); c.beginPath(); handRect(c, x, y, w, h, seed, 1.4); c.fill();
  // flaps / creases
  c.fillStyle = T('#8e6a44'); c.globalAlpha = 0.6; c.fillRect(x, y + h * 0.12, w, 3); c.globalAlpha = 1;
  // corrugated hints
  c.strokeStyle = T('#9a744c'); c.lineWidth = 1.2; c.globalAlpha = 0.35;
  for (let i = 0; i < 8; i++) { const yy = y + h * (0.2 + i * 0.1); c.beginPath(); c.moveTo(x + 4, yy); c.lineTo(x + w - 4, yy + noise1(i, seed)); c.stroke(); }
  c.globalAlpha = 1;
  const sz = o.size ?? Math.min(h * 0.2, w * 0.09);
  lines.forEach((l, i) => handText(c, l, x + w * 0.08, y + h * 0.26 + i * sz * 1.45, sz * (i === 0 ? 1 : 0.85), { ...GRANDMA_HAND, color: T('#26222e'), seed: seed + i * 7 }));
  if (o.underline) {
    c.strokeStyle = T('#26222e'); c.lineWidth = sz * 0.08; c.lineCap = 'round';
    const ux = x + w * 0.08 + sz * 0.5, uy = y + h * 0.26 + (lines.length - 1) * sz * 1.45 + sz * 1.05;
    c.beginPath(); c.moveTo(ux, uy); c.quadraticCurveTo(ux + o.underline * 0.5, uy + 4, ux + o.underline, uy - 2); c.stroke();
  }
  const d = o.dust ?? 0;
  if (d > 0) dustOver(c, x, y, w, h, d, seed);
}

/** Mottled dust film over a rectangle. */
export function dustOver(c: C2D, x: number, y: number, w: number, h: number, a: number, seed: number) {
  const r = new RNG(seed * 31 + 7);
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
  c.fillStyle = `rgba(150,140,128,${0.55 * a})`; c.fillRect(x, y, w, h);
  for (let i = 0; i < 60; i++) {
    c.fillStyle = `rgba(${170 + r.int(-20, 20)},${160 + r.int(-20, 20)},${148 + r.int(-20, 20)},${0.25 * a})`;
    c.beginPath(); c.arc(x + r.next() * w, y + r.next() * h, 4 + r.next() * Math.min(w, h) * 0.18, 0, TAU); c.fill();
  }
  c.restore();
}

/** A neatly coiled string of lights (seen from the front, lying on a surface). */
export function coil(f: F, c: C2D, x: number, y: number, r: number, seed: number, on = 0) {
  c.strokeStyle = '#1e3a2a'; c.lineWidth = Math.max(1.5, r * 0.06);
  for (let k = 0; k < 4; k++) { c.beginPath(); c.ellipse(x + noise1(k, seed) * r * 0.06, y, r * (1 - k * 0.06), r * 0.36 * (1 - k * 0.06), 0, 0, TAU); c.stroke(); }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU + seed;
    bulb(f, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.36, { size: Math.max(2.5, r * 0.11), on, color: BULB_SEQ[(i + seed) % 5], angle: a - Math.PI / 2 });
  }
}

/** Advent calendar: 24 doors, `open` of them opened. */
export function advent(c: C2D, x: number, y: number, w: number, h: number, open: number) {
  c.fillStyle = '#8a2c32'; c.beginPath(); handRect(c, x, y, w, h, 61, 1); c.fill();
  // a painted snowy house on it
  c.fillStyle = '#c9d3ea'; c.beginPath(); c.moveTo(x + w * 0.15, y + h * 0.35); c.lineTo(x + w * 0.5, y + h * 0.1); c.lineTo(x + w * 0.85, y + h * 0.35); c.closePath(); c.fill();
  const cols = 6, rows = 4;
  const dw = w * 0.12, dh = h * 0.13;
  for (let i = 0; i < 24; i++) {
    const cx = x + w * 0.1 + (i % cols) * (w * 0.8 / (cols - 1)) - dw / 2 + (hash1(i * 3.3) - 0.5) * w * 0.04;
    const cy = y + h * 0.42 + Math.floor(i / cols) * (h * 0.5 / (rows - 1)) - dh / 2;
    const isOpen = i < open;
    c.fillStyle = isOpen ? '#2a1e24' : '#e8d6a8';
    c.fillRect(cx, cy, dw, dh);
    if (isOpen) { c.fillStyle = BULB_SEQ[i % 5]; c.beginPath(); c.arc(cx + dw / 2, cy + dh / 2, dw * 0.22, 0, TAU); c.fill(); c.fillStyle = '#e8d6a8'; c.fillRect(cx - dw * 0.35, cy, dw * 0.3, dh); }
  }
}

/** Little breath puff (screen space, glow-ish base). */
export function breath(c: C2D, x: number, y: number, age: number, dir = 1, s = 1) {
  if (age < 0 || age > 1) return;
  const a = (1 - age) * 0.45;
  c.fillStyle = `rgba(220,230,250,${a})`;
  for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(x + dir * (age * 26 + k * 6) * s, y - age * 10 * s - k * 2 * s, (4 + age * 10 + k * 2) * s, 0, TAU); c.fill(); }
}
