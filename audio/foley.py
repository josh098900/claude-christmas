#!/usr/bin/env python3
"""
SEEN FROM SPACE: synthesised foley. Every sound is built from noise, impulses and resonant
filters in numpy/scipy. No recordings or samples are used.

Writes audio/out/stems/foley_int.wav (interior events, reverbed as a small room in the mix),
foley_ext.wav (exterior events, kept dry and open), and wind.wav (the weather bed).
"""
import os, sys, json
import numpy as np
from scipy import signal

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import SR, STEMS, LENGTH, CLICK, BLAZE, st, ensure_dirs, write_wav, OUT

rng = np.random.default_rng(1225)
N = int((LENGTH + 2.0) * SR)
INT = np.zeros((N, 2), np.float32)   # interior foley
EXT = np.zeros((N, 2), np.float32)   # exterior foley
EVENTS = []  # (time, name, bus) for the cue sheet


def place(bus, t, x, gain=1.0, pan=0.0, name=None):
    """Mix a mono or stereo sound into a bus at time t (s), equal-power pan -1..1."""
    if name:
        EVENTS.append((round(float(t), 3), name, 'interior' if bus is INT else 'exterior'))
    i = int(round(t * SR))
    if x.ndim == 1:
        l = np.cos((pan + 1) * np.pi / 4); r = np.sin((pan + 1) * np.pi / 4)
        x = np.stack([x * l, x * r], 1)
    n = min(len(x), N - i)
    if n > 0:
        bus[i:i + n] += (x[:n] * gain).astype(np.float32)


def env_exp(n, tau):
    return np.exp(-np.arange(n) / (tau * SR))


def bp(x, lo, hi, order=2):
    sos = signal.butter(order, [lo, hi], btype='band', fs=SR, output='sos')
    return signal.sosfilt(sos, x)


def lp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, btype='low', fs=SR, output='sos'), x)


def hp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, btype='high', fs=SR, output='sos'), x)


def reson(x, f, q):
    """Single resonant band (2-pole) at f with quality q."""
    b, a = signal.iirpeak(f, q, fs=SR)
    return signal.lfilter(b, a, x)


def noise(n):
    return rng.standard_normal(n).astype(np.float64)


def modal(freqs, amps, taus, dur, attack=0.0008):
    """Sum of decaying sinusoids (struck objects: bells, glass, metal)."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = np.zeros(n)
    for f, a, tau in zip(freqs, amps, taus):
        y += a * np.sin(2 * np.pi * f * t + rng.uniform(0, 6.28)) * np.exp(-t / tau)
    att = np.minimum(1, t / attack)
    return y * att


def norm(x, peak=1.0):
    m = np.max(np.abs(x)) + 1e-9
    return x / m * peak


# ------------------------------------------------------------------ sound builders
def clock_tick(tock=False):
    n = int(0.06 * SR)
    ex = noise(n) * env_exp(n, 0.0015)
    body = reson(ex, 3100 if not tock else 2500, 18) + 0.6 * reson(ex, 5200 if not tock else 4300, 25) + 0.5 * reson(ex, 900 if not tock else 760, 8)
    return norm(body * env_exp(n, 0.012), 0.5)


def snow_step(weight=1.0, dur=0.17):
    """Granular crunch: many tiny compressions of snow."""
    n = int(dur * SR)
    y = np.zeros(n)
    k = int(70 * weight)
    for _ in range(k):
        p = int(abs(rng.normal(0.35, 0.22)) * n) % n
        g = int(rng.uniform(0.0004, 0.0025) * SR)
        e = min(g, n - p)
        if e <= 2:
            continue
        y[p:p + e] += noise(e) * np.hanning(e) * rng.uniform(0.2, 1.0)
    y = bp(y, 900, 7000) * 0.8 + lp(y, 500) * 0.6 * weight
    shape = np.minimum(1, np.arange(n) / (0.01 * SR)) * env_exp(n, dur * 0.45)
    thump = np.sin(2 * np.pi * 70 * np.arange(n) / SR) * env_exp(n, 0.03) * 0.25 * weight
    return norm(y * shape + thump, 0.6 * min(1.2, weight))


def creak(dur=0.9, f0=90, f1=40, q=6, bright=1.0):
    """Stick-slip friction: an irregular impulse train through wooden resonances."""
    n = int(dur * SR)
    y = np.zeros(n)
    t = 0.0
    while t < dur:
        u = t / dur
        rate = f0 + (f1 - f0) * u + 25 * np.sin(u * 9)
        y[int(t * SR)] = rng.uniform(0.5, 1.0)
        t += 1.0 / max(15, rate) * rng.uniform(0.85, 1.2)
    out = reson(y, 420 * bright, q) + 0.7 * reson(y, 980 * bright, q * 1.3) + 0.4 * reson(y, 1900 * bright, q * 1.6)
    e = np.sin(np.linspace(0, np.pi, n)) ** 0.6
    return norm(out * e, 0.55)


def scrape(dur=0.9):
    n = int(dur * SR)
    x = noise(n)
    am = 0.5 + 0.5 * np.abs(signal.sosfilt(signal.butter(2, 25, fs=SR, output='sos'), noise(n))) * 6
    y = bp(x, 300, 2400) * np.clip(am, 0, 2)
    e = np.minimum(1, np.arange(n) / (0.05 * SR)) * np.minimum(1, (n - np.arange(n)) / (0.15 * SR))
    return norm(y * e, 0.45)


def key_jingle(dur=0.5):
    n = int(dur * SR)
    y = np.zeros(n)
    for k in range(9):
        p = int(rng.uniform(0, 0.32) * SR)
        f = rng.uniform(2800, 7200)
        s = modal([f, f * 1.47, f * 2.31], [1, 0.5, 0.3], [0.05, 0.03, 0.02], dur)
        y[p:] += s[:n - p] * rng.uniform(0.3, 1.0)
    return norm(hp(y, 1500), 0.4)


def thud(f=70, dur=0.35, weight=1.0, click=0.3):
    n = int(dur * SR)
    t = np.arange(n) / SR
    fs = f * (1 + 0.6 * np.exp(-t / 0.02))
    body = np.sin(2 * np.pi * np.cumsum(fs) / SR) * np.exp(-t / (0.06 * weight))
    nz = lp(noise(n), 1200) * np.exp(-t / 0.02) * 0.6
    cl = hp(noise(n), 2000) * np.exp(-t / 0.003) * click
    return norm(body + nz + cl, 0.9)


def door_shut():
    a = thud(62, 0.5, 1.2, 0.2)
    latch = modal([1800, 3100, 4700], [1, 0.5, 0.3], [0.03, 0.02, 0.015], 0.2) * 0.35
    y = a.copy(); i = int(0.025 * SR); y[i:i + len(latch)] += latch[:len(y) - i]
    return norm(y, 0.8)


def tap():
    n = int(0.03 * SR)
    ex = noise(n) * env_exp(n, 0.0008)
    y = reson(ex, 2600, 6) * 0.7 + reson(ex, 380, 3) * 0.4
    return norm(y * env_exp(n, 0.006), 0.25)


def plink():
    """A dead bulb dropped into a glass jam jar."""
    f = rng.uniform(2300, 2700)
    y = modal([f, f * 1.63, f * 2.71, f * 4.1, 1100], [1, 0.6, 0.4, 0.2, 0.3], [0.18, 0.12, 0.08, 0.05, 0.05], 0.6)
    rattle = np.zeros_like(y)
    for k in range(3):
        p = int((0.06 + k * 0.045 + rng.uniform(0, 0.02)) * SR)
        r = modal([f * 1.1 * (1 + k * 0.07), f * 2.2], [0.4, 0.2], [0.05, 0.03], 0.2) * (0.5 ** k)
        rattle[p:p + len(r)] += r[:len(rattle) - p]
    return norm(y + rattle, 0.45)


def knock(n_knocks=3, gap=0.19, f=230):
    y = np.zeros(int((gap * n_knocks + 0.3) * SR))
    for k in range(n_knocks):
        m = int(0.12 * SR)
        ex = noise(m) * env_exp(m, 0.001)
        s = reson(ex, f * rng.uniform(0.95, 1.05), 5) + 0.5 * reson(ex, f * 2.7, 7) + 0.3 * lp(ex, 300)
        s = s * env_exp(m, 0.035)
        p = int(k * gap * SR * rng.uniform(0.95, 1.05))
        y[p:p + m] += s * (1.0 if k else 0.9)
    return norm(y, 0.8)


def small_bell(f0=2150, hits=5, spacing=0.13, decay=1.0):
    """Small brass bell, struck repeatedly as it swings (shop door bell / porch bell)."""
    dur = hits * spacing + 1.6 * decay
    y = np.zeros(int(dur * SR))
    for k in range(hits):
        s = modal([f0, f0 * 2.48, f0 * 3.96, f0 * 5.35, f0 * 0.5], [1, 0.55, 0.3, 0.15, 0.08],
                  [0.9 * decay, 0.5 * decay, 0.3 * decay, 0.2 * decay, 0.6 * decay], dur - k * spacing)
        p = int(k * spacing * SR * rng.uniform(0.9, 1.1))
        y[p:p + len(s)] += s[:len(y) - p] * (0.75 ** k)
    return norm(y, 0.5)


def church_bell(f):
    """Distant tower bell: hum, prime, tierce, quint, nominal partials; long decay; far away."""
    partials = [0.5, 1.0, 1.183, 1.506, 2.0, 2.514, 2.662, 3.011]
    amps = [0.6, 0.8, 0.5, 0.3, 0.7, 0.25, 0.2, 0.15]
    taus = [3.5, 2.6, 2.0, 1.6, 1.4, 1.0, 0.9, 0.7]
    y = modal([f * p for p in partials], amps, taus, 4.5, attack=0.003)
    return norm(lp(y, 2500), 0.5)


def switch_click():
    """The big extension switch: a chunky toggle, two transients, then nothing."""
    y = np.zeros(int(0.25 * SR))
    for (t, f, g) in [(0.0, 2400, 0.7), (0.012, 1500, 1.0), (0.05, 3600, 0.25)]:
        m = int(0.05 * SR)
        ex = noise(m) * env_exp(m, 0.0007)
        s = reson(ex, f, 9) + 0.4 * reson(ex, f * 2.2, 12) + 0.6 * lp(ex, 600)
        p = int(t * SR)
        y[p:p + m] += s * env_exp(m, 0.008) * g
    return norm(y, 0.95)


def ladder_clank():
    y = modal([310, 523, 870, 1340, 1910, 2650], [1, 0.8, 0.6, 0.4, 0.3, 0.2], [0.5, 0.4, 0.3, 0.25, 0.2, 0.15], 1.0)
    y2 = modal([400, 690, 1100, 1700], [0.7, 0.5, 0.4, 0.2], [0.3, 0.25, 0.2, 0.1], 0.8)
    out = np.zeros(int(1.2 * SR)); out[:len(y)] += y; p = int(0.11 * SR); out[p:p + len(y2)] += y2[:len(out) - p] * 0.6
    out += thud(110, 1.2, 0.6, 0.1)[:len(out)] * 0.4
    return norm(out, 0.7)


def knee_creak():
    c = creak(0.32, 60, 30, 5, 0.7)
    rustle = bp(noise(len(c)), 1500, 6000) * np.sin(np.linspace(0, np.pi, len(c))) * 0.08
    return norm(c + rustle, 0.4)


def bulb_twist():
    """Glass bulb seating in its socket: a tiny squeak and a click."""
    sq = creak(0.18, 260, 380, 10, 3.4) * 0.6
    cl = np.zeros(int(0.06 * SR)); cl[:int(0.03 * SR)] = noise(int(0.03 * SR)) * env_exp(int(0.03 * SR), 0.0015)
    cl = reson(cl, 4200, 10)
    out = np.zeros(int(0.32 * SR)); out[:len(sq)] += sq; p = int(0.2 * SR); out[p:p + len(cl)] += norm(cl, 0.4)
    return norm(out, 0.35)


def sledge(dur):
    n = int(dur * SR)
    x = bp(noise(n), 400, 3500)
    am = 0.6 + 0.4 * np.sin(2 * np.pi * 1.6 * np.arange(n) / SR + 1.0)
    e = np.minimum(1, np.arange(n) / (0.2 * SR)) * np.minimum(1, (n - np.arange(n)) / (0.3 * SR))
    return norm(x * am * e, 0.18)


def whoosh(dur, f0=200, f1=2400):
    n = int(dur * SR)
    x = noise(n)
    y = np.zeros(n)
    blk = 2048
    for i in range(0, n, blk):
        u = i / n
        fc = f0 * (f1 / f0) ** u
        seg = x[max(0, i - 512):i + blk]
        filt = bp(seg, max(40, fc * 0.6), min(SR / 2 - 100, fc * 1.6))
        y[i:i + blk] = filt[-min(blk, n - i):]
    e = np.sin(np.linspace(0, np.pi, n)) ** 1.5
    return norm(y * e, 0.35)


# ------------------------------------------------------------------ wind bed
def wind_bed():
    n = N
    t = np.arange(n) / SR
    base = signal.sosfilt(signal.butter(1, 400, fs=SR, output='sos'), noise(n))
    gust = signal.sosfilt(signal.butter(2, 0.25, fs=SR, output='sos'), noise(n))
    gust = 0.6 + 0.8 * (gust / (np.max(np.abs(gust)) + 1e-9))
    whistle = reson(noise(n), 620, 30) * 0.15 + reson(noise(n), 930, 40) * 0.08
    mono = (base * 0.9 + whistle) * np.clip(gust, 0.15, 1.6)
    l = mono + 0.3 * signal.sosfilt(signal.butter(1, 300, fs=SR, output='sos'), noise(n))
    r = np.roll(mono, int(0.013 * SR)) + 0.3 * signal.sosfilt(signal.butter(1, 300, fs=SR, output='sos'), noise(n))
    w = np.stack([l, r], 1)
    w /= np.max(np.abs(w)) + 1e-9
    # level automation: exterior full, interior muffled/quiet, coda/end quiet
    pts = [  # (time, gain_exterior_level)
        (0.0, 0.0), (0.6, 0.55), (8.3, 0.55), (8.7, 0.16), (27.3, 0.16), (27.6, 0.6), (38.8, 0.5),
        (39.2, 0.06), (75.8, 0.06), (76.1, 0.55), (80.8, 0.5), (81.05, 0.15), (82.9, 0.15), (83.1, 0.55),
        (93.0, 0.5), (109.0, 0.55), (112.0, 0.5), (115.5, 0.42), (122.5, 0.42), (122.75, 0.62), (127.5, 0.7),
        (128.5, 0.5), (136.4, 0.45), (136.8, 0.32), (147.5, 0.35), (150.0, 0.55), (155.0, 0.45), (157.3, 0.06),
        (163.0, 0.03), (166.0, 0.0), (LENGTH + 2, 0.0)]
    tt = np.array([p[0] for p in pts]); gg = np.array([p[1] for p in pts])
    g = np.interp(t, tt, gg)
    # interior wind is also darker: crossfade a low-passed copy where gain is low
    dark = np.stack([lp(w[:, 0], 250), lp(w[:, 1], 250)], 1) * 1.6
    k = np.clip((g - 0.1) / 0.4, 0, 1)[:, None]
    out = (w * k + dark * (1 - k)) * g[:, None]
    return out.astype(np.float32)


# ------------------------------------------------------------------ the spotting session
def spot():
    # Grandad's clock: A3 → B4 (8.5–27.5), and the coda K1
    def clock(t0, t1, gain=0.42, pan=-0.35):
        t = t0; k = 0
        while t < t1:
            place(INT, t, clock_tick(tock=k % 2 == 1), gain * (0.92 if k % 2 else 1.0), pan)
            t += 1.0; k += 1
        EVENTS.append((round(t0, 3), 'clock ticking (1 Hz) until %.1f' % t1, 'interior'))
    clock(st('A3', 0.35), st('B4', 1.9))
    clock(st('K1', 0.2), st('K1', 5.3), gain=0.3)

    # B4: the key off its hook
    place(INT, st('B4', 0.5), key_jingle(), 0.5, 0.2, 'key jingle (shed key off hook)')
    # C1: shed door creak, box scrape
    place(EXT, st('C1', 0.15), creak(1.1, 80, 30, 6, 1.0), 0.6, 0.1, 'shed door creak')
    place(EXT, st('C1', 1.75), scrape(0.85), 0.45, -0.1, 'box scrape')
    place(EXT, st('C2', 0.2), bp(noise(int(0.35 * SR)), 2000, 7000) * np.hanning(int(0.35 * SR)) * 0.05, 1.0, 0.0, 'mitten wipes dust')
    # C3: tiptoe crunches + sledge runners; C4: distant steps + sledge
    for k in range(6):
        place(EXT, st('C3', 0.3 + k * 0.52), snow_step(0.55, 0.14), 0.32, -0.4 + k * 0.15)
    EVENTS.append((st('C3', 0.3), 'tiptoe snow crunches x6 (0.52 s apart)', 'exterior'))
    place(EXT, st('C3', 0.4), sledge(3.0), 0.5, 0.0, 'sledge runners hiss')
    for k in range(6):
        place(EXT, st('C4', 0.2 + k * 0.45), snow_step(0.8, 0.15), 0.16, 0.2)
    place(EXT, st('C4', 0.2), sledge(2.7), 0.25, 0.2, 'distant crunches + sledge (C4)')
    # D1: bedroom door shuts
    place(INT, st('D1', 0.9), door_shut(), 0.55, 0.3, 'bedroom door shuts')
    # tablet taps
    def taps(t0, t1, rate=4.0, gain=0.22, irregular=0.3):
        t = t0
        while t < t1:
            place(INT, t, tap(), gain * rng.uniform(0.7, 1.0), 0.15)
            t += (1 / rate) * rng.uniform(1 - irregular, 1 + irregular * 2)
        EVENTS.append((round(t0, 3), 'tablet taps until %.2f' % t1, 'interior'))
    taps(st('D3', 0.35), st('D3', 2.2))
    taps(st('D5', 0.25), st('D5', 1.9))
    taps(st('D8', 0.2), st('D8', 1.8))
    taps(st('E1', 0.35), st('E1', 3.0), rate=2.6, gain=0.26, irregular=0.6)
    # D4: dead bulbs plink into the jar on the beat
    for t in (48.0, 48.5, 49.0, 49.5):
        place(INT, t, plink(), 0.55, -0.1)
    EVENTS.append((48.0, 'bulb plinks into jar at 48.0, 48.5, 49.0, 49.5 (on the caper beat)', 'interior'))
    # D7: thump from upstairs (heard from the hallway)
    place(INT, st('D7', 0.45), lp(thud(55, 0.5, 1.4, 0.0), 300), 0.9, 0.0, 'THUMP upstairs (heard from hall)')
    place(INT, st('D7', 0.75), lp(thud(65, 0.3, 0.8, 0.0), 300), 0.45, 0.0)
    # F1: march footsteps
    for k in range(5):
        place(EXT, st('F1', 0.1 + k * 0.48), snow_step(0.75, 0.15), 0.3, -0.3 + k * 0.15)
    EVENTS.append((st('F1', 0.1), 'brisk snow footsteps x5', 'exterior'))
    # knocks
    place(EXT, st('F2', 0.12), knock(3, 0.18, 240), 0.55, 0.15, 'knock knock knock (old lady)')
    place(INT, st('F3', 0.1), small_bell(2600, 4, 0.11, 0.7), 0.4, 0.25, 'shop door bell')
    place(EXT, st('F4', 1.15), thud(160, 0.12, 0.3, 0.6), 0.25, 0.0, 'fist bump')
    place(EXT, st('F5', 0.1), knock(2, 0.2, 260), 0.5, 0.1, 'knock knock (young dad)')
    place(EXT, st('F6', 0.15), knock(3, 0.21, 200), 0.65, 0.0, 'knock knock knock (ladder man, heavier)')
    place(EXT, st('F6', 0.6), creak(0.6, 70, 40, 5, 0.8), 0.25, 0.0, 'his door opens')
    place(EXT, st('F6', 3.0), door_shut() * 1.0, 0.95, 0.0, 'DOOR SLAM (music already silent)')
    place(EXT, st('F6', 4.4), creak(0.5, 70, 40, 5, 0.8), 0.25, 0.0, 'door reopens')
    place(EXT, st('F6', 4.6), ladder_clank(), 0.6, 0.0, 'LADDER CLANK as it pokes out')
    # G1: distant church bells
    for k, f in enumerate([523.25, 466.16, 415.3, 392.0, 349.23, 311.13]):
        place(EXT, st('G1', 0.3 + k * 0.62), church_bell(f), 0.13, -0.6, None)
    EVENTS.append((st('G1', 0.3), 'distant church bells (descending peal, 6 strikes, soft, far left)', 'exterior'))
    # G2–G5: busy footsteps, a ladder clank
    for k in range(14):
        place(EXT, st('G2', 0.2 + k * 0.33), snow_step(rng.uniform(0.5, 1.0), 0.14), 0.15, rng.uniform(-0.7, 0.7))
    place(EXT, st('G3', 0.4), ladder_clank(), 0.25, 0.4, 'ladders against the wall')
    # H1: two people walking home, slow
    for k in range(7):
        place(EXT, st('H1', 0.15 + k * 0.5), snow_step(1.0 if k % 2 == 0 else 0.7, 0.17), 0.3, -0.2 + 0.05 * k)
    EVENTS.append((st('H1', 0.15), 'Grandad + Mum footsteps, slow (x7)', 'exterior'))
    place(EXT, st('H2', 1.2), snow_step(0.5, 0.12), 0.2, 0.1, 'Nell steps forward')
    # H4: THE DEAD CLICK
    place(EXT, CLICK, switch_click(), 1.0, 0.0, 'THE DEAD CLICK of the switch (all music cut here)')
    # I1: knee creak as he kneels
    place(EXT, st('I1', 0.9), knee_creak(), 0.6, 0.0, 'knee creak (Grandad kneels)')
    place(EXT, st('I1', 1.2), snow_step(0.6, 0.2), 0.22, 0.0)
    # I3: the twist, ending just before the blaze
    place(EXT, BLAZE - 0.32, bulb_twist(), 0.5, 0.0, 'bulb twist squeak + seat click (ends at blaze)')
    # I6: the porch bell, thawed, tinkles
    place(EXT, st('I6', 1.0), small_bell(3100, 6, 0.14, 1.2), 0.38, 0.35, 'PORCH BELL tinkles')
    # J: rising through the air
    place(EXT, st('J1', 0.2), whoosh(9.5, 150, 3000), 0.35, 0.0, 'airy whoosh rising to space')


def main():
    ensure_dirs()
    spot()
    w = wind_bed()
    write_wav(os.path.join(STEMS, 'foley_int.wav'), INT[: int(LENGTH * SR)])
    write_wav(os.path.join(STEMS, 'foley_ext.wav'), EXT[: int(LENGTH * SR)])
    write_wav(os.path.join(STEMS, 'wind.wav'), w[: int(LENGTH * SR)])
    EVENTS.sort()
    with open(os.path.join(OUT, 'foley_events.json'), 'w') as fh:
        json.dump(EVENTS, fh, indent=1)
    print('foley events:', len(EVENTS))


if __name__ == '__main__':
    main()
