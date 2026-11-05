#!/usr/bin/env python3
"""
SEEN FROM SPACE: the score.

All music is original. It is written here as timed note events (absolute seconds, locked to
film/edl.json), saved as one MIDI file per stem, and rendered with FluidSynth using the
MIT-licensed FluidR3_GM soundfont.

THE MOTIF: eight notes in D major, A4 F#4 G4 A4 | D5 . C#5 E5 | (D5).
The eighth note, the tonic D5, is withheld every time the motif is heard. It's a rest where the
resolution should be, like a dead bulb in a string. It lands for the first time on the exact
frame the house blazes (I4, 136.5 s, frame 3276).
"""
import os, sys, subprocess
import numpy as np
import mido

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import SR, SF2, MIDI, STEMS, LENGTH, BLAZE, CLICK, SHOT, st, ensure_dirs

RNG = np.random.default_rng(20261224)

# ---------------------------------------------------------------- notes
NAMES = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
def n(name):
    """'F#4' -> midi number."""
    p = NAMES[name[0]]
    i = 1
    while i < len(name) and name[i] in '#b':
        p += 1 if name[i] == '#' else -1
        i += 1
    return p + 12 * (int(name[i:]) + 1)

MOTIF = ['A4', 'F#4', 'G4', 'A4', 'D5', 'C#5', 'E5']   # + the missing 'D5'
MOTIF_BEATS = [0, 1, 1.5, 2, 3, 4.5, 5]                 # onsets in beats (3/4); the D5 belongs on beat 6
MOTIF_DURS = [1, 0.5, 0.5, 1, 1.5, 0.5, 1]
RESOLVE = 'D5'
RESOLVE_BEAT = 6


class Stem:
    def __init__(self, name, program, bank=0):
        self.name, self.program, self.bank = name, program, bank
        self.notes = []   # (t, dur, pitch, vel)
        self.cc = []      # (t, controller, value)

    def note(self, t, pitch, dur, vel, human=0.010, vh=6):
        if isinstance(pitch, str):
            pitch = n(pitch)
        if human:
            t = t + float(RNG.uniform(-human, human))
        vel = int(np.clip(vel + (RNG.integers(-vh, vh + 1) if vh else 0), 1, 127))
        self.notes.append((max(0.0, t), max(0.03, dur), int(pitch), vel))

    def chord(self, t, pitches, dur, vel, roll=0.0, human=0.008):
        for i, p in enumerate(pitches):
            self.note(t + i * roll, p, dur, vel - i * 2, human=human)

    def expr(self, t0, t1, v0, v1, steps=None):
        """CC11 expression ramp."""
        steps = steps or max(2, int((t1 - t0) * 20))
        for i in range(steps + 1):
            u = i / steps
            self.cc.append((t0 + (t1 - t0) * u, 11, int(round(v0 + (v1 - v0) * u))))

    def set_expr(self, t, v):
        self.cc.append((t, 11, int(v)))

    def cut(self, t):
        """Hard stop: truncate every note sounding at time t."""
        out = []
        for (a, d, p, v) in self.notes:
            if a >= t:
                continue
            if a + d > t:
                d = max(0.02, t - a)
            out.append((a, d, p, v))
        self.notes = out
        self.cc.append((t, 64, 0))   # sustain off
        self.cc.append((t, 120, 0))  # all sound off: kills tails too

    def save(self):
        TPB = 960
        tick = lambda s: int(round(s * 1920))  # 120 bpm => 1 s = 1920 ticks
        ev = []
        for (t, d, p, v) in self.notes:
            ev.append((tick(t), 1, mido.Message('note_on', note=p, velocity=v, channel=0)))
            ev.append((tick(t + d), 0, mido.Message('note_off', note=p, velocity=0, channel=0)))
        for (t, c, v) in self.cc:
            ev.append((tick(t), 0 if c in (120, 64) else 2, mido.Message('control_change', control=c, value=v, channel=0)))
        ev.sort(key=lambda e: (e[0], e[1]))
        mid = mido.MidiFile(ticks_per_beat=TPB)
        tr = mido.MidiTrack(); mid.tracks.append(tr)
        tr.append(mido.MetaMessage('set_tempo', tempo=500000, time=0))
        tr.append(mido.Message('control_change', control=0, value=self.bank, channel=0, time=0))
        tr.append(mido.Message('program_change', program=self.program, channel=0, time=0))
        tr.append(mido.Message('control_change', control=7, value=110, channel=0, time=0))
        tr.append(mido.Message('control_change', control=91, value=0, channel=0, time=0))
        tr.append(mido.Message('control_change', control=93, value=0, channel=0, time=0))
        if not any(c == 11 and t <= 0.001 for (t, c, v) in self.cc):
            tr.append(mido.Message('control_change', control=11, value=100, channel=0, time=0))
        last = 0
        for (tk, _, m) in ev:
            tr.append(m.copy(time=max(0, tk - last)))
            last = max(last, tk)
        # keep the file running past the end so release tails render
        end = tick(LENGTH + 3.0)
        tr.append(mido.Message('control_change', control=1, value=0, channel=0, time=max(0, end - last)))
        path = os.path.join(MIDI, self.name + '.mid')
        mid.save(path)
        return path


S = {
    'celesta': Stem('celesta', 8),
    'piano': Stem('piano', 0),
    'glock': Stem('glock', 9),
    'pizz': Stem('pizz', 45),
    'strings': Stem('strings', 48),
    'pad': Stem('pad', 49),          # slow strings: warmth under everything
    'bass': Stem('bass', 43),        # contrabass / low strings
    'choir': Stem('choir', 52),
    'harp': Stem('harp', 46),
    'timp': Stem('timp', 47),
    'trem': Stem('trem', 44),        # tremolo strings for held-breath moments
}
cel, pno, glk, pz, strg, pad, bas, cho, hrp, tmp, trm = (S[k] for k in
    ['celesta', 'piano', 'glock', 'pizz', 'strings', 'pad', 'bass', 'choir', 'harp', 'timp', 'trem'])

# record of motif statements for the cue sheet
STATEMENTS = []


def motif(stem, t0, beat, octave=0, vel=70, resolve=False, notes=None, durs_scale=1.0, label='', human=0.012, legato=1.0, only=None):
    """Play the motif from t0 with the given beat length (s). Returns time where the D5 belongs."""
    seq = notes or MOTIF
    idx = range(len(seq)) if only is None else only
    for i in idx:
        p = n(seq[i]) + 12 * octave
        stem.note(t0 + MOTIF_BEATS[i] * beat, p, MOTIF_DURS[i] * beat * legato * durs_scale, vel + (6 if i == 4 else 0) - (4 if i in (1, 2) else 0), human=human)
    gap = t0 + RESOLVE_BEAT * beat
    if resolve:
        stem.note(gap, n(RESOLVE) + 12 * octave, beat * 3, vel + 8, human=0)
    STATEMENTS.append((label or stem.name, t0, gap, resolve))
    return gap


def harmony(stem, t0, beat, vel=40, octave=0, last=True, voicing='close', dur_scale=1.0):
    """Under-chords for one motif statement: D | G A | (gap)."""
    o = 12 * octave
    D = [n('D3') + o, n('F#3') + o, n('A3') + o]
    G = [n('G2') + o, n('D3') + o, n('B3') + o]
    A = [n('A2') + o, n('E3') + o, n('C#4') + o]
    stem.chord(t0, D, 3 * beat * dur_scale, vel, roll=0.03)
    stem.chord(t0 + 3 * beat, G, 1.5 * beat * dur_scale, vel, roll=0.03)
    stem.chord(t0 + 4.5 * beat, A, (1.5 * beat if not last else 3.0 * beat) * dur_scale, vel - 4, roll=0.03)


# =============================================================== A: THE ONLY DARK HOUSE (0–17.5)
b = 60 / 68
g1 = motif(cel, 0.9, b, vel=62, label='A1 celesta solo')
# celesta left hand, rolled and soft
cel.chord(0.9, ['F#3', 'A3', 'D4'], 2.4, 38, roll=0.09)
cel.chord(0.9 + 3 * b, ['G3', 'B3', 'D4'], 1.2, 36, roll=0.09)
cel.chord(0.9 + 4.5 * b, ['A3', 'C#4', 'E4'], 1.6, 34, roll=0.09)
g2 = motif(cel, 9.4, b, vel=60, label='A2/A3 celesta (gap falls on the photo, A5)')
cel.chord(9.4, ['F#3', 'A3', 'D4'], 2.4, 36, roll=0.09)
cel.chord(9.4 + 3 * b, ['G3', 'B3', 'D4'], 1.2, 34, roll=0.09)
cel.chord(9.4 + 4.5 * b, ['A3', 'C#4', 'E4'], 2.2, 32, roll=0.09)
# barely-there string bed from A2: warmth under the cold
pad.set_expr(0, 0)
pad.chord(4.6, ['D3', 'A3'], 4.2, 50)
pad.chord(9.4, ['D3', 'A3', 'F#4'], 2.6, 46)
pad.chord(9.4 + 3 * b, ['G2', 'D3', 'B3'], 1.3, 44)
pad.chord(9.4 + 4.5 * b, ['A2', 'E3', 'C#4'], 3.0, 42)
pad.expr(4.6, 7.0, 0, 46); pad.expr(7.0, 9.0, 46, 40); pad.expr(9.4, 13.0, 40, 52); pad.expr(13.5, 16.8, 52, 0)
# A5: a high, fading echo of the first three notes as we look at the photo
for i, (p, dt) in enumerate([('A5', 0.0), ('F#5', 0.55), ('G5', 0.85)]):
    cel.note(15.75 + dt, p, 0.9, 40 - i * 4)

# =============================================================== B: NELL DECIDES (17.5–27.5)
# B1/B2: just the clock (foley). B3: piano, the decision.
b = 60 / 90
t0 = st('B3', 0.0)
g = motif(pno, t0, b, vel=58, label='B3 piano: the decision')
pno.chord(t0, ['D3', 'A3'], 1.9, 40, roll=0.05)
pno.chord(t0 + 3 * b, ['G2', 'D3', 'B3'], 1.0, 38, roll=0.05)
pno.chord(t0 + 4.5 * b, ['A2', 'E3', 'C#4'], 1.4, 36, roll=0.05)
pno.cc.append((t0 - 0.05, 64, 100)); pno.cc.append((t0 + 2.9, 64, 0)); pno.cc.append((t0 + 3.0, 64, 100)); pno.cc.append((g + 0.6, 64, 0))
# B4: pizzicato pick-up into the caper of the shed
pz.note(st('B4', 1.25), 'A2', 0.2, 58)
pz.note(st('B4', 1.55), 'C#3', 0.2, 60)
pz.note(st('B4', 1.8), 'E3', 0.2, 62)

# =============================================================== C: THE SHED (27.5–39)
def tiptoe(t_start, t_end, beat=0.6, vel=56, pattern=None):
    pattern = pattern or [('D2', 'A3'), ('A2', 'F#3'), ('D2', 'A3'), ('A2', 'G3')]
    k = 0
    t = t_start
    while t < t_end - 0.05:
        lo, hi = pattern[k % len(pattern)]
        pz.note(t, lo, 0.25, vel + (6 if k % 4 == 0 else 0))
        if t + beat / 2 < t_end:
            pz.note(t + beat / 2, hi, 0.2, vel - 12)
        t += beat
        k += 1

tiptoe(st('C1', 0.0), st('C1', 3.0))
# C2: Grandma's handwriting: three tender celesta notes, the pizz holds its breath
for p, dt, v in [('A4', 0.2, 50), ('F#4', 0.75, 46), ('G4', 1.05, 48)]:
    cel.note(st('C2', dt), p, 0.9, v)
pad.chord(st('C2', 0.1), ['G2', 'D3', 'B3'], 1.9, 40); pad.expr(st('C2', 0), st('C2', 0.8), 0, 38); pad.expr(st('C2', 1.2), st('C2', 2.0), 38, 0)
# C3: tiptoe resumes; celesta staccato motif over it
tiptoe(st('C3', 0.0), st('C4', 3.0), beat=0.6, vel=58)
motif(cel, st('C3', 0.6), 0.6, vel=60, legato=0.45, label='C3 celesta tiptoe (staccato)')
# C4: the last three notes again and stop on the gap at the end of C4
for p, dt in [('D5', 1.6), ('C#5', 2.05), ('E5', 2.3)]:
    cel.note(st('C4', dt), p, 0.35, 58)
glk.note(st('C4', 2.3), 'E6', 0.4, 38)
STATEMENTS.append(('C4 celesta tail (D5 C#5 E5, stops on gap at end of C4)', st('C4', 1.6), st('C4', 2.9), False))

# =============================================================== D: THE OPERATION (39–64.5) 120 bpm
B = 0.5
D0 = st('D1', 1.0)  # caper starts just after the door shuts (40.0)
CAPER_BASS = ['D2', None, 'A2', None, 'D2', 'D3', 'A2', None]
CAPER_BASS_G = ['G2', None, 'D3', None, 'G2', 'G3', 'D3', None]
CAPER_BASS_A = ['A2', None, 'E3', None, 'A2', 'A3', 'C#3', None]
CAPER_BASS_BB = ['Bb1', None, 'F2', None, 'Bb1', 'Bb2', 'F2', None]

def caper_bar(t, bass, chord, vel=64, stabs=True, tick=False):
    for i, p in enumerate(bass):
        if p:
            pz.note(t + i * B / 2, p, 0.18, vel + (8 if i == 0 else 0), human=0.006)
    if stabs:
        for k in (1, 3):
            strg.chord(t + k * B + 0.0, chord, 0.13, vel - 10, human=0.005)
    if tick:
        glk.note(t + 3.5 * B, 'A6', 0.1, 34)

def caper_melody(stem, t, notes, vel=66, octave=0, legato=0.6):
    """notes: list of (beat_offset, pitch, beats)"""
    for (bo, p, d) in notes:
        stem.note(t + bo * B, n(p) + 12 * octave, d * B * legato, vel, human=0.006)

DCH = ['D4', 'F#4', 'A4']; GCH = ['D4', 'G4', 'B4']; ACH = ['C#4', 'E4', 'A4']; BBCH = ['D4', 'F4', 'Bb4']
strg.set_expr(0, 92)
# bars of 4 beats (2 s)
caper_bar(40.0, CAPER_BASS, DCH, vel=56, stabs=False)
caper_bar(42.0, CAPER_BASS, DCH, vel=60, tick=True)
# D3 (44.5): phrase 1, the motif in caper rhythm (eighths) on celesta + pizz violins
caper_bar(44.0, CAPER_BASS, DCH)
P1 = [(1, 'A4', .5), (1.5, 'F#4', .5), (2, 'G4', .5), (2.5, 'A4', .5), (3, 'D5', 1.5)]
caper_melody(cel, 44.0, P1, vel=64)
caper_melody(pz, 44.0, P1, vel=56, octave=0, legato=0.35)
caper_bar(46.0, CAPER_BASS_G, GCH)
caper_melody(cel, 46.0, [(0.5, 'C#5', .5), (1, 'E5', 1)], vel=64)
caper_melody(pz, 46.0, [(0.5, 'C#5', .5), (1, 'E5', 1)], vel=56, legato=0.35)
STATEMENTS.append(('D3 caper phrase 1 (celesta+pizz), gap at 46.5', 44.5, 46.5 + 0.5, False))
# D4 (47.5–50): bulbs plink into the jar ON the beat (48.0, 48.5, 49.0, 49.5); melody rests so plinks speak
caper_bar(48.0, CAPER_BASS_A, ACH, vel=58, stabs=True)
for k in range(4):
    pz.note(48.25 + k * 0.5, 'A4', 0.1, 40)  # off-beat ticks between plinks
# D5 (50–52.5): phrase 2, sequenced up (D5 B4 C#5 D5 | G5 F#5 A5) then gap
caper_bar(50.0, CAPER_BASS, DCH)
P2 = [(0, 'D5', .5), (0.5, 'B4', .5), (1, 'C#5', .5), (1.5, 'D5', .5), (2, 'G5', 1.5), (3.5, 'F#5', .5)]
caper_melody(cel, 50.0, P2, vel=66); caper_melody(glk, 50.0, P2, vel=40, legato=0.3)
caper_bar(52.0, CAPER_BASS_G, GCH, vel=66)
caper_melody(cel, 52.0, [(0, 'A5', 1)], vel=66); caper_melody(glk, 52.0, [(0, 'A5', 1)], vel=42)
# D6 (52.5–56): the wall: strings take the motif broad, bass drives, tally ticks
caper_bar(54.0, CAPER_BASS_A, ACH, vel=70)
motif(strg, 52.5, B, vel=78, legato=0.85, label='D6 strings, broad (caper)')
motif(strg, 52.5, B, octave=-1, vel=64, legato=0.85, label='D6 strings low octave')
STATEMENTS.pop()
for t, p in [(53.3, 'D6'), (54.4, 'F#6'), (55.4, 'A6')]:  # tally 12 ... 340 ... 1,206
    glk.note(t, p, 0.3, 64, human=0)
tmp.note(54.0, 'D2', 0.4, 60); tmp.note(55.0, 'A1', 0.4, 66); tmp.note(55.5, 'A1', 0.3, 70)
for k in range(8):  # rising chromatic pizz under the build
    pz.note(54.0 + k * 0.25, n('A2') + k, 0.15, 60 + k * 3, human=0.004)
# D7 (56–58.5): REST. A thump upstairs (foley ~56.5). Comic worried button: two low pizz notes.
pz.note(57.35, 'F2', 0.25, 62, human=0); pz.note(57.85, 'E2', 0.35, 58, human=0)
# D8 (58.5–61.5): groove resumes lighter, celesta high motif unresolved
caper_bar(58.5, CAPER_BASS, DCH, vel=58)
caper_bar(60.5, CAPER_BASS_G, GCH, vel=60)
P3 = [(0.5, 'A5', .5), (1, 'F#5', .5), (1.5, 'G5', .5), (2, 'A5', .5), (2.5, 'D6', 1.5), (4, 'C#6', .5), (4.5, 'E6', 1)]
caper_melody(cel, 58.5, P3, vel=60)
STATEMENTS.append(('D8 celesta high motif, gap at 61.25', 58.75, 61.25, False))
# D9 (61.5–64.5): climax: the motif twice, fast, then one stab on E/A and silence (the gap)
caper_bar(61.5, CAPER_BASS, DCH, vel=72)
P4 = [(0, 'A4', .5), (.5, 'F#4', .5), (1, 'G4', .5), (1.5, 'A4', .5), (2, 'D5', .5), (2.5, 'C#5', .5), (3, 'E5', .5),
      (4, 'D5', .5), (4.5, 'B4', .5), (5, 'C#5', .5), (5.5, 'D5', .5), (6, 'G5', .5), (6.5, 'F#5', .5)]
caper_melody(strg, 61.5, P4, vel=80, legato=0.8)
caper_melody(cel, 61.5, P4, vel=68)
caper_melody(glk, 61.5, P4[::2], vel=44, legato=0.3)
for i, p in enumerate(['G2', None, 'B2', None, 'A2', None, 'C#3', None]):  # bar 2 of the climax
    if p:
        pz.note(62.0 + i * 0.25, p, 0.18, 72)
strg.chord(62.5, GCH, 0.13, 70); strg.chord(63.0, ACH, 0.13, 72)
# the stab: E5 over A, short. Then nothing until E1.
strg.chord(63.5, ['A3', 'C#4', 'E4', 'E5'], 0.32, 92, human=0)
cel.note(63.5, 'E6', 0.6, 70, human=0); glk.note(63.5, 'E6', 0.6, 60, human=0)
pz.chord(63.5, ['A1', 'A2'], 0.3, 86, human=0)
tmp.note(63.5, 'A1', 0.5, 80, human=0)
STATEMENTS.append(('D9 caper climax, stab on E/A, gap from 63.5 to 64.5', 61.5, 63.9, False))

# =============================================================== E: THE TURN (64.5–76)
# E1: near silence: the faintest high A held under her slow typing
pad.chord(st('E1', 0.6), ['A4', 'E5'], 3.0, 40)
pad.set_expr(st('E1', 0.5), 0); pad.expr(st('E1', 0.6), st('E1', 2.6), 0, 26); pad.expr(st('E1', 2.8), st('E1', 3.5), 26, 0)
# E2: the reply: gentle piano; the gap is a question
b = 60 / 84
t0 = st('E2', 0.3)
g = motif(pno, t0, b, vel=56, label='E2 piano: the reply (gap = a question)')
pno.chord(t0, ['D3', 'A3'], 2.0, 36, roll=0.06)
pno.chord(t0 + 3 * b, ['G2', 'D3', 'B3'], 1.0, 34, roll=0.06)
pno.chord(t0 + 4.5 * b, ['A2', 'E3', 'C#4'], 1.6, 32, roll=0.06)
pno.cc.append((t0 - 0.05, 64, 100)); pno.cc.append((t0 + 3 * b - 0.05, 64, 0)); pno.cc.append((t0 + 3 * b, 64, 100)); pno.cc.append((g + 0.4, 64, 0))
# E3: the pull-back reveal: strings swell Bm - G - D/F# - A
t = st('E3', 0.55)
for (dt, ch, d) in [(0.0, ['B2', 'F#3', 'D4', 'B4'], 1.05), (1.0, ['G2', 'D3', 'B3', 'G4'], 1.05), (2.0, ['F#2', 'D3', 'A3', 'F#4', 'A4'], 0.75), (2.7, ['A2', 'E3', 'C#4', 'E4', 'A4'], 0.85)]:
    strg.chord(t + dt, ch, d, 84, human=0.006)
    bas.note(t + dt, n(ch[0]) - 12, d, 70)
for (dt, p, d) in [(0.0, 'F#5', 1.0), (1.0, 'G5', 1.0), (2.0, 'A5', 0.7), (2.7, 'B5', 0.25), (2.95, 'C#6', 0.5)]:
    strg.note(t + dt, p, d, 88)
strg.expr(st('E3', 0.4), st('E3', 3.3), 40, 112); strg.expr(st('E3', 3.4), st('F1', 0.1), 112, 92)
bas.set_expr(0, 96)

# =============================================================== F: KNOCKING ON DOORS (76–94) 120 bpm
def march_bar(t, root, fifth, vel=60, chord=None):
    pz.note(t, root, 0.2, vel + 8); pz.note(t + 0.5, fifth, 0.2, vel); pz.note(t + 1.0, root, 0.2, vel + 4); pz.note(t + 1.5, fifth, 0.2, vel)
    if chord:
        for k in (0.25, 0.75, 1.25, 1.75):
            pz.chord(t + k, chord, 0.12, vel - 16, human=0.004)

F0 = st('F1', 0.0)
march_bar(76.0, 'D2', 'A2', 56, ['F#3', 'A3'])
march_bar(78.0, 'G2', 'D3', 56, ['G3', 'B3'])
# F2 old lady: celesta fragment (bar 1 of the motif)
for (dt, p) in [(0.8, 'A5'), (1.3, 'F#5'), (1.55, 'G5'), (1.8, 'A5')]:
    cel.note(st('F2', dt), p, 0.45, 56)
march_bar(80.0, 'A2', 'E3', 58, ['A3', 'C#4'])
# F3 shop: glock fragment (bar 2)
for (dt, p) in [(0.6, 'D6'), (1.05, 'C#6'), (1.3, 'E6')]:
    glk.note(st('F3', dt), p, 0.5, 54)
march_bar(82.0, 'D2', 'A2', 60, ['F#3', 'A3'])
strg.set_expr(st('F3', 0), 60); strg.chord(st('F3', 0.0), ['D3', 'A3', 'F#4'], 4.0, 52); strg.expr(st('F3', 0), st('F6', 0.3), 50, 82)
# F4 teens: cheeky pizz fragment
for (dt, p) in [(0.5, 'A3'), (0.75, 'F#3'), (1.0, 'G3'), (1.25, 'A3')]:
    pz.note(st('F4', dt), p, 0.15, 66)
march_bar(84.0, 'G2', 'D3', 62, ['G3', 'B3'])
strg.chord(84.0, ['G3', 'B3', 'D4'], 2.0, 56)
# F5 baby: tiny high celesta + a trill giggle
for (dt, p) in [(0.45, 'A6'), (0.6, 'F#6'), (0.7, 'G6'), (0.8, 'A6')]:
    cel.note(st('F5', dt), p, 0.3, 50)
for k in range(6):
    cel.note(st('F5', 1.1 + k * 0.06), 'E7' if k % 2 else 'D7', 0.06, 40 - k * 2)
march_bar(86.0, 'A2', 'E3', 64, ['A3', 'C#4'])
strg.chord(86.0, ['A3', 'C#4', 'E4'], 1.2, 60)
# F6 the ladder man: knock (87.15). Music thins to one held low string as he reads and looks across.
trm.set_expr(0, 0)
trm.chord(st('F6', 0.5), ['B2', 'F#3'], 2.5, 60)
trm.expr(st('F6', 0.5), st('F6', 1.5), 0, 50); trm.expr(st('F6', 2.2), st('F6', 2.95), 50, 0)
# DOOR SLAM at F6+3.0 (90.0): silence. Nell deflates.
# LADDER CLANK at F6+4.6 (91.6). Then the whole ensemble: the motif, warm and big, still no last note.
t0 = st('F6', 4.8)  # 91.8
bt = 0.5
g = motif(strg, t0, bt, vel=88, legato=0.95, label='F6 full ensemble on the ladder nod (no last note)')
motif(strg, t0, bt, octave=1, vel=76, legato=0.95, label='x'); STATEMENTS.pop()
motif(cel, t0, bt, octave=1, vel=60, label='x'); STATEMENTS.pop()
motif(glk, t0, bt, octave=1, vel=44, legato=0.4, label='x'); STATEMENTS.pop()
strg.set_expr(st('F6', 4.7), 100)
harmony(pad, t0, bt, vel=70)
pad.set_expr(st('F6', 4.7), 90)
for (dt, p, d) in [(0, 'D2', 1.5), (1.5, 'G1', 0.75), (2.25, 'A1', 1.6)]:
    bas.note(t0 + dt, p, d, 80)
pz.chord(t0, ['D2', 'A2', 'F#3'], 0.3, 80, human=0)
tmp.note(t0, 'D2', 0.6, 62)

# =============================================================== G: CHRISTMAS EVE (94–109)
# G1: held breath; distant church bells (foley). A thread of tremolo high strings.
trm.chord(st('G1', 0.6), ['A4', 'E5'], 2.6, 54)
trm.expr(st('G1', 0.5), st('G1', 1.5), 0, 30); trm.expr(st('G1', 2.2), st('G1', 3.1), 30, 0)
# G2–G5: glock ostinato + building strings, stopping dead at the end of G5 (109.0)
G0 = st('G2', 0.0)  # 97.0
prog = [('D', 97.0), ('Bm', 99.0), ('G', 101.0), ('A', 103.0), ('D', 105.0), ('Bm', 106.0), ('G', 107.0), ('A', 108.0)]
CH = {'D': (['D3', 'A3', 'F#4'], 'D2', ['D6', 'A5', 'F#6', 'A5']),
      'Bm': (['B2', 'F#3', 'D4'], 'B1', ['D6', 'B5', 'F#6', 'B5']),
      'G': (['G2', 'D3', 'B3'], 'G1', ['D6', 'B5', 'G6', 'B5']),
      'A': (['A2', 'E3', 'C#4'], 'A1', ['E6', 'C#6', 'A6', 'C#6'])}
for i, (name, t) in enumerate(prog):
    t1 = prog[i + 1][1] if i + 1 < len(prog) else 109.0
    chord, root, ost = CH[name]
    strg.chord(t, chord, t1 - t, 70)
    bas.note(t, root, t1 - t, 74)
    k = 0
    tt = t
    while tt < t1 - 0.01:
        glk.note(tt, ost[k % 4], 0.22, 40 + int((tt - 97) * 2.2), human=0.004)
        if tt >= 100.5 and k % 2 == 0:
            pz.note(tt, root, 0.15, 56 + int((tt - 97) * 2))
        tt += 0.25
        k += 1
strg.expr(97.0, 108.9, 40, 118)
bas.expr(97.0, 108.9, 60, 115)
# G4/G5: the motif in strings, rising, gap at 108.0+, then STOP DEAD at 109.0
t0 = 105.0
motif(strg, t0, 0.5, vel=90, legato=1.0, label='G5 strings motif (stops dead at 109.0)')
motif(strg, t0, 0.5, octave=1, vel=82, legato=1.0, label='x'); STATEMENTS.pop()
motif(cho, t0, 0.5, vel=64, legato=1.0, label='x'); STATEMENTS.pop()
cho.set_expr(0, 0); cho.expr(104.5, 108.8, 30, 96)
for k in range(16):
    tmp.note(105.0 + k * 0.25, 'A1' if k < 12 else 'D2', 0.2, 40 + k * 3, human=0)
STOP_DEAD = 109.0
for s in (strg, bas, glk, pz, cho, tmp, cel, pad):
    s.cut(STOP_DEAD)

# =============================================================== H: THE DEAD SWITCH (109–128)
# H1: footsteps + wind only. H2: hush (a breath of high string, almost nothing).
pad.chord(st('H2', 0.8), ['A4'], st('H4', 0.25) - st('H2', 0.8), 40)
pad.set_expr(st('H2', 0.7), 0); pad.expr(st('H2', 0.8), st('H3a', 0.5), 0, 22)
# H3: the motif spelled out one note at a time under the cue cards
CARD_NOTES = [('H3a', 0.30, 'A4'), ('H3a', 1.20, 'F#4'), ('H3b', 0.60, 'G4'), ('H3c', 0.40, 'A4'), ('H3c', 1.30, 'D5'),
              ('H3d', 0.20, 'C#5'), ('H3d', 0.80, 'E5')]
for (sh, dt, p) in CARD_NOTES:
    cel.note(st(sh, dt), p, 2.2, 52, human=0.004)
STATEMENTS.append(('H3 celesta, one note per cue card; the D5 would fall on the click', st('H3a', 0.3), CLICK, False))
# H4: THE DEAD CLICK at CLICK (122.75 s): everything cut dead. H5: nothing at all.
for s in S.values():
    s.cut(CLICK)

# =============================================================== I: GRANDAD FINISHES IT (128–147.5)
# I1: piano enters softly as he kneels
pno.note(st('I1', 0.6), 'D2', 3.0, 40); pno.note(st('I1', 0.6), 'A2', 3.0, 34)
pno.chord(st('I1', 1.7), ['F#3', 'A3', 'D4'], 1.6, 30, roll=0.12)
pno.cc.append((st('I1', 0.5), 64, 100)); pno.cc.append((st('I2', 0.1), 64, 0))
# I2: one piano note per bulb under his fingers: evenly spaced, stops before the 8th
BULB_TIMES = [st('I2', 0.2 + k * 0.43) for k in range(7)]
for t, p in zip(BULB_TIMES, MOTIF):
    pno.note(t, p, 0.9, 54, human=0)
pno.cc.append((st('I2', 0.15), 64, 100))
STATEMENTS.append(('I2 piano, one note per bulb (fingers walk the string)', BULB_TIMES[0], BLAZE, False))
# I3: the gap held: a faint rising thread of strings on the dominant
pad.chord(st('I3', 0.7), ['A3', 'E4', 'A4'], BLAZE - st('I3', 0.7) - 0.02, 50)
pad.set_expr(st('I3', 0.6), 0); pad.expr(st('I3', 0.7), BLAZE - 0.05, 0, 40)
pno.cc.append((BLAZE - 0.3, 64, 0))
# I4: THE MISSING NOTE LANDS on the blaze frame (136.5 s, frame 3276). Exact, no humanising.
for s, v in ((cel, 96), (pno, 92), (glk, 90)):
    s.note(BLAZE, 'D5', 3.5, v, human=0, vh=0)
cel.note(BLAZE, 'D6', 3.0, 80, human=0, vh=0)
glk.note(BLAZE, 'D6', 2.5, 76, human=0, vh=0)
pno.chord(BLAZE, ['D2', 'D3', 'A3', 'F#4'], 3.6, 84, human=0)
pno.cc.append((BLAZE, 64, 100)); pno.cc.append((st('I5', 0.0), 64, 0))
# the bloom
strg.set_expr(BLAZE - 0.01, 118); bas.set_expr(BLAZE - 0.01, 118); cho.set_expr(BLAZE - 0.01, 105); pad.set_expr(BLAZE - 0.01, 110)
strg.chord(BLAZE, ['D3', 'A3', 'F#4', 'D5'], 2.0, 108, human=0)
pad.chord(BLAZE, ['D3', 'A3', 'F#4', 'A4', 'D5'], 4.0, 100, human=0)
bas.chord(BLAZE, ['D1', 'D2'], 4.0, 110, human=0)
cho.chord(BLAZE, ['D4', 'F#4', 'A4', 'D5'], 4.0, 92, human=0)
tmp.note(BLAZE, 'D2', 1.2, 96, human=0)
for k, p in enumerate(['D3', 'F#3', 'A3', 'D4', 'F#4', 'A4', 'D5', 'F#5', 'A5', 'D6']):  # harp glissando up
    hrp.note(BLAZE + 0.03 + k * 0.045, p, 1.5, 70 + k)
# soaring violins: D5 — E5 F#5 A5 over D – Bm – G – A
for (dt, p, d) in [(0.0, 'D5', 1.25), (1.25, 'E5', 0.5), (1.75, 'F#5', 0.5), (2.25, 'A5', 1.0), (3.25, 'B5', 0.35), (3.6, 'C#6', 0.4)]:
    strg.note(BLAZE + dt, p, d, 100, human=0.004)
    strg.note(BLAZE + dt, n(p) - 12, d, 88, human=0.004)
for (dt, ch, root) in [(2.0, ['B2', 'F#3', 'D4'], 'B1'), (3.0, ['G2', 'D3', 'B3'], 'G1'), (3.5, ['A2', 'E3', 'C#4'], 'A1')]:
    strg.chord(BLAZE + dt, ch, 0.55 if dt < 3.4 else 0.5, 92, human=0.004)
    bas.note(BLAZE + dt, root, 0.55, 100)
# glock sparkle across the blaze
for k in range(8):
    glk.note(BLAZE + 0.5 + k * 0.42, ['A6', 'F#6', 'D6', 'A6', 'D7', 'A6', 'F#6', 'E6'][k], 0.3, 50)
STATEMENTS.append(('I4 THE MISSING NOTE LANDS: D5 on celesta+piano+glock, full bloom', BLAZE, BLAZE, True))
# I5: glock run, one note per house coming on (houses at I5 + 0.1 + k*0.3)
HOUSE_TIMES = [st('I5', 0.1 + k * 0.3) for k in range(9)]
for t, p in zip(HOUSE_TIMES, ['D5', 'E5', 'F#5', 'G5', 'A5', 'B5', 'C#6', 'D6', 'F#6']):
    glk.note(t, p, 0.5, 66, human=0)
    cel.note(t, n(p) + 12, 0.3, 40, human=0)
strg.chord(st('I5', 0.0), ['D3', 'A3', 'F#4', 'D5'], 3.0, 84)
cho.chord(st('I5', 0.0), ['D4', 'F#4', 'A4'], 3.0, 70)
bas.note(st('I5', 0.0), 'D2', 3.0, 84)
motif(strg, st('I5', 0.0), 0.5, octave=1, vel=72, legato=0.9, only=[0, 1, 2, 3, 4], label='x'); STATEMENTS.pop()
strg.expr(st('I5', 0.0), st('I6', 0.0), 100, 90)
# I6: warm strings G - D/F# - Em - A; the bell (foley 144.5); he laughs, pulls her in
for (dt, ch, root, d) in [(0.0, ['G3', 'B3', 'D4', 'G4'], 'G2', 1.0), (1.0, ['F#3', 'A3', 'D4', 'A4'], 'F#2', 1.0), (2.0, ['E3', 'G3', 'B3', 'G4'], 'E2', 1.0), (3.0, ['A3', 'C#4', 'E4', 'A4'], 'A2', 1.0)]:
    strg.chord(st('I6', dt), ch, d, 80)
    bas.note(st('I6', dt), root, d, 76)
    pad.chord(st('I6', dt), ch, d, 70)
for (dt, p, d) in [(0.0, 'B5', 1.0), (1.0, 'A5', 0.8), (1.8, 'F#5', 0.2), (2.0, 'G5', 1.0), (3.0, 'E5', 1.0)]:
    strg.note(st('I6', dt), p, d, 84)
pad.set_expr(st('I6', 0), 80)
cel.note(st('I6', 1.05), 'D7', 0.6, 36)

# =============================================================== J: SEEN FROM SPACE (147.5–157.5)
b = 60 / 72
t0 = st('J1', 0.4)
for stem, octv, v in ((strg, 0, 92), (strg, 1, 84), (cho, 0, 80), (cel, 1, 62)):
    motif(stem, t0, b, octave=octv, vel=v, resolve=True, legato=1.0, label='x'); STATEMENTS.pop()
STATEMENTS.append(('J1 FULL MOTIF COMPLETE: strings + choir + celesta (D5 resolves at %.2f)' % (t0 + 6 * b), t0, t0 + 6 * b, True))
cho.set_expr(st('J1', 0), 100); strg.set_expr(st('J1', 0), 100)
harmony(pad, t0, b, vel=74, last=False)
pad.chord(t0 + 6 * b, ['D3', 'A3', 'F#4', 'D5'], 2.5, 80)
for (dt, p, d) in [(0, 'D2', 3 * b), (3 * b, 'G1', 1.5 * b), (4.5 * b, 'A1', 1.5 * b), (6 * b, 'D2', 2.5)]:
    bas.note(t0 + dt, p, d, 92)
glk.note(t0 + 6 * b, 'D6', 2.0, 70, human=0); glk.note(t0 + 6 * b, 'A6', 2.0, 56, human=0)
tmp.note(t0 + 6 * b, 'D2', 1.0, 76, human=0)
for k in range(12):  # harp rising arpeggios through the clouds
    hrp.note(t0 + k * b * 0.5, ['D3', 'A3', 'D4', 'F#4', 'G3', 'D4', 'G4', 'B4', 'A3', 'E4', 'A4', 'C#5'][k], 1.2, 58)
# the rise continues: G - A - D, high violins reach D6 as the Earth turns
tr = t0 + 6 * b + 2.4   # ~155.2
for (dt, ch, root, mel) in [(0.0, ['G3', 'B3', 'D4'], 'G1', 'B5'), (1.0, ['A3', 'C#4', 'E4'], 'A1', 'C#6'), (2.0, ['D3', 'F#3', 'A3', 'D4'], 'D2', 'D6')]:
    d = 1.0 if dt < 2.0 else 2.6
    strg.chord(tr + dt, ch, d, 90); cho.chord(tr + dt, [n(x) + 12 for x in ch], d, 78)
    bas.note(tr + dt, root, d, 88)
    strg.note(tr + dt, mel, d, 96)
strg.expr(tr + 2.2, st('K1', 0.6), 100, 54)
cho.expr(tr + 2.2, st('K1', 0.6), 100, 40)
bas.expr(tr + 2.2, st('K1', 0.6), 110, 50)

# =============================================================== K: CODA (157.5–163)
b = 60 / 96
t0 = st('K1', 0.25)
gk = motif(cel, t0, b, vel=54, resolve=True, legato=1.0, label='K1 celesta COMPLETE, soft, once')
pad.set_expr(st('K1', 0), 40)
harmony(pad, t0, b, vel=48, last=False)
pad.chord(gk, ['D3', 'A3', 'F#4'], 3.5, 50)
hrp.chord(gk, ['D2', 'A2', 'F#3', 'D4'], 3.0, 44, roll=0.08)

# =============================================================== L: END CARD (163–168)
t = st('L1', 0.0)
pad.chord(t, ['D3', 'A3', 'E4', 'F#4'], 4.6, 56)
cho.set_expr(t - 0.1, 0); cho.chord(t, ['D4', 'A4', 'F#5'], 4.5, 54); cho.expr(t, t + 1.2, 0, 50); cho.expr(t + 2.0, t + 4.6, 50, 0)
pad.expr(t, t + 0.5, 40, 50); pad.expr(t + 1.5, t + 4.7, 50, 0)
cel.note(t + 0.2, 'A5', 3.5, 40); cel.note(t + 0.5, 'D6', 3.5, 38); cel.note(t + 0.9, 'F#6', 3.0, 34)
glk.note(t + 0.5, 'D6', 3.0, 34)


def render_all():
    ensure_dirs()
    for name, s in S.items():
        mid = s.save()
        wav = os.path.join(STEMS, name + '.wav')
        subprocess.run(['fluidsynth', '-ni', '-q', '-R', '0', '-C', '0', '-g', '0.6', '-r', str(SR), '-F', wav, SF2, mid], check=True)
        print('rendered', name, len(s.notes), 'notes')


def write_statements():
    import json
    with open(os.path.join(os.path.dirname(MIDI), 'statements.json'), 'w') as fh:
        json.dump({'statements': STATEMENTS, 'bulb_times': BULB_TIMES, 'house_times': HOUSE_TIMES,
                   'card_notes': [(sh, st(sh, dt), p) for (sh, dt, p) in CARD_NOTES], 'blaze': BLAZE, 'click': CLICK,
                   'stop_dead': STOP_DEAD}, fh, indent=1)


if __name__ == '__main__':
    render_all()
    write_statements()
