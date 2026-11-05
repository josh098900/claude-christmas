// Klaus-style lighting for flat shapes: core shadow and rim light derived from the shape's own
// silhouette offset along the light direction, plus local light pools (tablet glow, torch, bulbs).
import { C2D, F } from '../core/stage';
import { hex, rgbStr, lerp } from '../core/math';

export interface Spot { x: number; y: number; r: number; color: string; a: number; }
export interface CharLight {
  key: number;          // angle (radians, screen space) pointing from the subject TOWARD the key light
  shadow: string;       // multiply colour for the core shadow
  shadowAmt: number;
  shadowOff: number;    // offset in logical px
  shadowSoft: number;   // blur in logical px
  rim: string;          // rim light colour (additive)
  rimAmt: number;
  rimW: number;         // logical px
  rimDir?: number;      // angle toward rim light (defaults to opposite of key → back light)
  ambient: string;      // tint multiplied into all base colours
  ambientAmt: number;
  spots?: Spot[];       // additive light pools (logical coords)
  bounce?: { color: string; a: number }; // ground bounce from below
}

export const NIGHT: CharLight = {
  key: -2.3, shadow: '#59648f', shadowAmt: 0.75, shadowOff: 16, shadowSoft: 4,
  rim: '#9fc2ff', rimAmt: 0.55, rimW: 5, ambient: '#9aa6cf', ambientAmt: 0.45,
};

/** Multiply a design colour by the scene's ambient tint. */
export function tint(c: string, L: CharLight | null, extra = 0): string {
  if (!L) return c;
  const a = hex(c), b = hex(L.ambient);
  const k = L.ambientAmt;
  let r = lerp(a[0], (a[0] * b[0]) / 255, k), g = lerp(a[1], (a[1] * b[1]) / 255, k), bl = lerp(a[2], (a[2] * b[2]) / 255, k);
  if (extra) { r *= 1 + extra; g *= 1 + extra; bl *= 1 + extra; }
  return rgbStr([Math.min(255, r), Math.min(255, g), Math.min(255, bl)]);
}

export interface BBox { x: number; y: number; w: number; h: number; }

function devBox(f: F, b: BBox) {
  const S = f.S;
  const x0 = Math.max(0, Math.floor(b.x * S) - 4), y0 = Math.max(0, Math.floor(b.y * S) - 4);
  const x1 = Math.min(f.stage.pw, Math.ceil((b.x + b.w) * S) + 4), y1 = Math.min(f.stage.ph, Math.ceil((b.y + b.h) * S) + 4);
  return { x: x0, y: y0, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0) };
}
function blit(dst: C2D, src: HTMLCanvasElement, d: { x: number; y: number; w: number; h: number }, ox = 0, oy = 0) {
  dst.drawImage(src, d.x, d.y, d.w, d.h, d.x + ox, d.y + oy, d.w, d.h);
}


// Fast soft blur: downsample then upsample with smoothing (software canvas blur filters are slow).
let SMALL: HTMLCanvasElement | null = null;
function softBlit(dst: C2D, src: HTMLCanvasElement, d: { x: number; y: number; w: number; h: number }, radius: number) {
  const k = Math.max(1, Math.min(8, radius / 1.5));
  if (k <= 1.05) { blit(dst, src, d); return; }
  const sw = Math.max(1, Math.ceil(d.w / k)), sh = Math.max(1, Math.ceil(d.h / k));
  if (!SMALL) SMALL = document.createElement('canvas');
  if (SMALL.width < sw || SMALL.height < sh) { SMALL.width = Math.max(SMALL.width, sw); SMALL.height = Math.max(SMALL.height, sh); }
  const sx = SMALL.getContext('2d')!;
  sx.setTransform(1, 0, 0, 1, 0, 0); sx.globalCompositeOperation = 'source-over'; sx.globalAlpha = 1;
  sx.clearRect(0, 0, sw + 2, sh + 2);
  sx.imageSmoothingEnabled = true; sx.imageSmoothingQuality = 'low';
  sx.drawImage(src, d.x, d.y, d.w, d.h, 0, 0, sw, sh);
  dst.imageSmoothingEnabled = true; dst.imageSmoothingQuality = 'medium';
  dst.drawImage(SMALL, 0, 0, sw, sh, d.x, d.y, d.w, d.h);
}

/**
 * Draw a group of shapes with lighting. `draw` receives a context in logical coordinates.
 * Result is composited onto `target` (defaults to f.ctx).
 */
export function litGroup(f: F, bbox: BBox, L: CharLight | null, draw: (x: C2D) => void, target?: C2D, opts: { noRim?: boolean; noShadow?: boolean; alpha?: number } = {}) {
  const st = f.stage, S = f.S;
  const d = devBox(f, bbox);
  const A = st.scratch();
  A.x.setTransform(S, 0, 0, S, 0, 0);
  draw(A.x);
  A.x.setTransform(1, 0, 0, 1, 0, 0);
  let used = 1;
  if (L) {
    const B = st.scratch(), C = st.scratch(); used += 2;
    // ---- core shadow ----
    if (!opts.noShadow && L.shadowAmt > 0) {
      const ox = Math.cos(L.key) * L.shadowOff * S, oy = Math.sin(L.key) * L.shadowOff * S;
      blit(B.x, A.c, d);
      B.x.globalCompositeOperation = 'destination-out';
      blit(B.x, A.c, d, ox, oy);
      B.x.globalCompositeOperation = 'source-in';
      B.x.fillStyle = L.shadow; B.x.fillRect(d.x, d.y, d.w, d.h);
      softBlit(C.x, B.c, d, L.shadowSoft * S);
      C.x.globalCompositeOperation = 'destination-in';
      blit(C.x, A.c, d);
      A.x.globalCompositeOperation = 'multiply';
      A.x.globalAlpha = L.shadowAmt;
      blit(A.x, C.c, d);
      A.x.globalAlpha = 1;
      A.x.globalCompositeOperation = 'source-over';
      B.x.globalCompositeOperation = 'source-over'; C.x.globalCompositeOperation = 'source-over';
      B.x.clearRect(d.x, d.y, d.w, d.h); C.x.clearRect(d.x, d.y, d.w, d.h);
    }
    // ---- light pools (additive, masked to shape) ----
    if (L.spots && L.spots.length) {
      B.x.setTransform(S, 0, 0, S, 0, 0);
      B.x.globalCompositeOperation = 'lighter';
      for (const s of L.spots) {
        const g = B.x.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r);
        const c = hex(s.color);
        g.addColorStop(0, rgbStr(c, s.a)); g.addColorStop(0.5, rgbStr(c, s.a * 0.35)); g.addColorStop(1, rgbStr(c, 0));
        B.x.fillStyle = g; B.x.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
      }
      B.x.setTransform(1, 0, 0, 1, 0, 0);
      B.x.globalCompositeOperation = 'destination-in';
      blit(B.x, A.c, d);
      A.x.globalCompositeOperation = 'lighter';
      blit(A.x, B.c, d);
      A.x.globalCompositeOperation = 'source-over';
      B.x.globalCompositeOperation = 'source-over';
      B.x.clearRect(d.x, d.y, d.w, d.h);
    }
    // ---- rim light ----
    if (!opts.noRim && L.rimAmt > 0) {
      const rd = L.rimDir ?? L.key;
      const ox = -Math.cos(rd) * L.rimW * S, oy = -Math.sin(rd) * L.rimW * S;
      blit(B.x, A.c, d);
      B.x.globalCompositeOperation = 'destination-out';
      blit(B.x, A.c, d, ox, oy);
      B.x.globalCompositeOperation = 'source-in';
      B.x.fillStyle = L.rim; B.x.fillRect(d.x, d.y, d.w, d.h);
      softBlit(C.x, B.c, d, L.rimW * 0.35 * S);
      C.x.globalCompositeOperation = 'destination-in';
      blit(C.x, A.c, d);
      A.x.globalCompositeOperation = 'lighter';
      A.x.globalAlpha = L.rimAmt;
      blit(A.x, C.c, d);
      A.x.globalAlpha = 1; A.x.globalCompositeOperation = 'source-over';
    }
  }
  const T = target || f.ctx;
  T.save();
  T.setTransform(1, 0, 0, 1, 0, 0);
  if (opts.alpha !== undefined) T.globalAlpha = opts.alpha;
  T.drawImage(A.c, d.x, d.y, d.w, d.h, d.x, d.y, d.w, d.h);
  T.restore();
  // characters occlude light sources behind them (glow drawn earlier), so they never look ghostly
  if (!target || target === f.ctx) {
    const G = f.glow;
    G.save(); G.setTransform(1, 0, 0, 1, 0, 0);
    G.globalCompositeOperation = 'destination-out'; G.globalAlpha = 0.85 * (opts.alpha ?? 1);
    G.drawImage(A.c, d.x, d.y, d.w, d.h, d.x, d.y, d.w, d.h);
    G.restore();
  }
  st.release(used);
}
