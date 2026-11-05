// Shared staging helpers for shots.
import { F } from '../core/stage';
import { CharLight } from '../draw/shade';
import { Cam, toScreen } from '../sets/street';
import { Pose, Spec, drawPerson, Rigged } from '../chars/rig';
import { v2 } from '../core/math';

/** World scale for characters standing in the street set (door = 210 units ≈ 2 m). */
export const STREET_S = 0.43;

/** Place a character in street-world coordinates (feet at wx, wy) and draw it in screen space. */
export function personInStreet(f: F, cam: Cam, sp: Spec, wx: number, wy: number, pose: Partial<Pose>, L: CharLight | null, scale = STREET_S): Rigged {
  const p = toScreen(cam, v2(wx, wy));
  return drawPerson(f, sp, { ...pose, x: p.x, y: p.y, s: scale * cam.z } as Pose, L);
}

// ---- light rigs ----
export const L_NIGHT_STREET: CharLight = {
  key: -2.2, shadow: '#3d4a80', shadowAmt: 0.7, shadowOff: 14, shadowSoft: 4,
  rim: '#ffcf8a', rimAmt: 0.6, rimW: 4, rimDir: -1.0, ambient: '#7c87bd', ambientAmt: 0.62,
};
export const L_BLAZE_BACK: CharLight = {
  // crowd seen from behind, the blazing house in front of them: strong warm rim all round, dark backs
  key: -1.57, shadow: '#2a2f5a', shadowAmt: 0.6, shadowOff: 26, shadowSoft: 8,
  rim: '#ffc27a', rimAmt: 1.0, rimW: 7, rimDir: -1.57, ambient: '#2a2f5c', ambientAmt: 0.9,
};
export const L_BLAZE_FRONT: CharLight = {
  // faces lit by the blaze
  key: -1.2, shadow: '#7a4a6a', shadowAmt: 0.45, shadowOff: 12, shadowSoft: 5,
  rim: '#ff9fc0', rimAmt: 0.7, rimW: 5, rimDir: -2.4, ambient: '#ffd3a0', ambientAmt: 0.25,
};
export const L_DARK_STREET: CharLight = {
  // the dead switch: street all dark, only cold moonlight
  key: -2.0, shadow: '#262c55', shadowAmt: 0.7, shadowOff: 12, shadowSoft: 4,
  rim: '#8fb0ff', rimAmt: 0.45, rimW: 3.5, rimDir: -2.6, ambient: '#5f6aa8', ambientAmt: 0.75,
};
