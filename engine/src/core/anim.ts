// Keyframe helpers. Times are in seconds, local to the shot.
import { clamp, ease, EaseFn, lerp } from './math';

export type Key = [number, number, EaseFn?]; // [time, value, easing INTO this key]

/** Piecewise keyframe interpolation. The easing on key i shapes the segment (i-1 → i). */
export function track(t: number, keys: Key[]): number {
  if (keys.length === 0) return 0;
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, e] = keys[i];
    const [t0, v0] = keys[i - 1];
    if (t <= t1) {
      const u = t1 === t0 ? 1 : (t - t0) / (t1 - t0);
      return lerp(v0, v1, (e || ease.inOutCubic)(u));
    }
  }
  return keys[keys.length - 1][1];
}

/** Multi-channel keyframes: object of channel -> keys. */
export function tracks<T extends Record<string, Key[]>>(t: number, ch: T): { [K in keyof T]: number } {
  const out: any = {};
  for (const k in ch) out[k] = track(t, ch[k]);
  return out;
}

/** 0..1 progress of t within [a,b] with easing. */
export function prog(t: number, a: number, b: number, e: EaseFn = ease.inOutCubic) {
  return e(clamp((t - a) / (b - a)));
}

/** Quantise time to animate "on twos" (12 drawings per second). */
export const onTwos = (t: number) => Math.floor(t * 12 + 1e-6) / 12;
export const onOnes = (t: number) => Math.floor(t * 24 + 1e-6) / 24;

/** A blink: returns 0..1 closure amount, blinking at the given times. */
export function blink(t: number, times: number[], dur = 0.13): number {
  for (const b of times) {
    const u = (t - b) / dur;
    if (u >= 0 && u <= 1) return Math.sin(u * Math.PI);
  }
  return 0;
}

/** Damped spring response to a step at time t0 (for follow-through / overshoot). */
export function settle(t: number, t0: number, freq = 2.2, damp = 4.0): number {
  if (t < t0) return 0;
  const u = t - t0;
  return 1 - Math.exp(-damp * u) * Math.cos(freq * Math.PI * 2 * u);
}

/** Snappy anticipation-action-settle curve from 0 to 1 over [a,b]. */
export function antic(t: number, a: number, b: number, amount = 0.12): number {
  const u = clamp((t - a) / (b - a));
  if (u < 0.25) return -amount * Math.sin((u / 0.25) * Math.PI * 0.5);
  const v = (u - 0.25) / 0.75;
  return lerp(-amount, 1, ease.outBack(v));
}
