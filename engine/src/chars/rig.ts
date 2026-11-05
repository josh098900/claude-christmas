// A simple 2D person rig: round readable shapes, dot eyes, eyebrows and posture do the acting.
// Local space: origin at the feet, y up is negative, units are logical px at scale 1.
import { C2D, F } from '../core/stage';
import { V2, v2, lerp, clamp, TAU, vrot, vadd, noise1 } from '../core/math';
import { smoothClosed, smoothOpen, tube, blobEllipse, jit } from '../draw/brush';
import { CharLight, litGroup, tint } from '../draw/shade';

export type HairStyle = 'plaits' | 'bald' | 'curly' | 'ponytail' | 'short' | 'bob' | 'braids' | 'none' | 'buzz';
export type HatStyle = 'bobble' | 'flatcap' | 'beanie' | 'hijab' | 'hood' | 'none' | 'woolly';
export type CoatStyle = 'aline' | 'cardigan' | 'long' | 'puffer' | 'round' | 'hoodie' | 'jumper';

export interface Spec {
  name: string;
  legLen: number; hipW: number; legW: number; legColor: string;
  boot: { color: string; h: number; len: number };
  torso: number; shoulderW: number; hemW: number; hemY: number; // hemY: height of coat hem above feet
  coat: { color: string; trim?: string; style: CoatStyle; buttons?: string; collar?: string; inner?: string };
  arm: { upper: number; lower: number; w: number; color: string; cuff?: string };
  hand: { r: number; color: string; mitten?: boolean };
  head: { r: number; w: number; neck: number; skin: string; blush?: string };
  eyes: { r: number; gap: number; y: number; color?: string };
  brows: { color: string; w: number; len: number; gap: number; bushy?: boolean };
  nose: { r: number; color?: string; big?: boolean };
  mouth: { w: number; color?: string };
  hair: { style: HairStyle; color: string; color2?: string };
  hat?: { style: HatStyle; color: string; color2?: string };
  glasses?: string;
  moustache?: string; beard?: string;
  ears?: boolean;
  stoop: number; // radians
  belly?: number;
  scarf?: string;
}

export interface Limb { a: number; b: number } // a: root angle from straight down (+ toward facing), b: bend
export interface Pose {
  x: number; y: number; s: number;
  flip?: number;           // 1 faces right, -1 faces left
  turn?: number;           // 0 = front, 1 = 3/4 toward facing side
  lean?: number;           // whole upper body lean (radians, + forward)
  bob?: number;            // vertical body offset (px, + down)
  hipDrop?: number;        // lowers hips (kneel / crouch)
  headTilt?: number;       // radians
  headTurn?: number;       // extra turn for the face only
  nod?: number;            // features shift: + looks down
  look?: { x: number; y: number };
  blink?: number;
  browUp?: number;         // both brows raised (-1..1)
  browIn?: number;         // inner ends up = worried/sad (+), down = cross/determined (-)
  browL?: number; browR?: number; // individual extra raise
  mouth?: { open?: number; smile?: number; w?: number };
  armF?: Limb; armB?: Limb; // front (near) and back (far) arm
  legF?: Limb; legB?: Limb;
  plait?: number;          // swing of plaits/ponytail
  squash?: number;
  holdF?: (x: C2D, hand: V2, ang: number) => void; // prop in near hand (drawn over hand)
  holdB?: (x: C2D, hand: V2, ang: number) => void;
  behindHandF?: boolean;   // draw prop under the hand
  eyesClosed?: boolean;
  cheek?: number;
  hidden?: { armB?: boolean; legs?: boolean; armF?: boolean };
  only?: 'armF';           // draw just the near arm (for hugs: arm drawn over another character)
  back?: boolean;          // seen from behind: no face
  wink?: number;           // >0.5 closes the eye on the facing side
}

const DEF_LIMB: Limb = { a: 0.08, b: 0.12 };

export interface Rigged { hips: V2; neck: V2; head: V2; handF: V2; handB: V2; shoulderF: V2; shoulderB: V2; top: V2 }

/** Compute joint positions in world space (logical px). */
function limbPts(root: V2, a: number, b: number, l1: number, l2: number, fl: number, rot: number): V2[] {
  const d1 = vrot(v2(Math.sin(a) * fl, Math.cos(a)), rot);
  const e = vadd(root, v2(d1.x * l1, d1.y * l1));
  const d2 = vrot(v2(Math.sin(a + b) * fl, Math.cos(a + b)), rot);
  const h = vadd(e, v2(d2.x * l2, d2.y * l2));
  return [root, e, h];
}

export function drawPerson(f: F, sp: Spec, p: Pose, L: CharLight | null, opts: { groups?: boolean; target?: C2D; alpha?: number } = {}): Rigged {
  const s = p.s, fl = p.flip ?? 1, turn = clamp(p.turn ?? 0.5, -1, 1);
  const at = Math.abs(turn);
  const T = (c: string) => tint(c, L);
  const lean = (p.lean ?? 0);
  const bob = (p.bob ?? 0) + (p.hipDrop ?? 0);
  // world transform helpers
  const W = (lx: number, ly: number): V2 => v2(p.x + lx * s * fl, p.y + ly * s);
  // hips
  const hipY = -sp.legLen + bob;
  const hipC = v2(0, hipY);
  // upper body rotates about hips by lean + stoop
  const ub = lean + sp.stoop;
  const U = (lx: number, ly: number): V2 => {
    // point relative to hips, rotate (positive = forward toward facing)
    const r = vrot(v2(lx, ly), ub);
    return W(hipC.x + r.x, hipC.y + r.y);
  };
  const shY = -sp.torso;
  const shHalf = sp.shoulderW / 2;
  const nearSh = U(shHalf * lerp(1, 0.45, at) * (turn >= 0 ? 1 : -1) * 0.92 + turn * 4, shY + 8);
  const farSh = U(-shHalf * lerp(1, 0.25, at) * (turn >= 0 ? 1 : -1) * 0.92 + turn * 4, shY + 8);
  const neck = U(turn * 6, shY - sp.head.neck);
  const headC = U(turn * 10 + (sp.stoop > 0.1 ? sp.stoop * 40 : 0), shY - sp.head.neck - sp.head.r * 0.82);
  const rot = ub * fl; // screen rotation for limbs attached to upper body
  const armF = p.armF || DEF_LIMB, armB = p.armB || DEF_LIMB;
  const legF = p.legF || { a: 0.05, b: 0 }, legB = p.legB || { a: -0.05, b: 0 };
  const ls = sp.arm.upper * s, ls2 = sp.arm.lower * s;
  const aF = limbPts(nearSh, armF.a, armF.b, ls, ls2, fl, rot);
  const aB = limbPts(farSh, armB.a, armB.b, ls, ls2, fl, rot);
  const hipHalf = sp.hipW / 2 * lerp(1, 0.55, at);
  const hipF = W(hipHalf * (turn >= 0 ? 1 : -1) + turn * 3, hipY);
  const hipB = W(-hipHalf * (turn >= 0 ? 1 : -1) + turn * 3, hipY);
  const lF = limbPts(hipF, legF.a, legF.b, sp.legLen * 0.52 * s, sp.legLen * 0.48 * s, fl, 0);
  const lB = limbPts(hipB, legB.a, legB.b, sp.legLen * 0.52 * s, sp.legLen * 0.48 * s, fl, 0);

  const totalH = (sp.legLen + sp.torso + sp.head.neck + sp.head.r * 2.6) * s;
  const bb = { x: p.x - totalH * 0.75, y: p.y - totalH * 1.15, w: totalH * 1.5, h: totalH * 1.3 };

  // ---------- part painters ----------
  const paintLeg = (x: C2D, pts: V2[], near: boolean) => {
    const col = T(near ? sp.legColor : shadeHex(sp.legColor, -0.12));
    tube(x, pts, sp.legW * s, sp.legW * 0.9 * s, col);
    // boot
    const foot = pts[2];
    const bc = T(near ? sp.boot.color : shadeHex(sp.boot.color, -0.12));
    const dir = fl * (at > 0.15 ? 1 : 0.4);
    x.beginPath();
    const bw = sp.legW * 1.15 * s, bh = sp.boot.h * s, bl = sp.boot.len * s;
    const legDx = pts[2].x - pts[1].x, legDy = pts[2].y - pts[1].y; const la = Math.atan2(legDx, legDy);
    x.save(); x.translate(foot.x, foot.y); x.rotate(-la * 0.6);
    x.moveTo(-bw / 2, -bh);
    x.lineTo(bw / 2, -bh);
    x.quadraticCurveTo(bw / 2 + 2 * s, -bh * 0.3, bw / 2 + bl * Math.max(0, dir) * 0.6, -bh * 0.25);
    x.quadraticCurveTo(bw / 2 + bl * Math.max(0, dir) * 0.75 + 4 * s, 0, bw / 2 + bl * Math.max(0, dir) * 0.5, 2 * s);
    x.lineTo(-bw / 2 - bl * Math.max(0, -dir) * 0.6, 2 * s);
    x.quadraticCurveTo(-bw / 2 - bl * Math.max(0, -dir) * 0.75 - 4 * s, 0, -bw / 2 - bl * Math.max(0, -dir) * 0.6, -bh * 0.25);
    x.quadraticCurveTo(-bw / 2 - 2 * s, -bh * 0.3, -bw / 2, -bh);
    x.closePath();
    x.fillStyle = bc; x.fill();
    // sole
    x.fillStyle = T(shadeHex(sp.boot.color, -0.45));
    x.fillRect(-bw / 2 - bl * 0.3, -1 * s, bw + bl * 0.6, 3 * s);
    x.restore();
  };

  const paintArm = (x: C2D, pts: V2[], near: boolean, hold?: (x: C2D, h: V2, a: number) => void) => {
    const col = T(near ? sp.arm.color : shadeHex(sp.arm.color, -0.14));
    const w = sp.arm.w * s;
    const mid = pts[1];
    tube(x, [pts[0], v2(lerp(pts[0].x, mid.x, 0.5), lerp(pts[0].y, mid.y, 0.5)), mid, v2(lerp(mid.x, pts[2].x, 0.5), lerp(mid.y, pts[2].y, 0.5)), pts[2]], w, w * 0.82, col);
    const ang = Math.atan2(pts[2].y - mid.y, pts[2].x - mid.x);
    if (sp.arm.cuff) {
      x.beginPath(); blobEllipse(x, pts[2].x - Math.cos(ang) * 2 * s, pts[2].y - Math.sin(ang) * 2 * s, w * 0.48, w * 0.42, 7, 0.05, 8, ang);
      x.fillStyle = T(sp.arm.cuff); x.fill();
    }
    if (hold && p.behindHandF) hold(x, pts[2], ang);
    // hand / mitten
    const hc = T(near ? sp.hand.color : shadeHex(sp.hand.color, -0.1));
    const hr = sp.hand.r * s;
    const hx = pts[2].x + Math.cos(ang) * hr * 0.55, hy = pts[2].y + Math.sin(ang) * hr * 0.55;
    x.beginPath(); blobEllipse(x, hx, hy, hr * 1.05, hr * 0.92, 11, 0.04, 8, ang);
    x.fillStyle = hc; x.fill();
    // thumb
    const ta = ang - fl * 1.1;
    x.beginPath(); blobEllipse(x, hx + Math.cos(ta) * hr * 0.75, hy + Math.sin(ta) * hr * 0.75, hr * 0.42, hr * 0.32, 12, 0.05, 6, ta);
    x.fill();
    if (hold && !p.behindHandF) hold(x, v2(hx, hy), ang);
  };

  const paintBody = (x: C2D) => {
    const st = sp.coat.style;
    const sw = sp.shoulderW / 2 * lerp(1, 0.78, at), hw = sp.hemW / 2 * lerp(1, 0.82, at);
    const hemY = -sp.hemY - hipY + bob * 0; // relative to hips
    const top = shY;
    const belly = (sp.belly || 0);
    const pts: V2[] = [
      v2(-sw * 0.55, top - 6), v2(0, top - 9), v2(sw * 0.55, top - 6),
      v2(sw * 1.0, top + 10), v2(sw * 1.02 + belly * 0.5, top + (hemY - top) * 0.4),
      v2(lerp(sw, hw, 0.8) + belly, top + (hemY - top) * 0.75), v2(hw, hemY - 4), v2(hw * 0.5, hemY + 3), v2(-hw * 0.5, hemY + 3), v2(-hw, hemY - 4),
      v2(-lerp(sw, hw, 0.8) - belly * 0.3, top + (hemY - top) * 0.75), v2(-sw * 1.02, top + (hemY - top) * 0.4), v2(-sw * 1.0, top + 10),
    ];
    const wp = pts.map((q) => { const r = vrot(q, ub); return W(r.x + hipC.x, r.y + hipC.y); });
    x.beginPath(); smoothClosed(x, wp, 0.9);
    x.fillStyle = T(sp.coat.color); x.fill();
    // front opening / buttons drifting with turn
    const fx = turn * sw * 0.42;
    if (st === 'cardigan' || st === 'long' || st === 'aline') {
      const a = U(fx, top + 4), b = U(fx + turn * 4, hemY);
      if (sp.coat.inner) {
        // V of shirt/jumper at the neck
        x.beginPath();
        const n1 = U(fx - sw * 0.28, top - 4), n2 = U(fx + sw * 0.28, top - 4), n3 = U(fx, top + (hemY - top) * 0.38);
        x.moveTo(n1.x, n1.y); x.quadraticCurveTo(lerp(n1.x, n3.x, 0.5) - 3 * s, lerp(n1.y, n3.y, 0.6), n3.x, n3.y);
        x.quadraticCurveTo(lerp(n2.x, n3.x, 0.5) + 3 * s, lerp(n2.y, n3.y, 0.6), n2.x, n2.y); x.closePath();
        x.fillStyle = T(sp.coat.inner); x.fill();
      }
      x.strokeStyle = T(sp.coat.trim || shadeHex(sp.coat.color, -0.25)); x.lineWidth = 3.2 * s; x.lineCap = 'round';
      x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(b.x, b.y); x.stroke();
      if (sp.coat.buttons) {
        x.fillStyle = T(sp.coat.buttons);
        const nb = st === 'cardigan' ? 5 : 4;
        for (let i = 0; i < nb; i++) {
          const q = U(fx + 6 * fl * 0 + 5, lerp(top + 22, hemY - 14, i / (nb - 1)));
          x.beginPath(); x.ellipse(q.x, q.y, 3.6 * s * lerp(1, 0.7, at), 3.6 * s, 0, 0, TAU); x.fill();
        }
      }
    }
    if (st === 'puffer' || st === 'aline') {
      // quilted bands
      x.strokeStyle = T(shadeHex(sp.coat.color, -0.18)); x.lineWidth = 2 * s; x.globalAlpha = 0.55;
      for (let i = 1; i <= 3; i++) {
        const yy = lerp(top + 6, hemY, i / 4);
        const ww = lerp(sw, hw, i / 4) * 0.92;
        const a = U(-ww, yy), m = U(0, yy + 5), b = U(ww, yy);
        x.beginPath(); x.moveTo(a.x, a.y); x.quadraticCurveTo(m.x, m.y, b.x, b.y); x.stroke();
      }
      x.globalAlpha = 1;
    }
    if (st === 'hoodie') {
      const pa = U(-sw * 0.5, lerp(top, hemY, 0.62)), pb = U(sw * 0.5, lerp(top, hemY, 0.85));
      x.fillStyle = T(shadeHex(sp.coat.color, -0.15));
      x.fillRect(Math.min(pa.x, pb.x), pa.y, Math.abs(pb.x - pa.x), pb.y - pa.y);
    }
    if (sp.coat.collar) {
      const c1 = U(-sw * 0.62, top - 2), c2 = U(sw * 0.62, top - 2), c3 = U(0, top + 10);
      x.beginPath(); x.moveTo(c1.x, c1.y); x.quadraticCurveTo(c3.x, c3.y + 6 * s, c2.x, c2.y); x.quadraticCurveTo(c3.x, c3.y - 6 * s, c1.x, c1.y);
      x.fillStyle = T(sp.coat.collar); x.fill();
    }
    if (sp.scarf) {
      const a = U(-sw * 0.62, top - 4), b = U(sw * 0.62, top - 4);
      tube(x, [a, U(0, top + 4), b], 16 * s, 16 * s, T(sp.scarf));
      const tail = [U(sw * 0.3 * (turn >= 0 ? 1 : -1), top + 2), U(sw * 0.38 * (turn >= 0 ? 1 : -1), top + 40)];
      tube(x, tail, 14 * s, 12 * s, T(shadeHex(sp.scarf, -0.08)));
    }
  };

  const paintHead = (x: C2D) => {
    const hr = sp.head.r * s, hw = hr * sp.head.w;
    const tilt = (p.headTilt ?? 0) * fl + ub * fl * 0.3;
    const ft = clamp(turn + (p.headTurn ?? 0), -1, 1); const aft = Math.abs(ft);
    x.save();
    x.translate(headC.x, headC.y); x.rotate(tilt);
    const sx = fl; // mirror features for flip
    // neck
    x.fillStyle = T(shadeHex(sp.head.skin, -0.15));
    x.fillRect(-hw * 0.28, hr * 0.5, hw * 0.56, sp.head.neck * s + hr * 0.4);
    // hair behind head
    const hs = sp.hair.style;
    if (hs === 'curly' || hs === 'bob' || hs === 'braids' || hs === 'ponytail') {
      x.fillStyle = T(sp.hair.color);
      x.beginPath();
      if (hs === 'curly') blobEllipse(x, -ft * hw * 0.15 * sx, -hr * 0.12, hw * 1.25, hr * 1.12, 31, 0.1, 14);
      else if (hs === 'bob') blobEllipse(x, -ft * hw * 0.12 * sx, hr * 0.05, hw * 1.12, hr * 1.08, 32, 0.04, 10);
      else blobEllipse(x, -ft * hw * 0.1 * sx, -hr * 0.05, hw * 1.08, hr * 1.06, 33, 0.04, 10);
      x.fill();
      if (hs === 'ponytail') {
        const sw = (p.plait ?? 0);
        tube(x, [v2(-ft * hw * 0.9 * sx, -hr * 0.3), v2((-ft * hw * 1.25 - sw * 10) * sx, hr * 0.3), v2((-ft * hw * 1.2 - sw * 18) * sx, hr * 0.95)], hr * 0.42, hr * 0.2, T(sp.hair.color));
      }
      if (hs === 'braids') {
        for (const side of [-1, 1]) for (let k = 0; k < 4; k++) {
          tube(x, [v2(side * hw * (0.55 + k * 0.12), hr * 0.2), v2(side * hw * (0.6 + k * 0.12), hr * 1.1 + k * 3)], hr * 0.13, hr * 0.11, T(shadeHex(sp.hair.color, -0.05 * k)));
        }
      }
    }
    if (hs === 'plaits') {
      const sw = (p.plait ?? 0);
      for (const side of [-1, 1]) {
        if (aft > 0.85 && side * ft * sx > 0) continue;
        const bx = side * hw * 0.78 - ft * hw * 0.18 * sx;
        const pts = [v2(bx, hr * 0.05), v2(bx + side * hr * 0.16 + sw * 5 * s, hr * 0.5), v2(bx + side * hr * 0.22 + sw * 12 * s, hr * 0.92)];
        tube(x, pts, hr * 0.27, hr * 0.17, T(sp.hair.color));
        x.strokeStyle = T(shadeHex(sp.hair.color, -0.3)); x.lineWidth = 1.5 * s; x.globalAlpha = 0.7;
        for (let k = 1; k < 4; k++) {
          const q = v2(lerp(pts[0].x, pts[2].x, k / 4 + 0.05), lerp(pts[0].y, pts[2].y, k / 4 + 0.05));
          x.beginPath(); x.moveTo(q.x - hr * 0.09, q.y - hr * 0.035); x.quadraticCurveTo(q.x, q.y + hr * 0.035, q.x + hr * 0.09, q.y - hr * 0.035); x.stroke();
        }
        x.globalAlpha = 1;
        x.fillStyle = T(sp.hair.color2 || '#c8463c');
        x.beginPath(); x.arc(pts[2].x, pts[2].y, hr * 0.075, 0, TAU); x.fill();
        x.fillStyle = T(sp.hair.color);
        x.beginPath(); blobEllipse(x, pts[2].x + side * 1.5 * s, pts[2].y + hr * 0.12, hr * 0.1, hr * 0.13, 99 + side, 0.15, 7); x.fill();
      }
    }
    // ears
    if (sp.ears !== false) {
      x.fillStyle = T(shadeHex(sp.head.skin, -0.06));
      const ex = hw * 0.97;
      if (aft < 0.75) { x.beginPath(); blobEllipse(x, (ex - ft * hw * 0.2) * sx, hr * 0.08, hr * 0.17, hr * 0.24, 41, 0.05, 7); x.fill(); }
      x.beginPath(); blobEllipse(x, (-ex - ft * hw * 0.2) * sx, hr * 0.08, hr * 0.17, hr * 0.24, 42, 0.05, 7); x.fill();
    }
    // face
    x.beginPath(); blobEllipse(x, 0, 0, hw, hr, 51, 0.025, 12);
    x.fillStyle = T(sp.head.skin); x.fill();
    const fcx = ft * hw * 0.42 * sx;
    if (p.back) {
      const hs3 = sp.hair.style;
      if (hs3 !== 'bald' && hs3 !== 'none') { x.fillStyle = T(sp.hair.color); x.beginPath(); blobEllipse(x, 0, -hr * 0.05, hw * 1.02, hr * 1.0, 52, 0.04, 12); x.fill(); }
      if (hs3 === 'bald') { x.fillStyle = T(sp.hair.color); x.beginPath(); blobEllipse(x, 0, hr * 0.35, hw * 0.95, hr * 0.45, 53, 0.08, 10); x.fill(); }
      if (hs3 === 'plaits') {
        for (const side of [-1, 1]) tube(x, [v2(side * hw * 0.35, hr * 0.3), v2(side * hw * 0.5, hr * 0.8), v2(side * hw * 0.58, hr * 1.15)], hr * 0.27, hr * 0.17, T(sp.hair.color));
      }
    }
    if (p.back) { /* skip face */ } else {
    // jaw shading toward the back side (form)
    const nod = (p.nod ?? 0) * hr * 0.22;
    const eyeY = sp.eyes.y * hr + nod;
    const gap = sp.eyes.gap * hr * lerp(1, 0.62, aft);
    // blush
    if (sp.head.blush) {
      const bl = T(sp.head.blush);
      x.globalAlpha = 0.38 + (p.cheek ?? 0) * 0.3;
      for (const side of [-1, 1]) {
        if (aft > 0.7 && side * ft * sx < 0) continue;
        const g = x.createRadialGradient(fcx + side * gap * 1.15, eyeY + hr * 0.42, 0, fcx + side * gap * 1.15, eyeY + hr * 0.42, hr * 0.3);
        g.addColorStop(0, bl); g.addColorStop(1, 'rgba(0,0,0,0)');
        x.fillStyle = g; x.fillRect(-hw * 2, -hr * 2, hw * 4, hr * 4);
      }
      x.globalAlpha = 1;
    }
    // beard (under features)
    if (sp.beard) {
      x.fillStyle = T(sp.beard);
      x.beginPath();
      x.moveTo(-hw * 0.95, hr * 0.05); x.quadraticCurveTo(-hw * 0.9, hr * 1.05, fcx, hr * 1.12); x.quadraticCurveTo(hw * 0.9, hr * 1.05, hw * 0.95, hr * 0.05);
      x.quadraticCurveTo(fcx + hw * 0.4, hr * 0.62, fcx, hr * 0.6); x.quadraticCurveTo(fcx - hw * 0.4, hr * 0.62, -hw * 0.95, hr * 0.05);
      x.fill();
    }
    // eyes
    const ec = sp.eyes.color || '#1d1a22';
    const lookX = (p.look?.x ?? 0) * sp.eyes.r * hr * 0.035 * sx, lookY = (p.look?.y ?? 0) * sp.eyes.r * hr * 0.03;
    const blinkK = clamp(1 - (p.blink ?? 0));
    for (const side of [-1, 1]) {
      const exx = fcx + side * gap * (side * ft * sx > 0 ? 1.0 : lerp(1, 0.75, aft));
      const er = sp.eyes.r * hr * 0.1;
      x.fillStyle = T(ec);
      if (p.eyesClosed || blinkK < 0.2 || ((p.wink ?? 0) > 0.5 && side * sx > 0)) {
        x.strokeStyle = T(ec); x.lineWidth = er * 0.55; x.lineCap = 'round';
        x.beginPath(); x.moveTo(exx - er * 1.1, eyeY + er * 0.2); x.quadraticCurveTo(exx, eyeY + er * (p.eyesClosed ? 1.0 : 0.6), exx + er * 1.1, eyeY + er * 0.2); x.stroke();
      } else {
        x.beginPath(); x.ellipse(exx + lookX, eyeY + lookY, er * 0.86, er * 1.12 * blinkK, 0, 0, TAU); x.fill();
        // tiny catch-light
        x.fillStyle = 'rgba(255,250,235,0.85)';
        x.beginPath(); x.arc(exx + lookX + er * 0.3, eyeY + lookY - er * 0.38, er * 0.22, 0, TAU); x.fill();
      }
    }
    // glasses
    if (sp.glasses) {
      x.strokeStyle = T(sp.glasses); x.lineWidth = 2.2 * s; x.globalAlpha = 0.9;
      for (const side of [-1, 1]) {
        const exx = fcx + side * gap * (side * ft * sx > 0 ? 1.0 : lerp(1, 0.75, aft));
        x.beginPath(); x.ellipse(exx, eyeY + 1 * s, hr * 0.2 * (side * ft * sx > 0 ? 1 : lerp(1, 0.7, aft)), hr * 0.18, 0, 0, TAU); x.stroke();
      }
      x.beginPath(); x.moveTo(fcx - gap * 0.55, eyeY - 1 * s); x.quadraticCurveTo(fcx, eyeY - 5 * s, fcx + gap * 0.55, eyeY - 1 * s); x.stroke();
      x.globalAlpha = 1;
    }
    // brows: the main acting tool
    const bc = T(sp.brows.color);
    const bup = (p.browUp ?? 0), bin = (p.browIn ?? 0);
    for (const side of [-1, 1]) {
      const near = side * ft * sx > 0;
      const exx = fcx + side * gap * (near ? 1.0 : lerp(1, 0.75, aft));
      const by = eyeY - sp.brows.gap * hr - bup * hr * 0.12 - (side < 0 ? (p.browL ?? 0) : (p.browR ?? 0)) * hr * 0.12;
      const len = sp.brows.len * hr * (near ? 1 : lerp(1, 0.7, aft));
      const inner = v2(exx - side * len * 0.5, by - bin * hr * 0.11);
      const outer = v2(exx + side * len * 0.5, by + bin * hr * 0.05 + (bin < 0 ? bin * hr * 0.04 : 0));
      const mid = v2((inner.x + outer.x) / 2, Math.min(inner.y, outer.y) - hr * 0.045 - bup * hr * 0.03);
      if (sp.brows.bushy) {
        x.fillStyle = bc;
        for (let k = 0; k < 4; k++) {
          const t = k / 3;
          const q = v2(lerp(inner.x, outer.x, t), lerp(inner.y, outer.y, t) + Math.sin(t * Math.PI) * (mid.y - (inner.y + outer.y) / 2));
          x.beginPath(); blobEllipse(x, q.x, q.y, sp.brows.w * s * 0.95, sp.brows.w * s * 0.62, 60 + k + side, 0.12, 7, (outer.y - inner.y) / (outer.x - inner.x || 1)); x.fill();
        }
      } else {
        x.strokeStyle = bc; x.lineWidth = sp.brows.w * s; x.lineCap = 'round';
        x.beginPath(); x.moveTo(inner.x, inner.y); x.quadraticCurveTo(mid.x, mid.y, outer.x, outer.y); x.stroke();
      }
    }
    // nose
    const nx = fcx + ft * hw * 0.22 * sx, ny = eyeY + hr * 0.26;
    x.fillStyle = T(sp.nose.color || shadeHex(sp.head.skin, -0.12));
    x.beginPath();
    if (sp.nose.big) blobEllipse(x, nx, ny + hr * 0.02, sp.nose.r * hr * 0.14 * lerp(1, 1.15, aft), sp.nose.r * hr * 0.12, 71, 0.04, 9);
    else blobEllipse(x, nx, ny, sp.nose.r * hr * 0.1, sp.nose.r * hr * 0.08, 72, 0.04, 8);
    x.fill();
    // moustache
    if (sp.moustache) {
      x.fillStyle = T(sp.moustache);
      x.beginPath(); blobEllipse(x, nx - 6 * s * sx, ny + hr * 0.2, hr * 0.26, hr * 0.1, 81, 0.12, 9, -0.2); x.fill();
      x.beginPath(); blobEllipse(x, nx + 6 * s * sx, ny + hr * 0.2, hr * 0.26, hr * 0.1, 82, 0.12, 9, 0.2); x.fill();
    }
    // mouth
    const m = p.mouth || {};
    const mw = (m.w ?? 1) * sp.mouth.w * hr * 0.2 * lerp(1, 0.75, aft);
    const my = eyeY + hr * (sp.moustache ? 0.6 : 0.5);
    const mx = fcx + ft * hw * 0.1 * sx;
    const smile = m.smile ?? 0.2, open = m.open ?? 0;
    x.fillStyle = T(sp.mouth.color || '#5a2a2e'); x.strokeStyle = x.fillStyle; x.lineCap = 'round';
    if (open > 0.05) {
      x.beginPath();
      x.moveTo(mx - mw, my - smile * mw * 0.15);
      x.quadraticCurveTo(mx, my + open * hr * 0.32 + smile * mw * 0.3, mx + mw, my - smile * mw * 0.15);
      x.quadraticCurveTo(mx, my - smile * mw * 0.2 + 1, mx - mw, my - smile * mw * 0.15);
      x.fill();
    } else {
      x.lineWidth = Math.max(1.4, 2.4 * s);
      x.beginPath(); x.moveTo(mx - mw, my - smile * mw * 0.35); x.quadraticCurveTo(mx, my + smile * mw * 0.45, mx + mw, my - smile * mw * 0.35); x.stroke();
    }
    }
    // hair on top / front
    if (!p.back) {
    x.fillStyle = T(sp.hair.color);
    if (hs === 'bald') {
      for (const side of [-1, 1]) {
        if (aft > 0.7 && side * ft * sx > 0) continue;
        x.beginPath(); blobEllipse(x, (side * hw * 0.92 - ft * hw * 0.15 * sx), -hr * 0.08, hw * 0.22, hr * 0.3, 90 + side, 0.18, 9); x.fill();
      }
    } else if (hs === 'short' || hs === 'buzz') {
      x.beginPath();
      x.moveTo(-hw * 1.0, -hr * 0.05);
      x.bezierCurveTo(-hw * 1.05, -hr * 1.15, hw * 1.05, -hr * 1.15, hw * 1.0, -hr * 0.05);
      x.quadraticCurveTo(hw * 0.7, -hr * (hs === 'buzz' ? 0.75 : 0.55), fcx + hw * 0.2, -hr * (hs === 'buzz' ? 0.82 : 0.62));
      x.quadraticCurveTo(-hw * 0.5, -hr * 0.6, -hw * 1.0, -hr * 0.05);
      x.fill();
    } else if (hs === 'curly' || hs === 'bob' || hs === 'braids' || hs === 'ponytail') {
      x.beginPath();
      if (hs === 'curly') {
        for (let k = 0; k < 7; k++) { const a = Math.PI + (k / 6) * Math.PI; blobEllipse(x, Math.cos(a) * hw * 0.85, -hr * 0.35 + Math.sin(a) * hr * 0.75, hr * 0.32, hr * 0.28, 95 + k, 0.1, 7); }
      } else {
        x.moveTo(-hw * 1.02, hr * 0.1);
        x.bezierCurveTo(-hw * 1.1, -hr * 1.2, hw * 1.1, -hr * 1.2, hw * 1.02, hr * 0.1);
        x.quadraticCurveTo(hw * 0.85, -hr * 0.45, fcx + hw * 0.35, -hr * 0.5);
        x.quadraticCurveTo(fcx - hw * 0.2, -hr * 0.3, fcx - hw * 0.5, -hr * 0.42);
        x.quadraticCurveTo(-hw * 0.95, -hr * 0.4, -hw * 1.02, hr * 0.1);
      }
      x.fill();
    } else if (hs === 'plaits') {
      if (!sp.hat) {
        // full hair cap with a centre parting (no hat indoors)
        x.beginPath();
        x.moveTo(-hw * 1.04, hr * 0.15);
        x.bezierCurveTo(-hw * 1.12, -hr * 1.22, hw * 1.12, -hr * 1.22, hw * 1.04, hr * 0.15);
        x.quadraticCurveTo(hw * 0.9, -hr * 0.4, fcx + hw * 0.1, -hr * 0.5);
        x.quadraticCurveTo(-hw * 0.9, -hr * 0.4, -hw * 1.04, hr * 0.15);
        x.fill();
        x.strokeStyle = T(shadeHex(sp.hair.color, -0.3)); x.lineWidth = 2 * s;
        x.beginPath(); x.moveTo(fcx * 0.6, -hr * 0.98); x.quadraticCurveTo(fcx * 0.8, -hr * 0.7, fcx + hw * 0.1, -hr * 0.52); x.stroke();
      }
      // fringe peeking under the hat
      x.beginPath();
      x.moveTo(-hw * 0.95, -hr * 0.28);
      x.quadraticCurveTo(fcx - hw * 0.3, -hr * 0.12, fcx + hw * 0.1, -hr * 0.3);
      x.quadraticCurveTo(fcx + hw * 0.5, -hr * 0.1, hw * 0.95, -hr * 0.3);
      x.lineTo(hw * 0.9, -hr * 0.6); x.lineTo(-hw * 0.9, -hr * 0.6); x.closePath(); x.fill();
    }
    }
    // hats
    if (sp.hat && sp.hat.style !== 'none') {
      const hc = T(sp.hat.color), hc2 = T(sp.hat.color2 || shadeHex(sp.hat.color, -0.2));
      const hs2 = sp.hat.style;
      if (hs2 === 'bobble' || hs2 === 'beanie' || hs2 === 'woolly') {
        x.fillStyle = hc;
        x.beginPath();
        x.moveTo(-hw * 1.04, -hr * 0.32);
        x.bezierCurveTo(-hw * 1.12, -hr * 1.45, hw * 1.12, -hr * 1.45, hw * 1.04, -hr * 0.32);
        x.closePath(); x.fill();
        // ribbed fold band
        x.beginPath(); x.moveTo(-hw * 1.08, -hr * 0.22);
        x.quadraticCurveTo(0, -hr * 0.36, hw * 1.08, -hr * 0.22);
        x.lineTo(hw * 1.04, -hr * 0.58); x.quadraticCurveTo(0, -hr * 0.72, -hw * 1.04, -hr * 0.58); x.closePath();
        x.fillStyle = hc2; x.fill();
        x.strokeStyle = T(shadeHex(sp.hat.color2 || sp.hat.color, -0.35)); x.lineWidth = 1.5 * s; x.globalAlpha = 0.5;
        for (let k = -6; k <= 6; k++) {
          const xx = k * hw * 0.16 + fcx * 0.2;
          x.beginPath(); x.moveTo(xx, -hr * 0.27 - Math.abs(k) * 0.0); x.lineTo(xx * 0.99, -hr * 0.6); x.stroke();
        }
        x.globalAlpha = 1;
        if (hs2 === 'bobble') {
          x.fillStyle = T(sp.hat.color2 ? '#efe6d2' : '#efe6d2');
          x.beginPath(); blobEllipse(x, fcx * 0.15, -hr * 1.18, hr * 0.36, hr * 0.32, 111, 0.16, 11); x.fill();
        }
      } else if (hs2 === 'flatcap') {
        x.fillStyle = hc;
        x.beginPath();
        x.moveTo(-hw * 1.02, -hr * 0.42);
        x.bezierCurveTo(-hw * 1.0, -hr * 1.18, hw * 0.9, -hr * 1.2, hw * 1.05, -hr * 0.55);
        x.quadraticCurveTo(hw * 1.1 + hw * 0.3 * fl * sx, -hr * 0.42, (fcx + hw * 0.9 * (ft >= 0 ? 1 : -1)) * 1.0, -hr * 0.38);
        x.closePath(); x.fill();
        // brim toward facing
        x.fillStyle = hc2;
        x.beginPath(); blobEllipse(x, fcx + hw * 0.45 * (ft * sx >= 0 ? 1 : -1), -hr * 0.42, hw * 0.62, hr * 0.12, 121, 0.04, 9, 0.0); x.fill();
      } else if (hs2 === 'hijab') {
        x.fillStyle = hc;
        x.beginPath();
        x.moveTo(-hw * 0.82, hr * 0.3);
        x.bezierCurveTo(-hw * 1.35, -hr * 1.5, hw * 1.35, -hr * 1.5, hw * 0.82, hr * 0.3);
        x.quadraticCurveTo(hw * 0.95, hr * 1.2, hw * 1.25, hr * 1.55);
        x.lineTo(-hw * 1.25, hr * 1.55);
        x.quadraticCurveTo(-hw * 0.95, hr * 1.2, -hw * 0.82, hr * 0.3);
        // cut out the face oval (even-odd)
        x.moveTo(fcx + hw * 0.8, -hr * 0.05);
        x.ellipse(fcx, hr * 0.05, hw * 0.8, hr * 0.85, 0, 0, TAU, true);
        x.fill('evenodd');
        x.strokeStyle = hc2; x.lineWidth = 3 * s; x.globalAlpha = 0.6;
        x.beginPath(); x.ellipse(fcx, hr * 0.05, hw * 0.82, hr * 0.87, 0, Math.PI * 1.05, Math.PI * 1.95); x.stroke(); x.globalAlpha = 1;
      } else if (hs2 === 'hood') {
        x.fillStyle = hc;
        x.beginPath();
        x.moveTo(-hw * 1.0, hr * 0.7);
        x.bezierCurveTo(-hw * 1.5, -hr * 1.55, hw * 1.5, -hr * 1.55, hw * 1.0, hr * 0.7);
        x.moveTo(fcx + hw * 0.82, 0);
        x.ellipse(fcx, hr * 0.08, hw * 0.82, hr * 0.92, 0, 0, TAU, true);
        x.fill('evenodd');
      }
    }
    x.restore();
  };

  // ---------- assemble with lighting groups ----------
  const groups: ((x: C2D) => void)[] = [];
  const back = (x: C2D) => {
    if (!p.hidden?.legs) paintLeg(x, lB, false);
    if (!p.hidden?.armB) paintArm(x, aB, false, p.holdB);
  };
  const body = (x: C2D) => {
    if (!p.hidden?.legs) paintLeg(x, lF, true);
    paintBody(x);
  };
  const frontArm = (x: C2D) => paintArm(x, aF, true, p.holdF);
  if (p.only === 'armF') groups.push(frontArm);
  else { groups.push(back, body, paintHead); if (!p.hidden?.armF) groups.push(frontArm); }
  for (const g of groups) litGroup(f, bb, L, g, opts.target, { alpha: opts.alpha });
  return { hips: W(0, hipY), neck, head: headC, handF: aF[2], handB: aB[2], shoulderF: nearSh, shoulderB: farSh, top: v2(headC.x, headC.y - sp.head.r * s * 1.4) };
}

/** Lighten (+) or darken (-) a hex colour, returning hex. */
export function shadeHex(h: string, k: number): string {
  const n = parseInt(h.replace('#', ''), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (k < 0) { r = r * (1 + k) + 30 * -k; g = g * (1 + k) + 32 * -k; b = b * (1 + k) + 60 * -k; }
  else { r = r + (255 - r) * k; g = g + (246 - g) * k; b = b + (228 - b) * k; }
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return '#' + c(r) + c(g) + c(b);
}

/** Walk cycle: phase in cycles. Returns limb angles + bob. */
export function walk(phase: number, stride = 0.42, armSwing = 0.35) {
  const a = Math.sin(phase * TAU);
  const k1 = Math.max(0, Math.sin(phase * TAU + 1.6));
  const k2 = Math.max(0, Math.sin(phase * TAU + 1.6 + Math.PI));
  return {
    legF: { a: a * stride, b: -k1 * 0.7 },
    legB: { a: -a * stride, b: -k2 * 0.7 },
    armF: { a: -a * armSwing, b: 0.25 + Math.max(0, -a) * 0.3 },
    armB: { a: a * armSwing, b: 0.25 + Math.max(0, a) * 0.3 },
    bob: -Math.abs(Math.cos(phase * TAU)) * 5 + 3,
    lean: 0.06,
  };
}
