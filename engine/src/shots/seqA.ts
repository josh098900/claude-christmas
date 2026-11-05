// Sequence A: the only dark house.
import { shot } from '../film';
import { prog } from '../core/anim';
import { ease, lerp } from '../core/math';
import { drawStreet, snowfall, makeTerrace } from '../sets/street';

const TERRACE = makeTerrace(-7, 7);

shot('A2', (f) => {
  const u = prog(f.tc, 0, f.dur, ease.inOutSine);
  const cam = { x: lerp(-60, 0, u), y: lerp(-300, -330, u), z: lerp(0.40, 0.52, u) };
  drawStreet(f, {
    mood: 'dusk', cam, houses: TERRACE,
    lit: (h) => (h.grandad ? 0 : 1), windows: (h) => (h.grandad ? 0 : 1),
    snow: 1, lampsOn: 1,
  });
  snowfall(f, 0.8, 0.25, 1);
  f.grade.vignette = 0.45; f.grade.bloom = 1.0;
});
