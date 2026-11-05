// The framed photo: young Grandma pointing at the sky, young Grandad crouched by the door with a bulb.
import { F, W, H } from '../core/stage';
import { v2, clamp } from '../core/math';
import { drawStreet, makeTerrace, doorRect } from '../sets/street';
import * as C from '../chars/cast';
import { personInStreet, L_BLAZE_FRONT } from './common';
import { handRect } from '../draw/brush';

const TER = makeTerrace(-3, 3);
const GH = TER.find((h) => h.grandad)!;
const DR = doorRect(GH);

/** Render the photo's content into rect (x,y,w,h) in screen space, with a frame. */
export function drawPhoto(f: F, x: number, y: number, w: number, h: number, o: { frame?: number; fade?: number } = {}) {
  const st = f.stage, S = f.S;
  const A = st.scratch(), B = st.scratch();
  A.x.setTransform(S, 0, 0, S, 0, 0); B.x.setTransform(S, 0, 0, S, 0, 0); B.x.globalCompositeOperation = 'lighter';
  const sub: F = { ...f, ctx: A.x, glow: B.x };
  const doorX = DR.x + DR.w / 2;
  const cam = { x: doorX - 130, y: -150, z: 2.5 };
  drawStreet(sub, { mood: 'eve', cam, houses: TER, lit: () => 0, windows: (hh) => (hh.grandad ? 1 : 0.6), blaze: 1, blazeOn: 1, lampsOn: 0, bellFrost: 0, smoke: false, farLights: 0.6 });
  // young Grandma laughing, pointing at the sky
  personInStreet(sub, cam, C.GRANDMA_PHOTO, doorX - 260, 60, { flip: 1, turn: 0.35, armF: { a: 2.75, b: 0.1 }, armB: { a: -0.3, b: 0.4 }, browUp: 0.8, mouth: { open: 0.7, smile: 1 }, eyesClosed: true, cheek: 1, headTilt: -0.15 }, L_BLAZE_FRONT);
  // young Grandad crouched by the door, bulb between his fingers, looking up at her
  personInStreet(sub, cam, C.GRANDAD_YOUNG, doorX - 10, 40, { flip: -1, turn: 0.5, hipDrop: 92, legF: { a: 1.5, b: -2.1 }, legB: { a: 0.6, b: -2.2 }, lean: 0.25, armF: { a: 1.2, b: 0.9 }, armB: { a: 0.5, b: 0.6 }, look: { x: 0.6, y: -1 }, headTilt: 0.25, mouth: { smile: 0.8 }, browUp: 0.4 }, L_BLAZE_FRONT);
  // composite into the frame with a faded-print look
  const c = f.ctx;
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  const fr = o.frame ?? 1;
  const bx = x * S, by = y * S, bw = w * S, bh = h * S;
  if (fr > 0) {
    // wooden frame + mount
    c.fillStyle = '#7a5a32'; c.fillRect(bx - 34 * S, by - 34 * S, bw + 68 * S, bh + 68 * S);
    c.fillStyle = '#a07a46'; c.fillRect(bx - 26 * S, by - 26 * S, bw + 52 * S, bh + 52 * S);
    c.fillStyle = '#efe6d2'; c.fillRect(bx - 16 * S, by - 16 * S, bw + 32 * S, bh + 32 * S);
  }
  c.beginPath(); c.rect(bx, by, bw, bh); c.clip();
  // centre the 1920x1080 sub-render on the photo rect (crop)
  const sw = st.pw, sh = st.ph;
  const k = Math.max(bw / sw, bh / sh) * 1.0;
  const dw = sw * k, dh = sh * k;
  c.filter = 'sepia(0.25) saturate(0.95) contrast(0.95) brightness(0.92)';
  c.drawImage(A.c, bx + (bw - dw) / 2, by + (bh - dh) / 2, dw, dh);
  c.globalCompositeOperation = 'lighter';
  c.drawImage(B.c, bx + (bw - dw) / 2, by + (bh - dh) / 2, dw, dh);
  c.globalCompositeOperation = 'source-over';
  c.filter = 'none';
  // print fade + glass reflection
  c.fillStyle = `rgba(240,225,200,${0.10 + (o.fade ?? 0)})`; c.fillRect(bx, by, bw, bh);
  c.fillStyle = 'rgba(255,255,255,0.07)'; c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + bw * 0.45, by); c.lineTo(bx, by + bh * 0.6); c.closePath(); c.fill();
  c.restore();
  st.release(2);
  void handRect; void clamp; void v2; void W; void H;
}
