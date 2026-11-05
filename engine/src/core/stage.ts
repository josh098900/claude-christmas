// The Stage owns the paint canvases for one frame, plus scratch canvases for lighting work.
import { Grade, defaultGrade } from '../post/post';

export const W = 1920;
export const H = 1080;

export type C2D = CanvasRenderingContext2D;

export interface F {
  /** local shot time, quantised to twos: use for anything drawn (poses, props, boil) */
  t: number;
  /** continuous local time (24 fps): use for camera moves and light flicker */
  tc: number;
  dur: number;
  /** global frame number */
  frame: number;
  /** boil index: changes every 2 frames */
  boil: number;
  /** device scale (0.5 preview, 1 final) */
  S: number;
  ctx: C2D;   // base paint, logical 1920x1080 coordinates
  glow: C2D;  // additive light layer
  grade: Grade;
  stage: Stage;
  shotId: string;
}

export class Stage {
  S: number;
  pw: number; ph: number;
  base: HTMLCanvasElement; glowC: HTMLCanvasElement;
  ctx: C2D; glow: C2D;
  private pool: HTMLCanvasElement[] = [];
  private poolUsed = 0;

  constructor(scale: number) {
    this.S = scale;
    this.pw = Math.round(W * scale); this.ph = Math.round(H * scale);
    this.base = this.mk(); this.glowC = this.mk();
    this.ctx = this.base.getContext('2d', { willReadFrequently: false })!;
    this.glow = this.glowC.getContext('2d')!;
  }
  mk(w = this.pw, h = this.ph): HTMLCanvasElement {
    const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
  }
  begin(): void {
    for (const c of [this.ctx, this.glow]) {
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.filter = 'none';
    }
    this.ctx.fillStyle = '#000'; this.ctx.fillRect(0, 0, this.pw, this.ph);
    this.glow.clearRect(0, 0, this.pw, this.ph);
    this.ctx.setTransform(this.S, 0, 0, this.S, 0, 0);
    this.glow.setTransform(this.S, 0, 0, this.S, 0, 0);
    this.glow.globalCompositeOperation = 'lighter';
    this.poolUsed = 0;
  }
  /** Borrow a full-frame scratch canvas (device pixels, identity transform, cleared). Released at frame end. */
  scratch(): { c: HTMLCanvasElement; x: C2D } {
    if (this.poolUsed >= this.pool.length) this.pool.push(this.mk());
    const c = this.pool[this.poolUsed++];
    const x = c.getContext('2d')!;
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.filter = 'none';
    x.clearRect(0, 0, c.width, c.height);
    return { c, x };
  }
  release(n: number) { this.poolUsed = Math.max(0, this.poolUsed - n); }
  newGrade(): Grade { return defaultGrade(); }
}
