// The cast. Simple, round, readable shapes; every silhouette distinct at thumbnail size.
import { Spec } from './rig';

export const SKIN = { nell: '#f2c6a2', grandad: '#eec2a2', mum: '#f0c3a2', dad: '#eebd9c' };

export const NELL: Spec = {
  name: 'Nell',
  legLen: 64, hipW: 34, legW: 15, legColor: '#2b3456',
  boot: { color: '#2f6b4a', h: 28, len: 13 },
  torso: 86, shoulderW: 62, hemW: 122, hemY: 40,
  coat: { color: '#c23f36', trim: '#8f2a28', style: 'aline', buttons: '#eedcb6' },
  arm: { upper: 40, lower: 35, w: 25, color: '#c23f36', cuff: '#a8342e' },
  hand: { r: 11.5, color: '#e3a53a', mitten: true },
  head: { r: 56, w: 1.0, neck: 4, skin: SKIN.nell, blush: '#ec8f7f' },
  eyes: { r: 1.05, gap: 0.36, y: 0.1 },
  brows: { color: '#4b2a18', w: 6.2, len: 0.36, gap: 0.24 },
  nose: { r: 1.0, color: '#e2a487' },
  mouth: { w: 1.0, color: '#7a3434' },
  hair: { style: 'plaits', color: '#6e4126', color2: '#2f6b4a' },
  hat: { style: 'bobble', color: '#e3a53a', color2: '#c9892a' },
  stoop: 0,
};

/** Nell indoors at night: jumper, no hat. */
export const NELL_HOME: Spec = {
  ...NELL,
  coat: { color: '#d8a24a', trim: '#b9842e', style: 'jumper' },
  arm: { ...NELL.arm, color: '#d8a24a', cuff: '#c08b34', w: 19 },
  hand: { r: 9.5, color: SKIN.nell },
  shoulderW: 58, hemW: 84, hemY: 58, legColor: '#3b4a7a',
  boot: { color: '#e9dfcf', h: 12, len: 12 },
  hat: undefined,
  hair: { style: 'plaits', color: '#6e4126', color2: '#2f6b4a' },
};

export const GRANDAD: Spec = {
  name: 'Grandad',
  legLen: 172, hipW: 50, legW: 31, legColor: '#5d5a62',
  boot: { color: '#6b3f34', h: 16, len: 22 },
  torso: 162, shoulderW: 104, hemW: 104, hemY: 150,
  coat: { color: '#8c6f50', trim: '#6c5238', style: 'cardigan', buttons: '#4b3a2a', inner: '#a6bcd2' },
  arm: { upper: 76, lower: 70, w: 28, color: '#8c6f50', cuff: '#7a5f44' },
  hand: { r: 17.5, color: SKIN.grandad },
  head: { r: 50, w: 0.9, neck: 10, skin: SKIN.grandad, blush: '#df8e80' },
  eyes: { r: 1.0, gap: 0.34, y: 0.02 },
  brows: { color: '#f3efe6', w: 7.5, len: 0.44, gap: 0.26, bushy: true },
  nose: { r: 1.45, big: true, color: '#e0a08a' },
  mouth: { w: 0.85, color: '#7a4040' },
  hair: { style: 'bald', color: '#efebe2' },
  glasses: '#3a3036',
  stoop: 0.2,
};

export const GRANDAD_OUT: Spec = {
  ...GRANDAD,
  coat: { color: '#2e384b', trim: '#232a3a', style: 'long', buttons: '#1b2130' },
  arm: { ...GRANDAD.arm, color: '#2e384b', cuff: '#252d3d' },
  hemY: 70, hemW: 128,
  hat: { style: 'flatcap', color: '#6d5c49', color2: '#5a4b3a' },
  scarf: '#8e3340',
  boot: { color: '#2a2422', h: 20, len: 24 },
};

export const GRANDMA_PHOTO: Spec = {
  name: 'Grandma',
  legLen: 120, hipW: 46, legW: 24, legColor: '#3d3a4a',
  boot: { color: '#3a2a26', h: 18, len: 18 },
  torso: 120, shoulderW: 86, hemW: 120, hemY: 70,
  coat: { color: '#c97c86', trim: '#a8606c', style: 'cardigan', buttons: '#f2e3c8', inner: '#f0e2c4' },
  arm: { upper: 54, lower: 50, w: 22, color: '#c97c86' },
  hand: { r: 12, color: '#f0c7aa' },
  head: { r: 46, w: 0.95, neck: 6, skin: '#f0c7aa', blush: '#e48f84' },
  eyes: { r: 1.0, gap: 0.35, y: 0.06 },
  brows: { color: '#5a3424', w: 5.5, len: 0.34, gap: 0.24 },
  nose: { r: 1.0 },
  mouth: { w: 1.0 },
  hair: { style: 'curly', color: '#7a4a32' },
  glasses: '#5a3a3a',
  stoop: 0,
};

export const GRANDAD_YOUNG: Spec = {
  ...GRANDAD,
  hair: { style: 'short', color: '#5a3d2a' },
  brows: { ...GRANDAD.brows, color: '#4a3020' },
  coat: { color: '#3d5a7a', style: 'jumper' },
  arm: { ...GRANDAD.arm, color: '#3d5a7a' },
  stoop: 0.02,
  glasses: undefined,
};

export const MUM: Spec = {
  name: 'Mum',
  legLen: 150, hipW: 44, legW: 24, legColor: '#2d2f3d',
  boot: { color: '#3a2a24', h: 30, len: 18 },
  torso: 128, shoulderW: 80, hemW: 104, hemY: 62,
  coat: { color: '#b27d4c', trim: '#8e5f36', style: 'long', buttons: '#5a3e26' },
  arm: { upper: 58, lower: 54, w: 22, color: '#b27d4c' },
  hand: { r: 11.5, color: SKIN.mum },
  head: { r: 46, w: 0.92, neck: 8, skin: SKIN.mum, blush: '#e38e80' },
  eyes: { r: 1.0, gap: 0.35, y: 0.06 },
  brows: { color: '#4b2a18', w: 5.4, len: 0.36, gap: 0.24 },
  nose: { r: 1.0 }, mouth: { w: 1.0 },
  hair: { style: 'ponytail', color: '#6e4126' },
  scarf: '#2f6b6a',
  stoop: 0,
};

export const DAD: Spec = {
  name: 'Dad',
  legLen: 160, hipW: 50, legW: 28, legColor: '#3a4256',
  boot: { color: '#e5ddd0', h: 12, len: 20 },
  torso: 140, shoulderW: 96, hemW: 98, hemY: 140,
  coat: { color: '#4f6b3a', style: 'jumper' },
  arm: { upper: 64, lower: 58, w: 25, color: '#4f6b3a' },
  hand: { r: 13, color: SKIN.dad },
  head: { r: 47, w: 0.95, neck: 8, skin: SKIN.dad, blush: '#db8a78' },
  eyes: { r: 1.0, gap: 0.34, y: 0.02 },
  brows: { color: '#3b2a20', w: 6, len: 0.38, gap: 0.24 },
  nose: { r: 1.15 }, mouth: { w: 0.9 },
  hair: { style: 'short', color: '#3b2a20' },
  beard: '#3b2a20',
  glasses: '#2a2228',
  stoop: 0.04,
};

export const OLD_LADY: Spec = {
  name: 'OldLady',
  legLen: 100, hipW: 40, legW: 20, legColor: '#4a3f48',
  boot: { color: '#3a2a26', h: 20, len: 16 },
  torso: 108, shoulderW: 74, hemW: 108, hemY: 40,
  coat: { color: '#7d6596', trim: '#5f4a78', style: 'long', buttons: '#e8d8b0', collar: '#d9cfc0' },
  arm: { upper: 48, lower: 44, w: 20, color: '#7d6596' },
  hand: { r: 10, color: '#f1cbb4' },
  head: { r: 42, w: 0.95, neck: 4, skin: '#f1cbb4', blush: '#e2908a' },
  eyes: { r: 0.95, gap: 0.34, y: 0.06 },
  brows: { color: '#d7d2ca', w: 5, len: 0.32, gap: 0.24 },
  nose: { r: 1.05 }, mouth: { w: 0.85 },
  hair: { style: 'curly', color: '#e9e5de' },
  glasses: '#6a4a5a',
  stoop: 0.18,
};

export const SHOPKEEPER: Spec = {
  name: 'Shopkeeper',
  legLen: 136, hipW: 48, legW: 25, legColor: '#3a3646',
  boot: { color: '#2a2422', h: 18, len: 18 },
  torso: 128, shoulderW: 88, hemW: 112, hemY: 70,
  coat: { color: '#d7ad5a', trim: '#b98f40', style: 'cardigan', buttons: '#6a4a2a', inner: '#7a3a5a' },
  arm: { upper: 56, lower: 52, w: 24, color: '#d7ad5a' },
  hand: { r: 12, color: '#b5794f' },
  head: { r: 45, w: 0.95, neck: 6, skin: '#b5794f', blush: '#b8604e' },
  eyes: { r: 1.0, gap: 0.35, y: 0.08 },
  brows: { color: '#2a1a14', w: 5.6, len: 0.36, gap: 0.24 },
  nose: { r: 1.05 }, mouth: { w: 0.95 },
  hair: { style: 'none', color: '#2a1a14' },
  hat: { style: 'hijab', color: '#2c6e6a', color2: '#1f5450' },
  ears: false,
  stoop: 0.02,
};

export const TEEN1: Spec = {
  name: 'Teen1',
  legLen: 170, hipW: 40, legW: 23, legColor: '#2b2d3a',
  boot: { color: '#e9e6e0', h: 18, len: 24 },
  torso: 140, shoulderW: 82, hemW: 86, hemY: 150,
  coat: { color: '#4f7c4a', style: 'hoodie' },
  arm: { upper: 66, lower: 60, w: 22, color: '#4f7c4a' },
  hand: { r: 12, color: '#d9a27e' },
  head: { r: 42, w: 0.88, neck: 8, skin: '#d9a27e', blush: '#c97a66' },
  eyes: { r: 0.95, gap: 0.34, y: 0.08 },
  brows: { color: '#3a2418', w: 5, len: 0.34, gap: 0.24 },
  nose: { r: 1.0 }, mouth: { w: 0.85 },
  hair: { style: 'short', color: '#3a2418' },
  hat: { style: 'hood', color: '#4f7c4a' },
  stoop: 0.08,
};

export const TEEN2: Spec = {
  name: 'Teen2',
  legLen: 150, hipW: 44, legW: 24, legColor: '#2b2d3a',
  boot: { color: '#d8c8a8', h: 22, len: 20 },
  torso: 124, shoulderW: 96, hemW: 104, hemY: 128,
  coat: { color: '#6b4d8e', style: 'puffer' },
  arm: { upper: 56, lower: 52, w: 30, color: '#6b4d8e' },
  hand: { r: 12, color: '#7a4a32' },
  head: { r: 43, w: 0.95, neck: 6, skin: '#7a4a32', blush: '#8e4a3a' },
  eyes: { r: 1.0, gap: 0.35, y: 0.08 },
  brows: { color: '#1e120c', w: 5.4, len: 0.34, gap: 0.24 },
  nose: { r: 1.05 }, mouth: { w: 0.95 },
  hair: { style: 'braids', color: '#1e140f' },
  stoop: 0,
};

export const YOUNG_DAD: Spec = {
  name: 'YoungDad',
  legLen: 160, hipW: 50, legW: 27, legColor: '#3a3a44',
  boot: { color: '#5a3a28', h: 24, len: 22 },
  torso: 138, shoulderW: 100, hemW: 106, hemY: 120,
  coat: { color: '#3d5f80', style: 'puffer' },
  arm: { upper: 62, lower: 56, w: 29, color: '#3d5f80' },
  hand: { r: 13, color: '#6a412c' },
  head: { r: 45, w: 0.92, neck: 8, skin: '#6a412c', blush: '#7f3f30' },
  eyes: { r: 1.0, gap: 0.34, y: 0.06 },
  brows: { color: '#160e0a', w: 5.8, len: 0.36, gap: 0.24 },
  nose: { r: 1.15 }, mouth: { w: 0.95 },
  hair: { style: 'buzz', color: '#160e0a' },
  hat: { style: 'beanie', color: '#d9a23c', color2: '#bf8a2c' },
  beard: '#1a120c',
  stoop: 0,
};

export const LADDER_MAN: Spec = {
  name: 'LadderMan',
  legLen: 160, hipW: 64, legW: 36, legColor: '#3e3a36',
  boot: { color: '#3a2a20', h: 28, len: 26 },
  torso: 160, shoulderW: 136, hemW: 150, hemY: 152,
  coat: { color: '#5a6a3c', style: 'round', trim: '#46542c' },
  arm: { upper: 66, lower: 62, w: 36, color: '#8a3a32' },
  hand: { r: 19, color: '#e8b49a' },
  head: { r: 52, w: 0.98, neck: 4, skin: '#e8b49a', blush: '#d97a6a' },
  eyes: { r: 0.95, gap: 0.33, y: 0.0 },
  brows: { color: '#8e8a84', w: 8, len: 0.42, gap: 0.22, bushy: true },
  nose: { r: 1.5, big: true, color: '#d9927e' },
  mouth: { w: 0.8 },
  hair: { style: 'bald', color: '#9a958e' },
  moustache: '#8f8a84',
  belly: 22,
  stoop: 0.04,
};
