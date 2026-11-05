#!/usr/bin/env python3
"""
SEEN FROM SPACE: mix and master.

Music stems go through a synthetic convolution hall (about 2.2 s) and a gentle bus compressor.
Interior foley gets a small room, while exterior foley and wind stay dry because snow swallows sound.
Wet-reverb automation honours the two hard stops: the "stop dead" at 109.0 s, and the switch
click at 122.75 s, after which there is no music at all until Grandad kneels.
The master is set to -14 LUFS integrated with a true-peak ceiling of -1 dBTP.

Outputs:
  audio/out/mix.wav            48 kHz stereo 24-bit, exactly 168.0 s
  final/score.wav              copy of the master
  audio/out/stems_mix/*.wav    music / foley / wind group stems at master gain (pre-limiter)
"""
import os, sys, shutil, subprocess
import numpy as np
from scipy import signal
import pyloudnorm as pyln

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import SR, STEMS, OUT, ROOT, LENGTH, CLICK, BLAZE, read_wav, write_wav, ensure_dirs, st

NLEN = int(round(LENGTH * SR))
rng = np.random.default_rng(7)


def load(name):
    x = read_wav(os.path.join(STEMS, name + '.wav'))
    if len(x) < NLEN:
        x = np.vstack([x, np.zeros((NLEN - len(x), 2), np.float32)])
    return x[:NLEN].astype(np.float64)


def pan(x, p):
    """Re-balance a stereo stem toward pan p (-1..1) keeping width."""
    l = np.cos((p + 1) * np.pi / 4) * np.sqrt(2); r = np.sin((p + 1) * np.pi / 4) * np.sqrt(2)
    return np.stack([x[:, 0] * l, x[:, 1] * r], 1)


def make_ir(rt60, length, predelay=0.012, bright=0.5, er=True, seed=1):
    """Synthetic stereo reverb impulse response: early reflections + band-dependent decaying noise."""
    r = np.random.default_rng(seed)
    n = int(length * SR)
    t = np.arange(n) / SR
    ir = np.zeros((n, 2))
    bands = [(20, 400, rt60 * 1.25), (400, 3000, rt60), (3000, 16000, rt60 * (0.35 + 0.4 * bright))]
    for ch in range(2):
        tail = np.zeros(n)
        for lo, hi, rt in bands:
            nz = r.standard_normal(n)
            sos = signal.butter(2, [lo, min(hi, SR / 2 - 100)], btype='band', fs=SR, output='sos')
            tail += signal.sosfilt(sos, nz) * np.exp(-6.91 * t / rt)
        fade_in = np.clip((t - predelay) / 0.03, 0, 1)
        ir[:, ch] = tail * fade_in
        if er:
            for k in range(10):
                d = predelay + r.uniform(0.004, 0.06)
                i = int(d * SR)
                if i < n:
                    ir[i, ch] += r.uniform(0.3, 0.8) * (1 if r.random() > 0.5 else -1) * np.exp(-d * 8)
    ir /= np.sqrt(np.sum(ir ** 2) / 2)
    return ir


def convolve(x, ir):
    out = np.zeros((len(x) + len(ir) - 1, 2))
    for ch in range(2):
        out[:, ch] = signal.fftconvolve(x[:, ch], ir[:, ch])
    return out[:len(x)]


def automation(points, n=NLEN):
    tt = np.array([p[0] for p in points]); gg = np.array([p[1] for p in points])
    return np.interp(np.arange(n) / SR, tt, gg)


def compressor(x, thresh_db=-20, ratio=2.0, attack=0.02, release=0.25, knee=6):
    """Gentle feed-forward RMS bus compressor (stereo-linked)."""
    m = np.sqrt(np.mean(x ** 2, axis=1) + 1e-12)
    a_a = np.exp(-1 / (attack * SR)); a_r = np.exp(-1 / (release * SR))
    # smooth envelope (one-pole, attack/release), vectorised via lfilter in two passes
    env = signal.lfilter([1 - a_r], [1, -a_r], m)
    env = np.maximum(env, signal.lfilter([1 - a_a], [1, -a_a], m))
    lvl = 20 * np.log10(env + 1e-9)
    over = lvl - thresh_db
    gr = np.where(over <= -knee / 2, 0, np.where(over >= knee / 2, over * (1 - 1 / ratio), (over + knee / 2) ** 2 / (2 * knee) * (1 - 1 / ratio)))
    g = 10 ** (-gr / 20)
    return x * g[:, None]


def true_peak(x):
    up = signal.resample_poly(x, 4, 1, axis=0)
    return 20 * np.log10(np.max(np.abs(up)) + 1e-12)


def limiter(x, ceiling_db=-1.2, lookahead=0.005, release=0.08):
    """Look-ahead brickwall on the 4x-oversampled envelope."""
    c = 10 ** (ceiling_db / 20)
    up = np.abs(signal.resample_poly(x, 4, 1, axis=0)).max(axis=1)
    pk = up.reshape(-1, 4).max(axis=1)[:len(x)]
    if len(pk) < len(x):
        pk = np.concatenate([pk, np.zeros(len(x) - len(pk))])
    need = np.minimum(1.0, c / (pk + 1e-12))
    la = int(lookahead * SR)
    # min over look-ahead window (so gain is already down when the peak arrives)
    from scipy.ndimage import minimum_filter1d
    need = minimum_filter1d(need, size=2 * la + 1, origin=0)
    # smooth release (gain can drop instantly, rises slowly)
    a = np.exp(-1 / (release * SR))
    g = need.copy()
    # vectorised-ish recursive release in chunks
    out = np.empty_like(g); cur = 1.0
    for i in range(len(g)):
        v = g[i]
        cur = v if v < cur else a * cur + (1 - a) * v
        out[i] = cur
    return x * out[:, None]


def main():
    ensure_dirs()
    # ---------------------------------------------------------------- music
    groups = {
        'celesta': (1.0, 0.2), 'piano': (1.0, -0.05), 'glock': (0.55, 0.35), 'pizz': (0.95, -0.3),
        'strings': (0.9, 0.0), 'pad': (0.8, 0.0), 'bass': (0.85, 0.0), 'choir': (0.7, 0.0),
        'harp': (0.8, -0.25), 'timp': (0.7, -0.1), 'trem': (0.8, 0.1),
    }
    dry = np.zeros((NLEN, 2))
    for name, (g, p) in groups.items():
        dry += pan(load(name), p) * g
    dry = signal.sosfiltfilt(signal.butter(2, 32, btype='high', fs=SR, output='sos'), dry, axis=0)  # no sub rumble
    # reverb send automation: generous, except the hard stops
    hall = make_ir(2.2, 3.2, predelay=0.02, bright=0.45, seed=3)
    wet_amt = automation([
        (0, 0.42), (108.95, 0.42), (109.0, 0.42),
        (CLICK - 0.005, 0.42), (CLICK, 0.42), (BLAZE - 1.0, 0.42), (BLAZE, 0.5), (147.0, 0.5), (LENGTH, 0.55)])
    wet = convolve(dry, hall)
    # after the stop-dead at 109.0 the hall decays quickly (a quarter of a second), and after the CLICK
    # it is gone in 30 ms: H5 is wind only.
    ret = automation([(0, 1), (109.0, 1), (109.35, 0.12), (110.5, 0.0), (112.4, 0.0), (112.5, 1.0),
                      (CLICK - 0.001, 1.0), (CLICK + 0.03, 0.0), (st('I1', 0.4), 0.0), (st('I1', 0.5), 1.0), (LENGTH, 1.0)])
    music = dry + wet * (wet_amt * ret)[:, None]
    # dry hard-cut safety at the click (sample-accurate) and stop-dead
    gate = automation([(0, 1), (CLICK - 0.002, 1), (CLICK + 0.008, 0), (st('I1', 0.45), 0), (st('I1', 0.5), 1), (LENGTH, 1)])
    music *= gate[:, None]
    # section rides (dB): lift the intimate passages, give the climax headroom so the limiter barely works
    ride_db = automation([(0, 3.0), (27.0, 3.0), (27.6, 0.5), (64.4, 0.5), (64.6, 2.0), (71.5, 2.0), (72.5, 0.0),
                          (127.9, 0.0), (128.0, 3.5), (BLAZE - 0.003, 3.5), (BLAZE, -3.0), (157.0, -3.0), (157.6, 1.0), (LENGTH, 1.0)])
    music *= (10 ** (ride_db / 20))[:, None]
    music = compressor(music, thresh_db=-24, ratio=1.6, attack=0.03, release=0.35)
    music = compressor(music, thresh_db=-15, ratio=3.0, attack=0.012, release=0.25, knee=8)  # tames the climax so the limiter barely works

    # ---------------------------------------------------------------- foley + wind
    room = make_ir(0.45, 0.7, predelay=0.004, bright=0.6, seed=5)
    outdoor = make_ir(0.6, 0.9, predelay=0.03, bright=0.2, er=False, seed=9)
    fi = load('foley_int'); fe = load('foley_ext'); wind = load('wind')
    foley = fi + convolve(fi, room) * 0.35 + fe + convolve(fe, outdoor) * 0.12
    wind = wind * 0.22

    # ---------------------------------------------------------------- balance
    # loudness-balance music vs foley by their own reference levels
    meter = pyln.Meter(SR)
    mus_l = meter.integrated_loudness(music.astype(np.float64))
    music *= 10 ** ((-16.0 - mus_l) / 20)       # music sits at about -16 LUFS before mastering
    fol_peak = np.max(np.abs(foley)) + 1e-9
    foley *= 0.42 / fol_peak                     # foley peaks below the music peaks
    mix = music + foley + wind

    # fades
    t = np.arange(NLEN) / SR
    fade = np.clip(t / 0.02, 0, 1) * np.clip((LENGTH - t) / 1.2, 0, 1) ** 1.5
    mix *= fade[:, None]; music *= fade[:, None]; foley *= fade[:, None]; wind *= fade[:, None]

    # ---------------------------------------------------------------- master: -14 LUFS, <= -1 dBTP
    target = -14.0
    g_total = 1.0
    out = mix.copy()
    for it in range(4):
        L = meter.integrated_loudness(out)
        gain = 10 ** ((target - L) / 20)
        g_total *= gain
        out = limiter(mix * g_total, ceiling_db=-1.3)
    L = meter.integrated_loudness(out)
    tp = true_peak(out)
    print('master: integrated %.2f LUFS, true peak %.2f dBTP, gain %.2f dB' % (L, tp, 20 * np.log10(g_total)))

    # ---------------------------------------------------------------- write
    os.makedirs(os.path.join(OUT, 'stems_mix'), exist_ok=True)
    tmp = os.path.join(OUT, 'mix_float.wav')
    write_wav(tmp, out)
    final_mix = os.path.join(OUT, 'mix.wav')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-c:a', 'pcm_s24le', final_mix], check=True)
    os.remove(tmp)
    for name, x in (('music', music), ('foley', foley), ('wind', wind)):
        p = os.path.join(OUT, 'stems_mix', name + '_tmp.wav')
        write_wav(p, x * g_total)
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', p, '-c:a', 'pcm_s24le', os.path.join(OUT, 'stems_mix', name + '.wav')], check=True)
        os.remove(p)
    os.makedirs(os.path.join(ROOT, 'final'), exist_ok=True)
    shutil.copyfile(final_mix, os.path.join(ROOT, 'final', 'score.wav'))
    np.save(os.path.join(OUT, 'music_bus.npy'), (music * g_total).astype(np.float32)[::48])  # 1 kHz envelope proxy for analysis
    print('wrote', final_mix, 'and final/score.wav')


if __name__ == '__main__':
    main()
