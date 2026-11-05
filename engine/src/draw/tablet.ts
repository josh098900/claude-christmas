// The family tablet and an invented, generic chat interface (no real app UI, no logos).
// Warm off-white, simple, rounded. Claude is only ever this soft glow and some text.
import { C2D, F } from '../core/stage';
import { clamp, TAU, lerp } from '../core/math';
import { glow } from './light';

export const UI = {
  screen: '#f6f0e4',
  screenEdge: '#efe6d6',
  bubble: '#e6dac6',
  userText: '#3b3330',
  replyText: '#4d433d',
  input: '#fffdf8',
  inputEdge: '#e0d4c0',
  send: '#7d8f86',   // muted sage: deliberately not a brand colour
  body: '#2a2d36',
  glow: '#ffdcae',
};

export interface Msg { who: 'me' | 'reply'; text: string; reveal?: number; blur?: number; }
export interface TabletState {
  msgs: Msg[];
  typing?: string;          // text currently in the input box
  caret?: boolean;
  thinking?: number;        // 0..1 shows three soft dots
  scroll?: number;          // px
  font?: number;            // font size in screen-space px at the tablet's local scale
  brightness?: number;
}

function roundRect(c: C2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
  c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
  c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath();
}

function wrap(c: C2D, text: string, maxW: number): string[] {
  const words = text.split(' '); const lines: string[] = []; let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (c.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Draw the tablet face-on. (x,y) top-left of the device in current ctx space; w,h device size.
 * The screen is laid out in a virtual 1000-unit-wide coordinate system and scaled to fit.
 */
export function drawTablet(f: F, c: C2D, x: number, y: number, w: number, h: number, st: TabletState, opts: { glowAmt?: number; tilt?: number } = {}) {
  const bez = w * 0.045;
  c.save();
  // device body
  roundRect(c, x, y, w, h, w * 0.06);
  c.fillStyle = UI.body; c.fill();
  // screen
  const sx = x + bez, sy = y + bez, sw = w - bez * 2, sh = h - bez * 2;
  roundRect(c, sx, sy, sw, sh, w * 0.03);
  c.save(); c.clip();
  const br = st.brightness ?? 1;
  const g = c.createLinearGradient(sx, sy, sx, sy + sh);
  g.addColorStop(0, UI.screen); g.addColorStop(1, UI.screenEdge);
  c.fillStyle = g; c.fillRect(sx, sy, sw, sh);
  // virtual layout
  const k = sw / 1000;
  c.translate(sx, sy); c.scale(k, k);
  const VH = sh / k;
  const fs = st.font ?? 40;
  c.font = `500 ${fs}px Inter`;
  c.textBaseline = 'top';
  // header: a quiet bar with three dots (generic)
  c.fillStyle = '#e9e0d0'; c.fillRect(0, 0, 1000, 70);
  c.fillStyle = '#c9bca6';
  for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(44 + i * 26, 35, 7, 0, TAU); c.fill(); }
  // messages from the bottom up
  const inputH = 120;
  let yy = VH - inputH - 40 + (st.scroll ?? 0);
  const lh = fs * 1.32;
  for (let i = st.msgs.length - 1; i >= 0; i--) {
    const m = st.msgs[i];
    const rev = clamp(m.reveal ?? 1);
    if (rev <= 0) continue;
    const maxW = m.who === 'me' ? 640 : 760;
    const lines = wrap(c, m.text, maxW);
    const bh = lines.length * lh + 44;
    yy -= bh;
    if (m.who === 'me') {
      const bw = Math.max(...lines.map((l) => c.measureText(l).width)) + 56;
      const bx = 1000 - 40 - bw;
      c.globalAlpha = rev;
      roundRect(c, bx, yy, bw, bh, 34); c.fillStyle = UI.bubble; c.fill();
      c.fillStyle = UI.userText;
      lines.forEach((l, j) => c.fillText(l, bx + 28, yy + 22 + j * lh));
      c.globalAlpha = 1;
    } else {
      // reply: plain text on the page, revealed line by line; optionally soft-focus
      const bl = m.blur ?? 0;
      if (bl > 0) c.filter = `blur(${bl}px)`;
      c.fillStyle = UI.replyText;
      const total = lines.length;
      lines.forEach((l, j) => {
        const lr = clamp(rev * total - j);
        if (lr <= 0) return;
        c.globalAlpha = lr;
        const n = Math.ceil(l.length * lr);
        c.fillText(l.slice(0, n), 48, yy + 22 + j * lh);
      });
      c.globalAlpha = 1; c.filter = 'none';
    }
    yy -= 30;
  }
  // thinking dots
  if ((st.thinking ?? 0) > 0) {
    const tt = f.tc * 3;
    for (let i = 0; i < 3; i++) {
      c.globalAlpha = (st.thinking ?? 0) * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(tt * 2 - i * 0.9)));
      c.fillStyle = '#b4a690'; c.beginPath(); c.arc(60 + i * 30, VH - inputH - 70, 9, 0, TAU); c.fill();
    }
    c.globalAlpha = 1;
  }
  // input box
  roundRect(c, 30, VH - inputH - 10, 940, inputH - 20, 45);
  c.fillStyle = UI.input; c.fill();
  c.strokeStyle = UI.inputEdge; c.lineWidth = 3; c.stroke();
  const typed = st.typing ?? '';
  c.fillStyle = typed ? UI.userText : '#b9ad9a';
  const shown = typed;
  let tw = 0;
  if (shown) {
    // keep the tail visible
    let s2 = shown;
    while (c.measureText(s2).width > 780 && s2.length > 1) s2 = s2.slice(1);
    c.fillText(s2, 70, VH - inputH + 22);
    tw = c.measureText(s2).width;
  }
  if (st.caret && Math.floor(f.tc * 2.2) % 2 === 0) { c.fillStyle = '#6b5e52'; c.fillRect(72 + tw, VH - inputH + 18, 4, fs * 1.1); }
  // send button
  c.beginPath(); c.arc(915, VH - inputH + 40, 30, 0, TAU); c.fillStyle = typed ? UI.send : '#d9d0c0'; c.fill();
  c.strokeStyle = '#fbf8f2'; c.lineWidth = 5; c.lineCap = 'round';
  c.beginPath(); c.moveTo(915, VH - inputH + 54); c.lineTo(915, VH - inputH + 26); c.moveTo(903, VH - inputH + 38); c.lineTo(915, VH - inputH + 26); c.lineTo(927, VH - inputH + 38); c.stroke();
  c.restore();
  // screen glass sheen
  c.globalAlpha = 0.06; c.fillStyle = '#ffffff';
  c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + sw * 0.35, sy); c.lineTo(sx, sy + sh * 0.5); c.closePath(); c.fill();
  c.globalAlpha = 1;
  c.restore();
  // the glow it casts (warm): the only warmth in the first half
  const ga = opts.glowAmt ?? 0.5;
  if (ga > 0) glow(f.glow, x + w / 2, y + h / 2, Math.max(w, h) * 1.1, UI.glow, ga * 0.35 * br);
}

/** Typing helper: returns how much of `text` is typed at time t, kid-speed with hesitations. */
export function typed(text: string, t: number, t0: number, cps = 9, seed = 1): string {
  if (t < t0) return '';
  let acc = t0, i = 0;
  while (i < text.length) {
    const ch = text[i];
    let d = 1 / cps;
    if (ch === ' ') d *= 1.6;
    if ((i * 7 + seed) % 11 === 0) d *= 2.4; // hesitation
    if (acc + d > t) break;
    acc += d; i++;
  }
  return text.slice(0, i);
}
export function typeDur(text: string, cps = 9, seed = 1): number {
  let acc = 0;
  for (let i = 0; i < text.length; i++) { let d = 1 / cps; if (text[i] === ' ') d *= 1.6; if ((i * 7 + seed) % 11 === 0) d *= 2.4; acc += d; }
  return acc;
}
