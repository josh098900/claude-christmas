// Sequence J: seen from space. A crane up over the blazing house, through cloud, to the curve of the Earth.
import { shot } from '../film';
import { W, H } from '../core/stage';
import { prog } from '../core/anim';
import { ease, lerp, clamp, hash1, smoothstep, TAU } from '../core/math';
import { riseView, earthView } from '../sets/aerial';
import { drawTown } from '../sets/town3d';
import { glow } from '../draw/light';


const T3D = 3.6;    // 3D town until here
const EARTH = 3.4;  // earth view from here (hidden in cloud)

shot('J1', (f) => {
  const t = f.tc;
  const c = f.ctx;
  if (t < T3D) {
    const u = clamp(t / T3D);
    const e = u * u * (3 - 2 * u);
    const h = Math.exp(lerp(Math.log(20), Math.log(900), e));
    const pitch = lerp(0.62, 1.5, smoothstep(0, 0.7, u));
    const tgt = { x: 0, y: 4, z: 3 };
    const cam = { x: tgt.x, y: h, z: tgt.z - (h - tgt.y) / Math.tan(pitch), pitch, f: 1100 };
    drawTown(f, cam, { blaze: 1, fog: 2400 + h * 0.8 });
    glow(f.glow, W / 2, H / 2, 30 + 300 / Math.sqrt(h), '#ffd08a', 0.55);
    glow(f.glow, W / 2, H / 2, 6, '#fff6e6', 0.9);
  }
  if (t >= EARTH) {
    const u = prog(t, EARTH, f.dur, ease.outCubic);
    if (t < T3D) {
      // crossfade inside the cloud
      const st = f.stage, S = f.S, A = st.scratch(), B = st.scratch();
      A.x.setTransform(S, 0, 0, S, 0, 0); B.x.setTransform(S, 0, 0, S, 0, 0); B.x.globalCompositeOperation = 'lighter';
      earthView({ ...f, ctx: A.x, glow: B.x }, u, u);
      const a = clamp((t - EARTH) / (T3D - EARTH));
      for (const [dst, src] of [[c, A.c], [f.glow, B.c]] as const) { dst.save(); dst.setTransform(1, 0, 0, 1, 0, 0); dst.globalAlpha = a; dst.drawImage(src, 0, 0); dst.restore(); }
      st.release(2);
    } else earthView(f, u, u);
  }
  // rising through cloud: soft puffs swell past, a brief white-out
  const ca = smoothstep(2.6, 3.3, t) * (1 - smoothstep(3.6, 4.4, t));
  if (ca > 0.01) {
    for (let i = 0; i < 22; i++) {
      const a = hash1(i * 2.7) * TAU, r0 = 40 + hash1(i * 5.1) * 420;
      const grow = Math.exp((t - 3.2) * 1.8 * (0.6 + hash1(i)));
      const x = W / 2 + Math.cos(a) * r0 * grow, y = H / 2 + Math.sin(a) * r0 * grow * 0.7;
      const rr = (260 + hash1(i * 3.3) * 360) * grow;
      const gr = c.createRadialGradient(x, y, 0, x, y, rr);
      gr.addColorStop(0, `rgba(96,108,160,${0.42 * ca})`); gr.addColorStop(0.55, `rgba(74,86,140,${0.24 * ca})`); gr.addColorStop(1, 'rgba(60,70,120,0)');
      c.fillStyle = gr; c.fillRect(x - rr, y - rr, rr * 2, rr * 2);
      glow(f.glow, x, y + rr * 0.25, rr * 0.7, '#ffb070', 0.05 * ca);
    }
  }
  f.grade.vignette = 0.45; f.grade.bloom = 1.1; f.grade.saturation = 1.1;
});
