// Sequence J: seen from space.
import { shot } from '../film';
import { prog } from '../core/anim';
import { ease, lerp, clamp } from '../core/math';
import { riseView } from '../sets/aerial';

shot('J1', (f) => {
  const u = prog(f.tc, 0, f.dur, (x) => ease.inOutCubic(x));
  const alt = Math.exp(lerp(Math.log(30), Math.log(2.2e6), u));
  riseView(f, alt, { blaze: 1 });
  f.grade.vignette = 0.45; f.grade.bloom = 1.1; f.grade.saturation = 1.1;
});
