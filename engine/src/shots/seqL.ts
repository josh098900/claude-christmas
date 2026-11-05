// End card.
import { shot } from '../film';
import { W, H } from '../core/stage';
import { prog } from '../core/anim';
import { ease, lerp, clamp, hash1 } from '../core/math';
import { glow } from '../draw/light';
import { vgrad } from '../draw/brush';

export const TAGLINE = 'Think it through. Then knock on doors.';

shot('L1', (f) => {
  const c = f.ctx, t = f.tc;
  vgrad(c, 0, 0, W, H, [[0, '#0a1230'], [1, '#141f48']]);
  // a scatter of faint stars, and one warm dot (the house, from space)
  for (let i = 0; i < 70; i++) glow(f.glow, hash1(i * 3.1) * W, hash1(i * 5.3) * H, 2 + hash1(i) * 2, '#dfe6ff', 0.18);
  const dotA = prog(t, 0.0, 1.2, ease.outCubic);
  glow(f.glow, W / 2, 330, 22, '#ffd08a', 0.9 * dotA);
  glow(f.glow, W / 2, 330, 6, '#fff6e6', dotA);
  const a1 = prog(t, 0.5, 1.6, ease.outCubic), a2 = prog(t, 1.3, 2.4, ease.outCubic), a3 = prog(t, 2.0, 3.0);
  c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  c.fillStyle = `rgba(244,236,222,${a1})`;
  c.font = '400 54px Inter';
  c.fillText(TAGLINE, W / 2, 560 + (1 - a1) * 12);
  c.fillStyle = `rgba(244,236,222,${a2})`;
  c.font = '600 76px Inter';
  c.fillText('Claude', W / 2, 700 + (1 - a2) * 10);
  c.fillStyle = `rgba(200,196,214,${0.75 * a3})`;
  c.font = '400 22px Inter';
  c.fillText('Fan-made. Not affiliated with or endorsed by Anthropic.', W / 2, 1010);
  c.textAlign = 'left';
  f.grade.vignette = 0.4; f.grade.grain = 0.6; f.grade.boil = 0.4; f.grade.tooth = 0.3;
  f.grade.fade = clamp((t - (f.dur - 0.7)) / 0.7); // fade to black at the very end
});
