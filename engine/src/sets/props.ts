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
    const sx = (from.x + wrist.x) / 2 + size * 0.3, sy = (from.y + wrist.y) / 2 + size * 0.35;
    softShadow(c, sx, sy, Math.hypot(wrist.x - from.x, wrist.y - from.y) * 0.6, size * 0.7, ang, 0.35);
    softShadow(c, wrist.x + Math.cos(ang) * size * 0.6 + size * 0.3, wrist.y + Math.sin(ang) * size * 0.6 + size * 0.35, size * 0.8, size * 0.7, ang, 0.35);
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
  if (d > 0) {
    const m = /rgba?\((\d+),(\d+),(\d+)/.exec(T('#ffffff'));
    const mul: [number, number, number] = m ? [+m[1] / 255, +m[2] / 255, +m[3] / 255] : [1, 1, 1];
    dustOver(c, x, y, w, h, d, seed, mul);
  }
}

/** Mottled dust film over a rectangle. */
export function dustOver(c: C2D, x: number, y: number, w: number, h: number, a: number, seed: number, mul: [number, number, number] = [1, 1, 1]) {
  const r = new RNG(seed * 31 + 7);
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
  c.fillStyle = `rgba(${150 * mul[0] | 0},${140 * mul[1] | 0},${128 * mul[2] | 0},${0.55 * a})`; c.fillRect(x, y, w, h);
  for (let i = 0; i < 60; i++) {
    c.fillStyle = `rgba(${(170 + r.int(-20, 20)) * mul[0] | 0},${(160 + r.int(-20, 20)) * mul[1] | 0},${(148 + r.int(-20, 20)) * mul[2] | 0},${0.25 * a})`;
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

/** Soft elliptical shadow without canvas filters (radial gradient, scaled). */
export function softShadow(c: C2D, x: number, y: number, rx: number, ry: number, rot: number, a: number, col = '5,6,15') {
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(1, ry / Math.max(1, rx));
  const g = c.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(0.6, `rgba(${col},${a * 0.5})`); g.addColorStop(1, `rgba(${col},0)`);
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, rx, 0, TAU); c.fill();
  c.restore();
}

// ---------------------------------------------------------------- the misdirect: a Santa landing runway
/** One idea on Nell's wall: lights so Santa's sleigh can see her roof (from the sky, from space) and land. */
export function santaSketch(c: C2D, kind: string, w: number, h: number) {
  const ink = '#2b2b4a', red = '#c4302c';
  const L = (pts: [number, number][], col = ink, wd = 3) => pencilLineLocal(c, pts.map(([x, y]) => v2(x * w, y * h)), wd, col);
  const T = (s: string, x: number, y: number, sz: number, col = ink) => handText(c, s, x * w, y * h, sz, { ...NELL_HAND, color: col, seed: (x * 97 + y * 31) | 0, weight: 1.1 });
  const dots = (pts: [number, number][], r = 4) => pts.forEach(([x, y], i) => { c.fillStyle = BULB_SEQ[i % 5]; c.beginPath(); c.arc(x * w, y * h, r, 0, TAU); c.fill(); });
  const sleigh = (x: number, y: number, k: number) => {
    L([[x - 0.12 * k, y], [x + 0.06 * k, y], [x + 0.09 * k, y - 0.1 * k]]); L([[x - 0.13 * k, y + 0.05 * k], [x + 0.08 * k, y + 0.05 * k], [x + 0.11 * k, y]]);
    L([[x - 0.11 * k, y], [x - 0.11 * k, y - 0.09 * k], [x + 0.02 * k, y - 0.09 * k]]);
    c.fillStyle = red; c.beginPath(); c.arc((x - 0.05 * k) * w, (y - 0.13 * k) * h, 7 * k, 0, TAU); c.fill();
    for (const rx of [0.2, 0.36]) {
      const X = x + rx * k, Y = y - 0.12 * k * (rx / 0.2);
      L([[X - 0.05 * k, Y], [X + 0.05 * k, Y]]); L([[X - 0.04 * k, Y], [X - 0.05 * k, Y + 0.08 * k]], ink, 2); L([[X + 0.04 * k, Y], [X + 0.05 * k, Y + 0.08 * k]], ink, 2);
      L([[X + 0.05 * k, Y - 0.02 * k], [X + 0.07 * k, Y - 0.1 * k]], ink, 2); L([[X + 0.07 * k, Y - 0.1 * k], [X + 0.04 * k, Y - 0.15 * k]], ink, 1.6); L([[X + 0.07 * k, Y - 0.1 * k], [X + 0.1 * k, Y - 0.15 * k]], ink, 1.6);
    }
    L([[x + 0.08 * k, y - 0.05 * k], [x + 0.15 * k, y - 0.1 * k]], ink, 1.6);
  };
  if (kind === 'runway') {
    // the sleigh coming in from the top left, a dashed glide path down to a roof outlined in lights, an X on it
    sleigh(-0.28, -0.26, 0.9);
    for (let k = 0; k < 6; k++) { const u = k / 6, u2 = (k + 0.5) / 6; L([[lerp(-0.05, 0.22, u), lerp(-0.18, 0.18, u * u)], [lerp(-0.05, 0.22, u2), lerp(-0.18, 0.18, u2 * u2)]], red, 3); }
    L([[0.16, 0.12], [0.23, 0.2], [0.28, 0.1]], red, 3);
    L([[-0.02, 0.44], [0.24, 0.24], [0.46, 0.44]], ink, 3); L([[0.34, 0.33], [0.34, 0.25], [0.4, 0.25], [0.4, 0.38]], ink, 2);
    const pts: [number, number][] = []; for (let k = 0; k <= 8; k++) { const u = k / 8; pts.push([lerp(-0.02, 0.24, u), lerp(0.42, 0.22, u)]); pts.push([lerp(0.24, 0.46, u), lerp(0.22, 0.42, u)]); }
    dots(pts, 3.5);
    T('SANTA?', -0.46, 0.18, 28, red);
  } else if (kind === 'reindeer') {
    T('8 REINDEER', -0.44, -0.4, 26);
    for (let k = 0; k < 8; k++) {
      const x = -0.38 + (k % 4) * 0.22, y = -0.05 + Math.floor(k / 4) * 0.28;
      L([[x - 0.05, y], [x + 0.05, y]]); L([[x - 0.04, y], [x - 0.05, y + 0.1]], ink, 2); L([[x + 0.04, y], [x + 0.05, y + 0.1]], ink, 2);
      L([[x + 0.05, y - 0.02], [x + 0.07, y - 0.1]], ink, 2); L([[x + 0.07, y - 0.1], [x + 0.04, y - 0.15]], ink, 1.6); L([[x + 0.07, y - 0.1], [x + 0.1, y - 0.15]], ink, 1.6);
      if (k === 0) { c.fillStyle = red; c.beginPath(); c.arc((x + 0.085) * w, (y - 0.07) * h, 4, 0, TAU); c.fill(); }
    }
  } else if (kind === 'space') {
    // the Earth from far away, one bright dot, and the sleigh spotting it
    T('SEEN FROM', -0.44, -0.44, 22, red); T('SPACE?', -0.44, -0.22, 22, red);
    c.strokeStyle = ink; c.lineWidth = 3; c.beginPath(); c.arc(0.12 * w, 0.22 * h, 0.26 * h, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
    c.fillStyle = '#ffae2b'; c.beginPath(); c.arc(0.12 * w, -0.03 * h, 6, 0, TAU); c.fill();
    for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU; L([[0.12 + Math.cos(a) * 0.05, -0.03 + Math.sin(a) * 0.07], [0.12 + Math.cos(a) * 0.09, -0.03 + Math.sin(a) * 0.12]], '#d89a20', 2); }
    sleigh(0.18, -0.32, 0.55);
    for (let k = 0; k < 3; k++) L([[0.24 - k * 0.03, -0.25 + k * 0.06], [0.22 - k * 0.03, -0.22 + k * 0.06]], red, 2);
  } else if (kind === 'pies') {
    // lure him down: mince pies on the roof, right where the runway ends
    L([[-0.42, 0.42], [-0.1, 0.12], [0.22, 0.42]]);
    c.fillStyle = '#b8743a'; for (const px of [-0.2, -0.1, 0.0]) { c.beginPath(); c.ellipse(px * w, 0.16 * h, 9, 6, 0, 0, TAU); c.fill(); }
    L([[0.42, -0.1], [0.12, 0.08]], red, 3); L([[0.16, -0.02], [0.12, 0.08], [0.24, 0.1]], red, 3);
    T('BAIT: MINCE PIES', -0.46, -0.44, 15, red);
  } else if (kind === 'lights') {
    // "LIGHTS = RUNWAY": two rows of landing lights leading to a roof
    T('LIGHTS =', -0.44, -0.44, 22); T('RUNWAY', -0.44, -0.2, 22, red);
    const pts: [number, number][] = [];
    for (let k = 0; k < 6; k++) { pts.push([-0.4 + k * 0.1, 0.3 - k * 0.02]); pts.push([-0.4 + k * 0.1, 0.42 - k * 0.04]); }
    dots(pts, 4);
    L([[0.24, 0.42], [0.34, 0.26], [0.44, 0.42]]);
    L([[0.1, 0.12], [0.3, 0.12]], red, 3); L([[0.24, 0.07], [0.3, 0.12], [0.24, 0.17]], red, 3);
  }
}

export function santaPapers(f: F, c: C2D) {
  const red = '#c4302c';
  const papers: { x: number; y: number; w: number; h: number; r: number; kind: string; ex: number; ey: number }[] = [
    { x: -860, y: -230, w: 330, h: 230, r: -0.04, kind: 'runway', ex: -190, ey: -60 },
    { x: -900, y: 130, w: 250, h: 180, r: 0.05, kind: 'space', ex: -190, ey: 60 },
    { x: 880, y: -140, w: 270, h: 190, r: 0.04, kind: 'reindeer', ex: 190, ey: -40 },
    { x: 880, y: 120, w: 230, h: 160, r: -0.05, kind: 'lights', ex: 190, ey: 70 },
    { x: -560, y: -445, w: 190, h: 115, r: 0.06, kind: 'pies', ex: -150, ey: -130 },
  ];
  c.strokeStyle = red; c.lineWidth = 3;
  for (const p of papers) {
    c.beginPath(); c.moveTo(p.x, p.y);
    c.quadraticCurveTo((p.x + p.ex) / 2, (p.y + p.ey) / 2 + 26, p.ex, p.ey - 10);
    c.stroke();
  }
  for (const p of papers) {
    c.save(); c.translate(p.x, p.y); c.rotate(p.r);
    c.fillStyle = '#ece6d6'; c.beginPath(); handRect(c, -p.w / 2, -p.h / 2, p.w, p.h, p.x | 0, 1.2); c.fill();
    santaSketch(c, p.kind, p.w, p.h);
    c.fillStyle = '#d23a32'; c.beginPath(); c.arc(0, -p.h / 2 + 10, 6, 0, TAU); c.fill();
    c.restore();
  }
  void f;
}

function pencilLineLocal(c: C2D, pts: V2[], wd: number, col: string) {
  c.save(); c.strokeStyle = col; c.lineWidth = wd; c.lineCap = 'round'; c.lineJoin = 'round'; c.globalAlpha = 0.9;
  c.beginPath(); c.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i].x, pts[i].y); c.stroke();
  c.restore();
}
