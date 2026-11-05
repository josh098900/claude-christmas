// Sequence E: THE TURN. Claude sends her to people.
import { shot } from '../film';
import { F, W, H } from '../core/stage';
import { prog, track, blink, settle } from '../core/anim';
import { ease, lerp, clamp, v2, TAU } from '../core/math';
import { planWall, DESK_Y } from '../sets/bedroom';
import { typed, typeDur, Msg } from '../draw/tablet';
import { drawPerson, Pose, Spec } from '../chars/rig';
import * as C from '../chars/cast';
import { CharLight } from '../draw/shade';
import { glow } from '../draw/light';
import { blobEllipse } from '../draw/brush';
import { tabletCU, deskScene, nellDeskLight, MUM_HOME, Q1, Q2, Q3, R1, R2, R3 } from './seqD';
import { santaPapers } from '../sets/props';
import { rToScreen } from '../sets/bedroom';

export const Q4 = 'i need them on the roof but im not allowed up ladders';
export const R4 = 'Good rule. This bit needs more people. Who lives on the street?';

const HISTORY: Msg[] = [
  { who: 'me', text: Q1 }, { who: 'reply', text: R1, blur: 7 },
  { who: 'me', text: Q2 }, { who: 'reply', text: R2, blur: 7 },
  { who: 'me', text: Q3 }, { who: 'reply', text: R3, blur: 7 },
];

/** Over-the-shoulder foreground: the backs of Nell's and Mum's heads side by side, rim-lit by the screen. */
function readingTogether(f: F, t: number, mumLean = 0, mumNod = 0) {
  const L: CharLight = { key: -1.57, shadow: '#1e1a30', shadowAmt: 0.7, shadowOff: 26, shadowSoft: 8, rim: '#ffd29a', rimAmt: 1.0, rimW: 8, rimDir: -1.45, ambient: '#3a3050', ambientAmt: 0.8, spots: [{ x: 960, y: 520, r: 900, color: '#ffc98e', a: 0.18 }] };
  // Mum first (slightly behind), taller, leaning in over Nell's shoulder: bob + teal scarf from behind
  drawPerson(f, MUM_HOME, { x: 820 - mumLean * 40, y: 1770, s: 2.6, back: true, turn: 0.1, flip: -1, headTilt: 0.12 + mumNod * 0.12, lean: 0.1 + mumLean * 0.12, armF: { a: 0.3, b: 0.4 }, armB: { a: 0.2, b: 0.4 } }, { ...L, rimDir: -1.7 });
  drawPerson(f, C.NELL_HOME, { x: 400, y: 1660, s: 2.9, back: true, turn: 0.1, flip: 1, headTilt: 0.06, lean: 0.05, armF: { a: 0.6, b: 0.6 }, armB: { a: 0.4, b: 0.6 } }, L);
  void t;
}

// E1: slow, deliberate typing. We read every letter. (cue sheet: taps 0.35–3.0)
shot('E1', (f) => {
  const t = f.t;
  const T0 = 0.35, TS = 3.0;
  // hesitant: a pause before "but"
  const a = 'i need them on the roof', b = Q4.slice(a.length);
  const ta = 1.25;
  const ty = t < T0 + ta ? typed(a, t, T0, typeDur(a, 1, 5) / ta, 5) : t < T0 + ta + 0.35 ? a : a + typed(b, t, T0 + ta + 0.35, typeDur(b, 1, 7) / (TS - T0 - ta - 0.4), 7);
  const sent = t >= TS + 0.1;
  // only what is on screen (older messages are scrolled out of frame; saves blurring them)
  const msgs: Msg[] = [{ who: 'me', text: Q3 }, { who: 'reply', text: R3, blur: 7 }];
  if (sent) msgs.push({ who: 'me', text: Q4, reveal: prog(t, TS + 0.1, TS + 0.25, ease.outCubic) });
  if (f.tc < 1.0) {
    // side two-shot: Nell typing, Mum leaning over her shoulder, both faces lit warm by the screen
    const cam = { x: 10, y: -318, z: 2.95 };
    const tap = ty.length % 2;
    deskScene(f, cam, { look: { x: 1, y: 0.35 }, browIn: -0.15, browUp: 0.15, mouth: { smile: 0.05, w: 0.6 }, armF: { a: 1.2 + tap * 0.06, b: 0.35 - tap * 0.1 }, blink: blink(t, [0.7]) }, { msgs: [] }, {
      jar: 0.95, tangles: 0, coils: 5,
      beforeNell: (tabS) => {
        const p = rToScreen(cam, v2(-130, -10));
        drawPerson(f, MUM_HOME, { x: p.x, y: p.y, s: cam.z * 0.92, flip: 1, turn: 0.85, hipDrop: -30, legF: { a: 1.4, b: -1.4 }, legB: { a: 1.3, b: -1.4 }, lean: 0.28,
          look: { x: 1, y: 0.4 }, nod: 0.25, browUp: 0.2, mouth: { smile: 0.25 }, armF: { a: 0.9, b: 0.9 }, armB: { a: 0.7, b: 1.0 } } as Pose, nellDeskLight(tabS, 0.9));
      },
    });
    return;
  }
  const z = lerp(1.24, 1.3, prog(f.tc, 0, f.dur, ease.inOutSine));
  tabletCU(f, { msgs, typing: sent ? '' : ty, caret: !sent, font: 44 }, { zoom: z, oy: -370, ox: 60 });
  readingTogether(f, t, prog(t, 1.2, 1.8, ease.inOutCubic));
  f.grade.vignette = 0.68;
});

// E2: the first readable reply. Plain and short. (piano enters at E2+0.30)
shot('E2', (f) => {
  const t = f.t, tc = f.tc;
  const msgs: Msg[] = [{ who: 'reply', text: R3, blur: 7 }, { who: 'me', text: Q4 }];
  const TR = 0.3, TD = 2.1;
  if (t >= TR) msgs.push({ who: 'reply', text: R4, reveal: prog(t, TR, TD, ease.linear), blur: 0 });
  const push = prog(tc, 1.6, f.dur, ease.inOutSine);
  const z = lerp(1.28, 1.5, push);
  tabletCU(f, { msgs, typing: '', caret: false, thinking: t < TR ? 1 : 0, font: 46 }, { zoom: z, oy: lerp(-370, -390, push), ox: lerp(60, 190, push) });
  // Mum reads it too; a small nod as the last line lands
  readingTogether(f, t, 1, Math.sin(clamp((t - 2.3) / 0.6) * Math.PI) * 1.0);
  f.grade.vignette = lerp(0.65, 0.78, push);
});

// E3: she looks up at her wall; every string leads to Grandad's house. It was never a trap.
const NELL_HAT: Spec = { ...C.NELL_HOME, hat: C.NELL.hat };
function hatInHand(x: CanvasRenderingContext2D, hp: { x: number; y: number }, s: number) {
  x.fillStyle = '#e3a53a';
  x.beginPath(); x.moveTo(hp.x - 34 * s, hp.y + 4 * s); x.bezierCurveTo(hp.x - 38 * s, hp.y - 46 * s, hp.x + 38 * s, hp.y - 46 * s, hp.x + 34 * s, hp.y + 4 * s); x.closePath(); x.fill();
  x.fillStyle = '#c9892a'; x.fillRect(hp.x - 36 * s, hp.y - 4 * s, 72 * s, 14 * s);
  x.fillStyle = '#efe6d2'; x.beginPath(); blobEllipse(x, hp.x, hp.y - 44 * s, 16 * s, 14 * s, 3, 0.15, 9); x.fill();
}

shot('E3', (f) => {
  const t = f.t, tc = f.tc;
  const CUT = 0.6; // strings swell on the reveal
  if (tc < CUT) {
    const cam = { x: 46, y: -318, z: 2.9 };
    const up = prog(t, 0.05, 0.4, ease.outBack);
    deskScene(f, cam, { look: { x: 1, y: -1 * up }, headTilt: -0.12 * up, nod: -0.5 * up, browUp: 0.9 * up, mouth: { open: 0.25 * up, smile: 0 }, armF: { a: 1.0, b: 0.6 } }, { msgs: [] }, {
      jar: 0.95, tangles: 0, coils: 5,
      beforeNell: (tabS) => {
        const p = rToScreen(cam, v2(-150, -10));
        drawPerson(f, MUM_HOME, { x: p.x, y: p.y, s: cam.z * 0.92, flip: 1, turn: 0.8, hipDrop: -30, legF: { a: 1.4, b: -1.4 }, legB: { a: 1.3, b: -1.4 }, lean: 0.22 - 0.12 * up,
          look: { x: 1, y: 0.3 - 1.2 * up }, nod: 0.2 - 0.6 * up, headTilt: -0.1 * up, browUp: 0.5 * up, mouth: { smile: 0.2 }, armF: { a: 0.9, b: 0.9 }, armB: { a: 0.7, b: 1.0 } } as Pose, nellDeskLight(tabS, 0.8));
      },
    });
    return;
  }
  const u = prog(tc, CUT, 3.0, ease.inOutCubic);
  const c = f.ctx;
  const z = lerp(3.1, 1.02, u), cx = lerp(0, -40, u), cy = lerp(-10, -150, u);
  for (const x of [c, f.glow]) { x.save(); x.translate(W / 2, H / 2); x.scale(z, z); x.translate(-cx, -cy); }
  c.fillStyle = '#26346a'; c.fillRect(-2000, -1400, 4000, 2800);
  planWall(f, c, { reveal: 1, tally: '1,206' });
  santaPapers(f, c);
  c.save(); c.globalCompositeOperation = 'multiply'; c.fillStyle = '#6a74b8'; c.fillRect(-1300, -700, 2600, 1400); c.restore();
  // warm torch light holding on the centre drawing; the strings glow toward it
  c.save(); c.globalCompositeOperation = 'lighter';
  const g = c.createRadialGradient(0, -10, 20, 0, -10, 420);
  g.addColorStop(0, 'rgba(255,215,150,0.5)'); g.addColorStop(0.5, 'rgba(255,200,140,0.18)'); g.addColorStop(1, 'rgba(255,200,140,0)');
  c.fillStyle = g; c.beginPath(); c.ellipse(0, -10, 420, 360, 0, 0, TAU); c.fill();
  c.restore();
  glow(f.glow, 0, -10, 380, '#ffd29a', 0.2 + 0.1 * u);
  for (const x of [c, f.glow]) x.restore();
  // Nell in the foreground (right), seen from behind, looking at the wall; then she turns, decided, and grabs her hat
  const inN = prog(tc, 1.6, 2.4, ease.outCubic);
  if (inN > 0) {
    const turnT = prog(t, 2.9, 3.2, ease.inOutCubic);
    const hatOn = t >= 3.6;
    const raise = prog(t, 3.05, 3.55, ease.inOutCubic);
    const L: CharLight = { key: Math.PI + 0.3, shadow: '#232a58', shadowAmt: 0.8, shadowOff: 22, shadowSoft: 6, rim: '#ffcf96', rimAmt: 0.9, rimW: 7, rimDir: Math.PI + 0.25, ambient: '#4a5498', ambientAmt: 0.72, spots: [{ x: 1300, y: 600, r: 520, color: '#ffc58a', a: 0.25 * turnT }] };
    const pose: Pose = {
      x: lerp(2050, 1520, inN), y: 1290, s: 2.35, flip: turnT < 0.5 ? -1 : 1, turn: turnT < 0.5 ? 0.6 : lerp(0.2, 0.5, turnT), back: turnT < 0.5,
      browIn: -1 * turnT, mouth: { smile: -0.15 * turnT + 0.35 * (hatOn ? 1 : 0), w: 0.8 }, look: { x: turnT > 0.5 ? 0.8 : 0, y: 0 },
      armF: hatOn ? { a: 0.15, b: 0.3 } : { a: lerp(0.2, 2.6, raise), b: lerp(0.3, 0.9, raise) },
      armB: { a: -0.1, b: 0.2 }, lean: 0.05 + 0.08 * turnT, blink: blink(t, [3.75]),
      holdF: hatOn || t < 2.95 ? undefined : (x, hp) => hatInHand(x, hp, 2.35 * 0.9),
    };
    drawPerson(f, hatOn ? NELL_HAT : C.NELL_HOME, pose, L);
    // Mum, left foreground: watches the wall, then turns to Nell with a small knowing smile and nod
    const mt = prog(t, 2.85, 3.1, ease.inOutCubic);
    const nodM = Math.abs(Math.sin(clamp((t - 3.1) / 0.8) * Math.PI * 2)) * 0.6;
    drawPerson(f, MUM_HOME, {
      x: lerp(-260, 330, inN), y: 1330, s: 2.2, flip: mt < 0.5 ? 1 : 1, turn: mt < 0.5 ? 0.5 : lerp(0.4, 0.75, mt), back: mt < 0.5,
      look: { x: 1, y: 0.1 }, nod: nodM, headTilt: 0.12 * mt, browUp: 0.7 * mt, browIn: -0.15 * mt, mouth: { smile: 1.0 * mt, open: 0.28 * mt, w: 1.05 }, cheek: 1.4 * mt, eyesClosed: mt > 0.5 && nodM > 0.25,
      armF: { a: 0.3, b: 1.2 }, armB: { a: 0.1, b: 0.3 }, lean: 0.04,
    }, { ...L, rimDir: -0.4, key: -0.3, spots: [{ x: 700, y: 600, r: 520, color: '#ffc58a', a: 0.22 * mt }] });
  }
  f.grade.vignette = 0.62; f.grade.bloom = 0.8;
});
