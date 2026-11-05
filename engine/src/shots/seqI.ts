// Sequence I: Grandad finishes it. THE BLAZE.
import { shot } from '../film';
import { prog, settle } from '../core/anim';
import { ease, lerp, clamp, hash1, v2 } from '../core/math';
import { drawStreet, snowfall, makeTerrace, doorRect, toScreen, HOUSE_W } from '../sets/street';
import { TERRACE as TERRACE_A } from './seqA';
import { drawPerson } from '../chars/rig';
import * as C from '../chars/cast';
import { personInStreet, STREET_S, L_BLAZE_BACK, L_BLAZE_FRONT } from './common';

const TERRACE = TERRACE_A;
const GH = TERRACE.find((h) => h.grandad)!;
const DR = doorRect(GH);

// I4: the blaze. Wide, low, from behind the crowd.
shot('I4', (f) => {
  const t = f.tc;
  const flash = clamp(1 - t / 0.5);
  const u = prog(t, 0, f.dur, ease.outCubic);
  const cam = { x: lerp(10, 20, u), y: lerp(-330, -350, u), z: lerp(1.22, 1.32, u) };
  drawStreet(f, {
    mood: 'eve', cam, houses: TERRACE,
    lit: () => 0, windows: (h) => (h.grandad ? 0.6 : 0),
    blaze: 1, blazeOn: clamp(t * 12), lampsOn: 1, bellFrost: 0,
  });
  // Nell and Grandad at the door, small, lit full-on
  const doorX = DR.x + DR.w / 2;
  personInStreet(f, cam, C.GRANDAD_OUT, doorX - 70, 30, { flip: 1, turn: 0.2, hipDrop: 70, legF: { a: 1.4, b: -1.5 }, legB: { a: -0.3, b: -1.2 }, lean: -0.1, browUp: 0.7, mouth: { open: 0.3, smile: 0.6 }, armF: { a: 0.5, b: 0.4 } }, L_BLAZE_FRONT);
  personInStreet(f, cam, C.NELL, doorX + 40, 30, { flip: -1, turn: 0.3, browUp: 1, mouth: { open: 0.6, smile: 0.9 }, armF: { a: 0.6, b: 0.6 }, cheek: 1 }, L_BLAZE_FRONT);
  // the crowd, from behind, heads and shoulders against the blaze
  const crowd: [typeof C.NELL, number, number, number][] = [
    [C.MUM, 90, 1420, 1.45], [C.LADDER_MAN, 360, 1500, 1.4], [C.OLD_LADY, 640, 1320, 1.5], [C.SHOPKEEPER, 1290, 1420, 1.4],
    [C.TEEN2, 1530, 1440, 1.42], [C.TEEN1, 1760, 1520, 1.35], [C.YOUNG_DAD, 1960, 1440, 1.4],
  ];
  for (const [sp, x, y, s] of crowd) {
    drawPerson(f, sp, { x, y: y + Math.sin(t * 1.3 + x) * 3, s, back: true, turn: 0, flip: 1, headTilt: -0.12 + hash1(x) * 0.1, armF: { a: 0.1, b: 0.2 }, armB: { a: -0.1, b: 0.2 } }, L_BLAZE_BACK);
  }
  snowfall(f, 0.7, 0.2, 7, '#ffd6a0');
  const g = f.grade;
  g.saturation = 1.18; g.bloom = 1.25; g.bloomThreshold = 0.62; g.exposure = 1.0 + flash * 0.35; g.vignette = 0.4;
  g.gain = [1.04, 1.0, 0.95];
});

// ------------------------------------------------------------------ the door two-shot staging
import { blink, track as trk, antic } from '../core/anim';
import { C2D, F, W, H } from '../core/stage';
import { CharLight } from '../draw/shade';
import { L_DARK_STREET } from './common';
import { bulb, BULB_SEQ, glow, lightString } from '../draw/light';
import { blobEllipse, tube, vgrad, handRect } from '../draw/brush';
import { litGroup } from '../draw/shade';
import { V2 } from '../core/math';

const DOORX = DR.x + DR.w / 2;
const NELL_X = DR.x - 70, GRAN_X = DR.x - 175;
const KNEEL = { hipDrop: 92, legF: { a: 1.5, b: -1.55 }, legB: { a: -0.25, b: -1.35 }, lean: 0.12 };

function doorStreet(f: F, cam: { x: number; y: number; z: number }, blazeOn: number, extra: Partial<Parameters<typeof drawStreet>[1]> = {}) {
  drawStreet(f, {
    mood: 'eve', cam, houses: TERRACE, lit: () => 0, windows: () => 0,
    blaze: 1, blazeOn, lampsOn: 1, bellFrost: blazeOn > 0 ? 0 : 0.6, smoke: false, ...extra,
  });
}

// I1: Grandad kneels beside her, slowly; takes the string.
shot('I1', (f) => {
  const t = f.t;
  const u = prog(f.tc, 0, f.dur, ease.inOutSine);
  const cam = { x: lerp(DR.x - 80, DR.x - 70, u), y: -110, z: lerp(2.9, 3.05, u) };
  doorStreet(f, cam, 0);
  const k = trk(t, [[0, 0], [0.3, 0], [1.8, 1, ease.inOutCubic], [3, 1]]);
  const reach = trk(t, [[0, 0], [1.9, 0], [2.6, 1, ease.outBack], [3, 1]]);
  personInStreet(f, cam, C.GRANDAD_OUT, GRAN_X, 40, {
    flip: 1, turn: 0.55, hipDrop: KNEEL.hipDrop * k, legF: { a: 1.5 * k + 0.05, b: -1.55 * k }, legB: { a: -0.25 * k, b: -1.35 * k }, lean: 0.12 * k + 0.05,
    armF: { a: lerp(0.4, 1.35, reach), b: lerp(0.5, 0.2, reach) }, armB: { a: lerp(0.9, 0.6, k), b: 0.9 },
    look: { x: 1, y: 0.3 }, browIn: 0.3, browUp: 0.2, mouth: { smile: 0.05 }, blink: blink(t, [0.9]),
  }, L_DARK_STREET);
  personInStreet(f, cam, C.NELL, NELL_X, 50, {
    flip: -1, turn: 0.5, look: { x: 1, y: lerp(0.4, 0.1, k) }, browIn: lerp(1, 0.6, k), browUp: 0.2 * k, mouth: { smile: lerp(-0.7, -0.4, k) }, nod: lerp(0.4, 0.1, k),
    armF: { a: 0.1, b: 0.25 }, blink: blink(t, [2.2]),
  }, L_DARK_STREET);
  f.grade.vignette = 0.62; f.grade.saturation = 0.85;
});

/** A big, gentle hand (ECU). (x,y) = fingertip of the index finger. */
function bigHand(c: C2D, x: number, y: number, s: number, ang: number, skin: string, cuff: string, curl = 0) {
  c.save(); c.translate(x, y); c.rotate(ang); c.scale(s, s);
  // forearm + cuff
  tube(c, [{ x: -360, y: 40 }, { x: -230, y: 20 }], 120, 110, cuff);
  c.fillStyle = '#5a6078'; c.beginPath(); blobEllipse(c, -228, 20, 26, 58, 3, 0.05, 8); c.fill();
  // palm
  c.fillStyle = skin; c.beginPath(); blobEllipse(c, -150, 22, 90, 62, 5, 0.04, 12, -0.1); c.fill();
  // fingers (index extended, others curled)
  tube(c, [{ x: -110, y: -10 }, { x: -50, y: -8 }, { x: 0, y: 0 }], 34, 28, skin);
  for (let i = 0; i < 3; i++) {
    const yy = 18 + i * 24;
    tube(c, [{ x: -100, y: yy }, { x: -60 + curl * 20, y: yy + 6 }, { x: -70 + curl * 10, y: yy + 30 }], 32, 26, skin);
  }
  // thumb
  tube(c, [{ x: -170, y: -30 }, { x: -120, y: -54 }, { x: -86, y: -46 }], 36, 28, skin);
  // knuckle creases + nail
  c.strokeStyle = 'rgba(150,80,70,0.35)'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(-60, -20); c.quadraticCurveTo(-56, -8, -60, 4); c.stroke();
  c.fillStyle = 'rgba(255,230,215,0.7)'; c.beginPath(); blobEllipse(c, -10, -4, 10, 8, 9, 0.05, 6); c.fill();
  c.restore();
}

const L_HANDS_DARK: CharLight = { ...L_DARK_STREET, shadowOff: 22, rimW: 7, rimAmt: 0.7, ambientAmt: 0.55 };

// I2: ECU: big fingers walk the string bulb by bulb to the door; stop; wiggle.
const BULB_T = [0.2, 0.63, 1.06, 1.49, 1.92, 2.35, 2.78];
shot('I2', (f) => {
  const t = f.tc, c = f.ctx;
  // backdrop: snowy step + door frame in moonlight
  vgrad(c, 0, 0, W, H, [[0, '#1b2350'], [1, '#2c3a6e']]);
  c.fillStyle = '#3b3550'; c.beginPath(); handRect(c, 1580, -20, 360, 1120, 12, 2); c.fill(); // door frame
  c.fillStyle = '#2a3a4a'; c.fillRect(1650, -20, 300, 1120);                                  // dark green door
  c.fillStyle = '#8193c4'; c.fillRect(0, 900, W, 200);
  // the string: a gentle swag from left to the door frame
  const n = 8;
  const pts: V2[] = [];
  for (let i = 0; i < n; i++) { const u = i / (n - 1); pts.push(v2(lerp(120, 1480, u), 470 + Math.sin(u * Math.PI) * 110 - u * 40)); }
  c.strokeStyle = '#1c2b25'; c.lineWidth = 6; c.beginPath(); c.moveTo(0, 450); for (const p of pts) c.lineTo(p.x, p.y); c.lineTo(1620, 380); c.stroke();
  // which bulb the finger is on
  let fi = -1; for (let i = 0; i < BULB_T.length; i++) if (t >= BULB_T[i]) fi = i;
  const toLast = prog(t, 2.95, 3.0) ;
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const touched = fi === i ? Math.exp(-(t - BULB_T[i]) * 8) : 0;
    const loose = i === n - 1;
    const wig = loose ? Math.sin(t * 40) * 0.25 * prog(t, 2.85, 2.95) : 0;
    bulb(f, p.x, p.y, { size: 64, on: 0, color: BULB_SEQ[(i + 2) % 5], angle: Math.sin(i * 1.3) * 0.25 + touched * 0.14 + wig + (loose ? 0.35 : 0) });
  }
  // the hand: fingertip moves from bulb to bulb (on twos), small lift between
  const tq = f.t;
  let tip: V2;
  if (tq < BULB_T[0]) tip = v2(pts[0].x - 120, pts[0].y - 60);
  else {
    let i = 0; while (i < BULB_T.length - 1 && tq >= BULB_T[i + 1]) i++;
    const a = pts[i], b = pts[Math.min(i + 1, n - 1)];
    const segEnd = i < BULB_T.length - 1 ? BULB_T[i + 1] : 2.92;
    const u = clamp((tq - BULB_T[i]) / (segEnd - BULB_T[i]));
    const uu = ease.inOutCubic(clamp((u - 0.35) / 0.65));
    tip = v2(lerp(a.x, b.x, uu), lerp(a.y, b.y, uu) - Math.sin(uu * Math.PI) * 26 - 14);
  }
  litGroup(f, { x: 0, y: 0, w: W, h: H }, L_HANDS_DARK, (x) => bigHand(x, tip.x - 10, tip.y + 34, 1.15, 0.12, '#e6b496', '#2e384b', 0.3));
  void toLast;
  f.grade.vignette = 0.6; f.grade.saturation = 0.85;
});

// I3: he puts her small hand on the bulb; she twists. (blaze lands on the first frame of I4)
shot('I3', (f) => {
  const t = f.t, c = f.ctx;
  vgrad(c, 0, 0, W, H, [[0, '#1b2350'], [1, '#2c3a6e']]);
  c.fillStyle = '#3b3550'; c.beginPath(); handRect(c, 1240, -20, 360, 1120, 12, 2); c.fill();
  c.fillStyle = '#2a3a4a'; c.fillRect(1310, -20, 620, 1120);
  // the loose bulb, big, in its socket on the frame
  const bx = 1080, by = 470;
  c.strokeStyle = '#1c2b25'; c.lineWidth = 10; c.beginPath(); c.moveTo(-20, 330); c.quadraticCurveTo(500, 560, bx, by - 60); c.lineTo(1300, 300); c.stroke();
  const twist = prog(t, 1.6, 2.45, ease.inOutSine);
  bulb(f, bx, by, { size: 120, on: 0, color: BULB_SEQ[0], angle: 0.35 - twist * 0.35 });
  // twist lines on the glass
  c.strokeStyle = 'rgba(200,215,255,0.25)'; c.lineWidth = 3;
  c.beginPath(); c.arc(bx, by + 40, 70, -0.6 + twist * 1.5, 0.2 + twist * 1.5); c.stroke();
  // Grandad's big hand underneath, guiding
  const guide = prog(t, 0.0, 1.0, ease.outCubic);
  litGroup(f, { x: 0, y: 0, w: W, h: H }, L_HANDS_DARK, (x) => bigHand(x, lerp(700, bx - 110, guide), lerp(1000, by + 230, guide), 1.5, -0.55, '#e6b496', '#2e384b', 0.8));
  // Nell's mustard mitten arrives and closes on the bulb, then twists
  const arrive = prog(t, 0.6, 1.4, ease.outBack);
  litGroup(f, { x: 0, y: 0, w: W, h: H }, L_HANDS_DARK, (x) => {
    x.save(); x.translate(lerp(560, bx - 120, arrive), lerp(1250, by - 40, arrive)); x.rotate(-0.9 + twist * 0.7);
    tube(x, [{ x: -260, y: 220 }, { x: -60, y: 60 }], 150, 130, '#c23f36');
    x.fillStyle = '#a8342e'; x.beginPath(); blobEllipse(x, -60, 60, 80, 60, 4, 0.05, 9, -0.7); x.fill();
    x.fillStyle = '#e3a53a'; x.beginPath(); blobEllipse(x, 10, 0, 110, 90, 7, 0.05, 12, -0.5); x.fill();
    x.beginPath(); blobEllipse(x, -40, -80, 40, 32, 8, 0.06, 8, -1.2); x.fill();
    x.strokeStyle = 'rgba(150,90,20,0.35)'; x.lineWidth = 4;
    for (let k = 0; k < 5; k++) { x.beginPath(); x.moveTo(-60 + k * 20, 60); x.lineTo(-56 + k * 20, 90); x.stroke(); }
    x.restore();
  });
  // held breath: the faintest flicker in the bulb on the last frames
  if (t > 2.38) glow(f.glow, bx, by + 40, 90, BULB_SEQ[0], 0.15);
  f.grade.vignette = 0.62; f.grade.saturation = 0.9;
});

// I5: down the street, house after house comes back on, like a fuse.
const HOUSE_ON = (k: number) => 0.10 + (k - 1) * 0.30; // k = 1..9 (cue sheet)
shot('I5', (f) => {
  const t = f.tc;
  const u = prog(t, 0, f.dur, ease.inOutSine);
  const cam = { x: lerp(200, 500, u), y: lerp(-340, -360, u), z: lerp(0.5, 0.36, u) };
  const lit = (h: { i: number; grandad?: boolean }) => {
    if (h.grandad) return 0;
    const k = Math.abs(h.i);
    const t0 = HOUSE_ON(Math.min(9, k));
    if (f.t < t0) return 0;
    const dt = f.t - t0;
    return dt < 0.09 ? 0.5 : 1; // a stutter as they catch
  };
  drawStreet(f, { mood: 'eve', cam, houses: TERRACE, lit, windows: (h) => (h.grandad ? 0.6 : Math.min(1, lit(h) * 1.0)), blaze: 1, blazeOn: 1, lampsOn: 1, bellFrost: 0 });
  // the crowd in the street, small, turning to watch the fuse go by
  const look = Math.min(1, t / 2.5);
  const crowd: [typeof C.NELL, number, number][] = [[C.LADDER_MAN, -360, 330], [C.OLD_LADY, -200, 350], [C.SHOPKEEPER, 260, 340], [C.TEEN1, 420, 360], [C.TEEN2, 520, 330], [C.YOUNG_DAD, 700, 350], [C.MUM, -520, 340], [C.DAD, -640, 350]];
  for (const [sp, x, y] of crowd) personInStreet(f, cam, sp, x, y, { back: true, turn: 0.3 * look, flip: 1, headTilt: -0.1 }, L_BLAZE_BACK);
  snowfall(f, 0.6, 0.2, 9, '#ffd6a0');
  f.grade.saturation = 1.15; f.grade.bloom = 1.1; f.grade.vignette = 0.42;
});

// I6: Nell points at the sky, like Grandma. Grandad sees it, laughs, pulls her in. The bell.
shot('I6', (f) => {
  const t = f.t;
  const u = prog(f.tc, 0, f.dur, ease.inOutSine);
  const cam = { x: lerp(DR.x - 100, DR.x - 95, u), y: lerp(-110, -125, u), z: lerp(3.3, 3.45, u) };
  const swing = Math.sin(Math.max(0, f.tc - 1.0) * 9) * 0.35 * Math.exp(-Math.max(0, f.tc - 1.0) * 1.2) * (f.tc > 1.0 ? 1 : 0);
  doorStreet(f, cam, 1, { bellSwing: swing });
  const point = antic(t, 0.2, 0.9, 0.15);
  const sees = trk(t, [[0, 0], [0.9, 0], [1.3, 1, ease.outBack]]);
  const laugh = trk(t, [[0, 0], [1.5, 0], [1.8, 1, ease.outCubic], [4, 1]]);
  const hug = trk(t, [[0, 0], [2.3, 0], [3.1, 1, ease.inOutCubic], [4, 1]]);
  const L = { ...L_BLAZE_FRONT, spots: [{ x: W * 0.7, y: H * 0.2, r: 900, color: '#ffb070', a: 0.35 }, { x: W * 0.2, y: H * 0.5, r: 600, color: '#ff6a8a', a: 0.15 }] };
  const gPose = {
    flip: 1, turn: 0.6, ...KNEEL, lean: 0.12 - laugh * 0.12 + hug * 0.1, headTilt: -0.25 * laugh + 0.1 * hug,
    armB: { a: 0.7, b: 0.9 }, armF: { a: lerp(1.0, 1.75, hug), b: lerp(0.6, 0.9, hug) },
    look: { x: lerp(1, 0.6, sees), y: lerp(0.2, -0.6, sees) }, browUp: 0.3 + sees * 0.6, browIn: 0.4 * sees * (1 - laugh),
    mouth: { open: laugh * 0.85, smile: 0.3 + laugh * 0.7 }, eyesClosed: laugh > 0.5 && t < 3.3, cheek: laugh,
  } as any;
  personInStreet(f, cam, C.GRANDAD_OUT, GRAN_X + 30, 40, { ...gPose, hidden: { armF: true } }, L);
  personInStreet(f, cam, C.NELL, NELL_X - hug * 30, 50, {
    flip: -1, turn: lerp(0.3, 0.6, hug), lean: -hug * 0.15,
    armF: { a: lerp(0.1, 2.85, point) * (1 - hug * 0.4), b: 0.05 }, armB: { a: 0.2, b: 0.3 },
    look: { x: -0.3, y: lerp(-0.2, -1, point) * (1 - hug) }, headTilt: lerp(0, -0.25, point) * (1 - hug),
    browUp: 0.9, mouth: { open: 0.5 + 0.2 * Math.sin(t * 3), smile: 1 }, cheek: 1, eyesClosed: hug > 0.7, plait: Math.sin(t * 6) * 0.3 * hug,
  }, L);
  personInStreet(f, cam, C.GRANDAD_OUT, GRAN_X + 30, 40, { ...gPose, only: 'armF' }, L);
  snowfall(f, 0.5, 0.2, 11, '#ffd6a0');
  f.grade.saturation = 1.15; f.grade.bloom = 1.15; f.grade.vignette = 0.45; f.grade.gain = [1.05, 1.0, 0.95];
});
